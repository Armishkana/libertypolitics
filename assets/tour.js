/* THE TOURS OF THE TOOLS (libertypolitics.com, and iranuncensored.com since 1 November 2026): Call the Midterms, Build a
   government, the Regime Board, Beat the Markets, the Conflict Simulator, the Tools page.
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
   button beside it). Never opens by itself. The look of the doors, the spotlight and the card is in THIS file (CSS, injected
   once as <style id="lpt-css">; 1 November 2026, so Iran Uncensored's pages carry the same look with no second copy): a
   progress line, the emoji, "Step 2 of 7", the heading, the words, a dot per step, Back and Next.

   TWO LANGUAGES (1 November 2026). On a Persian page (html lang="fa") a step reads its fa: { h, p, act } (spoken Persian,
   ../site-iu/PERSIAN.md) and the tool's fa name; the card's own words are UI below. A tool with a step that has no Persian
   keeps its door shut there (never English on a Persian page) and audit() lists the step as nolang, which the Iran
   site's phone test fails. Right-to-left pages swap the arrow keys.
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
      // v2, 1 November 2026: the win chance row on each race (your map against the markets, and the edge), the chambers'
      // edge line, and Biggest edges against the markets under step 3
      name: 'Call the Midterms', root: '#midterms', ready: '#midterms.is-live', v: 2,
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
        { k: 'boards', at: ['#mt-b-S', '#mt-b-H'], all: true, e: '🏛️', h: 'The Senate and the House', v: 2,
          p: 'Every seat, blue for the Democrats and red for the Republicans. The big numbers are the seats each side wins on your map. Under them: your map’s chance to win the chamber, the betting markets’ chance, and the edge between the two.',
          covers: ['.mt-boards', 'mt-b-*'] },
        { k: 'night', at: ['#mt-run'], e: '🌙', h: 'Run election night',
          p: 'Watch a pretend election night: races are called in the order the polls close, the close ones last. Skip to the end any time.',
          covers: ['.mt-tools', '.mt-step', '.mt-tools-b', 'mt-run', 'mt-reset', 'mt-night', '.mt-night-top', '.mt-clock', 'mt-called', 'mt-skip', 'mt-again', 'mt-back'] },
        { k: 'share', at: ['#mt-share'], e: '📤', h: 'Share your Congress',
          p: 'Share sends a link that opens your exact map. Make a picture gives you an image of it to post.',
          covers: ['mt-share', 'mt-pic', '.acct-ask'] },
        { k: 'edges', at: ['#mt-gaps'], opt: true, e: '📐', h: 'Biggest edges against the markets', v: 2,
          p: 'The races where your map and the betting markets disagree most about the same candidate: the bar is your map, the yellow tick is the markets. Tap Show every edge to list them all, biggest first.',
          covers: ['mt-gaps'] },
        { k: 'races', at: ['#midterms .mt-tabs', '#mt-races'], e: '✅', h: 'Call any race yourself', v: 2,
          p: 'Tap a candidate to call that race for them. Tap again to give it back to the slider. Under each race the markets price: your map’s chance, the markets’ chance (the yellow tick) and the edge.',
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
      // v2, 1 November 2026: the prime minister card against the markets under the chamber, each party's size bar
      name: 'Build the next government', root: '#coalition', ready: '#coalition.is-live', v: 2,
      surf: ['#coalition > *', '#coalition .coal-grid > *', '#coalition .coal-stage > *', '#coalition .coal-side > *', '#coalition .coal-tools > *',
        '#coalition .coal-pres > *', '#coalition .coal-ways > *'],
      skip: { 'coal-data': 'the data the calculator reads', '.coal-head': 'the title', '.coal-src': 'where the seats come from, read under the tool',
        '.coal-mini': 'the bar at the foot of a phone screen that leads back to the chamber', '.coal-sub': 'a heading', 'coal-lib': 'a line about the government you built, read with it' },
      steps: [
        { k: 'chamber', at: ['#coalition .coal-chamber'], e: '🏛️', h: 'The chamber',
          p: function () { return 'Each dot is one seat. The number in the middle counts the seats of the government you build. It needs ' + num('#coalition .coal-bar-line .num', 'a majority') + '.'; },
          covers: ['.coal-grid', '.coal-stage', '.coal-chamber', '.coal-bar'] },
        { k: 'parties', at: ['#coalition .coal-list'], e: '👆', h: 'Tap parties to build it',
          p: 'Tap a party to put it in the government. Tap Outside for a party that keeps the government alive without joining it. The chamber fills as you go; the thin bar under each party is its size.', v: 2,
          covers: ['.coal-side', '.coal-list'] },
        { k: 'presets', at: ['#coalition .coal-pres'], e: '⚡', h: 'Or start from a plan',
          p: 'Each button builds a government people are talking about. The number on it is its seats.',
          act: { label: 'Show me', run: function () { click('#coalition .coal-pre'); } },
          covers: ['.coal-pres', '.coal-pre-row'] },
        { k: 'say', at: ['#coal-say'], e: '💬', h: 'What you built', v: 2,
          p: 'This names the government you built and how likely it is, from what the leaders have said. Once it has a majority, a card sets its prime minister against the betting markets’ favorite, with the market one tap away.',
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
      // ONE STAGE (31 Oct 2026, regime.js): views and filters on the top edge, the board, the timeline docked under it.
      // 1 Nov 2026 (v3): the head is a scoreboard (.rg-hl the title side, .rg-hr the numbers, the bar of how much is gone and
      // the latest falls), the odds board (build/oddsboard.py, Liberty Politics only), and Persian for Iran Uncensored.
      name: 'The Regime Board', fa: 'سران رژیم', root: '#regime', ready: '#rg-bar:not([hidden])', v: 3,
      surf: ['#regime .wrap > *', '#regime .rg-head > *', '#regime .rg-hl > *', '#regime .rg-hr > *', '#regime .rg-count > *', '#regime .rg-acts > *', '#rg-zw > *', '#regime .rg-ctl > *', '#regime .rg-seg > *',
        '#regime .rg-fil > *', '#regime .rg-vpw > *', '#regime .rg-zfl > *', '#rg-time > *', '#regime .rg-dk1 > *', '#regime .ob-hd > *', '#regime .ob-body > *'],
      skip: { '.rg-kick': 'the date it was checked', 'h1': 'the title', '.rg-lede': 'the line under the title',
        'rg-none': 'a line that shows when a search finds nobody', '.rg-foot': 'where the chart comes from', '.rg-zhint': 'a hint on how to zoom', '.vh': 'a label for screen readers',
        '.lpt-doors': 'the tour and stream doors themselves', '.rg-hl': 'the title side of the head (its parts are toured one by one)', '.rg-hr': 'the numbers side of the head (its parts are toured one by one)',
        '.ob-hw': 'the heading of the odds board (its words are read, not tapped)', 'nudge': 'the way into the page’s discussion (Iran Uncensored draws it inside the board)' },
      steps: [
        { k: 'count', at: ['#regime .rg-count'], e: '🔢', h: 'The count',
          p: 'How many of the Islamic Republic’s leaders were taken out, how many are still in place, and how many nobody can confirm. The bar shows how much of the board is gone. Tap a number to see those people on the board.',
          fa: { h: 'شمارش', p: 'چند نفر از سران جمهوری اسلامی حذف شدن، چند نفر هنوز سر کارن، و سرنوشت چند نفر معلوم نیست. نوار زیرش نشون می‌ده چقدر از این تابلو رفته. روی هر عدد بزنید تا همون آدما رو روی تابلو ببینید.' },
          covers: ['.rg-head', '.rg-count', '.rg-cn', '.rg-share'], v: 3 },
        { k: 'latest', at: ['#regime .rg-latest'], opt: true, e: '❌', h: 'The latest to fall',
          p: 'The newest faces taken out, newest first. Tap one for the whole story: how and when, and who sat in that chair before.',
          fa: { h: 'آخرین کسایی که حذف شدن', p: 'جدیدترین صورت‌هایی که از تابلو افتادن، اول از همه تازه‌ترین. روی هر کدوم بزنید تا کل ماجراش رو ببینید: کی و چطور، و کی قبلش سر اون صندلی بود.' },
          covers: ['.rg-latest'], v: 3 },
        { k: 'views', at: ['#regime .rg-seg'], e: '🗂️', h: 'Four ways to see it',
          p: 'The whole chart, by faction, day by day, or a plain list. Every one zooms, and the board stays right under your finger.',
          fa: { h: 'چهار جور دیدن', p: 'کل نمودار، جناح‌ها، روز به روز، یا یه فهرست ساده. همه‌شون زوم می‌شن و تابلو همیشه زیر دستتونه.' },
          covers: ['rg-zw', 'rg-bar', '.rg-ctl2', '.rg-seg', 'v=*'] },
        { k: 'find', at: ['#regime .rg-fil'], e: '🔎', h: 'Who to show',
          p: 'Show only who was taken out, who is still in place or whose fate is unknown, light up one faction, or type a name. The board under it changes as you tap.',
          fa: { h: 'کیا رو نشون بده', p: 'فقط کشته‌شده‌ها، اونایی که هنوز سر کارن یا سرنوشتشون نامعلومه رو ببینید، یه جناح رو روشن کنید، یا یه اسم بنویسید. تابلو همون لحظه عوض می‌شه.' },
          covers: ['.rg-fil', 'f=*', 'rg-q', 'rg-campkey'] },
        { k: 'chart', at: ['#rg-vp', '#rg-list'], all: false, e: '🔍', h: 'Zoom in',
          p: 'Pinch or scroll to zoom, drag to move, or use + and −. Tap any face for the whole story: how and when they fell, and everyone who has sat in that chair.',
          fa: { h: 'زوم کنید', p: 'با دو انگشت یا چرخ ماوس زوم کنید، بکشید تا جابه‌جا بشه، یا + و − رو بزنید. روی هر صورت بزنید تا کل ماجراش رو ببینید: کی و چطور افتاد، و همهٔ کسایی که اون صندلی رو داشتن.' },
          covers: ['.rg-vpw', 'rg-vp', 'rg-list', 'rg-ev', '.rg-zfl', 'rg-zin', 'rg-zout', 'rg-sheet'] },
        { k: 'fit', at: ['#rg-zfit', '#rg-zfull'], all: false, e: '🖥️', h: 'Fit it, or fill the screen',
          p: 'Fit shows everyone again. Full screen fills the screen with the board, its filters and its timeline, for a live show.',
          fa: { h: 'همه رو ببینید، یا کل صفحه', p: 'دکمهٔ «کل نمودار» دوباره همه رو نشون می‌ده. «کل صفحه» تابلو رو با فیلترها و خط زمانش تمام‌صفحه می‌کنه، برای برنامهٔ زنده.' },
          covers: ['rg-zfit', 'rg-zfull'] },
        { k: 'time', at: ['#rg-time'], e: '⏳', h: 'The timeline',
          p: 'Drag it, or press Replay, and watch each face fall on the day it fell, right above it. The buttons jump to each war, and Today brings it back.',
          fa: { h: 'خط زمان', p: 'بکشیدش، یا «دوباره ببین» رو بزنید و ببینید هر کس همون روزی که افتاد از تابلو می‌افته. دکمه‌ها می‌برنتون سراغ هر جنگ و «امروز» برتون می‌گردونه.' },
          covers: ['rg-time', '.rg-dk1', 'rg-play', '.rg-day', '.rg-track', 'rg-wars'] },
        { k: 'share', at: ['#rg-share'], e: '📤', h: 'Share the board',
          p: 'Share sends a link to the board as you see it. Make a picture gives you an image of it to post.',
          fa: { h: 'صفحه رو بفرستید', p: '«صفحه رو بفرستید» لینک تابلو رو همون‌طوری که می‌بینید می‌فرسته. «یه عکس بسازید» یه عکس ازش بهتون می‌ده که پست کنید.' },
          covers: ['.rg-acts', 'rg-share', 'rg-shot'] },
        { k: 'odds', at: ['#regime .ob-tiles', '#regime .ob'], lp: true, opt: true, e: '💵', h: 'What the money says',
          p: 'The betting markets on the regime, read every hour: will it fall, who heads it, Prince Reza Pahlavi. Each number opens its market.',
          covers: ['odds', '.ob-tiles', '.mk-sw', '.ob-lds'], v: 3 },
        { k: 'curve', at: ['#regime .ob-ld'], lp: true, opt: true, e: '📈', h: 'When the money expects it',
          p: 'Some markets are sold as a row of dates. The curve shows the chance at each one, and the line under it says where it moves most.',
          covers: ['.ob-ld'], v: 3 },
        { k: 'intel', at: ['#regime .rg-intel'], opt: true, e: '🧭', h: 'Where the war stands',
          p: 'Open this for what the US and Israel have said, and what the betting markets give.',
          fa: { h: 'جنگ الان کجاست', p: 'اینو باز کنید تا ببینید آمریکا و اسرائیل چی گفتن و بازارهای پیش‌بینی چی می‌گن.' },
          covers: ['.rg-intel'] },
        { k: 'calls', at: ['#regime .lpc'], lp: true, opt: true, e: '🎯', h: 'Make your call',
          p: 'Pick your answer to what the betting markets are asking. You see the markets’ number and the readers’ number, and yours once you sign in.',
          covers: ['.lpc'] }
      ]
    },
    // The Tools page (tools/, both sites; build/tools.py, ../TOOLS.md). 1 November 2026: every tool, and the vote on the next.
    tools: {
      name: 'Tools', fa: 'ابزارها', root: '#tk', ready: '#built .tk-tool', v: 1,
      surf: ['#tk .tk-hero .wrap > *', '#tk .tk-jump > *', '#built .wrap > *', '#tk .tk-tools > *', '#next .wrap > *', '#next .tk-nh > *', '#suggest > *'],
      skip: { '.tk-k': 'the word Tools over the title', 'h1': 'the title', '.tk-lede': 'the line under the title', '.tk-nums': 'three counts, read, not tapped',
        '.tk-jump': 'the row of the two links and this tour', 'a': 'the two links under the title say where they go (the tools, the vote)', 'h2': 'a section title', 'tk-built-h': 'a section title', 'tk-next-h': 'a section title', 'tk-mk-h': 'a section title', 'h3': 'a section title', '.vh': 'a label for screen readers',
        'talk-h': 'a title for screen readers', '.tk-p': 'the line under the title of the vote', '.tk-sp': 'the line under Suggest a tool', '.tk-read': 'when the odds were read',
        '.lpt-doors': 'the tour door itself' },
      steps: [
        { k: 'tools', at: ['#built .tk-tools'], e: '🧰', h: 'Every tool, one tap away',
          p: 'Each card is a tool I built: what it does in one line, and a button that opens it. They work without an account.',
          fa: { h: 'همهٔ ابزارها، با یه ضربه', p: 'هر کارت یه ابزاره که ساختم: یه خط می‌گه چی کار می‌کنه و یه دکمه بازش می‌کنه. بدون حساب هم کار می‌کنن.' },
          covers: ['.tk-tools', '.tk-tool'] },
        { k: 'number', at: ['#built .tk-stat'], opt: true, e: '📊', h: 'A live number from each',
          p: 'The number on a card comes from the tool itself: what the betting markets say right now, or how many it counts today.',
          fa: { h: 'یه عدد زنده از هر ابزار', p: 'عدد روی هر کارت از خود ابزار میاد: همین الان چند نفر حذف شدن، یا ابزار چی شمرده.' },
          covers: ['.tk-stat'] },
        { k: 'vote', at: ['#talk .tk-row', '#tk-ideas .tk-card', '#next .tk-nh'], e: '🗳️', h: 'Vote on what I build next',
          p: 'These are the tools I could build next, in order of votes. Tap I want this on the ones you would use. I build from the top of this list.',
          fa: { h: 'به ابزار بعدی رأی بدید', p: 'اینا ابزارهاییه که می‌تونم بعدی بسازم، به ترتیب رأی. روی «اینو می‌خوام» بزنید برای هر کدوم که استفاده می‌کنید. از بالای همین فهرست می‌سازم.' },
          covers: ['.tk-nh', '.tk-sw', 'tk-pulse', 'talk', 'tk-ideas'] },
        { k: 'markets', at: ['#next .tk-mks'], lp: true, opt: true, e: '🎲', h: 'The markets behind each idea',
          p: 'Every idea shows the betting markets that inspired it, with their odds and the money traded. Tap one to see it on the market.',
          covers: ['.tk-mks'] },
        { k: 'suggest', at: ['#suggest'], e: '💡', h: 'Suggest your own',
          p: 'Name a tool and say what it would do. It joins the list, and everyone can vote on it.',
          fa: { h: 'ایدهٔ خودتون رو بگید', p: 'اسم یه ابزار رو بنویسید و بگید چی کار می‌کنه. می‌ره تو فهرست و همه می‌تونن بهش رأی بدن.' },
          covers: ['suggest', 'tk-namerow', 'feedback'] }
      ]
    },
    // Beat the Markets (markets/, CALLS.md; build/calls.py and calls.js belong to their own builder). Written on 31 October
    // 2026 against the page as first built (#btm, the call widget .lpc in #btm-list); no longer pending (the page is built).
    // Its doors (R.tool_doors("markets")) and its stream layout (html.lp-stream rules in calls.css) are its builder's to add.
    markets: {
      // v2, 1 November 2026: how a call scores is drawn in the head, three rails over the list (closing soon, coin flips,
      // biggest moves) open a market whole in the box under them, and a card says the readers' edge on the market
      name: 'Beat the Markets', root: '#btm', ready: '#btm-list > *', v: 2,
      surf: ['#btm .btm-tabs > *', '#btm .btm-bar .chips > *', '#btm .btm-row > *', '#btm .btm-f > *', '#btm .btm-sec', '#btm .btm-top > *', '#btm-all .wrap > div',
        '#btm .btm-tile', '#btm-focus .btm-focus-top > *'],
      skip: { '.lpt-doors': 'the tour and stream doors themselves', 'label': 'the name of the box beside it', '.chips-gap': 'a gap between two groups of chips',
        '.btm-intro': 'the title, its line and the count of open markets', '.btm-bar': 'the filters, each explained by its own step', '.btm-focus-h': 'the heading of the market you opened' },
      steps: [
        { k: 'score', at: ['#btm .btm-score'], e: '🧮', h: 'How a call scores', v: 2,
          p: 'Read the two bars: back a 20% long shot and it comes in, you get 80 points; back an 80% favorite, 20. Miss, and you lose what the market thought it was worth.',
          covers: ['.btm-score'] },
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
        { k: 'rails', at: ['#btm-rails'], opt: true, e: '⏱️', h: 'Closing soon, coin flips, big moves', v: 2,
          p: 'Tap a tile and its market opens whole right under the rows, ready to call. Closing soon pays your points first; a coin flip pays big either way. Close puts it away.',
          covers: ['btm-rails', '.btm-tile', 'btm-focus', 'btm-focus-x'] },
        { k: 'calls', at: ['#btm-list'], e: '🎯', h: 'Make your call', v: 2,
          p: 'Each card is one market. Tap an option to make it your call: the shaded bar behind it is its price. Markets is the money, Readers is people here, You is yours, and Edge says where readers part with the market.',
          covers: ['btm-all', 'btm-list', '.lpc'] },
        { k: 'record', at: ['#btm-recbox'], opt: true, e: '🏆', h: 'Your record',
          p: 'Come back after a market closes to see how you did. Back a long shot and it comes in: big points. Miss: you lose what the market thought it was worth.',
          covers: ['btm-rec', 'btm-recbox'] }
      ]
    },
    // Your Liberty Score (you/; render.py you(), build/you.js, build/you.css). Added 1 November 2026, when Armin asked that
    // every tool have a tour. The result steps show only once a grade is on the page (when): before that they are not.
    you: {
      name: 'Your Liberty Score', root: '#you', ready: '#you.is-live', v: 1,
      surf: ['#you .yq-top > *', '#you .yq-b > *', '#yq-end > *', '#yq-res .wrap > *', '#yq-like > *'],
      skip: { '.yq-h1': 'the title', '.big': 'the line under the title (class big yq-lede)', 'nudge': 'the invitation to talk about your grade in the discussion',
        'tband': 'the band that invites you onto the live show', '.yq-priv': 'a line that says your answers stay on your device',
        'yq-got': 'a line that says what the friend who sent you here got', '.lpt-doors': 'the tour and stream doors themselves', 'noscript': 'what shows with scripts off',
        'yq-sh': 'a line that says the Share button now sends your grade', '.dim': 'a line that says changing an answer moves the grade (class dim yq-chg)', '.nudge': 'the invitation to the community call',
        '.yq-h2': 'a heading', 'yq-like-p': 'a line that says how the members were compared', 'label': 'the name of the box beside it' },
      steps: [
        { k: 'answer', at: ['#q1 .yq-b'], e: '🗳️', h: 'Vote on each question',
          p: 'Tap Yes or No, the way you would have voted in Congress. Not sure? Skip. Each question stands for one of my eight principles, named at its top.',
          covers: ['v=*'] },
        { k: 'progress', at: ['#yq-prog'], e: '📶', h: 'Eight marks, one per question',
          p: 'Each mark lights up as you answer. Four answers are enough for a letter; all eight make it fairer.',
          covers: ['yq-prog'] },
        { k: 'grade', at: ['#yq-go'], e: '🎓', h: 'See your grade',
          p: 'Tap See my grade once you have answered four. You get a letter on the same scale as every member of Congress, and every question shows which side I count as the liberty side.',
          covers: ['yq-go', 'yq-left'] },
        { k: 'letter', at: ['#yq-ring'], when: function () { return shown($('#yq-ring')); }, e: '🏅', h: 'Your letter',
          p: 'The ring fills to your score out of 100. Change any answer below and the letter follows.',
          covers: ['.yq-grade', 'yq-rank'] },
        { k: 'dist', at: ['#yq-dist'], when: function () { return shown($('#yq-dist')); }, e: '📊', h: 'Where you sit among Congress',
          p: 'Every graded member of Congress by score, blue for Democrats and red for Republicans. The yellow line is you.',
          covers: ['yq-dist'] },
        { k: 'like', at: ['#yq-near'], when: function () { return shown($('#yq-near')); }, e: '🤝', h: 'Who votes like you',
          p: 'The four members who vote most like you, and the four who vote least like you. Tap one to open their record.',
          covers: ['yq-like', 'yq-near', 'yq-far'] },
        { k: 'state', at: ['#yq-state'], when: function () { return shown($('#yq-state')); }, e: '📍', h: 'The people who represent you',
          p: 'Pick your state and see your senators and representatives, each with how closely they match you.',
          covers: ['.yq-st', 'yq-mine'] }
      ]
    },
    // The Uprising Simulator (uprising/; build/uprising.py, .js, .css). v2, 1 November 2026: rewritten from the rebuilt page
    // (the 3D city, the two modes, the advisors as characters, the live odds, Watch, Compare). Each step asks the reader to
    // do the thing, and "Show me" does it for them. No stream view: the board already fills the screen (phone-test.html).
    uprising: {
      name: 'Uprising Simulator', root: '#uprising', ready: '#up-adv-pane > *, #up-p-start > *', v: 2,
      surf: ['#up-pickb', '#up-modes > *', '#up-cmpb', '#up-share', '#up-howb', '#up-hud', '#uprising .up-adv', '#uprising .up-tab', '#up-odds', '#up-watch', '#up-addcmp', '#up-bar > *', '#up-feed', '#up-legend'],
      skip: { '.lpt-doors': 'the tour door itself' },
      steps: [
        { k: 'board', fa: { h: 'شهر، همون‌طور که هست', p: 'خیابان‌ها و ساختمان‌های واقعیش، از اوپن‌استریت‌مپ. روی جاهای رژیم نشان کسی هست که اداره‌شون می‌کنه: سپاه، بسیج، پلیس یا ارتش. برای جابه‌جایی بکشید، با دو انگشت یا اسکرول زوم کنید، با دو انگشت یا دکمهٔ راست موس بچرخونید. روی هر جا بزنید تا ببینید چیه.' }, at: ['#up-gl'], e: '🏙️', v: 2, h: 'The city, as it is',
          p: 'Its real streets and buildings from OpenStreetMap. The regime’s places carry the emblem of whoever runs them: IRGC, Basij, police or army. Drag to move, pinch or scroll to zoom, two fingers or the right button to turn. Tap any place to see what it is.' },
        { k: 'city', fa: { h: 'شهرتون رو انتخاب کنید', p: 'روی اسم شهر بزنید تا نقشهٔ ایران باز بشه و یکی از ۳۵ شهر رو انتخاب کنید.' }, at: ['#up-pickb'], e: '📍', v: 2, h: 'Pick your city',
          p: 'Tap the city name to open the map of Iran and choose one of 35 cities.', covers: ['up-pickb'] },
        { k: 'hud', fa: { h: 'کی داره می‌بره', p: 'ساعت، توازن بین مردم و رژیم، چند نفر تو خیابان‌ان، نیروها، کیا به مردم پیوستن، بازداشت‌ها و جان‌باخته‌ها. برچسب‌ها می‌گن اینترنت و برق وصله یا نه، رژیم چقدر زور به کار می‌بره، و کیا اعتصاب کردن.' }, at: ['#up-hud'], opt: true, e: '📊', v: 2, h: 'Who is winning',
          p: 'The clock, the balance between the people and the regime, how many are on the streets, the forces, who crossed over, the arrests and the lives lost. The tags say whether the internet and the power are on, how much force the regime is using, and who is on strike.',
          covers: ['up-hud'] },
        { k: 'modes', fa: { h: 'دو راه برای پیش رفتن', p: '«یه مشاور هدایت می‌کنه»: یه متخصص انتخاب کنید و برنامه‌ش رو اجرا کنید. «خودم فرمان می‌دم»: خودتون انتخاب کنید از کجا شروع بشه، مردم کجا و کی برن، اعتصاب و ابزارها.', act: 'نشونم بده' }, at: ['#up-modes'], e: '🧭', v: 2, h: 'Two ways to play',
          p: 'An advisor leads: pick an expert and play their plan. I command: choose where it starts, where people go and when, the strike and the tools yourself.',
          act: { label: 'Show me', run: function () { click('#up-mode-adv'); } }, covers: ['up-mode-*'] },
        { k: 'advisors', fa: { h: 'حرف یه مشاور رو بشنوید', p: 'روی یه عکس بزنید. مشاور این شهر رو بررسی می‌کنه و با شواهد از برنامه‌ش دفاع می‌کنه؛ می‌بینید به احتمال زیاد به کجا می‌رسه.', act: 'نشونم بده' }, at: ['#uprising .up-adv'], all: true, opt: true,  e: '🎖️', v: 2, h: 'Hear an advisor',
          p: 'Tap a portrait. The advisor reads this city and argues their plan from the evidence; you see what it most likely leads to.',
          act: { label: 'Show me', run: function () { click('#uprising .up-adv[data-a="organizer"]'); } }, covers: ['.up-adv'] },
        { k: 'use', fa: { h: 'برنامه‌ش رو اجرا کنید', p: 'با یه بار زدن کل برنامه تنظیم و اجرا می‌شه. مشاور دربارهٔ اتفاق‌هایی که میفته نظر می‌ده.' }, at: ['#up-use'], when: function () { return shown($('#up-use')); }, e: '✅', v: 2, h: 'Use their plan',
          p: 'One tap sets the whole plan and plays it out. The advisor comments on what happens.', covers: ['up-use', 'up-advcmp'] },
        { k: 'tabs', fa: { h: 'خودتون فرمان بدید', p: '«شروع»: از کجا شروع بشه و با چه رویکردی. «حرکت‌ها»: نقطه‌های تجمع با ساعت‌شون، و مسیرهای راهپیمایی که روی نقشه می‌کشید. «اعتصاب»: بازار، کامیون‌دارها، نفت، معلم‌ها. «ابزارها»: امدادگرها، سنگربندی، دعوت از سربازها، استارلینک. «شرایط»: اینترنت، بقیهٔ ایران، و خیزش‌های واقعی گذشته برای امتحان.', act: 'نشونم بده' }, at: ['#uprising .up-tab'], all: true, opt: true, e: '♟️', v: 2, h: 'Command it yourself',
          p: 'Start: where it begins and the approach. Moves: gathering points with their hour, and march routes you draw on the map. Strike: the bazaar, the truckers, oil, the teachers. Tools: medics, barricades, appeals to the soldiers, Starlink. Conditions: the internet, the rest of Iran, and real past uprisings to test.',
          act: { label: 'Show me', run: function () { click('#up-mode-cmd'); } }, covers: ['.up-tab'] },
        { k: 'odds', fa: { h: 'شانس، همون لحظه که انتخاب می‌کنید', p: 'با هر تغییر، برنامه‌تون پشت صحنه دوباره اجرا می‌شه: رژیم چند بار سقوط می‌کنه، اجراها چطور تموم می‌شن، و چند نفر جون‌شون رو از دست می‌دن. «چرا؟» نشون می‌ده چی بیشتر از همه شانس رو تغییر می‌ده.' }, at: ['#up-odds'], e: '🎲', v: 2, h: 'The odds, as you choose',
          p: 'Every change runs your plan again in the background: how often the regime falls, how the runs end, and the cost in lives. Why opens what moves the odds most.', covers: ['up-odds'] },
        { k: 'watch', fa: { h: 'ببینید چطور پیش می‌ره', p: 'بزنیدش تا محتمل‌ترین اجرا روی شهر پخش بشه: جمعیت‌هایی که تو خیابان‌ها راه می‌رن، نیروهایی که صف می‌بندن، گاز اشک‌آور، تیراندازی، نیروهایی که به مردم می‌پیوندن، شب.' }, at: ['#up-watch'], e: '▶️', v: 2, h: 'Watch it play out',
          p: 'Press it and the most likely run plays on the city: crowds walking the streets, the forces forming lines, tear gas, gunfire, defections, the night.', covers: ['up-watch'] },
        { k: 'bar', fa: { h: 'توقف، سرعت، خط زمان', p: 'نگهش دارید، سرعت رو عوض کنید، خط زمان رو تا هر ساعتی بکشید. علامت‌های روش لحظه‌های مهمن. «دنبال کردن» دوربین رو روی اتفاق‌ها نگه می‌داره؛ «نتیجه‌ها» می‌گه چطور تموم شد و چرا.' }, at: ['#up-bar'], when: function () { return shown($('#up-bar')); }, e: '⏯️', v: 2, h: 'Pause, speed, timeline',
          p: 'Pause, change the speed, drag the timeline to any hour. The marks on it are the moments that matter. Follow keeps the camera on the action; Results says how it ended and why.',
          covers: ['up-pp', '.up-spd', '.up-scrubw', 'up-follow', 'up-resb', 'up-back'] },
        { k: 'feed', fa: { h: 'چه خبره، و چرا', p: 'هر اتفاق با دلیلش و منبعش. روی هر کدوم بزنید تا برید همون‌جا.' }, at: ['#up-feed'], when: function () { return shown($('#up-feed')); }, e: '📰', v: 2, h: 'What is happening, and why',
          p: 'Each event with the reason it happens and its source. Tap one to fly there.', covers: ['up-feed'] },
        { k: 'compare', fa: { h: 'مقایسهٔ برنامه‌ها', p: 'تا چهار برنامه اضافه کنید، برنامهٔ یه مشاور یا برنامهٔ خودتون. «مقایسه» اونا رو کنار هم با همون اتفاق‌های تصادفی اجرا می‌کنه و بهترینش رو برای هدفی که انتخاب می‌کنید علامت می‌زنه: سقوط رژیم، محله‌ها دست مردم، تا آخر سرپا، یا کمترین جان‌باخته.' }, at: ['#up-addcmp', '#up-cmpb'], all: true, e: '⚖️', v: 2, h: 'Compare plans',
          p: 'Add up to four plans, an advisor’s or yours. Compare runs them with the same luck side by side, and marks the best for the goal you pick: the regime falls, districts held, still standing, or fewest lives lost.',
          covers: ['up-addcmp', 'up-cmpb'] },
        { k: 'share', fa: { h: 'برنامه رو بفرستید', p: 'لینک، شهر، برنامه و مقایسه‌تون رو با خودش می‌بره، پس هر کی بازش کنه دقیقاً همون چیزی رو می‌بینه که شما ساختید.' }, at: ['#up-share'], e: '🔗', v: 2, h: 'Share the plan',
          p: 'The link carries the city, your plan and your comparison, so whoever opens it sees exactly what you built.', covers: ['up-share'] },
        { k: 'legend', fa: { h: 'دست کیه', p: 'چهار تا نشان. جایی که اوپن‌استریت‌مپ ثبتش نکرده، همون‌جایی گذاشته شده که این‌جور جاها معمولاً هستن، و روش هم همینو نوشته.' }, at: ['#up-legend'], opt: true, e: '🛡️', v: 2, h: 'Who runs it',
          p: 'The four emblems. A place OpenStreetMap does not map stands where such places typically are, and is labelled so.', covers: ['up-legend'] },
        { k: 'model', fa: { h: 'مدل', p: 'مدل چی رو می‌شمره، به چه پژوهش‌هایی تکیه داره، و چطور با ۲۰۰۹، ۲۰۱۷، ۲۰۱۹، ۲۰۲۲، ژانویهٔ ۲۰۲۶ و ۱۹۷۹ محک خورده.' }, at: ['#up-howb'], e: '📖', v: 2, h: 'The model',
          p: 'What the model counts, the research it stands on, and how it is checked against 2009, 2017, 2019, 2022, January 2026 and 1979.', covers: ['up-howb'] }
      ]
    },
    // The Conflict Simulator (simulator/<theatre>/ on Liberty Politics, <lang>/scenarios/<theatre>/ on Iran Uncensored; build/wargame.py,
    // .js, .css; its id here kept from "Wargames"). v3, rewritten 1 November 2026 from the finished second rebuild (TOOLS.md): the
    // plan in four steps (Forces, Targets, Rules, Advisors), Watch, Compare, Replay. Each step asks the reader to do the thing,
    // and "Show me" does it for them. Its root is the section's class, .wg, the same on both sites.
    wargame: {
      name: 'Conflict Simulator', fa: 'سناریوها', root: '.wg', ready: '.wg .wg-tab', v: 3,
      surf: ['.wg .wg-tab', '.wg .wg-th', '#wg-play', '#wg-speed', '#wg-cam', '#wg-full', '#wg-orbt', '#wg-zin', '#wg-zout', '#wg-rot', '#wg-fit', '#wg-grab', '#wg-scrub', '#wg-mini', '#wg-stage',
        '.wg [data-step]', '.wg [data-force]', '.wg [data-unit]', '.wg [data-preset]', '.wg [data-tgmove]', '.wg [data-tgon]', '.wg [data-lv]', '.wg .wg-date', '.wg [data-lens]', '.wg [data-pm]', '#wg-reset',
        '.wg [data-seat]', '.wg .wg-use', '.wg [data-brief]', '#wg-run', '#wg-save', '#wg-watch', '#wg-back', '#wg-share', '.wg [data-goal]', '.wg [data-load]', '.wg [data-drop]', '#wg-cmp', '.wg [data-replay]'],
      skip: { '.lpt-doors': 'the tour and stream doors themselves' },
      steps: [
        { k: 'board', at: ['#wg-stage'], e: '🛰️', v: 3, h: 'The theatre, in 3D',
          p: 'Every base, missile site, refinery, power plant and fleet stands as its real model, where it really is. Drag to move, pinch or scroll to zoom. Tap any model: a card tells you what it is, how many, and the source.',
          fa: { h: 'منطقه، سه‌بعدی', p: 'هر پایگاه، سایت موشکی، پالایشگاه، نیروگاه و ناوگان با مدل واقعیش همون‌جایی که هست ایستاده. بکشید تا جابه‌جا بشه، با دو انگشت یا چرخ ماوس زوم کنید. روی هر مدل بزنید: یه کارت می‌گه چیه، چندتاست و منبعش کجاست.' }, covers: ['wg-stage'] },
        { k: 'tabs', at: ['.wg .wg-tab'], all: true, e: '🗺️', v: 3, h: 'Plan, Watch, Compare, Replay',
          p: 'Plan what you would do, watch it play out, compare up to four plans side by side, or replay a war that already happened.',
          fa: { h: 'برنامه، تماشا، مقایسه، بازپخش', p: 'برنامه‌تون رو بچینید، ببینید چطور پیش می‌ره، تا چهار برنامه رو کنار هم مقایسه کنید، یا یه درگیری که قبلاً اتفاق افتاده رو دوباره ببینید.' }, covers: ['.wg-tab'] },
        { k: 'steps', at: ['.wg [data-step]'], all: true, e: '🪜', v: 3, h: 'Four steps to a plan',
          p: 'Forces, Targets, Rules, Advisors. Tap a step to open it; the plan keeps everything you set.',
          fa: { h: 'چهار قدم تا یه برنامه', p: 'نیروها، هدف‌ها، قاعده‌ها، مشاورها. روی هر قدم بزنید تا باز بشه؛ برنامه هرچی تنظیم کردید رو نگه می‌داره.' }, covers: ['step=*'] },
        { k: 'forces', at: ['.wg [data-step="forces"]'], e: '✈️', v: 3, h: 'Choose your forces',
          p: 'Each card is a real unit with its 3D model, its count and whether it is in the region now or days away. Tap Send or Leave out on a card and see the plan change. The quick picks above set whole packages at once.',
          fa: { h: 'نیروهاتون رو انتخاب کنید', p: 'هر کارت یه یگان واقعیه با مدل سه‌بعدیش، تعدادش، و اینکه الان تو منطقه‌ست یا چند روز فاصله داره. روی «بفرست» یا «کنار بذار» بزنید و ببینید برنامه چطور عوض می‌شه. دکمه‌های بالا یه بستهٔ کامل رو یه‌جا انتخاب می‌کنن.', act: 'نشونم بده' },
          act: { label: 'Show me', run: function () { if (W.WG && W.WG.step) W.WG.step('forces'); } }, covers: ['force=*', 'preset=*'] },
        { k: 'unit', at: ['.wg [data-unit]'], all: true, opt: true, e: 'ℹ️', v: 3, h: 'What a unit is',
          p: 'The small i opens a unit’s card: the model, how many, where it is based, how sure the count is, and the sources.',
          fa: { h: 'هر یگان چیه', p: 'دکمهٔ کوچیک i کارت یگان رو باز می‌کنه: مدل، تعداد، پایگاهش، چقدر از این عدد مطمئنیم، و منبع‌ها.' }, covers: ['unit=*'] },
        { k: 'targets', at: ['.wg [data-step="targets"]'], e: '🎯', v: 3, h: 'Rank your targets',
          p: 'Open Targets and move a set up with the arrow: the first set gets about half of each day’s strikes. Each row says what it buys and what it costs. Switch off what you would not hit.',
          fa: { h: 'هدف‌ها رو به ترتیب بچینید', p: '«هدف‌ها» رو باز کنید و با فلش یه دسته رو ببرید بالا: دستهٔ اول حدود نصف حمله‌های هر روز رو می‌گیره. هر ردیف می‌گه چی به دست میاره و چه هزینه‌ای داره. هرچی رو نمی‌زنید خاموش کنید.', act: 'نشونم بده' },
          act: { label: 'Show me', run: function () { if (W.WG && W.WG.step) W.WG.step('targets'); } }, covers: ['tgmove=*', 'tgon=*'] },
        { k: 'rules', at: ['.wg [data-step="rules"]'], e: '♟️', v: 3, h: 'Set the rules',
          p: 'Who fires first, how long it is planned to last, what happens at sea, what the other side and the world do. Tap an option and it is in your plan.',
          fa: { h: 'قاعده‌ها رو بچینید', p: 'کی اول شلیک می‌کنه، قراره چقدر طول بکشه، تو دریا چی می‌شه، طرف مقابل و دنیا چیکار می‌کنن. روی یه گزینه بزنید و می‌ره تو برنامه‌تون.', act: 'نشونم بده' },
          act: { label: 'Show me', run: function () { if (W.WG && W.WG.step) W.WG.step('rules'); } }, covers: ['lv=*', '.wg-date'] },
        { k: 'advisors', at: ['.wg [data-step="advisors"]'], e: '🎖️', v: 3, h: 'Ask an advisor',
          p: 'Each advisor is a real analyst or general. Tap a portrait for their briefing over the map. “Use this plan” sets all four steps to their plan in one tap.',
          fa: { h: 'از یه مشاور بپرسید', p: 'هر مشاور یه تحلیلگر یا ژنرال واقعیه. روی عکسش بزنید تا گزارشش رو روی نقشه بشنوید. «این برنامه رو بردار» هر چهار قدم رو یه‌جا روی برنامهٔ اون می‌ذاره.', act: 'نشونم بده' },
          act: { label: 'Show me', run: function () { if (W.WG && W.WG.step) W.WG.step('advisors'); } }, covers: ['brief=*', '.wg-chip', 'seat=*'] },
        { k: 'lens', at: ['.wg [data-lens]'], all: true, opt: true, e: '🧮', v: 3, h: 'Whose numbers run it',
          p: 'The advisors you seat, every expert averaged, the betting markets, or your own numbers on sliders.',
          fa: { h: 'با عددهای کی اجرا بشه', p: 'مشاورهایی که نشوندید، میانگین همهٔ کارشناس‌ها، بازارهای پیش‌بینی، یا عددهای خودتون با اسلایدر.' }, covers: ['lens=*', 'pm=*', 'wg-reset'] },
        { k: 'run', at: ['#wg-run'], e: '🎲', v: 3, h: 'Run it 1,000 times',
          p: 'Press it when your plan is set: it runs 1,000 times with different luck. The most typical run plays on the board while the report shows how all of them ended.',
          fa: { h: 'هزار بار اجراش کنید', p: 'بزنیدش: برنامه‌تون هزار بار با شانس‌های مختلف اجرا می‌شه. معمولی‌ترین حالت روی نقشه پخش می‌شه و گزارش نشون می‌ده همه‌شون چطور تموم شدن.', act: 'نشونم بده' },
          covers: ['wg-run', 'wg-watch', 'wg-back', 'wg-share'] },
        { k: 'watch', at: ['#wg-scrub', '#wg-play'], all: true, e: '🎬', v: 3, h: 'Watch it happen',
          p: 'The aircraft, missiles and drones fly from where they really would. The caption says what is happening and why. Play, pause, change the speed, or drag the timeline to any day.',
          fa: { h: 'ببینید چطور اتفاق می‌افته', p: 'هواپیماها، موشک‌ها و پهپادها از همون جایی که واقعاً بلند می‌شن پرواز می‌کنن. زیرنویس می‌گه چی داره اتفاق می‌افته و چرا. پخش کنید، نگه دارید، سرعت رو عوض کنید، یا خط زمان رو تا هر روزی بکشید.' }, covers: ['wg-scrub', 'wg-play', 'wg-speed'] },
        { k: 'compare', at: ['#wg-save', '.wg [data-goal]', '#wg-cmp'], all: true, opt: true, e: '⚖️', v: 3, h: 'Compare plans',
          p: 'Save to compare keeps the plan. Save up to four, open Compare, pick what matters most, and run them: 1,000 runs each, side by side, the best plan for that goal marked.',
          fa: { h: 'برنامه‌ها رو مقایسه کنید', p: '«برای مقایسه نگه دار» برنامه رو نگه می‌داره. تا چهارتا نگه دارید، «مقایسه» رو باز کنید، بگید چی براتون مهم‌تره و اجراشون کنید: هر کدوم هزار بار، کنار هم، و بهترینش برای اون هدف علامت می‌خوره.' },
          covers: ['wg-save', 'goal=*', 'load=*', 'drop=*', 'wg-cmp'] },
        { k: 'forcebar', at: ['#wg-orbt'], e: '📊', v: 3, h: 'The forces left',
          p: 'Missiles, drones, interceptors, aircraft, ships and troops on each side. The bars run down as the days play.',
          fa: { h: 'نیروهایی که مونده', p: 'موشک، پهپاد، رهگیر، هواپیما، کشتی و نیرو برای هر طرف. نوارها با گذشت روزها کم می‌شن.' }, covers: ['wg-orbt'] },
        { k: 'camera', at: ['#wg-cam', '#wg-zin', '#wg-zout', '#wg-rot', '#wg-fit'], all: true, e: '🎥', v: 3, h: 'The camera',
          p: 'With the camera on, it follows the action. Zoom, turn the map, or show the whole theatre again.',
          fa: { h: 'دوربین', p: 'وقتی دوربین روشنه، دنبال اتفاق‌ها می‌ره. زوم کنید، نقشه رو بچرخونید، یا دوباره کل منطقه رو ببینید.' }, covers: ['wg-cam', 'wg-zin', 'wg-zout', 'wg-rot', 'wg-fit'] },
        { k: 'mini', at: ['#wg-mini'], opt: true, e: '🧭', v: 3, h: 'The minimap', p: 'The gold box is what you see. Tap anywhere on it to go there.',
          fa: { h: 'نقشهٔ کوچیک', p: 'کادر طلایی همونیه که می‌بینید. هر جاش رو بزنید تا برید اونجا.' }, covers: ['wg-mini'] },
        { k: 'full', at: ['#wg-full'], e: '🖥️', v: 3, h: 'Full screen', p: 'Fill the screen with the board. Esc gives the page back.',
          fa: { h: 'تمام‌صفحه', p: 'نقشه کل صفحه رو می‌گیره. Esc صفحه رو برمی‌گردونه.' }, covers: ['wg-full'] },
        { k: 'theatres', at: ['.wg .wg-th'], all: true, opt: true, e: '🌍', v: 3, h: 'Three theatres', p: 'Iran, Ukraine and Taiwan, each on its own board.',
          fa: { h: 'سه منطقه', p: 'ایران، اوکراین و تایوان، هر کدوم روی نقشهٔ خودش.' }, covers: ['.wg-th'] },
        { k: 'sheet', at: ['#wg-grab'], opt: true, e: '↕️', v: 3, h: 'The panel', p: 'Tap or drag the handle to make the panel bigger or smaller. The board stays above it.',
          fa: { h: 'پنل', p: 'دستگیره رو بزنید یا بکشید تا پنل بزرگ‌تر یا کوچیک‌تر بشه. نقشه بالاش می‌مونه.' }, covers: ['wg-grab'] },
        { k: 'replay', at: ['.wg [data-replay]'], all: true, opt: true, e: '⏪', v: 3, h: 'Replay what already happened', p: 'Open Replay and pick one: every strike of a real conflict on the day it happened, each with its source.',
          fa: { h: 'بازپخش گذشته', p: '«بازپخش» رو باز کنید و یکی رو انتخاب کنید: هر حملهٔ یه درگیری واقعی همون روزی که اتفاق افتاد، هر کدوم با منبعش.', act: 'نشونم بده' },
          act: { label: 'Show me', run: function () { click('.wg .wg-tab[data-tab="replay"]'); } }, covers: ['replay=*'] }
      ]
    }
  };

  /* ------------------------------------------------------------------ the words of the tour itself, in the page's language
     A Persian page (iranuncensored.com/fa/...) reads every step's fa {h, p, act} and these words; a tool with a step that
     has no Persian keeps its door shut on a Persian page (never English there), and audit() names the step (nolang). */
  var FA = /^fa\b/i.test(D.documentElement.getAttribute('lang') || '');
  var RTL = (D.documentElement.getAttribute('dir') || '').toLowerCase() === 'rtl';
  var UI = FA ? { back: 'قبلی', next: 'بعدی', done: 'تموم', close: 'بستن تور', step: 'قدم {n} از {t}', fresh: 'تازه: {n} از {t}', all: 'کل تور', how: 'چطور کار می‌کنه', aria: 'چطور کار می‌کنه: یه تور کوتاه از {name}', isNew: 'تازه', since: 'از آخرین باری که اومدید تازه‌ست' }
    : { back: 'Back', next: 'Next', done: 'Done', close: 'Close the tour', step: 'Step {n} of {t}', fresh: 'New: {n} of {t}', all: 'The whole tour', how: 'How it works', aria: 'How it works: a short tour of {name}', isNew: 'New', since: 'New since your last visit' };
  function fill(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return k in v ? v[k] : m; }); }
  function dig(s) { return FA ? String(s).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(+d); }) : String(s); }
  // a step's words in this page's language (k: 'h', 'p' or 'act'); '' when it has none
  function txt(s, k) {
    if (FA) { var f = s.fa || {}; return k === 'act' ? (f.act || '') : words(f[k]) || ''; }
    return k === 'act' ? (s.act ? s.act.label : '') : words(s[k]) || '';
  }
  function nameOf(T) { return FA ? (T.fa || T.name) : T.name; }
  // a step marked lp: true is Liberty Politics only (its control is never on Iran Uncensored): a Persian page leaves it out
  function here(s) { return !(FA && s.lp); }
  function spoken(name) { return !FA || TOOLS[name].steps.filter(here).every(function (s) { return txt(s, 'h') && txt(s, 'p') && (!s.act || txt(s, 'act')); }); }

  /* ------------------------------------------------------------------ the look (one home: here, so both sites carry it)
     The doors, the spotlight and the card. Injected once, before anything is shown, so nothing flashes unstyled; every
     colour is the site's own token (--field is Liberty Politics' yellow and Iran Uncensored's gold). The card: a progress
     line, the emoji, "Step 2 of 7", the heading, two short lines, the dots, Back and Next. Nothing hides and animates in. */
  var CSS =
    '.lpt-doors{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:var(--s3,12px)}' +
    '.lpt-how,.lps-go{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 14px 0 11px;border:1px solid #3a3936;border-radius:999px;background:none;color:var(--ink);font:650 var(--t1,.8125rem)/1 var(--body);cursor:pointer;white-space:nowrap}' +
    '.lpt-how{color:var(--field)}.lpt-how:hover,.lps-go:hover{border-color:var(--dim)}' +
    '.lpt-how[hidden],.lps-go[hidden]{display:none}' +
    '.lpt-how.is-new::after{content:attr(data-new);margin-inline-start:2px;padding:3px 7px;border-radius:999px;background:var(--field);color:var(--on-field,#14120B);font:800 .75rem/1 var(--body)}' +
    '@media(max-width:899px){.lps-go{display:none!important}}' +
    '@media(min-width:960px){#midterms,#coalition{position:relative}.mt-head .lpt-doors,.coal-head .lpt-doors{position:absolute;top:var(--s4,16px);right:var(--s4,16px);margin:0}}' +
    '.rg-acts .lpt-doors{display:contents}' +
    '.rg-acts .lpt-how,.rg-acts .lps-go{min-height:48px;padding:0 18px 0 14px;border:1.5px solid currentColor;font-size:1rem;font-weight:700}.rg-acts .lpt-how{color:var(--ink)}' +
    '.lpt{position:fixed;inset:0;z-index:2147483000;font-family:var(--body)}.lpt[hidden]{display:none}' +
    '.lpt.is-center{background:rgba(8,7,5,.74)}' +
    '.lpt-hole{position:fixed;border-radius:14px;box-shadow:0 0 0 200vmax rgba(8,7,5,.74),0 0 0 2px var(--field),0 0 0 6px color-mix(in srgb,var(--field) 18%,transparent),0 0 28px 6px color-mix(in srgb,var(--field) 22%,transparent);pointer-events:none}' +
    '.lpt-tip{position:fixed;box-sizing:border-box;max-width:calc(100vw - 24px);padding:0 18px 16px;border:1px solid color-mix(in srgb,var(--field) 38%,transparent);border-radius:18px;background:#1B1A16;color:var(--ink);box-shadow:0 24px 60px rgba(0,0,0,.6),0 2px 0 rgba(255,255,255,.04) inset;outline:none;overflow:hidden}' +
    '.lpt-line{display:block;height:4px;margin:0 -18px 14px;background:rgba(255,255,255,.07)}' +
    '.lpt-line i{display:block;height:100%;width:var(--lpt-p,0%);background:var(--field);border-radius:0 4px 4px 0}' +
    '.lpt-top{display:flex;align-items:center;gap:12px;margin:0 0 10px}' +
    '.lpt-e{display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:12px;background:color-mix(in srgb,var(--field) 12%,transparent);font-size:24px;line-height:1}' +
    '.lpt-n{margin:0;color:var(--field);font:800 .78rem/1.2 var(--body);letter-spacing:.08em;text-transform:uppercase}' +
    '.lpt-x{margin-inline-start:auto;flex:none;width:40px;height:40px;border:0;border-radius:50%;background:rgba(255,255,255,.05);color:var(--dim);font-size:22px;line-height:1;cursor:pointer}' +
    '.lpt-x:hover{color:var(--ink);background:rgba(255,255,255,.1)}' +
    '.lpt-tip h3{margin:0 0 6px;font:800 1.45rem/1.05 var(--display);letter-spacing:.01em;text-transform:uppercase;color:var(--ink)}' +
    '.lpt-p{margin:0 0 14px;font:450 var(--t2,.9375rem)/1.55 var(--body);color:var(--ink);opacity:.92}' +
    '.lpt-b{display:flex;flex-wrap:wrap;align-items:center;gap:10px}' +
    '.lpt-dots{display:flex;flex-wrap:wrap;align-items:center;gap:5px;min-width:0;flex:1 1 auto}' +
    '.lpt-dots i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.18)}' +
    '.lpt-dots i.is-done{background:color-mix(in srgb,var(--field) 55%,transparent)}.lpt-dots i.is-on{width:20px;border-radius:4px;background:var(--field)}' +
    '.lpt-bs{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;margin-inline-start:auto}' +
    '.lpt-b button{min-height:44px;padding:0 18px;border-radius:999px;font:700 var(--t2,.9375rem)/1 var(--body);cursor:pointer}' +
    '.lpt-b button[hidden]{display:none}' +
    '.lpt-back{border:1px solid #3a3936;background:none;color:var(--ink)}.lpt-back:hover{border-color:var(--dim)}' +
    '.lpt-act{border:1px solid var(--field);background:none;color:var(--field)}' +
    '.lpt-next{border:0;background:var(--field);color:var(--on-field,#14120B)}.lpt-next:hover{filter:brightness(1.08)}' +
    '.lpt-next::after{content:" \\2192"}[dir=rtl] .lpt-next::after{content:" \\2190"}.lpt-next.is-done::after{content:""}' +
    '@media(max-width:640px){.lpt-tip{padding:0 14px 12px;border-radius:16px}.lpt-line{margin:0 -14px 12px}.lpt-tip h3{font-size:1.3rem}.lpt-b button{padding:0 15px}.lpt-e{width:40px;height:40px;font-size:22px}}' +
    'html.lpt-on #calls{visibility:hidden}';
  function style() {
    if (D.getElementById('lpt-css')) return;
    var st = D.createElement('style'); st.id = 'lpt-css'; st.textContent = CSS;
    (D.head || D.documentElement).appendChild(st);
  }

  /* ------------------------------------------------------------------ the audit (IT KEEPS UP) */
  var DATA = ['data-v', 'data-f', 'data-pre', 'data-mood', 'data-lens', 'data-lv', 'data-replay', 'data-step', 'data-force', 'data-unit', 'data-preset', 'data-tgmove', 'data-tgon', 'data-brief', 'data-goal', 'data-load', 'data-drop', 'data-seat', 'data-pm'];      // the Conflict Simulator's own since 1 November 2026
  function keyOf(el) {
    if (el.id) return el.id;
    for (var i = 0; i < DATA.length; i++) if (el.hasAttribute(DATA[i])) return DATA[i].slice(5) + '=' + el.getAttribute(DATA[i]);
    var c = String(el.getAttribute('class') || '').trim().split(/\s+/)[0];
    return c ? '.' + c : el.tagName.toLowerCase();
  }
  function named(names, k) { return names.some(function (n) { return n === k || (n.slice(-1) === '*' && k.indexOf(n.slice(0, -1)) === 0); }); }
  function audit(name) {
    var T = TOOLS[name];
    if (!T) return { tool: name, missing: ['no tool of that name in build/tour.js'], loose: [], nolang: [], controls: 0 };
    if (!$(T.root)) return { tool: name, pending: !!T.pending, missing: T.pending ? [] : ['the tool is not on this page (' + T.root + ')'], loose: [], nolang: [], controls: 0 };
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
    var nolang = FA ? T.steps.filter(here).filter(function (s) { return !(txt(s, 'h') && txt(s, 'p') && (!s.act || txt(s, 'act'))); }).map(function (s) { return s.k; }) : [];
    return { tool: name, missing: missing, loose: loose, nolang: nolang, controls: Object.keys(seen).length };
  }

  /* ------------------------------------------------------------------ the card */
  var ov = null, hole = null, tip = null, list = null, at = 0, tool = '', mode = '', back = null, raf = 0;
  var actT = 0;      // the pending step after a "Show me"
  function seenV(name) { var s = get('lpt-' + name); return s ? (parseInt(s, 10) || 0) : 0; }
  function fresh(name, since) { return TOOLS[name].steps.filter(function (s) { return (s.v || 1) > since; }); }
  function build() {
    style();
    ov = D.createElement('div');
    ov.className = 'lpt lps-keep';          // lps-keep: the stream view (build/stream.js) hides the rest of the page, never this
    ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'lpt-h');
    if (RTL) ov.setAttribute('dir', 'rtl');
    ov.innerHTML = '<div class="lpt-hole" aria-hidden="true"></div><div class="lpt-tip" tabindex="-1"><span class="lpt-line" aria-hidden="true"><i></i></span>' +
      '<div class="lpt-top"><span class="lpt-e" aria-hidden="true"></span><p class="lpt-n"></p><button type="button" class="lpt-x" data-t="end">×</button></div>' +
      '<h3 id="lpt-h"></h3><p class="lpt-p"></p>' +
      '<div class="lpt-b"><span class="lpt-dots" aria-hidden="true"></span><span class="lpt-bs"><button type="button" class="lpt-back" data-t="back"></button>' +
      '<button type="button" class="lpt-act" data-t="act"></button><button type="button" class="lpt-next" data-t="next"></button></span></div></div>';
    D.body.appendChild(ov);
    hole = $('.lpt-hole', ov); tip = $('.lpt-tip', ov); ov.tabIndex = -1;
    $('.lpt-x', ov).setAttribute('aria-label', UI.close);
    $('.lpt-back', ov).textContent = UI.back;
    ov.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-t]');
      if (!b || !list) { if (list && !tip.contains(ev.target)) main().focus({ preventScroll: true }); return; }
      var t = b.getAttribute('data-t'), s = list[at];
      if (t === 'end') end();
      else if (t === 'back') go(at - 1, -1);
      else if (t === 'next') { if (last()) end(); else go(at + 1, 1); }
      else if (t === 'act') {
        if (last() && mode === 'news') { var n = tool; end(); start(n, 'all'); return; }
        if (s.act && !actT) { s.act.run(); actT = setTimeout(function () { actT = 0; if (list) { if (last()) end(); else go(at + 1, 1); } }, 200); }      // a second press while the first is still running is the same press (it once skipped a step)
      }
    });
    ov.addEventListener('keydown', function (ev) {
      if (!list) return;
      ev.stopPropagation();          // the tool's own keys wait while the tour talks
      var fwd = RTL ? 'ArrowLeft' : 'ArrowRight', bwd = RTL ? 'ArrowRight' : 'ArrowLeft';
      if (ev.key === 'Escape') { ev.preventDefault(); end(); }
      else if (ev.key === fwd) { ev.preventDefault(); $('.lpt-next', ov).click(); }
      else if (ev.key === bwd) { ev.preventDefault(); if (!$('.lpt-back', ov).hidden) go(at - 1, -1); }
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
    $('.lpt-n', ov).textContent = fill(mode === 'news' ? UI.fresh : UI.step, { n: dig(n + 1), t: dig(real.length) });
    $('#lpt-h', ov).textContent = txt(s, 'h');
    $('.lpt-p', ov).textContent = txt(s, 'p');
    $('.lpt-back', ov).hidden = n <= 0;
    // the progress: a line across the top of the card and one dot a step (the one shown long, the ones behind lit)
    tip.style.setProperty('--lpt-p', Math.round(100 * (n + 1) / real.length) + '%');
    var dots = $('.lpt-dots', ov); dots.textContent = '';
    if (real.length <= 14) real.forEach(function (x, k) { var d = D.createElement('i'); if (k < n) d.className = 'is-done'; if (k === n) d.className = 'is-on'; dots.appendChild(d); });
    var a = $('.lpt-act', ov);
    if (fin && mode === 'news') { a.hidden = false; a.textContent = UI.all; }
    else { a.hidden = !s.act; a.textContent = s.act ? txt(s, 'act') : ''; }
    var nx = $('.lpt-next', ov);
    nx.textContent = fin ? UI.done : UI.next;
    nx.classList.toggle('is-done', fin);
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
    var tw = Math.min(phone ? vw - 24 : 400, vw - 24);
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
    if (!T || !$(T.root) || !spoken(name)) return false;
    if (!ov) build();
    if (list) end();
    var since = seenV(name);
    mode = how === 'news' || (how !== 'all' && since > 0 && since < T.v && fresh(name, since).length) ? 'news' : 'all';
    list = (mode === 'news' ? fresh(name, since) : T.steps.slice()).filter(here);
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
      if (!start(name, 'all')) { done({ seen: seen, bad: ['the ' + name + ' tour did not start (no ' + (TOOLS[name] || {}).root + ' on the page' + (FA && TOOLS[name] && !spoken(name) ? ', or a step has no Persian' : '') + ')'] }); return; }
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
        var said = txt(s, 'p') + ' ' + txt(s, 'h');
        if (!txt(s, 'p') || !txt(s, 'h') || /undefined|NaN|\{\w+\}/.test(said)) bad.push(s.k + ': its words are missing or unfilled');
        if (FA && /[A-Za-z]{4,}/.test(said.replace(/Polymarket|Kalshi|IRGC|X\b/g, ''))) bad.push(s.k + ': English words on a Persian page');
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
    var any = $$('.lpt-doors[data-lpt]');
    if (any.length) style();
    any.forEach(function (box) {
      var name = box.getAttribute('data-lpt'), T = TOOLS[name], b = $('.lpt-how', box);
      if (!T || !b || b.getAttribute('data-wired') || !spoken(name)) return;          // a Persian page with a step not yet in Persian: no door
      b.setAttribute('data-wired', '1');
      if (!$('svg', b)) b.insertAdjacentHTML('afterbegin', ICO);
      b.setAttribute('aria-label', fill(UI.aria, { name: nameOf(T) }));
      b.setAttribute('data-new', UI.isNew);
      var since = seenV(name);
      if (since > 0 && since < T.v && fresh(name, since).length) { b.classList.add('is-new'); b.title = UI.since; }
      b.addEventListener('click', function () { start(name); });
      b.hidden = false;
    });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', doors); else doors();

  W.LPTour = {
    tools: function () { return Object.keys(TOOLS); },
    here: function () { return Object.keys(TOOLS).filter(function (n) { return !!$(TOOLS[n].root); }); },
    info: function (n) { var T = TOOLS[n]; return T ? { name: T.name, root: T.root, ready: T.ready, v: T.v, pending: !!T.pending, steps: T.steps.length, spoken: spoken(n) } : null; },
    required: function (n) { return TOOLS[n].steps.filter(function (s) { return !s.opt && !s.when && here(s); }).map(function (s) { return s.k; }); },
    start: start, end: end, audit: audit, walk: walk, keyOf: keyOf,
    at: function () { return list ? { tool: tool, mode: mode, i: at, k: list[at].k } : null; }
  };
})();
