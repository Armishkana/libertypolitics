/* THE TOURS OF THE TOOLS (libertypolitics.com): Call the Midterms, Build a government, the Regime Board, Beat the Markets.
   The Intel Room keeps its own tours (build/intel-tour.js, IRoomTour); this is the same idea for every other tool.

   Armin, 31 October 2026: "all of these tools need to have a tour or a tutorial that people could click on so they could
   see how things work. As the tools improve, we have to make sure that the tutorial gets updated as well ... Make sure we
   have the best system in place for all of that." And the same day: the tools "are perfect": a tour explains a tool, it
   never changes how it works. (Call the Midterms had "No tour: a tour is skipped, a labelled control is read" until then;
   the tour stays optional for that reason: one quiet "How it works" button, and nothing ever opens by itself.)

   ONE REGISTER, TOOLS below. Each tool says, in one place:
     root    the tool's own box (the tour of a tool only looks inside it)
     ready   a selector that exists once the tool's script has drawn it (the tests wait for it)
     v       the tool's tour version: bump it when a step is added or changed, and mark that step with the same v
     surf    where the tool's controls live: every element these selectors find is a control the tour must explain
     skip    controls that are deliberately not toured, each with the reason (a note, never shown)
     steps   the tour, in order. A step:
               k       its name (the walk reports it)
               at      where it points: the first selector with a shown control (all: every shown control of the first
                       selector that has any, spotlit together)
               e h p   its emoji, heading and words (p may be a function, read when the card is drawn). Plain words: what
                       to DO, and what you will SEE
               covers  the surf keys it explains (a key ending in * covers every key it starts)
               opt     its control is legitimately absent at times: the audit does not ask for it
               when    a function: the step shows only while it says true (a control that appears after something)
               act     { label, run }: "Show me" does it for the reader, then the tour goes on
               v       the version that added or changed it (WHAT IS NEW)
     pending the tool's page is not built yet: its audit reports pending instead of failing (Beat the Markets, markets/,
             is being built by another part of CALLS.md; its steps are written against the widget names in CALLS.md)

   HOW A CONTROL IS NAMED (keyOf): its id; else one of its data words (data-v="board" is "v=board"); else its first class
   (".mt-tools"); else its tag. So a new button with id "mt-foo" is "mt-foo", and a new row with class "mt-foo" is ".mt-foo".

   IT KEEPS UP WITH THE TOOL. LPTour.audit(tool) returns { missing: steps whose control is not on the page, loose: controls
   on the tool's surface that no step covers and no skip names }. build/phone-test.html ("THE TOOL TOURS KEEP UP") runs it on
   every tool at 360px and 1280px, walks every tour start to end (LPTour.walk) and fails on any missing or loose control, so a
   control added to a tool with no tour step, or a step whose control was renamed away, stops the publish (deploy.py runs the
   phone test as a gate). The fix is a line here: a step that covers it, or a skip with the reason.

   WHAT IS NEW. localStorage "lpt-<tool>" holds the version of the last tour a visitor took. A visitor with an older one sees
   the "How it works" button marked New, and it opens only the steps with a newer v (then offers the whole tour).

   THE DOOR. The tool's builder prints <div class="lpt-doors" data-lpt="<tool>"> holding <button class="lpt-how" hidden>,
   among the tool's own controls; this file shows it and wires it (build/stream.js does the same for .lps-go, the Stream view
   button beside it). Never opens by itself. The look is in build/stream.css ("the tour card").
   It never hides content and animates it back: the spotlight and the card simply appear. Keys: Right arrow or Enter next,
   Left arrow back, Esc close; focus stays in the card. Every card's words are 12px or more, every button 40px or more. */
(function () {
  'use strict';
  var D = document, W = window;
  if (W.LPTour) return;
  function $(s, r) { return (r || D).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || D).querySelectorAll(s)); }
  function get(k) { try { return W.localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { W.localStorage.setItem(k, v); } catch (e) { } }
  function shown(el) {
    if (!el || !el.isConnected || el.closest('[hidden]')) return false;
    var r = el.getBoundingClientRect(), cs = W.getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  }
  function words(x) { return typeof x === 'function' ? x() : x; }
  function click(sel) { var el = $(sel); if (el && shown(el)) el.click(); }
  function num(sel, fb) { var el = $(sel); return el && el.textContent.trim() ? el.textContent.trim() : fb; }

  /* ------------------------------------------------------------------ THE REGISTER */
  var TOOLS = {
    midterms: {
      name: 'Call the Midterms', root: '#midterms', ready: '#midterms.is-live', v: 1,
      surf: ['#midterms > *', '#midterms .mt-mood > *', '#midterms .mt-pre-row > *', '#midterms .mt-boards > *', '#midterms .mt-tools > *',
        '#midterms .mt-tools-b > *', '#midterms .mt-night-top > *', '#midterms .mt-night-end > *', '#midterms .mt-races > *', '#midterms .mt-tabs > *'],
      skip: { 'mt-score': 'the count that stays on screen among the race cards; a tap goes back to the slider', '.mt-head': 'the title',
        '.vh': 'a label for screen readers', 'mt-flash': 'what was just called on election night, read as it happens', 'mt-feed': 'the list of calls on election night',
        'mt-night-end': 'the two buttons at the end of election night say what they do', 'mt-boldsum': 'a line that says where you went against the markets' },
      steps: [
        { k: 'mood', at: ['#midterms .mt-track'], e: '👉', h: 'Drag how the country votes',
          p: 'Drag the slider left for the Democrats, right for the Republicans. Every race moves with it, and the Senate and House counts under it change as you drag.',
          act: { label: 'Show me', run: function () { click('#midterms .mt-pre[data-mood="0"]'); } },
          covers: ['mt-mood-box', '.mt-mood-top', '.mt-track', '.mt-ends', '.mt-result', 'mt-flips'] },
        { k: 'presets', at: ['#midterms .mt-pre-row'], e: '🎚️', h: 'Or start from a set point',
          p: 'Today’s polls, dead even, the betting favorites, or a past year like 2018. One tap sets the slider there.',
          covers: ['.mt-pre-row', 'mood=*', 'mt-mk', 'mt-year'] },
        { k: 'odds', at: ['#mt-mksw'], opt: true, e: '🎲', h: 'Betting odds, on or off',
          p: 'This switch takes every betting market number off the board, and brings it back. Off, you see only the forecasters and your own calls.',
          covers: ['mt-mksw'] },
        { k: 'boards', at: ['#mt-b-S', '#mt-b-H'], all: true, e: '🏛️', h: 'The Senate and the House',
          p: 'Every seat, blue for the Democrats and red for the Republicans. The big numbers are the seats each side wins on your map, and the line under them says who controls it.',
          covers: ['.mt-boards', 'mt-b-*'] },
        { k: 'night', at: ['#mt-run'], e: '🌙', h: 'Run election night',
          p: 'Watch a pretend election night: races are called in the order the polls close, the close ones last. Skip to the end any time.',
          covers: ['.mt-tools', '.mt-step', '.mt-tools-b', 'mt-run', 'mt-reset', 'mt-night', '.mt-night-top', '.mt-clock', 'mt-called', 'mt-skip', 'mt-again', 'mt-back'] },
        { k: 'share', at: ['#mt-share'], e: '📤', h: 'Share your Congress',
          p: 'Share sends a link that opens your exact map. Make a picture gives you an image of it to post.',
          covers: ['mt-share', 'mt-pic', '.acct-ask'] },
        { k: 'races', at: ['#midterms .mt-tabs', '#mt-races'], e: '✅', h: 'Call any race yourself',
          p: 'Tap a candidate to call that race for them. Tap again to give it back to the slider. Switch between the Senate and the House, or pick which races to see.',
          covers: ['mt-races', 'mt-how', '.mt-tabs', 'mt-tab-*', 'mt-where', 'mt-list', '.mt-more-p', 'mt-more', 'mt-mine'] },
        { k: 'calls', at: ['#midterms .lpc'], opt: true, e: '🎯', h: 'Make your call',
          p: 'Pick your answer to what the betting markets are asking. You see the markets’ number and the readers’ number, and yours once you sign in.',
          covers: ['.lpc'] },
        { k: 'how', at: ['#midterms .mt-src'], e: '📖', h: 'How the numbers are made',
          p: 'Open this to read where every number comes from: the forecasters, the polls and the markets.',
          covers: ['.mt-src'] }
      ]
    },
    coalition: {
      name: 'Build the next government', root: '#coalition', ready: '#coalition.is-live', v: 1,
      surf: ['#coalition > *', '#coalition .coal-grid > *', '#coalition .coal-stage > *', '#coalition .coal-side > *', '#coalition .coal-tools > *',
        '#coalition .coal-pres > *', '#coalition .coal-ways > *'],
      skip: { 'coal-data': 'the data the calculator reads', '.coal-head': 'the title', '.coal-src': 'where the seats come from, read under the tool',
        '.coal-mini': 'the bar at the foot of a phone screen that leads back to the chamber', '.coal-sub': 'a heading', 'coal-lib': 'a line about the government you built, read with it' },
      steps: [
        { k: 'chamber', at: ['#coalition .coal-chamber'], e: '🏛️', h: 'The chamber',
          p: function () { return 'Each dot is one seat. The number in the middle counts the seats of the government you build. It needs ' + num('#coalition .coal-bar-line .num', 'a majority') + '.'; },
          covers: ['.coal-grid', '.coal-stage', '.coal-chamber', '.coal-bar'] },
        { k: 'parties', at: ['#coalition .coal-list'], e: '👆', h: 'Tap parties to build it',
          p: 'Tap a party to put it in the government. Tap Outside for a party that keeps the government alive without joining it. The chamber fills as you go.',
          covers: ['.coal-side', '.coal-list'] },
        { k: 'presets', at: ['#coalition .coal-pres'], e: '⚡', h: 'Or start from a plan',
          p: 'Each button builds a government people are talking about. The number on it is its seats.',
          act: { label: 'Show me', run: function () { click('#coalition .coal-pre'); } },
          covers: ['.coal-pres', '.coal-pre-row'] },
        { k: 'say', at: ['#coal-say'], e: '💬', h: 'What you built',
          p: 'This line names the government you built and says how likely it is, from what the leaders have said. A warning shows when a party said it will not sit with another.',
          covers: ['coal-say', 'coal-warn'] },
        { k: 'share', at: ['#coal-share'], when: function () { return shown($('#coal-share')); }, e: '📤', h: 'Share your government',
          p: 'Share sends a link that opens your exact government. Make a picture gives you an image of it to post. Start again clears it.',
          covers: ['.coal-tools', 'coal-share', 'coal-pic', 'coal-reset', '.acct-ask'] },
        { k: 'odds', at: ['#coalition .mk'], opt: true, e: '🎲', h: 'Who becomes prime minister',
          p: 'What the betting markets say, read every hour. The switch takes every market number off the calculator, and brings it back.',
          covers: ['.mk'] },
        { k: 'ways', at: ['#coal-ways-box'], e: '🧮', h: 'Every way to a majority',
          p: 'Every government that can get there, likeliest first, from what the leaders have said on the record. Tap one to try it.',
          covers: ['coal-ways-box', 'coal-ways-h', 'coal-ways-l', 'coal-ways'] },
        { k: 'calls', at: ['#coalition .lpc'], opt: true, e: '🎯', h: 'Make your call',
          p: 'Pick your answer to what the betting markets are asking. You see the markets’ number and the readers’ number, and yours once you sign in.',
          covers: ['.lpc'] },
        { k: 'said', at: ['#coalition .coal-said'], opt: true, e: '📜', h: 'Who will govern with whom',
          p: 'Open this to read what each leader has said about the others, with the source. A government that breaks one of these shows a warning above.',
          covers: ['.coal-said', '.coal-next'] }
      ]
    },
    regime: {
      // ONE STAGE (31 Oct 2026, regime.js): views and filters on the top edge, the board, the timeline docked under it
      name: 'The Regime Board', root: '#regime', ready: '#rg-bar:not([hidden])', v: 2,
      surf: ['#regime .wrap > *', '#regime .rg-head > *', '#regime .rg-count > *', '#regime .rg-acts > *', '#rg-zw > *', '#regime .rg-ctl > *', '#regime .rg-seg > *',
        '#regime .rg-fil > *', '#regime .rg-vpw > *', '#regime .rg-zfl > *', '#rg-time > *', '#regime .rg-dk1 > *'],
      skip: { '.rg-kick': 'the date it was checked', 'h1': 'the title', '.rg-lede': 'the line under the title',
        'rg-none': 'a line that shows when a search finds nobody', '.rg-foot': 'where the chart comes from', '.rg-zhint': 'a hint on how to zoom', '.vh': 'a label for screen readers',
        '.lpt-doors': 'the tour and stream doors themselves' },
      steps: [
        { k: 'count', at: ['#regime .rg-count'], e: '🔢', h: 'The count',
          p: 'How many of the Islamic Republic’s leaders were taken out, how many are still in place, and how many nobody can confirm. Tap a number to see those people on the board.',
          covers: ['.rg-head', '.rg-count'] },
        { k: 'views', at: ['#regime .rg-seg'], e: '🗂️', h: 'Four ways to see it',
          p: 'The whole chart, by faction, day by day, or a plain list. Every one zooms, and the board stays right under your finger.',
          covers: ['rg-zw', 'rg-bar', '.rg-ctl2', '.rg-seg', 'v=*'] },
        { k: 'find', at: ['#regime .rg-fil'], e: '🔎', h: 'Who to show',
          p: 'Show only who was taken out, who is still in place or whose fate is unknown, light up one faction, or type a name. The board under it changes as you tap.',
          covers: ['.rg-fil', 'f=*', 'rg-q', 'rg-campkey'] },
        { k: 'chart', at: ['#rg-vp', '#rg-list'], all: false, e: '🔍', h: 'Zoom in',
          p: 'Pinch or scroll to zoom, drag to move, or use + and −. Tap any face for the whole story: how and when they fell, and everyone who has sat in that chair.',
          covers: ['.rg-vpw', 'rg-vp', 'rg-list', 'rg-ev', '.rg-zfl', 'rg-zin', 'rg-zout', 'rg-sheet'] },
        { k: 'fit', at: ['#rg-zfit', '#rg-zfull'], all: false, e: '🖥️', h: 'Fit it, or fill the screen',
          p: 'Fit shows everyone again. Full screen fills the screen with the board, its filters and its timeline, for a live show.',
          covers: ['rg-zfit', 'rg-zfull'] },
        { k: 'time', at: ['#rg-time'], e: '⏳', h: 'The timeline',
          p: 'Drag it, or press Replay, and watch each face fall on the day it fell, right above it. The buttons jump to each war, and Today brings it back.',
          covers: ['rg-time', '.rg-dk1', 'rg-play', '.rg-day', '.rg-track', 'rg-wars'] },
        { k: 'share', at: ['#rg-share'], e: '📤', h: 'Share the board',
          p: 'Share sends a link to the board as you see it. Make a picture gives you an image of it to post.',
          covers: ['.rg-acts', 'rg-share', 'rg-shot'] },
        { k: 'intel', at: ['#regime .rg-intel'], opt: true, e: '🧭', h: 'Where the war stands',
          p: 'Open this for what the US and Israel have said, and what the betting markets give.',
          covers: ['.rg-intel'] },
        { k: 'calls', at: ['#regime .lpc'], opt: true, e: '🎯', h: 'Make your call',
          p: 'Pick your answer to what the betting markets are asking. You see the markets’ number and the readers’ number, and yours once you sign in.',
          covers: ['.lpc'] }
      ]
    },
    // Beat the Markets (markets/, CALLS.md; build/calls.py and calls.js belong to their own builder). Written on 31 October
    // 2026 against the page as first built (#btm, the call widget .lpc in #btm-list); no longer pending (the page is built).
    // Its doors (R.tool_doors("markets")) and its stream layout (html.lp-stream rules in calls.css) are its builder's to add.
    markets: {
      name: 'Beat the Markets', root: '#btm', ready: '#btm-list > *', v: 1,
      surf: ['#btm .btm-tabs > *', '#btm .btm-bar .chips > *', '#btm .btm-row > *', '#btm .btm-f > *', '#btm .btm-sec'],
      skip: { '.lpt-doors': 'the tour and stream doors themselves', 'label': 'the name of the box beside it', '.chips-gap': 'a gap between two groups of chips' },
      steps: [
        { k: 'tabs', at: ['#btm .btm-tabs'], e: '🗂️', h: 'Every market, or your record',
          p: 'Every market shows what the betting markets are asking right now. Your record shows the calls you made and how they did.',
          covers: ['.btm-tabs', '.btm-tab'] },
        { k: 'chips', at: ['#btm .btm-bar .chips'], e: '🌍', h: 'Pick a topic',
          p: 'Tap a topic to see only its markets: the US, Israel, Iran or the world. Open or closed shows what you can still call, or what has ended.',
          covers: ['.chip'] },
        { k: 'find', at: ['#btm-q'], e: '🔎', h: 'Find a market',
          p: 'Type a race, a name or a country. The menu beside it changes the order the markets are listed in.',
          covers: ['.btm-f', 'btm-q', 'btm-sort'] },
        { k: 'odds', at: ['#btm .btm-sw'], opt: true, e: '🎲', h: 'Betting odds, on or off',
          p: 'This switch hides every betting market number on the site, and brings it back.', covers: ['.btm-sw'] },
        { k: 'calls', at: ['#btm-list'], e: '🎯', h: 'Make your call',
          p: 'Each card is one question the betting markets are pricing. Pick your answer on it. Markets is what bettors say, Readers is what people here say, You is yours.',
          covers: ['btm-all', 'btm-list', '.lpc'] },
        { k: 'record', at: ['#btm-recbox'], opt: true, e: '🏆', h: 'Your record',
          p: 'Come back after a market closes to see how you did. Back a long shot and it comes in: big points. Miss: you lose what the market thought it was worth.',
          covers: ['btm-rec', 'btm-recbox'] }
      ]
    },
    // Wargames (wargame/iran/, wargame/ukraine/, wargame/taiwan/; build/wargame.py, .js, .css). Steps written against the
    // real page by the wargame session, 31 October 2026 (the first draft guessed at what the controls meant).
    wargame: {
      name: 'Wargames', root: '#wargame', ready: '#wargame .wg-tab', v: 1,
      surf: ['#wargame .wg-tab', '#wargame [data-lens]', '#wargame .wg-ex', '#wargame .wg-seat', '#wargame [data-lv]', '#wargame .wg-date', '#wargame #wg-run',
        '#wargame [data-replay]', '#wargame #wg-play', '#wargame #wg-speed', '#wargame #wg-fit', '#wargame #wg-full', '#wargame .wg-p'],
      skip: { '.lpt-doors': 'the tour and stream doors themselves' },
      steps: [
        { k: 'tabs', at: ['#wargame .wg-tab'], all: true, e: '🗺️', h: 'Three ways in',
          p: 'Run the next war, replay a war that already happened, or pick the experts in your war room.', covers: ['.wg-tab'] },
        { k: 'lens', at: ['#wargame [data-lens]'], all: true, opt: true, e: '🧮', h: 'Whose numbers run the war',
          p: 'Your war room, every expert averaged, the betting markets, or your own numbers on sliders. The war runs on the one you pick.', covers: ['lens=*'] },
        { k: 'room', at: ['#wargame .wg-ex'], all: true, opt: true, e: '🎖️', h: 'Seat your advisors',
          p: 'Tap a face to hear their briefing and see where it comes from. Seat puts them in your war room; the war runs on the average of the ones you seat.', covers: ['.wg-ex', '.wg-seat'] },
        { k: 'date', at: ['#wargame .wg-date'], all: true, opt: true, e: '📅', h: 'When it starts',
          p: 'The dates people talk about for the next round, each with its reason. Pick one and the map counts the days from it.', covers: ['.wg-date'] },
        { k: 'moves', at: ['#wargame [data-lv]'], all: true, opt: true, e: '♟️', h: 'Make your moves',
          p: 'Who strikes first, who joins, what they use. Each choice changes how the war is fought.', covers: ['lv=*'] },
        { k: 'run', at: ['#wg-run'], opt: true, e: '🎲', h: 'Run it 1,000 times',
          p: 'The war is fought 1,000 times with different luck. You see how they ended, and the most typical one plays on the map, day by day.', covers: ['wg-run'] },
        { k: 'replay', at: ['#wargame [data-replay]'], all: true, opt: true, e: '⏪', h: 'Replay a past war',
          p: 'Every strike of a real war on the day it happened, each with its source.', covers: ['replay=*'] },
        { k: 'play', at: ['#wg-play', '#wg-speed'], all: true, e: '⏯️', h: 'Pause and speed',
          p: 'Pause the war, or play it faster or slower.', covers: ['wg-play', 'wg-speed'] },
        { k: 'map', at: ['#wg-fit', '#wg-full'], all: true, e: '🖥️', h: 'Fit it, or fill the screen',
          p: 'Pinch or scroll to zoom into the map. Fit shows the whole theatre again; full screen fills the screen with it.', covers: ['wg-fit', 'wg-full'] },
        { k: 'places', at: ['#wargame .wg-p'], opt: true, e: '📍', h: 'Tap any base or site',
          p: 'Every symbol is a real place: what it is, whose it is, what happened to it, and where that comes from.', covers: ['.wg-p'] }
      ]
    }
  };

  /* ------------------------------------------------------------------ the audit (IT KEEPS UP) */
  var DATA = ['data-v', 'data-f', 'data-pre', 'data-mood', 'data-lens', 'data-lv', 'data-replay'];
  function keyOf(el) {
    if (el.id) return el.id;
    for (var i = 0; i < DATA.length; i++) if (el.hasAttribute(DATA[i])) return DATA[i].slice(5) + '=' + el.getAttribute(DATA[i]);
    var c = String(el.getAttribute('class') || '').trim().split(/\s+/)[0];
    return c ? '.' + c : el.tagName.toLowerCase();
  }
  function named(names, k) { return names.some(function (n) { return n === k || (n.slice(-1) === '*' && k.indexOf(n.slice(0, -1)) === 0); }); }
  function audit(name) {
    var T = TOOLS[name];
    if (!T) return { tool: name, missing: ['no tool of that name in build/tour.js'], loose: [], controls: 0 };
    if (!$(T.root)) return { tool: name, pending: !!T.pending, missing: T.pending ? [] : ['the tool is not on this page (' + T.root + ')'], loose: [], controls: 0 };
    var missing = [], loose = [], seen = {}, covered = Object.keys(T.skip || {}).concat(['.lpt-doors']);
    T.steps.forEach(function (s) { covered = covered.concat(s.covers || []); });
    T.steps.forEach(function (s) {
      if (!s.at || s.opt || s.when) return;
      if (!s.at.some(function (sel) { return $(sel); })) missing.push(s.k + ' (' + s.at.join(' | ') + ')');
    });
    T.surf.forEach(function (sel) {
      $$(sel).forEach(function (el) {
        if (/^(SCRIPT|TEMPLATE|NOSCRIPT|STYLE|LINK)$/.test(el.tagName)) return;
        var k = keyOf(el);
        if (seen[k]) return; seen[k] = 1;
        if (!named(covered, k)) loose.push(k);
      });
    });
    return { tool: name, missing: missing, loose: loose, controls: Object.keys(seen).length };
  }

  /* ------------------------------------------------------------------ the card */
  var ov = null, hole = null, tip = null, list = null, at = 0, tool = '', mode = '', back = null, raf = 0;
  function seenV(name) { var s = get('lpt-' + name); return s ? (parseInt(s, 10) || 0) : 0; }
  function fresh(name, since) { return TOOLS[name].steps.filter(function (s) { return (s.v || 1) > since; }); }
  function build() {
    ov = D.createElement('div');
    ov.className = 'lpt lps-keep';          // lps-keep: the stream view (build/stream.js) hides the rest of the page, never this
    ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'lpt-h');
    ov.innerHTML = '<div class="lpt-hole" aria-hidden="true"></div><div class="lpt-tip" tabindex="-1"><div class="lpt-top"><span class="lpt-e" aria-hidden="true"></span>' +
      '<p class="lpt-n"></p><button type="button" class="lpt-x" data-t="end" aria-label="Close the tour">×</button></div><h3 id="lpt-h"></h3><p class="lpt-p"></p>' +
      '<div class="lpt-b"><button type="button" class="lpt-back" data-t="back">Back</button><span><button type="button" class="lpt-act" data-t="act"></button>' +
      '<button type="button" class="lpt-next" data-t="next">Next</button></span></div></div>';
    D.body.appendChild(ov);
    hole = $('.lpt-hole', ov); tip = $('.lpt-tip', ov); ov.tabIndex = -1;
    ov.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-t]');
      if (!b || !list) { if (list && !tip.contains(ev.target)) main().focus({ preventScroll: true }); return; }
      var t = b.getAttribute('data-t'), s = list[at];
      if (t === 'end') end();
      else if (t === 'back') go(at - 1, -1);
      else if (t === 'next') { if (last()) end(); else go(at + 1, 1); }
      else if (t === 'act') {
        if (last() && mode === 'news') { var n = tool; end(); start(n, 'all'); return; }
        if (s.act) { s.act.run(); setTimeout(function () { if (list) { if (last()) end(); else go(at + 1, 1); } }, 200); }
      }
    });
    ov.addEventListener('keydown', function (ev) {
      if (!list) return;
      ev.stopPropagation();          // the tool's own keys wait while the tour talks
      if (ev.key === 'Escape') { ev.preventDefault(); end(); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); $('.lpt-next', ov).click(); }
      else if (ev.key === 'ArrowLeft') { ev.preventDefault(); if (!$('.lpt-back', ov).hidden) go(at - 1, -1); }
      else if (ev.key === 'Tab') {
        var f = $$('button', tip).filter(function (b) { return !b.hidden; });
        if (ev.shiftKey && D.activeElement === f[0]) { ev.preventDefault(); f[f.length - 1].focus(); }
        else if (!ev.shiftKey && D.activeElement === f[f.length - 1]) { ev.preventDefault(); f[0].focus(); }
      }
    });
    W.addEventListener('resize', place);
    W.addEventListener('scroll', place, true);
  }
  function targets(s) {
    if (!s.at) return [];
    for (var i = 0; i < s.at.length; i++) {
      var l = $$(s.at[i]).filter(shown);
      if (l.length) return s.all ? l : [l[0]];
    }
    return [];
  }
  function usable(s) { return (!s.when || s.when()) && (!s.at || targets(s).length > 0); }
  function rectOf(els) {
    var r = null;
    els.forEach(function (el) { var b = el.getBoundingClientRect(); r = r ? { l: Math.min(r.l, b.left), t: Math.min(r.t, b.top), r: Math.max(r.r, b.right), b: Math.max(r.b, b.bottom) } : { l: b.left, t: b.top, r: b.right, b: b.bottom }; });
    return r;
  }
  function last() { for (var i = at + 1; i < list.length; i++) if (usable(list[i])) return false; return true; }
  function main() { var a = $('.lpt-act', ov); return a.hidden ? $('.lpt-next', ov) : a; }
  // what stays on top of the page (the site's header and the record/discussion switch): the spotlight goes below it
  function headH() {
    var h = 0;
    $$('.top,.modes').forEach(function (el) { if (/sticky|fixed/.test(W.getComputedStyle(el).position) && shown(el)) h = Math.max(h, el.getBoundingClientRect().bottom); });
    return Math.max(0, h);
  }
  // the control onto the screen, below what stays on top. A box that scrolls by itself is scrolled first (scrollIntoView
  // reaches every scrolling box); then the page, so the control is not under the header. On a phone the control goes to
  // the top when the card would otherwise have to sit on it.
  function bring(els) {
    var r = rectOf(els), vh = W.innerHeight, top = headH() + 12, phone = D.documentElement.clientWidth < 640, ch = (tip && tip.offsetHeight) || 280;
    var room = vh - 12 - r.b >= ch + 24 || r.t - top >= ch + 24;
    if (r.t >= top && r.b <= vh - 12 && (!phone || room)) return;
    if (r.t < 0 || r.t > vh) { try { els[0].scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { } r = rectOf(els); }
    var tall = r.b - r.t > (vh - top) * 0.6;
    var want = tall || phone ? top : top + Math.max(0, ((vh - top) - (r.b - r.t)) / 2);
    W.scrollBy(0, r.t - want);
  }
  function go(i, dir) {
    while (i >= 0 && i < list.length && !usable(list[i])) i += dir;
    if (i < 0) { i = at; if (!usable(list[i])) { i = 0; while (i < list.length && !usable(list[i])) i++; } }
    if (i >= list.length) { end(); return; }
    at = i;
    var s = list[at], els = targets(s);
    if (els.length) bring(els);
    var real = list.filter(function (x) { return x === s || usable(x) || (x.when && !x.opt); });          // a step that waits for an earlier "Show me" keeps its number
    var n = real.indexOf(s), fin = last();
    $('.lpt-e', ov).textContent = s.e || '';
    $('.lpt-n', ov).textContent = (mode === 'news' ? 'New: ' : '') + (n + 1) + ' of ' + real.length;
    $('#lpt-h', ov).textContent = s.h;
    $('.lpt-p', ov).textContent = words(s.p);
    $('.lpt-back', ov).hidden = n <= 0;
    var a = $('.lpt-act', ov);
    if (fin && mode === 'news') { a.hidden = false; a.textContent = 'The whole tour'; }
    else { a.hidden = !s.act; a.textContent = s.act ? s.act.label : ''; }
    $('.lpt-next', ov).textContent = fin ? 'Done' : 'Next';
    ov.classList.toggle('is-center', !els.length);
    placeNow();
    setTimeout(placeNow, 80);          // a scroll or a "Show me" moves the page under the spotlight: measure again
    setTimeout(placeNow, 360);
    main().focus({ preventScroll: true });
  }
  function place() { cancelAnimationFrame(raf); raf = requestAnimationFrame(placeNow); }
  function placeNow() {
    if (!ov || !list || ov.hidden) return;
    var s = list[at], els = targets(s), vw = D.documentElement.clientWidth, vh = W.innerHeight, phone = vw < 640;
    var tw = Math.min(phone ? vw - 24 : 380, vw - 24);
    tip.style.width = tw + 'px';
    if (!els.length) {
      hole.style.display = 'none';
      tip.style.left = Math.round((vw - tw) / 2) + 'px';
      tip.style.top = Math.max(12, Math.round((vh - tip.offsetHeight) / 2)) + 'px';
      return;
    }
    var r = rectOf(els), pad = 8;
    var L = Math.max(4, r.l - pad), T = Math.max(4, r.t - pad), Wd = Math.min(vw - 4, r.r + pad) - L, H = Math.min(vh - 4, r.b + pad) - T;
    hole.style.display = 'block';
    hole.style.left = L + 'px'; hole.style.top = T + 'px'; hole.style.width = Math.max(0, Wd) + 'px'; hole.style.height = Math.max(0, H) + 'px';
    var th = tip.offsetHeight, x, y;
    // a spotlight on many controls that is taller than the screen: the card keeps clear of the first of them, the one the
    // reader looks at first (the hole still lights them all)
    if (els.length > 1 && H > vh * 0.6) { var f = rectOf([els[0]]); T = Math.max(4, f.t - pad); H = Math.min(vh - 4, f.b + pad) - T; L = Math.max(4, f.l - pad); Wd = Math.min(vw - 4, f.r + pad) - L; }
    if (phone) {          // the bottom of the screen, or the top: wherever it does not cover the spotlight
      x = 12;
      var below = vh - 12 - (T + H), above = T - 12;
      y = th + 12 <= below ? vh - th - 12 : th + 12 <= above ? 12 : (above > below ? 12 : vh - th - 12);
    } else if (T + H + 14 + th <= vh - 12) { x = Math.min(Math.max(12, L), vw - tw - 12); y = T + H + 14; }          // under the control
    else if (T - th - 14 >= 12) { x = Math.min(Math.max(12, L), vw - tw - 12); y = T - th - 14; }          // over it
    else if (L + Wd + 14 + tw <= vw - 12) { x = L + Wd + 14; y = Math.min(Math.max(12, T), vh - th - 12); }          // beside it
    else if (L - tw - 14 >= 12) { x = L - tw - 14; y = Math.min(Math.max(12, T), vh - th - 12); }
    else { x = vw - tw - 12; y = vh - th - 12; }
    tip.style.left = Math.round(x) + 'px'; tip.style.top = Math.round(y) + 'px';
  }
  function start(name, how) {
    var T = TOOLS[name];
    if (!T || !$(T.root)) return false;
    if (!ov) build();
    if (list) end();
    var since = seenV(name);
    mode = how === 'news' || (how !== 'all' && since > 0 && since < T.v && fresh(name, since).length) ? 'news' : 'all';
    list = mode === 'news' ? fresh(name, since) : T.steps.slice();
    tool = name; at = 0;
    back = D.activeElement;
    ov.hidden = false; D.documentElement.classList.add('lpt-on');
    put('lpt-' + name, String(T.v));
    $$('.lpt-doors[data-lpt="' + name + '"] .lpt-how').forEach(function (b) { b.classList.remove('is-new'); });
    go(0, 1);
    return true;
  }
  function end() {
    if (!ov || !list) return;
    ov.hidden = true; list = null; D.documentElement.classList.remove('lpt-on');
    var b = back; back = null;
    if (b && b.isConnected && b.focus) b.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ the walk (build/phone-test.html)
     Takes a tour from its first step to its last the way a visitor does ("Show me" where a step has one, else Next) and
     measures every card: inside the screen, words 12px or more, buttons 40px or more, its words filled, its control found,
     on the screen and under the spotlight. Resolves { seen: [step names], bad: [problems] }. */
  function walk(name, wait) {
    wait = wait || 250;
    return new Promise(function (done) {
      var seen = [], bad = [], guard = 0;
      if (!start(name, 'all')) { done({ seen: seen, bad: ['the ' + name + ' tour did not start (no ' + (TOOLS[name] || {}).root + ' on the page)'] }); return; }
      function look() {
        if (!list || ++guard > 40) { if (list) { bad.push('the tour did not end after 40 steps'); end(); } done({ seen: seen, bad: bad }); return; }
        var s = list[at], vw = D.documentElement.clientWidth, vh = W.innerHeight, r = tip.getBoundingClientRect();
        seen.push(s.k);
        if (r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1) bad.push(s.k + ': the card runs off the screen');
        $$('h3, p, button', tip).forEach(function (el) {
          if (!shown(el)) return;
          if (el.textContent.trim() && parseFloat(W.getComputedStyle(el).fontSize) < 12) bad.push(s.k + ': words under 12px (' + el.className + ')');
          if (el.tagName === 'BUTTON' && el.getBoundingClientRect().height < 40) bad.push(s.k + ': a button under 40px (' + el.className + ')');
        });
        if (!words(s.p) || /undefined|NaN|\{\w+\}/.test(words(s.p) + s.h)) bad.push(s.k + ': its words are missing or unfilled');
        var els = targets(s);
        if (s.at && !els.length) bad.push(s.k + ': its control is not on the page');
        if (els.length) {
          var t = els[0].getBoundingClientRect(), h = hole.getBoundingClientRect(), top = headH();
          if (t.bottom < top + 4 || t.top > vh - 4) bad.push(s.k + ': its control is not on the screen (top ' + Math.round(t.top) + ' of ' + vh + ')');
          if (!(h.right > t.left && h.left < t.right && h.bottom > t.top && h.top < t.bottom)) bad.push(s.k + ': the spotlight is not on its control');
          var c = tip.getBoundingClientRect(), mid = { x: (Math.max(t.left, 0) + Math.min(t.right, vw)) / 2, y: (Math.max(t.top, top) + Math.min(t.bottom, vh)) / 2 };
          if (t.height < vh * 0.5 && mid.x > c.left && mid.x < c.right && mid.y > c.top && mid.y < c.bottom) bad.push(s.k + ': the card sits on its own control');
        }
        var a = $('.lpt-act', ov);
        (s.act && !a.hidden ? a : $('.lpt-next', ov)).click();
        setTimeout(look, wait);
      }
      setTimeout(look, wait);
    });
  }

  /* ------------------------------------------------------------------ the doors */
  var ICO = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9v.4"/><path d="M12 17.2h.01"/></svg>';
  function doors() {
    $$('.lpt-doors[data-lpt]').forEach(function (box) {
      var name = box.getAttribute('data-lpt'), T = TOOLS[name], b = $('.lpt-how', box);
      if (!T || !b || b.getAttribute('data-wired')) return;
      b.setAttribute('data-wired', '1');
      if (!$('svg', b)) b.insertAdjacentHTML('afterbegin', ICO);
      b.setAttribute('aria-label', 'How it works: a short tour of ' + T.name);
      var since = seenV(name);
      if (since > 0 && since < T.v && fresh(name, since).length) { b.classList.add('is-new'); b.title = 'New since your last visit'; }
      b.addEventListener('click', function () { start(name); });
      b.hidden = false;
    });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', doors); else doors();

  W.LPTour = {
    tools: function () { return Object.keys(TOOLS); },
    here: function () { return Object.keys(TOOLS).filter(function (n) { return !!$(TOOLS[n].root); }); },
    info: function (n) { var T = TOOLS[n]; return T ? { name: T.name, root: T.root, ready: T.ready, v: T.v, pending: !!T.pending, steps: T.steps.length } : null; },
    required: function (n) { return TOOLS[n].steps.filter(function (s) { return !s.opt && !s.when; }).map(function (s) { return s.k; }); },
    start: start, end: end, audit: audit, walk: walk, keyOf: keyOf,
    at: function () { return list ? { tool: tool, mode: mode, i: at, k: list[at].k } : null; }
  };
})();
