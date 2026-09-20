#!/usr/bin/env node
/**
 * crawl.mjs — screenshot pages and extract their design tokens from the live DOM.
 *
 * Every browser request is served by lib/proxy-fetch.mjs (CONNECT tunnel, retries,
 * bounded concurrency, disk cache) instead of by Chromium's own network stack, which
 * is what makes this survive a sandboxed egress proxy. See README.md.
 */

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { createFetcher } from './lib/proxy-fetch.mjs';

// ---------------------------------------------------------------- args

function parseArgs(argv) {
  const o = {
    base: null, paths: [], out: 'crawl-out',
    viewports: [{ name: 'desktop', width: 1440, height: 900, mobile: false },
                { name: 'mobile', width: 390, height: 844, mobile: true }],
    concurrency: 5, retries: 4, timeout: 60000, quality: 70, format: 'jpeg',
    cache: true, blockAnalytics: true, fullPage: true, scrollPasses: 60,
    chromium: null, ua: null, locale: null, browserProxy: false, verbose: false, force: false,
  };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--base': o.base = next(); break;
      case '--path': o.paths.push(next()); break;
      case '--paths': o.pathsFile = next(); break;
      case '--out': o.out = next(); break;
      case '--viewports': o.viewports = parseViewports(next()); break;
      case '--concurrency': o.concurrency = +next(); break;
      case '--retries': o.retries = +next(); break;
      case '--timeout': o.timeout = +next(); break;
      case '--quality': o.quality = +next(); break;
      case '--format': o.format = next(); break;
      case '--scroll-passes': o.scrollPasses = +next(); break;
      case '--chromium': o.chromium = next(); break;
      case '--ua': o.ua = next(); break;
      case '--locale': o.locale = next(); break;
      case '--no-cache': o.cache = false; break;
      case '--no-block-analytics': o.blockAnalytics = false; break;
      case '--no-full-page': o.fullPage = false; break;
      case '--browser-proxy': o.browserProxy = true; break;
      case '--force': o.force = true; break;
      case '--verbose': o.verbose = true; break;
      case '--help': case '-h': o.help = true; break;
      default:
        if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`);
        rest.push(a);
    }
  }
  if (!o.base && rest.length) o.base = rest.shift();
  o.paths.push(...rest);
  if (o.pathsFile) {
    o.paths.push(...fs.readFileSync(o.pathsFile, 'utf8')
      .split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean));
  }
  if (!o.paths.length) o.paths = ['/'];
  return o;
}

/** "1440x900,390x844" or "desktop:1440x900" -> viewport objects. */
function parseViewports(spec) {
  return spec.split(',').map((part) => {
    const [maybeName, dims] = part.includes(':') ? part.split(':') : [null, part];
    const [width, height] = dims.split('x').map(Number);
    if (!width || !height) throw new Error(`bad viewport: ${part}`);
    const mobile = width < 700;
    return { name: maybeName || (mobile ? `mobile-${width}` : `desktop-${width}`), width, height, mobile };
  });
}

const HELP = `
site-crawl — screenshot pages and extract design tokens from the rendered DOM.

  node crawl.mjs --base <url> [--paths file | --path /a --path /b | /a /b]

Options
  --base <url>            Site origin, e.g. https://example.com        (required)
  --paths <file>          File of paths, one per line, # comments allowed
  --path <p>              A single path; repeatable. Bare args also work.
  --out <dir>             Output directory                  (default crawl-out)
  --viewports <spec>      e.g. 1440x900,390x844 or name:WxH  (default both)
  --concurrency <n>       Parallel asset fetches                    (default 5)
  --retries <n>           Retries per asset                         (default 4)
  --timeout <ms>          Navigation timeout                    (default 60000)
  --format <jpeg|png>     Screenshot format                      (default jpeg)
  --quality <n>           JPEG quality                              (default 70)
  --scroll-passes <n>     Max lazy-load scroll steps               (default 60)
  --chromium <path>       Chromium binary override
  --ua <string>           User-Agent override
  --locale <tag>          Browser locale, e.g. he-IL
  --no-cache              Disable the on-disk asset cache
  --no-block-analytics    Load trackers too (they are blocked by default)
  --no-full-page          Capture only the viewport
  --browser-proxy         Also point Chromium itself at HTTPS_PROXY
  --force                 Run even if another crawl holds this --out directory
  --verbose               Log every asset fetch

Outputs <out>/shots/<page>__<viewport>.<ext>, <out>/data/<page>__<viewport>.json
and <out>/summary.json.
`;

// ---------------------------------------------------------------- helpers

const ANALYTICS = [
  'googletagmanager.com', 'google-analytics.com', 'doubleclick.net', 'connect.facebook.net',
  'facebook.com/tr', 'pinterest.com', 'hotjar', 'clarity.ms', 'segment.io', 'sentry.io',
  'google.com/ccm', 'googleadservices.com', 'bat.bing.com', 'tiktok.com/i18n',
];

function findChromium(explicit) {
  if (explicit) return explicit;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers',
    path.join(process.env.HOME || '', '.cache/ms-playwright')].filter(Boolean);
  const candidates = ['chrome-linux/chrome', 'chrome-linux/headless_shell',
    'chrome-mac/Chromium.app/Contents/MacOS/Chromium'];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    // Prefer the full browser over headless_shell, then the newest build.
    const dirs = fs.readdirSync(root)
      .filter((d) => /^chromium(-|_)/.test(d))
      .sort((a, b) => (a.includes('headless') - b.includes('headless')) || b.localeCompare(a, 'en', { numeric: true }));
    for (const d of dirs) {
      for (const c of candidates) {
        const p = path.join(root, d, c);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return null; // let Playwright resolve its own default
}

/**
 * Pull @media conditions straight out of downloaded CSS text.
 * CSSOM cannot read cross-origin sheets, but the fetcher already has the bytes,
 * so breakpoints are recovered here instead of in the page.
 */
function breakpointsFromCss(cssTexts) {
  const conditions = {}, widths = {};
  for (const text of cssTexts.values()) {
    const media = /@media([^{]+)\{/g;
    let m;
    while ((m = media.exec(text))) {
      const cond = m[1].trim().replace(/\s+/g, ' ');
      if (cond.length > 200) continue;
      conditions[cond] = (conditions[cond] || 0) + 1;
      const width = /(min|max)-width\s*:\s*([\d.]+)(px|em|rem)/g;
      let w;
      while ((w = width.exec(cond))) {
        const key = `${w[1]}-width: ${w[2]}${w[3]}`;
        widths[key] = (widths[key] || 0) + 1;
      }
    }
  }
  const sort = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([value, count]) => ({ value, count }));
  return { sheets: cssTexts.size, conditions: sort(conditions, 60), widths: sort(widths, 40) };
}

/**
 * Guard the output directory. Two crawls sharing one --out overwrite each other's
 * summary.json and interleave screenshots, so refuse unless --force.
 */
function acquireLock(outDir, force) {
  const lockPath = path.join(outDir, '.crawl.lock');
  if (fs.existsSync(lockPath) && !force) {
    const prev = Number(fs.readFileSync(lockPath, 'utf8').trim());
    let alive = false;
    try { process.kill(prev, 0); alive = true; } catch { alive = false; }
    if (alive) {
      throw new Error(
        `another crawl (pid ${prev}) is writing to ${path.resolve(outDir)}.\n` +
        'Use a different --out, wait for it to finish, or pass --force.');
    }
  }
  fs.writeFileSync(lockPath, String(process.pid));
  const release = () => { try { fs.unlinkSync(lockPath); } catch {} };
  process.once('exit', release);
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.once(sig, () => { release(); process.exit(130); });
  }
  return release;
}

const slug = (p) => {
  const s = p.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
  return s || 'root';
};

/** Scroll the page end to end so lazy-loaded media actually renders. */
async function settle(page, viewportHeight, maxPasses) {
  await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1200);
  let lastHeight = 0;
  for (let i = 0; i < maxPasses; i++) {
    const [height, bottom] = await page.evaluate(() =>
      [document.documentElement.scrollHeight, window.scrollY + window.innerHeight]);
    if (bottom >= height - 5 && height === lastHeight) break;
    lastHeight = height;
    await page.evaluate((step) => window.scrollBy(0, step), Math.round(viewportHeight * 0.85));
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1000);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  // Nudge any images the browser still considers off-screen.
  await page.evaluate(() => {
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900);
}

// ---------------------------------------------------------------- main

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.base) { console.log(HELP); process.exit(opts.base ? 0 : 2); }

  const base = opts.base.replace(/\/+$/, '');
  const shotsDir = path.join(opts.out, 'shots');
  const dataDir = path.join(opts.out, 'data');
  fs.mkdirSync(shotsDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });

  acquireLock(opts.out, opts.force);

  const extractSrc = fs.readFileSync(new URL('./lib/extract.js', import.meta.url), 'utf8');
  const fetcher = createFetcher({
    concurrency: opts.concurrency,
    retries: opts.retries,
    cacheDir: opts.cache ? path.join(opts.out, '.cache') : null,
    log: opts.verbose ? (m) => console.error('  [fetch]', m) : () => {},
  });

  const exe = findChromium(opts.chromium);
  console.error(`chromium: ${exe || '(playwright default)'}`);
  console.error(`proxy:    ${fetcher.resolveProxy(base + '/') || 'direct'}`);

  const browser = await chromium.launch({
    ...(exe ? { executablePath: exe } : {}),
    ...(opts.browserProxy && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });

  const ext = opts.format === 'png' ? 'png' : 'jpeg';
  const fileExt = ext === 'png' ? 'png' : 'jpg';
  const summary = { base, startedAt: new Date().toISOString(), pages: [] };

  for (const vp of opts.viewports) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.mobile ? 2 : 1,
      isMobile: vp.mobile, hasTouch: vp.mobile,
      ...(opts.ua ? { userAgent: opts.ua } : {}),
      ...(opts.locale ? { locale: opts.locale } : {}),
      ignoreHTTPSErrors: true,
    });

    // Stylesheet text seen while loading the current page, keyed by URL.
    const cssTexts = new Map();

    // Serve every request through the resilient fetcher.
    await ctx.route('**/*', async (route) => {
      const req = route.request();
      const url = req.url();
      if (opts.blockAnalytics && ANALYTICS.some((h) => url.includes(h))) return route.abort();
      if (!/^https?:/.test(url)) return route.continue();
      try {
        const headers = { ...req.headers() };
        delete headers['accept-encoding']; // the fetcher negotiates and decodes this itself
        const res = await fetcher.fetch(url, { method: req.method(), headers, body: req.postDataBuffer() || undefined });
        if (/text\/css/i.test(res.headers['content-type'] || '') && res.body.length < 4e6) {
          cssTexts.set(url, res.body.toString('utf8'));
        }
        const outHeaders = { ...res.headers };
        // Body is already decoded; stale framing headers would corrupt it.
        delete outHeaders['content-encoding'];
        delete outHeaders['content-length'];
        delete outHeaders['transfer-encoding'];
        await route.fulfill({ status: res.status, headers: outHeaders, body: res.body });
      } catch (err) {
        if (opts.verbose) console.error(`  [fetch-fail] ${url.slice(0, 100)} — ${err.message}`);
        await route.abort();
      }
    });

    const page = await ctx.newPage();
    page.setDefaultTimeout(opts.timeout);

    for (const p of opts.paths) {
      const pagePath = p.startsWith('/') ? p : '/' + p;
      const key = `${slug(pagePath)}__${vp.name}`;
      const url = base + pagePath;
      const rec = { path: pagePath, url, viewport: vp.name };
      cssTexts.clear();
      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opts.timeout });
        rec.status = resp ? resp.status() : null;
        rec.finalUrl = page.url();
        await settle(page, vp.height, opts.scrollPasses);
        await page.addScriptTag({ content: extractSrc });
        rec.audit = await page.evaluate(() => window.__siteCrawlAudit());
        // Breakpoints from the raw CSS cover the cross-origin sheets CSSOM hides.
        rec.audit.cssBreakpoints = breakpointsFromCss(cssTexts);
        const shot = path.join(shotsDir, `${key}.${fileExt}`);
        await page.screenshot({
          path: shot, fullPage: opts.fullPage, type: ext,
          ...(ext === 'jpeg' ? { quality: opts.quality } : {}),
        });
        rec.screenshot = path.relative(opts.out, shot);
        rec.screenshotBytes = fs.statSync(shot).size;
        fs.writeFileSync(path.join(dataDir, `${key}.json`), JSON.stringify(rec.audit, null, 1));
        console.error(`OK   ${vp.name.padEnd(9)} ${pagePath.padEnd(24)} status=${rec.status} h=${rec.audit.scrollHeight} imgs=${rec.audit.imageCount}`);
      } catch (err) {
        rec.error = String(err.message || err).slice(0, 300);
        console.error(`FAIL ${vp.name.padEnd(9)} ${pagePath.padEnd(24)} ${rec.error.slice(0, 110)}`);
      }
      summary.pages.push(rec);
      fs.writeFileSync(path.join(opts.out, 'summary.json'), JSON.stringify(summary, null, 1));
    }
    await ctx.close();
  }

  await browser.close();
  summary.finishedAt = new Date().toISOString();
  summary.fetchStats = fetcher.stats;
  fs.writeFileSync(path.join(opts.out, 'summary.json'), JSON.stringify(summary, null, 1));
  const ok = summary.pages.filter((p) => !p.error).length;
  console.error(`\ndone — ${ok}/${summary.pages.length} captures, assets: ${JSON.stringify(fetcher.stats)}`);
  console.error(`output: ${path.resolve(opts.out)}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
