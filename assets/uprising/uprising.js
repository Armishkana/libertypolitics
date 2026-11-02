/* THE UPRISING SIMULATOR'S PAGE (libertypolitics.com uprising/, iranuncensored.com <lang>/uprising/; rebuilt 1 November 2026).
   The plan, the data and the words: build/uprising.py's docstring. The model: uprising-engine.js (here and in the Web Workers).
   The 3D kit: build/simkit/SIMKIT.md (city.js draws the buildings, the regime's places with their emblems, people, forces and
   vehicles; fx.js the tear gas, gunfire, fire and smoke). His brief and the design: TOOLS.md, "The second rebuild".

   THE PARTS
     board     the city in 3D: its real streets and the buildings OpenStreetMap maps (procedural blocks of the right Iranian forms
               elsewhere), its landmarks as their models, the regime's places as their kit models with their emblems (OSM where
               mapped, "typical placement" where not), checkpoints at the junctions that matter; crowds and squads as moving
               figures; tear gas, gunfire, burning barricades, shuttered shops, night with phone lights and rooftop chants
     modes     "An advisor leads" (pick an advisor, hear the brief, use the plan) and "I command" (start districts, gathering
               points and times, drawn routes, the strike by sector, the tools, the conditions); the odds update as you choose
     watch     one run hour by hour, the camera following the action, captions saying what happens and why, speed and scrub
     compare   up to four plans run in the workers side by side, a goal picker, the best plan marked
   The scenario and the compared plans ride in the address (?city=&s=&c=), so a link opens exactly what was built.
   LOADED ON ENTRY (1 November 2026): the page opens on the Now view (uprising-now.js), which imports this file and calls
   start({ city }) only when a city is entered or the address asks for Simulate; three.js comes with it, not before.
   Never classList.toggle(name, state): tog(el, name, state) (uprising.py stops the build on the first). No browser dialogs. */
const D = document, W = window;
const box = D.getElementById('uprising'), src = D.getElementById('up-data');
let started = null, leaving = false, pageErr = 0;
W.addEventListener('error', () => { pageErr++; }); W.addEventListener('unhandledrejection', () => { pageErr++; });      // counted by streetCheck
W.addEventListener('pagehide', () => { leaving = true; });      // a board still loading when the reader leaves is not an error
export function start(opts) {
  if (!started) started = run(opts || {}).catch(err => { if (leaving) return; const t = D.getElementById('up-boot-t'); if (t) t.textContent = (box.getAttribute('lang') === 'fa') ? 'بارگذاری شبیه‌ساز به مشکل خورد. صفحه رو دوباره باز کنید.' : 'Something went wrong loading the simulator. Reload the page to try again.'; console.error(err); });
  return started;
}

async function run(opts) {
  const THREE = await import('./three.module.min.js');
  const DATA = JSON.parse(src.textContent);
  const FA = DATA.lang === 'fa', IU = DATA.site === 'iu';
  const TR = DATA.S || {};
  const tr = s => (Object.prototype.hasOwnProperty.call(TR, s) ? TR[s] : s);
  const tf = (s, o) => tr(s).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] != null ? o[k] : m));
  const N_ = s => (FA ? String(s).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'.charAt(+d)).replace(/%/g, '٪') : String(s));
  const fmt = n => { n = Math.round(n || 0); return FA ? n.toLocaleString('fa-IR') : n.toLocaleString('en-US'); };
  const big = n => { n = Math.round(n || 0); if (n >= 1e6) return N_((Math.round(n / 1e5) / 10) + (FA ? ' میلیون' : 'M')); if (n >= 1e4) return N_(Math.round(n / 1e3) + (FA ? ' هزار' : 'k')); return fmt(n); };
  const pc = x => N_(Math.round((x || 0) * 100) + '%');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r) => (r || D).querySelector(s), $$ = (s, r) => Array.from((r || D).querySelectorAll(s));
  const tog = (el, c, on) => { if (el) { if (on) el.classList.add(c); else el.classList.remove(c); } };
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const REDUCED = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ONE BREAKPOINT for the phone, the same in uprising-now.js and uprising.css (max-width 759.98px): 760
  const BP = 760, PHONE = () => W.innerWidth < BP;
  const LOWP = PHONE() || (navigator.hardwareConcurrency || 4) <= 4;
  // the phone level of detail (the phone breakpoint): fewer figures, merged plain blocks, the main places only, no shadows;
  // the budget is about 200,000 triangles and 80 draw calls (?debug=1 prints both; the phone test asserts them)
  const LOD2 = PHONE();
  const SIMV = () => box.dataset.view !== 'now';      // the Now view is on top: the board sleeps
  const bootT = D.getElementById('up-boot-t');
  const ext = (href, txt) => `<a href="${esc(href)}" target="_blank" rel="noopener">${txt}</a>`;

  await import('./uprising-engine.js');
  const U = W.UPR;
  if (!U) throw new Error('engine missing');
  let KITM = null, STM = null;
  try { STM = await import('./uprising-street.js'); } catch (e) { console.warn('Uprising Simulator: the street movement did not load', e); }
  try { KITM = await import('./simkit/simkit.js'); } catch (e) { console.warn('Uprising Simulator: the 3D kit did not load; drawing without it', e); }

  // ================================================================== the words
  const WORD = {
    out: { liberated: 'Liberated', army: 'The army takes over', zones: 'Districts held', stalemate: 'Unfinished', war: 'Civil war', crushed: 'Crushed' },
    outLine: {
      liberated: 'The people hold the city: the governorate and the places that matter are theirs and the forces are gone or have crossed over.',
      army: 'The regime falls in the city, but the army holds power, as in Sudan in 2019 or Madagascar in 2025.',
      zones: 'The people hold whole districts around the clock, but the regime keeps the centre.',
      stalemate: 'Protests or the strike go on, but the regime keeps the city. The question is the next cycle.',
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
    night: ['Own the night', 'Rooftop chants and alley protests after dark, in small groups.', 'Iran 2009 · Iran 2022'],
    armed: ['Armed defence', 'Armed groups guard the crowds and hit the posts.', 'Syria 2011 · Libya 2011 · Myanmar 2021'],
  };
  const PLAN_ICON = { centre: '◎', districts: '⬢', water: '≈', strike: '⏸', soldiers: '✋', roads: '⛌', voice: '📡', night: '☾', armed: '⚑' };
  const TOOL_T = {
    medics: ['Medics and safe houses', 'Care for the wounded away from the hospitals the forces raid (2026).', '✚'],
    blockade: ['Barricades', 'Hold a district and slow the vans. They also invite heavier weapons.', '⛌'],
    fraternize: ['Defection appeals', 'Talk to conscripts and their families; a safe exit for officers. Works only once they think the regime is falling.', '✋'],
    abroad: ['Calls from abroad', 'Satellite TV and radio carry a fixed hour into homes with no internet. How much it helped in 2026 was never measured.', '📺'],
    film: ['Film it and send it out', 'Raises the price of killing if it gets out. People were arrested for filming in 2026.', '🎥'],
    discipline: ['Nonviolent discipline', 'No stones, no fires, no weapons. Every stone is a video the regime shows its own men.', '🕊'],
    offline: ['Agreed times and places', 'A plan everyone knows before the internet goes: the one thing that works in a blackout.', '🗓'],
    night: ['Act at night', 'Small groups and rooftop chants after dark. Big marches after dark, in a blackout, were the deadliest.', '☾'],
    conv: ['Converge on the targets', 'Low: stay spread out. High: everyone heads for the same places.', '◎'],
    pace: ['All at once', 'Low: build over days. High: everyone on day one.', '⏩'],
    voice: ['Take the broadcaster', 'How much the plan bets on the state TV centre.', '📡'],
  };
  const SEC_T = {
    bazaar: ['The bazaar', 'The starting gun: legitimacy, money, the heart of trade shut. On its own it does not stop the state.', '🏪'],
    truck: ['Truckers and transport', 'Slows the regime’s reinforcements and supplies (the truckers’ strike of May 2025 began in Bandar Abbas).', '🚚'],
    oil: ['Oil, gas and petrochemicals', 'The only strike that cuts the regime’s money. Slow: in 1978 it took weeks to bite and months to finish.', '🛢'],
    civil: ['Teachers and civil servants', 'Paralyses the state where it stands.', '🏫'],
  };
  const SITE_T = { gov: 'Governorate', tv: 'State TV and radio', police: 'Central police station', square: 'Main square', prison: 'Prison', airport: 'Airport', garrison: 'Barracks',
    sq2: 'Square', uni: 'University', bazaar: 'Bazaar', industry: 'Refinery or plant', power: 'Power station', shrine: 'Shrine', hospital: 'Hospital', mosalla: 'Friday prayer ground', terminal: 'Bus terminal', stadium: 'Stadium' };
  const SITE_ICON = { gov: '🏛', tv: '📡', police: '⛨', square: '◎', prison: '⛓', airport: '✈', garrison: '⛫', sq2: '○', uni: '🎓', bazaar: '⌂', industry: '⚙', power: 'ϟ', shrine: '۞', hospital: '✚', mosalla: '◠', terminal: '⇄', stadium: '◍' };
  const SEC_K = {      // the regime's places on the board: name, kit model, emblem, who runs it
    irgc_hq: ['IRGC base', 'irgc_base', 'irgc', 'IRGC'], basij: ['Basij base', 'basij_base', 'basij', 'IRGC'],
    special_police: ['Police special units base', 'faraja_station', 'faraja', 'FARAJA'], police_hq: ['Police command', 'faraja_station', 'faraja', 'FARAJA'],
    police_station: ['Police station', 'faraja_station', 'faraja', 'FARAJA'], artesh: ['Army base', 'artesh_barracks', 'artesh', 'Artesh'],
    intelligence: ['Intelligence office', 'govt', null, 'MOIS'], checkpoint: ['Checkpoint', 'checkpoint', 'faraja', 'FARAJA'],
    military_unknown: ['Military compound (whose is not mapped)', 'artesh_barracks', null, 'unknown'],
  };
  const AFF_T = { IRGC: 'Islamic Revolutionary Guard Corps (Sepah)', Basij: 'Basij (under the IRGC)', FARAJA: 'Police (Niru-ye Entezami, FARAJA)', Artesh: 'Army (Artesh)', MOIS: 'Ministry of Intelligence', force: 'The forces’ own intelligence', unknown: 'Not known from the map' };
  const AFF_C = { IRGC: '#5f7a3a', Basij: '#3f6b35', FARAJA: '#1f8a5a', Artesh: '#8a7f4a', MOIS: '#5a5f6b', force: '#5a5f6b', unknown: '#7a7a7a' };
  const FACT_T = {
    'turnout-up': 'Twice as many people on the streets', 'turnout-down': 'Half as many people on the streets',
    'net-on': 'The internet stays on', 'net-off': 'The internet is cut from the start',
    'nation-all': 'The whole country rises at once', 'nation-alone': 'This city rises alone',
    armed: 'People carry 5,000 guns and 50 drones', unarmed: 'Nobody carries a weapon',
    oil: 'Oil and gas workers strike', nooil: 'No oil strike',
    strike: 'A general strike in every sector', nostrike: 'No strike',
    frat: 'Appeals to the soldiers, with strict nonviolence', nofrat: 'No outreach to the soldiers',
    block: 'Barricade the roads into the city', noblock: 'Leave the roads in open',
    offline: 'Times and places agreed in advance', nooffline: 'No plan agreed in advance',
    'proxies-none': 'No foreign fighters', 'proxies-many': 'Many foreign fighters brought in',
    'loyal-shaky': 'Forces that are shaky', 'loyal-firm': 'Forces that are rock solid',
    long: 'Keep it going for eight weeks', short: 'Two weeks only',
  };
  const GOALS = {
    fall: ['The regime falls', r => (r.out.liberated + r.out.army) / r.n, 'up'],
    hold: ['Districts held or better', r => (r.out.liberated + r.out.army + r.out.zones) / r.n, 'up'],
    alive: ['Still standing at the end', r => 1 - r.out.crushed / r.n, 'up'],
    lives: ['Fewest lives lost', r => U.quant(r.dead, 0.5), 'down'],
  };

  // ================================================================== the scenario
  const DEF = { turnout: null, nation: 'auto', net: 'auto', power: 'auto', starlink: null, armed: false, guns: 2000, drones: 20, proxies: 'auto', loyalty: 'auto', outside: 'auto', occasion: 'none', hour: 17, days: 14, year: 2026,
    plan: Object.assign({ type: 'centre', ign: null, gather: [], routes: [], sec: null, adv: null }, U.PLANS.centre) };
  const clone = o => JSON.parse(JSON.stringify(o));
  let S = clone(DEF);
  const ALLC = DATA.cities || [], cities = ALLC.filter(c => c.ready !== false);
  if (!cities.length) { if (bootT) bootT.textContent = tr('No city is ready yet.'); return; }
  let cityId = opts.city && cities.some(c => c.id === opts.city) ? opts.city : 'tehran', mode = 'adv';
  const qs = new URLSearchParams(location.search);
  if (qs.get('city') && cities.some(c => c.id === qs.get('city'))) cityId = qs.get('city');
  else if (!cities.some(c => c.id === cityId)) cityId = cities[0].id;
  const b64d = t => JSON.parse(decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/')))));
  const b64e = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  function mergeS(o) {
    const s = clone(DEF);
    for (const k of Object.keys(DEF)) if (k !== 'plan' && o[k] !== undefined) s[k] = o[k];
    const p = o.plan || {};
    if (U.PLANS[p.type]) s.plan = Object.assign({ type: p.type, ign: null, gather: [], routes: [], sec: null, adv: null }, U.PLANS[p.type]);
    for (const d of U.DIALS) if (typeof p[d] === 'number') s.plan[d] = clamp(p[d], 0, 1);
    const ints = a => (Array.isArray(a) ? a.filter(n => Number.isInteger(n)).slice(0, 40) : null);
    if (Array.isArray(p.ign)) s.plan.ign = ints(p.ign).slice(0, 12);
    if (Array.isArray(p.gather)) s.plan.gather = p.gather.filter(g => g && Number.isInteger(g.h)).slice(0, 8).map(g => ({ h: g.h, t: clamp(+g.t || 0, 0, 56 * 24) }));
    if (Array.isArray(p.routes)) s.plan.routes = p.routes.map(ints).filter(r => r && r.length >= 2).slice(0, 6);
    if (p.sec && typeof p.sec === 'object') { s.plan.sec = {}; for (const k of U.SECTORS) s.plan.sec[k] = clamp(+p.sec[k] || 0, 0, 1); }
    if (typeof p.adv === 'string') s.plan.adv = p.adv;
    if (s.plan.type === 'armed' && !s.armed) s.plan = Object.assign({ type: 'centre', ign: null, gather: [], routes: [], sec: null, adv: null }, U.PLANS.centre);
    s.days = [14, 28, 56].includes(+s.days) ? +s.days : 14;
    return s;
  }
  try { if (qs.get('s')) S = mergeS(b64d(qs.get('s'))); } catch (_) { }
  let CMP = [];      // the plans set side by side: { name, S, adv }
  try { if (qs.get('c')) CMP = b64d(qs.get('c')).slice(0, 4).map(x => ({ name: String(x.name || '').slice(0, 40), S: mergeS(x.S || {}), adv: x.adv || null })); } catch (_) { }
  if (qs.get('mode') === 'cmd' || (qs.get('s') && !S.plan.adv)) mode = 'cmd';
  function addr() {
    return location.pathname + '?city=' + cityId + '&s=' + b64e(S) + (CMP.length ? '&c=' + b64e(CMP.map(x => ({ name: x.name, S: x.S, adv: x.adv }))) : '') + (mode === 'cmd' ? '&mode=cmd' : '') + (D.documentElement.classList.contains('lp-stream') ? '&stream=1' : '');
  }
  function saveAddr() { if (!SIMV()) return; try { history.replaceState(null, '', addr()); } catch (_) { } }
  let dirty = 0;
  function changed() { dirty++; saveAddr(); oddsSoon(); drawPlanMarks(); if (RUN) markRunStale(); }
  function cityOf(id) { return cities.find(c => c.id === id) || cities[0]; }

  // ================================================================== the DOM
  const svgI = d => `<svg class="up-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICO = { cmp: svgI('<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0Zm14 0-3 7a3 3 0 0 0 6 0Z"/>'), share: svgI('<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14"/>'),
    model: svgI('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>'), add: svgI('<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0Zm14 0-3 7a3 3 0 0 0 6 0Z"/>') };
  const ui = D.getElementById('up-ui'), stage = D.getElementById('up-stage'), canvas = D.getElementById('up-gl'), labels = D.getElementById('up-labels');
  const top = $('.up-top', ui);
  top.insertAdjacentHTML('beforeend', `
<button type="button" class="up-cityn" id="up-pickb" aria-haspopup="dialog"><span class="up-cn" id="up-cn"></span><span class="up-cf" id="up-cf"></span><span class="up-chev" aria-hidden="true">▾</span></button>
<div class="up-modes" id="up-modes" role="tablist" aria-label="${tr('How you play')}"><button type="button" role="tab" id="up-mode-adv" data-mode="adv">${tr('An advisor leads')}</button><button type="button" role="tab" id="up-mode-cmd" data-mode="cmd">${tr('I command')}</button></div>
<div class="up-acts"><button type="button" class="up-ib" id="up-cmpb" aria-haspopup="dialog">${ICO.cmp}<span>${tr('Compare')}</span> <em id="up-cmpn"></em></button><button type="button" class="up-ib" id="up-share">${ICO.share}<span>${tr('Share')}</span></button><button type="button" class="up-ib" id="up-howb" aria-haspopup="dialog">${ICO.model}<span>${tr('The model')}</span></button></div>`);
  ui.insertAdjacentHTML('beforeend', `
<div class="up-hud" id="up-hud" aria-live="off">
  <div class="up-clock"><b id="up-day"></b><span id="up-hour"></span></div>
  <div class="up-bal"><span>${tr('People')}</span><i><b id="up-balb"></b></i><span>${tr('Regime')}</span></div>
  <div class="up-stats">
    <div><span>${tr('On the streets')}</span><b id="up-hc">0</b></div>
    <div><span>${tr('Forces')}</span><b id="up-hf">0</b></div>
    <div><span>${tr('Crossed over')}</span><b id="up-hd">0</b></div>
    <div><span>${tr('Arrested')}</span><b id="up-ha">0</b></div>
    <div class="up-dead"><span>${tr('Lives lost')}</span><b id="up-hk">0</b></div>
  </div>
  <div class="up-flags"><span class="up-fl" id="up-fnet"><i>📶</i><em></em></span><span class="up-fl" id="up-fpow"><i>💡</i><em></em></span><span class="up-fl" id="up-flv"><i>⚠</i><em></em></span><span class="up-fl" id="up-fstr"><i>⏸</i><em></em></span></div>
  <ol class="up-objs" id="up-objs" aria-label="${tr('Objectives')}"></ol>
  <p class="up-hcost" id="up-hcost"></p>
</div>
<aside class="up-panel" id="up-panel" aria-label="${tr('Your plan')}">
  <button type="button" class="up-grab" id="up-grab" aria-label="${tr('Show or hide the plan')}"><i></i></button>
  <div class="up-pane" id="up-adv-pane"></div>
  <div class="up-pane" id="up-cmd-pane" hidden>
    <nav class="up-tabs" role="tablist">${[['start', 'Start', '⌖'], ['moves', 'Moves', '➜'], ['strike', 'Strike', '⏸'], ['tools', 'Tools', '✚'], ['cond', 'Conditions', '☰']].map(([id, t, ic], n) => `<button type="button" role="tab" class="up-tab${n === 0 ? ' on' : ''}" data-tab="${id}" aria-selected="${n === 0}"><i>${ic}</i><span>${tr(t)}</span></button>`).join('')}</nav>
    <div class="up-tp" id="up-p-start" role="tabpanel"></div><div class="up-tp" id="up-p-moves" role="tabpanel" hidden></div><div class="up-tp" id="up-p-strike" role="tabpanel" hidden></div><div class="up-tp" id="up-p-tools" role="tabpanel" hidden></div><div class="up-tp" id="up-p-cond" role="tabpanel" hidden></div>
  </div>
  <div class="up-odds" id="up-odds" aria-live="polite"></div>
  <div class="up-go"><button type="button" class="up-play" id="up-watch"><i>▶</i><span>${tr('Watch it play out')}</span></button><button type="button" class="up-sec up-bestb" id="up-bestb"><i aria-hidden="true">🏆</i> <span>${tr('Best plan')}</span></button><button type="button" class="up-sec up-ic" id="up-addcmp" aria-label="${tr('Add to compare')}" title="${tr('Add to compare')}">${ICO.add}<span>+</span></button></div>
</aside>
<aside class="up-feed" id="up-feed" aria-label="${tr('What is happening')}" hidden><h2>${tr('What is happening')}</h2><ol id="up-feedl"></ol></aside>
<div class="up-cap" id="up-cap" hidden aria-live="polite"></div>
<div class="up-bar" id="up-bar" hidden>
  <button type="button" class="up-pp" id="up-pp" aria-label="${tr('Pause')}">❚❚</button>
  <div class="up-spd" role="group" aria-label="${tr('Speed')}" title="${tr('1× is one hour every two seconds')}">${[0.5, 1, 2, 4].map(v => `<button type="button" data-spd="${v}"${v === 1 ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"'}>${v === 0.5 ? '½' : N_(v)}×</button>`).join('')}</div><span class="up-pace" id="up-pace" hidden></span>
  <div class="up-scrubw"><input type="range" class="up-scrub" id="up-scrub" min="0" max="1" step="1" value="0" aria-label="${tr('Timeline')}"><div class="up-marks" id="up-marks" aria-hidden="true"></div></div>
  <button type="button" class="up-ib" id="up-follow" aria-pressed="true">🎥 <span>${tr('Follow')}</span></button>
  <button type="button" class="up-ib" id="up-resb">${tr('Results')}</button>
  <button type="button" class="up-ib" id="up-back">✕ <span>${tr('Back to the plan')}</span></button>
</div>
<div class="up-legend" id="up-legend"></div>
<div class="up-camc" id="up-camc" role="group" aria-label="${tr('Camera')}"><button type="button" id="up-cz-in" aria-label="${tr('Zoom in')}">+</button><button type="button" id="up-cz-out" aria-label="${tr('Zoom out')}">−</button><button type="button" id="up-cr-l" aria-label="${tr('Turn left')}">⟲</button><button type="button" id="up-cr-r" aria-label="${tr('Turn right')}">⟳</button><button type="button" id="up-chome" aria-label="${tr('Reset the view')}">⌂</button></div>
<div class="up-toolhint" id="up-toolhint" hidden><span id="up-toolhint-t"></span><button type="button" class="up-sec" id="up-tooldone">${tr('Done')}</button></div>
<div class="up-insp" id="up-insp" hidden></div>
<div class="up-tip" id="up-tip" hidden></div>
<div class="up-ov" id="up-res" hidden role="dialog" aria-modal="true" aria-labelledby="up-res-h"><div class="up-ov-in"><button type="button" class="up-x" data-close aria-label="${tr('Close')}">✕</button><div id="up-res-b"></div></div></div>
<div class="up-ov" id="up-best" hidden role="dialog" aria-modal="true" aria-labelledby="up-best-h"><div class="up-ov-in up-cmp-in"><button type="button" class="up-x" data-close aria-label="${tr('Close')}">✕</button><div id="up-best-b"></div></div></div>
<div class="up-ov" id="up-cmp" hidden role="dialog" aria-modal="true" aria-labelledby="up-cmp-h"><div class="up-ov-in up-cmp-in"><button type="button" class="up-x" data-close aria-label="${tr('Close')}">✕</button><div id="up-cmp-b"></div></div></div>
<div class="up-ov" id="up-pick" hidden role="dialog" aria-modal="true" aria-labelledby="up-pick-h"><div class="up-ov-in up-pick-in"><button type="button" class="up-x" data-close aria-label="${tr('Close')}">✕</button><h2 id="up-pick-h">${tr('Pick your city')}</h2><div class="up-pick-g"><div class="up-map" id="up-map"></div><div class="up-clist" id="up-clist"></div></div></div></div>
<div class="up-ov" id="up-how" hidden role="dialog" aria-modal="true" aria-labelledby="up-how-h"><div class="up-ov-in"><button type="button" class="up-x" data-close aria-label="${tr('Close')}">✕</button><div id="up-how-b"></div></div></div>`);

  // ================================================================== the board: load a city
  let BJ = null, BLD = null;
  async function loadBoard(id) {
    if (bootT) bootT.textContent = tf('Loading the streets of {c}...', { c: FA ? cityOf(id).fa : cityOf(id).n });
    tog(D.getElementById('up-boot'), 'off', false);
    const r = await fetch(DATA.asset + 'b/' + id + '.json', { cache: 'force-cache' });
    if (!r.ok) throw new Error('board ' + id + ' ' + r.status);
    return r.json();
  }

  // ================================================================== three.js and the kit
  // ?shot=1 keeps the last frame in the buffer, for the screenshot checks in a software-rendered headless browser
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOWP, powerPreference: 'high-performance', alpha: false, preserveDrawingBuffer: /[?&]shot=1/.test(location.search) });
  renderer.setPixelRatio(Math.min(W.devicePixelRatio || 1, LOWP ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;      // calm, not glaring (2 November 2026)
  renderer.setClearColor(0x111418, 1);
  canvas.addEventListener('webglcontextlost', ev => { ev.preventDefault(); console.warn('Uprising Simulator: the WebGL context was lost'); });
  canvas.addEventListener('webglcontextrestored', () => { if (BJ) buildWorld(BJ); });
  // THE COLOURS, ONE MEANING EACH (2 November 2026; the log: data/uprising/visual-rebuild-2026-11-02.md). A calm dark clay
  // city; amber is the people (and anyone who crossed over to them), red the regime's forces, white the medics, quiet grey
  // the traffic and everything neutral, and one accent, ice blue, for what is happening now. Nothing else carries a colour.
  const COLS = { people: [0.96, 0.72, 0.26], regime: [0.92, 0.27, 0.30], medic: [0.93, 0.95, 0.97], traffic: 0x8d939b, carGreys: [0x9ea4aa, 0x7c828a, 0xb6babe, 0x60666d, 0xcfd2d5, 0x8a8f95], accent: 0x8fdcff,
    bg: 0x111418, bgNight: 0x07090c };
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(COLS.bg, 0.00004);
  const camera = new THREE.PerspectiveCamera(40, 1, 5, 200000);
  const world = new THREE.Group(); scene.add(world);
  let K = null, FX = null, LIGHTS = null;
  if (KITM && KITM.createKit) { try { K = KITM.createKit(THREE); } catch (e) { K = null; console.warn('Uprising Simulator: the kit failed to start', e); } }
  if (K) { LIGHTS = K.lights(scene, { hemi: 1.15, sunI: 2.2, sky: 0xcfdcff, ground: 0x2a2e35 }); FX = K.fx(scene, camera, { scale: 1, max: LOWP ? 2200 : 5000 }); }
  else { const h = new THREE.HemisphereLight(0xcfdcff, 0x4a3f30, 1.2), sn = new THREE.DirectionalLight(0xfff1dc, 2); sn.position.set(-550, 1000, 350); scene.add(h, sn); LIGHTS = { hemi: h, sun: sn }; }
  const has = t => !!(K && K.has && K.has(t));
  const make = (t, o) => { if (!has(t)) return null; try { const m = K.make(t, o || {}); m.traverse(x => { x.userData.shared = true; }); return m; } catch (e) { return null; } };      // kit geometry is cached and shared: never disposed here
  const EMB = {};      // the four emblems as images for the page (drawn by city.js; a coloured disc when the kit is missing)
  for (const id of ['irgc', 'basij', 'faraja', 'artesh', 'lion-sun']) {
    try { const tx = K && K.emblem(id, 128); EMB[id] = tx && tx.image && tx.image.toDataURL ? tx.image.toDataURL() : null; EMB[id + '_tx'] = tx; } catch (_) { EMB[id] = null; }
  }
  const embImg = (id, cls) => EMB[id] ? `<img class="${cls || 'up-emb'}" src="${EMB[id]}" alt="">` : `<i class="${cls || 'up-emb'} up-emb-f" style="background:${({ irgc: AFF_C.IRGC, basij: AFF_C.Basij, faraja: AFF_C.FARAJA, artesh: AFF_C.Artesh })[id] || '#777'}"></i>`;

  const HEXW = 512;
  const hexData = new Uint8Array(HEXW * 4);
  const hexTex = new THREE.DataTexture(hexData, HEXW, 1, THREE.RGBAFormat);
  hexTex.magFilter = THREE.NearestFilter; hexTex.minFilter = THREE.NearestFilter; hexTex.needsUpdate = true;
  const U_ = { tHex: { value: hexTex }, uTime: { value: 0 }, uNight: { value: 0 }, uHexW: { value: HEXW } };
  // streets: lit by who holds the district (gold the people, red the regime), dark where the power is cut
  const roadVS = `attribute float hx; attribute float tier; uniform sampler2D tHex; uniform float uTime; uniform float uNight; uniform float uHexW; varying vec3 vC; varying float vA;
    void main() { vec4 st = texture2D(tHex, vec2((hx + 0.5) / uHexW, 0.5)); float ppl = st.r, pw = st.b;
      vec3 day = tier < 0.5 ? vec3(0.40, 0.41, 0.43) : tier < 1.5 ? vec3(0.33, 0.34, 0.36) : tier < 2.5 ? vec3(0.25, 0.26, 0.28) : vec3(0.19, 0.20, 0.215);
      vec3 ngt = (tier < 0.5 ? vec3(0.34, 0.33, 0.32) : tier < 1.5 ? vec3(0.28, 0.275, 0.27) : tier < 2.5 ? vec3(0.19, 0.19, 0.195) : vec3(0.13, 0.13, 0.14)) * mix(0.45, 1.0, pw);      // neutral at night too: amber is the people
      vec3 c = mix(day, ngt, uNight);
      c = mix(c, vec3(0.96, 0.72, 0.26), ppl * 0.16 * (tier < 2.5 ? 1.0 : 0.5));
      vC = c; vA = tier < 1.5 ? 1.0 : tier < 2.5 ? 0.95 : 0.8; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const roadMat = new THREE.ShaderMaterial({ uniforms: U_, vertexShader: roadVS, fragmentShader: 'varying vec3 vC; varying float vA; void main(){ gl_FragColor = vec4(vC, vA); }', transparent: true, depthWrite: false });
  roadMat.polygonOffset = true; roadMat.polygonOffsetFactor = -2;
  // the districts of the model: a soft fill and an edge, gold where the people hold it, red where the regime does
  const hexVS = `attribute float hx; attribute float edge; uniform sampler2D tHex; uniform float uTime; uniform float uHexW; varying vec4 vC;
    void main() { vec4 st = texture2D(tHex, vec2((hx + 0.5) / uHexW, 0.5)); float ppl = st.r, reg = st.g;
      float a = ppl * 0.14 + max(0.0, reg - 0.3) * 0.07; vec3 c = ppl >= reg ? vec3(0.96, 0.72, 0.26) : vec3(0.92, 0.27, 0.30);
      if (edge > 0.5) a = 0.0;
      vC = vec4(c, a); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const hexMat = new THREE.ShaderMaterial({ uniforms: U_, vertexShader: hexVS, fragmentShader: 'varying vec4 vC; void main(){ if (vC.a < 0.004) discard; gl_FragColor = vC; }', transparent: true, depthWrite: false });
  // glowing points: lives lost (a quiet white light each), arrests (pale violet), phone lights at night
  const ptVS = `attribute vec3 col; attribute float sz; attribute float al; varying vec3 vC; varying float vA; uniform float uPx;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(sz * uPx / -mv.z, 1.5, 22.0); vC = col; vA = al; gl_Position = projectionMatrix * mv; }`;
  const uPx = { value: 900 };
  const ptMat = new THREE.ShaderMaterial({ uniforms: { uPx }, vertexShader: ptVS, fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d); if (r > 0.25) discard; float s = smoothstep(0.25, 0.0, r); gl_FragColor = vec4(vC * (0.7 + 0.8 * s), vA * s); }', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  // the buildings: their real footprints; windows lit at night where the power is on (per district, from the same texture)
  const bldMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0.05 });
  bldMat.onBeforeCompile = sh => {
    sh.uniforms.tHex = U_.tHex; sh.uniforms.uNight = U_.uNight; sh.uniforms.uHexW = U_.uHexW;
    sh.vertexShader = 'attribute float hx; varying float vHx; varying float vY; varying float vUp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vHx = hx; vY = position.y; vUp = normal.y;');
    sh.fragmentShader = 'uniform sampler2D tHex; uniform float uNight; uniform float uHexW; varying float vHx; varying float vY; varying float vUp;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n { float l = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = mix(vec3(l), diffuseColor.rgb, 0.28) * mix(0.74, 0.7, uNight) + vec3(0.012, 0.014, 0.02); }').replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n { vec4 st = texture2D(tHex, vec2((vHx + 0.5) / uHexW, 0.5)); float band = step(0.42, fract(vY / 3.2)) * step(fract(vY / 3.2), 0.78) * step(vUp, 0.5) * step(1.0, vY);\n   float lit = step(0.5, fract(sin(floor(vY / 3.2) * 12.9898 + vHx * 78.233) * 43758.5453));\n   totalEmissiveRadiance += vec3(1.0, 0.9, 0.74) * band * uNight * st.b * (0.12 + 0.3 * lit); }');
  };

  let layers = [];
  function clearWorld() {
    if (typeof LOCAL !== 'undefined' && LOCAL) { world.remove(LOCAL); LOCAL.traverse(m => { if (m.geometry) m.geometry.dispose(); }); LOCAL = null; localAt = null; }
    for (const o of layers) { world.remove(o); o.traverse(m => { if (m.isMesh || m.isPoints || m.isLine || m.isLineSegments || m.isSprite) { if (m.geometry && !m.userData.shared) m.geometry.dispose(); } }); if (K && K.drop) o.traverse(m => { if (K.live && K.live.has(m)) K.live.delete(m); }); }
    layers = [];
    if (FX && FX.clear) FX.clear();
  }
  function add(o) { world.add(o); layers.push(o); return o; }
  // THE BUILDINGS ARE ONE LAYER OF THEIR OWN (1 November 2026). The board paints first with its procedural blocks; when the
  // footprints OpenStreetMap maps arrive (b/<id>-bld.json) only this layer is rebuilt. Before, the whole world was built a
  // second time, the camera jumped home and every figure was made twice.
  let bldGrp = null;
  function addB(o) { (bldGrp || world).add(o); return o; }
  function rebuildBuildings() {
    if (!bldGrp || !BJ) return;
    BLDS++;
    for (const o of bldGrp.children.slice()) { bldGrp.remove(o); o.traverse(m => { if ((m.isMesh || m.isPoints || m.isLine) && m.geometry && !m.userData.shared) m.geometry.dispose(); }); }
    SHOPS = { open: null, shut: null };
    buildFill(BJ);
    if (RUN) frameShown = -1;      // the shutters and the lights follow the run already playing
  }
  const SQ3 = Math.sqrt(3);
  function hexKey(x, y, s) {
    const q = (2 / 3 * x) / s, r = (-1 / 3 * x + SQ3 / 3 * y) / s;
    let rx = Math.round(q), rz = Math.round(r), ry = Math.round(-q - r);
    const dx = Math.abs(rx - q), dy = Math.abs(ry - (-q - r)), dz = Math.abs(rz - r);
    if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
    return rx + ',' + rz;
  }
  let HEXKEY = {};
  const hxAt = (x, y) => { const k = HEXKEY[hexKey(x, y, BJ.s)]; return k == null ? -1 : k; };
  function decode(a, cb) { let x = 0, y = 0; for (let n = 0; n + 1 < a.length; n += 2) { if (n === 0) { x = a[0]; y = a[1]; } else { x += a[n]; y += a[n + 1]; } cb(x, y, n === 0); } }
  const hash = (a, b) => { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };

  // ---- scales: the board is real metres; landmarks, the regime's places and the people are drawn larger, as a strategy game
  // draws its units, so they read from the whole-city view; the people shrink to life size as the camera comes down
  let G = 1.3, KU = 1, KUMAX = 1, HP = [], SITES = [], SEC = [], CHK = [];
  const TILT = 0.95;

  let BUILDS = 0, BLDS = 0;      // how many times the world and the building layer were built (the phone test: once per city)
  function buildWorld(B) {
    BUILDS++;
    clearWorld();
    const N = B.hex.x.length, s = B.s, R = B.r;
    // landmarks and the regime's places a little larger than life so they read from the city view; never so large that they
    // stand over the streets (they were up to five times life size, people up to ninety: the cheap-game look, 2 November 2026)
    G = clamp(s / 900, 1.1, 1.6); KUMAX = 1;
    HEXKEY = {}; for (let i = 0; i < N; i++) HEXKEY[hexKey(B.hex.x[i], B.hex.y[i], s)] = i;
    HP = B.hex.pts.map((a, i) => (a && a.length >= 2 ? a : [B.hex.x[i], B.hex.y[i]]));
    // the ground: warm dusty earth with a faint noise, the city's circle a shade lighter
    const gc = D.createElement('canvas'); gc.width = gc.height = 512; const g = gc.getContext('2d');
    // the ground: a calm dark slate, the city's circle a shade lighter, a fine grain so it is not flat plastic
    const grd = g.createRadialGradient(256, 256, 20, 256, 256, 256); grd.addColorStop(0, '#2a2e35'); grd.addColorStop(0.62, '#22262c'); grd.addColorStop(1, '#111418');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6000; i++) { const x = hash(i, 1) * 512, y = hash(i, 2) * 512, v = hash(i, 3); g.fillStyle = `rgba(${v > 0.5 ? '200,210,225' : '0,0,0'},${0.012 + hash(i, 4) * 0.02})`; g.fillRect(x, y, 2, 2); }
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(R * 2.9, R * 2.9), new THREE.MeshStandardMaterial({ map: gt, roughness: 1, metalness: 0 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; ground.receiveShadow = true; add(ground);
    const polys = (arr, color, op, y) => {
      const geos = [];
      for (const a of arr || []) { const pts = []; decode(a, (x, yy) => pts.push(new THREE.Vector2(x, yy))); if (pts.length < 3) continue; try { const ge = new THREE.ShapeGeometry(new THREE.Shape(pts)); ge.rotateX(-Math.PI / 2); geos.push(ge); } catch (_) { } }
      if (!geos.length) return;
      const m = new THREE.Mesh(mergeGeos(geos), new THREE.MeshStandardMaterial({ color, transparent: op < 1, opacity: op, roughness: 1, depthWrite: false }));
      m.position.y = y; add(m);
    };
    polys(B.parks, 0x253428, 0.95, 0.2);
    polys((B.water || {}).areas, 0x182c3d, 1, 0.3);
    // streets
    // streets as ribbons as wide as the street a figure may walk in (uprising-street.js HALFW), so a crowd fills the avenue
    // it stands in; alleys are lines on slower machines
    for (const [tk, tier, wd0] of [['t3', 3, LOWP ? 0 : 4.4], ['t2', 2, 8.4], ['t1', 1, 15], ['t0', 0, 18]]) {
      const wd = LOD2 && tier >= 1 ? 0 : wd0;      // on a phone only the motorways are ribbons; every other street is a line
      const ways = (B.roads || {})[tk] || [];
      if (!wd) {      // alleys as lines
        let cnt = 0; for (const a of ways) cnt += Math.max(0, a.length / 2 - 1);
        const pos = new Float32Array(cnt * 6), hx = new Float32Array(cnt * 2), ti = new Float32Array(cnt * 2).fill(tier); let o = 0;
        for (const a of ways) { let px = 0, py = 0; decode(a, (x, y, first) => { if (!first) { const h = hxAt((px + x) / 2, (py + y) / 2), hh = h < 0 ? N : h; pos.set([px, 0.6, -py, x, 0.6, -y], o * 6); hx[o * 2] = hx[o * 2 + 1] = hh; o++; } px = x; py = y; }); }
        const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, o * 6), 3)); ge.setAttribute('hx', new THREE.BufferAttribute(hx.subarray(0, o * 2), 1)); ge.setAttribute('tier', new THREE.BufferAttribute(ti.subarray(0, o * 2), 1));
        add(new THREE.LineSegments(ge, roadMat)); continue;
      }
      let cnt = 0; for (const a of ways) cnt += Math.max(0, a.length / 2 - 1);
      const pos = new Float32Array(cnt * 18), hx = new Float32Array(cnt * 6), ti = new Float32Array(cnt * 6).fill(tier); let o = 0;
      for (const a of ways) {
        let px = 0, py = 0;
        decode(a, (x, y, first) => {
          if (!first) {
            const dx = x - px, dy = y - py, L = Math.hypot(dx, dy) || 1, nx = -dy / L * wd / 2, ny = dx / L * wd / 2, h = hxAt((px + x) / 2, (py + y) / 2), hh = h < 0 ? N : h, yy = 0.8 + (3 - tier) * 0.15;
            const q = [px + nx, py + ny, px - nx, py - ny, x + nx, y + ny, x - nx, y - ny], tri = [0, 1, 2, 2, 1, 3];
            for (let t = 0; t < 6; t++) { const v = tri[t]; pos[o * 18 + t * 3] = q[v * 2]; pos[o * 18 + t * 3 + 1] = yy; pos[o * 18 + t * 3 + 2] = -q[v * 2 + 1]; hx[o * 6 + t] = hh; }
            o++;
          }
          px = x; py = y;
        });
      }
      const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, o * 18), 3)); ge.setAttribute('hx', new THREE.BufferAttribute(hx.subarray(0, o * 6), 1)); ge.setAttribute('tier', new THREE.BufferAttribute(ti.subarray(0, o * 6), 1));
      add(new THREE.Mesh(ge, roadMat));
    }
    // THE STREET NETWORK (uprising-street.js): every figure and every car moves on it
    if (STM && !ST) ST = STM.createStreets(THREE, { add, K, LOD2, LOWP, hash, uPx, colours: COLS });
    if (ST) { const info = ST.build(B, hxAt); NETINFO = info; }
    buildLamps(B); if (ST) ST.buildTraffic(LOD2 ? 120 : LOWP ? 260 : 520);
    // the districts of the model
    {
      const pos = new Float32Array(N * 18 * 3), hx = new Float32Array(N * 18), ed = new Float32Array(N * 18);
      const lp = new Float32Array(N * 12 * 3), lhx = new Float32Array(N * 12), led = new Float32Array(N * 12).fill(1), rr = s * 0.985;
      for (let i = 0; i < N; i++) {
        const cx = B.hex.x[i], cy = B.hex.y[i];
        for (let t = 0; t < 6; t++) {
          const a0 = Math.PI / 3 * t, a1 = Math.PI / 3 * (t + 1), v = [cx, cy, cx + rr * Math.cos(a0), cy + rr * Math.sin(a0), cx + rr * Math.cos(a1), cy + rr * Math.sin(a1)];
          for (let k = 0; k < 3; k++) { const b = (i * 18 + t * 3 + k) * 3; pos[b] = v[k * 2]; pos[b + 1] = 1.5; pos[b + 2] = -v[k * 2 + 1]; hx[i * 18 + t * 3 + k] = i; }
          const lb = (i * 12 + t * 2) * 3; lp[lb] = v[2]; lp[lb + 1] = 2; lp[lb + 2] = -v[3]; lp[lb + 3] = v[4]; lp[lb + 4] = 2; lp[lb + 5] = -v[5]; lhx[i * 12 + t * 2] = lhx[i * 12 + t * 2 + 1] = i;
        }
      }
      const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3)); ge.setAttribute('hx', new THREE.BufferAttribute(hx, 1)); ge.setAttribute('edge', new THREE.BufferAttribute(ed, 1));
      add(new THREE.Mesh(ge, hexMat));
      const le = new THREE.BufferGeometry(); le.setAttribute('position', new THREE.BufferAttribute(lp, 3)); le.setAttribute('hx', new THREE.BufferAttribute(lhx, 1)); le.setAttribute('edge', new THREE.BufferAttribute(led, 1));
      add(new THREE.LineSegments(le, hexMat));
    }
    bldGrp = new THREE.Group(); bldGrp.name = 'buildings'; add(bldGrp);
    buildFill(B);
    buildSites(B);
    buildSec(B);
    buildUnits(B);
    buildPoints();
    hexStateClear();
    camHome(true);
  }
  // the street lamps along the avenues: one draw call, lit at night where the district has power (the same texture as the
  // windows), and the traffic: cars moving on the main roads, thinning as the strike stops the trucks and the fighting
  // empties the streets (street life that reads the run)
  let LAMPS = null, ST = null, NETINFO = null;
  function buildLamps(B) {
    const step = LOD2 ? 140 : LOWP ? 90 : 60, cap = LOD2 ? 1400 : LOWP ? 3200 : 7000, pos = [], hx = [];
    for (const tk of LOD2 ? ['t0', 't1'] : ['t0', 't1', 't2']) for (const a of (B.roads || {})[tk] || []) {
      let px = 0, py = 0, acc = 0;
      decode(a, (x, y, f) => { if (!f) { const L = Math.hypot(x - px, y - py); acc += L; while (acc > step && pos.length / 3 < cap) { acc -= step; const u = 1 - acc / Math.max(1, L); const lx = px + (x - px) * u, ly = py + (y - py) * u; pos.push(lx, 7, -ly); const h = hxAt(lx, ly); hx.push(h < 0 ? B.hex.x.length : h); } } px = x; py = y; });
    }
    if (!pos.length) { LAMPS = null; return; }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute('hx', new THREE.Float32BufferAttribute(hx, 1));
    const m = new THREE.ShaderMaterial({ uniforms: { uNight: U_.uNight, uPx, tHex: U_.tHex, uHexW: U_.uHexW },
      vertexShader: 'attribute float hx; uniform float uPx; uniform float uNight; uniform sampler2D tHex; uniform float uHexW; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(10.0 * uPx / -mv.z, 1.2, 5.0); vA = uNight * texture2D(tHex, vec2((hx + 0.5) / uHexW, 0.5)).b; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d); if (r > 0.25) discard; gl_FragColor = vec4(1.0, 0.93, 0.82, vA * smoothstep(0.25, 0.0, r) * 0.45); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    LAMPS = new THREE.Points(ge, m); LAMPS.frustumCulled = false; LAMPS.visible = false; add(LAMPS);
  }
  function mergeGeos(geos) {
    let n = 0; for (const g of geos) n += (g.index ? g.index.count : g.attributes.position.count);
    const pos = new Float32Array(n * 3); let o = 0;
    for (const g of geos) { const gg = g.index ? g.toNonIndexed() : g; pos.set(gg.attributes.position.array, o); o += gg.attributes.position.array.length; gg.dispose(); if (gg !== g) g.dispose(); }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3)); ge.computeVertexNormals(); return ge;
  }

  // ---- instancing a kit model many times: one InstancedMesh per mesh of the model (houses, shops, stations, checkpoints)
  // phone level of detail: a kit model's parts (solid, metal, glass, glow, team colour) merged into ONE mesh, one draw call
  const flatMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.7, metalness: 0.1 });
  function flatten(proto) {
    proto.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(proto.matrixWorld).invert(), parts = [];
    proto.traverse(m => {
      if (!m.isMesh || m.name === 'glowAdd') return;
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
      if (!g.attributes.color) { const c = m.material && m.material.color ? m.material.color : new THREE.Color(0x888888), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'color' && k !== 'normal') g.deleteAttribute(k);
      if (!g.attributes.normal) g.computeVertexNormals();
      parts.push(g);
    });
    let n = 0; for (const g of parts) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
    for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, flatMat); const grp = new THREE.Group(); grp.add(mesh); grp.userData.size = proto.userData.size; grp.scale.copy(proto.scale); return grp;
  }
  const FLAT = new Map();
  function makeFlat(t, o) { if (!LOD2) return make(t, o); const key = t + '|' + JSON.stringify(o || {}); if (!FLAT.has(key)) { const p = make(t, o); if (!p) return null; FLAT.set(key, flatten(p)); } const c = FLAT.get(key).clone(); c.userData.size = FLAT.get(key).userData.size; c.traverse(x => { x.userData.shared = true; }); return c; }
  function instanced(type, variant, mats, team) {
    if (!mats.length) return null;
    const proto = makeFlat(type, { variant, team: team || 'grey' }); if (!proto) return null;
    proto.updateMatrixWorld(true);
    const grp = new THREE.Group(), M = new THREE.Matrix4();
    proto.traverse(m => {
      if (!m.isMesh) return;
      const im = new THREE.InstancedMesh(m.geometry, m.material, mats.length); im.userData.shared = true;
      for (let i = 0; i < mats.length; i++) { M.multiplyMatrices(mats[i], m.matrixWorld); im.setMatrixAt(i, M); }
      im.instanceMatrix.needsUpdate = true; im.castShadow = false; im.receiveShadow = true; im.computeBoundingSphere(); grp.add(im);
    });
    return grp;
  }
  const _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
  const mat4 = (x, y, rot, sc) => { _e.set(0, rot || 0, 0); _q.setFromEuler(_e); return new THREE.Matrix4().compose(_v.set(x, 0, -y), _q, _s.set(sc, sc, sc)); };

  // ---- the buildings: OSM footprints where mapped (loaded after the board), procedural rows of Iranian forms elsewhere
  let SHOPS = { open: null, shut: null };
  function buildFill(B) {
    const N = B.hex.x.length, R = B.r;
    if (ST) ST.clearBuildings();      // the footprints the street audit checks figures against (filled again below)
    const AUD = [], OSMFP = osmFootprints(B);
    if (ST) ST.addBuildings(OSMFP.map(o => o.fpB));
    const onOSM = fp => { if (!ST) return false; for (const q of fp) if (ST.inBuildingAt(q[0], q[1])) return true; let cx = 0, cy = 0; for (const q of fp) { cx += q[0]; cy += q[1]; } return ST.inBuildingAt(cx / fp.length, cy / fp.length); };
    const fillCap = LOD2 ? 1800 : LOWP ? 22000 : 30000, per = new Int32Array(N);      // more of the city stands (2 November 2026: empty districts read as an unfinished map)
    const osmHex = new Int32Array(N);
    if (BLD && BLD.b) for (const a of BLD.b) { const h = hxAt(a[2], a[3]); if (h >= 0) osmHex[h]++; }
    const near = Array.from({ length: N }, (_, i) => i).sort((a, b) => (Math.hypot(B.hex.x[a], B.hex.y[a]) - B.hex.p[a] / 2000) - (Math.hypot(B.hex.x[b], B.hex.y[b]) - B.hex.p[b] / 2000));
    const want = new Float32Array(N); let wsum = 0;
    for (const i of near) { const cov = clamp(osmHex[i] / 900, 0, 0.85); want[i] = (1 - cov) * (0.4 + B.hex.p[i] / 60000) / (1 + Math.hypot(B.hex.x[i], B.hex.y[i]) / (R * 0.5)); wsum += want[i]; }
    for (let i = 0; i < N; i++) per[i] = Math.round(fillCap * want[i] / (wsum || 1));
    // procedural blocks: plain footprints (one merged mesh, a few dozen triangles each, windows lit by district at night);
    // a few hundred shop rows along the avenues are the kit's shops, so the strike can pull their shutters down
    const LST = [], SO = [], soCap = LOD2 ? 0 : LOWP ? 120 : 360;
    const segs = [];
    for (const [tk, setback, kindA] of [['t3', 14, 0], ['t2', 20, 1], ['t1', 26, 2]]) for (const a of (B.roads || {})[tk] || []) { let px = 0, py = 0; decode(a, (x, y, f) => { if (!f) segs.push([px, py, x, y, setback, kindA]); px = x; py = y; }); }
    for (let n = 0; n < segs.length; n++) {
      const j = Math.floor(hash(n, 7) * segs.length), t = segs[n]; segs[n] = segs[j]; segs[j] = t;      // deterministic shuffle: fill spreads evenly
    }
    for (const [x1, y1, x2, y2, sb, kA] of segs) {
      const L = Math.hypot(x2 - x1, y2 - y1); if (L < 25) continue;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, h = hxAt(mx, my); if (h < 0 || per[h] <= 0) continue;
      const ux = (x2 - x1) / L, uy = (y2 - y1) / L, rot = Math.atan2(ux, uy);
      const step = kA === 0 ? 16 : 22;
      for (let d = step / 2; d < L && per[h] > 0; d += step) for (const side of [-1, 1]) {
        if (per[h] <= 0) break;
        const r0 = hash(Math.round(x1 + d), Math.round(y1 + side * 7));
        const bx = x1 + ux * d - uy * sb * side, by = y1 + uy * d + ux * sb * side;
        const dc = Math.hypot(bx, by) / R;
        if (kA >= 1 && r0 < 0.3 && SO.length < soCap) {
          const nx0 = -uy * side, ny0 = ux * side, fpS = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a2, b2]) => [bx + ux * a2 * 6 + nx0 * b2 * 5, by + uy * a2 * 6 + ny0 * b2 * 5]);
          if (ST && (!ST.clearOfRoads(fpS) || onOSM(fpS))) continue;      // a block never stands on another street or on a mapped building (2 November 2026)
          SO.push(mat4(bx, by, rot + (side > 0 ? Math.PI : 0), 1)); AUD.push(fpS); per[h]--; continue;
        }
        const apt = r0 < 0.3 + 0.35 * (1 - dc), w = step - 2 - r0 * 3, dp = apt ? 16 + r0 * 6 : 11 + r0 * 4;
        const ht = apt ? 12 + r0 * 18 * (1.25 - dc) : 6 + r0 * 5;
        const nx = -uy * side, ny = ux * side, cxh = bx - nx * (dp / 2 - 6), cyh = by - ny * (dp / 2 - 6);
        const c = (a2, b2) => [cxh + ux * a2 * w / 2 + nx * b2 * dp / 2, -(cyh + uy * a2 * w / 2 + ny * b2 * dp / 2)];
        const fp3 = [c(-1, -1), c(1, -1), c(1, 1), c(-1, 1)], fpB = fp3.map(q => [q[0], -q[1]]);
        if (ST && (!ST.clearOfRoads(fpB) || onOSM(fpB))) continue;      // the fill stood blocks across other streets: figures then walked through them
        LST.push({ footprint: fp3, height: ht, style: apt ? 'apartment' : (kA >= 1 && r0 < 0.5 ? 'shops' : 'house') }); AUD.push(fpB);
        per[h]--;
      }
    }
    const fill = new THREE.Group(); fill.name = 'fill';
    SHOPS.open = instanced('shops', null, SO); SHOPS.shut = instanced('shops', 'shut', SO);
    if (SHOPS.open) fill.add(SHOPS.open); if (SHOPS.shut) { SHOPS.shut.visible = false; fill.add(SHOPS.shut); }
    addB(fill);
    if (ST) ST.addBuildings(AUD);
    ROOFS = LST.filter(b => b.height >= 12).map(b => roofOf(b)).concat(OSMFP.filter(o => o.b.height >= 12).map(o => roofOf(o.b)));
    // the nearest blocks to the centre in the kit's banded Iranian facades, the rest as plain prisms (the frame budget)
    LST.sort((a, b) => Math.hypot(a.footprint[0][0], a.footprint[0][1]) - Math.hypot(b.footprint[0][0], b.footprint[0][1]));
    if (K && K.city && K.city.buildings) raise(LST);
    if (OSMFP.length && K && K.city && K.city.buildings) raise(OSMFP.map(o => o.b));
    if (ST) ST.markCovered();      // a street under a mapped building is never stood on (uprising-street.js)
  }
  // THE NEIGHBOURHOOD AROUND THE CAMERA (2 November 2026): a whole city at street density would be hundreds of thousands of
  // buildings, so the blocks within about two kilometres of where the camera looks are filled densely (two to five storey
  // rows along every street and alley, as Iranian residential districts are), never on a street or a mapped building, and
  // replaced when the camera moves on. The street audit checks the figures against these blocks too.
  let LOCAL = null, localAt = null, localT = -9, ROOFS = [], LROOFS = [];
  const roofOf = b => { let x = 0, y = 0; for (const q of b.footprint) { x += q[0]; y -= q[1]; } return [x / b.footprint.length, y / b.footprint.length, b.height]; };
  function localFill(cx, cy, rad) {
    if (!BJ || !ST) return;
    if (LOCAL) { world.remove(LOCAL); LOCAL.traverse(m => { if (m.geometry) m.geometry.dispose(); }); LOCAL = null; }
    const cap = LOD2 ? 2200 : LOWP ? 9000 : 14000, list = [], fps = [], R2 = rad * rad;
    for (const [tk, sb, dp0, step] of [['t3', 9.5, 10, 12], ['t2', 13, 13, 15], ['t1', 19, 15, 18]]) for (const a of (BJ.roads || {})[tk] || []) {
      if (list.length >= cap) break;
      let px = 0, py = 0;
      decode(a, (x, y, f) => {
        if (!f && list.length < cap) {
          const mx = (px + x) / 2, my = (py + y) / 2;
          if ((mx - cx) ** 2 + (my - cy) ** 2 < R2) {
            const L = Math.hypot(x - px, y - py);
            if (L > 14) {
              const ux = (x - px) / L, uy = (y - py) / L;
              for (let d = step / 2; d < L - 4 && list.length < cap; d += step) for (const side of [-1, 1]) {
                const r0 = hash(Math.round(px + ux * d) * 3 + side, Math.round(py + uy * d)), w = step - 1.2, dp = dp0 + r0 * 4;
                const nx = -uy * side, ny = ux * side, bx = px + ux * d + nx * (sb + dp / 2 - 5), by = py + uy * d + ny * (sb + dp / 2 - 5);
                const fp = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a2, b2]) => [bx + ux * a2 * w / 2 + nx * b2 * dp / 2, by + uy * a2 * w / 2 + ny * b2 * dp / 2]);
                if (!ST.clearOfRoads(fp, 0.8)) continue;
                let hit = false; for (const q of fp) if (ST.inBuildingAt(q[0], q[1])) { hit = true; break; } if (hit || ST.inBuildingAt(bx, by)) continue;
                const dc = Math.hypot(bx, by) / BJ.r, fl = 2 + Math.floor(r0 * (dc < 0.35 ? 4 : 3));
                list.push({ footprint: fp.map(q => [q[0], -q[1]]), height: fl * 3.2 + 0.6, style: tk === 't1' && r0 < 0.5 ? 'shops' : fl >= 4 ? 'apartment' : 'house' }); fps.push(fp);
              }
            }
          }
        }
        px = x; py = y;
      });
    }
    // two blocks of the same pass must not overlap either: keep the first of any pair whose centres sit closer than 7 m
    const keep = [], fpk = [], cells = new Map();
    for (let i = 0; i < list.length; i++) { const f = fps[i], cx2 = (f[0][0] + f[2][0]) / 2, cy2 = (f[0][1] + f[2][1]) / 2, k = Math.floor(cx2 / 7) + ',' + Math.floor(cy2 / 7); if (cells.has(k)) continue; cells.set(k, 1); keep.push(list[i]); fpk.push(f); }
    ST.setLocalBuildings(fpk); LROOFS = keep.filter(b => b.height >= 12).map(roofOf);
    if (!keep.length) return;
    LOCAL = new THREE.Group(); LOCAL.name = 'local';
    for (let o = 0; o < keep.length; o += 2500) { const mesh = prisms(keep.slice(o, o + 2500)); const posA = mesh.geometry.attributes.position, hx = new Float32Array(posA.count); for (let v = 0; v < posA.count; v++) { const h = hxAt(posA.getX(v), -posA.getZ(v)); hx[v] = h < 0 ? BJ.hex.x.length : h; } mesh.geometry.setAttribute('hx', new THREE.BufferAttribute(hx, 1)); mesh.receiveShadow = true; LOCAL.add(mesh); }
    world.add(LOCAL); localAt = [cx, cy, rad];
  }
  function maybeLocal() {
    if (!BJ || !ST || cam.dist > 4200 || clock - localT < 0.8) return;
    const rad = clamp(cam.dist * (LOD2 ? 0.7 : 1.25), 700, LOD2 ? 1400 : 2400);
    if (localAt && Math.hypot(localAt[0] - cam.tx, localAt[1] - cam.ty) < localAt[2] * 0.4 && rad <= localAt[2] * 1.15) return;
    localT = clock; localFill(cam.tx, cam.ty, rad);
  }
  // raise footprints as ONE mesh per ~2,500 buildings, each vertex tagged with its district (windows go dark where the power is cut)
  // on a phone: plain prisms (walls and a flat roof, about a dozen triangles each) instead of the kit's banded facades
  const PRISM_C = { house: [0xbf9466, 0xc9a77c, 0xd4c3a3], apartment: [0xd8cdb5, 0xcfc2a5, 0xbdb3a2], shops: [0xb98d62, 0xc7b08e], govt: [0xd6ccb4, 0xcdc3ab] };
  function prisms(list) {
    let n = 0; for (const b of list) n += b.footprint.length * 6 + (b.footprint.length - 2) * 3;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), cc = new THREE.Color(); let o = 0;
    const v = (x, y, z) => { pos[o * 3] = x; pos[o * 3 + 1] = y; pos[o * 3 + 2] = z; col[o * 3] = cc.r; col[o * 3 + 1] = cc.g; col[o * 3 + 2] = cc.b; o++; };
    for (const b of list) {
      const f = b.footprint, h = b.height, pal = PRISM_C[b.style] || PRISM_C.house; let ar = 0;
      for (let i = 0; i < f.length; i++) { const a = f[i], c = f[(i + 1) % f.length]; ar += a[0] * c[1] - c[0] * a[1]; }
      const pts = ar > 0 ? f.slice().reverse() : f;
      cc.setHex(pal[Math.floor(hash(pts[0][0], pts[0][1]) * pal.length)]);
      for (let i = 0; i < pts.length; i++) { const a = pts[i], c = pts[(i + 1) % pts.length]; v(a[0], 0, a[1]); v(c[0], 0, c[1]); v(c[0], h, c[1]); v(a[0], 0, a[1]); v(c[0], h, c[1]); v(a[0], h, a[1]); }
      cc.multiplyScalar(0.8);
      for (let i = 1; i + 1 < pts.length; i++) { v(pts[0][0], h, pts[0][1]); v(pts[i + 1][0], h, pts[i + 1][1]); v(pts[i][0], h, pts[i][1]); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, o * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, o * 3), 3)); g.computeVertexNormals();
    return new THREE.Mesh(g, bldMat);
  }
  function raise(list) {
    for (let o = 0; o < list.length; o += 2500) {
      let mesh; try { mesh = LOWP || o >= 7500 ? prisms(list.slice(o, o + 2500)) : K.city.buildings(list.slice(o, o + 2500)); } catch (e) { console.warn('buildings', e); continue; }
      const posA = mesh.geometry.attributes.position, hx = new Float32Array(posA.count);
      for (let v = 0; v < posA.count; v++) { const h = hxAt(posA.getX(v), -posA.getZ(v)); hx[v] = h < 0 ? BJ.hex.x.length : h; }
      mesh.geometry.setAttribute('hx', new THREE.BufferAttribute(hx, 1));
      mesh.material = bldMat; mesh.castShadow = false; mesh.receiveShadow = true;
      addB(mesh);
    }
  }
  const KIND_STYLE = ['house', 'apartment', 'shops', 'govt', 'govt', 'shops', 'govt', 'govt', 'govt', 'govt', 'govt'];
  // the buildings OpenStreetMap maps, as footprints with a height and a style (raised by buildFill, checked by the street audit)
  function osmFootprints(B) {
    if (!BLD || !BLD.b) return [];
    const cap = LOD2 ? 1100 : LOWP ? 3500 : 11000, out = [];
    for (let n = 0; n < BLD.b.length && out.length < cap; n++) {
      const a = BLD.b[n], k = a[1] | 0, pts = [];
      let x = 0, y = 0; for (let j = 2; j + 1 < a.length; j += 2) { if (j === 2) { x = a[2]; y = a[3]; } else { x += a[j]; y += a[j + 1]; } pts.push([x, -y]); }
      if (pts.length < 3) continue;
      const cx = pts[0][0], cy = -pts[0][1], dc = Math.hypot(cx, cy) / B.r, r0 = hash(cx, cy);
      let h = a[0] | 0;
      if (!h) h = k === 1 ? 14 + r0 * 16 * (1.2 - dc) : k === 2 ? 8 + r0 * 6 : k === 4 ? 9 + r0 * 4 : k === 5 ? 7 + r0 * 3 : k >= 3 ? 10 + r0 * 8 : 6.5 + r0 * 4 + (dc < 0.3 ? r0 * 6 : 0);
      out.push({ b: { footprint: pts, height: clamp(h, 3, 180), style: KIND_STYLE[k] || 'house' }, fpB: pts.map(q => [q[0], -q[1]]) });
    }
    return out;
  }

  // ---- the places that matter, as their models
  const SITE_MODEL = { gov: 'govt', tv: 'irib', police: 'faraja_station', square: 'square', sq2: 'square', prison: 'prison', uni: 'university', bazaar: 'bazaar', shrine: 'shrine',
    hospital: 'hospital', mosalla: 'mosque', garrison: 'artesh_barracks', stadium: null, terminal: null, industry: null, power: null, airport: null };
  let beacons = [], labelEls = [], LORDER = [];
  function siteName(q) {
    if (FA) return q.n || tr(q.gen || SITE_T[q.k] || '');
    return q.en || tr(q.gen || SITE_T[q.k] || '');
  }
  function buildSites(B) {
    SITES = B.sites.map((q, idx) => Object.assign({ idx }, q));
    let on = 0; SITES.forEach(q => { if (U.BASEW[q.k] != null) q.oi = on++; });
    beacons = []; labels.innerHTML = ''; labelEls = [];
    const ringGeo = new THREE.RingGeometry(1, 1.12, 48); ringGeo.rotateX(-Math.PI / 2);
    for (const q of SITES) {
      const objv = q.oi != null;
      let t = SITE_MODEL[q.k];
      if (q.k === 'garrison' && q.aff === 'IRGC') t = 'irgc_base';
      const isAzadi = (q.k === 'square') && /azadi|آزادی/i.test((q.en || '') + (q.n || '')) && cityId === 'tehran';
      const obj = t && (!LOD2 || objv) ? makeFlat(t, { variant: (q.k === 'square' || q.k === 'sq2') && !isAzadi ? 'fountain' : undefined, team: q.k === 'garrison' ? 'red' : 'grey' }) : null;
      const len = obj ? Math.max(obj.userData.size[0], obj.userData.size[2]) : 30;
      const sc = (objv ? 1.15 : 0.9) * G * (q.k === 'garrison' ? 1.6 : 1);
      if (obj) { obj.scale.multiplyScalar(sc); obj.position.set(q.x, 0, -q.y); obj.rotation.y = hash(q.x, q.y) * 6.28; add(obj); }
      let ring = null;
      if (objv) { ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff3b4f, transparent: true, opacity: 0.85, depthWrite: false })); ring.scale.setScalar(len * sc * 0.75); ring.position.set(q.x, 2.5, -q.y); add(ring); }
      const topY = (obj ? obj.userData.size[1] * sc : 20) + 12 * G;
      beacons.push({ q, ring, obj, top: new THREE.Vector3(q.x, topY, -q.y) });
      const el = D.createElement('div');
      el.className = 'up-lab' + (objv ? ' up-lab-o' : '');
      el.innerHTML = `<i>${SITE_ICON[q.k] || '•'}</i><span>${esc(siteName(q))}</span>`;
      labels.appendChild(el); labelEls.push(el);
    }
    LORDER = beacons.map((b, n) => n).sort((a, b) => ((U.BASEW[beacons[b].q.k] || 0) - (U.BASEW[beacons[a].q.k] || 0)));
  }

  // ---- the regime's places: OSM where mapped, typical placement where not, each with its emblem; checkpoints at junctions
  let secLab = [], CHKO = [];
  function buildSec(B) {
    SEC = (B.sec || []).map((q, i) => Object.assign({ i }, q));
    let sprN = 0;
    secLab = [];
    const byType = {}, maxN = LOD2 ? { police_station: 8, basij: 6, checkpoint: 12, artesh: 2, military_unknown: 0, irgc_hq: 3, special_police: 2, police_hq: 2, intelligence: 1 } : { police_station: LOWP ? 30 : 90, basij: LOWP ? 20 : 60, checkpoint: 30, artesh: LOWP ? 8 : 25, military_unknown: LOWP ? 5 : 20, irgc_hq: LOWP ? 10 : 30 };
    const cnt = {};
    for (const q of SEC) {
      const sk = SEC_K[q.k]; if (!sk || q.k === 'checkpoint') continue;
      cnt[q.k] = (cnt[q.k] || 0) + 1; if (maxN[q.k] != null && cnt[q.k] > maxN[q.k]) continue;
      const big = q.k === 'irgc_hq' || q.k === 'artesh' || q.k === 'military_unknown' || q.k === 'special_police';
      const sc = G * (big ? 1.2 : q.k === 'police_hq' ? 1.5 : 1) * (q.src === 'typical' ? 0.85 : 1);
      const key = sk[1] + '|' + (q.aff === 'IRGC' && q.k !== 'basij' ? 'red' : 'grey');
      (byType[key] = byType[key] || []).push(mat4(q.x, q.y, hash(q.x, q.y) * 6.28, sc));
      // the compound's real walls, in the colour of whoever runs it
      if (q.ring) {
        const pts = []; decode(q.ring, (x, y) => pts.push(new THREE.Vector3(x, 3, -y))); if (pts.length > 2) pts.push(pts[0].clone());
        const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: AFF_C[q.aff] || '#888', transparent: true, opacity: 0.9 })); add(ln);
      }
      // the emblem over it
      const eid = sk[2] && (q.k === 'basij' ? 'basij' : q.aff === 'Artesh' ? 'artesh' : q.aff === 'IRGC' ? 'irgc' : q.aff === 'FARAJA' ? 'faraja' : sk[2]);
      if (eid && EMB[eid + '_tx'] && q.k !== 'police_station' && !(q.k === 'basij' && q.src === 'typical') && (!LOD2 || ((q.k === 'irgc_hq' || q.k === 'special_police' || q.k === 'police_hq') && (sprN++ < 8)))) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: EMB[eid + '_tx'], transparent: true, depthWrite: false, opacity: q.src === 'typical' ? 0.65 : 1 }));
        const e = (big ? 26 : 16) * G; sp.scale.set(e, e, 1); sp.position.set(q.x, (big ? 40 : 26) * G, -q.y); sp.renderOrder = 3; add(sp);
      }
      if (big || q.k === 'police_hq' || (q.k === 'basij' && q.src === 'osm') || q.k === 'intelligence') secLab.push(q);
    }
    for (const key in byType) { const [t, team] = key.split('|'); const grp = instanced(t, null, byType[key], team); if (grp) { grp.name = 'sec:' + t + ':' + byType[key].length; add(grp); } }
    // checkpoints: hidden until the regime moves past batons
    CHK = (B.chk || []).slice(0, LOD2 ? 5 : 30); CHKO = [];
    { const ck = instanced('checkpoint', null, CHK.map(c => mat4(c.x, c.y, hash(c.x, c.y) * 6.28, G * 1.1)), 'grey'); if (ck) { ck.name = 'checkpoints'; ck.visible = false; add(ck); CHKO.push(ck); } }      // one draw call per part for all of them
    // labels for the named compounds
    for (const q of secLab) {
      const el = D.createElement('div'); el.className = 'up-lab up-lab-s' + (q.src === 'typical' ? ' typ' : '');
      const nm = FA ? (q.n || tr(SEC_K[q.k][0])) : (q.en || (q.n && !FA ? tr(SEC_K[q.k][0]) : tr(SEC_K[q.k][0])));
      const eid = q.k === 'basij' ? 'basij' : q.aff === 'Artesh' ? 'artesh' : q.aff === 'IRGC' ? 'irgc' : q.aff === 'FARAJA' ? 'faraja' : null;
      el.innerHTML = `${eid ? embImg(eid, 'up-lab-e') : '<i>■</i>'}<span>${esc(nm)}</span>${q.src === 'typical' ? `<em>${tr('typical placement')}</em>` : ''}`;
      labels.appendChild(el);
      beacons.push({ q: Object.assign({ sec: 1 }, q), ring: null, obj: null, top: new THREE.Vector3(q.x, 46 * G, -q.y) }); labelEls.push(el);
    }
    LORDER = beacons.map((b, n) => n).sort((a, b) => (wLab(beacons[b].q) - wLab(beacons[a].q)));
  }
  const wLab = q => q.sec ? (q.k === 'irgc_hq' ? 1.5 : q.k === 'special_police' ? 1.2 : 0.6) : (U.BASEW[q.k] || 0.3);

  // ================================================================== the people and the forces as moving figures
  // WHERE EVERY FIGURE GOES IS uprising-street.js (2 November 2026): each hour of the run says how many people and forces
  // each district holds; the people come out of their side streets and walk the real streets to their district's square or
  // main junction, the forces leave their own bases and stand as a line across the avenue facing a crowd, and everyone
  // keeps to the streets. Each figure stands for many people (RUN.xP), and the page says so in the legend.
  let PPL = null, RIOT = null, BAS = null, IRG = null, DEF_ = null, MED = null, VEH = [];
  const CAPS = LOD2 ? [190, 40, 28, 18, 12, 6] : LOWP ? [700, 130, 90, 60, 40, 24] : [1500, 300, 200, 160, 90, 50];
  function buildUnits(B) {
    PPL = { n: CAPS[0] }; RIOT = { n: CAPS[1] }; BAS = { n: CAPS[2] }; IRG = { n: CAPS[3] }; DEF_ = { n: CAPS[4] }; MED = { n: CAPS[5] };
    VEH = []; SNIP = [];
    if (!ST) return;
    ST.resetVehicles(); ST.makeAgents(CAPS);
    // a district gathers at the place that matters in it (the governorate, the square, the campus, the bazaar), else its main junction
    const sq = {}; const wq = q => (q.oi != null ? 3 : 0) + (q.k === 'square' || q.k === 'sq2' ? 2 : q.k === 'uni' || q.k === 'bazaar' ? 1.5 : 0);
    for (const q of SITES) if (q.h >= 0 && wq(q) > 0 && (!sq[q.h] || wq(q) > sq[q.h][2])) sq[q.h] = [q.x, q.y, wq(q)];
    ST.setGathering(sq);
    const pick = ks => SEC.filter(q => ks.includes(q.k)).map(q => [q.x, q.y]);
    ST.setBases({ riot: pick(['police_station', 'police_hq', 'special_police']), basij: pick(['basij']), irgc: pick(['irgc_hq']) });
    buildDishes();
    // the forces' vehicles: water cannons and patrol cars from the first hour, Basij motorbikes (groups of three), armour and
    // machine-gun pickups higher up; they drive from their bases to the back of the line
    for (const [t, n, lv] of [['police_car', 3, 1], ['riot_truck', 3, 1], ['basij_bike', 9, 2], ['apc', 2, 3], ['pickup_mg', 2, 4]]) {
      const m = LOD2 ? (t === 'basij_bike' ? 3 : t === 'apc' || t === 'pickup_mg' ? 0 : 1) : LOWP ? Math.ceil(n / 2) : n;
      for (let i = 0; i < m; i++) { const o = make(t, { team: 'red' }); if (!o) continue; add(o); ST.addVehicle(o, lv, t === 'basij_bike' ? 'bike' : 'car'); VEH.push(o); }
    }
  }
  // Starlink dishes on the roofs of the districts that rose: a handful, as many as the city's terminals can stand for
  let DISH = [];
  function buildDishes() { DISH = []; for (let i = 0; i < (LOD2 ? 2 : LOWP ? 5 : 12); i++) { const o = make('starlink', { team: 'grey' }); if (!o) return; o.visible = false; add(o); DISH.push({ o, base: o.scale.x }); } }
  function streetPt(h, r) { if (ST && ST.gather && ST.gather[h] >= 0 && r === 0.13) return ST.node(ST.gather[h]); const a = HP[h], m = (a.length / 2) | 0, j = Math.floor(r * m) % Math.max(1, m); return [a[j * 2], a[j * 2 + 1]]; }
  // a figure of the people standing in district h (lives lost and phone lights are drawn where people actually are)
  function personIn(h, r) {
    const A = ST && ST.A; if (!A) return streetPt(h, r);
    const s0 = Math.floor(r * A.n);
    for (let t = 0; t < A.n; t++) { const i = (s0 + t) % A.n; if (A.st[i] && A.hex[i] === h && A.kind[i] === 0 && A.al[i] > 0.5) return [A.x[i], A.y[i]]; }
    return streetPt(h, 0.13);
  }

  let SNIP = [];
  function placeSnipers(hs) {
    if (!SNIP.length) for (let i = 0; i < (LOD2 ? 2 : 4); i++) { const o = make('irgc_soldier', { team: 'red' }); if (!o) break; o.visible = false; add(o); SNIP.push(o); }
    let n = 0;
    for (const h of hs) {
      const ln = ST && ST.lineOf(h); if (!ln) continue; const [gx, gy] = ST.node(ln.g);
      const cand = ROOFS.concat(LROOFS).filter(r => (r[0] - gx) ** 2 + (r[1] - gy) ** 2 < 160 * 160).sort((a, b) => b[2] - a[2]);
      for (const r of cand.slice(0, 2)) { const o = SNIP[n++]; if (!o) break; o.position.set(r[0], r[2], -r[1]); o.rotation.y = Math.atan2(gx - r[0], gy - r[1]); o.scale.setScalar(clamp(cam.dist / 250, 1, 2.4)); o.visible = true; }
    }
    for (; n < SNIP.length; n++) SNIP[n].visible = false;
  }
  // ---- glowing points: lives lost, arrests, phone lights at night
  let PTS = null, ptsGeo = null;
  function buildPoints() {
    const P = LOWP ? 1500 : 3500;
    PTS = { n: P, pos: new Float32Array(P * 3), col: new Float32Array(P * 3), sz: new Float32Array(P), al: new Float32Array(P), life: new Float32Array(P), max: new Float32Array(P), vx: new Float32Array(P), vy: new Float32Array(P), vz: new Float32Array(P), next: 0 };
    ptsGeo = new THREE.BufferGeometry();
    for (const [k, a, n] of [['position', PTS.pos, 3], ['col', PTS.col, 3], ['sz', PTS.sz, 1], ['al', PTS.al, 1]]) ptsGeo.setAttribute(k, new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage));
    const pm = new THREE.Points(ptsGeo, ptMat); pm.frustumCulled = false; add(pm);
  }
  function pt(x, y, z, c, sz, life, vx, vy, vz) {
    const i = PTS.next; PTS.next = (PTS.next + 1) % PTS.n;
    PTS.pos[i * 3] = x; PTS.pos[i * 3 + 1] = z; PTS.pos[i * 3 + 2] = -y; PTS.col[i * 3] = c[0]; PTS.col[i * 3 + 1] = c[1]; PTS.col[i * 3 + 2] = c[2];
    PTS.sz[i] = sz; PTS.life[i] = PTS.max[i] = life; PTS.vx[i] = vx || 0; PTS.vy[i] = vy || 0; PTS.vz[i] = vz || 0;
  }
  // rooftop chants at night: soft rings that rise from the roofs
  const RINGS = [];
  function chantRing(x, y, burst) {
    let r = RINGS.find(q => q.life <= 0);
    if (!r) { if (RINGS.length > (LOD2 ? 10 : 32)) return; const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); m.rotation.x = -Math.PI / 2; m.userData.shared = false; add(m); r = { m, life: 0 }; RINGS.push(r); }
    r.m.position.set(x, burst ? 6 : 18 + hash(x, y) * 10, -y); r.life = r.max = burst ? 3.2 : 2.4; r.big = burst ? 3.2 : 1; r.m.visible = true;
  }

  // ================================================================== the camera
  const cam = { tx: 0, ty: 0, dist: 20000, az: 0.35, tilt: 0.9, gtx: 0, gty: 0, gdist: 20000, gaz: 0.35, gtilt: 0.9, follow: true, user: -99 };
  function camHome(snap) {
    const R = BJ ? BJ.r : 9000;
    cam.gtx = 0; cam.gty = 0; cam.gdist = R * (PHONE() ? 1.9 : 1.25); cam.gaz = 0.4; cam.gtilt = 0.92;
    if (snap) { cam.tx = cam.gtx; cam.ty = cam.gty; cam.dist = cam.gdist * 1.4; cam.az = cam.gaz - 0.5; cam.tilt = cam.gtilt - 0.25; }
  }
  function camFly(x, y, dist) { cam.gtx = x; cam.gty = y; if (dist) cam.gdist = dist; }
  function camApply() {
    const k = REDUCED ? 1 : 0.09;
    cam.tx += (cam.gtx - cam.tx) * k; cam.ty += (cam.gty - cam.ty) * k; cam.dist += (cam.gdist - cam.dist) * k; cam.az += (cam.gaz - cam.az) * k; cam.tilt += (cam.gtilt - cam.tilt) * k;
    const el = cam.tilt, d = cam.dist;
    camera.position.set(cam.tx + d * Math.sin(el) * Math.sin(cam.az), d * Math.cos(el), -cam.ty + d * Math.sin(el) * Math.cos(cam.az));
    camera.lookAt(cam.tx, 0, -cam.ty);
    camera.far = Math.max(60000, d * 6); camera.near = Math.max(2, d / 3000);
    // on a phone the plan sheet covers the lower part of the board: the picture's centre moves up into the part that shows
    const cw = renderer.domElement.clientWidth || 1, ch = renderer.domElement.clientHeight || 1;
    const sheetUp = PHONE() && !RUN && !panel.classList.contains('min') ? Math.round(Math.min(panel.offsetHeight, ch * 0.62) * 0.5) : 0;
    // during a run on a computer the feed covers one side: the picture's centre moves into the free part, so what the camera
    // follows is never behind a panel (2 November 2026)
    const feedEl = RUN && !PHONE() ? D.getElementById('up-feed') : null, sideX = feedEl && !feedEl.hidden && feedEl.offsetParent ? Math.round((feedEl.offsetWidth + 24) / 2) * (FA ? -1 : 1) : 0;
    if (sheetUp || sideX) camera.setViewOffset(cw, ch, sideX, sheetUp, cw, ch); else if (camera.view && camera.view.enabled) camera.clearViewOffset();
    camera.updateProjectionMatrix();
    uPx.value = renderer.domElement.height * 1.2;
    scene.fog.density = 0.6 / Math.max(3000, d * 3.2);
    KU = 1;      // nothing is drawn larger than life as the camera rises any more: far away, the figures become dots
  }
  const ptrs = new Map(); let drag = null, moved = 0;
  canvas.addEventListener('pointerdown', ev => { canvas.setPointerCapture(ev.pointerId); ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); moved = 0; drag = { b: ev.button, sh: ev.shiftKey }; cam.user = clock; });
  canvas.addEventListener('pointermove', ev => {
    if (!ptrs.has(ev.pointerId)) { hover(ev); return; }
    const p = ptrs.get(ev.pointerId), dx = ev.clientX - p.x, dy = ev.clientY - p.y;
    moved += Math.abs(dx) + Math.abs(dy);
    if (ptrs.size === 2) {
      const [a, b] = Array.from(ptrs.values()); const d0 = Math.hypot(a.x - b.x, a.y - b.y), a0 = Math.atan2(b.y - a.y, b.x - a.x);
      p.x = ev.clientX; p.y = ev.clientY;
      const [a2, b2] = Array.from(ptrs.values()); const d1 = Math.hypot(a2.x - b2.x, a2.y - b2.y), a1 = Math.atan2(b2.y - a2.y, b2.x - a2.x);
      if (d1 > 0 && d0 > 0) cam.gdist = clamp(cam.gdist * d0 / d1, 120, (BJ ? BJ.r : 9000) * 4); cam.gaz -= (a1 - a0); cam.user = clock; return;
    }
    p.x = ev.clientX; p.y = ev.clientY;
    if (drag && (drag.b === 2 || drag.sh)) { cam.gaz -= dx * 0.005; cam.gtilt = clamp(cam.gtilt - dy * 0.004, 0.2, 1.3); }
    else {
      const sc = cam.dist / renderer.domElement.clientHeight * 1.1, ca = Math.cos(cam.az), sa = Math.sin(cam.az);
      cam.gtx += (-dx * ca - dy * sa * 1.4) * sc; cam.gty += (-dx * sa + dy * ca * 1.4) * sc;
      const R = BJ ? BJ.r * 1.3 : 12000, L = Math.hypot(cam.gtx, cam.gty); if (L > R) { cam.gtx *= R / L; cam.gty *= R / L; }
    }
    cam.user = clock;
  });
  // a double tap (or double click) flies the camera down to that spot; one tap opens what is there
  let lastTap = 0, lastXY = [0, 0];
  function focusAt(ev) { const g = groundAt(ev); if (!g) return; followOff(); camFly(g.x, g.y, clamp(cam.gdist * 0.42, 260, (BJ ? BJ.r : 9000) * 4)); cam.user = clock; }
  function followOff() { cam.follow = false; const b = D.getElementById('up-follow'); if (b) b.setAttribute('aria-pressed', 'false'); }
  const pup = ev => {
    ptrs.delete(ev.pointerId);
    if (!ptrs.size) {
      if (moved < 6 && ev.type === 'pointerup') { const t = performance.now(); if (t - lastTap < 330 && Math.hypot(ev.clientX - lastXY[0], ev.clientY - lastXY[1]) < 32) { focusAt(ev); lastTap = 0; } else { click(ev); lastTap = t; lastXY = [ev.clientX, ev.clientY]; } }
      drag = null;
    }
  };
  canvas.addEventListener('pointerup', pup); canvas.addEventListener('pointercancel', pup);
  canvas.addEventListener('contextmenu', ev => ev.preventDefault());
  canvas.addEventListener('wheel', ev => { ev.preventDefault(); cam.gdist = clamp(cam.gdist * Math.exp(ev.deltaY * 0.0012), 120, (BJ ? BJ.r : 9000) * 4); cam.user = clock; }, { passive: false });
  canvas.tabIndex = 0;
  { const cz = (id, f) => D.getElementById(id).addEventListener('click', () => { f(); cam.user = clock; });
    cz('up-cz-in', () => { cam.gdist = clamp(cam.gdist * 0.7, 120, (BJ ? BJ.r : 9000) * 4); });
    cz('up-cz-out', () => { cam.gdist = clamp(cam.gdist * 1.42, 120, (BJ ? BJ.r : 9000) * 4); });
    cz('up-cr-l', () => { cam.gaz += Math.PI / 8; }); cz('up-cr-r', () => { cam.gaz -= Math.PI / 8; });
    cz('up-chome', () => { followOff(); camHome(false); }); }
  canvas.addEventListener('keydown', ev => {
    const st = cam.dist * 0.08, k = ev.key;
    if (k === 'ArrowLeft') cam.gtx -= st; else if (k === 'ArrowRight') cam.gtx += st; else if (k === 'ArrowUp') cam.gty += st; else if (k === 'ArrowDown') cam.gty -= st;
    else if (k === '+' || k === '=') cam.gdist *= 0.85; else if (k === '-') cam.gdist *= 1.18; else if (k === 'q') cam.gaz += 0.15; else if (k === 'e') cam.gaz -= 0.15; else if (k === ' ') { ev.preventDefault(); togglePause(); } else return;
    ev.preventDefault(); cam.user = clock;
  });
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), v2 = new THREE.Vector2(), v3 = new THREE.Vector3();
  function groundAt(ev) {
    const r = canvas.getBoundingClientRect();
    v2.set((ev.clientX - r.left) / r.width * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v2, camera);
    return ray.ray.intersectPlane(plane, v3) ? { x: v3.x, y: -v3.z } : null;
  }
  function hexName(h) {
    if (h == null || h < 0 || !BJ) return tr('the city');
    const x = BJ.hex.x[h], y = BJ.hex.y[h];
    let best = null, bd = (BJ.s * 1.1) ** 2;
    for (const q of SITES) { const d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < bd && (q.oi != null || q.k === 'sq2' || q.k === 'uni' || q.k === 'bazaar')) { bd = d; best = q; } }
    if (best) return siteName(best);
    const a = Math.atan2(y, x), d = Math.hypot(x, y);
    if (d < BJ.r * 0.22) return tr('the city centre');
    return tr(['the eastern districts', 'the north-eastern districts', 'the northern districts', 'the north-western districts', 'the western districts', 'the south-western districts', 'the southern districts', 'the south-eastern districts'][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]);
  }
  const tip = D.getElementById('up-tip');
  function hover(ev) {
    if (!BJ || PHONE()) return;
    const g = groundAt(ev), h = g ? hxAt(g.x, g.y) : -1;
    if (h < 0) { tip.hidden = true; return; }
    tip.hidden = false;
    const sr = stage.getBoundingClientRect();
    tip.style.left = (ev.clientX - sr.left + 14) + 'px'; tip.style.top = (ev.clientY - sr.top + 14) + 'px';
    tip.innerHTML = hexTip(h, true, g);
  }
  function nearSec(g) { if (!g) return null; let best = null, bd = (BJ.s * 0.18) ** 2; for (const q of SEC) { const d = (q.x - g.x) ** 2 + (q.y - g.y) ** 2; if (d < bd) { bd = d; best = q; } } return best; }
  function hexTip(h, short, g) {
    const fr = curFrame();
    let s = `<b>${esc(hexName(h))}</b><span>${tf('{n} people live here', { n: big(BJ.hex.p[h]) })}</span>`;
    const q = nearSec(g);
    if (q) s += `<span class="up-tip-s">${embImg(q.k === 'basij' ? 'basij' : q.aff === 'Artesh' ? 'artesh' : q.aff === 'IRGC' ? 'irgc' : 'faraja', 'up-tip-e')} ${esc(FA ? (q.n || tr(SEC_K[q.k][0])) : (q.en || tr(SEC_K[q.k][0])))} · ${tr(AFF_T[q.aff] || q.aff)}${q.src === 'typical' ? ' · ' + tr('typical placement, not mapped') : ' · ' + tr('OpenStreetMap')}</span>`;
    if (fr) {
      const c = fr.c[h], f = fr.f[h], k = fr.k[h], al = fr.al[h], d = fr.dead[h];
      s += `<span>${tr('On the streets')}: <em class="up-g">${big(c)}</em> · ${tr('Forces')}: <em class="up-r">${big(f)}</em>${al > 1 ? ` · ${tr('Crossed over')}: <em class="up-b">${big(al)}</em>` : ''}</span>`;
      s += `<span>${k > 0.2 ? tr('Held by the people') : k < -0.2 ? tr('Held by the regime') : tr('Contested')}${d >= 1 ? ' · ' + tf('{n} lives lost', { n: fmt(d) }) : ''}</span>`;
    } else if (mode === 'cmd' && TOOL) s += `<span class="up-tipa">${tr(TOOL === 'start' ? 'Tap to start here, or to remove a start.' : TOOL === 'gather' ? 'Tap to set a gathering point here.' : 'Tap to add this district to the route.')}</span>`;
    return s;
  }
  // map tools in "I command": start districts, gathering points, routes
  let TOOL = null, routeDraft = [];
  function click(ev) {
    if (!BJ) return;
    const g = groundAt(ev), h = g ? hxAt(g.x, g.y) : -1;
    if (h < 0) { inspClose(); return; }
    if (!RUN && mode === 'cmd' && TOOL) { toolTap(h); tip.innerHTML = hexTip(h, false, g); return; }
    inspOpen(h, g);
  }
  function toolTap(h) {
    const P = S.plan;
    if (TOOL === 'start') {
      const ig = (P.ign && P.ign.length ? P.ign : autoIgn()).slice(), n = ig.indexOf(h);
      if (n >= 0) ig.splice(n, 1); else { if (ig.length >= 12) ig.shift(); ig.push(h); }
      P.ign = ig.length ? ig : null; P.adv = null;
    } else if (TOOL === 'gather') {
      const n = P.gather.findIndex(q => q.h === h);
      if (n >= 0) P.gather.splice(n, 1); else { if (P.gather.length >= 8) P.gather.shift(); P.gather.push({ h, t: 24 + (P.gather.length ? P.gather[P.gather.length - 1].t - 24 + 12 : 0) }); }
      P.adv = null;
    } else if (TOOL === 'route') {
      const last = routeDraft[routeDraft.length - 1];
      if (last == null) routeDraft.push(h);
      else if (h !== last) { const path = hexPath(last, h); for (const x of path.slice(1)) routeDraft.push(x); }
      drawRouteDraft();
      renderPane('moves'); return;
    }
    changed(); renderPane(TOOL === 'start' ? 'start' : 'moves');
  }
  function hexPath(a, b) {      // the shortest walk between two districts along the board (breadth first)
    const prev = new Int32Array(BJ.hex.x.length).fill(-2); prev[a] = -1; const q = [a];
    while (q.length) { const i = q.shift(); if (i === b) break; for (const j of BJ.hex.nb[i]) if (prev[j] === -2) { prev[j] = i; q.push(j); } }
    const out = []; let i = b; if (prev[b] === -2) return [a]; while (i !== -1) { out.push(i); i = prev[i]; } return out.reverse();
  }
  function autoIgn() {
    const B = U.prep(BJ), P = U.planOf(S), I = B.ign || {}, out = [];
    const ad = a => { for (const h of a || []) if (out.indexOf(h) < 0 && out.length < 8) out.push(h); };
    if (P.targets === 'garrison' || P.targets === 'centre' || P.targets === 'tv') { ad(I.uni); ad(I.bazaar); ad(I.edge); ad(I.centre); } else if (P.targets === 'roads') { ad(I.edge); ad(I.uni); ad(I.bazaar); } else { ad(I.edge); ad(I.uni); ad(I.bazaar); ad(I.centre); }
    return out;
  }

  // ---- the plan drawn on the board: start districts, gathering flags with their hour, routes as glowing arrows
  let planGrp = null, draftGrp = null;
  function routeMesh(hs, color, w) {
    // a route is drawn along the streets the crowd would walk (uprising-street.js pathXY), not straight over the roofs
    let pts = null;
    if (ST && ST.gather) { const xy = []; for (let n = 1; n < hs.length; n++) { const p = ST.pathXY(ST.gather[hs[n - 1]], ST.gather[hs[n]]); if (!p) { xy.length = 0; break; } for (let j = n > 1 ? 1 : 0; j < p.length; j++) xy.push(p[j]); } if (xy.length >= 2) pts = xy.map(q => new THREE.Vector3(q[0], 6, -q[1])); }
    if (!pts) pts = hs.map(h => new THREE.Vector3(BJ.hex.x[h], 6, -BJ.hex.y[h]));
    if (pts.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.1);
    const geo = new THREE.TubeGeometry(curve, Math.min(1200, Math.max(8, pts.length * 3)), Math.min(w, 9), 6, false);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }));
    const end = pts[pts.length - 1], prv = pts[pts.length - 2], dir = end.clone().sub(prv).normalize();
    w = Math.min(w, 9); const cone = new THREE.Mesh(new THREE.ConeGeometry(w * 3, w * 7, 10), m.material); cone.position.copy(end); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); m.add(cone);
    return m;
  }
  function drawPlanMarks() {
    if (!BJ) return;
    if (planGrp) { world.remove(planGrp); planGrp.traverse(m => { if (m.geometry) m.geometry.dispose(); }); }
    planGrp = new THREE.Group(); world.add(planGrp);
    if (RUN) return;
    const P = S.plan, ig = P.ign && P.ign.length ? P.ign : autoIgn();
    const N = BJ.hex.x.length;
    for (let i = 0; i < N; i++) { hexData[i * 4] = 0; hexData[i * 4 + 3] = 0; }
    for (const h of ig) { hexData[h * 4] = 150; hexData[h * 4 + 3] = 170; }
    hexTex.needsUpdate = true;
    { const set = new Set(ig); drawFront(i => set.has(i), true); }
    for (const r of P.routes) { const m = routeMesh(r, 0xffc54a, BJ.s * 0.035); if (m) planGrp.add(m); }
    for (const q of P.gather) {
      const f = make('flag_lionsun', { team: 'gold' }) || new THREE.Mesh(new THREE.ConeGeometry(6, 30, 8), new THREE.MeshBasicMaterial({ color: 0xffc54a }));
      f.scale.multiplyScalar(K ? G * 6 : G); f.position.set(BJ.hex.x[q.h], 0, -BJ.hex.y[q.h]); planGrp.add(f);
    }
    // where the people start: a small crowd stands there before Play
    if (ST && ST.A) { const want = new Int32Array(N); for (const h of ig) want[h] = LOWP ? 10 : 16; ST.setCrowdSize(want); ST.plan(0, want, null, true); for (let k = 1; k <= 5; k++) ST.plan(k, new Int32Array(N), null, true); placeIdleForces(); }
  }
  function placeIdleForces() {      // before Play: police at their stations, Basij at their bases
    if (!ST || !ST.A || !BJ) return;
    const N = BJ.hex.x.length, wr = new Int32Array(N), wb = new Int32Array(N);
    for (const q of SEC) { if (q.h < 0 || q.h >= N) continue; if (q.k === 'police_station' || q.k === 'police_hq' || q.k === 'special_police') wr[q.h] = Math.min(wr[q.h] + 2, 8); if (q.k === 'basij') wb[q.h] = Math.min(wb[q.h] + 2, 6); }
    let tr_ = 0, tb = 0; for (let i = 0; i < N; i++) { tr_ += wr[i]; tb += wb[i]; }
    const fr = Math.min(1, RIOT.n * 0.5 / (tr_ || 1)), fb = Math.min(1, BAS.n * 0.5 / (tb || 1));
    for (let i = 0; i < N; i++) { wr[i] = Math.round(wr[i] * fr); wb[i] = Math.round(wb[i] * fb); }
    ST.plan(1, wr, null, true); ST.plan(2, wb, null, true);
  }
  function drawRouteDraft() {
    if (draftGrp) { world.remove(draftGrp); draftGrp.traverse(m => { if (m.geometry) m.geometry.dispose(); }); draftGrp = null; }
    if (routeDraft.length >= 2) { draftGrp = routeMesh(routeDraft, 0xffffff, BJ.s * 0.03); if (draftGrp) world.add(draftGrp); }
  }

  // ================================================================== the frame loop
  let clock = 0, lastT = performance.now(), visible = true, fpsAcc = 0, fpsN = 0, FPS = 60;
  // ?debug=1: the frame's triangles and draw calls on screen (the phone budget is about 200,000 and 80)
  const DBG = /[?&]debug=1/.test(location.search) ? (() => { const d = D.createElement('div'); d.id = 'up-dbg'; d.className = 'up-dbg'; ui.appendChild(d); return d; })() : null;
  const io = 'IntersectionObserver' in W ? new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; }, { threshold: 0.01 }) : null;      // the newest entry decides
  if (io) io.observe(stage);
  function size() {
    // the board fills exactly the first screen under the site's own header, whatever that header's height is on this device
    const topY = stage.getBoundingClientRect().top + (W.scrollY || 0), want = Math.max(PHONE() ? 520 : 600, Math.round(W.innerHeight - topY));
    if (Math.abs(stage.offsetHeight - want) > 2) stage.style.height = want + 'px';
    const r = stage.getBoundingClientRect(), w = Math.max(300, r.width), h = Math.max(360, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  W.addEventListener('resize', size); size();
  let frameErr = 0;
  let rafN = 0;
  function frame(now) {
    requestAnimationFrame(frame); rafN++;
    try { frameBody(now); } catch (e) { if (frameErr++ < 3) console.error('Uprising Simulator frame:', e && e.stack || e); }      // one bad frame never stops the board
  }
  function frameBody(now) {
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    if (!visible && (frame.k = (frame.k || 0) + 1) % 30 === 0) { const r = stage.getBoundingClientRect(); visible = r.bottom > 0 && r.top < W.innerHeight; }      // never stay asleep on a stale report
    if (!visible || D.hidden || !BJ || !SIMV()) return;
    clock += dt; U_.uTime.value = clock;
    fpsAcc += dt; fpsN++; if (fpsAcc > 1) { FPS = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
    playTick(dt);
    camApply();
    // everyone moves on the streets (uprising-street.js): simulated seconds a real second while the run plays, real time otherwise
    if (ST) {
      const simRate = RUN && playing ? 3600 * speed * pace / HOUR_S : 0, fs = clamp(cam.dist / 250, 1, 2.4);
      ST.step(dt, simRate, cam.dist); ST.stepVehicles(dt, simRate, cam.dist, clamp(cam.dist / 600, 1, 2.5)); ST.draw(cam.dist, fs, clock, dt, [cam.tx, cam.ty]);
    }
    stepFocus(); maybeLocal();
    if (K) K.tick(dt, clock);
    if (FX) FX.update(dt, clock);
    if (PTS) {
      const P = PTS;
      for (let i = 0; i < P.n; i++) {
        if (P.life[i] <= 0) { P.al[i] = 0; continue; }
        P.life[i] -= dt; const u = clamp(P.life[i] / P.max[i], 0, 1);
        P.pos[i * 3] += P.vx[i] * dt; P.pos[i * 3 + 1] += P.vz[i] * dt; P.pos[i * 3 + 2] -= P.vy[i] * dt;
        P.al[i] = Math.min(1, u * 2.2) * (0.7 + 0.3 * Math.sin(clock * 5 + i));
      }
      ptsGeo.attributes.position.needsUpdate = true; ptsGeo.attributes.al.needsUpdate = true; ptsGeo.attributes.col.needsUpdate = true; ptsGeo.attributes.sz.needsUpdate = true;
    }
    for (const r of RINGS) if (r.life > 0) { r.life -= dt; const u = 1 - r.life / r.max; r.m.scale.setScalar((20 + 160 * u) * (r.big || 1)); r.m.material.opacity = (r.big > 1 ? 0.85 : 0.5) * (1 - u); if (r.life <= 0) r.m.visible = false; }
    if (!RUN && !REDUCED && clock - cam.user > 8 && !TOOL) cam.gaz += dt * 0.02;      // the board turns slowly while nobody touches it
    renderer.render(scene, camera);
    placeLabels();
    if (DBG && fpsN === 0) DBG.textContent = `${renderer.info.render.triangles} triangles · ${renderer.info.render.calls} draw calls · ${Math.round(FPS)} fps · ${LOD2 ? 'phone' : LOWP ? 'low' : 'full'} detail`;
  }
  const pv = new THREE.Vector3();
  // NAMES NEVER PILE UP, NEVER RUN OFF THE BOARD, NEVER SIT UNDER A PANEL (the Conflict Simulator's placer, wargame.js
  // placeTags, the same method): the most important places are named first; each name tries four spots around its place
  // (above, below, right, left) with a 4px margin, and is dropped when every spot would cover a name already shown, another
  // place's marker, any panel over the board, or run past the board's edge. Real sizes from the page; placed every other frame.
  let labTick = 0, hudBox = [], hudT = 0;
  const HUDSEL = '.up-top, .up-hud, .up-panel, .up-feed, .up-cap, .up-bar, .up-legend, .up-camc, .up-dossier, .up-toolhint, .up-insp, .up-flash';
  function hudRects() {
    const now = performance.now(); if (now - hudT < 400) return hudBox; hudT = now;
    const r0 = stage.getBoundingClientRect();
    hudBox = $$(HUDSEL, ui).filter(e => !e.hidden && e.offsetParent !== null && getComputedStyle(e).display !== 'none')
      .map(e => { const r = e.getBoundingClientRect(); return [r.left - r0.left - 3, r.top - r0.top - 3, r.width + 6, r.height + 6]; }).filter(q => q[2] > 10 && q[3] > 10);
    return hudBox;
  }
  const overB = (a, k) => a[0] < k[0] + k[2] && a[0] + a[2] > k[0] && a[1] < k[1] + k[3] && a[1] + a[3] > k[1];
  function measureLab(el) { const was = el.style.display; el.style.visibility = 'hidden'; el.style.display = ''; const r = el.getBoundingClientRect(); el._w = Math.ceil(r.width) || 80; el._h = Math.ceil(r.height) || 20; el.style.display = was; el.style.visibility = ''; }
  W.addEventListener('resize', () => { for (const el of labelEls) el._w = 0; for (const el of CHIPS) el._t = null; hudT = 0; });
  // AT MOST THIS MANY PLACE NAMES AT ONCE (2 November 2026: "messy, chaotic, cluttered"), plus at most three counts
  const LABCAP = () => (PHONE() ? 4 : RUN ? 7 : 9);
  function placeLabels(force) {
    if (!force && (labTick++ & 1)) return;
    const w = stage.clientWidth, h = stage.clientHeight, near = cam.dist < BJ.r * 0.7, mid = cam.dist < BJ.r * 1.6;
    const kept = hudRects().slice(), cand = [], marks = [];
    for (const n of LORDER) {
      const b = beacons[n], el = labelEls[n], q = b.q;
      const show = RUN ? (q.oi != null || (near && q.sec && q.k === 'irgc_hq')) : q.sec ? (near || (mid && (q.k === 'irgc_hq' || q.k === 'special_police'))) : (q.oi != null || mid);
      if (show) { pv.copy(b.top).project(camera); if (pv.z <= 1 && pv.x > -1.02 && pv.x < 1.02 && pv.y > -1.02 && pv.y < 1.02) { const X = (pv.x + 1) / 2 * w, Y = (1 - pv.y) / 2 * h; cand.push([n, X, Y]); marks.push([n, [X - 7, Y - 7, 14, 14]]); continue; } }
      if (el.style.display !== 'none') el.style.display = 'none';
    }
    let placed = 0; const cap = LABCAP();
    for (let ci = 0; ci < cand.length; ci++) {
      const [n, X, Y] = cand[ci], el = labelEls[n];
      if (placed >= cap) { if (el.style.display !== 'none') el.style.display = 'none'; continue; }      // a few names, the most important first
      if (!el._w) measureLab(el);
      const M4 = 4, tw = el._w + 2 * M4, th = el._h + 2 * M4;
      const spots = [[X - tw / 2, Y - th - 4], [X - tw / 2, Y + 6], [X + 9, Y - th / 2], [X - 9 - tw, Y - th / 2]];
      let ok = false, box = null;
      for (let sp = 0; sp < spots.length && !ok; sp++) {
        box = [spots[sp][0], spots[sp][1], tw, th];
        ok = box[0] >= 2 && box[1] >= 2 && box[0] + tw <= w - 2 && box[1] + th <= h - 2;
        for (let i = 0; ok && i < kept.length; i++) if (overB(box, kept[i])) ok = false;
        for (let j = 0; ok && j < ci; j++) if (overB(box, marks[j][1])) ok = false;      // never over a more important place's marker
      }
      if (!ok) { if (el.style.display !== 'none') el.style.display = 'none'; continue; }
      kept.push(box); placed++;
      el.style.display = ''; el.style.transform = `translate(${Math.round(box[0] + M4)}px,${Math.round(box[1] + M4)}px)`;
    }
    placeChips(kept, w, h);
  }
  const CHIPS = [];
  function placeChips(kept, w, h) {
    const fr = curFrame();
    if (!fr) { for (const c of CHIPS) c.style.display = 'none'; return; }
    const N = BJ.hex.x.length, C = [], F = [];
    for (let i = 0; i < N; i++) { if (fr.c[i] > 1500) C.push(i); if (fr.f[i] > 400) F.push(i); }
    C.sort((a, b) => fr.c[b] - fr.c[a]); F.sort((a, b) => fr.f[b] - fr.f[a]);
    const want = C.slice(0, PHONE() ? 1 : 2).map(i => [i, 'p', fr.c[i]]).concat(F.slice(0, 1).map(i => [i, 'f', fr.f[i]]));
    while (CHIPS.length < want.length) { const el = D.createElement('div'); el.className = 'up-cchip'; labels.appendChild(el); CHIPS.push(el); }
    CHIPS.forEach((el, n) => {
      const q = want[n]; if (!q) { el.style.display = 'none'; return; }
      { const [gx, gy] = streetPt(q[0], 0.13); pv.set(gx, 22 * G, -gy).project(camera); }
      if (pv.z > 1 || Math.abs(pv.x) > 1 || Math.abs(pv.y) > 1) { el.style.display = 'none'; return; }
      const X = (pv.x + 1) / 2 * w + (q[1] === 'f' ? 26 : -26), Y = (1 - pv.y) / 2 * h;
      el.className = 'up-cchip ' + q[1]; el.textContent = (q[1] === 'p' ? '◉ ' : '⛨ ') + big(q[2]);
      if (el._t !== el.textContent) { el._t = el.textContent; measureLab(el); }
      const bx = [X - el._w / 2 - 3, Y - el._h / 2 - 3, el._w + 6, el._h + 6];
      if (bx[0] < 2 || bx[1] < 2 || bx[0] + bx[2] > w - 2 || bx[1] + bx[3] > h - 2 || kept.some(k => overB(bx, k))) { el.style.display = 'none'; return; }
      kept.push(bx); el.style.display = ''; el.style.transform = `translate(${Math.round(bx[0] + 3)}px,${Math.round(bx[1] + 3)}px)`;
    });
  }
  // for the phone test: pairs of names that overlap, and names cut by the board's edge or sitting on a panel (both must be 0)
  function tagOverlaps() {
    const r0 = stage.getBoundingClientRect(), hud = hudRects().map(q => [q[0] + 3, q[1] + 3, q[2] - 6, q[3] - 6]);
    const R2 = labelEls.concat(CHIPS).filter(t => t.style.display !== 'none' && t.offsetParent !== null).map(t => { const r = t.getBoundingClientRect(); return [r.left - r0.left, r.top - r0.top, r.width, r.height]; });
    let overlap = 0, clipped = 0;
    for (let i = 0; i < R2.length; i++) {
      const a = R2[i]; if (a[0] < 0 || a[1] < 0 || a[0] + a[2] > r0.width || a[1] + a[3] > r0.height || hud.some(k => overB(a, k))) clipped++;
      for (let j = i + 1; j < R2.length; j++) if (overB(a, R2[j])) overlap++;
    }
    return { overlap, clipped, shown: R2.length };
  }
  // day and night: the sun sets, the streets light up, the windows glow where the power is on
  function lightFor(hr) {
    const night = hr >= 20 || hr < 5 ? 1 : hr >= 18 ? (hr - 18) / 2 : hr < 7 ? (7 - hr) / 2 : 0;
    U_.uNight.value = night;
    const gold = hr >= 16 && hr < 20 ? 1 - Math.abs(hr - 18) / 2 : hr >= 5 && hr < 8 ? 1 - Math.abs(hr - 6.5) / 1.5 : 0;
    if (LIGHTS) {
      LIGHTS.sun.intensity = 2.4 * (1 - night) + 0.9 * night; LIGHTS.hemi.intensity = 1.25 * (1 - night * 0.3);      // night is moonlight: darker and bluer, still readable (2 November 2026)
      LIGHTS.sun.color.setHex(night > 0.3 ? 0x9bb4ff : gold > 0.2 ? 0xffb070 : hr >= 16 || hr < 8 ? 0xffc890 : 0xfff1dc);
      // the sun crosses the sky: up in the east in the morning, low in the west at dusk (the moon stands high at night)
      const a = clamp((hr - 6) / 12, 0, 1) * Math.PI, R0 = 1200;
      if (LIGHTS.sun.position) { if (night > 0.5) LIGHTS.sun.position.set(-300, 1100, 400); else LIGHTS.sun.position.set(Math.cos(a) * R0, 260 + Math.sin(a) * 900 + 120, 380); }
    }
    const sky = new THREE.Color(night > 0.5 ? 0x0b0f16 : 0x111418).lerp(new THREE.Color(0x231a14), gold * 0.45 * (1 - night));
    renderer.setClearColor(sky, 1); if (scene.fog) scene.fog.color.copy(sky);
    if (LAMPS) LAMPS.visible = night > 0.04;
    return night;
  }

  // ================================================================== the hex state texture
  function hexStateClear() {
    hexData.fill(0);
    const N = BJ.hex.x.length;
    for (let i = 0; i <= N && i < HEXW; i++) { hexData[i * 4 + 1] = i < N ? 70 : 0; hexData[i * 4 + 2] = 255; }
    hexTex.needsUpdate = true;
    lightFor(S.hour);
    drawPlanMarks();
  }

  // ================================================================== one run, watched
  let RUN = null, playing = false, speed = 1, tPos = 0, frameShown = -1, runStale = false, lastFrameShown = -1;
  const bar = D.getElementById('up-bar'), scrub = D.getElementById('up-scrub');
  function curFrame() { if (!RUN) return null; const fi = clamp(lastFrameShown, 0, RUN.rec.c.length - 1); return { c: RUN.rec.c[fi], f: RUN.rec.f[fi], k: RUN.rec.k[fi], al: RUN.rec.al[fi], dead: RUN.rec.dead[fi] }; }
  function markRunStale() { runStale = true; }
  // THE PACE (2 November 2026): 1× is one simulated hour every two seconds (HOUR_S). Around the moment that matters the run
  // slows to under a third for a few seconds while the camera frames it; through quiet hours, when the streets are empty and
  // nothing is about to happen, it runs three times as fast. The bar says which.
  const HOUR_S = 2; let pace = 1, slowUntil = 0, quietNow = false;
  function play(seed, why) {
    stopPlay();
    const o = U.run(BJ, S, seed, { record: true });
    o.seed = seed; o.why = why || null;
    RUN = o; runStale = false;
    { let a = [0, 0, 0, 0, 0, 0]; RUN.cum = o.rec.g.map(x => (a = [a[0] + x.F, a[1] + (x.net && o.X.year >= 1995 ? 1 : 0), a[2] + (x.sig.oil || 0), a[3] + (x.sig.bazaar || 0), a[4] + (x.sig.truck || 0), a[5] + (x.sig.civil || 0)])); }
    RUN.O = objectives();
    let maxC = 1, maxF = 1; for (const g of o.rec.g) { if (g.C > maxC) maxC = g.C; if (g.F > maxF) maxF = g.F; }
    RUN.peakC = maxC;
    RUN.xP = Math.max(1, maxC / (PPL ? PPL.n * 0.92 : 1000));
    RUN.xF = Math.max(1, maxF / ((RIOT ? RIOT.n + BAS.n + IRG.n : 600) * 0.85));
    RUN.xD = Math.max(1, (o.dead || 1) / (LOWP ? 300 : 700));
    tPos = 0; frameShown = -1; lastFrameShown = -1; playing = true;
    bar.hidden = false; scrub.max = String(o.rec.c.length - 1); scrub.value = '0';
    drawMarks(); feedReset(); setPP();
    tog(box, 'running', true); D.getElementById('up-feed').hidden = false; capEl.hidden = false; dossier.hidden = true;
    if (PHONE()) sheet(false);
    if (planGrp) { world.remove(planGrp); planGrp = null; }
    if (ST) ST.planVehicles([], 0, true);
    cam.follow = true; D.getElementById('up-follow').setAttribute('aria-pressed', 'true');
    caption(tr('Hour one.') + ' ' + narr('start'));
    renderLegend();
  }
  function stopPlay() { playing = false; setPP(); }
  function endRun() {
    if (ST) { ST.setTraffic(1); ST.planVehicles([], 0, true); } for (const o of SNIP) o.visible = false;
    stopPlay(); RUN = null; bar.hidden = true; tog(box, 'running', false); D.getElementById('up-feed').hidden = true; capEl.hidden = true; tog(stage, 'net-cut', false);
    if (ST) ST.planVehicles([], 0, true); for (const o of CHKO) o.visible = false; for (const d of DISH) d.o.visible = false; if (FX) FX.clear(); if (SHOPS.open) { SHOPS.open.visible = true; if (SHOPS.shut) SHOPS.shut.visible = false; }
    hexStateClear(); hudIdle(); camHome(false); if (mode === 'adv') renderAdv(); renderLegend();
  }
  function togglePause() { if (!RUN) return; if (tPos >= RUN.rec.c.length - 1) { tPos = 0; frameShown = -1; feedReset(); } playing = !playing; setPP(); }
  function setPP() { const b = D.getElementById('up-pp'); b.textContent = playing ? '❚❚' : '▶'; b.setAttribute('aria-label', playing ? tr('Pause') : tr('Play')); }
  function playTick(dt) {
    if (!RUN) return;
    const nT = RUN.rec.c.length;
    if (playing) {
      pace = clock < slowUntil ? 0.3 : quietNow ? 3 : 1;
      tPos += dt * speed * pace / HOUR_S * (RUN.X.hours > 400 ? 2 : 1);
      const pe = D.getElementById('up-pace'), pt_ = pace < 1 ? tr('Slowed down: this matters') : pace > 1 ? tr('Quiet hours, moving faster') : '';
      if (pe && pe.textContent !== pt_) { pe.textContent = pt_; pe.hidden = !pt_; }
      if (tPos >= nT - 1) { tPos = nT - 1; playing = false; setPP(); setTimeout(() => { if (RUN && !playing && tPos >= nT - 1) openResults(); }, 1200); }
    }
    const fi = Math.floor(tPos);
    if (fi !== frameShown) { showFrame(fi, Math.abs(fi - frameShown) > 1); frameShown = fi; if (D.activeElement !== scrub) scrub.value = String(fi); }
  }
  scrub.addEventListener('input', () => { if (!RUN) return; playing = false; setPP(); tPos = +scrub.value; feedReset(); });
  D.getElementById('up-pp').addEventListener('click', togglePause);
  $$('.up-spd button', bar).forEach(b => b.addEventListener('click', () => { speed = +b.dataset.spd; $$('.up-spd button', bar).forEach(x => { tog(x, 'on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); }));
  D.getElementById('up-follow').addEventListener('click', ev => { cam.follow = !cam.follow; ev.currentTarget.setAttribute('aria-pressed', String(cam.follow)); if (cam.follow) cam.user = -99; });
  D.getElementById('up-back').addEventListener('click', endRun);
  D.getElementById('up-resb').addEventListener('click', () => openResults());
  function drawMarks() {      // the timeline's notches: days, and the events that matter
    const m = D.getElementById('up-marks'), n = RUN.rec.c.length; let h = '';
    for (let d = 1; d * 24 < n; d++) h += `<i class="d" style="left:${(d * 24 / (n - 1) * 100).toFixed(2)}%"></i>`;
    for (const e of RUN.ev) { const c = MARK[e.type]; if (c) h += `<i class="e ${c}" style="left:${(e.t / (n - 1) * 100).toFixed(2)}%" title="${esc(evText(e) || '')}"></i>`; }
    m.innerHTML = h;
  }
  const MARK = { massacre: 'bad', netcut: 'bad', occupy: 'bad', take: 'good', defect: 'good', split: 'good', army: 'good', liberated: 'good', crushed: 'bad', strike: 'good', counter: 'bad', armyrule: 'good' };

  // how many effects burn at once (gas, fire, a burst of shots): capped, so a frame never turns into fireworks
  const FXCAP = LOWP ? 6 : 12, FXL = []; let FXMAX = 0;
  function fxOk(sec) { const now = clock; for (let i = FXL.length - 1; i >= 0; i--) if (FXL[i] < now) FXL.splice(i, 1); if (FXL.length >= FXCAP) return false; FXL.push(now + sec); if (FXL.length > FXMAX) FXMAX = FXL.length; return true; }
  let lastG = null, quietAt = -99, lastXP = -1, lastCamFi = -99;
  function showFrame(fi, jump) {
    const fr = RUN.rec, N = BJ.hex.x.length;
    const c = fr.c[fi], f = fr.f[fi], k = fr.k[fi], al = fr.al[fi], pw = fr.pw[fi], g = fr.g[fi], dead = fr.dead[fi];
    let cmax = 1; for (let i = 0; i < N; i++) if (c[i] > cmax) cmax = c[i];
    for (let i = 0; i < N; i++) {
      hexData[i * 4] = Math.round(clamp(k[i], 0, 1) * 255); hexData[i * 4 + 1] = Math.round(clamp(-k[i], 0, 1) * 200);
      hexData[i * 4 + 2] = pw[i] ? 255 : 0; hexData[i * 4 + 3] = Math.round(clamp(Math.sqrt(c[i] / cmax), 0, 1) * 255 * (c[i] > 20 ? 1 : 0));
    }
    hexTex.needsUpdate = true;
    const night = lightFor(g.hr);
    // the figures: how many of each kind each district holds this hour (each figure stands for RUN.xP people); where they
    // walk and stand is uprising-street.js
    const wp = new Int32Array(N), wr = new Int32Array(N), wb = new Int32Array(N), wi = new Int32Array(N), wd = new Int32Array(N), wm = new Int32Array(N), cont = new Uint8Array(N);
    const coreOn = g.Lv >= 3, bsecOn = g.Lv >= 2;
    // how many figures stand for the people this hour: the square root of the hour's share of the peak, so an early hour with a
    // twentieth of the peak still shows a quarter of the figures; each figure's worth this hour is in the key (RUN.xP)
    { let C = 0; for (let i = 0; i < N; i++) C += c[i]; const F = Math.max(1, (PPL ? PPL.n : 600) * 0.9 * Math.sqrt(clamp(C / Math.max(1, RUN.peakC || C), 0, 1))); RUN.xP = Math.max(1, C / F); if (lastXP !== Math.round(RUN.xP / 50)) { lastXP = Math.round(RUN.xP / 50); renderLegend(); } }
    for (let i = 0; i < N; i++) {
      wp[i] = Math.round(c[i] / RUN.xP);
      const fu = f[i] / RUN.xF;
      wr[i] = Math.round(fu * (coreOn ? 0.45 : bsecOn ? 0.55 : 0.65)); wb[i] = Math.round(fu * (coreOn ? 0.3 : bsecOn ? 0.45 : 0.35)); wi[i] = coreOn ? Math.round(fu * 0.25) : 0;
      wd[i] = Math.round(al[i] / RUN.xF);
      wm[i] = S.plan.medics > 0.45 && c[i] > 200 && f[i] > 20 ? Math.min(3, Math.round(S.plan.medics * 3)) : 0;
      cont[i] = c[i] > 50 && f[i] > 10 ? 1 : 0;      // forces facing a crowd stand as a line across its avenue
      // no lone figure stands for a district: a crowd is at least three figures, a squad at least two, or none is drawn
      if (wp[i] < 3) wp[i] = 0; if (wr[i] < 2) wr[i] = 0; if (wb[i] < 2) wb[i] = 0; if (wi[i] < 2) wi[i] = 0; if (wd[i] < 2) wd[i] = 0;
    }
    if (ST && ST.A) {
      ST.setCrowdSize(wp, c);
      ST.plan(0, wp, null, jump); ST.plan(1, wr, cont, jump); ST.plan(2, wb, cont, jump); ST.plan(3, wi, cont, jump); ST.plan(5, wm, null, jump);
    }
    // a squad crossing over: a few police leave the line and walk to the people
    if (lastG && g.def - lastG.def > Math.max(5, RUN.F0 * 0.0015) && !jump) {
      let bh = -1, bv = 0; for (let i = 0; i < N; i++) { const dv = al[i] - (fr.al[fi - 1] ? fr.al[fi - 1][i] : 0); if (dv > bv) { bv = dv; bh = i; } }
      if (bh >= 0) { flashOn(bh, tr('A unit crosses over'), 'good'); }
    }
    if (ST && ST.A) ST.plan(4, wd, null, jump);
    // the forces' vehicles drive to the biggest concentrations of force, by the rung of force in use
    const order = Array.from({ length: N }, (_, i) => i).filter(i => f[i] > 20).sort((a, b) => f[b] - f[a]);
    if (ST) ST.planVehicles(order.filter(i => cont[i]).concat(order.filter(i => !cont[i])).slice(0, 6), g.Lv, jump);
    // SHOOTERS ON THE ROOFS (documented: Zahedan 30 Sep 2022, on the police station's roof; Tehran and Semnan, 8 Jan 2026,
    // "stationed on rooftops hours beforehand"): from live fire on, two or three stand on the tallest roofs beside the line
    placeSnipers(g.Lv >= 3 ? order.filter(i => cont[i]).slice(0, 2) : []);
    // Starlink: dishes on the roofs where the crowds are, more of them the more terminals the city has
    { const sl = RUN.X.starlink || 0, nd = Math.min(DISH.length, Math.round(sl / 400)), hs = order.length ? order : [0]; let di = 0;
      for (const d of DISH) { if (di >= nd || !g.net) { d.o.visible = false; di++; continue; } const h = hs[di % hs.length], [x, y] = streetPt(h, hash(di, 77)); d.o.position.set(x + 18, 9, -(y + 12)); d.o.scale.setScalar(d.base); d.o.visible = true; di++; } }
    // traffic thins as the strike stops the trucks and the shops, as the shooting starts, and at night
    if (ST) ST.setTraffic(clamp(1 - 0.85 * Math.max((g.sig && g.sig.truck) || 0, ((g.sig && g.sig.bazaar) || 0) * 0.6, g.Lv >= 3 ? 0.65 : g.Lv >= 2 ? 0.35 : 0) - (night > 0.5 ? 0.35 : 0), 0.05, 1));
    // checkpoints go up once the regime moves past batons, or the internet is cut
    for (const o of CHKO) o.visible = !!g.chk;
    // the strike: shops shut their shutters
    const shut = g.sig && g.sig.bazaar > 0.3;
    if (SHOPS.open && SHOPS.shut) { SHOPS.open.visible = !shut; SHOPS.shut.visible = shut; }
    tog(stage, 'net-cut', !!g.net);
    // the fight, where a line faces a crowd: gas from the first rung, birdshot, then live fire from the line into the crowd;
    // barricades burn at the junctions the people hold. Never more than FXCAP effects burn at once (the clutter he saw).
    if (!jump && FX && !REDUCED) {
      let shots = 0; const ns = LOWP ? 4 : 9;
      for (const i of order.slice(0, LOWP ? 4 : 8)) {
        if (c[i] < 80) continue;
        const ln = ST && cont[i] ? ST.lineOf(i) : null, [px, py] = ln ? ST.node(ln.g) : streetPt(i, 0.13), [fx_, fy_] = ln ? ST.node(ln.back) : [px, py];
        if (g.Lv >= 1 && hash(i, fi) < 0.5 && fxOk(7)) FX.gas(new THREE.Vector3(px + (hash(i, fi + 1) - 0.5) * 30, 0.5, -(py + (hash(i, fi + 2) - 0.5) * 30)), 16, 7);
        if (g.Lv >= 2 && ln) {
          const n = g.Lv >= 4 ? 3 : g.Lv >= 3 ? 2 : 1;
          for (let s = 0; s < n && shots < ns && fxOk(1); s++, shots++) {
            const a = new THREE.Vector3(fx_ + (hash(s, fi) - 0.5) * 10, 1.6, -(fy_ + (hash(s, fi + 3) - 0.5) * 10)), b = new THREE.Vector3(px + (hash(s, fi + 4) - 0.5) * 30, 1.2, -(py + (hash(s, fi + 5) - 0.5) * 30));
            FX.muzzle(a, 2);
            if (g.Lv >= 3) FX.tracer(a, b, 0xffb347);
          }
        }
        if (k[i] > 0.35 && S.plan.blockade > 0.3 && hash(i, Math.floor(fi / 6)) < 0.4 && fxOk(5)) { FX.fire(new THREE.Vector3(px, 1, -py), 5, 4); FX.smoke(new THREE.Vector3(px, 4, -py), 9, 5); }
      }
    }
    // the lives lost: a quiet white light rises where each one fell, among the people (one light for several on a big toll)
    if (!jump && fi > 0) {
      const d0 = fr.dead[fi - 1];
      for (let i = 0; i < N; i++) {
        const nd = (dead[i] - d0[i]) / RUN.xD; let n = Math.floor(nd) + (hash(i, fi) < nd % 1 ? 1 : 0);
        while (n-- > 0) { const [x, y] = personIn(i, hash(i, n + fi)); pt(x, y, 3, [1, 1, 0.96], 9, 7, 0, 0, 4); }
      }
      // arrests: pale grey points led away toward the nearest police station
      const da = g.arr - (lastG ? lastG.arr : 0); let na = Math.min(30, Math.round(da / Math.max(1, RUN.xD * 3)));
      for (const i of order.slice(0, 6)) { if (na <= 0) break; const st = SEC.find(q => (q.k === 'police_station' || q.k === 'police_hq') && Math.abs(q.x - BJ.hex.x[i]) < BJ.s * 2.5 && Math.abs(q.y - BJ.hex.y[i]) < BJ.s * 2.5); const [x, y] = personIn(i, hash(i, fi + 7)); const tx = st ? st.x : BJ.hex.x[i], ty = st ? st.y : BJ.hex.y[i]; pt(x, y, 3, [0.78, 0.8, 0.85], 7, 4, (tx - x) / 4, (ty - y) / 4, 0); na--; }
      // night: phone lights over the crowds, and rooftop chants where the plan acts at night
      if (night > 0.5 && ST && ST.A) {
        const A = ST.A; let n = 0; for (let p = 0; p < A.n && n < (LOWP ? 120 : 360); p += 3) if (A.st[p] && A.kind[p] === 0 && A.al[p] > 0.5) { pt(A.x[p], A.y[p], 2.4, [1, 0.97, 0.85], 5, 1.4, 0, 0, 0); n++; }
        if (S.plan.night > 0.35 && g.hr % 2 === 0) for (let i = 0; i < N; i += 7) if (c[i] > 20 || hash(i, fi) < 0.15) { const [x, y] = streetPt(i, hash(i, 3)); chantRing(x, y); }
      }
    }
    // where the people are, most of all where forces face them (the camera's subject and a city-wide moment's place)
    { let bh = -1, bv = 0; for (let i = 0; i < N; i++) { const v = c[i] * (1 + 2 * Math.min(1, f[i] / Math.max(1, c[i]))) * (1 + 0.5 * Math.max(0, k[i])); if (v > bv) { bv = v; bh = i; } } clashH = bh; }
    lastFrameShown = fi;
    hud(g, fi); feedTo(fi);
    // when the streets have emptied, say so in plain words, so a small number beside a massacre does not read as a mistake
    if (fi > 24 && g.C < RUN.peak * 0.04 && fi - quietAt > 12 && !RUN.ev.some(e => e.t > fi - 6 && e.t <= fi && evText(e))) {
      const killed = RUN.ev.some(e => e.t <= fi && (e.type === 'massacre' || e.type === 'occupy'));
      caption(tr(g.sigma > 0.25 ? 'The streets are empty, but the strike holds: people stay home and the shops stay shut.' : killed ? 'The streets have emptied after the killing. People stay home, and the regime holds the city.' : 'The streets are quiet now. Few people are out.'));
      quietAt = fi;
    }
    // the places taken
    for (const b of beacons) if (b.q.oi != null && b.ring) { const held = g.held && g.held[b.q.oi]; b.ring.material.color.setHex(held ? 0xffd36b : 0xff3b4f); tog(labelEls[beacons.indexOf(b)], 'held', !!held); }
    // the front: a crisp line round the districts the people hold
    drawFront(i => k[i] > 0.25);
    // quiet hours: the streets are nearly empty and nothing is about to happen, so the run moves faster through them
    quietNow = !jump && fi > 6 && g.C < Math.max(50, RUN.peak * 0.03) && !RUN.ev.some(e => e.t > fi && e.t <= fi + 4 && (BAD[e.type] || GOOD[e.type]));
    // the camera follows the action: the moment that matters while it is framed (close, slowed), otherwise the district
    // with the biggest clash, from high enough to see where the crowds are going
    if (cam.follow && clock - cam.user > 4) {
      if (FOCUS && clock < FOCUS.until) camFly(FOCUS.x, FOCUS.y, PHONE() ? 1350 : 1050);
      else if (jump || fi - lastCamFi >= 3 || fi < lastCamFi) {
        lastCamFi = fi; const bh = clashH;
        if (bh >= 0) { const [x, y] = streetPt(bh, 0.13); camFly(x, y, clamp(BJ.s * 1.2, 1300, 2200) * (PHONE() ? 1.25 : 1)); }
        else camFly(0, 0, BJ.r * 1.1);
      }
    }
    lastG = g;
  }
  // THE MOMENT THAT MATTERS (2 November 2026): one at a time. Its place gets the one accent colour (an ice-blue ring that
  // pulses), the camera comes down to it, the run slows for a few seconds and the caption says what happened and why.
  let FOCUS = null, focusRing = null;
  // a city-wide moment (live fire begins, the internet goes, the occupation) is framed where it shows: the biggest clash now.
  // The run slows at most once every six simulated hours, so a burst of events is one moment, not a crawl.
  let clashH = -1, slowAtT = -99;
  function focusOn(e, at) {
    if (!BJ) return;
    let h = e.site != null && SITES[e.site] ? SITES[e.site].h : e.h; if (h == null || h < 0) h = clashH; if (h == null || h < 0) return;
    const [x, y] = e.site != null && SITES[e.site] ? [SITES[e.site].x, SITES[e.site].y] : streetPt(h, 0.13);
    if (FOCUS && FOCUS.e === e) return;
    FOCUS = { x, y, type: e.type, t: clock, until: clock + 5.5, e };
    if (playing && !REDUCED && e.t - slowAtT >= 6) { slowUntil = clock + 3.5; slowAtT = e.t; }
    if (!focusRing) { focusRing = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 64), new THREE.MeshBasicMaterial({ color: COLS.accent, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, depthTest: false })); focusRing.rotation.x = -Math.PI / 2; focusRing.renderOrder = 6; world.add(focusRing); }
    focusRing.position.set(x, 3, -y); focusRing.visible = true;
  }
  function stepFocus() {
    if (!focusRing) return;
    if (!FOCUS || clock > FOCUS.until || !RUN) { focusRing.visible = false; return; }
    const u = ((clock - FOCUS.t) % 1.6) / 1.6, r = Math.max(30, cam.dist * 0.035);
    focusRing.scale.setScalar(r * (0.6 + 0.8 * u)); focusRing.material.opacity = 0.9 * (1 - u) * Math.min(1, (FOCUS.until - clock) / 1.2);
  }
  // the edge round a set of districts (the people's, or the start districts before Play): the hex sides between a district
  // in the set and one outside it, as one crisp line
  let frontGrp = null;
  function drawFront(inSet, dim) {
    if (!BJ) return;
    const N = BJ.hex.x.length, s = BJ.s * 0.985, pos = [];
    for (let i = 0; i < N; i++) {
      if (!inSet(i)) continue;
      const cx = BJ.hex.x[i], cy = BJ.hex.y[i];
      for (let t = 0; t < 6; t++) {
        const th = Math.PI / 6 + t * Math.PI / 3, nx = cx + Math.cos(th) * s * SQ3, ny = cy + Math.sin(th) * s * SQ3, j = hxAt(nx, ny);
        if (j >= 0 && j !== i && inSet(j)) continue;
        const a0 = th - Math.PI / 6, a1 = th + Math.PI / 6;
        pos.push(cx + Math.cos(a0) * s, 3, -(cy + Math.sin(a0) * s), cx + Math.cos(a1) * s, 3, -(cy + Math.sin(a1) * s));
      }
    }
    if (!frontGrp) { frontGrp = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xf5b842, transparent: true, opacity: 0.85, depthWrite: false })); frontGrp.renderOrder = 3; frontGrp.frustumCulled = false; }
    if (frontGrp.parent !== world) world.add(frontGrp);
    frontGrp.geometry.dispose(); frontGrp.geometry = new THREE.BufferGeometry(); frontGrp.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    frontGrp.material.opacity = dim ? 0.55 : 0.85;
  }
  function flashOn(h, txt, cls) {
    const el = D.createElement('div'); el.className = 'up-flash ' + (cls || ''); el.textContent = txt + ' · ' + hexName(h); ui.appendChild(el); setTimeout(() => el.remove(), 2600);
  }

  // ---- the head-up display
  function hud(g, fi) {
    const ppl = clamp(g.ctl * 0.6 + g.obj * 0.4, 0, 1);
    D.getElementById('up-balb').style.width = (ppl * 100).toFixed(1) + '%';
    D.getElementById('up-hc').textContent = big(g.C); D.getElementById('up-hf').textContent = big(g.F); D.getElementById('up-hd').textContent = big(g.def);
    D.getElementById('up-ha').textContent = big(g.arr); D.getElementById('up-hk').textContent = fmt(g.dead);
    flag('up-fnet', g.net || g.cm < 0.2 ? tr('Internet cut') : g.cm < 0.7 ? tr('Internet slowed') : tr('Internet on'), g.net || g.cm < 0.2);
    flag('up-fpow', g.power ? tr('Power cuts') : tr('Power on'), !!g.power);
    flag('up-flv', tr(WORD.lv[g.Lv]), g.Lv >= 3);
    const sg = g.sig || {}, top = U.SECTORS.filter(s2 => sg[s2] > 0.3);
    flag('up-fstr', top.length ? tf('Strike: {s}', { s: top.map(s2 => tr(SEC_T[s2][0])).join(', ') }) : tr('No strike'), false, top.length > 0);
    renderObjs(RUN.O, objState(RUN.O, fi));
    const m = costSoFar(fi), hc = D.getElementById('up-hcost');
    hc.innerHTML = `<span>${tr('Injured')} <b>${big(g.inj || 0)}</b></span><span>${tr('Forces killed')} <b>${fmt(g.fdead || 0)}</b></span>` + (m ? `<span>${tr('Cost to the regime')} <b class="r">${rng$(m.forces[0] + m.oil[0], m.forces[1] + m.oil[1])}</b></span><span>${tr('To the economy')} <b>${rng$(m.net[0] + m.strike[0], m.net[1] + m.strike[1])}</b></span>` : '');
    const day = Math.floor((RUN.X.hour + g.t) / 24) + 1;
    D.getElementById('up-day').textContent = tf('Day {d}', { d: N_(day) });
    D.getElementById('up-hour').textContent = N_(String(g.hr).padStart(2, '0') + ':00') + (g.hr >= 20 || g.hr < 6 ? ' ☾' : ' ☀');
  }
  function renderObjs(O, st) {
    const el = D.getElementById('up-objs'); if (!el) return;
    el.innerHTML = O.map((o, i) => { const x = st ? st[i] : null; return `<li class="${x && x.done ? 'done' : x && x.fail ? 'fail' : ''}"><i aria-hidden="true">${x && x.done ? '✓' : x && x.fail ? '✕' : '◇'}</i><span>${esc(o.t)}</span>${x ? `<b style="--p:${clamp(x.p, 0, 1).toFixed(3)}"${x.low ? ' class="low"' : ''}></b><em>${esc(x.v)}</em>` : ''}</li>`; }).join('');
  }
  function flag(id, t, bad, good) { const el = D.getElementById(id); $('em', el).textContent = t; tog(el, 'bad', !!bad); tog(el, 'good', !!good); }
  function hudIdle() {
    D.getElementById('up-balb').style.width = '0%';
    for (const id of ['up-hc', 'up-hd', 'up-hk', 'up-ha']) D.getElementById(id).textContent = N_('0');
    D.getElementById('up-hf').textContent = big(BJ.pop * U.K.forcesPerPop * ((U.GROUP[BJ.id] && { kurd: 1.3, baluch: 1.3, capital: 1.15, holy: 1.2 }[U.GROUP[BJ.id]]) || 1));
    flag('up-fnet', S.net === 'off' ? tr('Internet cut') : S.net === 'slow' ? tr('Internet slowed') : S.net === 'on' ? tr('Internet on') : tr('Internet: the regime decides'), S.net === 'off');
    flag('up-fpow', S.power === 'off' || S.power === 'cuts' ? tr('Power cuts') : tr('Power on'), false);
    flag('up-flv', tr(WORD.lv[0]), false);
    const P = U.planOf(S), top = U.SECTORS.filter(s2 => P.sec[s2] > 0.4);
    flag('up-fstr', top.length ? tf('Strike planned: {s}', { s: top.map(s2 => tr(SEC_T[s2][0])).join(', ') }) : tr('No strike planned'), false, top.length > 0);
    D.getElementById('up-day').textContent = tr('Before it starts');
    renderObjs(objectives(), null); D.getElementById('up-hcost').innerHTML = '';
    D.getElementById('up-hour').textContent = N_(String(S.hour).padStart(2, '0') + ':00');
  }

  // ---- the feed and the caption: what is happening and why (and, in an advisor's plan, what the advisor says)
  const feedl = D.getElementById('up-feedl'), capEl = D.getElementById('up-cap');
  let feedAt = -1;
  function feedReset() { feedl.innerHTML = ''; feedAt = -1; lastFrameShown = -1; lastG = null; quietAt = -99; }
  function evText(e) {
    const site = e.site != null ? siteName(SITES[e.site]) : null, at = hexName(e.h);
    switch (e.type) {
      case 'lv': return e.down ? tf('The forces step back to: {l}.', { l: tr(WORD.lv[e.lv]) }) : [null, tr('Riot police move in with batons and tear gas.'), e.why === 'armed' ? tr('Shots are fired from the crowd. The forces answer with live fire.') : tr('The Basij battalions come in on motorbikes with birdshot.'), tr('IRGC ground units are sent in. Live fire on the crowds.'), tr('Heavy machine guns on the crowds.')][e.lv];
      case 'massacre': return tr('Night, in the blackout, at the peak: the regime opens fire with heavy weapons.');
      case 'netcut': return tr('The regime cuts the internet.');
      case 'powercut': return tr('The power goes off in the districts that rose, ahead of night raids.');
      case 'clash': return tf('First clashes, at {p}.', { p: at });
      case 'take': return tf('The people take {s}.', { s: site });
      case 'lose': return tf('The forces take back {s}.', { s: site });
      case 'defect': return tr('The first conscripts refuse their orders and cross over.');
      case 'split': return tr('A split at the top: commanders refuse to order more killing.');
      case 'army': return [null, tr('The army is ordered onto the streets.'), tr('The army declares itself neutral.'), tr('The army joins the people.')][e.s];
      case 'reinf': return tr('Reinforcements arrive on the highways from the regional IRGC headquarters.');
      case 'blocked': return tr('The roads in are held. Reinforcements turn back.');
      case 'proxies': return tf('Foreign fighters brought in by the regime arrive, about {n}.', { n: big(e.n) });
      case 'strike': return tf('Strike: {s} stop work.', { s: tr(SEC_T[e.sec] ? SEC_T[e.sec][0] : 'workers') });
      case 'checkpoints': return tr('Checkpoints go up at the junctions.');
      case 'raid': return tr('The forces raid hospitals for the wounded.');
      case 'occupy': return tr('After the killing, the regime occupies the city: checkpoints in every block, a curfew.');
      case 'wave': return tr('The arrests begin at home, from phone records and cameras.');
      case 'forty': return tr('The fortieth day after the killings: people come out to mourn.');
      case 'abroad': return tr('With the internet gone, the agreed hour reaches homes by satellite TV from abroad.');
      case 'gather': return tf('The crowds reach the gathering point at {p}.', { p: at });
      case 'counter': return tf('The regional IRGC headquarters sends a counter-offensive: about {n} men.', { n: big(e.n) });
      case 'liberated': return tr('The city is liberated.');
      case 'armyrule': return tr('The regime falls in the city, and the army takes power.');
      case 'crushed': return tr('The streets go quiet. The uprising is crushed.');
    }
    return null;
  }
  // why each thing happens, and the finding it stands on (research.json ids, all checked by uprising.py --check)
  const WHY = {
    massacre: ['In 2019 and January 2026 the killing came at night, under a blackout, at the peak: 91% of the 2026 dead fell in two nights.', 'iran-blackout-massacre-link'],
    netcut: ['It goes when the crowds peak: in 2019 the day after the price rise, in 2026 on the night of the biggest march.', 'tiered-internet'],
    occupy: ['That is how the street phase ended in 2019 and 2026.', 'iran-massacre-ends-street-phase'],
    defect: ['They cross over because they now think the regime is finished, not because the crowd is big.', 'defections-mechanism'],
    split: ['No such split has happened since 1979. It is what deep, long strikes and a whole country rising can bring.', 'iran-no-defection-record'],
    army: ['In February 1979 the army stood aside after months of strikes, and the regime fell the same day.', 'general-strike'],
    reinf: ['Each IRGC regional headquarters covers several provinces, and its main job now is putting down dissent.', 'irgc-regional-hqs'],
    proxies: ['Between 800 and 5,000 were reported in the whole country in January 2026, unverified.', 'foreign-reinforcement'],
    strike: ['Strikes, not crowds, ended the monarchy: in 1978 oil fell from six to one and a half million barrels a day.', 'general-strike'],
    wave: ['HRANA counted 53,552 arrests by 15 February 2026, most of them after the streets went quiet.', 'arrests-and-afterwards'],
    forty: ['Iran mourns in 40-day cycles; a smaller crowd comes back after a massacre.', 'forty-day-cycle'],
    abroad: ['Agreed times and places are the one thing that works in a blackout.', 'hassanpour-dispersion'],
    counter: ['In November 2022 IRGC ground forces were flown in to retake Mahabad.', 'irgc-regional-hqs'],
    raid: ['In 2026 the wounded were taken from hospitals; people died at home rather than go.', 'arrests-and-afterwards'],
  };
  const BAD = { lv: 1, massacre: 1, netcut: 1, powercut: 1, lose: 1, reinf: 1, proxies: 1, crushed: 1, raid: 1, occupy: 1, wave: 1, counter: 1, checkpoints: 1 };
  const GOOD = { take: 1, defect: 1, split: 1, blocked: 1, liberated: 1, strike: 1, armyrule: 1, gather: 1, forty: 1, abroad: 1 };
  function caption(t, who, e) {
    const a = who ? ADV.find(x => x.id === who) : null;
    const when = e && RUN ? `<time>${tf('Day {d}', { d: N_(Math.floor((RUN.X.hour + e.t) / 24) + 1) })} · ${N_(String((RUN.X.hour + e.t) % 24).padStart(2, '0'))}:00${e.h >= 0 || e.site != null ? ' · ' + esc(e.site != null && SITES[e.site] ? siteName(SITES[e.site]) : hexName(e.h)) : ''}</time>` : '';
    capEl.innerHTML = (a ? `<span class="up-cap-a">${bust(a.id, 34)}<b>${esc(tr(a.n))}</b></span>` : '') + `<span class="up-cap-t">${when}<i class="up-cap-dot${e ? (BAD[e.type] ? ' bad' : GOOD[e.type] ? ' good' : '') : ''}" aria-hidden="true"></i>${esc(t)}</span>`;
  }
  function narr(type) {      // the advisor of the plan in use says what they think of what just happened
    const a = S.plan.adv && ADV.find(x => x.id === S.plan.adv); if (!a) return '';
    const L = a.say && a.say[type]; return L ? tr(L) : '';
  }
  function feedTo(fi) {
    if (!RUN) return;
    if (fi < feedAt) feedReset();
    let lastBig = null;
    for (const e of RUN.ev) {
      if (e.t <= feedAt || e.t > fi) continue;
      const t = evText(e); if (!t) continue;
      const li = D.createElement('li');
      const day = Math.floor((RUN.X.hour + e.t) / 24) + 1, hr = (RUN.X.hour + e.t) % 24, w = WHY[e.type];
      li.className = (BAD[e.type] && !e.down ? 'bad' : GOOD[e.type] || (e.type === 'army' && e.s >= 2) ? 'good' : '') + ((e.type === 'lv' && e.lv >= 3) || e.type === 'massacre' ? ' grave' : '');
      const fnd = w && findingOf(w[1]);
      li.innerHTML = `<time>${tf('Day {d}', { d: N_(day) })} · ${N_(String(hr).padStart(2, '0'))}:00</time><span>${esc(t)}</span>${w ? `<em>${esc(tr(w[0]))}${fnd && fnd.src ? ' ' + ext(fnd.src, tr('source')) : ''}</em>` : ''}`;
      if (e.h >= 0 || e.site != null) { li.tabIndex = 0; li.addEventListener('click', () => { const h = e.site != null ? SITES[e.site].h : e.h; cam.follow = false; D.getElementById('up-follow').setAttribute('aria-pressed', 'false'); camFly(BJ.hex.x[h], BJ.hex.y[h], BJ.s * 4); }); }
      feedl.insertBefore(li, feedl.firstChild);
      while (feedl.children.length > 60) feedl.removeChild(feedl.lastChild);
      if (BAD[e.type] || GOOD[e.type] || e.type === 'army') lastBig = e;
      if ((e.type === 'take' || e.type === 'lose') && fi - e.t <= 2 && e.site != null && SITES[e.site]) { const q = SITES[e.site]; if (e.type === 'take') chantRing(q.x, q.y, true); flashOn(q.h, tr(e.type === 'take' ? 'Taken' : 'Lost'), e.type === 'take' ? 'good' : 'bad'); }
    }
    if (lastBig) { const n = narr(lastBig.type); const w = WHY[lastBig.type]; caption(evText(lastBig) + ' ' + (n || (w ? tr(w[0]) : '')), n ? S.plan.adv : null, lastBig); if (fi - lastBig.t <= 2) focusOn(lastBig); }
    feedAt = fi;
  }

  // ---- the inspector: a tapped district or place
  const insp = D.getElementById('up-insp');
  function inspOpen(h, g) { insp.hidden = false; insp.innerHTML = `<button type="button" class="up-x" aria-label="${tr('Close')}">✕</button>${hexTip(h, false, g)}`; $('.up-x', insp).addEventListener('click', inspClose); }
  function inspClose() { insp.hidden = true; }

  // ================================================================== the advisors, presented as characters
  // Schools of thought built from the research, not real people speaking (the page says so). Each is a drawn bust with the
  // badge of where they come from, a line argued from THIS city and the evidence (every claim matches the fact-check of
  // 1 November 2026, data/audit-uprising-2026-11-01.md, a4), their whole plan in one tap, and what they say as it plays.
  const ADV = [
    { id: 'scholar', q: 'Numbers are necessary, never enough: January 2026 probably crossed 3.5% and was still crushed.', qf: 'iran-2026-exception', sn: 'Scholar', n: 'The Civil-Resistance Scholar', role: 'Researcher of 323 campaigns (Chenoweth and Stephan)', c: '#c9a24a', f: ['participation-ladder', 'three-five-caveats', 'cs-success-rates', 'iran-2026-exception'],
      say: { start: 'Keep it peaceful. Every stone thrown is a video they show their own men.', massacre: 'Shooting peaceful people can backfire, but only if the movement is organised enough to come back.', defect: 'There it is: the forces split. That is what wins, not the numbers alone.', crushed: 'Numbers were necessary. They were not enough: nobody crossed over.', strike: 'Good. Non-cooperation is where nonviolent movements get their power.' } },
    { id: 'organizer', q: 'They can shoot a crowd. They cannot shoot a country that stays home.', qf: 'general-strike', sn: 'Strike organizer', n: 'The Strike Organizer', role: 'The oil workers of 1978, the professionals of Sudan 2019', c: '#4f86c6', f: ['general-strike', 'bazaar'],
      say: { start: 'Day one we stay home. The bazaar shuts first, then the trucks, then the oil.', strike: 'It is spreading. Now hold it: a strike bites in weeks, not days.', massacre: 'They can shoot a crowd. They cannot shoot a man who stays home.', split: 'The money is running out, and the men at the top can count.', crushed: 'The streets went quiet. The question is whether the strike still holds.' } },
    { id: 'officer', q: 'No unit has crossed over since 1979. They switch sides when they believe the regime is finished.', qf: 'iran-no-defection-record', sn: 'Former officer', n: 'The Former Officer', role: 'Served in the Artesh; how security forces decide whether to shoot', c: '#8a7f4a', f: ['defections-mechanism', 'iran-no-defection-record', 'who-shoots', 'conscript-police-half'], badge: 'artesh',
      say: { start: 'Talk to the conscripts. Their mothers are in this crowd.', defect: 'Conscripts first, always. The IRGC will be the last to go.', army: 'That is the barracks deciding. In 1979 it happened in one day.', massacre: 'Those are the units chosen because they will shoot. Do not stand in their line of fire.', crushed: 'They held together. No unit has crossed over since 1979.' } },
    { id: 'street', q: 'Never stand where they are waiting.', qf: 'night-tactics', sn: 'Street organizer', n: 'The Street Organizer', role: 'The neighbourhood youth of 2022 and 2026', c: '#d0544a', f: ['night-tactics', 'hassanpour-dispersion'],
      say: { start: 'Everywhere at once, gone before the vans arrive.', massacre: 'Never stand where they are waiting. Small groups, side streets.', netcut: 'We agreed the times and the places before. They cannot cut that.', crushed: 'They took the streets back. We come back on the fortieth day.' } },
    { id: 'digital', q: 'They cut the internet at the peak, then they shoot.', qf: 'iran-blackout-massacre-link', sn: 'Blackout specialist', n: 'The Blackout Specialist', role: 'Internet shutdowns and how movements survive them', c: '#4fb3a6', f: ['iran-blackout-massacre-link', 'gohdes-shutdown-violence', 'tiered-internet', 'starlink-effect'],
      say: { start: 'Expect the internet to go when the crowds peak. Agree everything now.', netcut: 'There it goes. Whatever was not agreed in advance is lost.', massacre: 'This is why they cut it: so nobody films the killing.', abroad: 'Satellite TV carries the hour into homes. It does not need the internet.' } },
    { id: 'urban', q: 'Whoever holds the centre holds the picture the world sees.', qf: 'revolutionary-city', sn: 'Urban strategist', n: 'The Urban Strategist', role: 'Mark Beissinger on how cities make revolutions', c: '#9b6ad0', f: ['revolutionary-city'],
      say: { start: 'Whoever holds the centre holds the picture the world sees.', take: 'Hold it. A square held for days changes what everyone believes.', blocked: 'The roads in are ours. Now nothing comes in from the other provinces.', reinf: 'They are coming down the highways. Those roads should have been blocked.' } },
    { id: 'medic', q: 'They took the wounded from the hospitals. Every safe house is a life.', qf: 'arrests-and-afterwards', sn: 'Medic', n: 'The Medic', role: 'The doctors’ networks that hid the wounded in 2022 and 2026', c: '#e06d6d', f: ['arrests-and-afterwards'],
      say: { start: 'First aid in every district, safe houses away from the hospitals.', raid: 'They are in the hospitals now. Take the wounded to the safe houses.', massacre: 'Fewer deaths tonight means a bigger crowd tomorrow.' } },
    { id: 'historian', q: '1979 won with four months of strikes, not one day of marches.', qf: 'general-strike', sn: 'Historian', n: 'The Historian', role: '1979, 2009, 2019, 2022 and 2026', c: '#b98a5a', f: ['forty-day-cycle', 'iran-massacre-ends-street-phase', 'general-strike', 'iran-lethality-trend'],
      say: { start: 'Every uprising since 1979 was put down. This one needs what 1979 had.', massacre: 'This is how 2019 and 2026 ended.', forty: 'The fortieth day. In 1978 it brought the crowds back again and again.', strike: 'Months of strikes are what brought down the Shah.' } },
    { id: 'red', q: 'Cut it at the peak. Nobody films what comes next.', qf: 'iran-blackout-massacre-link', sn: 'Regime playbook', n: 'The Regime’s Playbook', role: 'What the IRGC will do against your plan', c: '#b8323a', f: ['iran-massacre-ends-street-phase', 'foreign-reinforcement', 'irgc-regional-hqs', 'strikes-on-repression-2026'], badge: 'irgc', red: true,
      say: { start: 'Batons and gas first. We keep the heavy units back.', netcut: 'Cut it at the peak. Nobody films what comes next.', massacre: 'Tonight, in the dark.', occupy: 'Checkpoints in every block. Nobody gathers.', wave: 'Now we go to their homes, one by one.' } },
  ];
  const BADGE = { scholar: 'M6 7h7a3 3 0 0 1 3 3v10H9a3 3 0 0 0-3 0Zm20 0h-7a3 3 0 0 0-3 3v10h7a3 3 0 0 1 3 0Z', organizer: 'M16 9a7 7 0 1 0 0 14a7 7 0 1 0 0-14Zm0 4a3 3 0 1 1 0 6a3 3 0 1 1 0-6Z',
    street: 'M11 22v-7l2-3h2l1 2l1-2h2l2 3v7Z', digital: 'M16 23v-8m-6-2a8 8 0 0 1 12 0m-15-3a12 12 0 0 1 18 0', urban: 'M16 7a6 6 0 0 1 6 6c0 5-6 11-6 11s-6-6-6-11a6 6 0 0 1 6-6Z',
    medic: 'M13 8h6v5h5v6h-5v5h-6v-5H8v-6h5Z', historian: 'M10 7h12M10 25h12M11 7c0 6 10 6 10 12M21 7c0 6-10 6-10 12' };
  const SKIN = { scholar: '#d9b08c', organizer: '#c99a72', officer: '#c08a62', street: '#e0b896', digital: '#d6a882', urban: '#c4956c', medic: '#e3bb98', historian: '#d4ab88', red: '#2a1414' };
  function bust(id, sz) {
    const a = ADV.find(x => x.id === id) || ADV[0], s = SKIN[id] || '#d0a07a', c = a.c, r = id === 'red';
    let hair = '', top = '', body = '', extra = '';
    if (id === 'scholar') { hair = '<path d="M33 40c0-11 7-17 17-17s17 6 17 17c-3-6-8-8-17-8s-14 2-17 8Z" fill="#9a9a96"/>'; extra = '<g fill="none" stroke="#222" stroke-width="2"><circle cx="43" cy="47" r="5"/><circle cx="57" cy="47" r="5"/><path d="M48 47h4"/></g>'; body = '<path d="M18 100c2-20 14-28 32-28s30 8 32 28Z" fill="#7a5a3c"/><path d="M44 72l6 14l6-14" fill="#e9e4d8"/>'; }
    if (id === 'organizer') { top = '<path d="M31 37c2-10 10-14 19-14s17 4 19 14l5 2H26Z" fill="#30425e"/>'; extra = '<path d="M41 59c4 3 14 3 18 0" stroke="#3a2a20" stroke-width="3" fill="none"/>'; body = '<path d="M18 100c2-20 14-28 32-28s30 8 32 28Z" fill="#2c4a74"/><path d="M50 72v28" stroke="#1d3150" stroke-width="2"/>'; }
    if (id === 'officer') { top = '<path d="M30 36c0-8 9-13 20-13s21 4 21 11c-6-2-14-2-24 1Z" fill="#4e5a32"/><circle cx="64" cy="31" r="3" fill="#d9a640"/>'; extra = '<path d="M41 59c4 3 14 3 18 0" stroke="#3a2a20" stroke-width="3.5" fill="none"/>'; body = '<path d="M18 100c2-20 14-28 32-28s30 8 32 28Z" fill="#6b6844"/><rect x="24" y="80" width="14" height="4" fill="#d9a640"/><rect x="62" y="80" width="14" height="4" fill="#d9a640"/>'; }
    if (id === 'street') { hair = '<path d="M31 46c-2-15 6-24 19-24s21 9 19 24c3 14 1 30-4 34c0-12-2-22-3-30c-6 3-18 3-24 0c-1 8-3 18-3 30c-5-4-7-20-4-34Z" fill="#1f1714"/>'; body = '<path d="M18 100c2-20 14-28 32-28s30 8 32 28Z" fill="#3b3f46"/><path d="M38 74c4 6 20 6 24 0" stroke="#2a2d33" stroke-width="3" fill="none"/>'; }
    if (id === 'digital') { hair = '<path d="M32 44c0-13 7-21 18-21s18 8 18 21c-4-7-10-9-18-9s-14 2-18 9Z" fill="#2b2220"/>'; extra = '<path d="M30 48a20 20 0 0 1 40 0" stroke="#222" stroke-width="3" fill="none"/><rect x="27" y="45" width="6" height="11" rx="2" fill="#4fb3a6"/><path d="M33 55c4 6 9 7 12 7" stroke="#222" stroke-width="2" fill="none"/>'; body = '<path d="M18 100c2-20 14-28 32-28s30 8 32 28Z" fill="#245a54"/>'; }
    if (id === 'urban') { hair = '<path d="M33 40c0-11 7-17 17-17s17 6 17 17c-3-5-8-7-17-7s-14 2-17 7Z" fill="#2a201a"/>'; extra = '<path d="M38 52c2 12 22 12 24 0c0 8-4 15-12 15s-12-7-12-15Z" fill="#2a201a"/>'; body = '<path d="M18 100c2-20 14-28 32-28s30 8 32 28Z" fill="#4a3a6a"/><rect x="66" y="66" width="7" height="30" rx="3" fill="#c9b48a" transform="rotate(20 69 80)"/>'; }
    if (id === 'medic') { hair = '<path d="M32 46c-1-14 6-23 18-23s19 9 18 23c-3-8-9-11-18-11s-15 3-18 11Z" fill="#3a2418"/><circle cx="50" cy="24" r="7" fill="#3a2418"/>'; body = '<path d="M18 100c2-20 14-28 32-28s30 8 32 28Z" fill="#eef0ec"/><path d="M40 74c0 12 2 16 4 16m16-16c0 12-2 16-4 16" stroke="#333" stroke-width="2" fill="none"/><circle cx="56" cy="91" r="3" fill="#888"/>'; }
    if (id === 'historian') { hair = '<path d="M34 38c1-9 7-14 16-14s15 5 16 14c-4-3-9-4-16-4s-12 1-16 4Z" fill="#e6e3dc"/>'; extra = '<path d="M37 52c2 16 24 16 26 0c1 12-5 20-13 20s-14-8-13-20Z" fill="#e6e3dc"/><g fill="none" stroke="#333" stroke-width="2"><rect x="38" y="43" width="9" height="7" rx="2"/><rect x="53" y="43" width="9" height="7" rx="2"/><path d="M47 46h6"/></g>'; body = '<path d="M18 100c2-20 14-28 32-28s30 8 32 28Z" fill="#5c4a3a"/>'; }
    if (r) { top = '<path d="M30 37c1-9 9-14 20-14s19 5 20 14l4 2H26Z" fill="#111"/><path d="M27 39h46v3H27Z" fill="#111"/>'; body = '<path d="M18 100c2-20 14-28 32-28s30 8 32 28Z" fill="#141414"/>'; }
    const head = `<ellipse cx="50" cy="49" rx="16" ry="19" fill="${s}"/>${r ? '' : '<circle cx="44" cy="48" r="1.6" fill="#222"/><circle cx="56" cy="48" r="1.6" fill="#222"/><path d="M45 61c3 2 7 2 10 0" stroke="#7a4a3a" stroke-width="1.5" fill="none"/>'}`;
    const neck = `<rect x="44" y="62" width="12" height="12" fill="${s}"/>`;
    const badge = a.badge && EMB[a.badge] ? `<image href="${EMB[a.badge]}" x="68" y="68" width="28" height="28"/>` : BADGE[id] ? `<g transform="translate(66 66) scale(0.95)"><circle cx="16" cy="16" r="15" fill="#14161a" stroke="${c}" stroke-width="2"/><path d="${BADGE[id]}" fill="${id === 'medic' ? '#d83a3a' : 'none'}" stroke="${id === 'medic' ? 'none' : c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>` : '';
    return `<svg class="up-bust" viewBox="0 0 100 100" width="${sz}" height="${sz}" aria-hidden="true"><defs><radialGradient id="bg-${id}-${sz}" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${c}" stop-opacity="${r ? 0.9 : 0.55}"/><stop offset="1" stop-color="#0d0f13"/></radialGradient><clipPath id="cl-${id}-${sz}"><rect x="3" y="3" width="94" height="94" rx="10"/></clipPath></defs><g clip-path="url(#cl-${id}-${sz})"><rect width="100" height="100" fill="url(#bg-${id}-${sz})"/>${body}${neck}${head}${hair}${top}${extra}</g><rect x="3" y="3" width="94" height="94" rx="10" fill="none" stroke="${c}" stroke-width="2.5"/>${badge}</svg>`;
  }
  // where one place stands from another, in words: "2.1 km north-east of Azadi Square"
  function relTo(q, ref) {
    const dx = q.x - ref.x, dy = q.y - ref.y, d = Math.hypot(dx, dy);
    if (d < 300) return tf('beside {p}', { p: siteName(ref) });
    const dir = ['east', 'north-east', 'north', 'north-west', 'west', 'south-west', 'south', 'south-east'][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
    return tf('{k} km {d} of {p}', { k: N_((Math.round(d / 100) / 10).toString()), d: tr(dir), p: siteName(ref) });
  }
  function findingOf(id) { return (DATA.findings || []).find(f => f.id === id); }
  // each advisor's whole plan, read from THIS city's board
  function advPlan(a) {
    const B = U.prep(BJ), I = B.ign || {}, sq = SITES.find(q => q.k === 'square'), gov = SITES.find(q => q.k === 'gov'), tvS = SITES.find(q => q.k === 'tv');
    const gars = SITES.filter(q => q.k === 'garrison'), ents = BJ.hex.ent.reduce((s2, v) => s2 + v, 0);
    const P = { adv: a.id, gather: [], routes: [], sec: null, ign: null };
    const route = (from, to) => (from != null && to != null && from !== to ? hexPath(from, to) : null);
    switch (a.id) {
      case 'scholar': Object.assign(P, { type: 'soldiers', discipline: 0.97, fraternize: 0.85, strike: 0.6, conv: 0.5 }); P.ign = [...(I.uni || []), ...(I.bazaar || [])].slice(0, 4); if (sq) P.gather.push({ h: sq.h, t: 40 }); return { plan: P, days: 28 };
      case 'organizer': Object.assign(P, { type: 'strike', strike: 1, pace: 0.2, offline: 0.85, abroad: 0.7 }); P.sec = { bazaar: 1, truck: 0.9, oil: 1, civil: 0.9 }; P.ign = (I.bazaar || []).slice(0, 2); return { plan: P, days: 56 };
      case 'officer': Object.assign(P, { type: 'soldiers', fraternize: 1, discipline: 1, conv: 0.45, strike: 0.6 }); if (gars[0]) P.gather.push({ h: gars[0].h, t: 30 }); return { plan: P, days: 28 };
      case 'street': Object.assign(P, { type: 'water', night: 0.75, offline: 0.85, conv: 0.15 }); P.ign = (I.edge || []).concat(I.uni || []).slice(0, 6); return { plan: P, days: 28 };
      case 'digital': Object.assign(P, { type: 'centre', offline: 1, abroad: 0.95, film: 0.75, pace: 0.85 }); return { plan: P, days: 14, starlink: Math.round(BJ.pop * 30000 / 90e6 * 1.5) };
      case 'urban': {
        Object.assign(P, { type: ents <= 4 ? 'roads' : sq ? 'centre' : 'districts' });
        const st = (I.uni || [])[0], tg = sq ? sq.h : gov ? gov.h : null, r1 = route(st, tg); if (r1 && r1.length >= 2) P.routes.push(r1);
        if (sq) P.gather.push({ h: sq.h, t: 18 }); if (tvS && sq && tvS.h !== sq.h) P.gather.push({ h: tvS.h, t: 42 });
        return { plan: P, days: 14 };
      }
      case 'medic': Object.assign(P, { type: 'districts', medics: 1, discipline: 0.9 }); return { plan: P, days: 14 };
      case 'historian': Object.assign(P, { type: 'strike', pace: 0.25, strike: 0.9, offline: 0.8 }); P.sec = { bazaar: 1, truck: 0.7, oil: 0.9, civil: 0.8 }; P.ign = (I.bazaar || []).concat(I.uni || []).slice(0, 3); return { plan: P, days: 56 };
    }
    return null;
  }
  function brief(a) {
    const tv = S.turnout == null ? U.autoTurnout(BJ, S, S.nation === 'auto' ? null : U.NATION[S.nation]) : S.turnout, ppl = BJ.pop * tv / 100;
    const c = cityOf(cityId), name = FA ? c.fa : c.n, P = U.planOf(S);
    const sq = SITES.find(q => q.k === 'square'), gov = SITES.find(q => q.k === 'gov'), tvS = SITES.find(q => q.k === 'tv');
    const ents = BJ.hex.ent.reduce((s2, v) => s2 + v, 0), gars = SITES.filter(q => q.k === 'garrison').length;
    const irgcN = SEC.filter(q => q.k === 'irgc_hq').length, basN = SEC.filter(q => q.k === 'basij').length, polN = SEC.filter(q => q.k === 'police_station').length;
    const L = [];
    switch (a.id) {
      case 'scholar':
        L.push(tf('Here about {n} people come out at the busiest hour, {p} of {c}.', { n: big(ppl), p: N_(tv.toFixed(1)) + '%', c: name }));
        L.push(tr('The famous 3.5% is a share of the whole country, about 3.2 million Iranians. In January 2026 that line was probably crossed and the uprising was still crushed, because no unit changed sides. Numbers are necessary, not enough.'));
        if (S.armed) L.push(tr('Put the guns away. Armed campaigns succeed about half as often: they keep most people at home and give the forces a reason to stay together.'));
        L.push(tr('My plan: strict nonviolence, a strike, steady appeals to the soldiers, and one great gathering on the second day.'));
        break;
      case 'organizer':
        L.push(tr('The streets alone have never brought this regime down. In 1978 the oil workers cut output from about six million barrels a day to one and a half by November, and by late December exports had stopped. It took about four months of strikes, not days.'));
        L.push(tr('My plan: the bazaar shuts first, then the trucks, the oil and the schools; people stay home for the first days while it spreads; we hold it for eight weeks.'));
        break;
      case 'officer':
        L.push(tf('The IRGC, the special units and the Basij battalions will not cross over while the regime looks like winning. The conscripts might: about half the police. On this map: {i} IRGC compounds, {b} Basij bases, {p} police stations.', { i: N_(irgcN), b: N_(basN), p: N_(polN) }));
        L.push(gars ? tr('On 11 February 1979 the army declared itself neutral and the government fell the same day, after the air-force technicians, the Homafaran, revolted on 9 and 10 February. A technical branch broke first, not the Imperial Guard.') : tr('There are no army barracks on this map, so the regime here depends on its police and the IRGC. Any defections will start with the police conscripts.'));
        L.push(tr('No unit has crossed over in any uprising since 1979. My plan: total nonviolence and constant contact with the soldiers and their families.'));
        break;
      case 'street':
        L.push(tr('They have more guns, so never stand where they are waiting. Many small crowds, everywhere at once, gone before the vans arrive.'));
        L.push(tr('Small groups and rooftop chants after dark lower the risk to each of us. A huge march after dark, in a blackout, is where the 2026 massacre happened.'));
        L.push(tr('My plan: be water, act at night in small groups, agree the places before.'));
        break;
      case 'digital':
        L.push(tr('Expect the internet to go. It goes when the crowds peak: in 2019 the day after the price rise, in 2026 on the night of the biggest march, eleven days in.'));
        L.push(tr('There are perhaps 20,000 to 50,000 Starlink dishes in the whole country, jammed in places by up to 80%. They get the pictures out. They do not run an uprising.'));
        L.push(tr('My plan: agree every time and place before the blackout, let satellite TV from abroad carry the hour, and film everything.'));
        break;
      case 'urban':
        L.push(sq ? tf('The centre of gravity here is {s}. Whoever holds it holds the picture the world sees.', { s: siteName(sq) }) : tr('This city has no single great square; its uprising will be won district by district.'));
        if (gov) L.push(sq && gov !== sq ? tf('The governorate stands {r}. The regime guards it before anything else.', { r: relTo(gov, sq) }) : tr('The regime guards the governorate before anything else.'));
        L.push(ents >= 4 ? tf('{n} highways lead in from other provinces. Hold them and the regional headquarters cannot reinforce.', { n: N_(ents) }) : tf('Only {n} roads lead in. They are easy to block: block them.', { n: N_(ents) }));
        if (tvS) L.push(tf('The state broadcaster stands {t}. In Bucharest in 1989 the crowd took the TV station the day Ceausescu fled, and whoever spoke from it became the new authority.', { t: sq ? relTo(tvS, sq) : tr('in the city') }));
        break;
      case 'medic':
        L.push(tr('In 2022 and 2026 the forces took the wounded from the hospitals. People died at home because they were afraid to go.'));
        L.push(tr('Medics cannot stop bullets. They stop people dying of wounds that can be treated, and fewer deaths mean less fear and a bigger crowd tomorrow.'));
        L.push(tr('My plan: first aid and safe houses in every district.'));
        break;
      case 'historian':
        L.push(tr('1979 won after months of strikes and an army that stood aside. 2009 had millions in Tehran and lost when the fear came back. 2026 was broken in two nights of shooting and gone from the streets within a week.'));
        L.push(tr('Each uprising since 2009 has been met with sharper killing. Iranians come back on the fortieth day after the dead: plan in cycles, not for one day.'));
        L.push(tr('My plan: build slowly from the bazaar and the campuses, strike, and keep going for eight weeks.'));
        break;
      case 'red': {
        const prox = S.proxies === 'none' ? tr('none') : S.proxies === 'many' ? tr('the most we can bring, perhaps 5,000 across the country') : tr('perhaps 800 to 5,000 across the country (unverified reports)');
        L.push(tr('Hour one: riot police, batons and gas. The Basij battalions on motorbikes next, with birdshot. The IRGC ground units only if that fails.'));
        L.push(tr('When the crowds peak we cut the internet, and that night, in the dark, we open fire. Then checkpoints in every block and a curfew, and in the weeks after we go to their homes.'));
        L.push(tf('Reinforcements come down the highways from the {h} regional headquarters. Foreign fighters: {p}.', { h: BJ.rhq || tr('nearest'), p: prox }));
        if (gov) L.push(tf('We guard {g} and the broadcaster before anything else.', { g: siteName(gov) }));
        break; }
    }
    return L;
  }
  let advSel = null, advOdds = {};
  // the advisor's dossier: on a computer it opens beside the roster, the way a game shows a character; on a phone in the sheet
  const dossier = D.createElement('div'); dossier.className = 'up-dossier'; dossier.id = 'up-dossier'; dossier.hidden = true; ui.appendChild(dossier);
  function renderAdv() {
    const P = D.getElementById('up-adv-pane');
    const a = advSel ? ADV.find(x => x.id === advSel) : null, side = true;
    P.innerHTML = `<h2 class="up-ph">${tr('Pick an advisor')}</h2><p class="up-note">${tr('Each one reads this city and argues a plan from the evidence.')}</p>
      <div class="up-advs" role="list">${ADV.map(x => `<button type="button" role="listitem" class="up-adv${advSel === x.id ? ' on' : ''}${x.red ? ' red' : ''}" data-a="${x.id}" aria-pressed="${advSel === x.id}" title="${esc(tr(x.q || ''))}">${bust(x.id, 50)}<b>${esc(tr(x.sn))}</b></button>`).join('')}</div>
      <div id="up-advb">${a && !side ? advCard(a) : `<p class="up-hint">${tr('Tap a portrait to hear their brief.')}</p>`}</div>
      <p class="up-src">${tr('The advisors are schools of thought built from published research, not real people speaking.')}</p>`;
    dossier.hidden = !(a && side && mode === 'adv' && !RUN);
    dossier.innerHTML = a && side ? `<button type="button" class="up-x" id="up-dosx" aria-label="${tr('Close')}">✕</button>${advCard(a)}` : '';
    $$('.up-adv', P).forEach(b => b.addEventListener('click', () => { advSel = b.dataset.a; renderAdv(); advRun(advSel); }));
    if (a) {
      const ub = D.getElementById('up-use'); if (ub) ub.addEventListener('click', () => useAdv(a, true));
      const b2 = D.getElementById('up-advcmp'); if (b2) b2.addEventListener('click', () => { const S2 = advS(a); addCmp(tr(a.n), S2, a.id); });
      const b3 = D.getElementById('up-redbest'); if (b3) b3.addEventListener('click', () => { openCmpBest(); });
      const bx = D.getElementById('up-dosx'); if (bx) bx.addEventListener('click', () => { advSel = null; renderAdv(); });
      typeLine();
    }
  }
  // after a portrait is tapped, the brief and its Use button come into view (the portraits scroll up only as far as needed)
  function scrollToCard() { if (!PHONE()) return; const u = D.getElementById('up-use') || D.getElementById('up-redbest'), pane = D.getElementById('up-adv-pane'); if (!u || !pane) return; const d = u.getBoundingClientRect().bottom - pane.getBoundingClientRect().bottom + 12; if (d > 0) pane.scrollTop += d; }
  function advCard(a) {
    const L = brief(a), fs = a.f.map(findingOf).filter(Boolean), pl = advPlan(a), o = advOdds[a.id];
    const chips = pl ? planChips(pl.plan, pl.days) : '';
    return `<div class="up-advx${a.red ? ' red' : ''}">
      <div class="up-advh">${bust(a.id, 96)}<div><h3>${esc(tr(a.n))}</h3><p class="up-role">${esc(tr(a.role))}</p>${a.badge === 'artesh' ? `<p class="up-role">${tr('Former Artesh officer')}</p>` : ''}</div></div>
      ${a.q ? `<blockquote class="up-q${a.red ? ' red' : ''}">“${esc(tr(a.q))}”${(() => { const f = findingOf(a.qf); return f && f.src ? ' ' + ext(f.src, tr('source')) : ''; })()}</blockquote>` : ''}
      ${pl ? `<div class="up-advgo"><button type="button" class="up-play" id="up-use"><i>▶</i><span>${tr('Use this plan')}</span></button><button type="button" class="up-sec" id="up-advcmp">${tr('Add to compare')}</button></div>` : `<button type="button" class="up-sec" id="up-redbest">${tr('Find the plan that beats this')}</button>`}
      <div class="up-say" id="up-say">${L.map(l => `<p>${esc(l)}</p>`).join('')}</div>
      ${chips ? `<div class="up-chips">${chips}</div>` : ''}
      ${a.red ? '' : `<div class="up-likely" id="up-likely">${o ? likelyHtml(o) : `<span class="up-wait"><i></i>${tr('Running their plan 60 times...')}</span>`}</div>`}
      ${fs.length ? `<p class="up-src">${tr('What it stands on')}: ${fs.map((f, i) => { const t = FA && !f.cfa ? tr('source') + ' ' + N_(i + 1) : esc(f.c); return f.src ? ext(f.src, t) : (FA && !f.cfa ? '' : t); }).filter(Boolean).join(' · ')}</p>` : ''}
    </div>`;
  }
  // the line is shown whole at once; a soft highlight then reads through it, the way a game's advisor speaks (never hidden)
  let typeTimer = null;
  function typeLine() {
    clearInterval(typeTimer); const el = D.getElementById('up-say'); if (!el || REDUCED) return;
    const ps = $$('p', el); let i = 0;
    typeTimer = setInterval(() => { ps.forEach((p, n) => tog(p, 'now', n === i)); i++; if (i > ps.length) { clearInterval(typeTimer); ps.forEach(p => tog(p, 'now', false)); } }, 2600);
    ps.forEach((p, n) => tog(p, 'now', n === 0)); i = 1;
  }
  function planChips(p, days) {
    const out = [], I = (U.prep(BJ).ign) || {};
    out.push(`<span>${PLAN_ICON[p.type] || '•'} ${esc(tr(PLAN_T[p.type][0]))}</span>`);
    if (p.ign && p.ign.length) { const kinds = []; if ((I.uni || []).some(h => p.ign.includes(h))) kinds.push(tr('the campuses')); if ((I.bazaar || []).some(h => p.ign.includes(h))) kinds.push(tr('the bazaar')); if ((I.edge || []).some(h => p.ign.includes(h))) kinds.push(tr('the poor edges')); out.push(`<span>⌖ ${tr('Starts at')} ${esc(kinds.join(', ') || tr('the places it picks'))}</span>`); }
    if (p.sec) { const s2 = U.SECTORS.filter(k => p.sec[k] > 0.5).map(k => tr(SEC_T[k][0])); if (s2.length) out.push(`<span>⏸ ${tr('Strike')}: ${esc(s2.join(', '))}</span>`); }
    for (const g of p.gather || []) out.push(`<span>⚑ ${esc(hexName(g.h))}, ${tf('day {d} {h}:00', { d: N_(Math.floor((S.hour + g.t) / 24) + 1), h: N_(String((S.hour + g.t) % 24).padStart(2, '0')) })}</span>`);
    if ((p.routes || []).length) out.push(`<span>➜ ${tf('{n} march routes', { n: N_(p.routes.length) })}</span>`);
    if (days) out.push(`<span>⏱ ${tf('{d} weeks', { d: N_(days / 7) })}</span>`);
    return out.join('');
  }
  function advS(a) {
    const pl = advPlan(a); if (!pl) return clone(S);
    const S2 = clone(S); S2.plan = Object.assign({ type: pl.plan.type, ign: null, gather: [], routes: [], sec: null, adv: a.id }, U.PLANS[pl.plan.type], pl.plan);
    if (pl.days) S2.days = pl.days; if (pl.starlink != null) S2.starlink = pl.starlink;
    return S2;
  }
  function useAdv(a, watch) {
    const S2 = advS(a); S = mergeS(S2); changed(); renderAll();
    if (watch) watchIt();
  }
  async function advRun(id) {
    const a = ADV.find(x => x.id === id); if (!a || a.red || advOdds[id] || !BJ) return;
    const r = await batch(advS(a), PHONE() ? 40 : 60, SEED0, true);
    advOdds[id] = r; if (advSel === id) { const el = D.getElementById('up-likely'); if (el) el.innerHTML = likelyHtml(r); }
  }
  function likelyHtml(r) {
    const fall = (r.out.liberated + r.out.army) / r.n, mode = U.OUTCOMES.slice().sort((x, y) => r.out[y] - r.out[x])[0];
    return `<b>${tr('Most likely')}: ${esc(tr(WORD.out[mode]))}</b> <span>${tf('the regime falls in {p} of runs · about {d} lives lost', { p: pc(fall), d: fmt(U.quant(r.dead, 0.5)) })}</span>`;
  }

  // ================================================================== "I command": the panes
  const tabs = $$('.up-tab[data-tab]', ui);
  let curTab = 'start';
  function showTab(id) { curTab = id; tabs.forEach(t => { const on = t.dataset.tab === id; tog(t, 'on', on); t.setAttribute('aria-selected', String(on)); }); for (const p of ['start', 'moves', 'strike', 'tools', 'cond']) D.getElementById('up-p-' + p).hidden = p !== id; setTool(null); renderPane(id); }
  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  function seg(id, label, opts, val, help) {
    return `<div class="up-row"><div class="up-row-h"><b>${tr(label)}</b>${help ? `<span>${tr(help)}</span>` : ''}</div><div class="up-seg" data-k="${id}" role="radiogroup" aria-label="${tr(label)}">${opts.map(([v, t]) => `<button type="button" role="radio" data-v="${v}" aria-checked="${String(val) === String(v)}"${String(val) === String(v) ? ' class="on"' : ''}>${tr(t)}</button>`).join('')}</div></div>`;
  }
  function slider(id, label, help, ic, val) { return `<div class="up-dial"><label for="up-d-${id}"><i>${ic || ''}</i><b>${tr(label)}</b><span>${tr(help)}</span></label><input type="range" id="up-d-${id}" data-d="${id}" min="0" max="100" value="${Math.round(val * 100)}"><output>${N_(Math.round(val * 100))}</output></div>`; }
  function setTool(t) {
    TOOL = t; const hint = D.getElementById('up-toolhint');
    if (!t) { hint.hidden = true; if (routeDraft.length >= 2) { S.plan.routes.push(routeDraft.slice()); S.plan.adv = null; routeDraft = []; drawRouteDraft(); changed(); } routeDraft = []; drawRouteDraft(); return; }
    hint.hidden = false; D.getElementById('up-toolhint-t').textContent = tr(t === 'start' ? 'Tap districts on the map to start the uprising there. Tap again to remove.' : t === 'gather' ? 'Tap a district to make it a gathering point. Set its hour in the panel.' : 'Tap districts in order to draw a march route. The route follows the streets between your taps.');
    if (PHONE()) sheet(false);
  }
  D.getElementById('up-tooldone').addEventListener('click', () => { setTool(null); renderPane(curTab); if (PHONE()) sheet(true); });
  const LOGT = v => Math.round(Math.exp(Math.log(0.2) + v / 100 * (Math.log(20) - Math.log(0.2))) * 100) / 100;
  const TLOG = t => Math.round((Math.log(t) - Math.log(0.2)) / (Math.log(20) - Math.log(0.2)) * 100);
  function renderPane(id) {
    if (mode !== 'cmd' || !BJ) return;
    const P = S.plan, el = D.getElementById('up-p-' + id), I = U.prep(BJ).ign || {};
    if (id === 'start') {
      const types = Object.keys(U.PLANS).filter(t => t !== 'armed' || S.armed), ig = P.ign && P.ign.length ? P.ign : autoIgn();
      el.innerHTML = `<h3>${tr('Where it starts')}</h3>
        <div class="up-chips up-presets">${[['uni', 'The campuses'], ['bazaar', 'The bazaar'], ['edge', 'The poor edges'], ['centre', 'The city centre']].map(([k, t]) => `<button type="button" class="up-chip" data-ign="${k}"${(I[k] || []).length ? '' : ' disabled'}>${tr(t)}</button>`).join('')}<button type="button" class="up-chip up-chip-t${TOOL === 'start' ? ' on' : ''}" id="up-t-start">⌖ ${tr('Tap the map')}</button></div>
        <p class="up-note">${P.ign && P.ign.length ? tf('{n} starting districts you chose.', { n: N_(ig.length) }) : tr('The model picks: the campuses, the bazaar and the crowded edges, where Iranian uprisings have started.')}</p>
        <div class="up-chips">${ig.map(h => `<button type="button" class="up-chip" data-h="${h}">${esc(hexName(h))} <span aria-hidden="true">✕</span></button>`).join('')}${P.ign && P.ign.length ? `<button type="button" class="up-chip up-chip-r" id="up-ign-r">${tr('Let the model pick')}</button>` : ''}</div>
        <h3>${tr('The approach')}</h3>
        <div class="up-plans" role="radiogroup" aria-label="${tr('The approach')}">${types.map(t => `<button type="button" role="radio" class="up-pc${P.type === t ? ' on' : ''}" data-plan="${t}" aria-checked="${P.type === t}"><i>${PLAN_ICON[t]}</i><b>${tr(PLAN_T[t][0])}</b><span>${tr(PLAN_T[t][1])}</span><em>${tr(PLAN_T[t][2])}</em></button>`).join('')}</div>`;
      $$('[data-ign]', el).forEach(b => b.addEventListener('click', () => { P.ign = (I[b.dataset.ign] || []).slice(0, 6); P.adv = null; changed(); renderPane('start'); }));
      D.getElementById('up-t-start').addEventListener('click', () => setTool(TOOL === 'start' ? null : 'start'));
      $$('.up-chip[data-h]', el).forEach(b => b.addEventListener('click', () => { const h = +b.dataset.h, ig2 = (P.ign && P.ign.length ? P.ign : autoIgn()).filter(x => x !== h); P.ign = ig2.length ? ig2 : null; P.adv = null; changed(); renderPane('start'); }));
      const rr = D.getElementById('up-ign-r'); if (rr) rr.addEventListener('click', () => { P.ign = null; changed(); renderPane('start'); });
      $$('.up-pc', el).forEach(b => b.addEventListener('click', () => { const keep = { ign: P.ign, gather: P.gather, routes: P.routes, sec: P.sec }; S.plan = Object.assign({ type: b.dataset.plan, adv: null }, U.PLANS[b.dataset.plan], keep); changed(); renderPane('start'); }));
    } else if (id === 'moves') {
      el.innerHTML = `<h3>${tr('Gathering points and times')}</h3>
        <p class="up-note">${tr('Where the crowds converge, and from what hour. Tap the map to set one.')}</p>
        <button type="button" class="up-chip up-chip-t${TOOL === 'gather' ? ' on' : ''}" id="up-t-gather">⚑ ${tr('Set a gathering point')}</button>
        <ul class="up-glist">${P.gather.map((g, n) => `<li><b>⚑ ${esc(hexName(g.h))}</b><label>${tr('from')} <select data-g="${n}">${Array.from({ length: Math.min(S.days, 14) * 2 }, (_, j) => j * 12).map(t => `<option value="${t}"${t === g.t ? ' selected' : ''}>${tf('day {d} {h}:00', { d: N_(Math.floor((S.hour + t) / 24) + 1), h: N_(String((S.hour + t) % 24).padStart(2, '0')) })}</option>`).join('')}</select></label><button type="button" class="up-x2" data-gx="${n}" aria-label="${tr('Remove')}">✕</button></li>`).join('')}</ul>
        <h3>${tr('March routes')}</h3>
        <p class="up-note">${tr('Draw the way the crowds walk. Crowds on a route follow it to its end.')}</p>
        <button type="button" class="up-chip up-chip-t${TOOL === 'route' ? ' on' : ''}" id="up-t-route">➜ ${tr('Draw a route')}</button>
        <ul class="up-glist">${P.routes.map((r, n) => `<li><b>➜ ${esc(hexName(r[0]))} → ${esc(hexName(r[r.length - 1]))}</b><button type="button" class="up-x2" data-rx="${n}" aria-label="${tr('Remove')}">✕</button></li>`).join('')}${routeDraft.length ? `<li class="draft"><b>${tf('Drawing: {n} districts', { n: N_(routeDraft.length) })}</b></li>` : ''}</ul>
        ${(P.gather.length || P.routes.length) ? `<button type="button" class="up-chip up-chip-r" id="up-mv-clear">${tr('Clear all moves')}</button>` : ''}`;
      D.getElementById('up-t-gather').addEventListener('click', () => setTool(TOOL === 'gather' ? null : 'gather'));
      D.getElementById('up-t-route').addEventListener('click', () => { if (TOOL === 'route') { setTool(null); renderPane('moves'); } else setTool('route'); });
      $$('select[data-g]', el).forEach(s2 => s2.addEventListener('change', () => { P.gather[+s2.dataset.g].t = +s2.value; P.adv = null; changed(); }));
      $$('[data-gx]', el).forEach(b => b.addEventListener('click', () => { P.gather.splice(+b.dataset.gx, 1); changed(); renderPane('moves'); }));
      $$('[data-rx]', el).forEach(b => b.addEventListener('click', () => { P.routes.splice(+b.dataset.rx, 1); changed(); renderPane('moves'); }));
      const cl = D.getElementById('up-mv-clear'); if (cl) cl.addEventListener('click', () => { P.gather = []; P.routes = []; changed(); renderPane('moves'); });
    } else if (id === 'strike') {
      const sec = U.planOf(S).sec;
      el.innerHTML = `<h3>${tr('Strike, sector by sector')}</h3><p class="up-note">${tr('Each sector does something different, at a different speed. In 1978 the oil strike took weeks to bite and about four months to finish the monarchy.')}</p>
        ${U.SECTORS.map(k => slider('sec-' + k, SEC_T[k][0], SEC_T[k][1], SEC_T[k][2], sec[k])).join('')}
        <div class="up-chips"><button type="button" class="up-chip" id="up-gs">${tr('General strike')}</button><button type="button" class="up-chip up-chip-r" id="up-ns">${tr('No strike')}</button></div>
        ${seg('days', 'How long you keep it going', [[14, 'Two weeks'], [28, 'Four weeks'], [56, 'Eight weeks']], S.days, 'A strike is judged in weeks. Longer runs take longer to compute.')}`;
      $$('input[data-d]', el).forEach(inp => {
        inp.addEventListener('input', () => { if (!P.sec) P.sec = Object.assign({}, sec); P.sec[inp.dataset.d.slice(4)] = +inp.value / 100; inp.nextElementSibling.textContent = N_(inp.value); });
        inp.addEventListener('change', () => { P.adv = null; changed(); });
      });
      D.getElementById('up-gs').addEventListener('click', () => { P.sec = { bazaar: 1, truck: 0.9, oil: 1, civil: 0.9 }; P.adv = null; changed(); renderPane('strike'); });
      D.getElementById('up-ns').addEventListener('click', () => { P.sec = { bazaar: 0, truck: 0, oil: 0, civil: 0 }; P.adv = null; changed(); renderPane('strike'); });
      wireSegs(el);
    } else if (id === 'tools') {
      const sl = S.starlink == null ? Math.round(30000 * BJ.pop / 90e6) : S.starlink;
      el.innerHTML = `<h3>${tr('The tools people have')}</h3>
        ${['medics', 'blockade', 'fraternize', 'abroad', 'film', 'discipline', 'offline', 'night', 'conv', 'pace'].map(k => slider(k, TOOL_T[k][0], TOOL_T[k][1], TOOL_T[k][2], P[k])).join('')}
        <div class="up-row"><div class="up-row-h"><b>📡 ${tr('Starlink dishes in the city')}</b><span>${tr('20,000 to 50,000 in the whole country (unverified), jammed in places by up to 80%; owning one is punishable by death under a 2026 law. They get evidence out; they keep only a thin line open.')}</span></div>
          <div class="up-slide"><input type="range" id="up-sl" min="0" max="100" value="${Math.round(Math.sqrt(sl / 20000) * 100)}" aria-label="${tr('Starlink dishes in the city')}"><output id="up-sl-o">${fmt(sl)}</output></div>
          <label class="up-auto"><input type="checkbox" id="up-sl-a"${S.starlink == null ? ' checked' : ''}> ${tr('The register’s estimate for this city')}</label></div>`;
      $$('input[data-d]', el).forEach(inp => { inp.addEventListener('input', () => { P[inp.dataset.d] = +inp.value / 100; inp.nextElementSibling.textContent = N_(inp.value); }); inp.addEventListener('change', () => { P.adv = null; changed(); }); });
      const s2 = D.getElementById('up-sl'), sA = D.getElementById('up-sl-a');
      s2.addEventListener('input', () => { S.starlink = Math.round((+s2.value / 100) ** 2 * 20000 / 10) * 10; sA.checked = false; D.getElementById('up-sl-o').textContent = fmt(S.starlink); });
      s2.addEventListener('change', changed); sA.addEventListener('change', () => { S.starlink = sA.checked ? null : sl; changed(); renderPane('tools'); });
    } else if (id === 'cond') {
      const at = U.autoTurnout(BJ, S, S.nation === 'auto' ? null : U.NATION[S.nation]), tv = S.turnout == null ? at : S.turnout;
      el.innerHTML = `<h3>${tr('Try it on history')}</h3><p class="up-note">${tr('Load the real inputs of a past uprising and see whether the model gives what happened.')}</p>
        <div class="up-chips">${(DATA.bt || []).filter(b => !b.vs).map(b => `<button type="button" class="up-chip" data-bt="${esc(b.id)}">${esc(tr(b.name))}</button>`).join('')}</div>
        <div class="up-row up-row-big"><div class="up-row-h"><b>${tr('People on the streets')}</b><span>${tr('At the busiest hour, as a share of everyone in the city.')}</span></div>
          <div class="up-slide"><input type="range" id="up-turn" min="0" max="100" value="${TLOG(clamp(tv, 0.2, 20))}" aria-label="${tr('People on the streets')}"><output id="up-turn-o"><b>${N_(tv.toFixed(tv < 1 ? 2 : 1))}%</b> ${tf('{n} people', { n: big(BJ.pop * tv / 100) })}</output></div>
          <label class="up-auto"><input type="checkbox" id="up-turn-a"${S.turnout == null ? ' checked' : ''}> ${tf('Let the model decide (about {p})', { p: N_(at.toFixed(1)) + '%' })}</label></div>
        ${seg('nation', 'The rest of Iran', [['auto', 'Model decides'], ['alone', 'This city alone'], ['some', 'Some cities'], ['all', 'Nationwide']], S.nation, 'When the whole country rises for days, belief that the regime can win starts to crack.')}
        ${seg('net', 'The internet', [['auto', 'Regime decides'], ['on', 'On'], ['slow', 'Slowed'], ['off', 'Cut']], S.net, 'In January 2026 it fell below 2% of normal, cut on the night of the biggest march.')}
        ${seg('power', 'Electricity', [['auto', 'Regime decides'], ['on', 'On'], ['cuts', 'Cuts'], ['off', 'Off']], S.power, 'The regime darkens the districts it raids at night.')}
        ${seg('loyalty', 'The forces’ loyalty', [['auto', 'As now'], ['firm', 'Rock solid'], ['shaky', 'Shaky']], S.loyalty, 'No unit has crossed over since 1979.')}
        ${seg('proxies', 'Foreign fighters', [['auto', 'Model decides'], ['none', 'None'], ['some', 'Some'], ['many', 'Many']], S.proxies, 'Between 800 and 5,000 reported in the whole country in January 2026 (unverified).')}
        ${seg('outside', 'Help from outside', [['auto', 'Model decides'], ['none', 'None'], ['pressure', 'Pressure and sanctions'], ['during', 'Strikes on the IRGC; people rise while they last'], ['after', 'Strikes on the IRGC; people rise after they stop']], S.outside, 'March 2026: more than 80 repression sites were struck and no unit broke; people stayed home while the bombs fell.')}
        ${seg('occasion', 'The day it starts', [['none', 'An ordinary day'], ['shock', 'A price shock'], ['funeral', 'A funeral or 40th day'], ['national', 'A national day']], S.occasion, 'A price shock spreads fastest and burns out soonest (2017, 2019).')}
        ${seg('days', 'How long it runs', [[14, 'Two weeks'], [28, 'Four weeks'], [56, 'Eight weeks']], S.days)}
        <div class="up-row"><div class="up-row-h"><b>${tr('Start time')}</b></div><div class="up-slide"><input type="range" id="up-hr" min="0" max="23" value="${S.hour}" aria-label="${tr('Start time')}"><output id="up-hr-o">${N_(String(S.hour).padStart(2, '0'))}:00 ${S.hour >= 20 || S.hour < 6 ? '☾' : '☀'}</output></div></div>
        <div class="up-row up-arm${S.armed ? ' on' : ''}"><div class="up-row-h"><b>${tr('Are the people armed?')}</b><span>${tr('Off unless you switch it on: they almost certainly would not be.')}</span></div>
          <div class="up-seg" data-k="armed" role="radiogroup"><button type="button" role="radio" data-v="false" aria-checked="${!S.armed}"${!S.armed ? ' class="on"' : ''}>${tr('Unarmed')}</button><button type="button" role="radio" data-v="true" aria-checked="${!!S.armed}"${S.armed ? ' class="on"' : ''}>${tr('Armed')}</button></div>
          ${S.armed ? `<div class="up-slide"><span>${tr('Guns')}</span><input type="range" id="up-guns" min="0" max="100" value="${Math.round(Math.log10(1 + S.guns) / 5.3 * 100)}" aria-label="${tr('Guns')}"><output id="up-guns-o">${fmt(S.guns)}</output></div><div class="up-slide"><span>${tr('Drones')}</span><input type="range" id="up-dr" min="0" max="100" value="${Math.round(Math.log10(1 + S.drones) / 4 * 100)}" aria-label="${tr('Drones')}"><output id="up-dr-o">${fmt(S.drones)}</output></div><p class="up-hint">${tr('In the research armed campaigns won about half as often as unarmed ones. Arms keep most people at home and hold the forces together.')}</p>` : ''}</div>`;
      wireSegs(el);
      $$('[data-bt]', el).forEach(b => b.addEventListener('click', () => loadHistory(b.dataset.bt)));
      const turn = D.getElementById('up-turn'), turnA = D.getElementById('up-turn-a');
      turn.addEventListener('input', () => { S.turnout = LOGT(+turn.value); turnA.checked = false; D.getElementById('up-turn-o').innerHTML = `<b>${N_(S.turnout.toFixed(S.turnout < 1 ? 2 : 1))}%</b> ${tf('{n} people', { n: big(BJ.pop * S.turnout / 100) })}`; });
      turn.addEventListener('change', () => { changed(); renderPane('cond'); });
      turnA.addEventListener('change', () => { S.turnout = turnA.checked ? null : Math.round(at * 10) / 10; changed(); renderPane('cond'); });
      const hr = D.getElementById('up-hr'); hr.addEventListener('input', () => { S.hour = +hr.value; D.getElementById('up-hr-o').textContent = N_(String(S.hour).padStart(2, '0')) + ':00 ' + (S.hour >= 20 || S.hour < 6 ? '☾' : '☀'); }); hr.addEventListener('change', () => { changed(); lightFor(S.hour); hudIdle(); });
      const gu = D.getElementById('up-guns'), dr = D.getElementById('up-dr');
      if (gu) { gu.addEventListener('input', () => { S.guns = Math.round(10 ** (+gu.value / 100 * 5.3) - 1); D.getElementById('up-guns-o').textContent = fmt(S.guns); }); gu.addEventListener('change', changed); }
      if (dr) { dr.addEventListener('input', () => { S.drones = Math.round(10 ** (+dr.value / 100 * 4) - 1); D.getElementById('up-dr-o').textContent = fmt(S.drones); }); dr.addEventListener('change', changed); }
    }
  }
  function wireSegs(el) {
    $$('.up-seg', el).forEach(g => g.addEventListener('click', ev => {
      const b = ev.target.closest('button[data-v]'); if (!b) return;
      const k = g.dataset.k; let v = b.dataset.v; if (k === 'armed') v = v === 'true'; if (k === 'days') v = +v;
      S[k] = v; if (k === 'armed' && !v && S.plan.type === 'armed') S.plan = Object.assign({}, S.plan, U.PLANS.centre, { type: 'centre' });
      changed(); renderPane(curTab); hudIdle();
    }));
  }
  async function loadHistory(id) {
    const b = (DATA.bt || []).find(x => x.id === id); if (!b) return;
    const S2 = mergeS(b.S);
    if (b.city !== cityId) { await switchCity(b.city, true); }
    S = S2; changed(); renderAll(); flash(tf('{n}: the real inputs are set. Watch it, or see the odds below.', { n: tr(b.name) }));
  }

  // ================================================================== the cost on all sides (1 November 2026)
  // Armin: "include an estimation of financial cost and casualties on all sides". The engine tallies each run (casOut: the
  // people's dead, injured and arrested; each force's dead, injured and crossed over; the hours on the street, the hours the
  // internet was cut, the strike's depth by sector). This prices those hours with research.json costs, low and high, so every
  // figure is a range and says estimate. Never a model input: the odds are what they were.
  const CO = DATA.costs || null;
  const FORCE_T = { faraja: 'Police (FARAJA)', basij: 'Basij', irgc: 'IRGC', plain: 'Plainclothes and intelligence', prox: 'Foreign fighters', army: 'Army (Artesh)' };
  const FORCE_E = { faraja: 'faraja', basij: 'basij', irgc: 'irgc', army: 'artesh' };
  function money(cs) {      // one run, in dollars: each line [low, high]
    if (!CO || !cs || !BJ) return null;
    const share = Math.min(1, BJ.pop / ((CO.popIran || {}).v || 9e7)), nat = cs.nat || 'alone';
    const reach = (CO.oilReach || {})[nat] != null ? CO.oilReach[nat] : 0.1, netShare = nat === 'all' ? 1 : nat === 'some' ? 0.4 : share;
    const gd = [CO.gdpUsdYear.low / 365, CO.gdpUsdYear.high / 365], ss = CO.sectorShare || {};
    const two = f => [f(0), f(1)], lh = (o, i) => (i ? o.high : o.low);
    return {
      forces: two(i => cs.fh / 24 * lh(CO.manDayUsd, i)),
      oil: two(i => cs.sh.oil / 24 * lh(CO.oilRevenueUsdDay, i) * reach),
      net: two(i => cs.nh / 24 * lh(CO.shutdownUsdDay, i) * netShare),
      strike: two(i => ['bazaar', 'truck', 'civil'].reduce((a, k) => a + (cs.sh[k] || 0) / 24 * gd[i] * share * ((ss[k] || {}).v || 0), 0)),
    };
  }
  function costOf(r) {      // a batch: the median of each line's low and high, and of each side's losses
    if (!r || !r.cas || !r.cas.length || !CO) return null;
    const M = r.cas.map(money).filter(Boolean);
    const med = f => U.quant(M.map(f), 0.5), out = {};
    for (const k of ['forces', 'oil', 'net', 'strike']) out[k] = [med(m => m[k][0]), med(m => m[k][1])];
    out.days = Math.max(1, U.quant(r.tEnd, 0.5) / 24);
    const q = f => U.quant(r.cas.map(f), 0.5);
    out.ppl = [q(c => c.p[0]), q(c => c.p[1]), q(c => c.p[2])];
    out.f = {}; for (const k of Object.keys(FORCE_T)) out.f[k] = [q(c => c.f[k][0]), q(c => c.f[k][1]), q(c => c.f[k][2])];
    return out;
  }
  const usd = v => { v = Math.max(0, v || 0); const s = v >= 1e9 ? (Math.round(v / 1e8) / 10) + (FA ? ' میلیارد' : 'bn') : v >= 1e6 ? (v >= 1e8 ? Math.round(v / 1e6) : Math.round(v / 1e5) / 10) + (FA ? ' میلیون' : 'M') : v >= 1e3 ? Math.round(v / 1e3) + (FA ? ' هزار' : 'k') : Math.round(v); return FA ? N_(s) + ' دلار' : '$' + s; };
  const rng$ = (a, b) => (Math.abs(b - a) < Math.max(1, b) * 0.08 ? usd((a + b) / 2) : (FA ? usd(a).replace(' دلار', '') + ' تا ' + usd(b) : usd(a) + '–' + usd(b).replace('$', '')));
  const srcA = o => (o && o.src && o.src[0] ? ' ' + ext(o.src[0], tr('source')) : '');
  function costHtml(C, perDay) {
    if (!C) return '';
    const d = perDay ? Math.max(1, C.days) : 1;
    const reg = [C.forces[0] + C.oil[0], C.forces[1] + C.oil[1]], eco = [C.net[0] + C.strike[0], C.net[1] + C.strike[1]];
    const line = (t, v, o) => (v[1] >= 1 ? `<li><span>${tr(t)}</span><b>${rng$(v[0] / d, v[1] / d)}</b>${srcA(o)}</li>` : '');
    const rows = Object.keys(FORCE_T).filter(k => C.f[k].some(v => v >= 1));
    return `<div class="up-costs">
      <div class="up-cc"><h4>${tr('The people')}</h4><div class="up-cnums"><div><b>${fmt(C.ppl[0])}</b><span>${tr('killed')}</span></div><div><b>${big(C.ppl[1])}</b><span>${tr('injured')}</span></div><div><b>${big(C.ppl[2])}</b><span>${tr('arrested')}</span></div></div>
        <h4>${tr('The forces')}</h4><table class="up-ctab"><thead><tr><th></th><th>${tr('killed')}</th><th>${tr('injured')}</th><th>${tr('crossed over')}</th></tr></thead><tbody>${rows.length ? rows.map(k => `<tr><th>${FORCE_E[k] ? embImg(FORCE_E[k], 'up-tip-e') : ''} ${tr(FORCE_T[k])}</th><td>${fmt(C.f[k][0])}</td><td>${big(C.f[k][1])}</td><td>${big(C.f[k][2])}</td></tr>`).join('') : `<tr><td colspan="4">${tr('No losses among the forces in a typical run.')}</td></tr>`}</tbody></table></div>
      <div class="up-cc"><h4>${tr(perDay ? 'The regime pays, a day' : 'The regime pays, over the run')}</h4><p class="up-cbig r">${rng$(reg[0] / d, reg[1] / d)}</p><ul class="up-clist">${line('Forces on the streets', C.forces, CO.manDayUsd)}${line('Oil money lost to the strike', C.oil, CO.oilRevenueUsdDay)}</ul>
        <h4>${tr(perDay ? 'The economy loses, a day' : 'The economy loses, over the run')}</h4><p class="up-cbig">${rng$(eco[0] / d, eco[1] / d)}</p><ul class="up-clist">${line('The internet cut', C.net, CO.shutdownUsdDay)}${line('Work stopped by the strike', C.strike, (CO.sectorShare || {}).bazaar)}</ul></div>
    </div><p class="up-src">${tr('Estimates, typical run. Casualties: the model, calibrated on the counts of 2019, 2022 and January 2026, all disputed. Money: research.json costs, low and high.')}</p>`;
  }
  // the cost so far in a watched run: the same prices over the hours recorded up to now (the head-up display)
  function costSoFar(fi) {
    if (!CO || !RUN || !RUN.cum) return null;
    const c = RUN.cum[Math.min(fi, RUN.cum.length - 1)];
    return money({ fh: c[0], nh: c[1], sh: { oil: c[2], bazaar: c[3], truck: c[4], civil: c[5] }, nat: RUN.X.nation });
  }

  // ================================================================== objectives and the grade of a watched run
  // A strategy game's clear goals (his ask: "a polished HUD with clear objectives ... and an end grade"). Three per run,
  // read from THIS city: hold its main square (or governorate) for three days; win over units of the forces (a unit is
  // about 500 men); keep the toll low, or, in a strike plan, keep the strike going for a week.
  function nice(v) { const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, v)))); return Math.max(10, Math.round(v / p * 2) / 2 * p); }
  function objectives() {
    const sq = SITES.find(q => q.k === 'square' && q.oi != null) || SITES.find(q => q.k === 'gov' && q.oi != null);
    const F0 = BJ.pop * U.K.forcesPerPop, units = Math.max(1, Math.round(F0 * 0.03 / 500)), toll = nice(BJ.pop * 0.00012);
    const P = U.planOf(S), strike = (P.sec.bazaar + P.sec.truck + P.sec.oil + P.sec.civil) / 4 > 0.4;
    const O = [];
    if (sq) O.push({ id: 'hold', t: tf('Hold {p} for 3 days', { p: siteName(sq) }), oi: sq.oi, need: 72 });
    O.push({ id: 'units', t: units === 1 ? tr('Win over 1 unit of the forces (about 500 men)') : tf('Win over {n} units of the forces (about {m} men)', { n: N_(units), m: fmt(units * 500) }), need: units * 500 });
    if (strike) O.push({ id: 'strike', t: tr('Keep the strike going for 7 days'), need: 168 });
    else O.push({ id: 'toll', t: tf('Keep the lives lost under {n}', { n: fmt(toll) }), need: toll });
    O.toll = toll;
    return O;
  }
  function objState(O, fi) {      // how far each objective has come by hour fi of the watched run (from its record)
    const g = RUN.rec.g, ho = O.find(x => x.id === 'hold'); let run = 0, best = 0, sh = 0;
    for (let i = 0; i <= fi && i < g.length; i++) {
      if (ho) { run = g[i].held && g[i].held[ho.oi] ? run + 1 : 0; if (run > best) best = run; }
      if (g[i].sigma >= 0.4) sh++;
    }
    const gi = g[Math.min(fi, g.length - 1)], end = fi >= g.length - 1;
    return O.map(o => {
      if (o.id === 'hold') return { p: best / o.need, done: best >= o.need, v: tf('{n} h held', { n: N_(best) }) };
      if (o.id === 'units') return { p: gi.def / o.need, done: gi.def >= o.need, v: big(gi.def) };
      if (o.id === 'strike') return { p: sh / o.need, done: sh >= o.need, v: tf('{n} days', { n: N_(Math.floor(sh / 24)) }) };
      return { p: gi.dead / o.need, done: end && gi.dead < o.need, fail: gi.dead >= o.need, v: fmt(gi.dead), low: 1 };
    });
  }
  const OUT_PTS = { liberated: 600, army: 480, zones: 380, stalemate: 220, war: 120, crushed: 60 };
  function grade(outcome, st, dead, toll) {
    let sc = OUT_PTS[outcome] || 0;
    for (const x of st) if (x.done) sc += 110;
    sc += Math.round(70 * Math.max(0, 1 - dead / Math.max(1, toll * 2)));
    sc = Math.min(1000, sc);
    return { sc, L: sc >= 900 ? 'S' : sc >= 750 ? 'A' : sc >= 600 ? 'B' : sc >= 430 ? 'C' : sc >= 260 ? 'D' : 'F' };
  }
  function planGrade(r) {      // a plan's grade from its odds: the regime falls, districts held, still standing at the end
    if (!r || !r.n) return null;
    const fall = (r.out.liberated + r.out.army) / r.n, hold = fall + r.out.zones / r.n, alive = 1 - r.out.crushed / r.n;
    return fall >= 0.4 ? 'A' : fall >= 0.2 ? 'B' : (fall >= 0.08 || hold >= 0.3) ? 'C' : (fall >= 0.02 || hold >= 0.1 || alive >= 0.5) ? 'D' : 'F';
  }

  // ================================================================== the workers: the odds, Compare, why, the best plan
  const NW = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
  let pool = null, jobId = 0, rr = 0;
  const pending = new Map();
  function slimBoard() { const B = Object.assign({}, BJ); delete B.roads; delete B.parks; delete B.water; delete B.military; delete B.named; delete B._p; delete B.chk; const H = Object.assign({}, B.hex); delete H.pts; B.hex = H; B.sec = (BJ.sec || []).map(q => ({ k: q.k, h: q.h })); return B; }
  function makePool() {
    if (pool) for (const w of pool) w.terminate();
    pool = []; pending.clear();
    const sb = slimBoard();
    for (let i = 0; i < NW; i++) {
      let w; try { w = new Worker(DATA.asset + 'uprising-engine.js'); } catch (_) { pool = null; return; }
      w.onmessage = m => { const p = pending.get(m.data.id); if (!p) return; pending.delete(m.data.id); if (m.data.err) p.rej(new Error(m.data.err)); else p.res(m.data.res); };
      w.onerror = () => { };
      w.postMessage({ op: 'board', id: ++jobId, board: sb }); pool.push(w);
    }
  }
  function job(msg) {
    return new Promise((res, rej) => {
      const id = ++jobId; msg.id = id;
      if (!pool) { try { res(U.batch(BJ, U.withTx(BJ, msg.S), msg.n, msg.seed, msg.slim)); } catch (e) { rej(e); } return; }
      pending.set(id, { res, rej }); pool[rr++ % pool.length].postMessage(msg);
    });
  }
  async function batch(Sx, n, seed, slim) {
    const per = Math.ceil(n / Math.max(1, (pool || [1]).length)), parts = [];
    for (let k = 0; k * per < n; k++) parts.push(job({ op: 'batch', S: Sx, n: Math.min(per, n - k * per), seed: seed + k * per * 7919, slim }));
    const rs = await Promise.all(parts);
    const out = { n: 0, out: {}, dead: [], arrested: [], peak: [], tEnd: [], def: [], cas: [], runs: [] }; for (const k of U.OUTCOMES) out.out[k] = 0;
    for (const r of rs) { out.n += r.n; for (const k in r.out) out.out[k] += r.out[k]; out.dead.push(...r.dead); out.arrested.push(...r.arrested); out.peak.push(...r.peak); out.tEnd.push(...r.tEnd); out.def.push(...(r.def || [])); out.cas.push(...(r.cas || [])); out.runs.push(...r.runs); }
    out.p = out.out.liberated / Math.max(1, out.n); out.fall = (out.out.liberated + out.out.army) / Math.max(1, out.n);
    return out;
  }
  const SEED0 = 104729;
  function wilson(p, n) { const z = 1.64; const d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - h) / d), Math.min(1, (c + h) / d)]; }
  // the live odds under the plan: a quick read every time something changes, so the reader sees what each choice does
  let oddsT = null, A = null, oddsDirty = -1;
  function oddsSoon() { clearTimeout(oddsT); const el = D.getElementById('up-odds'); tog(el, 'stale', true); oddsT = setTimeout(odds, 450); }
  async function odds() {
    if (!BJ) return;
    const my = dirty, Sx = clone(S), n = (S.days > 28 ? 24 : S.days > 14 ? 36 : 60) * (PHONE() ? 0.6 : 1) | 0;
    const r = await batch(Sx, n, SEED0, false);
    if (my !== dirty) return;
    const prev = A && A.city === cityId ? A.base : null;
    A = { S: Sx, city: cityId, base: r, why: null, need: null, best: null, prev, dirty: my };
    oddsDirty = my; renderOdds();
  }
  function renderOdds() {
    const el = D.getElementById('up-odds'); tog(el, 'stale', false);
    if (!A || !A.base) { el.innerHTML = `<span class="up-wait"><i></i>${tr('Working out the odds...')}</span>`; return; }
    const r = A.base, n = r.n, fall = (r.out.liberated + r.out.army) / n, dv = A.prev ? fall - (A.prev.out.liberated + A.prev.out.army) / A.prev.n : 0;
    const gL = planGrade(r), C = costOf(r);
    el.innerHTML = `<div class="up-o1"><i class="up-gb g-${gL}" title="${esc(tr('Plan grade'))}">${gL}</i><span>${tr('Your plan, run')} ${N_(n)}×</span><b>${pc(fall)}</b><em>${tr('the regime falls')}</em>${Math.abs(dv) >= 0.03 ? `<i class="${dv > 0 ? 'up' : 'dn'}">${dv > 0 ? '▲' : '▼'} ${N_(Math.round(Math.abs(dv) * 100))}</i>` : ''}</div>
      ${outBar(r.out, n, true)}
      <p class="up-o2">${tf('About {d} lives lost, {a} arrested, over {t} days in a typical run.', { d: fmt(U.quant(r.dead, 0.5)), a: big(U.quant(r.arrested, 0.5)), t: N_(Math.round(U.quant(r.tEnd, 0.5) / 24)) })}${C ? ' ' + tf('The regime pays about {r} a day.', { r: rng$((C.forces[0] + C.oil[0]) / C.days, (C.forces[1] + C.oil[1]) / C.days) }) : ''} <button type="button" class="up-link" id="up-oddsmore">${tr('Why?')}</button></p>`;
    D.getElementById('up-oddsmore').addEventListener('click', () => openResults());
  }
  function outBar(o, n, small) {
    return `<div class="up-obar${small ? ' sm' : ''}">${U.OUTCOMES.map(k => { const v = o[k] / n; return v > 0 ? `<i class="o-${k}" style="flex:${v}" title="${esc(tr(WORD.out[k]))} ${pc(v)}"></i>` : ''; }).join('')}</div><ul class="up-oleg${small ? ' sm' : ''}">${U.OUTCOMES.filter(k => !small || o[k] > 0).map(k => `<li class="o-${k}"><b>${pc(o[k] / n)}</b> ${tr(WORD.out[k])}</li>`).join('')}</ul>`;
  }
  async function why() {
    if (!A || A.whyRun) return; A.whyRun = true;
    const F = U.factors(A.S), out = [], n = (A.S.days > 14 ? 30 : 60) * (PHONE() ? 0.6 : 1) | 0, my = dirty;
    const b = await batch(A.S, n, SEED0, true);
    for (const f of F) { if (my !== dirty) return; const r = await batch(f.S, n, SEED0, true); out.push({ id: f.id, d: r.fall - b.fall, dd: U.quant(r.dead, 0.5) - U.quant(b.dead, 0.5) }); A.why = out.slice().sort((x, y) => Math.abs(y.d) - Math.abs(x.d) || Math.abs(y.dd) - Math.abs(x.dd)); if (resOpen()) renderResults(); }
  }
  function typicalSeed(r) {
    if (!r || !r.runs || !r.runs.length) return SEED0;
    let mode = 'crushed', mv = -1; for (const k of U.OUTCOMES) if (r.out[k] > mv) { mv = r.out[k]; mode = k; }
    const rs = r.runs.filter(x => x.o === mode).sort((a, b) => a.dead - b.dead);
    return rs.length ? rs[Math.floor(rs.length / 2)].seed : SEED0;
  }
  async function watchIt() {
    D.getElementById('up-watch').disabled = true;
    try { if (!A || A.dirty !== dirty) await odds(); } catch (_) { }
    D.getElementById('up-watch').disabled = false;
    play(typicalSeed(A && A.base), 'typical');
  }

  // ================================================================== Compare: up to four plans side by side
  const cmpEl = D.getElementById('up-cmp');
  let cmpGoal = 'fall', cmpRes = [];
  function cmpName() { return S.plan.adv ? tr((ADV.find(a => a.id === S.plan.adv) || {}).n || 'Your plan') : tf('Your plan {n}', { n: N_(CMP.filter(x => !x.adv).length + 1) }); }
  function addCmp(name, Sx, adv) {
    if (CMP.length >= 4) CMP.shift();
    CMP.push({ name: name || cmpName(), S: clone(Sx || S), adv: adv || (Sx || S).plan.adv || null });
    cmpRes = []; saveAddr(); cmpCount(); flash(tf('Added to compare ({n} of 4).', { n: N_(CMP.length) }));
  }
  function cmpCount() { D.getElementById('up-cmpn').textContent = CMP.length ? N_(CMP.length) : ''; }
  async function openCmp() {
    cmpEl.hidden = false; renderCmp();
    if (!CMP.length) return;
    const my = CMP.map(x => JSON.stringify(x.S)).join('|');
    for (let i = 0; i < CMP.length; i++) {
      if (cmpRes[i] && cmpRes[i].key === JSON.stringify(CMP[i].S)) continue;
      const n = (CMP[i].S.days > 28 ? 50 : CMP[i].S.days > 14 ? 70 : 120) * (PHONE() ? 0.5 : 1) | 0;
      const r = await batch(CMP[i].S, n, SEED0 + 77, false);
      if (my !== CMP.map(x => JSON.stringify(x.S)).join('|')) return;
      cmpRes[i] = Object.assign(r, { key: JSON.stringify(CMP[i].S) }); if (!cmpEl.hidden) renderCmp();
    }
  }
  function renderCmp() {
    const b = D.getElementById('up-cmp-b'), c = cityOf(cityId);
    if (!CMP.length) { b.innerHTML = `<h2 id="up-cmp-h">${tr('Compare plans')}</h2><p class="up-note">${tr('Add up to four plans with “Add to compare”: an advisor’s, or your own. They run side by side here under the same conditions of luck, and the best one for the goal you pick is marked.')}</p>`; return; }
    const g = GOALS[cmpGoal], done = cmpRes.filter(Boolean).length === CMP.length;
    let best = -1, bv = null;
    if (done) CMP.forEach((x, i) => { const v = g[1](cmpRes[i]); if (bv == null || (g[2] === 'up' ? v > bv : v < bv)) { bv = v; best = i; } });
    b.innerHTML = `<h2 id="up-cmp-h">${tf('Compare plans in {c}', { c: esc(FA ? c.fa : c.n) })}</h2>
      <div class="up-goal" role="radiogroup" aria-label="${tr('What matters most')}"><span>${tr('What matters most')}</span>${Object.keys(GOALS).map(k => `<button type="button" role="radio" data-goal="${k}" aria-checked="${k === cmpGoal}"${k === cmpGoal ? ' class="on"' : ''}>${tr(GOALS[k][0])}</button>`).join('')}</div>
      <div class="up-cmpg">${CMP.map((x, i) => {
        const r = cmpRes[i], a = x.adv && ADV.find(q => q.id === x.adv);
        return `<div class="up-cmpc${i === best ? ' best' : ''}">${i === best ? `<span class="up-crown">★ ${tr('Best for this goal')}</span>` : ''}
          <div class="up-cmph">${a ? bust(a.id, 48) : `<i class="up-cmpi">${PLAN_ICON[x.S.plan.type] || '•'}</i>`}<div><b>${esc(x.name)}</b><span>${esc(tr(PLAN_T[x.S.plan.type][0]))} · ${tf('{d} weeks', { d: N_(x.S.days / 7) })}</span></div><button type="button" class="up-x2" data-cx="${i}" aria-label="${tr('Remove')}">✕</button></div>
          ${r ? `<div class="up-cmpv"><b>${pc((r.out.liberated + r.out.army) / r.n)}</b><span>${tr('the regime falls')}</span></div>${outBar(r.out, r.n, true)}
            <dl><dt>${tr('Plan grade')}</dt><dd><i class="up-gb g-${planGrade(r)}">${planGrade(r)}</i></dd><dt>${tr('Lives lost, typical run')}</dt><dd>${fmt(U.quant(r.dead, 0.5))}</dd>${(() => { const C = costOf(r); return C ? `<dt>${tr('Forces killed')}</dt><dd>${fmt(Object.keys(C.f).reduce((a, k) => a + C.f[k][0], 0))}</dd><dt>${tr('The regime pays, a day')}</dt><dd>${rng$((C.forces[0] + C.oil[0]) / C.days, (C.forces[1] + C.oil[1]) / C.days)}</dd>` : ''; })()}<dt>${tr('Arrested')}</dt><dd>${big(U.quant(r.arrested, 0.5))}</dd><dt>${tr('Still standing at the end')}</dt><dd>${pc(1 - r.out.crushed / r.n)}</dd><dt>${tr('Days it lasts')}</dt><dd>${N_(Math.round(U.quant(r.tEnd, 0.5) / 24))}</dd></dl>
            <div class="up-cmpb"><button type="button" class="up-sec" data-cw="${i}">▶ ${tr('Watch')}</button><button type="button" class="up-sec" data-cu="${i}">${tr('Use')}</button></div>` : `<span class="up-wait"><i></i>${tr('Running...')}</span>`}
        </div>`; }).join('')}</div>
      <p class="up-src">${tr('Every plan runs with the same seeds of luck, so the differences come from the plans, not from chance.')} <button type="button" class="up-link" id="up-cmpshare">${tr('Copy the link to this comparison')}</button></p>`;
    $$('[data-goal]', b).forEach(x => x.addEventListener('click', () => { cmpGoal = x.dataset.goal; renderCmp(); }));
    $$('[data-cx]', b).forEach(x => x.addEventListener('click', () => { CMP.splice(+x.dataset.cx, 1); cmpRes.splice(+x.dataset.cx, 1); saveAddr(); cmpCount(); renderCmp(); }));
    $$('[data-cu]', b).forEach(x => x.addEventListener('click', () => { S = mergeS(CMP[+x.dataset.cu].S); changed(); renderAll(); closeOv(cmpEl); flash(tr('The plan is set.')); }));
    $$('[data-cw]', b).forEach(x => x.addEventListener('click', () => { const i = +x.dataset.cw; S = mergeS(CMP[i].S); changed(); renderAll(); closeOv(cmpEl); play(typicalSeed(cmpRes[i]), 'typical'); }));
    D.getElementById('up-cmpshare').addEventListener('click', ev => copyLink(ev.currentTarget));
  }
  // ================================================================== the best plans (1 November 2026)
  // Armin: "better at finding the best strategy (better than all the relevant experts)". Every approach and 40 variations
  // of its dials and its strike, plus each advisor's own plan, run under the reader's conditions with the same luck; all
  // of them at once across the workers, with a progress bar; then the best three for each goal are run again, longer, to
  // be sure. Each winner says why it wins (what in it differs from the field) and the history it rests on (PREC: cases in
  // research.json, checked by uprising.py --check), and whether it beats the best advisor.
  const PREC = { centre: ['eg-2011', 'rev-1978'], districts: ['bd-2024', 'wlf-2022'], water: ['hk-2019', 'wlf-2022'], strike: ['rev-1978', 'sd-2019'], soldiers: ['ph-1986', 'rs-2000'],
    roads: ['kz-2022', 'wlf-2022'], voice: ['ro-1989', 'rs-2000'], night: ['green-2009', 'wlf-2022'], armed: ['sy-2011', 'ly-2011'] };
  const WHYD = {      // what a winning plan has more of than the field, in words, and the finding behind it
    strike: ['A deep, long strike', 'general-strike'], fraternize: ['Steady appeals to the soldiers', 'defections-mechanism'], discipline: ['Strict nonviolence', 'cs-success-rates'],
    offline: ['Times and places agreed before the blackout', 'hassanpour-dispersion'], blockade: ['The roads in held', 'irgc-regional-hqs'], night: ['Small groups after dark', 'night-tactics'],
    medics: ['Medics and safe houses', 'arrests-and-afterwards'], abroad: ['The hour carried by satellite TV', 'hassanpour-dispersion'], film: ['Everything filmed and sent out', 'backfire'],
    conv: ['Everyone on the same targets', 'revolutionary-city'], voice: ['The broadcaster taken', 'revolutionary-city'], oil: ['The oil workers out', 'general-strike'] };
  const bestEl = D.getElementById('up-best');
  let BEST = null, bestGoal = 'fall';
  function caseOf(id) { return (DATA.world || []).find(w => w.id === id) || (DATA.iran || []).map(u => ({ id: u.id, n: u.n, y: (u.start || '').slice(0, 4), out: u.out, src: u.src })).find(w => w.id === id); }
  function planWhy(p, field) {
    const out = [], P = Object.assign({}, U.PLANS[p.type] || {}, p), sec = P.sec || null;
    const mean = k => field.reduce((a, x) => a + (+((x.S.plan.sec && k === 'oil') ? x.S.plan.sec.oil : x.S.plan[k]) || 0), 0) / Math.max(1, field.length);
    const vals = Object.keys(WHYD).map(k => [k, (k === 'oil' ? (sec ? sec.oil : P.strike) : P[k]) || 0]).map(([k, v]) => [k, v, v - mean(k)]).filter(x => x[1] >= 0.6 && x[2] > 0.08).sort((a, b) => b[2] - a[2]);
    for (const [k] of vals.slice(0, 3)) { const f = findingOf(WHYD[k][1]); out.push(`<li>${tr(WHYD[k][0])}${f && f.src ? ' ' + ext(f.src, tr('source')) : ''}</li>`); }
    return out.join('');
  }
  async function openBest() {
    closeOv(cmpEl); bestEl.hidden = false;
    const my = dirty, Rn = U.rng(7), C = U.candidates(S, Rn), field = [];
    const dur = [14, 28, 56];
    C.forEach((p, i) => { const S2 = Object.assign(clone(S), { plan: Object.assign({ ign: S.plan.ign, gather: S.plan.gather, routes: S.plan.routes, adv: null }, p) }); if (i >= 9) S2.days = dur[Math.floor(Rn() * 3)]; field.push({ S: S2 }); });
    for (const t of Object.keys(U.PLANS)) { if (t === 'armed' && !S.armed) continue; if (S.days === 56) break; const S2 = Object.assign(clone(S), { days: 56, plan: Object.assign({ type: t, ign: S.plan.ign, gather: S.plan.gather, routes: S.plan.routes, adv: null }, U.PLANS[t]) }); field.push({ S: S2 }); }
    for (const a of ADV) { if (a.red) continue; const S2 = advS(a); field.push({ S: mergeS(S2), adv: a.id }); }
    const n1 = PHONE() ? 14 : 22, n2 = PHONE() ? 36 : 60;
    BEST = { my, field, done: 0, total: field.length, stage: 1, res: null };
    renderBest();
    // stage 1: every plan at once across the workers (job() spreads them), the bar moving as each one comes back
    await Promise.all(field.map((x, i) => batch(x.S, n1, SEED0 + 31, true).then(r => { x.r = r; BEST.done++; if (my === dirty && !bestEl.hidden) renderBest(); })));
    if (my !== dirty) return;
    // stage 2: the best three for each goal (and the best advisor), run again with more luck to be sure
    const pick = new Set();
    for (const g of Object.keys(GOALS)) {
      const G1 = GOALS[g], up = G1[2] === 'up', seen = new Set();
      const order = field.filter(x => !x.adv).slice().sort((a, b) => up ? G1[1](b.r) - G1[1](a.r) : G1[1](a.r) - G1[1](b.r));
      let k = 0; for (const x of order) { if (k >= 3) break; if (seen.has(x.S.plan.type)) continue; seen.add(x.S.plan.type); pick.add(x); k++; }
      const ad = field.filter(x => x.adv).sort((a, b) => up ? G1[1](b.r) - G1[1](a.r) : G1[1](a.r) - G1[1](b.r))[0]; if (ad) pick.add(ad);
    }
    BEST.stage = 2; BEST.done = 0; BEST.total = pick.size; renderBest();
    await Promise.all(Array.from(pick).map(x => batch(x.S, n2, SEED0 + 77, false).then(r => { x.r2 = r; BEST.done++; if (my === dirty && !bestEl.hidden) renderBest(); })));
    if (my !== dirty) return;
    BEST.stage = 3; renderBest();
  }
  function renderBest() {
    const b = D.getElementById('up-best-b'), c = cityOf(cityId);
    if (!BEST) return;
    const pct = Math.round(100 * BEST.done / Math.max(1, BEST.total)), working = BEST.stage < 3;
    let h = `<h2 id="up-best-h">${tf('The best plans for {c}', { c: esc(FA ? c.fa : c.n) })}</h2>
      <div class="up-prog${working ? '' : ' done'}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${working ? pct : 100}"><i style="width:${working ? pct : 100}%"></i><span>${working ? (BEST.stage === 1 ? tf('Trying {n} plans under your conditions: {d} of {t}', { n: N_(BEST.total), d: N_(BEST.done), t: N_(BEST.total) }) : tf('Checking the winners again with more runs: {d} of {t}', { d: N_(BEST.done), t: N_(BEST.total) })) : tf('{n} plans tried, the winners checked twice, the same luck for every plan', { n: N_(BEST.field.length) })}</span></div>
      <div class="up-goal" role="radiogroup" aria-label="${tr('What matters most')}"><span>${tr('What matters most')}</span>${Object.keys(GOALS).map(k => `<button type="button" role="radio" data-bg="${k}" aria-checked="${k === bestGoal}"${k === bestGoal ? ' class="on"' : ''}>${tr(GOALS[k][0])}</button>`).join('')}</div>`;
    const G1 = GOALS[bestGoal], up = G1[2] === 'up', val0 = x => G1[1](x.r2 || x.r);
    const val = x => { const r = x.r2 || x.r, v = val0(x); return up ? v + 1e-3 * GOALS.hold[1](r) + 1e-5 * GOALS.alive[1](r) : v - 1e-4 * GOALS.hold[1](r); };
    const have = BEST.field.filter(x => x.r && !x.adv);
    if (have.length) {
      const seen = new Set(), top = [];
      for (const x of have.slice().sort((a, b) => ((b.r2 ? 1 : 0) - (a.r2 ? 1 : 0)) * (BEST.stage === 3 ? 1 : 0) || (up ? val(b) - val(a) : val(a) - val(b)))) { if (top.length >= 3) break; if (seen.has(x.S.plan.type)) continue; seen.add(x.S.plan.type); top.push(x); }
      top.sort((a, b) => up ? val(b) - val(a) : val(a) - val(b));
      const ads = BEST.field.filter(x => x.adv && (x.r2 || x.r)).sort((a, b) => up ? val(b) - val(a) : val(a) - val(b)), ad = ads[0], adA = ad && ADV.find(q => q.id === ad.adv);
      const show = v => bestGoal === 'lives' ? fmt(v) : pc(v), unit = bestGoal === 'lives' ? tr('lives lost, typical run') : tr(G1[0]).toLowerCase();
      if (BEST.stage === 3 && bestGoal === 'fall' && top.length && val0(top[0]) < 0.01) h += `<p class="up-bnone">${tf('Under these conditions no plan brings the regime down in {c} within the weeks tried. The best ones still hold districts or keep the uprising alive; change the conditions (the whole country rising, the forces shaky, a longer strike) and search again.', { c: esc(FA ? c.fa : c.n) })}</p>`;
      h += `<div class="up-bests">${top.map((x, i) => {
        const r = x.r2 || x.r, v = val0(x), pr = (PREC[x.S.plan.type] || []).map(caseOf).filter(Boolean).slice(0, 2);
        const beat = ad && adA ? (up ? v - val0(ad) : val0(ad) - v) : null;
        return `<div class="up-bc${i === 0 ? ' first' : ''}"><span class="up-rank">${N_(i + 1)}</span>
          <div class="up-bch"><i class="up-cmpi">${PLAN_ICON[x.S.plan.type] || '•'}</i><div><b>${esc(tr(PLAN_T[x.S.plan.type][0]))}</b><span>${esc(tr(PLAN_T[x.S.plan.type][1]))} · ${tf('{d} weeks', { d: N_(x.S.days / 7) })}</span></div><i class="up-gb g-${planGrade(r)}">${planGrade(r)}</i></div>
          <div class="up-cmpv"><b>${show(v)}</b><span>${esc(unit)}</span></div>${outBar(r.out, r.n, true)}
          <h4>${tr('Why it wins')}</h4><ul class="up-bwhy">${planWhy(x.S.plan, have) || `<li>${tr('Its approach, under these conditions')}</li>`}</ul>
          ${pr.length ? `<h4>${tr('The history it rests on')}</h4><ul class="up-bprec">${pr.map(w => `<li><b>${esc(w.n)}</b>${w.y ? ` (${N_(w.y)})` : ''}${w.out ? ': ' + esc(String(w.out)) : ''}${w.src ? ' ' + ext(w.src, tr('source')) : ''}</li>`).join('')}</ul>` : ''}
          ${beat != null && Math.abs(beat) > 0.004 && bestGoal !== 'lives' ? `<p class="up-beat${beat > 0 ? '' : ' no'}">${beat > 0 ? tf('Beats the best advisor’s plan ({a}) by {p} points', { a: esc(tr(adA.n)), p: N_(Math.round(beat * 100)) }) : tf('The best advisor’s plan ({a}) does better here', { a: esc(tr(adA.n)) })}</p>` : ''}
          <div class="up-cmpb"><button type="button" class="up-play" data-bw="${BEST.field.indexOf(x)}"><i>▶</i><span>${tr('Watch')}</span></button><button type="button" class="up-sec" data-bu="${BEST.field.indexOf(x)}">${tr('Use')}</button><button type="button" class="up-sec up-ic" data-bc="${BEST.field.indexOf(x)}" aria-label="${tr('Add to compare')}">${ICO.add}<span>+</span></button></div></div>`;
      }).join('')}</div>`;
    } else h += `<span class="up-wait"><i></i>${tr('The first plans are running...')}</span>`;
    h += `<p class="up-src">${tr('Every plan runs with the same seeds of luck, so the differences come from the plans. A model to think with, not a forecast, and not instructions.')}</p>`;
    b.innerHTML = h;
    $$('[data-bg]', b).forEach(x => x.addEventListener('click', () => { bestGoal = x.dataset.bg; renderBest(); }));
    const F = i => BEST.field[+i];
    $$('[data-bw]', b).forEach(x => x.addEventListener('click', () => { const f = F(x.dataset.bw); S = mergeS(f.S); changed(); renderAll(); closeOv(bestEl); play(typicalSeed(f.r2 || f.r), 'typical'); }));
    $$('[data-bu]', b).forEach(x => x.addEventListener('click', () => { S = mergeS(F(x.dataset.bu).S); changed(); renderAll(); closeOv(bestEl); flash(tr('The plan is set.')); }));
    $$('[data-bc]', b).forEach(x => x.addEventListener('click', () => { const f = F(x.dataset.bc); addCmp(tr(PLAN_T[f.S.plan.type][0]), f.S, null); }));
  }
  const openCmpBest = openBest;


  // ================================================================== the results of a run, and why
  const resEl = D.getElementById('up-res');
  function resOpen() { return !resEl.hidden; }
  function openResults() { resEl.hidden = false; renderResults(); if (A && A.dirty === dirty) why(); else odds().then(() => { why(); renderResults(); }); }
  function mechs(runs) {
    const Wn = runs.filter(r => r.o === 'liberated' || r.o === 'army' || r.o === 'zones'), Ls = runs.filter(r => r.o === 'crushed' || r.o === 'stalemate');
    if (Wn.length < 3 || Ls.length < 3) return [];
    const M = [['Forces began to cross over', r => r.def > 50], ['A split at the top', r => r.split], ['The army stood aside or joined', r => r.army >= 2], ['The roads in were held', r => r.blk], ['The strike took hold', r => r.sig > 0.4], ['The whole country rose', r => r.nat === 'all'], ['No massacre night', r => r.mas < 0]];
    return M.map(([t, fn]) => { const a = Wn.filter(fn).length / Wn.length, b = Ls.filter(fn).length / Ls.length; return { t, a, b, d: Math.abs(a - b) }; }).sort((x, y) => y.d - x.d).slice(0, 4);
  }
  function analog() {
    const Sx = A.S, turn = Sx.turnout == null ? U.autoTurnout(BJ, Sx, null) : Sx.turnout, P = U.planOf(Sx), st = (P.sec.bazaar + P.sec.truck + P.sec.oil + P.sec.civil) / 4;
    const v = [Math.log(turn + 0.1), Sx.nation === 'alone' ? 0.3 : Sx.nation === 'some' ? 0.6 : 1, Sx.net === 'on' ? 1 : Sx.net === 'slow' ? 0.5 : 0.1, st, Sx.armed ? 0.2 : P.discipline];
    let best = null, bd = 1e9;
    for (const u of DATA.iran || []) { const m = u.mi || {}; if (m.turnoutPctOfCityPop == null) continue; const w = [Math.log((+m.turnoutPctOfCityPop || 0.1) + 0.1), m.nationwide ?? 0.5, m.internet ?? 0.5, m.strike ?? 0, m.nonviolent ?? 0.7]; const d = v.reduce((s2, x, i) => s2 + (x - w[i]) ** 2 * (i === 0 ? 1.4 : 1), 0); if (d < bd) { bd = d; best = u; } }
    return best;
  }
  function renderResults() {
    const b = D.getElementById('up-res-b'), c = cityOf(cityId), name = FA ? c.fa : c.n;
    let h = `<h2 id="up-res-h">${A && A.base ? tf('{c}: your plan, run {n} times', { c: esc(name), n: N_(A.base.n) }) : tf('{c}: the odds', { c: esc(name) })}</h2>`;
    if (RUN && !runStale) {
      const st = objState(RUN.O, RUN.rec.c.length - 1), G2 = grade(RUN.outcome, st, RUN.dead, RUN.O.toll);
      h += `<div class="up-grade g-${G2.L}"><div class="up-gdl"><b>${G2.L}</b><span>${N_(G2.sc)} ${tr('points')}</span></div><div class="up-gr"><p class="up-thisrun o-${RUN.outcome}"><b>${tr('The run you watched')}:</b> ${tr(WORD.out[RUN.outcome])}. ${tr(WORD.outLine[RUN.outcome])} ${tf('{d} lives lost, {a} arrested, {f} crossed over.', { d: fmt(RUN.dead), a: big(RUN.arrested), f: big(RUN.defected) })}</p>
        <ol class="up-objs up-objs-r">${RUN.O.map((o, i) => `<li class="${st[i].done ? 'done' : 'fail'}"><i aria-hidden="true">${st[i].done ? '✓' : '✕'}</i><span>${esc(o.t)}</span><em>${esc(st[i].v)}</em></li>`).join('')}</ol></div></div>`;
    }
    if (!A || !A.base) { b.innerHTML = h + `<span class="up-wait"><i></i>${tr('Running the plan many times...')}</span>`; return; }
    const B = A.base, fall = (B.out.liberated + B.out.army) / B.n, ci = wilson(fall, B.n);
    h += `<div class="up-r1"><div class="up-dial-big" style="--p:${fall}"><b>${pc(fall)}</b><span>${tr('chance the regime falls in the city')}</span><em>${tf('likely between {a} and {b}', { a: pc(ci[0]), b: pc(ci[1]) })}</em></div>
      <div class="up-r1b"><h3>${tr('How the runs ended')}</h3>${outBar(B.out, B.n)}<p class="up-cost">${tf('Lives lost in a typical run: {m} (one run in ten: more than {h}). Arrested, including the weeks after: {a}.', { m: fmt(U.quant(B.dead, 0.5)), h: fmt(U.quant(B.dead, 0.9)), a: big(U.quant(B.arrested, 0.5)) })}</p></div></div>`;
    { const C = costOf(B); if (C) h += `<h3>${tr('The cost on all sides')}</h3>${costHtml(C, true)}<p class="up-note">${tf('Over a typical run of {d} days the regime pays {r} and the economy loses {e}.', { d: N_(Math.round(C.days)), r: rng$(C.forces[0] + C.oil[0], C.forces[1] + C.oil[1]), e: rng$(C.net[0] + C.strike[0], C.net[1] + C.strike[1]) })}</p>`; }
    h += `<h3>${tr('Why: what moves the odds most')}</h3>`;
    if (!A.why) h += `<span class="up-wait"><i></i>${tr('Testing each factor on its own...')}</span>`;
    else { const mx = Math.max(0.05, ...A.why.map(x => Math.abs(x.d))); h += `<ul class="up-why">${A.why.slice(0, 8).map(x => `<li class="${x.d >= 0 ? 'up' : 'dn'}"><span>${tr(FACT_T[x.id] || x.id)}</span><i><b style="width:${(Math.abs(x.d) / mx * 50).toFixed(1)}%"></b></i><em>${x.d >= 0 ? '+' : '−'}${N_(Math.round(Math.abs(x.d) * 100))} ${tr('points')}${Math.abs(x.dd) >= 10 ? ` · ${x.dd > 0 ? '+' : '−'}${fmt(Math.abs(x.dd))} ${tr('lives')}` : ''}</em></li>`).join('')}</ul>`; }
    const ms = mechs(B.runs);
    if (ms.length) h += `<h3>${tr('What the better runs had')}</h3><ul class="up-mech">${ms.map(m => `<li><b>${tr(m.t)}</b><span>${tf('in {a} of the runs where the people held districts or more, {b} of the rest', { a: pc(m.a), b: pc(m.b) })}</span></li>`).join('')}</ul>`;
    const an = analog();
    if (an) h += `<h3>${tr('Closest in history')}</h3><p class="up-an"><b>${esc(an.n)}</b> (${esc(N_((an.start || '').slice(0, 4)))}): ${esc(an.out || '')}${an.src ? ' ' + ext(an.src, tr('source')) : ''}</p>`;
    h += `<div class="up-ract"><button type="button" class="up-play" id="up-r-play"><i>▶</i><span>${tr('Watch the most likely run')}</span></button>${B.out.liberated + B.out.army + B.out.zones ? `<button type="button" class="up-sec" id="up-r-win">${tr('Watch the best run')}</button>` : ''}<button type="button" class="up-sec" id="up-r-cmp">${tr('Add to compare')}</button><button type="button" class="up-sec" id="up-r-best">${tr('Find better plans')}</button></div>`;
    h += `<p class="up-src">${tr('A model to think with, not a forecast. It is held to history: with the real inputs of 2009, 2017, 2019, 2022 and January 2026 it gives what happened, and with 1978’s months of strikes it gives the fall. Every finding it stands on is in How it works.')}</p>`;
    b.innerHTML = h;
    const q = id => D.getElementById(id);
    q('up-r-play').addEventListener('click', () => { closeOv(resEl); play(typicalSeed(B), 'typical'); });
    if (q('up-r-win')) q('up-r-win').addEventListener('click', () => { const order = ['liberated', 'army', 'zones']; let r = null; for (const o of order) { r = B.runs.find(x => x.o === o); if (r) break; } closeOv(resEl); play(r ? r.seed : SEED0, 'best'); });
    q('up-r-cmp').addEventListener('click', () => addCmp());
    q('up-r-best').addEventListener('click', () => { closeOv(resEl); openCmpBest(); });
  }

  // ================================================================== the city picker
  const pickEl = D.getElementById('up-pick');
  function openPick() {
    pickEl.hidden = false;
    const L = ALLC.slice().sort((a, b) => (b.pop || 0) - (a.pop || 0)), map = DATA.map;
    D.getElementById('up-map').innerHTML = map ? `<svg viewBox="${map.vb}" role="img" aria-label="${tr('Map of Iran')}"><path class="up-ir" d="${map.d}"/>${L.map(c => c.xy ? `<g class="up-mc${c.id === cityId ? ' on' : ''}${c.ready === false ? ' soon' : ''}"${c.ready === false ? '' : ` data-c="${c.id}"`}><circle cx="${c.xy[0]}" cy="${c.xy[1]}" r="${(4 + Math.sqrt((c.pop || 2e5) / 1e6) * 6).toFixed(1)}"/><text x="${c.xy[0]}" y="${(c.xy[1] - 9).toFixed(1)}">${esc(FA ? c.fa : c.n)}</text></g>` : '').join('')}</svg>` : '';
    D.getElementById('up-clist').innerHTML = L.map(c => c.ready === false ? `<div class="up-ci soon"><b>${esc(FA ? c.fa : c.n)}</b><span>${tr('Its streets are being mapped. Coming soon.')}</span><em>${big(c.pop)}</em></div>`
      : `<button type="button" class="up-ci${c.id === cityId ? ' on' : ''}" data-c="${c.id}"><b>${esc(FA ? c.fa : c.n)}</b><span>${esc(FA ? c.n : c.fa)}</span><em>${big(c.pop)}</em><i style="--g:${c.g == null ? 0.5 : c.g}"></i></button>`).join('');
    $$('[data-c]', pickEl).forEach(b => b.addEventListener('click', () => { closeOv(pickEl); if (b.dataset.c !== cityId) switchCity(b.dataset.c); }));
    const on = $('.up-ci.on', pickEl); if (on) on.focus();
  }
  function closeOv(el) { el.hidden = true; }
  $$('.up-ov').forEach(o => o.addEventListener('click', ev => { if (ev.target === o || ev.target.closest('[data-close]')) closeOv(o); }));
  D.addEventListener('keydown', ev => { if (ev.key === 'Escape') { $$('.up-ov').forEach(o => { if (!o.hidden) closeOv(o); }); if (TOOL) { setTool(null); renderPane(curTab); } } });

  // ================================================================== How it works (with the backtest against history)
  D.getElementById('up-howb').addEventListener('click', () => {
    const F = DATA.findings || [], c = cityOf(cityId);
    const bt = (DATA.bt || []).filter(b => b.res);
    D.getElementById('up-how-b').innerHTML = `<h2 id="up-how-h">${tr('How it works')}</h2>
      <ol class="up-howl"><li>${tr('The city is built from its real streets (OpenStreetMap). The buildings OpenStreetMap maps stand at their real size; where it maps none, rows of houses, apartment blocks and shops of the usual Iranian forms fill the streets. Landmarks stand as their models.')}</li>
      <li>${tr('The regime’s places are drawn with the emblem of whoever runs them: the IRGC, the Basij, the police (FARAJA) or the army (Artesh). Where OpenStreetMap maps them, they stand where they are; where it does not (Basij bases almost never are), they stand where they typically are, in mosques and by population, and are labelled as typical placements.')}</li>
      <li>${tr('Every hour people come out where the uprising has reached and where they are angry, and go home where they are afraid or tired. The regime commits its forces one rung at a time: police, then Basij battalions with birdshot, then IRGC units with live fire. When the crowds peak, the internet is cut and it is night, it opens fire, as it did in 2019 and January 2026.')}</li>
      <li>${tr('Forces cross over only when they come to believe the regime is finished: when the people hold the places that matter, the whole country rises for days, strikes cut the regime’s money, the elite splits. Crowd size alone never moves them: no unit has crossed over since 1979.')}</li>
      <li>${tr('The odds come from running the same plan many times with different luck. Why comes from changing one thing at a time. Compare runs several plans with the same luck.')}</li></ol>
      <h3>${tr('Checked against history')}</h3>
      <p class="up-note">${tr('With each uprising’s real inputs typed in, the model must give what happened. The build fails if it does not.')}</p>
      <table class="up-bt"><thead><tr><th>${tr('Case')}</th><th>${tr('Regime falls')}</th><th>${tr('Crushed')}</th><th>${tr('Lives lost (model)')}</th><th>${tr('What happened')}</th></tr></thead><tbody>${bt.map(b => `<tr><td>${esc(tr(b.name))}</td><td>${pc(b.res.lib)}</td><td>${pc(b.res.crushed)}</td><td>${fmt(b.res.dead)}</td><td>${esc(FA ? (b.srcFa || '') : b.src)}</td></tr>`).join('')}</tbody></table>
      <p class="up-hint">${tr('Controls: drag to move, pinch or scroll to zoom, two fingers or the right button to turn and tilt. Tap a district or a place to see it.')}</p>
      <h3>${tr('The research it stands on')}</h3><ul class="up-fnd">${F.filter(f => !FA || f.cfa).map(f => `<li>${esc(f.c)}${f.src ? ' ' + ext(f.src, tr('source')) : ''}</li>`).join('')}</ul>
      <p class="up-src">${tf('Streets and places: {s}, read {d}.', { s: esc(BJ.src || '© OpenStreetMap contributors'), d: esc((BJ.secRead || BJ.readUtc || '').slice(0, 10)) })} ${tr('A model to think with, not a forecast, and not instructions.')}</p>`;
    D.getElementById('up-how').hidden = false;
  });

  // ================================================================== the panel, the modes, the legend, sharing
  const panel = D.getElementById('up-panel');
  function sheet(open) { tog(panel, 'min', !open); }
  // on a phone the two modes sit at the top of the plan sheet; on a computer in the top bar
  function placeModes() { const m = D.getElementById('up-modes'), want = PHONE() ? panel : top; if (m.parentNode !== want) { if (PHONE()) panel.insertBefore(m, D.getElementById('up-adv-pane')); else top.insertBefore(m, $('.up-acts', top)); } }
  placeModes(); W.addEventListener('resize', placeModes);
  D.getElementById('up-grab').addEventListener('click', () => sheet(panel.classList.contains('min')));
  function setMode(m) {
    mode = m; $$('#up-modes [data-mode]').forEach(b => { tog(b, 'on', b.dataset.mode === m); b.setAttribute('aria-selected', String(b.dataset.mode === m)); });
    D.getElementById('up-adv-pane').hidden = m !== 'adv'; D.getElementById('up-cmd-pane').hidden = m !== 'cmd'; if (m !== 'adv') dossier.hidden = true;
    if (m !== 'cmd') setTool(null);
    saveAddr(); renderAll(); sheet(true);
    D.getElementById('up-adv-pane').scrollTop = 0;
  }
  $$('#up-modes [data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  // THE KEY: what every colour on the board means, one tap away on every screen (2 November 2026, "you cannot tell what is
  // what"). Open by default on a computer before Play; a tap opens or closes it, and that choice is kept.
  let legOpen = null;
  function renderLegend() {
    const el = D.getElementById('up-legend'); if (!el) return;
    const per = RUN && RUN.xP > 1 ? tf('each dot or figure is about {n} people this hour', { n: big(RUN.xP) }) : tr('each dot or figure stands for many people');
    const open = legOpen != null ? legOpen : !PHONE() && !RUN;
    el.setAttribute('data-open', open ? '1' : '0');
    el.innerHTML = `<button type="button" class="up-legb" id="up-legb" aria-expanded="${open}" aria-controls="up-legbd"><span>${tr('What am I looking at')}</span></button><div class="up-legbd" id="up-legbd">
      <span><i class="up-lk p"></i>${tr('The people, and anyone who crossed over to them')}</span>
      <span><i class="up-lk r"></i>${tr('The regime’s forces: police, Basij, IRGC')}</span>
      <span><i class="up-lk m"></i>${tr('Volunteer medics')}</span>
      <span><i class="up-lk t"></i>${tr('Traffic and everything else')}</span>
      <span class="up-lg-t">${per}</span>
      <span><i class="up-lk l"></i>${tr('The edge of the districts the people hold')}</span>
      <span><i class="up-lk a"></i>${tr('What is happening now')}</span>
      <span><i class="up-lk d"></i>${tr('A life lost')}</span>
      <b>${tr('Who runs it')}</b>${[['irgc', 'IRGC'], ['basij', 'Basij'], ['faraja', 'Police (FARAJA)'], ['artesh', 'Army (Artesh)']].map(([id, t]) => `<span>${embImg(id)}${tr(t)}</span>`).join('')}<span class="up-lg-t">◌ ${tr('dimmed: typical placement, not mapped')}</span>${BJ && (BJ.bldN || 0) < 150 ? `<span class="up-lg-t up-lg-thin">${tf('OpenStreetMap maps only {n} buildings here; the rest are typical blocks on its real streets.', { n: N_(BJ.bldN || 0) })}</span>` : ''}</div>`;
    D.getElementById('up-legb').addEventListener('click', () => { legOpen = !(el.getAttribute('data-open') === '1'); renderLegend(); hudT = 0; });
  }
  function renderCity() { const c = cityOf(cityId); D.getElementById('up-cn').textContent = FA ? c.fa : c.n; D.getElementById('up-cf').textContent = FA ? (c.prov || '') : (c.fa || ''); }
  function renderAll() { renderCity(); if (mode === 'adv') renderAdv(); else renderPane(curTab); hudIdle(); renderOdds(); cmpCount(); }
  function flash(t) { const el = D.createElement('div'); el.className = 'up-flash'; el.textContent = t; ui.appendChild(el); setTimeout(() => el.remove(), 2800); }
  function copyLink(btn) {
    const u = location.origin + addr();
    (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => { btn.textContent = tr('Copied'); }, () => { const ta = D.createElement('textarea'); ta.value = u; ta.className = 'up-copy'; btn.after(ta); ta.select(); });
  }
  D.getElementById('up-pickb').addEventListener('click', openPick);
  D.getElementById('up-cmpb').addEventListener('click', openCmp);
  D.getElementById('up-share').addEventListener('click', ev => copyLink($('span', ev.currentTarget)));
  D.getElementById('up-watch').addEventListener('click', watchIt);
  D.getElementById('up-addcmp').addEventListener('click', () => addCmp());
  D.getElementById('up-bestb').addEventListener('click', openBest);

  async function switchCity(id, keepS) {
    if (RUN) endRun();
    RUN = null; A = null; advOdds = {}; cmpRes = []; feedReset();
    cityId = id; if (!keepS) { S.plan.ign = null; S.plan.gather = []; S.plan.routes = []; }
    BJ = await loadBoard(id); BLD = null;
    buildWorld(BJ); makePool(); renderLegend();
    renderAll(); saveAddr();
    tog(D.getElementById('up-boot'), 'off', true);
    oddsSoon();
    // the buildings OpenStreetMap maps come after the board is up
    if (BJ.bldN) fetch(DATA.asset + 'b/' + id + '-bld.json', { cache: 'force-cache' }).then(r => (r.ok ? r.json() : null)).then(j => { if (j && cityId === id && BJ) { BLD = j; rebuildBuildings(); } }).catch(() => { });
  }
  renderLegend();
  await switchCity(cityId, true);
  setMode(mode);
  requestAnimationFrame(frame);
  if (qs.get('adv') && ADV.some(a => a.id === qs.get('adv'))) { setMode('adv'); advSel = qs.get('adv'); renderAdv(); advRun(advSel); }
  if (qs.get('tab') && ['start', 'moves', 'strike', 'tools', 'cond'].includes(qs.get('tab'))) { setMode('cmd'); showTab(qs.get('tab')); }
  if (qs.get('cmp')) openCmp();
  if (qs.get('res')) openResults();
  if (qs.get('play')) { await odds(); play(typicalSeed(A && A.base), 'typical'); const at = parseInt(qs.get('at'), 10); if (at > 0 && RUN) { tPos = Math.min(at, RUN.rec.c.length - 1); playing = false; setPP(); } }
  W.UPRPAGE = { get city() { return cityId; }, get builds() { return [BUILDS, BLDS]; }, get S() { return S; }, get A() { return A; }, get RUN() { return RUN; }, get FPS() { return FPS; }, get cam() { return cam; }, get CMP() { return CMP; }, get PPL() { return PPL; }, get visible() { return visible; }, get clock() { return clock; }, get rafN() { return rafN; }, get hidden() { return D.hidden; }, get frameErr() { return frameErr; }, lost: () => renderer.getContext().isContextLost(), info: () => JSON.stringify(renderer.info.render), stats: () => ({ triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, lod: LOD2 ? 'phone' : LOWP ? 'low' : 'full' }), tagOverlaps: () => { placeLabels(true); return tagOverlaps(); }, breakdown: () => { const out = {}; world.children.forEach((o, i) => { let t = 0, c = 0; o.traverseVisible(m => { if (!m.isMesh || !m.geometry) return; const g = m.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3; t += n * (m.isInstancedMesh ? m.count : 1); c++; }); const k = (o.name || o.type) + (o.userData.type ? ':' + o.userData.type : ''); out[k] = out[k] || [0, 0]; out[k][0] += Math.round(t); out[k][1] += c; }); return out; },
    play, odds, switchCity, openResults, openCmp, setMode, showTab, useAdv: id => useAdv(ADV.find(a => a.id === id), false), addCmp, camFly, camHome,
    seek: h => { if (RUN) { tPos = clamp(h, 0, RUN.rec.c.length - 1); playing = false; setPP(); } }, tick: dt => { clock += dt; playTick(dt); },
    // THE STREET CHECK (2 November 2026), the one home of what fails a publish: both sites' phone tests
    // (build/phone-test.html, ../site-iu/build/phone-test.html) and the cloud runner (build/uprising_street_check.mjs) call it
    // and fail on any line it returns. It plays the typical run a few seconds and counts: figures off the street network or
    // inside a building, cars against their lane, the default speed and the speed buttons, place names and effects over
    // their caps, errors on the page, and the frame rate on a low-power setting (the phone level of detail).
    streetCheck: async (opt) => {
      opt = opt || {}; const bad = [], wait = ms => new Promise(r => setTimeout(r, ms));
      if (!RUN && speed !== 1) bad.push('the default speed is ' + speed + '×, it must be 1×');
      const sb = $$('.up-spd button', bar).map(b => +b.dataset.spd).join(','); if (sb !== '0.5,1,2,4') bad.push('the speed buttons are ' + sb + ', they must be 0.5,1,2,4');
      const on = $('.up-spd button.on', bar); if (!RUN && (!on || +on.dataset.spd !== 1)) bad.push('the speed shown as chosen is not 1×');
      if (!ST || !ST.A) { bad.push('the street movement did not start'); return { bad }; }
      play(104729); tPos = opt.at || 20; frameShown = -1; playing = true; setPP();
      await wait(opt.ms || 3500);
      const a = ST.audit(); placeLabels(true); const t = tagOverlaps();
      if (a.offStreet) bad.push(a.offStreet + ' figures stand off the street network (must be 0): ' + JSON.stringify(a.examples.filter(x => x[0] === 'off').slice(0, 3)));
      if (a.inBuilding) bad.push(a.inBuilding + ' figures or cars stand inside a building (must be 0): ' + JSON.stringify(a.examples.filter(x => x[0] !== 'off').slice(0, 3)));
      if (a.wrongLane) bad.push(a.wrongLane + ' cars drive against their lane (must be 0)');
      if (a.figures < 10) bad.push('only ' + a.figures + ' figures on the streets during a run');
      if (a.maxWalk > 3.5 || a.maxCar > 25) bad.push('speeds out of the real range: walking up to ' + a.maxWalk + ' m/s, cars up to ' + a.maxCar + ' m/s');
      if (t.shown > LABCAP() + 3) bad.push(t.shown + ' names on the board, over the cap of ' + (LABCAP() + 3));
      if (FXMAX > FXCAP) bad.push(FXMAX + ' effects at once, over the cap of ' + FXCAP);
      if (frameErr || pageErr) bad.push((frameErr + pageErr) + ' errors on the page');
      { renderer.render(scene, camera); const ri = renderer.info.render; if (LOD2 && (ri.triangles > 200000 || ri.calls > 80)) bad.push('the phone frame is ' + ri.triangles + ' triangles and ' + ri.calls + ' draw calls (budget 200,000 and 80)'); }
      if (LOD2 && FPS < (opt.fpsFloor || 5)) bad.push('the phone level of detail runs at ' + Math.round(FPS) + ' frames a second (floor ' + (opt.fpsFloor || 5) + ')');
      stopPlay();
      return { bad, audit: a, fps: Math.round(FPS), lod: LOD2 ? 'phone' : LOWP ? 'low' : 'full' };
    },
    // the street audit (2 November 2026): what build/phone-test.html and build/uprising_street_check.mjs fail on
    get ST() { return ST; }, get speed() { return speed; }, speedDefault: 1, get pace() { return pace; }, resume: () => { if (RUN) { playing = true; setPP(); } }, setSpeed: v => { const b = $$('.up-spd button', bar).find(x => +x.dataset.spd === v); if (b) b.click(); },
    audit: () => { const a = ST ? ST.audit() : { figures: 0, error: 'no street module' }; const shown = labelEls.concat(CHIPS).filter(t => t.style.display !== 'none' && t.offsetParent !== null).length;
      return Object.assign(a, { net: NETINFO, labelsShown: shown, labelCap: LABCAP(), fxMax: FXMAX, fxCap: FXCAP, fxLive: FXL.length, fps: FPS, lod: LOD2 ? 'phone' : LOWP ? 'low' : 'full', speedButtons: $$('.up-spd button', bar).map(b => +b.dataset.spd), speedOn: +(($('.up-spd button.on', bar) || {}).dataset || {}).spd }); } };
}
