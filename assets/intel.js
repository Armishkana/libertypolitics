/* The Intel Room (intel/). Everything the page does: three lenses on one map (the last 24 hours, the bank, what readers
   sent and is not checked yet), the map (drag, pinch, scroll and the buttons zoom it), the circles (one per place, merged
   when they would touch; the last 24 hours pulse, hotter ones faster), the timeline (the bank only: two handles, four
   presets, play), the topics, the place, the kind, top picks, explainers, saved views, the list, the spotlight (one item,
   big, with arrows to the next and a way to say it is weak), the ask box, adding a find (a mission report, see intel.py),
   copy notes, the tour and full screen. Data: data/intel.json (build/intel_data.py), data/intel-live.json
   (build/intel_live.py), data/intel-reach.json (build/intel_reach.py: each item's likes, views and replies on its own
   platform), the readers' finds over plain REST. Words: build/intel.py and this file. Nothing is sent anywhere except a
   find the reader sends, through community.js.

   16 October 2026 (Armin: "It needs to look like a CIA-like intelligence hub but without violating the theme and brand ...
   Significantly improve the map ... data point in different shapes and maybe colors based on what they are ... screen
   based on social media ... how many likes each one of these has ... sort and screen them based on how hot they are, how
   viral they are, the time, location, topic"): the map is a globe (d3-geo, assets/intel-geo.js?v=1bec8431b4) that also lays flat, with
   the real night side; a mark's SHAPE says what it is (video, post, article, document) and its COLOUR where it was posted
   (PF below); places with few items show every item, crowded ones a count with a ring split by platform. Platform, heat,
   viral and the hours of the last 24 are filters; viral, likes and views are orders. VIRAL is measured, never guessed:
   where an item's like count (views on Telegram) ranks among the items of the same platform in the room, 0 to 100. */
(function () {
  'use strict';
  var root = document.getElementById('ir');
  if (!root || !window.fetch) return;
  var $ = function (id) { return document.getElementById(id); };
  var SVGNS = 'http://www.w3.org/2000/svg';
  /* ONE ENGINE, TWO ROOMS (19 October 2026). Liberty Politics' room (intel/) carries no #ir-cfg and runs exactly as it always
     did. Iran Uncensored's (news/, build/news.py of that site) hands this file a config in <script type="application/json"
     id="ir-cfg">: its words (t: English sentence -> its Persian, the key is the English as written here), its topics,
     regions, places and actors, the map's first view, the feed's shape, the regime's servers, the clock and what may load
     before a tap. Every visible sentence here goes through T(), every number a reader sees through N() or LN(); with no
     config both give back exactly what they are handed, so an improvement made here reaches both rooms. A sentence added
     here without T() shows in English on the Persian page: site-iu/build/news.py lists every T('...') key and stops the
     Iran build while one has no Persian. */
  var CFG = (function () { var el = document.getElementById('ir-cfg'); if (!el) return {}; try { var c = JSON.parse(el.textContent); return c && typeof c === 'object' ? c : {}; } catch (e) { return {}; } })();
  var TT = CFG.t && typeof CFG.t === 'object' ? CFG.t : null, FA = CFG.lang === 'fa';
  function T(s, v) {
    var r = TT && typeof TT[s] === 'string' ? TT[s] : s;
    if (v) Object.keys(v).forEach(function (k) { r = r.split('{' + k + '}').join(String(v[k])); });
    return r;
  }
  // N() and LN() go straight into innerHTML, and a saved item can be written by anyone (24 Oct 2026): a number is drawn as a
  // number (anything else is 0), and a string the room formatted itself ("50+", "1:23", "2026-10") is escaped first.
  function N(n) {
    var s = typeof n === 'string' ? esc(n) : String(n != null && isFinite(+n) ? +n : 0);
    // one thousands mark on the Persian page: "2,165" written anywhere becomes ۲٬۱۶۵, as LN() writes it
    return FA ? s.replace(/(\d),(?=\d{3}(?!\d))/g, '$1٬').replace(/\d/g, function (d) { return '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9'.charAt(+d); }).replace(/\./g, '\u066B') : s;
  }
  function LN(n) { n = n != null && isFinite(+n) ? +n : 0; return FA ? N(n.toLocaleString('en-US').replace(/,/g, '\u066C')) : n.toLocaleString('en-US'); }
  // a picture's address as CSS: url("...") with its quotes, backslashes and line breaks made harmless. Inside a style="..."
  // attribute it still goes through esc(), so its own quotes reach the CSS as quotes.
  function cssUrl(u) { return 'url("' + String(u == null ? '' : u).replace(/[\\"]/g, '\\$&').replace(/[\n\r\f]/g, ' ') + '")'; }
  function rxOf(a, i) { try { return new RegExp(a[i], a[i + 1] || ''); } catch (e) { return /(?!)/; } }          // a pattern handed as [source, flags]
  function cName(c) { return CFG.countries && CFG.countries[c] || c; }          // a country as this page names it
  var GOLD = CFG.gold || '244,196,48', GOLDH = CFG.goldHex || '#F4C430';          // the room's gold on the canvas (Iran Uncensored: its sun gold)
  var DA = CFG.dirAuto ? ' dir="auto"' : '';          // a headline in either language runs its own way
  function bd(h) { return DA ? '<bdi>' + h + '</bdi>' : h; }
  // an X handle (@name) always runs left to right: on the Persian page it read "KobeissiLetter@" (24 Oct 2026)
  // an @handle kept left to right inside a Persian line ("@Alighazizade", never "Alighazizade@"); an English page needs no wrapper
  function handle(h) { return CFG.rtl ? '<bdi class="ir-h" dir="ltr">' + esc(h) + '</bdi>' : esc(h); }
  function dh(h) { return DA ? '<span dir="auto">' + h + '</span>' : h; }          // a run of the outlet's own words inside a line          // an outlet's name in the other language, kept whole inside a line
  /* THE REGIME RULE (Iran Uncensored only: CFG.regime is the pipeline's DENY_DIRECT, ../../site/build/test_news_site.py keeps
     the copies equal). An item from regime media or a server in Iran is shown, marked, and NEVER linked or fetched from:
     opening it would show the regime's servers who is reading. Liberty Politics hands no list, so nothing is ever one. */
  var REGIME = Array.isArray(CFG.regime) ? CFG.regime : null;
  function regimeHost(h) {
    if (!REGIME || !h) return false;
    h = String(h).toLowerCase().replace(/\.$/, '');
    if (h === 'ir' || /\.ir$/.test(h) || /\.xn--mgba3a4f16a$/.test(h)) return true;
    for (var i = 0; i < REGIME.length; i++) if (h === REGIME[i] || h.slice(-REGIME[i].length - 1) === '.' + REGIME[i]) return true;
    return false;
  }
  function isRegime(it) {
    if (!REGIME || !it) return false;
    var m = /^https?:\/\/([^\/:?#\s]+)/i.exec(String(it.u || ''));
    return it.rg === 1 || regimeHost(m ? m[1] : '') || regimeHost(it.dm || '');
  }
  /* PICTURES ON, LIKE LIBERTY POLITICS (24 Oct 2026). Armin, with a picture of the Persian room showing initials and a globe
     where the faces and the posts' pictures should be: "You still are not putting the profile pictures and the pictures of
     the posts the way that we do it on LibertyPolitics. I asked you to fix this, and you didn't." From 18 to 24 October
     the Persian page (CFG.light) loaded nothing from another site until the reader tapped Pictures: a safety rule written
     here, never asked for by him, which every later "show the faces" change kept, so none of them ever showed. Now every
     page loads them as Liberty Politics does. CFG.light keeps only the reader's own switch (Views and tools): a reader on a
     slow or watched connection can turn pictures OFF for this device, and the room then draws the place instead. */
  var picsOn = !CFG.light || (function () { try { return localStorage.getItem('ir-pics') !== 'off'; } catch (e) { return true; } })();
  function pics() { return picsOn; }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONV = Array.isArray(CFG.months) && CFG.months.length === 12 ? CFG.months : MON;          // the months a reader sees (MON stays for reading what is typed)
  var FIRST = CFG.first || '2023-10';          // the timeline runs from the month of 7 October; anything older is one bar, "Earlier"
  var PAGE_N = 40;
  var MAXK = 400;          // deep enough that Gaza City, Khan Younis and Rafah come apart
  var TOUR_MS = 12000;
  // Where an item was posted: the key, the name a reader sees, the colour of its marks. The platforms' own colours, toned
  // to sit on the room's black; News is the brand's gold and a website the seal's pale gold, so the chrome stays gold.
  var PF = [['X', T('X'), '#ECEAE3'], ['YouTube', T('YouTube'), '#FF5348'], ['Telegram', T('Telegram'), '#3FAEEA'], ['Instagram', T('Instagram'), '#E8467F'],
    ['Facebook', T('Facebook'), '#5F8BF2'], ['Threads', T('Threads'), '#A88DFF'], ['TikTok', T('TikTok'), '#32E3DC'], ['News', T('News'), CFG.goldHex || GOLDH],
    ['Web', T('Websites'), '#D9C68C'], ['Document', T('Documents'), '#D08A3C'], ['Other', T('Other video'), '#8FC955']];
  var PFC = {}; PF.forEach(function (p) { PFC[p[0]] = p; });
  // What it is: one shape per kind, drawn about 0,0 (the list's thumbnails carry the same mark)
  var SHAPE = { video: 'M-5 -6.2 6.8 0-5 6.2z', post: 'M0 -7 7 0 0 7-7 0z', article: 'M-5.4 -5.4h10.8v10.8h-10.8z', doc: 'M0 -6.8 5.9 -3.4v6.8L0 6.8-5.9 3.4v-6.8z' };
  var KIND_N = { video: T('Video'), post: T('Post'), article: T('Article'), doc: T('Document') };
  var HIDES = { Instagram: 1, Facebook: 1, Threads: 1, TikTok: 1 };          // no public like count without a login: never guessed
  var MISSION = CFG.mission || { find: 'send-intel', mine: 'send-your-own' };          // Iran Uncensored: one mission, send-news, and no "I made it" 
  var XP = { find: +root.getAttribute('data-xp-find') || 40, mine: +root.getAttribute('data-xp-own') || 90 };
  // The map's own country names for the places' countries, where the two differ.
  var TOPO = { 'Gaza': 'Palestine', 'West Bank': 'Palestine', 'United States': 'United States of America' };
  var KINDS = [['', T('All')], ['video', T('Videos')], ['post', T('Posts')], ['article', T('Articles')], ['doc', T('Documents and data')]];
  var LENS = { live: T('Last 24 hours'), bank: T('The bank'), readers: T('From readers') };
  // Each lens's orders; viral, likes and views stay only where the lens has a measured number (trimmed after loading).
  var SORTS = { live: [['hot', T('Hottest first')], ['new', T('Newest first')], ['viral', T('Most viral')], ['likes', T('Most liked')], ['views', T('Most viewed')]],
    bank: [['new', T('Newest first')], ['old', T('Oldest first')], ['top', T('Top picks first')], ['viral', T('Most viral')], ['likes', T('Most liked')], ['views', T('Most viewed')]], readers: [['new', T('Newest first')]] };
  var HEATS = [[0, T('Any heat')], [40, T('Warm 40+')], [70, T('Hot 70+')], [90, T('On fire 90+')]];
  var VIRALS = [[0, T('Any reach')], [50, T('Top half')], [75, T('Top quarter')], [90, T('Top 10%')]];
  var WITHIN = [[0, T('24 hours')], [12, T('12 h')], [6, T('6 h')], [3, T('3 h')], [1, T('1 h')]];
  // How credible the SOURCE is, 0 to 100, from the room's own table (intel_live.py for news and video, intel_x.py for X)
  var CREDS = [[0, T('Any source')], [50, N('50+')], [70, N('70+')], [85, N('85+')]];
  // A floor on the likes an item has on its own platform (views on Telegram do not count as likes).
  var LIKES = [[0, T('Any')], [100, N('100+')], [1000, T('1K+')], [10000, T('10K+')], [100000, T('100K+')]];
  /* FOCUS (Armin, 17 October 2026: "I should be able to filter it based on country or based on topic. If I wanted to
     focus on Islam, the Middle East, Iran, Israel, China, the United States"). One row of quick picks, for everyone, on
     every lens. A pick matches an item placed in one of its countries, or whose own headline names it. Several picks
     widen the view (Iran OR Israel). A pick nothing in the room matches stays on the row, greyed, so a reader can see
     the room does not cover it yet rather than wonder whether the button is missing. */
  var FOCUS = [
    ['me', 'Middle East', ['Israel', 'Gaza', 'West Bank', 'Lebanon', 'Syria', 'Egypt', 'Jordan', 'Iran', 'Iraq', 'Yemen', 'Qatar', 'Saudi Arabia', 'United Arab Emirates', 'Turkey', 'Bahrain', 'Kuwait', 'Oman'], /\b(middle east|mideast|persian gulf|arab (world|states|league))\b/i],
    ['iran', 'Iran', ['Iran'], /\b(iran\w*|tehran|irgc|khamenei|pezeshkian|araghchi|hormuz|pahlavi|mullahs?|ayatollah\w*|islamic republic)\b/i],
    ['israel', 'Israel', ['Israel'], /\b(israel\w*|idf|netanyahu|knesset|jerusalem|tel aviv|zionis\w*)\b/i],
    ['gaza', 'Gaza and Hamas', ['Gaza', 'West Bank'], /\b(gaza\w*|hamas|palestin\w*|west bank|rafah|unrwa)\b/i],
    ['lebanon', 'Lebanon', ['Lebanon'], /\b(leban\w*|hezbollah|beirut)\b/i],
    ['yemen', 'Yemen', ['Yemen'], /\b(yemen\w*|houthis?|red sea)\b/i],
    ['syria', 'Syria', ['Syria'], /\b(syria\w*|damascus|assad|druze)\b/i],
    ['us', 'United States', ['United States'], /\bU\.S\.|\b(USA|US|America|American|Americans|Trump|White House|Congress|Pentagon|Washington|Rubio|Vance|Hegseth|Democrats?|Democratic|Republicans?|GOP|Biden)\b/],
    ['canada', 'Canada', ['Canada'], /\b(Canada|Canadian\w*|Ottawa|Toronto|Carney|Poilievre|Trudeau)\b/],
    ['uk', 'United Kingdom', ['United Kingdom'], /\b(Britain|British|UK|England|English Channel|London|Starmer|Farage|Downing Street|Westminster|Scotland|Welsh|Wales)\b/],
    ['europe', 'Europe', ['United Kingdom', 'France', 'Germany', 'Sweden', 'Ireland', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Switzerland', 'Norway', 'Denmark', 'Poland', 'Austria', 'Hungary', 'Greece', 'Portugal', 'Finland'], /\b(Europe\w*|EU|Britain|British|UK|London|France|French|Paris|Macron|Germany|German|Berlin|Sweden|Swedish|Ireland|Irish|Spain|Italy|Italian|Meloni|Brussels|Geneva|Poland|Polish|Hungary|Orban|Netherlands|Dutch|Belgium|Austria|Greece|Greek)\b/],
    ['russia', 'Russia and Ukraine', ['Russia', 'Ukraine'], /\b(Russia\w*|Putin|Kremlin|Moscow|Ukrain\w*|Zelensk\w*|Kyiv)\b/],
    ['china', 'China and East Asia', ['China', 'Taiwan', 'Hong Kong', 'Japan', 'South Korea', 'North Korea'], /\b(China|Chinese|Beijing|Xi Jinping|Taiwan\w*|CCP|Hong Kong|Japan\w*|Tokyo|Korea\w*|Seoul|Pyongyang)\b/],
    ['asia', 'South Asia', ['India', 'Pakistan', 'Afghanistan', 'Bangladesh', 'Sri Lanka'], /\b(India|Indian|Modi|New Delhi|Pakistan\w*|Islamabad|Afghan\w*|Taliban|Kabul|Bangladesh\w*|Kashmir)\b/],
    ['africa', 'Africa', ['Nigeria', 'Sudan', 'South Africa', 'Ethiopia', 'Somalia', 'Libya', 'Kenya', 'Mali', 'Algeria', 'Morocco', 'Tunisia', 'Congo'], /\b(Africa\w*|Nigeria\w*|Sudan\w*|Ethiopia\w*|Somali\w*|Libya\w*|Kenya\w*|Sahel|Mali|Algeria\w*|Morocc\w*|Tunisia\w*|Congo\w*|Darfur)\b/],
    ['latam', 'Latin America', ['Mexico', 'Venezuela', 'Brazil', 'Argentina', 'Colombia', 'Cuba', 'Chile', 'Peru'], /\b(Mexic\w*|Venezuel\w*|Maduro|Brazil\w*|Lula|Argentin\w*|Milei|Colombia\w*|Cuba\w*|Havana|Chile\w*|Peru\w*|Latin America\w*)\b/]
  ];
  // Iran Uncensored's row is Iran's regions, the places abroad and the regime's neighbours: [key, name, [countries or place keys], source, flags]
  if (Array.isArray(CFG.focus)) FOCUS = CFG.focus.map(function (f) { return [f[0], f[1], f[2] || [], f[3] ? rxOf(f, 3) : /(?!)/]; });
  var FXI = {}, FXK = Array.isArray(CFG.focus); FOCUS.forEach(function (f, i) { FXI[f[0]] = i; });
  /* TOPICS (Armin, 18 October 2026: "the topics filter makes absolutely no sense ... you put the U.S. and Israel together as
     one topic ... topics could be war and military, Islam, Christianity, Judaism, or other religions, or religion as a whole,
     history, AI, tech, finance, economics, trade"). A topic is a SUBJECT, never a country: countries are the Region row.
     The old list was the bank's own evidence tags (data/intel.json topics), which still sit on each bank item and show in
     its spotlight; the filter works on these subjects instead, read from an item's own words (its headline, its note and,
     for a bank item, its bank tags through BANK_TP). [key, name, case-free pattern, case-kept pattern or null, group].
     An item can carry several. The religion group's own chip, "All religion", takes any of its four. */
  var TOPICS = [
    ['war', 'War and military', /\b(wars?|warfare|military|militar(y|ies)|army|armies|troops?|soldiers?|idf|irgc|navy|naval|air ?force|missiles?|drones?|air ?strikes?|strikes? on|bomb(s|ed|ing|ings|ers?)?|shelling|artillery|rockets?|ceasefire|invasion|invade\w*|offensive|front ?lines?|battle\w*|combat|fighter jets?|warships?|weapons?|ammunition|pentagon|nato|centcom|osint|mines? in|ballistic|intercept\w*|war ?games?|defen[cs]e minist\w*|hegseth)\b/i, null, ''],
    ['terror', 'Terror and extremism', /\b(terror\w*|jihad\w*|isis|islamic state|al-?qaeda|al-?shabaab|boko haram|hamas|hezbollah|houthis?|extremis\w*|radicali[sz]\w*|stabbings?|massacre\w*|hostages?|behead\w*|suicide bomb\w*|far-?right|neo-?nazi\w*|antifa)\b/i, null, ''],
    ['politics', 'Politics and elections', /\b(elections?|electoral|vot(e|es|ed|ers|ing)|ballots?|polls?|polling|campaign\w*|midterms?|primar(y|ies)|candidates?|parliament\w*|congress\w*|senat(e|or|ors)|democrats?|republicans?|gop|labou?r party|tories|tory|conservative party|coalition|prime minister|presiden(t|ts|cy|tial)|white house|governor|mayor|referendum|impeach\w*|subpoena\w*|cabinet|legislat\w*|filibuster|speaker of the house)\b/i, null, ''],
    ['protest', 'Protests and unrest', /\b(protest\w*|riot\w*|rall(y|ies)|demonstrat(ion|ions|ors)|unrest|uprising\w*|crackdown|no ?kings|nokings|clashes|looting|looters?|tear gas|burning (down|cars|the)|set (on )?fire|mobili[sz]ation|marchers|general strike)\b/i, null, ''],
    ['rights', 'Rights and free speech', /\b(human rights|free speech|freedom of (speech|expression|the press)|censor\w*|executions?|executed|hang(ed|ings)|death penalty|death sentence|political prisoners?|dissidents?|women'?s rights|hijab law|morality police|lgbt\w*|persecut\w*|tortur\w*|amnesty international|arrested for|jailed for|gag order|blasphemy laws?)\b/i, null, ''],
    ['immigration', 'Immigration and borders', /\b(immigra\w*|migrants?|migration|asylum|refugees?|border (crossing|patrol|wall|security)|borders|deport\w*|illegal aliens?|small boats?|channel crossings?|visas?|citizenship|mass migration|remigration)\b/i, null, ''],
    ['crime', 'Crime and justice', /\b(courts?|judges?|trials?|verdicts?|sentenced|convicted|indict\w*|lawsuits?|sued|prosecut\w*|police|policing|arrest(s|ed)?|murder\w*|homicide|crimes?|criminal\w*|fbi|doj|justice department|supreme court|ruling|grooming gangs?|gangs?|cartels?|shooting|shot dead)\b/i, null, ''],
    ['diplomacy', 'Diplomacy and the UN', /\b(diplomac\w*|diplomat\w*|peace talks|held talks|talks (with|between|in)|summit\w*|negotiat\w*|peace (deal|plan|talks|process)|envoys?|ambassadors?|foreign minist\w*|secretary of state|united nations|security council|general assembly|treat(y|ies)|accords?|normali[sz]ation|unrwa|icc|icj|nato summit)\b/i, /\bU\.?N\.?\b/, ''],
    ['economy', 'Economy', /\b(econom\w*|inflation|recession|gdp|unemployment|jobs report|interest rates?|central bank|federal reserve|budget\w*|deficit|national debt|taxes|tax (cuts?|hikes?)|cost of living|wages|minimum wage|housing (market|crisis)|currenc(y|ies)|devaluation|rial|poverty|growth forecast|subsid(y|ies))\b/i, null, ''],
    ['finance', 'Finance and markets', /\b(stocks?|stock market|markets? (fell|rose|crash\w*|rall\w*)|wall street|s&p|dow jones|nasdaq|bonds?|treasur(y|ies) yields?|yields|investors?|shares (fell|rose)|crypto\w*|bitcoin|ethereum|banking|bank (runs?|collapse|failures?)|central banks?|hedge funds?|ipo|earnings|gold price|oil prices?|brent|futures|billionaires?|bankrupt\w*)\b/i, null, ''],
    ['trade', 'Trade and sanctions', /\b(trade|trading partners?|tariffs?|sanction\w*|exports?|imports?|embargo\w*|supply chains?|shipping (lanes?|routes?)|wto|free trade|customs dut\w*|smuggl\w*)\b/i, null, ''],
    ['energy', 'Energy and oil', /\b(oil|natural gas|gas (prices?|fields?|supply)|lng|opec\w*|pipelines?|energy|refiner(y|ies)|tankers?|hormuz|crude|petrol|gasoline|power (grid|plants?|cuts?)|electricity|blackouts?|renewables?|solar|wind farms?)\b/i, null, ''],
    ['nuclear', 'Nuclear', /\b(nuclear|uranium|enrich\w*|iaea|atomic|warheads?|centrifuges?|fordow|natanz|isfahan site|non-?proliferation|snapback)\b/i, null, ''],
    ['ai', 'AI', /\b(artificial intelligence|openai|chatgpt|gpt-?\d\w*|grok|anthropic|llms?|large language models?|chatbots?|deep ?fakes?|machine learning|neural networks?|nvidia|data cent(er|re)s?|superintelligence)\b/i, /\b(AI|A\.I\.|AGI)\b/, ''],
    ['tech', 'Tech and the internet', /\b(tech|technolog\w*|cyber\w*|hack(s|ed|ers?|ing)?|semiconductors?|microchips?|chipmakers?|silicon valley|starlink|spacex|satellites?|internet|social media|smartphones?|software|data breach\w*|surveillance|spyware|big tech|algorithm\w*|tiktok ban|x\.com|twitter|meta|google|apple|microsoft|musk)\b/i, null, ''],
    ['media', 'Media and propaganda', /\b(media|journalis\w*|reporters?|newspapers?|propaganda|disinformation|misinformation|fake news|bbc|cnn|fox news|new york times|nyt|al ?jazeera|msnbc|state tv|press tv|fact.?check\w*|biased|bias|narrative|cover-?up|pallywood|staged|blood libel\w*|debunk\w*|podcasts?|interview)\b/i, null, ''],
    ['history', 'History', /\b(histor\w*|anniversar\w*|years ago|centur(y|ies)|ancient|empire|ottoman|achaemenid|cyrus the great|1948|1967|1973|1979|world war|ww ?(i|ii|1|2)|cold war|holocaust|nakba|crusades?|colonial\w*|on this day)\b/i, null, ''],
    ['education', 'Campuses and schools', /\b(campus\w*|universit(y|ies)|colleges?|students?|schools?|teachers?|professors?|academi\w*|curricul\w*|harvard|columbia|ucla|oxford|cambridge|children's books?)\b/i, null, ''],
    ['health', 'Health', /\b(health\w*|hospitals?|vaccin\w*|diseases?|virus\w*|pandemic|outbreak\w*|cancer|medic(al|ine|ines)|doctors?|nhs|famine|starv\w*|malnutrition|cholera|epidemic)\b/i, null, ''],
    ['islam', 'Islam', /\b(islam\w*|muslims?|mosques?|imams?|sharia|quran\w*|koran|caliphat\w*|halal|hijabs?|burqas?|niqabs?|ramadan|mullahs?|ayatollah\w*|allah|prophet muhammad|madrass?as?|fatwas?|salafi\w*|wahhabi\w*|sunnis?|shi'?(a|as|ite|ites))\b/i, null, 'rel'],
    ['christian', 'Christianity', /\b(christian\w*|church(es)?|pope|papal|vatican|catholic\w*|protestant\w*|evangelical\w*|bibles?|biblical|jesus|christ|priests?|pastors?|bishops?|archbishop|orthodox church|coptic|copts|maronite\w*|assyrian christians?)\b/i, null, 'rel'],
    ['jewish', 'Judaism and antisemitism', /\b(jews?|jewish|judaism|synagogues?|rabbis?|anti-?semit\w*|holocaust|zionis\w*|torah|kosher|shabbat|yom kippur|hanukkah|passover)\b/i, null, 'rel'],
    ['faith', 'Other faiths and secularism', /\b(religio(n|ns|us)|hindu\w*|sikh\w*|buddhis\w*|atheis\w*|secular\w*|apostat\w*|ex-?muslims?|blasphem\w*|baha'?i\w*|zoroastr\w*|yazidi\w*|druze|faith|theocra\w*|god\b|gods\b|temples?)\b/i, null, 'rel']
  ];
  // Iran Uncensored's topics are the regime's pulse (its data/news-sources.json, the same patterns the feed is tagged with):
  // [key, name, source, flags]. No religion group there.
  if (Array.isArray(CFG.topics)) TOPICS = CFG.topics.map(function (t) { return [t[0], t[1], rxOf(t, 2), null, '']; });
  var TOPN = {}; TOPICS.forEach(function (t) { TOPN[t[0]] = t; });
  var REL_KEYS = CFG.topics ? [] : ['islam', 'christian', 'jewish', 'faith'];
  // The bank's own evidence tags, as subjects (a bank item gets these as well as what its words say)
  var BANK_TP = { 'Hamas': ['terror', 'war'], 'The genocide claim': ['war', 'media'], 'The famine claim': ['health', 'media'], 'Media bias': ['media'], 'UN, NGOs and elites': ['diplomacy'],
    'Blood libels debunked': ['media', 'jewish'], 'Propaganda networks': ['media'], 'Staged footage': ['media'], 'History': ['history'], 'Radical Islam': ['islam', 'terror'], 'Child fighters': ['war', 'terror'],
    'Journalists': ['media'], 'Israel and the US': ['diplomacy'], 'Double standards': ['media'], 'Qatar': ['diplomacy'], 'Campuses': ['education'], 'Far-right extremism': ['terror'],
    'Anti-Israel Jewish voices': ['jewish'], 'Israeli quotes in context': ['media'] };
  if (CFG.bankTp) BANK_TP = CFG.bankTp;
  var HOT_MIN = 50, HOT_TOP = 6;          // "Hot topics": every story at 50+ heat; its row of sub-topics: the six hottest

  var D, BANK = [], LIVE = [], RD = [], LIVE_AT = 0, items = [], P, topics, buckets = [], REACH = {}, REACH_AT = 0;
  var PACKS = null, WORDS = null, HOTS = [], HOTALL = {}, STORY_OF = {}, RHOOK = [];
  /* EVERY TRENDING STORY IS A SHOW (23 Oct 2026, Armin on a chip that opened 3 items: "How could somebody create a show
     that is three hours with three items?"). data/intel-deep.json (build/intel_deep.py, hourly) adds to each story what
     the room already holds on it (rel) and what a news and a YouTube search for it found (deep). Those found items live
     only inside their story: "Everything" stays the last 24 hours, a story's door opens on all of it. A story with fewer
     than SHOW_MIN items behind it is not offered on the Trending row while the deep file is fresh: it would be a door
     into an empty room. FACES: the same file names each YouTube channel's picture and each outlet's web address, so every
     card shows who posted it by its own face (WHO POSTED IT, below). */
  var DEEP = null, DEEP_FRESH = false, FACE_YT = {}, FACE_DOM = {}, SHOW_MIN = 20;
  var S = { lens: 'bank', q: '', tp: [], place: '', kind: '', top: false, edu: false, from: 0, to: 0, days: 0, sort: 'new', nowhere: false, pf: [], heat: 0, vmin: 0, within: 0, crmin: 0, fx: [], lmin: 0, hot: '', link: '', with: '', who: '', ext: {} };
  /* ADD-ONS (23 Oct 2026, the Forces layer, build/intel-forces.js, Liberty Politics only). An add-on loaded after the room
     is ready can draw its own marks over the map (LAYERS: draw, hit by position, hit by element, its tip, what a tap does),
     add a filter that lives in the address and has a pill like every other (EXT: key, test, label, valid), add a tab to the
     list (LTX) and add a block to the spotlight (SPOTX). Nothing here has words of its own, so the Iran room, which loads no
     add-on, is unchanged. An add-on that throws never breaks the room: every call into one is caught. */
  var LAYERS = [], EXT = {}, LTX = {}, SPOTX = [], RAWQ = null, BADGEX = [];
  /* FACETS: THE ROOM'S FILTER REGISTRY (24 Oct 2026, the filters build; Armin: no way to see only the news or only the
     commentary, and video filters with no length). Every filter dimension added from this day on is a row here, never a new
     S field: each is registered in EXT like an add-on's filter, so the address (?form=news&len=m), its pill, pass(), Clear
     all and the Filters button's count come with it, and window.IRoom.facets hands the same table to anything that reads
     plain words (the ask box reads each facet's ask rows: [pattern, value, what it says]). The fields come from
     build/intel_form.py in BOTH rooms' pipelines (intel_live.py for each feed, the deep passes): cat, which is news,
     analysis, educational or commentary, and dur, a video's seconds. A facet nothing in the lens carries is not drawn (the
     bank has neither). PRESETS below are named sets of these and the room's own filters. */
  var FACETS = {
    form: { key: 'form', name: T('News or commentary'), field: 'cat',
      opts: [['news', T('News reports'), T('What happened, as reported')], ['take', T('Commentary and analysis'), T('What people say about it')]],
      of: function (it) { return it.cat ? (it.cat === 'news' ? 'news' : 'take') : ''; },
      ask: [[/\b(commentar(y|ies)|commentators?|analysis|analy[sz]\w*|opinions?|takes?|reactions?|op-?eds?|hot takes?)\b/i, 'take', T('commentary and analysis')],
        [/\b(straight news|news reports?|reporting|just the news|news only|only news|breaking news|headlines)\b/i, 'news', T('news reports')],
        [/تحلیل|نظر|دیدگاه|واکنش|کامنتری/, 'take', T('commentary and analysis')], [/خبر فوری|فقط خبر|گزارش خبری|اخبار/, 'news', T('news reports')]] },
    len: { key: 'len', name: T('Video length'), field: 'dur', onlyKind: 'video',          // not drawn while another kind is picked
      opts: [['s', T('Under 1 min'), T('Shorts and quick clips'), T('Videos under 1 min')], ['m', T('1 to 10 min'), T('Clips to play on a show'), T('Videos of 1 to 10 min')],
        ['l', T('10 to 30 min'), T('Reports and segments'), T('Videos of 10 to 30 min')], ['xl', T('30 min or more'), T('Whole shows and streams'), T('Videos of 30 min or more')]],          // [value, button, what it is, its pill]
      of: function (it) { var s = +it.dur || 0; if (!(s > 0) || kindOf(it) !== 'video') return ''; return s < 60 ? 's' : s < 600 ? 'm' : s < 1800 ? 'l' : 'xl'; },
      ask: [[/\b(shorts|under (a|1|one) min\w*|less than (a|1|one) min\w*)\b/i, 's', T('under 1 minute')],
        [/\b(short (videos?|clips?)|clips?|under (10|ten) min\w*|less than (10|ten) min\w*)\b/i, 'm', T('1 to 10 minutes')],
        [/\b((10|ten) to (30|thirty) min\w*|half an? hour)\b/i, 'l', T('10 to 30 minutes')],
        [/\b(long (videos?|form)|full (shows?|episodes?|interviews?)|livestreams?|streams|over (30|thirty) min\w*|more than (30|thirty) min\w*|hour long)\b/i, 'xl', T('30 minutes or more')],
        [/زیر یک دقیقه|شورتس?/, 's', T('under 1 minute')], [/ویدیو(ی|های)? کوتاه|کلیپ/, 'm', T('1 to 10 minutes')], [/ویدیو(ی|های)? (بلند|طولانی)|برنامه(ٔ|ی)? کامل|لایو/, 'xl', T('30 minutes or more')]] }
  };
  Object.keys(FACETS).forEach(function (k) {
    var f = FACETS[k];
    f.test = function (it, v) { return f.of(it) === v; };
    f.valid = function (v) { return f.opts.some(function (o) { return o[0] === v; }); };
    f.label = function (v) { var o = f.opts.filter(function (x) { return x[0] === v; })[0]; return o ? o[3] || o[1] : v; };
    EXT[k] = f;
  });
  /* PRESETS: one tap for what a creator preparing a show asks most (24 Oct 2026). Each keeps WHAT the room is on (topic,
     region, place, search, story) and replaces HOW it is cut (kind, platform, the facets, heat, time, likes, credibility, the
     order), on the last 24 hours. "The most viral commentary on Iran" is Topic or Region, then Viral commentary. A preset
     that nothing in the room matches is greyed with its 0, never hidden. set: S fields, and ext for FACETS. */
  var PRESETS = [
    { key: 'viral-takes', name: T('Viral commentary'), says: T('Commentary and analysis, most viral first'), set: { ext: { form: 'take' }, sort: 'viral' } },
    { key: 'breaking', name: T('Breaking news'), says: T('News reports of the last 6 hours, hottest first'), set: { ext: { form: 'news' }, within: 6, sort: 'hot' } },
    { key: 'fresh-takes', name: T('Fresh commentary'), says: T('Commentary and analysis of the last 6 hours, newest first'), set: { ext: { form: 'take' }, within: 6, sort: 'new' } },
    { key: 'clips', name: T('Clips to play'), says: T('Videos of 1 to 10 minutes, most viewed first'), set: { kind: 'video', ext: { len: 'm' }, sort: 'views' } }
  ];
  // SAVE LISTS (24 Oct 2026, build/intel-prep.js): a control beside every card (CARDX) and in the spotlight's row of buttons
  // (SPOTA), drawn by the creator tools once they are loaded; nothing of its own here
  var CARDX = null, SPOTA = [];
  // THE ASK BOX (24 Oct 2026, build/intel-ask.js): once that add-on is loaded it answers the search box (ASKX, true when it
  // did; ask() below stays as the fallback until then), and hears every change to the saved views (VHOOK) to keep them on
  // the account. Nothing of its own here.
  var ASKX = null, VHOOK = [];
  function xcall(f, a, b, c) { try { return f(a, b, c); } catch (e) { return null; } }
  var shown = [], limit = PAGE_N, spotAt = -1, rdState = 'idle';
  // A LIST AN ADD-ON OPENS IN THE SPOTLIGHT (24 Oct 2026: a warship's or a site's own X posts, videos and articles, from
  // build/intel-forces.js). While it is set the spotlight steps through it instead of the room's list, and a Back button
  // returns to whoever opened it. Cleared whenever the spotlight closes.
  var SPOTL = null;
  function spotList() { return SPOTL ? SPOTL.list : shown; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } return v; }
  function sstore(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } return v; }
  function ago(ms) {
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return T('just now');
    if (m < 60) return T('{n} min ago', { n: N(m) });
    var h = Math.round(m / 60);
    if (h < 36) return h === 1 ? T('1 hour ago') : T('{n} hours ago', { n: N(h) });
    var d = Math.round(h / 24); return d === 1 ? T('1 day ago') : T('{n} days ago', { n: N(d) });
  }
  function fmtDate(d) {
    if (!d) return T('No date');
    if (d.length > 10) { var ms = Date.parse(d); return isNaN(ms) ? N(d.slice(0, 10)) : ago(ms); }
    var p = d.split('-');
    if (p.length === 3) return N(+p[2]) + ' ' + MONV[+p[1] - 1] + ' ' + N(p[0]);
    if (p.length === 2) return MONV[+p[1] - 1] + ' ' + N(p[0]);
    return N(p[0]);
  }
  function monthOf(d) { return d.length >= 7 ? d.slice(0, 7) : d.slice(0, 4) + '-06'; }
  function placeName(k) { return (P[k] || [T('No single place')])[0]; }
  // only a YouTube address carries a YouTube id (24 Oct 2026: facebook.com/watch/?v=1431105031655049 was read as the YouTube
  // video 14311050316, so the card showed a grey stand-in and "Play it here" embedded a video that does not exist)
  function ytId(u) {
    u = String(u || '');
    if (!/^(?:https?:)?\/\/(?:[a-z0-9-]+\.)*(?:youtube\.com|youtu\.be|youtube-nocookie\.com)(?:[\/?#:]|$)/i.test(u)) return '';
    var m = /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})(?=[&#?\/]|$)/.exec(u); return m ? m[1] : '';
  }
  /* A YouTube video's own shape, MEASURED, never assumed from its link (18 Oct 2026: a Short was drawn into a wide box and
     the show screen showed only its top third). YouTube keeps a picture at the video's own shape (oar2.jpg) for every video
     that is not plain 16:9: a Short answers 1080x1920 or 720x1280, an old 4:3 video 320x240. A plain wide video has none
     (YouTube answers its 120x90 stand-in, or an error), so it is 16:9. Until the picture answers, a /shorts/ link counts as
     9:16. Every place that draws a video sizes its box from this, and a box sized from it shows the whole video. */
  var VSHAPE = {};
  function vShape(id, u, cb) {
    var g = /\/shorts\//.test(u || '') ? 9 / 16 : 16 / 9;
    if (VSHAPE[id]) { cb(VSHAPE[id]); return VSHAPE[id]; }
    if (!pics()) return g;          // a page that loads nothing before a tap does not ask YouTube for the shape either
    var im = new Image();
    im.onload = function () { var w = im.naturalWidth, h = im.naturalHeight; VSHAPE[id] = w > 120 && h > 90 ? Math.max(0.4, Math.min(2.5, w / h)) : g; cb(VSHAPE[id]); };
    im.onerror = function () { VSHAPE[id] = g; cb(g); };
    im.src = 'https://i.ytimg.com/vi/' + id + '/oar2.jpg';
    return g;
  }
  // a video's box takes the video's shape (--ar), and a tall one shows its own tall picture until it is played
  function fitVideo(box, id, u) {
    if (!box || !id) return;
    var set = function (a) { box.style.setProperty('--ar', a.toFixed(4)); box.classList.toggle('is-tall', a < 1); if (a < 1.7 && box.style.backgroundImage) box.style.backgroundImage = cssUrl('https://i.ytimg.com/vi/' + id + '/oar2.jpg'); };
    set(vShape(id, u, set));
  }
  function kindOf(it) { return it.k === 'document' || it.k === 'data' ? 'doc' : it.k === 'image' ? 'post' : it.k; }          // an image post is drawn as a post
  function crOf(it) { return it.cr != null ? it.cr : null; }
  function hostOf(u) { var m = /^https?:\/\/([^\/?#]+)/i.exec(u || ''); return m ? m[1].toLowerCase().replace(/^(www|m|mobile)\./, '') : ''; }
  function srcOf(u) {
    var h = hostOf(u);
    if (/(^|\.)(x|twitter)\.com$/.test(h)) return 'X';
    if (/youtu\.?be/.test(h)) return 'YouTube';
    if (/^t\.me$/.test(h)) return 'Telegram';
    if (/facebook\.com$|fb\.watch$/.test(h)) return 'Facebook';
    if (/instagram\.com$/.test(h)) return 'Instagram';
    if (/tiktok\.com$/.test(h)) return 'TikTok';
    if (/rumble\.com$/.test(h)) return 'Rumble';
    if (/\.pdf($|\?)/i.test(u || '')) return 'Document';
    return h || 'Link';
  }
  // One address for one thing, so the same clip sent twice (x.com and twitter.com, a link with tracking on it) is found.
  function norm(u) {
    var y = ytId(u); if (y) return 'yt:' + y;
    var m = /^https?:\/\/([^\/?#]+)([^?#]*)/i.exec(String(u || '').trim());
    if (!m) return String(u || '').trim().toLowerCase();
    var h = m[1].toLowerCase().replace(/^(www|m|mobile)\./, '').replace(/^twitter\.com$/, 'x.com');
    var path = m[2].replace(/\/+$/, '').toLowerCase();
    var st = /^\/[^\/]+\/status\/(\d+)/.exec(path); if (h === 'x.com' && st) return 'x:' + st[1];
    return h + path;
  }
  function flame() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-7 1-9.5z"/></svg>'; }
  function hotTag(it) { return it.hot != null ? '<span class="hot" style="--h:' + Math.max(4, +it.hot || 0) + '%" title="' + esc(it.hotWhy || '') + '">' + flame() + '<b class="num">' + N(it.hot) + '</b> ' + T('Hot') + '</span>' : ''; }

  /* ------------------------------------------------------------ who covered it (18 Oct 2026)
     The coverage spread: of the outlets the room found carrying a story, how many lean Left, Centre and Right. Counted
     every hour by intel_live.py spread() (a whole topic: show_packs.py story_spread()) from our own lean table,
     data/outlet-lean.json, which also says how it was made. A Blindspot (bs) is a story one side carried and the other
     side not once; the rule has one home, intel_live.blind(). The page only draws what the files say, never decides. */
  var SIDES = [['L', 'Left'], ['C', 'Centre'], ['R', 'Right']];
  function spreadOf(it) {
    if (it.ls) return it;
    var h = STORY_OF[it.id];
    return h && h.s && h.s.ls ? h.s : null;
  }
  // every sentence whole, through T() (24 Oct 2026: these were English fragments glued together, so the Persian page could
  // not say them); the counts are numbers (+x), never a string from the file
  function lsN(ls, i) { return Math.max(0, +(ls && ls[i]) || 0); }
  function spreadWords(ls) {
    var v = { l: N(lsN(ls, 0)), c: N(lsN(ls, 1)), r: N(lsN(ls, 2)), u: N(lsN(ls, 3)) };
    return lsN(ls, 3) ? T('Outlets that carried it: {l} left, {c} centre, {r} right, {u} not rated', v) : T('Outlets that carried it: {l} left, {c} centre, {r} right', v);
  }
  // A split from one or two rated outlets is not a split (25 Oct 2026 audit: 26 of 44 news cards drew a "bar" from 1 or 2,
  // 17 of them a single outlet painted as all-Left or all-Right). The bar needs SPLIT_MIN rated outlets: the same number
  // as intel_live.py LC_SOME, whose lc field says 'thin' below it. Under it the spotlight names the outlets and says why.
  var SPLIT_MIN = 3;
  function spreadThin(ls) { return !!ls && lsN(ls, 0) + lsN(ls, 1) + lsN(ls, 2) < SPLIT_MIN; }
  function spreadBar(ls, cls) {
    if (!ls || !(lsN(ls, 0) + lsN(ls, 1) + lsN(ls, 2)) || spreadThin(ls)) return '';
    return '<span class="ir-sp' + (cls ? ' ' + cls : '') + '" role="img" aria-label="' + esc(spreadWords(ls)) + '" title="' + esc(spreadWords(ls)) + '">' +
      SIDES.map(function (s, i) { return lsN(ls, i) ? '<i class="ir-sp-' + s[0] + '" style="flex:' + lsN(ls, i) + '"></i>' : ''; }).join('') + '</span>';
  }
  function blindWords(bs) { return bs === 'L' ? T('No left-leaning outlet carried this') : T('No right-leaning outlet carried this'); }
  function blindTag(o) {
    return o && o.bs ? '<span class="ir-bs" title="' + esc(o.bs === 'L' ? T('No left-leaning outlet carried this, of the outlets the room found') : T('No right-leaning outlet carried this, of the outlets the room found')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/></svg>' +
      esc(o.bs === 'L' ? T('Left silent') : T('Right silent')) + '</span>' : '';
  }
  function spreadTag(it) { return it.ls ? spreadBar(it.ls, 'ir-sp-card') + blindTag(it) : blindTag(spreadOf(it)); }
  function spotSpread(it) {
    var o = spreadOf(it); if (!o) return '';
    var whole = o !== it, rated = lsN(o.ls, 0) + lsN(o.ls, 1) + lsN(o.ls, 2), side = { L: T('Left'), C: T('Centre'), R: T('Right') };
    return '<section class="ir-s-sp" aria-label="' + esc(T('Who covered it')) + '"><h3>' + esc(whole ? T('Who covered this story') : T('Who covered it')) + '</h3>' + spreadBar(o.ls, 'ir-sp-big') +
      '<ul>' + SIDES.map(function (s, i) {
        var ns = (o.lsn && Array.isArray(o.lsn[s[0]]) ? o.lsn[s[0]] : []).map(String), six = ns.slice(0, 6).join(T(', '));
        return '<li class="ir-sp-' + s[0] + '"><b>' + esc(side[s[0]]) + ' ' + N(lsN(o.ls, i)) + '</b> ' + (ns.length ? bd(esc(ns.length > 6 ? T('{list} and {n} more', { list: six, n: N(ns.length - 6) }) : six)) : esc(T('none'))) + '</li>';
      }).join('') + '</ul>' +
      (spreadThin(o.ls) ? '<p class="ir-s-o">' + esc(T('Too few rated outlets to show a split: {n} of the {t} that carried it are rated.', { n: N(rated), t: N(rated + lsN(o.ls, 3)) })) + '</p>' : '') +
      (o.bs ? '<p class="ir-s-bs">' + blindTag(o) + ' ' + esc(o.bs === 'L' ? T('No left-leaning outlet carried this, of the {n} rated outlets the room found. A story only one side tells is worth asking why.', { n: N(rated) }) : T('No right-leaning outlet carried this, of the {n} rated outlets the room found. A story only one side tells is worth asking why.', { n: N(rated) })) + '</p>' : '') +
      '<p class="ir-s-o">' + esc(T(lsN(o.ls, 3) ? 'Lean comes from three published raters (AllSides, Ad Fontes Media, Media Bias/Fact Check): the side most of them give. Local stations and most outlets outside the US, UK, Canada, Australia and Israel are not rated ({n} here). Think one is wrong? Say so in the discussion.' : 'Lean comes from three published raters (AllSides, Ad Fontes Media, Media Bias/Fact Check): the side most of them give. Local stations and most outlets outside the US, UK, Canada, Australia and Israel are not rated. Think one is wrong? Say so in the discussion.', { n: N(lsN(o.ls, 3)) })) + '</p></section>';
  }

  /* ------------------------------------------------------------ where it was posted, and how many liked it there */
  function pfOf(it) {
    if (it._pf) return it._pf;
    var h = hostOf(it.u), s = it.src === 'News' ? 'News' : srcOf(it.u);
    if (/(^|\.)threads\.(net|com)$/.test(h)) s = 'Threads';
    else if (/^(drive|docs)\.google\.com$/.test(h)) s = 'Document';
    else if (s === 'Rumble') s = 'Other';
    if (!PFC[s]) s = 'Web';
    return (it._pf = s);
  }
  function pfColor(p) { return (PFC[p] || PFC.Web)[2]; }
  function pfName(p) { return (PFC[p] || PFC.Web)[1]; }
  // The counters, from data/intel-reach.json, or from the feed itself for a video of the last 24 hours (fresher).
  function reachOf(it) {
    if (it._r !== undefined) return it._r;
    var r = REACH[norm(it.u)] || null;
    if (it.lk != null || it.vw != null) { r = { pf: it.src === 'X' ? 'X' : 'YouTube', at: it.d }; if (it.lk != null) r.lk = it.lk; if (it.vw != null) r.vw = it.vw; if (it.rp != null) r.rs = it.rp; }
    return (it._r = r);
  }
  // The one number each platform shows everyone: likes on X and YouTube, views on Telegram (it has no public likes).
  function mainCount(it) { var r = reachOf(it); if (!r || r.x) return null; return pfOf(it) === 'Telegram' ? (r.vw != null ? r.vw : null) : (r.lk != null ? r.lk : null); }
  function likesOf(it) { var r = reachOf(it); return r && !r.x && r.lk != null ? r.lk : null; }
  function viewsOf(it) { var r = reachOf(it); return r && !r.x && r.vw != null ? r.vw : null; }
  function fmtN(n) {
    if (n == null || n === '' || !isFinite(+n)) return '';          // drawn into innerHTML: a number, or nothing
    n = +n;
    if (FA) { if (n < 1000) return N(n); var fk = n < 1e6 ? n / 1e3 : n / 1e6; return N(fk < 10 ? fk.toFixed(1).replace(/\.0$/, '') : Math.round(fk)) + '\u00a0' + T(n < 1e6 ? 'thousand' : 'million'); }
    if (n < 1000) return String(n);
    if (n < 1e6) { var k = n / 1e3; return (k < 10 ? k.toFixed(1).replace(/\.0$/, '') : Math.round(k)) + 'K'; }
    var m = n / 1e6; return (m < 10 ? m.toFixed(1).replace(/\.0$/, '') : Math.round(m)) + 'M';
  }
  // VIRAL: where the item's own number ranks among the items of the same platform in the room (both lenses), 0 to 100.
  // A platform needs 8 measured items before it is ranked at all, so a score never rests on a handful.
  var VN = {};
  function computeViral() {
    var by = {}, all = BANK.concat(LIVE);
    // ranked among what a reader can see (own); a found item gets its place in that same ranking
    all.forEach(function (it) { var m = mainCount(it); if (m != null && own(it)) (by[pfOf(it)] = by[pfOf(it)] || []).push(m); });
    Object.keys(by).forEach(function (p) { by[p].sort(function (a, b) { return a - b; }); VN[p] = by[p].length; });
    all.forEach(function (it) {
      var m = mainCount(it), a = by[pfOf(it)];
      delete it._v;
      if (m == null || !a || a.length < 8) return;
      var lo = 0, hi = a.length;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (a[mid] < m) lo = mid + 1; else hi = mid; }
      it._v = Math.max(0, Math.min(100, Math.round(100 * lo / (a.length - 1))));
    });
  }
  function viralWhy(it) {
    if (it._v == null) return '';
    var p = pfOf(it), n = VN[p] || 0;
    return T(p === 'Telegram' ? 'More views than {v}% of the {n} {pf} items in the room with a count' : 'More likes than {v}% of the {n} {pf} items in the room with a count', { v: N(it._v), n: N(n), pf: pfName(p) });
  }
  var ICO = {
    like: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10z"/></svg>',
    view: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>',
    reply: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    repost: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4 3 8l4 4M3 8h13a4 4 0 0 1 4 4v1M17 20l4-4-4-4M21 16H8a4 4 0 0 1-4-4v-1"/></svg>',
    viral: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20h3v-5H3zM10.5 20h3V10h-3zM18 20h3V4h-3z"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="17" r="2.2"/><circle cx="19" cy="7" r="2.2"/><path d="M6.8 15.6C9 9 14 8 17 7.6"/></svg>'
  };
  // A mark that says what it is and where it was posted: the map's shape in the platform's colour
  function mark(it, cls) {
    var k = kindOf(it), p = pfOf(it);
    return '<svg class="' + (cls || 'ir-mk') + '" viewBox="-8 -8 16 16" aria-hidden="true"><path d="' + (SHAPE[k] || SHAPE.post) + '" fill="' + pfColor(p) + '"/></svg>';
  }
  function reachLine(it) {
    var r = reachOf(it), p = pfOf(it), out = [];
    if (r && r.x) return '<span class="ir-rch ir-rch-x">' + esc(T('{pf} hides this count now (deleted, private or behind a login)', { pf: pfName(p) })) + '</span>';
    if (r) {
      if (r.lk != null) out.push('<span title="' + esc(T('{n} likes on {pf}', { n: LN(r.lk), pf: pfName(p) })) + '">' + ICO.like + '<b class="num">' + fmtN(r.lk) + '</b></span>');
      if (r.vw != null) out.push('<span title="' + esc(T(r['~'] ? 'About {n} views on {pf}' : '{n} views on {pf}', { n: LN(r.vw), pf: pfName(p) })) + '">' + ICO.view + '<b class="num">' + (r['~'] ? '~' : '') + fmtN(r.vw) + '</b></span>');
      if (r.rp != null) out.push('<span title="' + esc(T('{n} replies', { n: LN(r.rp) })) + '">' + ICO.reply + '<b class="num">' + fmtN(r.rp) + '</b></span>');
      if (r.rs != null) out.push('<span title="' + esc(T('{n} reposts', { n: LN(r.rs) })) + '">' + ICO.repost + '<b class="num">' + fmtN(r.rs) + '</b></span>');
    }
    return out.length ? '<span class="ir-rch">' + out.join('') + '</span>' : '';
  }
  function viralTag(it) { return it._v != null ? '<span class="vir" style="--h:' + Math.max(4, it._v) + '%" title="' + esc(viralWhy(it)) + '">' + ICO.viral + '<b class="num">' + N(it._v) + '</b> ' + T('Viral') + '</span>' : ''; }
  function reduced() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  /* ------------------------------------------------------------ the three lenses */
  function setOf(l) { return l === 'live' ? LIVE : l === 'readers' ? RD : BANK; }
  /* WHAT A READER CAN SEE (24 Oct 2026). A found item (_deep, EVERY TRENDING STORY IS A SHOW) lives only inside its story:
     pass() hides it everywhere else. Every count, the wire, the place menu, the kind buttons and the platforms count only
     these (own), or a found item pass() lets through; before this the wire was 9 found items in 14 that opened nothing, and
     an unfiltered Last 24 hours said "433 stories match" while it listed 286. */
  function own(it) { return !it._deep; }
  function ownOf(a) { return a.filter(own); }
  function nOwn() { var n = 0; for (var i = 0; i < items.length; i++) if (!items[i]._deep) n++; return n; }
  function liveN() { return LIVE.length - LIVE.filter(function (it) { return it._deep; }).length; }
  function liveFresh() { return liveN() >= 5 && LIVE_AT && Date.now() - LIVE_AT < 6 * 3600000; }
  function liveShown() { return liveN() > 0 && LIVE_AT && Date.now() - LIVE_AT < 48 * 3600000; }
  function useLens(l, quiet) {
    if (!LENS[l] || (l === 'live' && !liveShown())) l = 'bank';
    S.lens = l; items = setOf(l);
    S.sort = SORTS[l][0][0];          // each lens opens on its own order (hottest, newest); the address can still name another
    var hint = $('ir-maphint');
    if (hint) hint.textContent = l === 'live' ? T('The last 24 hours. Drag to turn the globe (two fingers on a phone), tap a mark.') : l === 'readers' ? T('Finds readers sent, not checked yet.') : T('{n} items in the bank. Drag to turn the globe (two fingers on a phone), tap a mark.', { n: N(BANK.length) });
    $('ir-sort').innerHTML = SORTS[l].map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('');
    $('ir-sort').value = S.sort;
    root.setAttribute('data-shows', l);
    $('ir-time').hidden = l !== 'bank';
    $('ir-top').hidden = l !== 'bank';
    fillPlaces();
    if (!quiet) { stopTour(); render(); if (!S.place) frameShown(); }
  }
  function drawLens() {
    var el = $('ir-lens'), html = '';
    ['live', 'bank', 'readers'].forEach(function (l) {
      if (l === 'live' && !liveShown()) return;
      var n = ownOf(setOf(l)).length, on = S.lens === l;
      var sub = l === 'live' ? (LIVE_AT ? T('updated {t}', { t: ago(LIVE_AT) }) : '') : l === 'readers' ? (rdState === 'loading' ? T('loading') : T('being checked')) : T('checked');
      html += '<button type="button" role="tab" class="ir-lens-' + l + '" data-lens="' + l + '" aria-selected="' + on + '">' +
        (l === 'live' ? '<i class="ir-live-dot" aria-hidden="true"></i>' : '') + '<b>' + LENS[l] + '</b> <span class="num">' + N(n) + '</span><small>' + esc(sub) + '</small></button>';
    });
    el.innerHTML = html; el.hidden = false;
    $('ir-kick-l').textContent = S.lens === 'live' && liveFresh() ? T('Live') : '';
  }
  function liveNote() {
    var el = $('ir-livenote');
    if (S.lens === 'live') {
      el.innerHTML = T('The last 24 hours, read every hour from public news and video feeds{last}. <b>Hot</b> is measured: how many different outlets carry a story, or how fast a video is being watched. ', { last: LIVE_AT ? T(', last {t}', { t: esc(ago(LIVE_AT)) }) : '' }) +
        // say it when X is missing, so a host does not hunt for posts that are not coming (18 Oct 2026: none for a day)
        (LIVE.length && !LIVE.some(function (it) { return it.src === 'X'; }) ? T('X posts are paused for now; news and video still arrive every hour. ') : '') +
        T('<b>Blindspot</b> marks a story one side of the media carried and the other did not. ') + T('Seen something that should be here? <a href="#add">Add it</a>.');
      el.hidden = false;
    } else if (S.lens === 'readers') {
      el.innerHTML = T('What readers sent in that I have not checked yet. A find goes on the map, with its sender\'s name, once it is checked. <a href="#add">Add yours</a>.');
      el.hidden = false;
    } else el.hidden = true;
  }

  /* ------------------------------------------------------------ filtering */
  function bucketOf(it) {
    if (!it.d) return -1;
    var m = monthOf(it.d);
    if (m < FIRST) return 0;
    var i = buckets.indexOf(m);
    return i < 0 ? buckets.length - 1 : i;
  }
  function fullRange() { return !S.days && S.from === 0 && S.to === buckets.length - 1; }
  /* PAST 30 DAYS (24 Oct 2026). The timeline's bars are months, so "Past 30 days" used to pick this calendar month: on the
     1st it showed almost nothing. It is now a day count (S.days): the bars run from the month the 30 days start in, and an
     item passes only when its date is on or after the first of those days. An item dated only to a month counts as the
     first of it; one dated only to a year does not count. */
  function dayCut(d) { return new Date(Date.now() - (d || S.days) * 864e5).toISOString().slice(0, 10); }
  function daysFrom(d) { var i = buckets.indexOf(dayCut(d).slice(0, 7)); return i > 0 ? i : buckets.length - 1; }
  function keysOf(it) { return [it.p].concat(it.a || []); }
  function inPlace(it) {
    if (S.nowhere) return it.p === 'global';
    if (!S.place) return true;
    var keys = keysOf(it);
    if (S.place.indexOf('c:') === 0) {
      var c = S.place.slice(2);
      return keys.some(function (k) { return P[k] && P[k][1] === c; });
    }
    var want = S.place.split(',');
    return keys.some(function (k) { return want.indexOf(k) >= 0; });
  }
  function words(it) {
    if (!it._w) it._w = (it.t + ' ' + (it.n || '') + ' ' + (it.o || '') + ' ' + (it.h || '') + ' ' + (it.nm || '') + ' ' + (it.by || '') + ' ' + it.src + ' ' + placeName(it.p) + ' ' + (P[it.p] ? P[it.p][1] : '') + ' ' +
      (it.tp || []).map(function (i) { return topics[i]; }).join(' ') + ' ' + tkOf(it).map(function (k) { return TOPN[k][1]; }).join(' ')).toLowerCase();
    return it._w;
  }
  // The subjects an item is about (TOPICS): read from its own words, and for an item the bank tagged, from its tags
  function tkOf(it) {
    if (it._tk) return it._tk;
    var txt = (it.t || '') + ' ' + (it.n || '') + ' ' + (it.o || ''), o = {};
    TOPICS.forEach(function (t) { if (t[2].test(txt) || (t[3] && t[3].test(txt))) o[t[0]] = 1; });
    // only the bank's own hand-made tags count: the last 24 hours are tagged by a loose word match (intel_live.py), and that match is what put 74 of them under Diplomacy (measured 18 Oct 2026)
    if (it.hot == null && !it.pend) (it.tp || []).forEach(function (i) { (BANK_TP[topics[i]] || []).forEach(function (k) { o[k] = 1; }); });
    return (it._tk = Object.keys(o));
  }
  function hasTopic(it, k) { var tk = tkOf(it); return k === 'rel' ? REL_KEYS.some(function (r) { return tk.indexOf(r) >= 0; }) : tk.indexOf(k) >= 0; }
  function topicName(k) { return k === 'rel' ? T('All religion') : TOPN[k] ? TOPN[k][1] : k; }
  // The focus picks an item answers to: its place's country, or its own headline and note naming one (never the outlet's
  // name, or every post by "Iran International" would count as Iran).
  function fxOf(it) {
    if (it._fx) return it._fx;
    var c = P[it.p] ? P[it.p][1] : (it.pw || ''), cs = keysOf(it).map(function (k) { return P[k] ? P[k][1] : ''; }).concat([c]);
    var txt = (it.t || '') + ' ' + (it.n || '');
    it._fx = FOCUS.filter(function (f) {
      return f[2].some(function (x) { return cs.indexOf(x) >= 0 || (FXK && keysOf(it).indexOf(x) >= 0); }) || f[3].test(txt);          // Iran Uncensored's regions also list place keys
    }).map(function (f) { return f[0]; });
    return it._fx;
  }
  function likesN(it) { var l = likesOf(it); return l != null ? l : (typeof it.lk === 'number' ? it.lk : null); }
  /* HOT TOPICS (Armin, 17 October 2026: "If I click on hot topics, then it filters it to hot topics, but then I should be
     able to filter it further ... 5 or 6 things that are the most trending news. I could click on one of them, which will
     filter it down even more to only ... the tweets, for example, about that"). A hot topic is a story of the last hours
     as data/show-packs.json groups it (build/show_packs.py: the news, the videos and the X posts on one event), when that
     file was built on the same hour of the feed; otherwise there are none (never country buckets, 24 Oct 2026). Its name
     is the one data/show-words.json gives it, else its own headline, cut. */
  function cut(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/[\s,:;.'"-]+\S*$/, '') + '…' : t; }
  function makeHots() {
    HOTS = []; HOTALL = {}; STORY_OF = {};
    if (!LIVE.length) return;
    var byId = {}; LIVE.forEach(function (it) { byId[it.id] = it; });
    var list = [];
    var fresh = PACKS && Array.isArray(PACKS.stories) && PACKS.from && LIVE_AT && Math.abs(Date.parse(PACKS.from) - LIVE_AT) < 3 * 3600000;
    if (fresh) {
      PACKS.stories.forEach(function (s) {
        var its = (s.items || []).map(function (id) { return byId['L' + id]; }).filter(Boolean);
        var ds = DEEP_FRESH && DEEP.stories[String(s.id)], seen = {}, all = [];
        its.concat(ds ? (ds.rel || []).concat(ds.deep || []).map(function (id) { return byId['L' + id]; }) : []).forEach(function (it) { if (it && !seen[it.id]) { seen[it.id] = 1; all.push(it); } });
        // who covered it, over everything the story holds (build/intel_deep.py, 24 Oct 2026): used when it rates more outlets
        var rated = function (ls) { return ls ? ls[0] + ls[1] + ls[2] : 0; };
        var sx = ds && ds.ls && rated(ds.ls) > rated(s.ls) ? Object.assign({}, s, { ls: ds.ls, lsn: ds.lsn || {}, bs: ds.bs || '' }) : s;
        if (its.length) list.push({ id: String(s.id), lead: String(s.lead), hot: +s.hot || 0, its: its, all: all, q: ds ? String(ds.q || '') : '', title: s.title || its[0].t, s: sx });
      });
    }
    // no fresh story file (missing, or built over 3 hours from the feed): NO Trending stories. Until 24 Oct 2026 the room
    // grouped the hours itself by country and topic, and the live Iran page, published before it linked its story file,
    // showed one "story" of 304 unrelated items (Armin: "when I select one of the hot topics, I see items that may not be
    // relevant"). A bucket is not a story; Everything and All hot still work.
    list.forEach(function (h) {
      var w = WORDS && WORDS.stories && WORDS.stories[h.lead];
      // the written name, else the one build/show_packs.py chip_name() makes whole every hour, else the headline cut at a word
      h.name = w && w.name ? w.name : h.s && h.s.name ? String(h.s.name) : cut(unshout(h.title.replace(/^(LIVE|WATCH|BREAKING|TRENDING)[!:]?\s*/i, '')), 56);
      h.w = w || null;
      h.score = h.hot * (0.6 + 0.4 * Math.min(1, h.its.length / 3));
      h.ids = {}; h.all.forEach(function (it) { h.ids[it.id] = 1; }); h.its.forEach(function (it) { STORY_OF[it.id] = h; });
    });
    list.sort(function (a, b) { return b.score - a.score; });
    list.filter(function (h) { return h.hot >= HOT_MIN; }).forEach(function (h) { h.its.forEach(function (it) { HOTALL[it.id] = 1; }); });          // the hours' own items: All hot stays inside Everything
    HOTS = list;
  }
  /* AN ADD-ON'S CHIPS IN THE TRENDING ROW (24 Oct 2026). Iran Uncensored's "Regime only" and "What the regime hides"
     (news-camps.js, the filter bz) sit beside Everything, so Everything must clear them and is pressed only when none is
     on: it showed pressed with "Regime only" on, and the next search silently found 1. An add-on filter says it lives in
     this row with row: 'hot' in IRoom.addFilter; bz is named here because news-camps.js registered it before that existed. */
  function hotRowExt() { return Object.keys(S.ext).filter(function (xk) { return S.ext[xk] && EXT[xk] && (EXT[xk].row === 'hot' || xk === 'bz'); }); }
  function hotTop() { return HOTS.filter(function (h) { return h.hot >= HOT_MIN && (!DEEP_FRESH || h.all.length >= SHOW_MIN); }).slice(0, HOT_TOP); }
  // a Blindspot item: its own story says so, or the topic it belongs to does (who covered it, above)
  function isBlind(it) { var o = spreadOf(it); return !!(o && o.bs); }
  function hotById(id) { return HOTS.filter(function (h) { return h.id === id; })[0] || null; }
  function pass(it, skip) {
    if (skip !== 'link' && LSET && !LSET[it.id]) return false;
    if (it._deep && skip !== 'hot' && !(S.lens === 'live' && S.hot && S.hot !== 'blind' && (S.hot === 'all' ? HOTALL[it.id] : (hotById(S.hot) || { ids: {} }).ids[it.id]))) return false;          // a found item lives inside its story
    if (S.who && whoKey(it) !== S.who) return false;          // one account's posts (WHO POSTED IT)
    if (skip !== 'hot' && S.hot && S.lens === 'live') {
      if (S.hot === 'all') { if (!HOTALL[it.id]) return false; }
      else if (S.hot === 'blind') { if (!isBlind(it)) return false; }
      else { var hs = hotById(S.hot); if (hs && !hs.ids[it.id]) return false; }
    }
    if (skip !== 'fx' && S.fx.length) { var fx = fxOf(it); if (!S.fx.some(function (k) { return fx.indexOf(k) >= 0; })) return false; }
    if (skip !== 'likes' && S.lmin && !(likesN(it) >= S.lmin)) return false;
    if (skip !== 'tp' && S.tp.length && !S.tp.some(function (k) { return hasTopic(it, k); })) return false;
    if (skip !== 'kind' && S.kind && kindOf(it) !== S.kind) return false;
    if (skip !== 'pf' && S.pf.length && S.pf.indexOf(pfOf(it)) < 0) return false;
    if (S.heat && S.lens === 'live' && (it.hot || 0) < S.heat) return false;
    if (skip !== 'viral' && S.vmin && (it._v == null || it._v < S.vmin)) return false;
    if (S.crmin && !(crOf(it) >= S.crmin)) return false;          // an item with no score never passes a minimum
    if (S.within && S.lens === 'live') { var ms = Date.parse(it.d || ''); if (!(ms > Date.now() - S.within * 3600000)) return false; }
    if (S.top && S.lens === 'bank' && !it.q) return false;
    if (S.edu && !it.edu) return false;
    for (var xk in S.ext) if (EXT[xk] && skip !== 'ext:' + xk && !xcall(EXT[xk].test, it, S.ext[xk])) return false;
    if (skip !== 'place' && !inPlace(it)) return false;
    if (S.lens === 'bank' && skip !== 'time' && !fullRange()) {
      var b = bucketOf(it); if (b < S.from || b > S.to) return false;
      if (S.days && !(String(it.d || '') >= dayCut())) return false;
    }
    if (S.q) {
      var w = words(it), terms = S.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) if (w.indexOf(terms[i]) < 0) return false;
    }
    return true;
  }
  function sortList(a) {
    var by = function (x, y) { return (y.d || y.sent || '').toString().localeCompare((x.d || x.sent || '').toString()); };
    if (S.lens === 'readers') by = function (x, y) { return (y.ms || 0) - (x.ms || 0); };
    if (S.sort === 'old') by = function (x, y) { return (x.d || '9999').localeCompare(y.d || '9999'); };
    if (S.sort === 'top') { var nb = by; by = function (x, y) { return ((y.q || 0) - (x.q || 0)) || nb(x, y); }; }
    if (S.sort === 'hot') { var nh = by; by = function (x, y) { return ((y.hot || 0) - (x.hot || 0)) || nh(x, y); }; }
    // most viral, liked, viewed: what has no measured number goes after everything that has one, newest first
    var num = function (f) { var nb2 = by; return function (x, y) { var a = f(x), b = f(y); return ((b == null ? -1 : b) - (a == null ? -1 : a)) || nb2(x, y); }; };
    if (S.sort === 'viral') by = num(function (i) { return i._v; });
    if (S.sort === 'likes') by = num(likesOf);
    if (S.sort === 'views') by = num(viewsOf);
    return a.sort(function (x, y) { return ((x.x || 0) - (y.x || 0)) || by(x, y); });      // an unlabelled post goes last, whatever the order
  }

  /* ------------------------------------------------------------ everything that redraws */
  function render(keepSpot) {
    LSET = null;
    var base = items.filter(function (it) { return pass(it, 'link'); });
    LINKS = S.lens === 'readers' || !G ? [] : buildLinks(base);
    if (S.link) { var L0 = linkByKey(S.link); if (L0) LSET = L0.ids; else S.link = ''; }
    if (S.with) { var w0 = itemById(S.with); if (w0) LSET = linksOf(w0, base).ids; else S.with = ''; }
    shown = sortList(LSET ? base.filter(function (it) { return LSET[it.id]; }) : base);
    limit = PAGE_N;
    drawLens();
    drawList();
    drawPins();
    drawCountries();
    if (S.lens === 'bank') drawBars();
    drawChips();
    drawBoard();
    drawState();
    drawLegend();
    liveNote();
    drawLinkList();
    drawCmd();
    drawPills();
    writeUrl();
    if (!keepSpot && $('ir-spot').open) closeSpot();
    RHOOK.forEach(function (f) { try { f(); } catch (e) { /* the creator tools never break the room */ } });
  }

  function badges(it) {
    var b = '';
    if (it.q) b += ' · <span class="q">&#9733; ' + T('Top pick') + '</span>';
    if (it.g) b += ' · <span class="gr">' + T('Graphic') + '</span>';
    if (it.edu) b += ' · <span class="ed">' + T('Explainer') + '</span>';
    if (it.own) b += ' · <span class="own">' + T('Creator\'s own') + '</span>';
    if (it.by) b += ' · <span class="by">' + T('Sent by {who}', { who: esc(it.by) }) + '</span>';
    if (it.pend) b += ' · <span class="pend">' + T('Being checked') + '</span>';
    if (isRegime(it)) b += ' · <span class="rg">' + T('Regime media') + '</span>';
    BADGEX.forEach(function (f) { var x = xcall(f, it); if (x) b += ' · ' + x; });          // an add-on's marks (IRoom.addBadge)
    if (isNew(it)) b = ' · <span class="new">' + T('New') + '</span>' + b;
    return b;
  }
  /* ------------------------------------------------------------ no item without a picture (18 October 2026)
     Armin: "When you are showing these tweets in the intel room, either on the side or when I click on them, nothing
     visual shows up. This is really bad ... something visual needs to be there". So every item is drawn with the best
     picture it has, in this order:
       1. its own: an X post's pictures or video, a YouTube video's frame
       2. the story's photo: a news story's picture from Bing News (build/intel_live.py, NEWS_PICS: matched by headline)
       3. the link card: an X post that links somewhere, the card's picture as X draws it (cd)
       4. the author: an X post of words only is drawn as the post itself, the author's face, name and whole text (av, tx)
       5. the place: the room's own globe turned to where it happened, the country lit (drawn here, once a place)
       6. only an item with none of these (no place, no picture): the source's initials on its platform's colour
     One chooser (vis) for every surface: the list, the spotlight, the tour's lower third and the map's tooltip. */
  var AV_RX = /^https:\/\/pbs\.twimg\.com\/profile_images\/\d+\/[A-Za-z0-9_-]+_normal\.(?:jpg|jpeg|png|webp)$/,
    CARD_RX = /^https:\/\/pbs\.twimg\.com\/(?:card_img\/\d+\/[A-Za-z0-9_-]+|media\/[A-Za-z0-9_-]+)\?format=(?:jpg|png|webp)$/,
    BING_RX = /^https:\/\/www\.bing\.com\/th\?id=[A-Za-z0-9._-]{8,120}&pid=News&w=240&h=150&c=7$/;
  function avOf(it, size) { return it && it.src === 'X' && AV_RX.test(it.av || '') ? it.av.replace(/_normal\.(\w+)$/, '_' + (size || '200x200') + '.$1') : ''; }
  // a card's picture at a size: a link card is served at any WxH, an X Article's cover (media/) only at X's named sizes
  function cdPic(i, n) { return i + '&name=' + (/\/media\//.test(i) ? (n === '280x150' ? 'small' : 'medium') : n); }
  function cardOf(it) { return it && it.src === 'X' && it.cd && CARD_RX.test(it.cd.i || '') && !mediaOf(it).length ? it.cd : null; }
  function xWords(it) { return it.src === 'X' && !mediaOf(it).length; }          // a post the page draws as the post itself
  // {k: 'pic' | 'av' | 'loc' | 'mono', u: the picture's address (none for mono)}; big: the spotlight's size
  function vis(it, big) {
    if (!pics() && !it._pics) { var lc0 = locator(it.p, big); return lc0 ? { k: 'loc', u: lc0 } : { k: 'mono' }; }          // nothing from another site before a tap
    var y = ytId(it.u), md = mediaOf(it), cd = cardOf(it);
    if (y) return { k: 'pic', u: 'https://i.ytimg.com/vi/' + y + (big ? '/hqdefault.jpg' : '/mqdefault.jpg') };
    if (md.length && !it.sn) return { k: 'pic', u: pic(md[0], big ? 'medium' : '240x240') };
    if (it.th0) return { k: 'pic', u: it.th0 + (big ? '&w=960&h=540&c=7&rs=1' : '&w=240&h=150&c=7') };
    if (cd) return { k: 'pic', u: cdPic(cd.i, big ? '800x419' : '280x150') };
    var qr = refOf(it, 'qt'), qm = refMedia(qr);
    if (qm.length) return { k: 'pic', u: pic(qm[0], big ? 'medium' : '240x240') };
    if (qr && qr.cd && CARD_RX.test(qr.cd.i || '')) return { k: 'pic', u: cdPic(qr.cd.i, big ? '800x419' : '280x150') };
    if (it.th && !it.sn && /^https:\/\//.test(it.th)) return { k: 'pic', u: it.th };
    var av = avOf(it, big ? '400x400' : '200x200');
    if (av) return { k: 'av', u: av };
    var lc = locator(it.p, big);
    if (lc) return { k: 'loc', u: lc };
    return { k: 'mono' };
  }
  function initials(it) {
    var p = pfOf(it);
    // a site with no name on the item: its own initials from its address (ynetnews.com YN), never just "WEB"
    var hd = !it.nm && !it.h && (p === 'Web' || p === 'News' || p === 'Document') ? (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(it.src || '') ? String(it.src).toLowerCase() : hostOf(it.u)) : '';
    if (hd && !NO_LOGO.test(hd) && !/^(drive|docs)\.google\.com$/.test(hd)) return initials({ nm: hd.replace(/^(www|m|en|english|edition)\./, ''), src: 'Web', u: '' });
    if (!it.nm && !it.h) return p === 'Telegram' ? 'TG' : p === 'Document' ? 'DOC' : p === 'Facebook' ? 'FB' : p === 'Instagram' ? 'IG' : p === 'Threads' ? 'THR' : p === 'Web' ? 'WEB' : p === 'Other' ? 'VID' : String(p).slice(0, 3).toUpperCase();
    // any letter starts a word (24 Oct 2026: only A-Z did, so every Persian name was "?"); a name in another script gives one
    // letter, its first, since two Persian letters side by side read as a word rather than initials
    var w = String(it.nm || it.h || it.src || '').replace(/^@/, '').replace(/\.(com|org|net|gov|co|il|uk|tv|media|online)\b.*$/i, '').split(/[\s._‌-]+/).filter(function (x) { return /^[\p{L}\p{N}]/u.test(x) && !/^(the|of|and|news|www)$/i.test(x); });
    if (w[0] && !/^[A-Za-z0-9]/.test(w[0])) return Array.from(w[0])[0];
    return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)).toUpperCase();
  }
  /* WHO POSTED IT (22 Oct 2026, Armin on a Trump post in the list: "I should be able to see the profile picture of the
     person who posted these posts as well and make it more clear who posted it ... more people would be able to tell if
     they want this"). Every card and the spotlight open on who said it, as X itself does: an X post the author's face,
     name and handle; anything else the outlet or channel beside its platform's mark. A page that loads pictures only on a
     tap (the Persian room) shows the author's initials until pictures are on. One line, so a long name never wraps. */
  function whoName(it) { return String(it.src === 'X' ? (it.nm || it.h || '') : (it.h || it.nm || T(it.src || ''))).replace(/\s+/g, ' ').trim(); }
  function whoKey(it) { return String(it.h || it.nm || '').toLowerCase(); }
  /* FACES (23 Oct 2026, Armin: "you failed to include the profile picture of the YouTube channel ... for the Reuters
     article, you should have included the logo of Reuters ... make it easier for people to understand what's going on").
     Every source shows its own face: an X post its author, a video its channel's picture, an article its outlet's logo,
     and on every face a badge with the platform's own mark (X, YouTube, an article, Telegram ...), so who and where read
     at one glance. Initials stand in when no picture is known, or before a tap on a page that loads none (CFG.light). */
  var PF_ICON = {
    X: '<path d="M4 3.5h3.6l2.9 4.1 3.4-4.1h2.1l-4.5 5.4 5 7.6h-3.6l-3.2-4.6-3.9 4.6H3.7l5-5.9z"/>',
    YouTube: '<path fill-rule="evenodd" d="M10 4.6c-3.8 0-5.5.3-6.1.9-.6.6-.8 1.9-.8 4.5s.2 3.9.8 4.5c.6.6 2.3.9 6.1.9s5.5-.3 6.1-.9c.6-.6.8-1.9.8-4.5s-.2-3.9-.8-4.5c-.6-.6-2.3-.9-6.1-.9zM8.5 7.5l4.2 2.5-4.2 2.5z"/>',
    News: '<path d="M4 4h9.5v11.2c0 .5.4.8.8.8H5.2A1.2 1.2 0 0 1 4 14.8zm11 3h1.5v8.2a.8.8 0 0 1-1.5 0zM5.8 6v2.6h5.9V6zm0 4.2v1.2h5.9v-1.2zm0 2.5v1.2h5.9v-1.2z"/>',
    Telegram: '<path d="M3.4 9.5 15.8 4.7c.6-.2 1.1.1.9.9l-2.1 9.8c-.1.6-.8.8-1.3.5l-3.2-2.4-1.6 1.5c-.2.2-.5.1-.5-.2l.1-2.5 5.2-4.7c.2-.2 0-.3-.3-.2l-6.5 4-2.9-.9c-.6-.2-.6-.6.1-.8z"/>',
    Facebook: '<path d="M11.2 16.5v-5.6h1.9l.3-2.2h-2.2V7.3c0-.6.2-1.1 1.1-1.1h1.2v-2a15 15 0 0 0-1.7-.1c-1.7 0-2.9 1-2.9 3v1.6H7v2.2h1.9v5.6z"/>',
    Instagram: '<path fill-rule="evenodd" d="M7 3.5h6A3.5 3.5 0 0 1 16.5 7v6a3.5 3.5 0 0 1-3.5 3.5H7A3.5 3.5 0 0 1 3.5 13V7A3.5 3.5 0 0 1 7 3.5zm0 1.5A2 2 0 0 0 5 7v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm3 2.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6zm0 1.5a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm3.2-2.4a.7.7 0 1 1 0 1.4.7.7 0 0 1 0-1.4z"/>',
    Document: '<path d="M5.5 3.5h6l3.5 3.5v9.5h-9.5z"/>'
  };
  function pfBadge(it) {
    var p = pfOf(it), ic = PF_ICON[p] || PF_ICON[kindOf(it) === 'video' ? 'YouTube' : 'News'];
    return '<span class="ir-pfb" style="--pc:' + pfColor(p) + '"><svg viewBox="0 0 20 20" aria-hidden="true">' + ic + '</svg></span>';
  }
  // a link shortener's or a share link's host is not an outlet: it has no logo of its own (search.app, spotify.link, t.co ...)
  var NO_LOGO = /(^|\.)(news\.google\.com|google\.com|youtube\.com|youtu\.be|x\.com|twitter\.com|t\.me|bing\.com|facebook\.com|fb\.watch|instagram\.com|threads\.net|tiktok\.com|t\.co|bit\.ly|lnkd\.in|search\.app|spotify\.link|goo\.gl|tinyurl\.com|ow\.ly|buff\.ly|dlvr\.it|trib\.al|flip\.it|apple\.news|share\.google|on\.soundcloud\.com|linktr\.ee)$/;
  /* A LOGO THAT IS NOT THERE (24 Oct 2026). For a site it does not know, Google answers its own 16x16 grey globe (measured:
     english.aawsat.com, ynetnews.com, idf.il, washingtoninstitute.org, congress.gov, un.org ...), and a face is a CSS
     background, so nothing ever saw it fail. Each domain's logo is now loaded once in the background; one that comes back
     16 pixels or smaller, or not at all, is marked bad, and every face and thumbnail already drawn with it turns into the
     source's initials (favGone), so the next draw asks for none. */
  var FAV_BAD = {}, FAV_ASKED = {};
  function favCheck(dom, u) {
    if (FAV_ASKED[dom]) return; FAV_ASKED[dom] = 1;
    var im = new Image();
    im.onload = function () { if (im.naturalWidth <= 16) { FAV_BAD[dom] = 1; favGone(dom); } };
    im.onerror = function () { FAV_BAD[dom] = 1; favGone(dom); };
    im.src = u;
  }
  function favGone(dom) {
    [].forEach.call(document.querySelectorAll('[data-fav]'), function (el) {
      if (el.getAttribute('data-fav') !== dom) return;
      var ini = '<i>' + esc(el.getAttribute('data-ini') || '?') + '</i>';
      el.removeAttribute('data-fav');
      if (el.classList.contains('ir-by-av')) { el.style.backgroundImage = ''; el.classList.remove('is-logo'); el.classList.add('is-mono'); el.insertAdjacentHTML('afterbegin', ini); }
      else {
        var ii = el.querySelector('.ir-th-i'), lc = el.getAttribute('data-loc') ? locator(el.getAttribute('data-loc')) : '';
        if (ii) ii.parentNode.removeChild(ii);
        el.classList.remove('ir-th-logo');
        if (lc) { el.classList.add('ir-th-loc'); el.style.backgroundImage = cssUrl(lc); }          // back to the place's globe
        else { el.classList.add('ir-th-mono'); el.insertAdjacentHTML('afterbegin', ini); }
      }
    });
  }
  function logoDom(it) {
    var dom = String(FACE_DOM[it.h] || it.dm || (it.src === 'YouTube' ? '' : hostOf(it.u))).toLowerCase();
    return dom && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(dom) && !NO_LOGO.test(dom) && !FAV_BAD[dom] ? dom : '';
  }
  function faceUrl(it, big) {
    if (!(pics() || it._pics)) return '';
    if (it.src === 'X') return avOf(it, big ? '200x200' : 'bigger');
    var yt = FACE_YT[it.h] || it.yav || '';          // it.yav: a channel picture a forces search kept (build/intel_forces.py 4b)
    if (/^https:\/\/yt3\.(?:ggpht|googleusercontent)\.com\/[A-Za-z0-9_\/=+-]+$/.test(yt)) return yt.replace(/=s\d+-/, big ? '=s176-' : '=s88-');
    var dom = logoDom(it);
    if (!dom) return '';
    var u = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(dom) + '&sz=' + (big ? 128 : 64);
    favCheck(dom, u);
    return u;
  }
  // the attributes that let favGone turn a logo drawn from a bad domain back into initials
  function favAttrs(it, u) {
    var m = /^https:\/\/www\.google\.com\/s2\/favicons\?domain=([^&]+)/.exec(u || '');
    return m ? ' data-fav="' + esc(decodeURIComponent(m[1])) + '" data-ini="' + esc(initials(it)) + '"' : '';
  }
  function whoFace(it, big) {
    var u = faceUrl(it, big), cls = !u ? ' is-mono' : it.src === 'X' || it.src === 'YouTube' ? '' : ' is-logo';
    return '<span class="ir-by-av' + cls + '"' + favAttrs(it, u) + ' style="--pc:' + pfColor(pfOf(it)) + (u ? ';background-image:' + esc(cssUrl(u)) : '') + '" aria-hidden="true">' +
      (u ? '' : '<i>' + esc(initials(it)) + '</i>') + pfBadge(it) + '</span>';
  }
  function byline(it, big) {
    var nm = whoName(it); if (!nm) return '';
    var pn = pfName(pfOf(it));
    // a handle on X; elsewhere the platform by name (YouTube, News), unless the name already is it ("FB Facebook Facebook")
    var h = it.src === 'X' ? (it.h && it.h.toLowerCase() !== nm.toLowerCase() ? it.h : '') : String(pn).toLowerCase() !== nm.toLowerCase() ? pn : '';
    return '<span class="ir-by' + (big ? ' ir-by-big' : '') + '">' + whoFace(it, big) + '<b' + DA + '>' + bd(esc(nm)) + '</b>' + (h ? '<small>' + (it.src === 'X' ? handle(h) : esc(h)) + '</small>' : '') + '</span>';
  }
  // Shouting taken out of a line the room writes itself (the story line under a pill): a run of three or more words in
  // capitals, or one word of four or more, is written as a word; a known short acronym stays (US, FBI, IDF, NATO).
  var ACRO = /^(US|USA|UK|EU|UN|FBI|DOJ|CIA|NSA|IDF|GOP|DNC|RNC|NATO|AP|BBC|CNN|ICE|IRGC|NYC|DC|AI|MSNBC|OPEC|NASA|HAMAS|ISIS|DHS|DOD|DOGE|CEO|GDP|IMF|WHO|NHS|MP|PM|SEC|CBS|NBC|ABC|TV|LGBT|LGBTQ|USAID|UNRWA|ICC|ICJ|MAGA|WNBA|NFL|NBA|EV|OK)$/;
  var SMALLW = /^(a|an|and|as|at|but|by|for|from|in|into|of|on|or|over|the|to|vs|with)$/i;
  function unshout(t) {
    var word = function (w) { return ACRO.test(w.replace(/['’]/g, '')) ? w : w.charAt(0) + w.slice(1).toLowerCase(); };
    t = String(t || '').replace(/\b[A-Z][A-Z'’]*(?:[\s,:;.!?&–—-]+[A-Z][A-Z'’]*){2,}\b/g, function (run) {
      var n = 0;
      return run.replace(/\b[A-Z][A-Z'’]*\b/g, function (w) { n++; return n > 1 && SMALLW.test(w) ? w.toLowerCase() : word(w); });
    });
    return t.replace(/\b[A-Z][A-Z'’]{3,}\b/g, word);
  }
  // The place, drawn from the room's own map: a globe turned to it, the land as on the big map, the country lit in the
  // room's gold, a pin on the spot. One picture a place and size, made once and kept (a JPEG of a few KB).
  var LOC = {};
  function locator(k, big) {
    var key = k + (big ? '|b' : '|s');
    if (LOC[key] !== undefined) return LOC[key];
    var pl = P[k];
    if (!G || !LAND || !pl || pl[2] == null || pl[3] == null) return '';          // not cached: the map can still arrive
    var out = '';
    try {
      var W = big ? 960 : 240, H = big ? 540 : 150, c = document.createElement('canvas');
      c.width = W; c.height = H;
      var x = c.getContext('2d'), lon = +pl[3], lat = +pl[2], cn = TOPO[pl[1]] || pl[1], feats = BYNAME[cn] || [];
      var pj = G.geoOrthographic().clipAngle(90).rotate([-lon, -lat]).translate([W / 2, H / 2]).scale(W * 1.4);
      // frame the country when it is small enough to read, else stay close on the place; never so near the land is lost
      var b = feats.length ? G.geoPath(pj).bounds({ type: 'FeatureCollection', features: feats }) : null;
      if (b && isFinite(b[0][0])) {
        var f = Math.min(W * 0.62 / Math.max(1, b[1][0] - b[0][0]), H * 0.62 / Math.max(1, b[1][1] - b[0][1]));
        pj.scale(Math.max(W * 0.45, Math.min(W * 7, W * 1.4 * f)));
      }
      var path = G.geoPath(pj, x), R = pj.scale();
      var bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#12141A'); bg.addColorStop(1, '#07080B');
      x.fillStyle = bg; x.fillRect(0, 0, W, H);
      x.beginPath(); path({ type: 'Sphere' }); x.fillStyle = '#0D0F14'; x.fill();
      if (R < W * 1.2) { x.lineWidth = big ? 1.5 : 0.8; x.strokeStyle = 'rgba(' + GOLD + ',0.35)'; x.stroke(); }
      x.lineWidth = big ? 1 : 0.5; x.strokeStyle = 'rgba(233,217,166,0.07)'; x.beginPath(); path(GRAT || G.geoGraticule().step([15, 15])()); x.stroke();
      x.beginPath(); LAND.forEach(function (ft) { path(ft); }); x.fillStyle = '#2A2721'; x.fill();
      x.strokeStyle = 'rgba(138,126,98,0.6)'; x.lineWidth = big ? 1.2 : 0.6; x.stroke();
      if (feats.length) { x.beginPath(); feats.forEach(function (ft) { path(ft); }); x.fillStyle = 'rgba(' + GOLD + ',0.24)'; x.fill(); x.strokeStyle = GOLDH; x.lineWidth = big ? 2.4 : 1.2; x.stroke(); }
      var pt = pj([lon, lat]);
      if (pt) {
        var s = big ? 3.2 : 1, gl = x.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], 16 * s);
        gl.addColorStop(0, 'rgba(' + GOLD + ',0.55)'); gl.addColorStop(1, 'rgba(' + GOLD + ',0)');
        x.fillStyle = gl; x.beginPath(); x.arc(pt[0], pt[1], 16 * s, 0, 2 * Math.PI); x.fill();
        x.fillStyle = GOLDH; x.strokeStyle = '#0B0D12'; x.lineWidth = 1.5 * s; x.beginPath(); x.arc(pt[0], pt[1], 4 * s, 0, 2 * Math.PI); x.fill(); x.stroke();
      }
      out = c.toDataURL('image/jpeg', big ? 0.86 : 0.8);
    } catch (e) { out = ''; }
    return (LOC[key] = out);
  }
  /* THE POST IT ANSWERS (24 Oct 2026). Armin, on Hend Amry's quote of BBC News drawn as if it stood alone: "This obviously
     doesn't make any sense in the intel room because it doesn't show that this is a quote post ... You should have been
     showing what is being quoted." An X post now carries the post it quotes (qt), the post it replies to (ry) and X's
     Community Note (nt), build/intel_x.py POST_FIELDS. EVERY surface that draws a post draws them through these helpers and
     nothing else: refHtml for a post drawn large (the spotlight, the show screen), refLine for a card in a list, postText for
     a copy. A new surface that draws a post calls them too, or it shows a quote as if it stood alone. */
  var XS_RX = /^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/\d+$/, NT_RX = /^https:\/\/x\.com\/i\/birdwatch\/n\/\d+$/;
  var ICO_REF = {
    qt: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 5h5.5v5.2H6.4c0 1.7.9 2.7 2.6 3v2.3C5.6 15.1 3.5 13 3.5 9.4zm7.5 0h5.5v5.2h-2.6c0 1.7.9 2.7 2.6 3v2.3c-3.4-.4-5.5-2.5-5.5-6.1z"/></svg>',
    ry: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.2 4.5 3 9.4l5.2 4.9v-3.1c4 0 6.6 1.1 8.8 4.3-.7-4.7-3.4-7.8-8.8-8.3z"/></svg>',
    nt: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.2a3.9 3.9 0 1 1 0 7.8 3.9 3.9 0 0 1 0-7.8zM3 17.2c.5-3.1 3.4-5.1 7-5.1s6.5 2 7 5.1z"/></svg>'
  };
  function refOf(it, k) { var r = it && it.src === 'X' && it[k]; return r && typeof r === 'object' && XS_RX.test(r.u || '') && /^@\w{1,15}$/.test(r.h || '') ? r : null; }
  function noteOf(it) { var n = it && it.src === 'X' && it.nt; return n && typeof n === 'object' && NT_RX.test(n.u || '') && n.t ? n : null; }
  function refMedia(r) { return (r && r.m || []).filter(function (x) { return x && /^https:\/\/pbs\.twimg\.com\/[A-Za-z0-9_\/-]+\.(?:jpg|jpeg|png|webp)$/.test(x.i || ''); }); }
  function refWho(r) { return r.nm ? r.nm : r.h; }
  // one quoted or replied-to post, drawn as X draws a quote: a box with its author, when, its words, its picture or card
  function refBox(it, r, kind, size) {
    var lit = pics() || it._pics, av = lit && AV_RX.test(r.av || '') ? r.av.replace(/_normal\.(\w+)$/, '_200x200.$1') : '';
    var md = refMedia(r), cd = !md.length && r.cd && CARD_RX.test(r.cd.i || '') ? r.cd : null;
    var head = kind === 'ry' ? T('Replying to {who}', { who: refWho(r) }) : T('Quoting {who}', { who: refWho(r) }), rg = isRegime(it);          // a regime post is never a link (THE REGIME RULE), nor what it quotes
    return '<' + (rg ? 'div' : 'a') + ' class="ir-ref ir-ref-' + kind + (size ? ' ' + size : '') + '"' + (rg ? '' : ' href="' + esc(r.u) + '" target="_blank" rel="noopener"') + '>' +
      '<span class="ir-ref-k">' + ICO_REF[kind] + bd(esc(head)) + '</span>' +
      '<span class="ir-ref-h">' + (av ? '<span class="ir-ref-av" style="background-image:' + esc(cssUrl(av)) + '"></span>' : '<span class="ir-ref-av is-mono">' + esc(String(refWho(r)).replace(/^@/, '').slice(0, 1).toUpperCase()) + '</span>') +
      '<span class="ir-ref-who"><b' + DA + '>' + bd(esc(refWho(r))) + '</b><small>' + [r.h ? handle(r.h) : '', r.d ? esc(fmtDate(r.d)) : ''].filter(Boolean).join(' · ') + '</small></span></span>' +
      (r.t ? '<span class="ir-ref-t"' + DA + '>' + esc(r.t) + '</span>' : '<span class="ir-ref-t is-dim">' + esc(kind === 'ry' ? T('Open it on X to read the post it answers.') : T('Open it on X to see the post it quotes.')) + '</span>') +
      (r.mo ? '<span class="ir-ref-mo">' + esc(kindOf(it) === 'video' ? T('The video is from this quoted post.') : T('The pictures are from this quoted post.')) + '</span>' : '') +
      (lit && md.length ? '<span class="ir-ref-i' + (md[0].t !== 'p' ? ' is-v' : '') + '" style="background-image:' + esc(cssUrl(pic(md[0], 'small'))) + '"></span>' : '') +
      (lit && cd ? '<span class="ir-ref-i is-cd" style="background-image:' + esc(cssUrl(cdPic(cd.i, '600x314'))) + '"></span>' : '') +
      (cd && (cd.t || cd.dm) ? '<span class="ir-ref-ct">' + (cd.dm ? '<small>' + esc(cd.dm) + '</small>' : '') + esc(cd.t || '') + '</span>' : '') +
      (rg ? '</div>' : '</a>');
  }
  function noteHtml(n, size, rg) {          // rg: under a regime post, no link (THE REGIME RULE)
    return '<aside class="ir-note' + (size ? ' ' + size : '') + '"><b>' + ICO_REF.nt + esc(T('Readers added context')) + '</b><span class="ir-note-t"' + DA + '>' + esc(n.t) + '</span>' +
      (rg ? '' : '<a href="' + esc(n.u) + '" target="_blank" rel="noopener">' + esc(T('The note on X')) + '</a>') + '</aside>';
  }
  // a poll on the post (po, 24 Oct 2026): the post is only its question, so its choices and votes are drawn with it
  function pollOf(it) {
    var o = it && it.src === 'X' && it.po, c = o && o.c;
    return Array.isArray(c) && c.length >= 2 && c.length <= 4 && c.every(function (x) { return x && x.t && typeof x.n === 'number' && x.n >= 0; }) ? o : null;
  }
  function pollTotal(o) { return o.c.reduce(function (a, x) { return a + x.n; }, 0); }
  function pollPc(o, x) { var tot = pollTotal(o); return tot ? Math.round(x.n * 100 / tot) : 0; }
  function pollHtml(o, size) {
    var tot = pollTotal(o), top = Math.max.apply(null, o.c.map(function (x) { return x.n; }));
    return '<aside class="ir-poll' + (size ? ' ' + size : '') + '"><b>' + esc(T('Poll')) + '</b>' + o.c.map(function (x) {
      var pc = pollPc(o, x);
      return '<span class="ir-poll-r' + (tot && x.n === top ? ' is-top' : '') + '"><span class="ir-poll-bar" style="width:' + pc + '%"></span>' +
        '<span class="ir-poll-t"' + DA + '>' + esc(x.t) + '</span><span class="ir-poll-n">' + N(pc) + '%</span></span>';
    }).join('') + '<small>' + esc(T('{n} votes', { n: N(tot) })) + (o.f ? ' · ' + esc(T('Final results')) : '') + '</small></aside>';
  }
  // {before: the post it replies to, drawn above the post's words; after: its poll, the post it quotes and the note, under them}
  function refHtml(it, size) {
    var ry = refOf(it, 'ry'), qt = refOf(it, 'qt'), nt = noteOf(it), po = pollOf(it);
    return { before: ry ? refBox(it, ry, 'ry', size) : '', after: (po ? pollHtml(po, size) : '') + (qt ? refBox(it, qt, 'qt', size) : '') + (nt ? noteHtml(nt, size, isRegime(it)) : '') };
  }
  // a card in a list: one line under its words, so a quote never reads as a post that stands alone
  function refLine(it) {
    var qt = refOf(it, 'qt'), ry = refOf(it, 'ry'), r = qt || ry, s = '';
    if (r) s += '<span class="ir-c-q">' + ICO_REF[qt ? 'qt' : 'ry'] + '<b>' + bd(esc(qt ? T('Quoting {who}', { who: refWho(r) }) : T('Replying to {who}', { who: refWho(r) }))) + '</b>' + (r.t ? ' <span' + DA + '>' + esc(cut(r.t, 140)) + '</span>' : '') + '</span>';
    var po = pollOf(it);
    if (po) s += '<span class="ir-c-q"><b>' + esc(T('Poll')) + '</b> <span' + DA + '>' + esc(cut(po.c.map(function (x) { return x.t; }).join(' / '), 140)) + '</span></span>';
    if (noteOf(it)) s += '<span class="ir-c-nt">' + ICO_REF.nt + esc(T('Readers added context')) + '</span>';
    return s;
  }
  // a copy of a post carries what it answers and its note, so a pasted quote still makes sense
  function postText(it) {
    var t = fullText(it), qt = refOf(it, 'qt'), ry = refOf(it, 'ry'), nt = noteOf(it);
    var who = function (r) { return r.nm ? r.nm + ' (' + r.h + ')' : r.h; };
    if (ry && ry.t) t = T('Replying to {who}', { who: who(ry) }) + ': ' + ry.t + '\n\n' + t;
    var po = pollOf(it);
    if (po) t += '\n\n' + T('Poll') + ': ' + po.c.map(function (x) { return x.t + ' ' + pollPc(po, x) + '%'; }).join(' / ');
    if (qt) t += '\n\n' + T('Quoting {who}', { who: who(qt) }) + ': ' + (qt.t || qt.u);
    if (nt) t += '\n\n' + T('Readers added context') + ': ' + nt.t;
    return t;
  }
  // the spotlight's picture when the item has no video or pictures of its own
  function heroHtml(it) {
    if (xWords(it)) {
      var lit = pics() || it._pics, av = lit ? avOf(it, '400x400') : '', cd = lit ? cardOf(it) : null, words = it.tx && it.tx.length > it.t.length ? it.tx : it.t, rf = refHtml(it);
      return '<figure class="ir-post" style="--pc:' + pfColor(pfOf(it)) + '">' +
        '<figcaption class="ir-post-h">' + (av ? '<span class="ir-post-av" style="background-image:' + esc(cssUrl(av)) + '"></span>' : '<span class="ir-post-av is-mono">' + esc(initials(it)) + '</span>') +
        '<span class="ir-post-who"><b' + DA + '>' + bd(esc(it.nm || it.h)) + '</b><small>' + handle(it.h || '') + '</small></span>' + mark(it, 'ir-post-mk') + '</figcaption>' +
        rf.before + '<blockquote class="ir-post-t"' + DA + '>' + esc(words) + '</blockquote>' +
        (cd ? (isRegime(it) ? '<span class="ir-post-card">' : '<a class="ir-post-card" href="' + esc(it.u) + '" target="_blank" rel="noopener">') + '<span class="ir-post-ci" style="background-image:' + esc(cssUrl(cdPic(cd.i, '800x419'))) + '"></span>' +
          (cd.t || cd.dm ? '<span class="ir-post-ct">' + (cd.dm ? '<small>' + esc(cd.dm) + '</small>' : '') + (cd.t ? esc(cd.t) : '') + '</span>' : '') + (isRegime(it) ? '</span>' : '</a>') : '') +
        rf.after + '</figure>';
    }
    var v = vis(it, true), where = it.p === 'global' && it.pw ? it.pw : placeName(it.p);
    var lc = v.k === 'pic' ? locator(it.p, true) : '';
    if (v.k === 'pic') return '<figure class="ir-hero"><span class="ir-hero-i" style="background-image:' + esc(cssUrl(v.u)) + (lc ? ',' + esc(cssUrl(lc)) : '') + '"></span>' + (it.th0 ? '<figcaption>' + T('Picture: Bing News') + '</figcaption>' : '') + '</figure>';
    if (v.k === 'loc') return '<figure class="ir-hero is-loc"><span class="ir-hero-i" style="background-image:' + esc(cssUrl(v.u)) + '"></span><figcaption class="ir-hero-pl">' + esc(where + (P[it.p] && P[it.p][1] && P[it.p][1] !== where && cName(P[it.p][1]) !== where && (!DA || where.indexOf(cName(P[it.p][1])) !== 0) ? T(', ') + cName(P[it.p][1]) : '')) + '</figcaption></figure>';
    return '';
  }
  function thumb(it) {
    var p = pfOf(it), m = mark(it), pc = '--pc:' + pfColor(p);
    var md = mediaOf(it), vid = kindOf(it) === 'video', d = vid ? fmtDur(it.dur || (md[0] && md[0].s)) : '';
    m += d ? '<b class="ir-th-d num">' + d + '</b>' : '';
    // a picture X marks as possibly sensitive is blurred in the list; the spotlight asks before it shows it
    if (it.sn && md.length && pics()) return '<span class="ir-th is-sn' + (vid ? ' yt' : '') + '" style="' + pc + '"><span class="ir-th-i" style="background-image:' + esc(cssUrl(pic(md[0], '240x240'))) + '"></span>' + m + '</span>';
    var v = vis(it), under = v.k === 'pic' || v.k === 'av' ? locator(it.p) : '';          // shows only if the picture fails
    if (v.k === 'pic') return '<span class="ir-th' + (vid ? ' yt' : '') + '" style="' + pc + ';background-image:' + esc(cssUrl(v.u)) + (under ? ',' + esc(cssUrl(under)) : '') + '">' + m + '</span>';
    // an X post of words only: the author's face, sharp in the middle of the same face blurred (as a chat app previews it)
    if (v.k === 'av') return '<span class="ir-th ir-th-av" style="' + pc + (under ? ';background-image:' + esc(cssUrl(under)) : '') + '"><span class="ir-th-i" style="background-image:' + esc(cssUrl(v.u)) + '"></span><span class="ir-th-a" style="background-image:' + esc(cssUrl(v.u)) + '"></span>' + m + '</span>';
    // an article with no picture shows its outlet's logo (FACES), before the place's globe: who said it tells a reader more
    // than where (24 Oct 2026: 101 free-media articles on the Iran page showed a globe though their logo was known). Never
    // for regime media, whose logo is never asked for. A logo that turns out to be Google's blank goes back to the globe.
    var lg = it.src !== 'X' && !isRegime(it) ? faceUrl(it, true) : '';
    if (lg) return '<span class="ir-th ir-th-logo"' + favAttrs(it, lg) + (v.k === 'loc' ? ' data-loc="' + esc(it.p) + '"' : '') + ' style="' + pc + '"><span class="ir-th-i" style="background-image:' + esc(cssUrl(lg)) + '"></span>' + m + '</span>';
    if (v.k === 'loc') return '<span class="ir-th ir-th-loc" style="' + pc + ';background-image:' + esc(cssUrl(v.u)) + '">' + m + '</span>';
    return '<span class="ir-th ir-th-mono" style="' + pc + '"><i>' + esc(initials(it)) + '</i>' + m + '</span>';
  }
  function card(it, i) {
    var where = it.p === 'global' && it.pw ? it.pw : placeName(it.p);
    // who posted it leads the card (byline); the meta line keeps when and where
    var by = byline(it), meta = '<span>' + esc(it.pend && !it.d ? T('Sent {t}', { t: ago(it.ms) }) : fmtDate(it.d)) + '</span> · ' + esc(where) + (by ? '' : ' · ' + bd(esc(it.h || it.src))) + badges(it);
    var tags = hotTag(it) + viralTag(it) + reachLine(it) + spreadTag(it);
    var sx = CARDX ? xcall(CARDX, it) || '' : '';          // the card's Save button (SAVE LISTS): a sibling, so the card stays one tap target
    return '<li class="ir-card' + (i === spotAt ? ' on' : '') + (it.hot != null ? ' is-live' : '') + (sx ? ' has-sv' : '') + '"><button type="button" data-i="' + i + '">' + thumb(it) +
      '<span>' + by + '<span class="ir-c-t"' + DA + '>' + esc(it.t) + '</span>' + refLine(it) + '<span class="ir-c-m">' + meta + '</span>' + (tags ? '<span class="ir-c-x">' + tags + '</span>' : '') + '</span></button>' + sx + '</li>';
  }
  /* AN ITEM DRAWN AS THE ROOM DRAWS IT, for an add-on's own list (24 Oct 2026, Armin on a warship's card: "news items
     related to it (x posts, YouTube, articles etc) shown here, the same way that you show it on the intel room"). The same
     picture, face, headline, age and counts as card(); attrs are the button's own data attributes, so the add-on decides
     what a tap does (build/intel-forces.js opens it in this spotlight through openList). "da": the date is approximate
     (YouTube says "3 weeks ago"), so it says "about". */
  function cardFor(it, attrs) {
    var when = it.d ? (it.da ? T('about {t}', { t: fmtDate(it.d) }) : fmtDate(it.d)) : T('No date on it');
    var by = byline(it), meta = '<span>' + esc(when) + '</span>' + (by ? '' : ' · ' + bd(esc(it.h || it.src))) + badges(it), tags = reachLine(it);
    return '<li class="ir-card"><button type="button" ' + (attrs || '') + '>' + thumb(it) + '<span>' + by + '<span class="ir-c-t"' + DA + '>' + esc(it.t) + '</span>' + refLine(it) + '<span class="ir-c-m">' + meta + '</span>' +
      (tags ? '<span class="ir-c-x">' + tags + '</span>' : '') + '</span></button></li>';
  }
  /* NEVER A DEAD END (23 Oct 2026). A story, a search or a subject that leaves fewer than SHOW_MIN things ends in the way
     to more: the same search on X, YouTube and Google News, each in a new tab, and every filter cleared in one tap. */
  function moreSources() {
    if (S.lens !== 'live' || shown.length >= SHOW_MIN) return '';
    var h = S.hot && S.hot !== 'all' && S.hot !== 'blind' ? hotById(S.hot) : null;
    var q = h ? (h.q || h.name) : S.q ? S.q : S.tp.length ? S.tp.map(topicName).join(' ') : '';
    q = String(q || '').replace(/[^\p{L}\p{N}\s'’.-]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (!q) return '';
    var e = encodeURIComponent(q);
    var a = function (u, p, w) { return '<a href="' + u + '" target="_blank" rel="noopener" style="--pc:' + pfColor(p) + '"><svg viewBox="0 0 20 20" aria-hidden="true">' + PF_ICON[p] + '</svg><span>' + w + '</span></a>'; };
    return '<li class="ir-moresrc"><p>' + T('Only {n} here. Find more on:', { n: N(shown.length) }) + '</p><div>' +
      a('https://x.com/search?q=' + e + '&f=top', 'X', T('More on X')) + a('https://www.youtube.com/results?search_query=' + e, 'YouTube', T('More on YouTube')) +
      a('https://news.google.com/search?q=' + e, 'News', T('More in the news')) + (nActive() ? '<button type="button" data-clear>' + T('Clear every filter') + '</button>' : '') + '</div></li>';
  }
  function moreText() { return T('Show {n} more ({m} left)', { n: N(Math.min(PAGE_N, shown.length - limit)), m: N(shown.length - limit) }); }
  function drawList() {
    var ol = $('ir-items');
    if (!shown.length) {
      ol.innerHTML = S.lens === 'readers' && !items.length
        ? '<li class="ir-empty">' + (rdState === 'loading' ? T('Loading what readers sent.') : rdState === 'off' ? T('Readers\' finds show here on the live site.') : T('Nothing waiting to be checked right now.')) + '<br><a href="#add">' + T('Be the next to add something') + '</a></li>'
        : '<li class="ir-empty">' + T('Nothing here matches all of that.') + '<br><button type="button" data-clear>' + T('Clear every filter') + '</button></li>';
    } else {
      ol.innerHTML = shown.slice(0, limit).map(card).join('') + (shown.length <= limit ? moreSources() : '');
    }
    $('ir-more').hidden = shown.length <= limit;
    $('ir-more').textContent = moreText();
    var n = shown.length, w = S.lens === 'live' ? (n === 1 ? T('story') : T('stories')) : S.lens === 'readers' ? (n === 1 ? T('find') : T('finds')) : (n === 1 ? T('item') : T('items'));
    var nn = S.lens === 'live' && SEEN_AT ? shown.filter(isNew).length : 0;
    // 22 Oct 2026 (his: "it doesn't have enough tweets"): how many of what is listed are X posts, the thing he puts on air,
    // so a story's chip shows at once whether it holds 3 posts or 30.
    var nxp = S.lens === 'live' ? shown.filter(function (it) { return it.src === 'X'; }).length : 0;
    $('ir-count').innerHTML = '<b class="num">' + N(n) + '</b> ' + w + (n === nOwn() ? (S.lens === 'bank' ? T(' in the bank') : S.lens === 'live' ? T(' in 24 hours') : T(' waiting')) : T(' match')) +
      (nxp ? ' <span class="ir-xn">· ' + T('{n} on X', { n: N(nxp) }) + '</span>' : '') +
      (nn ? ' <span class="ir-newn" title="' + T('Since your last visit to the room on this device') + '">' + T('{n} new', { n: N(nn) }) + '</span>' : '');
    $('ir-copy').hidden = !n; $('ir-tour').hidden = !n;
  }

  /* ------------------------------------------------------------ the map: a globe that also lays flat
     One canvas draws the Earth with d3-geo (assets/intel-geo.js?v=1bec8431b4): the globe is orthographic, the flat map Natural Earth,
     and both come from the same view, V: the longitude and latitude at the middle and a zoom. One SVG over it carries the
     marks, so each stays a real button with a name. The night side is the real one, from where the sun is now. */
  var G = window.d3 && window.d3.geoOrthographic ? window.d3 : null;
  var map = $('ir-map'), box = $('ir-mapbox'), cv = null, ctx = null, gPins = null;
  var V = { mode: 'globe', lon: 32, lat: 28, k: 1 }, moving = 0, LAND = null, LAND_HI = null, hiLoaded = false, dpr = 1, CW = 0, CH = 0, PJ = null;
  var BYNAME = {}, BYNAME_HI = {}, HEAT = {}, SELC = '', GRAT = null, EQ = { type: 'LineString', coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]] };
  var HEATC = ['', '#2B271D', '#36301C', '#46391B', '#5E4A1C'];

  // TopoJSON (world-atlas, Natural Earth) to features, the same as topojson-client's feature(): arcs undone, rings joined.
  function topoFeatures(t, byName) {
    var tf = t.transform, sx = tf ? tf.scale[0] : 1, sy = tf ? tf.scale[1] : 1, tx = tf ? tf.translate[0] : 0, ty = tf ? tf.translate[1] : 0;
    var arcs = t.arcs.map(function (a) { var x = 0, y = 0; return a.map(function (p) { if (!tf) return [p[0], p[1]]; x += p[0]; y += p[1]; return [x * sx + tx, y * sy + ty]; }); });
    function ring(ids) {
      var pts = [];
      ids.forEach(function (i) { var a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]; pts = pts.length ? pts.concat(a.slice(1)) : a.slice(); });
      return pts;
    }
    var out = [];
    t.objects.countries.geometries.forEach(function (g) {
      var polys = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : null;
      if (!polys) return;
      var f = { type: 'Feature', properties: { name: g.properties.name }, geometry: { type: 'MultiPolygon', coordinates: polys.map(function (p) { return p.map(ring); }) } };
      out.push(f);
      (byName[f.properties.name] = byName[f.properties.name] || []).push(f);
    });
    return out;
  }
  function baseR() { return V.mode === 'globe' ? Math.min(CW, CH) * 0.46 : Math.min(CW / 5.6, CH / 2.9); }
  function makeProj() {
    var p = V.mode === 'globe' ? G.geoOrthographic().clipAngle(90).rotate([-V.lon, -V.lat]) : G.geoNaturalEarth1().rotate([-V.lon, 0]);
    p.scale(baseR() * V.k).translate([CW / 2, CH / 2]).precision(V.k > 12 ? 0.25 : 0.6);
    if (V.mode !== 'globe') { var c = p([V.lon, V.lat]); p.translate([CW - c[0], CH - c[1]]); }
    return p;
  }
  function seen(lon, lat) { return V.mode !== 'globe' || G.geoDistance([lon, lat], [V.lon, V.lat]) < Math.PI / 2 - 0.02; }
  function sizeCanvas() {
    CW = box.clientWidth; CH = box.clientHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(CW * dpr)); cv.height = Math.max(1, Math.round(CH * dpr));
    cv.style.width = CW + 'px'; cv.style.height = CH + 'px';
  }
  // Where the sun is overhead now, and so the middle of the night opposite it (declination by day of year; the equation
  // of time is left out, so the line can sit up to 4 degrees off: it is a picture of night, not a clock).
  function nightAt() {
    var d = new Date(), day = (d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5;
    var decl = -23.44 * Math.cos(2 * Math.PI / 365 * (day + 10)), lon = (12 - d.getUTCHours() - d.getUTCMinutes() / 60) * 15 + 180;
    return [((lon + 540) % 360) - 180, -decl];
  }

  var drawQ = 0, drawT = 0;
  function requestDraw() {
    if (drawQ) return;
    drawQ = requestAnimationFrame(function () { drawQ = 0; drawNow(); });
    clearTimeout(drawT);
    drawT = setTimeout(function () { if (drawQ) { cancelAnimationFrame(drawQ); drawQ = 0; drawNow(); } }, 140);      // a tab in the background gets no frames
  }
  function drawNow() {
    if (!ctx || !LAND) return;
    if (box.clientWidth !== CW || box.clientHeight !== CH) sizeCanvas();
    if (!CW || !CH) return;
    PJ = makeProj();
    var path = G.geoPath(PJ, ctx), globe = V.mode === 'globe', R = PJ.scale(), cx = CW / 2, cy = CH / 2, land = LAND_HI && (V.k >= 8 || (V.k >= 2.5 && !moving)) ? LAND_HI : LAND;          // the light outline while it moves, the fine one once it stops
    var byName = land === LAND_HI ? BYNAME_HI : BYNAME;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CW, CH);
    if (globe && R < Math.hypot(CW, CH)) {          // the haze round the rim
      var hz = ctx.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 1.18);
      hz.addColorStop(0, 'rgba(' + GOLD + ',0.26)'); hz.addColorStop(0.3, 'rgba(' + GOLD + ',0.08)'); hz.addColorStop(1, 'rgba(' + GOLD + ',0)');
      ctx.fillStyle = hz; ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.beginPath(); path({ type: 'Sphere' });
    if (globe) { var sg = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.42, R * 0.05, cx, cy, R); sg.addColorStop(0, '#171A21'); sg.addColorStop(0.7, '#0B0D12'); sg.addColorStop(1, '#050608'); ctx.fillStyle = sg; }
    else ctx.fillStyle = '#0A0B0F';
    ctx.fill();
    ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(233,217,166,0.08)';
    ctx.beginPath(); path(GRAT); ctx.stroke();
    ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(' + GOLD + ',0.2)'; ctx.beginPath(); path(EQ); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); land.forEach(function (f) { path(f); }); ctx.fillStyle = '#25231E'; ctx.fill();
    Object.keys(HEAT).forEach(function (n) {          // each country glows by how much of what is shown is about it
      if (!byName[n] || n === SELC) return;
      ctx.beginPath(); byName[n].forEach(function (f) { path(f); }); ctx.fillStyle = HEATC[HEAT[n]]; ctx.fill();
    });
    ctx.beginPath(); land.forEach(function (f) { path(f); }); ctx.strokeStyle = 'rgba(138,126,98,0.55)'; ctx.lineWidth = 0.6; ctx.stroke();
    if (SELC && byName[SELC]) { ctx.beginPath(); byName[SELC].forEach(function (f) { path(f); }); ctx.fillStyle = 'rgba(' + GOLD + ',0.1)'; ctx.fill(); ctx.strokeStyle = GOLDH; ctx.lineWidth = 1.4; ctx.stroke(); }
    ctx.beginPath(); path(G.geoCircle().center(nightAt()).radius(90)()); ctx.fillStyle = 'rgba(0,0,0,0.24)'; ctx.fill();
    if (globe) { ctx.beginPath(); path({ type: 'Sphere' }); ctx.strokeStyle = 'rgba(' + GOLD + ',0.5)'; ctx.lineWidth = 1.1; ctx.stroke(); }
    var sw = $('ir-sweep');
    if (sw) {          // the sweep sits on the globe; once the globe is bigger than the box it covers the box
      var big = !globe || R * 2 > Math.hypot(CW, CH);
      sw.style.cssText = '--sx:' + cx.toFixed(1) + 'px;--sy:' + cy.toFixed(1) + 'px;--sr:' + R.toFixed(1) + 'px';
      sw.hidden = big;
    }
    var hud = $('ir-hud-c');
    if (hud) hud.textContent = N(Math.abs(V.lat).toFixed(1)) + '°' + (V.lat >= 0 ? T('N') : T('S')) + ' ' + N(Math.abs(V.lon).toFixed(1)) + '°' + (V.lon >= 0 ? T('E') : T('W')) + '  ×' + N(V.k < 10 ? V.k.toFixed(1) : Math.round(V.k));
    drawPinsNow();
    for (var li = 0; li < LAYERS.length; li++) xcall(LAYERS[li].draw);          // an add-on's marks move with the map on every frame
  }
  function setView(lon, lat, k, now) {
    V.k = Math.max(1, Math.min(MAXK, k));
    V.lat = Math.max(V.mode === 'globe' ? -80 : -58, Math.min(80, lat));
    V.lon = ((lon % 360) + 540) % 360 - 180;
    if (V.k >= 2.5 && !hiLoaded) loadHi();
    if (now) drawNow(); else requestDraw();
  }
  // Move the Earth by dx, dy screen pixels, so the ground under a finger follows it.
  function panBy(dx, dy) {
    if (!PJ) PJ = makeProj();
    var s = PJ.scale(), deg = 180 / Math.PI;
    if (V.mode === 'globe') { setView(V.lon - dx / s * deg / Math.max(0.2, Math.cos(V.lat / deg)), V.lat + dy / s * deg, V.k); return; }
    var a = PJ.invert([CW / 2, CH / 2]), b = PJ.invert([CW / 2 - dx, CH / 2 - dy]);
    if (!a || !b || !isFinite(a[0]) || !isFinite(b[0])) return;
    var dl = b[0] - a[0]; if (dl > 180) dl -= 360; if (dl < -180) dl += 360;
    setView(V.lon + dl, V.lat + (b[1] - a[1]), V.k);
  }
  function zoomAt(f, px, py) {
    if (!PJ) PJ = makeProj();
    var k = Math.max(1, Math.min(MAXK, V.k * f));
    if (k === V.k) return;
    var at = PJ.invert([px, py]);
    V.k = k; PJ = makeProj();
    if (at && isFinite(at[0]) && isFinite(at[1]) && seen(at[0], at[1])) {
      var to = PJ(at);
      if (to && isFinite(to[0])) { panBy(px - to[0], py - to[1]); return; }
    }
    setView(V.lon, V.lat, k);
  }
  var anim = 0;
  function flyTo(k, lon, lat) {
    if (!G || !LAND) return;
    k = Math.max(1, Math.min(MAXK, k));
    var k0 = V.k, a = [V.lon, V.lat], b = [lon, lat], ip = G.geoInterpolate(a, b), dist = G.geoDistance(a, b);
    var t0 = performance.now(), dur = reduced() ? 0 : Math.min(1700, 600 + dist * 650 + Math.abs(Math.log(k / k0)) * 90), landed = 0;
    var dip = Math.min(Math.log(Math.max(k0, k)), dist * 1.4);          // a long way out on the way to somewhere far, like a camera
    cancelAnimationFrame(anim);
    (function step(now) {
      var t = dur ? Math.min(1, (now - t0) / dur) : 1, e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var c = ip(e), lk = Math.log(k0) + (Math.log(k) - Math.log(k0)) * e - 4 * e * (1 - e) * dip;
      moving = t < 1 ? 1 : 0;
      setView(c[0], c[1], Math.exp(lk), true);
      if (t < 1) anim = requestAnimationFrame(step); else landed = 1;
    })(t0);
    var mine = anim;
    setTimeout(function () { if (!landed && anim === mine) { cancelAnimationFrame(anim); moving = 0; setView(lon, lat, k, true); } }, dur + 150);
  }
  // Iran Uncensored's room is centred on Iran: home frames CFG.home (Iran, the Gulf and Israel), on the globe and the flat map
  function home() { if (HOME) { fitTo(HOME, 1, 40); return; } if (V.mode === 'globe') flyTo(1, 32, 28); else flyTo(1, 12, 12); }
  var HOME = Array.isArray(CFG.home) && CFG.home.length ? CFG.home : null;          // the flat map's middle sits in the Atlantic so America and Asia both show
  function loadHi() {
    hiLoaded = true;
    fetch(root.getAttribute('data-geo-hi')).then(function (r) { if (!r.ok) throw r; return r.json(); }).then(function (t) {
      LAND_HI = topoFeatures(t, BYNAME_HI); requestDraw();
    }).catch(function () { hiLoaded = false; });
  }
  function drawCountries() {
    // four steps of the brand's gold, by how much of what is shown is about the country; never a new colour
    var n = {}, max = 0;
    HEAT = {};
    (S.lens === 'readers' ? [] : shown).forEach(function (it) { var seen1 = {}; keysOf(it).forEach(function (k) { if (P[k] && P[k][1]) { var c = TOPO[P[k][1]] || P[k][1]; if (!seen1[c]) { seen1[c] = 1; n[c] = (n[c] || 0) + 1; } } }); });
    Object.keys(n).forEach(function (c) { if (n[c] > max) max = n[c]; });
    Object.keys(n).forEach(function (c) { var r = n[c] / max; HEAT[c] = r > 0.6 ? 4 : r > 0.3 ? 3 : r > 0.1 ? 2 : 1; });
    SELC = S.place.indexOf('c:') === 0 ? (TOPO[S.place.slice(2)] || S.place.slice(2)) : '';
    requestDraw();
  }

  /* The marks. Each place holds what is shown there. A place with few items shows every one of them, a shape for what it
     is in the colour of where it was posted, packed round the place like seeds in a sunflower; a crowded place, or places
     that would touch, show one gold circle with the count and a ring split by platform. A place picked shows up to 48. */
  var PG = [], pinData = [], glyphs = [], edges = [], PULSE = null, pinSig = '', GR = 6.2;
  function expandMax() { return CW < 520 ? 8 : 12; }
  function footR(n) { return n <= 1 ? GR + 3 : GR * 2.05 * Math.sqrt(n - 0.4) + GR + 3; }
  function pinR(n) { return Math.min(30, 9 + 3.2 * Math.sqrt(n)); }
  function seed(j, n) { if (n === 1) return [0, 0]; var r = GR * 2.05 * Math.sqrt(j + 0.6), a = j * 2.39996 - Math.PI / 2; return [r * Math.cos(a), r * Math.sin(a)]; }
  function groupPins() {
    var at = {};
    PG = [];
    if (S.lens !== 'readers') sortList(items.filter(function (it) { return pass(it, 'place'); })).forEach(function (it) {
      keysOf(it).forEach(function (k) { if (k !== 'global' && P[k] && P[k][2] != null) (at[k] = at[k] || []).push(it); });
    });
    Object.keys(at).forEach(function (k) {
      var its = at[k], pc = {}, hot = 0;
      its.forEach(function (it) { var p = pfOf(it); pc[p] = (pc[p] || 0) + 1; if ((it.hot || 0) > hot) hot = it.hot; });
      PG.push({ k: k, its: its, n: its.length, hot: hot, pc: pc, lon: P[k][3], lat: P[k][2] });
    });
    PG.sort(function (a, b) { return b.n - a.n; });
    var nw = S.lens === 'readers' ? 0 : items.filter(function (it) { return it.p === 'global' && pass(it, 'place'); }).length;
    var b = $('ir-nowhere'); b.hidden = !nw && !S.nowhere; b.textContent = T('No single place ({n})', { n: N(nw) }); b.setAttribute('aria-pressed', S.nowhere ? 'true' : 'false');
  }
  function drawPins() { groupPins(); pinSig = ''; requestDraw(); }
  function ringSegs(pc, n, r) {
    var C = 2 * Math.PI * r, acc = 0, out = '';
    Object.keys(pc).sort(function (a, b) { return pc[b] - pc[a]; }).forEach(function (p) {
      var len = C * pc[p] / n;
      out += '<circle class="seg" r="' + r.toFixed(1) + '" stroke="' + pfColor(p) + '" stroke-dasharray="' + Math.max(0.1, len - (n > 1 && len > 3 ? 1.2 : 0)).toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dashoffset="' + (-acc).toFixed(2) + '"/>';
      acc += len;
    });
    return '<g transform="rotate(-90)">' + out + '</g>';
  }
  function drawPinsNow() {
    if (!gPins || !PJ) return;
    var sel = S.place && S.place.indexOf('c:') !== 0 ? S.place.split(',') : [], selC = S.place.indexOf('c:') === 0 ? S.place.slice(2) : '';
    var live = S.lens === 'live', rd = S.lens === 'readers', pts = [];
    PG.forEach(function (g) {
      if (!seen(g.lon, g.lat)) return;
      var s = PJ([g.lon, g.lat]);
      if (!s || !isFinite(s[0])) return;
      var isSel = sel.indexOf(g.k) >= 0 || (!!selC && P[g.k][1] === selC), cap = isSel ? 48 : expandMax(), exp = g.n <= cap || (isSel && sel.length === 1);
      var m = Math.min(g.n, cap);
      pts.push({ keys: [g.k], gs: [g], n: g.n, hot: g.hot, x: s[0], y: s[1], r: exp ? footR(m) : pinR(g.n), exp: exp, m: m, sel: isSel, pc: g.pc });
    });
    // what would touch becomes one circle; a place picked never does, it is what the reader asked to see
    var merged = [];
    pts.forEach(function (p) {
      if (!p.sel) for (var i = 0; i < merged.length; i++) {
        var q = merged[i];
        if (q.sel) continue;
        if (Math.hypot(q.x - p.x, q.y - p.y) < q.r + p.r - 2) {
          q.keys = q.keys.concat(p.keys); q.gs = q.gs.concat(p.gs); q.n += p.n; q.hot = Math.max(q.hot, p.hot); q.exp = false; q.r = pinR(q.n);
          var pc = {}; [q.pc, p.pc].forEach(function (o) { Object.keys(o).forEach(function (k) { pc[k] = (pc[k] || 0) + o[k]; }); }); q.pc = pc;
          return;
        }
      }
      merged.push(p);
    });
    merged.sort(function (a, b) { return a.sel - b.sel; });          // a place picked is drawn last, over its neighbours
    var vis = merged.filter(function (m) { return m.x > -80 && m.y > -80 && m.x < CW + 80 && m.y < CH + 80; });
    // what the globe hides behind it: one arrow on the rim for each direction it lies in (bins of 20 degrees), with its count
    var bins = {}, rdn = Math.PI / 180, Rr = PJ.scale() - 16;
    edges = [];
    // only while the rim is on the screen: zoomed in, the far side is simply off the edge, like everything else
    if (V.mode === 'globe' && !rd && PJ.scale() * 2 <= Math.hypot(CW, CH) * 0.9) PG.forEach(function (g) {
      if (seen(g.lon, g.lat)) return;
      var f1 = V.lat * rdn, f2 = g.lat * rdn, dl = (g.lon - V.lon) * rdn;
      var th = Math.atan2(Math.sin(dl) * Math.cos(f2), Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl));
      var bk = Math.round(th / (Math.PI / 9)), e = bins[bk] || (bins[bk] = { bk: bk, n: 0, ts: 0, big: -1, hot: 0, lon: 0, lat: 0 });
      e.n += g.n; e.ts += th * g.n; e.hot = Math.max(e.hot, g.hot);
      if (g.n > e.big) { e.big = g.n; e.lon = g.lon; e.lat = g.lat; }
    });
    Object.keys(bins).sort(function (a, b) { return a - b; }).forEach(function (bk) {
      var e = bins[bk]; e.th = e.ts / e.n; e.x = CW / 2 + Math.sin(e.th) * Rr; e.y = CH / 2 - Math.cos(e.th) * Rr; edges.push(e);
    });
    var pulseK = PULSE && Date.now() - PULSE.at < 5000 ? PULSE.k : '';
    var sig = S.lens + '|' + S.place + '|' + pulseK + '|' + vis.map(function (m) { return m.keys.join(',') + ':' + m.n + (m.exp ? 'e' + m.m : ''); }).join(';') +
      '|' + edges.map(function (e) { return e.bk + ':' + e.n; }).join(';');
    pinData = vis; glyphs = [];
    vis.forEach(function (m) {          // where each item's mark is on the screen, for taps and the tip
      if (!m.exp) return;
      m.gs[0].its.slice(0, m.m).forEach(function (it, j) { var o = seed(j, m.m); glyphs.push({ it: it, k: m.keys[0], x: m.x + o[0], y: m.y + o[1], m: m }); });
    });
    if (sig === pinSig) {          // the same marks as last frame: only move them, so their rings keep pulsing
      var gs = gPins.childNodes;
      for (var i = 0; i < gs.length && i < vis.length; i++) gs[i].setAttribute('transform', 'translate(' + vis[i].x.toFixed(1) + ' ' + vis[i].y.toFixed(1) + ')');
      for (var j = 0; j < edges.length && vis.length + j < gs.length; j++) gs[vis.length + j].setAttribute('transform', 'translate(' + edges[j].x.toFixed(1) + ' ' + edges[j].y.toFixed(1) + ')');
      drawLinksNow();
      return;
    }
    pinSig = sig;
    var html = '';
    vis.forEach(function (m, i) {
      var dim = (sel.length || selC) && !m.sel, name = m.keys.length === 1 ? placeName(m.keys[0]) : T('{n} places', { n: N(m.keys.length) });
      var cls = (live ? ' live' + (m.hot >= 70 ? ' hot' : '') : rd ? ' rd' : '') + (m.sel ? ' sel' : dim ? ' dim' : '');
      var pul = pulseK && m.keys.indexOf(pulseK) >= 0 ? '<circle class="pulse" r="10"/>' : '';
      var tr = ' transform="translate(' + m.x.toFixed(1) + ' ' + m.y.toFixed(1) + ')"';
      if (!m.exp) {
        var r = pinR(m.n);
        html += '<g class="ir-pin' + cls + '" data-p="' + i + '" tabindex="0" role="button" aria-label="' + esc(name + T(', ') + (m.n === 1 ? T('1 item') : T('{n} items', { n: N(m.n) }))) + '"' + tr + '>' +
          (live ? '<circle class="ring" r="' + r.toFixed(1) + '"/><circle class="ring r2" r="' + r.toFixed(1) + '"/>' : '') + pul +
          '<circle class="halo" r="' + (r + 10).toFixed(1) + '"/>' + ringSegs(m.pc, m.n, r + 3.6) + '<circle class="core" r="' + r.toFixed(1) + '"/>' +
          '<circle class="shine" r="' + (r * 0.55).toFixed(1) + '" cx="' + (-r * 0.25).toFixed(1) + '" cy="' + (-r * 0.3).toFixed(1) + '"/><text>' + N(m.n) + '</text></g>';
        return;
      }
      var its = m.gs[0].its.slice(0, m.m), body = '';
      its.forEach(function (it, j) {
        var o = seed(j, m.m), hotI = (it.hot || 0) >= 70 || (it._v || 0) >= 90;
        body += '<g class="ir-gl' + (hotI ? ' big' : '') + '" data-g="' + esc(String(it.id)) + '" transform="translate(' + o[0].toFixed(1) + ' ' + o[1].toFixed(1) + ')" role="button" tabindex="0" aria-label="' + esc(T('{kind} on {pf}', { kind: KIND_N[kindOf(it)], pf: pfName(pfOf(it)) }) + ': ' + it.t) + '">' +
          (hotI ? '<circle class="gl-hot" r="9"/>' : '') + '<path d="' + (SHAPE[kindOf(it)] || SHAPE.post) + '" fill="' + pfColor(pfOf(it)) + '"/></g>';
      });
      html += '<g class="ir-cl' + cls + '" data-p="' + i + '"' + tr + '>' + pul + (m.m > 1 ? '<circle class="cl-r" r="' + (footR(m.m) - 1).toFixed(1) + '"/>' : '') +
        (m.m > 1 ? '<circle class="cl-c" r="2.4"/>' : '') + body + (m.n > m.m ? '<text class="cl-more" y="' + (footR(m.m) + 12).toFixed(1) + '">' + T('+{n} in the list', { n: N(m.n - m.m) }) + '</text>' : '') + '</g>';
    });
    edges.forEach(function (e, i) {
      html += '<g class="ir-edge' + (live ? ' live' : '') + '" data-e="' + i + '" tabindex="0" role="button" aria-label="' + esc(T(e.n === 1 ? '1 item on the far side of the globe. Turn the globe to them.' : '{n} items on the far side of the globe. Turn the globe to them.', { n: N(e.n) })) + '" transform="translate(' + e.x.toFixed(1) + ' ' + e.y.toFixed(1) + ')">' +
        '<path d="M0 -21 5.5 -14.5h-11z" transform="rotate(' + (e.th / rdn).toFixed(1) + ')"/><circle r="12.5"/><text>' + N(e.n) + '</text></g>';
    });
    gPins.innerHTML = html;
    $('ir-tip').hidden = true;
    drawLinksNow();
  }
  function drawLegend() {
    var el = $('ir-legend'), n = shown.length, sh = '';
    if (S.lens !== 'readers') ['video', 'post', 'article', 'doc'].forEach(function (k) {
      if (items.some(function (it) { return kindOf(it) === k && (own(it) || pass(it)); })) sh += '<span><svg viewBox="-8 -8 16 16" aria-hidden="true"><path d="' + SHAPE[k] + '"/></svg>' + KIND_N[k] + '</span>';
    });
    var head = S.lens === 'live' ? '<i class="lg-live"></i> ' + T('Last 24 hours') + ' · <b class="num">' + N(n) + '</b> ' + (n === 1 ? T('story') : T('stories')) + (LIVE_AT ? ' · ' + T('updated {t}', { t: esc(ago(LIVE_AT)) }) : '')
      : S.lens === 'readers' ? '<i class="lg-rd"></i> ' + T('Sent by readers, being checked') + ' · <b class="num">' + N(n) + '</b>'
      : '<i class="lg-bank"></i> ' + T('The bank') + ' · <b class="num">' + N(n) + '</b> ' + (n === 1 ? T('item') : T('items')) + (fullRange() ? '' : ' · ' + esc($('ir-range').textContent));
    el.innerHTML = '<span class="lg-h">' + head + '</span>' + (sh ? '<span class="lg-k">' + sh + '<span class="lg-c">' + T('Colour: where it was posted') + '</span></span>' : '');
    el.hidden = false;
  }
  function pinAt(el) {
    var lk = el && el.closest && el.closest('.ir-lk');
    if (lk) { var o = LDRAW[+lk.getAttribute('data-l')]; return o ? { link: o.L, x: o.mid[0], y: o.mid[1] } : null; }
    var ed = el && el.closest && el.closest('.ir-edge');
    if (ed) { var e = edges[+ed.getAttribute('data-e')]; return e ? { edge: e, x: e.x, y: e.y } : null; }
    for (var li = 0; li < LAYERS.length; li++) { var lh = LAYERS[li].hitEl && xcall(LAYERS[li].hitEl, el); if (lh) { lh.layer = LAYERS[li]; return lh; } }
    var g = el && el.closest && el.closest('.ir-gl');
    if (g) {          // the glyph in THIS cluster: an item placed in two places has a mark in each
      var id = g.getAttribute('data-g'), gc = g.closest('.ir-cl'), gm = gc ? pinData[+gc.getAttribute('data-p')] : null;
      for (var i = 0; i < glyphs.length; i++) if (String(glyphs[i].it.id) === id && (!gm || glyphs[i].m === gm)) return glyphs[i];
    }
    g = el && el.closest && el.closest('.ir-pin,.ir-cl');
    return g ? pinData[+g.getAttribute('data-p')] : null;
  }
  // What a tap landed on, from the marks' own positions (a captured pointer's target is the map itself): an item's mark
  // first, then a place's middle, then a circle.
  function pinHit(cx, cy) {
    var r = box.getBoundingClientRect(), x = cx - r.left, y = cy - r.top, best = null, bd = 1e9;
    edges.forEach(function (e) { var d = Math.hypot(e.x - x, e.y - y); if (d <= 18 && d < bd) { bd = d; best = { edge: e, x: e.x, y: e.y }; } });
    if (best) return best;
    glyphs.forEach(function (g) { var d = Math.hypot(g.x - x, g.y - y); if (d <= GR + 6 && d < bd) { bd = d; best = g; } });
    if (best) return best;
    for (var li = 0; li < LAYERS.length; li++) { var lh = LAYERS[li].hit && xcall(LAYERS[li].hit, x, y); if (lh) { lh.layer = LAYERS[li]; return lh; } }          // an add-on's mark, before a place's circle
    pinData.forEach(function (m) { var d = Math.hypot(m.x - x, m.y - y), reach = m.exp ? (m.m > 1 ? 7 : GR + 6) : pinR(m.n) + 6; if (d <= reach && d < bd) { bd = d; best = m; } });
    return best || linkHit(x, y);
  }
  function openGlyph(g) {
    var i = shown.indexOf(g.it);
    if (i < 0) {          // a mark of another place while one is picked: go to that place, then open it
      S.place = g.k; S.nowhere = false; $('ir-place').value = S.place; render(); i = shown.indexOf(g.it);
    }
    if (i >= 0) openSpot(i);
  }
  function fitTo(pts, kmin, kmax) {
    if (!G || !LAND || !CW) return;
    if (!pts.length) { home(); return; }
    var x = 0, y = 0, z = 0, rd = Math.PI / 180;
    pts.forEach(function (p) { var la = p[1] * rd, lo = p[0] * rd; x += Math.cos(la) * Math.cos(lo); y += Math.cos(la) * Math.sin(lo); z += Math.sin(la); });
    var c = Math.hypot(x, y, z) < 1e-6 ? pts[0] : [Math.atan2(y, x) / rd, Math.atan2(z, Math.hypot(x, y)) / rd], far = 0;
    pts.forEach(function (p) { far = Math.max(far, G.geoDistance(c, p)); });
    var half = Math.min(CW, CH) / 2 * 0.78, k;
    if (far < 0.0004) k = kmax;
    else if (V.mode === 'globe') k = far >= Math.PI / 2 ? 1 : half / (baseR() * Math.sin(far));
    else k = half / (baseR() * far * 0.95);
    flyTo(Math.max(kmin, Math.min(kmax, k)), c[0], c[1]);
  }
  function placePts(keys) { var o = {}; keys.forEach(function (k) { if (P[k] && P[k][2] != null) o[k] = [P[k][3], P[k][2]]; }); return Object.keys(o).map(function (k) { return o[k]; }); }
  function openPin(m) {
    if (!m) return;
    stopTour();
    if (m.layer) { xcall(m.layer.open, m); return; }
    if (m.edge) { flyTo(V.k, m.edge.lon, m.edge.lat); return; }
    if (m.link) { pickLink(m.link.k); return; }
    if (m.it) { openGlyph(m); return; }
    if (m.keys.length > 1) { fitTo(placePts(m.keys), Math.min(MAXK, V.k * 2), MAXK); return; }          // several places under one circle: go closer, so they come apart
    S.place = S.place === m.keys[0] ? '' : m.keys[0];
    S.nowhere = false;
    $('ir-place').value = S.place;
    render();
    say(S.place ? T('Showing {n} from {place}. Tap the place again to show every place.', { n: N(shown.length), place: placeName(S.place) }) : '');
  }

  // Drag (turns the globe, moves the flat map), pinch, scroll, double tap. On a phone, off the full screen, one finger
  // belongs to the page (it scrolls; touch-action pan-y in intel.css) and two fingers move and pinch the map.
  var ptrs = {}, last = null, moved = 0, pinch = null, mapOn = false, hintT = 0;
  function isFull() { return document.documentElement.classList.contains('ir-show'); }
  function mapHint(why) {
    var el = $('ir-wheel'); if (!el) return;
    el.textContent = why === 'touch' ? T('Use two fingers to move the map') : T('Click the map, or hold {key}, to zoom it', { key: /Mac|iP(hone|ad)/.test(navigator.platform || '') ? 'Cmd' : 'Ctrl' });
    el.hidden = false; clearTimeout(hintT); hintT = setTimeout(function () { el.hidden = true; }, 1800);
  }
  function onDown(ev) {
    if (ev.button > 0) return;
    if (ev.pointerType === 'mouse') mapOn = true;
    stopTour(); cancelAnimationFrame(anim); poke();
    ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    try { map.setPointerCapture(ev.pointerId); } catch (e) { /* a pointer the browser no longer tracks: dragging still works without it */ }
    var ids = Object.keys(ptrs);
    if (ids.length === 1) { last = { x: ev.clientX, y: ev.clientY }; moved = 0; map.classList.add('drag'); }
    if (ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: V.k, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }
  }
  function onMove(ev) {
    var r = box.getBoundingClientRect();
    if (!ptrs[ev.pointerId]) { hover(ev, r); return; }
    ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    var ids = Object.keys(ptrs);
    poke(); moving = 1;
    if (ids.length === 2 && pinch) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (pinch.d > 0) zoomAt(pinch.k * d / pinch.d / V.k, mx - r.left, my - r.top);
      panBy(mx - pinch.mx, my - pinch.my); pinch.mx = mx; pinch.my = my;          // two fingers moving together move the map
      moved = 99;
      return;
    }
    if (ev.pointerType === 'touch' && !isFull()) {          // one finger: the page's, never the map's (a tap still opens a mark)
      if (last) { moved += Math.abs(ev.clientX - last.x) + Math.abs(ev.clientY - last.y); last = { x: ev.clientX, y: ev.clientY }; if (moved > 24) mapHint('touch'); }
      return;
    }
    if (last) {
      var dx = ev.clientX - last.x, dy = ev.clientY - last.y;
      moved += Math.abs(dx) + Math.abs(dy);
      last = { x: ev.clientX, y: ev.clientY };
      if (moved > 4) { panBy(dx, dy); $('ir-tip').hidden = true; }
    }
  }
  var lastTap = 0;
  function onUp(ev) {
    var was = ptrs[ev.pointerId];
    delete ptrs[ev.pointerId];
    if (Object.keys(ptrs).length < 2) pinch = null;
    if (!Object.keys(ptrs).length) {
      map.classList.remove('drag'); last = null;
      if (moving) { moving = 0; requestDraw(); }
      if (was && moved <= 4 && ev.type === 'pointerup') {
        var m = pinHit(ev.clientX, ev.clientY);
        if (m) openPin(m);
        else {
          var now = Date.now(), r = box.getBoundingClientRect();
          if (now - lastTap < 320) zoomAt(2, ev.clientX - r.left, ev.clientY - r.top);
          lastTap = now;
        }
      }
    }
  }
  function hover(ev, r) {
    var tip = $('ir-tip'), m = pinAt(ev.target);
    if (!m) { tip.hidden = true; return; }
    if (m.layer) {
      var lt = m.layer.tip && xcall(m.layer.tip, m);
      if (!lt) { tip.hidden = true; return; }
      tip.classList.add('wide'); tip.innerHTML = lt;
      tip.style.left = m.x + 'px'; tip.style.top = (m.y - 12) + 'px'; tip.hidden = false;
      return;
    }
    if (m.link) {
      tip.classList.add('wide');
      tip.innerHTML = '<span class="tip-k">' + T('Connection') + ' \u00b7 ' + T('{n} items', { n: N(m.link.n) }) + '</span>' + esc(T('{a} and {b}', { a: cName(m.link.a), b: cName(m.link.b) })) + '<small>' + esc(linkWhy(m.link, true)) + T('. Tap to see only these.') + '</small>';
      tip.style.left = m.x + 'px'; tip.style.top = (m.y - 8) + 'px'; tip.hidden = false;
      return;
    }
    if (m.edge) {
      tip.classList.remove('wide');
      tip.innerHTML = T(m.edge.n === 1 ? '1 item on the far side' : '{n} items on the far side', { n: N(m.edge.n) }) + '<small>' + T('Tap to turn the globe to them.') + '</small>';
      tip.style.left = m.x + 'px'; tip.style.top = (m.y - 14) + 'px'; tip.hidden = false;
      return;
    }
    if (m.it) {
      var it = m.it, rc = reachOf(it), nums = [];
      if (rc && !rc.x) { if (rc.lk != null) nums.push(T('{n} likes', { n: fmtN(rc.lk) })); if (rc.vw != null) nums.push(T('{n} views', { n: (rc['~'] ? '~' : '') + fmtN(rc.vw) })); }
      if (it.hot != null) nums.push(T('Hot {n}', { n: N(it.hot) }));
      if (it._v != null) nums.push(T('Viral {n}', { n: N(it._v) }));
      var tv = it.sn ? null : vis(it), tth = tv && (tv.k === 'pic' || tv.k === 'av') ? tv.u : '';
      tip.innerHTML = (tth ? '<span class="tip-im" style="background-image:' + esc(cssUrl(tth)) + '">' + (kindOf(it) === 'video' ? PLAY_SVG : '') + '</span>' : '') + '<span class="tip-k" style="--pc:' + pfColor(pfOf(it)) + '">' + mark(it, 'tip-m') + esc(KIND_N[kindOf(it)] + ' · ' + pfName(pfOf(it)) + ' · ' + fmtDate(it.d)) + '</span>' + byline(it) + dh(esc(it.t.length > 90 ? it.t.slice(0, 88) + '…' : it.t)) + '<small>' + esc(nums.join(' · ') || placeName(m.k)) + T('. Tap to open.') + '</small>';
      tip.classList.add('wide');
      tip.style.left = m.x + 'px'; tip.style.top = (m.y - 10) + 'px'; tip.hidden = false;
      return;
    }
    tip.classList.remove('wide');
    var names = m.keys.map(placeName);
    tip.innerHTML = esc(names.length > 3 ? T('{list} and {n} more', { list: names.slice(0, 3).join(T(', ')), n: N(names.length - 3) }) : names.join(T(', '))) + '<small>' + (m.n === 1 ? T('1 item. ') : T('{n} items. ', { n: N(m.n) })) + (m.hot ? T('Hottest {n}. ', { n: N(m.hot) }) : '') + (m.keys.length > 1 ? T('Tap to go closer.') : m.exp && m.m > 1 ? T('Tap the middle to show only these.') : T('Tap to show them.')) + '</small>';
    tip.style.left = m.x + 'px'; tip.style.top = (m.y - (m.exp ? footR(m.m) : pinR(m.n))) + 'px'; tip.hidden = false;
  }

  // The globe turns by itself on the full screen (a stream), after 8 seconds with no hand on it; never with reduced motion.
  var spinF = 0, idleAt = 0;
  function poke() { idleAt = Date.now(); }
  function spin() {
    cancelAnimationFrame(spinF);
    var lastT = 0;
    (function step(t) {
      if (!document.documentElement.classList.contains('ir-show')) { spinF = 0; return; }
      if (V.mode === 'globe' && !tourT && !Object.keys(ptrs).length && Date.now() - idleAt > 8000 && !reduced() && V.k < 2.5 && !document.hidden && lastT)
        setView(V.lon + Math.min(50, t - lastT) * 0.0035, V.lat, V.k, true);
      lastT = t;
      spinF = requestAnimationFrame(step);
    })(0);
  }
  function setMode(m) {
    if (!G || m === V.mode) return;
    V.mode = m; store('ir-proj', m); pinSig = '';
    var b = $('ir-proj');
    if (b) { b.setAttribute('aria-label', m === 'globe' ? T('Lay the map flat') : T('Show the globe')); b.setAttribute('data-mode', m); }
    root.setAttribute('data-map', m);
    setView(V.lon, V.lat, V.k, true);
  }

  /* ------------------------------------------------------------ the timeline (the bank) */
  function makeBuckets() {
    var now = new Date(), end = now.getUTCFullYear() + '-' + ('0' + (now.getUTCMonth() + 1)).slice(-2);
    BANK.forEach(function (it) { if (it.d && monthOf(it.d) > end) end = monthOf(it.d); });
    buckets = ['earlier'];
    var y = +FIRST.slice(0, 4), m = +FIRST.slice(5);
    for (;;) { var k = y + '-' + ('0' + m).slice(-2); buckets.push(k); if (k >= end) break; m++; if (m > 12) { m = 1; y++; } }
    S.from = 0; S.to = buckets.length - 1;
    ['ir-from', 'ir-to'].forEach(function (id) { $(id).max = buckets.length - 1; });
    $('ir-from').value = 0; $('ir-to').value = buckets.length - 1;
  }
  function bLabel(i) { if (i === 0) return T('Earlier'); var k = buckets[i]; return MONV[+k.slice(5) - 1] + ' ' + N(k.slice(0, 4)); }
  function drawBars() {
    var svg = $('ir-bars'), n = buckets.length, c = new Array(n).fill(0);
    items.forEach(function (it) { if (pass(it, 'time')) { var b = bucketOf(it); if (b >= 0) c[b]++; } });
    var max = Math.max.apply(null, c.concat([1])), w = 1000 / n, h = 50, out = '';
    for (var i = 0; i < n; i++) {
      var bh = c[i] ? Math.max(2, (c[i] / max) * h) : 0;
      out += '<rect' + (i >= S.from && i <= S.to ? ' class="in"' : '') + ' x="' + (i * w + w * 0.14).toFixed(1) + '" y="' + (h - bh).toFixed(1) + '" width="' + (w * 0.72).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5"/>';
    }
    svg.setAttribute('viewBox', '0 0 1000 ' + h);
    svg.innerHTML = out;
    var und = items.filter(function (it) { return !it.d && pass(it, 'time'); }).length;
    $('ir-range').textContent = fullRange() ? T('All time') : S.days ? T('Past 30 days') : (S.from === S.to ? bLabel(S.from) : T('{a} to {b}', { a: bLabel(S.from), b: bLabel(S.to) }));
    // Each label sits under its own bar: Earlier, the month of 7 October, then each new year.
    // 24 Oct 2026: on a phone "Earlier", "Oct 2023" and "2024" were drawn over each other. A label is kept only when it
    // stands clear of every label already kept (the month of 7 October first, then each year, Earlier last).
    var axw = ($('ir-axis').clientWidth || 320), gap = 100 * 58 / axw, cand = [[150 / n, bLabel(1)]], kept = [];
    for (var bi = 2; bi < n; bi++) if (buckets[bi].slice(5) === '01') cand.push([(bi + 0.5) * 100 / n, N(buckets[bi].slice(0, 4))]);
    cand.push([50 / n, T('Earlier')]);
    cand.forEach(function (c) { if (kept.every(function (k) { return Math.abs(k[0] - c[0]) >= gap; })) kept.push(c); });
    $('ir-axis').innerHTML = kept.map(function (c) { return '<span style="left:' + c[0].toFixed(2) + '%">' + c[1] + '</span>'; }).join('');
    $('ir-range').title = fullRange() ? (und ? T('{n} items have no date and show only with All time', { n: N(und) }) : '') : T('Items with no date are left out when a time is picked');
    [].forEach.call($('ir-pre').querySelectorAll('button'), function (bt) { bt.setAttribute('aria-pressed', bt.getAttribute('data-pre') === preNow() ? 'true' : 'false'); });
  }
  function preNow() {
    var n = buckets.length - 1;
    if (fullRange()) return 'all';
    if (S.days) return 'month';          // Past 30 days (a month dragged to on the bars is that month, not this button)
    if (S.from === 1 && S.to === n) return 'oct7';
    if (S.to === n && S.from === Math.max(1, n - 11)) return 'year';
    return '';
  }
  function setRange(a, b, days) { S.days = days || 0; S.from = Math.max(0, Math.min(a, b)); S.to = Math.min(buckets.length - 1, Math.max(a, b)); $('ir-from').value = S.from; $('ir-to').value = S.to; render(); }
  var playing = 0;
  function play() {
    var bt = $('ir-play');
    if (playing) { clearInterval(playing); playing = 0; bt.classList.remove('on'); bt.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'; bt.setAttribute('aria-label', T('Play the timeline')); return; }
    bt.classList.add('on'); bt.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>'; bt.setAttribute('aria-label', T('Pause'));
    var end = buckets.length - 1, i = 1;
    setRange(1, 1);
    playing = setInterval(function () {
      i++;
      if (i > end) { play(); return; }
      setRange(1, i);
    }, 700);
  }

  /* ------------------------------------------------------------ chips, place, kind, state */
  function drawChips() {
    drawTopics();
    [].forEach.call($('ir-kind').querySelectorAll('button'), function (b) {
      var k = b.getAttribute('data-k');
      b.setAttribute('aria-pressed', k === S.kind ? 'true' : 'false');
      b.hidden = !!k && k !== S.kind && !items.some(function (it) { return kindOf(it) === k && (own(it) || pass(it, 'kind')); });
    });
    $('ir-top').setAttribute('aria-pressed', S.top ? 'true' : 'false');
    var anyEdu = items.some(function (it) { return it.edu && own(it); });
    $('ir-edu').hidden = !anyEdu && !S.edu; $('ir-edu').setAttribute('aria-pressed', S.edu ? 'true' : 'false');
    $('ir-sort').value = S.sort;
    // Where it was posted: each platform with its count in what is shown, and the likes measured there (views on Telegram)
    var pc = {}, lk = {}, vw = {}, has = {};
    items.forEach(function (it) {
      var p = pfOf(it), ok = pass(it, 'pf');
      if (!ok && !own(it)) return;          // a found item counts only inside its story (WHAT A READER CAN SEE)
      has[p] = 1;
      if (!ok) return;
      pc[p] = (pc[p] || 0) + 1;
      var r = reachOf(it); if (r && !r.x) { if (r.lk != null) lk[p] = (lk[p] || 0) + r.lk; if (r.vw != null) vw[p] = (vw[p] || 0) + r.vw; }
    });
    var po = PF.map(function (x) { return x[0]; }).filter(function (p) { return has[p] || S.pf.indexOf(p) >= 0; });
    po.sort(function (a, b) { return (pc[b] || 0) - (pc[a] || 0); });
    $('ir-pf').innerHTML = '<button class="ir-chip ir-pfc ir-pf-all" type="button" data-pf="" aria-pressed="' + (S.pf.length ? 'false' : 'true') + '">' + T('Every platform') + '</button>' + po.map(function (p) {
      var sub = p === 'Telegram' && vw[p] != null ? ICO.view + T('{n} views', { n: fmtN(vw[p]) }) : lk[p] != null ? ICO.like + T('{n} likes', { n: fmtN(lk[p]) }) : HIDES[p] ? T('likes not public') : '';
      return '<button class="ir-chip ir-pfc" type="button" data-pf="' + p + '" aria-pressed="' + (S.pf.indexOf(p) >= 0) + '" style="--pc:' + pfColor(p) + '"><b class="ir-pfd" aria-hidden="true"></b><span>' + esc(pfName(p)) + ' <i>' + N(pc[p] || 0) + '</i>' + (sub ? '<small>' + sub + '</small>' : '') + '</span></button>';
    }).join('');
    seg('ir-heat', 'heat', T('Heat'), HEATS, S.lens === 'live');
    seg('ir-within', 'within', T('Within'), WITHIN, S.lens === 'live');
    seg('ir-viral', 'vmin', T('Viral'), VIRALS, items.some(function (it) { return it._v != null && own(it); }) || !!S.vmin);
    seg('ir-cred', 'crmin', T('Credible'), CREDS, items.some(function (it) { return crOf(it) != null && own(it); }) || !!S.crmin);
    seg('ir-likes', 'lmin', T('Likes'), LIKES, items.some(function (it) { return likesN(it) != null && own(it); }) || !!S.lmin);
    drawHot();
    drawFocus();
    drawFacets();
    drawPresets();
  }
  /* THE FACETS IN THE PANEL (FACETS): a row each under "What it is", every choice with what it would leave, and All. */
  function drawFacets() {
    var at = $('ir-kind'); if (!at) return;
    Object.keys(FACETS).forEach(function (k) {
      var f = FACETS[k], el = $('ir-f-' + k);
      if (!el) {
        el = document.createElement('div'); el.id = 'ir-f-' + k; el.className = 'ir-seg ir-segl ir-facet';
        el.setAttribute('role', 'group'); el.setAttribute('aria-label', f.name);
        var prev = at; Object.keys(FACETS).forEach(function (j) { if ($('ir-f-' + j)) prev = $('ir-f-' + j); });
        prev.parentNode.insertBefore(el, prev.nextSibling);
      }
      var c = {}, any = false, on = S.ext[k] || '';
      items.forEach(function (it) { var v = f.of(it); if (!v) return; if (own(it)) any = true; if (pass(it, 'ext:' + k)) c[v] = (c[v] || 0) + 1; });
      el.hidden = (!any || (f.onlyKind && S.kind && S.kind !== f.onlyKind)) && !on;
      if (el.hidden) return;
      el.innerHTML = '<span class="ir-seg-l">' + esc(f.name) + '</span><button type="button" data-facet="' + k + '" data-v="" aria-pressed="' + !on + '">' + T('All') + '</button>' +
        f.opts.map(function (o) {
          var n = c[o[0]] || 0, me = on === o[0];
          return '<button type="button" data-facet="' + k + '" data-v="' + o[0] + '" aria-pressed="' + me + '"' + (o[2] ? ' title="' + esc(o[2]) + '"' : '') + (!n && !me ? ' disabled' : '') + '>' + esc(o[1]) + ' <i class="num">' + N(n) + '</i></button>';
        }).join('');
    });
  }
  // PRESETS at the top of the panel: each says what it does and how many it leaves here; a tap shows them
  function drawPresets() {
    var bar = $('ir-bar'); if (!bar) return;
    var el = $('ir-dr-pre');
    if (!el) { el = document.createElement('section'); el.className = 'ir-dr-s ir-pre-s'; el.id = 'ir-dr-pre'; bar.insertBefore(el, bar.firstChild); }
    el.hidden = !liveShown();
    if (el.hidden) return;
    el.innerHTML = '<h3>' + T('Ready-made views') + '</h3><p class="ir-dr-p">' + T('One tap. Your topic and region stay.') + '</p><div class="ir-presets" role="group" aria-label="' + esc(T('Ready-made views')) + '">' +
      PRESETS.map(function (p) {
        var n = presetCount(p), on = presetOn(p);
        return '<button type="button" class="ir-preset" data-preset="' + p.key + '" aria-pressed="' + on + '"' + (!n && !on ? ' disabled' : '') + '><b>' + esc(p.name) + ' <i class="num">' + LN(n) + '</i></b><span>' + esc(p.says) + '</span></button>';
      }).join('') + '</div>';
  }
  // The subjects, counted in what the other filters leave; the busiest first, a subject with nothing here greyed at the end
  // (never hidden, so a reader sees the room does not cover it yet). The chips WRAP: nothing runs off the right edge.
  function drawTopics() {
    var keys = TOPICS.map(function (t) { return t[0]; }), c = { rel: 0 };
    keys.forEach(function (k) { c[k] = 0; });
    items.forEach(function (it) { if (!pass(it, 'tp')) return; var tk = tkOf(it), r = 0; tk.forEach(function (k) { c[k]++; if (REL_KEYS.indexOf(k) >= 0) r = 1; }); c.rel += r; });
    var all = keys.slice(); if (REL_KEYS.length) all.splice(all.indexOf('islam'), 0, 'rel');
    var base = all.slice();
    all.sort(function (a, b) { return ((c[b] > 0 || S.tp.indexOf(b) >= 0) - (c[a] > 0 || S.tp.indexOf(a) >= 0)) || c[b] - c[a] || base.indexOf(a) - base.indexOf(b); });
    $('ir-topics').innerHTML = '<button class="ir-chip ir-tc" type="button" data-t="" aria-pressed="' + !S.tp.length + '">' + T('Every topic') + '</button>' + all.map(function (k) {
      var on = S.tp.indexOf(k) >= 0, zero = !c[k] && !on;
      return '<button class="ir-chip ir-tc' + (zero ? ' is-zero' : '') + (k === 'rel' ? ' ir-tc-rel' : '') + '" type="button" data-t="' + k + '" aria-pressed="' + on + '"' + (zero ? ' disabled title="' + T('Nothing in this view yet') + '"' : '') + '>' + esc(topicName(k)) + ' <i>' + N(c[k]) + '</i></button>';
    }).join('');
  }
  // The hot row: Everything, Hot topics, and once Hot topics is on, its six hottest stories. Live lens only.
  function drawHot() {
    var row = $('ir-hotrow'), el = $('ir-hots'); if (!row || !el) return;
    var top = hotTop();
    row.hidden = !(LIVE.length && liveShown() && top.length);
    if (row.hidden) return;
    var onLive = S.lens === 'live', all = 0;
    LIVE.forEach(function (it) { if (HOTALL[it.id] && (S.lens !== 'live' || pass(it, 'hot'))) all++; });
    var blind = 0;
    LIVE.forEach(function (it) { if (!it._deep && isBlind(it) && (S.lens !== 'live' || pass(it, 'hot'))) blind++; });          // Blindspots never shows a found item (pass)
    var html = '<button class="ir-chip ir-hc" type="button" data-hot="" aria-pressed="' + !((onLive && S.hot) || hotRowExt().length) + '">' + T('Everything') + '</button>' +
      '<button class="ir-chip ir-hc ir-hc-all" type="button" data-hot="all" aria-pressed="' + (onLive && S.hot === 'all') + '">' + flame() + '<span>' + T('All hot') + '</span> <i>' + N(all) + '</i></button>' +
      (blind || S.hot === 'blind' ? '<button class="ir-chip ir-hc ir-hc-bs" type="button" data-hot="blind" aria-pressed="' + (onLive && S.hot === 'blind') + '" title="' + esc(T('Stories one side of the media carried and the other side did not, of the outlets the room found')) + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/></svg><span>' + T('Blindspots') + '</span> <i>' + N(blind) + '</i></button>' : '');
    if (top.length) {
      html += '<span class="ir-hc-sep" aria-hidden="true"></span>' + top.map(function (h) {
        var n = h.all.filter(function (it) { return pass(it, 'hot'); }).length;
        return '<button class="ir-chip ir-hc ir-hs" type="button" data-hot="' + esc(h.id) + '" aria-pressed="' + (onLive && S.hot === h.id) + '" title="' + esc(h.title + (h.s && h.s.ls ? '. ' + spreadWords(h.s.ls) : '')) + '"><b class="num">' + N(h.hot) + '</b><span class="ir-hs-n"' + DA + '>' + esc(h.name) + '</span>' + (onLive ? ' <i>' + N(n) + '</i>' : '') +
          (h.s && h.s.ls ? spreadBar(h.s.ls, 'ir-sp-chip') : '') + '</button>';
      }).join('');
      // the stories ride in their own row: one flow with the chips on a computer, a row of their own on a phone (intel.css)
      html = html.replace(/(<span class="ir-hc-sep"[^>]*><\/span>)([\s\S]*)$/, '$1<span class="ir-hs-row">$2</span>');
    }
    el.innerHTML = html;
  }
  /* BRIEF ME (18 Oct 2026). The show screen on the lead item of each of the hottest stories, with a title and an intro
     already written from their names: the room's whole morning in one rundown. It is a plain link to the show screen
     intel-prep.js draws for ?show=.
     ONE DOOR (21 Oct 2026, Armin: "there are just so many buttons in so many places doing the same thing"). It was a chip
     at the head of the Trending row, a second way into a show beside "Make a show". Now it is not a chip: the show maker
     offers it as its quick option (IRoom.brief(), intel-prep.js "the quick briefing"), so every show starts at one button. */
  function briefUrl(top) {
    var its = top.map(function (h) { return h.its.filter(function (it) { return it.id === 'L' + h.lead; })[0] || h.its[0]; }).filter(Boolean);
    if (its.length < 2) return '';
    // read aloud, so whole words and never an ellipsis: the story's own short name, else its title cut at a word
    var names = top.slice(0, its.length).map(function (h) {
      if (h.w && h.w.name) return h.w.name;
      var ws = h.title.replace(/^(LIVE|WATCH|BREAKING|TRENDING)[!:]?\s*/i, '').split(/\s+/), o = '';
      for (var i = 0; i < ws.length && (o + ' ' + ws[i]).length <= 52; i++) o += (o ? ' ' : '') + ws[i];
      return o.replace(/[,;:]$/, '');
    });
    // the intro card already lists every headline, so the spoken intro stays short and names only where it starts
    var intro = T('Welcome in. Here are the {n} stories everyone is talking about right now, one by one, with the sources on screen. We start with {first}.',
      { n: N(its.length), first: names[0].replace(/\s+(to|of|the|a|an|in|after|is|at|for|and|on|with|by|from|as|says)$/i, '') });
    return '?show=' + its.map(function (it) { return 'on~' + (it._code || String(it.id)); }).join('.') + '&kind=live&t=' +
      encodeURIComponent(T('The briefing: {n} stories everyone is talking about', { n: N(its.length) })) + '&i=' + encodeURIComponent(intro.slice(0, 420));
  }
  function drawFocus() {
    var el = $('ir-fx'); if (!el) return;
    var c = {}; FOCUS.forEach(function (f) { c[f[0]] = 0; });
    items.forEach(function (it) { if (pass(it, 'fx')) fxOf(it).forEach(function (k) { c[k]++; }); });
    var order = FOCUS.map(function (f) { return f[0]; });
    order.sort(function (a, b) { return ((c[b] > 0 || S.fx.indexOf(b) >= 0) - (c[a] > 0 || S.fx.indexOf(a) >= 0)) || FXI[a] - FXI[b]; });
    el.innerHTML = '<button class="ir-chip ir-fc" type="button" data-fx="" aria-pressed="' + !S.fx.length + '">' + T('Everywhere') + '</button>' + order.map(function (k) {
      var on = S.fx.indexOf(k) >= 0, zero = !c[k] && !on;
      return '<button class="ir-chip ir-fc' + (zero ? ' is-zero' : '') + '" type="button" data-fx="' + k + '" aria-pressed="' + on + '"' + (zero ? ' disabled title="' + T('Nothing in this view yet') + '"' : '') + '>' + esc(FOCUS[FXI[k]][1]) + ' <i>' + N(c[k]) + '</i></button>';
    }).join('');
  }
  // In plain words, what the filters leave: the creator tools head their show with it.
  function filterLine() {
    var b = [];
    if (S.lens === 'live') {
      var h = S.hot && S.hot !== 'all' && S.hot !== 'blind' ? hotById(S.hot) : null;
      b.push(h ? T('Hot topic: {name}', { name: h.name }) : S.hot === 'all' ? T('Hot topics') : S.hot === 'blind' ? T('Blindspots') : T('Last 24 hours'));
      if (S.within) b.push(T('last {n} h', { n: N(S.within) }));
    } else if (S.lens === 'bank') b.push(fullRange() ? T('The bank, all time') : T('The bank, {when}', { when: S.days ? T('the past 30 days') : bLabel(S.from) + (S.to !== S.from ? T(' to ') + bLabel(S.to) : '') }));
    else b.push(T('From readers'));
    if (S.fx.length) b.push(S.fx.map(function (k) { return FOCUS[FXI[k]][1]; }).join(T(' or ')));
    if (S.tp.length) b.push(S.tp.map(topicName).join(T(' or ')));
    if (S.place) b.push(S.place.indexOf('c:') === 0 ? cName(S.place.slice(2)) : S.place.split(',').map(placeName).join(T(', ')));
    if (S.pf.length) b.push(S.pf.map(pfName).join(T(' or ')));
    if (S.kind) b.push(KINDS.filter(function (k) { return k[0] === S.kind; })[0][1]);
    if (S.lmin) b.push(T('{n}+ likes', { n: fmtN(S.lmin) }));
    if (S.heat && S.lens === 'live') b.push(T('heat {n}+', { n: N(S.heat) }));
    if (S.vmin) b.push(T('viral {n}+', { n: N(S.vmin) }));
    if (S.crmin) b.push(T('credibility {n}+', { n: N(S.crmin) }));
    Object.keys(FACETS).forEach(function (k) { if (S.ext[k]) b.push(FACETS[k].label(S.ext[k])); });
    if (S.top) b.push(T('top picks'));
    if (S.edu) b.push(T('explainers'));
    if (S.q) b.push('"' + S.q + '"');
    return b.join(' · ');
  }
  function seg(id, key, label, list, show) {
    var el = $(id); if (!el) return;
    el.hidden = !show;
    if (!show) return;
    el.innerHTML = '<span class="ir-seg-l">' + label + '</span>' + list.map(function (o) { return '<button type="button" data-seg="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (S[key] === o[0]) + '">' + o[1] + '</button>'; }).join('');
  }
  /* The board over the map: what is in view, counted. Every number is a count of what the list holds now. */
  var BOARD_IT = null;
  function drawBoard() {
    var el = $('ir-board'); if (!el) return;
    var places = {}, lk = 0, nl = 0, vw = 0, nv = 0, pc = {}, best = null, bestN = -1, live = S.lens === 'live';
    shown.forEach(function (it) {
      keysOf(it).forEach(function (k) { if (k !== 'global' && P[k]) places[k] = 1; });
      var r = reachOf(it); if (r && !r.x) { if (r.lk != null) { lk += r.lk; nl++; } if (r.vw != null) { vw += r.vw; nv++; } }
      var p = pfOf(it); pc[p] = (pc[p] || 0) + 1;
      var score = live ? (it.hot != null ? it.hot : -1) : (it._v != null ? it._v : -1);
      if (score > bestN) { bestN = score; best = it; }
    });
    BOARD_IT = bestN >= 0 ? best : null;
    var n = shown.length, tile = function (k, v, sub) { return '<div class="ir-b-t"><span class="ir-b-k">' + k + '</span><b class="num">' + v + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; };
    var mix = Object.keys(pc).sort(function (a, b) { return pc[b] - pc[a]; });
    var html = tile(T('In view'), LN(n), S.lens === 'live' ? (n === 1 ? T('story') : T('stories')) : S.lens === 'readers' ? T('sent in') : (n === 1 ? T('item') : T('items'))) +
      tile(T('Places'), N(Object.keys(places).length), T('on the map')) +
      tile(T('Likes'), nl ? fmtN(lk) : '\u2013', nl ? T('on {n} with a count', { n: N(nl) }) : T('none counted here')) +
      tile(T('Views'), nv ? fmtN(vw) : '\u2013', nv ? T('on {n} with a count', { n: N(nv) }) : T('none counted here'));
    if (BOARD_IT) html += '<button type="button" class="ir-b-t ir-b-top" data-board><span class="ir-b-k">' + (live ? T('Hottest') : T('Most viral')) + ' \u00b7 ' + N(bestN) + '</span><span class="ir-b-tt"' + DA + '>' + esc(BOARD_IT.t) + '</span></button>';
    html += '<div class="ir-b-mix" role="img" aria-label="' + esc(T('Where it was posted: ') + mix.map(function (p) { return pfName(p) + ' ' + N(pc[p]); }).join(T(', '))) + '">' +
      mix.map(function (p) { return '<span style="flex:' + pc[p] + ';background:' + pfColor(p) + '" title="' + esc(pfName(p) + ': ' + N(pc[p])) + '"></span>'; }).join('') + '</div>';
    el.innerHTML = html; el.hidden = !n && S.lens === 'readers';
  }
  /* The wire: the hottest of the last 24 hours, running across the top. A headline opens it. */
  function drawWire() {
    var el = $('ir-wire'); if (!el) return;
    if (!liveShown() || liveN() < 3) { el.hidden = true; return; }
    var top = ownOf(LIVE).sort(function (a, b) { return (b.hot || 0) - (a.hot || 0); }).slice(0, 14);
    var one = function (it, dup) { return '<button type="button" data-wire="' + esc(String(it.id)) + '"' + (dup ? ' tabindex="-1"' : '') + '><span class="w-h">' + flame() + '<b class="num">' + N(it.hot) + '</b></span>' + mark(it, 'w-m') + '<span class="w-t"' + DA + '>' + esc(cut(it.t, 80)) + '</span><span class="w-s">' + bd(esc(whoName(it) || it.h || it.src)) + ' \u00b7 ' + esc(ago(Date.parse(it.d))) + '</span></button>'; };
    $('ir-wire-t').innerHTML = '<span class="w-set">' + top.map(function (it) { return one(it); }).join('') + '</span><span class="w-set" aria-hidden="true">' + top.map(function (it) { return one(it, 1); }).join('') + '</span>';
    $('ir-wire-t').style.animationDuration = Math.max(60, top.length * 9) + 's';
    el.hidden = false;
  }
  function openWire(id) {
    var it = null; LIVE.forEach(function (x) { if (String(x.id) === id) it = x; });
    if (!it) return;
    stopTour();
    var h = HOTS.filter(function (x) { return x.ids[it.id]; })[0] || null;          // the story it belongs to (THE WIRE, TAPPED)
    var before = query(), here = S.lens === 'live' && pass(it);
    if (h || !here) {
      if (WIRE_BACK == null) WIRE_BACK = before;          // the first tap remembers where he was; a second tap keeps that
      if (S.lens !== 'live') useLens('live', true);
      clearS();
      if (h) S.hot = h.id;
      render(); if (!S.place) frameShown();
    }
    var i = shown.indexOf(it);
    if (i >= 0) openSpot(i);
  }
  function placeOptions(list, withAll) {
    var byC = {}, n = {};
    list.forEach(function (it) { keysOf(it).forEach(function (k) { if (k === 'global' || !P[k]) return; n[k] = (n[k] || 0) + 1; var c = P[k][1] || ''; (byC[c] = byC[c] || {})[k] = 1; }); });
    var cs = Object.keys(byC).map(function (c) { var t = 0; list.forEach(function (it) { if (keysOf(it).some(function (k) { return P[k] && (P[k][1] || '') === c; })) t++; }); return [c, t]; });
    cs.sort(function (a, b) { return b[1] - a[1]; });
    var html = '';
    cs.forEach(function (ct) {
      var ks = Object.keys(byC[ct[0]]);
      // a place in no country (the Persian Gulf): each on its own line, never "All of  (9)" under an empty heading
      if (!ct[0]) { html += ks.sort(function (a, b) { return n[b] - n[a]; }).map(function (k) { return '<option value="' + esc(k) + '">' + esc(P[k][0]) + (withAll ? ' (' + N(n[k]) + ')' : '') + '</option>'; }).join(''); return; }
      if (ks.length === 1 && (P[ks[0]][0] === ct[0] || P[ks[0]][0] === cName(ct[0]))) { html += '<option value="' + ks[0] + '">' + esc(cName(ct[0])) + (withAll ? ' (' + N(ct[1]) + ')' : '') + '</option>'; return; }
      html += '<optgroup label="' + esc(cName(ct[0])) + '">' + (withAll ? '<option value="c:' + esc(ct[0]) + '">' + esc(T('All of {c}', { c: cName(ct[0]) })) + ' (' + N(ct[1]) + ')</option>' : '') +
        ks.sort(function (a, b) { return n[b] - n[a]; }).map(function (k) { return '<option value="' + k + '">' + esc(P[k][0]) + (withAll ? ' (' + N(n[k]) + ')' : '') + '</option>'; }).join('') + '</optgroup>';
    });
    return html;
  }
  function fillPlaces() {
    $('ir-place').innerHTML = '<option value="">' + T('Every place') + '</option>' + placeOptions(ownOf(items), true) + '<option value="global">' + T('No single place') + '</option>';
    drawState();
  }
  function drawState() {
    var want = S.nowhere ? 'global' : S.place;
    $('ir-place').value = want;
    if ($('ir-place').value !== want) $('ir-place').value = '';
  }
  // A line that describes the filters (it carries Clear) stays while they do; any other line ("Copied 40 items", "Connection
  // lines off.") goes after 6 seconds, so it is never left on the full screen or copied as if it described the list.
  var sayT = 0;
  function say(t, clear) {
    var el = $('ir-said');
    clearTimeout(sayT);
    el.innerHTML = t ? esc(t) + (clear ? ' <button type="button" data-clear>' + T('Clear') + '</button>' : '') : '';
    if (t && !clear) sayT = setTimeout(function () { if (el.textContent === String(t)) el.innerHTML = ''; }, 6000);
  }
  function clearS() {          // every filter off, in place (the ask box's blankS returns a blank copy instead)
    S.q = ''; S.tp = []; S.place = ''; S.kind = ''; S.top = false; S.edu = false; S.nowhere = false; S.pf = []; S.heat = 0; S.vmin = 0; S.within = 0; S.crmin = 0; S.fx = []; S.lmin = 0; S.hot = ''; S.link = ''; S.with = ''; S.who = ''; S.ext = {}; S.sort = SORTS[S.lens][0][0]; S.from = 0; S.to = buckets.length - 1; S.days = 0;
    $('ir-q').value = ''; $('ir-from').value = 0; $('ir-to').value = S.to;
  }
  function clearAll() {
    clearS(); WIRE_BACK = null;
    say('');
    render();
  }
  /* PRESETS, applied (see PRESETS). What the room is on stays; how it is cut is replaced; the last 24 hours. */
  function presetSort(p) {
    var have = SORTS.live.map(function (s) { return s[0]; }), w = p.set.sort;
    if (have.indexOf(w) < 0 && w === 'viral') w = 'likes';          // a feed with no viral score: the most liked instead
    if (have.indexOf(w) < 0 && w === 'views') w = 'likes';
    return have.indexOf(w) >= 0 ? w : have[0];
  }
  function presetHow(p) {
    var s = p.set, x = {};
    Object.keys(FACETS).forEach(function (k) { x[k] = (s.ext || {})[k] || ''; });
    return { kind: s.kind || '', within: s.within || 0, sort: presetSort(p), ext: x };
  }
  function presetOn(p) {
    if (S.lens !== 'live' || S.pf.length || S.heat || S.vmin || S.crmin || S.lmin || S.top || S.edu) return false;
    var h = presetHow(p);
    return S.kind === h.kind && S.within === h.within && S.sort === h.sort && Object.keys(h.ext).every(function (k) { return (S.ext[k] || '') === h.ext[k]; });
  }
  var HOW_KEYS = ['lens', 'pf', 'heat', 'vmin', 'crmin', 'lmin', 'top', 'edu', 'kind', 'within', 'ext'];
  function presetCount(p) {          // what the preset would show here, counted by pass() itself, the state put back after
    if (!liveShown()) return 0;
    var keep = {}, h = presetHow(p), n = 0;
    HOW_KEYS.forEach(function (k) { keep[k] = S[k]; });
    S.lens = 'live'; S.pf = []; S.heat = 0; S.vmin = 0; S.crmin = 0; S.lmin = 0; S.top = false; S.edu = false; S.kind = h.kind; S.within = h.within;
    S.ext = {}; Object.keys(keep.ext).forEach(function (k) { if (!FACETS[k]) S.ext[k] = keep.ext[k]; });
    Object.keys(h.ext).forEach(function (k) { if (h.ext[k]) S.ext[k] = h.ext[k]; });
    try { LIVE.forEach(function (it) { if (pass(it)) n++; }); } finally { HOW_KEYS.forEach(function (k) { S[k] = keep[k]; }); }
    return n;
  }
  function presetOff() {
    S.kind = ''; S.within = 0; Object.keys(FACETS).forEach(function (k) { delete S.ext[k]; }); S.sort = SORTS[S.lens][0][0]; $('ir-sort').value = S.sort;
    say(''); render();
  }
  function applyPreset(key) {
    var p = PRESETS.filter(function (x) { return x.key === key; })[0];
    if (!p || !liveShown()) return false;
    stopTour();
    if (S.lens !== 'live') { var keepOn = { q: S.q, tp: S.tp.slice(), fx: S.fx.slice(), place: S.place, nowhere: S.nowhere }; useLens('live', true); Object.keys(keepOn).forEach(function (k) { S[k] = keepOn[k]; }); }
    var h = presetHow(p);
    S.pf = []; S.heat = 0; S.vmin = 0; S.crmin = 0; S.lmin = 0; S.top = false; S.edu = false; S.kind = h.kind; S.within = h.within; S.sort = h.sort;
    Object.keys(h.ext).forEach(function (k) { if (h.ext[k]) S.ext[k] = h.ext[k]; else delete S.ext[k]; });
    $('ir-sort').value = S.sort;
    render(); if (!S.place) frameShown();
    say(T('{name}: {what}. {n} here.', { name: p.name, what: p.says, n: LN(shown.length) }), true);
    return true;
  }
  /* THE WIRE, TAPPED (24 Oct 2026; Armin: clicking a wire item does nothing visible). Measured that day on both sites: every
     headline did open its spotlight, but (1) on a phone the strip kept moving under the finger, (2) a headline the filters
     hid wiped every filter without a word, and (3) once the spotlight closed he was back on a list that had nothing to do
     with what he tapped, which reads as "nothing happened". Now a tap stops the strip, takes the room to that headline's
     story (everything on it: posts, articles, videos), opens the headline, and puts "Back to your view" beside the story's
     pill; Back returns every filter he had. A headline in no story opens on the last 24 hours, his filters kept when they
     let it through. */
  var WIRE_BACK = null;
  function wireBack() {
    var b = WIRE_BACK; WIRE_BACK = null;
    if (b == null) return;
    closeSpot(); readUrl(b); render(); frameShown();
    say(T('Back to your view.'));
  }

  /* ------------------------------------------------------------ the command bar, the filters panel and the pills
     18 October 2026, Armin: "right now the intelligence room just looks so fucking cluttered! When I go in there, I don't
     even see ... the globe ... I just see a whole bunch of filters ... that entire top section might be something that you
     expand". Measured that day: the globe began 1,102px down on a 1366x900 screen and 1,867px down on a phone. So the map
     comes first, under one bar: search, Topic, Region, Filters and Add. Every filter lives in ONE panel that opens from the
     bar (a sheet from the bottom on a phone, from the right on a computer), and its chips wrap, so nothing runs off the
     right edge where a mouse cannot reach it (the old rows scrolled sideways with the scrollbar hidden). What is switched
     on shows as a pill under the bar, each with its own cross, so a reader always sees why the list is what it is. */
  function nActive() {
    return S.tp.length + S.fx.length + (S.place || S.nowhere ? 1 : 0) + S.pf.length + (S.kind ? 1 : 0) + (S.heat && S.lens === 'live' ? 1 : 0) + (S.vmin ? 1 : 0) +
      (S.within && S.lens === 'live' ? 1 : 0) + (S.crmin ? 1 : 0) + (S.lmin ? 1 : 0) + (S.top ? 1 : 0) + (S.edu ? 1 : 0) + (S.lens === 'bank' && !fullRange() ? 1 : 0) +
      Object.keys(FACETS).filter(function (k) { return S.ext[k]; }).length;          // the FACETS are filters of the panel too
  }
  function drawCmd() {
    var set = function (id, n) { var el = $(id); if (!el) return; el.textContent = n ? N(n) : ''; el.parentNode.classList.toggle('on', !!n); };
    set('ir-cb-tp', S.tp.length); set('ir-cb-fx', S.fx.length + (S.place || S.nowhere ? 1 : 0)); set('ir-cb-n', nActive());
    var n = shown.length, dn = $('ir-dr-n');
    if (dn) dn.textContent = LN(n) + ' ' + (S.lens === 'live' ? (n === 1 ? T('story') : T('stories')) : n === 1 ? T('item') : T('items'));
  }
  function openDrawer(sec) {
    var d = $('ir-drawer'); if (!d) return;
    stopTour();
    if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
    var el = sec === 'topic' ? $('ir-dr-topic') : sec === 'region' ? $('ir-dr-region') : null, bar = $('ir-bar');
    if (el && bar) bar.scrollTop = el.offsetTop - bar.offsetTop - 8; else if (bar) bar.scrollTop = 0;
    [].forEach.call(d.querySelectorAll('.ir-dr-s'), function (s) { s.classList.toggle('is-to', s === el); });
  }
  function closeDrawer() { var d = $('ir-drawer'); if (d && d.open) { if (d.close) d.close(); else d.removeAttribute('open'); } }
  function drawPills() {
    var el = $('ir-pills'); if (!el) return;
    var p = [], kn = function (k) { return (KINDS.filter(function (x) { return x[0] === k; })[0] || ['', k])[1]; };
    if (S.link) { var L = linkByKey(S.link); p.push(['link:', T('Connection: {what}', { what: L ? T('{a} and {b}', { a: cName(L.a), b: cName(L.b) }) : S.link.split('|').map(cName).join(T(' and ')) })]); }
    if (S.with) { var wi = itemById(S.with); p.push(['with:', T('Connected to: {what}', { what: wi ? cut(wi.t, 40) : T('one story') })]); }
    if (S.who) { var wi0 = items.filter(function (x) { return whoKey(x) === S.who; })[0]; p.push(['who:', T('From {who}', { who: wi0 ? whoName(wi0) : S.who })]); }
    Object.keys(S.ext).forEach(function (xk) { if (EXT[xk]) p.push(['ext:' + xk, xcall(EXT[xk].label, S.ext[xk]) || S.ext[xk]]); });
    if (S.hot && S.lens === 'live') { var h = S.hot === 'all' || S.hot === 'blind' ? null : hotById(S.hot); p.push(['hot:', h ? T('Story: {name}', { name: h.name }) : S.hot === 'blind' ? T('Blindspots') : T('Hot stories')]); }
    S.tp.forEach(function (k) { p.push(['tp:' + k, topicName(k)]); });
    S.fx.forEach(function (k) { p.push(['fx:' + k, FOCUS[FXI[k]][1]]); });
    if (S.nowhere) p.push(['place:', T('No single place')]); else if (S.place) p.push(['place:', S.place.indexOf('c:') === 0 ? cName(S.place.slice(2)) : S.place.split(',').map(placeName).join(T(', '))]);
    S.pf.forEach(function (x) { p.push(['pf:' + x, T('On {pf}', { pf: pfName(x) })]); });
    if (S.kind) p.push(['kind:', kn(S.kind)]);
    if (S.within && S.lens === 'live') p.push(['within:', T('Last {n} h', { n: N(S.within) })]);
    if (S.heat && S.lens === 'live') p.push(['heat:', T('Heat {n}+', { n: N(S.heat) })]);
    if (S.lmin) p.push(['lmin:', T('{n}+ likes', { n: fmtN(S.lmin) })]);
    if (S.vmin) p.push(['vmin:', T('Viral {n}+', { n: N(S.vmin) })]);
    if (S.crmin) p.push(['crmin:', T('Credibility {n}+', { n: N(S.crmin) })]);
    if (S.top) p.push(['top:', T('Top picks')]);
    if (S.edu) p.push(['edu:', T('Explainers')]);
    if (S.lens === 'bank' && !fullRange()) p.push(['time:', $('ir-range').textContent]);
    if (S.q) p.push(['q:', '"' + S.q + '"']);
    el.innerHTML = p.map(function (x) { return '<button type="button" class="ir-pill" data-unpill="' + esc(x[0]) + '" aria-label="' + esc(T('Remove {what}', { what: x[1] })) + '"><span>' + esc(x[1]) + '</span><b aria-hidden="true">&times;</b></button>'; }).join('') +
      (p.length > 1 ? '<button type="button" class="ir-pill ir-pill-clr" data-clear>' + T('Clear all') + '</button>' : '') +
      (WIRE_BACK != null ? '<button type="button" class="ir-pill ir-pill-back" data-wire-back><span aria-hidden="true">' + (FA ? '→' : '←') + '</span> ' + T('Back to your view') + '</button>' : '') + storyAbout();          // THE WIRE, TAPPED
    el.hidden = !p.length && WIRE_BACK == null;
  }
  /* WHAT A STORY IS (22 Oct 2026; Armin, on a Trending chip: "I clicked on this hot topic filter that I don't know what
     it's about"). A chip carries a name cut to fit; once it is picked, one line under the pill says the story whole: its
     lead headline, and how many posts and outlets it holds, so he knows what he is looking at before reading the list. */
  function storyAbout() {
    if (!S.hot || S.lens !== 'live' || S.hot === 'all' || S.hot === 'blind') return '';
    if (FA && !(TT && TT['The story:'])) return '';          // the Persian room says nothing in English it has no words for
    var h = hotById(S.hot); if (!h) return '';
    var lead = h.its.filter(function (it) { return it.id === 'L' + h.lead; })[0] || h.its[0];
    var s = h.s || {}, bits = [];
    var cnt = function (src) { return h.all.filter(function (it) { return it.src === src; }).length; }, xn = cnt('X'), an = cnt('News'), vn = cnt('YouTube');
    if (h.all.length > h.its.length) bits.push(T('{n} in all', { n: N(h.all.length) }));
    if (xn) bits.push(T(xn === 1 ? '1 post on X' : '{n} posts on X', { n: N(xn) }));
    if (an) bits.push(T(an === 1 ? '1 article' : '{n} articles', { n: N(an) }));
    if (vn) bits.push(T(vn === 1 ? '1 video' : '{n} videos', { n: N(vn) }));
    if (s.out && !an) bits.push(T(s.out === 1 ? '1 outlet' : '{n} outlets', { n: N(s.out) }));
    if (s.x10k) bits.push(T('{n} over 10,000 likes', { n: N(s.x10k) }));
    var said = String(fullText(lead) || lead.t || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, ' ')
      .replace(/^\W*(?:(?:major |big )?breaking(?: news)?|just in|now|wow|boom)\s*[:!\-|]+\s*/i, '').replace(/\s+/g, ' ').trim();
    return '<p class="ir-pill-about"><b>' + esc(T('The story:')) + '</b> ' + esc(cut(unshout(said), 200)) +(bits.length ? ' <span>' + esc(bits.join(' · ')) + '</span>' : '') + '</p>';
  }
  function unpill(v) {
    var i = v.indexOf(':'), k = v.slice(0, i), x = v.slice(i + 1), cut1 = function (a) { var j = a.indexOf(x); if (j >= 0) a.splice(j, 1); };
    if (k === 'ext') delete S.ext[x];
    else if (k === 'link') S.link = ''; else if (k === 'with') S.with = ''; else if (k === 'hot') S.hot = ''; else if (k === 'who') S.who = '';
    else if (k === 'tp') cut1(S.tp); else if (k === 'fx') cut1(S.fx); else if (k === 'pf') cut1(S.pf);
    else if (k === 'place') { S.place = ''; S.nowhere = false; }
    else if (k === 'kind') S.kind = ''; else if (k === 'within') S.within = 0; else if (k === 'heat') S.heat = 0; else if (k === 'lmin') S.lmin = 0;
    else if (k === 'vmin') S.vmin = 0; else if (k === 'crmin') S.crmin = 0; else if (k === 'top') S.top = false; else if (k === 'edu') S.edu = false;
    else if (k === 'time') { S.from = 0; S.to = buckets.length - 1; S.days = 0; $('ir-from').value = 0; $('ir-to').value = S.to; }
    else if (k === 'q') { S.q = ''; $('ir-q').value = ''; }
    say(''); render();
    if (k === 'link' || k === 'with') frameShown();
  }

  /* ------------------------------------------------------------ what is new since the last visit (a reason to come back) */
  var SEEN_AT = (function () { var v = store('ir-seen'); return typeof v === 'number' && v > 0 ? v : 0; })();
  function isNew(it) { return !!SEEN_AT && it.hot != null && Date.parse(it.d || '') > SEEN_AT; }

  /* ------------------------------------------------------------ CONNECTIONS
     18 October 2026, Armin: "show lines of connections between different news items on the globe, so people can see what
     news is connected to what ... if people click on the lines, it will show why they're connected ... Maybe they could
     filter for the connections." None of the map dashboards read for the benchmark (research/intel-benchmark-2026-10-18.md)
     lets a reader light up only what is connected; this does.
     A connection is between two COUNTRIES (a city's items count for its country), drawn from what the filters leave, so a
     topic or a region filter changes the lines too. Three reasons, each counted, never guessed:
       story    the same story is being reported from both (the room's own story groups, data/show-packs.json)
       actor    the same person, force or body is named in items from both (ACTORS below: Hezbollah, the IRGC, Trump...)
       mention  items from one name the other ("France burns ... coming to America")
     The strongest connections are drawn as arcs that rise off the globe, gold for a shared story, pale for a shared actor,
     dim for a mention; a tap on one (or on its row under Connections) shows only what it joins, with its reasons. An item's
     own spotlight offers "What connects to this". The lines can be switched off from the map's buttons. */
  var ACTORS = [
    ['hezbollah', 'Hezbollah', /\bhezbollah\b/i], ['hamas', 'Hamas', /\bhamas\b|\bsinwar\b/i], ['houthis', 'The Houthis', /\bhouthis?\b|\bansar ?allah\b/i],
    ['irgc', 'The IRGC', /\birgc\b|\brevolutionary guards?\b|\bquds force\b|\biran'?s guards\b/i], ['khamenei', 'Khamenei', /\bkhamenei\b|\bsupreme leader\b/i],
    ['pahlavi', 'Reza Pahlavi', /\bpahlavi\b/i], ['netanyahu', 'Netanyahu', /\bnetanyahu\b|\bbibi\b/i], ['idf', 'The IDF', /\bidf\b|\bisraeli army\b/i],
    ['trump', 'Trump', /\btrump\b/i], ['vance', 'JD Vance', /\bvance\b/i], ['rubio', 'Rubio', /\brubio\b/i], ['hegseth', 'Hegseth', /\bhegseth\b/i],
    ['putin', 'Putin', /\bputin\b|\bkremlin\b/i], ['zelensky', 'Zelensky', /\bzelensk\w*/i], ['xi', 'Xi Jinping', /\bxi jinping\b|\bpresident xi\b/i],
    ['macron', 'Macron', /\bmacron\b/i], ['starmer', 'Starmer', /\bstarmer\b/i], ['farage', 'Farage', /\bfarage\b/i], ['robinson', 'Tommy Robinson', /\btommy robinson\b/i],
    ['meloni', 'Meloni', /\bmeloni\b/i], ['orban', 'Orban', /\borb[aá]n\b/i], ['erdogan', 'Erdogan', /\berdo[gğ]an\b/i], ['mbs', 'Mohammed bin Salman', /\bbin salman\b|\bmbs\b/i],
    ['sharaa', 'Al-Sharaa', /\bsharaa\b|\bjolani\b/i], ['abbas', 'Mahmoud Abbas', /\bmahmoud abbas\b|\bpalestinian authority\b/i], ['modi', 'Modi', /\bmodi\b/i], ['maduro', 'Maduro', /\bmaduro\b/i],
    ['musk', 'Elon Musk', /\bmusk\b/i], ['isis', 'ISIS', /\bisis\b|\bislamic state\b|\bdaesh\b/i], ['qaeda', 'Al-Qaeda', /\bal-?qaeda\b/i], ['taliban', 'The Taliban', /\btaliban\b/i],
    ['brotherhood', 'The Muslim Brotherhood', /\bmuslim brotherhood\b/i], ['un', 'The UN', /\bunited nations\b|\bsecurity council\b|\bguterres\b|\bunrwa\b/i], ['nato', 'NATO', /\bnato\b/i],
    ['eu', 'The EU', /\beuropean union\b|\beuropean commission\b|\bvon der leyen\b/i], ['iaea', 'The IAEA', /\biaea\b|\bgrossi\b/i], ['icc', 'The ICC', /\bicc\b|\binternational criminal court\b/i],
    ['opec', 'OPEC', /\bopec\b/i], ['hormuz', 'The Strait of Hormuz', /\bhormuz\b/i], ['redsea', 'The Red Sea', /\bred sea\b|\bbab el-?mandeb\b/i], ['antifa', 'Antifa', /\bantifa\b/i],
    ['nokings', 'No Kings', /\bno ?kings\b/i], ['muslims', 'Muslims', /\bmuslims?\b|\bislamist\w*\b/i]
  ];
  // Iran Uncensored's actors are the regime's people and forces and those who face them (en and fa words): [key, name, source, flags]
  if (Array.isArray(CFG.actors)) ACTORS = CFG.actors.map(function (a) { return [a[0], a[1], rxOf(a, 2)]; });
  var ACN = {}; ACTORS.forEach(function (a) { ACN[a[0]] = a[1]; });
  // The countries an item can NAME (for "mentions"), in the names the places use; each needs a place on the map to draw to
  var NAMES = [['Iran', /\biran\w*\b|\btehran\b/i], ['Israel', /\bisrael\w*\b|\btel aviv\b/i], ['United States', /\bU\.S\.|\b(USA|US|America|American|Americans|Washington|White House|Pentagon)\b/],
    ['Russia', /\brussia\w*\b|\bmoscow\b|\bkremlin\b/i], ['Ukraine', /\bukrain\w*\b|\bkyiv\b/i], ['China', /\bchina\b|\bchinese\b|\bbeijing\b/i], ['France', /\bfrance\b|\bfrench\b|\bparis\b/i],
    ['United Kingdom', /\bbritain\b|\bbritish\b|\b(UK|London)\b/], ['Germany', /\bgerman\w*\b|\bberlin\b/i], ['Lebanon', /\bleban\w*\b|\bbeirut\b/i], ['Syria', /\bsyria\w*\b|\bdamascus\b/i],
    ['Yemen', /\byemen\w*\b|\bsanaa\b/i], ['Gaza', /\bgaza\b/i], ['West Bank', /\bwest bank\b|\bjudea\b/i], ['Qatar', /\bqatar\w*\b|\bdoha\b/i], ['Saudi Arabia', /\bsaudi\w*\b|\briyadh\b/i],
    ['Turkey', /\bturkey\b|\bturkish\b|\bankara\b/i], ['Iraq', /\biraq\w*\b|\bbaghdad\b/i], ['Egypt', /\begypt\w*\b|\bcairo\b/i], ['Canada', /\bcanad\w*\b|\bottawa\b/i],
    ['Italy', /\bital(y|ian)\b|\brome\b/i], ['India', /\bindia\b|\bindian government\b/i], ['Pakistan', /\bpakistan\w*\b/i], ['Afghanistan', /\bafghan\w*\b|\bkabul\b/i], ['Venezuela', /\bvenezuel\w*\b/i], ['Cuba', /\bcuba\w*\b|\bhavana\b/i], ['Taiwan', /\btaiwan\w*\b/i], ['Japan', /\bjapan\w*\b|\btokyo\b/i], ['Mexico', /\bmexic\w*\b/i], ['Poland', /\bpoland\b|\bpolish\b/i],
    ['United Arab Emirates', /\buae\b|\bemirat\w*\b|\bdubai\b|\babu dhabi\b/i]];
  if (Array.isArray(CFG.names)) NAMES = CFG.names.map(function (a) { return [a[0], rxOf(a, 1)]; });          // [country, source, flags]
  var ANCH = null;
  function anchors() {          // each country's point: its own place where it has one, else its first place on the map
    if (ANCH) return ANCH;
    ANCH = {};
    Object.keys(P).forEach(function (k) { var v = P[k]; if (!v || v[2] == null || !v[1]) return; if (!ANCH[v[1]] || v[0] === v[1] || v[0] === cName(v[1])) ANCH[v[1]] = [v[3], v[2], k]; });
    return ANCH;
  }
  function countryOf(it) { return P[it.p] ? P[it.p][1] : ''; }
  function actorsOf(it) { if (!it._ac) { var t = (it.t || '') + ' ' + (it.n || ''); it._ac = ACTORS.filter(function (a) { return a[2].test(t); }).map(function (a) { return a[0]; }); } return it._ac; }
  function namesOf(it) { if (!it._nm) { var t = (it.t || '') + ' ' + (it.n || ''), own = countryOf(it); it._nm = NAMES.filter(function (n) { return n[0] !== own && n[1].test(t); }).map(function (n) { return n[0]; }); } return it._nm; }
  var LINKS = [], LSET = null, LT = 'items', LKON = store('ir-links') !== 'off', LTYPE = '';
  function linkByKey(k) { for (var i = 0; i < LINKS.length; i++) if (LINKS[i].k === k) return LINKS[i]; return null; }
  function itemById(id) { for (var i = 0; i < items.length; i++) if (String(items[i].id) === id) return items[i]; return null; }
  function buildLinks(base, only) {
    var A = anchors(), by = {}, out = {};
    var add = function (a, b, type, key, name, ia, ib, w) {
      if (!a || !b || a === b || !A[a] || !A[b]) return;
      var x = a < b ? a : b, y = a < b ? b : a, k = x + '|' + y, L = out[k] || (out[k] = { k: k, a: x, b: y, w: 0, ids: {}, why: {} });
      var r = L.why[type + ':' + key] || (L.why[type + ':' + key] = { t: type, key: key, name: name, ids: {} });
      ia.concat(ib).forEach(function (it) { L.ids[it.id] = 1; r.ids[it.id] = 1; });
      L.w += w;
    };
    base.forEach(function (it) { var c = countryOf(it); if (c) (by[c] = by[c] || []).push(it); });
    var cs = Object.keys(by);
    // the same story, told from two places
    var st = {};
    base.forEach(function (it) { var h = STORY_OF[it.id], c = countryOf(it); if (!h || !c) return; var s1 = st[h.id] || (st[h.id] = { h: h, by: {} }); (s1.by[c] = s1.by[c] || []).push(it); });
    Object.keys(st).forEach(function (sid) {
      var s1 = st[sid], ks = Object.keys(s1.by);
      for (var i = 0; i < ks.length; i++) for (var j = i + 1; j < ks.length; j++) add(ks[i], ks[j], 'story', sid, s1.h.name, s1.by[ks[i]], s1.by[ks[j]], 2 * Math.min(s1.by[ks[i]].length, s1.by[ks[j]].length) + 1);
    });
    // the same actor named from two places
    var ac = {};
    base.forEach(function (it) { var c = countryOf(it); if (!c) return; actorsOf(it).forEach(function (a) { var m = ac[a] || (ac[a] = {}); (m[c] = m[c] || []).push(it); }); });
    Object.keys(ac).forEach(function (a) {
      var ks = Object.keys(ac[a]).sort(function (x, y) { return ac[a][y].length - ac[a][x].length; }).slice(0, 6);          // a name said everywhere joins its six busiest places, not every pair
      for (var i = 0; i < ks.length; i++) for (var j = i + 1; j < ks.length; j++) add(ks[i], ks[j], 'actor', a, ACN[a], ac[a][ks[i]], ac[a][ks[j]], Math.min(ac[a][ks[i]].length, ac[a][ks[j]].length));
    });
    // one place's items naming another
    cs.forEach(function (c) {
      var m = {};
      by[c].forEach(function (it) { namesOf(it).forEach(function (n) { (m[n] = m[n] || []).push(it); }); });
      Object.keys(m).forEach(function (n) { add(c, n, 'mention', n, T('{a} items name {b}', { a: cName(c), b: cName(n) }), m[n], by[n] ? by[n].slice(0, 0) : [], m[n].length); });
    });
    var list = Object.keys(out).map(function (k) {
      var L = out[k];
      L.n = Object.keys(L.ids).length;
      L.reasons = Object.keys(L.why).map(function (r) { var x = L.why[r]; x.n = Object.keys(x.ids).length; return x; })
        .sort(function (p, q) { return ({ story: 0, actor: 1, mention: 2 }[p.t] - { story: 0, actor: 1, mention: 2 }[q.t]) || q.n - p.n; });
      L.type = L.reasons[0].t;
      return L;
    }).filter(function (L) { return L.n >= 2 && L.w >= 2; });
    if (only) list = list.filter(function (L) { return L.reasons.some(function (r) { return r.t === only; }); });
    return list.sort(function (p, q) { return q.w - p.w || q.n - p.n; });
  }
  // what one item connects to: its story elsewhere, the actors it names elsewhere, the countries it names
  function linksOf(it, base) {
    var c = countryOf(it), ids = {}, n = 0;
    ids[it.id] = 1;
    var h = STORY_OF[it.id], ac = actorsOf(it), nm = namesOf(it), tk = tkOf(it);
    base.forEach(function (x) {
      if (x === it) return;
      var cx = countryOf(x); if (!cx || cx === c) return;
      // a country it names counts only for items there on one of its own subjects, so naming America does not join it to all of America
      if ((h && STORY_OF[x.id] === h) || actorsOf(x).some(function (a) { return ac.indexOf(a) >= 0; }) || (nm.indexOf(cx) >= 0 && tkOf(x).some(function (k) { return tk.indexOf(k) >= 0; }))) { ids[x.id] = 1; n++; }
    });
    return { ids: ids, n: n };
  }
  function linkWhy(L, short) {
    var s = L.reasons.filter(function (r) { return r.t === 'story'; }), a = L.reasons.filter(function (r) { return r.t === 'actor'; }), m = L.reasons.filter(function (r) { return r.t === 'mention'; });
    var out = [];
    if (s.length) out.push((s.length === 1 ? T('Same story: {name}', { name: cut(s[0].name, short ? 40 : 70) }) : T('{n} stories told from both', { n: N(s.length) })));
    if (a.length) out.push(T('Both name {list}', { list: a.slice(0, short ? 2 : 4).map(function (r) { return r.name; }).join(T(', ')) + (a.length > (short ? 2 : 4) ? T(' and more') : '') }));
    if (m.length && !s.length) out.push(m.map(function (r) { return r.name; }).slice(0, 2).join('; '));
    return out.join(' · ');
  }
  // the list's second tab: every connection in what is shown, strongest first
  function drawLinkList() {
    var el = $('ir-links'), tab = $('ir-ltab'); if (!el || !tab) return;
    var all = LINKS, n = all.length;
    $('ir-ltab-n').textContent = n ? N(n) : '';          // N(): Persian digits on the Persian page (it showed "12" beside «نیروها ۹»)
    tab.hidden = S.lens === 'readers';
    [].forEach.call(tab.querySelectorAll('[data-ltab]'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-ltab') === LT ? 'true' : 'false'); });
    if (LT !== 'items' && LT !== 'links' && !LTX[LT]) LT = 'items';
    var onL = LT === 'links' && S.lens !== 'readers', onX = !!LTX[LT] && S.lens !== 'readers';          // onX: an add-on's tab (LTX)
    el.hidden = !onL; $('ir-items').hidden = onL || onX; $('ir-more').hidden = onL || onX || shown.length <= limit;
    root.classList.toggle('ir-on-links', onL); root.classList.toggle('ir-on-x', onX);
    Object.keys(LTX).forEach(function (k) { var te = $(LTX[k].el); if (te) te.hidden = !(onX && LT === k); xcall(LTX[k].count); });
    if (onX) xcall(LTX[LT].draw);
    if (!onL) return;
    var types = [['', T('All')], ['story', T('Same story')], ['actor', T('Same people')], ['mention', T('Mentions')]];
    var shownL = LTYPE ? all.filter(function (L) { return L.reasons.some(function (r) { return r.t === LTYPE; }); }) : all;
    el.innerHTML = '<p class="ir-lk-h">' + T('How what you see connects across the map. Tap one to see only what it joins, and why.') + '</p>' +
      '<div class="ir-lk-t" role="group" aria-label="' + T('Kind of connection') + '">' + types.map(function (t) { return '<button type="button" class="ir-chip" data-ltype="' + t[0] + '" aria-pressed="' + (LTYPE === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      (shownL.length ? '<ol class="ir-lk-l">' + shownL.slice(0, 40).map(function (L) {
        return '<li><button type="button" class="ir-lk-r lk-' + L.type + (S.link === L.k ? ' on' : '') + '" data-link="' + esc(L.k) + '"><span class="ir-lk-ab"><b>' + esc(cName(L.a)) + '</b><i aria-hidden="true"></i><b>' + esc(cName(L.b)) + '</b></span>' +
          '<span class="ir-lk-w">' + esc(linkWhy(L, true)) + '</span><span class="ir-lk-n num">' + T('{n} items', { n: N(L.n) }) + '</span></button></li>';
      }).join('') + '</ol>' : '<p class="ir-empty">' + T('No two places are connected in what is shown. Widen the filters, or pick Everything.') + '</p>');
  }

  /* the arcs on the map: drawn after the marks on every frame (they move with the globe), under them in the SVG */
  var gLinks = null, LDRAW = [];
  function linkCap() { return CW < 520 ? 6 : 10; }
  function drawLinksNow() {
    if (!gLinks || !PJ) return;
    LDRAW = [];
    if (!LKON || S.lens === 'readers' || !LINKS.length) { if (gLinks.firstChild) gLinks.innerHTML = ''; return; }
    var A = anchors(), sel = S.link ? linkByKey(S.link) : null;
    var wi = S.with ? itemById(S.with) : null, wc = wi ? countryOf(wi) : '';
    var list = S.link ? (sel ? [sel] : []) : wc ? LINKS.filter(function (L) { return L.a === wc || L.b === wc; }).slice(0, linkCap()) : LINKS.slice(0, linkCap());
    var maxW = list.reduce(function (m, L) { return Math.max(m, L.w); }, 1), html = '', cx = CW / 2, cy = CH / 2, globe = V.mode === 'globe';
    list.forEach(function (L, li) {
      var a = A[L.a], b = A[L.b]; if (!a || !b) return;
      var pa = [a[0], a[1]], pb = [b[0], b[1]], ip = G.geoInterpolate(pa, pb), dist = G.geoDistance(pa, pb), segs = [], cur = [], pts = [];
      var SEG = 40, lift = globe ? 0.05 + 0.16 * Math.min(1, dist / 1.6) : 0;          // SEG, not N: N() writes the room's digits
      var A2 = PJ(pa), B2 = PJ(pb), chord = A2 && B2 ? Math.hypot(B2[0] - A2[0], B2[1] - A2[1]) : 0;
      for (var i = 0; i <= SEG; i++) {
        var t = i / SEG, g = ip(t);
        if (globe && !seen(g[0], g[1])) { if (cur.length > 1) segs.push(cur); cur = []; continue; }
        var p = PJ(g); if (!p || !isFinite(p[0])) continue;
        var up = Math.sin(Math.PI * t);
        if (globe) { var f = 1 + lift * up; p = [cx + (p[0] - cx) * f, cy + (p[1] - cy) * f]; }
        else if (chord) { var nx = -(B2[1] - A2[1]) / chord, ny = (B2[0] - A2[0]) / chord; if (ny > 0) { nx = -nx; ny = -ny; } var h = Math.min(120, chord * 0.22) * up; p = [p[0] + nx * h, p[1] + ny * h]; }
        cur.push(p); pts.push(p);
      }
      if (cur.length > 1) segs.push(cur);
      if (!segs.length) return;
      var d = segs.map(function (s) { return 'M' + s.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L'); }).join('');
      var sw = (1.2 + 2.6 * Math.sqrt(L.w / maxW)).toFixed(2), on = S.link === L.k;
      html += '<g class="ir-lk lk-' + L.type + (on ? ' on' : '') + '" data-l="' + li + '" role="button" tabindex="0" aria-label="' + esc(T('{a} and {b}', { a: cName(L.a), b: cName(L.b) }) + ': ' + linkWhy(L, true)) + '">' +
        '<path class="lk-g" d="' + d + '" style="stroke-width:' + (+sw * 3.2).toFixed(1) + '"/><path class="lk-b" d="' + d + '" style="stroke-width:' + sw + '"/><path class="lk-f" d="' + d + '"/><path class="lk-h" d="' + d + '"/></g>';
      LDRAW.push({ L: L, pts: pts, mid: pts[Math.floor(pts.length / 2)] });
    });
    gLinks.innerHTML = html;
  }
  function linkHit(x, y) {
    var best = null, bd = 9;
    LDRAW.forEach(function (o) {
      for (var i = 1; i < o.pts.length; i++) {
        var p = o.pts[i - 1], q = o.pts[i], dx = q[0] - p[0], dy = q[1] - p[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (y - p[1]) * dy) / l2));
        var d = Math.hypot(x - (p[0] + t * dx), y - (p[1] + t * dy));
        if (d < bd) { bd = d; best = o; }
      }
    });
    return best ? { link: best.L, x: best.mid[0], y: best.mid[1] } : null;
  }
  function pickLink(k) {
    stopTour();
    S.link = S.link === k ? '' : k; S.with = '';
    if (S.link) { S.hot = ''; LT = 'items'; }
    say(''); render();
    var L = S.link ? linkByKey(S.link) : null;
    if (L) { var A = anchors(); fitTo([[A[L.a][0], A[L.a][1]], [A[L.b][0], A[L.b][1]]], 1, 8); say(T('{a} and {b}', { a: cName(L.a), b: cName(L.b) }) + ': ' + linkWhy(L) + '. ' + T('{n} items.', { n: N(shown.length) }), true); }
    else frameShown();
  }

  /* ------------------------------------------------------------ the address keeps the view, so a view can be sent and saved */
  function query() {
    var q = [];
    if (S.lens !== defLens) q.push('lens=' + S.lens);
    if (S.q) q.push('q=' + encodeURIComponent(S.q));
    if (S.tp.length) q.push('topic=' + S.tp.join('.'));
    if (S.nowhere) q.push('place=global'); else if (S.place) q.push('place=' + encodeURIComponent(S.place));
    if (S.kind) q.push('kind=' + S.kind);
    if (S.pf.length) q.push('pf=' + S.pf.map(encodeURIComponent).join('.'));
    if (S.heat && S.lens === 'live') q.push('heat=' + S.heat);
    if (S.within && S.lens === 'live') q.push('within=' + S.within);
    if (S.vmin) q.push('viral=' + S.vmin);
    if (S.crmin) q.push('cred=' + S.crmin);
    if (S.lmin) q.push('likes=' + S.lmin);
    if (S.fx.length) q.push('focus=' + S.fx.join('.'));
    if (S.hot && S.lens === 'live') q.push('hot=' + encodeURIComponent(S.hot));
    if (S.link) q.push('link=' + encodeURIComponent(S.link));
    if (S.with) q.push('with=' + encodeURIComponent(S.with));
    if (S.who) q.push('who=' + encodeURIComponent(S.who));
    Object.keys(S.ext).forEach(function (xk) { q.push(encodeURIComponent(xk) + '=' + encodeURIComponent(S.ext[xk])); });
    if (S.top) q.push('top=1');
    if (S.edu) q.push('edu=1');
    if (S.lens === 'bank' && S.days) q.push('days=' + S.days);
    else if (S.lens === 'bank' && !fullRange()) q.push('from=' + buckets[S.from] + '&to=' + buckets[S.to]);
    if (S.sort !== SORTS[S.lens][0][0]) q.push('sort=' + S.sort);
    return q.length ? '?' + q.join('&') : '';
  }
  function writeUrl() {
    if (!history.replaceState || SHOWING) return;          // the show screen (intel-prep.js) owns the address while it is up
    var h = location.hash === '#add' ? '' : location.hash;
    history.replaceState(null, '', location.pathname + query() + h);
  }
  var defLens = 'bank', SHOWING = /[?&](show|s|l)=/.test(location.search);          // ?s=: a saved show (intel-prep.js loadSaved); ?l=: a shared list
  function readUrl(search) {
    var u = new URLSearchParams(search);
    RAWQ = u;          // an add-on's filter reads its own key from here once it is loaded (it loads after this first read)
    S.ext = {};
    Object.keys(EXT).forEach(function (xk) { var xv = u.get(xk); if (xv && xcall(EXT[xk].valid, xv)) S.ext[xk] = xv; });
    useLens(u.get('lens') || defLens, true);
    S.q = (u.get('q') || '').slice(0, 120);
    S.tp = (u.get('topic') || '').split('.').filter(function (k, i, a) { return (k === 'rel' || TOPN[k]) && a.indexOf(k) === i; });
    var p = u.get('place') || '';
    S.place = ''; S.nowhere = false;
    if (p === 'global') S.nowhere = true; else if (p.indexOf('c:') === 0 || (p && p.split(',').every(function (k) { return P[k]; }))) S.place = p;
    S.kind = ['video', 'post', 'article', 'doc'].indexOf(u.get('kind')) >= 0 ? u.get('kind') : '';
    S.top = u.get('top') === '1'; S.edu = u.get('edu') === '1';
    S.pf = (u.get('pf') || '').split('.').filter(function (x) { return PFC[x]; });
    var pick = function (list, v) { v = +v || 0; return list.some(function (o) { return o[0] === v; }) ? v : 0; };
    S.heat = pick(HEATS, u.get('heat')); S.within = pick(WITHIN, u.get('within')); S.vmin = pick(VIRALS, u.get('viral')); S.crmin = pick(CREDS, u.get('cred'));
    S.lmin = pick(LIKES, u.get('likes'));
    S.fx = (u.get('focus') || '').split('.').filter(function (k, i, a) { return FXI[k] != null && a.indexOf(k) === i; });
    S.link = (u.get('link') || '').slice(0, 80); S.with = (u.get('with') || '').slice(0, 40);
    S.who = (u.get('who') || '').toLowerCase().slice(0, 80);
    var hv = u.get('hot') || '';
    S.hot = S.lens === 'live' && (hv === 'all' || hv === 'blind' || hotById(hv)) ? hv : '';
    if (SORTS[S.lens].some(function (s) { return s[0] === u.get('sort'); })) S.sort = u.get('sort');
    S.from = 0; S.to = buckets.length - 1; S.days = 0;
    var f = buckets.indexOf(u.get('from')), t = buckets.indexOf(u.get('to'));
    if (u.get('days') === '30' && S.lens === 'bank') { S.days = 30; S.from = daysFrom(30); }          // counted from the day the link is opened
    else if (f >= 0 && t >= 0) { S.from = Math.min(f, t); S.to = Math.max(f, t); }
    $('ir-from').value = S.from; $('ir-to').value = S.to;
    $('ir-q').value = S.q;
  }

  /* ------------------------------------------------------------ saved views: a reader's own dashboards, on this device */
  var VKEY = 'ir-views';
  function views() { var v = store(VKEY); return Array.isArray(v) ? v.filter(function (x) { return x && typeof x.n === 'string' && typeof x.q === 'string'; }).slice(0, 12) : []; }
  function drawViews(asking) {
    var el = $('ir-views'), v = views(), html = '';
    if (v.length) html += '<span class="ir-v-l">' + T('Your saved filters') + '</span>' + v.map(function (x, i) { return '<span class="ir-v"><button type="button" data-view="' + i + '">' + esc(x.n) + '</button><button type="button" class="ir-v-x" data-unview="' + i + '" aria-label="' + esc(T('Forget the view {name}', { name: x.n })) + '">&times;</button></span>'; }).join('');
    if (asking) html += '<form class="ir-v-f" id="ir-v-f"><label class="vh" for="ir-v-n">' + T('Name this filter') + '</label><input id="ir-v-n" maxlength="32" placeholder="' + T('Name it, e.g. Gaza videos this year') + '" required><button type="submit">' + T('Save') + '</button><button type="button" data-v-cancel>' + T('Cancel') + '</button></form>';
    el.innerHTML = html; el.hidden = !html;
    if (asking) setTimeout(function () { var i = $('ir-v-n'); if (i) i.focus(); }, 30);
  }
  function saveView(name) {
    var v = views().filter(function (x) { return x.n !== name; });
    v.unshift({ n: name.slice(0, 32), q: query() || '?lens=' + S.lens });
    store(VKEY, v.slice(0, 12));
    drawViews();
    VHOOK.forEach(function (f) { xcall(f); });
    say(T('Saved on this device as "{name}". Tap it any time to come back to exactly this.', { name: name }));
  }

  /* ------------------------------------------------------------ ask: plain words in, filters out, one sentence back */
  var PLACE_WORDS = [
    [/\b(north(ern)? gaza|jabalia|beit hanoun|beit lahia)\b/, 'north-gaza'], [/\bgaza city\b|\bshifa\b/, 'gaza-city'], [/\bkhan ?y[ou]+nis\b/, 'khan-younis'], [/\brafah\b/, 'rafah'],
    [/\bnova\b|\bre'?im\b|\bfestival\b/, 'nova'], [/\bkibbutz|be'?eri|kfar aza|nir oz|sderot|envelope\b/, 'oct7-envelope'],
    [/\bgaza(n|ns)?\b/, 'c:Gaza'], [/\bwest bank|judea|samaria\b/, 'c:West Bank'], [/\bjenin\b/, 'jenin'], [/\bramallah|palestinian authority|\bpa\b|abbas\b/, 'ramallah'],
    [/\bjerusalem\b/, 'jerusalem'], [/\btel aviv\b/, 'tel-aviv'], [/\bisrael(i|is)?\b/, 'c:Israel'],
    [/\blebanon|beirut|hezbollah\b/, 'c:Lebanon'], [/\bsyria|damascus\b/, 'c:Syria'], [/\bsweida|druze\b/, 'sweida'], [/\bdoha|qatar(i)?\b/, 'c:Qatar'], [/\biran(ian)?|tehran|irgc\b/, 'c:Iran'],
    [/\byemen|houthi/, 'c:Yemen'], [/\begypt|cairo\b/, 'c:Egypt'], [/\bjordan\b/, 'c:Jordan'], [/\bsaudi\b/, 'c:Saudi Arabia'], [/\bturkey|erdogan\b/, 'c:Turkey'],
    [/\b(uk|britain|british|england|london|bbc)\b/, 'c:United Kingdom'], [/\bireland|irish|dublin\b/, 'c:Ireland'], [/\bfrance|french|paris\b/, 'c:France'], [/\bgerman(y)?|berlin\b/, 'c:Germany'],
    [/\bhague|icj|icc\b/, 'the-hague'], [/\bgeneva|human rights council|\bwho\b/, 'geneva'], [/\bun headquarters|general assembly|security council\b/, 'un-ny'],
    [/\bcampus(es)?|universit(y|ies)|college|columbia|harvard\b/, 'us-campus'], [/\bnew york|nyc\b/, 'new-york'], [/\bwashington|congress|white house\b/, 'washington'],
    [/\b(us|usa|america(n)?|united states)\b/, 'c:United States'], [/\bcanada|toronto\b/, 'c:Canada'], [/\baustralia|sydney\b/, 'c:Australia'], [/\bsouth africa\b/, 'c:South Africa']];
  // The words that name a subject in a question ("AI", "war", "the economy"), for the ask box: [pattern, TOPICS key]
  var TOPIC_ASK = [[/\b(ai|artificial intelligence|chatgpt|openai|grok|deepfakes?)\b/, 'ai'], [/\b(tech|technology|cyber\w*|hack(ers|ing)?|internet|social media)\b/, 'tech'],
    [/\b(wars?|military|army|troops|missiles?|drones?|strikes?|bomb\w*|weapons?)\b/, 'war'], [/\b(terror\w*|jihad\w*|isis|hamas|hezbollah|houthis?|extremis\w*)\b/, 'terror'],
    [/\b(islam\w*|muslims?|mosques?|sharia|quran)\b/, 'islam'], [/\b(christian\w*|church\w*|pope|catholic\w*)\b/, 'christian'], [/\b(jews?|jewish|judaism|antisemit\w*|synagogues?)\b/, 'jewish'],
    [/\b(hindu\w*|sikh\w*|buddhis\w*|atheis\w*|secular\w*|apostat\w*|blasphem\w*)\b/, 'faith'], [/\b(histor\w*|ancient|empire)\b/, 'history'],
    [/\b(econom\w*|inflation|recession|jobs|wages|cost of living)\b/, 'economy'], [/\b(financ\w*|markets?|stocks?|crypto|bitcoin|banking)\b/, 'finance'], [/\b(trade|tariffs?|sanctions?|exports?|imports?)\b/, 'trade'],
    [/\b(oil|energy|gas prices|hormuz|opec)\b/, 'energy'], [/\b(nuclear|uranium|enrichment|iaea)\b/, 'nuclear'], [/\b(elections?|votes?|voting|polls?|politics|midterms?|campaign)\b/, 'politics'],
    [/\b(protests?|riots?|rall(y|ies)|unrest|uprising)\b/, 'protest'], [/\b(human rights|free speech|censorship|executions?|women'?s rights)\b/, 'rights'],
    [/\b(immigra\w*|migrants?|asylum|refugees?|deport\w*|borders?)\b/, 'immigration'], [/\b(crime|courts?|trials?|police|judges?|murders?)\b/, 'crime'],
    [/\b(diplomac\w*|peace talks|un|united nations|unrwa|icc|icj|ngos?)\b/, 'diplomacy'], [/\b(media|press|bbc|cnn|nyt|propaganda|fake news|bias|staged|pallywood|journalis\w*)\b/, 'media'],
    [/\b(campus\w*|universit(y|ies)|college|students?|schools?)\b/, 'education'], [/\b(health|hospitals?|famine|starv\w*|vaccin\w*|disease)\b/, 'health']];
  var PF_WORDS = [[/\b(?:on|from|in) x\b|\btwitter\b|\btweets?\b|\bx posts?\b|\bx only\b/, 'X'], [/\byoutube\b/, 'YouTube'], [/\btelegram\b/, 'Telegram'],
    [/\binstagram\b|\binsta\b/, 'Instagram'], [/\bfacebook\b/, 'Facebook'], [/\bthreads\b/, 'Threads'], [/\btiktok\b/, 'TikTok']];
  // Iran Uncensored hands its own places and subjects for the ask box (en and fa words), and a map that turns the Persian a
  // reader types ("ویدیوهای امروز") into the words below ("videos today"), so one reader serves both languages.
  if (Array.isArray(CFG.askPlaces)) PLACE_WORDS = CFG.askPlaces.map(function (a) { return [rxOf(a, 0), a[2]]; });
  if (Array.isArray(CFG.askTopics)) TOPIC_ASK = CFG.askTopics.map(function (a) { return [rxOf(a, 0), a[2]]; });
  var ASK_MAP = Array.isArray(CFG.askMap) ? CFG.askMap.map(function (a) { return [rxOf([a[0], 'g'], 0), ' ' + a[1] + ' ']; }) : [];
  var STOP_FA = CFG.askStop ? rxOf([CFG.askStop, 'g'], 0) : null;
  var STOP = /\b(happened|happen|happening|going|at|say|said|says|told|tell|show|me|give|find|get|all|any|the|a|an|of|about|on|for|in|from|with|that|which|what|is|are|was|were|i|want|need|please|some|can|you|to|and|or|by|it|this|these|those|evidence|proof|proves|prove|items?|things?|stuff|posts?|anything|everything|related|showing|where|who|how|did|do|does|uses?|using|used|has|have|had|they|their|them)\b/g;
  function askAny(text) { if (ASKX && xcall(ASKX, text) === true) return; ask(text); }          // the ask add-on first (ASKX), this reader if it is not there
  /* THE ASK BOX'S HANDS (24 Oct 2026, build/intel-ask.js). The add-on reads plain words into a whole set of filters and
     needs four things only the room has: a copy of the filters (snapS), the same filters with everything off (blankS: any
     key a later filter adds to S is cleared by its type, so a new filter never has to be taught to this), how many items a
     set would leave WITHOUT drawing it (peekS, so it can find the nearest set that leaves something), and putting a set on
     the screen (applyS). */
  function cpv(v) { return Array.isArray(v) ? v.slice() : v && typeof v === 'object' ? Object.assign({}, v) : v; }
  function snapS() { var o = {}; Object.keys(S).forEach(function (k) { o[k] = cpv(S[k]); }); return o; }
  function blankS(lens) {
    var o = {};
    Object.keys(S).forEach(function (k) { var v = S[k]; o[k] = Array.isArray(v) ? [] : v && typeof v === 'object' ? {} : typeof v === 'boolean' ? false : typeof v === 'number' ? 0 : ''; });
    o.lens = LENS[lens] && (lens !== 'live' || liveShown()) ? lens : S.lens; o.sort = SORTS[o.lens][0][0]; o.from = 0; o.to = buckets.length - 1;
    return o;
  }
  function peekS(ns, list) {
    var keep = snapS(), it0 = items, L0 = LSET, out = [];
    try {
      if (ns.lens && ns.lens !== S.lens && LENS[ns.lens]) items = setOf(ns.lens);
      Object.keys(ns).forEach(function (k) { S[k] = cpv(ns[k]); });
      LSET = null;
      for (var i = 0; i < items.length; i++) if (pass(items[i])) out.push(items[i]);
      if (list) sortList(out);
    } catch (e) { out = []; } finally { Object.keys(keep).forEach(function (k) { S[k] = keep[k]; }); items = it0; LSET = L0; }
    return list ? out : out.length;
  }
  function applyS(ns, box) {
    stopTour();
    if (ns.lens && ns.lens !== S.lens) useLens(ns.lens, true);
    Object.keys(ns).forEach(function (k) { if (k !== 'lens' && k in S) S[k] = cpv(ns[k]); });
    if (!SORTS[S.lens].some(function (s) { return s[0] === S.sort; })) S.sort = SORTS[S.lens][0][0];
    $('ir-from').value = S.from; $('ir-to').value = S.to; $('ir-sort').value = S.sort;
    if (box != null) $('ir-q').value = box;
    say(''); render();
    if (S.place && shown.length) focusPlace(S.place); else frameShown();
    $('ir-items').scrollTop = 0;
    return shown.length;
  }
  function goQ(qs) { stopTour(); readUrl(qs); say(''); render(); if (S.place) focusPlace(S.place); else frameShown(); }
  // the accounts and outlets in a lens, most items first: [key, name, count] (the ask box's "who" and "who posted most")
  function accountsOf(lens) {
    var c = {}, nm = {};
    setOf(lens || S.lens).forEach(function (it) { if (!own(it)) return; var k = whoKey(it); if (!k) return; c[k] = (c[k] || 0) + 1; if (!nm[k]) nm[k] = whoName(it); });
    return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).map(function (k) { return [k, nm[k], c[k]]; });
  }
  function askVocab() {
    var so = {}; Object.keys(SORTS).forEach(function (l) { so[l] = SORTS[l].map(function (s) { return s[0]; }); });
    return { lens: S.lens, live: liveShown(), sorts: so, topics: TOPICS.map(function (t) { return [t[0], t[1]]; }), topicAsk: TOPIC_ASK, rel: REL_KEYS.length > 0,
      places: PLACE_WORDS, place: function (k) { return k.indexOf('c:') === 0 || !!P[k]; }, focus: FOCUS.map(function (f) { return [f[0], f[1], f[2], f[3]]; }),
      pf: PF_WORDS, pfs: PF.map(function (p) { return [p[0], p[1]]; }), kinds: KINDS.slice(), within: WITHIN, heats: HEATS, likes: LIKES, virals: VIRALS, creds: CREDS,
      buckets: buckets.slice(), mon: MON, daysFrom: daysFrom, bLabel: bLabel, map: ASK_MAP, stopFa: STOP_FA, ext: EXT, hasEdu: BANK.some(function (it) { return it.edu; }),
      hots: HOTS.map(function (h) { return { id: h.id, name: h.name, hot: h.hot, n: h.all.length, why: h.its[0] && h.its[0].hotWhy || '' }; }), top: hotTop().map(function (h) { return h.id; }),
      accounts: accountsOf, name: { topic: topicName, place: placeName, country: cName, pf: pfName, focus: function (k) { return FXI[k] != null ? FOCUS[FXI[k]][1] : k; }, fmt: fmtN } };
  }
  function ask(text) {
    var raw = String(text || '').trim().slice(0, 200);
    if (!raw) { clearAll(); return; }
    stopTour();
    var t = ' ' + raw.toLowerCase().replace(/[“”"’]/g, "'") + ' ', said = [];
    if (ASK_MAP.length) { t = t.replace(/\u200c/g, '').replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); }); ASK_MAP.forEach(function (a) { t = t.replace(a[0], a[1]); }); }
    var ns = { q: '', tp: [], place: '', kind: '', pf: [], sort: SORTS[S.lens][0][0], from: 0, to: buckets.length - 1, days: 0 };
    var eat = function (rx) { t = t.replace(rx, ' '); };
    // "today", "breaking", "right now": the last 24 hours, when there is a feed
    if (/\b(today|breaking|right now|last 24|past 24|24 hours|this morning|tonight|live)\b/.test(t) && liveShown()) { if (S.lens !== 'live') useLens('live', true); ns.sort = 'hot'; eat(/\b(today|breaking|right now|last 24 hours|past 24 hours|24 hours|this morning|tonight|live|news)\b/g); said.push(T('in the last 24 hours')); }
    // time (the bank's timeline)
    var n = buckets.length - 1, m;
    if (S.lens === 'bank') {
      if (/since (the )?(october 7|oct\.? 7|7 oct(ober)?|the massacre|the war)/.test(t)) { ns.from = 1; eat(/since (the )?(october 7(th)?|oct\.? 7|7 oct(ober)?|the massacre|the war)/); said.push(T('since 7 October')); }
      else if (/this month/.test(t)) { ns.from = n; eat(/this month/); said.push(T('from this month')); }
      else if (/(past|last) (30 days|month)|recent(ly)?|latest|newest/.test(t)) { ns.from = daysFrom(30); ns.days = 30; eat(/(past|last) (30 days|month)|recent(ly)?|latest|newest/); said.push(T('from the past month')); }
      else if (/(past|last) (12 months|year)|this year/.test(t)) { ns.from = Math.max(1, n - 11); eat(/(past|last) (12 months|year)|this year/); said.push(T('from the past year')); }
      else if ((m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (20\d\d)\b/.exec(t))) {
        var k = m[2] + '-' + ('0' + (MON.map(function (x) { return x.toLowerCase(); }).indexOf(m[1]) + 1)).slice(-2), bi = buckets.indexOf(k);
        if (bi > 0) { ns.from = ns.to = bi; said.push(T('from {when}', { when: bLabel(bi) })); } eat(m[0]);
      } else if ((m = /\b(?:since|after) (20\d\d)\b/.exec(t))) {
        var a = buckets.indexOf(m[1] + '-01'); ns.from = a > 0 ? a : 1; eat(m[0]); said.push(T('since {when}', { when: N(m[1]) }));
      } else if ((m = /\b(?:in |during )?(20\d\d)\b/.exec(t))) {
        var y = m[1], f = -1, l = -1;
        buckets.forEach(function (b, i) { if (b.slice(0, 4) === y) { if (f < 0) f = i; l = i; } });
        if (+y < 2023) { f = l = 0; }
        if (f >= 0) { ns.from = f; ns.to = l; said.push(+y < 2023 ? T('from before October 2023') : T('from {when}', { when: N(y) })); }
        eat(m[0]);
      }
    }
    // where it was posted: "on X", "YouTube only", "Telegram and Instagram"
    PF_WORDS.forEach(function (pw) { if (pw[0].test(t)) { if (ns.pf.indexOf(pw[1]) < 0) ns.pf.push(pw[1]); eat(new RegExp(pw[0].source, 'g')); } });
    if (ns.pf.length) eat(/\b(only|just)\b/g);
    // the new orders: liked, viewed, viral
    var want = /\b(most liked|liked|likes)\b/.test(t) ? 'likes' : /\b(most viewed|most watched|views)\b/.test(t) ? 'views' : /\b(viral|reach|spread)\b/.test(t) ? 'viral' : '';
    if (want) { eat(/\b(most liked|liked|likes|most viewed|most watched|views|viral|reach|spread|most)\b/g); }
    // kind and quality
    if (/\b(videos?|clips?|footage|watch|interviews?)\b/.test(t)) { ns.kind = 'video'; eat(/\b(videos?|clips?|footage|watch|interviews?)\b/g); }
    else if (/\barticles?|reports?|stor(y|ies)\b/.test(t)) { ns.kind = 'article'; eat(/\barticles?|reports?|stor(y|ies)\b/g); }
    else if (/\bdocuments?|pdfs?|papers?\b/.test(t)) { ns.kind = 'doc'; eat(/\bdocuments?|pdfs?|papers?\b/g); }
    if (/\b(best|strongest|top|indisputable|killer|most convincing|undeniable|hardest hitting|hottest|biggest)\b/.test(t)) { ns.sort = S.lens === 'live' ? 'hot' : S.lens === 'bank' ? 'top' : ns.sort; eat(/\b(best|strongest|top|indisputable|killer|most convincing|undeniable|hardest hitting|hottest|biggest)\b/g); }
    // places
    for (var i = 0; i < PLACE_WORDS.length; i++) {
      if (PLACE_WORDS[i][0].test(t)) {
        var v = PLACE_WORDS[i][1];
        if (v.indexOf('c:') === 0 || P[v]) { ns.place = v; }
        break;
      }
    }
    // topics: the word stays in the search too when it is a thing (hospital), not a topic name
    // subjects: a topic's name said outright ("AI", "religion", "war") or its words; two at most
    if (/\breligio(n|ns|us)\b|\bfaiths?\b/.test(t)) ns.tp.push('rel');
    TOPIC_ASK.forEach(function (ta) { if (ns.tp.length < 2 && ns.tp.indexOf(ta[1]) < 0 && ta[0].test(t)) ns.tp.push(ta[1]); });
    if (ns.place === 'us-campus') ns.tp = ns.tp.filter(function (k) { return k !== 'education'; });
    PLACE_WORDS.forEach(function (pw) { if (pw[1] === ns.place) eat(new RegExp(pw[0].source, pw[0].ignoreCase ? 'gi' : 'g')); });
    TOPIC_ASK.forEach(function (ta) { if (ns.tp.indexOf(ta[1]) >= 0) eat(new RegExp(ta[0].source, ta[0].ignoreCase ? 'gi' : 'g')); });
    if (ns.tp.indexOf('rel') >= 0) eat(/\breligio(n|ns|us)\b|\bfaiths?\b/g);
    if (STOP_FA) t = t.replace(STOP_FA, ' ');
    var rest = t.replace(STOP, ' ').replace(/[^a-z0-9֐-ۿ' -]/g, ' ').replace(/\s+/g, ' ').trim();
    var steer = /^(there|here|no|not|isnt|wasnt|arent|any|very|really|just|lies|lie|lying|liar|liars|myth|myths|debunked|debunk|best|top|strongest|hamas|genocide|genocidal|famine|starvation|starving|media|un|ngos?|propaganda|pallywood|staged|fake|data|stats|statistics|numbers|history|historical|campus|campuses|journalists?|gaza|gazans?|israel|israeli|israelis|iran|iranian|qatar|qatari|lebanon|syria|uk|us|usa|america|american|britain|british|jihad|islamist|radical|islam|claim|claims|terror|terrorists?|news|hot)$/;
    ns.q = rest.split(' ').filter(function (w) { return w.length > 2 && !steer.test(w); }).slice(0, 4).join(' ');
    if (want) ns.sort = want;
    S.q = ns.q; S.tp = ns.tp; S.place = ns.place; S.kind = ns.kind; S.pf = ns.pf; S.heat = 0; S.vmin = 0; S.within = 0; S.crmin = 0; S.top = false; S.nowhere = false; S.sort = ns.sort; S.from = ns.from; S.to = ns.to; S.days = ns.days;
    if (!SORTS[S.lens].some(function (s) { return s[0] === S.sort; })) S.sort = SORTS[S.lens][0][0];
    $('ir-from').value = S.from; $('ir-to').value = S.to;
    render();
    // Nothing found: widen one step at a time, and say what was let go, so a reader is never left at an empty list.
    var count = function () { return items.filter(function (it) { return pass(it); }).length; }, let_go = [];
    if (!count() && S.q) {
      var ws = S.q.split(' '), best = '', bn = 0, all = S.q;
      ws.forEach(function (w) { S.q = w; var c = count(); if (c > bn) { bn = c; best = w; } });
      S.q = best;
      let_go.push(T('"{q}"', { q: best ? all.replace(best, '').trim() : all }));
    }
    if (S.q && S.tp.length) { var withT = count(), keep = S.tp; S.tp = []; if (count() <= withT * 2) S.tp = keep; }
    if (!count() && S.pf.length) { let_go.push(T('{pf} only', { pf: S.pf.map(pfName).join(T(' and ')) })); S.pf = []; }
    if (!count() && S.kind) { let_go.push({ video: T('videos only'), article: T('articles only'), doc: T('documents only'), post: T('posts only') }[S.kind]); S.kind = ''; }
    if (!count() && S.tp.length > 1) S.tp = S.tp.slice(0, 1);
    if (!count() && S.lens === 'bank' && !fullRange()) { let_go.push(T('the time')); said = []; S.from = 0; S.to = buckets.length - 1; S.days = 0; $('ir-from').value = 0; $('ir-to').value = S.to; }
    if (!count() && S.tp.length) { let_go.push(T('the topic')); S.tp = []; }
    render();
    var noun = S.lens === 'live' ? (shown.length === 1 ? T('story') : T('stories')) : (shown.length === 1 ? T('item') : T('items'));
    var one = shown.length === 1, kindW = (one ? { video: T('video'), article: T('article'), doc: T('document'), post: T('post') } : { video: T('videos'), article: T('articles'), doc: T('documents'), post: T('posts') })[S.kind] || noun;
    var parts = [N(shown.length) + ' ' + kindW];
    if (S.tp.length) parts.push(T('on {topics}', { topics: S.tp.map(function (k) { var w = topicName(k); return /^(AI|Islam|Christianity|Judaism|Health|History)\b/.test(w) || CFG.topics ? w : w.charAt(0).toLowerCase() + w.slice(1); }).join(T(' or ')) }));
    if (S.q) parts.push(T('that mention "{q}"', { q: S.q }));
    if (S.pf.length) parts.push(T('on {pf}', { pf: S.pf.map(pfName).join(T(' or ')) }));
    if (S.place) parts.push(T('in {place}', { place: S.place.indexOf('c:') === 0 ? cName(S.place.slice(2)) : placeName(S.place) }));
    parts = parts.concat(said);
    var line = parts.join(' ') + '.';
    if (S.sort === 'top') line += T(' Top picks first.');
    if (S.sort === 'hot') line += T(' Hottest first.');
    if (S.sort === 'viral') line += T(' Most viral first.');
    if (S.sort === 'likes') line += T(' Most liked first.');
    if (S.sort === 'views') line += T(' Most viewed first.');
    if (let_go.length) line = T('Nothing matched all of it, so I let go of {what}. ', { what: let_go.join(T(' and ')) }) + line;
    if (!shown.length || (let_go.length && shown.length === nOwn())) line = T('Nothing here matches that yet. Try a place, a topic or a year, like: videos from Gaza in 2024. Or add what is missing.');
    say(line, true);
    if (S.place && shown.length) focusPlace(S.place);
    $('ir-items').scrollTop = 0;
  }
  // Frame what is shown: the smallest view that holds every place, with room round it, never closer than a region.
  function frameShown() {
    var keys = [];
    shown.forEach(function (it) { keys = keys.concat(keysOf(it)); });
    var pts = placePts(keys);
    // Iran Uncensored: the view stays on Iran and its neighbours whenever what is shown has a place there (a story in
    // Washington or London gets its arrow on the rim); only a view with nothing near Iran flies away from it.
    if (HOME && G) {
      var c = CFG.homeC || HOME[0], near = pts.filter(function (p) { return G.geoDistance(p, c) < 0.45; });
      if (near.length || !pts.length) { fitTo(near.concat(HOME), 1, 40); return; }
    }
    fitTo(pts, 1, 4);
  }
  function focusPlace(v) {
    var ks = v.indexOf('c:') === 0 ? Object.keys(P).filter(function (k) { return P[k][1] === v.slice(2) && P[k][2] != null; }) : v.split(',');
    var pts = placePts(ks);
    // a whole country: frame the country itself (its outline's corners), not only the places in it
    if (v.indexOf('c:') === 0 && G) {
      var cn = TOPO[v.slice(2)] || v.slice(2);
      (BYNAME[cn] || []).forEach(function (f) { var b = G.geoBounds(f); if (b[1][0] - b[0][0] < 90) pts.push(b[0], b[1], [b[0][0], b[1][1]], [b[1][0], b[0][1]]); });
    }
    if (pts.length) fitTo(pts, 2, 40);
  }

  /* ------------------------------------------------------------ the spotlight */
  function openSpot(i) {
    var SL = spotList(), it = SL[i]; if (!it) return;
    spotAt = i;
    var y = ytId(it.u), dlg = $('ir-spot');
    var srcName = it.src === 'Document' ? T('the document') : it.src === 'News' ? (it.h || T('the news site')) : T(it.src);
    var rg = isRegime(it), lit = pics() || it._pics;          // regime media: never a link; a Persian page: pictures only once tapped
    var chips = '<span class="pfc" style="--pc:' + pfColor(pfOf(it)) + '">' + mark(it, 'ir-mk') + esc(T('{kind} on {pf}', { kind: it.k === 'image' ? T('Picture') : KIND_N[kindOf(it)], pf: pfName(pfOf(it)) })) + '</span>' +
      (it.hot != null ? '<span class="hotc">' + flame() + T('Hot {n}', { n: N(it.hot) }) + '</span>' : '') + (crOf(it) != null ? '<span title="' + T('How credible the source is, from the room\'s own table') + '">' + T('Source credibility {n}', { n: N(crOf(it)) }) + '</span>' : '') + (it._v != null ? '<span class="virc">' + ICO.viral + T('Viral {n}', { n: N(it._v) }) + '</span>' : '') + (it.q ? '<span class="q">&#9733; ' + T('Top pick') + '</span>' : '') + (it.g ? '<span class="gr">' + T('Graphic footage') + '</span>' : '') +
      (it.edu ? '<span class="ed">' + T('Explainer') + '</span>' : '') + (it.own ? '<span class="own">' + T('Creator\'s own') + '</span>' : '') + (it.pend ? '<span class="pend">' + T('Being checked') + '</span>' : '') + (rg ? '<span class="rgc">' + T('Regime media') + '</span>' : '') +
      tkOf(it).map(function (k) { return '<span class="tpc">' + esc(TOPN[k][1]) + '</span>'; }).join('') +
      // a bank tag whose name is already a topic chip is not drawn twice ("History History")
      (S.lens === 'bank' ? (it.tp || []).filter(function (t) { var nm = String(topics[t] || '').toLowerCase(), tn = String(T(topics[t] || '')).toLowerCase(); return nm && !tkOf(it).some(function (k) { var w = String(TOPN[k][1]).toLowerCase(); return w === nm || w === tn; }); })
        .map(function (t) { return '<span class="bt" title="' + T('Tagged in the bank') + '">' + esc(T(topics[t])) + '</span>'; }).join('') : '');
    var when = it.d ? (it.da ? T('about {t}', { t: fmtDate(it.d) }) : fmtDate(it.d)) + (it.ds === 'said' ? T(' (the date it shows)') : '') : it.pend ? T('Sent {t}', { t: ago(it.ms) }) : T('No date on it');
    // an item with no place at all (one an add-on brought, a ship's X post) says none, rather than "No single place"
    var where = it.p ? [it.p === 'global' && it.pw ? it.pw : placeName(it.p)].concat((it.a || []).map(placeName)).join(T(', ')) : '';
    var by = it.by ? ' · ' + T('sent by {who}', { who: esc(it.by) }) : '';
    // who said it, over the headline: the face, name and handle, and every other post of theirs here in one tap. A post of
    // words only already opens on the author inside the post itself (heroHtml), so its byline is not drawn twice.
    var wk = whoKey(it), wn = wk ? items.filter(function (x) { return own(x) && whoKey(x) === wk; }).length : 0;          // what the tap shows: found items stay in their story
    var byl = xWords(it) && lit ? '' : byline(it, true), more = wn > 1 && S.who !== wk ? '<button type="button" class="ir-s-more" data-who="' + esc(wk) + '">' + esc(T('All {n} from {who}', { n: N(wn), who: whoName(it) })) + '</button>' : '';
    var rf = xWords(it) && !mediaOf(it).length ? { before: '', after: '' } : refHtml(it);          // THE POST IT ANSWERS
    var meta = '<p class="ir-s-m"><b>' + esc(when) + '</b>' + (where ? ' · ' + esc(where) : '') + (whoName(it) ? '' : ' · ' + bd(esc(it.h || it.src))) + by + '</p>';
    var stage = y ? (lit ? '<div class="ir-s-v" style="background-image:url(https://i.ytimg.com/vi/' + y + '/hqdefault.jpg)">' : '<div class="ir-s-v is-dark">') + '<button type="button" data-play="' + y + '" aria-label="' + T('Play it here') + '"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button></div>'
      : mediaOf(it).length ? (lit ? mediaHtml(it) : '<button type="button" class="ir-s-b ir-pics1" data-pics1>' + T('Show the pictures and video ({n})', { n: N(mediaOf(it).length) }) + '</button>') : heroHtml(it);
    dlg.innerHTML = '<div class="ir-s-in">' +
      '<div class="ir-s-top">' + (SPOTL && SPOTL.back ? '<button type="button" class="ir-s-bk" data-back><span aria-hidden="true">&lsaquo;</span> ' + esc(T('Back to {what}', { what: SPOTL.label })) + '</button>' : '') +
      '<span>' + esc((SPOTL ? (SPOTL.back ? '' : SPOTL.label + ' · ') : LENS[S.lens] + ' · ') + T('{i} of {n}', { i: N(i + 1), n: N(SL.length) })) + '</span><button class="ir-s-x" type="button" data-x aria-label="' + T('Close') + '">&times;</button></div>' +
      (byl ? '<div class="ir-s-who">' + byl + more + '</div>' : '') + rf.before +
      // an X post's WHOLE text, never its 160-character title (18 Oct 2026: "if i can't read the full thing, it is useless")
      '<h2 id="ir-spot-t"' + DA + (xWords(it) && lit ? ' class="vh"' : fullText(it).length > 140 ? ' class="is-long"' : '') + '>' + esc(fullText(it)) + '</h2>' +
      (!byl && more ? '<div class="ir-s-who">' + meta + more + '</div>' : meta) +
      // the thing itself straight under its headline (17 Oct 2026): the video or the pictures, then what is said about it
      stage + rf.after +
      (chips ? '<div class="ir-s-c">' + chips + '</div>' : '') +
      spotReach(it) + (rpKey(it) && RP_ON ? '<section class="ir-s-rp" id="ir-s-rp" aria-label="' + T('Most-liked replies') + '"></section>' : '') +
      (it.hotWhy ? '<p class="ir-s-o">' + T('Why it is hot: ') + esc(it.hotWhy) + (it.also && it.also.length && !it.ls ? T('. Also carried by ') + bd(esc(it.also.join(T(', ')))) : '') + '.</p>' : '') +
      spotSpread(it) +
      (it.n ? '<p class="ir-s-n">' + esc(it.n) + '</p>' : '') + spotLinks(it) +
      (it.o ? '<p class="ir-s-o">' + T('In the bank: ') + esc(it.o) + '</p>' : '') +
      (it.pend ? '<p class="ir-s-o">' + T('A reader sent this in. It is not checked yet, so it is not on the map: open it with that in mind.') + '</p>' : '') +
      (rg ? '<p class="ir-s-o ir-s-rgn"><b>' + T('Regime media') + '</b> ' + T("Not linked: opening it would show the regime's servers who you are. You can copy its words.") + '</p>' : '') +
      '<div class="ir-s-a">' + (rg ? '<button class="ir-s-open" type="button" data-copyt>' + T('Copy the headline') + '</button>' : '<a class="ir-s-open" href="' + esc(it.u) + '" target="_blank" rel="' + (CFG.noref ? 'noopener noreferrer' : 'noopener') + '">' + T('Open on {src}', { src: esc(srcName) }) + '</a>') +
      SPOTA.map(function (f) { return xcall(f, it) || ''; }).join('') +
      (it.p && it.p !== 'global' && P[it.p] ? '<button class="ir-s-b" type="button" data-map>' + T('Show on the map') + '</button>' : '') +
      '<div class="ir-s-nav"><button type="button" data-step="-1" aria-label="' + T('Previous') + '"' + (i ? '' : ' disabled') + '>' + (CFG.rtl ? '&rarr;' : '&larr;') + '</button><button type="button" data-step="1" aria-label="' + T('Next') + '"' + (i < SL.length - 1 ? '' : ' disabled') + '>' + (CFG.rtl ? '&larr;' : '&rarr;') + '</button></div></div>' +
      '<p class="ir-s-f">' + T('Weak, wrong, or missing context? <a {attrs}>Say why in the discussion</a>. That is how the room gets better.', { attrs: 'href="#feedback" data-kind="wrong" data-about="' + esc((T('Intel Room: ') + it.t).slice(0, 78)) + '" data-id="intel-' + esc(String(it.id)) + '" data-on="' + (CFG.talkOn || 'page:intel') + '" data-close-spot' }) + '</p>' +
      '</div>';
    var sxa = dlg.querySelector('.ir-s-sp'), sxw = sxa ? 'afterend' : 'beforebegin';          // an add-on's blocks (SPOTX): under "Who covered it", else above the buttons
    if (!sxa) sxa = dlg.querySelector('.ir-s-a');
    var sxh = SPOTX.map(function (f) { return xcall(f, it) || ''; }).join('');
    if (sxh && sxa) sxa.insertAdjacentHTML(sxw, sxh);
    wireMedia(dlg.querySelector('.ir-xm'), it);
    fitVideo(dlg.querySelector('.ir-s-v'), y, it.u);
    if (rpKey(it) && RP_ON) repliesOf(it, function (e, st) {
      var box = $('ir-s-rp'); if (!box || spotAt !== i) return;
      box.innerHTML = repliesHead(it, e) + (e && e.r.length ? repliesHtml(it, e.r.slice(0, 3), false) + (e.r.length > 3 ? '<button type="button" class="ir-s-b ir-rp-all" data-rp-all>' + T('Show all {n}', { n: N(e.r.length) }) + '</button>' : '') : repliesNone(it, st));
    });
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    [].forEach.call($('ir-items').querySelectorAll('.ir-card'), function (li) { li.classList.toggle('on', !SPOTL && li.firstChild && +li.firstChild.getAttribute('data-i') === i); });
  }
  function spotLinks(it) {
    if (S.lens === 'readers' || !countryOf(it)) return '';
    var base = items.filter(function (x) { return pass(x, 'link'); }), r = linksOf(it, base);
    if (!r.n) return '';
    var why = [], h = STORY_OF[it.id], ac = actorsOf(it).map(function (a) { return ACN[a]; }), nm = namesOf(it);
    if (h) why.push(T('the same story'));
    if (ac.length) why.push(ac.slice(0, 3).join(T(', ')));
    if (nm.length) why.push(nm.slice(0, 3).map(cName).join(T(', ')));
    return '<div class="ir-s-lk">' + ICO.link + '<span><b>' + T(r.n === 1 ? 'Connected to 1 item in other places' : 'Connected to {n} items in other places', { n: N(r.n) }) + '</b><small>' + T('Through {why}', { why: esc(why.join(T('; '))) }) + '</small></span>' +
      '<button type="button" class="ir-s-b" data-with="' + esc(String(it.id)) + '">' + T('Show the connections') + '</button></div>';
  }
  function spotReach(it) {
    var r = reachOf(it), p = pfOf(it), nm = pfName(p), bits = [];
    if (r && r.x) return '<p class="ir-s-r">' + esc(T('{pf} no longer shows this one\'s counts: it was deleted, made private or put behind a login.', { pf: nm })) + '</p>';
    if (!r) return HIDES[p] ? '<p class="ir-s-r ir-s-rx">' + esc(T('{pf} does not show its like counts without a login, so none is shown here.', { pf: nm })) + '</p>' : '';
    if (r.lk != null) bits.push('<span>' + ICO.like + '<b class="num">' + LN(r.lk) + '</b> ' + T('likes') + '</span>');
    if (r.vw != null) bits.push('<span>' + ICO.view + '<b class="num">' + (r['~'] ? T('about ') : '') + LN(r.vw) + '</b> ' + T('views') + '</span>');
    if (r.rp != null) bits.push('<span>' + ICO.reply + '<b class="num">' + LN(r.rp) + '</b> ' + T('replies') + '</span>');
    if (r.rs != null) bits.push('<span>' + ICO.repost + '<b class="num">' + LN(r.rs) + '</b> ' + T('reposts') + '</span>');
    if (!bits.length) return '';
    var when = r.at ? (Date.parse(r.at) ? T(' Counted {t}.', { t: ago(Date.parse(r.at)) }) : '') : '';
    return '<p class="ir-s-r">' + bits.join('') + '<small>' + esc(T('On {pf}, as {pf} shows them.', { pf: nm })) + when + (it._v != null ? ' ' + esc(viralWhy(it)) + '.' : '') + '</small></p>';
  }
  /* ------------------------------------------------------------ the most-liked replies (18 October 2026)
     Armin: "for every posts you have to have the options to check the comments with the highest likes. so we can read and
     talk about people's comments on each post." build/intel_replies.py reads them (X through the X hunt's own account and
     cap, YouTube free) into assets/intel-replies.json, which is fetched the first time a reply panel opens, never on load.
     Keys: "x:<status id>", "yt:<video id>". The show screen (intel-prep.js) draws the same rows through R.repliesHtml. */
  var RP_ON = CFG.replies !== false;          // Iran Uncensored reads no replies: the panel is not drawn at all
  var RP = null, rpWait = null, YT_AV = /^https:\/\/yt3\.(?:ggpht|googleusercontent)\.com\/[A-Za-z0-9_\-=\/.~]+$/;
  function rpKey(it) {
    var m = /^https:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status\/(\d{5,25})/.exec(it && it.u || '');
    if (m) return 'x:' + m[1];
    var y = it && it.u ? ytId(it.u) : '';
    return y ? 'yt:' + y : '';
  }
  /* cb(entry or null, 'ok' | 'asking' | 'fail' | 'unread' | 'off'), called again when the state changes. READ ON OPEN
     (24 October 2026; Armin found "The top replies are not read for this one yet" on a story he was showing: the hourly
     read reaches about a quarter of the room). When the file has no read of the post and intel-prep.js has handed over
     its asker (a creator is signed in), the post is read now: 'asking' until the answer comes back, then 'ok' or 'fail'
     (build/intel_replies.py --asks, every minute on his PC). unread = nobody asked (a reader); off = no file. */
  var RP_ASK = null, RP_PEND = [];
  function rpAskFor(k, cb) {
    RP_ASK(k, function (e, st) {
      if (st === 'done' && e && Array.isArray(e.r)) { if (RP) RP[k] = e; cb(e, 'ok'); }
      else cb(null, st === 'asking' ? 'asking' : st === 'unread' ? 'unread' : 'fail');
    });
  }
  function rpAsk(fn) {
    RP_ASK = typeof fn === 'function' ? fn : null;
    if (!RP_ASK) return;
    var p = RP_PEND; RP_PEND = [];
    p.forEach(function (x) { rpAskFor(x[0], x[1]); });
  }
  function repliesOf(it, cb) {
    var k = rpKey(it);
    if (!k) { cb(null, 'none'); return; }
    if (!rpWait) rpWait = fetch(root.getAttribute('data-replies') || '../assets/intel-replies.json').then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; }).then(function (d) { RP = d && d.posts && typeof d.posts === 'object' ? d.posts : null; return RP; });
    rpWait.then(function () {
      var e = RP && RP[k];
      if (e && Array.isArray(e.r)) { cb(e, 'ok'); return; }
      if (RP_ASK) { rpAskFor(k, cb); return; }
      cb(null, RP ? 'unread' : 'off');
      RP_PEND.push([k, cb]); if (RP_PEND.length > 80) RP_PEND.shift();      // asked the moment a creator's sign-in is known
    });
  }
  function rpWhere(it) { return rpKey(it).slice(0, 2) === 'yt' ? 'YouTube' : 'X'; }
  function rpFace(k, r) {
    if (!pics()) return '';
    var a = String(r.av || '');
    if (k === 'x' && /^https:\/\/pbs\.twimg\.com\/profile_images\/\d+\/[A-Za-z0-9_-]+_normal\.(?:jpg|jpeg|png|webp)$/.test(a)) return a.replace(/_normal\.(\w+)$/, '_200x200.$1');
    if (k === 'yt' && YT_AV.test(a)) return a.replace(/=s\d+-/, '=s176-');
    return '';
  }
  function repliesHead(it, e) {
    var n = e && e.r ? e.r.length : 0;
    return '<p class="ir-rp-hd">' + ICO.reply + '<b>' + (n ? T('Top {n} ', { n: N(n) }) : '') + (rpWhere(it) === 'X' ? T('replies') : T('comments')) + '</b><span>' + T('most liked first, on {pf}', { pf: pfName(rpWhere(it)) }) + (e && e.at && Date.parse(e.at) ? T(', read {t}', { t: ago(Date.parse(e.at)) }) : '') + '</span></p>';
  }
  function repliesNone(it, st) {
    var on = rpWhere(it), x = on === 'X';
    // Never "not read yet" (READ ON OPEN): a creator sees the read under way, a reader only the way to the replies
    var say = st === 'ok' ? T('Nobody had replied when it was read.') : st === 'off' ? T(x ? 'The replies could not be loaded here.' : 'The comments could not be loaded here.')
      : st === 'asking' ? T(x ? 'Reading the top replies now. They appear here in about a minute.' : 'Reading the top comments now. They appear here in about a minute.')
      : st === 'fail' ? T(x ? 'The top replies could not be read right now.' : 'The top comments could not be read right now.') : '';
    // a regime post is never a link (THE REGIME RULE), so neither is the way to its replies
    return '<p class="ir-rp-no"' + (st === 'asking' ? ' data-rp-asking' : '') + '>' + (say ? say + ' ' : '') +
      (isRegime(it) ? '' : '<a href="' + esc(it.u) + '" target="_blank" rel="' + (CFG.noref ? 'noopener noreferrer' : 'noopener') + '">' + T(x ? 'Read the replies on {pf}' : 'Read the comments on {pf}', { pf: pfName(on) }) + '</a>') + '</p>';
  }
  // the rows: a button each on the show screen (so one can be put on the screen alone), a link to the reply in the room;
  // under a regime post, plain rows (THE REGIME RULE: nothing under it links to it)
  function repliesHtml(it, list, asButtons) {
    var k = rpKey(it).slice(0, 2) === 'yt' ? 'yt' : 'x', rg = isRegime(it);
    return '<ol class="ir-rp-l">' + list.map(function (r, n) {
      var face = rpFace(k, r), nm = String(r.nm || ''), h = r.h && r.h !== nm ? r.h : '';
      var inner = (face ? '<span class="ir-rp-av" style="background-image:' + esc(cssUrl(face)) + '"></span>' : '<span class="ir-rp-av is-mono">' + esc(nm.replace(/^@/, '').slice(0, 1).toUpperCase() || '?') + '</span>') +
        '<span class="ir-rp-b"><span class="ir-rp-who"><b' + DA + '>' + bd(esc(nm)) + '</b>' + (h ? '<small>' + handle(h) + '</small>' : '') + (Date.parse(r.d) ? '<small>' + esc(ago(Date.parse(r.d))) + '</small>' : '') +
        '<span class="ir-rp-lk" title="' + T('Likes') + '">' + ICO.like + '<b class="num">' + fmtN(r.lk || 0) + '</b></span></span><span class="ir-rp-t">' + esc(r.t) + '</span></span>';
      return '<li>' + (asButtons ? '<button type="button" class="ir-rp" data-rp="' + n + '" aria-label="' + T('Put this reply on the screen') + '">' + inner + '</button>'
        : rg ? '<div class="ir-rp">' + inner + '</div>'
        : '<a class="ir-rp" href="' + esc(r.u) + '" target="_blank" rel="' + (CFG.noref ? 'noopener noreferrer' : 'noopener') + '">' + inner + '</a>') + '</li>';
    }).join('') + '</ol>';
  }
  function fullText(it) { return it && it.src === 'X' && it.tx && it.tx.length > String(it.t || '').length ? it.tx : String(it && it.t || ''); }
  // Pictures on or off for this device (Iran Uncensored's Persian page; Views and tools). Saved, and said, both ways.
  function setPics(on) {
    picsOn = !!on || !CFG.light;
    try { localStorage.setItem('ir-pics', picsOn ? 'on' : 'off'); } catch (e) { }
    picsLabel();
    LOC = {}; render(); drawWire();
    say(picsOn ? T('Pictures and videos now load on this device. Switch them off here any time.') : T('Nothing from another site loads until you tap it.'));
  }
  function picsLabel() { var b = $('ir-pics'); if (b) { b.setAttribute('aria-pressed', picsOn ? 'true' : 'false'); var sp = b.querySelector('span'); if (sp) sp.textContent = picsOn ? T('Pictures: on') : T('Pictures: off'); } }
  function closeSpot() { var d = $('ir-spot'); spotAt = -1; SPOTL = null; if (d.open) { if (d.close) d.close(); else d.removeAttribute('open'); } d.innerHTML = ''; }

  /* ------------------------------------------------------------ an X post's pictures and video (17 October 2026) */
  // Armin: "you need to show an image or something of the video ... i should be able to play the video or see the full
  // version of the images without going to x". build/intel_x.py keeps them in `m` (its header has the shape). Pictures come
  // from X's picture host at the size asked for. A video plays in a frame that sends no Referer, because X refuses its video
  // files to a page from another site (measured 17 Oct 2026: 403 with libertypolitics.com or localhost as the referrer, 206
  // with none). If it still will not play, X's own player takes its place, and "Open on X" is always under it.
  var PBS_RX = /^https:\/\/pbs\.twimg\.com\/[A-Za-z0-9_\/-]+\.(?:jpg|jpeg|png|webp)$/, VTW_RX = /^https:\/\/video\.twimg\.com\/[A-Za-z0-9_\/.-]+\.mp4(?:\?[A-Za-z0-9=&_.-]*)?$/;
  var PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var ZOOM_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  function mediaOf(it) {
    return (it && Array.isArray(it.m) ? it.m : []).filter(function (r) { return r && /^[pvg]$/.test(r.t) && PBS_RX.test(r.i) && (!r.v || VTW_RX.test(r.v)); }).slice(0, 4);
  }
  // X's picture host: base?format=jpg&name=<size>. 240x240 (about 10 KB) for the list, medium (1200 wide) to look at, large
  // (2048) full screen, orig as posted. The old ".jpg?name=" form ignores the size on video posters, so it is never used.
  function pic(r, size) { var m = /^(.*)\.(jpg|jpeg|png|webp)$/.exec(r.i); return m ? m[1] + '?format=' + (m[2] === 'jpeg' ? 'jpg' : m[2]) + '&name=' + (size || 'medium') : r.i; }
  function fmtDur(s) { s = Math.round(+s || 0); if (s <= 0) return ''; var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return N((h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x); }          // in the page's digits
  function tweetId(u) { var m = /(?:x|twitter)\.com\/[^\/]+\/status\/(\d+)/.exec(u || ''); return m ? m[1] : ''; }
  function arOf(r) { var a = r.w && r.h ? r.w / r.h : 16 / 9; return Math.max(0.5, Math.min(2.4, a)).toFixed(4); }
  // big: the show screen (one block that fills the stage: the video when there is one, else the pictures, large posters)
  function mediaHtml(it, big) {
    var md = mediaOf(it); if (!md.length) return '';
    var vids = md.filter(function (r) { return r.t !== 'p'; }), ph = md.filter(function (r) { return r.t === 'p'; });
    if (big && vids.length) { vids = vids.slice(0, 1); ph = []; }
    var who = it.h || 'X', h = '';
    vids.forEach(function (r) {
      var d = fmtDur(r.s || it.dur), gif = r.t === 'g';
      h += '<div class="ir-xv" style="--ar:' + arOf(r) + '"><img src="' + esc(pic(r, big ? 'large' : 'medium')) + '" alt="" decoding="async"' + (h ? '' : ' fetchpriority="high"') + '>' +
        '<button type="button" class="ir-xv-play" data-xplay="' + md.indexOf(r) + '" aria-label="' + esc(T(gif ? 'Play the clip from {who} here' : 'Play the video from {who} here', { who: who }) + (d ? T(', {d} long', { d: N(d) }) : '')) + '">' + PLAY_SVG + '<span class="num">' + esc(gif ? 'GIF' : d ? N(d) : T('Play')) + '</span></button></div>';
    });
    if (ph.length) {
      h += '<div class="ir-xp ir-xp-n' + ph.length + '"' + (ph.length === 1 ? ' style="--ar:' + arOf(ph[0]) + '"' : '') + '>' + ph.map(function (r, j) {
        // two pictures side by side: each shown whole on its own blurred copy (intel.css), so a screenshot of text is never cut
        return '<button type="button" data-lb="' + j + '"' + (ph.length === 2 ? ' style="--bg:' + esc(cssUrl(pic(r, big ? 'large' : 'medium'))) + '"' : '') + ' aria-label="' + esc(T('See picture {i} of {n} from {who} full size', { i: N(j + 1), n: N(ph.length), who: who })) + '"><img src="' + esc(pic(r, big ? 'large' : 'medium')) + '" alt="" decoding="async"' + (j < 2 ? ' fetchpriority="high"' : ' loading="lazy"') + '><span class="ir-xp-z">' + ZOOM_SVG + '</span></button>';
      }).join('') + '</div>';
    }
    return '<div class="ir-xm' + (it.sn ? ' is-sn' : '') + '">' + h + (it.sn ? '<button type="button" class="ir-xm-sn" data-xsn>' + (it.g ? T('Graphic footage. Show it') : T('X marks this as possibly sensitive. Show it')) + '</button>' : '') + '</div>';
  }
  // the clicks inside one .ir-xm; fallback(holder) replaces the native player when the video will not play
  function wireMedia(box, it, fallback) {
    if (!box || box._xm) return; box._xm = 1;
    var md = mediaOf(it), ph = md.filter(function (r) { return r.t === 'p'; });
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-xplay],[data-lb],[data-xsn]'); if (!b || !box.contains(b)) return;
      if (b.hasAttribute('data-xsn')) { box.classList.remove('is-sn'); b.remove(); return; }
      if (box.classList.contains('is-sn')) return;
      if (b.hasAttribute('data-xplay')) xPlay(b.parentNode, md[+b.getAttribute('data-xplay')], it, fallback);
      else if (b.hasAttribute('data-lb')) lightbox(ph, +b.getAttribute('data-lb'), it);
    });
  }
  // ONE SOUND AT A TIME, AND ONLY AFTER A TAP (18 Oct 2026: a test of this player played a crowd video with the sound
  // on, out of Armin's headphones, while he was on air). Nothing in the room starts a video by itself: xPlay runs only
  // from a tap on a Play button. Starting one pauses every other video in the room, and a spotlight that closes, by any
  // route, empties itself, so nothing can keep playing out of sight. phone-test.html's Intel Room block counts all three.
  function hush(keep) {
    [].forEach.call(document.querySelectorAll('iframe.ir-xv-f'), function (f) {
      if (f === keep) return;
      try { var o = f.contentDocument && f.contentDocument.querySelector('video'); if (o && !o.paused) o.pause(); } catch (e) { }
    });
  }
  /* THE PLAYER (24 October 2026). Armin: "I just tried playing a video, and it played a few seconds and then it paused. The
     rest of it was playing in a glitchy way". Measured that day: every video played as ONE fixed mp4 (720p, up to 2.4
     Mbps), which cannot get lighter when the line slows, so a slower line stalls and then stutters. Now, in this order:
     1. X's own stream ("hl", HLS: the stream X's own player plays, in many sizes), through hls.js (assets/hls.min.js?v=1bec8431b4,
        loaded inside the frame only when a video is played; Safari on an iPhone plays the stream itself). It starts at
        the size the line can carry, moves between sizes as it plays and never asks for more than the player's size.
     2. Else, or when the stream fails or has not started in 12 seconds: the mp4, from where the stream got to. It starts
        on the light one ("vl", about 480p) when this device's line is known to be slow, and steps down to it at the second
        stall or a stall over 2.5 seconds (5 before the first picture).
     3. Else X's own player (xEmbed). The speed the stream measured is kept on this device (ir-bw), so the next one starts
        at the right size. Everything runs inside a frame that sends no Referer: X refuses its video to another site's. */
  var HLS_RX = /^https:\/\/video\.twimg\.com\/[A-Za-z0-9_\/.-]+\.m3u8(?:\?[A-Za-z0-9=&_.-]*)?$/;
  function hlsSrc() { var s = document.querySelector('script[src*="intel.js"]'); return s ? s.src.replace(/intel\.js(?:\?.*)?$/, 'hls.min.js') : ''; }
  function bwGet() { var b = 0; try { b = +localStorage.getItem('ir-bw') || 0; } catch (e) { } var c = navigator.connection; return b || (c && c.downlink ? c.downlink * 1e6 : 0); }
  function bwSet(b) { if (b > 0 && isFinite(b)) try { localStorage.setItem('ir-bw', String(Math.round(b))); } catch (e) { } }
  function slowLine() { var c = navigator.connection, b = bwGet(); return !!(c && c.saveData) || (b > 0 && b < 3e6); }
  function xGo(v) { var p = v.play && v.play(); if (p && p.catch) p.catch(function () { /* a browser that wants its own tap: the controls are there */ }); }
  function xAlive(P) {
    if (P.f.isConnected && !P.dead) return true;
    P.dead = 1; clearTimeout(P.t); clearTimeout(P.st);
    if (P.hls) { try { P.hls.destroy(); } catch (e) { } P.hls = null; }
    return false;
  }
  function xPlay(holder, r, it, fallback) {
    if (!holder || !r) return;
    var done = false, fail = function () { if (done) return; done = true; (fallback || xEmbed)(holder, it); };
    var gif = r.t === 'g', hl = !gif && r.hl && HLS_RX.test(r.hl) ? r.hl : '', vl = r.v && r.vl && VTW_RX.test(r.vl) ? r.vl : '';
    if (!r.v && !hl) { fail(); return; }
    var f = document.createElement('iframe');
    f.className = 'ir-xv-f'; f.title = T(gif ? 'Clip from {who}' : 'Video from {who}', { who: it.h || 'X' });
    f.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture'); f.setAttribute('allowfullscreen', ''); f.setAttribute('referrerpolicy', 'no-referrer');
    f.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}video{display:block;width:100%;height:100%;object-fit:contain;background:#000}</style></head><body>' +
      '<video poster="' + esc(pic(r, 'large')) + '" playsinline preload="auto"' + (gif ? ' muted loop' : ' controls') + '></video></body></html>';
    hush(null);
    holder.innerHTML = ''; holder.appendChild(f); holder.classList.add('is-on');
    f.addEventListener('load', function () {
      var v = null, w = null; try { w = f.contentWindow; v = f.contentDocument && f.contentDocument.querySelector('video'); } catch (e) { fail(); return; }
      if (!v || !w) { fail(); return; }
      var P = f._xp = { f: f, v: v, w: w, r: r, hl: hl, vl: vl, fail: fail, hls: null, mode: '', stalls: [] };
      v.addEventListener('play', function () { hush(f); });
      v.addEventListener('error', function () {
        if (!xAlive(P)) return;
        if (P.mode === 'native') { toMp4(P); return; }
        if (P.mode !== 'mp4') return;          // the stream's own errors are hls.js's to handle (its ERROR event below)
        if (P.vl && P.cur !== P.vl) { P.cur = P.vl; xSrc(P, v.currentTime); } else P.fail();
      });
      v.addEventListener('waiting', function () {
        if (P.mode !== 'mp4' || v.seeking || !xAlive(P)) return;
        var now = Date.now(); P.stalls = P.stalls.filter(function (x) { return now - x < 30000; }); P.stalls.push(now);
        clearTimeout(P.st);
        if (P.stalls.length >= 2) xDown(P); else P.st = setTimeout(function () { if (xAlive(P) && v.readyState < 3) xDown(P); }, v.currentTime < 0.3 ? 5000 : 2500);
      });
      v.addEventListener('playing', function () { clearTimeout(P.st); });
      if (hl) viaHls(P); else viaMp4(P, 0);
    }, { once: true });
  }
  function viaHls(P) {
    var v = P.v, w = P.w, d = P.f.contentDocument;
    var mse = !!(w.MediaSource || w.ManagedMediaSource || w.WebKitMediaSource), native = !!(v.canPlayType && v.canPlayType('application/vnd.apple.mpegurl'));
    if (!mse && native) { P.mode = 'native'; v.src = P.hl; xGo(v); return; }
    var url = hlsSrc();
    if (!mse || !url) { viaMp4(P, 0); return; }
    P.mode = 'load';
    P.t = setTimeout(function () { if (xAlive(P)) toMp4(P); }, 12000);          // the stream has not given a picture in 12 s
    var s = d.createElement('script'); s.src = url;
    s.onerror = function () { if (xAlive(P)) toMp4(P); };
    s.onload = function () {
      if (!xAlive(P)) return;
      var H = w.Hls; if (!H || !H.isSupported || !H.isSupported()) { toMp4(P); return; }
      var bw = bwGet(), h;
      try {
        // capLevelOnFPSDrop (25 Oct 2026): a computer too busy to draw every frame (his, while it also encodes the stream)
        // gets a lighter size instead of a video that plays slowly; the same measure as getVideoPlaybackQuality's drops
        h = P.hls = new H({ capLevelToPlayerSize: true, capLevelOnFPSDrop: true, startLevel: -1, abrEwmaDefaultEstimate: bw > 0 ? bw : 1e6, testBandwidth: true, startFragPrefetch: true, maxBufferLength: 30, maxMaxBufferLength: 90, backBufferLength: 30, enableWorker: true });
      } catch (e) { toMp4(P); return; }
      P.mode = 'hls';
      h.on(H.Events.MANIFEST_PARSED, function () { if (xAlive(P)) xGo(v); });
      h.on(H.Events.FRAG_BUFFERED, function () { clearTimeout(P.t); });
      h.on(H.Events.FRAG_LOADED, function () { bwSet(h.bandwidthEstimate); });
      h.on(H.Events.ERROR, function (e, dt) {
        if (!dt || !dt.fatal || !xAlive(P)) return;
        if (dt.type === H.ErrorTypes.MEDIA_ERROR && !P.rec) { P.rec = 1; h.recoverMediaError(); return; }
        toMp4(P);
      });
      h.loadSource(P.hl); h.attachMedia(v);
    };
    d.head.appendChild(s);
  }
  function toMp4(P) {
    if (P.mode === 'mp4' || !xAlive(P)) return;
    clearTimeout(P.t);
    var at = P.v.currentTime || 0;
    if (P.hls) { try { P.hls.destroy(); } catch (e) { } P.hls = null; }
    if (!P.r.v) { P.mode = 'mp4'; P.fail(); return; }
    viaMp4(P, at);
  }
  function viaMp4(P, at) {
    P.mode = 'mp4'; P.cur = P.vl && slowLine() ? P.vl : P.r.v;
    xSrc(P, at);
  }
  function xDown(P) {
    if (!P.vl || P.cur === P.vl || !xAlive(P)) return;
    P.cur = P.vl; P.stalls = []; bwSet(Math.min(bwGet() || 2e6, 2e6));          // this line is slow: the next video starts light
    xSrc(P, P.v.currentTime);
  }
  function xSrc(P, at) {
    var v = P.v, go = function () { v.removeEventListener('loadedmetadata', go); if (at > 0.5) { try { v.currentTime = at; } catch (e) { } } xGo(v); };
    v.addEventListener('loadedmetadata', go);
    v.src = P.cur;
  }
  var twP = null;
  function twJs() {
    if (window.twttr && window.twttr.widgets) return Promise.resolve(window.twttr);
    if (twP) return twP;
    twP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'https://platform.twitter.com/widgets.js'; s.async = true;
      s.onload = function () { var n = 0; (function wait() { if (window.twttr && window.twttr.widgets) res(window.twttr); else if (n++ > 50) rej(); else setTimeout(wait, 100); })(); };
      s.onerror = function () { twP = null; rej(); }; document.head.appendChild(s);
    });
    return twP;
  }
  /* X's own player, in place of ours: the post as X draws it, video and all. 18 October 2026 (Armin: "I can't see any
     visuals for the tweets when they're videos and pictures"): measured that day, 23 of 156 X videos came without their
     video file, and X's player then drew NOTHING (a frame 0 pixels high, 12 seconds on), so the reader was left with a
     line of text. Now the post's own picture stays, with one large "Watch it on X" over it, the whole time X's player is
     loading, and X's player takes its place only once it has really drawn. If it never does, the picture and the button
     stay: the reader always sees the video's picture and always has one tap to it. */
  function xEmbed(holder, it) {
    var rg = isRegime(it), id = rg ? '' : tweetId(it.u), md = mediaOf(it), r = md.filter(function (x) { return x.t !== 'p'; })[0] || md[0];          // a regime post: its picture, never a link or X's player (THE REGIME RULE)
    holder.classList.add('is-embed'); holder.classList.remove('is-on');
    holder.innerHTML = (r ? '<img src="' + esc(pic(r, 'large')) + '" alt="" decoding="async">' : '') +
      (rg ? '' : '<a class="ir-xv-out" href="' + esc(it.u) + '" target="_blank" rel="noopener">' + PLAY_SVG + '<span>' + T('Watch it on X') + '</span></a>') +
      (rg ? '' : '<p class="ir-xm-msg" aria-live="polite">' + (id ? T('Loading X\'s own player') : T('This one plays on X')) + '</p>');
    if (!id) return;
    var msg = holder.querySelector('.ir-xm-msg'), b = document.createElement('div');
    b.className = 'ir-xv-emb'; holder.appendChild(b);
    var gone = function () { if (holder.isConnected && msg) msg.textContent = T('X\'s player did not load here. Tap above to watch it on X.'); };
    twJs().then(function (T) { return T.widgets.createTweet(id, b, { theme: 'dark', dnt: true, align: 'center', conversation: 'none' }); })
      .then(function (w) {
        if (!w) throw new Error('none');
        var n = 0;
        (function drawn() {
          if (!holder.isConnected) return;
          var f = b.querySelector('iframe');
          if (f && f.getBoundingClientRect().height > 120) { holder.classList.add('is-x'); holder.removeAttribute('style'); [].slice.call(holder.children).forEach(function (c) { if (c !== b) c.remove(); }); return; }
          if (n++ > 48) { b.remove(); gone(); return; }
          setTimeout(drawn, 250);
        })();
      })
      .catch(function () { b.remove(); gone(); });
  }
  /* The pictures, full screen (24 October 2026, Armin: "when I click on the expand button, it doesn't work. I want to see
     a full version of the image"). Measured that day: the picture was sized by max-height:100% inside a grid, which the
     grid never resolved, so a tall picture drew at its own height and its bottom half was cut off the screen. Now its size
     is COMPUTED (lbFit): the whole picture always fits the screen, a small one drawn larger, shown at once from the copy
     the card already loaded and swapped for the sharp one when that arrives, at the same size, so nothing jumps. Tap or
     click to zoom in where you tapped (the original file loads for it), drag to look around, pinch or the wheel to zoom,
     tap again to fit. Arrows, a swipe, Escape, the cross, or a tap beside the picture close or move it. */
  var LB = null, LB_KMAX = 6;
  function lightbox(list, at, it) {
    if (!list || !list.length) return;
    if (!LB) {
      LB = document.createElement('dialog'); LB.className = 'ir-lb'; LB.id = 'ir-lb'; document.body.appendChild(LB);
      LB.addEventListener('click', function (ev) {
        var b = ev.target.closest('button');
        if (b && b.hasAttribute('data-lb-x')) { lbClose(); return; }
        if (b && b.hasAttribute('data-lb-step')) { lbGo(LB._at + (+b.getAttribute('data-lb-step'))); return; }
      });
      LB.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { ev.preventDefault(); lbGo(LB._at + ((ev.key === 'ArrowRight') !== !!CFG.rtl ? 1 : -1)); }          // right to left: Next is on the left
        else if (ev.key === '+' || ev.key === '=') { ev.preventDefault(); lbZoomAt(LB._z.k * 1.6, 0, 0); }
        else if (ev.key === '-') { ev.preventDefault(); lbZoomAt(LB._z.k / 1.6, 0, 0); }
        else if (ev.key === '0') { ev.preventDefault(); lbSet(1, 0, 0, true); }
        if (ev.key !== 'Tab') ev.stopPropagation();          // the room's own keys (the spotlight's arrows, F) wait behind it
      });
      LB.addEventListener('close', function () { LB.innerHTML = ''; LB._at = -1; LB.classList.remove('is-zoom', 'is-drag'); });
      lbGestures();
      window.addEventListener('resize', function () { if (LB && LB.open) lbFit(); });
    }
    LB._list = list; LB._it = it; LB._at = -1;
    lbGo(at || 0);
    if (!LB.open) { if (LB.showModal) LB.showModal(); else LB.setAttribute('open', ''); }
    lbFit();
    var x = LB.querySelector('[data-lb-x]'); if (x) x.focus();
  }
  function lbBox() { return LB && LB.querySelector('.ir-lb-in'); }
  function lbImg() { return LB && LB.querySelector('.ir-lb-img'); }
  // the picture's size at "fit": the whole of it inside the box, never past 3 times its own pixels (a tiny one would blur)
  function lbFit() {
    var b = lbBox(), im = lbImg(), r = LB && LB._list && LB._list[LB._at]; if (!b || !im || !r) return;
    var nw = r.w || im.naturalWidth, nh = r.h || im.naturalHeight, cw = b.clientWidth - 16, ch = b.clientHeight - 16;
    if (!(nw > 0 && nh > 0 && cw > 0 && ch > 0)) return;
    var s = Math.min(cw / nw, ch / nh, 3 * Math.max(1, (im.naturalWidth || nw) / nw));
    im.style.width = Math.round(nw * s) + 'px'; im.style.height = Math.round(nh * s) + 'px';
    lbSet(LB._z.k, LB._z.x, LB._z.y);
  }
  // the view: a zoom k (1 = fit) and an offset x, y from the middle, held so the picture never leaves an empty edge
  function lbSet(k, x, y, anim) {
    var b = lbBox(), im = lbImg(); if (!b || !im) return;
    k = Math.max(1, Math.min(LB_KMAX, k || 1));
    var mx = Math.max(0, (im.offsetWidth * k - b.clientWidth) / 2), my = Math.max(0, (im.offsetHeight * k - b.clientHeight) / 2);
    if (k < 1.01) { k = 1; x = 0; y = 0; }
    x = Math.max(-mx, Math.min(mx, x || 0)); y = Math.max(-my, Math.min(my, y || 0));
    LB._z = { k: k, x: x, y: y };
    im.classList.toggle('is-anim', !!anim && !reduced());
    im.style.transform = k === 1 ? '' : 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + k.toFixed(3) + ')';
    LB.classList.toggle('is-zoom', k > 1);
    if (k > 1 && !LB._orig) {          // zoomed in: the file as it was posted, swapped in at the same size
      var r = LB._list[LB._at], at = LB._at, hi = new Image(); LB._orig = 1;
      hi.onload = function () { if (LB._at === at && lbImg()) lbImg().src = hi.src; };
      hi.src = pic(r, 'orig');
    }
  }
  // zoom to k keeping the point (px, py), measured from the box's middle, where it is on the screen
  function lbZoomAt(k, px, py, anim) {
    var z = LB._z, k2 = Math.max(1, Math.min(LB_KMAX, k));
    lbSet(k2, px - (px - z.x) * k2 / z.k, py - (py - z.y) * k2 / z.k, anim);
  }
  function lbGestures() {
    var pts = {}, g = null;
    function mid() { var b = lbBox().getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
    function begin(ev) {
      var ids = Object.keys(pts), c = mid(), a = pts[ids[0]], b2 = pts[ids[1]];
      g = { n: ids.length, z: { k: LB._z.k, x: LB._z.x, y: LB._z.y }, t: Date.now(), moved: false, on: g ? g.on : ev.target, c: c,
            x0: a.x, y0: a.y, d0: b2 ? Math.hypot(a.x - b2.x, a.y - b2.y) : 0, m0: b2 ? { x: (a.x + b2.x) / 2 - c.x, y: (a.y + b2.y) / 2 - c.y } : null };
    }
    LB.addEventListener('pointerdown', function (ev) {
      if (!lbBox() || ev.target.closest('button,a') || !ev.target.closest('.ir-lb-in') || ev.button > 0) return;
      pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      try { LB.setPointerCapture(ev.pointerId); } catch (e) { }
      if (Object.keys(pts).length === 1) g = null;
      begin(ev); ev.preventDefault();
    });
    LB.addEventListener('pointermove', function (ev) {
      if (!pts[ev.pointerId] || !g) return;
      pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var ids = Object.keys(pts), a = pts[ids[0]];
      if (Math.hypot(a.x - g.x0, a.y - g.y0) > 6) g.moved = true;
      if (ids.length >= 2 && g.d0) {          // pinch: the point between the fingers stays under them
        var b2 = pts[ids[1]], d = Math.hypot(a.x - b2.x, a.y - b2.y), m = { x: (a.x + b2.x) / 2 - g.c.x, y: (a.y + b2.y) / 2 - g.c.y };
        var k = Math.max(1, Math.min(LB_KMAX, g.z.k * d / g.d0));
        g.moved = true; lbSet(k, m.x - (g.m0.x - g.z.x) * k / g.z.k, m.y - (g.m0.y - g.z.y) * k / g.z.k);
      } else if (g.n === 1 && LB._z.k > 1 && g.moved) {          // drag: look around the zoomed picture
        LB.classList.add('is-drag'); lbSet(g.z.k, g.z.x + a.x - g.x0, g.z.y + a.y - g.y0);
      }
    });
    function end(ev) {
      if (!pts[ev.pointerId] || !g) return;
      var p = pts[ev.pointerId], was = g; delete pts[ev.pointerId];
      LB.classList.remove('is-drag');
      if (Object.keys(pts).length) { begin(ev); g.moved = true; return; }          // one finger lifted from a pinch
      g = null;
      if (ev.type === 'pointercancel' || was.n !== 1) return;
      var dx = p.x - was.x0, dy = p.y - was.y0;
      if (!was.moved && Date.now() - was.t < 500) {          // a tap
        if (was.on && was.on.classList && was.on.classList.contains('ir-lb-img')) {
          if (LB._z.k > 1) lbSet(1, 0, 0, true);
          else { var im = lbImg(), r = LB._list[LB._at], nat = Math.max(r.w || 0, im.naturalWidth || 0) / Math.max(1, im.offsetWidth);
            lbZoomAt(Math.max(2.5, Math.min(LB_KMAX, nat)), p.x - was.c.x, p.y - was.c.y, true); }
        } else if (LB._z.k > 1) lbSet(1, 0, 0, true);
        else lbClose();          // a tap beside the picture
      } else if (was.z.k === 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) lbGo(LB._at + ((dx < 0) !== !!CFG.rtl ? 1 : -1));          // a swipe, toward the side Next is on
    }
    LB.addEventListener('pointerup', end); LB.addEventListener('pointercancel', end);
    LB.addEventListener('wheel', function (ev) {
      if (!lbBox() || !ev.target.closest('.ir-lb-in')) return;
      ev.preventDefault();
      var c = mid(); lbZoomAt(LB._z.k * Math.exp(-ev.deltaY * (ev.deltaMode ? 0.05 : 0.0018)), ev.clientX - c.x, ev.clientY - c.y);
    }, { passive: false });
    LB.addEventListener('dragstart', function (ev) { ev.preventDefault(); });
  }
  function lbGo(i) {
    var n = LB._list.length; if (i < 0 || i >= n || i === LB._at) return;
    LB._at = i; LB._z = { k: 1, x: 0, y: 0 }; LB._orig = 0; LB.classList.remove('is-zoom', 'is-drag');
    var r = LB._list[i], it = LB._it;
    LB.setAttribute('aria-label', T('Picture {i} of {n} from {who}', { i: N(i + 1), n: N(n), who: it.h || 'X' }));
    LB.innerHTML = '<div class="ir-lb-in"><img class="ir-lb-img" src="' + esc(pic(r, 'medium')) + '" alt="' + esc(it.t) + '" draggable="false"></div>' +
      (n > 1 ? '<button type="button" class="ir-lb-nav prev" data-lb-step="-1" aria-label="' + T('Previous picture') + '"' + (i ? '' : ' disabled') + '>&lsaquo;</button><button type="button" class="ir-lb-nav next" data-lb-step="1" aria-label="' + T('Next picture') + '"' + (i < n - 1 ? '' : ' disabled') + '>&rsaquo;</button>' : '') +
      '<div class="ir-lb-bar">' + (n > 1 ? '<span class="ir-lb-n num">' + T('{i} of {n}', { i: N(i + 1), n: N(n) }) + '</span>' : '') +
      '<a href="' + esc(pic(r, 'orig')) + '" target="_blank" rel="noopener">' + T('Full size') + '</a>' + (isRegime(it) ? '' : '<a href="' + esc(it.u) + '" target="_blank" rel="noopener">' + T('Open on X') + '</a>') +
      '<button type="button" class="ir-lb-x" data-lb-x aria-label="' + T('Close') + '">&times;</button></div>';
    var im = lbImg(), hi = new Image();
    im.addEventListener('load', function () { if (!r.w || !r.h) lbFit(); });
    im.addEventListener('error', function () {          // the quick copy failed: the sharp one may still come; if both fail, say so
      if (im.src !== pic(r, 'large')) { im.src = pic(r, 'large'); return; }
      var b = lbBox(); if (b) b.innerHTML = '<p class="ir-lb-msg">' + T('This picture did not load here.') + (isRegime(it) ? '' : ' <a href="' + esc(it.u) + '" target="_blank" rel="noopener">' + T('Open on X') + '</a>') + '</p>';
    });
    hi.onload = function () { if (LB._at === i && lbImg() && !LB._orig) lbImg().src = hi.src; };
    hi.src = pic(r, 'large');
    [i - 1, i + 1].forEach(function (j) { if (j >= 0 && j < n) new Image().src = pic(LB._list[j], 'large'); });          // the next tap is instant
    lbFit();
    var fx = LB.querySelector('[data-lb-x]'), ae = document.activeElement;
    if (LB.open && fx && (!ae || ae === document.body || !LB.contains(ae))) fx.focus({ preventScroll: true });          // the arrows keep working after the buttons are redrawn
  }
  function lbClose() { if (!LB) return; if (LB.open) { if (LB.close) LB.close(); else { LB.removeAttribute('open'); LB.innerHTML = ''; } } }
  function pulseAt(k) {
    if (!P[k] || P[k][2] == null) return;
    flyTo(Math.max(V.k, 6), P[k][3], P[k][2]);
    setTimeout(function () { PULSE = { k: k, at: Date.now() }; pinSig = ''; requestDraw(); }, 760);
  }

  /* ------------------------------------------------------------ the tour: one item every 12 seconds, the map flying to it */
  var tourT = 0, tourAt = -1;
  function lowerThird(it) {
    var lt = $('ir-lt');
    if (!it) { lt.hidden = true; lt.innerHTML = ''; return; }
    var lv = it.sn ? { k: 'mono' } : vis(it), th = lv.u || '';
    lt.innerHTML = (th ? '<span class="ir-lt-th' + (lv.k === 'av' ? ' is-av' : '') + '" style="background-image:' + esc(cssUrl(th)) + '"></span>' : '') +
      '<span class="ir-lt-b"><span class="ir-lt-k">' + esc(LENS[S.lens]) + (it.hot != null ? ' · <b>' + flame() + T('Hot {n}', { n: N(it.hot) }) + '</b>' : it.q ? ' · <b>&#9733; ' + T('Top pick') + '</b>' : '') + '</span>' +
      byline(it) + '<span class="ir-lt-t"' + DA + '>' + esc(it.t) + '</span><span class="ir-lt-m">' + mark(it, 'ir-mk') + esc(fmtDate(it.d)) + ' · ' + esc(it.p === 'global' && it.pw ? it.pw : placeName(it.p)) + '</span>' + reachLine(it) + '</span>' +
      '<span class="ir-lt-n num">' + N(tourAt + 1) + '/' + N(Math.min(shown.length, 30)) + '</span>';
    lt.hidden = false;
  }
  function tourStep(dir) {
    var n = Math.min(shown.length, 30);
    if (!n) { stopTour(); return; }
    tourAt = (tourAt + (dir || 1) + n) % n;
    var it = shown[tourAt];
    lowerThird(it);
    [].forEach.call($('ir-items').querySelectorAll('.ir-card'), function (li) { li.classList.toggle('on', li.firstChild && +li.firstChild.getAttribute('data-i') === tourAt); });
    var li = $('ir-items').querySelector('.ir-card.on'); if (li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
    if (it.p !== 'global' && P[it.p] && P[it.p][2] != null) pulseAt(it.p);
  }
  function startTour() {
    if (!shown.length) return;
    closeSpot(); tourAt = -1; tourStep(1);
    clearInterval(tourT); tourT = setInterval(function () { tourStep(1); }, TOUR_MS);
    $('ir-tour').setAttribute('aria-pressed', 'true'); $('ir-tour').querySelector('span').textContent = T('Stop playing');
  }
  function stopTour() {
    if (!tourT && $('ir-lt').hidden) return;
    clearInterval(tourT); tourT = 0; lowerThird(null);
    $('ir-tour').setAttribute('aria-pressed', 'false'); $('ir-tour').querySelector('span').textContent = T('Play');
  }

  /* ------------------------------------------------------------ full screen, for a stream */
  var clockT = 0;
  function clock() {
    // US Eastern, always: the shows are on Eastern time, and the computer's own clock would say where it is.
    // Iran Uncensored: Tehran time (CFG.clock), the hour its audience lives by, and never the computer's own either.
    var ck = CFG.clock || { tz: 'America/New_York', locale: 'en-US', label: ' ET' };
    try { $('ir-clock').textContent = new Intl.DateTimeFormat(ck.locale || 'en-US', { timeZone: ck.tz, hour: 'numeric', minute: '2-digit' }).format(new Date()) + ck.label; } catch (e) { $('ir-clock').textContent = ''; }
  }
  function stream(on) {
    var h = document.documentElement;
    if (on === undefined) on = !h.classList.contains('ir-show');
    // the full screen is pinned to the screen (intel.css); the page goes back to where it was when it is left
    if (on && !h.classList.contains('ir-show')) stream.y = window.scrollY || 0;
    var back = !on && h.classList.contains('ir-show') ? stream.y || 0 : -1;
    h.classList.toggle('ir-show', on);
    if (back >= 0) window.scrollTo(0, back);
    if (!on) { h.classList.remove('ir-ctl-on'); $('ir-ctl').setAttribute('aria-pressed', 'false'); }
    $('ir-stream').querySelector('span').textContent = on ? T('Leave full screen') : T('Full screen');
    $('ir-stream').setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) { clock(); clockT = setInterval(clock, 15000); poke(); spin(); } else { clearInterval(clockT); }
    if (on && h.requestFullscreen && !document.fullscreenElement) h.requestFullscreen().catch(function () {});
    if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    setTimeout(function () { refit(); }, 90);
    setTimeout(function () { refit(); }, 400);
  }
  function refit() { pinSig = ''; requestDraw(); }          // the view is a place and a zoom, so a new size only redraws it

  /* ------------------------------------------------------------ copy notes: the list as text, for show prep */
  /* COPY THE ROUNDUP (Iran Uncensored: CFG.roundup). The pack in the shape Kaveh sends before a show: numbered, X and YouTube
     first, one short line and the link each, 25 at most. Regime media is left out (it has no link to give) and the count of
     what was left out is said. */
  function clipT(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; }
  function roundup() {
    var rg = shown.filter(isRegime).length, ok = shown.filter(function (it) { return !isRegime(it) && /^https:\/\//.test(String(it.u || '')); });
    var first = ok.filter(function (it) { return it.src === 'X' || it.src === 'YouTube'; }), rest = ok.filter(function (it) { return it.src !== 'X' && it.src !== 'YouTube'; });
    var pick = first.concat(rest).slice(0, 25);
    if (!pick.length) { say(T('Nothing to copy. Clear a filter first.')); return; }
    var txt = pick.map(function (it, i) { return N(i + 1) + '. ' + clipT(it.t, 100) + '\n' + it.u; }).join('\n\n');
    var done = function () { say(T('Copied {n}, X and YouTube first. Paste it into a chat.', { n: N(pick.length) }) + (rg ? T(' {m} from regime media left out: they have no link to give.', { m: N(rg) }) : '')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt, done); });
    else fallbackCopy(txt, done);
  }
  function copyNotes() {
    if (CFG.roundup) { roundup(); return; }
    // headed by what the filters leave, in words (filterLine), never by whatever line was last said under the bar
    var head = 'Intel Room: ' + filterLine() + '\n' + location.href + '\n\n';
    var txt = head + shown.slice(0, 40).map(function (it, i) {
      var r = reachOf(it), n = r && !r.x ? [r.lk != null ? r.lk.toLocaleString('en-US') + ' likes' : '', r.vw != null ? (r['~'] ? '~' : '') + r.vw.toLocaleString('en-US') + ' views' : ''].filter(Boolean).join(', ') : '';
      return (i + 1) + '. ' + it.t + '\n   ' + [fmtDate(it.d), it.p === 'global' && it.pw ? it.pw : placeName(it.p), it.src === 'X' && it.nm && it.h ? it.nm + ' (' + it.h + ')' : it.h || it.src, pfName(pfOf(it)) + (n ? ': ' + n : ''), it.hot != null ? 'Hot ' + it.hot + ' (' + (it.hotWhy || '') + ')' : '', it._v != null ? 'Viral ' + it._v : ''].filter(Boolean).join(' · ') + '\n   ' + it.u + (it.n ? '\n   ' + it.n : '');
    }).join('\n\n');
    var done = function () { say('Copied ' + Math.min(40, shown.length) + ' items with their links. Paste them into your show notes.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt, done); });
    else fallbackCopy(txt, done);
  }
  function fallbackCopy(txt, done) {
    var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { say(T('Copying is blocked in this browser. Select the list and copy it by hand.')); }
    document.body.removeChild(ta);
  }

  /* ------------------------------------------------------------ readers' finds: what was sent and is not checked yet
     A find is a post about quest:send-intel or quest:send-your-own (a mission report). The live ones are read over plain
     REST, like the count of a discussion, so a visitor loads none of Firebase's code for it. One that the bank already
     holds (an accepted find, "r" in intel.json) is left out here. */
  var FIND_KEYS = ['quest:' + MISSION.find, 'quest:' + MISSION.mine];
  function lp(cb, tries) { if (window.LP && window.LP.members && window.LP.quests) { cb(window.LP); return; } if ((tries || 0) > 75) { cb(null); return; } setTimeout(function () { lp(cb, (tries || 0) + 1); }, 200); }
  /* ------------------------------------------------------------ ask for a feature (team only)
     17 October 2026, Guy on Telegram: "Add the option to suggest features to the Intel Room from within the Intel Room so
     I can add features directly from the site". The box shows only to an account the database lets into the team room
     (community.js inRoom), and what it sends is an ordinary team-room note (kind "idea", this page as its link), so it is
     read and answered where every team request already is (../LIVING.md, "The team room"). No new rule, no new store. */
  function setupSuggest() {
    var box = $('ir-sug'), form = $('ir-sug-f'), ta = $('ir-sug-t'), go = $('ir-sug-go'), msg = $('ir-sug-m');
    if (!box || !form) return;
    function say(t, bad) { msg.textContent = t; msg.className = 'ir-sug-m' + (bad ? ' bad' : ''); }
    lp(function (L) {
      if (!L || L.off || !L.room) return;
      var R = L.room;
      function check() {
        if (!R.user()) { box.hidden = true; return; }
        R.inRoom().then(function (ok) { box.hidden = !ok; }, function () { box.hidden = true; });
      }
      R.sub(check); check();
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var u = R.user(), text = ta.value.trim();
        if (!u) { say(T('You were signed out. Sign in again.'), true); return; }
        if (text.length < 3) { say(T('Write a few words first.'), true); ta.focus(); return; }
        if (!u.displayName) { say(T('Choose the name shown with your notes first: tap your account at the top.'), true); return; }
        if (!u.emailVerified) { say(T('Confirm your email first: open the link I sent when you made the account.'), true); return; }
        var url = location.protocol === 'https:' ? ('https://' + location.host + location.pathname).slice(0, 400) : '';
        go.disabled = true; say(T('Sending.'));
        R.fb().then(function (x) {
          return R.within(20000, x.F.setDoc(x.F.doc(x.F.collection(x.db, 'teamroom')), { uid: u.uid, name: u.displayName, kind: 'idea', text: (T('Intel Room: ') + text).slice(0, 1500), url: url, parent: '', createdAt: x.F.serverTimestamp() }));
        }).then(function () {
          ta.value = ''; say(T('Sent to the team room. I answer you there, usually the same day.'));
        }, function (e) {
          say(e && e.code === 'permission-denied' ? T('The idea was refused. Load the page again; if it keeps happening, your account may be off the team list.') : T('The idea could not be sent. Check your connection and try again.'), true);
        }).then(function () { go.disabled = false; });
      });
    });
  }
  var FIELD = /^(When|Where|Topics|Explainer|Graphic|Mine):\s*(.*)$/i;
  function parseFind(id, d) {
    var lines = String(d.text || '').split('\n'), what = [], f = {};
    lines.forEach(function (l) { var m = FIELD.exec(l.trim()); if (m) f[m[1].toLowerCase()] = m[2].trim(); else if (l.trim()) what.push(l.trim()); });
    var t = what.join(' ').slice(0, 160) || T('A link a reader sent');
    var it = { id: 'R' + id, rid: id, t: t, u: d.url, src: srcOf(d.url), p: 'global', tp: [], k: ytId(d.url) || d.kind === 'video' ? 'video' : srcOf(d.url) === 'X' || srcOf(d.url) === 'Telegram' ? 'post' : 'article',
      by: d.name || '', own: d.about === FIND_KEYS[1], pend: 1, ms: d.createdAt || 0 };
    if (f.when && /^\d{4}-\d{2}-\d{2}$/.test(f.when)) it.d = f.when;
    if (f.where) {
      var k = Object.keys(P).filter(function (k) { return P[k][0].toLowerCase() === f.where.toLowerCase(); })[0];
      if (k) it.p = k; else it.pw = f.where.slice(0, 60);
    }
    if (f.topics) it.tp = f.topics.split(/\s*·\s*/).map(function (n) { return topics.indexOf(n); }).filter(function (i) { return i >= 0; });
    if (/^yes/i.test(f.explainer || '')) it.edu = 1;
    if (/^yes/i.test(f.graphic || '')) it.g = 1;
    return it;
  }
  function loadReaders() {
    lp(function (L) {
      if (!L || L.off || L.quests.off) { rdState = 'off'; if (S.lens === 'readers') render(); else drawLens(); return; }
      rdState = 'loading'; drawLens();
      var q = { structuredQuery: { from: [{ collectionId: 'posts' }], where: { compositeFilter: { op: 'AND', filters: [
        { fieldFilter: { field: { fieldPath: 'about' }, op: 'IN', value: { arrayValue: { values: FIND_KEYS.map(function (k) { return { stringValue: k }; }) } } } },
        { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'live' } } }] } }, limit: 200 } };
      fetch(L.members.rest('runQuery'), { method: 'POST', body: JSON.stringify(q) }).then(function (r) { if (!r.ok) throw r; return r.json(); }).then(function (got) {
        var inBank = {}, seenU = {};
        BANK.forEach(function (it) { if (it.r) inBank[it.r] = 1; seenU[norm(it.u)] = 1; });
        var list = (Array.isArray(got) ? got : []).filter(function (r) { return r.document; }).map(function (r) {
          var id = r.document.name.split('/').pop(), d = L.members.plain({ mapValue: { fields: r.document.fields || {} } }) || {};
          return d.parent ? null : parseFind(id, d);
        }).filter(function (it) { return it && it.u && !inBank[it.rid] && !seenU[norm(it.u)]; });
        var mineNow = RD.filter(function (it) { return it.fresh; });
        RD.length = 0;
        mineNow.concat(list.filter(function (it) { return !mineNow.some(function (m) { return m.rid === it.rid; }); })).forEach(function (it) { RD.push(it); });
        rdState = 'ok';
        if (S.lens === 'readers') render(); else drawLens();
      }).catch(function () { rdState = 'off'; if (S.lens === 'readers') render(); else drawLens(); });
    });
  }

  /* ------------------------------------------------------------ add to the Intel Room
     The link and one line are all that is asked. Everything else is optional and helps it go up faster. A find made by
     someone else is quest:send-intel; the reader's own work is quest:send-your-own (more XP, and a video sent as theirs
     marks the account a creator). What the reader typed is kept on the device until it is sent, so signing in on the way
     loses nothing. */
  var DKEY = 'ir-add', MAXT = 600;
  function compose(f) {
    var lines = [f.what.trim()];
    if (f.date) lines.push('When: ' + f.date);
    if (f.place) lines.push('Where: ' + f.place);
    if (f.topics.length) lines.push('Topics: ' + f.topics.map(topicName).join(' · '));
    if (f.edu) lines.push('Explainer: yes');
    if (f.gr) lines.push('Graphic: yes');
    if (f.who === 'mine') lines.push('Mine: yes, I made it');
    return lines.join('\n').slice(0, MAXT);
  }
  /* THE IRAN SITE'S FORM (CFG.addSimple): the link and one line, nothing else, with the safety line, as its Newsroom asked. A
     private chat or group and a regime server are refused before anything is sent (PRIVATE below, isRegime). The fields the
     full form has are there, hidden and empty, so everything that reads the form reads it the same way. */
  var PRIVATE = [/^https:\/\/(t|telegram)\.me\/(\+|joinchat\/|c\/)/i, /^https:\/\/(chat|api)\.whatsapp\.com\//i, /^https:\/\/wa\.me\//i,
    /^https:\/\/(signal\.group|signal\.me)\//i, /^https:\/\/(www\.)?(m\.me|messenger\.com)\//i, /^https:\/\/(www\.)?instagram\.com\/direct\//i,
    /^https:\/\/(www\.|m\.)?facebook\.com\/(messages|groups)\//i, /^https:\/\/(discord\.gg|(www\.)?discord(app)?\.com\/invite)\//i,
    /^https:\/\/(www\.)?(x|twitter)\.com\/(messages|i\/chat)\b/i, /^https:\/\/([a-z0-9-]+\.)?(eitaa\.com|rubika\.ir|ble\.ir|splus\.ir|igap\.net|soroush-app\.ir)\b/i];
  function addSimpleHtml() {
    return '<form class="ir-a ir-a-simple" id="ir-a" novalidate>' +
      '<div class="ir-a-top"><p class="ir-a-k"><span class="ir-a-badge">' + T('Scout') + '</span><span id="ir-a-xp">' + T('+{n} XP when it is accepted', { n: N(XP.find) }) + '</span></p><button class="ir-s-x" type="button" data-a-x aria-label="' + T('Close') + '">&times;</button></div>' +
      '<h2 id="ir-add-h">' + T('Bring a public post') + '</h2>' +
      '<p class="ir-a-lede">' + T('Seen something public that the news missed? Send the link and one line. I check it before it goes anywhere.') + '</p>' +
      '<div class="ir-a-f"><label for="ir-a-url">' + T('The link') + '</label>' +
      '<div class="ir-a-row"><input id="ir-a-url" type="url" inputmode="url" autocomplete="off" spellcheck="false" dir="ltr" maxlength="400" placeholder="https://x.com/..."><button type="button" class="ir-a-paste" id="ir-a-paste" hidden>' + T('Paste') + '</button></div>' +
      '<div class="ir-a-prev" id="ir-a-prev" hidden></div></div>' +
      '<div class="ir-a-f"><label for="ir-a-what">' + T('One line: what it shows') + '</label>' +
      '<textarea id="ir-a-what" rows="2" maxlength="300" placeholder="' + T('For example: workers on strike outside the refinery, filmed today') + '"></textarea></div>' +
      '<p class="ir-a-fine ir-a-safe">' + T("Only the link and one line. Don't write where you are, who you are, or anyone's name. Links to private chats and groups are refused. If you're inside Iran, don't send anything: your safety comes first.") + '</p>' +
      '<input type="hidden" id="ir-a-date"><select id="ir-a-place" hidden><option value=""></option></select><input id="ir-a-where" hidden><input type="checkbox" id="ir-a-edu" hidden><input type="checkbox" id="ir-a-gr" hidden><details id="ir-a-more" hidden></details>' +
      '<p class="ir-a-msg" id="ir-a-msg" aria-live="polite"></p>' +
      '<div class="ir-a-act"><button type="submit" class="ir-a-send" id="ir-a-send">' + T('Send') + '</button><button type="button" class="ir-s-b" data-a-x>' + T('Cancel') + '</button></div>' +
      '</form><div class="ir-a-done" id="ir-a-done" hidden></div>';
  }
  function addHtml() {
    if (CFG.addSimple) return addSimpleHtml();
    var places = placeOptions(BANK, false);
    var today = new Date().toISOString().slice(0, 10);
    return '<form class="ir-a" id="ir-a" novalidate>' +
      '<div class="ir-a-top"><p class="ir-a-k"><span class="ir-a-badge">Act II · Scout</span><span id="ir-a-xp">+' + XP.find + ' XP when it is accepted</span></p><button class="ir-s-x" type="button" data-a-x aria-label="Close">&times;</button></div>' +
      '<h2 id="ir-add-h">Add to the Intel Room</h2>' +
      '<p class="ir-a-lede">Evidence nobody can find does nothing. Send the link, say what it shows, and I check it. Once it is on the map it carries your name, and anyone can use it.</p>' +
      '<div class="ir-a-f"><label for="ir-a-url">The link</label>' +
      '<div class="ir-a-row"><input id="ir-a-url" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="Paste a link: x.com, youtube.com, a news site, a PDF"><button type="button" class="ir-a-paste" id="ir-a-paste" hidden>Paste</button></div>' +
      '<div class="ir-a-prev" id="ir-a-prev" hidden></div></div>' +
      '<fieldset class="ir-a-who"><legend>Whose is it?</legend>' +
      '<label><input type="radio" name="ir-who" value="find" checked><span><b>I found it</b><small>Someone else\'s clip, post, article, document or data</small><i class="num">+' + XP.find + ' XP</i></span></label>' +
      '<label><input type="radio" name="ir-who" value="mine"><span><b>I made it</b><small>My own video, article or research. Everyone who uses the room sees it, and so do the audiences of the creators who show the room on their streams: more people see your work</small><i class="num">+' + XP.mine + ' XP</i></span></label></fieldset>' +
      '<div class="ir-a-f"><label for="ir-a-what">What does it show? <small>One line, in your own words</small></label>' +
      '<textarea id="ir-a-what" rows="2" maxlength="300" placeholder="Example: Hamas gunmen firing from inside a school in Khan Younis, filmed by a resident"></textarea></div>' +
      '<details class="ir-a-more" id="ir-a-more"><summary>When, where and the topic <small>Optional. It goes up faster with them</small></summary>' +
      '<div class="ir-a-grid"><div class="ir-a-f"><label for="ir-a-date">When it happened</label><input id="ir-a-date" type="date" max="' + today + '"></div>' +
      '<div class="ir-a-f"><label for="ir-a-place">Where</label><select id="ir-a-place"><option value="">Not sure, or no one place</option>' + places + '<option value="other">Somewhere else</option></select><input id="ir-a-where" maxlength="60" placeholder="Where? City and country" hidden></div></div>' +
      '<div class="ir-a-f"><span class="ir-a-lab" id="ir-a-tl">Topics <small>up to three</small></span><div class="ir-a-tops" role="group" aria-labelledby="ir-a-tl">' +
      TOPICS.map(function (t) { return '<button type="button" class="ir-chip" data-at="' + t[0] + '" aria-pressed="false">' + esc(t[1]) + '</button>'; }).join('') + '</div></div>' +
      '<label class="ir-a-chk"><input type="checkbox" id="ir-a-edu"><span><b>It is an explainer</b> A lesson, a history, a breakdown of a subject, rather than footage of one moment</span></label>' +
      '<label class="ir-a-chk"><input type="checkbox" id="ir-a-gr"><span><b>It shows graphic violence</b> So it is marked before anyone opens it</span></label></details>' +
      '<p class="ir-a-msg" id="ir-a-msg" aria-live="polite"></p>' +
      '<div class="ir-a-act"><button type="submit" class="ir-a-send" id="ir-a-send">Send it in</button><a class="ir-a-talk" href="#discussion" data-a-x>Rather argue about it? The discussion</a></div>' +
      '<p class="ir-a-fine">Once checked, the link, your line and your name are public. Never send anything that shows a private person\'s face, name or home without their yes, and nothing that tells where someone inside Iran is.</p>' +
      '</form><div class="ir-a-done" id="ir-a-done" hidden></div>';
  }
  function af() {
    var who = (document.querySelector('input[name="ir-who"]:checked') || {}).value || 'find';
    var pv = $('ir-a-place').value, place = pv === 'other' ? $('ir-a-where').value.trim() : pv ? P[pv][0] : '';
    return { url: $('ir-a-url').value.trim(), what: $('ir-a-what').value, who: who, date: $('ir-a-date').value, placeKey: pv, place: place, where: $('ir-a-where').value,
      topics: [].map.call($('ir-add').querySelectorAll('.ir-a-tops [aria-pressed="true"]'), function (b) { return b.getAttribute('data-at'); }).filter(function (k) { return TOPN[k]; }),
      edu: $('ir-a-edu').checked, gr: $('ir-a-gr').checked };
  }
  function keepDraft() { sstore(DKEY, af()); }
  function restoreDraft(d) {
    if (!d) return;
    $('ir-a-url').value = d.url || ''; $('ir-a-what').value = d.what || '';
    var r = document.querySelector('input[name="ir-who"][value="' + (d.who === 'mine' ? 'mine' : 'find') + '"]'); if (r) r.checked = true;
    $('ir-a-date').value = d.date || ''; $('ir-a-place').value = d.placeKey || ''; $('ir-a-where').hidden = d.placeKey !== 'other'; $('ir-a-where').value = d.where || '';
    (d.topics || []).forEach(function (i) { var b = $('ir-add').querySelector('[data-at="' + i + '"]'); if (b) b.setAttribute('aria-pressed', 'true'); });
    $('ir-a-edu').checked = !!d.edu; $('ir-a-gr').checked = !!d.gr;
    if (d.date || d.placeKey || (d.topics || []).length || d.edu || d.gr) $('ir-a-more').open = true;
    whoChanged(); preview();
  }
  function amsg(t, bad) { var m = $('ir-a-msg'); m.innerHTML = t || ''; m.className = 'ir-a-msg' + (bad ? ' bad' : ''); }
  function fixUrl(u) { u = String(u || '').trim(); if (/^(www\.|[a-z0-9-]+\.[a-z]{2,}\/)/i.test(u)) u = 'https://' + u; return u.replace(/^http:\/\//i, 'https://'); }
  var known = null;
  function knownUrls() {
    if (known) return known;
    known = {}; BANK.forEach(function (it) { known[norm(it.u)] = it; }); LIVE.forEach(function (it) { if (!known[norm(it.u)]) known[norm(it.u)] = it; });
    return known;
  }
  function preview() {
    var u = fixUrl($('ir-a-url').value), el = $('ir-a-prev');
    if (!/^https:\/\/[^\s\/<>"']+\.[^\s<>"']+$/.test(u)) { el.hidden = true; el.innerHTML = ''; return null; }
    var y = ytId(u), s = srcOf(u), h = hostOf(u), handle = (/(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/status/i.exec(u) || /t\.me\/(?:s\/)?([A-Za-z0-9_]+)\/\d/.exec(u) || [])[1];
    var what = y ? T('A YouTube video') : s === 'X' ? (handle ? T('A post on X by @{h}', { h: handle }) : T('A post on X')) : s === 'Telegram' ? (handle ? T('A Telegram post from @{h}', { h: handle }) : T('A Telegram post')) :
      s === 'Document' ? T('A document on {site}', { site: h }) : ['Facebook', 'Instagram', 'TikTok', 'Rumble'].indexOf(s) >= 0 ? T('A post on {pf}', { pf: T(s) }) : T('A page on {site}', { site: h });
    var dup = knownUrls()[norm(u)] || RD.filter(function (it) { return norm(it.u) === norm(u); })[0];
    el.innerHTML = (y && pics() ? '<span class="ir-th yt" style="background-image:url(https://i.ytimg.com/vi/' + y + '/mqdefault.jpg)"></span>' : '<span class="ir-th">' + esc(y ? 'YT' : s.length > 9 ? 'WEB' : s) + '</span>') +
      '<span><b>' + esc(what) + '</b>' + (dup ? '<em class="dup">' + (dup.pend ? T('Someone already sent this one in. It is being checked.') : T('Already in the room: {t}', { t: esc(dup.t) })) + '</em>' : '<small>' + T('Looks good. Now say what it shows.') + '</small>') + '</span>';
    el.hidden = false;
    return { u: u, dup: dup };
  }
  function whoChanged() {
    if (CFG.addSimple) return;
    var mine = ((document.querySelector('input[name="ir-who"]:checked') || {}).value === 'mine');
    $('ir-a-xp').textContent = '+' + (mine ? XP.mine : XP.find) + ' XP when it is accepted';
    $('ir-a-what').placeholder = mine ? 'Example: My 10 minute breakdown of the casualty numbers from Gaza, with every source on screen' : 'Example: Hamas gunmen firing from inside a school in Khan Younis, filmed by a resident';
  }
  var addOpener = null;
  function openAdd(opener) {
    stopTour(); closeSpot();
    var dlg = $('ir-add');
    if (!dlg.firstChild || $('ir-a-done') && !$('ir-a-done').hidden) { dlg.innerHTML = addHtml(); restoreDraft(sstore(DKEY)); }
    addOpener = opener || null;
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    if (navigator.clipboard && navigator.clipboard.readText && window.isSecureContext) $('ir-a-paste').hidden = false;
    setTimeout(function () { var i = $('ir-a-url'); if (i && !i.value) i.focus(); }, 40);
  }
  function closeAdd() {
    var d = $('ir-add'); if (d.open) { if (d.close) d.close(); else d.removeAttribute('open'); }
    if (location.hash === '#add' && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  }
  var sending = false;
  function sendAdd() {
    if (sending) return;
    var f = af(), pv = preview(), u = pv && pv.u;
    if (!u) { amsg(T('Paste the full link first, the one that starts with https://'), true); $('ir-a-url').focus(); return; }
    if (CFG.addSimple && PRIVATE.some(function (r) { return r.test(u); })) { amsg(T("That's a link to a private chat or group. Only public posts can go here."), true); $('ir-a-url').focus(); return; }
    if (regimeHost(hostOf(u))) { amsg(T("That link is on the regime's servers. Opening it would show them who you are, so it can't go here."), true); $('ir-a-url').focus(); return; }
    if (pv.dup) { amsg(pv.dup.pend ? T('Someone already sent this link. It will be on the map once it is checked.') : T('This one is already in the room. Find something it does not have yet.'), true); return; }
    if (f.what.trim().length < (CFG.addSimple ? 8 : 10)) { amsg(T('Say in one line what it shows, so it can be checked and found.'), true); $('ir-a-what').focus(); return; }
    if ($('ir-a-place').value === 'other' && !f.place) { amsg(T('Write where it is, or pick "Not sure".'), true); $('ir-a-where').focus(); return; }
    keepDraft();
    var mid = f.who === 'mine' ? MISSION.mine : MISSION.find;
    sending = true; $('ir-a-send').disabled = true; amsg(T('Sending...'));
    lp(function (L) {
      if (!L || L.off) { sending = false; $('ir-a-send').disabled = false; amsg(T('Sending is not open on this copy of the site. What you wrote is kept on this device.'), true); return; }
      sstore('ir-add-wait', 1);
      // Not signed in: the sign-in panel opens, and a modal form would sit on top of it. Close the form first; it comes
      // back, filled in, the moment they are in (the subscriber in wire()).
      if (!(L.quests.who && L.quests.who())) closeAdd();
      L.quests.report({ about: 'quest:' + mid, subject: (T('Intel Room: ') + f.what.trim()).slice(0, 80), text: compose(f), url: u, made: f.who === 'mine' }, $('ir-a-send')).then(function (r) {
        sending = false; $('ir-a-send').disabled = false;
        if (r && r.ok) { sstore('ir-add-wait', null); sstore(DKEY, null); sent(f, u, r.post || {}, mid, L); return; }
        var c = r && r.code;
        if (c === 'lp/signin' || c === 'lp/name') { closeAdd(); amsg(T('Sign in, and this comes back with what you wrote. Then press Send it in.')); return; }
        sstore('ir-add-wait', null);
        if (c === 'lp/closed') amsg(T('Sending finds is not open yet. What you wrote is kept on this device; try again later.'), true);
        else amsg(esc((r && r.text) || T('That did not go through. Check your connection and press Send it in again. What you wrote is kept.')), true);
      });
    });
  }
  function sent(f, u, post, mid, L) {
    var me = L.who && L.who() || {};
    var it = parseFind(post.id || String(Date.now()), { text: compose(f), url: u, name: me.name || T('You'), about: 'quest:' + mid, createdAt: Date.now(), kind: ytId(u) ? 'video' : 'link' });
    it.fresh = 1; RD.unshift(it); known = null;
    drawLens();
    var held = post.status === 'held', xp = mid === MISSION.mine ? XP.mine : XP.find;
    $('ir-a').hidden = true;
    var d = $('ir-a-done');
    d.innerHTML = '<div class="ir-a-top"><p class="ir-a-k"><span class="ir-a-badge">' + T('Sent') + '</span></p><button class="ir-s-x" type="button" data-a-x aria-label="' + T('Close') + '">&times;</button></div>' +
      '<h2>' + T('Thank you. It is in.') + '</h2>' +
      '<p>' + T('I check every find, usually within a day: that it opens, and that it shows what you said. Once it is on the map, your name is on it and the <b class="num">{xp} XP</b> is yours. If something is missing, the answer comes under your find and in Replies to you.', { xp: N(xp) }) + '</p>' +
      (held ? '<p class="ir-a-msg bad">' + T('One step left: confirm your email with the link that was sent to you. Until then your find is waiting and only you can see it.') + '</p>' : '') +
      (mid === MISSION.mine ? '<p>' + T('You said you made it, so your account is marked as a creator\'s. Once it is on the map, everyone who uses the room can find it, and creators show the room on their live streams, so their audiences see your work too. Keep sending it: each one that is accepted earns the XP again.') + '</p>' : '') +
      '<div class="ir-a-act"><button type="button" class="ir-a-send" data-a-again>' + T('Send another') + '</button><button type="button" class="ir-s-b" data-a-see>' + T('See it with the other finds') + '</button><a class="ir-a-talk" href="../missions/#' + esc(mid) + '">' + T('Your missions') + '</a></div>';
    d.hidden = false;
  }

  /* ------------------------------------------------------------ wiring */
  function wire() {
    $('ir-ask').addEventListener('submit', function (ev) { ev.preventDefault(); askAny($('ir-q').value); $('ir-q').blur(); });
    $('ir-q').addEventListener('search', function () { if (!$('ir-q').value) clearAll(); });
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      var mic = $('ir-mic'), rec = null; mic.hidden = false;
      mic.addEventListener('click', function () {
        if (rec) { rec.stop(); return; }
        try { rec = new SR(); } catch (e) { mic.hidden = true; return; }
        rec.lang = FA ? 'fa-IR' : document.documentElement.lang || 'en'; rec.interimResults = true; rec.maxAlternatives = 1;
        mic.classList.add('on'); say(T('Listening. Say what you are looking for.'));
        rec.onresult = function (ev) { var s = ''; for (var i = 0; i < ev.results.length; i++) s += ev.results[i][0].transcript; $('ir-q').value = s; if (ev.results[ev.results.length - 1].isFinal) askAny(s); };
        rec.onerror = function (ev) { say(ev.error === 'not-allowed' ? T('The microphone is blocked for this site. Type it instead.') : T('I did not catch that. Try again, or type it.')); };
        rec.onend = function () { mic.classList.remove('on'); rec = null; };
        rec.start();
      });
    }
    // THE WIRE, TAPPED: a finger on the strip stops it (a phone has no hover), and it moves again a moment after
    var wireEl = $('ir-wire'), holdT = 0;
    if (wireEl) {
      wireEl.addEventListener('pointerdown', function () { clearTimeout(holdT); wireEl.classList.add('is-held'); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evn) {
        wireEl.addEventListener(evn, function () { clearTimeout(holdT); holdT = setTimeout(function () { wireEl.classList.remove('is-held'); }, 2500); });
      });
    }
    // Anything on the page that leads to #add opens the form instead of jumping.
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href="#add"]');
      if (!a) return;
      ev.preventDefault(); openAdd(a);
    });
    root.addEventListener('click', function (ev) {
      var t = ev.target.closest ? ev.target : ev.target.parentNode;
      var b;
      if ((b = t.closest('[data-clear]'))) { clearAll(); return; }
      if ((b = t.closest('[data-open]'))) { openDrawer(b.getAttribute('data-open')); return; }
      if ((b = t.closest('[data-dr-x]'))) { closeDrawer(); return; }
      if ((b = t.closest('[data-unpill]'))) { unpill(b.getAttribute('data-unpill')); return; }
      if ((b = t.closest('[data-ltab]'))) { LT = b.getAttribute('data-ltab'); drawLinkList(); drawList(); drawLinkList(); return; }
      if ((b = t.closest('[data-ltype]'))) { LTYPE = b.getAttribute('data-ltype'); drawLinkList(); return; }
      if ((b = t.closest('[data-link]'))) { pickLink(b.getAttribute('data-link')); return; }
      if ((b = t.closest('button[data-lens]'))) { useLens(b.getAttribute('data-lens')); say(''); return; }
      if ((b = t.closest('button[data-pf]'))) {
        var pv = b.getAttribute('data-pf');
        if (pv === '') S.pf = []; else { var pa = S.pf.indexOf(pv); if (pa >= 0) S.pf.splice(pa, 1); else S.pf.push(pv); }
        say(''); render(); return;
      }
      if ((b = t.closest('button[data-seg]'))) { S[b.getAttribute('data-seg')] = +b.getAttribute('data-v') || 0; render(); return; }
      if ((b = t.closest('button[data-wire]'))) { openWire(b.getAttribute('data-wire')); return; }
      if ((b = t.closest('[data-wire-back]'))) { wireBack(); return; }
      if ((b = t.closest('button[data-facet]'))) {          // FACETS: a choice, or the same choice again / All to take it off
        var fk = b.getAttribute('data-facet'), fv = b.getAttribute('data-v');
        if (!fv || S.ext[fk] === fv) delete S.ext[fk]; else S.ext[fk] = fv;
        say(''); render(); return;
      }
      if ((b = t.closest('button[data-preset]'))) {
        var pk = b.getAttribute('data-preset'), pp = PRESETS.filter(function (x) { return x.key === pk; })[0];
        if (pp && presetOn(pp)) presetOff(); else applyPreset(pk);
        closeDrawer(); return;
      }
      if ((b = t.closest('button[data-hot]'))) {
        var hv = b.getAttribute('data-hot');
        if (hv && S.lens !== 'live') useLens('live', true);
        if (!hv) hotRowExt().forEach(function (xk) { delete S.ext[xk]; });          // Everything clears the row's add-on chips too
        S.hot = !hv ? '' : S.hot === hv ? '' : hv;
        if (S.hot) { S.link = ''; S.with = ''; }
        say(''); render(); if (!S.place) frameShown(); return;
      }
      if ((b = t.closest('button[data-fx]'))) {
        var fv = b.getAttribute('data-fx');
        if (!fv) S.fx = []; else { var fa = S.fx.indexOf(fv); if (fa >= 0) S.fx.splice(fa, 1); else S.fx.push(fv); }
        say(''); render(); return;
      }
      if ((b = t.closest('button[data-board]'))) { var bi = shown.indexOf(BOARD_IT); if (bi >= 0) { stopTour(); openSpot(bi); } return; }
      if ((b = t.closest('.ir-chip'))) {
        var v = b.getAttribute('data-t');
        if (v == null) return;
        if (v === '') S.tp = []; else { var at = S.tp.indexOf(v); if (at >= 0) S.tp.splice(at, 1); else S.tp.push(v); }
        say(''); render(); return;
      }
      if ((b = t.closest('#ir-kind button'))) { S.kind = b.getAttribute('data-k'); render(); return; }
      if ((b = t.closest('#ir-top'))) { S.top = !S.top; render(); return; }
      if ((b = t.closest('#ir-edu'))) { S.edu = !S.edu; render(); return; }
      if ((b = t.closest('#ir-stream'))) { stream(); return; }
      if ((b = t.closest('#ir-exit'))) { stream(false); return; }
      if ((b = t.closest('#ir-ctl'))) { openDrawer('all'); return; }
      if ((b = t.closest('#ir-save'))) { drawViews(true); return; }
      if ((b = t.closest('[data-view]'))) { var vw = views()[+b.getAttribute('data-view')]; if (vw) { readUrl(vw.q); render(); if (S.place) focusPlace(S.place); say(T('Showing your view "{name}".', { name: vw.n })); } return; }
      if ((b = t.closest('[data-unview]'))) { var vs = views(); vs.splice(+b.getAttribute('data-unview'), 1); store(VKEY, vs); drawViews(); VHOOK.forEach(function (f) { xcall(f); }); return; }
      if ((b = t.closest('[data-v-cancel]'))) { drawViews(); return; }
      if ((b = t.closest('#ir-copy'))) { copyNotes(); return; }
      if ((b = t.closest('#ir-tour'))) { if (tourT) stopTour(); else startTour(); return; }
      if ((b = t.closest('#ir-lt'))) { var at2 = tourAt; stopTour(); openSpot(at2); return; }
      if ((b = t.closest('#ir-nowhere'))) { S.nowhere = !S.nowhere; S.place = ''; render(); return; }
      if ((b = t.closest('#ir-zoom button'))) {
        var z = b.getAttribute('data-z');
        if (z === 'full') { stream(); return; }
        stopTour();
        poke();
        if (z === 'links') { LKON = !LKON; store('ir-links', LKON ? 'on' : 'off'); b.setAttribute('aria-pressed', LKON ? 'true' : 'false'); b.setAttribute('aria-label', LKON ? T('Hide the connection lines') : T('Show the connection lines')); requestDraw(); say(LKON ? T('Connection lines on: {n} connections in what is shown.', { n: N(LINKS.length) }) : T('Connection lines off.')); return; }
        if (z === 'home') home();
        else if (z === 'proj') setMode(V.mode === 'globe' ? 'flat' : 'globe');
        else zoomAt(z === 'in' ? 1.8 : 1 / 1.8, box.clientWidth / 2, box.clientHeight / 2);
        return;
      }
      if ((b = t.closest('#ir-pre button'))) {
        var p = b.getAttribute('data-pre'), n = buckets.length - 1;
        if (playing) play();
        setRange(p === 'oct7' ? 1 : p === 'year' ? Math.max(1, n - 11) : p === 'month' ? daysFrom(30) : 0, n, p === 'month' ? 30 : 0);
        return;
      }
      if ((b = t.closest('#ir-play'))) { play(); return; }
      if ((b = t.closest('#ir-pics'))) { setPics(!picsOn); return; }
      if ((b = t.closest('#ir-more'))) { limit += PAGE_N; $('ir-items').insertAdjacentHTML('beforeend', shown.slice(limit - PAGE_N, limit).map(function (it, j) { return card(it, limit - PAGE_N + j); }).join('')); $('ir-more').hidden = shown.length <= limit; $('ir-more').textContent = moreText(); return; }
      if ((b = t.closest('.ir-card button'))) { stopTour(); openSpot(+b.getAttribute('data-i')); return; }
    });
    root.addEventListener('submit', function (ev) {
      if (ev.target.id !== 'ir-v-f') return;
      ev.preventDefault(); var n = ($('ir-v-n').value || '').trim(); if (n) saveView(n);
    });
    $('ir-place').addEventListener('change', function () {
      var v = this.value;
      S.nowhere = v === 'global'; S.place = v === 'global' ? '' : v;
      render();
      if (S.place) focusPlace(S.place);
    });
    $('ir-sort').addEventListener('change', function () { S.sort = this.value; render(); });
    ['ir-from', 'ir-to'].forEach(function (id) {
      $(id).addEventListener('input', function () { if (playing) play(); var a = +$('ir-from').value, b = +$('ir-to').value; S.from = Math.min(a, b); S.to = Math.max(a, b); S.days = 0; render(); });
    });
    var dlg = $('ir-spot');
    dlg.addEventListener('click', function (ev) {
      if (ev.target === dlg) { closeSpot(); return; }
      if (ev.target.closest('[data-close-spot]')) { closeSpot(); return; }      // the discussion link: discussion.js fills the box from it
      var b = ev.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-x')) closeSpot();
      else if (b.hasAttribute('data-step')) openSpot(spotAt + (+b.getAttribute('data-step')));
      else if (b.hasAttribute('data-back')) { var bk = SPOTL && SPOTL.back; closeSpot(); if (bk) xcall(bk); }
      else if (b.hasAttribute('data-rp-all')) { var rit = spotList()[spotAt]; repliesOf(rit, function (e) { if (e && e.r.length) { var bx = $('ir-s-rp'); if (bx) bx.innerHTML = repliesHead(rit, e) + repliesHtml(rit, e.r, false); } }); }
      else if (b.hasAttribute('data-pics1')) { var pit = spotList()[spotAt]; if (pit) { pit._pics = 1; openSpot(spotAt); } }
      else if (b.hasAttribute('data-copyt')) { var cit = spotList()[spotAt]; if (cit) { var ct = postText(cit); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ct).then(function () { b.textContent = T('Headline copied.'); }, function () { fallbackCopy(ct, function () { b.textContent = T('Headline copied.'); }); }); else fallbackCopy(ct, function () { b.textContent = T('Headline copied.'); }); } }
      else if (b.hasAttribute('data-play')) { hush(null); var v = b.parentNode; v.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-play') + '?autoplay=1&rel=0" title="' + esc(T('Video')) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>'; }
      else if (b.hasAttribute('data-with')) { var wid = b.getAttribute('data-with'); closeSpot(); S.with = wid; S.link = ''; S.hot = ''; LT = 'items'; render(); frameShown(); var wi2 = itemById(wid); say(T('What connects to "{what}": {n} items.', { what: cut(wi2 ? wi2.t : '', 60), n: N(shown.length) }), true); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      else if (b.hasAttribute('data-who')) { var wk = b.getAttribute('data-who'), wit = spotList()[spotAt]; closeSpot(); clearAll(); S.who = wk; render(); frameShown(); say(T('Every post here from {who}: {n}.', { who: wit ? whoName(wit) : wk, n: N(shown.length) }), true); $('ir-items').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      else if (b.hasAttribute('data-map')) { var mit = spotList()[spotAt]; if (!mit) return; var k = mit.p; closeSpot(); pulseAt(k); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    });
    dlg.addEventListener('cancel', function () { spotAt = -1; SPOTL = null; setTimeout(function () { dlg.innerHTML = ''; }, 0); });
    // closed by any route at all: empty it, so a video in it cannot go on playing where nobody can see or stop it
    dlg.addEventListener('close', function () { if (!dlg.open) { spotAt = -1; SPOTL = null; dlg.innerHTML = ''; } });
    var dr = $('ir-drawer');
    if (dr) dr.addEventListener('click', function (ev) { if (ev.target === dr) closeDrawer(); });
    var ad = $('ir-add');
    ad.addEventListener('click', function (ev) {
      if (ev.target === ad) { closeAdd(); return; }
      var b = ev.target.closest('[data-a-x]'); if (b) { if (b.tagName !== 'A') ev.preventDefault(); closeAdd(); return; }
      if (ev.target.closest('[data-a-again]')) { ad.innerHTML = addHtml(); $('ir-a-url').focus(); return; }
      if (ev.target.closest('[data-a-see]')) { closeAdd(); useLens('readers'); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if ((b = ev.target.closest('[data-at]'))) {
        var on = b.getAttribute('aria-pressed') === 'true', n = ad.querySelectorAll('.ir-a-tops [aria-pressed="true"]').length;
        if (!on && n >= 3) { amsg(T('Three topics at most. Untick one first.'), true); return; }
        b.setAttribute('aria-pressed', on ? 'false' : 'true'); amsg(''); keepDraft(); return;
      }
      if (ev.target.closest('#ir-a-paste')) {
        navigator.clipboard.readText().then(function (s) { $('ir-a-url').value = String(s || '').trim().slice(0, 400); preview(); keepDraft(); $('ir-a-what').focus(); }, function () { $('ir-a-paste').hidden = true; amsg(T('Paste it into the box with a long press, or Ctrl and V.')); });
      }
    });
    ad.addEventListener('input', function (ev) {
      if (ev.target.id === 'ir-a-url') { preview(); amsg(''); }
      if (ev.target.name === 'ir-who') whoChanged();
      keepDraft();
    });
    ad.addEventListener('change', function (ev) {
      if (ev.target.id === 'ir-a-place') { $('ir-a-where').hidden = ev.target.value !== 'other'; if (ev.target.value === 'other') $('ir-a-where').focus(); }
      if (ev.target.name === 'ir-who') whoChanged();
      keepDraft();
    });
    ad.addEventListener('paste', function (ev) { if (ev.target.id === 'ir-a-url') setTimeout(function () { preview(); keepDraft(); if (preview()) $('ir-a-what').focus(); }, 0); });
    ad.addEventListener('submit', function (ev) { ev.preventDefault(); sendAdd(); });
    ad.addEventListener('close', function () { if (location.hash === '#add' && history.replaceState) history.replaceState(null, '', location.pathname + location.search); });
    document.addEventListener('keydown', function (ev) {
      if (SHOWING) return;          // the show screen has its own keys
      // typing in a box (the search, a form inside a dialog) never moves anything
      var typing = ev.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) || ev.target.isContentEditable);
      // the arrow that points at the Next button moves forward: on a right-to-left page Next is drawn on the left
      var arrow = ev.key === 'ArrowRight' || ev.key === 'ArrowLeft', fwd = (ev.key === 'ArrowRight') !== !!CFG.rtl ? 1 : -1;
      if (dlg.open && arrow && !typing) { var s = spotAt + fwd; if (s >= 0 && s < spotList().length) openSpot(s); return; }
      if (dr && dr.open) return;
      if (!typing && !dlg.open && !ad.open && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        if (ev.key === 'f' || ev.key === 'F') { stream(); return; }
        if (tourT && arrow) { tourStep(fwd); clearInterval(tourT); tourT = setInterval(function () { tourStep(1); }, TOUR_MS); return; }
      }
      if (ev.key === 'Escape' && document.documentElement.classList.contains('ir-show') && !dlg.open && !ad.open) stream(false);
      if (ev.target === document.body || (ev.target.closest && ev.target.closest('.ir-mapbox'))) {
        if (ev.key === '+' || ev.key === '=') zoomAt(1.5, box.clientWidth / 2, box.clientHeight / 2);
        if (ev.key === '-') zoomAt(1 / 1.5, box.clientWidth / 2, box.clientHeight / 2);
      }
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.closest && ev.target.closest('.ir-pin,.ir-gl,.ir-edge,.ir-lk')) { ev.preventDefault(); openPin(pinAt(ev.target)); }
    });
    document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && document.documentElement.classList.contains('ir-show')) stream(false); });
    map.addEventListener('pointerdown', onDown);
    map.addEventListener('pointermove', onMove);
    map.addEventListener('pointerup', onUp);
    map.addEventListener('pointercancel', onUp);
    map.addEventListener('pointerleave', function () { $('ir-tip').hidden = true; });
    /* The wheel and the page (16 October 2026, Armin: "it's really difficult to scroll up and down ... the map goes up and
       down, and the page goes up and down ... especially when I click on full screen"). On the page, the wheel scrolls the
       PAGE, over the map and over everything on it, until the map is clicked or Ctrl (Cmd on a Mac) is held; then it zooms
       the map, until the pointer leaves it. On the full screen the page does not move at all and the wheel always zooms. A
       pinch on a trackpad arrives as the wheel with Ctrl held, so it zooms the map. */
    box.addEventListener('wheel', function (ev) {
      if (!(isFull() || mapOn || ev.ctrlKey || ev.metaKey)) { mapHint('wheel'); return; }
      ev.preventDefault(); stopTour(); poke(); var r = box.getBoundingClientRect();
      zoomAt(Math.exp(-ev.deltaY * (ev.deltaMode ? 0.05 : 0.0018)), ev.clientX - r.left, ev.clientY - r.top);
    }, { passive: false });
    box.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') mapOn = false; });
    document.addEventListener('pointerdown', function (ev) { if (!box.contains(ev.target)) mapOn = false; }, true);
    var rt = 0;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(refit, 120); });
    window.addEventListener('hashchange', function () { if (location.hash === '#add') openAdd(); });
    // Signing in on the way to sending: the form comes back as it was left.
    lp(function (L) { if (L && L.quests && L.quests.sub) L.quests.sub(function () { if (sstore('ir-add-wait') && L.quests.who && L.quests.who()) { sstore('ir-add-wait', null); setTimeout(function () { openAdd(); amsg(T(CFG.addSimple ? 'You are signed in. Press Send.' : 'You are signed in. Press Send it in.')); }, 400); } }); });
  }

  /* ------------------------------------------------------------ start */
  /* ONE FEED SHAPE MORE (Iran Uncensored, CFG.live === 'news'): its Newsroom file, "schema": 1, written hourly by
     ../../site/build/intel_live.py --site iu and pushed alone to the live site. Its items name provinces (pv) and topic
     indices into the file's own topic keys; a headline that names no province is placed by CFG.livePlaces (the Gulf,
     Israel, Washington...) or, failing those, at Iran as a whole. Its topics are the pipeline's own tags (the same patterns
     the room reads). Heat is put in words here, from its counts: how many outlets carry it, or how fast a video is watched. */
  var NEWS_TK = [], LIVE_PL = Array.isArray(CFG.livePlaces) ? CFG.livePlaces.map(function (a) { return [rxOf(a, 0), a[2]]; }) : [];
  function hw(h) { h = +h || 0; if (h < 1) return T('{n} minutes', { n: N(Math.max(1, Math.round(h * 60))) }); h = Math.round(h); return h === 1 ? T('1 hour') : T('{n} hours', { n: N(h) }); }
  function normNews(it) {
    var keys = (Array.isArray(it.pv) ? it.pv : []).filter(function (k) { return typeof k === 'string' && P[k]; });
    if (!keys.length) {
      var w = String(it.t || '').replace(/\u200c/g, '');
      LIVE_PL.forEach(function (pw) { if (keys.length < 4 && keys.indexOf(pw[1]) < 0 && P[pw[1]] && pw[0].test(w)) keys.push(pw[1]); });
    }
    if (!keys.length) keys = [CFG.liveHome || 'global'];
    it.p = keys[0]; it.a = keys.slice(1);
    it._tk = (Array.isArray(it.tp) ? it.tp : []).map(function (i) { return NEWS_TK[i]; }).filter(function (k, i, a) { return k && TOPN[k] && a.indexOf(k) === i; });
    it.tp = [];
    if (FA && it.hf) it.h = String(it.hf);
    if (it.src === 'YouTube' && it.vw >= 0) it.hotWhy = T('{n} views in {h}', { n: LN(+it.vw), h: hw(it.hs) });
    else if (it.no > 1) it.hotWhy = T('{n} outlets in {h}', { n: N(it.no), h: hw(it.hs) });
    if (it.src === 'X' && it.nm && it.h && String(it.h).charAt(0) !== '@') it.h = '@' + it.h;
    // 23 Oct 2026: the pictures, faces and whole posts stay (they were deleted here, so the Iran room never showed one, on
    // either page, against its own README). Whether one LOADS is vis()'s call alone: on, unless the reader switched
    // pictures off (CFG.light). A regime item never carries a picture (intel_live.py check_news).
    delete it.pv;
    if (it.rg) { delete it.th; }
    return it;
  }
  function normLive(it) {
    if (CFG.live === 'news') normNews(it);
    // The feed may name a whole country (c:Iran): it is drawn at that country's own place when there is one, else at its
    // first place on the map, and filtered as that country.
    if (typeof it.p === 'string' && it.p.indexOf('c:') === 0) {
      var c = it.p.slice(2), ks = Object.keys(P).filter(function (k) { return P[k][1] === c && P[k][2] != null; });
      var own = ks.filter(function (k) { return P[k][0] === c || P[k][0] === cName(c); })[0];
      it.p = own || ks[0] || 'global';
      if (it.p === 'global') it.pw = c;
    }
    if (!P[it.p]) it.p = 'global';
    it.tp = (it.tp || []).filter(function (i) { return topics[i]; });
    it.id = 'L' + it.id;
    // news and YouTube are an article or a video; an X post keeps what it carries (a post, an image, a video, an article)
    it.k = it.src === 'X' ? (['post', 'image', 'video', 'article'].indexOf(it.k) >= 0 ? it.k : 'post') : it.k === 'video' ? 'video' : 'article';
    if (it.src !== 'X') { delete it.m; delete it.sn; delete it.av; delete it.cd; delete it.tx; delete it.qt; delete it.ry; delete it.nt; delete it.po; }
    else if (!it.th && !it.sn && mediaOf(it).length) it.th = pic(mediaOf(it)[0], '240x240');
    if (it.src === 'News' && BING_RX.test(it.th || '')) it.th0 = it.th.replace(/&w=240&h=150&c=7$/, '');          // th: the list's size
    return it;
  }
  var liveUrl = root.getAttribute('data-live'), reachUrl = root.getAttribute('data-reach');
  function soft(u, opt) { return u ? fetch(u, opt).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }) : Promise.resolve(null); }
  Promise.all([fetch(root.getAttribute('data-src')).then(function (r) { if (!r.ok) throw r; return r.json(); }),
               G ? soft(root.getAttribute('data-geo')) : Promise.resolve(null),
               soft(liveUrl, { cache: 'no-cache' }), soft(reachUrl, { cache: 'no-cache' }),
               soft(root.getAttribute('data-packs'), { cache: 'no-cache' }), soft(root.getAttribute('data-words'), { cache: 'no-cache' }),
               soft(root.getAttribute('data-deep'), { cache: 'no-cache' })]).then(function (res) {
    D = res[0]; BANK = D.items; P = D.places; topics = D.topics;
    if (CFG.live === 'news' && res[2] && (res[2].schema !== CFG.schema || !Array.isArray(res[2].topics))) res[2] = null;          // an unknown shape is refused; the headlines the page came with stay
    if (CFG.live === 'news' && res[2]) NEWS_TK = res[2].topics.map(String);
    if (res[2] && Array.isArray(res[2].items)) { LIVE_AT = Date.parse(res[2].at) || 0; LIVE = res[2].items.filter(function (it) { return it && it.u && it.t; }).map(normLive); }
    PACKS = res[4] && Array.isArray(res[4].stories) ? res[4] : null;
    var dp = res[6];
    if (dp && Array.isArray(dp.items) && dp.stories && typeof dp.stories === 'object') {
      FACE_YT = dp.faces && dp.faces.yt || {}; FACE_DOM = dp.faces && dp.faces.dom || {};
      if (LIVE.length && PACKS && dp.packs === PACKS.at) {          // the found items of this hour's stories, never another hour's
        var haveU = {}; LIVE.forEach(function (it) { haveU[it.u] = 1; });
        dp.items.forEach(function (it) { if (it && it.u && it.t && it.d && !haveU[it.u]) { haveU[it.u] = 1; it = normLive(it); it._deep = 1; LIVE.push(it); } });
        DEEP = dp; DEEP_FRESH = true;
      }
    }
    WORDS = res[5] && res[5].stories && typeof res[5].stories === 'object' ? res[5] : null;
    makeHots();
    if (res[3] && res[3].by && typeof res[3].by === 'object') { REACH = res[3].by; REACH_AT = Date.parse(res[3].at) || 0; }
    computeViral();
    // an order with nothing to order by is not offered (no like counts read yet, say)
    ['live', 'bank'].forEach(function (l) {
      var set = ownOf(setOf(l));
      SORTS[l] = SORTS[l].filter(function (o) { var f = o[0] === 'viral' ? function (it) { return it._v; } : o[0] === 'likes' ? likesOf : o[0] === 'views' ? viewsOf : null; return !f || set.some(function (it) { return f(it) != null; }); });
    });
    // The glow behind each circle: gold for the bank and the readers, a warmer white gold for the last 24 hours.
    map.insertAdjacentHTML('afterbegin', '<defs><radialGradient id="irg"><stop offset="0" stop-color="' + GOLDH + '" stop-opacity=".5"/><stop offset="1" stop-color="' + GOLDH + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="irl"><stop offset="0" stop-color="#FFE7A8" stop-opacity=".65"/><stop offset="1" stop-color="#FFB547" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="irs"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>');
    gLinks = document.createElementNS(SVGNS, 'g'); gLinks.setAttribute('class', 'links');
    map.appendChild(gLinks);
    gPins = document.createElementNS(SVGNS, 'g'); gPins.setAttribute('class', 'pins');
    map.appendChild(gPins);
    picsLabel();          // the switch says what this device does: on, unless this reader turned pictures off
    var lkb = $('ir-lk'); if (lkb) { lkb.setAttribute('aria-pressed', LKON ? 'true' : 'false'); lkb.setAttribute('aria-label', LKON ? T('Hide the connection lines') : T('Show the connection lines')); }
    var seenNow = function () { store('ir-seen', Date.now()); };
    window.addEventListener('pagehide', seenNow);
    document.addEventListener('visibilitychange', function () { if (document.hidden) seenNow(); });
    cv = $('ir-globe');
    if (G && res[1] && res[1].objects && cv && cv.getContext) {
      ctx = cv.getContext('2d');
      GRAT = G.geoGraticule().step([15, 15])();
      LAND = topoFeatures(res[1], BYNAME);
      if (store('ir-proj') === 'flat') V.mode = 'flat';
      root.setAttribute('data-map', V.mode);
      var pb = $('ir-proj'); if (pb) { pb.setAttribute('data-mode', V.mode); pb.setAttribute('aria-label', V.mode === 'globe' ? T('Lay the map flat') : T('Show the globe')); }
      sizeCanvas();
      V.lon = CFG.view0 ? CFG.view0[0] : -50; V.lat = CFG.view0 ? CFG.view0[1] : 18;          // the first view turns in from the west
    } else $('ir-maphint').textContent = T('The map could not load. Everything is in the list.');
    $('ir-kind').innerHTML = KINDS.map(function (k) { return '<button type="button" data-k="' + k[0] + '" aria-pressed="false">' + k[1] + '</button>'; }).join('');
    makeBuckets();
    defLens = liveFresh() ? 'live' : 'bank';
    readUrl(location.search);
    $('ir-bar').hidden = false; $('ir-zoom').hidden = !LAND;
    if (LAND) setView(V.lon, V.lat, V.k, true);
    wire();
    render();
    drawViews();
    drawWire();
    // a phone's box is near square: open on the Middle East and Europe, where most of the bank is
    if (S.place) focusPlace(S.place);
    else if (HOME) home();
    else if (box.clientWidth >= 700) frameShown();
    else flyTo(V.mode === 'globe' ? 1.25 : 3, 36, 31);
    // What intel-prep.js (the creator tools and the show screen) is handed: the items (the last hours, the bank, one by its
    // id: L for the last hours, B for the bank, R for a reader's find), and the room's own words and marks for them.
    var BYID = {};
    LIVE.forEach(function (it) { BYID[it.id] = it; }); BANK.forEach(function (it) { BYID['B' + it.id] = it; it._code = 'B' + it.id; });
    window.IRoom = { shown: function () { return shown.slice(); }, lens: function () { return S.lens; }, said: function () { return $('ir-said').textContent; },
      live: function () { return LIVE.slice(); }, bank: function () { return BANK.slice(); }, liveAt: function () { return LIVE_AT; },
      byId: function (id) { return BYID[id] || RD.filter(function (it) { return it.id === id; })[0] || null; },
      topics: function () { return TOPICS.map(function (t) { return t[1]; }); }, topicsOn: function () { return S.tp.map(topicName); }, subjects: tkOf,
      when: function (it) { return fmtDate(it.d); }, where: function (it) { return it.p === 'global' && it.pw ? it.pw : placeName(it.p); },
      code: function (it) { return it._code || String(it.id); }, pf: pfOf, kind: kindOf, mark: function (it) { return mark(it); }, fmt: fmtN, yt: ytId, vshape: vShape,
      reach: function (it) { var r = reachOf(it); return r && !r.x ? { likes: r.lk, views: r.vw, replies: r.rp, platform: pfName(pfOf(it)), viral: it._v } : null; },
      // for the show maker: the stories (hot topics) and their written words, which story an item is in, the filters in
      // words, and a call after every redraw
      packs: function () { return PACKS; }, words: function () { return WORDS; }, hots: function () { return HOTS.slice(); },
      brief: function () { var t = hotTop(); return t.length ? { url: briefUrl(t), n: t.length } : null; },          // the quick briefing, offered inside the show maker
      storyOf: function (it) { return STORY_OF[it.id] || null; }, filterLine: filterLine, likes: likesN, fx: fxOf,
      focusName: function (k) { return FXI[k] != null ? FOCUS[FXI[k]][1] : ''; }, focusOn: function () { return S.fx.slice(); },
      placeOf: function (it) { return P[it.p] ? P[it.p][1] : ''; }, onRender: function (f) { RHOOK.push(f); },
      // an X post's pictures and video: the block, its clicks (fallback replaces a video that will not play), full screen
      media: mediaOf, mediaHtml: mediaHtml, wireMedia: wireMedia, lightbox: lightbox, dur: fmtDur, vis: vis, heroHtml: heroHtml,
      // the most-liked replies and a post's whole text, for the show screen (18 Oct 2026)
      rpKey: rpKey, repliesOn: RP_ON, replies: repliesOf, rpAsk: rpAsk, repliesHtml: repliesHtml, repliesHead: repliesHead, repliesNone: repliesNone, fullText: fullText, postText: postText, refHtml: refHtml, refLine: refLine, avOf: avOf, ago: ago,
      // regime media (Iran Uncensored): the show maker leaves it out of every show, and a saved show never links it
      regime: isRegime,
      // ADD-ONS (23 Oct 2026, see LAYERS): the map, the items of the lens, opening one, a filter in the address, a list tab,
      // a block in the spotlight. build/intel-forces.js is the first user.
      map: { svg: map, pins: function () { return gPins; }, box: box, proj: function () { return PJ; }, seen: seen, fly: flyTo, fit: fitTo, redraw: requestDraw,
        view: function () { return { k: V.k, lon: V.lon, lat: V.lat, mode: V.mode, w: CW, h: CH }; }, addLayer: function (L) { LAYERS.push(L); requestDraw(); },
        // where the news circles are on the screen this frame (x, y and the radius they cover, ring and halo included), so
        // an add-on's marks can stand clear of them and never hide a count (23 Oct 2026, Armin: "The military stuff is
        // blocking the number in the middle of that circle")
        marks: function () { return pinData.map(function (m) { return { x: m.x, y: m.y, r: m.exp ? footR(m.m) + 3 : pinR(m.n) + 7 }; }); } },
      items: function () { return items.slice(); }, place: function (k) { return P[k] ? { name: P[k][0], country: P[k][1], lat: P[k][2], lon: P[k][3] } : null }, keys: keysOf,
      open: function (it) { var i = shown.indexOf(it); if (i < 0) return false; openSpot(i); return true; },
      // an add-on's own list in the spotlight, stepping through it, with "Back to <label>" calling back (24 Oct 2026, SPOTL)
      openList: function (list, i, o) {
        if (!Array.isArray(list) || !list[i]) return false;
        o = o || {}; stopTour();
        SPOTL = { list: list.slice(), label: String(o.label || ''), back: typeof o.back === 'function' ? o.back : null };
        openSpot(i); return true;
      },
      cardHtml: cardFor, pics: function () { return pics(); },
      addFilter: function (f) {
        EXT[f.key] = f;
        var v = RAWQ && RAWQ.get(f.key);
        if (v && xcall(f.valid, v)) { S.ext[f.key] = v; render(); frameShown(); }
      },
      filter: function (key, v) { if (v == null || v === '') delete S.ext[key]; else S.ext[key] = String(v); stopTour(); render(); frameShown(); },
      filterOn: function (key) { return S.ext[key] || ''; },
      // THE ROOM'S FILTER REGISTRY (FACETS) and its one-tap views (PRESETS), for anything that reads plain words: a facet
      // is set with filter(key, value); its ask rows are [pattern, value, what it says]. preset(key) applies one.
      facets: FACETS, presets: PRESETS, preset: applyPreset,
      addTab: function (key, t) { LTX[key] = t; drawLinkList(); },
      tab: function (key) { LT = LTX[key] || key === 'links' ? key : 'items'; drawList(); drawLinkList(); },
      tabOn: function () { return LT; },
      addSpot: function (f) { SPOTX.push(f); }, spread: spreadOf, rendered: function () { render(); },
      // a mark on every card's meta line, after the room's own (23 Oct 2026: the Iran room's camp of each source, news-camps.js)
      addBadge: function (f) { BADGEX.push(f); drawList(); },
      // SAVE LISTS (24 Oct 2026, intel-prep.js): the Save button beside every card and in the spotlight's buttons; the people
      // and countries an item names (the run order groups by them); and the address handed back when a list's page closes
      addCardX: function (f) { CARDX = f; drawList(); }, addSpotAct: function (f) { SPOTA.push(f); },
      actors: actorsOf, names: namesOf, showing: function (on) { SHOWING = !!on; if (!on) writeUrl(); },
      // THE ASK BOX (24 Oct 2026, build/intel-ask.js, see THE ASK BOX'S HANDS): it answers the search box, reads what the
      // room understands, counts a set of filters without drawing it, puts one on the screen, and keeps the saved views
      askWith: function (f) { ASKX = typeof f === 'function' ? f : null; }, vocab: askVocab, state: snapS, blank: blankS, peek: peekS, apply: applyS, query: query, go: goQ,
      views: views, setViews: function (v) { store(VKEY, Array.isArray(v) ? v.slice(0, 12) : []); drawViews(); }, onViews: function (f) { VHOOK.push(f); },
      openFilters: openDrawer, say: say };
    (root.getAttribute('data-addons') || '').split(' ').filter(Boolean).forEach(function (src, i) {          // the page's add-ons (intel.py), after the room is ready
      if (document.getElementById('ir-addon-' + i)) return;
      var as = document.createElement('script'); as.id = 'ir-addon-' + i; as.src = src; document.body.appendChild(as);
    });
    if (!document.getElementById('ir-prep-js') && CFG.prep !== false) { var ps = document.createElement('script'); ps.id = 'ir-prep-js'; ps.src = root.getAttribute('data-prep') || '../assets/intel-prep.js?v=1bec8431b4'; document.body.appendChild(ps); }
    root.setAttribute('data-ready', '1');
    loadReaders();
    setupSuggest();
    if (location.hash === '#add') openAdd();
    setTimeout(function () { var h = $('ir-maphint'); if (h) h.hidden = true; }, 6000);
  }).catch(function () {
    $('ir-maphint').textContent = T('The map could not load. The newest items are listed here.');
  });
})();
