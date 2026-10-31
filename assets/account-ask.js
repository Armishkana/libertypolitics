/* THE ASK TO MAKE AN ACCOUNT, AT THE MOMENT IT IS WORTH SOMETHING (30 October 2026). libertypolitics.com.

   Armin, 30 October 2026: "we need to be encouraging people to make an account to interact more with the website, and
   that's how we get their emails and add them to our newsletter. Figure out what the best strategy for this is."

   The strategy, in one line: never a nag, always a reason. An account is asked for only right after a reader has made
   something of their own that an account can keep, and the ask says what the account does for them. Making the
   account shows the one newsletter tick, empty until the reader ticks it (community.js, ../../newsletter.md decision 3),
   so every account made here is one honest chance at a newsletter address.

   WHAT IT DOES
     SAVE MY CALL   On Call the Midterms (races/usa/, #midterms) and on a country's coalition calculator (races/<country>/,
                    #coalition): once the reader has made a call (the tool has written it in the address: ?mood= ?d= ?r=,
                    ?gov= ?out=), one card appears under the tool's own Share button. It says what the account does ("your
                    call is kept, open it on any phone or computer, and on election night next to the real results") and
                    has one button. Signed out, the button opens the account panel with that reason on top; the call is
                    saved the moment the account exists (Google too). Signed in, it saves at once.
     YOUR SAVED CALL  A signed-in reader who opens the tool with no call in the address and has one saved is offered it back.
     YOUR ACCOUNT   The account panel lists the saved calls (community.js's account hook).
     NOT BEFORE THE RULES  No card until the published rules take a saved call (rulesLive, below).
     DELETING       Deleting the account deletes the saved calls first (community.js's drop hook). That is why this file is
                    loaded on every page that has accounts, not only on the two tools: an account can be deleted anywhere.

   WHAT IT KEEPS   users/<account>/saved/<tool>: q (the call as the tool writes it in the address), p (the page) and at
                   (the server's time). Nothing else; the rules (firebase/firestore.rules, "Saved calls") refuse anything
                   else, and the privacy page says so. Not on iranuncensored.com (neither tool is there).

   WHAT IT NEVER DOES   No pop-up on page load, nothing before the reader has done something, nothing hidden and shown
   again, one ask on the screen at a time, and nothing it cannot keep: it never promises an email (nothing can send one
   to a reader yet, ../../newsletter.md "Not built yet").

   A TOOL MAY PLACE THE CARD ITSELF with one empty element where the card should go:
       <div data-account-ask="midterms"></div>      (or "coalition")
   Without one the card goes right after the row that holds the tool's Share button (#mt-share, #coal-share). */
const D = document, W = window;
const TOOLS = {
  midterms: { box: 'midterms', keys: ['mood', 'd', 'r'], share: 'mt-share', hash: '#midterms',
    head: 'Keep your call.', out: 'Make a free account and I keep this Congress for you. Open it on any phone or computer, and on election night see it next to the real results.',
    in: 'Save this Congress to your account. Open it on any phone or computer, and on election night see it next to the real results.',
    go: 'Save my call', back: 'Your call from {date} is saved to your account.', open: 'Open my saved call' },
  coalition: { box: 'coalition', keys: ['gov', 'out'], share: 'coal-share', hash: '#coalition',
    head: 'Keep your government.', out: 'Make a free account and I keep this coalition for you. Open it on any phone or computer when the talks move.',
    in: 'Save this coalition to your account. Open it on any phone or computer when the talks move.',
    go: 'Save my government', back: 'Your government from {date} is saved to your account.', open: 'Open my saved government' },
};
const PEND = 'lp-ask-pending';      // sessionStorage: the tool a signed-out reader asked to save, until the account exists
const QOK = /^[A-Za-z0-9=&,.%_+-]{3,600}$/, POK = /^\/[a-z0-9/-]{0,80}$/;

function whenLP(f) {
  let n = 0;
  (function wait() {
    const L = W.LP;
    if (L && L.members) return f(L);
    if (++n < 80) setTimeout(wait, 250);      // community.js is a module and loads Firebase lazily: 20 seconds at most
  })();
}

whenLP(LP => {
  if (LP.off) return;
  const M = LP.members, tt = M.tt, el = M.el;
  const store = { get: k => { try { return W.sessionStorage.getItem(k); } catch (e) { return null; } },
                  set: (k, v) => { try { if (v) W.sessionStorage.setItem(k, v); else W.sessionStorage.removeItem(k); } catch (e) { } } };
  const savedRef = async (id) => { const { F, db } = await M.within(20000, M.fb()); const u = M.user(); if (!u) throw { code: 'lp/signedout' }; return { F, db, u, ref: id ? F.doc(db, 'users', u.uid, 'saved', id) : F.collection(db, 'users', u.uid, 'saved') }; };
  const when = ts => { try { return M.niceDate(ts && ts.toMillis ? ts.toMillis() : Date.now()); } catch (e) { return ''; } };
  const nameOf = id => id === 'midterms' ? tt('Call the Midterms') : tt('Your coalition');

  /* ---- the account panel lists the saved calls; deleting the account deletes them first ---- */
  M.account(() => {
    const box = el('div', 'acct-saved'); box.hidden = true;
    savedRef('').then(({ F, ref }) => M.within(20000, F.getDocs(F.query(ref, F.limit(20))))).then(snap => {
      const ok = snap.docs.filter(d => QOK.test(d.data().q || '') && POK.test(d.data().p || ''));
      if (!ok.length) return;
      box.append(el('p', 'sheet-k', tt('Your saved calls')));
      const ul = el('ul', 'acct-saved-l');
      ok.forEach(d => {
        const v = d.data(), t = TOOLS[d.id.split('-')[0]];
        const a = el('a', null, nameOf(d.id.split('-')[0]) + (d.id.indexOf('-') > 0 ? ': ' + d.id.slice(d.id.indexOf('-') + 1).replace(/^./, c => c.toUpperCase()) : ''),
          { href: v.p + '?' + v.q + (t ? t.hash : '') });
        const li = el('li'); li.append(a, el('span', 'sheet-hint', ' ' + when(v.at))); ul.append(li);
      });
      box.append(ul); box.hidden = false;
    }).catch(() => { });
    return box;
  });
  M.drop(async uid => {
    const { F, ref } = await savedRef('');
    const snap = await M.within(20000, F.getDocs(F.query(ref, F.limit(20))));
    for (const d of snap.docs) await M.within(20000, F.deleteDoc(d.ref));
  });

  /* ---- the card on the tool ---- */
  const live = Object.keys(TOOLS).filter(k => D.getElementById(TOOLS[k].box));
  if (!live.length) return;
  /* Only once the rules that take a saved call are published: the pages can reach the live site before the rules do,
     and a button that cannot save is a broken promise. users/-/saved/_live never exists; the rules answer 404 for it once
     published and 403 before (firebase/firestore.rules, "Saved calls"). A yes is kept on the device. */
  rulesLive().then(ok => { if (!ok) return; style(); live.forEach(kind => card(kind)); }, () => { });
  async function rulesLive() {
    const KEEP = 'lp-saved-live';
    try { if (!LP.emu && W.localStorage.getItem(KEEP) === '1') return true; } catch (e) { }
    const res = await M.within(15000, fetch(M.restDoc('users/-/saved/_live')));
    if (res.status !== 404) return false;
    try { if (!LP.emu) W.localStorage.setItem(KEEP, '1'); } catch (e) { }
    return true;
  }

  function card(kind) {
    const T = TOOLS[kind], box = D.getElementById(T.box);
    const m = /\/races\/([a-z]{2,24})\/$/.exec(location.pathname);      // races/<country>/, wherever the site is served from
    const id = kind === 'coalition' ? (m ? 'coalition-' + m[1] : '') : kind;
    if (!id) return;
    let node = null, saved = null, lastQ = '', state = '';
    const callNow = () => {
      const q = new URLSearchParams(location.search), out = new URLSearchParams();
      T.keys.forEach(k => { const v = q.get(k); if (v) out.set(k, v); });
      return out.toString().replace(/%2C/g, ',');
    };
    function place() {
      if (node) return node;
      node = el('div', 'acct-ask', null, { role: 'group', 'aria-label': tt(T.head) });
      const slot = D.querySelector('[data-account-ask="' + kind + '"]'), sh = D.getElementById(T.share);
      if (slot) slot.append(node);
      else if (sh && sh.parentElement && box.contains(sh)) sh.parentElement.after(node);
      else box.append(node);
      return node;
    }
    function draw() {
      const q = callNow(), u = M.who();      // remembered on this device: Firebase may still be loading
      const want = q && QOK.test(q) ? (saved && saved.q === q ? 'kept' : 'ask') : (saved && u ? 'back' : '');
      const key = want + (u ? '+' : '');      // signing in changes the words, so it redraws too
      if (key === state && q === lastQ) return;
      state = key; lastQ = q;
      if (!want) { if (node) { node.remove(); node = null; } return; }
      const n = place(); n.textContent = '';
      const p = el('p', 'acct-ask-t'), line = el('p', 'acct-ask-msg', '', { role: 'status', 'aria-live': 'polite' });
      if (want === 'back') {
        p.append(el('b', null, tt(T.head)), ' ', tt(T.back, { date: when(saved.at) }));
        n.append(p, el('a', 'btn btn-line acct-ask-go', tt(T.open), { href: saved.p + '?' + saved.q + T.hash }));
        return;
      }
      if (want === 'kept') {
        p.append(el('b', null, tt('Saved.')), ' ', tt('Your call is in your account. Tap your name at the top of any page to find it.'));
        n.append(p);
        return;
      }
      p.append(el('b', null, tt(T.head)), ' ', u ? tt(T.in) : tt(T.out));
      const go = M.btn('btn btn-key acct-ask-go', tt(T.go), () => ask(go, line));
      n.append(p, go, line);
      if (saved && u) n.append(el('p', 'sheet-hint', tt('This replaces the call you saved on {date}.', { date: when(saved.at) })));
    }
    async function save(line) {
      const q = callNow();
      if (!QOK.test(q)) return;
      const { F, ref } = await savedRef(id);
      if (line) M.tell(line, tt('Saving.'));
      await M.within(20000, F.setDoc(ref, { q, p: location.pathname, at: F.serverTimestamp() }));
      saved = { q, p: location.pathname, at: { toMillis: () => Date.now() } };
      try { if (W.lpTrack) W.lpTrack('call_saved', { tool: kind }); } catch (e) { }
      draw();
    }
    function ask(go, line) {
      const signIn = () => { store.set(PEND, id); LP.open('auth', { why: tt('Make an account and your call is saved to it. It takes one step.'), whyIn: tt('Sign in and your call is saved to your account.'), opener: go }); };
      if (!M.who()) { signIn(); return; }
      go.disabled = true;
      save(line).catch(e => { go.disabled = false; if (e && e.code === 'lp/signedout') { M.tell(line, ''); signIn(); } else M.tell(line, M.words(e), true); });
    }
    /* the reader has just made an account or signed in: keep the promise the button made */
    M.sub(() => {
      const u = M.user();
      if (u && store.get(PEND) === id) { store.set(PEND, ''); save(null).catch(() => { }); }
      if (u && !saved) load(); else draw();
    });
    function load() {
      if (!M.who()) { draw(); return; }
      savedRef(id).then(({ F, ref }) => M.within(20000, F.getDoc(ref))).then(s => {
        const v = s.exists() ? s.data() : null;
        saved = v && QOK.test(v.q || '') && POK.test(v.p || '') ? v : null;
        state = ''; draw();
      }, () => draw());
    }
    /* the tools write the call into the address a moment after a tap (midterms.js waits 250ms) */
    let t = 0;
    const later = () => { clearTimeout(t); t = setTimeout(draw, 450); };
    ['click', 'input', 'change', 'keyup'].forEach(ev => box.addEventListener(ev, later, true));
    W.addEventListener('popstate', later);
    if (M.who()) load(); else draw();
    if (store.get(PEND) === id && M.user()) { store.set(PEND, ''); save(null).catch(() => { }); }
  }

  function style() {
    if (D.getElementById('acct-ask-css')) return;
    const s = D.createElement('style'); s.id = 'acct-ask-css';
    s.textContent = '.acct-ask{margin:16px 0 0;padding:14px 16px;border:1px solid var(--line);border-left:4px solid var(--field);border-radius:var(--r2,14px);background:var(--panel);max-width:46rem}'
      + '.acct-ask-t{margin:0 0 10px;font-size:1rem;line-height:1.45;color:var(--ink)}.acct-ask-t b{color:var(--ink)}'
      + '.acct-ask-go{min-height:44px}.acct-ask-msg{margin:8px 0 0;font-size:.9rem;color:var(--dim)}.acct-ask-msg.bad{color:#ff8a80}'
      + '.acct-ask .sheet-hint{margin:8px 0 0;font-size:.85rem;color:var(--dim)}'
      + '.acct-saved{margin:0 0 14px}.acct-saved-l{margin:6px 0 0;padding:0;list-style:none}.acct-saved-l li{padding:6px 0}.acct-saved-l a{display:inline-block;min-height:44px;line-height:44px;font-weight:700}';
    D.head.append(s);
  }
});
