---
name: site-crawl
description: Screenshot live web pages at multiple viewports and extract design tokens (colors, typography, grid geometry, spacing scale, CSS breakpoints, motion, RTL/LTR direction) from the rendered DOM. Use when asked to analyze, audit, reverse-engineer or build a design reference from an existing website, to capture screenshots of pages, or when a headless-browser run in this sandbox renders pages unstyled or fails assets with ERR_TOO_MANY_RETRIES behind the egress proxy.
---

# site-crawl

Drives Chromium over a live site, captures full-page screenshots per viewport, and
dumps a **measured** design-token audit per page — computed colours, typography per
text level, gallery grid geometry, spacing scale, CSS breakpoints, motion and text
direction.

Use it instead of eyeballing screenshots: the audit reports what the browser
actually computed, not what a picture suggests.

## When to use

- "Analyse this site and give me a design reference / design tokens / style guide."
- "Screenshot these pages at desktop and mobile."
- "How does this site handle RTL / Hebrew / bilingual text?"
- "What are its breakpoints / fonts / gallery grid?"
- Any Playwright run here where pages come out **unstyled** or assets fail with
  `ERR_TOO_MANY_RETRIES` — that is the egress proxy, and this skill fixes it.

## How to run it

```bash
cd .claude/skills/site-crawl
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install    # first time only

node crawl.mjs --base https://example.com \
  --path / --path /about --path /contact \
  --out /tmp/audit
```

Long path lists belong in a file (`--paths paths.txt`, one per line, `#` comments
allowed). Full flag table and the output schema are in `README.md` — read it
before adding flags.

Never run `playwright install`; a Chromium binary is already on disk and is
auto-detected.

## Reading the results

- `<out>/shots/<page>__<viewport>.jpg` — screenshots. View them; also check sizes
  in `<out>/summary.json`.
- `<out>/data/<page>__<viewport>.json` — the audit. Do not dump it whole into
  context; pull the fields you need with `node -e` or `jq`.
- `<out>/summary.json` — per-capture status and `fetchStats`.

**Always verify the render before trusting an audit.** A 200 status does not mean
the CSS arrived. In the audit check:

- `bodyFontFamily` / `loadedWebFonts` — a fallback like `Times New Roman` with an
  empty webfont list means the stylesheets did not land.
- `fetchStats.failures` in `summary.json` should be `0`.

If either looks wrong, re-run with `--verbose --concurrency 2` and read the
`[fetch-fail]` lines.

For breakpoints read `cssBreakpoints` (parsed from downloaded CSS text, so it
covers cross-origin sheets), not `mediaQueries` (same-origin CSSOM only).

## Reusing the fetcher

`lib/proxy-fetch.mjs` is standalone and dependency-free — import `createFetcher`
for any bulk HTTP work in this sandbox that needs retries, bounded concurrency and
caching through the CONNECT proxy. It requires no env flags. See `README.md`.

## Constraints

- `--base` is an origin; paths go in `--path`/`--paths`.
- Analytics hosts are blocked by default; pass `--no-block-analytics` if content
  depends on them.
- The asset cache never revalidates — delete `<out>/.cache` for a fresh pull.
- Respect the target site: this reads public pages for reference. Do not copy its
  text, images or logos into work you produce from it.
