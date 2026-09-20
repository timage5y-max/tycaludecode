/**
 * extract.js — runs inside the page and returns a design-token audit of what is
 * ACTUALLY rendered (computed styles), not what the source CSS claims.
 *
 * Injected by crawl.mjs via addScriptTag; defines window.__siteCrawlAudit().
 */
window.__siteCrawlAudit = function () {
  const RTL_RE = /[֐-׿؀-ۿ܀-ݏ]/; // Hebrew, Arabic, Syriac
  const tally = (m, k) => { if (k != null && k !== '') m[k] = (m[k] || 0) + 1; };
  const top = (m, n = 40) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([value, count]) => ({ value, count }));
  const rect = (e) => e.getBoundingClientRect();
  const cls = (e) => (e.className || '').toString().slice(0, 90);

  const SKIP = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'HEAD', 'TITLE', 'BR']);
  const all = [...document.querySelectorAll('*')].filter((e) => !SKIP.has(e.tagName));
  const visible = all.filter((e) => {
    const r = rect(e);
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05;
  });
  /** Elements owning a direct (non-inherited) text node — the real typography carriers. */
  const textEls = visible.filter((e) =>
    [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));

  // ---------------------------------------------------------------- colours
  const bg = {}, fg = {}, border = {}, gradient = {}, shadow = {};
  const bgArea = {}; // background colour weighted by painted area, not element count
  for (const e of visible) {
    const cs = getComputedStyle(e);
    const r = rect(e);
    if (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|^transparent$/.test(cs.backgroundColor)) {
      tally(bg, cs.backgroundColor);
      bgArea[cs.backgroundColor] = (bgArea[cs.backgroundColor] || 0) + Math.round(r.width * r.height);
    }
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      const w = parseFloat(cs[`border${side}Width`]);
      if (w > 0 && cs[`border${side}Style`] !== 'none') {
        tally(border, `${cs[`border${side}Color`]} ${w}px ${cs[`border${side}Style`]}`);
      }
    }
    if (cs.backgroundImage && cs.backgroundImage.includes('gradient')) tally(gradient, cs.backgroundImage.slice(0, 140));
    if (cs.boxShadow && cs.boxShadow !== 'none') tally(shadow, cs.boxShadow.slice(0, 90));
  }
  for (const e of textEls) tally(fg, getComputedStyle(e).color);

  // ---------------------------------------------------------------- typography
  const typoFor = (label, selector) => {
    const buckets = {};
    document.querySelectorAll(selector).forEach((e) => {
      const r = rect(e);
      if (r.width === 0 || r.height === 0) return;
      const text = (e.innerText || '').trim();
      if (!text) return;
      const cs = getComputedStyle(e);
      const key = JSON.stringify({
        fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing,
        textTransform: cs.textTransform, fontStyle: cs.fontStyle,
        color: cs.color, textAlign: cs.textAlign,
      });
      if (!buckets[key]) buckets[key] = { count: 0, samples: [] };
      buckets[key].count++;
      if (buckets[key].samples.length < 2) buckets[key].samples.push(text.replace(/\s+/g, ' ').slice(0, 60));
    });
    return {
      label, selector,
      variants: Object.entries(buckets).sort((a, b) => b[1].count - a[1].count).slice(0, 6)
        .map(([k, v]) => ({ ...JSON.parse(k), count: v.count, samples: v.samples })),
    };
  };

  const typography = [
    typoFor('h1', 'h1'), typoFor('h2', 'h2'), typoFor('h3', 'h3'), typoFor('h4-h6', 'h4,h5,h6'),
    typoFor('paragraph', 'p'),
    typoFor('nav', 'nav a, header a, .navbar a, #navigation a, .menu a, .main-nav a'),
    typoFor('button', 'button, .btn, [class*="button"], a[class*="btn"], input[type=submit]'),
    typoFor('form-field', 'input, textarea, select, label'),
    typoFor('inline', 'div, span, li'),
  ];

  const fam = {}, size = {}, weight = {}, lh = {}, ls = {}, tt = {};
  for (const e of textEls) {
    const cs = getComputedStyle(e);
    tally(fam, cs.fontFamily); tally(size, cs.fontSize); tally(weight, cs.fontWeight);
    tally(lh, cs.lineHeight); tally(ls, cs.letterSpacing); tally(tt, cs.textTransform);
  }
  const webfonts = (document.fonts && document.fonts.size)
    ? [...document.fonts].filter((f) => f.status === 'loaded')
        .map((f) => `${f.family} ${f.style} ${f.weight}`).filter((v, i, a) => a.indexOf(v) === i).slice(0, 25)
    : [];

  // ---------------------------------------------------------------- gallery grids
  const grids = [];
  for (const e of visible) {
    const cs = getComputedStyle(e);
    const imgCount = e.querySelectorAll('img, figure, picture').length;
    if (imgCount < 3) continue;
    const isLayout = ['grid', 'inline-grid', 'flex', 'inline-flex'].includes(cs.display)
      || cs.columnCount !== 'auto';
    if (!isLayout) continue;
    const kids = [...e.children].filter((k) => { const r = rect(k); return r.width > 20 && r.height > 20; });
    if (kids.length < 2) continue;
    // Children sharing a top edge (snapped to 8px) reveal the real column count.
    const rows = {};
    kids.forEach((k) => { const t = Math.round(rect(k).top / 8) * 8; rows[t] = (rows[t] || 0) + 1; });
    grids.push({
      tag: e.tagName.toLowerCase(), class: cls(e),
      display: cs.display,
      gridTemplateColumns: cs.gridTemplateColumns.slice(0, 160),
      gap: cs.gap, rowGap: cs.rowGap, columnGap: cs.columnGap,
      columnCount: cs.columnCount, flexWrap: cs.flexWrap,
      justifyContent: cs.justifyContent, alignItems: cs.alignItems,
      containerWidth: Math.round(rect(e).width),
      childCount: kids.length, imgCount,
      derivedColumns: Math.max(...Object.values(rows)),
      childAspectRatioCss: getComputedStyle(kids[0]).aspectRatio,
      childAspectRatios: kids.slice(0, 10).map((k) => { const r = rect(k); return +(r.width / r.height).toFixed(3); }),
      childWidths: kids.slice(0, 8).map((k) => Math.round(rect(k).width)),
    });
  }
  grids.sort((a, b) => b.imgCount - a.imgCount);

  // ---------------------------------------------------------------- spacing scale
  const spacing = {}, radius = {};
  const BOX = ['marginTop', 'marginBottom', 'marginLeft', 'marginRight',
    'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'];
  for (const e of visible) {
    const cs = getComputedStyle(e);
    for (const prop of BOX) {
      const n = parseFloat(cs[prop]);
      if (n && Math.abs(n) >= 2) tally(spacing, `${Math.round(n)}px`);
    }
    if (cs.borderRadius && cs.borderRadius !== '0px') tally(radius, cs.borderRadius);
  }

  // ---------------------------------------------------------------- motion
  const transition = {}, animation = {}, transform = {};
  for (const e of visible) {
    const cs = getComputedStyle(e);
    if (cs.transitionDuration && cs.transitionDuration !== '0s') {
      tally(transition, `${cs.transitionProperty} ${cs.transitionDuration} ${cs.transitionTimingFunction} ${cs.transitionDelay}`);
    }
    if (cs.animationName && cs.animationName !== 'none') {
      tally(animation, `${cs.animationName} ${cs.animationDuration} ${cs.animationTimingFunction} ${cs.animationIterationCount}`);
    }
    if (cs.transform && cs.transform !== 'none') tally(transform, cs.transform.slice(0, 60));
  }

  // ---------------------------------------------------------------- CSS rules
  const media = {}, keyframes = [], blockedSheets = [];
  const walk = (rules) => {
    for (const r of rules) {
      if (r.type === 4 /* MEDIA */ && r.conditionText) { tally(media, r.conditionText); if (r.cssRules) walk(r.cssRules); }
      else if (r.type === 7 /* KEYFRAMES */) { if (keyframes.length < 14) keyframes.push(r.cssText.slice(0, 400)); }
      else if (r.cssRules) walk(r.cssRules); // @supports, @layer, …
    }
  };
  for (const sheet of document.styleSheets) {
    try { walk(sheet.cssRules); } catch { blockedSheets.push(sheet.href); }
  }

  // ---------------------------------------------------------------- direction / bidi
  const rtlSamples = [], ltrSamples = [];
  for (const e of textEls) {
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (!own) continue;
    const cs = getComputedStyle(e);
    const rec = {
      tag: e.tagName.toLowerCase(), text: own.replace(/\s+/g, ' ').slice(0, 50),
      direction: cs.direction, dirAttr: e.getAttribute('dir'), textAlign: cs.textAlign,
      unicodeBidi: cs.unicodeBidi, fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
    };
    if (RTL_RE.test(own)) { if (rtlSamples.length < 30) rtlSamples.push(rec); }
    else if (ltrSamples.length < 15) ltrSamples.push(rec);
  }
  const dirAttrs = {};
  document.querySelectorAll('[dir]').forEach((e) => tally(dirAttrs, `${e.tagName.toLowerCase()}[dir=${e.getAttribute('dir')}]`));

  // ---------------------------------------------------------------- images
  const imgs = [...document.querySelectorAll('img')].filter((i) => rect(i).width > 40);
  const images = imgs.slice(0, 60).map((i) => {
    const r = rect(i); const cs = getComputedStyle(i);
    return {
      w: Math.round(r.width), h: Math.round(r.height), ratio: +(r.width / r.height).toFixed(2),
      objectFit: cs.objectFit, loading: i.loading, natural: `${i.naturalWidth}x${i.naturalHeight}`,
      alt: (i.alt || '').slice(0, 40), src: (i.currentSrc || i.src || '').slice(0, 140),
    };
  });

  // ---------------------------------------------------------------- layout
  const containers = {};
  for (const e of visible) {
    const cs = getComputedStyle(e);
    if (cs.maxWidth !== 'none' && parseFloat(cs.maxWidth) > 400) tally(containers, cs.maxWidth);
  }

  const outline = [];
  document.querySelectorAll('section, header, footer, nav, main, [class*="section"], [id*="section"]').forEach((e) => {
    const r = rect(e);
    if (r.height < 40) return;
    const cs = getComputedStyle(e);
    outline.push({
      tag: e.tagName.toLowerCase(), id: e.id.slice(0, 40), class: cls(e),
      height: Math.round(r.height), top: Math.round(r.top + window.scrollY),
      background: cs.backgroundColor, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom,
      imgCount: e.querySelectorAll('img').length,
      text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 140),
    });
  });

  return {
    url: location.href,
    title: document.title,
    htmlLang: document.documentElement.lang || '(unset)',
    htmlDir: document.documentElement.dir || '(unset)',
    bodyDirection: getComputedStyle(document.body).direction,
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    bodyFontFamily: getComputedStyle(document.body).fontFamily,
    viewport: { width: innerWidth, height: innerHeight },
    scrollHeight: document.documentElement.scrollHeight,
    elementCount: all.length, visibleCount: visible.length,

    colors: {
      background: top(bg, 30),
      backgroundByArea: Object.entries(bgArea).sort((a, b) => b[1] - a[1]).slice(0, 15)
        .map(([value, px]) => ({ value, px })),
      text: top(fg, 25), border: top(border, 20),
      gradient: top(gradient, 8), boxShadow: top(shadow, 10),
    },
    fontFamilies: top(fam, 15), fontSizes: top(size, 25), fontWeights: top(weight, 10),
    lineHeights: top(lh, 15), letterSpacings: top(ls, 12), textTransforms: top(tt, 6),
    loadedWebFonts: webfonts,
    typography,
    grids: grids.slice(0, 10),
    spacing: top(spacing, 30), borderRadius: top(radius, 10),
    motion: { transitions: top(transition, 20), animations: top(animation, 15), transforms: top(transform, 10), keyframes },
    mediaQueries: top(media, 40),
    blockedSheets: [...new Set(blockedSheets)].slice(0, 20),
    containerMaxWidths: top(containers, 12),
    direction: { rtlSamples, ltrSamples, dirAttributes: top(dirAttrs, 12), hasRtlText: rtlSamples.length > 0 },
    images, imageCount: imgs.length,
    outline: outline.slice(0, 40),
    headings: [...document.querySelectorAll('h1,h2,h3,h4')].filter((h) => rect(h).height > 0)
      .map((h) => ({ level: h.tagName, text: (h.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 100) })).slice(0, 40),
    links: [...document.querySelectorAll('a[href]')]
      .map((a) => ({ text: (a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40), href: a.getAttribute('href') }))
      .filter((l) => l.href && !l.href.startsWith('#')).slice(0, 120),
  };
};
