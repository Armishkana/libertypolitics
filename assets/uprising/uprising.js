/* THE UPRISING SIMULATOR'S PAGE (libertypolitics.com uprising/, iranuncensored.com <lang>/uprising/). The plan, the data and
   the words: build/uprising.py's docstring. The model: uprising-engine.js (loaded here and as the Web Workers).

   THE PARTS
     board     the city in 3D (three.js): every street and alley from OpenStreetMap, lit by who holds it; the hexes of the
               model under them; the places that matter as beacons; the crowds, the forces and the defectors as lights
     command   the panel: City, Conditions, Strategy, Advisors; the Play button
     playback  one uprising hour by hour, recorded so the timeline can be scrubbed; the event feed beside it
     analysis  hundreds of runs in the workers: the odds, the outcomes, the cost, why, what it would take, the best plan
   The whole scenario rides in the address (?city=&s=), so a link opens exactly what was built.
   Never classList.toggle(name, state): tog(el, name, state) (uprising.py stops the build on the first). */
import * as THREE from './three.module.min.js';

const D = document, W = window;
const box = D.getElementById('uprising'), src = D.getElementById('up-data');
if (box && src) start().catch(err => { const t = D.getElementById('up-boot-t'); if (t) t.textContent = document.documentElement.lang === 'fa' || (box.getAttribute('lang') === 'fa') ? 'بارگذاری شبیه‌ساز به مشکل خورد. صفحه رو دوباره باز کنید.' : 'Something went wrong loading the simulator. Reload the page to try again.'; console.error(err); });

async function start() {
  const DATA = JSON.parse(src.textContent);
  const FA = DATA.lang === 'fa', IU = DATA.site === 'iu';
  const TR = DATA.S || {};
  const tr = s => (Object.prototype.hasOwnProperty.call(TR, s) ? TR[s] : s);
  const tf = (s, o) => tr(s).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] != null ? o[k] : m));
  const N_ = s => (FA ? String(s).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'.charAt(+d)).replace(/%/g, '٪') : String(s));
  const fmt = n => { n = Math.round(n || 0); return FA ? n.toLocaleString('fa-IR') : n.toLocaleString('en-US'); };
  const big = n => { n = Math.round(n || 0); if (n >= 1e6) return N_((Math.round(n / 1e5) / 10) + (FA ? ' میلیون' : 'M')); if (n >= 1e4) return N_(Math.round(n / 1e3) + (FA ? ' هزار' : 'k')); return fmt(n); };
  const pc = x => N_(Math.round(x * 100) + '%');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r) => (r || D).querySelector(s), $$ = (s, r) => Array.from((r || D).querySelectorAll(s));
  const tog = (el, c, on) => { if (el) { if (on) el.classList.add(c); else el.classList.remove(c); } };
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const REDUCED = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PHONE = () => W.innerWidth < 760;
  const bootT = D.getElementById('up-boot-t');

  await import('./uprising-engine.js');
  const U = W.UPR;
  if (!U) throw new Error('engine missing');

  // ================================================================== the words
  const WORD = {
    out: { liberated: 'Liberated', zones: 'Liberated districts', stalemate: 'Contained', war: 'Civil war', crushed: 'Crushed' },
    outLine: {
      liberated: 'The people hold the city: the governorate and the places that matter are theirs and the forces are gone or have crossed over.',
      zones: 'The people hold whole districts, but the regime keeps the centre.',
      stalemate: 'Protests go on, but the regime keeps the city.',
      war: 'The city splits into armed zones. The Syria path.',
      crushed: 'The streets go quiet. The uprising is put down.',
    },
    lv: ['Watching', 'Batons and tear gas', 'Birdshot and some live fire', 'Live fire on crowds', 'Massacre: heavy weapons'],
  };
  const PLAN_T = {
    centre: ['March on the centre', 'Everyone converges on the main square and the governorate.', 'Cairo 2011 · Tehran 1978'],
    districts: ['Neighbourhood by neighbourhood', 'Free one district at a time, barricade it, and hold it.', 'Kurdish towns 2022 · Bangladesh 2024'],
    water: ['Be water', 'Pop up everywhere at once and never stand where they are waiting.', 'Hong Kong 2019 · Iran 2022'],
    strike: ['Strike first', 'Close the bazaar, stop oil and transport for days, then fill the streets.', 'Iran 1978 · Sudan 2019'],
    soldiers: ['Win the soldiers', 'Strict nonviolence, and words at the barracks gates, until they refuse to shoot.', 'Iran 1979 · Serbia 2000 · Manila 1986'],
    roads: ['Seal the city', 'Hold the highways in so no reinforcements arrive, then rise inside.', 'Kazakhstan 2022 · Iran 2022'],
    voice: ['Take the broadcaster', 'Seize the state TV and radio centre and speak to the country.', 'Romania 1989 · Serbia 2000'],
    night: ['Own the night', 'Rooftop chants and alley protests after dark, when the forces are thin.', 'Iran 2009 · Iran 2022'],
    armed: ['Armed defence', 'Armed groups guard the crowds and hit the posts.', 'Syria 2011 · Libya 2011 · Myanmar 2021'],
  };
  const PLAN_ICON = { centre: '◎', districts: '⬢', water: '≈', strike: '⏸', soldiers: '✋', roads: '⛌', voice: '📡', night: '☾', armed: '⚑' };
  const DIAL_T = {
    conv: ['Converge on the targets', 'Low: stay spread out. High: everyone heads for the same places.'],
    strike: ['Strike', 'Shops, the bazaar, oil, transport.'],
    blockade: ['Block the roads in', 'Barricades on the highways from other cities.'],
    discipline: ['Nonviolent discipline', 'No stones, no fires, no weapons.'],
    fraternize: ['Win over the soldiers', 'Talk to them, their families, their officers.'],
    night: ['Act at night', 'Rooftops, alleys, after dark.'],
    medics: ['Medics and safe houses', 'Care for the wounded away from the hospitals the forces raid.'],
    pace: ['All at once', 'Low: build over days. High: everyone on day one.'],
    offline: ['Agreed times and places', 'A plan everyone knows before the internet goes.'],
    voice: ['Take the broadcaster', 'How much the plan bets on the state TV centre.'],
  };
  const SITE_T = { gov: 'Governorate', tv: 'State TV and radio', police: 'Central police station', square: 'Main square', prison: 'Prison', airport: 'Airport', garrison: 'Barracks',
    sq2: 'Square', uni: 'University', bazaar: 'Bazaar', industry: 'Refinery or plant', power: 'Power station', shrine: 'Shrine', hospital: 'Hospital', mosalla: 'Friday prayer ground', terminal: 'Bus terminal', stadium: 'Stadium' };
  const SITE_ICON = { gov: '🏛', tv: '📡', police: '⛨', square: '◎', prison: '⛓', airport: '✈', garrison: '⛫', sq2: '○', uni: '🎓', bazaar: '⌂', industry: '⚙', power: 'ϟ', shrine: '۞', hospital: '✚', mosalla: '◠', terminal: '⇄', stadium: '◍' };
  const FACT_T = {
    'turnout-up': 'Twice as many people on the streets', 'turnout-down': 'Half as many people on the streets',
    'net-on': 'The internet stays on', 'net-off': 'The internet is cut from the start',
    'nation-all': 'The whole country rises at once', 'nation-alone': 'This city rises alone',
    armed: 'People carry 5,000 guns and 50 drones', unarmed: 'Nobody carries a weapon',
    strike: 'A general strike', nostrike: 'No strike',
    frat: 'Win over the soldiers, with strict nonviolence', nofrat: 'No outreach to the soldiers',
    block: 'Block the roads into the city', noblock: 'Leave the roads in open',
    offline: 'Times and places agreed in advance', nooffline: 'No plan agreed in advance',
    'proxies-none': 'No foreign fighters', 'proxies-many': 'Many foreign fighters brought in',
    'loyal-shaky': 'Forces that are shaky', 'loyal-firm': 'Forces that are rock solid',
  };
  const W8 = x => tr(x);

  // ================================================================== the scenario
  const DEF = { turnout: null, nation: 'auto', net: 'auto', power: 'auto', starlink: null, armed: false, guns: 2000, drones: 20, proxies: 'auto', loyalty: 'auto', outside: 'auto', occasion: 'none', hour: 17,
    plan: Object.assign({ type: 'centre', ign: null }, U.PLANS.centre) };
  let S = JSON.parse(JSON.stringify(DEF));
  const ALLC = DATA.cities || [], cities = ALLC.filter(c => c.ready !== false);
  if (!cities.length) { if (bootT) bootT.textContent = tr('No city is ready yet.'); return; }
  let cityId = 'shiraz';
  const qs = new URLSearchParams(location.search);
  if (qs.get('city') && cities.some(c => c.id === qs.get('city'))) cityId = qs.get('city');
  else if (!cities.some(c => c.id === cityId)) cityId = cities[0].id;
  if (qs.get('s')) { try { const o = JSON.parse(decodeURIComponent(escape(atob(qs.get('s').replace(/-/g, '+').replace(/_/g, '/'))))); S = mergeS(o); } catch (_) { } }
  function mergeS(o) {
    const s = JSON.parse(JSON.stringify(DEF));
    for (const k of Object.keys(DEF)) if (k !== 'plan' && o[k] !== undefined) s[k] = o[k];
    if (o.plan && U.PLANS[o.plan.type]) { s.plan = Object.assign({ type: o.plan.type, ign: null }, U.PLANS[o.plan.type]); for (const d of U.DIALS) if (typeof o.plan[d] === 'number') s.plan[d] = clamp(o.plan[d], 0, 1); if (Array.isArray(o.plan.ign)) s.plan.ign = o.plan.ign.filter(n => Number.isInteger(n)).slice(0, 12); }
    if (s.plan.type === 'armed' && !s.armed) s.plan = Object.assign({ type: 'centre', ign: null }, U.PLANS.centre);
    return s;
  }
  function addr() {
    const j = JSON.stringify(S);
    const b = btoa(unescape(encodeURIComponent(j))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return location.pathname + '?city=' + cityId + '&s=' + b;
  }
  function saveAddr() { try { history.replaceState(null, '', addr()); } catch (_) { } }
  let dirty = 0;      // the analysis belongs to the scenario it was run on
  function changed() { dirty++; saveAddr(); markStale(); refreshAuto(); }

  // ================================================================== the DOM
  const ui = D.getElementById('up-ui'), stage = D.getElementById('up-stage'), canvas = D.getElementById('up-gl'), labels = D.getElementById('up-labels');
  ui.insertAdjacentHTML('beforeend', `
<div class="up-city" id="up-cityb"><button type="button" class="up-cityn" id="up-pickb" aria-haspopup="dialog"><span class="up-cn" id="up-cn"></span><span class="up-cf" id="up-cf"></span><span class="up-chev">▾</span></button></div>
<div class="up-hud" id="up-hud" aria-live="off">
  <div class="up-bal"><div class="up-bal-l"><span>${tr('People')}</span><b id="up-hp">0%</b></div><div class="up-bal-bar"><i id="up-hpb"></i></div><div class="up-bal-r"><b id="up-hr">100%</b><span>${tr('Regime')}</span></div></div>
  <div class="up-stats">
    <div><span>${tr('On the streets')}</span><b id="up-hc">0</b></div>
    <div><span>${tr('Forces')}</span><b id="up-hf">0</b></div>
    <div><span>${tr('Crossed over')}</span><b id="up-hd">0</b></div>
    <div class="up-dead"><span>${tr('Lives lost')}</span><b id="up-hk">0</b></div>
  </div>
  <div class="up-flags"><span class="up-fl" id="up-fnet" title="">📶 <em id="up-fnet-t"></em></span><span class="up-fl" id="up-fpow">💡 <em id="up-fpow-t"></em></span><span class="up-fl" id="up-flv">⚠ <em id="up-flv-t"></em></span></div>
  <div class="up-odds" id="up-odds" hidden><span>${tr('Odds of liberation')}</span><b id="up-oddsv">…</b><button type="button" id="up-oddsb" class="up-link">${tr('Why?')}</button></div>
</div>
<aside class="up-cmd" id="up-cmd">
  <nav class="up-tabs" role="tablist">
    ${[['city', 'City', '⌖'], ['cond', 'Conditions', '☰'], ['plan', 'Strategy', '♟'], ['adv', 'Advisors', '☺']].map(([id, t, ic], n) => `<button type="button" role="tab" class="up-tab${n === 0 ? ' on' : ''}" data-tab="${id}" aria-selected="${n === 0}"><i>${ic}</i><span>${tr(t)}</span></button>`).join('')}
    <button type="button" class="up-tab up-tab-min" id="up-min" aria-label="${tr('Hide the panel')}"><i>▁</i></button>
  </nav>
  <div class="up-pane" id="up-p-city" role="tabpanel"></div>
  <div class="up-pane" id="up-p-cond" role="tabpanel" hidden></div>
  <div class="up-pane" id="up-p-plan" role="tabpanel" hidden></div>
  <div class="up-pane" id="up-p-adv" role="tabpanel" hidden></div>
  <div class="up-go">
    <button type="button" class="up-play" id="up-play"><span class="up-play-i">▶</span><span id="up-play-t">${tr('Play the uprising')}</span></button>
    <div class="up-go2"><button type="button" class="up-sec" id="up-oddsgo">${tr('Run the odds')}</button><button type="button" class="up-sec" id="up-bestgo">${tr('Find the best plan')}</button></div>
  </div>
</aside>
<aside class="up-feed" id="up-feed" aria-label="${tr('What is happening')}"><h2>${tr('What is happening')}</h2><ol id="up-feedl"><li class="up-ev0">${tr('Set the conditions, choose a strategy, and press Play.')}</li></ol></aside>
<div class="up-bar" id="up-bar" hidden>
  <button type="button" class="up-pp" id="up-pp" aria-label="${tr('Pause')}">❚❚</button>
  <div class="up-spd" role="group" aria-label="${tr('Speed')}">${[1, 3, 10, 30].map(v => `<button type="button" data-spd="${v}"${v === 3 ? ' class="on"' : ''}>${N_(v)}×</button>`).join('')}</div>
  <div class="up-clock"><b id="up-day"></b><span id="up-hour"></span></div>
  <input type="range" class="up-scrub" id="up-scrub" min="0" max="1" step="0.01" value="0" aria-label="${tr('Timeline')}">
  <button type="button" class="up-sec up-resb" id="up-resb">${tr('Results')}</button>
</div>
<div class="up-insp" id="up-insp" hidden></div>
<div class="up-tip" id="up-tip" hidden></div>
<div class="up-ov" id="up-res" hidden role="dialog" aria-modal="true" aria-labelledby="up-res-h"><div class="up-ov-in"><button type="button" class="up-x" data-close aria-label="${tr('Close')}">✕</button><div id="up-res-b"></div></div></div>
<div class="up-ov" id="up-pick" hidden role="dialog" aria-modal="true" aria-labelledby="up-pick-h"><div class="up-ov-in up-pick-in"><button type="button" class="up-x" data-close aria-label="${tr('Close')}">✕</button><h2 id="up-pick-h">${tr('Pick your city')}</h2><div class="up-pick-g"><div class="up-map" id="up-map"></div><div class="up-clist" id="up-clist"></div></div></div></div>
<div class="up-ov" id="up-how" hidden role="dialog" aria-modal="true" aria-labelledby="up-how-h"><div class="up-ov-in"><button type="button" class="up-x" data-close aria-label="${tr('Close')}">✕</button><div id="up-how-b"></div></div></div>
<button type="button" class="up-howb" id="up-howb">${tr('How it works')}</button>`);

  // ================================================================== the board: load a city
  let BJ = null, CITY = null;
  async function loadBoard(id) {
    if (bootT) bootT.textContent = tf('Loading the streets of {c}...', { c: FA ? cityOf(id).fa : cityOf(id).n });
    tog(D.getElementById('up-boot'), 'off', false);
    const r = await fetch(DATA.asset + 'b/' + id + '.json', { cache: 'force-cache' });
    if (!r.ok) throw new Error('board ' + id + ' ' + r.status);
    const B = await r.json();
    return B;
  }
  function cityOf(id) { return cities.find(c => c.id === id) || cities[0]; }

  // ================================================================== three.js
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(W.devicePixelRatio || 1, PHONE() ? 1.75 : 2));
  renderer.setClearColor(0x04060a, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04060a, 0.00004);
  const camera = new THREE.PerspectiveCamera(42, 1, 10, 200000);
  const world = new THREE.Group(); scene.add(world);
  const HEXW = 256;
  const hexData = new Uint8Array(HEXW * 4);
  const hexTex = new THREE.DataTexture(hexData, HEXW, 1, THREE.RGBAFormat);
  hexTex.magFilter = THREE.NearestFilter; hexTex.minFilter = THREE.NearestFilter; hexTex.needsUpdate = true;
  const U_ = { tHex: { value: hexTex }, uTime: { value: 0 }, uNight: { value: 0 }, uHexW: { value: HEXW } };

  const roadVS = `
    attribute float hx; attribute float tier;
    uniform sampler2D tHex; uniform float uTime; uniform float uNight; uniform float uHexW;
    varying vec3 vC; varying float vA;
    void main() {
      vec4 st = texture2D(tHex, vec2((hx + 0.5) / uHexW, 0.5));
      float ppl = st.r, reg = st.g, pow_ = st.b, heat = st.a;
      vec3 base = tier < 0.5 ? vec3(0.92, 0.72, 0.36) : tier < 1.5 ? vec3(0.66, 0.56, 0.40) : tier < 2.5 ? vec3(0.33, 0.40, 0.50) : vec3(0.20, 0.26, 0.34);
      float lit = mix(0.28, 1.0, pow_) * mix(1.0, 0.82, uNight);
      vec3 c = base * lit;
      vec3 gold = vec3(1.0, 0.80, 0.34), red = vec3(1.0, 0.18, 0.26);
      float tb = tier < 1.5 ? 1.0 : tier < 2.5 ? 0.75 : 0.55;
      c = mix(c, gold * (0.55 + 0.45 * tb), ppl * 0.78);
      c += red * reg * 0.10 * tb;
      c += gold * heat * (0.35 + 0.25 * sin(uTime * 2.6 + hx * 1.7)) * tb;
      vC = c; vA = tier < 1.5 ? 0.95 : tier < 2.5 ? 0.75 : 0.55;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const roadFS = `varying vec3 vC; varying float vA; void main() { gl_FragColor = vec4(vC, vA); }`;
  const roadMat = new THREE.ShaderMaterial({ uniforms: U_, vertexShader: roadVS, fragmentShader: roadFS, transparent: true, depthWrite: false });
  const hexVS = `
    attribute float hx; attribute float edge;
    uniform sampler2D tHex; uniform float uTime; uniform float uHexW;
    varying vec4 vC;
    void main() {
      vec4 st = texture2D(tHex, vec2((hx + 0.5) / uHexW, 0.5));
      float ppl = st.r, reg = st.g, heat = st.a;
      vec3 gold = vec3(1.0, 0.78, 0.30), red = vec3(0.85, 0.10, 0.18);
      float contest = step(0.06, ppl) * step(0.06, heat) * step(0.25, reg + heat);
      float a = ppl * 0.20 + reg * 0.07 + contest * (0.10 + 0.08 * sin(uTime * 6.0 + hx));
      vec3 c = ppl > reg ? gold : red;
      if (edge > 0.5) { a = 0.05 + ppl * 0.35 + reg * 0.08; }
      vC = vec4(c, a);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const hexFS = `varying vec4 vC; void main() { gl_FragColor = vC; }`;
  const hexMat = new THREE.ShaderMaterial({ uniforms: U_, vertexShader: hexVS, fragmentShader: hexFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const ptVS = `
    attribute vec3 col; attribute float sz; attribute float al;
    varying vec3 vC; varying float vA;
    uniform float uPx;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = clamp(sz * uPx / -mv.z, 2.0, 13.0);
      vC = col; vA = al;
      gl_Position = projectionMatrix * mv;
    }`;
  const ptFS = `varying vec3 vC; varying float vA; void main() { vec2 d = gl_PointCoord - 0.5; float r = dot(d, d); if (r > 0.25) discard; float s = smoothstep(0.25, 0.0, r); gl_FragColor = vec4(vC * (0.6 + 0.8 * s), vA * s); }`;
  const uPx = { value: 900 };
  const ptMat = new THREE.ShaderMaterial({ uniforms: { uPx }, vertexShader: ptVS, fragmentShader: ptFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

  let layers = [];
  function clearWorld() { for (const o of layers) { world.remove(o); o.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material && m.material !== roadMat && m.material !== hexMat && m.material !== ptMat) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); } }); } layers = []; }
  function add(o) { world.add(o); layers.push(o); return o; }
  const SQ3 = Math.sqrt(3);
  function hexOf(x, y, s) {
    const q = (2 / 3 * x) / s, r = (-1 / 3 * x + SQ3 / 3 * y) / s;
    let rx = Math.round(q), rz = Math.round(r), ry = Math.round(-q - r);
    const dx = Math.abs(rx - q), dy = Math.abs(ry - (-q - r)), dz = Math.abs(rz - r);
    if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
    return rx + ',' + rz;
  }
  let HEXKEY = {};      // 'q,r' -> hex index
  function hxAt(x, y) { const k = HEXKEY[hexOf(x, y, BJ.s)]; return k == null ? -1 : k; }
  function decode(a, cb) { let x = 0, y = 0; for (let n = 0; n + 1 < a.length; n += 2) { if (n === 0) { x = a[0]; y = a[1]; } else { x += a[n]; y += a[n + 1]; } cb(x, y, n === 0); } }

  let LORDER = [], SITES = [], beacons = [], labelEls = [], ptsGeo = null, PTS = null, fxGeo = null, FX = null;
  function buildWorld(B) {
    clearWorld();
    const N = B.hex.x.length, s = B.s, R = B.r;
    HEXKEY = {};
    for (let i = 0; i < N; i++) { HEXKEY[hexOf(B.hex.x[i], B.hex.y[i], s)] = i; }
    // the ground: a dark disc with a faint ring and grid
    const gcan = D.createElement('canvas'); gcan.width = gcan.height = 512;
    const g = gcan.getContext('2d');
    const grd = g.createRadialGradient(256, 256, 30, 256, 256, 256);
    grd.addColorStop(0, '#0d141d'); grd.addColorStop(0.7, '#080c12'); grd.addColorStop(1, '#04060a');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(244,196,48,0.05)'; g.lineWidth = 1;
    for (let i = 0; i <= 512; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
    g.strokeStyle = 'rgba(244,196,48,0.18)'; g.lineWidth = 2; g.beginPath(); g.arc(256, 256, 250 * (R / (R * 1.35)), 0, Math.PI * 2); g.stroke();
    const gt = new THREE.CanvasTexture(gcan);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(R * 2.7, R * 2.7), new THREE.MeshBasicMaterial({ map: gt, depthWrite: false }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -2; add(ground);
    // water, parks, military areas
    const polys = (arr, color, op, y) => {
      const geos = [];
      for (const a of arr || []) {
        const pts = []; decode(a, (x, yy) => pts.push(new THREE.Vector2(x, yy)));
        if (pts.length < 3) continue;
        try { const sh = new THREE.Shape(pts); const ge = new THREE.ShapeGeometry(sh); ge.rotateX(-Math.PI / 2); geos.push(ge); } catch (_) { }
      }
      if (!geos.length) return;
      const merged = mergeGeos(geos);
      const m = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
      m.position.y = y; add(m);
    };
    polys(B.parks, 0x123222, 0.55, -1.2);
    polys((B.water || {}).areas, 0x0d2a44, 0.8, -1.1);
    polys(B.military, 0x3a0f16, 0.55, -1.0);
    // the streets: alleys and side streets as lines, the avenues and highways as ribbons
    for (const [tk, tier] of [['t3', 3], ['t2', 2]]) {
      const ways = (B.roads || {})[tk] || [];
      let cnt = 0; for (const a of ways) cnt += Math.max(0, a.length / 2 - 1);
      const pos = new Float32Array(cnt * 6), hx = new Float32Array(cnt * 2), ti = new Float32Array(cnt * 2).fill(tier);
      let o = 0;
      for (const a of ways) {
        let px = 0, py = 0;
        decode(a, (x, y, first) => {
          if (!first) {
            const h = hxAt((px + x) / 2, (py + y) / 2), hh = h < 0 ? N : h;
            pos[o * 6] = px; pos[o * 6 + 1] = tier === 3 ? 0 : 0.5; pos[o * 6 + 2] = -py; pos[o * 6 + 3] = x; pos[o * 6 + 4] = tier === 3 ? 0 : 0.5; pos[o * 6 + 5] = -y;
            hx[o * 2] = hx[o * 2 + 1] = hh; o++;
          }
          px = x; py = y;
        });
      }
      const ge = new THREE.BufferGeometry();
      ge.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, o * 6), 3));
      ge.setAttribute('hx', new THREE.BufferAttribute(hx.subarray(0, o * 2), 1));
      ge.setAttribute('tier', new THREE.BufferAttribute(ti.subarray(0, o * 2), 1));
      add(new THREE.LineSegments(ge, roadMat));
    }
    for (const [tk, tier, wd] of [['t1', 1, 9], ['t0', 0, 15]]) {
      const ways = (B.roads || {})[tk] || [];
      let cnt = 0; for (const a of ways) cnt += Math.max(0, a.length / 2 - 1);
      const pos = new Float32Array(cnt * 18), hx = new Float32Array(cnt * 6), ti = new Float32Array(cnt * 6).fill(tier);
      let o = 0;
      for (const a of ways) {
        let px = 0, py = 0;
        decode(a, (x, y, first) => {
          if (!first) {
            const dx = x - px, dy = y - py, L = Math.hypot(dx, dy) || 1, nx = -dy / L * wd / 2, ny = dx / L * wd / 2;
            const h = hxAt((px + x) / 2, (py + y) / 2), hh = h < 0 ? N : h, yy = 1 + (1 - tier);
            const q = [px + nx, py + ny, px - nx, py - ny, x + nx, y + ny, x - nx, y - ny];
            const tri = [0, 1, 2, 2, 1, 3];
            for (let t = 0; t < 6; t++) { const v = tri[t]; pos[o * 18 + t * 3] = q[v * 2]; pos[o * 18 + t * 3 + 1] = yy; pos[o * 18 + t * 3 + 2] = -q[v * 2 + 1]; hx[o * 6 + t] = hh; }
            o++;
          }
          px = x; py = y;
        });
      }
      const ge = new THREE.BufferGeometry();
      ge.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, o * 18), 3));
      ge.setAttribute('hx', new THREE.BufferAttribute(hx.subarray(0, o * 6), 1));
      ge.setAttribute('tier', new THREE.BufferAttribute(ti.subarray(0, o * 6), 1));
      add(new THREE.Mesh(ge, roadMat));
    }
    // the hexes of the model: fills and outlines
    {
      const pos = new Float32Array(N * 18 * 3), hx = new Float32Array(N * 18), ed = new Float32Array(N * 18);
      const lp = new Float32Array(N * 12 * 3), lhx = new Float32Array(N * 12), led = new Float32Array(N * 12).fill(1);
      const rr = s * 0.97;
      for (let i = 0; i < N; i++) {
        const cx = B.hex.x[i], cy = B.hex.y[i];
        for (let t = 0; t < 6; t++) {
          const a0 = Math.PI / 3 * t, a1 = Math.PI / 3 * (t + 1);
          const v = [cx, cy, cx + rr * Math.cos(a0), cy + rr * Math.sin(a0), cx + rr * Math.cos(a1), cy + rr * Math.sin(a1)];
          for (let k = 0; k < 3; k++) { const b = (i * 18 + t * 3 + k) * 3; pos[b] = v[k * 2]; pos[b + 1] = 3; pos[b + 2] = -v[k * 2 + 1]; hx[i * 18 + t * 3 + k] = i; }
          const lb = (i * 12 + t * 2) * 3;
          lp[lb] = v[2]; lp[lb + 1] = 3.5; lp[lb + 2] = -v[3]; lp[lb + 3] = v[4]; lp[lb + 4] = 3.5; lp[lb + 5] = -v[5];
          lhx[i * 12 + t * 2] = lhx[i * 12 + t * 2 + 1] = i;
        }
      }
      const ge = new THREE.BufferGeometry();
      ge.setAttribute('position', new THREE.BufferAttribute(pos, 3)); ge.setAttribute('hx', new THREE.BufferAttribute(hx, 1)); ge.setAttribute('edge', new THREE.BufferAttribute(ed, 1));
      add(new THREE.Mesh(ge, hexMat));
      const le = new THREE.BufferGeometry();
      le.setAttribute('position', new THREE.BufferAttribute(lp, 3)); le.setAttribute('hx', new THREE.BufferAttribute(lhx, 1)); le.setAttribute('edge', new THREE.BufferAttribute(led, 1));
      add(new THREE.LineSegments(le, hexMat));
    }
    // the places that matter: beacons
    SITES = B.sites.map((q, idx) => Object.assign({ idx }, q));
    let on = 0; SITES.forEach(q => { if (U.BASEW[q.k] != null) q.oi = on++; });
    beacons = [];
    labels.innerHTML = '';
    labelEls = [];
    const beamGeo = new THREE.CylinderGeometry(s * 0.012, s * 0.012, 1, 6, 1, true);
    const ringGeo = new THREE.RingGeometry(s * 0.09, s * 0.115, 40);
    for (const q of SITES) {
      const objv = q.oi != null;
      const h = objv ? s * (0.35 + 0.12 * (U.BASEW[q.k] || 1)) : s * 0.16;
      const mat = new THREE.MeshBasicMaterial({ color: objv ? 0xffffff : 0x8fa3b8, transparent: true, opacity: objv ? 0.75 : 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
      const beam = new THREE.Mesh(beamGeo, mat); beam.scale.y = h; beam.position.set(q.x, h / 2, -q.y); add(beam);
      let ring = null;
      if (objv) { ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff3b4f, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(q.x, 4, -q.y); add(ring); }
      beacons.push({ q, beam, ring, mat, top: new THREE.Vector3(q.x, h, -q.y) });
      const el = D.createElement('div');
      el.className = 'up-lab' + (objv ? ' up-lab-o' : '');
      el.innerHTML = `<i>${SITE_ICON[q.k] || '•'}</i><span>${esc(siteName(q))}</span>`;
      el.dataset.k = q.k;
      labels.appendChild(el); labelEls.push(el);
    }
    LORDER = beacons.map((b, n) => n).sort((a, b) => (U.BASEW[beacons[b].q.k] || 0) - (U.BASEW[beacons[a].q.k] || 0));
    // the people, the forces and the defectors: lights
    const P = PHONE() ? 4200 : 9000;
    PTS = { n: P, pos: new Float32Array(P * 3), col: new Float32Array(P * 3), sz: new Float32Array(P), al: new Float32Array(P),
      kind: new Int8Array(P).fill(-1), hex: new Int32Array(P).fill(-1), sx: new Float32Array(P), sy: new Float32Array(P), tx: new Float32Array(P), ty: new Float32Array(P),
      t0: new Float32Array(P), t1: new Float32Array(P), a0: new Float32Array(P), a1: new Float32Array(P), ph: new Float32Array(P) };
    for (let i = 0; i < P; i++) PTS.ph[i] = Math.random() * 6.28;
    ptsGeo = new THREE.BufferGeometry();
    ptsGeo.setAttribute('position', new THREE.BufferAttribute(PTS.pos, 3).setUsage(THREE.DynamicDrawUsage));
    ptsGeo.setAttribute('col', new THREE.BufferAttribute(PTS.col, 3).setUsage(THREE.DynamicDrawUsage));
    ptsGeo.setAttribute('sz', new THREE.BufferAttribute(PTS.sz, 1).setUsage(THREE.DynamicDrawUsage));
    ptsGeo.setAttribute('al', new THREE.BufferAttribute(PTS.al, 1).setUsage(THREE.DynamicDrawUsage));
    const pm = new THREE.Points(ptsGeo, ptMat); pm.frustumCulled = false; add(pm);
    // effects: shots, gas, fires, the lives lost
    const F = 1600;
    FX = { n: F, pos: new Float32Array(F * 3), col: new Float32Array(F * 3), sz: new Float32Array(F), al: new Float32Array(F), life: new Float32Array(F), max: new Float32Array(F), vy: new Float32Array(F), next: 0 };
    fxGeo = new THREE.BufferGeometry();
    fxGeo.setAttribute('position', new THREE.BufferAttribute(FX.pos, 3).setUsage(THREE.DynamicDrawUsage));
    fxGeo.setAttribute('col', new THREE.BufferAttribute(FX.col, 3).setUsage(THREE.DynamicDrawUsage));
    fxGeo.setAttribute('sz', new THREE.BufferAttribute(FX.sz, 1).setUsage(THREE.DynamicDrawUsage));
    fxGeo.setAttribute('al', new THREE.BufferAttribute(FX.al, 1).setUsage(THREE.DynamicDrawUsage));
    const fm = new THREE.Points(fxGeo, ptMat); fm.frustumCulled = false; add(fm);
    // the hexes' street points (where lights stand)
    PS = B.s;
    HP = B.hex.pts.map((a, i) => (a && a.length >= 2 ? a : [B.hex.x[i], B.hex.y[i]]));
    hexStateClear();
    camHome(true);
  }
  let HP = [], PS = 300;
  function mergeGeos(geos) {
    let n = 0; for (const g of geos) n += (g.index ? g.index.count : g.attributes.position.count);
    const pos = new Float32Array(n * 3); let o = 0;
    for (const g of geos) { const gg = g.index ? g.toNonIndexed() : g; pos.set(gg.attributes.position.array, o); o += gg.attributes.position.array.length; gg.dispose(); if (gg !== g) g.dispose(); }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return ge;
  }
  function siteName(q) {
    if (FA) return q.n || tr(q.gen || SITE_T[q.k] || '');
    return q.en || tr(q.gen || SITE_T[q.k] || '') + (q.n && !q.en ? '' : '');
  }
  function hexName(h) {
    if (h == null || h < 0 || !BJ) return tr('the city');
    const x = BJ.hex.x[h], y = BJ.hex.y[h];
    let best = null, bd = (BJ.s * 1.1) ** 2;
    for (const q of SITES) { const d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < bd && (q.oi != null || q.k === 'sq2' || q.k === 'uni' || q.k === 'bazaar')) { bd = d; best = q; } }
    if (best) return siteName(best);
    const a = Math.atan2(y, x), d = Math.hypot(x, y);
    if (d < BJ.r * 0.22) return tr('the city centre');
    const dir = ['the eastern districts', 'the north-eastern districts', 'the northern districts', 'the north-western districts', 'the western districts', 'the south-western districts', 'the southern districts', 'the south-eastern districts'][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
    return tr(dir);
  }

  // ================================================================== the camera
  const cam = { tx: 0, ty: 0, dist: 20000, az: 0.35, tilt: 0.95, gtx: 0, gty: 0, gdist: 20000, gaz: 0.35, gtilt: 0.95 };
  function camHome(snap) {
    const R = BJ ? BJ.r : 9000;
    cam.gtx = 0; cam.gty = 0; cam.gdist = R * (PHONE() ? 2.7 : 2.0); cam.gaz = 0.35; cam.gtilt = 0.92;
    if (snap) { cam.tx = cam.gtx; cam.ty = cam.gty; cam.dist = cam.gdist * 1.5; cam.az = cam.gaz - 0.6; cam.tilt = cam.gtilt - 0.3; }
  }
  function camFly(x, y, dist) { cam.gtx = x; cam.gty = y; if (dist) cam.gdist = dist; }
  function camApply() {
    const k = REDUCED ? 1 : 0.12;
    cam.tx += (cam.gtx - cam.tx) * k; cam.ty += (cam.gty - cam.ty) * k; cam.dist += (cam.gdist - cam.dist) * k; cam.az += (cam.gaz - cam.az) * k; cam.tilt += (cam.gtilt - cam.tilt) * k;
    const el = cam.tilt, d = cam.dist;
    camera.position.set(cam.tx + d * Math.sin(el) * Math.sin(cam.az), d * Math.cos(el), -cam.ty + d * Math.sin(el) * Math.cos(cam.az));
    camera.lookAt(cam.tx, 0, -cam.ty);
    uPx.value = renderer.domElement.height * 3.4;
    scene.fog.density = 0.55 / Math.max(4000, d * 2.2);
  }
  // pointer: one finger or left button pans; two fingers pinch and turn; right button or Shift turns and tilts; wheel zooms
  const ptrs = new Map(); let drag = null, moved = 0;
  canvas.addEventListener('pointerdown', ev => { canvas.setPointerCapture(ev.pointerId); ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); moved = 0; drag = { b: ev.button, sh: ev.shiftKey, x: ev.clientX, y: ev.clientY }; });
  canvas.addEventListener('pointermove', ev => {
    if (!ptrs.has(ev.pointerId)) { hover(ev); return; }
    const p = ptrs.get(ev.pointerId), dx = ev.clientX - p.x, dy = ev.clientY - p.y;
    moved += Math.abs(dx) + Math.abs(dy);
    if (ptrs.size === 2) {
      const [a, b] = Array.from(ptrs.values());
      const d0 = Math.hypot(a.x - b.x, a.y - b.y), a0 = Math.atan2(b.y - a.y, b.x - a.x);
      p.x = ev.clientX; p.y = ev.clientY;
      const [a2, b2] = Array.from(ptrs.values());
      const d1 = Math.hypot(a2.x - b2.x, a2.y - b2.y), a1 = Math.atan2(b2.y - a2.y, b2.x - a2.x);
      if (d1 > 0 && d0 > 0) cam.gdist = clamp(cam.gdist * d0 / d1, 600, (BJ ? BJ.r : 9000) * 4);
      cam.gaz -= (a1 - a0);
      return;
    }
    p.x = ev.clientX; p.y = ev.clientY;
    if (drag && (drag.b === 2 || drag.sh)) { cam.gaz -= dx * 0.005; cam.gtilt = clamp(cam.gtilt - dy * 0.004, 0.15, 1.25); }
    else {
      const sc = cam.dist / renderer.domElement.clientHeight * 1.1;
      const ca = Math.cos(cam.az), sa = Math.sin(cam.az);
      cam.gtx += (-dx * ca - dy * sa * 1.4) * sc; cam.gty += (-dx * sa + dy * ca * 1.4) * sc;
      const R = BJ ? BJ.r * 1.3 : 12000; const L = Math.hypot(cam.gtx, cam.gty); if (L > R) { cam.gtx *= R / L; cam.gty *= R / L; }
    }
  });
  const up = ev => { ptrs.delete(ev.pointerId); if (!ptrs.size) { if (moved < 6 && ev.type === 'pointerup') click(ev); drag = null; } };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', ev => ev.preventDefault());
  canvas.addEventListener('wheel', ev => { ev.preventDefault(); cam.gdist = clamp(cam.gdist * Math.exp(ev.deltaY * 0.0012), 600, (BJ ? BJ.r : 9000) * 4); }, { passive: false });
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', ev => {
    const st = cam.dist * 0.08, k = ev.key;
    if (k === 'ArrowLeft') cam.gtx -= st; else if (k === 'ArrowRight') cam.gtx += st; else if (k === 'ArrowUp') cam.gty += st; else if (k === 'ArrowDown') cam.gty -= st;
    else if (k === '+' || k === '=') cam.gdist *= 0.85; else if (k === '-') cam.gdist *= 1.18; else if (k === 'q') cam.gaz += 0.15; else if (k === 'e') cam.gaz -= 0.15; else if (k === ' ') { ev.preventDefault(); togglePause(); } else return;
    ev.preventDefault();
  });
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), v2 = new THREE.Vector2(), v3 = new THREE.Vector3();
  function groundAt(ev) {
    const r = canvas.getBoundingClientRect();
    v2.set((ev.clientX - r.left) / r.width * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v2, camera);
    return ray.ray.intersectPlane(plane, v3) ? { x: v3.x, y: -v3.z } : null;
  }
  const tip = D.getElementById('up-tip');
  function hover(ev) {
    if (!BJ || PHONE()) return;
    const g = groundAt(ev); const h = g ? hxAt(g.x, g.y) : -1;
    if (h < 0) { tip.hidden = true; return; }
    tip.hidden = false;
    tip.style.left = (ev.clientX - stage.getBoundingClientRect().left + 14) + 'px'; tip.style.top = (ev.clientY - stage.getBoundingClientRect().top + 14) + 'px';
    tip.innerHTML = hexTip(h, true);
  }
  function hexTip(h, short) {
    const fr = curFrame();
    const p = BJ.hex.p[h];
    let s = `<b>${esc(hexName(h))}</b><span>${tf('{n} people live here', { n: big(p) })}</span>`;
    if (fr) {
      const c = fr.c[h], f = fr.f[h], k = fr.k[h], al = fr.al[h], d = fr.dead[h];
      s += `<span>${tr('On the streets')}: <em class="up-g">${big(c)}</em> · ${tr('Forces')}: <em class="up-r">${big(f)}</em>${al > 1 ? ` · ${tr('Crossed over')}: <em class="up-b">${big(al)}</em>` : ''}</span>`;
      s += `<span>${k > 0.2 ? tr('Held by the people') : k < -0.2 ? tr('Held by the regime') : tr('Contested')}${d >= 1 ? ' · ' + tf('{n} lives lost', { n: fmt(d) }) : ''}</span>`;
    } else if (!short || setupClicks) {
      const ig = ignNow();
      s += `<span class="up-tipa">${ig.includes(h) ? tr('A starting point. Tap to remove it.') : tr('Tap to start the uprising here.')}</span>`;
    }
    return s;
  }
  let setupClicks = true;
  function click(ev) {
    if (!BJ) return;
    const g = groundAt(ev); const h = g ? hxAt(g.x, g.y) : -1;
    if (h < 0) { inspClose(); return; }
    if (!RUN) {      // before a run: the click places or removes a starting point
      const ig = ignNow().slice();
      const n = ig.indexOf(h);
      if (n >= 0) ig.splice(n, 1); else { if (ig.length >= 12) ig.shift(); ig.push(h); }
      S.plan.ign = ig.length ? ig : null;
      changed(); drawIgn(); renderPlan();
      tip.innerHTML = hexTip(h, false);
      return;
    }
    inspOpen(h);
  }
  function ignNow() { return S.plan.ign && S.plan.ign.length ? S.plan.ign : autoIgn(); }
  function autoIgn() { const B = U.prep(BJ); const P = Object.assign({}, U.PLANS[S.plan.type] || U.PLANS.centre); const I = B.ign || {}, out = []; const add = a => { for (const h of a || []) if (out.indexOf(h) < 0 && out.length < 8) out.push(h); };
    if (P.targets === 'garrison' || P.targets === 'centre' || P.targets === 'tv') { add(I.uni); add(I.bazaar); add(I.edge); add(I.centre); } else if (P.targets === 'roads') { add(I.edge); add(I.uni); add(I.bazaar); } else { add(I.edge); add(I.uni); add(I.bazaar); add(I.centre); }
    return out; }

  // ================================================================== the hex state texture and the lights
  function hexStateClear() {
    hexData.fill(0);
    const N = BJ.hex.x.length;
    for (let i = 0; i <= N && i < HEXW; i++) { hexData[i * 4 + 1] = i < N ? 110 : 0; hexData[i * 4 + 2] = 255; }
    hexTex.needsUpdate = true;
    for (let i = 0; i < PTS.n; i++) { PTS.kind[i] = -1; PTS.al[i] = 0; PTS.a0[i] = 0; PTS.a1[i] = 0; }
    for (let i = 0; i < FX.n; i++) { FX.life[i] = 0; FX.al[i] = 0; }
    drawIgn();
  }
  function drawIgn() {
    if (RUN || !BJ) return;
    const ig = ignNow(), N = BJ.hex.x.length;
    for (let i = 0; i < N; i++) { hexData[i * 4] = 0; hexData[i * 4 + 3] = 0; }
    for (const h of ig) { hexData[h * 4] = 120; hexData[h * 4 + 3] = 140; }
    hexTex.needsUpdate = true;
    // a few lights at each starting point
    for (let i = 0; i < PTS.n; i++) { if (PTS.kind[i] >= 0) { PTS.a0[i] = PTS.al[i]; PTS.a1[i] = 0; PTS.t0[i] = clock; PTS.t1[i] = clock + 0.4; PTS.kind[i] = -2; } }
    let p = 0;
    for (const h of ig) for (let n = 0; n < 10; n++) { while (p < PTS.n && PTS.kind[p] !== -1 && PTS.kind[p] !== -2) p++; if (p >= PTS.n) break; spawnPt(p, 0, h, 0.3); PTS.a1[p] = 0.55; p++; }
  }
  const COL = [[0.95, 0.68, 0.22], [1.0, 0.16, 0.26], [0.40, 0.78, 1.0]];
  function spawnPt(i, kind, h, dur) {
    const a = HP[h], m = (a.length / 2) | 0, j = (Math.random() * m) | 0;
    const x = a[j * 2] + (Math.random() - 0.5) * 22, y = a[j * 2 + 1] + (Math.random() - 0.5) * 22;
    PTS.kind[i] = kind; PTS.hex[i] = h; PTS.sx[i] = PTS.tx[i] = x; PTS.sy[i] = PTS.ty[i] = y; PTS.t0[i] = clock; PTS.t1[i] = clock + dur; PTS.a0[i] = 0; PTS.a1[i] = 1;
    const c = COL[kind]; PTS.col[i * 3] = c[0]; PTS.col[i * 3 + 1] = c[1]; PTS.col[i * 3 + 2] = c[2]; PTS.sz[i] = PS * (kind === 1 ? 0.2 : kind === 2 ? 0.22 : 0.16);
  }
  function movePt(i, h, dur) {
    const a = HP[h], m = (a.length / 2) | 0, j = (Math.random() * m) | 0;
    const u = ptU(i);
    PTS.sx[i] = PTS.sx[i] + (PTS.tx[i] - PTS.sx[i]) * u; PTS.sy[i] = PTS.sy[i] + (PTS.ty[i] - PTS.sy[i]) * u;
    PTS.tx[i] = a[j * 2] + (Math.random() - 0.5) * 22; PTS.ty[i] = a[j * 2 + 1] + (Math.random() - 0.5) * 22;
    PTS.a0[i] = PTS.al[i]; PTS.a1[i] = 1; PTS.t0[i] = clock; PTS.t1[i] = clock + dur; PTS.hex[i] = h;
  }
  function killPt(i, dur) { PTS.sx[i] = PTS.sx[i] + (PTS.tx[i] - PTS.sx[i]) * ptU(i); PTS.sy[i] = PTS.sy[i] + (PTS.ty[i] - PTS.sy[i]) * ptU(i); PTS.tx[i] = PTS.sx[i]; PTS.ty[i] = PTS.sy[i]; PTS.a0[i] = PTS.al[i]; PTS.a1[i] = 0; PTS.t0[i] = clock; PTS.t1[i] = clock + dur; PTS.kind[i] = -2; }
  function ptU(i) { const d = PTS.t1[i] - PTS.t0[i]; return d <= 0 ? 1 : clamp((clock - PTS.t0[i]) / d, 0, 1); }
  let lastFrameShown = -1;
  function showFrame(fi, dur) {      // the lights follow the run's hour fi
    const fr = RUN.rec, N = BJ.hex.x.length;
    const c = fr.c[fi], f = fr.f[fi], k = fr.k[fi], al = fr.al[fi], pw = fr.pw[fi], g = fr.g[fi];
    // the texture
    let cmax = 1; for (let i = 0; i < N; i++) if (c[i] > cmax) cmax = c[i];
    for (let i = 0; i < N; i++) {
      hexData[i * 4] = Math.round(clamp(k[i], 0, 1) * 255);
      hexData[i * 4 + 1] = Math.round(clamp(-k[i], 0, 1) * 255);
      hexData[i * 4 + 2] = pw[i] ? 255 : 0;
      hexData[i * 4 + 3] = Math.round(clamp(Math.sqrt(c[i] / cmax), 0, 1) * 255 * (c[i] > 20 ? 1 : 0));
    }
    hexTex.needsUpdate = true;
    U_.uNight.value = (g.hr >= 20 || g.hr < 6) ? 1 : 0;
    // the lights: how many each hex should hold
    const want = [new Int32Array(N), new Int32Array(N), new Int32Array(N)];
    for (let i = 0; i < N; i++) { want[0][i] = Math.round(c[i] / RUN.xP); want[1][i] = Math.round(f[i] / RUN.xF); want[2][i] = Math.round(al[i] / RUN.xF); }
    const have = [[], [], []]; for (let kk = 0; kk < 3; kk++) for (let i = 0; i < N; i++) have[kk].push([]);
    const free = [];
    for (let i = 0; i < PTS.n; i++) { const kk = PTS.kind[i]; if (kk >= 0) have[kk][PTS.hex[i]].push(i); else if (kk === -1 || (kk === -2 && ptU(i) >= 1)) free.push(i); }
    for (let kk = 0; kk < 3; kk++) {
      const H = have[kk], Wn = want[kk];
      // surplus moves to neighbours that lack, along the board
      for (let i = 0; i < N; i++) {
        let sur = H[i].length - Wn[i]; if (sur <= 0) continue;
        const nb = BJ.hex.nb[i];
        for (const j of nb) { if (sur <= 0) break; const def = Wn[j] - H[j].length; if (def <= 0) continue; const m = Math.min(def, sur); for (let t = 0; t < m; t++) { const p = H[i].pop(); movePt(p, j, dur); H[j].push(p); } sur -= m; }
        while (sur-- > 0) { const p = H[i].pop(); killPt(p, dur * 0.6); }
      }
      for (let i = 0; i < N; i++) { let def = Wn[i] - H[i].length; while (def-- > 0 && free.length) { const p = free.pop(); spawnPt(p, kk, i, dur * 0.7); H[i].push(p); } }
    }
    // shots, gas, fire, at the clashes
    const lv = g.Lv;
    for (let i = 0; i < N; i++) {
      if (c[i] > 30 && f[i] > 10) {
        const inten = Math.min(1, Math.sqrt(c[i] * f[i]) / 3000);
        const n = Math.round((lv >= 2 ? 6 : 3) * inten * (REDUCED ? 0.3 : 1));
        for (let t = 0; t < n; t++) fx(i, lv >= 3 ? 'shot' : lv >= 2 ? (Math.random() < 0.5 ? 'shot' : 'gas') : 'gas', dur);
      }
      if (k[i] > 0.4 && c[i] > 50 && Math.random() < 0.25) fx(i, 'fire', dur);
    }
    // deaths: one quiet white light for each life (or each ten, on a big toll)
    lastFrameShown = fi;
    hud(g, fi);
    feedTo(fi);
    beaconsTo(g);
  }
  function fx(h, kind, dur) {
    const a = HP[h], m = (a.length / 2) | 0, j = (Math.random() * m) | 0;
    const i = FX.next; FX.next = (FX.next + 1) % FX.n;
    FX.pos[i * 3] = a[j * 2] + (Math.random() - 0.5) * 60; FX.pos[i * 3 + 1] = 8; FX.pos[i * 3 + 2] = -(a[j * 2 + 1] + (Math.random() - 0.5) * 60);
    const C = kind === 'shot' ? [1, 0.95, 0.85] : kind === 'gas' ? [0.55, 0.62, 0.6] : [1, 0.45, 0.12];
    FX.col[i * 3] = C[0]; FX.col[i * 3 + 1] = C[1]; FX.col[i * 3 + 2] = C[2];
    FX.sz[i] = PS * (kind === 'gas' ? 0.7 : kind === 'fire' ? 0.3 : 0.11); FX.max[i] = FX.life[i] = (kind === 'shot' ? 0.18 : kind === 'gas' ? 1.6 : 0.9) * (0.5 + Math.random()) * Math.max(0.4, Math.min(1.5, dur));
    FX.vy[i] = kind === 'gas' ? 6 : kind === 'fire' ? 14 : 0;
    FX.delay = 0;
    FX.pos[i * 3 + 1] = 6 + Math.random() * 4;
    FX.t0 = FX.t0 || new Float32Array(FX.n); FX.t0[i] = clock + Math.random() * dur * 0.9;
  }

  // ================================================================== the frame loop
  let clock = 0, lastT = performance.now(), visible = true;
  const io = 'IntersectionObserver' in W ? new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.01 }) : null;
  if (io) io.observe(stage);
  function size() {
    const r = stage.getBoundingClientRect();
    const w = Math.max(320, r.width), h = Math.max(380, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  W.addEventListener('resize', size); size();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    if (!visible || D.hidden || !BJ) return;
    clock += dt; U_.uTime.value = clock;
    playTick(dt);
    camApply();
    // lights
    if (PTS) {
      const P = PTS, wob = REDUCED ? 0 : 1;
      for (let i = 0; i < P.n; i++) {
        if (P.kind[i] === -1) { P.al[i] = 0; continue; }
        const u = ptU(i), e = u * u * (3 - 2 * u);
        const x = P.sx[i] + (P.tx[i] - P.sx[i]) * e, y = P.sy[i] + (P.ty[i] - P.sy[i]) * e;
        const ph = P.ph[i];
        P.pos[i * 3] = x + wob * Math.sin(clock * 1.3 + ph) * 5; P.pos[i * 3 + 1] = 7; P.pos[i * 3 + 2] = -(y + wob * Math.cos(clock * 1.1 + ph * 1.3) * 5);
        P.al[i] = (P.a0[i] + (P.a1[i] - P.a0[i]) * u) * (P.kind[i] === 1 ? 0.9 : 0.5);
        if (P.kind[i] === -2 && u >= 1) { P.kind[i] = -1; P.al[i] = 0; }
      }
      ptsGeo.attributes.position.needsUpdate = true; ptsGeo.attributes.al.needsUpdate = true; ptsGeo.attributes.col.needsUpdate = true; ptsGeo.attributes.sz.needsUpdate = true;
    }
    if (FX && FX.t0) {
      for (let i = 0; i < FX.n; i++) {
        if (FX.life[i] <= 0) { FX.al[i] = 0; continue; }
        if (clock < FX.t0[i]) { FX.al[i] = 0; continue; }
        FX.life[i] -= dt; const u = clamp(FX.life[i] / FX.max[i], 0, 1);
        FX.pos[i * 3 + 1] += FX.vy[i] * dt;
        FX.al[i] = FX.sz[i] > PS * 0.5 ? 0.18 * u : FX.sz[i] > PS * 0.2 ? 0.75 * u * (0.6 + 0.4 * Math.random()) : u;
      }
      fxGeo.attributes.position.needsUpdate = true; fxGeo.attributes.al.needsUpdate = true; fxGeo.attributes.col.needsUpdate = true; fxGeo.attributes.sz.needsUpdate = true;
    }
    renderer.render(scene, camera);
    placeLabels();
  }
  const pv = new THREE.Vector3();
  function placeLabels() {
    const r = canvas.getBoundingClientRect(), w = r.width, h = r.height;
    const far = cam.dist > (BJ.r * 2.4);
    const taken = [];      // labels never overlap: the places that matter most are placed first, the rest give way
    for (const n of LORDER) {
      const b = beacons[n], el = labelEls[n];
      const show = b.q.oi != null || (!far && cam.dist < BJ.r * 1.3);
      if (!show) { if (el.style.display !== 'none') el.style.display = 'none'; continue; }
      pv.copy(b.top).project(camera);
      if (pv.z > 1 || pv.x < -1.1 || pv.x > 1.1 || pv.y < -1.1 || pv.y > 1.1) { el.style.display = 'none'; continue; }
      const X = (pv.x + 1) / 2 * w, Y = (1 - pv.y) / 2 * h;
      const lw = el._w || (el._w = el.offsetWidth || 90), lh = 20;
      const bx = [X - lw / 2, Y - lh - 6, X + lw / 2, Y - 6];
      if (taken.some(t => bx[0] < t[2] && bx[2] > t[0] && bx[1] < t[3] && bx[3] > t[1])) { el.style.display = 'none'; continue; }
      taken.push(bx);
      el.style.display = '';
      el.style.transform = `translate(${X.toFixed(1)}px,${Y.toFixed(1)}px) translate(-50%,-100%)`;
    }
  }
  function beaconsTo(g) {
    for (const b of beacons) {
      if (b.q.oi == null) continue;
      const held = g && g.held && g.held[b.q.oi];
      b.mat.color.setHex(held ? 0xffd36b : 0xffffff);
      if (b.ring) b.ring.material.color.setHex(held ? 0xffd36b : 0xff3b4f);
      tog(labelEls[beacons.indexOf(b)], 'held', !!held);
    }
  }

  // ================================================================== one run, played
  let RUN = null, playing = false, speed = 3, tPos = 0, frameShown = -1;
  const bar = D.getElementById('up-bar'), scrub = D.getElementById('up-scrub');
  function curFrame() { if (!RUN) return null; const fi = Math.max(0, Math.min(RUN.rec.c.length - 1, lastFrameShown)); return { c: RUN.rec.c[fi], f: RUN.rec.f[fi], k: RUN.rec.k[fi], al: RUN.rec.al[fi], dead: RUN.rec.dead[fi] }; }
  function play(seed) {
    stopPlay();
    const t0 = performance.now();
    const o = U.run(BJ, S, seed, { record: true });
    o.seed = seed;
    RUN = o;
    const nT = o.rec.c.length;
    let maxC = 1, maxF = 1;
    for (const g of o.rec.g) { if (g.C > maxC) maxC = g.C; if (g.F + g.al > maxF) maxF = g.F + g.al; }
    const P = PTS.n;
    const NH = BJ.hex.x.length;      // a small town gets fewer lights, so its streets still show
    RUN.xP = Math.max(1, maxC / Math.min(P * 0.68, NH * 30));
    RUN.xF = Math.max(1, maxF / Math.min(P * 0.28, NH * 12));
    tPos = 0; frameShown = -1; playing = true;
    for (let i = 0; i < PTS.n; i++) if (PTS.kind[i] >= 0) killPt(i, 0.3);
    bar.hidden = false; scrub.max = String(nT - 1); scrub.value = '0';
    feedReset();
    setPP();
    tog(box, 'running', true);
    if (PHONE()) collapse(true);
    console.debug('run', Math.round(performance.now() - t0) + 'ms', o.outcome);
    dirtyRun = dirty;
  }
  let dirtyRun = -1;
  function stopPlay() { playing = false; setPP(); }
  function togglePause() { if (!RUN) return; if (tPos >= RUN.rec.c.length - 1) { tPos = 0; frameShown = -1; feedReset(); } playing = !playing; setPP(); }
  function setPP() { const b = D.getElementById('up-pp'); b.textContent = playing ? '❚❚' : '▶'; b.setAttribute('aria-label', playing ? tr('Pause') : tr('Play')); }
  function playTick(dt) {
    if (!RUN) return;
    const nT = RUN.rec.c.length;
    if (playing) {
      tPos += dt * speed;
      if (tPos >= nT - 1) { tPos = nT - 1; playing = false; setPP(); setTimeout(() => { if (RUN && !playing && tPos >= nT - 1) openResults(); }, 900); }
    }
    const fi = Math.floor(tPos);
    if (fi !== frameShown) {
      const dur = clamp(1 / speed, 0.08, 1.2);
      showFrame(fi, Math.abs(fi - frameShown) > 1 ? 0.35 : dur);
      frameShown = fi;
      if (D.activeElement !== scrub) scrub.value = String(fi);
    }
  }
  scrub.addEventListener('input', () => { if (!RUN) return; playing = false; setPP(); tPos = +scrub.value; feedReset(); });
  D.getElementById('up-pp').addEventListener('click', togglePause);
  $$('.up-spd button', bar).forEach(b => b.addEventListener('click', () => { speed = +b.dataset.spd; $$('.up-spd button', bar).forEach(x => tog(x, 'on', x === b)); }));

  // ---- the head-up display
  function hud(g, fi) {
    const hp = clamp(g.ctl, 0, 1), ob = g.obj;
    const ppl = clamp(hp * 0.6 + ob * 0.4, 0, 1);
    D.getElementById('up-hp').textContent = pc(ppl); D.getElementById('up-hr').textContent = pc(1 - ppl);
    D.getElementById('up-hpb').style.width = (ppl * 100).toFixed(1) + '%';
    D.getElementById('up-hc').textContent = big(g.C); D.getElementById('up-hf').textContent = big(g.F); D.getElementById('up-hd').textContent = big(g.def);
    D.getElementById('up-hk').textContent = fmt(g.dead);
    const net = D.getElementById('up-fnet-t'), pw = D.getElementById('up-fpow-t'), lv = D.getElementById('up-flv-t');
    net.textContent = g.net || g.cm < 0.2 ? tr('Internet cut') : g.cm < 0.7 ? tr('Internet slowed') : tr('Internet on');
    tog(D.getElementById('up-fnet'), 'bad', g.net || g.cm < 0.2);
    pw.textContent = g.power ? tr('Power cuts') : tr('Power on'); tog(D.getElementById('up-fpow'), 'bad', !!g.power);
    lv.textContent = tr(WORD.lv[g.Lv]); tog(D.getElementById('up-flv'), 'bad', g.Lv >= 3);
    const day = Math.floor((RUN.X.hour + g.t) / 24) + 1;
    D.getElementById('up-day').textContent = tf('Day {d}', { d: N_(day) });
    D.getElementById('up-hour').textContent = N_(String(g.hr).padStart(2, '0') + ':00');
  }
  function hudIdle() {
    D.getElementById('up-hp').textContent = pc(0); D.getElementById('up-hr').textContent = pc(1); D.getElementById('up-hpb').style.width = '0%';
    for (const id of ['up-hc', 'up-hd', 'up-hk']) D.getElementById(id).textContent = N_('0');
    D.getElementById('up-hf').textContent = big(BJ.pop * U.K.forcesPerPop);
    D.getElementById('up-fnet-t').textContent = S.net === 'off' ? tr('Internet cut') : S.net === 'slow' ? tr('Internet slowed') : tr('Internet on');
    D.getElementById('up-fpow-t').textContent = S.power === 'off' || S.power === 'cuts' ? tr('Power cuts') : tr('Power on');
    D.getElementById('up-flv-t').textContent = tr(WORD.lv[0]);
    $$('.up-fl').forEach(x => tog(x, 'bad', false));
  }

  // ---- the event feed
  const feedl = D.getElementById('up-feedl');
  let feedAt = -1;
  function feedReset() { feedl.innerHTML = ''; feedAt = -1; lastFrameShown = -1; }
  function evText(e) {
    const site = e.site != null ? siteName(SITES[e.site]) : null, at = hexName(e.h);
    switch (e.type) {
      case 'lv': return e.down ? tf('The forces step back to: {l}.', { l: tr(WORD.lv[e.lv]) }) : [null, tr('Riot police move in with batons and tear gas.'), e.why === 'armed' ? tr('Shots are fired from the crowd. The forces answer with live fire.') : tr('Birdshot, and the first live rounds.'), tr('The forces fire live ammunition into the crowds.'), tr('Massacre: heavy machine guns on the crowds.')][e.lv];
      case 'netcut': return tr('The regime cuts the internet.');
      case 'powercut': return tr('The power goes off in the districts that rose, ahead of night raids.');
      case 'clash': return tf('First clashes, at {p}.', { p: at });
      case 'take': return tf('The people take {s}.', { s: site });
      case 'lose': return tf('The forces take back {s}.', { s: site });
      case 'defect': return tr('The first units refuse their orders and cross over.');
      case 'army': return [null, tr('The army is ordered onto the streets.'), tr('The army declares itself neutral.'), tr('The army joins the people.')][e.s];
      case 'reinf': return tr('Reinforcements arrive on the highways from other provinces.');
      case 'blocked': return tr('The roads in are held. Reinforcements turn back.');
      case 'proxies': return tf('Foreign fighters brought in by the regime arrive, about {n}.', { n: big(e.n) });
      case 'strike': return e.lv === 1 ? tr('Shops and the bazaar close. The strike spreads.') : tr('General strike: oil, transport and the bazaar stop.');
      case 'liberated': return tr('The city is liberated.');
      case 'crushed': return tr('The streets go quiet. The uprising is crushed.');
    }
    return null;
  }
  const BAD = { lv: 1, netcut: 1, powercut: 1, lose: 1, reinf: 1, proxies: 1, crushed: 1 };
  function feedTo(fi) {
    if (!RUN) return;
    if (fi < feedAt) feedReset();
    const ev = RUN.ev;
    for (const e of ev) {
      if (e.t <= feedAt || e.t > fi) continue;
      const t = evText(e); if (!t) continue;
      const li = D.createElement('li');
      const day = Math.floor((RUN.X.hour + e.t) / 24) + 1, hr = (RUN.X.hour + e.t) % 24;
      li.className = (BAD[e.type] && !e.down ? 'bad' : e.type === 'take' || e.type === 'defect' || e.type === 'army' && e.s >= 2 || e.type === 'blocked' || e.type === 'liberated' || e.type === 'strike' ? 'good' : '') + (e.type === 'lv' && e.lv >= 3 ? ' grave' : '');
      li.innerHTML = `<time>${tf('Day {d}', { d: N_(day) })} · ${N_(String(hr).padStart(2, '0'))}:00</time><span>${esc(t)}</span>`;
      if (e.h >= 0 || e.site != null) { li.tabIndex = 0; li.addEventListener('click', () => { const h = e.site != null ? SITES[e.site].h : e.h; camFly(BJ.hex.x[h], BJ.hex.y[h], BJ.s * 6); }); }
      feedl.insertBefore(li, feedl.firstChild);
      while (feedl.children.length > 60) feedl.removeChild(feedl.lastChild);
    }
    feedAt = fi;
  }

  // ---- the inspector (a tapped hex during a run)
  const insp = D.getElementById('up-insp');
  function inspOpen(h) { insp.hidden = false; insp.innerHTML = `<button type="button" class="up-x" aria-label="${tr('Close')}">✕</button>${hexTip(h, false)}`; $('.up-x', insp).addEventListener('click', inspClose); }
  function inspClose() { insp.hidden = true; }

  // ================================================================== the command panel
  const tabs = $$('.up-tab[data-tab]', ui);
  function showTab(id) {
    tabs.forEach(t => { const on = t.dataset.tab === id; tog(t, 'on', on); t.setAttribute('aria-selected', on); });
    for (const p of ['city', 'cond', 'plan', 'adv']) D.getElementById('up-p-' + p).hidden = p !== id;
    collapse(false);
  }
  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  const cmd = D.getElementById('up-cmd');
  function collapse(on) { tog(cmd, 'min', on); }
  D.getElementById('up-min').addEventListener('click', () => collapse(!cmd.classList.contains('min')));

  // ---- City
  function renderCity() {
    const c = cityOf(cityId);
    D.getElementById('up-cn').textContent = FA ? c.fa : c.n;
    D.getElementById('up-cf').textContent = FA ? (c.prov || '') : (c.fa || '');
    const g = c.g == null ? 0.5 : c.g;
    const hist = (c.h || []).map(x => `<li><b>${esc(x.u === 'other' ? '' : N_(x.u || ''))}</b> ${esc(x.w || '')}${x.d ? ` <em>${esc(N_(x.d))} ${tr('killed')}</em>` : ''}${x.src ? ` <a href="${esc(x.src)}" target="_blank" rel="noopener">${tr('source')}</a>` : ''}</li>`).join('');
    D.getElementById('up-p-city').innerHTML = `
      <div class="up-cc"><div class="up-cc-h"><h2>${esc(FA ? c.fa : c.n)}</h2><span>${esc(FA ? c.n : c.fa)}</span></div>
      <p class="up-cc-p">${esc(c.prov || '')} · ${tf('{n} people', { n: big(c.pop) })}</p>
      <div class="up-meter"><span>${tr('How hard it has risen before')}</span><i><b style="width:${Math.round(g * 100)}%"></b></i><em>${pc(g)}</em></div>
      ${c.gw ? `<p class="up-note">${esc(c.gw)}</p>` : ''}
      <button type="button" class="up-sec up-chg" id="up-chg">${tr('Change city')}</button>
      ${(c.notable || []).length ? `<h3>${tr('What it is known for')}</h3><ul class="up-ul">${c.notable.slice(0, 4).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${hist ? `<h3>${tr('This city in past uprisings')}</h3><ul class="up-hist">${hist}</ul>` : ''}
      ${c.eco ? `<h3>${tr('Where a strike would bite')}</h3><p class="up-note">${esc(c.eco)}</p>` : ''}
      ${c.sec ? `<h3>${tr('The security forces here')}</h3><p class="up-note">${esc(c.sec)}</p>` : ''}
      ${c.eth ? `<h3>${tr('Who lives here')}</h3><p class="up-note">${esc(c.eth)}</p>` : ''}
      <p class="up-src">${tf('Streets: {s}.', { s: esc(BJ.src || '© OpenStreetMap contributors') })} ${tf('{n} districts on the board, {m} places that matter.', { n: N_(BJ.hex.x.length), m: N_(SITES.filter(q => q.oi != null).length) })}</p></div>`;
    D.getElementById('up-chg').addEventListener('click', openPick);
  }
  D.getElementById('up-pickb').addEventListener('click', openPick);

  // ---- Conditions
  function seg(id, label, opts, val, help) {
    return `<div class="up-row"><div class="up-row-h"><b>${tr(label)}</b>${help ? `<span>${tr(help)}</span>` : ''}</div><div class="up-seg" data-k="${id}" role="radiogroup" aria-label="${tr(label)}">${opts.map(([v, t]) => `<button type="button" role="radio" data-v="${v}" aria-checked="${String(val) === String(v)}"${String(val) === String(v) ? ' class="on"' : ''}>${tr(t)}</button>`).join('')}</div></div>`;
  }
  const LOGT = v => Math.round(Math.exp(Math.log(0.2) + v / 100 * (Math.log(20) - Math.log(0.2))) * 100) / 100;
  const TLOG = t => Math.round((Math.log(t) - Math.log(0.2)) / (Math.log(20) - Math.log(0.2)) * 100);
  function renderCond() {
    const at = U.autoTurnout(BJ, S, S.nation === 'auto' ? null : U.NATION[S.nation]);
    const tv = S.turnout == null ? at : S.turnout;
    const ppl = BJ.pop * tv / 100;
    const sl = S.starlink == null ? Math.round(100000 * BJ.pop / 90e6) : S.starlink;
    D.getElementById('up-p-cond').innerHTML = `
      <div class="up-row up-row-big"><div class="up-row-h"><b>${tr('People on the streets')}</b><span>${tr('At the busiest hour, as a share of everyone who lives in the city.')}</span></div>
        <div class="up-slide"><input type="range" id="up-turn" min="0" max="100" value="${TLOG(clamp(tv, 0.2, 20))}" aria-label="${tr('People on the streets')}"><output id="up-turn-o"><b>${N_(tv.toFixed(tv < 1 ? 2 : 1))}%</b> ${tf('{n} people', { n: big(ppl) })}</output></div>
        <label class="up-auto"><input type="checkbox" id="up-turn-a"${S.turnout == null ? ' checked' : ''}> ${tf('Let the model decide (it expects about {p})', { p: N_(at.toFixed(1)) + '%' })}</label>
        <p class="up-hint" id="up-35">${tv >= 3.5 ? tr('Above 3.5%: no campaign in the research that reached it lasted long enough to fail, except Bahrain, which was crushed with outside help.') : tf('Below the 3.5% line. That would be {n} people here.', { n: big(BJ.pop * 0.035) })}</p></div>
      ${seg('nation', 'The rest of Iran', [['auto', 'Model decides'], ['alone', 'This city alone'], ['some', 'Some cities'], ['all', 'Nationwide']], S.nation, 'When the whole country rises the regime has no one to send.')}
      ${seg('net', 'The internet', [['auto', 'Regime decides'], ['on', 'On'], ['slow', 'Slowed'], ['off', 'Cut']], S.net, 'In 2019 and 2026 the regime cut it, and the killing was worst in the dark.')}
      <div class="up-row"><div class="up-row-h"><b>${tr('Starlink terminals in the city')}</b><span>${tr('A floor under any blackout. Jammed in part.')}</span></div>
        <div class="up-slide"><input type="range" id="up-sl" min="0" max="100" value="${Math.round(Math.sqrt(sl / 20000) * 100)}" aria-label="${tr('Starlink terminals in the city')}"><output id="up-sl-o">${fmt(sl)}</output></div>
        <label class="up-auto"><input type="checkbox" id="up-sl-a"${S.starlink == null ? ' checked' : ''}> ${tr('Let the model decide')}</label></div>
      ${seg('power', 'Electricity', [['auto', 'Regime decides'], ['on', 'On'], ['cuts', 'Cuts'], ['off', 'Off']], S.power, 'The regime darkens the districts it raids at night.')}
      <div class="up-row up-arm${S.armed ? ' on' : ''}"><div class="up-row-h"><b>${tr('Are the people armed?')}</b><span>${tr('Off unless you switch it on: they almost certainly would not be.')}</span></div>
        <div class="up-seg" data-k="armed" role="radiogroup"><button type="button" role="radio" data-v="false" aria-checked="${!S.armed}"${!S.armed ? ' class="on"' : ''}>${tr('Unarmed')}</button><button type="button" role="radio" data-v="true" aria-checked="${!!S.armed}"${S.armed ? ' class="on"' : ''}>${tr('Armed')}</button></div>
        <div class="up-armx"${S.armed ? '' : ' hidden'}>
          <div class="up-slide"><span>${tr('Guns')}</span><input type="range" id="up-guns" min="0" max="100" value="${Math.round(Math.log10(1 + S.guns) / 5.3 * 100)}" aria-label="${tr('Guns')}"><output id="up-guns-o">${fmt(S.guns)}</output></div>
          <div class="up-slide"><span>${tr('Drones')}</span><input type="range" id="up-dr" min="0" max="100" value="${Math.round(Math.log10(1 + S.drones) / 4 * 100)}" aria-label="${tr('Drones')}"><output id="up-dr-o">${fmt(S.drones)}</output></div>
          <p class="up-hint">${tr('In the research, armed campaigns won about half as often as unarmed ones, and in the 2010s one in twelve. Arms keep most people at home, harden the forces and turn defectors back.')}</p></div></div>
      ${seg('proxies', 'Foreign fighters the regime brings in', [['auto', 'Model decides'], ['none', 'None'], ['some', 'Some'], ['many', 'Many']], S.proxies, 'Iraqi militias were reported inside Iran in January 2026. They do not defect.')}
      ${seg('loyalty', "The forces' loyalty", [['auto', 'Model decides'], ['firm', 'Rock solid'], ['shaky', 'Shaky']], S.loyalty, 'No unit has defected since 1979. The army stood aside in February 1979.')}
      ${seg('outside', 'Help from outside', [['auto', 'Model decides'], ['none', 'None'], ['pressure', 'Pressure and sanctions'], ['strikes', 'Strikes on the IRGC']], S.outside, 'Low confidence: there is little research on this.')}
      ${seg('occasion', 'The day it starts', [['none', 'An ordinary day'], ['funeral', 'A funeral or 40th day'], ['national', 'A national day']], S.occasion, 'Iran rises in 40-day cycles of mourning.')}
      <div class="up-row"><div class="up-row-h"><b>${tr('Start time')}</b></div><div class="up-slide"><input type="range" id="up-hr" min="0" max="23" value="${S.hour}" aria-label="${tr('Start time')}"><output id="up-hr-o">${N_(String(S.hour).padStart(2, '0'))}:00 ${S.hour >= 20 || S.hour < 6 ? '☾' : '☀'}</output></div></div>`;
    const P = D.getElementById('up-p-cond');
    $$('.up-seg', P).forEach(g => g.addEventListener('click', ev => {
      const b = ev.target.closest('button[data-v]'); if (!b) return;
      const k = g.dataset.k; let v = b.dataset.v; if (k === 'armed') v = v === 'true';
      S[k] = v;
      if (k === 'armed' && !v && S.plan.type === 'armed') setPlan('centre');
      changed(); renderCond(); if (k === 'armed') renderPlan();
    }));
    const turn = D.getElementById('up-turn'), turnA = D.getElementById('up-turn-a');
    turn.addEventListener('input', () => { S.turnout = LOGT(+turn.value); turnA.checked = false; const ppl2 = BJ.pop * S.turnout / 100; D.getElementById('up-turn-o').innerHTML = `<b>${N_(S.turnout.toFixed(S.turnout < 1 ? 2 : 1))}%</b> ${tf('{n} people', { n: big(ppl2) })}`; });
    turn.addEventListener('change', () => { changed(); renderCond(); });
    turnA.addEventListener('change', () => { S.turnout = turnA.checked ? null : Math.round(at * 10) / 10; changed(); renderCond(); });
    const sl2 = D.getElementById('up-sl'), slA = D.getElementById('up-sl-a');
    sl2.addEventListener('input', () => { S.starlink = Math.round((+sl2.value / 100) ** 2 * 20000 / 10) * 10; slA.checked = false; D.getElementById('up-sl-o').textContent = fmt(S.starlink); });
    sl2.addEventListener('change', changed);
    slA.addEventListener('change', () => { S.starlink = slA.checked ? null : sl; changed(); renderCond(); });
    const gu = D.getElementById('up-guns'), dr = D.getElementById('up-dr');
    if (gu) { gu.addEventListener('input', () => { S.guns = Math.round(10 ** (+gu.value / 100 * 5.3) - 1); D.getElementById('up-guns-o').textContent = fmt(S.guns); }); gu.addEventListener('change', changed); }
    if (dr) { dr.addEventListener('input', () => { S.drones = Math.round(10 ** (+dr.value / 100 * 4) - 1); D.getElementById('up-dr-o').textContent = fmt(S.drones); }); dr.addEventListener('change', changed); }
    const hr = D.getElementById('up-hr');
    hr.addEventListener('input', () => { S.hour = +hr.value; D.getElementById('up-hr-o').textContent = N_(String(S.hour).padStart(2, '0')) + ':00 ' + (S.hour >= 20 || S.hour < 6 ? '☾' : '☀'); });
    hr.addEventListener('change', changed);
  }
  function refreshAuto() { }

  // ---- Strategy
  function setPlan(t) { const ign = S.plan.ign; S.plan = Object.assign({ type: t, ign }, U.PLANS[t]); }
  function renderPlan() {
    const types = Object.keys(U.PLANS).filter(t => t !== 'armed' || S.armed);
    const ig = ignNow();
    D.getElementById('up-p-plan').innerHTML = `
      <div class="up-plans" role="radiogroup" aria-label="${tr('Strategy')}">${types.map(t => `<button type="button" role="radio" class="up-pc${S.plan.type === t ? ' on' : ''}" data-plan="${t}" aria-checked="${S.plan.type === t}"><i>${PLAN_ICON[t]}</i><b>${tr(PLAN_T[t][0])}</b><span>${tr(PLAN_T[t][1])}</span><em>${tr(PLAN_T[t][2])}</em></button>`).join('')}</div>
      <h3>${tr('Where it starts')}</h3>
      <p class="up-note">${S.plan.ign && S.plan.ign.length ? tf('{n} starting points you placed. Tap the map to add or remove one.', { n: N_(ig.length) }) : tr('The model picks the universities, the bazaar and the crowded edges of the city. Tap the map to place your own.')}</p>
      <div class="up-chips">${ig.map(h => `<button type="button" class="up-chip" data-h="${h}">${esc(hexName(h))} <span aria-hidden="true">✕</span></button>`).join('')}${S.plan.ign && S.plan.ign.length ? `<button type="button" class="up-chip up-chip-r" id="up-ign-r">${tr('Let the model pick')}</button>` : ''}</div>
      <details class="up-dials"${PHONE() ? '' : ' open'}><summary>${tr('Fine-tune the plan')}</summary>
      ${U.DIALS.map(d => `<div class="up-dial"><label for="up-d-${d}"><b>${tr(DIAL_T[d][0])}</b><span>${tr(DIAL_T[d][1])}</span></label><input type="range" id="up-d-${d}" data-d="${d}" min="0" max="100" value="${Math.round(S.plan[d] * 100)}"><output>${N_(Math.round(S.plan[d] * 100))}</output></div>`).join('')}</details>`;
    const P = D.getElementById('up-p-plan');
    $$('.up-pc', P).forEach(b => b.addEventListener('click', () => { setPlan(b.dataset.plan); changed(); renderPlan(); drawIgn(); }));
    $$('.up-chip[data-h]', P).forEach(b => b.addEventListener('click', () => { const h = +b.dataset.h; const ig2 = ignNow().filter(x => x !== h); S.plan.ign = ig2.length ? ig2 : null; changed(); renderPlan(); drawIgn(); }));
    const rr = D.getElementById('up-ign-r'); if (rr) rr.addEventListener('click', () => { S.plan.ign = null; changed(); renderPlan(); drawIgn(); });
    $$('input[data-d]', P).forEach(inp => {
      inp.addEventListener('input', () => { S.plan[inp.dataset.d] = +inp.value / 100; inp.nextElementSibling.textContent = N_(inp.value); });
      inp.addEventListener('change', changed);
    });
  }

  // ---- Advisors
  const ADV = [
    { id: 'scholar', n: 'The Civil-Resistance Scholar', school: 'The research of Erica Chenoweth and Maria Stephan on 323 campaigns', ic: '📚', f: ['chenoweth-3-5', 'chenoweth-nonviolent-violent'], plan: { type: 'soldiers', discipline: 0.97, fraternize: 0.85, strike: 0.6, conv: 0.5 } },
    { id: 'organizer', n: 'The Strike Organizer', school: 'The oil workers of 1978 and the Sudanese professionals of 2019', ic: '⏸', f: ['strike-1978'], plan: { type: 'strike' } },
    { id: 'officer', n: 'The Former Officer', school: 'How security forces decide whether to shoot', ic: '🎖', f: ['defection-mechanism'], plan: { type: 'soldiers', fraternize: 1, discipline: 1, conv: 0.45 } },
    { id: 'street', n: 'The Street Organizer', school: 'The neighbourhood youth of 2022 and 2026', ic: '✊', f: ['night'], plan: { type: 'water', night: 0.7, offline: 0.8 } },
    { id: 'digital', n: 'The Blackout Specialist', school: 'Internet shutdowns and how movements survive them', ic: '📶', f: ['blackout-massacre', 'hassanpour-shutdown'], plan: { offline: 1, pace: 0.85 } },
    { id: 'urban', n: 'The Urban Strategist', school: 'Mark Beissinger on how cities make revolutions', ic: '🗺', f: ['beissinger-city'], plan: null },
    { id: 'medic', n: 'The Medic', school: 'Rights groups who documented the hospital raids', ic: '✚', f: [], plan: { medics: 1 } },
    { id: 'historian', n: 'The Historian', school: '1979, 2009, 2019, 2022 and 2026', ic: '⌛', f: [], plan: { type: 'strike', pace: 0.25 } },
    { id: 'red', n: "The Regime's Playbook", school: 'What the IRGC will do against your plan', ic: '◉', f: [], plan: null, red: true },
  ];
  let advOpen = null;
  function findingOf(id) { return (DATA.findings || []).find(f => f.id === id) || (DATA.findings || []).find(f => f.id && id && f.id.indexOf(id.split('-')[0]) === 0); }
  function brief(a) {
    const at = U.autoTurnout(BJ, S, S.nation === 'auto' ? null : U.NATION[S.nation]);
    const tv = S.turnout == null ? at : S.turnout, ppl = BJ.pop * tv / 100, need = BJ.pop * 0.035;
    const P = S.plan, c = cityOf(cityId), name = FA ? c.fa : c.n;
    const L = [];
    const sq = SITES.find(q => q.k === 'square'), gov = SITES.find(q => q.k === 'gov'), tvS = SITES.find(q => q.k === 'tv');
    const ents = BJ.hex.ent.reduce((s, v) => s + v, 0), gars = SITES.filter(q => q.k === 'garrison').length;
    switch (a.id) {
      case 'scholar':
        L.push(tv < 3.5 ? tf('You have about {n} people at the busiest hour, {p} of {c}. The research says the line that matters is 3.5%: about {m} here.', { n: big(ppl), p: N_(tv.toFixed(1)) + '%', c: name, m: big(need) }) : tf('{p} of {c} is above the 3.5% line. Numbers are on your side; now keep them nonviolent so the forces split.', { p: N_(tv.toFixed(1)) + '%', c: name }));
        if (S.armed) L.push(tr('Put the guns away. Armed campaigns succeed about half as often, because they keep most people at home and give the forces a reason to stay together.'));
        if (P.discipline < 0.8) L.push(tr('Your discipline is loose. Every stone thrown is a video the regime uses to keep its own men loyal.'));
        L.push(tr('My plan: strict nonviolence, a strike, and steady pressure on the soldiers.'));
        break;
      case 'organizer':
        L.push(tr('The streets alone have never brought this regime down. In 1978 the oil workers cut output from six million barrels a day to about one and a half, and the Shah had nothing left to pay with.'));
        L.push(P.strike < 0.5 ? tr('Your plan barely strikes. Close the bazaar, stop the trucks and the oil, and keep people home for the first two days while it spreads.') : tr('Your strike is strong. Hold it for days: it erodes the forces from inside, slowly, but it does not stop.'));
        L.push(tr('My plan: strike first, then fill the streets.'));
        break;
      case 'officer':
        L.push(tr('The IRGC and the special units will not cross over. The conscripts, the police rank and file and the army might. Aim at them.'));
        L.push(gars ? tf('There are {n} barracks on this map. In February 1979 the army in its barracks declared itself neutral and the regime fell in days.', { n: N_(gars) }) : tr('There are no army barracks on this map, so the city depends on its police and the IRGC. Defections will come from the police conscripts.'));
        if (S.armed) L.push(tr('A man you shoot at will not join you. Arms are the surest way to keep the forces together.'));
        L.push(tr('My plan: total nonviolence and constant contact with the soldiers.'));
        break;
      case 'street':
        L.push(tr('They have more guns, so never stand where they are waiting. Many small crowds, everywhere at once, gone before the vans arrive.'));
        L.push(tr('At night the alleys belong to us. Rooftop chants keep the city awake and the forces tired.'));
        L.push(tr('My plan: be water, own the night, agree the places beforehand.'));
        break;
      case 'digital': {
        L.push(S.net === 'on' ? tr('You assume the internet stays on. It will not: in 2019 and in January 2026 the regime cut it within hours.') : tr('Expect the internet to go within the first day. In January 2026 connectivity fell below two percent.'));
        L.push(tr('The massacres happened in the dark. Every phone that records and every Starlink dish that sends it out raises the price of killing.'));
        L.push(P.offline < 0.6 ? tr('Agree the times and the places now, before the blackout. Without that, the crowds cannot find each other.') : tr('Your plan has agreed times and places. That is the one thing that works without the internet.'));
        break; }
      case 'urban':
        L.push(sq ? tf('The centre of gravity here is {s}. Whoever holds it holds the picture the world sees.', { s: siteName(sq) }) : tr('This city has no single great square; its uprising will be won district by district.'));
        if (gov) L.push(tf('The governorate is at {g}. The regime will guard it before anything else.', { g: hexName(gov.h) }));
        L.push(ents >= 4 ? tf('{n} highways lead in. Hold them and the regime cannot reinforce.', { n: N_(ents) }) : tf('Only {n} roads lead in. They are easy to block: block them.', { n: N_(ents) }));
        if (tvS) L.push(tf('The state broadcaster is here, at {t}. Taking it in Bucharest in 1989 ended the regime the same day.', { t: hexName(tvS.h) }));
        a.plan = { type: ents <= 4 ? 'roads' : (sq ? 'centre' : 'districts') };
        break;
      case 'medic':
        L.push(tr('In 2022 and 2026 the forces took the wounded from the hospitals. People died at home because they were afraid to go.'));
        L.push(P.medics < 0.6 ? tr('Your plan has few medics. Set up first aid and safe houses in every district; fewer deaths means less fear and bigger crowds tomorrow.') : tr('Your medics are ready. That keeps people coming back.'));
        L.push(tr('My plan: medics and safe houses everywhere.'));
        break;
      case 'historian':
        L.push(tr('1979 won because of months of strikes and an army that stood aside. 2009 had millions in Tehran and lost when the fear came back. 2026 was crushed in the dark in two nights.'));
        L.push(S.occasion === 'none' ? tr('Iranians rise again on the 40th day after the killings. Plan for cycles, not for one day.') : tr('You start on a day of mourning. That brings people out; plan the 40th day after it too.'));
        L.push(tr('My plan: build slowly, strike, and come back on every 40th day.'));
        break;
      case 'red': {
        const prox = S.proxies === 'none' ? tr('none') : S.proxies === 'many' ? tr('many') : tr('some');
        L.push(tf('Hour one: riot police, batons and gas. As soon as the crowds pass about {n}, the internet goes.', { n: big(BJ.pop * 0.006) }));
        L.push(tr('Then birdshot, then live fire, and if that fails, heavy machine guns from the rooftops, at night, in the dark.'));
        L.push(tf('Reinforcements on the highways within a day, foreign fighters ({p}) within two. Power cuts in the districts we raid.', { p: prox }));
        L.push(gov ? tf('We guard {g} and the broadcaster before anything else.', { g: siteName(gov) }) : tr('We guard the government buildings and the broadcaster before anything else.'));
        break; }
    }
    return L;
  }
  function renderAdv() {
    const P = D.getElementById('up-p-adv');
    P.innerHTML = `<p class="up-note">${tr('Each one reads your city and your plan. Use their plan with one tap, then press Play.')}</p><div class="up-advs">${ADV.map(a => `<button type="button" class="up-adv${advOpen === a.id ? ' on' : ''}${a.red ? ' red' : ''}" data-a="${a.id}" aria-expanded="${advOpen === a.id}"><i>${a.ic}</i><b>${tr(a.n)}</b><span>${tr(a.school)}</span></button>`).join('')}</div><div id="up-advb"></div><p class="up-src">${tr('The advisors are schools of thought built from published research, not real people speaking.')}</p>`;
    $$('.up-adv', P).forEach(b => b.addEventListener('click', () => { advOpen = advOpen === b.dataset.a ? null : b.dataset.a; renderAdv(); }));
    if (advOpen) {
      const a = ADV.find(x => x.id === advOpen), L = brief(a);
      const fs = a.f.map(findingOf).filter(Boolean);
      D.getElementById('up-advb').innerHTML = `<div class="up-advx${a.red ? ' red' : ''}"><h3><i>${a.ic}</i> ${tr(a.n)}</h3>${L.map(l => `<p>${esc(l)}</p>`).join('')}${fs.length ? `<p class="up-src">${fs.map(f => f.src ? `<a href="${esc(f.src)}" target="_blank" rel="noopener">${esc(f.c)}</a>` : esc(f.c)).join(' · ')}</p>` : ''}${a.plan ? `<button type="button" class="up-play up-use" id="up-use">${tr('Use their plan')}</button>` : `<button type="button" class="up-sec up-use" id="up-best2">${tr('Find the plan that beats this')}</button>`}</div>`;
      const ub = D.getElementById('up-use');
      if (ub) ub.addEventListener('click', () => {
        const p = a.plan, t = p.type || S.plan.type;
        if (p.type) setPlan(t);
        for (const d of U.DIALS) if (typeof p[d] === 'number') S.plan[d] = p[d];
        changed(); renderPlan(); drawIgn(); showTab('plan'); flash(tf('{a}’s plan is set. Press Play.', { a: tr(a.n) }));
      });
      const b2 = D.getElementById('up-best2'); if (b2) b2.addEventListener('click', bestPlan);
    }
  }
  function flash(t) { const el = D.createElement('div'); el.className = 'up-flash'; el.textContent = t; ui.appendChild(el); setTimeout(() => el.remove(), 2600); }

  // ================================================================== the workers: the odds, why, what it would take, the best plan
  const NW = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
  let pool = null, jobId = 0;
  const pending = new Map();
  function slimBoard() { const B = Object.assign({}, BJ); delete B.roads; delete B.parks; delete B.water; delete B.military; delete B.named; delete B._p; const H = Object.assign({}, B.hex); delete H.pts; B.hex = H; return B; }
  function makePool() {
    if (pool) for (const w of pool) w.terminate();
    pool = []; pending.clear();
    const sb = slimBoard();
    for (let i = 0; i < NW; i++) {
      let w;
      try { w = new Worker(DATA.asset + 'uprising-engine.js'); } catch (_) { pool = null; return; }
      w.onmessage = m => { const p = pending.get(m.data.id); if (!p) return; pending.delete(m.data.id); if (m.data.err) p.rej(new Error(m.data.err)); else p.res(m.data.res); };
      w.onerror = () => { };
      w.postMessage({ op: 'board', id: ++jobId, board: sb });
      pool.push(w);
    }
  }
  let rr = 0;
  function job(msg) {
    return new Promise((res, rej) => {
      const id = ++jobId; msg.id = id;
      if (!pool) { try { res(msg.op === 'batch' ? U.batch(BJ, U.withTx(BJ, msg.S), msg.n, msg.seed, msg.slim) : null); } catch (e) { rej(e); } return; }
      pending.set(id, { res, rej }); pool[rr++ % pool.length].postMessage(msg);
    });
  }
  async function batch(Sx, n, seed, slim, onp) {
    const per = Math.ceil(n / Math.max(1, (pool || [1]).length));
    const parts = [];
    for (let k = 0; k * per < n; k++) parts.push(job({ op: 'batch', S: Sx, n: Math.min(per, n - k * per), seed: seed + k * per * 7919, slim }).then(r => { if (onp) onp(); return r; }));
    const rs = await Promise.all(parts);
    const out = { n: 0, out: { liberated: 0, zones: 0, stalemate: 0, war: 0, crushed: 0 }, dead: [], arrested: [], peak: [], tEnd: [], runs: [] };
    for (const r of rs) { out.n += r.n; for (const k in r.out) out.out[k] += r.out[k]; out.dead.push(...r.dead); out.arrested.push(...r.arrested); out.peak.push(...r.peak); out.tEnd.push(...r.tEnd); out.runs.push(...r.runs); }
    out.p = out.out.liberated / Math.max(1, out.n);
    return out;
  }
  const clone = o => JSON.parse(JSON.stringify(o));
  function wilson(p, n) { const z = 1.64; const d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - h) / d), Math.min(1, (c + h) / d)]; }
  const SEED0 = 104729;
  let A = null;      // the analysis of the scenario it was run on
  function markStale() { if (A) A.stale = true; const o = D.getElementById('up-odds'); if (o && !o.hidden) tog(o, 'stale', true); }
  async function odds(withWhy) {
    const n = PHONE() ? 120 : 240;
    const myDirty = dirty;
    const Sx = clone(S);
    const oddsEl = D.getElementById('up-odds'); oddsEl.hidden = false; tog(oddsEl, 'stale', false);
    D.getElementById('up-oddsv').textContent = '…';
    const base = await batch(Sx, n, SEED0, false);
    if (myDirty !== dirty) return null;
    const ci = wilson(base.p, base.n);
    A = { S: Sx, city: cityId, base, ci, why: null, need: null, best: null };
    D.getElementById('up-oddsv').textContent = pc(base.p);
    if (withWhy) why(myDirty);
    return A;
  }
  async function why(myDirty) {
    if (!A || A.whyRun) return;
    A.whyRun = true;
    const F = U.factors(A.S), out = [];
    const n = PHONE() ? 60 : 100;
    const b = await batch(A.S, n, SEED0, true);
    for (const f of F) {
      if (myDirty !== dirty) return;
      const r = await batch(f.S, n, SEED0, true);
      out.push({ id: f.id, d: r.p - b.p, p: r.p });
      if (resOpen()) renderResults();
    }
    A.why = out.sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
    // what it would take: the share of the city this plan needs for even odds
    let lo = 0.2, hi = 25, got = null;
    for (let it = 0; it < 7; it++) {
      if (myDirty !== dirty) return;
      const mid = Math.sqrt(lo * hi);
      const r = await batch(Object.assign(clone(A.S), { turnout: mid }), PHONE() ? 40 : 70, SEED0, true);
      if (r.p >= 0.5) { hi = mid; got = mid; } else lo = mid;
    }
    A.need = got;
    if (resOpen()) renderResults();
  }
  async function bestPlan() {
    if (!BJ) return;
    openResults(true);
    const myDirty = dirty;
    const R = U.rng(7);
    const C = U.candidates(S, R);
    const n1 = PHONE() ? 24 : 40, n2 = PHONE() ? 80 : 160;
    const res = [];
    A = A && !A.stale && A.city === cityId ? A : { S: clone(S), city: cityId, base: null };
    A.best = { prog: 0, of: C.length, list: [] };
    renderResults();
    for (let i = 0; i < C.length; i++) {
      if (myDirty !== dirty) return;
      const Sx = Object.assign(clone(S), { plan: Object.assign({ ign: S.plan.ign }, C[i]) });
      const r = await batch(Sx, n1, SEED0 + 31, true);
      res.push({ plan: C[i], p: r.p });
      A.best.prog = i + 1; if (resOpen()) renderResults();
    }
    res.sort((x, y) => y.p - x.p);
    const top = [], seenT = new Set();      // the best plan, then the best of each other strategy, so the list is a real choice
    for (const r of res) { if (top.length >= 4) break; if (!seenT.has(r.plan.type)) { seenT.add(r.plan.type); top.push(r); } }
    for (const t of top) {
      if (myDirty !== dirty) return;
      const Sx = Object.assign(clone(S), { plan: Object.assign({ ign: S.plan.ign }, t.plan) });
      const r = await batch(Sx, n2, SEED0 + 77, true);
      t.p = r.p; t.dead = U.quant(r.dead, 0.5);
    }
    top.sort((x, y) => y.p - x.p);
    if (!A.base) A.base = await batch(clone(S), n2, SEED0 + 77, false);
    A.best = { prog: C.length, of: C.length, list: top, done: true };
    if (resOpen()) renderResults();
  }

  // ================================================================== the results
  const resEl = D.getElementById('up-res');
  function resOpen() { return !resEl.hidden; }
  function openResults(noRun) {
    resEl.hidden = false;
    renderResults();
    if (!noRun && (!A || A.stale || A.city !== cityId)) odds(true).then(() => { if (resOpen()) renderResults(); });
    else if (A && !A.why && !noRun) why(dirty);
  }
  function outBar(o, n) {
    return `<div class="up-obar">${U.OUTCOMES.map(k => { const v = o[k] / n; return v > 0 ? `<i class="o-${k}" style="flex:${v}" title="${esc(tr(WORD.out[k]))} ${pc(v)}"></i>` : ''; }).join('')}</div><ul class="up-oleg">${U.OUTCOMES.map(k => `<li class="o-${k}"><b>${pc(o[k] / n)}</b> ${tr(WORD.out[k])}</li>`).join('')}</ul>`;
  }
  function mechs(runs) {
    const Wn = runs.filter(r => r.o === 'liberated'), Ls = runs.filter(r => r.o !== 'liberated');
    if (Wn.length < 3 || Ls.length < 3) return [];
    const M = [
      ['Forces began to cross over', r => r.def > 50],
      ['The army stood aside or joined', r => r.army >= 2],
      ['The state broadcaster was taken', r => r.tv],
      ['The roads in were held', r => r.blk],
      ['The strike took hold', r => r.sig > 0.45],
      ['The whole country rose', r => r.nat === 'all'],
      ['The internet stayed up', r => r.net < 0],
    ];
    const out = [];
    for (const [t, fn] of M) {
      const a = Wn.filter(fn).length / Wn.length, b = Ls.filter(fn).length / Ls.length;
      out.push({ t, a, b, d: Math.abs(a - b) });
    }
    return out.sort((x, y) => y.d - x.d).slice(0, 4);
  }
  function analog() {
    const Sx = A.S;
    const turn = Sx.turnout == null ? U.autoTurnout(BJ, Sx, null) : Sx.turnout;
    const v = [Math.log(turn + 0.1), Sx.nation === 'alone' ? 0.3 : Sx.nation === 'some' ? 0.6 : 1, Sx.net === 'on' ? 1 : Sx.net === 'slow' ? 0.5 : 0.1, Sx.plan.strike, Sx.armed ? 0.2 : Sx.plan.discipline, Sx.loyalty === 'shaky' ? 0.7 : 0.1];
    let best = null, bd = 1e9;
    for (const u of DATA.iran || []) {
      const m = u.mi || {}; if (m.turnoutPctOfCityPop == null) continue;
      const w = [Math.log((+m.turnoutPctOfCityPop || 0.1) + 0.1), m.nationwide ?? 0.5, m.internet ?? 0.5, m.strike ?? 0, m.nonviolent ?? 0.7, m.defection ?? 0];
      const d = v.reduce((s, x, i) => s + (x - w[i]) ** 2 * (i === 0 ? 1.4 : 1), 0);
      if (d < bd) { bd = d; best = u; }
    }
    return best;
  }
  function renderResults() {
    const b = D.getElementById('up-res-b'), c = cityOf(cityId), name = FA ? c.fa : c.n;
    let h = `<h2 id="up-res-h">${A && A.base ? tf('{c}: the uprising, run {n} times', { c: esc(name), n: N_(A.base.n) }) : tf('{c}: the odds', { c: esc(name) })}</h2>`;
    if (RUN && dirtyRun === dirty) h += `<p class="up-thisrun o-${RUN.outcome}"><b>${tr('The run you watched')}:</b> ${tr(WORD.out[RUN.outcome])}. ${tr(WORD.outLine[RUN.outcome])} ${tf('{d} lives lost, {a} arrested.', { d: fmt(RUN.dead), a: big(RUN.arrested) })}</p>`;
    if (!A || !A.base) { h += `<div class="up-wait"><i></i>${tr('Running the uprising hundreds of times...')}</div>`; if (A && A.best) h += bestHtml(); b.innerHTML = h; wireRes(); return; }
    const B = A.base, ci = A.ci || wilson(B.p, B.n);
    h += `<div class="up-r1"><div class="up-dial-big" style="--p:${B.p}"><b>${pc(B.p)}</b><span>${tr('chance of liberating the city')}</span><em>${tf('likely between {a} and {b}', { a: pc(ci[0]), b: pc(ci[1]) })}</em></div>
      <div class="up-r1b"><h3>${tr('How the runs ended')}</h3>${outBar(B.out, B.n)}
      <h3>${tr('The cost')}</h3><p class="up-cost">${tf('Lives lost in a typical run: {m} (one in ten runs: more than {h}). Arrested: {a}.', { m: fmt(U.quant(B.dead, 0.5)), h: fmt(U.quant(B.dead, 0.9)), a: big(U.quant(B.arrested, 0.5)) })}</p></div></div>`;
    if (A.stale) h += `<p class="up-hint">${tr('You changed the scenario since this was run.')} <button type="button" class="up-link" id="up-rerun">${tr('Run it again')}</button></p>`;
    // why
    h += `<h3>${tr('Why: what moves the odds most')}</h3>`;
    if (!A.why) h += `<div class="up-wait"><i></i>${tr('Testing each factor on its own...')}</div>`;
    else {
      const mx = Math.max(0.05, ...A.why.map(x => Math.abs(x.d)));
      h += `<ul class="up-why">${A.why.slice(0, 8).map(x => `<li class="${x.d >= 0 ? 'up' : 'dn'}"><span>${tr(FACT_T[x.id] || x.id)}</span><i><b style="width:${(Math.abs(x.d) / mx * 50).toFixed(1)}%"></b></i><em>${x.d >= 0 ? '+' : '−'}${N_(Math.round(Math.abs(x.d) * 100))} ${tr('points')}</em></li>`).join('')}</ul>`;
    }
    const ms = mechs(B.runs);
    if (ms.length) h += `<h3>${tr('What the winning runs had')}</h3><ul class="up-mech">${ms.map(m => `<li><b>${tr(m.t)}</b><span>${tf('in {a} of the runs that won, {b} of the rest', { a: pc(m.a), b: pc(m.b) })}</span></li>`).join('')}</ul>`;
    if (A.need != null || A.why) h += `<h3>${tr('What it would take')}</h3><p class="up-need">${A.need != null ? tf('With this plan, even odds need about {p} of the city on the streets: {n} people at once.', { p: N_(A.need.toFixed(1)) + '%', n: big(BJ.pop * A.need / 100) }) : (A.why ? tr('With this plan no turnout up to 25% of the city reaches even odds. Change the plan.') : '')}</p>`;
    const an = analog();
    if (an) h += `<h3>${tr('Closest in history')}</h3><p class="up-an"><b>${esc(an.n)}</b> (${esc(N_((an.start || '').slice(0, 4)))}): ${esc(an.out || '')}${(an.why || []).length ? ' ' + esc(typeof an.why[0] === 'string' ? an.why[0] : (an.why[0].text || an.why[0].lesson || '')) : ''}${an.src ? ` <a href="${esc(an.src)}" target="_blank" rel="noopener">${tr('source')}</a>` : ''}</p>`;
    h += bestHtml();
    h += `<div class="up-ract"><button type="button" class="up-play" id="up-r-play">${tr('Watch a typical run')}</button>${B.out.liberated ? `<button type="button" class="up-sec" id="up-r-win">${tr('Watch a run that won')}</button>` : ''}${!A.best ? `<button type="button" class="up-sec" id="up-r-best">${tr('Find the best plan')}</button>` : ''}<button type="button" class="up-sec" id="up-r-share">${tr('Copy the link to this scenario')}</button></div>`;
    h += `<p class="up-src">${tr('A model to think with, not a forecast. Its weights come from the research on past uprisings in Iran and around the world; every finding it uses is in How it works.')}</p>`;
    b.innerHTML = h;
    wireRes();
  }
  function bestHtml() {
    if (!A || !A.best) return '';
    const Bs = A.best;
    if (!Bs.done) return `<h3>${tr('The best plan for these conditions')}</h3><div class="up-wait"><i style="--p:${Bs.prog / Bs.of}"></i>${tf('Testing plan {a} of {b}...', { a: N_(Bs.prog), b: N_(Bs.of) })}</div>`;
    const cur = A.base ? A.base.p : null;
    return `<h3>${tr('The best plan for these conditions')}</h3><ol class="up-best">${Bs.list.map((t, n) => `<li><div><b>${tr(PLAN_T[t.plan.type][0])}</b> <em>${pc(t.p)}</em>${cur != null && n === 0 ? ` <span>${t.p > cur ? tf('{d} points better than yours', { d: N_(Math.round((t.p - cur) * 100)) }) : tr('yours is as good')}</span>` : ''}</div><p>${U.DIALS.filter(d => Math.abs(t.plan[d] - U.PLANS[t.plan.type][d]) > 0.12).map(d => `${tr(DIAL_T[d][0])} ${N_(Math.round(t.plan[d] * 100))}`).join(' · ') || tr('as the strategy sets it')}</p><button type="button" class="up-sec" data-use="${n}">${tr('Use this plan')}</button></li>`).join('')}</ol>`;
  }
  function wireRes() {
    const q = id => D.getElementById(id);
    if (q('up-r-play')) q('up-r-play').addEventListener('click', () => { closeOv(resEl); play(typicalSeed()); });
    if (q('up-r-win')) q('up-r-win').addEventListener('click', () => { const r = A.base.runs.find(x => x.o === 'liberated'); closeOv(resEl); play(r ? r.seed : SEED0); });
    if (q('up-r-best')) q('up-r-best').addEventListener('click', bestPlan);
    if (q('up-rerun')) q('up-rerun').addEventListener('click', () => { odds(true).then(renderResults); renderResults(); });
    if (q('up-r-share')) q('up-r-share').addEventListener('click', ev => { const u = location.origin + addr(); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => { ev.target.textContent = tr('Copied'); }, () => { prompt2(u); }); });
    $$('[data-use]', resEl).forEach(bb => bb.addEventListener('click', () => {
      const t = A.best.list[+bb.dataset.use];
      S.plan = Object.assign({ ign: S.plan.ign }, t.plan); changed(); renderPlan(); drawIgn(); closeOv(resEl); showTab('plan'); flash(tr('The plan is set. Press Play.'));
    }));
  }
  function prompt2(u) { const ta = D.createElement('textarea'); ta.value = u; ta.className = 'up-copy'; resEl.querySelector('.up-ov-in').appendChild(ta); ta.select(); }
  function typicalSeed() {
    if (!A || !A.base || !A.base.runs.length) return SEED0;
    const o = A.base.out; let mode = 'crushed', mv = -1; for (const k of U.OUTCOMES) if (o[k] > mv) { mv = o[k]; mode = k; }
    const rs = A.base.runs.filter(r => r.o === mode).sort((a, b) => a.dead - b.dead);
    return rs.length ? rs[Math.floor(rs.length / 2)].seed : SEED0;
  }

  // ================================================================== the city picker
  const pickEl = D.getElementById('up-pick');
  function openPick() {
    pickEl.hidden = false;
    const L = ALLC.slice().sort((a, b) => (b.pop || 0) - (a.pop || 0));
    const map = DATA.map;
    D.getElementById('up-map').innerHTML = map ? `<svg viewBox="${map.vb}" role="img" aria-label="${tr('Map of Iran')}"><path class="up-ir" d="${map.d}"/>${L.map(c => c.xy ? `<g class="up-mc${c.id === cityId ? ' on' : ''}${c.ready === false ? ' soon' : ''}"${c.ready === false ? '' : ` data-c="${c.id}"`} tabindex="-1"><circle cx="${c.xy[0]}" cy="${c.xy[1]}" r="${(4 + Math.sqrt((c.pop || 2e5) / 1e6) * 6).toFixed(1)}"/><text x="${c.xy[0]}" y="${(c.xy[1] - 9).toFixed(1)}">${esc(FA ? c.fa : c.n)}</text></g>` : '').join('')}</svg>` : '';
    D.getElementById('up-clist').innerHTML = L.map(c => c.ready === false
      ? `<div class="up-ci soon"><b>${esc(FA ? c.fa : c.n)}</b><span>${tr('Its streets are being mapped. Coming soon.')}</span><em>${big(c.pop)}</em></div>`
      : `<button type="button" class="up-ci${c.id === cityId ? ' on' : ''}" data-c="${c.id}"><b>${esc(FA ? c.fa : c.n)}</b><span>${esc(FA ? c.n : c.fa)}</span><em>${big(c.pop)}</em><i style="--g:${c.g == null ? 0.5 : c.g}"></i></button>`).join('');
    $$('[data-c]', pickEl).forEach(b => b.addEventListener('click', () => { closeOv(pickEl); if (b.dataset.c !== cityId) switchCity(b.dataset.c); }));
    const on = $('.up-ci.on', pickEl); if (on) on.focus();
  }
  function closeOv(el) { el.hidden = true; }
  $$('.up-ov').forEach(o => { o.addEventListener('click', ev => { if (ev.target === o || ev.target.closest('[data-close]')) closeOv(o); }); });
  D.addEventListener('keydown', ev => { if (ev.key === 'Escape') $$('.up-ov').forEach(o => { if (!o.hidden) closeOv(o); }); });

  // ================================================================== How it works
  D.getElementById('up-howb').addEventListener('click', () => {
    const F = (DATA.findings || []).slice(0, 30);
    D.getElementById('up-how-b').innerHTML = `<h2 id="up-how-h">${tr('How it works')}</h2>
      <ol class="up-howl"><li>${tr('Pick a city. Its board is built from its real streets, every avenue and alley, from OpenStreetMap: each district knows its people, its roads, its mosques (where the Basij bases sit), its police stations and barracks, and the places that matter.')}</li>
      <li>${tr('Set the conditions, or let the model decide each one. When it decides, it draws from what happened before, so every run is a little different.')}</li>
      <li>${tr('Choose a strategy, ask the advisors, place your starting points on the map, and press Play.')}</li>
      <li>${tr('Every hour: people come out where the uprising has reached and where they are angry, and go home where they are afraid. Crowds move along the roads toward the plan’s targets or scatter into the alleys. The regime guards what matters, breaks the biggest crowds and escalates, faster in the dark. Where crowds outnumber the forces, a district turns. Under numbers, strikes and discipline the forces lose their cohesion, and units cross over.')}</li>
      <li>${tr('The odds come from running the same scenario hundreds of times. Why comes from changing one thing at a time and running it again.')}</li></ol>
      <p class="up-hint">${tr('Controls: drag to move, pinch or scroll to zoom, two fingers or the right button to turn and tilt. Tap a district during a run to see it.')}</p>
      <h3>${tr('The research it stands on')}</h3><ul class="up-fnd">${F.map(f => `<li>${esc(f.c)}${f.src ? ` <a href="${esc(f.src)}" target="_blank" rel="noopener">${tr('source')}</a>` : ''}</li>`).join('')}</ul>
      <p class="up-src">${tr('Streets © OpenStreetMap contributors. A model to think with, not a forecast, and not instructions.')}</p>`;
    D.getElementById('up-how').hidden = false;
  });

  // ================================================================== the buttons
  D.getElementById('up-play').addEventListener('click', async () => {
    const seed = (SEED0 + (dirty * 2654435761 >>> 0)) >>> 0;
    play(seed);
    odds(true).catch(() => { });
  });
  D.getElementById('up-oddsgo').addEventListener('click', () => openResults());
  D.getElementById('up-bestgo').addEventListener('click', bestPlan);
  D.getElementById('up-oddsb').addEventListener('click', () => openResults());
  D.getElementById('up-resb').addEventListener('click', () => openResults());

  async function switchCity(id) {
    stopPlay(); RUN = null; bar.hidden = true; tog(box, 'running', false); A = null; D.getElementById('up-odds').hidden = true; feedReset();
    feedl.innerHTML = `<li class="up-ev0">${tr('Set the conditions, choose a strategy, and press Play.')}</li>`;
    cityId = id; S.plan.ign = null;
    BJ = await loadBoard(id);
    buildWorld(BJ); makePool();
    renderCity(); renderCond(); renderPlan(); renderAdv(); hudIdle();
    saveAddr();
    tog(D.getElementById('up-boot'), 'off', true);
  }
  await switchCity(cityId);
  requestAnimationFrame(frame);
  if (['city', 'cond', 'plan', 'adv'].includes(qs.get('tab'))) showTab(qs.get('tab'));
  if (qs.get('adv')) { advOpen = qs.get('adv'); renderAdv(); }
  if (qs.get('res')) openResults();
  if (qs.get('play')) {      // a shared "watch" link plays at once; ?at=<hour> stops it there
    D.getElementById('up-play').click();
    const at = parseInt(qs.get('at'), 10);
    if (at > 0 && RUN) { tPos = Math.min(at, RUN.rec.c.length - 1); playing = false; setPP(); }
  }
  W.UPRPAGE = { get S() { return S; }, get PTS() { return PTS; }, get PS() { return PS; }, get cam() { return cam; }, get A() { return A; }, get RUN() { return RUN; }, play, odds, bestPlan, switchCity, openResults, tick: dt => { clock += dt; playTick(dt); } };      // for the phone test
}
