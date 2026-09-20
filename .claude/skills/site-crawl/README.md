# site-crawl

Screenshot pages at several viewports and extract their **design tokens from the
rendered DOM** — real computed colours, typography, grid geometry, spacing,
breakpoints, motion and text direction, rather than guesses from a picture.

Built to survive sandboxed agent environments where outbound traffic goes through
a **CONNECT-only egress proxy**.

## The problem it solves

Headless Chromium opens dozens of parallel sockets. A local CONNECT proxy starts
refusing them, individual CSS/JS files die with `ERR_TOO_MANY_RETRIES`, and the
page renders **half-styled** — while still returning HTTP 200. Screenshots come
out as stacks of unstyled icons, and `getComputedStyle` reports fallback fonts
like `Times New Roman`, so a "design audit" built on it is quietly fiction.

`site-crawl` intercepts **every** browser request and serves it from
`lib/proxy-fetch.mjs`, which speaks the CONNECT tunnel itself with bounded
concurrency, retries with backoff and a disk cache. On the reference run this
took a page from ~20 failed assets to **108 requests, 0 retries, 0 failures**.

## Requirements

- Node 18+
- `playwright-core` (`npm install` here; browsers are **not** downloaded)
- A Chromium binary already on disk — auto-detected from
  `PLAYWRIGHT_BROWSERS_PATH`, `/opt/pw-browsers`, or `~/.cache/ms-playwright`,
  preferring the full browser over `headless_shell`. Override with `--chromium`.

```bash
cd .claude/skills/site-crawl
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
```

## Usage

```bash
# a few paths inline
node crawl.mjs --base https://example.com --path / --path /about

# paths from a file, custom viewports and output directory
node crawl.mjs --base https://example.com \
  --paths paths.txt \
  --viewports 1440x900,390x844 \
  --out ./audit
```

### Options

| Flag | Default | Meaning |
| --- | --- | --- |
| `--base <url>` | *required* | Site origin. May also be the first bare argument. |
| `--paths <file>` | – | Paths file, one per line; `#` comments and blanks ignored. |
| `--path <p>` | – | A single path, repeatable. Bare arguments work too. |
| `--out <dir>` | `crawl-out` | Output directory. |
| `--viewports <spec>` | `1440x900,390x844` | `WxH` list, or `name:WxH`. Width < 700 is treated as mobile (touch + DPR 2). |
| `--concurrency <n>` | `5` | Parallel asset fetches. Lower it if the proxy still strains. |
| `--retries <n>` | `4` | Retries per asset, exponential backoff with jitter. |
| `--timeout <ms>` | `60000` | Navigation timeout. |
| `--format <jpeg\|png>` | `jpeg` | Screenshot format. |
| `--quality <n>` | `70` | JPEG quality. |
| `--scroll-passes <n>` | `60` | Max lazy-load scroll steps. |
| `--chromium <path>` | auto | Chromium binary override. |
| `--ua <string>` | Playwright default | User-Agent override. |
| `--locale <tag>` | – | Browser locale, e.g. `he-IL`. |
| `--no-cache` | off | Disable the on-disk asset cache. |
| `--no-block-analytics` | off | Load trackers too (blocked by default). |
| `--no-full-page` | off | Capture only the viewport. |
| `--browser-proxy` | off | Also point Chromium itself at `HTTPS_PROXY`. Rarely needed — interception already covers the network. |
| `--verbose` | off | Log every asset fetch and retry. |

### Output

```
<out>/shots/<page>__<viewport>.jpg   full-page screenshots
<out>/data/<page>__<viewport>.json   the design-token audit
<out>/summary.json                   status, sizes, errors, fetch stats
<out>/.cache/                        asset cache (safe to delete)
```

Each audit JSON contains:

- `colors` — background / text / border / gradient / shadow with frequencies,
  plus `backgroundByArea` (weighted by painted pixels, so the true page
  background wins over a one-off badge).
- `fontFamilies`, `fontSizes`, `fontWeights`, `lineHeights`, `letterSpacings`,
  `loadedWebFonts`, and `typography` broken down per level (h1…h6, paragraph,
  nav, button, form field, inline) with sample strings.
- `grids` — gallery containers: `display`, `gridTemplateColumns`, `gap`,
  `derivedColumns` (measured from children sharing a top edge), child aspect
  ratios and widths.
- `spacing` / `borderRadius` — the repeating scale, by frequency.
- `cssBreakpoints` — `@media` conditions and `min/max-width` values parsed from
  the **downloaded CSS text**, which recovers the cross-origin sheets CSSOM
  refuses to expose (`mediaQueries` holds the smaller same-origin-only view).
- `motion` — transitions, animations, transforms, keyframes.
- `direction` — `htmlDir`, `bodyDirection`, `dir` attributes, and RTL vs LTR text
  samples with their computed `direction` / `text-align` / font, for auditing
  bilingual or Hebrew/Arabic layouts.
- `images`, `outline`, `headings`, `links` — structural inventory.

## Standalone fetcher

`lib/proxy-fetch.mjs` is dependency-free and useful on its own — it needs no
`NODE_USE_ENV_PROXY`, no npm packages, and reads `HTTPS_PROXY`, `NO_PROXY` and
`NODE_EXTRA_CA_CERTS` itself.

```js
import { createFetcher } from './lib/proxy-fetch.mjs';

const fetcher = createFetcher({ concurrency: 5, retries: 4, cacheDir: '.cache' });
const res = await fetcher.fetch('https://example.com/app.css');
// { status, headers, body: Buffer, url, fromCache }
console.log(fetcher.stats); // { requests, hits, misses, retries, failures, bytes }
```

```bash
node lib/proxy-fetch.mjs https://example.com/app.css --out app.css
node lib/proxy-fetch.mjs https://example.com --head
```

It follows redirects, decodes gzip/deflate/br/zstd, and marks proxy `403`/`407`
as fatal so egress-policy denials fail fast instead of burning retries.

## Gotchas

- **`--base` is an origin.** Give paths separately; a base with a path is trimmed
  of trailing slashes only.
- **Bot protection.** Some hosts return 403 to non-browser User-Agents. Through
  the crawler the browser's real headers are forwarded, so pages load; the same
  URL fetched bare with `lib/proxy-fetch.mjs` may still 403.
- **Analytics are blocked by default**, which speeds runs up and cuts noise. If a
  site gates content behind a tag manager, pass `--no-block-analytics`.
- **The cache is keyed by URL only**, with no revalidation. Delete `<out>/.cache`
  to force a fresh pull.
- **A 200 is not a render.** Check `bodyFontFamily` and `loadedWebFonts` in the
  audit: a fallback serif plus zero webfonts means the CSS did not land, whatever
  the status code said.
