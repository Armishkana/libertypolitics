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
      // ONE BOARD YOU WALK (1 Nov 2026, v4, regime.js): the old four views (whole chart, factions, day by day, list) are
      // one board you walk branch by branch, with faction a lens over it, and Day by day the second tab. The head is the
      // scoreboard of v3 (.rg-hl the title side, .rg-hr the numbers, the bar and the latest falls); the odds board is
      // Liberty Politics only.
      name: 'The Regime Board', fa: 'سران رژیم', root: '#regime', ready: '#rg-bar:not([hidden])', v: 4,
      surf: ['#regime .wrap > *', '#regime .rg-head > *', '#regime .rg-hl > *', '#regime .rg-hr > *', '#regime .rg-count > *', '#regime .rg-acts > *', '#rg-tabs > *',
        '#rg-zw > *', '#regime .rg-bar > *', '#regime .rg-ctl2 > *', '#regime .rg-fil > *', '#regime .rg-findw > *', '#rg-time > *', '#regime .rg-dk1 > *', '#regime .rg-dk2 > *',
        '#regime .ob-hd > *', '#regime .ob-body > *'],
      skip: { '.nudge-sec': 'the question of the page, which opens its discussion (Iran Uncensored puts it under the head)','.rg-kick': 'the date it was checked', 'h1': 'the title', '.rg-lede': 'the line under the title',
        'rg-none': 'a line that shows when a filter leaves nobody', '.rg-foot': 'where the board comes from', '.vh': 'a label for screen readers',
        '.lpt-doors': 'the tour and stream doors themselves', '.rg-hl': 'the title side of the head (its parts are toured one by one)', '.rg-hr': 'the numbers side of the head (its parts are toured one by one)',
        'rg-ev': 'a line in the timeline that says who fell on the day it stands on (read, not tapped)',
        '.ob-hw': 'the heading of the odds board (its words are read, not tapped)', 'nudge': 'the way into the page’s discussion (Iran Uncensored draws it under the board)' },
      steps: [
        { k: 'count', at: ['#regime .rg-count'], e: '🔢', h: 'The count',
          p: 'How many of the Islamic Republic’s leaders were taken out, how many are still in place, and how many nobody can confirm. The bar shows how much of the board is gone. Tap a number to see those people on the board.',
          fa: { h: 'شمارش', p: 'چند نفر از سران جمهوری اسلامی حذف شدن، چند نفر هنوز سر کارن، و سرنوشت چند نفر معلوم نیست. نوار زیرش نشون می‌ده چقدر از این تابلو رفته. روی هر عدد بزنید تا همون آدما رو روی تابلو ببینید.' },
          covers: ['.rg-head', '.rg-count', '.rg-cn', '.rg-share'], v: 3 },
        { k: 'latest', at: ['#regime .rg-latest'], opt: true, e: '❌', h: 'The latest to fall',
          p: 'The newest faces taken out, newest first. Tap one for the whole story: how and when, and who sat in that chair before.',
          fa: { h: 'آخرین کسایی که حذف شدن', p: 'جدیدترین صورت‌هایی که از تابلو افتادن، اول از همه تازه‌ترین. روی هر کدوم بزنید تا کل ماجراش رو ببینید: کی و چطور، و کی قبلش سر اون صندلی بود.' },
          covers: ['.rg-latest'], v: 3 },
        { k: 'chart', at: ['#rg-ov', '#rg-tabs [data-v="chart"]'], e: '🕸️', h: 'Everyone, on one chart', v: 7,
          // 3 Nov 2026: the first view (regime.js "EVERYONE"); the Office of the Supreme Leader on top, every branch under it
          p: 'The whole regime as one chart: the Supreme Leader inside his Office on top, then the armed forces, the state, and the clerics and money. Pinch or scroll to zoom, drag to move, tap a face for the story. Red is taken out. The buttons above show the top 10 up to everyone, or one branch only (the IRGC, the military and security forces, the government, the judiciary, the clergy), and each branch says how many are left. The corner button makes it full screen.',
          fa: { h: 'همه، روی یه نمودار', p: 'کل رژیم روی یه نمودار: رهبر تو دفترش بالای همه، بعد نیروهای مسلح، حکومت، و آخوندها و پول. با دو انگشت یا چرخ موس زوم کنید، بکشید تا جابه‌جا بشه، روی هر چهره بزنید تا ماجراش رو بخونید. قرمز یعنی حذف شده. دکمه‌های بالا از ۱۰ نفر اول تا همه رو نشون می‌دن، یا فقط یه بخش (سپاه، نظامی و امنیتی، دولت، قوهٔ قضاییه، آخوندها)، و هر بخش می‌گه چند نفرش مونده. دکمهٔ گوشه نمودار رو تمام‌صفحه می‌کنه.' },
          covers: ['rg-org', 'rg-ov', 'rg-op', 'rg-sz', '.rg-oh', '.rg-sz', '.rg-legend', '.rg-oz', 'rg-ohint', 'rg-onote', 'n=*', 'rg-grp', '.rg-grp', 'g=*', 'rg-fsb'] },
        { k: 'key', at: ['#rg-keyv .rg-kl', '#rg-tabs [data-v="key"]'], e: '⭐', h: 'Top officials only', v: 6,
          // the panel when it is open, else its tab (the reader, or a tour before this one, may be on the branches)
          p: 'The 20 people who run the Islamic Republic now, in order of real power, each with one line on what their chair decides. Tap the star on anyone to keep them on your own watchlist; under them, the biggest names already taken out.',
          fa: { h: 'فقط مقام‌های اصلی', p: '۲۰ نفری که الان جمهوری اسلامی رو می‌چرخونن، به ترتیب قدرت واقعی، و هر کدوم با یه خط که صندلیش دربارهٔ چی تصمیم می‌گیره. روی ستارهٔ هر کسی بزنید تا تو فهرست خودتون نگهش دارید؛ پایینش، اسم‌های بزرگی که تا حالا حذف شدن.' },
          covers: ['rg-keyv', '.rg-kc', '.rg-wb', '.rg-wl', '.rg-kall'] },
        { k: 'tabs', at: ['#rg-tabs'], e: '🗂️', h: 'Five ways to look', v: 7,
          p: 'Everyone: the whole regime on one chart. Branch by branch: walk it the way it is built. Top officials only: the 20 who matter most. Day by day: every fall in order, war by war. Quiz: ten quick rounds of who really holds power.',
          fa: { h: 'پنج جور نگاه', p: '«همه»: کل رژیم روی یه نمودار. «بخش به بخش»: همون‌طوری که رژیم ساخته شده توش قدم بزنید. «فقط مقام‌های اصلی»: اون ۲۰ نفری که از همه مهم‌ترن. «روز به روز»: همهٔ سقوط‌ها به ترتیب، جنگ به جنگ. «مسابقه»: ده دور سریع که قدرت واقعاً دست کیه.', act: 'بخش‌ها رو نشونم بده' },
          act: { label: 'Show me the branches', run: function () { var b = $('#rg-tabs [data-v="board"]'); if (b && b.getAttribute('aria-selected') !== 'true') b.click(); } },
          covers: ['rg-tabs', 'v=*', 'rg-quiz', 'rg-qz-b'] },
        { k: 'board', at: ['#rg-l0 .rg-tiles', '#rg-board'], e: '🏛️', h: 'Walk the regime', v: 4,
          p: 'Each tile is one branch of the regime, in order of power, with how much of it is gone. Tap one to walk inside: every chair, who sits in it now, and who sat in it before. The trail above it, or Back, takes you out again.',
          fa: { h: 'تو رژیم قدم بزنید', p: 'هر کاشی یه بخش از رژیمه، به ترتیب قدرت، و اینکه چقدرش رفته. روی یکی بزنید تا برید توش: همهٔ صندلی‌ها، کی الان روشون نشسته و کی قبلش. مسیر بالای صفحه یا دکمهٔ برگشت دوباره بیرونتون میاره.' },
          covers: ['rg-zw', 'rg-board', 'rg-crumb', 'rg-days', 'rg-sheet'] },
        { k: 'find', at: ['#regime .rg-findw'], e: '🔎', h: 'Find anyone', v: 4,
          p: 'Type a name, a post or a city. Pick one from the list and the board walks you to that person and opens their card.',
          fa: { h: 'هر کسی رو پیدا کنید', p: 'یه اسم، یه پست یا یه شهر بنویسید. یکی رو از فهرست انتخاب کنید تا تابلو شما رو ببره پیش همون آدم و پرونده‌ش رو باز کنه.' },
          covers: ['rg-bar', '.rg-findw', 'rg-q', 'rg-ql'] },
        { k: 'show', at: ['#regime .rg-fil'], e: '👁️', h: 'Who to show', v: 4,
          p: 'Everyone, only those taken out, only those still in place, or those whose fate is unknown. Each number follows the day on the timeline.',
          fa: { h: 'کیا رو نشون بده', p: 'همه، فقط کشته‌شده‌ها، فقط اونایی که هنوز سر کارن، یا اونایی که سرنوشتشون معلوم نیست. هر عدد با روزِ روی خط زمان عوض می‌شه.' },
          covers: ['.rg-ctl2', '.rg-fil', 'f=*'] },
        { k: 'lens', at: ['#rg-lens'], e: '🎨', h: 'Colour by faction', v: 4,
          p: 'Paint every face by its camp: Paydari, Ghalibaf’s circle, the negotiators, the reformists and the rest. Tap a camp to light up its people anywhere on the board; the bar shows each camp’s share of who is still standing and who fell.',
          fa: { h: 'رنگ بر اساس جناح', p: 'هر چهره رو با رنگ جناحش ببینید: پایداری، حلقهٔ قالیباف، جناح مذاکره، اصلاح‌طلب‌ها و بقیه. روی یه جناح بزنید تا آدماش همه‌جای تابلو روشن بشن؛ نوار نشون می‌ده سهم هر جناح از کسایی که موندن و کسایی که افتادن چقدره.', act: 'نشونم بده' },
          act: { label: 'Show me', run: function () { var b = $('#rg-lens'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); } },
          covers: ['rg-lens', 'rg-campw', 'rg-campkey', 'rg-cbar'] },
        { k: 'time', at: ['#rg-time'], e: '⏳', h: 'The timeline',
          p: 'Drag it, or press Replay, and watch each face fall on the day it fell, with every count and meter moving. The buttons jump to each war, and Today brings it back.',
          fa: { h: 'خط زمان', p: 'بکشیدش، یا «دوباره ببین» رو بزنید و ببینید هر کس همون روزی که افتاد از تابلو می‌افته و همهٔ عددها باهاش عوض می‌شن. دکمه‌ها می‌برنتون سراغ هر جنگ و «امروز» برتون می‌گردونه.' },
          covers: ['rg-time', '.rg-dk1', '.rg-dk2', 'rg-play', '.rg-day', '.rg-track', 'rg-wars'], v: 4 },
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
      name: 'Beat the Betting Markets', root: '#btm', ready: '#btm-list > *', v: 2,
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
    // Unopposed (build/seats.py, 5 November 2026)
    unopposed: {
      name: 'Unopposed', root: '#ss', ready: '#ss .ss-c path', v: 2,      // v2, 6 Nov 2026: ZIP search and the run guide
      surf: ['#ss .ss-bar > *', '#ss .ss-kinds > *', '#ss .ss-side > *'],
      skip: { 'ss-hits': 'the list of matches under the search box (explained with the box)', '.ss-kinds': 'the row that holds the kinds (each kind is a step)' },
      steps: [
        { k: 'find', at: ['#ss .ss-find input'], e: '🔎', h: 'Find your county',
          p: 'Type your ZIP code, or the first letters of your county or your state, then pick it from the list. A ZIP that crosses county lines lists each county. The map flies there and opens every seat that was on your ballot.',
          covers: ['.ss-find'] },
        { k: 'map', at: ['#ss .ss-map'], e: '🗺️', h: 'The brighter, the fewer races',
          p: 'Each county is coloured by the share of its seats that had only one name on the ballot, or none. Gold means nobody ran against them. Striped means not counted yet. Tap a county to open it.',
          covers: [] },
        { k: 'kinds', at: ['#ss .ss-kinds'], all: true, e: '🏛️', h: 'Pick a kind of seat',
          p: 'All seats, or only school boards, judges, county offices, city and town, Congress. The map, the list and the county card all switch to that kind.',
          covers: ['lv=*'] },
        { k: 'lead', at: ['#ss .ss-lobby', '#ss .ss-side'], e: '🏆', h: 'Where nobody ran',
          p: 'The counties where the most seats had no race. Tap one to open it.',
          covers: ['.ss-lobby'], opt: true, act: { label: 'Open the first one', run: function () { var b = $('#ss .ss-lead button'); if (b) b.click(); } } },
        { k: 'card', at: ['#ss-card'], opt: true, when: function () { return shown($('#ss-card')); }, e: '🪑', h: 'Every seat, one square each',
          p: 'Gold squares had one name, red dashed ones were left empty, outlined ones had a race. Below, every office with who ran. Tap a seat with no race to see how to run for it in your state, step by step, or to gather people to back a candidate.',
          covers: ['ss-card'] }
      ]
    },
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
    // The Uprising Simulator (uprising/; build/uprising.py, uprising-now.js, uprising.js, .css). v3, 1 November 2026: the page
    // opens on Now (the live map of Iran); a city's card enters its 3D board (Simulate). The Simulate steps show only once the
    // board is in (data-view="sim"), and "Show me" on the card step opens one. Stream view: build/stream.js TOOLS.uprising.
    uprising: {
      name: 'Uprising Simulator', fa: 'شبیه‌ساز خیزش', root: '#uprising', ready: '#up-nsvg .up-nc, #up-adv-pane > *, #up-p-start > *, #upp-p-plan > *', v: 4,
      surf: ['#up-view > *', '#upp-p-plan [data-pre]', '.upp-tabs > *', '#upp-run', '#upp-play .upp-ctl > *', '#upp-keyb', '#upp-zfit', '#upp-3d', '#up-nsvg .up-nc', '#up-ntick .up-ntgo', '#up-nbrk button', '#up-ncard button', '#up-pickb', '#up-modes > *', '#up-cmpb', '#up-share', '#up-howb', '#up-hud', '#uprising .up-adv', '#uprising .up-tab', '#up-odds', '#up-watch', '#up-bestb', '#up-addcmp', '#up-camc > *', '#up-bar > *', '#up-feed', '#up-legend'],
      skip: { '.lpt-doors': 'the tour and stream doors themselves' },
      steps: [
        // THE PLAN ROOM (3 November 2026; build/uprising-plan.js): the city view now. Each step shows only there.
        { k: 'plan-start', at: ['#upp-p-plan .upp-chips'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-plan') === 'on'; }, e: '🧭', v: 4, h: 'Start from a real night',
          p: 'Each of the site’s own plans follows a night in Iran: the 2009 march, 2022’s many neighbourhoods, the bazaar and the campuses, November 2019’s edges, the 20:00 call of January 2026. Pick one, then change it.', covers: ['pre=*'],
          fa: { h: 'از یه شب واقعی شروع کنید', p: 'هر کدوم از برنامه‌های سایت از روی یه شب تو ایرانه: راهپیمایی ۸۸، محله‌های ۱۴۰۱، بازار و دانشگاه، حاشیه‌های آبان ۹۸، فراخوان ساعت ۲۰ دی ۱۴۰۴. یکی رو انتخاب کنید، بعد عوضش کنید.' } },
        { k: 'plan-groups', at: ['#upp-p-plan .upp-groups'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-plan') === 'on'; }, e: '👥', v: 4, h: 'Your groups',
          p: 'Up to six groups. For each: where it starts on the map, how many people, when it leaves, a street to pass, and where it meets. Groups that meet at the same place merge there.',
          fa: { h: 'گروه‌هاتون', p: 'تا شش گروه. برای هر کدوم: از کجای نقشه شروع کنه، چند نفر باشن، کی راه بیفتن، از کدوم خیابون رد بشن، و کجا جمع بشن. گروه‌هایی که یه جا قرار دارن اونجا به هم می‌پیوندن.' } },
        { k: 'plan-odds', at: ['#upp-odds'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-plan') === 'on'; }, e: '🎲', v: 4, h: 'The odds, as you change it',
          p: 'Every change runs the same night 120 times: how often a square is held, the biggest crowd, the likely lives lost, how far the regime goes. Likelihoods, not predictions.',
          fa: { h: 'شانس‌ها، همون لحظه که عوضش می‌کنید', p: 'هر تغییر همین شب رو ۱۲۰ بار اجرا می‌کنه: چند بار یه میدون نگه داشته می‌شه، بزرگ‌ترین جمعیت، جان‌باخته‌های محتمل، رژیم تا کجا پیش می‌ره. احتمال، نه پیش‌بینی.' } },
        { k: 'plan-run', at: ['#upp-run'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-plan') === 'on'; }, e: '▶️', v: 4, h: 'Play the night',
          p: 'One typical run plays on the map with the clock, five minutes a step. Pause, jump to the next event, drag the time or change the speed. Every event is written in plain words below, and at the end it says why it went that way. The speaker turns the sound on and off. Back to the plan ends it.', covers: ['upp-run', 'upp-pp', 'upp-step', 'upp-scrub', '.upp-spd', 'upp-snd', 'upp-stop'],
          fa: { h: 'شب رو اجرا کنید', p: 'یه اجرای معمولی با ساعت روی نقشه پخش می‌شه، هر قدم پنج دقیقه. نگهش دارید، برید اتفاق بعدی، زمان رو بکشید یا سرعت رو عوض کنید. هر اتفاق پایین با زبون ساده نوشته می‌شه، و آخرش می‌گه چرا این‌جوری شد. بلندگو صدا رو روشن و خاموش می‌کنه. «برگشت به برنامه» تمومش می‌کنه.' } },
        { k: 'plan-key', at: ['#upp-keyb'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-plan') === 'on'; }, e: '🗝️', v: 4, h: 'What each mark means',
          p: 'Amber is the people, red the regime: a letter for each kind of force. The ring round a crowd shows how far the regime has gone against it.', covers: ['upp-keyb'],
          fa: { h: 'هر علامت یعنی چی', p: 'زرد مردمن، قرمز رژیم: برای هر نیرو یه حرف. حلقهٔ دور هر جمعیت نشون می‌ده رژیم تا کجا علیه‌ش پیش رفته.' } },
        { k: 'plan-map', at: ['#upp-zfit'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-plan') === 'on'; }, e: '🔍', v: 4, h: 'Move the map',
          p: 'Plus and minus zoom; ⌖ shows your whole plan on the screen. 3D streets opens the same city on its real streets and buildings.',
          fa: { h: 'نقشه رو جابه‌جا کنید', p: 'به‌علاوه و منها زوم می‌کنن؛ ⌖ کل برنامه‌تون رو تو صفحه نشون می‌ده. «خیابون‌های سه‌بعدی» همین شهر رو با خیابون‌ها و ساختمون‌های واقعیش باز می‌کنه.' }, covers: ['upp-zfit', 'upp-3d', 'upp-zin', 'upp-zout'] },
        { k: 'plan-tabs', at: ['.upp-tabs'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-plan') === 'on'; }, e: '⚖️', v: 4, h: 'Compare, and how the regime responds',
          p: 'Compare runs your plan beside the site’s own. How the regime responds lists who comes, when, the ladder from batons to machine guns, and what makes it climb, each with its source.', covers: ['.on', 'button'],
          fa: { h: 'مقایسه، و واکنش رژیم', p: '«مقایسه» برنامهٔ شما رو کنار برنامه‌های سایت اجرا می‌کنه. «رژیم چطور جواب می‌ده» می‌گه کی میاد، چه وقتی میاد، پله‌ها از باتوم تا تیربار، و چی سرکوب رو بالا می‌بره، هر کدوم با منبعش.' } },
        { k: 'now', at: ['#up-nsvg', '#up-v-now'], e: '🗺️', v: 3, h: 'Iran, right now',
          fa: { h: 'ایران، همین الان', p: 'هر نقطه یه شهره و رنگش نشون می‌ده تو خبرهای زنده چقدر ناآرومه: آروم، گزارش، اعتراض، شدید، و حلقهٔ قرمز یعنی سرکوب. جاهای داغ یعنی همین الان اونجا خبریه. روی یه شهر بزنید.' },
          p: 'Every dot is a city, coloured by its unrest in the live reports: quiet, reports, protests, heavy, and a red ring for a crackdown. Heat marks where things are happening now. Tap a city.',
          covers: ['up-nsvg', 'c=*', '.up-nc'] },
        { k: 'level', at: ['#up-nlvl'], when: function () { return !(!!$('#uprising') && $('#uprising').getAttribute('data-view') === 'sim' && $('#uprising').getAttribute('data-plan') !== 'on'); }, opt: true, e: '📈', v: 3, h: 'The level, and Happening now',
          fa: { h: 'سطح ناآرومی، و همین الان', p: 'عدد، سطح ناآرومی تو کل کشوره از ۱۰۰، و فلش می‌گه از دفعهٔ قبل بالا رفته یا پایین. زیرش تازه‌ترین گزارش‌ها با منبع و زمان‌شون. صفحه هر یه دقیقه خودش به‌روز می‌شه و می‌گه خبرها چقدر تازه‌ن.' },
          p: 'The number is the nationwide level of unrest out of 100, with its change since the last reading. Below it, the newest reports with their source and time. The page updates itself every minute and says how fresh the news is.',
          covers: ['.up-ntgo'] },
        { k: 'breaking', at: ['#up-nbrk'], when: function () { return !(!!$('#uprising') && $('#uprising').getAttribute('data-view') === 'sim' && $('#uprising').getAttribute('data-plan') !== 'on') && shown($('#up-nbrk')); }, opt: true, e: '🚨', v: 3, h: 'Breaking',
          fa: { h: 'فوری', p: 'وقتی یه اتفاق بزرگ میفته، اینجا نشون داده می‌شه و شهرش روی نقشه می‌درخشه. بزنید تا کارت همون شهر باز بشه.' },
          p: 'When something major happens it shows here, and its city glows on the map. Tap to open that city’s card.', covers: ['.up-nbgo'] },
        { k: 'card', at: ['#up-ncard'], when: function () { return !(!!$('#uprising') && $('#uprising').getAttribute('data-view') === 'sim' && $('#uprising').getAttribute('data-plan') !== 'on'); }, opt: true, e: '🏙️', v: 3, h: 'A city’s card',
          fa: { h: 'کارت هر شهر', p: 'چه خبره اونجا و از کی، چقدر خشمگینه، رژیم چند تا مقر و پایگاه و کلانتری اونجا داره، و تو خیزش‌های قبلی چی شد. همه با تاریخ و منبع.', act: 'نشونم بده' },
          p: 'What is happening there and since when, how angry it is, how many IRGC compounds, Basij bases and police stations the regime has there, and what happened in past uprisings. All dated and sourced.',
          act: { label: 'Show me', run: function () { if (W.UPRNOW) W.UPRNOW.card('tehran'); } }, covers: ['up-ncx'] },
        { k: 'enter', at: ['#up-nenter', '#up-v-sim', '#up-v-now'], e: '▶️', v: 3, h: 'Enter the city',
          fa: { h: 'وارد شهر بشید', p: 'شهر با خیابون‌ها و ساختمون‌های واقعیش سه‌بعدی باز می‌شه. «همین الان» و «شبیه‌سازی» بالای صفحه همیشه هست تا برگردید.', act: 'نشونم بده' },
          p: 'The city opens in 3D on its real streets and buildings. Now and Simulate at the top always take you back and forth.',
          act: { label: 'Show me', run: function () { if (W.UPRNOW) W.UPRNOW.enterSim('tehran'); } }, covers: ['up-nenter', 'up-v-*'] },
        { k: 'board', at: ['#up-gl'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-view') === 'sim' && u.getAttribute('data-plan') !== 'on'; }, e: '🏙️', v: 3, h: 'The city, as it is', fa: { h: 'شهر، همون‌طور که هست', p: 'خیابان‌ها و ساختمان‌های واقعیش، از اوپن‌استریت‌مپ. روی جاهای رژیم نشان کسی هست که اداره‌شون می‌کنه: سپاه، بسیج، پلیس یا ارتش. بکشید تا جابه‌جا بشه، با دو انگشت یا اسکرول زوم کنید، دو بار بزنید تا دوربین بره همون‌جا. دکمه‌های کنار صفحه زوم می‌کنن، می‌چرخونن و نما رو برمی‌گردونن.' },
          p: 'Its real streets and buildings from OpenStreetMap. The regime’s places carry the emblem of whoever runs them: IRGC, Basij, police or army. Drag to move, pinch or scroll to zoom, double-tap to fly there. The buttons at the side zoom, turn and reset the view.',
          covers: ['up-cz-*', 'up-cr-*', 'up-chome'] },
        { k: 'city', fa: { h: 'شهرتون رو انتخاب کنید', p: 'روی اسم شهر بزنید تا نقشهٔ ایران باز بشه و یکی از ۳۵ شهر رو انتخاب کنید.' }, at: ['#up-pickb'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-view') === 'sim' && u.getAttribute('data-plan') !== 'on'; }, e: '📍', v: 2, h: 'Pick your city',
          p: 'Tap the city name to open the map of Iran and choose one of 35 cities.', covers: ['up-pickb'] },
        { k: 'hud', fa: { h: 'کی داره می‌بره', p: 'ساعت، توازن بین مردم و رژیم، چند نفر تو خیابان‌ان، نیروها، کیا به مردم پیوستن، بازداشت‌ها و جان‌باخته‌ها. زیرش هدف‌های این اجرا، و تلفات و هزینه تا اینجا برای هر دو طرف.' }, at: ['#up-hud'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-view') === 'sim' && u.getAttribute('data-plan') !== 'on'; }, opt: true, e: '📊', v: 3, h: 'Who is winning',
          p: 'The clock, the balance between the people and the regime, how many are on the streets, the forces, who crossed over, the arrests and the lives lost. Below: this run’s objectives, and the casualties and the cost so far on both sides.',
          covers: ['up-hud'] },
        { k: 'modes', fa: { h: 'دو راه برای پیش رفتن', p: '«یه مشاور هدایت می‌کنه»: یه متخصص انتخاب کنید و برنامه‌ش رو اجرا کنید. «خودم فرمان می‌دم»: خودتون انتخاب کنید از کجا شروع بشه، مردم کجا و کی برن، اعتصاب و ابزارها.', act: 'نشونم بده' }, at: ['#up-modes'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-view') === 'sim' && u.getAttribute('data-plan') !== 'on'; }, e: '🧭', v: 2, h: 'Two ways to play',
          p: 'An advisor leads: pick an expert and play their plan. I command: choose where it starts, where people go and when, the strike and the tools yourself.',
          act: { label: 'Show me', run: function () { click('#up-mode-adv'); } }, covers: ['up-mode-*'] },
        { k: 'advisors', fa: { h: 'حرف یه مشاور رو بشنوید', p: 'روی یه عکس بزنید. هر مشاور یه جملهٔ کوتاه با منبعش داره، این شهر رو بررسی می‌کنه و با شواهد از برنامه‌ش دفاع می‌کنه؛ می‌بینید به احتمال زیاد به کجا می‌رسه.', act: 'نشونم بده' }, at: ['#uprising .up-adv'], all: true, opt: true, when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-view') === 'sim' && u.getAttribute('data-plan') !== 'on'; }, e: '🎖️', v: 3, h: 'Hear an advisor',
          p: 'Tap a portrait. Each advisor has one sharp, sourced line, reads this city and argues their plan from the evidence; you see what it most likely leads to.',
          act: { label: 'Show me', run: function () { click('#uprising .up-adv[data-a="organizer"]'); } }, covers: ['.up-adv'] },
        { k: 'use', fa: { h: 'برنامه‌ش رو اجرا کنید', p: 'با یه بار زدن کل برنامه تنظیم و اجرا می‌شه. مشاور دربارهٔ اتفاق‌هایی که میفته نظر می‌ده.' }, at: ['#up-use'], when: function () { return (!!$('#uprising') && $('#uprising').getAttribute('data-view') === 'sim' && $('#uprising').getAttribute('data-plan') !== 'on') && shown($('#up-use')); }, e: '✅', v: 2, h: 'Use their plan',
          p: 'One tap sets the whole plan and plays it out. The advisor comments on what happens.', covers: ['up-use', 'up-advcmp'] },
        { k: 'tabs', fa: { h: 'خودتون فرمان بدید', p: '«شروع»: از کجا شروع بشه و با چه رویکردی. «حرکت‌ها»: نقطه‌های تجمع با ساعت‌شون، و مسیرهای راهپیمایی که روی نقشه می‌کشید. «اعتصاب»: بازار، کامیون‌دارها، نفت، معلم‌ها. «ابزارها»: امدادگرها، سنگربندی، دعوت از سربازها، استارلینک. «شرایط»: اینترنت، بقیهٔ ایران، و خیزش‌های واقعی گذشته برای امتحان.', act: 'نشونم بده' }, at: ['#uprising .up-tab'], all: true, opt: true, when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-view') === 'sim' && u.getAttribute('data-plan') !== 'on'; }, e: '♟️', v: 2, h: 'Command it yourself',
          p: 'Start: where it begins and the approach. Moves: gathering points with their hour, and march routes you draw on the map. Strike: the bazaar, the truckers, oil, the teachers. Tools: medics, barricades, appeals to the soldiers, Starlink. Conditions: the internet, the rest of Iran, and real past uprisings to test.',
          act: { label: 'Show me', run: function () { click('#up-mode-cmd'); } }, covers: ['.up-tab', 'tab=*'] },
        { k: 'odds', fa: { h: 'شانس و هزینه، همون لحظه که انتخاب می‌کنید', p: 'با هر تغییر، برنامه‌تون پشت صحنه دوباره اجرا می‌شه: نمرهٔ برنامه، رژیم چند بار سقوط می‌کنه، اجراها چطور تموم می‌شن، چند نفر جون‌شون رو از دست می‌دن و رژیم روزی چقدر خرج می‌کنه. «چرا؟» هزینه برای همهٔ طرف‌ها رو هم نشون می‌ده.' }, at: ['#up-odds'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-view') === 'sim' && u.getAttribute('data-plan') !== 'on'; }, e: '🎲', v: 3, h: 'The odds and the cost, as you choose',
          p: 'Every change runs your plan again in the background: its grade, how often the regime falls, how the runs end, the lives lost and what the regime pays a day. Why opens the cost on all sides as well.', covers: ['up-odds'] },
        { k: 'best', fa: { h: 'بهترین برنامه', p: 'ده‌ها برنامه رو تو همین شرایط امتحان می‌کنه، با یه نوار پیشرفت. برای هر هدف سه تا بهترین رو نشون می‌ده، با دلیل پیروزی‌شون و تاریخی که بهش تکیه دارن، و می‌گه از برنامهٔ بهترین مشاور جلوترن یا نه.', act: 'نشونم بده' }, at: ['#up-bestb'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-view') === 'sim' && u.getAttribute('data-plan') !== 'on'; }, e: '🏆', v: 3, h: 'Find the best plan',
          p: 'It tries dozens of plans under your conditions, with a progress bar. For each goal it shows the best three, why they win and the history they rest on, and whether they beat the best advisor.',
          act: { label: 'Show me', run: function () { click('#up-bestb'); } }, covers: ['up-bestb'] },
        { k: 'watch', fa: { h: 'ببینید چطور پیش می‌ره', p: 'بزنیدش تا محتمل‌ترین اجرا روی شهر پخش بشه: جمعیت‌هایی که تو خیابان‌ها راه می‌رن، نیروهایی که صف می‌بندن، گاز اشک‌آور، تیراندازی، نیروهایی که به مردم می‌پیوندن، شب. آخرش یه نمره می‌گیرید.' }, at: ['#up-watch'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-view') === 'sim' && u.getAttribute('data-plan') !== 'on'; }, e: '▶️', v: 3, h: 'Watch it play out',
          p: 'Press it and the most likely run plays on the city: crowds walking the streets, the forces forming lines, tear gas, gunfire, defections, the night. At the end you get a grade.', covers: ['up-watch'] },
        { k: 'bar', fa: { h: 'توقف، سرعت، خط زمان', p: 'نگهش دارید، سرعت رو عوض کنید، خط زمان رو تا هر ساعتی بکشید. علامت‌های روش لحظه‌های مهمن. «دنبال کردن» دوربین رو روی اتفاق‌ها نگه می‌داره؛ «نتیجه‌ها» می‌گه چطور تموم شد و چرا.' }, at: ['#up-bar'], when: function () { return (!!$('#uprising') && $('#uprising').getAttribute('data-view') === 'sim' && $('#uprising').getAttribute('data-plan') !== 'on') && shown($('#up-bar')); }, e: '⏯️', v: 2, h: 'Pause, speed, timeline',
          p: 'Pause, change the speed, drag the timeline to any hour. The marks on it are the moments that matter. Follow keeps the camera on the action; Results says how it ended and why.',
          covers: ['up-pp', '.up-spd', 'up-pace', '.up-scrubw', 'up-follow', 'up-resb', 'up-back'] },
        { k: 'feed', fa: { h: 'چه خبره، و چرا', p: 'هر اتفاق با دلیلش و منبعش. روی هر کدوم بزنید تا برید همون‌جا.' }, at: ['#up-feed'], when: function () { return (!!$('#uprising') && $('#uprising').getAttribute('data-view') === 'sim' && $('#uprising').getAttribute('data-plan') !== 'on') && shown($('#up-feed')); }, e: '📰', v: 2, h: 'What is happening, and why',
          p: 'Each event with the reason it happens and its source. Tap one to fly there.', covers: ['up-feed'] },
        { k: 'compare', fa: { h: 'مقایسهٔ برنامه‌ها', p: 'تا چهار برنامه اضافه کنید، برنامهٔ یه مشاور یا برنامهٔ خودتون. «مقایسه» اونا رو کنار هم با همون اتفاق‌های تصادفی اجرا می‌کنه و بهترینش رو برای هدفی که انتخاب می‌کنید علامت می‌زنه: سقوط رژیم، محله‌ها دست مردم، تا آخر سرپا، یا کمترین جان‌باخته.' }, at: ['#up-addcmp', '#up-cmpb'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-view') === 'sim' && u.getAttribute('data-plan') !== 'on'; }, e: '⚖️', v: 2, h: 'Compare plans',
          p: 'Add up to four plans, an advisor’s or yours. Compare runs them with the same luck side by side, and marks the best for the goal you pick: the regime falls, districts held, still standing, or fewest lives lost.',
          covers: ['up-addcmp', 'up-cmpb'] },
        { k: 'share', fa: { h: 'برنامه رو بفرستید', p: 'لینک، شهر، برنامه و مقایسه‌تون رو با خودش می‌بره، پس هر کی بازش کنه دقیقاً همون چیزی رو می‌بینه که شما ساختید.' }, at: ['#up-share'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-view') === 'sim' && u.getAttribute('data-plan') !== 'on'; }, opt: true, e: '🔗', v: 2, h: 'Share the plan',
          p: 'The link carries the city, your plan and your comparison, so whoever opens it sees exactly what you built.', covers: ['up-share'] },
        { k: 'legend', fa: { h: 'دست کیه', p: 'چهار تا نشان. جایی که اوپن‌استریت‌مپ ثبتش نکرده، همون‌جایی گذاشته شده که این‌جور جاها معمولاً هستن، و روش هم همینو نوشته.' }, at: ['#up-legend'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-view') === 'sim' && u.getAttribute('data-plan') !== 'on'; }, opt: true, e: '🛡️', v: 2, h: 'Who runs it',
          p: 'The four emblems. A place OpenStreetMap does not map stands where such places typically are, and is labelled so.', covers: ['up-legend'] },
        { k: 'model', fa: { h: 'مدل', p: 'مدل چی رو می‌شمره، به چه پژوهش‌هایی تکیه داره، و چطور با ۲۰۰۹، ۲۰۱۷، ۲۰۱۹، ۲۰۲۲، ژانویهٔ ۲۰۲۶ و ۱۹۷۹ محک خورده.' }, at: ['#up-howb'], when: function () { var u = $('#uprising'); return !!u && u.getAttribute('data-view') === 'sim' && u.getAttribute('data-plan') !== 'on'; }, opt: true, e: '📖', v: 2, h: 'The model',
          p: 'What the model counts, the research it stands on, and how it is checked against 2009, 2017, 2019, 2022, January 2026 and 1979.', covers: ['up-howb'] }
      ]
    },
    // The Conflict Simulator (simulator/<theatre>/ on Liberty Politics, <lang>/scenarios/<theatre>/ on Iran Uncensored; build/wargame.py,
    // .js, .css; its id here kept from "Wargames"). v3, rewritten 1 November 2026 from the finished second rebuild (TOOLS.md): the
    // plan in four steps (Forces, Targets, Rules, Advisors), Watch, Compare, Replay. Each step asks the reader to do the thing,
    // and "Show me" does it for them. Its root is the section's class, .wg, the same on both sites.
    wargame: {
      name: 'Conflict Simulator', fa: 'سناریوها', root: '.wg', ready: '.wg .wg-mode', v: 4,
      surf: ['.wg .wg-mode', '.wg .wg-tab', '.wg .wg-th', '#wg-play', '#wg-speed', '#wg-cam', '#wg-full', '#wg-orbt', '#wg-zin', '#wg-zout', '#wg-rot', '#wg-fit', '#wg-grab', '#wg-scrub', '#wg-mini', '#wg-stage',
        '.wg [data-tk]', '#wg-brk-x', '#wg-brk-go', '.wg [data-goal]', '.wg .wg-tobest', '.wg [data-bside]', '.wg [data-bgoal]', '#wg-best-go', '.wg [data-buse]', '.wg [data-bsave]', '.wg [data-costsrc]',
        '.wg [data-step]', '.wg [data-force]', '.wg [data-unit]', '.wg [data-preset]', '.wg [data-tgmove]', '.wg [data-tgon]', '.wg [data-lv]', '.wg .wg-date', '.wg [data-lens]', '.wg [data-pm]', '#wg-reset',
        '.wg [data-seat]', '.wg .wg-use', '.wg [data-brief]', '#wg-run', '#wg-save', '#wg-watch', '#wg-back', '#wg-share', '.wg [data-load]', '.wg [data-drop]', '#wg-cmp', '.wg [data-replay]'],
      skip: { '.lpt-doors': 'the tour and stream doors themselves' },
      steps: [
        { k: 'board', at: ['#wg-stage'], e: '🛰️', v: 4, h: 'The theatre, in 3D',
          p: 'Every base, missile site, refinery, power plant and fleet stands as its real model, where it really is, with the rivers, roads and railways under them. Drag to move, pinch or scroll to zoom, double-tap to dive in. Tap any model: a card says what it is, how many, and the source.',
          fa: { h: 'منطقه، سه‌بعدی', p: 'هر پایگاه، سایت موشکی، پالایشگاه، نیروگاه و ناوگان با مدل واقعیش همون‌جایی که هست ایستاده، با رودخونه‌ها، جاده‌ها و راه‌آهن‌ها زیرشون. بکشید تا جابه‌جا بشه، با دو انگشت یا چرخ ماوس زوم کنید، دو بار بزنید تا نزدیک بشید. روی هر مدل بزنید: یه کارت می‌گه چیه، چندتاست و منبعش کجاست.' }, covers: ['wg-stage'] },
        { k: 'now', at: ['.wg .wg-tick', '.wg .wg-thr'], opt: true, e: '🔴', v: 4, h: 'Happening now',
          p: 'The glow on the map is where strikes and fighting are reported right now; a ring means it started in the last hour. The dial says how tense it is against the reading before. Tap a headline to fly there; its outlet opens the report.',
          fa: { h: 'همین الان', p: 'نورهای روی نقشه جاهایی‌ان که همین الان حمله و درگیری گزارش شده؛ حلقه یعنی تو یه ساعت گذشته شروع شده. عقربه می‌گه تنش نسبت به دفعهٔ قبل چقدره. روی یه خبر بزنید تا برید همون‌جا؛ اسم رسانه گزارش رو باز می‌کنه.', act: 'نشونم بده' },
          act: { label: 'Show me', run: function () { if (W.WG && W.WG.mode) W.WG.mode('now'); } }, covers: ['tk=*', 'wg-brk-x', 'wg-brk-go'] },
        { k: 'modes', at: ['.wg .wg-mode'], all: true, e: '🧭', v: 4, h: 'Now, Simulate, Replay',
          p: 'Now shows where things stand right now, live. Simulate is where you plan, let the model find the best plan and run it 1,000 times. Replay plays the past rounds day by day.',
          fa: { h: 'الان، سناریو، مرور گذشته', p: '«الان» نشون می‌ده همین الان اوضاع کجاست، زنده. «سناریو» جاییه که برنامه می‌چینید، می‌ذارید مدل بهترین برنامه رو پیدا کنه و هزار بار اجراش می‌کنید. «مرور گذشته» دورهای قبلی رو روز به روز نشون می‌ده.'  }, covers: ['mode=*'] },
        { k: 'goal', at: ['.wg [data-goal]'], all: true, opt: true, e: '🎯', v: 4, h: 'Pick your goal',
          p: 'What do you want: stop the bomb, a short war, fewest deaths? The report grades your plan by how often it gets there.',
          fa: { h: 'هدفتون رو انتخاب کنید', p: 'چی می‌خواید: جلوی بمب رو بگیرید، جنگ کوتاه، کمترین کشته؟ گزارش برنامه‌تون رو با اینکه چند بار به اون هدف می‌رسه نمره می‌ده.', act: 'نشونم بده' },
          act: { label: 'Show me', run: function () { if (W.WG && W.WG.step) W.WG.step('forces'); } }, covers: ['goal=*'] },
        { k: 'tabs', at: ['.wg .wg-tab'], all: true, opt: true, e: '🗺️', v: 4, h: 'Plan, Best plan, Results, Compare',
          p: 'Plan what you would do, let the model find the best plan, read the results, or compare up to four plans side by side.',
          fa: { h: 'برنامه، بهترین برنامه، نتیجه‌ها، مقایسه', p: 'برنامه‌تون رو بچینید، بذارید مدل بهترین برنامه رو پیدا کنه، نتیجه‌ها رو بخونید، یا تا چهار برنامه رو کنار هم مقایسه کنید.' }, covers: ['.wg-tab', 'tab=*'] },
        { k: 'steps', at: ['.wg [data-step]'], all: true, opt: true, e: '🪜', v: 3, h: 'Four steps to a plan',
          p: 'Forces, Targets, Rules, Advisors. Tap a step to open it; the plan keeps everything you set.',
          fa: { h: 'چهار قدم تا یه برنامه', p: 'نیروها، هدف‌ها، قاعده‌ها، مشاورها. روی هر قدم بزنید تا باز بشه؛ برنامه هرچی تنظیم کردید رو نگه می‌داره.' }, covers: ['step=*'] },
        { k: 'forces', at: ['.wg [data-step="forces"]'], when: function () { return !!$('.wg [data-step]'); }, e: '✈️', v: 3, h: 'Choose your forces',
          p: 'Each card is a real unit with its 3D model, its count and whether it is in the region now or days away. Tap Send or Leave out on a card and see the plan change. The quick picks above set whole packages at once.',
          fa: { h: 'نیروهاتون رو انتخاب کنید', p: 'هر کارت یه یگان واقعیه با مدل سه‌بعدیش، تعدادش، و اینکه الان تو منطقه‌ست یا چند روز فاصله داره. روی «بفرست» یا «کنار بذار» بزنید و ببینید برنامه چطور عوض می‌شه. دکمه‌های بالا یه بستهٔ کامل رو یه‌جا انتخاب می‌کنن.', act: 'نشونم بده' },
          act: { label: 'Show me', run: function () { if (W.WG && W.WG.step) W.WG.step('forces'); } }, covers: ['force=*', 'preset=*'] },
        { k: 'unit', at: ['.wg [data-unit]'], all: true, opt: true, e: 'ℹ️', v: 3, h: 'What a unit is',
          p: 'The small i opens a unit’s card: the model, how many, where it is based, how sure the count is, and the sources.',
          fa: { h: 'هر یگان چیه', p: 'دکمهٔ کوچیک i کارت یگان رو باز می‌کنه: مدل، تعداد، پایگاهش، چقدر از این عدد مطمئنیم، و منبع‌ها.' }, covers: ['unit=*'] },
        { k: 'targets', at: ['.wg [data-step="targets"]'], when: function () { return !!$('.wg [data-step]'); }, e: '🎯', v: 3, h: 'Rank your targets',
          p: 'Open Targets and move a set up with the arrow: the first set gets about half of each day’s strikes. Each row says what it buys and what it costs. Switch off what you would not hit.',
          fa: { h: 'هدف‌ها رو به ترتیب بچینید', p: '«هدف‌ها» رو باز کنید و با فلش یه دسته رو ببرید بالا: دستهٔ اول حدود نصف حمله‌های هر روز رو می‌گیره. هر ردیف می‌گه چی به دست میاره و چه هزینه‌ای داره. هرچی رو نمی‌زنید خاموش کنید.', act: 'نشونم بده' },
          act: { label: 'Show me', run: function () { if (W.WG && W.WG.step) W.WG.step('targets'); } }, covers: ['tgmove=*', 'tgon=*'] },
        { k: 'rules', at: ['.wg [data-step="rules"]'], when: function () { return !!$('.wg [data-step]'); }, e: '♟️', v: 3, h: 'Set the rules',
          p: 'Who fires first, how long it is planned to last, what happens at sea, what the other side and the world do. Tap an option and it is in your plan.',
          fa: { h: 'قاعده‌ها رو بچینید', p: 'کی اول شلیک می‌کنه، قراره چقدر طول بکشه، تو دریا چی می‌شه، طرف مقابل و دنیا چیکار می‌کنن. روی یه گزینه بزنید و می‌ره تو برنامه‌تون.', act: 'نشونم بده' },
          act: { label: 'Show me', run: function () { if (W.WG && W.WG.step) W.WG.step('rules'); } }, covers: ['lv=*', '.wg-date'] },
        { k: 'advisors', at: ['.wg [data-step="advisors"]'], when: function () { return !!$('.wg [data-step]'); }, e: '🎖️', v: 3, h: 'Ask an advisor',
          p: 'Each advisor is a real analyst or general. Tap a portrait for their briefing over the map. “Use this plan” sets all four steps to their plan in one tap.',
          fa: { h: 'از یه مشاور بپرسید', p: 'هر مشاور یه تحلیلگر یا ژنرال واقعیه. روی عکسش بزنید تا گزارشش رو روی نقشه بشنوید. «این برنامه رو بردار» هر چهار قدم رو یه‌جا روی برنامهٔ اون می‌ذاره.', act: 'نشونم بده' },
          act: { label: 'Show me', run: function () { if (W.WG && W.WG.step) W.WG.step('advisors'); } }, covers: ['brief=*', '.wg-chip', 'seat=*'] },
        { k: 'lens', at: ['.wg [data-lens]'], all: true, opt: true, e: '🧮', v: 3, h: 'Whose numbers run it',
          p: 'The advisors you seat, every expert averaged, the betting markets, or your own numbers on sliders. Your own numbers travel with the link you share.',
          fa: { h: 'با عددهای کی اجرا بشه', p: 'مشاورهایی که نشوندید، میانگین همهٔ کارشناس‌ها، بازارهای پیش‌بینی، یا عددهای خودتون با اسلایدر. عددهای خودتون با لینکی که می‌فرستید همراه می‌رن.' }, covers: ['lens=*', 'pm=*', 'wg-reset'] },
        { k: 'best', at: ['.wg .wg-tab[data-tab="best"]', '#wg-best-go'], opt: true, e: '🏆', v: 4, h: 'Find the best plan',
          p: 'The model searches for you: it starts from your plan and every advisor’s, tries every option of every lever, and shows the three best with why each wins, against each advisor’s plan and the market.',
          fa: { h: 'بهترین برنامه رو پیدا کنید', p: 'مدل به جای شما می‌گرده: از برنامهٔ شما و هر مشاور شروع می‌کنه، هر گزینهٔ هر اهرم رو امتحان می‌کنه، و سه‌تا بهترین رو با دلیل برنده شدنشون نشون می‌ده، در برابر برنامهٔ هر مشاور و بازار پیش‌بینی.', act: 'نشونم بده' },
          act: { label: 'Show me', run: function () { if (W.WG && W.WG.mode) W.WG.mode('sim'); click('.wg .wg-tab[data-tab="best"]'); } }, covers: ['wg-best-go', 'bgoal=*', 'bside=*', 'buse=*', 'bsave=*'] },
        { k: 'run', at: ['#wg-run'], opt: true, e: '🎲', v: 4, h: 'Run it 1,000 times',
          p: 'Press it when your plan is set: it runs 1,000 times with different luck. The most typical run plays on the board, and the report grades your plan and shows the cost on both sides: the dead and the money, as ranges with their sources.',
          fa: { h: 'هزار بار اجراش کنید', p: 'وقتی برنامه‌تون آماده شد بزنیدش: هزار بار با شانس‌های مختلف اجرا می‌شه. معمولی‌ترین حالت روی نقشه پخش می‌شه، و گزارش به برنامه‌تون نمره می‌ده و هزینه رو برای هر دو طرف نشون می‌ده: کشته‌ها و پول، به صورت بازه با منبع‌هاشون.', act: 'نشونم بده' },
          covers: ['wg-run', 'wg-watch', 'wg-back', 'wg-share', 'costsrc=*'] },
        { k: 'watch', at: ['#wg-scrub', '#wg-play'], all: true, opt: true, e: '🎬', v: 3, h: 'Watch it happen',
          p: 'The aircraft, missiles and drones fly from where they really would. The caption says what is happening and why. Play, pause, change the speed, or drag the timeline to any day.',
          fa: { h: 'ببینید چطور اتفاق می‌افته', p: 'هواپیماها، موشک‌ها و پهپادها از همون جایی که واقعاً بلند می‌شن پرواز می‌کنن. زیرنویس می‌گه چی داره اتفاق می‌افته و چرا. پخش کنید، نگه دارید، سرعت رو عوض کنید، یا خط زمان رو تا هر روزی بکشید.' }, covers: ['wg-scrub', 'wg-play', 'wg-speed'] },
        { k: 'compare', at: ['#wg-save', '#wg-cmp'], all: true, opt: true, e: '⚖️', v: 3, h: 'Compare plans',
          p: 'Save to compare keeps the plan. Save up to four, open Compare, pick what matters most, and run them: 1,000 runs each, side by side, the best plan for that goal marked.',
          fa: { h: 'برنامه‌ها رو مقایسه کنید', p: '«برای مقایسه نگه دار» برنامه رو نگه می‌داره. تا چهارتا نگه دارید، «مقایسه» رو باز کنید، بگید چی براتون مهم‌تره و اجراشون کنید: هر کدوم هزار بار، کنار هم، و بهترینش برای اون هدف علامت می‌خوره.' },
          covers: ['wg-save', 'load=*', 'drop=*', 'wg-cmp'] },
        { k: 'forcebar', at: ['#wg-orbt'], opt: true, e: '📊', v: 3, h: 'The forces left',
          p: 'Missiles, drones, interceptors, aircraft, ships and troops on each side. The bars run down as the days play.',
          fa: { h: 'نیروهایی که مونده', p: 'موشک، پهپاد، رهگیر، هواپیما، کشتی و نیرو برای هر طرف. نوارها با گذشت روزها کم می‌شن.' }, covers: ['wg-orbt'] },
        { k: 'camera', at: ['#wg-cam', '#wg-zin', '#wg-zout', '#wg-rot', '#wg-fit'], all: true, e: '🎥', v: 4, h: 'The camera',
          p: 'With the camera on, it follows the action. Zoom, turn the map, or reset the view. Keys: arrows move, + and − zoom, Q and E turn, R resets.',
          fa: { h: 'دوربین', p: 'وقتی دوربین روشنه، دنبال اتفاق‌ها می‌ره. زوم کنید، نقشه رو بچرخونید، یا برگردید به نمای اول. کلیدها: فلش‌ها جابه‌جا می‌کنن، + و − زوم، Q و E چرخش، R برگشت به نمای اول.' }, covers: ['wg-cam', 'wg-zin', 'wg-zout', 'wg-rot', 'wg-fit'] },
        { k: 'mini', at: ['#wg-mini'], opt: true, e: '🗺️', v: 4, h: 'The minimap', p: 'The gold box is what you see; the glow is where it is hot now. Tap anywhere on it to go there.',
          fa: { h: 'نقشهٔ کوچیک', p: 'کادر طلایی همونیه که می‌بینید؛ نورها جاهاییه که الان داغه. هر جاش رو بزنید تا برید اونجا.' }, covers: ['wg-mini'] },
        { k: 'full', at: ['#wg-full'], e: '🖥️', v: 3, h: 'Full screen', p: 'Fill the screen with the board. Esc gives the page back.',
          fa: { h: 'تمام‌صفحه', p: 'نقشه کل صفحه رو می‌گیره. Esc صفحه رو برمی‌گردونه.' }, covers: ['wg-full'] },
        { k: 'theatres', at: ['.wg .wg-th'], all: true, opt: true, e: '🌍', v: 3, h: 'Three theatres', p: 'Iran, Ukraine and Taiwan, each on its own board.',
          fa: { h: 'سه منطقه', p: 'ایران، اوکراین و تایوان، هر کدوم روی نقشهٔ خودش.' }, covers: ['.wg-th'] },
        { k: 'sheet', at: ['#wg-grab'], opt: true, e: '↕️', v: 3, h: 'The panel', p: 'Tap or drag the handle to make the panel bigger or smaller. The board stays above it.',
          fa: { h: 'پنل', p: 'دستگیره رو بزنید یا بکشید تا پنل بزرگ‌تر یا کوچیک‌تر بشه. نقشه بالاش می‌مونه.' }, covers: ['wg-grab'] },
        { k: 'replay', at: ['.wg [data-replay]', '.wg .wg-mode[data-mode="replay"]'], opt: true, e: '⏪', v: 4, h: 'Replay what already happened', p: 'Open Replay and pick one: every strike of a real conflict on the day it happened, each with its source, and the real tallies beside it.',
          fa: { h: 'مرور گذشته', p: '«مرور گذشته» رو باز کنید و یکی رو انتخاب کنید: هر حملهٔ یه درگیری واقعی همون روزی که اتفاق افتاد، هر کدوم با منبعش، و آمار واقعی کنارش.', act: 'نشونم بده' },
          act: { label: 'Show me', run: function () { if (W.WG && W.WG.mode) W.WG.mode('replay'); } }, covers: ['replay=*'] }
      ]
    }
  };

  // Iran Uncensored's Your score on Iran (<lang>/you/: its render.py you_page() and build/you.js; 1 November 2026). The same
  // door name as Liberty Politics' Your Liberty Score (data-lpt="you", the id in the tools register), with its own controls
  // (sq-, not yq-): on a page that carries #sq-cfg, "you" is this tour; everywhere else it is the one above.
  var YOU_IU = {
    name: 'Your score on Iran', fa: 'نمرهٔ خودتون دربارهٔ ایران', root: '#sq', ready: '#sq-go', v: 1,
    surf: ['.sq-hd .wrap > *', '#sq .sq-b > *', '#sq-end > *', '#sq-res .wrap > *', '#sq-like > *', '#sq-res .sq-st > *', '#sq-res .sq-send > *'],
    skip: { 'h1': 'the title', '.sq-lede': 'the line under the title', '.sq-safe': 'a line that says your answers stay in the page',
      '.lpt-doors': 'the tour door itself', '.dim': 'a line that says the score never tells anyone how to vote, or that changing an answer moves it',
      '.sq-h2': 'a heading', 'label': 'the name of the box beside it', 'p': 'the line over the Send button' },
    steps: [
      { k: 'answer', at: ['#q1 .sq-b'], e: '🗳️', h: 'Vote on each question',
        p: 'Tap Yes or No, the way you would have voted in Congress. Not sure? Tap Don’t know. Each question counts under one of my principles, named at its top.',
        fa: { h: 'به هر سؤال رأی بدید', p: 'روی «موافق» یا «مخالف» بزنید، همون‌طوری که اگه تو کنگره بودید رأی می‌دادید. مطمئن نیستید؟ «نمی‌دونم» رو بزنید. هر سؤال زیر یکی از اصل‌های من حساب می‌شه که اسمش بالای سؤاله.' },
        covers: ['v=*'] },
      { k: 'need', at: ['#sq-left'], e: '📶', h: 'How many answers you need',
        p: 'This line counts your answers and says how many more you need for a score. The more you answer, the fairer it is.',
        fa: { h: 'چند تا جواب لازمه', p: 'این خط جواب‌هاتون رو می‌شمره و می‌گه چند تا دیگه مونده تا نمره بگیرید. هر چی بیشتر جواب بدید، نمره‌تون دقیق‌تره.' },
        covers: ['sq-left'] },
      { k: 'score', at: ['#sq-go'], e: '🎓', h: 'See your score',
        p: 'Tap See my score once you have enough answers. You get a score out of 100, worked out the same way as every senator and representative.',
        fa: { h: 'نمره‌تون رو ببینید', p: 'وقتی به اندازهٔ کافی جواب دادید، «نمره‌م رو ببینم» رو بزنید. یه نمره از ۱۰۰ می‌گیرید، با همون حسابی که به هر سناتور و نماینده نمره می‌دم.' },
        covers: ['sq-go'] },
      { k: 'result', at: ['#sq-res .sq-top'], when: function () { return shown($('#sq-res .sq-top')); }, e: '🏅', h: 'Your score',
        p: 'Your score out of 100, and under it how many of the members of Congress I score are below you. Change any answer and it follows.',
        fa: { h: 'نمرهٔ شما', p: 'نمره‌تون از ۱۰۰، و زیرش اینکه از چند نفر از اعضای کنگره که بهشون نمره می‌دم بالاترید. یه جواب رو عوض کنید، نمره هم عوض می‌شه.' },
        covers: ['.sq-top', 'sq-rank'] },
      { k: 'principles', at: ['#sq-ms'], when: function () { return shown($('#sq-ms')); }, e: '📊', h: 'Principle by principle',
        p: 'A bar for each principle: how many of your answers were on the side of freedom. A principle Congress never voted on is not part of your score.',
        fa: { h: 'اصل به اصل', p: 'برای هر اصل یه نوار: چند تا از جواب‌هاتون به نفع آزادی بود. اصلی که کنگره هیچ‌وقت سرش رأی نداده تو نمره‌تون نیست.' },
        covers: ['sq-ms'] },
      { k: 'like', at: ['#sq-near'], when: function () { return shown($('#sq-near')); }, e: '🤝', h: 'Who votes like you',
        p: 'The five members of Congress closest to you, and the three furthest. Tap one to open their page.',
        fa: { h: 'کی مثل شما رأی می‌ده', p: 'پنج نفر از کنگره که از همه بهتون نزدیک‌ترن، و سه نفر که از همه دورترن. روی هر کدوم بزنید، صفحه‌ش باز می‌شه.' },
        covers: ['sq-like', 'sq-like-p', 'sq-near', 'sq-far'] },
      { k: 'state', at: ['#sq-state'], when: function () { return shown($('#sq-state')); }, e: '📍', h: 'The members for your state',
        p: 'If you vote in the US, pick your state and see your senators and representatives, each with how close they are to you.',
        fa: { h: 'اعضای ایالت شما', p: 'اگه تو آمریکا رأی می‌دید، ایالت‌تون رو انتخاب کنید و سناتورها و نماینده‌هاتون رو ببینید، هر کدوم با اینکه چقدر بهتون نزدیکن.' },
        covers: ['.sq-st', 'sq-state', 'sq-mine'] },
      { k: 'send', at: ['#sq-res .sq-send'], when: function () { return shown($('#sq-res .sq-send')); }, e: '📨', h: 'Send the questions',
        p: 'Send the questions to a friend. They get the questions, never your answers.',
        fa: { h: 'سؤال‌ها رو بفرستید', p: 'سؤال‌ها رو برای یه دوست بفرستید. فقط سؤال‌ها بهش می‌رسه، جواب‌های شما هیچ‌وقت.' },
        covers: ['.sq-send', '.btn'] }
    ]
  };
  var YOU_LP = TOOLS.you;
  Object.defineProperty(TOOLS, 'you', { enumerable: true, configurable: true, get: function () { return D.getElementById('sq-cfg') ? YOU_IU : YOU_LP; } });

  // The Conflict Simulator's Iran theatre since 4 November 2026 (fifth rebuild): the explorer and simulator on one zoomable map
  // (build/conflict.py, conflict.js; its section keeps the ids #wargame / #scenarios, so its doors keep the name "wargame"). On a
  // page that carries #cf-app, "wargame" is this tour; Ukraine and Taiwan still run wargame.js and keep the one above. v6: the
  // whole tour is new to everyone who took the flat board's (v5).
  var tabIs = function (t) { return function () { var a = $('#cf-app'); return !!a && a.getAttribute('data-tab') === t; }; };
  var CF = {
    name: 'Conflict Simulator', fa: 'سناریوها', root: '#cf-app', ready: '#cf-app .cf-map .cf-mk', v: 6,
    surf: ['#cf-app .cf-bar > *', '#cf-app .cf-tabs > *', '#cf-app .cf-zoom > *', '#cf-app .cf-layers > *', '#cf-app .cf-ab > *', '#cf-app .cf-presets > *',
      '#cf-go', '#cf-app .cf-simform .cf-tog', '#cf-app .cf-simform input', '#cf-app .cf-ctl > *', '#cf-app .cf-days > *', '#cf-app .cf-ra > *'],
    skip: { '.lpt-doors': 'the tour and stream doors themselves' },
    steps: [
      { k: 'map', at: ['#cf-app .cf-map'], e: '🗺️', v: 6, h: 'Every force on one map',
        p: 'Drag to move, pinch or scroll to zoom, or use + and −. Each round mark is a carrier, a base, a missile city, a nuclear site. A number means several close together: tap it to zoom in.',
        fa: { h: 'همهٔ نیروها روی یه نقشه', p: 'بکشید تا جابه‌جا بشه، با دو انگشت یا اسکرول بزرگ و کوچیک کنید، یا با + و −. هر علامت گرد یه ناو هواپیمابر، یه پایگاه، یه شهر موشکی یا یه سایت هسته‌ایه. عدد یعنی چندتا نزدیک هم: بزنید تا بزرگ بشه.' },
        covers: ['.cf-zoom', 'button'] },
      { k: 'card', at: ['#cf-app .cf-map .cf-mk[data-id]:not([hidden])', '#cf-app .cf-map'], e: '👆', v: 6, h: 'Tap anything',
        p: 'A card opens with a drawing, the key specs, what it means in a conflict, the ships or jets in its group, and its sources with the date it was last publicly reported.',
        fa: { h: 'روی هر چیزی بزنید', p: 'یه کارت باز می‌شه با یه تصویر، مشخصات اصلی، اینکه تو یه درگیری چه معنایی داره، کشتی‌ها یا جت‌های گروهش، و منبع‌هاش با تاریخ آخرین گزارش عمومی.' },
        covers: [] },
      { k: 'layers', at: ['#cf-app .cf-layers'], e: '🧩', v: 6, h: 'Layers and sides',
        p: 'Switch whole kinds on and off: carriers, bases, missile cities, nuclear sites, oil. Or show one side only. All and None reset them.',
        fa: { h: 'لایه‌ها و طرف‌ها', p: 'یه دسته رو کامل روشن یا خاموش کنید: ناوها، پایگاه‌ها، شهرهای موشکی، سایت‌های هسته‌ای، نفت. یا فقط یه طرف رو نشون بدید. «همه» و «هیچ‌کدوم» برشون می‌گردونن.' },
        covers: ['.cf-layers', '.cf-ab', '.cf-tight'] },
      { k: 'search', at: ['#cf-app .cf-search'], e: '🔎', v: 6, h: 'Search',
        p: 'Type a ship, a base, a missile or a system: Fordow, Arrow, Nimitz. Pick a result to open its card.',
        fa: { h: 'جستجو', p: 'اسم یه کشتی، یه پایگاه، یه موشک یا یه سامانه رو بنویسید: فردو، پیکان، نیمیتز. یه نتیجه رو انتخاب کنید تا کارتش باز بشه.' },
        covers: ['.cf-search'] },
      { k: 'tabs', at: ['#cf-app .cf-tabs'], e: '🧭', v: 6, h: 'Map, All units, Simulate',
        p: 'All units lists everything, the aircraft, missiles and interceptors too. Simulate runs your own round.',
        fa: { h: 'نقشه، همهٔ نیروها، شبیه‌سازی', p: '«همهٔ نیروها» همه‌چی رو فهرست می‌کنه، هواپیماها، موشک‌ها و رهگیرها هم. «شبیه‌سازی» دور خودتون رو اجرا می‌کنه.' },
        covers: ['.cf-tabs', 'tab=*'] },
      { k: 'start', at: ['#cf-app .cf-presets'], when: tabIs('sim'), e: '⭐', v: 6, h: 'Set up the round',
        p: 'Start from a round, then move any slider: the salvo, the aim, the carriers and bombers, the targets, and how many interceptors each defence has. Each slider says where its number comes from.',
        fa: { h: 'دور رو بچینید', p: 'از یه دور شروع کنید، بعد هر نوار رو جابه‌جا کنید: شلیک، هدف، ناوها و بمب‌افکن‌ها، چی زده بشه، و هر پدافند چندتا رهگیر داره. هر نوار می‌گه عددش از کجا میاد.' },
        covers: ['preset=*', '.cf-tog', 'input'] },
      { k: 'run', at: ['#cf-go'], when: tabIs('sim'), opt: true, e: '🎲', v: 6, h: 'Run it',
        p: 'It runs your round 400 times with the uncertain numbers drawn from their ranges, then plays the most typical run on the map, day by day.',
        fa: { h: 'اجراش کنید', p: 'دورتون رو ۴۰۰ بار اجرا می‌کنه، هر بار عددهای نامطمئن رو از بازه‌شون برمی‌داره، بعد معمولی‌ترین اجرا رو روز به روز روی نقشه نشون می‌ده.' },
        covers: ['cf-go'] },
      { k: 'play', at: ['#cf-app .cf-simbar'], when: tabIs('sim'), opt: true, e: '▶️', v: 6, h: 'Day by day, then the score',
        p: 'Red arcs are missiles, white dots interceptions, red dots hits; blue arcs are US and Israeli strikes. The bars show each defence\'s stock left. The panel gives the score and what happened, and why.',
        fa: { h: 'روز به روز، بعد نمره', p: 'کمان‌های قرمز موشک‌ان، نقطه‌های سفید رهگیری، نقطه‌های قرمز اصابت؛ کمان‌های آبی حمله‌های آمریکا و اسرائیل‌ان. نوارها نشون می‌دن هر پدافند چقدر رهگیر براش مونده. پنل نمره رو می‌ده و اینکه چی شد و چرا.' },
        covers: ['.cf-ctl', '.cf-days', '.cf-ra', '.cf-btn'] }
    ]
  };
  var WG_3D = TOOLS.wargame;
  Object.defineProperty(TOOLS, 'wargame', { enumerable: true, configurable: true, get: function () { return D.getElementById('cf-app') ? CF : WG_3D; } });

  // Iran Uncensored's election tools (6 November 2026; ../site-iu/build/elections.py and markets_iu.py). Their doors carry the
  // ids of the tools register (data-lpt="midterms", "israel", "markets"), so on a page that carries #ue-cfg, #il-data or #mk-iu
  // that name is this site's own tour; everywhere else it is Liberty Politics' one above. Every step has its spoken Persian.
  var UE_IU = {
    name: 'The US election and the regime', fa: 'انتخابات آمریکا و رژیم', root: '#ue', ready: '#ue.is-live', v: 1,
    surf: ['#ue-f > *', '#ue-top > *'],
    skip: { '.vh': 'the name of the box beside it' },
    steps: [
      { k: 'top', at: ['#ue-top'], e: '🧭', h: 'The answer first',
        p: 'Who of the members of Congress I score is behind in the count, how many newcomers lead their race and where they stand on the regime, and who is leaving Congress.',
        fa: { h: 'اول جواب', p: 'کدوم عضوهای کنگره که بهشون نمره می‌دم تو شمارش عقبن، چند تا تازه‌وارد تو رقابتشون جلوترن و دربارهٔ رژیم کجا وایسادن، و کیا از کنگره می‌رن.' },
        covers: ['.ue-box'] },
      { k: 'chamber', at: ['#ue-chs'], e: '🏛️', h: 'Senate or House',
        p: 'Tap Senate or House to see only those races, or All for both.',
        fa: { h: 'سنا یا مجلس نمایندگان', p: 'روی «سنا» یا «مجلس نمایندگان» بزنید تا فقط اون رقابت‌ها رو ببینید، یا «همه» برای هر دو.' },
        covers: ['ue-chs'] },
      { k: 'state', at: ['#ue-st'], e: '📍', h: 'Your state',
        p: 'Pick a state and its Senate race and every House seat open by themselves.',
        fa: { h: 'ایالت شما', p: 'یه ایالت رو انتخاب کنید تا رقابت سنا و همهٔ کرسی‌های مجلس نمایندگانش خودشون باز بشن.' },
        covers: ['ue-st'] },
      { k: 'find', at: ['#ue-q'], e: '🔎', h: 'Find a name',
        p: 'Type a candidate’s name. The line under it says how many races are shown.',
        fa: { h: 'یه اسم پیدا کنید', p: 'اسم یه نامزد رو بنویسید. خط زیرش می‌گه چند تا رقابت نشون داده شده.' },
        covers: ['ue-q', 'ue-n'] },
      { k: 'race', at: ['#ue-sen .ue-r:not([hidden])', '#ue .ue-r'], e: '🗳️', h: 'Read a race',
        p: 'Each candidate shows their share of the official count, and what they do about the regime: a member of Congress their score out of 100, anyone else the lines on the record, each with its source.',
        fa: { h: 'یه رقابت رو بخونید', p: 'کنار هر نامزد سهمش از شمارش رسمیه، و اینکه با رژیم چی کار می‌کنه: عضو کنگره نمره‌ش از ۱۰۰، بقیه حرف‌های ثبت‌شده‌شون، هر کدوم با منبعش.' },
        covers: [] }
    ]
  };
  var IL_IU = {
    name: 'Build Israel’s next government', fa: 'دولت بعدی اسرائیل رو بسازید', root: '#il', ready: '#il.is-live', v: 1,
    surf: ['#il-stage > *', '#il-tools > *', '#il-pres .il-pre-row > *', '#il .il-side > *', '#il-ways-box > *'],
    skip: { '.il-sub': 'a heading', '.dim': 'the line under a heading' },
    steps: [
      { k: 'chamber', at: ['#il .il-chamber'], e: '🏛️', h: 'The Knesset',
        p: function () { return 'Each dot is one seat. The number counts the seats of the government you build; the bar fills to the line it needs.'; },
        fa: { h: 'کنست', p: 'هر نقطه یه کرسیه. عدد وسط کرسی‌های دولتی که می‌سازید رو می‌شمره؛ نوار تا خطی که لازمه پر می‌شه.' },
        covers: ['.il-chamber', '.il-bar'] },
      { k: 'parties', at: ['#il-list'], e: '👆', h: 'Tap parties to build it',
        p: 'Tap a party to put it in the government. Tap Outside for a party that keeps it alive without joining it.',
        fa: { h: 'روی حزب‌ها بزنید', p: 'روی یه حزب بزنید تا بره تو دولت. «از بیرون» برای حزبیه که دولت رو سر پا نگه می‌داره ولی واردش نمی‌شه.' },
        covers: ['il-list'] },
      { k: 'presets', at: ['#il-pres'], e: '⚡', h: 'Or start from a plan',
        p: 'Each button builds a government people are talking about.',
        fa: { h: 'یا از یه برنامه شروع کنید', p: 'هر دکمه یه دولتی رو می‌سازه که مردم دربارهٔ‌ش حرف می‌زنن.', act: 'نشونم بده' },
        act: { label: 'Show me', run: function () { click('#il .il-pre'); } },
        covers: ['il-pres', 'pre=*'] },
      { k: 'say', at: ['#il-say'], e: '💬', h: 'What you built',
        p: 'This says whether your government has a majority and who would be prime minister. A red line it breaks shows under it, with its source.',
        fa: { h: 'چیزی که ساختید', p: 'اینجا می‌گه دولت‌تون اکثریت داره یا نه و کی نخست‌وزیر می‌شه. اگه یه خط قرمز رو بشکنه، زیرش با منبعش نشون داده می‌شه.' },
        covers: ['il-say', 'il-warn', 'il-tools', 'il-reset'] },
      { k: 'ways', at: ['#il-ways-box'], e: '🧮', h: 'Every way to a majority',
        p: 'Every government that reaches the majority with no party it could do without, the fewest broken red lines first. Tap one to try it.',
        fa: { h: 'همهٔ راه‌ها به اکثریت', p: 'همهٔ دولت‌هایی که به اکثریت می‌رسن و هیچ حزب اضافه‌ای ندارن، اونایی که کمتر خط قرمز می‌شکنن اول. روی هر کدوم بزنید تا امتحانش کنید.' },
        covers: ['il-ways-h', 'il-ways'] },
      { k: 'said', at: ['#il-said'], opt: true, e: '📜', h: 'Who will govern with whom',
        p: 'Open this to read what each leader has said about the others, with the source.',
        fa: { h: 'کی با کی دولت تشکیل می‌ده', p: 'اینو باز کنید تا ببینید هر رهبر دربارهٔ بقیه چی گفته، با منبعش.' },
        covers: [] }
    ]
  };
  var MK_IU = {
    name: 'Beat the Markets', fa: 'از بازار جلو بزنید', root: '#mk-iu', ready: '#mk-iu.is-live', v: 1,
    surf: ['#mk-iu .field .wrap > *', '#mk-f > *', '#mk-rec > *'],
    skip: { '.ue-k': 'the way back to the elections page', 'h1': 'the title', '.sub': 'the line under the title', 'h2': 'a heading', '.dim': 'the line under the number' },
    steps: [
      { k: 'score', at: ['#mk-how'], e: '🧮', h: 'How a call scores',
        p: 'Back a long shot and it comes in: big points. Back the favorite: small points. Miss, and you lose what the market thought it was worth.',
        fa: { h: 'هر پیش‌بینی چطور امتیاز می‌گیره', p: 'روی یه احتمال کم بذارید و درست دربیاد: امتیاز زیاد. روی گزینهٔ محبوب بذارید: امتیاز کم. اشتباه باشه، به اندازهٔ احتمالی که بازار داده بود امتیاز از دست می‌دید.' },
        covers: ['mk-how'] },
      { k: 'safe', at: ['#mk-safe'], e: '🔒', h: 'Your calls stay with you',
        p: 'Every call is kept in this browser on this device. No account, and nothing is sent to anyone.',
        fa: { h: 'پیش‌بینی‌هاتون پیش خودتون می‌مونه', p: 'هر پیش‌بینی فقط تو همین مرورگر و رو همین دستگاه نگه داشته می‌شه. نه حسابی لازمه، نه چیزی برای کسی فرستاده می‌شه.' },
        covers: ['mk-safe'] },
      { k: 'tabs', at: ['#mk-f'], e: '🗂️', h: 'The regime, Washington, or yours',
        p: 'Tap a tab to see only the regime’s markets, Washington’s, or the ones you called.',
        fa: { h: 'رژیم، واشنگتن یا مال شما', p: 'روی یه دکمه بزنید تا فقط بازارهای رژیم، واشنگتن یا اونایی که پیش‌بینی کردید رو ببینید.' },
        covers: ['.mk-tab'] },
      { k: 'call', at: ['#mk-list .mk-c:not([hidden])'], e: '🎯', h: 'Make your call',
        p: 'Tap an option to make it your call; the shaded bar is what the market says. Tap it again to take it back. The link opens the market on its own site.',
        fa: { h: 'پیش‌بینی کنید', p: 'روی یه گزینه بزنید تا پیش‌بینی‌تون بشه؛ نوار رنگی چیزیه که بازار می‌گه. دوباره بزنید تا پسش بگیرید. لینک، بازار رو تو سایت خودش باز می‌کنه.' },
        covers: [] },
      { k: 'record', at: ['#mk-rec'], e: '🏆', h: 'Your record',
        p: 'Come back after a market closes to see your points. Clear my calls wipes everything you called from this browser.',
        fa: { h: 'کارنامهٔ شما', p: 'وقتی یه بازار بسته شد برگردید تا امتیازتون رو ببینید. «پیش‌بینی‌هام رو پاک کن» همه‌چی رو از این مرورگر پاک می‌کنه.' },
        covers: ['mk-pts', 'mk-rec-s', 'mk-rec-l', 'mk-clear'] }
    ]
  };
  var MT_LP = TOOLS.midterms, MK_LP = TOOLS.markets;
  Object.defineProperty(TOOLS, 'midterms', { enumerable: true, configurable: true, get: function () { return D.getElementById('ue-cfg') ? UE_IU : MT_LP; } });
  Object.defineProperty(TOOLS, 'markets', { enumerable: true, configurable: true, get: function () { return D.getElementById('mk-iu') ? MK_IU : MK_LP; } });
  TOOLS.israel = IL_IU;

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
  var DATA = ['data-v', 'data-f', 'data-pre', 'data-mood', 'data-lens', 'data-lv', 'data-replay', 'data-step', 'data-force', 'data-unit', 'data-preset', 'data-tgmove', 'data-tgon', 'data-brief', 'data-goal', 'data-load', 'data-drop', 'data-seat', 'data-pm', 'data-mode', 'data-tk', 'data-tab'];      // the Conflict Simulator's own since 1 November 2026
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
        if (s.act && !actT) { s.act.run(); requestAnimationFrame(function () { again(s); }); actT = setTimeout(function () { actT = 0; if (list) { if (last()) end(); else go(at + 1, 1); } }, 200); }      // a second press while the first is still running is the same press (it once skipped a step)
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
  // A control cut off by a box that scrolls by itself (a panel's list scrolled past it) is inside the window and still
  // not seen, and scrolling the page cannot reach it: each such box around it is scrolled first, just enough (found
  // 1 November 2026: the Conflict Simulator's goal row sat above its panel's scrolled list at 1280px, "top 61 of 800").
  function inBox(el) {
    for (var a = el.parentElement; a && a !== D.body && a !== D.documentElement; a = a.parentElement) {
      if (!/auto|scroll/.test(W.getComputedStyle(a).overflowY) || a.scrollHeight <= a.clientHeight + 1) continue;
      var b = el.getBoundingClientRect(), c = a.getBoundingClientRect(), ct = c.top + a.clientTop, cb = ct + a.clientHeight;
      if (b.top < ct) a.scrollTop -= ct - b.top + 8;
      else if (b.bottom > cb) a.scrollTop += Math.max(0, Math.min(b.bottom - cb + 8, b.top - ct - 8));
    }
  }
  function bring(els) {
    inBox(els[0]);
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
  // after a "Show me": what it opened is what the step points at now (the Conflict Simulator's Replay list, drawn by its
  // own Show me, 1 November 2026), so it is brought onto the screen and lit while the step is still showing. A slide the
  // Show me started inside the tool (a phone panel growing from low to half: its top, and the controls on it, move up
  // 65px over a quarter second) is ended at once first, so the spotlight lands where the control stops, not where it was.
  function again(s) {
    if (!list || list[at] !== s) return;
    var R = $(TOOLS[tool].root);
    if (R && R.getAnimations && W.CSSTransition) R.getAnimations({ subtree: true }).forEach(function (a) { if (a instanceof W.CSSTransition) { try { a.finish(); } catch (e) { } } });
    var els = targets(s); if (els.length) bring(els); placeNow();
  }
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
