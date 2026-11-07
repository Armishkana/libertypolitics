/* Guilds (../MOBILIZE.md, "Guilds"): the pages guilds/ (every guild), guilds/new/ (start one) and guilds/g/?id= (one guild).
   Imported by mobilize.js on those pages only ([data-mz="guilds" | "guildnew" | "guild"]), which hands it its helpers. BOTH
   SITES; what differs on the Iran site (../MOBILIZE.md, "The Iran site: what differs, and why"): the owner's name is never on a
   guild, only a guild's own members read who is in it and see names only (no link to a profile), a guild hosts no event,
   has no discussion, and every page says it is for people outside Iran.

   What may be written is decided by firebase/firestore.rules (the ninth version, "guilds"): a guild is guilds/<owner>-<1|2>,
   made by a Known member (reputation 10) or the team; its members count moves only with the member it names (last). A
   sentence both sites show goes through tt() (its Persian in site-iu/build/community-strings.json), one only Liberty Politics
   shows through en(). A person's words reach the page through textContent, never as markup. */

export async function init(box, X) {
  const { el, btn, tt, en, w, say, within, me, fb, page, K, IU, dig, ms, words, GUILD_OK } = X.h;
  const D = document, DATA = X.DATA, MZ = X.MZ;
  const body = box.querySelector('[data-mz-body]');
  const kind = box.getAttribute('data-mz');
  const P = MZ.guildPaths;
  const k = K();
  if (!body || !k || k.off) { if (body) body.setAttribute('aria-busy', 'false'); return; }
  const live = await X.v9();
  body.setAttribute('aria-busy', 'false');
  if (!live) { body.append(el('p', 'mb-empty', tt('Guilds open soon. Come back in a day or two.'))); return; }
  const L = { name: 40, line: 160, about: 1000 };
  const COV = DATA && DATA.covers && DATA.covers.src ? DATA.covers : null;
  const artSrc = (g, id) => { if (!COV) return ''; const all = COV.all || []; const a = g && COV.src[g.art] ? g.art : all[Math.abs([...String(id || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % Math.max(1, all.length)]; return COV.src[a] ? (D.documentElement.getAttribute('data-root') || './') + COV.src[a] : ''; };
  const restList = async (coll, where) => {
    const q = { structuredQuery: { from: [{ collectionId: coll }], where, limit: 200 } };
    const r = await within(15000, fetch(k.rest('runQuery'), { method: 'POST', body: JSON.stringify(q) }));
    if (!r.ok) return [];
    const got = await r.json();
    return (Array.isArray(got) ? got : []).filter(x => x && x.document).map(x => Object.assign(k.plain({ mapValue: { fields: x.document.fields || {} } }) || {}, { id: String(x.document.name || '').split('/').pop() }));
  };
  const eq = (field, v) => ({ fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: typeof v === 'boolean' ? { booleanValue: v } : { stringValue: v } } });
  const restDoc = async path => { try { const r = await within(15000, fetch(k.restDoc(path))); if (!r.ok) return null; const j = await r.json(); return k.plain({ mapValue: { fields: (j && j.fields) || {} } }) || null; } catch (x) { return null; } };
  const team = async uid => { try { return (await within(8000, k.team ? k.team() : Promise.resolve(new Set()))).has(uid); } catch (x) { return false; } };
  const safety = () => (IU ? el('p', 'mz-say', tt('Outside Iran only. Inside Iran? Do not join a guild: a membership is a record.')) : null);
  const signIn = (text) => { const p = el('p', 'mb-lede', text); const b = btn('btn btn-key', tt('Sign in'), () => k.open('auth', { opener: b })); const r = el('div', 'mb-acts'); r.append(b); return [p, r]; };

  /* ---------------------------------------------------------------- guilds/: every guild */
  if (kind === 'guilds') {
    const u = me();
    const head = el('div', 'mz-ghead');
    if (!u) head.append(...signIn(tt('Sign in to join a guild or start your own.')));
    else {
      const st = await X.standing(u.uid), rep = st && typeof st.rep === 'number' ? st.rep : 0;
      if (rep >= MZ.guildRep || await team(u.uid)) head.append(el('a', 'btn btn-key', tt('Start a guild'), { href: page(P.new) }));
      else head.append(el('p', 'mz-say', tt('You can start a guild once your reputation reaches {m}. You have {n}. Join one first: it grows when members like what you write and when you show up.', { m: MZ.guildRep, n: rep })));
    }
    const s = safety(); if (s) head.append(s);
    body.append(head);
    const [gs, xs] = await Promise.all([restList('guilds', eq('hidden', false)), restList('guildxp')]);
    const xp = Object.fromEntries(xs.map(x => [x.id, x]));
    const list = gs.filter(g => GUILD_OK(g.id)).sort((a, b) => (b.members || 0) - (a.members || 0) || ((xp[b.id] || {}).xp || 0) - ((xp[a.id] || {}).xp || 0));
    if (!list.length) { body.append(el('p', 'mb-empty', tt('No guild yet. Start the first one, and the people near you have somewhere to belong.'))); return; }
    const ul = el('ul', 'mz-glistp');
    list.forEach(g => {
      const li = el('li'), a = el('a', 'mz-gcard', null, { href: page(P.one + '?id=' + encodeURIComponent(g.id)) });
      const cv = el('div', 'mz-gcov', null, { role: 'img', 'aria-label': g.name || '' }); const src = artSrc(g, g.id); if (src) cv.style.backgroundImage = 'url("' + src + '")';
      const b = el('div', 'mz-gbody');
      b.append(el('p', 'mz-gname', g.name || ''));
      if (g.line) b.append(el('p', 'mz-gline', g.line));
      b.append(el('p', 'mz-gmeta', (g.members === 1 ? tt('1 member') : tt('{n} members', { n: g.members || 0 })) + ' · ' + tt('{n} XP together', { n: (xp[g.id] || {}).xp || 0 }) + ' · ' + (g.open ? tt('Anyone can join') : tt('Ask to join'))));
      a.append(cv, b); li.append(a); ul.append(li);
    });
    body.append(ul);
    return;
  }

  /* ---------------------------------------------------------------- guilds/new/: start one */
  if (kind === 'guildnew') {
    const u = me();
    if (!u || !u.v) { body.append(...signIn(u ? tt('Confirm your email first. The link is in your inbox.') : tt('Sign in to start a guild.'))); if (u) body.lastChild.remove(); return; }
    const st = await X.standing(u.uid), rep = st && typeof st.rep === 'number' ? st.rep : 0;
    if (rep < MZ.guildRep && !(await team(u.uid))) { body.append(el('p', 'mz-say', tt('You can start a guild once your reputation reaches {m}. You have {n}. Join one first: it grows when members like what you write and when you show up.', { m: MZ.guildRep, n: rep }))); return; }
    const { F, db } = await within(25000, fb());
    const ids = [u.uid + '-1', u.uid + '-2'];
    let free = '';
    for (const id of ids) { try { const s = await F.getDoc(F.doc(db, 'guilds', id)); if (!s.exists()) { free = id; break; } } catch (x) { free = free || id; break; } }
    if (!free) { body.append(el('p', 'mz-say', tt('You already run two guilds, the most anyone can. Hand the work to your mods, or close one to start another.'))); return; }
    body.append(guildForm(null, async (doc, line, go) => {
      try {
        const b = F.writeBatch(db);
        b.set(F.doc(db, 'guilds', free), Object.assign({ ownerUid: u.uid, ownerName: IU ? '' : u.name, members: 1, last: u.uid, hidden: false, createdAt: F.serverTimestamp() }, doc));
        b.set(F.doc(db, 'guilds', free, 'members', u.uid), { uid: u.uid, name: u.name, role: 'owner', at: F.serverTimestamp() });
        await within(30000, b.commit());
        location.href = page(P.one + '?id=' + encodeURIComponent(free));
      } catch (e) { go.disabled = false; say(line, e && e.code === 'permission-denied' ? tt('The database said no. Your reputation may have changed: look at your profile.') : words(e), true); }
    }, tt('Start the guild')));
    const s = safety(); if (s) body.append(s);
    return;
  }

  /* The form for a guild's words: its name, one line, why join, open or ask, its picture. done(doc, line, button). */
  function guildForm(g, done, label) {
    g = g || {};
    const form = el('form', 'mb-form mz-new', null, { novalidate: '' }), line = el('p', 'mb-say', '', { role: 'status', 'aria-live': 'polite' });
    const f = (lab, input, hint) => { const d = el('label', 'mb-f'); d.append(el('span', 'mb-l', lab), input); if (hint) d.append(el('span', 'mb-hint', hint)); return d; };
    const name = el('input', null, null, { type: 'text', maxlength: String(L.name), autocomplete: 'off', 'data-mz-name': '' }); name.value = g.name || '';
    const ln = el('input', null, null, { type: 'text', maxlength: String(L.line), autocomplete: 'off', 'data-mz-line': '' }); ln.value = g.line || '';
    const ab = el('textarea', null, null, { maxlength: String(L.about), rows: '4', 'data-mz-about': '', 'data-consent': 'terms' }); ab.value = g.about || '';
    let open = g.open !== false, art = g.art || ((COV && COV.all && COV.all[0]) || '');
    const oc = el('div', 'mb-chips', null, { role: 'group', 'aria-label': tt('Who can join') });
    const paintO = () => { oc.textContent = ''; [[true, tt('Anyone can join'), tt('They are in at once')], [false, tt('Ask to join'), tt('You or a mod says yes to each')]].forEach(([v, t, s]) => { const b = btn('mb-chip', null, () => { open = v; paintO(); }); b.append(el('b', null, t), el('span', null, s)); b.setAttribute('aria-pressed', String(open === v)); oc.append(b); }); };
    paintO();
    const ac = el('div', 'mb-chips mz-arts', null, { role: 'group', 'aria-label': tt('Its picture') });
    const paintA = () => { ac.textContent = ''; ((COV && COV.all) || []).forEach(a => { const b = btn('mb-chip mz-art', null, () => { art = a; paintA(); }); const i = el('img', null, null, { src: (D.documentElement.getAttribute('data-root') || './') + COV.src[a], alt: (COV.alt && COV.alt[a]) || '', width: '96', height: '54', loading: 'lazy' }); b.append(i); b.setAttribute('aria-pressed', String(art === a)); ac.append(b); }); };
    paintA();
    form.append(f(tt('Name of the guild'), name, IU ? tt('Like Iranians of Toronto. Never a place inside Iran.') : en('Like Austin Liberty Circle.')),
      f(tt('One line people see on its card'), ln, tt('What you do together, in a few words.')),
      f(tt('Why join'), ab, tt('Optional. Who it is for, how often you meet, what you are working on.')),
      el('span', 'mb-l', tt('Who can join')), oc, el('span', 'mb-l', tt('Its picture')), ac);
    const go = el('button', 'btn btn-key', label, { type: 'submit' });
    /* what posting means, and the link to the terms (data/consent.json; members.js termsLine is the same line): build/consent.py */
    const terms = el('p', 'mb-hint consent-note');
    terms.append(tt('What you post here can be shown, quoted and shared on the site and on the shows.') + ' ', el('a', null, tt('The terms'), { href: page('terms/'), target: '_blank', rel: 'noopener' }));
    form.append(go, line, terms);
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const N = name.value.trim().replace(/\s+/g, ' '), LN = ln.value.trim().replace(/\s+/g, ' '), AB = ab.value.replace(/\r/g, '').trim();
      const looks = k.looksLikeAddress || (() => false);
      if (N.length < 3) { say(line, tt('Give it a name of three letters or more.'), true); name.focus(); return; }
      if (/[<>]/.test(N + LN + AB)) { say(line, tt('Leave out the < and > signs.'), true); return; }
      if ([N, LN, AB.replace(/\n/g, ' ')].some(looks)) { say(line, tt('That looks like an address or a phone number. A guild is public: leave them out.'), true); return; }
      if (/libertypolitics|iranuncensored|arminnavabi/.test(N.toLowerCase().replace(/[ ._'@-]/g, ''))) { say(line, tt('That name is kept for the site.'), true); return; }
      go.disabled = true; say(line, tt('Sending.'));
      done({ name: N, line: LN, about: AB, open, art: /^[a-z0-9-]{2,40}$/.test(art) ? art : '' }, line, go);
    });
    return form;
  }

  /* ---------------------------------------------------------------- guilds/g/?id=: one guild */
  if (kind !== 'guild') return;
  const id = new URLSearchParams(location.search).get('id') || '';
  const h1 = box.querySelector('[data-mz-h]');
  const gone = () => { body.textContent = ''; body.append(el('p', 'mb-empty', tt('This guild is not here any more.')), el('a', 'btn btn-line', tt('See every guild'), { href: page(P.list) })); const t = D.getElementById('talk'); if (t) t.hidden = true; };
  if (!GUILD_OK(id)) { gone(); return; }
  async function draw() {
    let G = await restDoc('guilds/' + id);
    const u = me();
    if (!G && u) { try { const { F, db } = await within(25000, fb()); const s = await F.getDoc(F.doc(db, 'guilds', id)); G = s.exists() ? s.data() : null; } catch (x) { G = null; } }
    if (!G) { gone(); return; }
    body.textContent = '';
    if (h1) h1.textContent = G.name || '';
    try { D.title = (G.name || '') + (D.title.includes('|') ? ' |' + D.title.split('|').slice(1).join('|') : ''); } catch (x) { }
    const t = D.getElementById('talk'), th = D.getElementById('talk-h');
    if (t) t.setAttribute('data-name', String(G.name || '').slice(0, 80));
    if (th) th.textContent = G.name || '';
    const gx = await restDoc('guildxp/' + id) || {};
    const head = el('div', 'mz-ghead');
    const cv = el('div', 'mz-gbig', null, { role: 'img', 'aria-label': G.name || '' }); const src = artSrc(G, id); if (src) cv.style.backgroundImage = 'url("' + src + '")';
    head.append(cv);
    if (G.line) head.append(el('p', 'mb-lede', G.line));
    if (G.hidden) head.append(el('p', 'mb-say bad', tt('This guild is hidden from others while I look at a report about it.')));
    const nums = el('ul', 'mz-gnums');
    const num = (n, t) => { const li = el('li'); li.append(el('b', null, dig(n)), el('span', null, t)); nums.append(li); };
    num(G.members || 0, G.members === 1 ? tt('member') : tt('members')); num(gx.xp || 0, tt('XP together'));
    head.append(nums);
    if (!IU && G.ownerName) { const o = el('p', 'mb-host mb-row'); o.append(k.face ? k.face(G.ownerName, G.ownerUid) : el('span'), el('span', null, en('Run by')), el('a', null, G.ownerName, { href: page(((DATA && DATA.paths && DATA.paths.member) || 'member/') + '?u=' + encodeURIComponent(G.ownerUid)) })); head.append(o); }
    if (G.about) head.append(el('div', 'mb-desc', G.about));
    body.append(head);
    const act = el('div', 'mb-f', null, { id: 'join' }), line = el('p', 'mb-say', '', { role: 'status', 'aria-live': 'polite' });
    body.append(act, line);
    const s0 = safety(); if (s0) body.append(s0);
    if (!u) { act.append(...signIn(G.open ? tt('Sign in, then one tap and you are in.') : tt('Sign in, then ask to join.'))); }
    if (!u) { await extras(G, gx, null, null, null, ''); return; }
    const { F, db } = await within(25000, fb());
    const gref = F.doc(db, 'guilds', id), mref = F.doc(db, 'guilds', id, 'members', u.uid);
    let mine = null; try { const s = await F.getDoc(mref); mine = s.exists() ? s.data() : null; } catch (x) { }
    const role = mine ? mine.role : '';
    const two = (text, again, fn) => { let armed = false, tm = 0; const b = btn('mb-text', text, () => { if (!armed) { armed = true; b.textContent = again; b.classList.add('armed'); tm = setTimeout(() => { armed = false; b.textContent = text; b.classList.remove('armed'); }, 7000); return; } clearTimeout(tm); fn(); }); return b; };
    const busy = async (fn) => { say(line, tt('Sending.')); try { await within(25000, fn()); say(line, ''); await draw(); } catch (e) { say(line, words(e), true); } };
    if (!role) {
      if (!u.v) act.append(el('p', 'mb-hint', tt('Confirm your email first. The link is in your inbox.')));
      else if (G.open) act.append(btn('btn btn-key', tt('Join the guild'), () => busy(() => { const b = F.writeBatch(db); b.set(mref, { uid: u.uid, name: u.name, role: 'member', at: F.serverTimestamp() }); b.update(gref, { members: (G.members || 0) + 1, last: u.uid }); return b.commit(); })), el('p', 'mb-hint', tt('Anyone can join this one. One tap and you are in.')));
      else act.append(btn('btn btn-key', tt('Ask to join'), () => busy(() => F.setDoc(mref, { uid: u.uid, name: u.name, role: 'asked', at: F.serverTimestamp() }))), el('p', 'mb-hint', tt('The owner or a mod says yes to each.')));
    } else if (role === 'asked') {
      act.append(el('p', 'mb-lede', tt('You asked. The owner or a mod answers here.')), two(tt('Take back my ask'), tt('Tap again to be sure'), () => busy(() => F.deleteDoc(mref))));
    } else if (role === 'owner') {
      act.append(el('p', 'mb-lede', tt('You run this guild.')));
    } else {
      act.append(el('p', 'mb-lede', role === 'mod' ? tt('You are a mod of this guild.') : tt('You are in this guild.')),
        two(tt('Leave the guild'), tt('Tap again to be sure'), () => busy(() => { const b = F.writeBatch(db); b.delete(mref); b.update(gref, { members: Math.max(1, (G.members || 1) - 1), last: u.uid }); return b.commit(); })));
    }
    await extras(G, gx, F, db, u, role, gref, busy, two);
  }
  /* Who is in (Liberty Politics: any signed-in reader; the Iran site: its own members, names only), the requests for the owner
     and the mods, the guild's gatherings (Liberty Politics), its XP board, the owner's edit and close, and Report this. */
  async function extras(G, gx, F, db, u, role, gref, busy, two) {
    const lead = role === 'owner' || role === 'mod';
    if (!IU) {
      const evs = (await restList('gatherings', { compositeFilter: { op: 'AND', filters: [eq('hidden', false), eq('guild', id)] } }).catch(() => []))
        .filter(g => g.status !== 'cancelled').sort((a, b) => (typeof b.startAt === 'number' ? b.startAt : 0) - (typeof a.startAt === 'number' ? a.startAt : 0));
      const sec = el('section', 'mz-gsec');
      sec.append(el('h2', 'mb-h2', en('Its gatherings')));
      if (evs.length) { const ul = el('ul', 'mz-mlist'); evs.slice(0, 12).forEach(g => { const li = el('li'); li.append(el('a', null, g.title || '', { href: page(((DATA && DATA.paths && DATA.paths.one) || 'gatherings/g/') + '?id=' + encodeURIComponent(g.id)) }), el('span', 'mz-hint', g.city || '')); ul.append(li); }); sec.append(ul); }
      else sec.append(el('p', 'mz-hint', en('No gathering yet.')));
      if (lead) sec.append(el('a', 'btn btn-key', en('Host one for the guild'), { href: page(((DATA && DATA.paths && DATA.paths.new) || 'gatherings/new/') + '?guild=' + encodeURIComponent(id)) }));
      body.append(sec);
      if (Array.isArray(gx.top) && gx.top.length) {
        const b = el('section', 'mz-gsec'); b.append(el('h2', 'mb-h2', en('Who does the most')));
        const ol = el('ol', 'mz-board'); gx.top.forEach(r => { const li = el('li'); li.append(el('span', null, r.name || ''), el('b', null, tt('{n} XP', { n: r.xp || 0 }))); ol.append(li); });
        b.append(ol); body.append(b);
      }
    }
    const canSee = u && (!IU || ['owner', 'mod', 'member'].includes(role));
    const ms = el('section', 'mz-gsec');
    ms.append(el('h2', 'mb-h2', tt('Who is in')));
    if (!canSee) ms.append(el('p', 'mz-hint', IU ? tt('Only the guild\'s own members see who is in it.') : en('Sign in to see who is in.')));
    else {
      let rows = [];
      try { const s = await F.getDocs(F.query(F.collection(db, 'guilds', id, 'members'), F.limit(200))); rows = s.docs.map(d => Object.assign({ id: d.id }, d.data())); } catch (x) { }
      const order = { owner: 0, mod: 1, member: 2, asked: 3 };
      rows.sort((a, b) => (order[a.role] - order[b.role]) || String(a.name).localeCompare(String(b.name)));
      const asked = rows.filter(r => r.role === 'asked'), inn = rows.filter(r => r.role !== 'asked');
      const ul = el('ul', 'mz-mlist');
      inn.forEach(r => {
        const li = el('li');
        if (k.face) li.append(k.face(r.name, r.id));
        li.append(IU ? el('b', null, r.name || '') : el('a', null, r.name || '', { href: page(((DATA && DATA.paths && DATA.paths.member) || 'member/') + '?u=' + encodeURIComponent(r.id)) }));
        if (r.role === 'owner' || r.role === 'mod') li.append(el('span', 'mz-role', r.role === 'owner' ? tt('owner') : tt('mod')));
        const acts = el('span', 'mz-acts');
        if (role === 'owner' && r.role !== 'owner') acts.append(btn('mb-text', r.role === 'mod' ? tt('Make a member') : tt('Make a mod'), () => busy(() => F.updateDoc(F.doc(db, 'guilds', id, 'members', r.id), { role: r.role === 'mod' ? 'member' : 'mod', at: F.serverTimestamp() }))));
        if ((role === 'owner' && r.role !== 'owner') || (role === 'mod' && r.role === 'member'))
          acts.append(two(tt('Remove'), tt('Tap again to remove'), () => busy(() => { const b = F.writeBatch(db); b.delete(F.doc(db, 'guilds', id, 'members', r.id)); b.update(gref, { members: Math.max(1, (G.members || 1) - 1), last: r.id }); return b.commit(); })));
        if (acts.childNodes.length) li.append(acts);
        ul.append(li);
      });
      ms.append(ul);
      if (lead && asked.length) {
        ms.append(el('h3', 'mb-h3', tt('Asking to join')));
        const ua = el('ul', 'mz-mlist');
        asked.forEach(r => {
          const li = el('li'); if (k.face) li.append(k.face(r.name, r.id)); li.append(el('b', null, r.name || ''));
          const acts = el('span', 'mz-acts');
          acts.append(btn('btn btn-key mb-btn-s', tt('Yes'), () => busy(() => { const b = F.writeBatch(db); b.update(F.doc(db, 'guilds', id, 'members', r.id), { role: 'member', at: F.serverTimestamp() }); b.update(gref, { members: (G.members || 0) + 1, last: r.id }); return b.commit(); })),
            btn('btn btn-line mb-btn-s', tt('No'), () => busy(() => F.deleteDoc(F.doc(db, 'guilds', id, 'members', r.id)))));
          li.append(acts); ua.append(li);
        });
        ms.append(ua);
      }
    }
    body.append(ms);
    if (role === 'owner') {
      const ed = el('details', 'mz-earn'); const sm = el('summary', 'mz-sum'); sm.append(el('b', null, tt('Edit the guild')), el('span', null, tt('Its name, its line, who can join, its picture'))); ed.append(sm);
      ed.append(guildForm(G, async (doc, line, go) => { try { await within(25000, F.updateDoc(gref, Object.assign({}, doc, IU ? {} : { ownerName: u.name }))); await draw(); } catch (e) { go.disabled = false; say(line, words(e), true); } }, tt('Save')));
      body.append(ed);
      const close = two(tt('Close the guild'), tt('Tap again to close it for good'), () => busy(async () => {
        /* two steps (the rules, "guilds"): the guild goes first, then its rows, a batch of 400 at a time */
        await F.deleteDoc(gref);
        const col = F.collection(db, 'guilds', id, 'members');
        for (let i = 0; i < 100; i++) {      // 200 a read (the rules' limit); the owner's own row last, since on the Iran site it is what lets them read the rest
          const s = await F.getDocs(F.query(col, F.limit(200)));
          const rest = s.docs.filter(d => d.id !== u.uid);
          if (!rest.length) break;
          const b = F.writeBatch(db); rest.forEach(d => b.delete(d.ref)); await b.commit();
        }
        await F.deleteDoc(F.doc(db, 'guilds', id, 'members', u.uid)).catch(() => { });
        location.href = page(P.list);
      }));
      const cr = el('div', 'mb-f'); cr.append(close, el('p', 'mb-hint', tt('Closing takes the guild and its member list off the site.'))); body.append(cr);
    }
    if (u && role !== 'owner') {
      const wrap = el('div', 'mb-f'), rl = el('p', 'mb-say', '', { role: 'status' });
      const open = btn('mb-text', tt('Report this'), () => {
        open.hidden = true;
        const chips = el('div', 'mb-chips', null, { role: 'group', 'aria-label': tt('What is wrong with it?') });
        [['abusive', tt('It is abusive')], ['fake', tt('It is not real')], ['address', tt('It shows a home address')], ['advert', tt('It is an advert')]].forEach(([why, text]) => chips.append(btn('mb-chip', text, async () => {
          say(rl, tt('Sending.'));
          try { await within(20000, F.setDoc(F.doc(db, 'users', u.uid, 'flags', 'k-' + id), { why, about: 'k-' + id, at: F.serverTimestamp() })); chips.remove(); say(rl, tt('Thank you. I will look at it.')); } catch (e) { say(rl, words(e), true); }
        })));
        wrap.append(el('p', 'mb-l', tt('What is wrong with it?')), chips);
      });
      wrap.append(open, rl); body.append(wrap);
    }
  }
  await draw();
}
