/* Brand pages (brand/ on libertypolitics.com): one brand, for the person it belongs to and for Armin.

   community.js must be on the page first: it hands this file Firebase and the signed-in reader (window.LP.room).
   WHO GETS IN is decided by the rules (firestore.rules, brandpages): an account named in a page's members list, and
   an admin. Everyone else sees one line and a sign-in button. The words of a page and its pictures are put in the
   database by build/brandpage.py with the site's own key; nothing about a person's brand is in the public build.
   What the owner does here is saved at once under brandpages/<page>/mine/<key> (a look picked, a like, their story,
   their words, a step of the plan done) and notes/ (what they tell the site, each about one thing: a design, a
   picture 'file:<id>', a text 'w:<platform>:<k>', a section), and read by brandpage.py inbox. Runbook: ../README.md,
   "Brand pages".

   The order of a person's page is the brief (Armin, 17 Oct 2026): the designs first, as big pictures of the brand in
   use; then that nothing is final and every piece gets better when she talks to it; then the plan, her story, every
   text every platform needs, and the kit. English only: brand pages exist on this site alone. A person's words reach
   the page through textContent.

   The page itself gets better from what the team says (Armin, 17 Oct 2026): every page has "Make this page better for
   the whole team", whose notes carry about 'page:feature' / 'page:fix' / 'page:idea', and the list of what the team
   asked for and what was decided, `teamlog` on each page's document, written by brandpage.py log from
   data/brand-teamlog.json. The same list is on every page, so what one member asked for is seen by all.

   THE VOICE (Armin, 17 Oct 2026: "People need to fall in love with the character of the page as their best friend ...
   'Oh, here's what I did for you. Ask me this, tell me this'"): the page is Liberty Politics speaking (characters.md),
   so it says I, never we or "the team"; it greets the person by name, says what it did for them since their last visit
   (only deeds that exist: its answers, a new draft, what it built for a teammate) and asks them one real thing. Armin is
   named where he decides.

   THE DATA HAS A SCHEMA (17 Oct 2026: a cached old script drew the new words as cards called 0, 1, 2 reading
   "undefined"). brandpage.py writes `schema` into every page's JSON; this script draws only a schema it knows and
   otherwise offers to load the new version. Never a blank, "undefined" or "NaN": brand-test.html scans for them. */
const SCHEMA = 2;

const D = document, $ = id => D.getElementById(id);
const BOX = $('bp');
let R = null, el = null, btn = null;
const ST = { uid: '', pages: [], key: '', doc: null, files: [], mine: {}, notes: [], urls: [], busy: false, look: '', wp: '', full: {}, done: {}, log: [], ptype: 'feature', cmp: '', last: 0, sent: [], skind: 'me', sentOk: true };
const T = x => (x === undefined || x === null || (typeof x === 'number' && !isFinite(x))) ? '' : String(x);      // nothing undefined ever reaches the page

const CSS = `
#bp{--bp-gap:clamp(36px,7vw,64px)}
#bp .bp-top{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
#bp .bp-chip{font:inherit;font-weight:700;font-size:.95rem;min-height:44px;padding:8px 16px;border:1px solid var(--line);border-radius:999px;background:var(--panel);color:var(--ink);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
#bp .bp-chip[aria-current="true"],#bp .bp-chip[aria-pressed="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
#bp .bp-ic{display:inline-flex;flex:none}
#bp .bp-ic svg{display:block}
#bp .bp-hero{position:relative;border-radius:calc(var(--r) * 2);overflow:hidden;background:var(--sunk);border:1px solid var(--line)}
#bp .bp-hero img{display:block;width:100%;aspect-ratio:3/1;object-fit:cover}
#bp .bp-hello{display:flex;gap:14px;align-items:center;margin:0 0 6px}
#bp .bp-face{flex:none;width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid var(--line);background:var(--sunk)}
#bp h1{font-family:var(--display);font-weight:900;font-size:clamp(1.9rem,6.5vw,3.2rem);line-height:1.02;margin:0;text-transform:uppercase;letter-spacing:.01em}
#bp .bp-lede{color:var(--dim);font-size:1.06rem;line-height:1.5;margin:8px 0 0;max-width:44rem}
#bp .bp-lede b{color:var(--ink)}
#bp .bp-tag{display:inline-flex;align-items:center;gap:6px;font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--field);border:1px solid var(--field-edge);border-radius:99px;padding:3px 10px;white-space:nowrap}
/* the designs: one big picture each, side by side on a computer, swiped on a phone */
#bp .bp-looks{display:grid;grid-auto-flow:column;grid-auto-columns:88%;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;margin:18px calc(var(--gutter) * -1) 0;padding:0 var(--gutter) 6px;scrollbar-width:none}
#bp .bp-looks::-webkit-scrollbar{display:none}
@media (min-width:960px){#bp .bp-looks{grid-auto-flow:row;grid-template-columns:repeat(3,1fr);overflow:visible;margin:22px 0 0;padding:0}#bp .bp-pager{display:none}}
#bp .bp-look{scroll-snap-align:center;border:1px solid var(--line);border-radius:calc(var(--r) * 2);background:var(--panel);overflow:hidden;display:flex;flex-direction:column;min-width:0}
#bp .bp-look.picked{border-color:var(--field);box-shadow:0 0 0 2px var(--field)}
#bp .bp-shot{position:relative;margin:0;background:var(--sunk);aspect-ratio:4/5;overflow:hidden}
#bp .bp-shot img{width:100%;height:100%;object-fit:cover;display:block;transition:filter .3s}
#bp .bp-shot img.soft{filter:blur(6px)}
#bp .bp-badge{background:var(--field);color:var(--on-field);font-weight:800;font-size:.85rem;padding:5px 12px;border-radius:99px}
#bp .bp-mine{background:var(--ink);color:var(--bg);font-weight:800;font-size:.85rem;padding:5px 12px;border-radius:99px;display:inline-flex;gap:6px;align-items:center}
#bp .bp-look .body{padding:16px;display:flex;flex-direction:column;gap:12px;flex:1}
#bp .bp-look h3{margin:0;font-size:1.5rem;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
#bp .bp-look p{margin:0;line-height:1.5}
#bp .bp-why{color:var(--dim);font-size:.95rem}
#bp details.bp-more{border-top:1px solid var(--line);padding-top:4px}
#bp details.bp-more summary{cursor:pointer;font-weight:700;min-height:44px;display:flex;align-items:center;list-style:none}
#bp details.bp-more summary::-webkit-details-marker{display:none}
#bp details.bp-more summary::after{content:'+';margin-inline-start:auto;font-size:1.3rem;color:var(--dim)}
#bp details.bp-more[open] summary::after{content:'−'}
#bp .bp-dots{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
#bp .bp-dots span{width:30px;height:30px;border-radius:50%;border:1px solid var(--line)}
#bp .bp-type{color:var(--dim);font-size:.88rem}
/* one design: the whole width, its brand book large */
#bp .bp-looks.one{grid-auto-columns:100%;margin-inline:0;padding-inline:0}
@media (min-width:960px){#bp .bp-looks.one{grid-template-columns:minmax(0,1fr)}#bp .bp-looks.one .bp-look{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);align-items:start}}
#bp .bp-book{background:var(--sunk);min-width:0}
#bp .bp-book-strip{display:grid;grid-auto-flow:column;grid-auto-columns:100%;overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;scrollbar-width:none}
#bp .bp-book-strip::-webkit-scrollbar{display:none}
#bp .bp-book-page{margin:0;scroll-snap-align:start;aspect-ratio:4/5}
#bp .bp-book-open{display:block;width:100%;height:100%;padding:0;border:0;background:none;cursor:zoom-in}
#bp .bp-book-open img{width:100%;height:100%;object-fit:cover;display:block;transition:filter .3s}
#bp .bp-book-open img.soft{filter:blur(6px)}
#bp .bp-book-bar{display:flex;align-items:center;gap:6px;padding:4px 6px;border-top:1px solid var(--line)}
#bp .bp-book-cap{flex:1;margin:0;text-align:center;font-weight:700;font-size:.92rem;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#bp .bp-book-nav{width:44px;height:44px;flex:none;border:1px solid var(--line);border-radius:50%;background:var(--panel);color:var(--ink);display:grid;place-items:center;cursor:pointer;padding:0}
.bp-full{position:fixed;inset:0;z-index:999;background:rgba(10,12,16,.92);display:flex;align-items:center;justify-content:center;padding:12px;cursor:zoom-out}
.bp-full img{max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.bp-full-x{position:absolute;top:12px;right:12px;min-height:44px;padding:8px 16px;border-radius:99px;border:0;background:#fff;color:#111;font-weight:700;cursor:pointer}
#bp .bp-pager{display:flex;justify-content:center;align-items:center;gap:2px;margin:6px 0 0}
#bp .bp-pager button{width:44px;height:44px;border:0;background:none;cursor:pointer;display:grid;place-items:center;padding:0}
#bp .bp-pager button i{width:9px;height:9px;border-radius:50%;background:var(--line);transition:width .25s,background .25s}
#bp .bp-pager button[aria-current="true"] i{width:24px;border-radius:99px;background:var(--field)}
#bp .bp-hint{color:var(--dim);font-size:.9rem;text-align:center;margin:0}
#bp .bp-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto}
#bp .bp-acts button,#bp .bp-btn{font:inherit;font-weight:700;font-size:.95rem;min-height:44px;padding:8px 14px;border:1px solid var(--line);border-radius:var(--r);background:var(--bg);color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}
#bp .bp-acts button:hover,#bp .bp-btn:hover{border-color:var(--dim)}
#bp .bp-acts button[aria-pressed="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
#bp .bp-acts .pick,#bp .bp-btn.main{background:var(--field);color:var(--on-field);border-color:var(--field)}
#bp .bp-acts .pick:hover,#bp .bp-btn.main:hover{background:var(--field-hi)}
#bp .bp-acts .pick[aria-pressed="true"]{background:var(--field);color:var(--on-field)}
#bp .bp-acts .ico{padding:8px 12px}
#bp .bp-btn:disabled,#bp .bp-acts button:disabled{opacity:.6;cursor:progress}
#bp button:focus-visible,#bp a:focus-visible,#bp textarea:focus-visible,#bp summary:focus-visible{outline:2px solid var(--field);outline-offset:2px}
/* nothing is final */
#bp .bp-promise{margin-top:28px;border:1px solid var(--field-edge);border-radius:calc(var(--r) * 2);background:var(--panel);padding:18px}
#bp .bp-promise h2{font-family:var(--display);font-weight:800;font-size:clamp(1.4rem,5vw,1.9rem);text-transform:uppercase;line-height:1.05;margin:0 0 8px}
#bp .bp-promise>p{line-height:1.6;margin:0;max-width:46rem}
#bp .bp-how{list-style:none;margin:16px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:10px}
#bp .bp-how li{display:flex;gap:12px;align-items:flex-start;background:var(--sunk);border-radius:var(--r);padding:12px;line-height:1.45}
#bp .bp-how li .bp-ic{color:var(--field);margin-top:2px}
#bp .bp-drafts{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:6px}
#bp .bp-drafts li{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-size:.95rem}
#bp .bp-drafts li.next{color:var(--dim)}
#bp .bp-drafts b{min-width:4.5em}
/* steps */
#bp .bp-steps{list-style:none;margin:22px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
#bp .bp-steps a{display:flex;gap:10px;align-items:center;min-height:56px;padding:10px 12px;border:1px solid var(--line);border-radius:var(--r);background:var(--panel);color:var(--ink);text-decoration:none;font-weight:700;line-height:1.25}
#bp .bp-steps i{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:.9rem;border:2px solid var(--line);color:var(--dim)}
#bp .bp-steps .done i{background:var(--field);border-color:var(--field);color:var(--on-field)}
#bp .bp-steps small{display:block;font-weight:400;color:var(--dim);font-size:.82rem}
#bp .bp-meter{height:8px;border-radius:99px;background:var(--sunk);margin:14px 0 0;overflow:hidden;border:1px solid var(--line)}
#bp .bp-meter b{display:block;height:100%;background:var(--field);transition:width .4s}
#bp .bp-sec{margin-top:var(--bp-gap);padding-top:22px;border-top:1px solid var(--line);scroll-margin-top:80px}
#bp .bp-sec>h2{font-family:var(--display);font-weight:800;font-size:clamp(1.5rem,5vw,2rem);line-height:1.1;margin:0 0 6px;text-transform:uppercase;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
#bp .bp-sub{color:var(--dim);margin:0 0 16px;line-height:1.55;max-width:44rem}
/* the plan */
#bp .bp-thesis{font-size:clamp(1.2rem,4.2vw,1.55rem);line-height:1.4;font-weight:600;margin:4px 0 22px;max-width:40rem;padding-inline-start:16px;border-inline-start:1px solid var(--field)}
#bp .bp-plan h3{font-size:1.15rem;margin:26px 0 12px}
#bp .bp-reasons{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}
#bp .bp-reasons li{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:14px;line-height:1.5}
#bp .bp-reasons b{display:block;margin-bottom:4px}
#bp .bp-reasons small,#bp .bp-src{display:block;color:var(--dim);font-size:.8rem;margin-top:8px}
#bp .bp-todo{list-style:none;margin:0;padding:0;display:grid;gap:8px}
#bp .bp-todo button{font:inherit;width:100%;text-align:start;display:flex;gap:12px;align-items:flex-start;min-height:56px;padding:12px;border:1px solid var(--line);border-radius:var(--r);background:var(--panel);color:var(--ink);cursor:pointer;line-height:1.4}
#bp .bp-todo button i{flex:none;width:26px;height:26px;border-radius:7px;border:2px solid var(--dim);display:grid;place-items:center;margin-top:1px;font-style:normal}
#bp .bp-todo button[aria-pressed="true"] i{background:var(--ga);border-color:var(--ga);color:var(--on-grade)}
#bp .bp-todo button[aria-pressed="true"] b{text-decoration:line-through;text-decoration-color:var(--dim)}
#bp .bp-todo small{display:block;color:var(--dim);font-size:.88rem;margin-top:3px}
#bp .bp-grow{margin:0;padding-inline-start:1.3em;display:grid;gap:10px;line-height:1.5}
#bp .bp-grow b{display:block}
#bp .bp-measure{background:var(--sunk);border-radius:var(--r);padding:14px;line-height:1.55;margin:0}
/* story and words */
#bp .bp-field{display:grid;gap:6px;margin:0 0 16px}
#bp .bp-field b{font-size:1rem}
#bp .bp-field small{color:var(--dim);font-size:.85rem}
#bp textarea{font:inherit;width:100%;padding:12px;border:1px solid var(--line);border-radius:var(--r);background:var(--sunk);color:var(--ink);min-height:56px;resize:vertical;line-height:1.5}
#bp textarea.short{min-height:52px}
#bp .bp-state{font-size:.82rem;color:var(--dim)}
#bp .bp-state:empty{display:none}
#bp .bp-state.ok{color:var(--ga)}
#bp .bp-state.bad{color:var(--gd)}
#bp .bp-draft{font-size:.8rem;font-weight:700;color:var(--field)}
#bp .bp-wtabs{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 calc(var(--gutter) * -1) 14px;padding:2px var(--gutter)}
#bp .bp-wtabs::-webkit-scrollbar{display:none}
#bp .bp-wtabs .bp-chip{flex:none}
#bp .bp-wtabs .bp-chip small{font-weight:600;opacity:.75}
#bp .bp-words{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:14px}
#bp .bp-card{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);padding:14px;min-width:0;display:flex;flex-direction:column;gap:8px}
#bp .bp-card h3{margin:0;font-family:var(--body);text-transform:none;font-size:1.02rem;font-weight:800;line-height:1.3;display:flex;justify-content:space-between;gap:10px;align-items:baseline}
#bp .bp-count{font-weight:700;font-size:.85rem;color:var(--dim);white-space:nowrap;font-variant-numeric:tabular-nums}
#bp .bp-count.over{color:var(--gf)}
#bp .bp-card .bp-why{margin:0;font-size:.9rem;line-height:1.45}
#bp .bp-limit{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;font-size:.8rem;color:var(--dim)}
#bp .bp-limit a{display:inline-flex;align-items:center;min-height:40px;color:var(--dim)}
#bp .bp-limit a:hover{color:var(--ink)}
/* the kit */
#bp .bp-groups{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
#bp .bp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr));gap:14px;list-style:none;margin:0;padding:0}
#bp .bp-file{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);display:flex;flex-direction:column;min-width:0}
#bp .bp-file .th{font:inherit;width:100%;border:0;border-bottom:1px solid var(--line);padding:0;cursor:zoom-in;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;background:var(--sunk);border-radius:var(--r) var(--r) 0 0;overflow:hidden;position:relative}
#bp .bp-file .th.clear{background:repeating-conic-gradient(#d9d8d0 0 25%,#f2f1e6 0 50%) 0 0/16px 16px}
#bp .bp-file .th img{max-width:100%;max-height:100%;display:block}
#bp .bp-file .th.big{aspect-ratio:auto;cursor:zoom-out}
#bp .bp-file .th.big img{max-height:none;width:100%}
#bp .bp-file .m{padding:10px 12px 0;min-width:0}
#bp .bp-file .m b{display:block;font-size:.95rem;line-height:1.3;overflow-wrap:anywhere}
#bp .bp-file .m small{display:block;color:var(--dim);font-size:.78rem;margin-top:3px}
#bp .bp-file .bp-acts{padding:10px 12px 0;gap:6px}
#bp .bp-file .bp-acts button{flex:1 1 auto;padding:8px 10px;font-size:.88rem}
#bp .bp-file .bp-cbox{margin:10px 12px 12px}
/* talking */
#bp .bp-note{border:1px solid var(--line);border-radius:var(--r);background:var(--sunk);padding:12px;margin-top:10px}
#bp .bp-note.site{border-inline-start:3px solid var(--field);background:var(--panel)}
#bp .bp-note .who{font-size:.85rem;color:var(--dim);margin-bottom:6px}
#bp .bp-note p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}
#bp .bp-next{list-style:none;padding:0;margin:0;display:grid;gap:10px}
#bp .bp-next li{display:flex;gap:12px;align-items:flex-start;line-height:1.5}
#bp .bp-next li .bp-ic{color:var(--field);margin-top:2px}
#bp .bp-admin{background:var(--sunk);border:1px dashed var(--line);border-radius:var(--r);padding:10px 12px;font-size:.92rem;margin:0 0 14px}
#bp .bp-msg{font-weight:600;min-height:1.4em;margin:8px 0 0}
#bp .bp-msg.bad{color:var(--gd)}
#bp .bp-cbox{margin-top:12px;border:1px solid var(--line);border-radius:var(--r);background:var(--panel);padding:2px 12px 8px}
#bp .bp-cbox.lit{border-color:var(--field-edge)}
#bp .bp-ctog{font:inherit;font-weight:700;font-size:.95rem;min-height:44px;width:100%;text-align:start;background:none;border:0;color:var(--ink);cursor:pointer;padding:6px 0;display:flex;align-items:center;gap:8px}
#bp .bp-ctog .bp-ic{color:var(--field)}
#bp .bp-ctog em{font-style:normal;margin-inline-start:auto;font-size:.8rem;color:var(--dim);font-weight:600}
#bp .bp-cbody textarea{margin:6px 0 8px}
#bp .bp-sent{font-size:.82rem;font-weight:700;color:var(--dim);margin-top:6px}
#bp .bp-sent.done{color:var(--ga)}
#bp .bp-tally{font-weight:600;margin:10px 0 0}
#bp .bp-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
/* the site speaks to her */
#bp .bp-say{display:flex;gap:12px;align-items:flex-start;margin:14px 0 0;max-width:46rem}
#bp .bp-say img{flex:none;width:36px;height:36px;border-radius:50%;background:#000;border:1px solid var(--line)}
#bp .bp-say .bub{background:var(--panel);border:1px solid var(--line);border-radius:4px 16px 16px 16px;padding:10px 14px;line-height:1.5;font-size:.97rem}
#bp .bp-say .bub p{margin:0}
#bp .bp-say .bub p+p{margin-top:6px}
#bp .bp-say .bub b{color:var(--ink)}
#bp .bp-say .bp-ask{color:var(--field);font-weight:700}
#bp .bp-stale{border:2px solid var(--field);border-radius:var(--r);padding:16px;margin:12px 0;line-height:1.55}
#bp .bp-where{display:flex;gap:6px;align-items:baseline;font-size:.86rem;line-height:1.4;color:var(--ink);background:var(--sunk);border-radius:var(--r);padding:8px 10px}
#bp .bp-where b{flex:none;color:var(--field);font-weight:800}
#bp .bp-plat{font-size:.78rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--dim)}
/* the page gets better for everyone */
#bp .bp-better{margin-top:22px;border:2px solid var(--field);border-radius:calc(var(--r) * 2);background:var(--panel);padding:18px;scroll-margin-top:80px}
#bp .bp-better h2{font-family:var(--display);font-weight:800;font-size:clamp(1.4rem,5vw,1.9rem);text-transform:uppercase;line-height:1.05;margin:0 0 8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
#bp .bp-better>p{line-height:1.6;margin:0 0 14px;max-width:46rem}
#bp .bp-kinds{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}
#bp .bp-better textarea{margin:0 0 10px}
#bp .bp-log{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:10px}
#bp .bp-log li{background:var(--sunk);border-radius:var(--r);padding:12px;line-height:1.5}
#bp .bp-log .top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px}
#bp .bp-log .who{font-size:.82rem;color:var(--dim)}
#bp .bp-log p{margin:0}
#bp .bp-log .did{color:var(--dim);font-size:.92rem;margin-top:4px}
#bp .bp-v{display:inline-flex;align-items:center;gap:5px;font-size:.75rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border-radius:99px;padding:3px 9px;white-space:nowrap}
#bp .bp-v.done{background:var(--ga);color:var(--on-grade)}
#bp .bp-v.building{background:var(--field);color:var(--on-field)}
#bp .bp-v.no{background:var(--raise);color:var(--ink);border:1px solid var(--line)}
#bp .bp-v.armin{background:var(--dem);color:#0b1020}
#bp .bp-mynotes{margin-top:12px}
#bp .bp-h4{font-size:1rem;font-weight:800;margin:20px 0 4px;font-family:var(--body);text-transform:none}
/* the next step, always one tap away */
#bp .bp-go{margin-top:12px}
/* today and the new design, side by side in time */
#bp .bp-cmp{margin-top:26px}
#bp .bp-cmp h3{font-family:var(--body);text-transform:none;font-weight:800;font-size:1.1rem;margin:0 0 4px}
#bp .bp-cmpimg{margin:10px 0 0;border-radius:var(--r);overflow:hidden;border:1px solid var(--line);background:var(--sunk);aspect-ratio:2560/423}
#bp .bp-cmpimg img{width:100%;height:100%;object-fit:cover;object-position:50% 50%;display:block}
#bp .bp-cmp figcaption{color:var(--dim);font-size:.88rem;margin-top:8px;line-height:1.45}
/* colours she can copy */
#bp .bp-swatches{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}
#bp .bp-sw{font:inherit;font-size:.85rem;font-weight:700;min-height:40px;display:inline-flex;align-items:center;gap:8px;padding:4px 12px 4px 4px;border:1px solid var(--line);border-radius:99px;background:var(--bg);color:var(--ink);cursor:pointer}
#bp .bp-sw i{width:30px;height:30px;border-radius:50%;border:1px solid rgba(127,127,127,.5);flex:none}
#bp .bp-sw small{font-weight:600;color:var(--dim);font-variant-numeric:tabular-nums}
/* a banner as each screen cuts it */
#bp .bp-cut{margin:10px 0 0}
#bp .bp-cutf{position:relative;overflow:hidden;border-radius:var(--r);background:var(--sunk);border:1px solid var(--line);margin-top:10px;width:100%}
#bp .bp-cutf img{position:absolute;display:block;height:auto;max-width:none}
#bp .bp-cut .bp-groups{display:flex;flex-wrap:wrap;gap:8px}
/* her photos and ideas */
#bp .bp-kinds{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
#bp .bp-kindwhy{color:var(--dim);font-size:.95rem;margin:10px 0 0}
#bp .bp-drop{display:flex;flex-direction:column;align-items:flex-start;gap:10px;margin:14px 0 0;padding:16px;border:2px dashed var(--line);border-radius:calc(var(--r) * 2);background:var(--panel)}
#bp .bp-drop.over{border-color:var(--field)}
#bp .bp-drop input[type=file]{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
#bp .bp-sentgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;list-style:none;padding:0;margin:16px 0 0}
#bp .bp-sentgrid li{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);overflow:hidden;display:flex;flex-direction:column;min-width:0}
#bp .bp-sentgrid .th{display:block;width:100%;aspect-ratio:1/1;padding:0;border:0;background:var(--sunk);cursor:zoom-in}
#bp .bp-sentgrid .th img{display:block;width:100%;height:100%;object-fit:cover}
#bp .bp-sentgrid .m{padding:8px 10px;font-size:.85rem;color:var(--dim);display:flex;flex-direction:column;gap:4px}
#bp .bp-sentgrid .m b{color:var(--ink);font-size:.9rem}
#bp .bp-sentgrid .acts{display:flex;flex-wrap:wrap;gap:6px;padding:0 10px 10px}
#bp .bp-sentgrid .acts button{font:inherit;font-size:.85rem;font-weight:700;min-height:40px;padding:6px 10px;border:1px solid var(--line);border-radius:var(--r);background:var(--bg);color:var(--ink);cursor:pointer}
#bp .bp-sentgrid .acts button.armed{background:var(--ink);color:var(--bg)}
#bp .bp-sentbig{margin:14px 0 0;border:1px solid var(--line);border-radius:calc(var(--r) * 2);background:var(--panel);padding:12px}
#bp .bp-sentbig img.full{display:block;width:100%;height:auto;border-radius:var(--r)}
/* THE PITCH (Armin, 19 Oct 2026: "completely different creative ideas that people could choose from ... a brand page that
   would take someone's breath away"). Every direction is painted in its own colours and set in its own typeface. */
@font-face{font-family:bpf-bodoni;src:url(../assets/brandfonts/bodoni.woff2) format('woff2');font-weight:900;font-display:swap}
@font-face{font-family:bpf-caslon;src:url(../assets/brandfonts/caslon.woff2) format('woff2');font-display:swap}
@font-face{font-family:bpf-archivo;src:url(../assets/brandfonts/archivo.woff2) format('woff2');font-display:swap}
@font-face{font-family:bpf-instrument;src:url(../assets/brandfonts/instrument.woff2) format('woff2');font-display:swap}
@font-face{font-family:bpf-cormorant;src:url(../assets/brandfonts/cormorant.woff2) format('woff2');font-style:italic;font-weight:300 700;font-display:swap}
#bp .bp-open{margin:22px calc(var(--gutter) * -1) 0;padding:clamp(28px,6vw,56px) var(--gutter) clamp(22px,4vw,36px);background:#0d0f14;color:#f4efe6;border-radius:0}
@media (min-width:760px){#bp .bp-open{margin-inline:0;border-radius:calc(var(--r) * 2.5);padding-inline:clamp(28px,4vw,48px)}}
#bp .bp-kick{margin:0;font-size:.8rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#d8b26a}
#bp .bp-big{font-family:var(--display);font-weight:900;text-transform:uppercase;font-size:clamp(2.1rem,8.4vw,4.6rem);line-height:.96;margin:12px 0 0;max-width:15ch;letter-spacing:.005em;color:#fff}
#bp .bp-open .bp-lede2{font-size:clamp(1.02rem,3.6vw,1.2rem);line-height:1.55;margin:16px 0 0;max-width:40rem;color:rgba(244,239,230,.86)}
#bp .bp-toc{list-style:none;margin:26px calc(var(--gutter) * -1) 0;padding:0 var(--gutter) 4px;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(150px,40%);gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
#bp .bp-toc::-webkit-scrollbar{display:none}
@media (min-width:760px){#bp .bp-toc{grid-auto-flow:row;grid-template-columns:repeat(var(--n,5),minmax(0,1fr));overflow:visible;margin-inline:0;padding:0}}
#bp .bp-toc li{scroll-snap-align:start;min-width:0}
#bp .bp-toc button{font:inherit;display:block;width:100%;padding:0;border:0;background:none;color:inherit;text-align:start;cursor:pointer}
#bp .bp-toc .pic{position:relative;display:block;aspect-ratio:4/5;border-radius:12px;overflow:hidden;background:#1d2029;box-shadow:0 14px 34px rgba(0,0,0,.45);transition:transform .25s}
#bp .bp-toc button:hover .pic{transform:translateY(-3px)}
#bp .bp-toc .pic img{width:100%;height:100%;object-fit:cover;display:block}
#bp .bp-toc .nm{display:flex;gap:6px;align-items:baseline;margin-top:10px;font-weight:800;font-size:.98rem;line-height:1.2}
#bp .bp-toc .nm i{font-style:normal;color:#d8b26a;font-size:.8rem;flex:none}
#bp .bp-toc .id{display:block;color:rgba(244,239,230,.7);font-size:.84rem;line-height:1.35;margin-top:3px}
#bp .bp-toc .heart{position:absolute;top:8px;right:8px;background:#fff;color:#d6263b;border-radius:99px;padding:4px 9px;font-size:.78rem;font-weight:800;display:inline-flex;gap:4px;align-items:center}
#bp .bp-toc .heart[hidden]{display:none}
#bp .bp-toc .rec{position:absolute;left:8px;bottom:8px;background:rgba(13,15,20,.82);color:#fff;border-radius:99px;padding:4px 9px;font-size:.72rem;font-weight:800;letter-spacing:.04em}
#bp .bp-scrollhint{margin:12px 0 0;color:rgba(244,239,230,.62);font-size:.86rem}
@media (min-width:760px){#bp .bp-scrollhint{display:none}}
#bp .bp-dir{--dg:var(--panel);--di:var(--ink);--da:var(--field);margin:18px calc(var(--gutter) * -1) 0;padding:clamp(26px,6vw,52px) var(--gutter);background:var(--dg);color:var(--di);scroll-margin-top:12px;position:relative}
@media (min-width:760px){#bp .bp-dir{margin-inline:0;border-radius:calc(var(--r) * 2.5);padding-inline:clamp(28px,4vw,52px)}}
#bp .bp-dir.picked{box-shadow:0 0 0 4px var(--da) inset}
#bp .bp-dnum{margin:0;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:.78rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--da)}
#bp .bp-dnum .pill{letter-spacing:.04em;text-transform:none;font-size:.82rem;background:var(--di);color:var(--dg);border-radius:99px;padding:4px 11px}
#bp .bp-dname{margin:10px 0 0;font-size:clamp(2.2rem,9vw,4.4rem);line-height:.98;font-weight:400;color:var(--di);text-transform:none;letter-spacing:-.01em;font-family:var(--df,var(--display))}
#bp .bp-didea{margin:10px 0 0;font-size:clamp(1.15rem,4.4vw,1.6rem);line-height:1.3;font-style:italic;opacity:.9;max-width:34rem}
#bp .bp-dgrid{display:grid;gap:22px;margin-top:22px}
@media (min-width:900px){#bp .bp-dgrid{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);align-items:start;gap:36px}}
#bp .bp-dposter{margin:0}
#bp .bp-dposter button{display:block;width:100%;padding:0;border:0;background:none;cursor:zoom-in;border-radius:14px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.28);aspect-ratio:4/5}
#bp .bp-dposter img,#bp .bp-duse img{width:100%;height:100%;object-fit:cover;display:block;transition:filter .3s}
#bp .bp-dir img.soft{filter:blur(5px)}
#bp .bp-dtext>p{margin:0 0 14px;line-height:1.6;font-size:1.04rem}
#bp .bp-dtext .lead{font-size:1.18rem;line-height:1.5;font-weight:600}
#bp .bp-dtext .why{opacity:.85}
#bp .bp-dtext .bp-h5{margin:18px 0 8px;font-size:.76rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--da)}
#bp .bp-dir .bp-sw{background:transparent;color:var(--di);border-color:color-mix(in srgb,var(--di) 28%,transparent)}
#bp .bp-dir .bp-sw small{color:var(--di);opacity:.7}
#bp .bp-dtype{margin:0;font-size:.95rem;opacity:.85}
#bp .bp-dacts{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0 4px}
#bp .bp-dacts button{font:inherit;font-weight:800;font-size:1rem;min-height:52px;padding:10px 20px;border-radius:99px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;border:2px solid var(--di);background:transparent;color:var(--di)}
#bp .bp-dacts .bp-dpick{background:var(--di);color:var(--dg)}
#bp .bp-dacts .bp-dpick[aria-pressed="true"]{background:var(--da);border-color:var(--da);color:#fff}
#bp .bp-dacts button[aria-pressed="true"].bp-dno{background:color-mix(in srgb,var(--di) 14%,transparent)}
#bp .bp-dacts button:disabled{opacity:.6;cursor:progress}
#bp .bp-dir .bp-didea,#bp .bp-dir .bp-dtext p,#bp .bp-dir figcaption,#bp .bp-dir .bp-dname{color:var(--di)}
#bp .bp-dir .bp-tag{color:var(--da);border-color:currentColor}
#bp .bp-dir .bp-cbox{color:var(--di);background:transparent;border-color:color-mix(in srgb,var(--di) 30%,transparent)}
#bp .bp-dir .bp-ctog{color:var(--di)}
#bp .bp-dir .bp-ctog .bp-ic{color:var(--da)}
#bp .bp-dir .bp-cbox .bp-sub,#bp .bp-dir .bp-cbox .bp-sent,#bp .bp-dir .bp-ctog em{color:inherit;opacity:.75}
#bp .bp-dir .bp-note{color:var(--ink)}
#bp .bp-dir .bp-cbox .bp-btn.main{background:var(--di);color:var(--dg);border-color:var(--di)}
#bp .bp-duse-h{margin:30px 0 12px;font-size:.76rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--da)}
#bp .bp-duse{list-style:none;margin:0 calc(var(--gutter) * -1);padding:0 var(--gutter) 8px;display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x proximity;scrollbar-width:thin}
@media (min-width:760px){#bp .bp-duse{margin-inline:0;padding-inline:0}}
#bp .bp-duse li{flex:none;scroll-snap-align:start;margin:0}
#bp .bp-duse button{display:block;height:clamp(200px,52vw,300px);padding:0;border:0;background:rgba(127,127,127,.15);cursor:zoom-in;border-radius:10px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,.22)}
#bp .bp-duse figcaption{font-size:.82rem;margin-top:8px;opacity:.8;max-width:20rem;line-height:1.35}
#bp .bp-dall{font:inherit;font-weight:800;margin-top:18px;min-height:48px;padding:10px 18px;border-radius:99px;border:2px solid var(--di);background:transparent;color:var(--di);cursor:pointer;display:inline-flex;align-items:center;gap:8px}
#bp .bp-mix{margin:18px 0 0;padding:clamp(20px,4vw,30px);border:2px dashed var(--line);border-radius:calc(var(--r) * 2);background:var(--panel)}
#bp .bp-mix h2{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:clamp(1.4rem,5vw,1.9rem);line-height:1.05;margin:0 0 8px}
#bp .bp-mix p{margin:0;line-height:1.55;max-width:44rem}
#bp .bp-picks{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0}
#bp .bp-after{margin-top:var(--bp-gap)}
#bp .bp-after>h2{font-family:var(--display);font-weight:800;font-size:clamp(1.5rem,5vw,2rem);text-transform:uppercase;line-height:1.05;margin:0 0 6px}
#bp details.bp-fold{margin-top:12px;border:1px solid var(--line);border-radius:calc(var(--r) * 1.6);background:var(--panel)}
#bp details.bp-fold>summary{list-style:none;cursor:pointer;display:flex;gap:12px;align-items:center;min-height:64px;padding:12px 16px;font-weight:800;font-size:1.05rem}
#bp details.bp-fold>summary::-webkit-details-marker{display:none}
#bp details.bp-fold>summary small{display:block;font-weight:500;color:var(--dim);font-size:.88rem;margin-top:2px}
#bp details.bp-fold>summary .bp-ic{color:var(--field)}
#bp details.bp-fold>summary::after{content:'+';margin-inline-start:auto;font-size:1.5rem;color:var(--dim);font-weight:400}
#bp details.bp-fold[open]>summary::after{content:'\\2212'}
#bp details.bp-fold>.in{padding:0 16px 18px}
#bp details.bp-fold>.in>.bp-sec{margin-top:0;padding-top:0;border-top:0}
#bp details.bp-fold>.in>.bp-sec>h2{display:none}
#bp details.bp-fold .bp-promise,#bp details.bp-fold .bp-better{border:0;padding:0;margin:0;background:none}
#bp details.bp-fold .bp-promise>h2,#bp details.bp-fold .bp-better>h2{display:none}
`;

/* Drawn icons, one stroke and one weight (Lucide's shapes), so nothing on the page depends on how a phone draws emoji. */
const IC = {
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  down: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  spark: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  up: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  dn: '<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>',
  image: '<path d="M16 5h6"/><path d="M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/>',
};
function ico(n, size) {
  const s = el('span', 'bp-ic', null, { 'aria-hidden': 'true' });
  s.innerHTML = `<svg viewBox="0 0 24 24" width="${size || 18}" height="${size || 18}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;
  return s;
}
/* A button with an icon and words (or only an icon, then label says what it does). */
function ibtn(cls, icon, text, label) {
  const b = el('button', cls, null, { type: 'button' });
  b.append(ico(icon));
  if (text) b.append(el('span', null, text));
  if (label) b.setAttribute('aria-label', label);
  return b;
}

/* ------------------------------------------------------------------ small helpers */
const first = s => String(s || '').trim().split(/\s+/)[0] || '';
function bytesOf(v) { return v && typeof v.toUint8Array === 'function' ? v.toUint8Array() : (v instanceof Uint8Array ? v : null); }
function blobUrl(bytes, type) { const u = URL.createObjectURL(new Blob([bytes], { type })); ST.urls.push(u); return u; }
function freeUrls() { ST.urls.forEach(u => { try { URL.revokeObjectURL(u); } catch (x) { } }); ST.urls = []; }
/* The whole pictures outlive a redraw (a pick, a switch of design) and are let go only when another page opens. */
function freeFull() { Object.values(ST.done).forEach(u => { try { URL.revokeObjectURL(u); } catch (x) { } }); ST.full = {}; ST.done = {}; }
function sizeText(n) { return n >= 1048576 ? (Math.round(n / 104857.6) / 10) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
function msg(text, bad) { return el('p', 'bp-msg' + (bad ? ' bad' : ''), text || '', { role: 'status', 'aria-live': 'polite' }); }
function thumbOf(f) { const b = bytesOf(f.thumb); return b ? blobUrl(b, f.thumbType || 'image/jpeg') : ''; }
function fileById(id) { return ST.files.find(f => f.id === id); }
function v(k) { return (ST.mine[k] || {}).v || ''; }
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function sec(id, title, sub) {
  const s = el('section', 'bp-sec', null, { id: 'bp-' + id });
  s.append(el('h2', null, title));
  if (sub) s.append(el('p', 'bp-sub', sub));
  return s;
}
/* A box as tall as its words, so a long About is read whole and a motto is not lost in an empty box. */
function grow(ta) {
  const fit = () => { if (!ta.isConnected || !ta.offsetParent) return; ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 640) + 'px'; };
  ta.addEventListener('input', fit);
  requestAnimationFrame(fit);
  return ta;
}
function draftTag() { const n = ST.doc.draft; return n ? el('span', 'bp-tag', `Draft ${n}`) : null; }
/* The whole picture, once: a page that shows the same picture twice fetches it once. */
function fullUrl(f) {
  if (!ST.full[f.id]) ST.full[f.id] = fetchFile(f).then(b => (ST.done[f.id] = URL.createObjectURL(new Blob([b], { type: f.type })))).catch(e => { delete ST.full[f.id]; throw e; });
  return ST.full[f.id];
}

/* One file out of the database, checked whole (the same pieces as the team page, teamroom.js fetchFile). */
async function fetchFile(f, coll) {      // coll: 'files' (the kit, the default) or 'sent' (what she sent, at most 8 pieces)
  const { F, db } = await R.fb();
  const snap = await R.within(60000, F.getDocs(F.query(F.collection(db, 'brandpages', ST.key, coll || 'files', f.id, 'parts'), F.limit(coll === 'sent' ? 8 : 60))));
  const parts = snap.docs.map(d => [parseInt(d.id, 10), bytesOf(d.data().b)]).sort((a, b) => a[0] - b[0]);
  if (parts.length !== f.parts || parts.some((p, i) => p[0] !== i || !p[1])) throw { code: 'bp/broken' };
  const out = new Uint8Array(parts.reduce((n, p) => n + p[1].length, 0));
  let at = 0;
  for (const p of parts) { out.set(p[1], at); at += p[1].length; }
  if (out.length !== f.bytes) throw { code: 'bp/broken' };
  if (f.sha && window.crypto && crypto.subtle) {
    const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', out))).map(b => b.toString(16).padStart(2, '0')).join('');
    if (h !== f.sha) throw { code: 'bp/broken' };
  }
  return out;
}
function saveBlob(blob, name) {
  const u = URL.createObjectURL(blob), a = el('a', null, null, { href: u, download: name });
  a.style.display = 'none'; D.body.append(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(u); }, 60000);
}
/* A zip with nothing squeezed: the same writer as teamroom.js zipOf, kept here because that file draws the team page. */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipOf(files) {
  const enc = new TextEncoder(), chunks = [], central = [];
  let at = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true);
    h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(h.buffer), name, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, at, true);
    central.push(new Uint8Array(c.buffer), name);
    at += 30 + name.length + f.data.length;
  }
  const size = central.reduce((n, p) => n + p.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, at, true);
  return new Blob(chunks.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
}

/* ------------------------------------------------------------------ saving what the owner does */
async function save(k, val, state) {
  const { F, db } = await R.fb();
  const u = R.user();
  if (state) { state.textContent = 'Saving...'; state.className = 'bp-state'; }
  try {
    await R.within(15000, F.setDoc(F.doc(db, 'brandpages', ST.key, 'mine', k), { uid: u.uid, v: String(val).slice(0, 3000), at: F.serverTimestamp() }));
    ST.mine[k] = { uid: u.uid, v: String(val) };
    if (state) { state.textContent = '✓ Saved. I have it.'; state.className = 'bp-state ok'; }
    progress();
    return true;
  } catch (e) {
    if (state) { state.textContent = (e && e.code === 'permission-denied') ? 'Not saved: confirm your email address first (Your account), then try again.' : 'Not saved. Check your connection and try again.'; state.className = 'bp-state bad'; }
    return false;
  }
}
async function writeNote(about, text) {
  const { F, db } = await R.fb();
  const u = R.user(), me = (window.LP.who && window.LP.who()) || {};
  await R.within(15000, F.addDoc(F.collection(db, 'brandpages', ST.key, 'notes'), { uid: u.uid, name: me.name || 'Reader', about, text: text.slice(0, 1500), createdAt: F.serverTimestamp() }));
  await loadNotes();
}

/* One conversation about one thing on the page (about: '' the whole page, 'sec:<section>', 'look:<k>', 'file:<id>',
   'w:<platform>:<k>'): what was sent, the team's answer under each, and a box with Send. After Send the note shows at
   once, marked as received. Closed until opened, unless something was already said about it. */
function commentBox(about, title, hint, open) {
  const box = el('div', 'bp-cbox', null, { 'data-about': about });
  const mine = () => ST.notes.filter(n => (n.about || '') === about);
  const draw = (said) => {
    box.textContent = '';
    const list = mine();
    box.classList.toggle('lit', list.length > 0);
    const head = el('button', 'bp-ctog', null, { type: 'button', 'aria-expanded': 'false' });
    head.append(ico('chat'), el('span', null, title));
    if (list.length) head.append(el('em', null, list.length === 1 ? '1 sent' : `${list.length} sent`));
    const body = el('div', 'bp-cbody');
    head.addEventListener('click', () => { const o = body.hidden; body.hidden = !o; head.setAttribute('aria-expanded', o ? 'true' : 'false'); if (o) ta.focus(); });
    box.append(head, body);
    list.forEach(n => {
      const c = el('div', 'bp-note');
      const ans = ST.notes.filter(r => r.about === 're:' + n.id);
      c.append(el('div', 'who', (n.uid === R.user().uid ? 'You' : n.name) + (n.createdAt ? ' · ' + new Date(ms(n.createdAt)).toLocaleString() : '')), el('p', null, n.text));
      c.append(el('div', 'bp-sent' + (ans.length ? ' done' : ''), ans.length ? '✓ Answered' : '✓ Got it. I answer right here, usually within a day.'));
      ans.forEach(r => { const rc = el('div', 'bp-note site'); rc.append(el('div', 'who', 'Liberty Politics, to you'), el('p', null, r.text)); c.append(rc); });
      body.append(c);
    });
    if (hint) body.append(el('p', 'bp-sub', hint, { style: 'margin:8px 0' }));
    const ta = el('textarea', 'short', null, { rows: '3', maxlength: '1500', placeholder: 'What would make it better? What do you love?', 'aria-label': title });
    const send = el('button', 'bp-btn main', 'Send to me', { type: 'button' });
    const line = el('p', 'bp-msg', said || '', { role: 'status', 'aria-live': 'polite' });
    send.addEventListener('click', async () => {
      if (ta.value.trim().length < 2) { line.textContent = 'Write a few words first.'; line.className = 'bp-msg bad'; return; }
      send.disabled = true; send.textContent = 'Sending...';
      try { await writeNote(about, ta.value.trim()); progress(); draw('✓ Sent. I have it, and I answer right here.'); box.querySelector('.bp-cbody').hidden = false; box.querySelector('.bp-ctog').setAttribute('aria-expanded', 'true'); tally(); }
      catch (e) { send.disabled = false; send.textContent = 'Send to me'; line.textContent = 'Not sent. Check your connection and try again.'; line.className = 'bp-msg bad'; }
    });
    body.append(ta, send, line);
    body.hidden = !(open || list.length || said);
    head.setAttribute('aria-expanded', body.hidden ? 'false' : 'true');
  };
  draw('');
  return box;
}
/* The line at the top: how many things she has sent and how many the team has answered. */
function tally() {
  const t = $('bp-tally');
  if (!t) return;
  const tops = ST.notes.filter(n => !String(n.about || '').startsWith('re:') && n.uid !== 'liberty-politics-site');
  const done = tops.filter(n => ST.notes.some(r => r.about === 're:' + n.id)).length;
  const saved = Object.keys(ST.mine).length;
  t.textContent = tops.length || saved ? `You have sent ${tops.length} comment${tops.length === 1 ? '' : 's'} (${done} answered) and saved ${saved} choice${saved === 1 ? '' : 's'}. I read all of it, and it shapes your next draft.` : 'Everything you save or tell me here reaches me, and I answer on this page.';
}

/* ------------------------------------------------------------------ who is let in */
function gate(text, withSignIn) {
  freeUrls();
  BOX.textContent = '';
  BOX.append(el('h1', null, 'Brand page'), el('p', 'bp-lede', text, { id: 'bp-gate' }));
  if (withSignIn) BOX.append(btn('btn btn-key', 'Sign in', () => window.LP.open('auth', {})));
}
async function pagesFor(u) {
  const { F, db } = await R.fb();
  const got = new Map();
  const mineQ = await R.within(15000, F.getDocs(F.query(F.collection(db, 'brandpages'), F.where('members', 'array-contains', u.uid), F.limit(20))));
  mineQ.docs.forEach(d => got.set(d.id, d));
  try { (await R.within(15000, F.getDocs(F.query(F.collection(db, 'brandpages'), F.limit(20))))).docs.forEach(d => got.set(d.id, d)); } catch (x) { /* only an admin may list every page */ }
  return Array.from(got.values()).map(d => ({ key: d.id, name: d.data().name || d.id, doc: d.data(), mine: (d.data().members || []).includes(u.uid) }));
}
/* Signed in, and Firebase has not answered yet: her name and a line, never the Sign in button (17 Oct 2026). */
function waiting(text) {
  if (BOX.getAttribute('data-wait') === text) return;
  freeUrls();
  BOX.textContent = '';
  BOX.append(el('h1', null, 'Brand page'), el('p', 'bp-lede', text, { id: 'bp-gate' }));
  BOX.setAttribute('data-wait', text);
}
async function draw() {
  if (!R) return;
  const u = R.user();
  if (!u && R.auth && R.auth.state() === 'checking') { ST.uid = ''; waiting(R.auth.wait()); return; }
  BOX.removeAttribute('data-wait');
  if (!u) { ST.uid = ''; gate(BOX.getAttribute('data-gate') || 'This is a private page for a member of the Liberty Politics team. Sign in with your account to open your brand.', true); return; }
  if (ST.uid === u.uid || ST.busy) return;
  ST.busy = true;
  try {
    const pages = await pagesFor(u);
    if (!R.user() || R.user().uid !== u.uid) return;
    if (!pages.length) { ST.uid = ''; gate('There is no brand page for this account yet. If you are on the team, tell Armin which email you signed up with here.', false); return; }
    ST.uid = u.uid; ST.pages = pages.sort((a, b) => (b.mine - a.mine) || a.name.localeCompare(b.name));
    const want = decodeURIComponent((location.hash || '').slice(1));
    await openPage((ST.pages.find(p => p.key === want) || ST.pages[0]).key);
  } catch (e) {
    ST.uid = '';
    gate('The brand page could not be loaded. Check your connection and load the page again.', false);
  } finally { ST.busy = false; }
}
async function loadNotes() {
  const { F, db } = await R.fb();
  const n = await R.within(20000, F.getDocs(F.query(F.collection(db, 'brandpages', ST.key, 'notes'), F.limit(300))));
  ST.notes = n.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
}
const ms = t => t && typeof t.toMillis === 'function' ? t.toMillis() : 0;
/* The words of a page: a list of platforms, each with its texts. A page synced before 17 Oct 2026 has one bio per
   platform ({platform: {limit, text}}); it is read as one text called Bio. */
function wordsOf(B) {
  if (Array.isArray(B.words)) return B.words;
  return Object.keys(B.words || {}).map(p => ({ p, what: '', fields: [{ k: 'bio', label: 'Bio', limit: B.words[p].limit || 0, text: B.words[p].text || '' }] }));
}
async function openPage(key) {
  /* One page at a time: a load that a newer one has overtaken (a second tap on the switcher, a sign-in that redraws)
     must never paint, or one brand's words land on another's page. Everything is read into locals first. */
  const tok = ST.tok = (ST.tok || 0) + 1;
  const { F, db } = await R.fb();
  const page = ST.pages.find(p => p.key === key);
  if (!page || tok !== ST.tok) return;
  const doc = JSON.parse(page.doc.json || '{}');
  if ((doc.schema || 1) > SCHEMA) { if (ST.key !== key) freeFull(); ST.key = key; ST.doc = doc; stale(); return; }
  doc.words = wordsOf(doc);
  let log = [];
  try { log = JSON.parse(page.doc.teamlog || '[]'); } catch (x) { log = []; }
  const [files, mine, notes] = await Promise.all([
    R.within(30000, F.getDocs(F.query(F.collection(db, 'brandpages', key, 'files'), F.limit(300)))),
    R.within(20000, F.getDocs(F.query(F.collection(db, 'brandpages', key, 'mine'), F.limit(300)))),
    R.within(20000, F.getDocs(F.query(F.collection(db, 'brandpages', key, 'notes'), F.limit(300)))),
  ]);
  // What she sent is read on its own: a page whose rules do not know sent/ yet must still open, with the box saying so.
  let sent = null;
  try { sent = await R.within(20000, F.getDocs(F.query(F.collection(db, 'brandpages', key, 'sent'), F.limit(200)))); } catch (x) { sent = null; }
  if (tok !== ST.tok) return;
  if (ST.key !== key) freeFull();
  ST.sentOk = !!sent;
  ST.sent = sent ? sent.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => ms(b.createdAt) - ms(a.createdAt)) : [];
  ST.key = key;
  ST.doc = doc;
  ST.log = Array.isArray(log) ? log : [];
  ST.files = files.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (a.order || 0) - (b.order || 0));
  ST.mine = {};
  mine.docs.forEach(d => { ST.mine[d.id] = d.data(); });
  ST.notes = notes.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
  ST.look = v('look') || ST.doc.rec;
  if (!ST.doc.words.some(w => w.p === ST.wp)) ST.wp = (ST.doc.words[0] || {}).p || '';
  if (location.hash.slice(1) !== key) history.replaceState(null, '', '#' + key);
  const seenKey = 'lp-bp-seen:' + key + ':' + R.user().uid;
  try { ST.last = parseInt(localStorage.getItem(seenKey) || '0', 10) || 0; localStorage.setItem(seenKey, String(Date.now())); } catch (x) { ST.last = 0; }
  paint();
}
/* The switcher, for an account with more than one page (Armin). */
function nav() {
  if (ST.pages.length < 2) return null;
  const top = el('nav', 'bp-top', null, { 'aria-label': 'Brand pages' });
  ST.pages.forEach(p => {
    const a = el('a', 'bp-chip', p.name, { href: '#' + p.key, 'aria-current': p.key === ST.key ? 'true' : 'false' });
    a.addEventListener('click', ev => { ev.preventDefault(); history.replaceState(null, '', '#' + p.key); openPage(p.key); });
    top.append(a);
  });
  return top;
}
/* The page's data is newer than this script: never draw it half understood. */
function stale() {
  freeUrls();
  BOX.textContent = '';
  const top = nav();
  if (top) BOX.append(top);
  const b = el('div', 'bp-stale', null, { id: 'bp-stale' });
  b.append(el('h1', null, 'I updated this page'), el('p', 'bp-lede', 'Your phone still has the old version of it. One tap loads the new one.'));
  const go = el('button', 'bp-btn main', 'Load the new version', { type: 'button', style: 'margin-top:12px' });
  go.addEventListener('click', () => { const u = new URL(location.href); u.searchParams.set('r', String(Date.now())); location.replace(u.toString()); });
  b.append(go);
  BOX.append(b);
}

/* ------------------------------------------------------------------ the page */
/* Her steps are what she TELLS me, in the order the brand is made (Armin, 17 Oct 2026: "The things she needs to do are:
   tell you what's wrong with the assets ... give you her philosophy, her goals, and her story ... see if she likes them
   or not ... tell you more about the brand page ... Do not give her a to-do list on where to upload these things").
   Each is done by something she actually saved or sent, never by a tick. Where she posts is her choice. */
const STEPS = [
  ['look', 'Tell me about the designs', 'Pick one, say what to change'],
  ['story', 'Tell me your story', 'Your beliefs, goals, story'],
  ['words', 'Check what I made from it', 'Say yes, or what to change'],
  ['better', 'Tell me how to improve this page', 'What you like and do not'],
];
/* One design left is not a choice (Armin, 18 Oct 2026, on Kala's draft 4: "It's telling me to pick something, and it
   seems like I only have one choice to pick"). With one design the page asks what she thinks of it, never to pick. */
const oneLook = () => (ST.doc.looks || []).length === 1;
const STEP_ONE = { look: ['Tell me about the design', 'Love it, or say what to change'] };
const said = test => ST.notes.some(n => n.uid === R.user().uid && test(String(n.about || '')));
function stepDone(k) {
  const keys = Object.keys(ST.mine).filter(x => ST.mine[x] && ST.mine[x].v);
  if (k === 'look') return ST.doc.kind === 'show' || !!v('look') || keys.some(x => /^react:(look|file):/.test(x)) || said(a => /^(look:|file:|sec:look|sec:kit|sent:|sec:sent)/.test(a)) || ST.sent.some(x => x.uid === R.user().uid);
  if (k === 'story') return keys.some(x => x.startsWith('story:'));
  if (k === 'words') return keys.some(x => x.startsWith('words:') || x.startsWith('react:words:')) || said(a => /^(w:|sec:words)/.test(a));
  if (k === 'better') return said(a => a.startsWith('page:'));
  return false;
}
function progress() {
  const box = $('bp-steps'), bar = $('bp-bar');
  if (!box) return;
  let n = 0;
  box.querySelectorAll('li').forEach(li => { const ok = stepDone(li.dataset.k); n += ok; li.firstChild.className = ok ? 'done' : ''; li.querySelector('i').textContent = ok ? '✓' : li.dataset.n; });
  const all = box.querySelectorAll('li').length;
  if (bar) bar.firstChild.style.width = Math.round(n / all * 100) + '%';
  const sum = $('bp-sum');
  if (sum) sum.textContent = n === all ? `All ${all} steps on this page done. Your brand is ready to go live, and it keeps getting better every time you tell me something.` : `${n} of ${all} steps on this page done.`;
  const go = $('bp-go'), next = Array.from(box.querySelectorAll('li')).find(li => !stepDone(li.dataset.k));
  if (go) {
    go.hidden = !next;
    if (next) { go.dataset.k = next.dataset.k; go.textContent = 'Next: ' + next.querySelector('span').firstChild.textContent; }
  }
  const todo = $('bp-todo-n');
  if (todo) todo.textContent = todoCount();
}

function paint() {
  freeUrls();
  const B = ST.doc, person = B.kind === 'person';
  const pg = ST.pages.find(p => p.key === ST.key);
  BOX.textContent = '';
  const top = nav();
  if (top) BOX.append(top);
  if (person && pg && !pg.mine) BOX.append(el('p', 'bp-admin', `You are looking at ${B.person}'s page as an admin. What you save here is saved on her page, under your name.`));

  // A person's page opens on the designs themselves: her name, one line, then three big pictures of the brand in use.
  const hello = el('div', 'bp-hello');
  const photo = fileById('photo');
  if (photo) hello.append(el('img', 'bp-face', null, { src: thumbOf(photo), alt: '' }));
  hello.append(el('h1', null, person ? `Hi ${first(B.person)}. Here is your brand.` : `${B.name} brand`));
  BOX.append(hello);
  if (person) {
    // The pitch first, alone: the designs as whole worlds, then one line of what I need next, then everything else folded.
    BOX.append(paintPitch());
    paintAfter(person);
    return;
  } else {
    BOX.append(el('p', 'bp-lede', `The ${B.name} brand in one place: the kit, the words on every account, and the story. Only you can open this page.`), betterChip());
    const look = B.looks.find(l => l.k === ST.look) || B.looks[0];
    const hero = el('div', 'bp-hero');
    const banner = fileById(look.files.find(id => /x-header|youtube-banner/.test(id)) || '');
    const himg = el('img', null, null, { alt: `${B.name} banner`, src: banner ? thumbOf(banner) : '' });
    hero.append(himg);
    hero.style.marginTop = '18px';
    BOX.append(hero);
    if (banner) fullUrl(banner).then(u => { himg.src = u; }).catch(() => { });
    BOX.append(paintBetter());
  }

  const steps = el('ol', 'bp-steps', null, { id: 'bp-steps' });
  STEPS.filter(([k]) => person || k !== 'look').map(r => oneLook() && STEP_ONE[r[0]] ? [r[0], ...STEP_ONE[r[0]]] : r).forEach(([k, t, s], i) => {
    const li = el('li', null, null, { 'data-k': k, 'data-n': String(i + 1) });
    const a = el('a', null, null, { href: '#bp-' + k });
    a.addEventListener('click', ev => { ev.preventDefault(); $('bp-' + k).scrollIntoView({ behavior: 'smooth' }); });
    const i_ = el('i', null, String(i + 1)), tx = el('span', null, t);
    tx.append(el('small', null, s));
    a.append(i_, tx); li.append(a); steps.append(li);
  });
  BOX.append(steps);
  const bar = el('div', 'bp-meter', null, { id: 'bp-bar', role: 'presentation' }); bar.append(el('b')); BOX.append(bar);
  BOX.append(el('p', 'bp-sub', '', { id: 'bp-sum', style: 'margin-top:8px' }));
  const go = el('button', 'bp-btn main bp-go', '', { type: 'button', id: 'bp-go' });
  go.addEventListener('click', () => { const k = go.dataset.k; const t = k && $('bp-' + k); if (t) t.scrollIntoView({ behavior: 'smooth' }); });
  BOX.append(go, el('p', 'bp-tally', '', { id: 'bp-tally' }));

  if (person && B.plan && B.plan.headline) BOX.append(paintPlan());
  const story = paintStory(), words = paintWords(), kit = paintKit();
  story.append(commentBox('sec:story', 'Tell me what to change in your story', 'What is wrong or missing, in your own words.'));
  BOX.append(story, words, kit);
  const talk = sec('talk', 'Anything else', `Anything about your brand or your channel that has no box of its own: tell me here. ${person ? 'I read every word, Armin sees it too, and my answer appears right here.' : ''}`);
  talk.append(commentBox('', 'Write to me', 'Something to add, something you do not like, an idea for your channel: write it here.', true));
  BOX.append(talk);
  tally();
  if (person) BOX.append(paintNext());
  progress();
}

/* ------------------------------------------------------------------ the pitch
   Armin, 19 Oct 2026, on draft 4: "I don't understand why you didn't create multiple creative options for her ... so
   confusing and hard to use ... I want them to be in tears when they see what you have." So a person's page now opens
   the way an agency presents: every direction side by side as a poster, then each one as a world of its own (its colours
   on the page, its name in its own typeface, the idea in one line, why it could be her, and the brand in use), one
   button that says This is the one. Everything else (photos, story, words, kit, the page itself) waits below, folded. */
const NUM = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const FACES = { bodoni: "bpf-bodoni,'Bodoni Moda',Didot,serif", caslon: "bpf-caslon,'Libre Caslon Display',Georgia,serif", archivo: "bpf-archivo,'Archivo Black',Arial Black,sans-serif",
  instrument: "bpf-instrument,'Instrument Serif',Georgia,serif", cormorant: "bpf-cormorant,'Cormorant Garamond',Georgia,serif" };
const USE = [['youtube-banner', 'Your YouTube banner'], ['youtube-thumb-1', 'A Pretty Well Read thumbnail'], ['youtube-thumb-2', 'A Current Events Condensed thumbnail'],
  ['youtube-thumb-3', 'A live show thumbnail'], ['instagram-story', 'A story'], ['instagram-quote', 'A quote post'], ['x-header', 'Your X header'], ['everywhere-profile', 'Your profile picture']];
let IO = null;
/* A picture shown small at once (its thumbnail), whole when it comes near the screen, fetched once for the whole page. */
function lazy(img, f) {
  if (!f) return img;
  if (ST.done[f.id]) { img.src = ST.done[f.id]; return img; }
  img.src = thumbOf(f);
  img.classList.add('soft');
  img._go = () => fullUrl(f).then(u => { img.src = u; img.classList.remove('soft'); }).catch(() => img.classList.remove('soft'));
  if (!('IntersectionObserver' in window)) { img._go(); return img; }
  if (!IO) IO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { IO.unobserve(e.target); if (e.target._go) e.target._go(); } }), { rootMargin: '900px 500px' });
  IO.observe(img);
  return img;
}
/* Where a link on the page leads: the fold it sits in opens first, then it is scrolled to. */
function goTo(id, focus) {
  const t = $(id);
  if (!t) return;
  const d = t.closest('details');
  if (d && !d.open) d.open = true;
  t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // a glide a browser drops or stalls (a page in the background, a busy phone) never leaves her short of it: it jumps
  const at = () => Math.abs(t.getBoundingClientRect().top - (parseFloat(getComputedStyle(t).scrollMarginTop) || 0) - (parseFloat(getComputedStyle(D.documentElement).scrollPaddingTop) || 0)) <= 24;      // the site keeps room for its header
  [700, 1600].forEach(ms => setTimeout(() => { if (!at()) t.scrollIntoView({ block: 'start' }); }, ms));
  if (focus) { const ta = t.querySelector('textarea'); if (ta) setTimeout(() => ta.focus({ preventScroll: true }), 450); }
}
/* A section folded under one line that says what is inside. It stays open across a redraw once she opened it. */
function fold(key, icon, title, sub, node) {
  const d = el('details', 'bp-fold', null, { id: 'bp-f-' + key });
  if ((ST.open || (ST.open = {}))[key]) d.open = true;
  const s = el('summary');
  const t = el('span', null, title);
  if (sub) t.append(el('small', null, sub));
  s.append(ico(icon, 22), t);
  d.append(s);
  const inner = el('div', 'in');
  inner.append(node);
  d.append(inner);
  d.addEventListener('toggle', () => { ST.open[key] = d.open; });
  return d;
}
function paintPitch() {
  const B = ST.doc, looks = B.looks, n = looks.length, many = n > 1;
  const box = el('div', 'bp-pitch', null, { id: 'bp-look' });
  const open = el('header', 'bp-open');
  open.append(el('p', 'bp-kick', `For ${T(B.person)}${B.draft ? ' · Draft ' + B.draft : ''}`));
  open.append(el('h2', 'bp-big', many ? `${NUM[n] || n} ways the world could see ${T(B.name)}.` : `${T(B.name)}, as the world will see it.`));
  open.append(el('p', 'bp-lede2', many
    ? `${NUM[n] || n} complete brands, not ${(NUM[n] || n).toString().toLowerCase()} pictures: each its own idea, logo, colours and type, with every picture your channel needs, made from real photos of you.`
    : 'A complete brand, with its own idea, logo, colours and type, and every picture your channel needs. Every face in it is a real photo of you.'));
  const toc = el('ol', 'bp-toc', null, { 'aria-label': 'The directions', style: `--n:${Math.min(n, 5)}` });
  looks.forEach((l, i) => {
    const li = el('li');
    const b = el('button', null, null, { type: 'button', 'data-go': l.k, 'aria-label': `${l.name}: see direction ${i + 1}` });
    const pic = el('span', 'pic');
    pic.append(lazy(el('img', null, null, { alt: '' }), fileById(l.show)));
    const heart = el('span', 'heart', null, { 'data-heart': l.k });
    heart.append(ico('heart', 14), el('span', null, 'Your pick'));
    heart.hidden = v('look') !== l.k;
    pic.append(heart);
    if (l.rec && many) pic.append(el('span', 'rec', 'My pick for you'));
    const nm = el('span', 'nm');
    nm.append(el('i', null, String(i + 1).padStart(2, '0')), el('span', null, l.name));
    b.append(pic, nm, el('span', 'id', T(l.idea)));
    b.addEventListener('click', () => goTo('bp-d-' + l.k));
    li.append(b);
    toc.append(li);
  });
  open.append(toc);
  if (many) open.append(el('p', 'bp-scrollhint', `Swipe for all ${n}, then scroll down: each one opens as a world of its own.`));
  box.append(open, paintSay());      // I speak to her right under the posters, never above them
  looks.forEach((l, i) => box.append(direction(l, i, n)));
  if (many) {
    const mix = el('section', 'bp-mix', null, { id: 'bp-mix' });
    mix.append(el('h2', null, 'Love parts of two?'), el('p', null, 'The colours of one, the type of another, the photo from a third: say it here and I build it as the next draft. Or tell me what none of them has yet.'));
    mix.append(commentBox('sec:look', 'Mix them, or tell me what is missing', 'For example: Common Ground, but with the night sky of Midnight Atlas.'));
    box.append(mix);
  }
  return box;
}
function direction(l, i, n) {
  const t = l.theme || {}, mine = v('look') === l.k;
  const s = el('section', 'bp-dir bp-look' + (mine ? ' picked' : ''), null, { id: 'bp-d-' + l.k, 'data-look': l.k, 'aria-label': `${l.name}, direction ${i + 1} of ${n}` });
  if (t.ground) s.style.setProperty('--dg', t.ground);
  if (t.ink) s.style.setProperty('--di', t.ink);
  if (t.accent) s.style.setProperty('--da', t.accent);
  if (FACES[t.face]) s.style.setProperty('--df', FACES[t.face]);
  const num = el('p', 'bp-dnum', n > 1 ? `Direction ${i + 1} of ${n}` : 'Your brand');
  if (l.rec && n > 1) num.append(el('span', 'pill bp-badge', 'My pick for you'));
  const dt = draftTag(); if (dt) num.append(dt);
  s.append(num, el('h2', 'bp-dname', l.name));
  if (l.idea) s.append(el('p', 'bp-didea', `“${T(l.idea)}”`));
  const grid = el('div', 'bp-dgrid');
  const fig = el('figure', 'bp-dposter bp-shot');
  const show = fileById(l.show);
  const pb = el('button', null, null, { type: 'button', 'aria-label': `See ${l.name} full size` });
  const pimg = lazy(el('img', null, null, { alt: `${l.name}: the idea in one picture`, 'data-full': show ? show.id : '' }), show);
  pb.append(pimg);
  pb.addEventListener('click', () => { if (pimg._go) pimg._go(); fullView(pimg, `${l.name}: the idea in one picture`); });
  fig.append(pb);
  const tx = el('div', 'bp-dtext');
  tx.append(el('p', 'lead', T(l.short)), el('p', 'why', T(l.why)));
  tx.append(el('p', 'bp-h5', 'Colours (tap one to copy its code)'), swatches(l));
  tx.append(el('p', 'bp-h5', 'Type'), el('p', 'bp-dtype', (l.fonts || []).join(' and ') + '. Free on Google Fonts, so you can use them in Canva today.'));
  const acts = el('div', 'bp-dacts');
  const pick = el('button', 'bp-dpick', null, { type: 'button', 'aria-pressed': mine ? 'true' : 'false', 'data-pick': l.k });
  pick.append(ico('heart', 20), el('span', null, mine ? 'Your pick' : (n > 1 ? 'This is the one' : 'I love it')));
  pick.addEventListener('click', async () => {
    pick.disabled = true;
    const was = v('look') === l.k;
    if (await save('look', was ? '' : l.k)) { ST.look = was ? ST.doc.rec : l.k; markPicks(); refreshKit(); }
    pick.disabled = false;
  });
  const no = react('react:look:' + l.k, 'x', 'Not me', 'no');
  no.classList.add('bp-dno');
  no.append(el('span', null, 'Not me'));
  acts.append(pick, no);
  tx.append(acts, commentBox('look:' + l.k, 'Tell me what to change', 'A colour, the type, the photo, the feel: anything. Two words is enough.'));
  grid.append(fig, tx);
  s.append(grid);
  // the brand in use: the other pages of its book, then the pictures a stranger meets first
  s.append(el('p', 'bp-duse-h', 'In use'));
  const strip = el('ul', 'bp-duse', null, { 'aria-label': `${l.name} in use` });
  const items = (l.book || []).slice(1).map(b => [fileById(b.id), b.title]).concat(USE.map(([k, cap]) => [fileById(`${l.k}-${k}`), cap]));
  items.filter(x => x[0]).forEach(([f, cap]) => {
    const li = el('li');
    const fg = el('figure', null, null, { style: 'margin:0' });
    const b = el('button', null, null, { type: 'button', 'aria-label': `See ${cap} full size`, style: `aspect-ratio:${T(f.w) || 4} / ${T(f.h) || 5}` });
    const img = lazy(el('img', null, null, { alt: cap }), f);
    b.append(img);
    b.addEventListener('click', () => { if (img._go) img._go(); fullView(img, `${l.name}: ${cap}`); });
    fg.append(b, el('figcaption', null, cap));
    li.append(fg);
    strip.append(li);
  });
  s.append(strip);
  const all = ibtn('bp-dall', 'down', `All ${(l.files || []).length} pictures, ready to download`);
  all.addEventListener('click', () => { ST.look = l.k; refreshKit(); goTo('bp-kit'); });
  s.append(all);
  return s;
}
/* After a pick: the marks move without a redraw, so she keeps her place on the page. */
function markPicks() {
  const p = v('look');
  D.querySelectorAll('#bp .bp-dir').forEach(s => {
    const on = s.dataset.look === p;
    s.classList.toggle('picked', on);
    const b = s.querySelector('[data-pick]');
    if (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.lastChild.textContent = on ? 'Your pick' : (ST.doc.looks.length > 1 ? 'This is the one' : 'I love it'); }
  });
  D.querySelectorAll('#bp [data-heart]').forEach(h => { h.hidden = h.dataset.heart !== p; });
  const picks = $('bp-mypick');
  if (picks) picks.textContent = p ? `Your pick: ${(ST.doc.looks.find(l => l.k === p) || {}).name || p}.` : 'You have not picked one yet.';
  const say = D.querySelector('#bp-say .bp-ask');
  if (say) say.textContent = ask();
  progress();
}
function refreshKit() {
  const k = $('bp-kit');
  if (k) k.replaceWith(paintKit());
  const c = $('bp-cmp');
  const nc = paintCompare();
  if (c && nc) c.replaceWith(nc);
}
/* Everything after the pitch: what I need from her next (the steps), then each part folded under one line. */
function paintAfter(person) {
  const B = ST.doc;
  const after = el('section', 'bp-after', null, { id: 'bp-next-up' });
  after.append(el('h2', null, 'What I need from you'));
  after.append(el('p', 'bp-sub', v('look') ? `Your pick: ${(B.looks.find(l => l.k === v('look')) || {}).name || v('look')}.` : 'You have not picked one yet.', { id: 'bp-mypick', style: 'margin:0 0 6px' }));
  const steps = el('ol', 'bp-steps', null, { id: 'bp-steps' });
  STEPS.map(r => oneLook() && STEP_ONE[r[0]] ? [r[0], ...STEP_ONE[r[0]]] : r).forEach(([k, t, sub], i) => {
    const li = el('li', null, null, { 'data-k': k, 'data-n': String(i + 1) });
    const a = el('a', null, null, { href: '#bp-' + k });
    a.addEventListener('click', ev => { ev.preventDefault(); goTo('bp-' + k, k !== 'look'); });
    const i_ = el('i', null, String(i + 1)), tx = el('span', null, t);
    tx.append(el('small', null, sub));
    a.append(i_, tx); li.append(a); steps.append(li);
  });
  after.append(steps);
  const bar = el('div', 'bp-meter', null, { id: 'bp-bar', role: 'presentation' }); bar.append(el('b')); after.append(bar);
  after.append(el('p', 'bp-sub', '', { id: 'bp-sum', style: 'margin-top:8px' }));
  const go = el('button', 'bp-btn main bp-go', '', { type: 'button', id: 'bp-go' });
  go.addEventListener('click', () => { const k = go.dataset.k; if (k) goTo('bp-' + k, k !== 'look'); });
  after.append(go, el('p', 'bp-tally', '', { id: 'bp-tally' }));
  BOX.append(after);
  const story = paintStory(); story.append(commentBox('sec:story', 'Tell me what to change in your story', 'What is wrong or missing, in your own words.'));
  const talk = sec('talk', 'Anything else', 'Anything about your brand or your channel that has no box of its own: tell me here. I read every word, Armin sees it too, and my answer appears right here.');
  talk.append(commentBox('', 'Write to me', 'Something to add, something you do not like, an idea for your channel: write it here.', true));
  const cmp = paintCompare();
  const parts = [
    ['sent', 'image', 'Send me photos of you', 'Better photos make every design better', paintSent()],
    ['story', 'pen', 'Your story', 'Five questions: I write your bios from them', story],
    ['words', 'copy', 'Your words', 'Every bio and About, written for each app', paintWords()],
    ['kit', 'down', 'Your pictures', 'Every picture of the design you pick, to download', paintKit()],
  ];
  if (cmp) parts.push(['cmp', 'eye', 'Your banner today, and in your pick', 'How a phone, a computer and a TV cut it', cmp]);
  if (B.plan && B.plan.headline) parts.push(['plan', 'spark', 'The plan behind it', 'Why these directions, and how the channel could grow', paintPlan()]);
  parts.push(['promise', 'check', 'Nothing here is final', `Draft ${B.draft || 1}, and how the next one is made`, paintPromise()],
    ['talk', 'chat', 'Anything else', 'A note about anything, to me', talk],
    ['better', 'spark', 'Make this page better for the whole team', 'What the team asked for, and what I did', paintBetter()]);
  parts.forEach(([k, icon, t, sub, node]) => BOX.append(fold(k, icon, t, sub, node)));
  BOX.append(paintNext());
  tally();
  progress();
}

function react(key, icon, label, val, after) {
  const b = ibtn(null, icon, null, label);
  b.classList.add('ico');
  b.setAttribute('aria-pressed', v(key) === val ? 'true' : 'false');
  b.setAttribute('title', label);
  b.addEventListener('click', async () => {
    const nv = v(key) === val ? '' : val;
    b.disabled = true;
    if (await save(key, nv)) { b.parentNode.querySelectorAll('[data-r]').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', nv ? 'true' : 'false'); if (after) after(nv); }
    b.disabled = false;
  });
  b.setAttribute('data-r', key);
  return b;
}

/* One picture on its own, as large as the screen allows. Tap anywhere, or Escape, to close. */
function fullView(img, label) {
  const ov = el('div', 'bp-full', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': label, tabindex: '-1' });
  const big = el('img', null, null, { src: img.src, alt: label });
  const shut = el('button', 'bp-full-x', 'Close', { type: 'button' });
  ov.append(big, shut);
  const close = () => { ov.remove(); D.removeEventListener('keydown', esc); };
  const esc = e => { if (e.key === 'Escape') close(); };
  ov.addEventListener('click', close);
  D.addEventListener('keydown', esc);
  D.body.append(ov);
  ov.focus();
  const t = setInterval(() => { if (!D.body.contains(ov)) clearInterval(t); else if (big.src !== img.src) big.src = img.src; }, 400);   // the full picture arrives after the tap
}

/* The colours of a design, each a button that copies its code, for when she makes something herself (Canva, CapCut). */
function swatches(l) {
  const box = el('div', 'bp-swatches', null, { role: 'group', 'aria-label': `${l.name} colors` });
  l.palette.forEach(c => {
    const b = el('button', 'bp-sw', null, { type: 'button', title: `${c.name}: ${c.role}`, 'aria-label': `Copy ${c.name}, ${c.hex}` });
    const code = el('small', null, c.hex);
    b.append(el('i', null, null, { style: `background:${c.hex}` }), el('span', null, c.name), code);
    b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(c.hex); code.textContent = 'Copied'; } catch (x) { code.textContent = c.hex; }
      setTimeout(() => { code.textContent = c.hex; }, 2000);
    });
    box.append(b);
  });
  return box;
}

/* ------------------------------------------------------------------ a banner as each screen cuts it
   YouTube keeps a banner at 2560 x 1440 and almost nobody sees it whole: a computer shows the full-width strip in the
   middle (2560 x 423), a phone only the middle of that strip (1546 x 423), a television all of it. Kala's own banner
   (17 Oct 2026) lost her three series on every phone and computer and half her face on a phone, and nothing on this page could have
   shown her. So every banner here, hers, mine or one she is about to put up, is shown cut the way each screen cuts it. */
const CUTS = [
  ['phone', 'Phone', 1546 / 2560, 423 / 1440, 'What a phone shows. Most people who open your channel see only this.'],
  ['computer', 'Computer', 1, 423 / 1440, 'What a computer shows: the full width, the same thin strip.'],
  ['tv', 'Whole picture', 1, 1, 'The whole picture. Only a TV shows all of it.'],
];
function isBanner(w, h) { const r = w / h; return w >= 1000 && r > 1.70 && r < 1.84; }
function cropView(src, alt) {
  const box = el('div', 'bp-cut');
  const tabs = el('div', 'bp-groups', null, { role: 'group', 'aria-label': 'Which screen' });
  const frame = el('div', 'bp-cutf');
  const img = el('img', null, null, { alt: alt || '' });
  frame.append(img);
  const cap = el('p', 'bp-sub', '', { style: 'margin:8px 0 0' });
  const show = m => {
    const c = CUTS.find(x => x[0] === m) || CUTS[0];
    ST.cut = c[0];
    frame.style.aspectRatio = `${Math.round(2560 * c[2])} / ${Math.round(1440 * c[3])}`;
    img.style.width = (100 / c[2]) + '%';
    img.style.left = (-(1 - c[2]) / 2 / c[2] * 100) + '%';
    img.style.top = (-(1 - c[3]) / 2 / c[3] * 100) + '%';
    cap.textContent = c[4];
    tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.cut === c[0] ? 'true' : 'false'));
  };
  CUTS.forEach(c => {
    const b = el('button', 'bp-chip', c[1], { type: 'button', 'data-cut': c[0], 'aria-pressed': 'false' });
    b.addEventListener('click', () => show(c[0]));
    tabs.append(b);
  });
  box.append(tabs, frame, cap);
  Promise.resolve(src).then(u => { if (u) img.src = u; }).catch(() => { cap.textContent = 'This picture could not be loaded. Try again in a minute.'; });
  show(ST.cut || 'phone');
  return box;
}

/* Her banner as it is on her channel today against the same place in the design in front, both cut the way a phone, a
   computer and a TV cut them. What today's banner gets wrong is written in brand.json (`today.caption`), never here. */
function paintCompare() {
  const B = ST.doc, today = fileById('today-banner');
  const look = B.looks.find(l => l.k === ST.look) || B.looks[0];
  const neu = fileById(look.files.find(id => /youtube-banner/.test(id)) || '');
  if (!today || !neu) return null;
  const box = el('section', 'bp-cmp', null, { id: 'bp-cmp', 'aria-label': 'Today and in the new design' });
  box.append(el('h3', null, 'Your banner today, and in ' + look.name));
  const which = el('div', 'bp-groups', null, { role: 'group', 'aria-label': 'Which banner' });
  const slot = el('div');
  const note = el('p', 'bp-sub', '', { style: 'margin:10px 0 0' });
  const show = w => {
    ST.cmp = w;
    const f = w === 'today' ? today : neu;
    slot.textContent = '';
    slot.append(cropView(ST.done[f.id] || fullUrl(f), w === 'today' ? 'Your YouTube banner today' : `Your YouTube banner in ${look.name}`));
    note.textContent = w === 'today' ? (T((B.today || {}).caption) || 'Your banner as it is on your channel today.') : `The same banner in ${look.name}. Switch between Phone, Computer and Whole picture to compare.`;
    which.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.c === w ? 'true' : 'false'));
  };
  [['today', 'Today'], ['new', look.name]].forEach(([k, t]) => {
    const b = el('button', 'bp-chip', t, { type: 'button', 'data-c': k });
    b.addEventListener('click', () => show(k));
    which.append(b);
  });
  box.append(which, note, slot);
  show(ST.cmp || 'today');
  return box;
}

/* ------------------------------------------------------------------ her photos and ideas
   Armin, 17 Oct 2026, after Kala made her own banner and it beat every design here: people should be able to send their
   own pictures of themselves, ideas they like, or something they made. A photo of her is used in her pictures, an idea
   is taken from, a design of her own is fitted to every screen and the rest of the kit is built around it.
   Each picture is brandpages/<page>/sent/<id> (who, what kind, her note, size, a small picture) with its bytes in
   sent/<id>/parts/<n>, half a megabyte each, at most eight: the same pieces as the kit, because the site is public and
   these are hers. The rules (firestore.rules, sent) let only someone on the page add one and only its sender remove it.
   brandpage.py sent fetches them to people/<who>/sent/ and listen.py prints [BRAND] until they are looked at. */
const PART_B = 500000, MAX_B = 8 * PART_B, MAX_FILES = 12;
const SENT_KINDS = [
  ['me', 'Photos of me', 'Photos of you that you like. I use them in your pictures, so every one looks like you on a good day.'],
  ['idea', 'Ideas I like', 'Anything you like the look of: a banner, a channel, a color, a font. I take what works for you.'],
  ['mine', 'Something I made', 'A design of your own. I fit it to every screen and build the rest of your pictures around it.'],
];
const kindName = k => (SENT_KINDS.find(x => x[0] === k) || [0, 'Picture'])[1];
function canvasBlob(c, type, q) { return new Promise(res => c.toBlob(res, type, q)); }
/* A picture as it is sent: the file itself when it is a plain photo or design that fits, else redrawn as a JPEG no
   longer than 3000 pixels; and a small picture for the list. A phone's HEIC is opened by the phone's own browser. */
async function prepImage(file) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch (e) { throw { code: 'bp/notimage' }; }
  let w = bmp.width, h = bmp.height, data, type = file.type;
  if (/^image\/(jpeg|png|webp)$/.test(type) && file.size <= MAX_B && w <= 6000 && h <= 6000) data = new Uint8Array(await file.arrayBuffer());
  else {
    const k = Math.min(1, 3000 / Math.max(w, h));
    w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
    const c = D.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    let blob = null;
    for (const q of [0.9, 0.8, 0.68, 0.55]) { blob = await canvasBlob(c, 'image/jpeg', q); if (blob && blob.size <= MAX_B) break; }
    if (!blob || blob.size > MAX_B) throw { code: 'bp/toobig' };
    data = new Uint8Array(await blob.arrayBuffer()); type = 'image/jpeg';
  }
  const tk = Math.min(1, 360 / Math.max(bmp.width, bmp.height));
  const tc = D.createElement('canvas'); tc.width = Math.max(1, Math.round(bmp.width * tk)); tc.height = Math.max(1, Math.round(bmp.height * tk));
  const tx = tc.getContext('2d'); tx.fillStyle = '#ffffff'; tx.fillRect(0, 0, tc.width, tc.height); tx.drawImage(bmp, 0, 0, tc.width, tc.height);
  let thumb = await canvasBlob(tc, 'image/jpeg', 0.78);
  if (thumb.size > 80000) thumb = await canvasBlob(tc, 'image/jpeg', 0.55);
  if (bmp.close) bmp.close();
  return { data, type, w, h, thumb: new Uint8Array(await thumb.arrayBuffer()) };
}
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
async function dropSent(id, n) {
  const { F, db } = await R.fb();
  for (let i = 0; i < n; i++) { try { await R.within(15000, F.deleteDoc(F.doc(db, 'brandpages', ST.key, 'sent', id, 'parts', String(i)))); } catch (x) { /* a piece that never arrived */ } }
  await R.within(15000, F.deleteDoc(F.doc(db, 'brandpages', ST.key, 'sent', id)));
}
async function uploadOne(file, kind, note) {
  const { F, db } = await R.fb();
  const u = R.user(), me = (window.LP.who && window.LP.who()) || {};
  const p = await prepImage(file);
  const n = Math.max(1, Math.ceil(p.data.length / PART_B));
  if (n > 8) throw { code: 'bp/toobig' };
  const id = rid();
  const meta = { uid: u.uid, name: String(me.name || 'Reader').slice(0, 60), kind, note: String(note || '').slice(0, 600), fname: String(file.name || 'picture').slice(0, 120),
    type: p.type, bytes: p.data.length, parts: n, w: p.w, h: p.h, thumb: F.Bytes.fromUint8Array(p.thumb), createdAt: F.serverTimestamp() };
  await R.within(20000, F.setDoc(F.doc(db, 'brandpages', ST.key, 'sent', id), meta));
  try {
    for (let i = 0; i < n; i++) {
      await R.within(60000, F.setDoc(F.doc(db, 'brandpages', ST.key, 'sent', id, 'parts', String(i)), { b: F.Bytes.fromUint8Array(p.data.subarray(i * PART_B, (i + 1) * PART_B)) }));
    }
  } catch (e) { await dropSent(id, n).catch(() => { }); throw e; }
  return Object.assign({ id }, meta, { createdAt: null });
}
function whyNot(e) {
  const c = e && e.code;
  if (c === 'permission-denied') return 'confirm your email address first (Your account), then try again';
  if (c === 'bp/notimage') return 'this device could not open it as a picture';
  if (c === 'bp/toobig') return 'it is too large, even made smaller';
  return 'check your connection and try again';
}
function sentUrl(x) {
  const k = 'sent:' + x.id;
  if (!ST.full[k]) ST.full[k] = fetchFile(x, 'sent').then(b => (ST.done[k] = URL.createObjectURL(new Blob([b], { type: x.type })))).catch(e => { delete ST.full[k]; throw e; });
  return ST.full[k];
}
function openSent(x, holder) {
  holder.textContent = '';
  const box = el('div', 'bp-sentbig', null, { id: 'bp-sentbig' });
  const top = el('div', 'bp-row', null, { style: 'justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap' });
  const cap = el('div');
  cap.append(el('b', null, kindName(x.kind)), el('span', 'bp-sub', ` · ${T(x.w)} × ${T(x.h)} · ${sizeText(x.bytes || 0)}`));
  const close = el('button', 'bp-btn', 'Close', { type: 'button' });
  close.addEventListener('click', () => { holder.textContent = ''; });
  top.append(cap, close);
  box.append(top);
  if (x.note) box.append(el('p', null, T(x.note), { style: 'margin:8px 0 0' }));
  if (isBanner(x.w, x.h)) {
    box.append(el('p', 'bp-sub', 'This is the shape of a YouTube banner, so here it is the way each screen shows it.', { style: 'margin:10px 0 0' }), cropView(ST.done['sent:' + x.id] || sentUrl(x), kindName(x.kind)));
  } else {
    const im = el('img', 'full', null, { alt: kindName(x.kind), src: ST.done['sent:' + x.id] || thumbOf(x), style: 'margin-top:10px' });
    box.append(im);
    if (!ST.done['sent:' + x.id]) sentUrl(x).then(u => { im.src = u; }).catch(() => { });
  }
  box.append(commentBox('sent:' + x.id, 'Tell me about this one', 'What you like about it, what I should take from it.'));
  holder.append(box);
  box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function sentTile(x, holder, redraw) {
  const mine = x.uid === R.user().uid;
  const li = el('li', null, null, { 'data-sent': x.id });
  const th = el('button', 'th', null, { type: 'button', 'aria-label': `See ${kindName(x.kind)} full size` });
  th.append(el('img', null, null, { src: thumbOf(x), alt: kindName(x.kind), loading: 'lazy' }));
  th.addEventListener('click', () => openSent(x, holder));
  const m = el('div', 'm');
  const talk = ST.notes.filter(n => n.about === 'sent:' + x.id);
  const ans = talk.some(n => ST.notes.some(r => r.about === 're:' + n.id));
  m.append(el('b', null, kindName(x.kind)), el('span', null, [mine ? 'You' : T(x.name), x.createdAt ? new Date(ms(x.createdAt)).toLocaleDateString() : 'just now'].join(' · ')));
  if (x.note) m.append(el('span', null, T(x.note)));
  if (ans) m.append(el('span', null, '✓ Answered'));
  li.append(th, m);
  if (mine) {
    const acts = el('div', 'acts');
    const rm = el('button', null, 'Remove', { type: 'button', 'aria-label': `Remove this ${kindName(x.kind).toLowerCase()}` });
    let armed = 0;
    rm.addEventListener('click', async () => {
      if (!armed) { armed = setTimeout(() => { armed = 0; rm.textContent = 'Remove'; rm.classList.remove('armed'); }, 4000); rm.textContent = 'Tap again to remove'; rm.classList.add('armed'); return; }
      clearTimeout(armed); armed = 0; rm.disabled = true; rm.textContent = 'Removing...';
      try { await dropSent(x.id, x.parts || 1); ST.sent = ST.sent.filter(y => y.id !== x.id); if (holder.querySelector('#bp-sentbig')) holder.textContent = ''; redraw(); progress(); }
      catch (e) { rm.disabled = false; rm.textContent = 'Not removed. Try again'; rm.classList.remove('armed'); }
    });
    acts.append(rm);
    li.append(acts);
  }
  return li;
}
function paintSent() {
  const s = sec('sent', 'Your photos and ideas', 'Send me photos of yourself, designs you like from anyone, or something you made. Only you and Armin can see them. I use them in your next draft, and I answer under each one.');
  if (!ST.sentOk) {
    s.append(msg('Sending pictures here opens very soon. Until then, tell me below what you would send me.', true));
    s.append(commentBox('sec:sent', 'Tell me about your photos and ideas', 'A photo you like of yourself, a channel or a design you admire: describe it, or paste one link.', true));
    return s;
  }
  const kinds = el('div', 'bp-kinds', null, { role: 'group', 'aria-label': 'What you are sending' });
  const why = el('p', 'bp-kindwhy', '');
  const setKind = k => {
    ST.skind = k;
    kinds.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.kind === k ? 'true' : 'false'));
    why.textContent = (SENT_KINDS.find(x => x[0] === k) || SENT_KINDS[0])[2];
  };
  SENT_KINDS.forEach(([k, t]) => { const b = el('button', 'bp-chip', t, { type: 'button', 'data-kind': k, 'aria-pressed': 'false' }); b.addEventListener('click', () => setKind(k)); kinds.append(b); });
  const drop = el('div', 'bp-drop');
  const input = el('input', null, null, { type: 'file', accept: 'image/*', multiple: '', id: 'bp-sent-file', tabindex: '-1', 'aria-hidden': 'true' });
  const pick = ibtn('bp-btn main', 'image', 'Choose pictures');
  pick.id = 'bp-sent-pick';
  const note = el('textarea', 'short', null, { rows: '2', maxlength: '600', placeholder: 'What should I take from these? You can leave this empty.', 'aria-label': 'A note with the pictures' });
  const line = msg('');
  line.id = 'bp-sent-line';
  const holder = el('div');
  const grid = el('ul', 'bp-sentgrid', null, { 'aria-label': 'What you sent', id: 'bp-sent-grid' });
  const count = el('p', 'bp-h4', '');
  const drawGrid = () => {
    grid.textContent = '';
    count.textContent = ST.sent.length ? `What you sent (${ST.sent.length})` : '';
    ST.sent.forEach(x => grid.append(sentTile(x, holder, drawGrid)));
  };
  const send = async list => {
    let files = list.filter(f => /^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name || ''));
    if (!files.length) { line.textContent = 'Pick a picture: a photo, a screenshot or a design.'; line.className = 'bp-msg bad'; return; }
    const extra = files.length > MAX_FILES ? files.length - MAX_FILES : 0;
    files = files.slice(0, MAX_FILES);
    pick.disabled = true;
    let ok = 0;
    const bad = [];
    for (const [i, f] of files.entries()) {
      line.textContent = `Sending ${i + 1} of ${files.length}...`; line.className = 'bp-msg';
      try { ST.sent.unshift(await uploadOne(f, ST.skind, note.value.trim())); ok++; drawGrid(); }
      catch (e) { bad.push(`${T(f.name) || 'a picture'} (${whyNot(e)})`); }
    }
    pick.disabled = false;
    if (ok) note.value = '';
    const more = extra ? ` ${extra} more were left out: send them in a second go.` : '';
    line.textContent = (ok ? `✓ Sent ${ok === 1 ? 'your picture' : ok + ' pictures'}. I have ${ok === 1 ? 'it' : 'them'}, and I answer right here.` : 'Not sent.') + (bad.length ? ' Not sent: ' + bad.join('; ') + '.' : '') + more;
    line.className = 'bp-msg' + (!ok ? ' bad' : '');
    progress(); tally();
  };
  pick.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { const f = Array.from(input.files || []); input.value = ''; if (f.length) send(f); });
  drop.addEventListener('dragover', ev => { ev.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', ev => { ev.preventDefault(); drop.classList.remove('over'); const f = Array.from((ev.dataTransfer && ev.dataTransfer.files) || []); if (f.length) send(f); });
  drop.append(pick, input, note, line);
  // A banner checked before it goes up: read on this device only, nothing is sent.
  const chk = el('details', 'bp-more', null, { id: 'bp-bannercheck', style: 'margin-top:16px' });
  chk.append(el('summary', null, 'Check a banner before you put it up'));
  chk.append(el('p', 'bp-sub', 'Pick a banner from your phone or computer and see what a phone, a computer and a TV will show. It stays on your device: nothing is sent.', { style: 'margin:8px 0 0' }));
  const cin = el('input', null, null, { type: 'file', accept: 'image/*', tabindex: '-1', 'aria-hidden': 'true', style: 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none' });
  const cbtn = ibtn('bp-btn', 'eye', 'Choose a banner');
  const cout = el('div');
  cbtn.addEventListener('click', () => cin.click());
  cin.addEventListener('change', () => {
    const f = (cin.files || [])[0]; cin.value = '';
    if (!f) return;
    const u = URL.createObjectURL(f); ST.urls.push(u);
    const probe = new Image();
    probe.onload = () => {
      cout.textContent = '';
      const w = probe.naturalWidth, h = probe.naturalHeight;
      if (!isBanner(w, h)) { cout.append(msg(`This picture is ${w} × ${h}. A YouTube banner is 16 by 9, best 2560 × 1440, so YouTube would not take this shape.`, true)); return; }
      if (w < 2048) cout.append(msg(`YouTube asks for at least 2048 × 1152; this one is ${w} × ${h}, so it may look soft.`, true));
      cout.append(cropView(u, 'Your banner'));
    };
    probe.onerror = () => { cout.textContent = ''; cout.append(msg('This device could not open that file as a picture.', true)); };
    probe.src = u;
  });
  chk.append(cbtn, cin, cout);
  s.append(kinds, why, drop, holder, count, grid, chk, commentBox('sec:sent', 'Tell me about what you sent', 'Your favourite photo, what you like about an idea, or one link to something you admire.'));
  setKind(ST.skind || 'me');
  drawGrid();
  return s;
}

/* Liberty Politics speaking to her: what I made, what I did since her last visit (only deeds that exist), and the one
   thing I want to hear from her now. */
/* The one thing I ask her now, in the greeting: it moves on as she does each thing. */
function ask() {
  if (ST.doc.kind !== 'person') return 'Anything that is wrong? Tell me under it and I will fix it.';
  return oneLook() && !stepDone('look') ? 'Look at your design. Tap I love it, or tell me under it what you would change.'
    : !oneLook() && !v('look') ? 'Look at all of them, then tap This is the one on the one that feels like you.'
    : !Object.keys(ST.mine).some(k => k.startsWith('story:')) ? 'Tell me about yourself in Your story: I write your bios from it.'
      : 'Anything that is not you? Tell me under it and I will fix it.';
}
function paintSay() {
  const B = ST.doc, me = R.user().uid, last = ST.last;
  const box = el('div', 'bp-say', null, { id: 'bp-say' });
  box.append(el('img', null, null, { src: '../assets/seal.png', alt: 'Liberty Politics' }));
  const bub = el('div', 'bub');
  const lines = [];
  if (!last) {
    lines.push([B.looks.length > 1
      ? `I made you ${(NUM[B.looks.length] || B.looks.length).toString().toLowerCase()} completely different brands for ${T(B.name)}, each with every picture your accounts need, from your channel, your Shorts and your Sunday Edit. This is draft ${B.draft || 1}: nothing here is final.`
      : `I made you a brand for ${T(B.name)}, every picture your accounts need and every line of text, from your channel, your Shorts and your Sunday Edit. This is draft ${B.draft || 1}: nothing here is final.`]);
  } else {
    const deeds = [];
    const answered = ST.notes.filter(r => String(r.about || '').startsWith('re:') && ms(r.createdAt) > last && ST.notes.some(n => 're:' + n.id === r.about && n.uid === me)).length;
    if (answered) deeds.push(`I answered ${answered === 1 ? 'one of your notes' : answered + ' of your notes'}; each answer is under what you wrote.`);
    const d = (B.drafts || []).filter(x => x.at && Date.parse(x.at) > last).pop();
    if (d) deeds.push(`I made draft ${d.n}: ${T(d.what)}`);
    const built = ST.log.filter(r => r.v === 'done' && r.date && Date.parse(r.date) > last).pop();
    if (built) deeds.push(`I built something ${T(built.who) || 'a teammate'} asked for: ${T(built.asked)}`);
    lines.push([deeds.length ? `Good to see you again. Since you were last here: ${deeds.join(' ')}` : 'Good to see you again.']);
  }
  lines.forEach(([t]) => bub.append(el('p', null, t)));
  bub.append(el('p', 'bp-ask', ask()));
  box.append(bub);
  return box;
}

/* "Make this page better for the whole team": the way to ask for the page itself, distinct from her own brand, and the
   list of what the team asked for and what was decided, the same on every page. */
function betterChip() {
  const a = el('a', 'bp-chip', null, { href: '#bp-better', style: 'margin-top:12px' });
  a.append(ico('spark'), el('span', null, 'Make this page better for the whole team'));
  a.addEventListener('click', ev => { ev.preventDefault(); $('bp-better').scrollIntoView({ behavior: 'smooth' }); const t = $('bp-better').querySelector('textarea'); if (t) setTimeout(() => t.focus({ preventScroll: true }), 400); });
  return a;
}
const KINDS = [['feature', 'A feature I need'], ['fix', 'Something is wrong'], ['idea', 'An idea']];
const VERDICT = { done: 'Built', building: 'Building it', no: 'Not doing it', armin: 'Asked Armin' };
function paintBetter() {
  const s = el('section', 'bp-better', null, { id: 'bp-better', style: 'scroll-margin-top:80px' });
  const h = el('h2', null, 'Make this page better for the whole team');
  h.append(el('span', 'bp-tag', 'For everyone'));
  s.append(h, el('p', null, 'I am new, and I get better from what the team tells me. A feature you need, something that gets in your way, an idea from a brand you admire: tell me here. I answer every request honestly (is it the best way, not only a good one), anything that costs money I take to Armin (he runs Liberty Politics) first, and what I build reaches every team member\'s page.'));
  const kinds = el('div', 'bp-kinds', null, { role: 'group', 'aria-label': 'What kind' });
  KINDS.forEach(([k, t]) => {
    const b = el('button', 'bp-chip', t, { type: 'button', 'data-kind': k, 'aria-pressed': ST.ptype === k ? 'true' : 'false' });
    b.addEventListener('click', () => { ST.ptype = k; kinds.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); });
    kinds.append(b);
  });
  const ta = el('textarea', 'short', null, { rows: '3', maxlength: '1500', placeholder: 'What would make this page better, for you or for anyone on the team?', 'aria-label': 'Make this page better for the whole team' });
  const send = el('button', 'bp-btn main', 'Send to me', { type: 'button' });
  const line = el('p', 'bp-msg', '', { role: 'status', 'aria-live': 'polite' });
  const mineBox = el('div', 'bp-mynotes');
  const drawMine = () => {
    mineBox.textContent = '';
    const mine = ST.notes.filter(n => String(n.about || '').startsWith('page:') && n.uid === R.user().uid);
    if (!mine.length) return;
    mineBox.append(el('p', 'bp-h4', 'What you asked for'));
    mine.forEach(n => {
      const c = el('div', 'bp-note');
      const ans = ST.notes.filter(r => r.about === 're:' + n.id);
      const kind = (KINDS.find(k => 'page:' + k[0] === n.about) || [, 'Request'])[1];
      c.append(el('div', 'who', `${kind}${n.createdAt ? ' · ' + new Date(ms(n.createdAt)).toLocaleDateString() : ''}`), el('p', null, n.text));
      c.append(el('div', 'bp-sent' + (ans.length ? ' done' : ''), ans.length ? '✓ Answered' : '✓ Got it. I answer you here, honestly, usually within a day.'));
      ans.forEach(r => { const rc = el('div', 'bp-note site'); rc.append(el('div', 'who', 'Liberty Politics, to you'), el('p', null, r.text)); c.append(rc); });
      mineBox.append(c);
    });
  };
  send.addEventListener('click', async () => {
    if (ta.value.trim().length < 2) { line.textContent = 'Write a few words first.'; line.className = 'bp-msg bad'; return; }
    send.disabled = true; send.textContent = 'Sending...';
    try {
      await writeNote('page:' + ST.ptype, ta.value.trim());
      progress();
      ta.value = ''; line.textContent = '✓ Sent. Thank you: this is how I get better for everyone.'; line.className = 'bp-msg';
      drawMine(); tally();
    } catch (e) { line.textContent = 'Not sent. Check your connection and try again.'; line.className = 'bp-msg bad'; }
    send.disabled = false; send.textContent = 'Send to me';
  });
  s.append(kinds, ta, send, line, mineBox);
  drawMine();
  s.append(el('p', 'bp-h4', 'What the team asked me for, and what I did'));
  const rows = ST.log.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  if (!rows.length) s.append(el('p', 'bp-sub', 'Nothing yet. Be the first: what would make this page better?', { style: 'margin:4px 0 0' }));
  const ul = el('ul', 'bp-log', null, { 'aria-label': 'What the team asked for' });
  rows.forEach((r, i) => {
    const li = el('li', null, null, { 'data-v': r.v || '' });
    if (i >= 4) li.hidden = true;
    const top = el('div', 'top');
    top.append(el('span', 'bp-v ' + (VERDICT[r.v] ? r.v : 'building'), VERDICT[r.v] || 'Building it'), el('span', 'who', [r.who ? 'From ' + T(r.who) : '', day(r.date)].filter(Boolean).join(' · ')));
    li.append(top, el('p', null, T(r.asked)));
    if (r.did) li.append(el('p', 'did', r.did));
    ul.append(li);
  });
  s.append(ul);
  if (rows.length > 4) {
    const more = el('button', 'bp-btn', `Show all ${rows.length}`, { type: 'button', style: 'margin-top:10px' });
    more.addEventListener('click', () => { ul.querySelectorAll('li').forEach(li => { li.hidden = false; }); more.remove(); });
    s.append(more);
  }
  return s;
}

/* What she has to understand before anything else: nothing is final, every piece has its own box, and the next draft
   comes back here. The drafts so far, and the next one waiting on her. */
function paintPromise() {
  const B = ST.doc, n = B.draft || 1;
  const box = el('section', 'bp-promise', null, { id: 'bp-promise', 'aria-label': 'How this page works' });
  box.append(el('h2', null, 'Nothing here is final'));
  box.append(el('p', null, `This is draft ${n} of your brand, made from your channel, your Shorts and your Sunday Edit. Every design, every picture and every line of text has its own box. Tell me what you love and what to change, and I redraw and rewrite it. The more you tell me, the more it looks and sounds like you.`));
  const how = el('ul', 'bp-how');
  [['eye', 'Look at anything: a design, a picture, a bio.'], ['chat', 'Tap Tell me what to change under it. Two words is enough.'], ['spark', `Draft ${n + 1} comes back on this page, with the answer under your words.`]].forEach(([i, t]) => {
    const li = el('li'); li.append(ico(i, 20), el('span', null, t)); how.append(li);
  });
  box.append(how);
  const hist = el('ul', 'bp-drafts', null, { 'aria-label': 'Drafts' });
  (B.drafts || []).forEach(d => { const li = el('li'); li.append(el('b', null, `Draft ${T(d.n)}`), el('span', 'dim', T(d.date)), el('span', null, T(d.what))); hist.append(li); });
  const nx = el('li', 'next'); nx.append(el('b', null, `Draft ${n + 1}`), el('span', null, 'Made from what you tell me.')); hist.append(nx);
  box.append(hist);
  return box;
}

/* The brand manager's plan: one sentence of position, why (every number with where it was read), the first things to
   do as a list she ticks, the next 90 days, and how we will know it works. */
function todoCount() {
  const P = ST.doc.plan || {}, items = P.first || [];
  const done = items.filter(t => (t.k === 'look' ? !!v('look') : v('plan:' + t.k) === 'done')).length;
  return `${done} of ${items.length} on your accounts done`;
}
function paintPlan() {
  const P = ST.doc.plan, s = sec('plan', 'Your brand, in one idea', `What I think ${ST.doc.name} stands for, why every design and every line is built around it, and how your channel could grow from here. Where you post is up to you.`);
  s.classList.add('bp-plan');
  s.append(el('p', 'bp-thesis', P.headline));
  if ((P.why || []).length) {
    s.append(el('h3', null, 'Why I chose this direction'));
    const ul = el('ul', 'bp-reasons');
    P.why.forEach(r => { const li = el('li'); li.append(el('b', null, r.t), el('span', null, r.d)); if (r.src) li.append(el('small', null, 'Source: ' + r.src)); ul.append(li); });
    s.append(ul);
  }
  // No list of tasks on her accounts: Armin, 17 Oct 2026, "Do not give her a to-do list on where to upload these things". Her steps are STEPS.
  if ((P.grow || []).length) {
    s.append(el('h3', null, 'Ideas for the next 90 days'));
    const ol = el('ol', 'bp-grow');
    P.grow.forEach(g => { const li = el('li'); li.append(el('b', null, g.t), el('span', 'dim', g.d)); ol.append(li); });
    s.append(ol);
  }
  if (P.measure) {
    s.append(el('h3', null, 'How I will know it works'));
    const m = el('p', 'bp-measure', P.measure);
    s.append(m);
    if (P.measureSrc) s.append(el('small', 'bp-src', 'Source: ' + P.measureSrc));
  }
  s.append(commentBox('sec:plan', 'Tell me what you think of the plan', 'Something you would never do, something you want to try, a goal of your own.'));
  return s;
}

function field(k, label, help, draft) {
  const box = el('label', 'bp-field');
  box.append(el('b', null, label));
  if (help) box.append(el('small', null, help));
  const saved = ST.mine[k];
  const ta = el('textarea', null, null, { rows: '4', maxlength: '3000' });
  ta.value = saved ? saved.v : draft || '';
  const state = el('span', 'bp-state', saved ? 'Saved.' : '');

  const sv = el('button', 'bp-btn', 'Save', { type: 'button' });
  const row = el('div', 'bp-row'); row.append(sv, state);
  box.append(grow(ta), row);
  let last = ta.value;
  ta.addEventListener('blur', () => { if (ta.value !== last) { last = ta.value; save(k, ta.value, state); } });
  sv.addEventListener('click', async () => { sv.disabled = true; last = ta.value; await save(k, ta.value, state); sv.disabled = false; tally(); });
  return [box, ta];
}

function paintStory() {
  const B = ST.doc, person = B.kind === 'person';
  const s = sec('story', 'Your story', person
    ? 'Five questions about you. I write everything else from your answers: your bios, your About, your plan. Each box already holds my first guess, from your own About text: change anything, and it saves by itself when you tap outside the box. When you change your story, I rewrite your words from it, and the next draft says so.'
    : 'The story every picture and line of this brand comes from. Each box saves itself when you tap outside it.');
  const h = s.querySelector('h2'); const dt = draftTag(); if (dt && person) h.append(dt);
  B.story.forEach(q => { const [box] = field('story:' + q.k, q.label, q.help, q.draft); s.append(box); });
  const ok = el('button', 'bp-btn main', 'My story is right, keep it', { type: 'button' });
  const st = el('span', 'bp-state');
  ok.addEventListener('click', async () => { ok.disabled = true; await save('story:ok', 'yes', st); ok.disabled = false; });
  const row = el('div', 'bp-row'); row.append(ok, st);
  s.append(row);
  return s;
}

/* Every text every platform needs: one platform at a time, each text with its limit (and the page that states it),
   a count that turns red past it, Save, Copy, a thumb up or down, and its own conversation. */
function countOf(f, text) {
  if (f.perLine) {
    const longest = Math.max(0, ...text.split('\n').map(x => x.length));
    return { n: longest, of: f.perLine, label: `longest line ${longest} / ${f.perLine}` };
  }
  return { n: text.length, of: f.limit || 0, label: f.limit ? `${text.length} / ${f.limit}` : `${text.length} characters` };
}
function paintWords() {
  const B = ST.doc, person = B.kind === 'person';
  const s = sec('words', 'Your words', person
    ? 'Every piece of text your accounts need, written in your voice from your story, and fitted to each app. Pick an app below; use only the ones you want. Under each text it says where it goes in that app. Change one here and I keep your version; tell me what is off and I rewrite it.'
    : 'The text on each account. Copy one, paste it into the app, done.');
  const h = s.querySelector('h2'); const dt = draftTag(); if (dt && person) h.append(dt);
  const W = B.words;
  if (W.length > 1) {
    const tabs = el('div', 'bp-wtabs', null, { role: 'group', 'aria-label': 'Platform' });
    W.forEach(w => {
      const c = el('button', 'bp-chip', null, { type: 'button', 'aria-pressed': w.p === ST.wp ? 'true' : 'false', 'data-p': w.p });
      c.append(el('span', null, appName(w.p)), el('small', null, `${w.fields.length} ${w.fields.length === 1 ? 'text' : 'texts'}`));
      c.addEventListener('click', () => { ST.wp = w.p; tabs.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === c ? 'true' : 'false')); drawPanel(); });
      tabs.append(c);
    });
    s.append(tabs);
  }
  const panel = el('div', null, null, { id: 'bp-wpanel' });
  s.append(panel);
  const drawPanel = () => {
    panel.textContent = '';
    const w = W.find(x => x.p === ST.wp) || W[0];
    if (!w) return;
    if (w.what) panel.append(el('p', 'bp-sub', w.what));
    const grid = el('div', 'bp-words');
    w.fields.forEach(f => grid.append(wordCard(w, f)));
    panel.append(grid);
  };
  drawPanel();
  s.append(commentBox('sec:words', 'Tell me about your words as a whole', 'Too formal, not you, missing an app? Say it here.'));
  return s;
}
/* 2026-10-17 as she reads a date: 17 Oct 2026. */
const day = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(T(d)); return m ? `${+m[3]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1]} ${m[1]}` : T(d); };
const appName = p => (p === 'Everywhere' ? 'Every app' : T(p));
function wordCard(w, f) {
  f = Object.assign({}, f, { text: T(f.text), label: T(f.label) || 'Text' });
  const k = 'words:' + slug(w.p) + ':' + f.k, about = 'w:' + slug(w.p) + ':' + f.k;
  const card = el('div', 'bp-card', null, { 'data-w': k });
  card.append(el('span', 'bp-plat', w.p === 'Everywhere' ? 'For every app' : T(w.p)));
  const h = el('h3', null, f.label);
  const count = el('span', 'bp-count');
  h.append(count); card.append(h);
  if (f.where) { const wh = el('p', 'bp-where'); wh.append(el('b', null, 'Goes in'), el('span', null, T(f.where))); card.append(wh); }
  if (f.why) card.append(el('p', 'bp-why', T(f.why)));
  const saved = ST.mine[k];
  const long = f.text.length > 160 || f.text.includes('\n');
  const ta = el('textarea', long ? null : 'short', null, { rows: long ? '7' : '2', 'aria-label': `${w.p}: ${f.label}` });
  ta.value = saved ? saved.v : f.text;
  const state = el('span', 'bp-state', saved ? 'Your version, saved.' : '');
  const upd = () => {
    const c = countOf(f, ta.value), over = c.of && c.n > c.of;
    count.textContent = over ? `${c.label} · ${c.n - c.of} over` : c.label;
    count.className = 'bp-count' + (over ? ' over' : '');
  };
  upd(); ta.addEventListener('input', upd);
  let last = ta.value;
  ta.addEventListener('blur', () => { if (ta.value !== last) { last = ta.value; save(k, ta.value, state); } });
  const lim = el('div', 'bp-limit');
  const of = f.perLine || f.limit;
  if (of) lim.append(el('span', null, `Limit: ${of} characters${f.perLine ? ' a line' : ''}${f.official === false ? ' (about; widely reported, not stated by ' + w.p + ')' : ''}.`));
  if (of && f.src) lim.append(el('a', null, `Where ${w.p} says so`, { href: f.src, target: '_blank', rel: 'noopener' }));
  if (f.note) lim.append(el('span', null, T(f.note)));
  if (/\{[^}]+\}/.test(f.text)) lim.append(el('span', null, 'Fill in the parts in { } before you post.'));
  const acts = el('div', 'bp-acts');
  const sv = ibtn(null, 'check', 'Save');
  sv.addEventListener('click', async () => { sv.disabled = true; last = ta.value; await save(k, ta.value, state); sv.disabled = false; tally(); });
  const cp = ibtn(null, 'copy', 'Copy');
  cp.addEventListener('click', async () => {
    const t = cp.querySelector('span:last-child');
    try { await navigator.clipboard.writeText(ta.value); t.textContent = 'Copied'; } catch (x) { ta.select(); t.textContent = 'Selected: copy it'; }
    setTimeout(() => { t.textContent = 'Copy'; }, 2500);
    if (!ST.mine[k]) save(k, ta.value, state);
  });
  acts.append(sv, cp, react('react:' + k, 'up', 'Sounds like me', 'love'), react('react:' + k, 'dn', 'Not me', 'no'));
  card.append(grow(ta), lim, acts, state, commentBox(about, 'Tell me what to change'));
  return card;
}

function paintKit() {
  const B = ST.doc, person = B.kind === 'person';
  const look = B.looks.find(l => l.k === ST.look) || B.looks[0];
  const s = sec('kit', 'Your kit', person
    ? `Every picture your accounts need, in ${look.name}, each at the size its app asks for. Tap a picture to see it full size. Download any you want, or all of them at once; each says where it goes, for the apps you use. Tell me what to change on any of them and I redraw it.`
    : 'Every picture of the kit in use, sized for each app. Tap a picture to see it full size.');
  const h = s.querySelector('h2'); const dt = draftTag(); if (dt && person) h.append(dt);
  if (person && B.looks.length > 1) {
    const sw = el('div', 'bp-groups', null, { role: 'group', 'aria-label': 'Design' });
    B.looks.forEach(l => {
      const c = el('button', 'bp-chip', l.name + (v('look') === l.k ? ' ✓' : ''), { type: 'button', 'aria-current': l.k === look.k ? 'true' : 'false' });
      c.addEventListener('click', () => { ST.look = l.k; paint(); $('bp-kit').scrollIntoView(); });
      sw.append(c);
    });
    s.append(sw);
  }
  const files = look.files.map(fileById).filter(Boolean);
  const all = ibtn('bp-btn main', 'down', `Download all ${files.length} pictures (${sizeText(files.reduce((n, f) => n + (f.bytes || 0), 0))})`);
  const line = msg('');
  all.addEventListener('click', async () => {
    all.disabled = true;
    try {
      const got = [];
      for (const [i, f] of files.entries()) { line.textContent = `Fetching ${i + 1} of ${files.length}...`; got.push({ name: (f.group || 'other').toLowerCase() + '/' + f.name, data: await fetchFile(f) }); }
      saveBlob(zipOf(got), `${B.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${look.k}-kit.zip`);
      line.textContent = 'Downloaded. Unzip it and each folder is one app.';
      save('kit:got', look.k);
    } catch (e) { line.textContent = 'The download stopped. Try again in a minute.'; line.className = 'bp-msg bad'; }
    all.disabled = false;
  });
  s.append(all, line);
  const groups = [];
  files.forEach(f => { if (!groups.includes(f.group)) groups.push(f.group); });
  groups.forEach(g => {
    s.append(el('h3', null, g, { style: 'margin:26px 0 12px' }));
    const ul = el('ul', 'bp-grid');
    files.filter(f => f.group === g).forEach(f => {
      const li = el('li', 'bp-file', null, { 'data-file': f.id });
      const th = el('button', 'th' + (f.clear ? ' clear' : ''), null, { type: 'button', 'aria-label': `See ${f.title} full size` });
      const img = el('img', null, null, { src: thumbOf(f), alt: f.title, loading: 'lazy' });
      th.append(img);
      th.addEventListener('click', async () => {
        if (th.classList.contains('big')) { th.classList.remove('big'); th.setAttribute('aria-label', `See ${f.title} full size`); return; }
        th.classList.add('big'); th.setAttribute('aria-label', `Make ${f.title} small again`); img.loading = 'eager';
        try { img.src = ST.done[f.id] || await fullUrl(f); } catch (e) { }
      });
      const m = el('div', 'm');
      m.append(el('b', null, T(f.title)), el('small', null, `${T(f.w)} × ${T(f.h)} · ${sizeText(f.bytes || 0)}${f.clear ? ' · clear background' : ''}`));
      if (f.where) { const wh = el('p', 'bp-where', null, { style: 'margin-top:8px' }); wh.append(el('b', null, 'Goes in'), el('span', null, T(f.where))); m.append(wh); }
      const acts = el('div', 'bp-acts');
      const dl = ibtn(null, 'down', 'Download');
      dl.addEventListener('click', async () => {
        const t = dl.querySelector('span:last-child');
        dl.disabled = true; t.textContent = 'Fetching...';
        try { saveBlob(new Blob([await fetchFile(f)], { type: f.type }), f.name); t.textContent = 'Downloaded'; if (!v('kit:got')) save('kit:got', look.k); }
        catch (e) { t.textContent = 'Try again'; }
        dl.disabled = false;
      });
      acts.append(dl, react('react:file:' + f.id, 'heart', 'Love it', 'love'), react('react:file:' + f.id, 'x', 'Not me', 'no'));
      const cutBox = el('div');
      if (isBanner(f.w, f.h) && f.group === 'YouTube') {
        const cut = ibtn(null, 'eye', 'On a phone', `See ${f.title} the way a phone, a computer and a TV show it`);
        cut.addEventListener('click', () => { if (cutBox.firstChild) { cutBox.textContent = ''; return; } cutBox.append(cropView(ST.done[f.id] || fullUrl(f), f.title)); });
        acts.append(cut);
      }
      li.append(th, m, acts, cutBox, commentBox('file:' + f.id, 'Tell me what to change'));
      ul.append(li);
    });
    s.append(ul);
  });
  s.append(commentBox('sec:kit', 'Tell me about the pictures as a whole', 'A size you need, an app I missed, a picture you want changed: say which.'));
  return s;
}

function paintNext() {
  const s = sec('next', 'What happens next', '');
  const ol = el('ul', 'bp-next');
  [['eye', oneLook() ? 'You tell me what you love and what you do not, on anything on this page.' : 'You pick a design and tell me what you love and what you do not, on anything on this page.'],
   ['pen', 'I redraw the pictures and rewrite the words, and the next draft appears here with my answer under each of your comments.'],
   ['down', 'When it feels like you, you take whatever you want from it, for whichever accounts you choose. Nothing goes anywhere unless you put it there.']].forEach(([i, t]) => {
    const li = el('li'); li.append(ico(i, 20), el('p', null, t, { style: 'margin:0' })); ol.append(li);
  });
  s.append(ol);
  return s;
}

/* ------------------------------------------------------------------ start */
function start() {
  if (!BOX) return;
  const st = D.createElement('style'); st.textContent = CSS; D.head.append(st);
  const go = () => {
    if (!window.LP || !window.LP.room) return false;
    R = window.LP.room; el = R.el; btn = R.btn;
    R.sub(() => draw());
    const asked = R.fb();      // asked first, so the state is 'checking' until it answers (the team page does the same)
    draw();
    asked.then(draw, () => {
      if (R.user()) return;
      if (R.auth && window.LP.who && window.LP.who()) { BOX.removeAttribute('data-wait'); BOX.textContent = ''; BOX.append(el('h1', null, 'Brand page'), el('p', 'bp-lede', R.auth.offline(), { id: 'bp-gate' })); }
      else gate(BOX.getAttribute('data-gate') || '', true);
    });
    return true;
  };
  if (!go()) { let n = 0; const t = setInterval(() => { if (go() || ++n > 200) clearInterval(t); }, 50); }
  window.addEventListener('hashchange', () => { const k = location.hash.slice(1); if (ST.pages.some(p => p.key === k) && k !== ST.key) openPage(k); });
}
window.LPBRAND = { state: () => ({ uid: ST.uid, key: ST.key, look: ST.look, wp: ST.wp, ptype: ST.ptype, log: ST.log.length, sent: ST.sent.length, sentOk: ST.sentOk, cut: ST.cut || '', pages: ST.pages.map(p => p.key), mine: Object.assign({}, ST.mine) }) };      // for brand-test.html
start();
