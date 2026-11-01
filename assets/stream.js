/* THE STREAM VIEW of the tools (libertypolitics.com): Call the Midterms, Build a government, the Regime Board; and the way
   into the Intel Room's own full screen.

   Armin, 31 October 2026: "all of these tools need to have a live stream view ... when I'm live streaming and I'm trying to
   show it on my live stream, [some] don't look good when I'm sharing my screen. We can't see the whole thing ... make it so
   that when I'm showing these tools on a live stream, it makes perfect sense, and people can see what's going on, even if
   it's on a small screen." The tools themselves "are perfect": this changes how a tool is laid out, never how it works.

   HOW IT IS OPENED. "Stream view" beside the tool's "How it works" (<button class="lps-go" hidden> inside the tool's
   .lpt-doors, printed by the tool's builder; shown from 900px up, where a stream is made), or the address with ?stream=1
   (a link he can keep in his stream notes). The button also asks the browser for full screen; the address cannot (a browser
   only allows that after a tap). Esc leaves full screen first (the browser does that), then the stream view; so does Exit.

   WHAT IT DOES. html.lp-stream, and the tool's box (.lps-root) fills the screen: everything else on the page (the header,
   the switch, the footer, the bubble, the discussion, the rest of the page) is hidden by marking the tool's ancestors
   .lps-path (build/stream.css hides every sibling along that path, except dialogs and .lps-keep). A small
   libertypolitics.com mark and Exit sit in the top right corner. The tool keeps every control and every script.
   ONE CANVAS. A tool is laid out for a 1280 x 720 canvas and zoomed to the screen: --lps-z is the zoom (1.5 on a 1920 x 1080
   screen), --lps-w and --lps-h the canvas in the tool's own pixels (wider or taller than 1280 x 720 when the window is not
   16:9). Each tool's own CSS decides what zooms and how its parts are placed, under html.lp-stream (midterms.css,
   coalition.css, regime.css): the Regime Board's chart window is NOT zoomed, because its pinch and drag measure the screen.
   Words: nothing in a tool under 13.4px on the canvas, so 20px on a 1920 x 1080 stream; its main numbers 32px or more (48).
   THE INTEL ROOM keeps its own full screen (intel.js stream(), the "Full screen" button, F): ?stream=1 on intel/ presses that
   same button once the room is ready, nothing else.
   TESTED in build/phone-test.html ("THE STREAM VIEW"): each tool at 1920 x 1080 and 1280 x 720, its box inside the screen,
   nothing scrolls, no words outside their box, the words and numbers at their sizes, the controls still there. */
(function () {
  'use strict';
  var D = document, W = window, H = D.documentElement;
  if (W.LPStream) return;
  var CANVAS = [1280, 720];
  // a tool's box; what zooms inside it is the tool's own CSS. Wargames (#wargame) zooms nothing on its map (#wg-stage reads the
  // pointer, like the Regime Board's chart): build/wargame.css says what does.
  var TOOLS = { midterms: '#midterms', coalition: '#coalition', regime: '#regime', markets: '#btm', wargame: '#wargame', you: '#you' };      // you: Your Liberty Score (build/you.css lays it out), 1 Nov 2026
  var root = null, name = '', fsMine = false, y0 = 0, bar = null, marked = [];
  function $(s, r) { return (r || D).querySelector(s); }
  function wanted() { return /[?&]stream=1(&|$)/.test(location.search); }
  function which() {
    var d = $('.lpt-doors[data-lpt]');
    if (d && TOOLS[d.getAttribute('data-lpt')] && $(TOOLS[d.getAttribute('data-lpt')])) return d.getAttribute('data-lpt');
    for (var k in TOOLS) if ($(TOOLS[k])) return k;
    return '';
  }
  function size() {
    var w = W.innerWidth, h = W.innerHeight, z = Math.min(w / CANVAS[0], h / CANVAS[1]);
    H.style.setProperty('--lps-z', z.toFixed(4));
    H.style.setProperty('--lps-w', (w / z).toFixed(2) + 'px');
    H.style.setProperty('--lps-h', (h / z).toFixed(2) + 'px');
  }
  function url(on) {
    try {
      var u = new URL(location.href);
      if (on) u.searchParams.set('stream', '1'); else u.searchParams.delete('stream');
      history.replaceState(history.state, '', u.pathname + (u.search === '?' ? '' : u.search) + u.hash);
    } catch (e) { }
  }
  function nudge() {          // a tool that fits itself to its box (the Regime Board's chart) hears the new size
    [60, 400].forEach(function (t) { setTimeout(function () { try { W.dispatchEvent(new Event('resize')); } catch (e) { } }, t); });
  }
  function buttons(on) {
    [].forEach.call(D.querySelectorAll('.lps-go'), function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }
  function on(full) {
    if (root) return true;
    name = which();
    if (!name) return false;
    root = $(TOOLS[name]);
    y0 = W.scrollY || 0;
    root.classList.add('lps-root');
    for (var a = root.parentElement; a && a !== H; a = a.parentElement) { a.classList.add('lps-path'); marked.push(a); }
    size();
    H.classList.add('lp-stream'); H.setAttribute('data-lps', name);
    bar = D.createElement('div');
    bar.className = 'lps-bar lps-keep';
    bar.innerHTML = '<span class="lps-mark">libertypolitics<b>.com</b></span><button type="button" class="lps-x" aria-label="Leave the stream view">Exit</button>';
    bar.querySelector('.lps-x').addEventListener('click', off);
    D.body.appendChild(bar);
    url(true); buttons(true);
    if (full && H.requestFullscreen && !D.fullscreenElement) {
      try { H.requestFullscreen().then(function () { fsMine = true; }, function () { }); } catch (e) { }
    }
    W.scrollTo(0, 0);
    nudge();
    return true;
  }
  function off() {
    if (!root) return;
    root.classList.remove('lps-root');
    marked.forEach(function (a) { a.classList.remove('lps-path'); }); marked = [];
    H.classList.remove('lp-stream'); H.removeAttribute('data-lps');
    if (bar) bar.remove(); bar = null;
    root = null;
    url(false); buttons(false);
    if (fsMine && D.fullscreenElement && D.exitFullscreen) D.exitFullscreen().catch(function () { });
    fsMine = false;
    W.scrollTo(0, y0);
    nudge();
  }
  // something of the tool's own is open over it (a sheet, a dialog, the tour): Esc is theirs
  function busy() {
    if (H.classList.contains('lpt-on') || $('dialog[open]')) return true;
    var m = D.querySelectorAll('[aria-modal="true"]');
    for (var i = 0; i < m.length; i++) if (!m[i].hidden && m[i].getClientRects().length) return true;
    return false;
  }
  D.addEventListener('keydown', function (ev) {
    if (!root || ev.key !== 'Escape' || D.fullscreenElement || busy()) return;
    ev.preventDefault(); off();
  }, true);
  D.addEventListener('fullscreenchange', function () { if (!D.fullscreenElement) fsMine = false; });
  W.addEventListener('resize', function () { if (root) size(); });

  // the Intel Room: its own full screen, pressed once the room is ready
  function room() {
    var n = 0, t = setInterval(function () {
      var ir = $('#ir[data-ready="1"]'), b = $('#ir-stream');
      if ((ir && b) || ++n > 120) {
        clearInterval(t);
        if (ir && b && !H.classList.contains('ir-show')) b.click();
      }
    }, 500);
  }
  function init() {
    [].forEach.call(D.querySelectorAll('.lps-go'), function (b) {
      if (b.getAttribute('data-wired')) return;
      b.setAttribute('data-wired', '1');
      if (!b.querySelector('svg')) b.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>');
      b.setAttribute('aria-pressed', 'false');
      b.title = 'Fill the screen with this tool, for a live stream. Esc to leave.';
      b.addEventListener('click', function () { if (root) off(); else on(true); });
      b.hidden = false;
    });
    if (!wanted()) return;
    if ($('#ir') && !which()) room(); else on(false);
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
  W.LPStream = { on: function () { return on(false); }, off: off, active: function () { return !!root; }, tool: function () { return root ? name : ''; }, canvas: CANVAS.slice() };
})();
