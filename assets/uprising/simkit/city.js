/* SIMKIT city.js (the Uprising Simulator: buildings, people, forces, vehicles, emblems): see build/simkit/SIMKIT.md for the contract and the type list this file owns.

   What is here, in order:
   1. canvas helpers and K.emblems (irgc, basij, faraja, artesh, lion-sun, iri, idf, usaf, usn, pla, zsu, vsrf, roc). Drawn shapes and text, never a copy of an image.
      lion-sun and iri are FLAGS: their canvas is 7:4 (size x size*4/7). Every other emblem is square.
   2. people: one builder for every figure (protester variants, riot police, Basij, IRGC, Artesh, sniper, defector, medic) with named limbs that swing.
   3. K.city.crowd: instanced crowds, limbs swung in the vertex shader, so 2,000 figures cost a handful of draw calls.
   4. buildings by kind (cat 'city') and K.city.building / K.city.buildings for OSM footprints.
   5. the regime's places, each wearing its emblem.
   6. vehicles and props (cat 'people'). */
export default function register(K) {
  const T = K.T, C = K.C, P = K.part, add = K.add;
  const PI = Math.PI, HP = Math.PI / 2;

  // ---------------------------------------------------------------- Iranian city finishes (beside K.C)
  const IR = {
    brick: 0xbf9466, brick2: 0xb07f55, brickDark: 0x8a6243, stone: 0xddd3bc, stone2: 0xc9bb9d, plaster: 0xcac1af, plaster2: 0xb8b1a3,
    roof: 0x8d857a, glass: 0x29333d, rail: 0x2a2c2f, shutter: 0x9aa0a5, tankW: 0xe6e6e0, tankB: 0x3f6fae, tankG: 0xa9b0b5, cooler: 0xb9bec1,
    tile: 0x2a9fb4, tileDeep: 0x1f4f93, tileLight: 0x86cbd4, gold: 0xd9a640, police: 0x0f6a43, policeW: 0xeef0ec, irgc: 0x4d5a3c,
    irgcDark: 0x3a4430, artesh: 0x857f5a, arteshDark: 0x5f5b42, asphalt: 0x3a3c3f, grass: 0x4f7a3b, tree: 0x3f6b35, treeDark: 0x2f5530,
    trunk: 0x5b4635, lamp: 0xffd890, win: 0xd6a55c, flagG: 0x239f40, flagR: 0xda0000, white: 0xf2f2ee, black: 0x17191c, wall: 0xd4c8b0,
    concreteW: 0xe2ddd2, rubber: 0x1e1e1e, chrome: 0xb9c0c6
  };
  const rng = (seed) => { let s = (seed >>> 0) || 7; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  // box with its BASE at y (not its centre): most of a city is stacked from the ground up
  const B = (l, w, h, d, c, x, y, z, ry, rx, rz) => add(l, P.box(w, h, d), c, [x || 0, (y || 0) + h / 2, z || 0], [rx || 0, ry || 0, rz || 0]);
  const CY = (l, r, h, c, x, y, z, seg, rt) => add(l, P.cyl(rt == null ? r : rt, r, h, seg || 8), c, [x || 0, (y || 0) + h / 2, z || 0]);
  // a flat quad facing +z, turned by ry
  const Q = (l, w, h, c, x, y, z, ry, rx) => add(l, new T.PlaneGeometry(w, h), c, [x, y, z], [rx || 0, ry || 0, 0]);
  const tint = (l) => { l[l.length - 1].t = 1; return l; };
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  // run fn(lists) into a temporary parts list and move the result into L at (x, y, z) turned by ry
  function into(L, fn, x, y, z, ry, s) {
    const tmp = K.lists(); fn(tmp);
    const m = new T.Matrix4().compose(V3(x || 0, y || 0, z || 0), new T.Quaternion().setFromAxisAngle(V3(0, 1, 0), ry || 0), V3(s || 1, s || 1, s || 1));
    Object.keys(tmp).forEach((k) => tmp[k].forEach((p) => { p.g.applyMatrix4(m); (L[k] || L.solid).push(p); }));
    return L;
  }
  // a shape in the x/y plane (a facade outline) extruded along z, centred on z
  function shapeGeo(shape, depth, segs) { const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: segs || 5 }); g.translate(0, 0, -depth / 2); return g; }
  function archShape(w, h) {
    const s = new T.Shape(), hw = w / 2, sp = h - w * 0.55;
    s.moveTo(-hw, 0); s.lineTo(-hw, sp); s.quadraticCurveTo(-hw, h - w * 0.12, 0, h); s.quadraticCurveTo(hw, h - w * 0.12, hw, sp); s.lineTo(hw, 0); s.closePath(); return s;
  }
  const arch = (w, h, d) => shapeGeo(archShape(w, h), d, 4);

  // ================================================================ 1. CANVAS, TEXTURES, EMBLEMS
  const texCache = new Map(), matCache = new Map();
  function canvasTex(key, w, h, draw) {
    if (texCache.has(key)) return texCache.get(key);
    const cv = typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(w, h);
    cv.width = w; cv.height = h; const g = cv.getContext('2d'); draw(g, w, h);
    const tx = new T.CanvasTexture(cv); if (T.SRGBColorSpace) tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 4;
    texCache.set(key, tx); return tx;
  }
  function matTex(tex, o) {
    o = o || {}; const k = tex.uuid + (o.double ? 'd' : '') + (o.glow ? 'g' : '');
    if (!matCache.has(k)) {
      matCache.set(k, o.glow ? new T.MeshBasicMaterial({ map: tex, toneMapped: false, side: o.double ? T.DoubleSide : T.FrontSide })
        : new T.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.05, alphaTest: 0.4, side: o.double ? T.DoubleSide : T.FrontSide }));
    }
    return matCache.get(k);
  }
  // a textured plate (sign, emblem, notice) facing +z turned by ry; its own mesh because the merged lists carry no UVs
  function plate(tex, w, h, x, y, z, ry, o) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), matTex(tex, o)); m.position.set(x, y, z); m.rotation.y = ry || 0;
    m.name = (o && o.name) || 'emblem'; m.receiveShadow = true; return m;
  }
  const emPlate = (id, s, x, y, z, ry) => plate(K.emblem(id, 256), s, s, x, y, z, ry);

  const FA = 'Tahoma, "Segoe UI", Arial, "Noto Naskh Arabic", "Noto Sans Arabic", sans-serif';
  function rtl(g, text, x, y, px, color, weight, maxW) {
    g.save(); g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = (weight || 'bold') + ' ' + px + 'px ' + FA;
    g.fillStyle = color; if (maxW) g.fillText(text, x, y, maxW); else g.fillText(text, x, y); g.restore();
  }
  function ltr(g, text, x, y, px, color, weight, maxW) {
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = (weight || 'bold') + ' ' + px + 'px Arial, "Segoe UI", sans-serif';
    g.fillStyle = color; if (maxW) g.fillText(text, x, y, maxW); else g.fillText(text, x, y); g.restore();
  }
  function starPath(g, cx, cy, R, r, n, rot) {
    g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (rot || -HP) + i * PI / n, rr = i % 2 ? r : R; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath();
  }
  function leafArc(g, cx, cy, R, a0, a1, n, len, wid, col, out) {
    g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * (i + 0.5) / n;
      g.save(); g.translate(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.rotate(a + HP + out); g.beginPath(); g.ellipse(0, 0, wid, len, 0, 0, PI * 2); g.fill(); g.restore();
    }
  }
  // the Islamic Republic's emblem (the stylised sword and four crescents), centred, s = height
  function allahMark(g, cx, cy, s, col) {
    g.save(); g.translate(cx, cy); g.scale(s / 100, s / 100); g.fillStyle = col;
    g.beginPath(); g.moveTo(-3.5, 44); g.lineTo(-3.5, -30); g.lineTo(0, -46); g.lineTo(3.5, -30); g.lineTo(3.5, 44); g.closePath(); g.fill();
    for (const sx of [-1, 1]) {
      g.save(); g.scale(sx, 1);
      g.beginPath(); g.arc(6, 2, 44, PI * 0.6, PI * 1.4); g.arc(13, 2, 35, PI * 1.38, PI * 0.62, true); g.closePath(); g.fill();
      g.beginPath(); g.arc(4, 4, 27, PI * 0.64, PI * 1.36); g.arc(9, 4, 20, PI * 1.34, PI * 0.66, true); g.closePath(); g.fill();
      g.restore();
    }
    g.fillRect(-12, -52, 24, 3.5); g.fillRect(-12, -52, 3.5, -6); g.fillRect(-1.75, -52, 3.5, -6); g.fillRect(8.5, -52, 3.5, -6);
    g.restore();
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // the Sepah motif: the globe, the sprig, the raised arm holding the rifle, the book at the foot (s = scale, 100 units)
  function sepahMark(g, cx, cy, s, col, words) {
    g.save(); g.translate(cx, cy); g.scale(s / 100, s / 100); g.fillStyle = col; g.strokeStyle = col;
    g.lineWidth = 3.2; g.beginPath(); g.arc(10, -14, 30, 0, PI * 2); g.stroke();
    g.beginPath(); g.ellipse(10, -14, 13, 30, 0, 0, PI * 2); g.stroke();
    g.beginPath(); g.moveTo(-20, -14); g.lineTo(40, -14); g.moveTo(-14, -30); g.lineTo(34, -30); g.moveTo(-14, 2); g.lineTo(34, 2); g.stroke();
    g.lineWidth = 2.6; g.beginPath(); g.moveTo(10, -44); g.lineTo(10, -66); g.stroke();
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(10 + sx * 4.5, -50 - i * 4.6, 4.2, 1.8, sx * -0.6, 0, PI * 2); g.fill(); }
    g.save(); g.translate(-2, -10); g.rotate(-0.42);
    g.beginPath(); g.moveTo(-56, -3); g.lineTo(-30, -7); g.lineTo(-30, 6); g.lineTo(-54, 13); g.closePath(); g.fill();
    g.fillRect(-31, -7, 37, 12.5);
    g.beginPath(); g.moveTo(-2, 4); g.lineTo(7, 4); g.quadraticCurveTo(13, 15, 10, 27); g.lineTo(2, 26); g.quadraticCurveTo(5, 15, -2, 4); g.fill();
    g.fillRect(4, -5, 52, 4.5); g.fillRect(4, -9.5, 27, 3.5); g.fillRect(52, -12, 2.6, 7.5);
    g.restore();
    roundRect(g, -17, -15, 19, 17, 5); g.fill();
    g.lineWidth = 11; g.lineJoin = 'miter'; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(-8, 0); g.lineTo(-5, 31); g.lineTo(-29, 53); g.lineTo(-10, 69); g.stroke();
    g.beginPath(); g.moveTo(-36, 71); g.lineTo(-6, 66); g.lineTo(-6, 77); g.lineTo(-36, 82); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-3, 66); g.lineTo(24, 71); g.lineTo(24, 82); g.lineTo(-3, 77); g.closePath(); g.fill();
    if (words) ['سپاه', 'پاسداران', 'انقلاب', 'اسلامی'].forEach((w, i) => rtl(g, w, 42, 24 + i * 14, 12.5, col, 'bold'));
    g.restore();
  }
  // the Lion and Sun (the protesters' flag), centred, s = scale (100 units, about 125 tall with the sword)
  function lionSun(g, cx, cy, s) {
    g.save(); g.translate(cx, cy); g.scale(s / 100, s / 100);
    const gold = '#f4b400', deep = '#d38f00', dark = '#6e4400';
    const sx = 10, sy = -26;
    g.fillStyle = gold; g.strokeStyle = dark; g.lineWidth = 1.6; g.beginPath();
    for (let i = 0; i < 36; i++) { const a = i / 36 * PI * 2, rr = i % 2 ? 23 : 35; g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(sx, sy, 19, 0, PI * 2); g.fill(); g.stroke();
    g.fillStyle = dark; g.fillRect(sx - 8, sy - 5, 5, 2.4); g.fillRect(sx + 3, sy - 5, 5, 2.4);
    g.beginPath(); g.arc(sx, sy + 3, 7, 0.25, PI - 0.25); g.stroke();
    g.strokeStyle = gold; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(36, -4); g.quadraticCurveTo(60, -10, 55, -36); g.stroke();
    g.fillStyle = deep; g.beginPath(); g.arc(55, -38, 5, 0, PI * 2); g.fill();
    g.fillStyle = deep; g.strokeStyle = dark; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(17, 10); g.lineTo(14, 40); g.lineTo(22, 40); g.lineTo(27, 10); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-22, 10); g.lineTo(-25, 40); g.lineTo(-17, 40); g.lineTo(-13, 10); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = gold;
    g.beginPath(); g.moveTo(-30, -10); g.lineTo(-10, -15); g.quadraticCurveTo(15, -18, 30, -13); g.quadraticCurveTo(43, -8, 41, 6); g.lineTo(45, 38); g.lineTo(35, 40);
    g.lineTo(30, 14); g.quadraticCurveTo(10, 18, -12, 15); g.lineTo(-32, 40); g.lineTo(-40, 39); g.lineTo(-33, 9); g.quadraticCurveTo(-38, 0, -30, -10); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-30, -6); g.lineTo(-47, -15); g.lineTo(-52, -28); g.lineTo(-44, -31); g.lineTo(-40, -21); g.lineTo(-25, -13); g.closePath(); g.fill(); g.stroke();
    g.lineCap = 'round'; g.beginPath(); g.moveTo(-49, -30); g.quadraticCurveTo(-68, -58, -40, -84);
    g.strokeStyle = dark; g.lineWidth = 6.5; g.stroke(); g.strokeStyle = '#e9ecef'; g.lineWidth = 3.6; g.stroke();
    g.strokeStyle = dark; g.lineWidth = 3.4; g.beginPath(); g.moveTo(-57, -29); g.lineTo(-42, -34); g.stroke();
    g.lineWidth = 1.8; g.fillStyle = deep; g.beginPath();
    for (let i = 0; i < 26; i++) { const a = i / 26 * PI * 2, rr = i % 2 ? 13 : 19; g.lineTo(-35 + Math.cos(a) * rr, -20 + Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = gold; g.beginPath(); g.ellipse(-43, -19, 8.5, 7.5, 0, 0, PI * 2); g.fill(); g.stroke();
    g.fillStyle = dark; g.fillRect(-47, -22, 2.6, 2.6);
    g.restore();
  }
  function emblem(id, draw, aspect) {
    K.emblems[id] = (size) => { size = size || 256; return canvasTex('em:' + id + ':' + size, size, Math.round(size * (aspect || 1)), (g, w) => { g.scale(w / 256, w / 256); draw(g); }); };
  }
  // IRGC (Sepah): gold motif on the Sepah green, gold wreath, the words سپاه پاسداران
  emblem('irgc', (g) => {
    const gr = g.createRadialGradient(128, 110, 20, 128, 128, 124); gr.addColorStop(0, '#1d6b34'); gr.addColorStop(1, '#0a3a1b');
    g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 122, 0, PI * 2); g.fill();
    g.strokeStyle = '#d9a640'; g.lineWidth = 7; g.beginPath(); g.arc(128, 128, 118, 0, PI * 2); g.stroke();
    leafArc(g, 128, 128, 104, PI * 0.58, PI * 1.32, 9, 10, 4.4, '#d9a640', 0.35);
    leafArc(g, 128, 128, 104, PI * 1.68, PI * 2.42, 9, 10, 4.4, '#d9a640', -0.35);
    sepahMark(g, 110, 116, 116, '#f2c14e', true);
  });
  // Basij: green motif on white, the green band with بسیج
  emblem('basij', (g) => {
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 122, 0, PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(128, 128, 112, 0, PI * 2); g.clip(); g.fillStyle = '#17803d'; g.fillRect(0, 176, 256, 80); g.restore();
    g.strokeStyle = '#17803d'; g.lineWidth = 12; g.beginPath(); g.arc(128, 128, 116, 0, PI * 2); g.stroke();
    sepahMark(g, 120, 98, 104, '#17803d', false);
    rtl(g, 'بسیج', 128, 207, 44, '#ffffff', 'bold');
  });
  // FARAJA (the Law Enforcement Command): the arched shield, the gold star, the sword and the scales
  emblem('faraja', (g) => {
    const shield = (inset) => { g.beginPath(); g.moveTo(28 + inset, 248 - inset); g.lineTo(28 + inset, 104); g.bezierCurveTo(28 + inset, 46 + inset * 0.6, 86, 12 + inset, 128, 6 + inset * 1.3); g.bezierCurveTo(170, 12 + inset, 228 - inset, 46 + inset * 0.6, 228 - inset, 104); g.lineTo(228 - inset, 248 - inset); g.closePath(); };
    shield(0); g.fillStyle = '#0d4f2c'; g.fill();
    shield(12); g.fillStyle = '#c4cfae'; g.fill();
    g.fillStyle = '#2b2b2b'; g.beginPath(); g.moveTo(123, 58); g.lineTo(133, 58); g.lineTo(132, 172); g.lineTo(128, 184); g.lineTo(124, 172); g.closePath(); g.fill();
    roundRect(g, 122, 22, 12, 30, 4); g.fill(); g.beginPath(); g.arc(128, 20, 7, 0, PI * 2); g.fill();
    g.beginPath(); g.moveTo(104, 50); g.quadraticCurveTo(128, 60, 152, 50); g.lineTo(152, 57); g.quadraticCurveTo(128, 66, 104, 57); g.closePath(); g.fill();
    g.strokeStyle = '#151515'; g.lineWidth = 4; g.beginPath(); g.moveTo(64, 120); g.lineTo(192, 120); g.stroke();
    g.lineWidth = 2; for (const x of [70, 186]) { g.beginPath(); g.moveTo(x, 120); g.lineTo(x - 18, 160); g.moveTo(x, 120); g.lineTo(x + 18, 160); g.stroke(); g.beginPath(); g.moveTo(x - 24, 160); g.quadraticCurveTo(x, 182, x + 24, 160); g.closePath(); g.fillStyle = '#151515'; g.fill(); }
    for (let i = 0; i < 24; i++) { const a0 = -HP + i * PI / 12, a1 = a0 + PI / 12; const R0 = i % 2 ? 34 : 50; g.beginPath(); g.moveTo(128, 112); g.lineTo(128 + Math.cos(a0) * (i % 2 ? 50 : 34), 112 + Math.sin(a0) * (i % 2 ? 50 : 34)); g.lineTo(128 + Math.cos(a1) * R0, 112 + Math.sin(a1) * R0); g.closePath(); g.fillStyle = i % 2 ? '#f39c12' : '#ffd21f'; g.fill(); }
    g.fillStyle = '#111'; g.beginPath(); g.arc(128, 112, 28, 0, PI * 2); g.fill();
    allahMark(g, 128, 113, 38, '#ffd21f');
    g.strokeStyle = '#0d4f2c'; g.lineWidth = 5; g.beginPath(); for (let i = 0; i <= 10; i++) g.lineTo(52 + i * 15.2, i % 2 ? 186 : 198); g.stroke();
    g.fillStyle = '#e4ead6'; g.fillRect(42, 204, 172, 34); rtl(g, 'فراجا', 128, 222, 30, '#0d3b22', 'bold');
  });
  // Artesh (the regular army): black field, gold wreath, the green ring, the eagle over the flag roundel, the ribbon ارتش
  emblem('artesh', (g) => {
    g.fillStyle = '#121212'; g.beginPath(); g.arc(128, 128, 122, 0, PI * 2); g.fill();
    leafArc(g, 128, 132, 104, PI * 0.55, PI * 1.35, 10, 12, 5, '#d9a640', 0.3);
    leafArc(g, 128, 132, 104, PI * 1.65, PI * 2.45, 10, 12, 5, '#d9a640', -0.3);
    g.strokeStyle = '#d9a640'; g.lineWidth = 6; g.beginPath(); g.moveTo(66, 70); g.lineTo(190, 196); g.moveTo(190, 70); g.lineTo(66, 196); g.stroke();
    g.fillStyle = '#5b7f2b'; g.beginPath(); g.arc(128, 134, 62, 0, PI * 2); g.fill(); g.strokeStyle = '#d9a640'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#239f40'; g.beginPath(); g.arc(128, 134, 34, 0, PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 134, 23, 0, PI * 2); g.fill();
    g.fillStyle = '#da0000'; g.beginPath(); g.arc(128, 134, 11, 0, PI * 2); g.fill();
    g.fillStyle = '#e6b84f'; g.strokeStyle = '#6b4a10'; g.lineWidth = 1.5;
    for (const sx of [-1, 1]) { g.save(); g.translate(128, 0); g.scale(sx, 1); g.beginPath(); g.moveTo(6, 128); g.lineTo(70, 96); g.lineTo(74, 108); g.lineTo(64, 116); g.lineTo(70, 122); g.lineTo(58, 130); g.lineTo(62, 138); g.lineTo(46, 144); g.lineTo(8, 150); g.closePath(); g.fill(); g.stroke(); g.restore(); }
    g.beginPath(); g.ellipse(128, 142, 11, 22, 0, 0, PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(118, 160); g.lineTo(138, 160); g.lineTo(144, 178); g.lineTo(112, 178); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(124, 118, 8, 0, PI * 2); g.fill(); g.stroke(); g.beginPath(); g.moveTo(117, 117); g.lineTo(108, 121); g.lineTo(117, 122); g.fill();
    g.fillStyle = '#121212'; g.beginPath(); g.arc(128, 30, 22, 0, PI * 2); g.fill(); g.strokeStyle = '#d9a640'; g.lineWidth = 3; g.stroke();
    allahMark(g, 128, 31, 30, '#e6b84f');
    g.fillStyle = '#3d6b22'; g.beginPath(); g.moveTo(48, 206); g.quadraticCurveTo(128, 236, 208, 206); g.lineTo(212, 232); g.quadraticCurveTo(128, 262, 44, 232); g.closePath(); g.fill();
    rtl(g, 'ارتش', 128, 229, 22, '#f2d27a', 'bold');
  });
  // the Lion and Sun flag (7:4): green, white, red with the lion and sun on the white
  emblem('lion-sun', (g) => {
    g.fillStyle = '#239f40'; g.fillRect(0, 0, 256, 49); g.fillStyle = '#ffffff'; g.fillRect(0, 48.5, 256, 49); g.fillStyle = '#da0000'; g.fillRect(0, 97, 256, 49.3);
    lionSun(g, 130, 84, 66);
  }, 4 / 7);
  // the Islamic Republic's flag (7:4), for the regime's flagpoles
  emblem('iri', (g) => {
    g.fillStyle = '#239f40'; g.fillRect(0, 0, 256, 49); g.fillStyle = '#ffffff'; g.fillRect(0, 48.5, 256, 49); g.fillStyle = '#da0000'; g.fillRect(0, 97, 256, 49.3);
    g.fillStyle = '#ffffff'; for (let i = 0; i < 22; i++) { g.fillRect(4 + i * 11.4, 43, 7, 3); g.fillRect(4 + i * 11.4, 100, 7, 3); }
    allahMark(g, 128, 73, 40, '#da0000');
  }, 4 / 7);
  // flags for the round emblems: the field and the emblem centred (7:4, like 'iri')
  const flagOf = (id, field, edge) => emblem(id + 'flag', (g) => { g.fillStyle = field; g.fillRect(0, 0, 256, 146.3); if (edge) { g.strokeStyle = edge; g.lineWidth = 8; g.strokeRect(4, 4, 248, 138); } g.drawImage(K.emblem(id, 256).image, 128 - 58, 73 - 58, 116, 116); }, 4 / 7);
  flagOf('irgc', '#0f5a2a', '#d9a640'); flagOf('basij', '#17803d', '#ffffff'); flagOf('faraja', '#0f6a43', null); flagOf('artesh', '#4b5a2a', '#d9a640');
  // the theatre boards' simpler marks
  emblem('idf', (g) => {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 122, 0, PI * 2); g.fill(); g.strokeStyle = '#0038b8'; g.lineWidth = 10; g.stroke();
    g.lineWidth = 9; g.lineJoin = 'miter';
    for (const r of [0, PI]) { g.beginPath(); for (let i = 0; i < 3; i++) { const a = r - HP + i * PI * 2 / 3; g.lineTo(128 + Math.cos(a) * 78, 132 + Math.sin(a) * 78); } g.closePath(); g.stroke(); }
    g.fillStyle = '#7d8790'; g.beginPath(); g.moveTo(124, 196); g.lineTo(124, 70); g.lineTo(128, 52); g.lineTo(132, 70); g.lineTo(132, 196); g.fill(); g.fillRect(108, 176, 40, 7);
    g.strokeStyle = '#3f7a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(112, 190); g.bezierCurveTo(160, 160, 96, 120, 140, 76); g.stroke();
    for (let i = 0; i < 6; i++) { g.fillStyle = '#3f7a3a'; g.beginPath(); g.ellipse(118 + (i % 2) * 22, 180 - i * 18, 9, 4, i % 2 ? -0.5 : 0.5, 0, PI * 2); g.fill(); }
  });
  emblem('usaf', (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(14, 104, 228, 48); g.fillStyle = '#b22234'; g.fillRect(14, 120, 228, 16);
    g.strokeStyle = '#002868'; g.lineWidth = 5; g.strokeRect(14, 104, 228, 48);
    g.fillStyle = '#002868'; g.beginPath(); g.arc(128, 128, 66, 0, PI * 2); g.fill();
    starPath(g, 128, 130, 64, 25, 5); g.fillStyle = '#ffffff'; g.fill();
  });
  emblem('usn', (g) => {
    g.fillStyle = '#0b2a5b'; g.beginPath(); g.arc(128, 128, 122, 0, PI * 2); g.fill(); g.strokeStyle = '#d9a640'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 112, 0, PI * 2); g.stroke();
    g.strokeStyle = '#e6b84f'; g.fillStyle = '#e6b84f'; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); g.arc(128, 50, 12, 0, PI * 2); g.stroke(); g.beginPath(); g.moveTo(128, 62); g.lineTo(128, 184); g.moveTo(92, 78); g.lineTo(164, 78); g.stroke();
    g.beginPath(); g.arc(128, 132, 54, PI * 0.15, PI * 0.85); g.stroke();
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(128 + sx * 52, 150); g.lineTo(128 + sx * 66, 140); g.lineTo(128 + sx * 54, 166); g.closePath(); g.fill(); }
    ltr(g, 'U.S. NAVY', 128, 214, 22, '#e6b84f');
  });
  emblem('pla', (g) => {
    starPath(g, 128, 136, 120, 48, 5); g.fillStyle = '#d9a640'; g.fill();
    starPath(g, 128, 136, 104, 41, 5); g.fillStyle = '#de2910'; g.fill();
    ltr(g, '八一', 128, 140, 52, '#f6c745', 'bold');
  });
  emblem('zsu', (g) => {
    g.fillStyle = '#0057b7'; g.beginPath(); g.arc(128, 128, 122, 0, PI * 2); g.fill(); g.strokeStyle = '#ffd700'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 110, 0, PI * 2); g.stroke();
    g.fillStyle = '#ffd700'; g.strokeStyle = '#ffd700'; g.lineWidth = 9; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(128, 36); g.lineTo(141, 62); g.lineTo(134, 70); g.lineTo(134, 168); g.lineTo(122, 168); g.lineTo(122, 70); g.lineTo(115, 62); g.closePath(); g.fill();
    for (const sx of [-1, 1]) { g.save(); g.translate(128, 0); g.scale(sx, 1);
      g.beginPath(); g.moveTo(58, 52); g.lineTo(58, 150); g.quadraticCurveTo(58, 186, 14, 190); g.stroke();
      g.beginPath(); g.moveTo(58, 52); g.lineTo(46, 74); g.stroke();
      g.beginPath(); g.moveTo(30, 112); g.quadraticCurveTo(30, 160, 8, 166); g.stroke(); g.restore(); }
    g.fillRect(116, 180, 24, 24); g.beginPath(); g.moveTo(128, 162); g.lineTo(144, 182); g.lineTo(112, 182); g.closePath(); g.fill();
  });
  emblem('vsrf', (g) => {
    starPath(g, 128, 136, 122, 50, 5); g.fillStyle = '#1c3f94'; g.fill();
    starPath(g, 128, 136, 108, 44, 5); g.fillStyle = '#ffffff'; g.fill();
    starPath(g, 128, 136, 92, 37, 5); g.fillStyle = '#d52b1e'; g.fill();
  });
  emblem('roc', (g) => {
    g.fillStyle = '#000095'; g.beginPath(); g.arc(128, 128, 122, 0, PI * 2); g.fill();
    starPath(g, 128, 128, 100, 56, 12, -HP); g.fillStyle = '#ffffff'; g.fill();
    g.fillStyle = '#000095'; g.beginPath(); g.arc(128, 128, 54, 0, PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 47, 0, PI * 2); g.fill();
  });

  // signboards: a coloured board, the emblem on the right (and left), Persian lines centred
  function boardTex(key, o) {
    return canvasTex('bd:' + key, o.w || 512, o.h || 128, (g, w, h) => {
      g.fillStyle = o.bg; g.fillRect(0, 0, w, h);
      if (o.border) { g.strokeStyle = o.border; g.lineWidth = h * 0.05; g.strokeRect(h * 0.04, h * 0.04, w - h * 0.08, h - h * 0.08); }
      let x0 = h * 0.08, x1 = w - h * 0.08;
      if (o.em) {
        const img = K.emblem(o.em, 256).image, sz = h * 0.8, hh = sz * img.height / img.width;
        g.drawImage(img, w - sz - h * 0.1, (h - hh) / 2, sz, hh); x1 = w - sz - h * 0.16;
        if (o.both) { g.drawImage(img, h * 0.1, (h - hh) / 2, sz, hh); x0 = sz + h * 0.16; }
      }
      const n = o.lines.length;
      o.lines.forEach((ln, i) => (ln[3] ? ltr : rtl)(g, ln[0], (x0 + x1) / 2, h * (i + 0.5) / n + 2, ln[1], ln[2] || o.fg, 'bold', (x1 - x0) * 0.95));
    });
  }
  const shopSignTex = () => canvasTex('shopsigns', 1024, 96, (g, w, h) => {
    [['#7a4a22', 'نانوایی'], ['#1f4e8c', 'سوپرمارکت'], ['#a3262a', 'موبایل'], ['#2e6b3a', 'پوشاک']].forEach(([c, t], i) => {
      const x = i * w / 4; g.fillStyle = c; g.fillRect(x + 6, 6, w / 4 - 12, h - 12);
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.strokeRect(x + 12, 12, w / 4 - 24, h - 24); rtl(g, t, x + w / 8, h / 2 + 2, 44, '#fff');
    });
  });
  const shutterTex = () => canvasTex('shutters', 1024, 192, (g, w, h) => {
    for (let i = 0; i < 4; i++) {
      const x = i * w / 4, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#b9bec1'); gr.addColorStop(1, '#8a9093');
      g.fillStyle = gr; g.fillRect(x, 0, w / 4, h);
      g.strokeStyle = 'rgba(40,45,50,.45)'; g.lineWidth = 2; for (let y = 6; y < h; y += 8) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + w / 4, y); g.stroke(); }
      g.fillStyle = '#4c5053'; g.fillRect(x + w / 8 - 16, h - 16, 32, 8);
    }
    g.fillStyle = '#f4f1e6'; g.fillRect(w / 8 - 54, 44, 108, 62); rtl(g, 'تعطیل', w / 8, 76, 36, '#222');
    g.save(); g.translate(w * 0.5, 96); g.rotate(-0.05); rtl(g, 'زن زندگی آزادی', 0, 0, 44, '#c4161c'); g.restore();
    rtl(g, 'اعتصاب', w * 0.875, 98, 50, '#1b1b1b');
  });
  const placardTex = () => canvasTex('placard', 256, 160, (g, w, h) => {
    g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#239f40'; g.fillRect(0, 0, w, 14); g.fillStyle = '#da0000'; g.fillRect(0, h - 14, w, 14);
    rtl(g, 'زن زندگی آزادی', w / 2, 66, 38, '#111', 'bold', w * 0.9); ltr(g, 'WOMAN LIFE FREEDOM', w / 2, 114, 20, '#b0161c', 'bold', w * 0.9);
  });
  const bannerTex = () => canvasTex('banner', 1024, 256, (g, w, h) => {
    g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#239f40'; g.fillRect(0, 0, w, 22); g.fillStyle = '#da0000'; g.fillRect(0, h - 22, w, 22);
    rtl(g, 'زن زندگی آزادی', w / 2, 104, 104, '#111'); ltr(g, 'WOMAN  LIFE  FREEDOM', w / 2, 192, 50, '#b0161c');
  });
  const policeWordTex = () => canvasTex('policeword', 128, 64, (g, w, h) => { g.clearRect(0, 0, w, h); rtl(g, 'پلیس', w / 2, h / 2 + 2, 40, '#f2f2f2'); });

  // ================================================================ 2. PEOPLE
  const HIP = 0.92, SH = 1.42;
  const SKIN = [0xc89f7d, 0xb5876a, 0xd8b293, 0xa77a5b];
  const SPEC = {
    man: { top: 0x4a6684, legs: 0x2b3343, shoe: 0x1f1f1f, hair: 0x241a12, tintTop: 1 },
    woman: { top: 0x5a2f45, legs: 0x23262e, shoe: 0x2a2020, hair: 0x2b1b12, longHair: 1, coat: 1, tintTop: 1, skin: 2 },
    flag: { base: 'man', top: 0x2f4a3a, flag: 1 },
    sign: { base: 'woman', top: 0x1f2026, sign: 1 },
    phone: { base: 'woman', top: 0x7c6a58, phone: 1 },
    riot: { top: 0x1c1f23, legs: 0x1c1f23, shoe: 0x0f0f10, helmet: 0x141619, visor: 1, armour: 0x2a2d32, shield: 1, baton: 1, glove: 0x121212 },
    basij: { top: 0x1c1d20, legs: 0x2b2c30, shoe: 0x121212, hair: 0x151515, beard: 2, baton: 1, tintTop: 1, skin: 1, scarf: 1 },
    irgc: { top: 0x55613f, legs: 0x55613f, shoe: 0x181818, helmet: 0x4a553a, vest: 0x3b4430, rifle: 1, glove: 0x2b2b25, band: 0x1f7a3a },
    artesh: { top: 0x8a8460, legs: 0x8a8460, shoe: 0x2a2219, helmet: 0x6d6a4b, vest: 0x67624a, rifle: 1 },
    medic: { top: 0x3c4a5a, legs: 0x2b3343, shoe: 0x1f1f1f, hair: 0x241a12, vestW: 1, bag: 1, tintTop: 1 },
    defector: { top: 0x8a8460, legs: 0x8a8460, shoe: 0x2a2219, hair: 0x18120e, vest: 0x67624a, wave: 1, armband: 1, skin: 1 },
    rider: { top: 0x1c1d20, legs: 0x2b2c30, shoe: 0x121212, hair: 0x151515, beard: 2, ride: 1, scarf: 1 },
    rider2: { top: 0x2a2b30, legs: 0x2b2c30, shoe: 0x121212, hair: 0x111111, beard: 2, ride: 1, baton: 1, batonUp: 1, skin: 1 }
  };
  const _e = new T.Euler(), _v = new T.Vector3();
  const cap = (r, seg, hs) => new T.SphereGeometry(r, seg, hs, 0, PI * 2, 0, PI / 2);
  const disc = (r, seg) => new T.CircleGeometry(r, seg).rotateX(-HP);
  // a limb hanging from (x0, y0, 0) turned by rx (forward is negative) then rz (outward), with an end piece (hand, foot); returns the end point
  function limb(l, x0, y0, len, w, d, rx, rz, col, endCol, endLen) {
    _e.set(rx, 0, rz);
    _v.set(0, -len / 2, 0).applyEuler(_e); add(l, P.box(w, len, d), col, [x0 + _v.x, y0 + _v.y, _v.z], [rx, 0, rz]);
    const segIndex = l.length - 1;
    _v.set(0, -len - endLen / 2, 0).applyEuler(_e); add(l, P.box(w * 0.82, endLen, d * 0.85), endCol, [x0 + _v.x, y0 + _v.y, _v.z], [rx, 0, rz]);
    const end = new T.Vector3(0, -len - endLen * 0.55, 0).applyEuler(_e); end.x += x0; end.y += y0;
    end.seg = segIndex; return end;
  }
  function rifleParts(l, x, y, z, rx, ry, long) {
    const k = long ? 1.35 : 1;
    into(l, (t) => {
      B(t.solid, 0.055, 0.1, 0.42 * k, 0x26282a, 0, -0.05, 0);
      add(t.metal, P.cyl(0.014, 0.014, 0.42 * k, 4), 0x1b1d1f, [0, 0.0, 0.42 * k], [HP, 0, 0]);
      B(t.solid, 0.05, 0.12, 0.26, long ? 0x4a3a28 : 0x2e2a26, 0, -0.1, -0.3 * k);
      B(t.solid, 0.04, 0.16, 0.06, 0x1f2022, 0, -0.2, 0.06, 0, -0.25);
      if (long) { add(t.metal, P.cyl(0.03, 0.03, 0.3, 5), 0x111111, [0, 0.07, 0.04], [HP, 0, 0]); }
    }, x, y, z, ry || 0);
    return l;
  }
  function personLists(kind, o) {
    o = o || {};
    let s = SPEC[kind] || SPEC.man; if (s.base) s = Object.assign({}, SPEC[s.base], s);
    const R = { body: K.lists(), legL: K.lists(), legR: K.lists(), armL: K.lists(), armR: K.lists(), fixed: {}, tex: [] };
    const b = R.body.solid, sk = SKIN[o.skin != null ? o.skin : (s.skin || 0)], cr = !!o.crowd, lite = !!o.lite, glove = s.glove || sk;
    // legs: standing (free to swing) or riding (posed)
    [['legL', 1], ['legR', -1]].forEach(([nm, sx]) => {
      const l = R[nm].solid;
      if (s.ride) { limb(l, sx * 0.11, HIP, 0.84, 0.155, 0.17, -1.05, sx * 0.3, s.legs, s.shoe, 0.12); R.fixed[nm] = 1; return; }
      add(l, P.box(0.155, 0.84, 0.17), s.legs, [sx * 0.1, HIP - 0.44, 0]);
      if (lite) add(l, new T.PlaneGeometry(0.135, 0.22).rotateX(-HP), s.shoe, [sx * 0.1, 0.06, 0.05]); else add(l, P.box(0.135, 0.085, 0.28), s.shoe, [sx * 0.1, 0.043, 0.05]);
      if (s.armour) add(l, new T.PlaneGeometry(0.16, 0.15), s.armour, [sx * 0.1, 0.5, 0.087]);
    });
    add(b, P.box(0.34, 0.2, 0.21), s.legs, [0, HIP, 0]);
    add(b, P.cyl(0.3, 0.235, 0.52, 4), s.top, [0, 1.2, 0], [0, PI / 4, 0], [1, 1, 0.6]); if (s.tintTop) tint(b);
    if (s.coat) { add(b, P.cyl(0.25, 0.28, 0.36, 4), s.top, [0, 0.8, 0], [0, PI / 4, 0], [1, 1, 0.64]); tint(b); }
    if (!lite) add(b, P.box(0.09, 0.08, 0.09), sk, [0, 1.5, 0]);
    add(b, P.sphere(0.115, lite ? 5 : 6, lite ? 3 : 4), sk, [0, 1.645, 0.005], null, [0.92, 1.1, 1]);
    if (!cr) { add(b, new T.PlaneGeometry(0.03, 0.02), 0x1a1410, [0.042, 1.668, 0.113]); add(b, new T.PlaneGeometry(0.03, 0.02), 0x1a1410, [-0.042, 1.668, 0.113]); }
    if (s.helmet) {
      add(b, cap(0.142, 7, 2), s.helmet, [0, 1.672, -0.005], null, [1, 1.0, 1.08]);
      if (s.visor) add(R.body.glass, P.box(0.23, 0.11, 0.02), 0x33424f, [0, 1.63, 0.128]);
      else add(b, P.box(0.28, 0.025, 0.3), s.helmet, [0, 1.675, 0.0]);
      if (s.band && !cr) add(b, P.box(0.285, 0.035, 0.305), s.band, [0, 1.70, 0.0]);
    } else if (s.hair) {
      add(b, cap(0.136, 8, 3), s.hair, [0, 1.662, -0.014], [-0.22, 0, 0], [0.95, 1.0, 1.04]);
      if (s.longHair) add(b, P.box(0.24, 0.4, 0.075), s.hair, [0, 1.5, -0.09], [0.06, 0, 0]);
      if (s.beard) add(b, P.box(0.16, 0.07, 0.06), s.hair, [0, 1.565, 0.065]);
    }
    if (s.vest) add(b, P.box(0.41, 0.37, 0.28), s.vest, [0, 1.2, 0]);
    if (s.scarf) { add(b, P.box(0.3, 0.07, 0.24), 0xdedbd2, [0, 1.47, 0.0]); add(b, P.box(0.09, 0.2, 0.03), 0xdedbd2, [0.05, 1.36, 0.13], [0, 0, 0.15]); }
    if (s.armour) add(b, P.box(0.45, 0.44, 0.3), s.armour, [0, 1.21, 0]);
    if (s.vestW) {
      add(b, P.box(0.42, 0.4, 0.275), 0xeeeeea, [0, 1.2, 0]);
      for (const zz of [0.139, -0.139]) for (let i = 0; i < 3; i++) { const a = -0.9 + i * 0.9; add(b, new T.PlaneGeometry(0.035, 0.07), 0xc8102e, [Math.sin(a) * 0.07 - 0.01, 1.25 + Math.cos(a) * 0.07 - 0.07, zz], [0, zz < 0 ? PI : 0, zz < 0 ? a : -a]); }
    }
    if (s.bag) add(b, P.box(0.12, 0.2, 0.26), 0xb3261e, [0.25, 0.95, 0]);
    if (s.armband) { add(R.armL.solid, P.box(0.125, 0.04, 0.14), IR.flagG, [0.265, SH - 0.12, 0]); add(R.armL.solid, P.box(0.125, 0.04, 0.14), 0xffffff, [0.265, SH - 0.16, 0]); add(R.armL.solid, P.box(0.125, 0.04, 0.14), IR.flagR, [0.265, SH - 0.2, 0]); }
    // arms
    const free = (nm, sx) => {
      const l = R[nm].solid; add(l, P.box(0.105, 0.6, 0.12), s.top, [sx * 0.27, SH - 0.29, 0], [0, 0, sx * 0.06]); if (s.tintTop) tint(l);
      if (!lite) add(l, P.box(0.085, 0.1, 0.1), glove, [sx * 0.29, SH - 0.64, 0]);
      if (s.armour) add(l, P.box(0.15, 0.13, 0.16), s.armour, [sx * 0.27, SH - 0.06, 0]);
    };
    const posed = (nm, sx, rx, rz) => {
      const l = R[nm].solid, e = limb(l, sx * 0.265, SH, 0.6, 0.105, 0.12, rx, rz, s.top, glove, 0.1);
      if (s.tintTop) l[e.seg].t = 1; R.fixed[nm] = 1; return e;
    };
    if (s.rifle) {
      posed('armR', -1, -0.85, 0.45); posed('armL', 1, -1.25, -0.62);
      rifleParts(R.body, -0.03, 1.12, 0.3, 0, 0);
    } else if (s.shield) {
      const e = posed('armL', 1, -0.55, -0.25);
      add(R.armL.glass, P.box(0.58, 0.95, 0.035), 0xa9bccb, [0.08, e.y + 0.05, e.z + 0.08]); add(R.armL.solid, P.box(0.6, 0.06, 0.04), 0x15171a, [0.08, e.y + 0.53, e.z + 0.08]);
      if (!cr) R.tex.push({ limb: 'armL', mesh: plate(policeWordTex(), 0.36, 0.18, 0.08, e.y + 0.2, e.z + 0.1, 0, { name: 'shieldword' }) });
      free('armR', -1);
      add(R.armR.solid, P.cyl(0.024, 0.024, 0.64, 4), 0x111111, [-0.29, SH - 0.66, 0.26], [HP, 0, 0]);
    } else if (s.sign) {
      const a = posed('armL', 1, -2.85, 0.1), c2 = posed('armR', -1, -2.85, -0.1);
      add(b, P.box(0.74, 0.47, 0.025), 0xf4f1e8, [0, (a.y + c2.y) / 2 + 0.1, a.z + 0.02]);
      if (cr) { add(b, P.box(0.74, 0.06, 0.03), IR.flagG, [0, (a.y + c2.y) / 2 + 0.31, a.z + 0.02]); add(b, P.box(0.6, 0.08, 0.03), 0x222222, [0, (a.y + c2.y) / 2 + 0.12, a.z + 0.025]); add(b, P.box(0.74, 0.06, 0.03), IR.flagR, [0, (a.y + c2.y) / 2 - 0.11, a.z + 0.02]); }
      else R.tex.push({ limb: 'body', mesh: plate(placardTex(), 0.72, 0.45, 0, (a.y + c2.y) / 2 + 0.1, a.z + 0.04, 0, { name: 'placard' }) });
      R.fixed.body = 1;
    } else if (s.flag) {
      free('armL', 1);
      const e = posed('armR', -1, -2.95, -0.18);
      add(R.armR.metal, P.cyl(0.018, 0.018, 2.0, 5), 0x8a8f94, [e.x, e.y + 0.55, e.z]);
      if (cr) { const fx = e.x, fy = e.y + 1.35, fz = e.z; [IR.flagG, 0xffffff, IR.flagR].forEach((c, i) => add(R.armR.solid, P.box(0.02, 0.17, 0.95), c, [fx, fy + 0.17 - i * 0.17, fz - 0.48])); add(R.armR.solid, P.box(0.025, 0.1, 0.12), IR.gold, [fx, fy, fz - 0.42]); }
      else { const fl = clothChain(K.emblem('lion-sun', 256), 1.05, 0.6, 4); fl.position.set(e.x, e.y + 1.22, e.z); fl.rotation.y = HP; R.tex.push({ limb: 'armR', mesh: fl }); }
    } else if (s.phone) {
      free('armL', 1);
      const e = posed('armR', -1, -2.15, 0.12);
      add(R.armR.solid, P.box(0.075, 0.15, 0.012), 0x111111, [e.x, e.y + 0.05, e.z + 0.03]);
      add(R.armR.glow, P.box(0.064, 0.13, 0.004), 0xcfe8ff, [e.x, e.y + 0.05, e.z + 0.022]);
      add(R.armR.glowAdd, P.cone(0.15, 1.3, 6), 0x15191c, [e.x, e.y + 0.76, e.z + 0.17], [PI - 0.25, 0, 0]);
      add(R.armR.glow, P.box(0.02, 0.02, 0.01), 0xffffff, [e.x, e.y + 0.1, e.z + 0.04]);
    } else if (s.wave) {
      free('armL', 1);
      const e = posed('armR', -1, -2.75, -0.5);
      if (!cr) { const fl = clothChain(K.emblem('lion-sun', 256), 0.5, 0.29, 2); add(R.armR.metal, P.cyl(0.012, 0.012, 0.7, 5), 0x8a8f94, [e.x, e.y + 0.2, e.z]); fl.position.set(e.x, e.y + 0.4, e.z); fl.rotation.y = HP; R.tex.push({ limb: 'armR', mesh: fl }); }
    } else if (s.ride) {
      posed('armL', 1, -1.2, -0.08); const e = s.batonUp ? posed('armR', -1, -2.5, -0.2) : posed('armR', -1, -1.2, 0.08);
      if (s.baton) add(R.armR.solid, P.cyl(0.024, 0.024, 0.64, 5), 0x111111, [e.x, e.y + 0.28, e.z + 0.05], [0.3, 0, 0]);
    } else {
      free('armL', 1); free('armR', -1);
      if (s.baton) add(R.armR.solid, P.cyl(0.024, 0.024, 0.64, 4), 0x111111, [-0.29, SH - 0.66, 0.26], [HP, 0, 0]);
    }
    if (o.marker !== false && !s.ride) add(R.body.team, disc(0.27, 6), null, [0, 0.015, 0]);
    return R;
  }
  function personObj(kind, o) {
    o = o || {};
    const R = personLists(kind, o), root = new T.Group(), rig = new T.Group(); rig.name = 'rig'; root.add(rig);
    rig.add(K.group(R.body, o.team, 'body'));
    ['legL', 'legR', 'armL', 'armR'].forEach((nm) => {
      const py = nm.charAt(0) === 'l' ? HIP : SH, g = K.group(R[nm], o.team, nm);
      g.children.forEach((m) => m.geometry.translate(0, -py, 0)); g.position.y = py; g.userData.fixed = R.fixed[nm] ? 1 : 0;
      R.tex.filter((x) => x.limb === nm).forEach((x) => { x.mesh.position.y -= py; g.add(x.mesh); });
      rig.add(g);
    });
    R.tex.filter((x) => x.limb === 'body').forEach((x) => rig.add(x.mesh));
    return root;
  }
  // a flag of n strips, each hinged on the last, so anim can ripple it; spans +x from its origin, centred on y
  function clothChain(tex, w, h, n) {
    const root = new T.Group(), sw = w / n, mat = matTex(tex, { double: true }); let parent = root;
    for (let i = 0; i < n; i++) {
      const g = new T.Group(); g.name = 'fs' + i; if (i) g.position.x = sw; parent.add(g);
      const geo = new T.PlaneGeometry(sw, h); geo.translate(sw / 2, 0, 0);
      const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / n);
      const m = new T.Mesh(geo, mat); m.castShadow = true; g.add(m); parent = g;
    }
    return root;
  }
  // ---- animation (never allocates after the first call per object)
  const rigs = new WeakMap(), LIMBS = ['legL', 'legR', 'armL', 'armR'];
  function rigOf(o) {
    let r = rigs.get(o);
    if (!r) { r = { rig: o.getObjectByName('rig'), l: LIMBS.map((n) => o.getObjectByName(n)), f: [], arm: o.getObjectByName('arm'), jet: o.getObjectByName('jet'), gun: o.getObjectByName('gun'), lb: o.getObjectByName('lb'), lr: o.getObjectByName('lr') }; for (let i = 0; i < 8; i++) { const f = o.getObjectByName('fs' + i); if (f) r.f.push(f); } rigs.set(o, r); }
    return r;
  }
  function waveFlag(r, t, k) { for (let i = 0; i < r.f.length; i++) r.f[i].rotation.y = Math.sin(t * 4.4 - i * 1.1) * (0.16 + (i % 4) * 0.07) * (k || 1); }
  function walk(obj, t, sp, amp) {
    const r = rigOf(obj), s = Math.sin(t * sp);
    for (let i = 0; i < 4; i++) { const g = r.l[i]; if (!g || g.userData.fixed) continue; g.rotation.x = (i === 0 || i === 3 ? s : -s) * amp * (i > 1 ? 0.8 : 1); }
    if (r.rig) r.rig.position.y = Math.abs(Math.cos(t * sp)) * 0.04 * amp / 0.5;
    waveFlag(r, t);
    return r;
  }
  const animWalk = (obj, dt, t) => { walk(obj, t, 6.0, 0.5); };
  const animMarch = (obj, dt, t) => { walk(obj, t, 5.0, 0.36); };
  const animRiot = (obj, dt, t) => { const r = walk(obj, t, 4.4, 0.3); const a = r.l[3]; if (a) a.rotation.x = -1.3 - Math.max(0, Math.sin(t * 2.2)) * 1.4; };
  const animWave = (obj, dt, t) => { const r = rigOf(obj); if (r.l[3]) r.l[3].rotation.z = Math.sin(t * 5) * 0.32; waveFlag(r, t, 1.4); };

  // ================================================================ 3. CROWDS (instanced; limbs swung in the vertex shader)
  let crowdMatV = null;
  function crowdMat() {
    if (crowdMatV) return crowdMatV;
    const m = new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, metalness: 0.08, roughness: 0.8 });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = 'attribute float aLimb;\nattribute float aPivot;\nattribute float aTint;\nattribute float aGlow;\nvarying float vGlow;\nattribute vec3 iAnim;\nattribute vec3 iTint;\n' + sh.vertexShader
        .replace('#include <begin_vertex>', [
          '#include <begin_vertex>',
          'vGlow = aGlow;',
          'if (aLimb > 0.5) {',
          '  float ph = iAnim.x; float amp = iAnim.y; float up = iAnim.z; float a = 0.0;',
          '  if (aLimb < 1.5) a = sin(ph) * amp;',
          '  else if (aLimb < 2.5) a = -sin(ph) * amp;',
          '  else if (aLimb < 3.5) a = -sin(ph) * amp * 0.8;',
          '  else a = sin(ph) * amp * 0.8 * (1.0 - up) - up * (2.5 + 0.35 * sin(ph * 1.6));',
          '  float c = cos(a); float s = sin(a); vec3 q = transformed; q.y -= aPivot;',
          '  transformed = vec3(q.x, q.y * c - q.z * s + aPivot, q.y * s + q.z * c);',
          '}'].join('\n'))
        .replace('#include <color_vertex>', '#include <color_vertex>\nvColor.rgb = mix(vColor.rgb, iTint, aTint);');
      // the glow parts (phone screens) light themselves: they show in a crowd at dusk
      sh.fragmentShader = 'varying float vGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vGlow;');
    };
    m.customProgramCacheKey = () => 'simkit-crowd-2';
    crowdMatV = m; return m;
  }
  const crowdGeoCache = new Map();
  function crowdGeo(kind, teamHex, lite) {
    const key = kind + '|' + teamHex + '|' + (lite ? 1 : 0); if (crowdGeoCache.has(key)) return crowdGeoCache.get(key);
    const R = personLists(kind, { crowd: true, lite, marker: teamHex != null });
    const ent = [], LIMB = { body: 0, legL: 1, legR: 2, armL: 3, armR: 4 };
    Object.keys(LIMB).forEach((nm) => {
      const tag = R.fixed[nm] ? 0 : LIMB[nm], piv = nm.charAt(0) === 'l' ? HIP : SH;
      ['solid', 'metal', 'glass', 'glow', 'team'].forEach((k) => R[nm][k].forEach((p) => ent.push({ g: p.g, c: k === 'team' ? new T.Color(teamHex) : (k === 'glow' ? p.c.clone().multiplyScalar(1.6) : p.c), tag, piv, tint: p.t ? 1 : 0, glow: k === 'glow' ? 1 : 0 })));
      R[nm].glowAdd.forEach((p) => p.g.dispose());
    });
    let n = 0; ent.forEach((e) => (n += e.g.attributes.position.count));
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), lb = new Float32Array(n), pv = new Float32Array(n), tn = new Float32Array(n), gw = new Float32Array(n);
    let o = 0;
    ent.forEach((e) => { const a = e.g.attributes.position; pos.set(a.array.subarray(0, a.count * 3), o * 3); for (let i = 0; i < a.count; i++) { const j = o + i; col[j * 3] = e.c.r; col[j * 3 + 1] = e.c.g; col[j * 3 + 2] = e.c.b; lb[j] = e.tag; pv[j] = e.piv; tn[j] = e.tint; gw[j] = e.glow; } o += a.count; e.g.dispose(); });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.setAttribute('aLimb', new T.BufferAttribute(lb, 1)); g.setAttribute('aPivot', new T.BufferAttribute(pv, 1)); g.setAttribute('aTint', new T.BufferAttribute(tn, 1)); g.setAttribute('aGlow', new T.BufferAttribute(gw, 1));
    g.computeVertexNormals(); g.computeBoundingSphere();
    crowdGeoCache.set(key, g); return g;
  }
  const TOPS = {
    man: [0x2f3b4c, 0x5b2a2a, 0x3d4a3a, 0x6b6b6b, 0x1f1f24, 0x7d6a55, 0x2a4f6e, 0x8a3c3c, 0xb7b0a0, 0x46355a, 0xd6d3ca, 0x55616b, 0x4f6d8f, 0xb59f7c, 0x9a4a2a],
    woman: [0x1d1d22, 0x5a2f45, 0x2e3d55, 0x7c6a58, 0x9a3b3b, 0x3a4a3a, 0xc9b89a, 0x24252b, 0x6b4a5e, 0xb08c6a, 0x8a2f3a, 0xd8d2c4],
    basij: [0x1b1c1f, 0x2a2b30, 0x3a3226, 0x23241f], medic: [0x3c4a5a, 0x2b2f36]
  };
  const KMAP = { irgc_soldier: 'irgc', artesh_soldier: 'artesh', protester: 'protester' };
  const CHANT = { man: 1, woman: 1, flag: 1, sign: 1, phone: 1 }, STRIKE = { riot: 1, basij: 1 };
  K.city = {};
  /* K.city.crowd(count, { kinds, spread, team, center: [x, z], speed, seed, shadows, lite }) -> { mesh, setTargets(points, spread), update(dt, t), px, pz, heading, kind, count }
     lite: true drops hands, shoes and neck and lightens the head (about 70 triangles fewer a figure): use it on phones for crowds over ~800.
     kinds: 'protester' (a mix: men, women with their hair uncovered, Lion and Sun flags, placards), 'riot', 'basij', 'irgc_soldier', 'artesh_soldier', 'medic',
     or the protester parts directly ('man', 'woman', 'flag', 'sign', 'phone'). points: Vector3, {x, z} or [x, z]; agents share them round robin. */
  K.city.crowd = function (count, o) {
    o = o || {}; count = Math.max(1, count | 0);
    const r = rng(o.seed || 1234), list = o.kinds && o.kinds.length ? o.kinds : ['protester'], parts = [];
    list.forEach((k) => { k = KMAP[k] || k; if (k === 'protester') parts.push(['man', 0.41 / list.length], ['woman', 0.38 / list.length], ['flag', 0.08 / list.length], ['sign', 0.06 / list.length], ['phone', 0.07 / list.length]); else parts.push([k, 1 / list.length]); });
    let left = count; const counts = parts.map(([, w], i) => { const n = i === parts.length - 1 ? left : Math.min(left, Math.round(count * w)); left -= n; return n; });
    const teamHex = o.team != null ? K.teamHex(o.team) : null, group = new T.Group(); group.name = 'crowd';
    const px = new Float32Array(count), pz = new Float32Array(count), hd = new Float32Array(count), sp = new Float32Array(count), ph = new Float32Array(count),
      amp = new Float32Array(count), up = new Float32Array(count), gx = new Float32Array(count), gz = new Float32Array(count), ox = new Float32Array(count),
      oz = new Float32Array(count), idle = new Float32Array(count), sc = new Float32Array(count), mi = new Uint16Array(count), li = new Uint32Array(count), mode = new Uint8Array(count);
    const kindOf = new Array(count), meshes = [];
    let spread = o.spread || Math.max(3, Math.sqrt(count) * 0.8), mill = Math.min(2.5, spread * 0.25);
    const cx = o.center ? o.center[0] : 0, cz = o.center ? o.center[1] : 0;
    let idx = 0;
    parts.forEach(([k], pi) => {
      const n = counts[pi]; if (!n) return;
      const base = crowdGeo(k, teamHex, !!o.lite), geo = new T.BufferGeometry();
      ['position', 'color', 'normal', 'aLimb', 'aPivot', 'aTint', 'aGlow'].forEach((a) => { if (base.getAttribute(a)) geo.setAttribute(a, base.getAttribute(a)); });
      geo.boundingSphere = base.boundingSphere;
      const ia = new T.InstancedBufferAttribute(new Float32Array(n * 3), 3), it = new T.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      ia.setUsage(T.DynamicDrawUsage); geo.setAttribute('iAnim', ia); geo.setAttribute('iTint', it);
      const pal = TOPS[k === 'flag' ? 'man' : (k === 'sign' || k === 'phone') ? 'woman' : k] || [0x777777], cc = new T.Color();
      for (let j = 0; j < n; j++) { cc.setHex(pal[Math.floor(r() * pal.length)]); it.array[j * 3] = cc.r; it.array[j * 3 + 1] = cc.g; it.array[j * 3 + 2] = cc.b; }
      const mesh = new T.InstancedMesh(geo, crowdMat(), n); mesh.name = 'crowd_' + k; mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.frustumCulled = false; mesh.castShadow = !!o.shadows; mesh.receiveShadow = true; group.add(mesh);
      meshes.push({ mesh, ia });
      for (let j = 0; j < n; j++, idx++) { mi[idx] = meshes.length - 1; li[idx] = j; kindOf[idx] = k; mode[idx] = CHANT[k] ? 1 : STRIKE[k] ? 2 : 0; }
    });
    for (let i = 0; i < count; i++) {
      const a = r() * PI * 2, d = Math.sqrt(r()) * spread; px[i] = cx + Math.cos(a) * d; pz[i] = cz + Math.sin(a) * d;
      gx[i] = cx; gz[i] = cz; const a2 = r() * PI * 2, d2 = Math.sqrt(r()) * spread; ox[i] = Math.cos(a2) * d2; oz[i] = Math.sin(a2) * d2;
      hd[i] = r() * PI * 2; sp[i] = (o.speed || 1.35) * (0.8 + 0.4 * r()); ph[i] = r() * 50; sc[i] = 0.92 + r() * 0.16; idle[i] = r() * 4;
    }
    // DRIVEN (2 November 2026, the Uprising Simulator's street movement, build/uprising-street.js): with o.driven the crowd
    // never steers itself. The caller writes each figure's place (px, pz), heading, speed in metres a second (spd: 0 =
    // standing, so it chants or strikes by its kind) and size (vs: 0 hides it); update() only swings the limbs and writes
    // the matrices. Without o.driven nothing below changes.
    const spd = new Float32Array(count), vs = new Float32Array(count).fill(1);
    if (o.driven) {
      // only the figures up to the last one shown are drawn: a hidden figure costs no triangles (the phone budget, 2 Nov 2026)
      const top = new Int32Array(meshes.length), cap0 = meshes.map(m => m.mesh.count);
      const upd = function (dt, t) {
        dt = Math.min(dt || 0, 0.1); top.fill(0);
        for (let i = 0; i < count; i++) if (vs[i] > 0) { const q = mi[i]; if (li[i] + 1 > top[q]) top[q] = li[i] + 1; }
        for (let q = 0; q < meshes.length; q++) meshes[q].mesh.count = Math.min(cap0[q], top[q]);
        for (let i = 0; i < count; i++) {
          if (!(vs[i] > 0) && li[i] >= top[mi[i]]) continue;
          const v = spd[i];
          if (v > 0.15) { const ta = 0.55 * Math.min(1, v / 1.1); amp[i] += (ta - amp[i]) * Math.min(1, dt * 6); ph[i] += Math.min(v, 6) * dt * 4.4; up[i] += (0 - up[i]) * Math.min(1, dt * 5); }
          else {
            amp[i] += (0 - amp[i]) * Math.min(1, dt * 4);
            let tu = 0; if (mode[i] === 1) tu = Math.sin(t * 0.8 + i * 1.7) > 0.15 ? 1 : 0; else if (mode[i] === 2) tu = Math.sin(t * 1.9 + i * 2.3) > 0.55 ? 1 : 0;
            up[i] += (tu - up[i]) * Math.min(1, dt * 4); ph[i] += dt * (mode[i] === 1 ? 5.5 : 4);
          }
          const m = meshes[mi[i]], j = li[i], te = m.mesh.instanceMatrix.array, k16 = j * 16, s = sc[i] * vs[i], c = Math.cos(hd[i]) * s, sn = Math.sin(hd[i]) * s;
          te[k16] = c; te[k16 + 1] = 0; te[k16 + 2] = -sn; te[k16 + 3] = 0; te[k16 + 4] = 0; te[k16 + 5] = s; te[k16 + 6] = 0; te[k16 + 7] = 0;
          te[k16 + 8] = sn; te[k16 + 9] = 0; te[k16 + 10] = c; te[k16 + 11] = 0; te[k16 + 12] = px[i]; te[k16 + 13] = Math.abs(Math.sin(ph[i])) * 0.06 * amp[i] * vs[i]; te[k16 + 14] = pz[i]; te[k16 + 15] = 1;
          const aa = m.ia.array; aa[j * 3] = ph[i]; aa[j * 3 + 1] = amp[i]; aa[j * 3 + 2] = up[i];
        }
        for (let q = 0; q < meshes.length; q++) { meshes[q].mesh.instanceMatrix.needsUpdate = true; meshes[q].ia.needsUpdate = true; }
      };
      upd(0, 0);
      return { mesh: group, setTargets: () => { }, update: upd, px, pz, heading: hd, spd, vs, kind: kindOf, count, driven: true };
    }
    let tgtSpread = spread;
    function setTargets(points, spr) {
      if (!points || !points.length) return; const n = points.length;
      tgtSpread = spr || Math.max(1.5, Math.sqrt(count / n) * 0.8); mill = Math.min(2.5, tgtSpread * 0.25);
      for (let i = 0; i < count; i++) {
        const p = points[i % n], x = Array.isArray(p) ? p[0] : p.x, z = Array.isArray(p) ? p[1] : p.z; gx[i] = x; gz[i] = z;
        const a = r() * PI * 2, d = Math.sqrt(r()) * tgtSpread; ox[i] = Math.cos(a) * d; oz[i] = Math.sin(a) * d;
      }
    }
    function update(dt, t) {
      dt = Math.min(dt || 0, 0.1);
      for (let i = 0; i < count; i++) {
        const dx = gx[i] + ox[i] - px[i], dz = gz[i] + oz[i] - pz[i], d2 = dx * dx + dz * dz;
        if (d2 > 0.3) {
          const want = Math.atan2(dx, dz); let da = want - hd[i]; da = ((da + PI) % (PI * 2) + PI * 2) % (PI * 2) - PI;
          const turn = 3.5 * dt; hd[i] += da > turn ? turn : da < -turn ? -turn : da;
          const v = sp[i] * Math.min(1, Math.sqrt(d2) / 1.5) * (Math.abs(da) > 1.4 ? 0.35 : 1);
          px[i] += Math.sin(hd[i]) * v * dt; pz[i] += Math.cos(hd[i]) * v * dt;
          const ta = 0.55 * Math.min(1, v / 1.1); amp[i] += (ta - amp[i]) * Math.min(1, dt * 6); ph[i] += v * dt * 4.4;
          up[i] += (0 - up[i]) * Math.min(1, dt * 5);
        } else {
          amp[i] += (0 - amp[i]) * Math.min(1, dt * 4); idle[i] -= dt;
          if (idle[i] < 0) { idle[i] = 2 + r() * 5; const a = r() * PI * 2, d = r() * mill; ox[i] = Math.max(-tgtSpread, Math.min(tgtSpread, ox[i] + Math.cos(a) * d)); oz[i] = Math.max(-tgtSpread, Math.min(tgtSpread, oz[i] + Math.sin(a) * d)); }
          let tu = 0;
          if (mode[i] === 1) tu = Math.sin(t * 0.8 + i * 1.7) > 0.15 ? 1 : 0;
          else if (mode[i] === 2) tu = Math.sin(t * 1.9 + i * 2.3) > 0.55 ? 1 : 0;
          up[i] += (tu - up[i]) * Math.min(1, dt * 4); ph[i] += dt * (mode[i] === 1 ? 5.5 : 4);
        }
        const m = meshes[mi[i]], j = li[i], te = m.mesh.instanceMatrix.array, k16 = j * 16, s = sc[i], c = Math.cos(hd[i]) * s, sn = Math.sin(hd[i]) * s;
        te[k16] = c; te[k16 + 1] = 0; te[k16 + 2] = -sn; te[k16 + 3] = 0; te[k16 + 4] = 0; te[k16 + 5] = s; te[k16 + 6] = 0; te[k16 + 7] = 0;
        te[k16 + 8] = sn; te[k16 + 9] = 0; te[k16 + 10] = c; te[k16 + 11] = 0; te[k16 + 12] = px[i]; te[k16 + 13] = Math.abs(Math.sin(ph[i])) * 0.06 * amp[i]; te[k16 + 14] = pz[i]; te[k16 + 15] = 1;
        const aa = m.ia.array; aa[j * 3] = ph[i]; aa[j * 3 + 1] = amp[i]; aa[j * 3 + 2] = up[i];
      }
      for (let q = 0; q < meshes.length; q++) { meshes[q].mesh.instanceMatrix.needsUpdate = true; meshes[q].ia.needsUpdate = true; }
    }
    update(0, 0);
    return { mesh: group, setTargets, update, px, pz, heading: hd, kind: kindOf, count };
  };

  // ================================================================ 4. BUILDINGS
  function wins(L, face, W, D, cx, cz, y0, floors, fh, cols, ww, wh, r, glowP, frame) {
    const along = face === 'f' || face === 'b' ? W : D, step = along / cols;
    for (let f = 0; f < floors; f++) for (let i = 0; i < cols; i++) {
      const u = -along / 2 + (i + 0.5) * step, y = y0 + f * fh + fh * 0.55, lit = r() < glowP, l = lit ? L.glow : L.solid, c = lit ? IR.win : IR.glass;
      if (frame && face === 'f') Q(L.solid, ww + 0.36, wh + 0.42, frame, cx + u, y - 0.04, cz + D / 2 + 0.02, 0);
      if (face === 'f') Q(l, ww, wh, c, cx + u, y, cz + D / 2 + 0.03, 0);
      else if (face === 'b') Q(l, ww, wh, c, cx - u, y, cz - D / 2 - 0.03, PI);
      else if (face === 'l') Q(l, ww, wh, c, cx + W / 2 + 0.03, y, cz - u, HP);
      else Q(l, ww, wh, c, cx - W / 2 - 0.03, y, cz + u, -HP);
    }
  }
  function parapet(L, W, D, H, cx, cz, c, h) {
    h = h || 0.7; B(L.solid, W, h, 0.25, c, cx, H, cz + D / 2 - 0.12); B(L.solid, W, h, 0.25, c, cx, H, cz - D / 2 + 0.12);
    B(L.solid, 0.25, h, D - 0.5, c, cx + W / 2 - 0.12, H, cz); B(L.solid, 0.25, h, D - 0.5, c, cx - W / 2 + 0.12, H, cz);
  }
  // the Iranian roof: stair head, water tanks, the evaporative cooler, a satellite dish
  function roofKit(L, W, D, H, cx, cz, r, n) {
    B(L.solid, 2.4, 2.5, 2.8, IR.plaster2, cx - W / 2 + 1.6, H, cz - D / 2 + 1.8);
    for (let i = 0; i < (n.tanks || 0); i++) {
      const x = cx + W / 2 - 1.2 - i * 1.5, z = cz - D / 2 + 1.4, q = r(), c = q < 0.5 ? IR.tankW : q < 0.8 ? IR.tankB : IR.tankG;
      B(L.metal, 1.2, 0.3, 1.2, IR.rail, x, H, z); add(L.solid, P.cyl(0.55, 0.55, 1.3, 6), c, [x, H + 0.3 + 0.65, z]);
    }
    for (let i = 0; i < (n.coolers || 0); i++) {
      const x = cx - W / 2 + 4.8 + i * 2.2, z = cz + (r() - 0.3) * D * 0.4;
      B(L.solid, 1.05, 1.0, 1.05, IR.cooler, x, H, z); B(L.solid, 0.5, 0.5, 1.4, IR.cooler, x, H + 0.3, z + 1.1);
    }
    for (let i = 0; i < (n.dishes || 0); i++) {
      const x = cx + W / 2 - 1.3 - i * 1.6, z = cz + D / 2 - 1.6;
      add(L.metal, P.cyl(0.03, 0.03, 1.1, 4), IR.rail, [x, H + 0.55, z]);
      add(L.solid, P.cone(0.5, 0.2, 8), 0xd9dcdd, [x, H + 1.2, z + 0.1], [-1.05, 0.35, 0]);
    }
  }
  function tree(L, x, z, h, kind) {
    if (kind === 'pine') { CY(L.solid, 0.18, h * 0.3, IR.trunk, x, 0, z, 5); add(L.solid, P.cone(h * 0.24, h * 0.8, 7), IR.treeDark, [x, h * 0.55, z]); return; }
    CY(L.solid, 0.22, h * 0.45, IR.trunk, x, 0, z, 5);
    add(L.solid, new T.IcosahedronGeometry(h * 0.32, 0), IR.tree, [x, h * 0.66, z], [0.3, x, 0], [1, 0.85, 1]);
  }
  function lampPost(L, x, z, h) { CY(L.metal, 0.08, h, 0x4a4e52, x, 0, z, 5); B(L.metal, 0.9, 0.08, 0.12, 0x4a4e52, x + 0.4, h, z); B(L.glow, 0.32, 0.1, 0.18, IR.lamp, x + 0.8, h - 0.1, z); }
  function flagPole(grp, L, id, x, z, h, w) {
    CY(L.metal, 0.07, h, 0xc9cdd1, x, 0, z, 6); add(L.metal, P.sphere(0.13, 6, 4), IR.gold, [x, h + 0.1, z]);
    grp.add(plate(K.emblem(id, 256), w, w * 4 / 7, x + w / 2 + 0.05, h - w * 2 / 7 - 0.1, z, 0, { double: true, name: 'flag' }));
  }
  function greenFlag(L, x, y, z, h) { CY(L.metal, 0.04, h, 0x8a8f94, x, y, z, 5); B(L.solid, 0.02, 0.7, 1.1, 0x17803d, x, y + h - 0.75, z + 0.56); }

  // ---- marks that read FROM ABOVE: the board looks down on these places from far away, so whose a place is must show on its roof or its ground.
  // MARK[id] = [field, rim], the force's colours. roofMark lays a flat roundel in plain geometry (it survives uprising.js's phone flattener, which
  // bakes every mesh to vertex colour) and the emblem texture over it. The texture decal is NAMED 'glowAdd' ON PURPOSE: that flattener skips meshes
  // of that name (so a phone shows the coloured roundel, not a white square) and K.make's size fit ignores it, as it should for a decal.
  const MARK = { irgc: [0x0f4a24, 0xd9a640], basij: [0xf4f4f0, 0x17803d], faraja: [0x0d5a35, 0xf2f2ee], artesh: [0x151515, 0xd9a640] };
  function decal(grp, tex, w, h, x, y, z, rx, ry) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), matTex(tex)); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0, 'YXZ');
    m.name = 'glowAdd'; m.castShadow = false; m.receiveShadow = true; grp.add(m); return m;
  }
  function roofMark(L, grp, id, d, x, y, z, ry) {
    const [f, e] = MARK[id];
    add(L.solid, P.cyl(d * 0.57, d * 0.57, 0.1, 20), e, [x, y + 0.05, z]);
    add(L.solid, P.cyl(d * 0.5, d * 0.5, 0.16, 20), f, [x, y + 0.08, z]);
    decal(grp, K.emblem(id, 512), d * 0.98, d * 0.98, x, y + 0.24, z, -HP, ry || 0);
  }
  // a wall in x/y with an arched opening, extruded along z (the gate portals)
  function portalGeo(w, h, d, aw, ah) {
    const s = new T.Shape(), hw = aw / 2, sp = ah - aw * 0.55;
    s.moveTo(-w / 2, 0); s.lineTo(-hw, 0); s.lineTo(-hw, sp); s.quadraticCurveTo(-hw, ah - aw * 0.12, 0, ah); s.quadraticCurveTo(hw, ah - aw * 0.12, hw, sp);
    s.lineTo(hw, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath();
    return shapeGeo(s, d, 5);
  }
  // a big flag that reads from above: a geometry flag (the phone flattener keeps it) under the textured one (front and back faces)
  const FLAGF = { iri: [0x239f40, 0xffffff, 0xda0000], irgcflag: [0x0f5a2a], basijflag: [0x17803d], farajaflag: [0x0f6a43], arteshflag: [0x4b5a2a] };
  function bigFlag(grp, L, id, x, z, h, w, ry) {
    const fh = w * 4 / 7, cols = FLAGF[id] || [0x777777];
    into(L, (t) => {
      CY(t.metal, 0.09, h, 0xc9cdd1, 0, 0, 0, 6); add(t.metal, P.sphere(0.16, 6, 4), IR.gold, [0, h + 0.12, 0]);
      cols.forEach((c, i) => B(t.solid, w, fh / cols.length, 0.04, c, w / 2 + 0.1, h - 0.15 - fh + fh * (cols.length - 1 - i) / cols.length, 0));
    }, x, 0, z, ry || 0);
    const cx = x + Math.cos(ry || 0) * (w / 2 + 0.1), cz = z - Math.sin(ry || 0) * (w / 2 + 0.1), y = h - 0.15 - fh / 2, tex = K.emblem(id, 256);
    for (const k of [1, -1]) decal(grp, tex, w, fh, cx + Math.sin(ry || 0) * 0.06 * k, y, cz + Math.cos(ry || 0) * 0.06 * k, 0, (ry || 0) + (k < 0 ? PI : 0));
  }
  // a light 125cc motorbike for the sites (the full one is 340 triangles; this is about 90)
  function bikeLite(L, col) {
    for (const z of [0.64, -0.62]) add(L.solid, P.cyl(0.3, 0.3, 0.09, 7), IR.rubber, [0, 0.3, z], [0, 0, HP]);
    B(L.solid, 0.26, 0.3, 0.62, col, 0, 0.42, 0.12); B(L.solid, 0.24, 0.1, 0.62, 0x161616, 0, 0.72, -0.3);
    B(L.metal, 0.06, 0.6, 0.06, IR.chrome, 0, 0.42, 0.58, 0, -0.35); B(L.metal, 0.7, 0.04, 0.04, 0x2a2c2f, 0, 1.0, 0.48);
  }
  // a tank (Zulfiqar / T-72 class): tracks, hull, turret, the long gun
  function tankParts(L, col) {
    B(L.solid, 3.5, 0.75, 6.9, 0x2c2c28, 0, 0.05, 0); B(L.solid, 3.3, 0.7, 6.5, col, 0, 0.75, 0);
    add(L.solid, P.cyl(1.2, 1.45, 0.8, 8), col, [0, 1.85, -0.4]); B(L.solid, 0.5, 0.3, 0.6, 0x3a3a33, 0.6, 2.25, -0.6);
    add(L.metal, P.cyl(0.09, 0.11, 4.8, 6), 0x4a4a3c, [0, 1.95, 2.9], [HP, 0, 0]);
  }

  function bHouse(o) {
    const L = K.lists(), r = rng(11 + (o.variant === 'stone' ? 5 : 0)), W = 10, D = 13, fl = 3, fh = 3.1, H = fl * fh + 0.4, wall = o.variant === 'stone' ? IR.stone : IR.brick;
    B(L.solid, W, H, D, IR.plaster2, 0, 0, 0);
    B(L.solid, W + 0.06, H, 0.25, wall, 0, 0, D / 2 - 0.1);
    B(L.solid, W + 0.12, 0.9, 0.35, IR.stone2, 0, 0, D / 2 - 0.05);
    B(L.solid, W + 0.3, 0.3, 0.6, IR.stone2, 0, H - 0.3, D / 2 - 0.1);
    Q(L.metal, 3.0, 2.4, 0x3e5c4d, -2.7, 1.3, D / 2 + 0.05);
    Q(L.solid, 1.1, 2.2, 0x4a3426, 1.0, 1.2, D / 2 + 0.05);
    Q(L.solid, 1.3, 1.1, IR.glass, 3.2, 1.75, D / 2 + 0.05);
    for (let f = 1; f < fl; f++) {
      const y = f * fh;
      for (const x of [-3.3, 0, 3.3]) { const lit = r() < 0.15; Q(L.solid, 1.86, 2.15, o.variant === 'stone' ? IR.stone2 : IR.stone, x, y + 1.56, D / 2 + 0.04); Q(lit ? L.glow : L.solid, 1.5, 1.75, lit ? IR.win : IR.glass, x, y + 1.6, D / 2 + 0.05); }
      B(L.solid, 2.7, 0.16, 1.0, IR.stone2, 0, y + 0.05, D / 2 + 0.5); Q(L.metal, 2.7, 0.9, IR.rail, 0, y + 0.66, D / 2 + 0.98);
    }
    wins(L, 'b', W, D, 0, 0, 0, fl, fh, 2, 1.4, 1.5, r, 0.1);
    parapet(L, W, D, H, 0, 0, IR.stone2, 0.6);
    roofKit(L, W, D, H, 0, 0, r, { tanks: 2, coolers: 1, dishes: 1 });
    return K.group(L, o.team, 'house');
  }
  function bApartment(o) {
    const L = K.lists(), r = rng(23), W = 14, D = 20, fl = o.variant === 'tall' ? 12 : 8, fh = 3.1, H = fl * fh + 0.6;
    B(L.solid, W, H, D, IR.plaster, 0, 0, 0);
    B(L.solid, W + 0.1, H + 0.5, 0.4, IR.stone, 0, 0, D / 2 - 0.1);
    B(L.solid, W + 0.6, 0.55, 0.9, IR.stone2, 0, H, D / 2 - 0.1);
    B(L.solid, 0.8, H, 0.7, IR.stone2, -W / 2 + 0.4, 0, D / 2); B(L.solid, 0.8, H, 0.7, IR.stone2, W / 2 - 0.4, 0, D / 2);
    Q(L.metal, 4.6, 2.6, 0x2f3338, -3.6, 1.35, D / 2 + 0.12); Q(L.glass, 2.0, 2.5, 0x3d5566, 2.4, 1.3, D / 2 + 0.12); B(L.solid, 3.2, 0.25, 1.4, IR.stone2, 2.4, 2.8, D / 2 + 0.6);
    for (let f = 1; f < fl; f++) {
      const y = f * fh;
      for (const x of [-4.4, 4.4]) { const lit = r() < 0.13; Q(L.solid, 2.8, 2.5, IR.stone2, x, y + 1.5, D / 2 + 0.11); Q(lit ? L.glow : L.solid, 2.3, 1.9, lit ? IR.win : IR.glass, x, y + 1.55, D / 2 + 0.12); }
      Q(L.solid, 2.0, 2.3, IR.glass, 0, y + 1.3, D / 2 + 0.12);
      B(L.solid, 3.0, 0.16, 1.1, IR.stone2, 0, y + 0.05, D / 2 + 0.6); Q(L.metal, 3.0, 0.95, IR.rail, 0, y + 0.68, D / 2 + 1.14);
    }
    wins(L, 'b', W, D, 0, 0, 0, fl, fh, 3, 1.5, 1.5, r, 0.08);
    wins(L, 'l', W, D, 0, 0, fh, fl - 1, fh, 1, 0.9, 1.0, r, 0.05);
    roofKit(L, W, D, H, 0, 0, r, { tanks: 3, coolers: 2, dishes: 2 });
    return K.group(L, o.team, 'apartment');
  }
  function bTower(o) {
    const L = K.lists(), r = rng(37), W = 22, D = 22, fl = 24, fh = 3.4, H = fl * fh, P0 = 7;
    B(L.solid, W + 8, P0, D + 8, IR.stone2, 0, 0, 0);
    Q(L.glass, W + 6, 3.4, 0x3d5566, 0, 2.0, D / 2 + 4.03);
    B(L.metal, W, H, D, 0x56778f, 0, P0, 0);
    for (let f = 0; f <= fl; f++) B(L.solid, W + 0.35, 0.45, D + 0.35, IR.stone, 0, P0 + f * fh - 0.2, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(L.solid, 1.3, H, 1.3, IR.stone, sx * (W / 2 - 0.3), P0, sz * (D / 2 - 0.3));
    B(L.solid, W - 6, 5, D - 6, IR.stone, 0, P0 + H, 0);
    CY(L.metal, 0.25, 14, 0xc0c4c8, 0, P0 + H + 5, 0, 5, 0.08); B(L.glow, 0.4, 0.4, 0.4, 0xff3b30, 0, P0 + H + 19, 0);
    for (let i = 0; i < 26; i++) {
      const f = Math.floor(r() * fl), face = Math.floor(r() * 4), u = (r() - 0.5) * (W - 3), y = P0 + f * fh + 1.6;
      if (face === 0) Q(L.glow, 2.2, 1.8, IR.win, u, y, D / 2 + 0.04, 0); else if (face === 1) Q(L.glow, 2.2, 1.8, IR.win, -u, y, -D / 2 - 0.04, PI);
      else if (face === 2) Q(L.glow, 2.2, 1.8, IR.win, W / 2 + 0.04, y, u, HP); else Q(L.glow, 2.2, 1.8, IR.win, -W / 2 - 0.04, y, -u, -HP);
    }
    return K.group(L, o.team, 'tower');
  }
  function bShops(o) {
    const L = K.lists(), r = rng(53), shut = o.variant === 'shut', n = 4, uw = 3.9, W = n * uw + 0.6, D = 12, gh = 4.2, fl = 2, fh = 3.1, H = gh + fl * fh + 0.3;
    B(L.solid, W, H, D, IR.plaster2, 0, 0, 0);
    B(L.solid, W + 0.06, H - gh, 0.25, IR.brick, 0, gh, D / 2 - 0.1);
    B(L.solid, W + 0.3, 0.3, 0.6, IR.stone2, 0, H - 0.3, D / 2 - 0.1);
    for (let i = 0; i <= n; i++) B(L.solid, 0.4, gh, 0.45, IR.stone2, -W / 2 + 0.3 + i * uw, 0, D / 2);
    B(L.solid, W, 0.18, 0.5, IR.stone2, 0, gh - 0.1, D / 2);
    const goods = [0xc8742c, 0x6f8f3a, 0x8a2f2f, 0x2f5f8a, 0xd8c39a];
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + 0.3 + (i + 0.5) * uw;
      if (!shut) {
        Q(L.solid, uw - 0.4, 3.0, 0x2a2622, x, 1.5, D / 2 - 0.05);
        Q(L.glow, uw - 0.9, 1.3, 0xbfa77c, x, 2.1, D / 2 - 0.12);
        B(L.solid, uw - 1.2, 0.95, 0.7, goods[i % goods.length], x, 0, D / 2 + 0.3);
        B(L.metal, uw - 0.35, 0.36, 0.36, IR.shutter, x, 3.0, D / 2 + 0.06);
      }
    }
    wins(L, 'f', W, D + 0.2, 0, 0, gh, fl, fh, 4, 1.6, 1.6, r, 0.12, IR.stone2);
    for (let f = 0; f < fl; f++) Q(L.metal, 2.2, 0.8, IR.rail, -W / 2 + 0.3 + 1.5 * uw, gh + f * fh + 0.6, D / 2 + 0.6);
    parapet(L, W, D, H, 0, 0, IR.stone2, 0.6);
    roofKit(L, W, D, H, 0, 0, r, { tanks: 2, coolers: 2, dishes: 2 });
    const grp = K.group(L, o.team, 'shops');
    grp.add(plate(shopSignTex(), W - 0.5, 0.78, 0, 3.78, D / 2 + 0.27, 0, { name: 'signs' }));
    if (shut) grp.add(plate(shutterTex(), W - 0.6, 3.35, 0, 1.68, D / 2 + 0.02, 0, { name: 'shutters' }));
    return grp;
  }
  function bBazaar(o) {
    const L = K.lists(), len = 44, W = 9, H = 6.5, n = 8, step = len / n;
    B(L.solid, W, H, len, IR.brick, 0, 0, 0);
    for (const sx of [-1, 1]) {
      B(L.solid, 6, 4.4, len, IR.brick2, sx * (W / 2 + 3), 0, 0);
      for (let i = 0; i < n; i++) { const z = -len / 2 + (i + 0.5) * step; add(L.solid, cap(2.6, 6, 2), IR.brick2, [sx * (W / 2 + 3), 4.4, z], null, [1.05, 0.62, 1.0]); add(L.glow, new T.PlaneGeometry(0.6, 0.6), 0xf6e7c0, [sx * (W / 2 + 3), 4.4 + 1.63, z], [-HP, 0, 0]); }
      for (let i = 0; i < n; i++) Q(L.solid, 2.6, 2.8, 0x2a2420, sx * (W / 2 + 6.03), 1.5, -len / 2 + (i + 0.5) * step, sx * HP);
    }
    for (let i = 0; i < n; i++) {
      const z = -len / 2 + (i + 0.5) * step;
      add(L.solid, cap(2.9, 8, 3), IR.brick, [0, H, z], null, [1.4, 0.82, 1.3]);
      B(L.solid, W + 0.2, 0.7, 0.7, IR.brickDark, 0, H - 0.2, z - step / 2);
      add(L.solid, P.cyl(0.55, 0.65, 0.55, 6), IR.brickDark, [0, H + 2.3, z]);
      add(L.glow, disc(0.42, 6), 0xf6e7c0, [0, H + 2.58, z]);
    }
    const zf = len / 2;
    B(L.solid, W + 5, H + 5, 2.2, IR.brick, 0, 0, zf + 1.1);
    B(L.solid, 8.2, 10.4, 0.1, IR.tile, 0, 0.2, zf + 2.24);
    add(L.solid, arch(5.4, 9.2, 0.14), 0x1c1916, [0, 0, zf + 2.3]);
    B(L.solid, W + 5, 1.1, 0.12, IR.tileDeep, 0, H + 3.3, zf + 2.26);
    B(L.solid, W + 5.6, 0.5, 2.6, IR.brickDark, 0, H + 5, zf + 1.1);
    return K.group(L, o.team, 'bazaar');
  }
  function minaret(L, x, z, h, body, cap, gold) {
    CY(L.solid, 1.05, h, body, x, 0, z, 8, 0.85);
    CY(L.solid, 1.55, 0.7, IR.tileDeep, x, h * 0.78, z, 8);
    CY(L.solid, 0.8, h * 0.16, cap, x, h, z, 8);
    add(gold ? L.metal : L.solid, P.cone(0.95, 2.4, 8), gold ? IR.gold : cap, [x, h + h * 0.16 + 1.2, z]);
    add(L.metal, P.cyl(0.05, 0.05, 1.2, 4), IR.gold, [x, h + h * 0.16 + 2.9, z]);
  }
  const onion = (r, h) => P.lathe([[0, 0], [r, 0], [r * 1.07, h * 0.16], [r * 1.03, h * 0.36], [r * 0.86, h * 0.56], [r * 0.56, h * 0.74], [r * 0.24, h * 0.88], [r * 0.05, h * 0.97], [0, h]], 14);
  function bMosque(o) {
    const L = K.lists();
    B(L.solid, 24, 10, 20, IR.brick, 0, 0, -2);
    B(L.solid, 24.3, 1.0, 20.3, IR.tileDeep, 0, 8.7, -2);
    CY(L.solid, 6.2, 4, IR.tile, 0, 9.95, -2, 14);
    CY(L.solid, 6.35, 0.8, IR.tileDeep, 0, 10.02, -2, 14);
    add(L.solid, onion(6.3, 10.5), IR.tile, [0, 14, -2]);
    add(L.metal, P.cyl(0.08, 0.08, 2.4, 4), IR.gold, [0, 25.6, -2]); add(L.metal, P.sphere(0.35, 6, 4), IR.gold, [0, 25.2, -2]);
    B(L.solid, 13, 17, 3.2, IR.brick, 0, 0, 9.6);
    B(L.solid, 9.6, 13.6, 0.1, IR.tile, 0, 0.6, 11.25);
    add(L.solid, arch(6.6, 11.4, 0.14), 0x1b2a3d, [0, 0, 11.32]);
    Q(L.solid, 2.2, 3.0, 0x4a3426, 0, 1.5, 11.42);
    B(L.solid, 13.2, 1.2, 0.12, IR.tileDeep, 0, 15.2, 11.27);
    minaret(L, -8.2, 9.6, 24, IR.tileLight, IR.tile, false); minaret(L, 8.2, 9.6, 24, IR.tileLight, IR.tile, false);
    return K.group(L, o.team, 'mosque');
  }
  function bShrine(o) {
    const L = K.lists();
    B(L.solid, 46, 0.3, 40, 0xe9e5dc, 0, 0, 0);
    for (const sx of [-1, 1]) {
      B(L.solid, 3, 8, 34, IR.tileDeep, sx * 21.5, 0, -1);
      for (let i = 0; i < 6; i++) add(L.solid, arch(2.6, 5.4, 0.1), 0x18243a, [sx * (20 - 0.02), 0.3, -14 + i * 5.2], [0, sx * -HP, 0]);
    }
    B(L.solid, 22, 11, 16, IR.tile, 0, 0, -10);
    CY(L.metal, 6.4, 5, IR.gold, 0, 11, -10, 14);
    add(L.metal, onion(6.6, 11.5), IR.gold, [0, 16, -10]);
    add(L.metal, P.cyl(0.1, 0.1, 3, 4), IR.gold, [0, 28.5, -10]);
    B(L.solid, 14, 18, 3, IR.tileDeep, 0, 0, 0);
    B(L.metal, 10, 14, 0.1, IR.gold, 0, 0.6, 1.55);
    add(L.solid, arch(6.8, 11.5, 0.14), 0x2a2216, [0, 0, 1.62]);
    minaret(L, -9.2, 0, 26, IR.tile, IR.gold, true); minaret(L, 9.2, 0, 26, IR.tile, IR.gold, true);
    return K.group(L, o.team, 'shrine');
  }
  // the University of Tehran gate (Kourosh Farzami, 1965): slender concrete piers that flare into canopies, two arches side by side
  function utGateUnit() {
    const s = new T.Shape();
    s.moveTo(-5.5, 0); s.lineTo(-4.75, 0); s.quadraticCurveTo(-4.75, 7.4, -1.2, 9.2); s.quadraticCurveTo(0, 9.6, 1.2, 9.2); s.quadraticCurveTo(4.75, 7.4, 4.75, 0); s.lineTo(5.5, 0);
    s.quadraticCurveTo(5.6, 8.2, 7.0, 11.2); s.quadraticCurveTo(0, 10.0, -7.0, 11.2); s.quadraticCurveTo(-5.6, 8.2, -5.5, 0); s.closePath();
    return shapeGeo(s, 5.2, 6);
  }
  function bUniversity(o) {
    const L = K.lists(), r = rng(61);
    for (const sx of [-1, 1]) { add(L.solid, utGateUnit(), IR.concreteW, [sx * 6.3, 0, 0]); B(L.solid, 1.5, 0.7, 6.0, 0xcac5ba, sx * 1.2, 0, 0); B(L.solid, 1.5, 0.7, 6.0, 0xcac5ba, sx * 11.4, 0, 0); }
    for (const sx of [-1, 1]) { B(L.metal, 12, 2.2, 0.08, IR.rail, sx * 19.2, 0, 0); for (let i = 0; i < 5; i++) B(L.metal, 0.2, 2.5, 0.2, IR.rail, sx * (13.4 + i * 2.9), 0, 0); }
    B(L.solid, 44, 10, 13, IR.brick, 0, 0, -24);
    wins(L, 'f', 44, 13, 0, -24, 0, 3, 3.3, 11, 1.8, 1.8, r, 0.1);
    B(L.solid, 44.4, 0.6, 13.4, IR.stone2, 0, 10, -24);
    for (const x of [-18, -9, 9, 18]) tree(L, x, -11, 9, 'pine');
    return K.group(L, o.team, 'university');
  }
  function bGovt(o) {
    const L = K.lists(), r = rng(71), W = 36, D = 18, fl = 4, fh = 3.8, H = fl * fh + 1.2, grp = new T.Group();
    B(L.solid, W + 1, 1.2, D + 1, IR.stone2, 0, 0, 0);
    B(L.solid, W, H - 1.2, D, IR.stone, 0, 1.2, 0);
    B(L.solid, W + 0.8, 0.8, D + 0.8, IR.stone2, 0, H, 0);
    wins(L, 'f', W, D, 0, 0, 1.2, fl, fh, 10, 1.4, 2.0, r, 0.1);
    wins(L, 'b', W, D, 0, 0, 1.2, fl, fh, 10, 1.4, 2.0, r, 0.06);
    B(L.solid, 13, 1.4, 4.4, IR.stone2, 0, H - 1.6, D / 2 + 2.2);
    for (let i = 0; i < 6; i++) CY(L.solid, 0.5, H - 3.0, 0xe6dfcc, -6 + i * 2.4, 1.2, D / 2 + 3.2, 8, 0.45);
    for (let i = 0; i < 3; i++) B(L.solid, 14 - i * 0.6, 0.4, 2.2 - i * 0.6, IR.stone2, 0, 0.8 + i * 0.4 - 0.8, D / 2 + 4.3 + (2 - i) * 0.3);
    flagPole(grp, L, 'iri', 0, D / 2 - 2, H + 9, 3.6);
    grp.add(K.group(L, o.team, 'govt'));
    return grp;
  }
  function bIrib(o) {
    const L = K.lists(), r = rng(81), grp = new T.Group(), W = 30, D = 12, H = 16;
    B(L.solid, W, H, D, IR.brick2, 0, 0, 0);
    for (let f = 0; f < 4; f++) B(L.solid, W + 0.2, 1.4, D + 0.2, IR.glass, 0, 1.5 + f * 3.6, 0);
    B(L.solid, W + 0.5, 0.6, D + 0.5, IR.stone2, 0, H, 0);
    const mx = W / 2 + 6, segs = 7;
    for (let i = 0; i < segs; i++) { const h0 = i * 8, rb = 1.6 - i * 0.2, rt = 1.6 - (i + 1) * 0.2; add(L.solid, P.cyl(rt, rb, 8, 3), i % 2 ? 0xf2f2ee : 0xd2312a, [mx, h0 + 4, 0]); }
    for (const h0 of [20, 38]) { CY(L.metal, 2.1, 0.3, 0x6a6e72, mx, h0, 0, 6); add(L.solid, P.cone(1.0, 0.45, 8), 0xdcdedf, [mx + 1.4, h0 + 1.1, 0], [0, 0, -HP]); }
    add(L.metal, P.cyl(0.08, 0.08, 6, 4), 0xc0c4c8, [mx, 59, 0]); B(L.glow, 0.5, 0.5, 0.5, 0xff3b30, mx, 62, 0);
    for (let i = 0; i < 3; i++) { const x = -10 + i * 7; add(L.metal, P.cyl(0.15, 0.15, 1.6, 5), 0x6a6e72, [x, H + 1.4, 0]); add(L.solid, P.cone(1.8, 0.7, 10), 0xe2e4e5, [x, H + 2.5, 0.3], [-1.0, 0, 0]); }
    grp.add(K.group(L, o.team, 'irib'));
    grp.add(plate(boardTex('irib', { bg: '#163a6b', fg: '#ffffff', lines: [['صدا و سیما', 64]] }), 10, 2.5, 0, H - 2.2, D / 2 + 0.2, 0, { name: 'sign' }));
    return grp;
  }
  function watchtower(L, x, z, h) {
    B(L.solid, 2.2, h, 2.2, 0xbdb5a4, x, 0, z);
    B(L.solid, 3.4, 2.3, 3.4, 0xcfc8b8, x, h, z);
    B(L.solid, 3.5, 0.9, 3.5, IR.glass, x, h + 1.1, z);
    B(L.solid, 4.0, 0.3, 4.0, 0x7d776d, x, h + 2.3, z);
    B(L.glow, 0.5, 0.4, 0.6, 0xfff2c4, x, h + 2.6, z);
  }
  function compound(L, W, D, h, t, col, gateW, topCol) {
    const seg = (W - gateW) / 2;
    B(L.solid, W, h, t, col, 0, 0, -D / 2); B(L.solid, t, h, D, col, -W / 2, 0, 0); B(L.solid, t, h, D, col, W / 2, 0, 0);
    B(L.solid, seg, h, t, col, -(gateW / 2 + seg / 2), 0, D / 2); B(L.solid, seg, h, t, col, gateW / 2 + seg / 2, 0, D / 2);
    if (topCol) {
      const c = 0.35; B(L.solid, W + 0.1, c, t + 0.1, topCol, 0, h, -D / 2); B(L.solid, t + 0.1, c, D, topCol, -W / 2, h, 0); B(L.solid, t + 0.1, c, D, topCol, W / 2, h, 0);
      B(L.solid, seg, c, t + 0.1, topCol, -(gateW / 2 + seg / 2), h, D / 2); B(L.solid, seg, c, t + 0.1, topCol, gateW / 2 + seg / 2, h, D / 2);
    }
  }
  function bPrison(o) {
    const L = K.lists(), grp = new T.Group(), W = 90, D = 70, h = 6.5;
    B(L.solid, W, 0.12, D, 0x5a5a55, 0, 0, 0);
    compound(L, W, D, h, 1.0, 0xc3baa6, 8, 0x9c9483);
    for (const [x0, z0, x1, z1] of [[-W / 2, -D / 2, W / 2, -D / 2], [-W / 2, -D / 2, -W / 2, D / 2], [W / 2, -D / 2, W / 2, D / 2], [-W / 2, D / 2, -5, D / 2], [5, D / 2, W / 2, D / 2]]) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      add(L.metal, P.cyl(0.18, 0.18, len, 4), 0x55595c, [(x0 + x1) / 2, h + 0.9, (z0 + z1) / 2], Math.abs(z1 - z0) < 0.01 ? [0, 0, HP] : [HP, 0, 0]);
    }
    for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2], [-W / 2, 0], [W / 2, 0]]) watchtower(L, x, z, 9);
    B(L.solid, 18, 8, 9, 0xb5ad9b, 0, 0, D / 2 - 4.5); Q(L.metal, 6, 4.6, 0x3a3e42, 0, 2.3, D / 2 + 0.05);
    for (let i = 0; i < 3; i++) {
      const z = -D / 2 + 12 + i * 15; B(L.solid, 44, 11, 9, 0xc9c1af, -8, 0, z);
      for (let f = 0; f < 3; f++) { Q(L.solid, 40, 0.5, 0x1f2224, -8, 2.2 + f * 3.4, z + 4.53, 0); Q(L.solid, 40, 0.5, 0x1f2224, -8, 2.2 + f * 3.4, z - 4.53, PI); }
    }
    for (const [x, z] of [[28, -20], [28, 18], [-36, 28]]) { CY(L.metal, 0.15, 12, 0x6a6e72, x, 0, z, 5); B(L.glow, 1.2, 0.4, 0.6, 0xfff2c4, x, 12, z); }
    grp.add(K.group(L, o.team, 'prison'));
    grp.add(plate(boardTex('evin', { bg: '#2c3a4a', fg: '#ffffff', lines: [['زندان اوین', 64]] }), 9, 2.2, 0, 6.6, D / 2 + 0.12, 0, { name: 'sign' }));
    return grp;
  }
  function bHospital(o) {
    const L = K.lists(), grp = new T.Group(), W = 40, D = 16, fl = 6, fh = 3.4, H = fl * fh + 0.5;
    B(L.solid, W, H, D, 0xeceae4, 0, 0, 0);
    for (let f = 0; f < fl; f++) { Q(L.solid, W - 2, 1.6, 0x35566e, 0, f * fh + 1.9, D / 2 + 0.03, 0); Q(L.solid, W - 2, 1.6, 0x35566e, 0, f * fh + 1.9, -D / 2 - 0.03, PI); }
    B(L.solid, 6, H + 3, 6, 0xd9d6ce, -W / 2 + 4, 0, 0);
    B(L.solid, W + 0.4, 0.5, D + 0.4, 0xc9c5bc, 0, H, 0);
    B(L.solid, 12, 0.4, 6, 0xeceae4, 6, 3.6, D / 2 + 3); for (const x of [0.5, 11.5]) CY(L.metal, 0.15, 3.6, 0xb9bec2, x, 0, D / 2 + 5.6, 6);
    B(L.solid, 12, 0.6, 0.1, 0xc8102e, 6, 3.4, D / 2 + 6.02);
    into(L, (t) => { B(t.solid, 2.0, 2.2, 5.2, 0xf2f2ee, 0, 0.45, 0); B(t.solid, 2.04, 0.3, 5.24, 0xd9531e, 0, 1.15, 0); Q(t.solid, 1.8, 0.9, IR.glass, 0, 2.0, 2.63, 0); B(t.glow, 1.2, 0.18, 0.3, 0x3b7bff, 0, 2.65, 1.6); for (const [x, z] of [[-0.9, 1.7], [0.9, 1.7], [-0.9, -1.6], [0.9, -1.6]]) add(t.solid, P.cyl(0.38, 0.38, 0.25, 8), IR.rubber, [x, 0.38, z], [0, 0, HP]); }, 12, 0, D / 2 + 4.5, HP);
    grp.add(K.group(L, o.team, 'hospital'));
    grp.add(plate(canvasTex('hospsign', 512, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8102e'; g.beginPath(); g.arc(w - 70, h / 2, 42, 0, PI * 2); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w - 56, h / 2 - 6, 38, 0, PI * 2); g.fill(); rtl(g, 'بیمارستان', w / 2 - 40, h / 2 + 2, 62, '#123a6b'); }), 12, 3, 0, H - 2.6, D / 2 + 0.06, 0, { name: 'sign' }));
    grp.add(plate(boardTex('er', { bg: '#c8102e', fg: '#ffffff', lines: [['اورژانس', 70]] }), 5, 1.2, 6, 4.6, D / 2 + 6.1, 0, { name: 'sign2' }));
    return grp;
  }
  // a square: the roundabout and its monument. Default: Tehran's Azadi Tower; variant 'fountain' a fountain and obelisk
  function azadiGeo() {
    const s = new T.Shape();
    s.moveTo(-22, 0); s.quadraticCurveTo(-13, 5, -9.6, 17); s.quadraticCurveTo(-7.2, 26, -5.6, 31); s.lineTo(5.6, 31); s.quadraticCurveTo(7.2, 26, 9.6, 17); s.quadraticCurveTo(13, 5, 22, 0);
    s.lineTo(8.6, 0); s.lineTo(8.6, 6.5); s.quadraticCurveTo(8.2, 14.6, 0, 19.5); s.quadraticCurveTo(-8.2, 14.6, -8.6, 6.5); s.lineTo(-8.6, 0); s.closePath();
    const g = shapeGeo(s, 16, 8), a = g.attributes.position;
    for (let i = 0; i < a.count; i++) { const y = a.getY(i) / 31; a.setZ(i, a.getZ(i) * (1 - 0.55 * Math.pow(y, 0.8))); }
    g.computeVertexNormals(); return g;
  }
  function bSquare(o) {
    const L = K.lists();
    CY(L.solid, 31, 0.25, IR.stone2, 0, 0, 0, 28); CY(L.solid, 30, 0.4, IR.grass, 0, 0, 0, 28);
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; B(L.solid, 3.4, 0.55, 1.4, i % 2 ? 0xc0392b : 0xe2b33c, Math.cos(a) * 26, 0.3, Math.sin(a) * 26, -a); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2 + 0.26; lampPost(L, Math.cos(a) * 29, Math.sin(a) * 29, 7); }
    if (o.variant === 'fountain') {
      CY(L.solid, 9, 0.9, IR.stone, 0, 0.3, 0, 16); CY(L.glass, 8.4, 0.2, 0x3d6f8f, 0, 1.0, 0, 16);
      B(L.solid, 1.6, 12, 1.6, IR.stone, 0, 1, 0); add(L.solid, P.cone(1.1, 2, 4), IR.stone, [0, 14, 0], [0, PI / 4, 0]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; add(L.glowAdd, P.cone(0.35, 3.2, 5), 0x6f8fa8, [Math.cos(a) * 5, 2.6, Math.sin(a) * 5]); }
    } else {
      B(L.solid, 46, 0.35, 14, 0xd8d2c4, 0, 0.3, 0);
      add(L.solid, azadiGeo(), 0xebe6da, [0, 0.6, 0]);
      B(L.solid, 11.6, 3.0, 7.4, 0xebe6da, 0, 31.4, 0); add(L.solid, P.hemi(2.8, 10), 0xe2ddd0, [0, 34.4, 0]);
      for (let i = 0; i < 4; i++) { Q(L.solid, 1.2, 2.0, 0x2a3540, -4.5 + i * 3, 33.0, 3.73, 0); Q(L.solid, 1.2, 2.0, 0x2a3540, -4.5 + i * 3, 33.0, -3.73, PI); }
    }
    return K.group(L, o.team, 'square');
  }
  function bPark(o) {
    const L = K.lists(), r = rng(91);
    B(L.solid, 40, 0.2, 40, IR.grass, 0, 0, 0);
    B(L.solid, 40, 0.24, 2.6, 0xc8b88f, 0, 0, 0); B(L.solid, 2.6, 0.24, 40, 0xc8b88f, 0, 0, 0);
    CY(L.solid, 5.5, 0.5, IR.stone2, 9, 0, 9, 14); CY(L.glass, 5.0, 0.12, 0x3d6f8f, 9, 0.45, 9, 14);
    for (let i = 0; i < 12; i++) { const x = (r() - 0.5) * 34, z = (r() - 0.5) * 34; if (Math.abs(x) < 2.5 || Math.abs(z) < 2.5 || (Math.abs(x - 9) < 7 && Math.abs(z - 9) < 7)) continue; tree(L, x, z, 8 + r() * 5, r() < 0.3 ? 'pine' : 'plane'); }
    for (const [x, z, ry] of [[-6, 2.2, 0], [6, -2.2, PI], [2.2, -8, HP], [-2.2, 8, -HP]]) into(L, (t) => { B(t.solid, 1.8, 0.08, 0.5, 0x6b4a2e, 0, 0.45, 0); B(t.solid, 1.8, 0.5, 0.08, 0x6b4a2e, 0, 0.55, -0.24); B(t.metal, 0.08, 0.45, 0.5, 0x2a2c2f, -0.8, 0, 0); B(t.metal, 0.08, 0.45, 0.5, 0x2a2c2f, 0.8, 0, 0); }, x, 0, z, ry);
    for (const [x, z] of [[-3, -3], [3, 3], [-15, 3], [15, -3]]) lampPost(L, x, z, 5);
    return K.group(L, o.team, 'park');
  }

  /* K.city.building(footprint, height, style) -> Mesh. footprint: [[x, z], ...] metres (OSM ring, either winding, closing point optional).
     style 'house' | 'apartment' | 'shops' | 'govt'. Flat roof, facade bands per floor, a water tank: under 200 triangles for small rings.
     K.city.buildings([{ footprint, height, style }, ...]) -> ONE Mesh for a whole district (one draw call). */
  const BST = {
    house: { walls: [0xbf9466, 0xc9a77c, 0xb88a5e, 0xd4c3a3, 0xc2a07a], band: 0x5c4a3a, roof: 0x8d857a },
    apartment: { walls: [0xd8cdb5, 0xcfc2a5, 0xc6b79a, 0xbdb3a2, 0xe0d8c6], band: 0x3d4650, roof: 0x9a9286 },
    shops: { walls: [0xb98d62, 0xc7b08e, 0xcdbfa6], band: 0x48505a, roof: 0x8a8378, ground: 0x8f9599 },
    govt: { walls: [0xd6ccb4, 0xcdc3ab], band: 0x3a4550, roof: 0x8e877c }
  };
  const _ca = new T.Color(), _cb = new T.Color();
  function buildingArrays(fp, h, style, outP, outC) {
    let pts = fp.map((p) => (Array.isArray(p) ? [p[0], p[1]] : [p.x, p.z != null ? p.z : p.y]));
    if (pts.length > 2 && Math.abs(pts[0][0] - pts[pts.length - 1][0]) < 1e-6 && Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 1e-6) pts.pop();
    const n = pts.length; if (n < 3 || !(h > 0)) return;
    let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    if (area > 0) pts.reverse();
    const st = BST[style] || BST.apartment;
    let hash = 0; for (let i = 0; i < n; i++) hash = (hash * 31 + Math.round(pts[i][0] * 7 + pts[i][1] * 13)) | 0;
    const wall = st.walls[Math.abs(hash) % st.walls.length];
    const floors = Math.max(1, Math.round(h / 3.2)), fh = h / floors;
    const budget = 180 - 2 * (n - 2), perBand = 4 * n;
    const banded = floors * 2 * perBand <= budget;
    const push = (ax, ay, az, bx, by, bz, cx, cy, cz, col) => { outP.push(ax, ay, az, bx, by, bz, cx, cy, cz); for (let k = 0; k < 3; k++) outC.push(col.r, col.g, col.b); };
    const quad = (a, b, y0, y1, col) => { push(a[0], y0, a[1], b[0], y0, b[1], b[0], y1, b[1], col); push(a[0], y0, a[1], b[0], y1, b[1], a[0], y1, a[1], col); };
    _ca.setHex(wall); _cb.setHex(st.band);
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      if (banded) {
        for (let f = 0; f < floors; f++) {
          const y0 = f * fh, w0 = y0 + fh * 0.35, w1 = y0 + fh * 0.78;
          if (style === 'shops' && f === 0) { quad(a, b, 0, fh * 0.85, _cb.setHex(st.ground)); quad(a, b, fh * 0.85, fh, _ca); _cb.setHex(st.band); continue; }
          quad(a, b, y0, w0, _ca); quad(a, b, w0, w1, _cb); quad(a, b, w1, y0 + fh, _ca);
        }
      } else {
        if (style === 'shops') { quad(a, b, 0, 3.4, _cb.setHex(st.ground)); _cb.setHex(st.band); quad(a, b, 3.4, h, _ca); }
        else quad(a, b, 0, h, _ca);
      }
    }
    const tri = T.ShapeUtils.triangulateShape(pts.map((p) => new T.Vector2(p[0], p[1])), []), rc = _cb.setHex(st.roof);
    tri.forEach((t) => {
      const A = pts[t[0]], Bp = pts[t[1]], Cp = pts[t[2]];
      const ny = (Bp[1] - A[1]) * (Cp[0] - A[0]) - (Bp[0] - A[0]) * (Cp[1] - A[1]);
      if (ny >= 0) push(A[0], h, A[1], Bp[0], h, Bp[1], Cp[0], h, Cp[1], rc); else push(A[0], h, A[1], Cp[0], h, Cp[1], Bp[0], h, Bp[1], rc);
    });
    // the Tehran roof from above: the water tank, and on bigger roofs the stair-head (kharposhteh) and the evaporative cooler, each only
    // where it stands wholly inside the footprint (10 triangles a box)
    const rArea = Math.abs(area) / 2;
    if (rArea > 40) {
      let cx = 0, cz = 0; pts.forEach((p) => { cx += p[0]; cz += p[1]; }); cx /= n; cz /= n;
      const inside = (x, z) => { let c = false; for (let i = 0, j = n - 1; i < n; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
      const box = (x, z, sx, sz, y1, col) => {
        const c4 = [[x - sx, z - sz], [x + sx, z - sz], [x + sx, z + sz], [x - sx, z + sz]];
        if (!c4.every((q) => inside(q[0], q[1]))) return;
        for (let i = 0; i < 4; i++) quad(c4[i], c4[(i + 1) % 4], h, y1, col);
        push(c4[0][0], y1, c4[0][1], c4[2][0], y1, c4[2][1], c4[1][0], y1, c4[1][1], col); push(c4[0][0], y1, c4[0][1], c4[3][0], y1, c4[3][1], c4[2][0], y1, c4[2][1], col);
      };
      box(cx, cz, 0.6, 0.6, h + 1.3, _ca.setHex((Math.abs(hash) >> 3) % 3 === 0 ? IR.tankB : IR.tankW));
      if (rArea > 80) {
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; pts.forEach((p) => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
        const alongX = x1 - x0 >= z1 - z0, off = (alongX ? x1 - x0 : z1 - z0) * 0.27;
        box(cx - (alongX ? off : 0), cz - (alongX ? 0 : off), 1.2, 1.35, h + 2.5, _ca.setHex(wall).offsetHSL(0, -0.04, 0.06));
        if (rArea > 140) box(cx + (alongX ? off : 0), cz + (alongX ? 0 : off), 0.55, 0.55, h + 1.0, _ca.setHex(IR.cooler));
      }
    }
  }
  function arraysToMesh(p, c) {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('color', new T.Float32BufferAttribute(c, 3));
    g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
    const m = new T.Mesh(g, K.mat.solid); m.castShadow = true; m.receiveShadow = true; return m;
  }
  K.city.building = function (footprint, height, style) { const p = [], c = []; buildingArrays(footprint, height, style || 'apartment', p, c); const m = arraysToMesh(p, c); m.name = 'building'; return m; };
  K.city.buildings = function (list) { const p = [], c = []; (list || []).forEach((b) => buildingArrays(b.footprint, b.height, b.style || 'apartment', p, c)); const m = arraysToMesh(p, c); m.name = 'buildings'; return m; };

  // ================================================================ 6. VEHICLES (parts functions, reused by the sites)
  const wheel = (l, x, y, z, r, w, seg) => add(l, P.cyl(r, r, w, seg || 10), IR.rubber, [x, y, z], [0, 0, HP]);
  function policeCarParts(L, lights) {
    add(L.solid, P.profile([[-2.3, 0.32], [-2.32, 0.78], [-2.0, 0.9], [-1.3, 0.95], [-0.85, 1.36], [0.45, 1.38], [1.05, 0.96], [2.2, 0.8], [2.3, 0.4], [2.2, 0.3]], 1.72), IR.policeW);
    add(L.solid, P.profile([[-1.26, 0.97], [-0.84, 1.31], [0.43, 1.33], [0.99, 0.98]], 1.745), 0x1f2a33);
    add(L.solid, new T.PlaneGeometry(1.5, 0.72), 0x1f2a33, [0, 1.18, 0.755], [-0.96, 0, 0]);
    add(L.solid, new T.PlaneGeometry(1.5, 0.6), 0x1f2a33, [0, 1.16, -1.075], [0.84, PI, 0]);
    for (const sx of [-1, 1]) { B(L.solid, 0.02, 0.17, 3.9, IR.police, sx * 0.865, 0.5, 0); B(L.solid, 0.02, 0.05, 3.9, IR.police, sx * 0.865, 0.72, 0); }
    B(L.solid, 0.9, 0.04, 0.55, IR.police, 0, 0.79, 1.6, 0, -0.08);
    B(L.solid, 1.76, 0.22, 0.14, 0x2a2c2f, 0, 0.3, 2.28); B(L.solid, 1.76, 0.22, 0.14, 0x2a2c2f, 0, 0.3, -2.3);
    B(L.solid, 1.1, 0.1, 0.32, 0x222222, 0, 1.38, -0.2);
    B(lights ? lights.b : L.glow, 0.46, 0.12, 0.28, 0x2f6bff, -0.27, 1.46, -0.2); B(lights ? lights.r : L.glow, 0.46, 0.12, 0.28, 0xff2a2a, 0.27, 1.46, -0.2);
    for (const sx of [-1, 1]) { Q(L.glow, 0.32, 0.14, 0xfff6dc, sx * 0.62, 0.66, 2.31, 0); Q(L.glow, 0.3, 0.14, 0xd0261c, sx * 0.64, 0.72, -2.33, PI); }
    for (const [x, z] of [[-0.78, 1.42], [0.78, 1.42], [-0.78, -1.38], [0.78, -1.38]]) wheel(L.solid, x, 0.31, z, 0.31, 0.2, 10);
  }
  function apcParts(L, col, gun) {
    col = col || IR.irgc;
    add(L.solid, P.profile([[-3.0, 0.55], [-3.0, 2.0], [-2.6, 2.3], [1.5, 2.3], [2.9, 1.55], [3.1, 0.85], [2.6, 0.5]], 2.5), col);
    B(L.solid, 2.3, 0.3, 5.4, IR.irgcDark, 0, 0.3, 0);
    for (const sx of [-1, 1]) { for (let i = 0; i < 3; i++) Q(L.solid, 0.28, 0.16, 0x1b2228, sx * 1.255, 1.85, 0.9 - i * 1.0, sx * HP); B(L.solid, 0.1, 0.7, 4.6, IR.irgcDark, sx * 1.28, 1.0, -0.2); }
    add(L.solid, new T.PlaneGeometry(1.6, 0.42), 0x1b2228, [0, 2.0, 2.08], [-0.85, 0, 0]);
    add(L.solid, P.cyl(1.25, 1.25, 0.35, 10), IR.rubber, [0, 1.25, -3.1], [HP, 0, 0]);
    for (const [x, z] of [[-1.28, 1.9], [1.28, 1.9], [-1.28, -1.8], [1.28, -1.8]]) wheel(L.solid, x, 0.6, z, 0.6, 0.45, 10);
    for (const sx of [-1, 1]) Q(L.glow, 0.25, 0.15, 0xfff2cc, sx * 0.85, 1.25, 3.03, 0, -0.2);
    const G = gun || L;
    CY(G.solid, 0.55, 0.35, IR.irgcDark, 0, 2.3, -0.4, 10);
    B(G.solid, 0.5, 0.45, 0.6, col, 0, 2.65, -0.3); add(G.metal, P.cyl(0.05, 0.05, 1.4, 6), 0x1b1d1f, [0, 2.9, 0.5], [HP, 0, 0]);
    B(G.solid, 0.9, 0.5, 0.06, col, 0, 2.7, 0.05);
  }
  function pickupParts(L, gun, col) {
    col = col || 0xe9e9e4;
    add(L.solid, P.profile([[-0.55, 0.5], [-0.55, 1.08], [-0.42, 1.12], [-0.2, 1.8], [1.0, 1.82], [1.55, 1.16], [2.55, 1.02], [2.66, 0.55], [2.5, 0.42]], 1.8), col);
    add(L.solid, P.profile([[-0.36, 1.13], [-0.18, 1.74], [0.98, 1.76], [1.48, 1.17]], 1.82), 0x1f2a33);
    B(L.solid, 1.8, 0.12, 2.1, 0x8a8f93, 0, 0.82, -1.6); for (const sx of [-1, 1]) B(L.solid, 0.08, 0.36, 2.1, col, sx * 0.86, 0.82, -1.6); B(L.solid, 1.8, 0.36, 0.08, col, 0, 0.82, -2.62);
    B(L.solid, 1.8, 0.28, 2.1, 0x303234, 0, 0.5, -1.6);
    B(L.solid, 1.84, 0.2, 0.14, 0x2a2c2f, 0, 0.42, 2.62); Q(L.solid, 1.5, 0.66, 0x1f2a33, 0, 1.5, 1.27, 0, -0.86);
    for (const sx of [-1, 1]) Q(L.glow, 0.28, 0.14, 0xfff2cc, sx * 0.62, 0.86, 2.62, 0);
    for (const [x, z] of [[-0.82, 1.65], [0.82, 1.65], [-0.82, -1.55], [0.82, -1.55]]) wheel(L.solid, x, 0.38, z, 0.38, 0.26, 10);
    const G = gun || L;
    add(G.metal, P.cyl(0.06, 0.08, 1.1, 6), 0x2a2c2f, [0, 1.45, -1.5]);
    B(G.solid, 0.18, 0.2, 0.7, 0x1f2124, 0, 1.95, -1.4); add(G.metal, P.cyl(0.035, 0.035, 1.5, 6), 0x15171a, [0, 2.05, -0.3], [HP, 0, 0]);
    add(G.metal, P.cyl(0.06, 0.06, 0.2, 6), 0x15171a, [0, 2.05, 0.48], [HP, 0, 0]); B(G.solid, 0.7, 0.45, 0.04, 0x3a4430, 0, 1.85, -1.0);
    B(G.solid, 0.25, 0.18, 0.3, 0x4d5a3c, 0.2, 1.88, -1.55);
  }
  function truckParts(L, col) {
    col = col || IR.artesh;
    B(L.solid, 2.3, 0.5, 7.2, 0x2a2c2f, 0, 0.75, 0); B(L.solid, 2.4, 2.0, 1.9, col, 0, 1.0, 2.5); Q(L.solid, 2.0, 0.8, 0x1f2a33, 0, 2.45, 3.46, 0);
    B(L.solid, 2.4, 0.6, 4.6, col, 0, 1.25, -1.0); add(L.solid, P.cyl(1.2, 1.2, 4.6, 8, 0, 0), IR.arteshDark, [0, 2.0, -1.0], [HP, 0, 0], [1, 1, 0.75]);
    for (const [x, z] of [[-1.05, 2.4], [1.05, 2.4], [-1.05, -0.6], [1.05, -0.6], [-1.05, -2.2], [1.05, -2.2]]) wheel(L.solid, x, 0.5, z, 0.5, 0.35, 8);
  }
  function carParts(L, col) {
    B(L.solid, 1.7, 0.6, 4.3, col, 0, 0.3, 0); B(L.solid, 1.55, 0.5, 2.1, col, 0, 0.9, -0.3); B(L.solid, 1.58, 0.36, 2.0, 0x1f2a33, 0, 0.95, -0.3);
    for (const [x, z] of [[-0.8, 1.35], [0.8, 1.35], [-0.8, -1.35], [0.8, -1.35]]) B(L.solid, 0.22, 0.56, 0.56, IR.rubber, x, 0.02, z);
  }
  function motorbikeParts(L, col) {
    col = col || 0xa31d1d;
    for (const z of [0.66, -0.64]) { add(L.solid, P.cyl(0.31, 0.31, 0.09, 10), IR.rubber, [0, 0.31, z], [0, 0, HP]); add(L.metal, P.cyl(0.12, 0.12, 0.1, 6), IR.chrome, [0, 0.31, z], [0, 0, HP]); }
    B(L.solid, 0.26, 0.22, 0.5, col, 0, 0.7, 0.14); B(L.solid, 0.24, 0.1, 0.62, 0x161616, 0, 0.8, -0.32);
    B(L.metal, 0.24, 0.28, 0.34, 0x6f7479, 0, 0.3, 0.02); add(L.metal, P.cyl(0.04, 0.05, 0.75, 6), IR.chrome, [0.15, 0.36, -0.35], [HP + 0.12, 0, 0]);
    for (const sx of [-1, 1]) add(L.metal, P.cyl(0.022, 0.022, 0.78, 5), IR.chrome, [sx * 0.07, 0.66, 0.56], [-0.42, 0, 0]);
    B(L.metal, 0.7, 0.035, 0.035, 0x2a2c2f, 0, 1.02, 0.4); add(L.solid, P.cyl(0.08, 0.08, 0.08, 8), 0x222222, [0, 0.9, 0.55], [HP, 0, 0]); add(L.glow, P.cyl(0.065, 0.065, 0.01, 8), 0xfff4d6, [0, 0.9, 0.6], [HP, 0, 0]);
    B(L.solid, 0.22, 0.04, 0.45, col, 0, 0.62, 0.66); B(L.solid, 0.2, 0.04, 0.4, 0x161616, 0, 0.62, -0.66);
    B(L.metal, 0.28, 0.03, 0.3, 0x2a2c2f, 0, 0.85, -0.7);
  }

  // ================================================================ 5. THE REGIME'S PLACES
  // a Basij resistance base (paygah-e moghavemat): most of them sit in or beside a neighbourhood mosque. The mosque with its tiled dome and
  // minaret, the base's two-storey block hung with green banners and the Basij emblem (and its white-and-green roundel on the roof, for the
  // board's view from above), the green sign over the gate, and the members' motorbikes parked in a row in the yard
  function bBasijBase(o) {
    const L = K.lists(), grp = new T.Group(), W = 30, D = 24, h = 2.8, r = rng(101);
    compound(L, W, D, h, 0.35, 0xd6ccb6, 4.4, 0x17803d);
    for (const sx of [-1, 1]) { B(L.solid, 0.9, 3.6, 0.9, 0xc9bea7, sx * 2.65, 0, D / 2); }
    Q(L.metal, 2.1, 2.5, 0x1f6b3a, -1.08, 1.3, D / 2 + 0.03); Q(L.metal, 2.1, 2.5, 0x1f6b3a, 1.08, 1.3, D / 2 + 0.03);
    B(L.solid, 6.2, 0.25, 0.4, 0xc9bea7, 0, 3.6, D / 2);
    // the base block
    B(L.solid, 13, 6.4, 8, IR.plaster, -7.5, 0, -4); wins(L, 'f', 13, 8, -7.5, -4, 0, 2, 3.2, 4, 1.4, 1.4, r, 0.15);
    B(L.solid, 13.3, 0.4, 8.3, 0x17803d, -7.5, 6.4, -4); roofMark(L, grp, 'basij', 6.2, -7.5, 6.8, -4);
    for (const x of [-12.6, -2.4]) { B(L.solid, 1.3, 4.6, 0.06, 0x17803d, x, 1.2, 0.03); B(L.solid, 1.3, 0.5, 0.07, 0xf2f2ee, x, 4.9, 0.03); }
    B(L.solid, 5.6, 1.0, 0.06, 0x111111, -7.5, 5.15, 0.03);
    // the mosque: prayer hall, drum and tiled dome, the iwan to the yard, one minaret
    B(L.solid, 12, 6.5, 12, IR.brick, 7.5, 0, -5); B(L.solid, 12.2, 0.6, 12.2, IR.tileDeep, 7.5, 6.0, -5);
    CY(L.solid, 3.9, 1.6, IR.tile, 7.5, 6.5, -5, 12); add(L.solid, onion(4.0, 6.0), IR.tile, [7.5, 8.1, -5]);
    add(L.metal, P.cyl(0.06, 0.06, 1.4, 4), IR.gold, [7.5, 14.7, -5]);
    B(L.solid, 6.4, 8.4, 1.6, IR.brick, 7.5, 0, 1.6); B(L.solid, 4.8, 6.6, 0.08, IR.tile, 7.5, 0.4, 2.42); add(L.solid, arch(3.4, 5.6, 0.1), 0x1b2a3d, [7.5, 0, 2.47]);
    minaret(L, 12.4, 3.4, 14, IR.tileLight, IR.tile, false);
    // the yard: motorbikes in a row, the green flags along the wall, the loudspeakers
    for (let i = 0; i < 5; i++) into(L, (t) => bikeLite(t, [0x2a2a2e, 0x7a1d1d, 0x1d1f24][i % 3]), -12 + i * 1.3, 0, 6.4, PI * 0.5 + (i % 2) * 0.12);
    for (const x of [-12, -6, 6, 12]) greenFlag(L, x, h, D / 2, 3.4);
    bigFlag(grp, L, 'basijflag', -2, 4.6, 11, 3.4); bigFlag(grp, L, 'iri', -2, 8.6, 9, 2.8);
    CY(L.metal, 0.06, 7, 0x6a6e72, -14, 0, -10, 5); for (const ry of [0, PI / 2]) add(L.solid, P.cone(0.3, 0.6, 6), 0xd8d8d0, [-14, 6.6, -10 + (ry ? 0 : 0.3)], [HP, ry, 0]);
    grp.add(K.group(L, o.team, 'basij_base'));
    grp.add(plate(boardTex('basijboard', { bg: '#17803d', fg: '#ffffff', border: '#ffffff', em: 'basij', both: true, lines: [['پایگاه مقاومت بسیج', 46]] }), 6, 1.5, 0, 4.6, D / 2 + 0.25, 0, { name: 'sign' }));
    grp.add(emPlate('basij', 3.2, -7.5, 3.6, 0.07, 0));
    return grp;
  }
  // IRGC (Sepah) garrison: GREEN is its colour from above (wall tops, roofs, the parade ground's painted emblem); its gate is a tall arched
  // portal in stone and green tile carrying the Sepah emblem, flanked by the force's flag. (The Artesh barracks below is sand and khaki, with a
  // flat canopy gate, a tank on a plinth and a tank park, so the two never share a silhouette.)
  function bIrgcBase(o) {
    const L = K.lists(), grp = new T.Group(), W = 110, D = 80, h = 4.2, r = rng(111), G = 0x2f6b3a, stone = 0xe0d6bf;
    B(L.solid, W, 0.1, D, 0x6e6a5c, 0, 0, 0);
    compound(L, W, D, h, 0.8, 0xcfc5ae, 16, G);
    for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2], [-W / 2, 0], [W / 2, 0], [0, -D / 2]]) watchtower(L, x, z, 8);
    // the gate: the arched portal, green tile in the spandrels and the crown, the emblem over the arch
    const PW = 24, PH = 19, PD = 3.4, AW = 9, AH = 11;
    add(L.solid, portalGeo(PW, PH, PD, AW, AH), stone, [0, 0, D / 2]);
    B(L.solid, PW + 0.4, 1.4, PD + 0.4, G, 0, PH, D / 2); B(L.solid, PW + 0.8, 0.3, PD + 0.8, 0x24552e, 0, PH + 1.4, D / 2); B(L.solid, PW + 0.8, 0.22, 0.2, IR.gold, 0, PH + 1.45, D / 2 + PD / 2 + 0.32);
    for (const sx of [-1, 1]) { B(L.solid, 6.6, 9.6, 0.1, G, sx * 8.0, 8.4, D / 2 + PD / 2 + 0.02); B(L.solid, 1.2, PH, PD + 0.6, 0xd2c6aa, sx * (PW / 2 - 0.4), 0, D / 2); }
    B(L.solid, 9.2, 8.0, 0.1, G, 0, 11.0, D / 2 + PD / 2 + 0.02);
    B(L.solid, 14, 0.18, 0.2, 0xd0261c, 0, 1.0, D / 2 + 4.5); for (let i = 0; i < 7; i++) B(L.solid, 1.0, 0.2, 0.22, 0xf2f2ee, -6 + i * 2, 1.0, D / 2 + 4.5);
    B(L.solid, 0.4, 1.2, 0.4, 0xf2f2ee, -7.2, 0, D / 2 + 4.5);
    B(L.solid, 4.4, 3.2, 4.4, 0xe2dccb, 15, 0, D / 2 - 3.5); B(L.solid, 4.5, 1.1, 4.5, IR.glass, 15, 1.4, D / 2 - 3.5); B(L.solid, 5.4, 0.3, 5.4, G, 15, 3.2, D / 2 - 3.5);
    for (let i = 0; i < 9; i++) B(L.solid, 0.9, 0.55, 0.6, 0xa89a72, -4 + i * 0.9 - 6, 0, D / 2 + 7 + (i % 2) * 0.1);
    // inside: the HQ with the emblem on its roof, green-roofed barracks, the parade ground with the emblem painted on it, the motor pool
    B(L.solid, 32, 12, 13, 0xd2c9b3, 0, 0, -20); wins(L, 'f', 32, 13, 0, -20, 0, 3, 3.8, 9, 1.6, 1.8, r, 0.12);
    B(L.solid, 32.4, 0.5, 13.4, G, 0, 12, -20); roofMark(L, grp, 'irgc', 10.5, 0, 12.5, -20);
    for (let i = 0; i < 3; i++) { const z = -28 + i * 15; B(L.solid, 30, 7, 9, 0xcbc2aa, -34, 0, z); wins(L, 'f', 30, 9, -34, z, 0, 2, 3.4, 8, 1.4, 1.4, r, 0.12); Q(L.solid, 1.4, 2.2, 0x3a2e24, -34, 1.1, z + 4.53, 0); add(L.solid, P.profile([[-4.7, 0], [0, 1.6], [4.7, 0]], 30.4), 0x3d6b3f, [-34, 7, z]); }
    B(L.solid, 40, 0.14, 26, 0x45474a, 6, 0, 14); roofMark(L, grp, 'irgc', 19, 6, 0.14, 14);
    for (const sx of [-1, 1]) B(L.solid, 0.4, 0.16, 26, 0xe8e2c8, 6 + sx * 19.6, 0, 14);
    B(L.solid, 26, 0.3, 14, 0x55705a, 40, 6, -16); for (const [x, z] of [[28, -22], [52, -22], [28, -10], [52, -10]]) CY(L.metal, 0.2, 6, 0x6a6e72, x, 0, z, 5);
    for (let i = 0; i < 3; i++) into(L, (t) => truckParts(t, IR.irgc), 32 + i * 7, 0, -16, 0);
    for (let i = 0; i < 2; i++) into(L, (t) => pickupParts(t, null, 0xe9e9e4), 34 + i * 6, 0, 32, PI);
    for (let i = 0; i < 5; i++) tree(L, -48 + i * 4, 32, 7, 'pine');
    bigFlag(grp, L, 'irgcflag', -PW / 2 - 2, D / 2 + 2, 17, 6.2, PI); bigFlag(grp, L, 'iri', PW / 2 + 2, D / 2 + 2, 17, 6.2);
    bigFlag(grp, L, 'iri', -3, -12.5, 18, 5); bigFlag(grp, L, 'irgcflag', 3, -12.5, 18, 5);
    grp.add(K.group(L, o.team, 'irgc_base'));
    grp.add(emPlate('irgc', 6.4, 0, 14.6, D / 2 + PD / 2 + 0.1, 0));
    grp.add(emPlate('irgc', 5.0, 0, 14.6, D / 2 - PD / 2 - 0.05, PI));
    grp.add(emPlate('irgc', 5.5, 0, 9.6, -20 + 6.53, 0));
    grp.add(plate(boardTex('irgcboard', { bg: '#0f4a24', fg: '#f2c14e', border: '#d9a640', lines: [['سپاه پاسداران انقلاب اسلامی', 40]] }), PW - 1, 1.3, 0, PH + 0.7, D / 2 + PD / 2 + 0.24, 0, { name: 'sign' }));
    return grp;
  }
  // the police roof sign, read from above: FARAJA green, a white border, the shield, پلیس and the emergency number ۱۱۰
  const policeRoofTex = () => canvasTex('policeroof', 512, 256, (g, w, h) => {
    g.fillStyle = '#0d5a35'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2f2ee'; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20);
    g.drawImage(K.emblem('faraja', 256).image, w - 200, 40, 168, 168);
    rtl(g, 'پلیس', 170, 104, 118, '#ffffff'); rtl(g, '۱۱۰', 170, 200, 64, '#ffd21f');
  });
  // FARAJA kalantari: a white stone station with green bands, the green signboard across its front (کلانتری and the number), the shield either
  // side, patrol cars and a police motorbike at the kerb, the flag and the force's flag, and the green roof sign that the board sees from above
  function bFarajaStation(o) {
    const L = K.lists(), grp = new T.Group(), W = 22, D = 12, fl = 3, fh = 3.4, H = fl * fh + 0.5, r = rng(121);
    B(L.solid, W, H, D, IR.policeW, 0, 0, 0);
    for (let f = 0; f < fl; f++) B(L.solid, W + 0.1, 0.45, D + 0.1, IR.police, 0, f * fh + 0.05, 0);
    B(L.solid, W + 0.5, 0.7, D + 0.5, IR.police, 0, H, 0); B(L.solid, W - 0.6, 0.2, D - 0.6, 0xb9bab4, 0, H + 0.6, 0);
    wins(L, 'f', W, D, 0, 0, 0.4, fl, fh, 6, 1.5, 1.6, r, 0.15); wins(L, 'b', W, D, 0, 0, 0.4, fl, fh, 6, 1.5, 1.6, r, 0.1);
    B(L.solid, 6, 0.3, 3, IR.police, 0, 3.1, D / 2 + 1.5); for (const sx of [-1, 1]) CY(L.metal, 0.12, 3.1, 0xd9dcdf, sx * 2.8, 0, D / 2 + 2.8, 6);
    Q(L.glass, 2.4, 2.6, 0x30475a, 0, 1.3, D / 2 + 0.06);
    for (const sx of [-1, 1]) { B(L.solid, 9, 0.8, 0.3, IR.policeW, sx * 6.8, 0, D / 2 + 9); B(L.metal, 9, 0.06, 0.06, 0x2f6b4a, sx * 6.8, 1.75, D / 2 + 9); for (let i = 0; i < 10; i++) B(L.metal, 0.05, 0.98, 0.05, 0x2f6b4a, sx * 6.8 - 4.3 + i * 0.95, 0.8, D / 2 + 9); }
    B(L.solid, 0.4, 1.1, 0.4, IR.police, -2.2, 0, D / 2 + 9); B(L.solid, 4.2, 0.12, 0.12, 0xf2f2ee, 0, 1.0, D / 2 + 9); for (let i = 0; i < 4; i++) B(L.solid, 0.5, 0.13, 0.13, 0xd0261c, -1.6 + i * 1.05, 1.0, D / 2 + 9);
    // the roof: the radio mast, the green roof sign (geometry under the textured sign, for the phone flattener)
    CY(L.metal, 0.06, 7, 0x9aa0a5, W / 2 - 1.5, H, -D / 2 + 1.5, 4); B(L.metal, 1.2, 0.06, 0.06, 0x9aa0a5, W / 2 - 1.5, H + 6.2, -D / 2 + 1.5);
    B(L.solid, 15.2, 0.1, 7.8, 0xf2f2ee, -1, H + 0.8, 0.2); B(L.solid, 14.4, 0.16, 7.0, 0x0d5a35, -1, H + 0.8, 0.2);
    decal(grp, policeRoofTex(), 14.4, 7.2, -1, H + 1.02, 0.2, -HP);
    // the kerb: two Peugeot Pars patrol cars and a police motorbike
    into(L, (t) => policeCarParts(t), -6.5, 0, D / 2 + 5, HP * 0.9); into(L, (t) => policeCarParts(t), 7, 0, D / 2 + 5.4, -HP * 1.1);
    into(L, (t) => bikeLite(t, 0xf2f2ee), 3.4, 0, D / 2 + 3.6, 0.3);
    bigFlag(grp, L, 'iri', -W / 2 - 2, D / 2 + 2, 11, 3.6); bigFlag(grp, L, 'farajaflag', -W / 2 - 2, D / 2 + 5.5, 9.5, 3.2);
    B(L.glow, 0.5, 0.25, 0.25, 0x2f6bff, -1.6, 3.4, D / 2 + 2.9); B(L.glow, 0.5, 0.25, 0.25, 0xff2a2a, 1.6, 3.4, D / 2 + 2.9);
    grp.add(K.group(L, o.team, 'faraja_station'));
    grp.add(plate(boardTex('farajaboard2', { w: 1024, h: 160, bg: '#0f6a43', fg: '#ffffff', border: '#ffffff', em: 'faraja', both: true, lines: [['کلانتری ۱۲۰', 76], ['پلیس پیشگیری فراجا', 34, '#e8f2ea']] }), 14, 2.2, 0, 4.85, D / 2 + 0.08, 0, { name: 'sign' }));
    grp.add(emPlate('faraja', 2.6, -8.6, H - 1.8, D / 2 + 0.06, 0));
    grp.add(emPlate('faraja', 2.6, 8.6, H - 1.8, D / 2 + 0.06, 0));
    return grp;
  }
  // Artesh (the regular army) garrison, padegan: SAND AND KHAKI from above, long flat-roofed barracks, a tank park, a parade ground with the
  // Artesh emblem painted on it, and the classic garrison entrance: a flat concrete canopy on columns and a tank on a plinth beside the gate.
  function bArteshBarracks(o) {
    const L = K.lists(), grp = new T.Group(), W = 90, D = 64, h = 3.6, r = rng(131), sand = 0xc7bd9e, kh = 0x9a9068;
    B(L.solid, W, 0.1, D, 0x8b8467, 0, 0, 0);
    compound(L, W, D, h, 0.7, sand, 14, IR.arteshDark);
    for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) watchtower(L, x, z, 6);
    // the gate: two columns, a long flat canopy, the emblem panel standing on it, the sentry boxes in the flag's colours
    for (const sx of [-1, 1]) { B(L.solid, 1.4, 6.2, 1.4, 0xd9d0b2, sx * 7.6, 0, D / 2 + 1.2); B(L.solid, 1.4, 6.2, 1.4, 0xd9d0b2, sx * 7.6, 0, D / 2 - 1.6); }
    B(L.solid, 22, 0.9, 6.4, kh, 0, 6.2, D / 2); B(L.solid, 22.2, 0.25, 6.6, IR.arteshDark, 0, 7.1, D / 2);
    B(L.solid, 6.4, 6.4, 0.6, 0x2a2a24, 0, 7.35, D / 2 + 2.4); B(L.solid, 6.8, 0.3, 0.8, IR.gold, 0, 13.75, D / 2 + 2.4);
    for (const sx of [-1, 1]) into(L, (t) => { for (let i = 0; i < 6; i++) B(t.solid, 1.62, 0.42, 1.62, [IR.flagG, 0xffffff, IR.flagR][i % 3], 0, i * 0.42, 0); B(t.solid, 1.8, 0.3, 1.8, 0x3a3a35, 0, 2.52, 0); }, sx * 12.5, 0, D / 2 + 2.6, 0);
    B(L.solid, 12, 0.18, 0.2, 0xd0261c, 0, 1.0, D / 2 + 4.6); for (let i = 0; i < 6; i++) B(L.solid, 1.0, 0.2, 0.22, 0xf2f2ee, -5 + i * 2, 1.0, D / 2 + 4.6);
    // the tank on its plinth outside the gate (a garrison's monument)
    B(L.solid, 5.2, 1.6, 8.2, 0xd9d0b2, -19, 0, D / 2 + 6); into(L, (t) => tankParts(t, 0x6b6a4c), -19, 1.6, D / 2 + 6, 0.5);
    // inside: four long barracks with sand-coloured flat roofs
    for (let i = 0; i < 4; i++) { const z = -D / 2 + 9 + i * 12; B(L.solid, 40, 6.5, 8, IR.artesh, -18, 0, z); wins(L, 'f', 40, 8, -18, z, 0, 2, 3.2, 10, 1.4, 1.3, r, 0.1); B(L.solid, 40.3, 0.4, 8.3, 0xb3a77e, -18, 6.5, z); B(L.solid, 3, 1.4, 3, 0xa59a74, -30, 6.9, z); }
    // the tank park: two rows under the open sky, the trucks beside them
    B(L.solid, 34, 0.14, 26, 0x55554c, 24, 0, -15);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) into(L, (t) => tankParts(t, 0x6b6a4c), 12 + i * 5.2, 0, -21 + j * 11, 0);
    for (let i = 0; i < 2; i++) into(L, (t) => truckParts(t, IR.artesh), 35 + i * 4.6, 0, -15, 0);
    // the parade ground with the emblem, the reviewing stand, the flags
    B(L.solid, 30, 0.14, 22, 0x57584f, 22, 0, 16); roofMark(L, grp, 'artesh', 15, 22, 0.14, 16);
    B(L.solid, 12, 1.2, 3, sand, 22, 0, 4.5); B(L.solid, 12.4, 0.3, 3.6, IR.arteshDark, 22, 3.6, 4.5); for (const sx of [-1, 1]) B(L.solid, 0.3, 2.4, 0.3, 0x6d6a4b, 22 + sx * 5.8, 1.2, 4.0);
    bigFlag(grp, L, 'iri', 15, 2.2, 15, 4.6); bigFlag(grp, L, 'arteshflag', 24, 2.2, 15, 4.6);
    for (let i = 0; i < 3; i++) tree(L, 36 + i * 2.5 - 2.5, 28.5, 7, 'plane');
    grp.add(K.group(L, o.team, 'artesh_barracks'));
    grp.add(emPlate('artesh', 5.6, 0, 10.55, D / 2 + 2.72, 0)); grp.add(emPlate('artesh', 5.6, 0, 10.55, D / 2 + 2.08, PI));
    grp.add(plate(boardTex('arteshboard', { bg: '#4b5a2a', fg: '#f2d27a', border: '#d9a640', lines: [['پادگان ارتش جمهوری اسلامی', 34]] }), 21, 0.85, 0, 6.65, D / 2 + 3.22, 0, { name: 'sign' }));
    return grp;
  }
  function bCheckpoint(o) {
    const L = K.lists(), grp = new T.Group(), arm = K.lists();
    B(L.solid, 14, 0.06, 10, 0x3a3c3f, 0, 0, 0); for (let i = 0; i < 4; i++) B(L.solid, 1.6, 0.07, 0.18, 0xe8e2c8, -5.4 + i * 3.6, 0, 0);
    B(L.solid, 2.2, 2.6, 2.2, 0xeceae4, 5.4, 0, 2.4); B(L.solid, 2.26, 0.9, 2.26, IR.glass, 5.4, 1.2, 2.4); B(L.solid, 2.6, 0.2, 2.6, 0xeceae4, 5.4, 2.6, 2.4); B(L.solid, 2.64, 0.3, 2.64, 0x0f6a43, 5.4, 2.3, 2.4);
    roofMark(L, grp, 'faraja', 2.1, 5.4, 2.8, 2.4); greenFlag(L, 6.5, 2.8, 1.3, 2.2);
    // the Basij riders' motorbikes, parked by the booth (reports from Tehran, 2026: a checkpoint is often a few cones, a few vehicles, the bikes)
    for (let i = 0; i < 3; i++) into(L, (t) => bikeLite(t, [0x2a2a2e, 0x1d1f24, 0x7a1d1d][i]), 2.4 + i * 1.35, 0, -3.3 - (i % 2) * 0.3, PI * 0.5 + 0.15);
    B(L.solid, 0.5, 1.15, 0.5, 0xd8d8d0, -4.6, 0, 2.6); B(L.solid, 0.5, 0.8, 0.5, 0xd8d8d0, 4.4, 0, 2.6);
    for (let i = 0; i < 8; i++) { const lit = i % 2; B(arm.solid, 1.1, 0.16, 0.14, lit ? 0xf2f2ee : 0xd0261c, 0.55 + i * 1.1, -0.08, 0); }
    for (const z of [-2.2, -4.2]) for (let i = 0; i < 3; i++) { add(L.solid, P.profile([[-0.6, 0], [-0.25, 0.8], [0.25, 0.8], [0.6, 0]], 1.9), i % 2 ? 0xd0261c : 0xeceae4, [-4.2 + i * 2.0 + (z < -3 ? 1 : 0), 0, z]); }
    for (let i = 0; i < 9; i++) { const a = -0.9 + i * 0.22; B(L.solid, 0.85, 0.42, 0.5, 0xa89a72, -6 + Math.sin(a) * 1.6, 0, 3.4 + Math.cos(a) * 1.0, a); B(L.solid, 0.85, 0.42, 0.5, 0x9f9169, -6 + Math.sin(a + 0.1) * 1.6, 0.42, 3.4 + Math.cos(a + 0.1) * 1.0, a + 0.1); }
    for (let i = 0; i < 5; i++) add(L.solid, P.cone(0.2, 0.75, 6), i % 2 ? 0xf2f2ee : 0xe8531a, [-2 + i * 1.0, 0.37, 4.2]);
    CY(L.metal, 0.05, 2.4, 0x9aa0a5, 6.8, 0, 4.2, 4);
    bigFlag(grp, L, 'iri', 6.6, -4.4, 5.5, 1.8, PI);
    grp.add(K.group(L, o.team, 'checkpoint'));
    const ag = K.group(arm, o.team, 'arm'); ag.position.set(-4.6, 1.05, 2.6); grp.add(ag);
    grp.add(plate(boardTex('istbaz', { bg: '#d0261c', fg: '#ffffff', border: '#ffffff', lines: [['ایست بازرسی', 56], ['CHECKPOINT', 24, '#ffffff', 1]] }), 1.8, 0.9, 6.8, 2.6, 4.22, 0, { name: 'sign' }));
    const g1 = personObj('irgc', { team: o.team }); g1.position.set(-2.2, 0, 3.2); g1.rotation.y = 0.3; grp.add(g1);
    const g2 = personObj('basij', { team: o.team }); g2.position.set(2.6, 0, 3.0); g2.rotation.y = -0.4; grp.add(g2);
    return grp;
  }
  function bCommandPost(o) {
    const L = K.lists(), grp = new T.Group();
    B(L.solid, 24, 0.05, 18, 0x6b6450, 0, 0, 0);
    into(L, (t) => apcParts(t, IR.irgc), -5, 0, 1, 0.4);
    into(L, (t) => { add(t.solid, P.profile([[-3, 0], [0, 2.7], [3, 0]], 5.2), IR.irgc, [0, 0, 0], [0, HP, 0]); Q(t.solid, 1.4, 1.8, 0x1d2016, 0, 0.9, 2.62, 0); }, 5, 0, -2, 0);
    B(L.solid, 1.2, 0.9, 0.8, 0x4d5a3c, 7.5, 0, 3.6); B(L.solid, 2.0, 0.8, 1.0, 0x6b4a2e, 3.0, 0, 3.6); B(L.glow, 0.6, 0.02, 0.4, 0x9fd0ff, 3.0, 0.81, 3.6);
    CY(L.metal, 0.05, 9, 0x6a6e72, 8.5, 0, -5, 4); for (let i = 0; i < 3; i++) add(L.metal, P.cyl(0.015, 0.015, 9.2, 3), 0x8a8f94, [8.5 + Math.cos(i * 2.1) * 1.6, 4.4, -5 + Math.sin(i * 2.1) * 1.6], [Math.sin(i * 2.1) * 0.17, 0, -Math.cos(i * 2.1) * 0.17]);
    for (let i = 0; i < 7; i++) { const a = PI * 0.8 + i * 0.25; B(L.solid, 0.85, 0.42, 0.5, 0xa89a72, Math.cos(a) * 6.5 - 4, 0, Math.sin(a) * 4 + 1, -a); }
    flagPole(grp, L, 'irgcflag', 9, 2, 6, 1.8);
    grp.add(K.group(L, o.team, 'command_post'));
    return grp;
  }

  // ================================================================ DEFINITIONS
  const D = (type, meta, build) => K.define(type, Object.assign({ side: 'ir' }, meta), build);
  // buildings
  D('house', { name: 'House', real: '2 to 4 storey brick or stone house, flat roof, tanks and cooler', cat: 'city', role: 'building', side: 'any', len: 13 }, (K, o) => bHouse(o));
  D('apartment', { name: 'Apartment block', real: '6 to 12 storey, the stone "romi" facade', cat: 'city', role: 'building', side: 'any', len: 20 }, (K, o) => bApartment(o));
  D('tower', { name: 'High-rise', real: 'glass and stone tower on a podium', cat: 'city', role: 'building', side: 'any', len: 30 }, (K, o) => bTower(o));
  D('shops', { name: 'Shops', real: 'a row of ground-floor shops (variant shut: the strike)', cat: 'city', role: 'building', side: 'any', len: 16 }, (K, o) => bShops(o));
  D('bazaar', { name: 'Bazaar', real: 'vaulted brick bazaar, domes and skylights', cat: 'city', role: 'building', side: 'any', len: 46 }, (K, o) => bBazaar(o));
  D('mosque', { name: 'Mosque', real: 'tiled dome, portal and two minarets', cat: 'city', role: 'building', side: 'any', len: 30 }, (K, o) => bMosque(o));
  D('shrine', { name: 'Shrine', real: 'gold dome, gold iwan, courtyard', cat: 'city', role: 'building', side: 'any', len: 46 }, (K, o) => bShrine(o));
  D('university', { name: 'University', real: 'University of Tehran gate (1965)', cat: 'city', role: 'building', side: 'any', len: 44 }, (K, o) => bUniversity(o));
  D('govt', { name: 'Government building', real: 'ministry with portico and the flag', cat: 'city', role: 'building', len: 37 }, (K, o) => bGovt(o));
  D('irib', { name: 'State broadcaster', real: 'IRIB (Seda o Sima) with its mast', cat: 'city', role: 'building', len: 40 }, (K, o) => bIrib(o));
  D('prison', { name: 'Prison', real: 'Evin: walls, watchtowers, cell blocks', cat: 'city', role: 'building', len: 92 }, (K, o) => bPrison(o));
  D('hospital', { name: 'Hospital', real: 'hospital with emergency entrance and ambulance', cat: 'city', role: 'building', side: 'any', len: 40 }, (K, o) => bHospital(o));
  D('square', { name: 'Square', real: 'roundabout with Azadi Tower (variant fountain)', cat: 'city', role: 'building', side: 'any', len: 62 }, (K, o) => bSquare(o));
  D('park', { name: 'Park', real: 'plane trees, pond, paths', cat: 'city', role: 'building', side: 'any', len: 40 }, (K, o) => bPark(o));
  // the regime's places
  D('basij_base', { name: 'Basij base', real: 'Basij resistance base beside a mosque', cat: 'city', role: 'regime', len: 30 }, (K, o) => bBasijBase(o));
  D('irgc_base', { name: 'IRGC base', real: 'Sepah compound: gate, towers, barracks', cat: 'city', role: 'regime', len: 110 }, (K, o) => bIrgcBase(o));
  D('faraja_station', { name: 'Police station', real: 'FARAJA kalantari (police station)', cat: 'city', role: 'regime', len: 24 }, (K, o) => bFarajaStation(o));
  D('artesh_barracks', { name: 'Army barracks', real: 'Artesh garrison (padegan)', cat: 'city', role: 'regime', len: 90 }, (K, o) => bArteshBarracks(o));
  D('checkpoint', {
    name: 'Checkpoint', real: 'ist-e bazrasi: barrier, booth, sandbags, guards', cat: 'city', role: 'regime', len: 14,
    anim: (obj, dt, t) => { const r = rigOf(obj); if (r.arm) { const c = (t % 8) / 8, up = c < 0.35 ? 0 : c < 0.45 ? (c - 0.35) / 0.1 : c < 0.8 ? 1 : c < 0.9 ? 1 - (c - 0.8) / 0.1 : 0; r.arm.rotation.z = up * 1.35; } }
  }, (K, o) => bCheckpoint(o));
  D('command_post', { name: 'Command post', real: 'armoured vehicle, tent and mast', cat: 'city', role: 'regime', len: 24 }, (K, o) => bCommandPost(o));

  // people
  const PROT = { man: 'man', woman: 'woman', flag: 'flag', sign: 'sign', phone: 'phone' };
  D('protester', { name: 'Protester', real: 'variants: man, woman, flag (Lion and Sun), sign, phone', cat: 'people', role: 'crowd', side: 'any', len: 0.5, anim: animWalk }, (K, o) => personObj(PROT[o.variant] || 'man', o));
  D('riot', { name: 'Riot police', real: 'FARAJA special unit (yegan-e vizheh)', cat: 'people', role: 'force', len: 0.6, anim: animRiot }, (K, o) => personObj('riot', o));
  D('basij', { name: 'Basij (plainclothes)', real: 'Basij militia with baton', cat: 'people', role: 'force', len: 0.5, anim: animWalk }, (K, o) => personObj('basij', o));
  D('basij_bike', {
    name: 'Basij on a motorbike', real: 'two Basij on a 125cc motorbike', cat: 'people', role: 'force', len: 2,
    anim: (obj, dt, t) => { const r = rigOf(obj); if (r.rig) r.rig.position.y = Math.sin(t * 9) * 0.012; }
  }, (K, o) => {
    const grp = new T.Group(), rig = new T.Group(); rig.name = 'rig'; grp.add(rig); const L = K.lists(); motorbikeParts(L, 0x2a2a2e); rig.add(K.group(L, o.team, 'bike'));
    const a = personObj('rider', o), b = personObj('rider2', o); a.position.set(0, -0.06, -0.2); b.position.set(0, 0.02, -0.62); rig.add(a, b);
    const m = K.lists(); add(m.team, P.cyl(0.9, 0.9, 0.025, 8), null, [0, 0.013, 0], null, [0.7, 1, 1.3]); grp.add(K.group(m, o.team, 'marker'));
    return grp;
  });
  D('irgc_soldier', { name: 'IRGC soldier', real: 'Sepah infantry with rifle', cat: 'people', role: 'force', len: 0.6, anim: animMarch }, (K, o) => personObj('irgc', o));
  D('artesh_soldier', { name: 'Army soldier', real: 'Artesh conscript with rifle', cat: 'people', role: 'force', len: 0.6, anim: animMarch }, (K, o) => personObj('artesh', o));
  D('sniper', { name: 'Sniper', real: 'prone rooftop marksman', cat: 'people', role: 'force', len: 1.9 }, (K, o) => {
    const L = K.lists(), c = IR.irgc, sk = SKIN[1];
    B(L.solid, 0.36, 0.22, 0.6, c, 0, 0.02, 0.15); B(L.solid, 0.4, 0.25, 0.34, IR.irgcDark, 0, 0.04, 0.16);
    for (const sx of [-1, 1]) { B(L.solid, 0.15, 0.15, 0.85, c, sx * 0.13, 0.0, -0.55, sx * 0.08); B(L.solid, 0.13, 0.12, 0.08, 0x181818, sx * 0.16, 0.06, -1.0); }
    add(L.solid, P.sphere(0.115, 6, 4), sk, [0, 0.33, 0.55], null, [0.92, 1.0, 1.05]); add(L.solid, cap(0.142, 7, 2), 0x4a553a, [0, 0.35, 0.53]);
    for (const sx of [-1, 1]) { add(L.solid, P.box(0.1, 0.1, 0.55), c, [sx * 0.2, 0.17, 0.55], [0.15, -sx * 0.25, 0]); B(L.solid, 0.08, 0.08, 0.09, 0x2b2b25, sx * 0.1, 0.17, 0.82); }
    B(L.solid, 0.06, 0.1, 0.6, 0x4a3a28, 0, 0.16, 0.52); add(L.metal, P.cyl(0.016, 0.016, 0.9, 5), 0x15171a, [0, 0.22, 1.2], [HP, 0, 0]); add(L.metal, P.cyl(0.032, 0.032, 0.32, 6), 0x111111, [0, 0.31, 0.74], [HP, 0, 0]);
    for (const sx of [-1, 1]) add(L.metal, P.cyl(0.01, 0.01, 0.28, 3), 0x15171a, [sx * 0.06, 0.1, 1.38], [0, 0, sx * 0.4]);
    add(L.team, P.cyl(0.5, 0.5, 0.02, 6), null, [0, 0.01, 0.1], null, [0.8, 1, 1.6]);
    return K.group(L, o.team, 'sniper');
  });
  D('defector', { name: 'Defecting soldier', real: 'an Artesh soldier joining the people', cat: 'people', role: 'crowd', side: 'any', len: 0.6, anim: animWave }, (K, o) => personObj('defector', o));
  D('medic', { name: 'Volunteer medic', real: 'street medic with a first-aid bag', cat: 'people', role: 'crowd', side: 'any', len: 0.5, anim: animWalk }, (K, o) => personObj('medic', o));
  // vehicles
  D('riot_truck', {
    name: 'Water cannon truck', real: 'FARAJA water cannon', cat: 'people', role: 'vehicle', len: 9.4,
    anim: (obj, dt, t) => {
      const r = rigOf(obj); if (r.gun) r.gun.rotation.y = Math.sin(t * 0.5) * 0.45;
      if (r.jet) { const c = t % 6, on = c < 3.6 ? Math.min(1, c * 3, (3.6 - c) * 3) : 0, k = 0.85 + 0.25 * Math.sin(t * 11) + 0.1 * Math.sin(t * 23); r.jet.visible = on > 0.01; r.jet.scale.set(k, k, Math.max(0.01, on * (0.85 + 0.2 * Math.sin(t * 3.1)))); }
    }
  }, (K, o) => {
    const L = K.lists(), G = K.lists(), J = K.lists(), grp = new T.Group();
    B(L.solid, 2.3, 0.5, 9.0, 0x2a2c2f, 0, 0.9, 0);
    B(L.solid, 2.5, 2.3, 2.3, IR.policeW, 0, 1.15, 3.4); Q(L.solid, 2.2, 1.0, 0x1f2a33, 0, 2.6, 4.56, 0); for (const sx of [-1, 1]) Q(L.solid, 1.0, 0.8, 0x1f2a33, sx * 1.255, 2.6, 3.6, sx * HP);
    for (let i = 0; i < 7; i++) B(L.metal, 0.06, 1.0, 0.06, 0x3a3c3f, -0.9 + i * 0.3, 2.1, 4.6);
    B(L.solid, 2.52, 0.3, 2.32, IR.police, 0, 1.6, 3.4);
    B(L.solid, 2.6, 2.6, 6.2, IR.police, 0, 1.15, -1.0); B(L.solid, 2.64, 0.35, 6.24, IR.policeW, 0, 2.3, -1.0);
    for (const [x, z] of [[-1.1, 3.3], [1.1, 3.3], [-1.1, -1.5], [1.1, -1.5], [-1.1, -3.0], [1.1, -3.0]]) wheel(L.solid, x, 0.55, z, 0.55, 0.4, 10);
    B(L.glow, 1.0, 0.15, 0.3, 0x2f6bff, 0, 3.45, 3.6);
    CY(G.solid, 0.55, 0.4, 0x2a2c2f, 0, 0, 0, 8); B(G.solid, 0.5, 0.45, 0.8, IR.policeW, 0, 0.4, 0.1); add(G.metal, P.cyl(0.09, 0.12, 1.4, 8), 0x8a9095, [0, 0.62, 0.9], [HP - 0.12, 0, 0]);
    add(J.glowAdd, P.cyl(0.55, 0.1, 13, 8), 0x9fcfff, [0, 0, 6.5], [HP, 0, 0]); add(J.glowAdd, P.cyl(0.22, 0.06, 13, 6), 0xdff0ff, [0, 0, 6.5], [HP, 0, 0]);
    grp.add(K.group(L, o.team, 'body'));
    const g = K.group(G, o.team, 'gun'); g.position.set(0, 3.75, 1.0); grp.add(g);
    const j = K.group(J, o.team, 'jet'); j.position.set(0, 0.7, 1.6); j.rotation.x = 0.1; j.scale.z = 0.01; j.visible = false; g.add(j);
    return grp;
  });
  D('apc', {
    name: 'Armoured vehicle', real: '4x4 armoured personnel carrier', cat: 'people', role: 'vehicle', len: 6.2,
    anim: (obj, dt, t) => { const r = rigOf(obj); if (r.gun) r.gun.rotation.y = Math.sin(t * 0.4) * 0.6; }
  }, (K, o) => { const L = K.lists(), G = K.lists(), grp = new T.Group(); apcParts(L, IR.irgc, G); grp.add(K.group(L, o.team, 'body')); const g = K.group(G, o.team, 'gun'); g.children.forEach((m) => m.geometry.translate(0, 0, 0.4)); g.position.z = -0.4; grp.add(g); const m = K.lists(); B(m.team, 0.6, 0.04, 0.6, null, 0, 2.31, -1.8); grp.add(K.group(m, o.team, 'marker')); return grp; });
  D('police_car', {
    name: 'Police car', real: 'FARAJA patrol car (Peugeot Pars), white with the green stripe', cat: 'people', role: 'vehicle', len: 4.6,
    anim: (obj, dt, t) => { const r = rigOf(obj); if (r.lb) { const on = Math.sin(t * 14) > 0; r.lb.visible = on; r.lr.visible = !on; } }
  }, (K, o) => { const L = K.lists(), lb = K.lists(), lr = K.lists(), grp = new T.Group(); policeCarParts(L, { b: lb.glow, r: lr.glow }); grp.add(K.group(L, o.team, 'body'), K.group(lb, o.team, 'lb'), K.group(lr, o.team, 'lr')); grp.add(plate(policeWordTex(), 0.8, 0.4, 0.875, 0.95, 0.4, HP, { name: 'word' })); grp.add(plate(policeWordTex(), 0.8, 0.4, -0.875, 0.95, 0.4, -HP, { name: 'word2' })); return grp; });
  D('pickup_mg', {
    name: 'Pickup with machine gun', real: 'Toyota Hilux with a DShK', cat: 'people', role: 'vehicle', len: 5.3,
    anim: (obj, dt, t) => { const r = rigOf(obj); if (r.gun) r.gun.rotation.y = Math.sin(t * 0.7) * 0.8; }
  }, (K, o) => { const L = K.lists(), G = K.lists(), grp = new T.Group(); pickupParts(L, G); grp.add(K.group(L, o.team, 'body')); const g = K.group(G, o.team, 'gun'); g.children.forEach((m) => m.geometry.translate(0, 0, 1.5)); g.position.z = -1.5; grp.add(g); const m = K.lists(); B(m.team, 1.7, 0.04, 0.12, null, 0, 1.83, 0.4); grp.add(K.group(m, o.team, 'marker')); return grp; });
  D('bus_barricade', { name: 'Burnt bus barricade', real: 'a city bus burnt and on its side', cat: 'people', role: 'prop', side: 'any', len: 12 }, (K, o) => {
    // the bus lies on its right side: its roof faces +x, its underside -x, its left flank (with the window holes) faces up
    const L = K.lists(), grp = new T.Group(), r = rng(141), soot = 0x2a2420, rust = 0x7a4a2c, ash = 0x8a847a;
    B(L.solid, 3.0, 0.25, 12, rust, 0, 0, 0);
    B(L.solid, 3.0, 2.3, 0.2, 0x5b3a26, 0, 0.25, 5.9); B(L.solid, 3.0, 2.3, 0.2, 0x5b3a26, 0, 0.25, -5.9);
    B(L.solid, 0.25, 2.3, 12, soot, 1.38, 0.25, 0); B(L.solid, 0.4, 2.3, 11.6, 0x1d1b19, -1.3, 0.25, 0);
    B(L.solid, 3.0, 0.22, 12, 0x6a3f28, 0, 2.33, 0);
    for (let i = 0; i < 8; i++) { const z = -5.0 + i * 1.42; B(L.solid, 1.6, 0.06, 1.2, 0x0b0b0b, 0.25, 2.5, z); B(L.solid, 0.18, 0.08, 0.22, i % 2 ? rust : 0x8f4a2a, 0.25, 2.5, z + 0.71); }
    B(L.solid, 0.9, 0.1, 12, 0x8f2a22, -0.95, 2.5, 0);
    for (let i = 0; i < 5; i++) B(L.solid, 0.5 + r() * 0.8, 0.02, 0.8 + r() * 1.5, r() < 0.5 ? ash : 0x5b3a26, -0.9 + r() * 2.0, 2.56, -5 + r() * 10);
    B(L.solid, 0.06, 1.6, 2.4, 0x0b0b0b, 0.2, 0.6, 6.02); Q(L.solid, 2.6, 0.5, 0x8f2a22, 0, 0.45, 6.01, 0);
    for (const z of [-4, 3.8]) for (const y of [0.4, 2.2]) add(L.metal, P.cyl(0.42, 0.42, 0.3, 10), 0x4a3a30, [-1.65, y, z], [0, 0, HP]);
    for (let i = 0; i < 9; i++) B(L.solid, 0.3 + r() * 0.7, 0.08 + r() * 0.25, 0.3 + r() * 0.9, [0x3a3530, ash, rust, 0x1f1d1b][i % 4], 2.1 + r() * 1.8, 0, -5.5 + r() * 11, r() * 3);
    add(L.solid, P.cyl(3.2, 3.6, 0.03, 10), 0x1a1816, [0.3, 0.015, 0], null, [0.9, 1, 2.2]);
    grp.add(K.group(L, o.team, 'bus'));
    const fa = new T.Object3D(); fa.name = 'fireAnchor'; fa.position.set(0.3, 2.6, 2.0); grp.add(fa);
    return grp;
  });
  D('motorbike', { name: 'Motorbike', real: '125cc motorbike (the Honda CG125 type)', cat: 'people', role: 'vehicle', side: 'any', len: 2 }, (K, o) => { const L = K.lists(); motorbikeParts(L); return K.group(L, o.team, 'motorbike'); });
  // props
  D('barricade', { name: 'Burning barricade', real: 'tyres and debris (fireAnchor for the flames)', cat: 'people', role: 'prop', side: 'any', len: 4 }, (K, o) => {
    const L = K.lists(), grp = new T.Group(), r = rng(151);
    add(L.solid, P.cyl(2.1, 2.3, 0.04, 10), 0x1b1a18, [0, 0.02, 0]);
    const tyres = [[-0.7, 0.1, 0.2, 0, 0], [0.4, 0.1, -0.3, 0, 0], [0.8, 0.1, 0.6, 0, 0], [-0.2, 0.1, -0.8, 0, 0], [-0.15, 0.3, 0.05, 0.2, 0], [0.35, 0.5, 0.15, -0.3, 0.4], [-0.75, 0.34, -0.5, HP, 0.3], [0.1, 0.7, -0.1, 0.4, 1.2]];
    tyres.forEach(([x, y, z, rx, ry]) => add(L.solid, P.torus(0.24, 0.1, 4, 7), IR.rubber, [x, y, z], [HP + rx, ry, 0]));
    for (let i = 0; i < 6; i++) B(L.solid, 0.2 + r() * 0.9, 0.1 + r() * 0.2, 0.15 + r() * 0.5, [0x6b4a2e, 0x4a4e52, 0x2e2a26, 0x8a6a48][i % 4], -1.4 + r() * 2.8, 0, -1.2 + r() * 2.4, r() * 3, r() * 0.4);
    B(L.solid, 1.6, 0.08, 0.3, 0x6b4a2e, 0.1, 0.5, -0.2, 0.6, 0, 0.5);
    add(L.glow, P.cyl(0.9, 1.0, 0.03, 8), 0xff6a1a, [0, 0.06, 0]);
    grp.add(K.group(L, o.team, 'barricade'));
    const fa = new T.Object3D(); fa.name = 'fireAnchor'; fa.position.set(0, 0.8, 0); grp.add(fa);
    return grp;
  });
  D('dumpsters', { name: 'Dumpsters', real: 'municipal dumpsters, one pushed over', cat: 'people', role: 'prop', side: 'any', len: 4.4 }, (K, o) => {
    const L = K.lists();
    const bin = (t) => { add(t.solid, P.profile([[-0.6, 0.15], [-0.75, 1.15], [0.75, 1.15], [0.6, 0.15]], 1.3), 0x2e6b3a); B(t.solid, 1.36, 0.08, 1.6, 0x245a30, 0, 1.15, 0, 0, 0.08); for (const [x, z] of [[-0.5, -0.45], [0.5, -0.45], [-0.5, 0.45], [0.5, 0.45]]) add(t.solid, P.cyl(0.08, 0.08, 0.06, 6), IR.rubber, [x, 0.08, z], [0, 0, HP]); };
    into(L, bin, -1.2, 0, 0, 0.2);
    const tmp = K.lists(); bin(tmp); const m = new T.Matrix4().makeRotationZ(-HP + 0.06); m.setPosition(1.5, 0.66, 0.3);
    tmp.solid.forEach((p) => { p.g.applyMatrix4(m); L.solid.push(p); });
    for (let i = 0; i < 6; i++) B(L.solid, 0.3, 0.2, 0.3, [0x2a2a2a, 0x6b6b6b, 0x8a6a48][i % 3], 2.6 + (i % 3) * 0.4, 0, -0.6 + Math.floor(i / 3) * 0.9, i);
    return K.group(L, o.team, 'dumpsters');
  });
  D('sandbags', { name: 'Sandbags', real: 'sandbag position', cat: 'people', role: 'prop', side: 'any', len: 3.6 }, (K, o) => {
    const L = K.lists();
    for (let row = 0; row < 3; row++) for (let i = 0; i < 7 - row; i++) { const a = -1.0 + (i + row * 0.5) * 0.33; B(L.solid, 0.85, 0.36, 0.48, row % 2 ? 0xa89a72 : 0x9c8e68, Math.sin(a) * 1.8, row * 0.36, Math.cos(a) * 1.1 - 0.6, a); }
    return K.group(L, o.team, 'sandbags');
  });
  D('flag_lionsun', {
    name: 'Lion and Sun flag', real: 'the flag of Iran before 1979, carried by the protesters', cat: 'people', role: 'prop', side: 'any', len: 2.2,
    anim: (obj, dt, t) => { waveFlag(rigOf(obj), t, 1.3); }
  }, (K, o) => {
    const L = K.lists(), grp = new T.Group(); CY(L.metal, 0.03, 4.2, 0x9aa0a5, 0, 0, 0, 6); add(L.metal, P.sphere(0.07, 6, 4), IR.gold, [0, 4.25, 0]);
    grp.add(K.group(L, o.team, 'pole'));
    const f = clothChain(K.emblem('lion-sun', 512), 2.0, 1.14, 6); f.position.set(0.03, 3.6, 0); grp.add(f); return grp;
  });
  D('banner', {
    name: 'Banner', real: 'Woman Life Freedom (zan zendegi azadi)', cat: 'people', role: 'prop', side: 'any', len: 4.2,
    anim: (obj, dt, t) => { const b = obj.getObjectByName('cloth'); if (b) b.rotation.x = Math.sin(t * 1.7) * 0.06; }
  }, (K, o) => {
    const L = K.lists(), grp = new T.Group(); for (const sx of [-1, 1]) CY(L.metal, 0.03, 2.8, 0x6b4a2e, sx * 2.05, 0, 0, 5);
    grp.add(K.group(L, o.team, 'poles'));
    const c = new T.Group(); c.name = 'cloth'; c.position.set(0, 2.75, 0); const p = plate(bannerTex(), 4.0, 1.0, 0, -0.5, 0, 0, { double: true, name: 'bannercloth' }); c.add(p); grp.add(c); return grp;
  });
  D('starlink', { name: 'Starlink dish', real: 'Starlink standard dish and router (smuggled in)', cat: 'people', role: 'prop', side: 'any', len: 0.7 }, (K, o) => {
    const L = K.lists();
    B(L.solid, 0.32, 0.03, 0.3, 0xe6e6e2, 0, 0, 0); add(L.solid, P.cyl(0.02, 0.025, 0.45, 6), 0xe6e6e2, [0, 0.24, -0.02], [0.25, 0, 0]);
    add(L.solid, P.box(0.38, 0.59, 0.035), 0xf2f2ee, [0, 0.62, 0.02], [-0.55, 0, 0]); add(L.solid, P.box(0.34, 0.55, 0.01), 0xd8dadb, [0, 0.625, 0.04], [-0.55, 0, 0]);
    B(L.solid, 0.16, 0.2, 0.06, 0xf2f2ee, 0.4, 0, 0.2); B(L.glow, 0.02, 0.02, 0.01, 0x7fd0ff, 0.4, 0.17, 0.235);
    add(L.solid, P.cyl(0.006, 0.006, 0.45, 3), 0x222222, [0.2, 0.01, 0.12], [0, 0, HP]);
    return K.group(L, o.team, 'starlink');
  });
  D('phone_light', { name: 'Phone light', real: 'a raised phone, screen and torch on', cat: 'people', role: 'prop', side: 'any', len: 0.2 }, (K, o) => {
    const L = K.lists();
    B(L.solid, 0.08, 0.16, 0.014, 0x111111, 0, 1.9, 0); B(L.glow, 0.068, 0.138, 0.004, 0xcfe8ff, 0, 1.911, -0.008); B(L.glow, 0.018, 0.018, 0.01, 0xffffff, 0.02, 2.04, 0.009);
    B(L.solid, 0.09, 0.12, 0.05, SKIN[0], 0, 1.8, -0.01); add(L.solid, P.box(0.1, 0.5, 0.1), 0x3f4d60, [0, 1.52, -0.02], [0.1, 0, 0]);
    add(L.glowAdd, P.cone(0.3, 1.8, 8), 0x2a3036, [0, 2.9, 0.2], [PI - 0.22, 0, 0]);
    return K.group(L, o.team, 'phone_light');
  });
  D('teargas_can', { name: 'Tear gas canister', real: 'a spent 37/40 mm tear gas canister', cat: 'people', role: 'prop', side: 'any', len: 0.2 }, (K, o) => {
    const L = K.lists();
    add(L.metal, P.cyl(0.033, 0.033, 0.15, 8), 0x55603f, [0, 0.033, 0], [0, 0, HP]); add(L.metal, P.cyl(0.035, 0.035, 0.03, 8), 0xb08a3a, [0.06, 0.033, 0], [0, 0, HP]);
    add(L.solid, P.cyl(0.034, 0.034, 0.02, 8), 0xd8d0b0, [-0.02, 0.033, 0], [0, 0, HP]);
    return K.group(L, o.team, 'teargas_can');
  });
}
