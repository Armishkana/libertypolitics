/* The Intel Room's show prep (intel/). Armin, 15 October 2026: "eventually we want people who want to live stream to be
   able to select some of the topics that they want to do a live show about. It automatically finds the most recent
   information for them. It creates: a cover ... a title ... a description ... an intro for them to read at the beginning
   of the show ... a summary of the things that they need to know ... I want to first build this for myself."

   What it does, all in the page: takes what the room is showing right now (the lens, the filters, the ask), the top 12,
   and lays out (1) the rundown, hottest or strongest first, each with when, where, who and the link, (2) the same items in
   the order they happened, (3) a request for an AI writer that asks for the titles, the description, the opening to read,
   the cover ideas and the facts to know, using only those sources. "Write it with Claude" opens claude.ai with the
   request filled in; Copy puts it on the clipboard for any other AI. Nothing is sent anywhere by this page. The room's
   state comes from intel.js through window.IRoom. Paid later is his plan; nothing here says so or charges anything. */
(function () {
  'use strict';
  var R = window.IRoom;
  if (!R || !document.getElementById('ir')) return;
  var $ = function (id) { return document.getElementById(id); };
  var MAX = 12;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var bar = document.querySelector('.ir-list-t');
  if (!bar) return;
  var btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'ir-prep-b'; btn.className = 'ir-tool ir-tool-s ir-prep-b';
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4M10 9l4 2-4 2z"/></svg><span>Prep a show</span>';
  bar.insertBefore(btn, bar.firstChild);
  var dlg = document.createElement('dialog');
  dlg.className = 'ir-add ir-prep'; dlg.id = 'ir-prep'; dlg.setAttribute('aria-labelledby', 'ir-prep-h');
  document.body.appendChild(dlg);

  function items() { return R.shown().slice(0, MAX); }
  function line(it) { return [R.when(it), R.where(it), it.h || it.src].filter(Boolean).join(' · '); }
  function rundown(list) {
    return list.map(function (it, i) {
      return (i + 1) + '. ' + it.t + '\n   ' + line(it) + (it.hot != null ? ' · Hot ' + it.hot + (it.hotWhy ? ' (' + it.hotWhy + ')' : '') : '') + (it.q ? ' · top pick' : '') + '\n   ' + it.u + (it.n ? '\n   ' + it.n : '');
    }).join('\n');
  }
  function ask(about, list) {
    return 'I am going live on YouTube about: ' + about + '.\n\n' +
      'Using ONLY the sources below (say so when something is not in them, never make anything up), write:\n' +
      '1. Five YouTube titles, each under 60 characters, that make people click without lying.\n' +
      '2. A YouTube description: three short paragraphs, then every source link.\n' +
      '3. An opening I can read out in the first 60 seconds of the show.\n' +
      '4. Three cover (thumbnail) ideas: who or what is on it, and the 2 to 4 words written on it.\n' +
      '5. The 5 facts I must know before I go live, each with its source.\n' +
      '6. Three questions to ask the audience or a guest.\n\n' +
      'The sources, hottest or strongest first:\n' + rundown(list);
  }
  function aboutOf() {
    var s = R.said().replace(/\s*Clear$/, '').trim();
    if (s && !/^Nothing/.test(s)) return s.replace(/\.$/, '');
    var tp = R.topicsOn();
    return (tp.length ? tp.join(' and ') : 'what happened') + (R.lens() === 'live' ? ' in the last 24 hours' : '');
  }
  function open() {
    var list = items();
    var about = aboutOf();
    var byTime = list.slice().sort(function (a, b) { return String(a.d || '').localeCompare(String(b.d || '')); });
    dlg.innerHTML = '<div class="ir-a"><div class="ir-a-top"><p class="ir-a-k"><span class="ir-a-badge">Show prep</span><span>' + list.length + ' items from what the room is showing</span></p><button class="ir-s-x" type="button" data-p-x aria-label="Close">&times;</button></div>' +
      '<h2 id="ir-prep-h">Prep a show</h2>' +
      '<p class="ir-a-lede">Everything below comes from what the room is showing now. Change the filters or ask the room something first to prep a different show.</p>' +
      '<div class="ir-a-f"><label for="ir-p-about">What is the show about?</label><input id="ir-p-about" maxlength="120" value="' + esc(about) + '"></div>' +
      '<div class="ir-a-act"><a class="ir-a-send ir-p-go" id="ir-p-go" href="#" target="_blank" rel="noopener">Write it with Claude</a><button class="ir-s-b" type="button" id="ir-p-copy">Copy the request</button></div>' +
      '<p class="ir-a-fine">Claude (or any AI you paste it into) writes the titles, the description, the opening to read out, three cover ideas and the five facts to know, from these sources only.</p>' +
      '<details class="ir-a-more" open><summary>The rundown <small>hottest or strongest first</small></summary><ol class="ir-p-list">' +
      list.map(function (it) { return '<li><a href="' + esc(it.u) + '" target="_blank" rel="noopener">' + esc(it.t) + '</a><small>' + esc(line(it)) + (it.hot != null ? ' · Hot ' + it.hot : '') + '</small></li>'; }).join('') + '</ol></details>' +
      '<details class="ir-a-more"><summary>In the order it happened</summary><ol class="ir-p-list">' +
      byTime.map(function (it) { return '<li><b>' + esc(R.when(it)) + '</b> ' + esc(it.t) + '</li>'; }).join('') + '</ol></details>' +
      '<p class="ir-a-msg" id="ir-p-msg" aria-live="polite"></p></div>';
    sync();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function sync() {
    var about = ($('ir-p-about').value || '').trim() || 'what happened';
    var text = ask(about, items());
    $('ir-p-go').href = 'https://claude.ai/new?q=' + encodeURIComponent(text.slice(0, 6000));
    dlg._text = text;
  }
  btn.addEventListener('click', function () { if (!R.shown().length) return; open(); });
  dlg.addEventListener('input', function (ev) { if (ev.target.id === 'ir-p-about') sync(); });
  dlg.addEventListener('click', function (ev) {
    if (ev.target === dlg || ev.target.closest('[data-p-x]')) { dlg.close ? dlg.close() : dlg.removeAttribute('open'); return; }
    if (ev.target.closest('#ir-p-copy')) {
      var t = dlg._text || '', done = function () { $('ir-p-msg').textContent = 'Copied. Paste it into any AI chat.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { $('ir-p-msg').textContent = 'Copying is blocked here. Use Write it with Claude instead.'; });
      else $('ir-p-msg').textContent = 'Copying is blocked here. Use Write it with Claude instead.';
    }
  });
})();
