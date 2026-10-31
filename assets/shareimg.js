/* The picture a reader makes to post: one file for both sites (libertypolitics.com and iranuncensored.com copy it
   from here into dist/assets/, beside share.js). Its looks are the end of build/share.css.

   WHY (Armin, 30 October 2026, about Call the Midterms, the coalition calculator and the Regime Board): "what I think
   is missing is that we could generate an image for people to be able to show a post on social media ... with our
   Liberty Politics branding on it. People could download and post that image ... I think that should also be for
   Iran Uncensored ... It has our website and our branding on it and has the best strategy for bringing people back
   to our website." A link is one line in a feed; a picture of what the reader built is the post itself, and the
   address printed big at its foot is how a stranger who only saw the picture finds the page.

   THE PICTURE. 1080x1350 (4:5: the tallest a feed shows whole on X, Instagram and Facebook), or 1080x1920 for a story.
   The frame is drawn here, never by a tool: the site's mark and name, the tool's name (kicker), its title and line,
   the tool's own drawing in the middle, and a foot in the site's colour with a call to come and the site's address,
   big. Every word stays 72px inside the edges, so a crop never cuts it; a story keeps clear of the top and bottom
   where the phone draws its own buttons. The brand is read from the page, never from which site this is: the colours
   from the stylesheet's variables (--bg --field --ink ...), the fonts from --display and --body, the name and the round
   mark from the header's .mark, the flag ribbon from .ribbon when the page has one, the address from <link
   rel=canonical>. window.LPSITE.shot may override any of these: {c:{...}, name:[{t,hi}], mark, host, upper}.
   Persian pages draw right to left in the page's own Persian font; the address is always drawn left to right.

   THE CONTRACT. A tool registers one picture:
     (window.LPShotQ = window.LPShotQ || []).push({
       id: 'regime',                         one per tool
       kicker: 'THE REGIME BOARD',           already in the page's language
       title: function () { return '...'; },
       sub: function () { return '...'; },   optional
       text: function () { return '...'; },  optional: the words put in front of the link when it is posted
       cta: 'See who fell, and when',        printed above the site's address at the foot
       url: function () { return location.href; },   the address that reopens the reader's exact state
       el: '#regime',                        optional: the part of the page it belongs to (default '#' + id)
       draw: function (ctx, box, kit) { ... }         draws inside box {x,y,w,h}; may return a Promise
     });
   kit = { img(src) -> Promise<HTMLImageElement|null>   same-origin only, so the canvas is never tainted; null on failure
           font(px, weight, family) -> css font string    family 'display' | 'body' | 'latin'; default display at 800+, else body
           fit(ctx, text, maxWidth, px, weight, family) -> the largest px up to px that fits (and sets ctx.font)
           lines(ctx, text, maxWidth, maxLines) -> lines, the last cut with an ellipsis
           face(ctx, img|null, cx, cy, d, {ring, ringW, initials, dim, color}) -> a round face, or initials when no img
           initials(name), num(n) (Persian digits on a Persian page), round(ctx, x, y, w, h, r) (a rounded rect path)
           c: {bg, panel, sunk, raise, ink, dim, line, field, onField, red, dem, rep, ind}, fa, rtl, size: 'post'|'story' }
   window.LPShot = { open(id, opener), make(id, size) -> Promise<canvas>, save(id, size), blob(canvas), list(), pick(el) }.
   It takes every registration waiting in LPShotQ when it loads, and any pushed later. Loaded twice, it keeps the first.

   WHO LOADS IT. share.js (on every page of both sites) loads this file when a page has registered a picture, and opens
   it from any control carrying data-shot="<id>" ("Make a picture"). The share panel shows the picture with a Save
   button at its top whenever the page has one, so every Share tap also offers the picture.

   THE SHEET it opens: the picture, Post size or Story size, Save picture (a PNG with a good file name), Post it (the
   phone's own list with the picture attached, offered only where the phone can take a file), Copy link, and one line
   telling the reader to put the link in the post. No alert, confirm or prompt (an Artifact page refuses them). */
(function () {
  'use strict';
  var W = window, D = document;
  if (W.LPShot && W.LPShot.ready) return;
  /* The site's settings (its words, its digits, its overrides) are read when they are used, never when this file
     loads: a page may load this file before the script that sets window.LPSITE (the Regime Board's pages do). */
  function site() { return (W.LPSITE && typeof W.LPSITE === 'object') ? W.LPSITE : {}; }
  function digits() { var d = site().digits; return typeof d === 'string' && d.length === 10 ? d : ''; }
  function tt(s, v) {
    var STR = site().strings || null, out = STR && typeof STR[s] === 'string' ? STR[s] : s;
    if (v) out = out.replace(/\{(\w+)\}/g, function (m, k) { return k in v ? String(v[k]) : m; });
    return out;
  }
  var HTML = D.documentElement;
  var FA = /^fa\b/i.test(HTML.getAttribute('lang') || '');
  var RTL = (HTML.getAttribute('dir') || '').toLowerCase() === 'rtl';
  var UA = navigator.userAgent || '';
  var PHONE = /Android|iPhone|iPad|iPod/i.test(UA) || (navigator.userAgentData && navigator.userAgentData.mobile === true);
  var SIZES = { post: { w: 1080, h: 1350, top: 0, bottom: 0 }, story: { w: 1080, h: 1920, top: 230, bottom: 300 } };
  var M = 72;      // the margin every word keeps from the edges
  var REG = {}, IDS = [];

  function num(n) { var s = String(n), D10 = digits(); return FA && D10 ? s.replace(/[0-9]/g, function (d) { return D10[d]; }) : s; }
  function delay(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  // ---------------------------------------------------------------- the brand, read from the page
  var BR = null;
  function cssv(cs, n, d) { var v = cs.getPropertyValue(n); v = v && v.trim(); return v || d; }
  function brand() {
    if (BR) return BR;
    var cs = W.getComputedStyle(HTML), o = (site().shot && typeof site().shot === 'object') ? site().shot : {};
    var c = {
      bg: cssv(cs, '--bg', '#101010'), panel: cssv(cs, '--panel', '#191918'), sunk: cssv(cs, '--sunk', '#0A0A0A'), raise: cssv(cs, '--raise', '#232322'),
      ink: cssv(cs, '--ink', '#F3F1EA'), dim: cssv(cs, '--dim', '#B4B2A8'), line: cssv(cs, '--line', '#2B2A27'),
      field: cssv(cs, '--field', '#F4C430'), onField: cssv(cs, '--on-field', '#14120B'),
      red: cssv(cs, '--red', '') || cssv(cs, '--rep', '') || '#E5564A',
      dem: cssv(cs, '--dem', '#5B8DEF'), rep: cssv(cs, '--rep', '#E5564A'), ind: cssv(cs, '--ind', '#B9B7A6')
    };
    if (o.c && typeof o.c === 'object') Object.keys(o.c).forEach(function (k) { c[k] = o.c[k]; });
    var mk = D.querySelector('.top .mark') || D.querySelector('.mark'), sp = mk && mk.querySelector('span'), name = [];
    if (Array.isArray(o.name)) name = o.name;
    else if (sp) [].forEach.call(sp.childNodes, function (n) {
      var t = (n.textContent || '').replace(/\s+/g, ' ');
      if (t.trim()) name.push({ t: t, hi: n.nodeType === 1 && /^(B|STRONG|EM)$/.test(n.tagName) });
    });
    var canon = D.querySelector('link[rel="canonical"]'), cu = null;
    try { cu = new URL(canon ? canon.href : location.href); } catch (e) { }
    var host = o.host || (cu && /\./.test(cu.hostname) ? cu.hostname.replace(/^www\./, '') : location.hostname.replace(/^www\./, ''));
    if (!name.length) name = [{ t: host, hi: false }];
    var im = mk && mk.querySelector('img'), h = D.querySelector('h1') || D.querySelector('h2');
    var rib = [].map.call(D.querySelectorAll('.ribbon > i'), function (i) { return W.getComputedStyle(i).backgroundColor; })
      .filter(function (x) { return x && !/rgba\(0, 0, 0, 0\)|transparent/.test(x); });
    BR = {
      c: c, display: cssv(cs, '--display', 'sans-serif'), body: cssv(cs, '--body', 'sans-serif'),
      // the address is Latin on every page: the Latin display face where the page has one
      latin: o.latin || (FA ? '"Big Shoulders Display","Arial Narrow",sans-serif' : cssv(cs, '--display', 'sans-serif')),
      name: name, mark: o.mark || (im ? (im.currentSrc || im.src) : ''), host: host,
      nameUp: o.upper != null ? !!o.upper : (mk ? W.getComputedStyle(mk).textTransform === 'uppercase' : false),
      titleUp: o.upper != null ? !!o.upper : (h ? W.getComputedStyle(h).textTransform === 'uppercase' : false),
      ribbon: Array.isArray(o.ribbon) ? o.ribbon : rib, canon: cu
    };
    return BR;
  }

  // ---------------------------------------------------------------- fonts: every weight the picture uses, loaded before it is drawn
  var FONTS = null;
  function fonts() {
    if (FONTS) return FONTS;
    var b = brand(), sample = FA ? 'ابپژ ۱۲۳ Aa1' : 'Aa1', want = [];
    ['900', '800', '700'].forEach(function (w) { want.push(w + ' 40px ' + b.display); want.push(w + ' 40px ' + b.latin); });
    ['400', '600', '700'].forEach(function (w) { want.push(w + ' 40px ' + b.body); });
    var all = !(D.fonts && D.fonts.load) ? Promise.resolve() : Promise.all(want.map(function (f) { return D.fonts.load(f, sample).catch(function () { return null; }); }))
      .then(function () { return D.fonts.ready; });
    FONTS = Promise.race([all, delay(3500)]);
    return FONTS;
  }
  function font(px, weight, fam) {
    var b = brand(), w = weight || 400;
    var f = fam === 'display' ? b.display : fam === 'body' ? b.body : fam === 'latin' ? b.latin : (+w >= 800 ? b.display : b.body);
    return w + ' ' + Math.max(1, Math.round(px)) + 'px ' + f;
  }
  function fit(ctx, text, maxW, px, weight, fam) {
    var p = Math.round(px);
    ctx.font = font(p, weight, fam);
    var w = ctx.measureText(text).width;
    if (w > maxW) { p = Math.max(10, Math.floor(p * maxW / w)); ctx.font = font(p, weight, fam); }
    while (p > 10 && ctx.measureText(text).width > maxW) { p--; ctx.font = font(p, weight, fam); }
    return p;
  }
  function wrap(ctx, text, maxW) {
    var words = String(text || '').split(/\s+/).filter(Boolean), out = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (cur && ctx.measureText(t).width > maxW) { out.push(cur); cur = w; } else cur = t;
    });
    if (cur) out.push(cur);
    return out;
  }
  function lines(ctx, text, maxW, max) {
    var l = wrap(ctx, text, maxW);
    if (max && l.length > max) {
      var last = l.slice(max - 1).join(' ');
      while (last.length > 1 && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1).replace(/\s+$/, '');
      l = l.slice(0, max - 1).concat([last + '…']);
    }
    return l;
  }
  function spacing(ctx, px) { try { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; } catch (e) { } }
  function round(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  function alpha(col, a) {
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(col || '');
    if (m) {
      var h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
      return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')';
    }
    m = /^rgba?\(([^)]+)\)$/i.exec(col || '');
    if (m) { var p = m[1].split(',').slice(0, 3); return 'rgba(' + p.join(',') + ',' + a + ')'; }
    return col;
  }
  function initials(n) {
    var w = String(n || '').replace(/,?\s+(Jr|Sr|II|III|IV)\.?$/, '').trim().split(/\s+/).filter(Boolean);
    return w.length ? (w[0].charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : '')).toUpperCase() : '';
  }

  // ---------------------------------------------------------------- pictures: same origin only, never fatal
  var IMG = {}, NOIMG = false;
  function img(src) {
    if (!src || NOIMG) return Promise.resolve(null);
    var u;
    try { u = new URL(src, D.baseURI); } catch (e) { return Promise.resolve(null); }
    if (u.protocol !== 'data:' && u.protocol !== 'blob:' && u.origin !== location.origin) return Promise.resolve(null);
    var k = u.href;
    if (IMG[k]) return IMG[k];
    IMG[k] = new Promise(function (res) {
      var im = new Image(), t = setTimeout(function () { res(null); }, 6000);
      im.decoding = 'async';
      im.onload = function () {
        clearTimeout(t);
        var ok = function () { res(im.naturalWidth ? im : null); };
        if (im.decode) im.decode().then(ok, ok); else ok();
      };
      im.onerror = function () { clearTimeout(t); delete IMG[k]; res(null); };
      im.src = k;
    });
    return IMG[k];
  }
  function face(ctx, im, cx, cy, d, o) {
    o = o || {};
    var c = brand().c, r = d / 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath();
    ctx.fillStyle = o.bg || c.raise; ctx.fill();
    ctx.clip();
    if (im) {
      // cover, with the face held where the site holds it (object-position 50% 18%)
      var iw = im.naturalWidth, ih = im.naturalHeight, s = Math.max(d / iw, d / ih), w = iw * s, h = ih * s;
      try { ctx.drawImage(im, cx - w / 2, cy - r - (h - d) * (o.top == null ? 0.18 : o.top), w, h); } catch (e) { }
    } else if (o.initials) {
      ctx.fillStyle = o.color || c.dim;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = font(d * 0.4, 800, 'display');
      ctx.fillText(o.initials, cx, cy + d * 0.03);
    }
    if (o.dim) { ctx.fillStyle = 'rgba(0,0,0,' + o.dim + ')'; ctx.fillRect(cx - r, cy - r, d, d); }
    ctx.restore();
    if (o.ring) {
      var rw = o.ringW || Math.max(3, d * 0.06);
      ctx.beginPath(); ctx.arc(cx, cy, r - rw / 2, 0, Math.PI * 2);
      ctx.lineWidth = rw; ctx.strokeStyle = o.ring; ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- the frame
  // The address printed at the foot: the public host and the page's own path (no query, no hash, no trailing /).
  function addr(r) {
    var b = brand(), u = null;
    try { u = new URL(r.url(), location.href); } catch (e) { }
    var path = (u && u.hostname.replace(/^www\./, '') === b.host) ? u.pathname : (b.canon ? b.canon.pathname : '/');
    path = path.replace(/index\.html$/, '').replace(/\/+$/, '');
    try { path = decodeURI(path); } catch (e) { }
    return b.host + path;
  }
  function text(ctx, s, x, y, o) {
    o = o || {};
    ctx.fillStyle = o.color || brand().c.ink;
    ctx.textAlign = o.align || 'start';
    ctx.textBaseline = o.base || 'alphabetic';
    if (o.max) fit(ctx, s, o.max, o.px || 30, o.weight || 400, o.fam);
    else ctx.font = font(o.px || 30, o.weight || 400, o.fam);
    ctx.fillText(s, x, y);
    return ctx.measureText(s).width;
  }

  function frame(ctx, r, S) {
    var b = brand(), c = b.c, Wd = S.w, H = S.h, dir = RTL ? -1 : 1, x0 = RTL ? Wd - M : M, x1 = RTL ? M : Wd - M, inner = Wd - 2 * M;
    ctx.direction = RTL ? 'rtl' : 'ltr';
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, Wd, H);
    // a low light of the site's colour behind the title, so the ground is not a flat block
    var g = ctx.createRadialGradient(RTL ? Wd * 0.12 : Wd * 0.88, S.top + 120, 0, RTL ? Wd * 0.12 : Wd * 0.88, S.top + 120, 760);
    g.addColorStop(0, alpha(c.field, 0.13)); g.addColorStop(1, alpha(c.field, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, H);
    // the stripe along the top: the page's flag ribbon where it has one, else the site's colour
    var rib = b.ribbon.length ? b.ribbon : [c.field];
    rib.forEach(function (col, k) { ctx.fillStyle = col; ctx.fillRect(Wd * k / rib.length, 0, Wd / rib.length + 1, 12); });

    // the brand row: the round mark, the name with its lit word, and (where it fits) the tool's name at the far end
    var y = S.top + 52, d = 68;
    return img(b.mark).then(function (mk) {
      var mx = RTL ? x0 - d / 2 : x0 + d / 2;
      if (mk) face(ctx, mk, mx, y + d / 2, d, { top: 0.5 });
      else { ctx.beginPath(); ctx.arc(mx, y + d / 2, d / 2, 0, Math.PI * 2); ctx.fillStyle = c.field; ctx.fill(); }
      var nx = x0 + dir * (d + 18), npx = FA ? 40 : 46;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'start';
      spacing(ctx, FA ? 0 : 1);
      var nameW = 0;
      b.name.forEach(function (p) { ctx.font = font(npx, 800, 'display'); nameW += ctx.measureText(b.nameUp ? p.t.toUpperCase() : p.t).width; });
      var cur = nx;
      b.name.forEach(function (p) {
        var t = b.nameUp ? p.t.toUpperCase() : p.t;
        ctx.font = font(npx, 800, 'display'); ctx.fillStyle = p.hi ? c.field : c.ink;
        ctx.fillText(t, cur, y + d / 2 + (FA ? 2 : 3));
        cur += dir * ctx.measureText(t).width;
      });
      spacing(ctx, 0);
      // the kicker
      var kick = String(r.kicker || ''), up = b.titleUp && !FA ? kick.toUpperCase() : kick, kpx = FA ? 30 : 32;
      ctx.font = font(kpx, 800, 'display'); spacing(ctx, FA ? 0 : 2);
      var kw = ctx.measureText(up).width, kickOwn = kw > inner - (d + 18 + nameW + 48);
      var ty = y + d + 34;
      if (kick && !kickOwn) {
        ctx.fillStyle = c.field; ctx.textAlign = 'end'; ctx.fillText(up, x1, y + d / 2 + 3);
      }
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'start';
      // a thin rule under the brand row
      ctx.fillStyle = c.line; ctx.fillRect(M, y + d + 20, inner, 2);
      if (kick && kickOwn) {
        ty += 40;
        fit(ctx, up, inner, kpx, 800, 'display'); ctx.fillStyle = c.field; ctx.fillText(up, x0, ty);
        ty += 4;
      }
      spacing(ctx, 0);

      // the title: as big as fits in two lines, and only when it cannot be read that way, three
      var title = String(r.title() || ''), T = b.titleUp && !FA ? title.toUpperCase() : title;
      var px, lh = FA ? 1.42 : 0.98, L, fits = function (n) {
        ctx.font = font(px, 900, 'display'); L = wrap(ctx, T, inner);
        return L.length <= n && L.every(function (l) { return ctx.measureText(l).width <= inner; });
      };
      for (px = FA ? 74 : 96; px >= (FA ? 50 : 62) && !fits(2); px -= 2) { }
      if (px < (FA ? 50 : 62)) for (px = FA ? 58 : 72; px > (FA ? 40 : 48) && !fits(3); px -= 2) { }
      ctx.font = font(px, 900, 'display');
      L = lines(ctx, T, inner, 3);
      ctx.fillStyle = c.ink;
      ty += 26 + px * (FA ? 1.05 : 0.9);
      L.forEach(function (l, k) { ctx.fillText(l, x0, ty + k * px * lh); });
      ty += (L.length - 1) * px * lh;
      // the line under it
      var sub = r.sub ? String(r.sub() || '') : '';
      if (sub) {
        var spx = FA ? 30 : 32;
        ctx.font = font(spx, 600, 'body');
        var SL = lines(ctx, sub, inner, 2);
        ctx.fillStyle = c.dim;
        ty += spx * (FA ? 2.25 : 1.75);
        SL.forEach(function (l, k) { ctx.fillText(l, x0, ty + k * spx * 1.38); });
        ty += (SL.length - 1) * spx * 1.38;
      }

      // the foot: the call to come and the address, big, on the site's colour, to the bottom edge
      var footH = 200, fy = H - S.bottom - footH;
      ctx.fillStyle = c.field; ctx.fillRect(0, fy, Wd, H - fy);
      var cta = String(r.cta || '');
      ctx.fillStyle = c.onField;
      if (cta) { fit(ctx, cta, inner, FA ? 32 : 34, 700, 'body'); ctx.fillText(cta, x0, fy + 64); }
      // an arrow in a dark circle at the far end of the address line: "go here"
      var ad = addr(r), ar = 34, ay = fy + 136, ax = RTL ? M + ar : Wd - M - ar;
      ctx.beginPath(); ctx.arc(ax, ay - 2, ar, 0, Math.PI * 2); ctx.fillStyle = c.onField; ctx.fill();
      ctx.strokeStyle = c.field; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      var s = 13, ux = RTL ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(ax - ux * s, ay - 2 + s); ctx.lineTo(ax + ux * s, ay - 2 - s);
      ctx.moveTo(ax + ux * s - ux * 17, ay - 2 - s); ctx.lineTo(ax + ux * s, ay - 2 - s); ctx.lineTo(ax + ux * s, ay - 2 - s + 17); ctx.stroke();
      ctx.save(); ctx.direction = 'ltr';
      ctx.fillStyle = c.onField; ctx.textAlign = RTL ? 'right' : 'left';
      spacing(ctx, 1);
      fit(ctx, ad, inner - 2 * ar - 24, 84, 900, 'latin');
      ctx.fillText(ad, RTL ? Wd - M : M, fy + 160);
      spacing(ctx, 0);
      ctx.restore();
      ctx.direction = RTL ? 'rtl' : 'ltr';
      ctx.textAlign = 'start'; ctx.lineCap = 'butt';
      var top = Math.round(ty + 46);
      return { x: M, y: top, w: inner, h: Math.max(120, fy - 40 - top) };
    });
  }

  var KIT = null;
  function kit(size) {
    if (!KIT) KIT = { img: img, font: font, fit: fit, lines: lines, wrap: wrap, face: face, initials: initials, num: num, round: round, alpha: alpha, text: text, fa: FA, rtl: RTL };
    KIT.c = brand().c; KIT.size = size;
    return KIT;
  }

  function make(id, size) {
    var r = REG[id];
    if (!r) return Promise.reject(new Error('no picture called ' + id));
    var S = SIZES[size] || SIZES.post;
    return fonts().then(function () {
      var cv = D.createElement('canvas');
      cv.width = S.w; cv.height = S.h;
      var ctx = cv.getContext('2d');
      return frame(ctx, r, S).then(function (box) {
        ctx.save();
        ctx.beginPath(); ctx.rect(0, box.y - 12, S.w, box.h + 24); ctx.clip();
        ctx.direction = RTL ? 'rtl' : 'ltr'; ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
        var done;
        try { done = Promise.resolve(r.draw(ctx, box, kit(size))); } catch (e) { done = Promise.reject(e); }
        // a drawing that fails leaves the frame: the picture still carries the title and the address
        return done.catch(function (e) { try { console.warn('picture ' + id + ':', e); } catch (x) { } })
          .then(function () { ctx.restore(); return cv; });
      });
    });
  }
  // A canvas as a PNG. If a picture slipped in from somewhere else and the canvas will not give its pixels, it is
  // drawn again with initials in place of every picture.
  function blob(cv) {
    return new Promise(function (res, rej) {
      try {
        if (cv.toBlob) cv.toBlob(function (b) { if (b) res(b); else rej(new Error('no picture')); }, 'image/png');
        else {
          var d = cv.toDataURL('image/png'), bin = atob(d.split(',')[1]), a = new Uint8Array(bin.length);
          for (var k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k);
          res(new Blob([a], { type: 'image/png' }));
        }
      } catch (e) { rej(e); }
    });
  }
  function png(id, size) {
    return make(id, size).then(blob).catch(function (e) {
      if (NOIMG) throw e;
      NOIMG = true;
      return make(id, size).then(blob).then(function (b) { NOIMG = false; return b; }, function (x) { NOIMG = false; throw x; });
    });
  }
  function fileName(r, size) {
    var site = brand().host.split('.')[0].replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'picture';
    var t = new Date(), day = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
    return site + '-' + String(r.id).replace(/[^a-z0-9]+/gi, '-').toLowerCase() + (size === 'story' ? '-story' : '') + '-' + day + '.png';
  }
  function download(b, name) {
    var a = D.createElement('a'), u = URL.createObjectURL(b);
    a.href = u; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
    D.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 4000);
  }
  function count(method, r) {
    try { D.dispatchEvent(new CustomEvent('lp:share', { detail: { method: method, url: r.url(), picture: r.id } })); } catch (x) { }
    try { if (!site().noStats && typeof W.gtag === 'function') W.gtag('event', 'share', { method: method, content_type: 'picture', item_id: r.id }); } catch (x) { }
  }
  function save(id, size) {
    var r = REG[id];
    if (!r) return Promise.resolve(false);
    return png(id, size).then(function (b) { download(b, fileName(r, size)); count('picture-save', r); return true; });
  }

  // ---------------------------------------------------------------- the sheet
  var ICON = {
    x: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    save: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
    post: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
    ok: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
  };
  function el(tag, cls, t) { var n = D.createElement(tag); if (cls) n.className = cls; if (t != null) n.textContent = t; return n; }
  function btn(cls, icon, label) { var b = el('button', cls), i = el('i', 'shot-i'), s = el('span', null, label); b.type = 'button'; i.innerHTML = icon; b.append(i, s); return b; }
  function copyText(t, input) {
    var old = function () {
      return new Promise(function (res, rej) {
        try { input.focus(); input.select(); input.setSelectionRange(0, t.length); if (D.execCommand && D.execCommand('copy')) res(); else rej(new Error('no copy')); } catch (x) { rej(x); }
      });
    };
    if (navigator.clipboard && navigator.clipboard.writeText && W.isSecureContext !== false) return navigator.clipboard.writeText(t).catch(old);
    return old();
  }

  var SH = null, CUR = null, SIZE = 'post', BLOB = null, OBJ = '', GEN = 0, sayT = 0;
  function build() {
    var dlg = el('dialog', 'sheet shr shot'), inner = el('div', 'sheet-in'), top = el('div', 'sheet-top'), h = el('h2', null, tt('Your picture'));
    dlg.id = 'shot'; dlg.setAttribute('aria-labelledby', 'shot-h'); h.id = 'shot-h'; h.tabIndex = -1;
    var x = el('button', 'sheet-x'); x.type = 'button'; x.setAttribute('aria-label', tt('Close')); x.innerHTML = ICON.x;
    top.append(h, x);
    var body = el('div', 'sheet-body');
    var sizes = el('div', 'shot-sizes'); sizes.setAttribute('role', 'group'); sizes.setAttribute('aria-label', tt('The size of the picture'));
    var bPost = el('button', 'shot-size', tt('Post size')), bStory = el('button', 'shot-size', tt('Story size'));
    bPost.type = bStory.type = 'button'; bPost.setAttribute('data-size', 'post'); bStory.setAttribute('data-size', 'story');
    sizes.append(bPost, bStory);
    var fig = el('figure', 'shot-fig'), im = el('img', 'shot-img'), wait = el('p', 'shot-wait', tt('Drawing your picture'));
    im.alt = tt('Your picture, to post'); im.width = 1080; im.height = 1350;
    fig.append(im, wait);
    var acts = el('div', 'shot-acts');
    var bSave = btn('btn btn-key shot-save', ICON.save, tt('Save picture'));
    var bPostIt = btn('btn btn-line shot-post', ICON.post, tt('Post it'));
    acts.append(bSave, bPostIt);
    var row = el('div', 'shr-copy'), url = el('input', 'shr-url'), go = btn('btn btn-line shr-go shot-copy', ICON.copy, tt('Copy link'));
    url.type = 'text'; url.readOnly = true; url.dir = 'ltr'; url.setAttribute('aria-label', tt('The link to this page')); url.setAttribute('autocomplete', 'off'); url.spellcheck = false;
    url.addEventListener('focus', function () { try { url.select(); } catch (e) { } });
    row.append(url, go);
    var tip = el('p', 'shot-tip', tt('Put the link in your post, so people can find the page.'));
    var say = el('p', 'shot-say'); say.setAttribute('role', 'status'); say.setAttribute('aria-live', 'polite');
    body.append(fig, sizes, acts, row, tip, say);
    inner.append(top, body); dlg.appendChild(inner);

    function said(t) { clearTimeout(sayT); say.textContent = t; sayT = setTimeout(function () { say.textContent = ''; }, 4000); }
    function busy(on) { fig.classList.toggle('is-busy', on); bSave.disabled = on; bPostIt.disabled = on; }
    sizes.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('.shot-size') : null;
      if (!b || !CUR) return;
      SIZE = b.getAttribute('data-size'); render();
    });
    bSave.addEventListener('click', function () {
      if (!CUR || !BLOB) return;
      download(BLOB, fileName(CUR, SIZE)); count('picture-save', CUR);
      said(tt('Saved. Now post it, with the link.'));
    });
    bPostIt.addEventListener('click', function () {
      if (!CUR || !BLOB) return;
      var r = CUR, f = new File([BLOB], fileName(r, SIZE), { type: 'image/png' }), u = r.url();
      var words = r.text ? String(r.text() || '') : String(r.title() || '');
      try {
        navigator.share({ files: [f], title: String(r.title() || ''), text: (words ? words + ' ' : '') + u })
          .then(function () { count('picture-post', r); said(tt('Saved. Now post it, with the link.')); }, function () { });
      } catch (e) { }
    });
    go.addEventListener('click', function () {
      if (!CUR) return;
      var u = url.value, lab = go.querySelector('span'), ic = go.querySelector('.shot-i');
      copyText(u, url).then(function () {
        go.classList.add('ok'); ic.innerHTML = ICON.ok; lab.textContent = tt('Copied'); said(tt('Link copied'));
        setTimeout(function () { go.classList.remove('ok'); ic.innerHTML = ICON.copy; lab.textContent = tt('Copy link'); }, 2600);
        count('picture-copy', CUR);
      }, function () { try { url.focus(); url.select(); } catch (e) { } said(tt('The link is selected. Copy it from the box.')); });
    });
    x.addEventListener('click', function () { dlg.close(); });
    var downOut = false;
    var outside = function (ev) { var r = inner.getBoundingClientRect(); return ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom; };
    dlg.addEventListener('pointerdown', function (ev) { downOut = ev.target === dlg && outside(ev); });
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg && downOut && outside(ev)) dlg.close(); });
    dlg.addEventListener('close', function () {
      var o = SH.opener; SH.opener = null; CUR = null; GEN++;
      if (o && D.contains(o)) { try { o.focus({ preventScroll: true }); } catch (e) { } }
    });
    D.body.appendChild(dlg);
    SH = { dlg: dlg, fig: fig, im: im, wait: wait, url: url, sizes: [bPost, bStory], post: bPostIt, save: bSave, say: say, busy: busy, opener: null };
  }
  function canPostFiles() {
    if (!PHONE || /Windows/i.test(UA) || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function' || typeof W.File !== 'function') return false;
    try { return navigator.canShare({ files: [new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' })] }); } catch (e) { return false; }
  }
  function render() {
    var my = ++GEN, r = CUR;
    SH.sizes.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-size') === SIZE ? 'true' : 'false'); });
    SH.fig.classList.toggle('is-story', SIZE === 'story');
    SH.im.height = SIZES[SIZE].h;
    SH.busy(true); SH.wait.textContent = tt('Drawing your picture');
    SH.url.value = r.url();
    return png(r.id, SIZE).then(function (b) {
      if (my !== GEN) return;
      BLOB = b;
      if (OBJ) URL.revokeObjectURL(OBJ);
      OBJ = URL.createObjectURL(b);
      SH.im.src = OBJ;
      SH.busy(false);
    }, function () {
      if (my !== GEN) return;
      SH.wait.textContent = tt('The picture could not be drawn. Try again.');
      SH.fig.classList.remove('is-busy'); SH.fig.classList.add('is-bad');
    });
  }
  function open(id, opener) {
    var r = REG[id];
    if (!r) return Promise.resolve(false);
    if (!W.HTMLDialogElement || !D.createElement('dialog').showModal) return save(id, 'post');
    if (!SH) build();
    CUR = r; BLOB = null; SIZE = 'post';
    SH.fig.classList.remove('is-bad');
    SH.post.hidden = !canPostFiles();
    SH.say.textContent = '';
    if (!SH.dlg.open) { SH.opener = opener && opener.focus ? opener : D.activeElement; SH.dlg.showModal(); }
    try { SH.save.focus({ preventScroll: true }); } catch (e) { }
    count('picture-open', r);
    return render().then(function () { return true; });
  }

  // ---------------------------------------------------------------- registrations
  function add(r) {
    if (!r || typeof r !== 'object' || !r.id || typeof r.draw !== 'function') return;
    var id = String(r.id);
    if (typeof r.title !== 'function') { var t = r.title; r.title = function () { return t || ''; }; }
    if (r.sub != null && typeof r.sub !== 'function') { var s = r.sub; r.sub = function () { return s; }; }
    if (typeof r.url !== 'function') { var u = r.url; r.url = function () { return u || location.href; }; }
    if (!REG[id]) IDS.push(id);
    REG[id] = r;
    try { D.dispatchEvent(new CustomEvent('lp:shot', { detail: { id: id } })); } catch (x) { }
  }
  // Which picture belongs to a control: the one whose part of the page holds it, else the page's first.
  function pick(from) {
    for (var k = 0; k < IDS.length; k++) {
      var r = REG[IDS[k]], a = r.el || ('#' + IDS[k]), n = null;
      try { n = typeof a === 'string' ? D.querySelector(a) : a; } catch (e) { }
      if (n && from && n.contains && n.contains(from)) return IDS[k];
    }
    return IDS[0] || null;
  }

  var Q = Array.isArray(W.LPShotQ) ? W.LPShotQ : [];
  W.LPShot = { ready: true, open: open, make: make, save: save, blob: function (cv) { return blob(cv); }, png: png, pick: pick, list: function () { return IDS.slice(); }, kit: kit };
  Q.forEach(add);
  W.LPShotQ = { push: function () { for (var k = 0; k < arguments.length; k++) add(arguments[k]); return IDS.length; }, length: 0 };
})();
