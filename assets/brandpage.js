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
   data/brand-teamlog.json. The same list is on every page, so what one member asked for is seen by all. */

const D = document, $ = id => D.getElementById(id);
const BOX = $('bp');
let R = null, el = null, btn = null;
const ST = { uid: '', pages: [], key: '', doc: null, files: [], mine: {}, notes: [], urls: [], busy: false, look: '', wp: '', full: {}, done: {}, log: [], ptype: 'feature', cmp: '' };

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
`;

/* Drawn icons, one stroke and one weight (Lucide's shapes), so nothing on the page depends on how a phone draws emoji. */
const IC = {
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  down: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  spark: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  up: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  dn: '<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>',
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
async function fetchFile(f) {
  const { F, db } = await R.fb();
  const snap = await R.within(60000, F.getDocs(F.query(F.collection(db, 'brandpages', ST.key, 'files', f.id, 'parts'), F.limit(60))));
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
    if (state) { state.textContent = '✓ Saved. The team sees it now.'; state.className = 'bp-state ok'; }
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
      c.append(el('div', 'bp-sent' + (ans.length ? ' done' : ''), ans.length ? '✓ Answered' : '✓ Received. The team answers here, usually within a day.'));
      ans.forEach(r => { const rc = el('div', 'bp-note site'); rc.append(el('div', 'who', 'Liberty Politics team'), el('p', null, r.text)); c.append(rc); });
      body.append(c);
    });
    if (hint) body.append(el('p', 'bp-sub', hint, { style: 'margin:8px 0' }));
    const ta = el('textarea', 'short', null, { rows: '3', maxlength: '1500', placeholder: 'What would make it better? What do you love?', 'aria-label': title });
    const send = el('button', 'bp-btn main', 'Send to the team', { type: 'button' });
    const line = el('p', 'bp-msg', said || '', { role: 'status', 'aria-live': 'polite' });
    send.addEventListener('click', async () => {
      if (ta.value.trim().length < 2) { line.textContent = 'Write a few words first.'; line.className = 'bp-msg bad'; return; }
      send.disabled = true; send.textContent = 'Sending...';
      try { await writeNote(about, ta.value.trim()); draw('✓ Sent. The team got it and answers right here, in the next draft.'); box.querySelector('.bp-cbody').hidden = false; box.querySelector('.bp-ctog').setAttribute('aria-expanded', 'true'); tally(); }
      catch (e) { send.disabled = false; send.textContent = 'Send to the team'; line.textContent = 'Not sent. Check your connection and try again.'; line.className = 'bp-msg bad'; }
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
  t.textContent = tops.length || saved ? `You have sent ${tops.length} comment${tops.length === 1 ? '' : 's'} (${done} answered) and saved ${saved} choice${saved === 1 ? '' : 's'}. All of it reaches the team and shapes the next draft.` : 'Everything you save or send here reaches the team, and we answer on this page.';
}

/* ------------------------------------------------------------------ who is let in */
function gate(text, withSignIn) {
  freeUrls();
  BOX.textContent = '';
  BOX.append(el('h1', null, 'Brand page'), el('p', 'bp-lede', text));
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
async function draw() {
  if (!R) return;
  const u = R.user();
  if (!u) { ST.uid = ''; gate('This is a private page for a member of the Liberty Politics team. Sign in with your account to open your brand.', true); return; }
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
  const { F, db } = await R.fb();
  const page = ST.pages.find(p => p.key === key);
  if (ST.key !== key) freeFull();
  ST.key = key;
  ST.doc = JSON.parse(page.doc.json || '{}');
  ST.doc.words = wordsOf(ST.doc);
  try { ST.log = JSON.parse(page.doc.teamlog || '[]'); } catch (x) { ST.log = []; }
  if (!Array.isArray(ST.log)) ST.log = [];
  const [files, mine] = await Promise.all([
    R.within(30000, F.getDocs(F.query(F.collection(db, 'brandpages', key, 'files'), F.limit(300)))),
    R.within(20000, F.getDocs(F.query(F.collection(db, 'brandpages', key, 'mine'), F.limit(300)))),
  ]);
  ST.files = files.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (a.order || 0) - (b.order || 0));
  ST.mine = {};
  mine.docs.forEach(d => { ST.mine[d.id] = d.data(); });
  await loadNotes();
  ST.look = v('look') || ST.doc.rec;
  if (!ST.doc.words.some(w => w.p === ST.wp)) ST.wp = (ST.doc.words[0] || {}).p || '';
  if (location.hash.slice(1) !== key) history.replaceState(null, '', '#' + key);
  paint();
}

/* ------------------------------------------------------------------ the page */
const STEPS = [
  ['look', 'Pick a design', 'Swipe, then tap one'],
  ['plan', 'Read your plan', 'Tick what you did'],
  ['story', 'Tell your story', 'Fix my first draft'],
  ['words', 'Your words', 'Every bio and line'],
  ['kit', 'Get your kit', 'Every picture'],
];
function stepDone(k) {
  if (k === 'look') return !!v('look') || ST.doc.kind === 'show';
  if (k === 'plan') return Object.keys(ST.mine).some(x => x.startsWith('plan:') && ST.mine[x].v);
  if (k === 'story') return Object.keys(ST.mine).some(x => x.startsWith('story:'));
  if (k === 'words') return Object.keys(ST.mine).some(x => x.startsWith('words:'));
  if (k === 'kit') return !!v('kit:got');
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
  if (sum) sum.textContent = n === all ? `All ${all} done. Your brand is ready to go live, and it keeps getting better every time you tell us something.` : `${n} of ${all} done.`;
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
  if (ST.pages.length > 1) {
    const top = el('nav', 'bp-top', null, { 'aria-label': 'Brand pages' });
    ST.pages.forEach(p => {
      const a = el('a', 'bp-chip', p.name, { href: '#' + p.key, 'aria-current': p.key === ST.key ? 'true' : 'false' });
      a.addEventListener('click', ev => { ev.preventDefault(); history.replaceState(null, '', '#' + p.key); openPage(p.key); });
      top.append(a);
    });
    BOX.append(top);
  }
  if (person && pg && !pg.mine) BOX.append(el('p', 'bp-admin', `You are looking at ${B.person}'s page as an admin. What you save here is saved on her page, under your name.`));

  // A person's page opens on the designs themselves: her name, one line, then three big pictures of the brand in use.
  const hello = el('div', 'bp-hello');
  const photo = fileById('photo');
  if (photo) hello.append(el('img', 'bp-face', null, { src: thumbOf(photo), alt: '' }));
  hello.append(el('h1', null, person ? `${first(B.person)}, here is your brand.` : `${B.name} brand`));
  BOX.append(hello);
  if (person) {
    const lede = el('p', 'bp-lede');
    lede.append(el('b', null, `Draft ${B.draft || 1}. `), `Here are your ${B.looks.length} designs. Pick one, and tell any part what to change.`);
    BOX.append(lede, betterChip(), paintLooks(), paintPromise(), paintBetter());
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
  STEPS.filter(([k]) => person || (k !== 'look' && k !== 'plan')).filter(([k]) => k !== 'plan' || (B.plan && B.plan.headline)).forEach(([k, t, s], i) => {
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
  const jump = el('a', 'bp-chip', null, { href: '#bp-talk', style: 'margin-top:10px' });
  jump.append(ico('chat'), el('span', null, person ? 'Tell us anything about your brand' : 'Tell us anything about this brand'));
  jump.addEventListener('click', ev => { ev.preventDefault(); $('bp-talk').scrollIntoView({ behavior: 'smooth' }); });
  BOX.append(jump);

  if (person && B.plan && B.plan.headline) BOX.append(paintPlan());
  const story = paintStory(), words = paintWords(), kit = paintKit();
  story.append(commentBox('sec:story', 'Tell us what to change in your story', 'What is wrong or missing, in your own words.'));
  BOX.append(story, words, kit);
  const talk = sec('talk', 'Anything else', `What should we add? What do you not like? Anything about the whole page or your channel. ${person ? 'Armin and the team read every word, and the answer appears right here.' : ''}`);
  talk.append(commentBox('', 'Write to the team', 'Something to add, something you do not like, an idea for your channel: write it here.', true));
  BOX.append(talk);
  tally();
  if (person) BOX.append(paintNext());
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

/* The designs: each one a big picture of the brand in use (the showcase build-people-kit.py draws from the kit
   itself), with the pick, a heart or a cross, and its own conversation. Swiped on a phone, three across on a computer. */
function paintLooks() {
  const B = ST.doc, s = el('section', null, null, { id: 'bp-look', style: 'scroll-margin-top:80px' });
  const row = el('div', 'bp-looks', null, { 'aria-label': 'Your designs' });
  const photo = fileById('photo');
  B.looks.forEach((l, i) => {
    const card = el('article', 'bp-look' + (v('look') === l.k ? ' picked' : ''), null, { 'data-look': l.k, 'aria-label': `${l.name}, design ${i + 1} of ${B.looks.length}` });
    const fig = el('figure', 'bp-shot');
    const show = fileById(l.show || '') || fileById(l.files.find(id => /youtube-banner/.test(id)) || '') || photo;
    if (show) {
      const ready = ST.done[show.id];
      const img = el('img', ready ? null : 'soft', null, { src: ready || thumbOf(show), alt: `${l.name}: your channel, your stream screen, X, a story and the colours, in this design`, 'data-full': show.id });
      fig.append(img);
      if (!ready) fullUrl(show).then(u => { img.src = u; img.classList.remove('soft'); }).catch(() => img.classList.remove('soft'));
    }
    card.append(fig);
    const body = el('div', 'body');
    const h = el('h3', null, l.name); const dt = draftTag(); if (dt) h.append(dt);
    body.append(h);
    // the marks sit under the picture, never on it: the picture is the design, whole
    if (l.rec || v('look') === l.k) {
      const marks = el('div', 'bp-row');
      if (l.rec) marks.append(el('span', 'bp-badge', 'Our pick for you'));
      if (v('look') === l.k) { const m = el('span', 'bp-mine'); m.append(ico('check', 16), el('span', null, 'Your pick')); marks.append(m); }
      body.append(marks);
    }
    body.append(el('p', null, l.short));
    const more = el('details', 'bp-more');
    more.append(el('summary', null, 'Why this design'), el('p', 'bp-why', l.why));
    more.append(swatches(l), el('p', 'bp-type', 'Type: ' + l.fonts.join(' and ')));
    body.append(more);
    const acts = el('div', 'bp-acts');
    const pick = el('button', 'pick', v('look') === l.k ? '✓ My design' : 'Pick this design', { type: 'button', 'aria-pressed': v('look') === l.k ? 'true' : 'false' });
    pick.addEventListener('click', async () => {
      pick.disabled = true;
      if (await save('look', l.k)) { ST.look = l.k; paint(); const c = D.querySelector(`.bp-look[data-look="${l.k}"]`); if (c) c.scrollIntoView({ block: 'nearest', inline: 'center' }); $('bp-look').scrollIntoView(); }
      pick.disabled = false;
    });
    acts.append(pick, react('react:look:' + l.k, 'heart', 'Love it', 'love'), react('react:look:' + l.k, 'x', 'Not me', 'no'));
    const see = ibtn(null, 'eye', 'All pictures', `See all ${l.files.length} pictures in ${l.name}`);
    see.addEventListener('click', () => { ST.look = l.k; paint(); $('bp-kit').scrollIntoView(); });
    acts.append(see);
    body.append(acts, commentBox('look:' + l.k, `Tell ${l.name} what to change`, 'A colour, a font, the photo, the feel: anything. Mixing two designs is fine too.'));
    card.append(body);
    row.append(card);
  });
  s.append(row);
  if (B.looks.length > 1) {
    const pager = el('div', 'bp-pager', null, { role: 'group', 'aria-label': 'Designs' });
    const cards = () => Array.from(row.children);
    B.looks.forEach((l, i) => {
      const b = el('button', null, null, { type: 'button', 'aria-label': `Show ${l.name}`, 'aria-current': i === 0 ? 'true' : 'false' });
      b.append(el('i'));
      b.addEventListener('click', () => { const c = cards()[i]; row.scrollTo({ left: c.offsetLeft - row.offsetLeft - (row.clientWidth - c.clientWidth) / 2, behavior: 'smooth' }); });
      pager.append(b);
    });
    let tick = 0;
    row.addEventListener('scroll', () => {
      cancelAnimationFrame(tick);
      tick = requestAnimationFrame(() => {
        const mid = row.scrollLeft + row.clientWidth / 2;
        let best = 0, d = 1e9;
        cards().forEach((c, i) => { const cm = c.offsetLeft - row.offsetLeft + c.clientWidth / 2; if (Math.abs(cm - mid) < d) { d = Math.abs(cm - mid); best = i; } });
        pager.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', i === best ? 'true' : 'false'));
      });
    }, { passive: true });
    s.append(pager, el('p', 'bp-hint', `Swipe to see all ${B.looks.length} designs.`));
  }
  const cmp = paintCompare();
  if (cmp) s.append(cmp);
  s.append(commentBox('sec:look', 'Tell us about the designs as a whole', 'Want a mix of two, a colour you love, a font you hate? Say it here.'));
  return s;
}

/* The colours of a design, each a button that copies its code, for when she makes something herself (Canva, CapCut). */
function swatches(l) {
  const box = el('div', 'bp-swatches', null, { role: 'group', 'aria-label': `${l.name} colours` });
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

/* Her channel today against the same place in the design in front: the banner strip every computer shows. Only when the
   page has her banner as it is today (brandpage.py sends it as 'today-banner'). */
function paintCompare() {
  const B = ST.doc, today = fileById('today-banner');
  const look = B.looks.find(l => l.k === ST.look) || B.looks[0];
  const neu = fileById(look.files.find(id => /youtube-banner/.test(id)) || '');
  if (!today || !neu) return null;
  const box = el('section', 'bp-cmp', null, { id: 'bp-cmp', 'aria-label': 'Today and in the new design' });
  box.append(el('h3', null, 'Your channel today, and in ' + look.name));
  const tabs = el('div', 'bp-groups', null, { role: 'group', 'aria-label': 'Which banner' });
  const fig = el('figure', 'bp-cmpimg');
  const img = el('img', null, null, { alt: '' });
  fig.append(img);
  const cap = el('figcaption');
  const show = which => {
    ST.cmp = which;
    const f = which === 'today' ? today : neu;
    img.src = ST.done[f.id] || thumbOf(f);
    img.alt = which === 'today' ? 'Your YouTube banner today' : `Your YouTube banner in ${look.name}`;
    if (!ST.done[f.id]) fullUrl(f).then(u => { if (ST.cmp === which) img.src = u; }).catch(() => { });
    cap.textContent = which === 'today' ? 'Today: the night globe and your name. Nothing says what the channel is or who it is for.' : `${look.name}: your face, your name, your line, and your two series, the way a computer shows it.`;
    tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.c === which ? 'true' : 'false'));
  };
  [['today', 'Today'], ['new', look.name]].forEach(([k, t]) => {
    const b = el('button', 'bp-chip', t, { type: 'button', 'data-c': k });
    b.addEventListener('click', () => show(k));
    tabs.append(b);
  });
  box.append(tabs, fig, cap);
  show(ST.cmp || 'new');
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
const VERDICT = { done: 'Built', building: 'Building it', no: 'Not doing it', armin: 'With Armin' };
function paintBetter() {
  const s = el('section', 'bp-better', null, { id: 'bp-better' });
  const h = el('h2', null, 'Make this page better for the whole team');
  h.append(el('span', 'bp-tag', 'For everyone'));
  s.append(h, el('p', null, 'This page is new, and it grows from what the team tells us. A feature you need, something that gets in your way, an idea from a brand you admire: say it here. Every request gets an honest answer (is it the best way, not only a good one), and what we build reaches every team member\'s page.'));
  const kinds = el('div', 'bp-kinds', null, { role: 'group', 'aria-label': 'What kind' });
  KINDS.forEach(([k, t]) => {
    const b = el('button', 'bp-chip', t, { type: 'button', 'data-kind': k, 'aria-pressed': ST.ptype === k ? 'true' : 'false' });
    b.addEventListener('click', () => { ST.ptype = k; kinds.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); });
    kinds.append(b);
  });
  const ta = el('textarea', 'short', null, { rows: '3', maxlength: '1500', placeholder: 'What would make this page better, for you or for anyone on the team?', 'aria-label': 'Make this page better for the whole team' });
  const send = el('button', 'bp-btn main', 'Send to the team', { type: 'button' });
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
      c.append(el('div', 'bp-sent' + (ans.length ? ' done' : ''), ans.length ? '✓ Answered' : '✓ Received. You get an honest answer here, usually within a day.'));
      ans.forEach(r => { const rc = el('div', 'bp-note site'); rc.append(el('div', 'who', 'Liberty Politics team'), el('p', null, r.text)); c.append(rc); });
      mineBox.append(c);
    });
  };
  send.addEventListener('click', async () => {
    if (ta.value.trim().length < 2) { line.textContent = 'Write a few words first.'; line.className = 'bp-msg bad'; return; }
    send.disabled = true; send.textContent = 'Sending...';
    try {
      await writeNote('page:' + ST.ptype, ta.value.trim());
      ta.value = ''; line.textContent = '✓ Sent. Thank you: this is how the page gets better for everyone.'; line.className = 'bp-msg';
      drawMine(); tally();
    } catch (e) { line.textContent = 'Not sent. Check your connection and try again.'; line.className = 'bp-msg bad'; }
    send.disabled = false; send.textContent = 'Send to the team';
  });
  s.append(kinds, ta, send, line, mineBox);
  drawMine();
  s.append(el('p', 'bp-h4', 'What the team asked for, and what we did'));
  const rows = ST.log.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  if (!rows.length) s.append(el('p', 'bp-sub', 'Nothing yet. Be the first: what would make this page better?', { style: 'margin:4px 0 0' }));
  const ul = el('ul', 'bp-log', null, { 'aria-label': 'What the team asked for' });
  rows.forEach((r, i) => {
    const li = el('li', null, null, { 'data-v': r.v || '' });
    if (i >= 4) li.hidden = true;
    const top = el('div', 'top');
    top.append(el('span', 'bp-v ' + (VERDICT[r.v] ? r.v : 'building'), VERDICT[r.v] || 'Building it'), el('span', 'who', [r.who ? 'From ' + r.who : '', r.date || ''].filter(Boolean).join(' · ')));
    li.append(top, el('p', null, r.asked || ''));
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
  box.append(el('p', null, `This is draft ${n} of your brand, made from your channel, your Shorts and your Sunday Edit. Every design, every picture and every line of text has its own box. Tell it what you love and what to change, and we redraw and rewrite it. The more you tell us, the more it looks and sounds like you.`));
  const how = el('ul', 'bp-how');
  [['eye', 'Look at anything: a design, a picture, a bio.'], ['chat', 'Tap the speech bubble under it and say what you think. Two words is enough.'], ['spark', `Draft ${n + 1} comes back on this page, with the answer under your words.`]].forEach(([i, t]) => {
    const li = el('li'); li.append(ico(i, 20), el('span', null, t)); how.append(li);
  });
  box.append(how);
  const hist = el('ul', 'bp-drafts', null, { 'aria-label': 'Drafts' });
  (B.drafts || []).forEach(d => { const li = el('li'); li.append(el('b', null, `Draft ${d.n}`), el('span', 'dim', d.date), el('span', null, d.what)); hist.append(li); });
  const nx = el('li', 'next'); nx.append(el('b', null, `Draft ${n + 1}`), el('span', null, 'Made from what you tell us.')); hist.append(nx);
  box.append(hist);
  return box;
}

/* The brand manager's plan: one sentence of position, why (every number with where it was read), the first things to
   do as a list she ticks, the next 90 days, and how we will know it works. */
function todoCount() {
  const P = ST.doc.plan || {}, items = P.first || [];
  const done = items.filter(t => (t.k === 'look' ? !!v('look') : v('plan:' + t.k) === 'done')).length;
  return `${done} of ${items.length} done`;
}
function paintPlan() {
  const P = ST.doc.plan, s = sec('plan', 'Your brand plan', `From your brand manager: what ${ST.doc.name} stands for, why these choices, and what to do first.`);
  s.classList.add('bp-plan');
  s.append(el('p', 'bp-thesis', P.headline));
  if ((P.why || []).length) {
    s.append(el('h3', null, 'Why this direction'));
    const ul = el('ul', 'bp-reasons');
    P.why.forEach(r => { const li = el('li'); li.append(el('b', null, r.t), el('span', null, r.d)); if (r.src) li.append(el('small', null, 'Source: ' + r.src)); ul.append(li); });
    s.append(ul);
  }
  if ((P.first || []).length) {
    const h = el('h3', null, 'Do these first ');
    h.append(el('span', 'bp-tag', '', { id: 'bp-todo-n' }));
    s.append(h);
    const ul = el('ul', 'bp-todo');
    P.first.forEach(t => {
      const key = 'plan:' + t.k;
      const isDone = () => (t.k === 'look' ? !!v('look') : v(key) === 'done');
      const li = el('li'), b = el('button', null, null, { type: 'button', 'aria-pressed': isDone() ? 'true' : 'false', 'data-plan': t.k });
      const box = el('i', null, isDone() ? '✓' : '');
      const tx = el('span'); tx.append(el('b', null, t.t), el('small', null, t.how));
      b.append(box, tx);
      b.addEventListener('click', async () => {
        if (t.k === 'look') { $('bp-look').scrollIntoView({ behavior: 'smooth' }); return; }
        b.disabled = true;
        const nv = isDone() ? '' : 'done';
        if (await save(key, nv)) { b.setAttribute('aria-pressed', nv ? 'true' : 'false'); box.textContent = nv ? '✓' : ''; progress(); }
        b.disabled = false;
      });
      li.append(b); ul.append(li);
    });
    s.append(ul);
  }
  if ((P.grow || []).length) {
    s.append(el('h3', null, 'The next 90 days'));
    const ol = el('ol', 'bp-grow');
    P.grow.forEach(g => { const li = el('li'); li.append(el('b', null, g.t), el('span', 'dim', g.d)); ol.append(li); });
    s.append(ol);
  }
  if (P.measure) {
    s.append(el('h3', null, 'How we will know it works'));
    const m = el('p', 'bp-measure', P.measure);
    s.append(m);
    if (P.measureSrc) s.append(el('small', 'bp-src', 'Source: ' + P.measureSrc));
  }
  s.append(commentBox('sec:plan', 'Tell us what you think of the plan', 'Something you would never do, something you want to try, a goal of your own.'));
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
  if (!saved && draft) box.append(el('span', 'bp-draft', 'My first draft. Change anything, then tap outside the box.'));
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
    ? 'Who you are, what you believe, where you are going. Everything else is written from this: your bios, your About, your plan. These are my first drafts, from your own About text. Each box saves itself when you tap outside it.'
    : 'The story every picture and line of this brand comes from. Each box saves itself when you tap outside it.');
  const h = s.querySelector('h2'); const dt = draftTag(); if (dt && person) h.append(dt);
  B.story.forEach(q => { const [box] = field('story:' + q.k, q.label, q.help, q.draft); s.append(box); });
  const ok = el('button', 'bp-btn main', 'This is right as it is', { type: 'button' });
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
    ? 'Every text each account needs, written in your voice and fitted to each platform\'s limit. Copy one, paste it into the app, done. Change any of them here and we keep your version; tell any of them what is off and the next draft fixes it.'
    : 'The text on each account. Copy one, paste it into the app, done.');
  const h = s.querySelector('h2'); const dt = draftTag(); if (dt && person) h.append(dt);
  const W = B.words;
  if (W.length > 1) {
    const tabs = el('div', 'bp-wtabs', null, { role: 'group', 'aria-label': 'Platform' });
    W.forEach(w => {
      const c = el('button', 'bp-chip', null, { type: 'button', 'aria-pressed': w.p === ST.wp ? 'true' : 'false', 'data-p': w.p });
      c.append(el('span', null, w.p), el('small', null, String(w.fields.length)));
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
  s.append(commentBox('sec:words', 'Tell us about your words as a whole', 'Too formal, not you, missing a platform? Say it here.'));
  return s;
}
function wordCard(w, f) {
  const k = 'words:' + slug(w.p) + ':' + f.k, about = 'w:' + slug(w.p) + ':' + f.k;
  const card = el('div', 'bp-card', null, { 'data-w': k });
  const h = el('h3', null, f.label);
  const count = el('span', 'bp-count');
  h.append(count); card.append(h);
  if (f.why) card.append(el('p', 'bp-why', f.why));
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
  if (of) lim.append(el('span', null, `${f.official === false ? 'About' : 'Limit'} ${of} characters${f.perLine ? ' a line' : ''}${f.official === false ? ' (widely reported, not stated by ' + w.p + ')' : ''}`));
  else if (w.p !== 'Everywhere') lim.append(el('span', null, `${w.p} states no limit`));
  if (f.src) { let host = ''; try { host = new URL(f.src).hostname.replace(/^www\./, ''); } catch (x) { } lim.append(el('a', null, `Checked on ${host || 'the platform'}`, { href: f.src, target: '_blank', rel: 'noopener' })); }
  if (f.note) lim.append(el('span', null, f.note));
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
  card.append(grow(ta), lim, acts, state, commentBox(about, 'Make this better'));
  return card;
}

function paintKit() {
  const B = ST.doc, person = B.kind === 'person';
  const look = B.looks.find(l => l.k === ST.look) || B.looks[0];
  const s = sec('kit', 'Your kit', person
    ? `Every picture in ${look.name}, sized for each app. Tap a picture to see it full size. Download one, or all of them at once. Each one has its own box: tell it what to change and the next draft redraws it.`
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
      m.append(el('b', null, f.title), el('small', null, `${f.w} × ${f.h} · ${sizeText(f.bytes || 0)}${f.clear ? ' · clear background' : ''}`));
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
      li.append(th, m, acts, commentBox('file:' + f.id, 'Make this picture better'));
      ul.append(li);
    });
    s.append(ul);
  });
  s.append(commentBox('sec:kit', 'Tell us about the pictures as a whole', 'A size you need, an app we missed, a picture you want changed: say which.'));
  return s;
}

function paintNext() {
  const s = sec('next', 'What happens next', '');
  const ol = el('ul', 'bp-next');
  [['eye', 'You pick a design and tell us what you love and what you do not, on anything on this page.'],
   ['pen', 'We redraw the pictures and rewrite the words, and the next draft appears here with our answer under each of your comments.'],
   ['down', 'When it feels like you, you download the kit and put it on your accounts. Nothing goes on any account unless you put it there.']].forEach(([i, t]) => {
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
    draw();
    return true;
  };
  if (!go()) { let n = 0; const t = setInterval(() => { if (go() || ++n > 200) clearInterval(t); }, 50); }
  window.addEventListener('hashchange', () => { const k = location.hash.slice(1); if (ST.pages.some(p => p.key === k) && k !== ST.key) openPage(k); });
}
window.LPBRAND = { state: () => ({ uid: ST.uid, key: ST.key, look: ST.look, wp: ST.wp, ptype: ST.ptype, log: ST.log.length, pages: ST.pages.map(p => p.key), mine: Object.assign({}, ST.mine) }) };      // for brand-test.html
start();
