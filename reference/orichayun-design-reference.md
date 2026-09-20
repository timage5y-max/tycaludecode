# Design Reference — orichayun.com

Measured reference for the wedding-photography site build. Every number here was
read from computed styles and rendered geometry via `.claude/skills/site-crawl`,
not estimated from screenshots.

**Crawl:** 24 paths × {1440×900, 390×844}, 48 captures, 8,091 assets, 0 failures.
All 48 renders verified styled (3 webfonts loaded, no fallback serif).

**Platform:** Pixpa (not Wix). Theme build `20260919-032031-224`.

> Use this for structure, proportion and selection logic only. Do not reuse its
> text, quotes, logo, names or images.

---

## 1. Direction and language — the reference does NOT solve your hardest problem

This matters more than anything else below, so it goes first.

| Measured | Value |
| --- | --- |
| `<html lang>` | `en` |
| `<html dir>` | unset |
| `body` computed direction | `ltr` |
| `dir` attributes anywhere on the site | **0** |
| Pages containing any Hebrew | **1 of 24** (`/contact`) |
| Language switcher | none functioning (the `language-switcher-1` body class is inert) |

The only Hebrew on the site is five contact-form labels, written as inline
bilingual strings and rendered LTR, left-aligned:

```
Full name / שמות מלאים *
Phone Number / מספר טלפון *
Date of your event / תאריך האירוע *
Email / כתובת מייל *
Tell me about your event / ספר לי על האירוע שלך *
```

**Consequence for your build:** your brief calls for Hebrew-first RTL with a real
language switcher. The reference offers **no pattern for that** — no RTL mirroring,
no bidi handling, no locale routing. Take its *visual* language, and design the
RTL system from scratch. Note that its body face, Frank Ruhl Libre, is a genuine
Hebrew serif and is a defensible starting point for your Hebrew text.

---

## 2. Design tokens

### Colour

The palette is warm off-white and muted plum — not the black/white gallery cliché.

| Token | Value | Role | Evidence |
| --- | --- | --- | --- |
| `--bg-page` | `#FEFAFA` | page background, warm blush white | 714M painted px — dominant by 20× |
| `--bg-alt` | `#F7F7F7` | alternating section band | home "Browse my work" |
| `--bg-tint` | `#F4F4F4` | secondary tint | 24 elements |
| `--ink-dark` | `#111111` | dark quote band | home statement section |
| `--black` | `#000000` | hero overlays, footers | 52 elements |
| `--text-primary` | `#6D596F` | **body + nav text, muted plum** | 950 occurrences — the signature |
| `--text-accent` | `#935A5A` | dusty rose, active nav item | 71 occurrences |
| `--text-on-media` | `#FFFFFF` | text over photography | 93 occurrences |
| `--text-muted` | `#9E9E9E` | footer, copyright | 24 |
| `--text-mid` | `#575757` / `#272727` | secondary UI | 23 / 24 |
| `--border-hairline` | `rgba(109,89,111,0.2)` 1px | form fields, dividers | 28 |

No gradients. No decorative box-shadows in the design language.

### Typography

Four families, all 400 weight except where noted. **Letter-spacing is `normal`
everywhere — 1,254 occurrences, zero tracking anywhere on the site.**

| Family | Role | Sizes measured |
| --- | --- | --- |
| **Amita** (script, Google) | brand voice: nav, H1, H3 | H1 60/84 · H3 30/42 · nav 22/28.8, 17/28.8, 14/28.8 |
| **Frank Ruhl Libre** (serif, Hebrew-capable) | body copy, form fields, buttons | 15/27 · 14/21 · 13/23.4 |
| **Alice** (serif) | category card labels, section eyebrows | 18/28.8 at weight **300** |
| **Yantramanav** (sans) | footer and meta only | 15px |
| Arial 600 uppercase 13px | platform UI only (cart) — not part of the design |

Scale actually in use: **13 · 14 · 15 · 17 · 18 · 22 · 30 · 60** px desktop;
**13 · 13.5 · 14 · 16 · 25 · 40** px mobile.
Dominant line-height: **28.8px** (1,015 occurrences) — i.e. `1.8` at 16px.
`text-transform: uppercase` appears only 96× — category labels are literal caps.

### Spacing

Most frequent non-zero values (desktop, by occurrence):

```
7 · 10 · 43 · 20 · 5 · 11 · 26 · 16 · 17 · 3 · 22 · 15 · 30 · 12 · 18 · 19 · 36 · 135
```

Not a clean 4/8 system — it is Pixpa's theme output. The usable signal is:
**tight gutters (5–11px) inside galleries, ~43px rhythm between content blocks,
135px for large section padding.**

- Container max-width: **1200px** (12 instances); forms constrained to 450px.
- Border-radius: **5px** dominant (1,052), `50%` for circular icons, 30px for pills.

### Motion

| Transition | Count | Use |
| --- | --- | --- |
| `all 0.25s ease-in-out` | 1,493 | the global default — hovers, nav |
| `transform 0.3s ease-in-out` | 168 | thumbnail zoom on hover |
| `all 0.8s ease` / `transform 0.5s ease` | 48 / 48 | section reveals |
| `opacity 1s ease-out` | 19 | **hero slideshow crossfade** |
| `transform 1s ease-out` | 5 | slow drift on hero |

**No CSS `@keyframes` animations are used in the design** — all motion is
transition-driven. The hero fade is a 1s opacity crossfade.

### Breakpoints

Parsed from 22 downloaded stylesheets (CSSOM only exposed 3 — cross-origin):

| Width | Rules | Meaning |
| --- | --- | --- |
| `max-width: 767px` | 13,881 | **the primary mobile breakpoint** |
| `max-width: 1024px` | 5,162 | tablet |
| `max-width: 768px` | 3,934 | tablet edge |
| `min-width: 1025px` | 434 | desktop entry |
| `max-width: 640px` / `425px` / `480px` | 1,358 / 521 / 244 | small-phone refinements |

Effective system: **≤767 mobile · 768–1024 tablet · ≥1025 desktop.**

---

## 3. Site map and the role of each page

24 paths crawled. `/` and `/romantic` are byte-identical (the Style dropdown
links "Romantic" to `/`), as are `/brides` and `/galleries/brides`.

### Primary

| Path | Role | Height (d/m) | Images |
| --- | --- | --- | --- |
| `/home` | **The real landing page.** Hero → categories → statement → Instagram | 3,211 / 5,934 | 17 |
| `/` = `/romantic` | The flagship gallery, and the site root | 37,782 / 43,926 | **262** |
| `/gallery` | "Wedding Gallery" index — near-empty shell | 920 / 862 | 2 |
| `/fullweddings` | Full-wedding stories index | 1,574 / 4,398 | 14 |
| `/contact` | Conversion page | 1,564 / 1,166 | 3 |
| `/reviews` | Social proof | 20,157 / 22,909 | 112 |

### Style categories (`/galleries/*`)

| Path | Label in nav | Images | Orientation mix |
| --- | --- | --- | --- |
| `/galleries/truth` | Truth | 98 | 89 landscape / 8 portrait |
| `/galleries/brides` = `/brides` | Brides | 112 | — |
| `/galleries/dancefloor` | Dance Floor | 95 | — |
| `/galleries/fun` | Fun | 82 | 59 landscape / 21 portrait |
| `/galleries/fashion` | Fashion | 76 | — |
| `/galleries/beauty` | Beauty | 72 | — |
| `/galleries/style` | **Design** (path ≠ label) | 62 | — |
| `/galleries/art` | Art | 23 | — |

### Named wedding stories

| Path | Images |
| --- | --- |
| `/galleries/judean-desert-elopement` | 66 |
| `/galleries/jaffa` | 50 |
| `/galleries/lake-como-wedding` | 8 |

### Thin / neglected pages

`/vogue` (8) · `/bw` (15) · `/instagram` (2) · `/reels` (3) · `/gallery` (2).
These are nav entries with almost nothing behind them — a structural warning, see §6.

---

## 4. Home page anatomy (desktop 1440)

| y | Height | Background | Content |
| --- | --- | --- | --- |
| 0 | 81px | `#FEFAFA` | Sticky header: wreath logo left · nav centre · WhatsApp/FB/IG icons right |
| 0 | **900px** | photo | **Full-bleed hero slideshow** — 10 slides, `object-fit: cover`, 16:10, 1s opacity crossfade. One centred quote, Frank Ruhl Libre 15/27 white |
| 900 | 498px | `#F7F7F7` | **"BROWSE MY WORK"** — eyebrow in Alice 18/28.8 w300, then 5 cards |
| 1398 | 450px | `#111111` | **Dark statement band** — H3 Amita 30/42 white, one paragraph below |
| 1848 | 900px | — | About / personal section |
| 2748 | 297px | `#FEFAFA` | "Follow me on Instagram" H3 Amita 30/42 |
| — | — | — | Footer: 4 social icons, copyright Yantramanav 15px `#9E9E9E` |

**Category cards:** 5 across, each **228×342 (2:3 portrait)**, `object-fit: cover`,
label overlaid in Alice 18px weight 300, white, uppercase. Followed by a single
`See More Work` button. Labels: FUN · LOVE · BEAUTY · FASHION · ART — note these
differ from the nav's 8 categories; the home grid is a curated subset.

---

## 5. Gallery grid — measured geometry

Pixpa positions tiles with JS, so this is measured from where images land, not
from CSS.

**Desktop (1440):**

```
columns:        3
column x:       8 · 484 · 964
column width:   471px
horizontal gap: 9px
vertical gap:   7px
masonry:        yes (variable tile heights)
object-fit:     cover
```

Tile aspect ratios cluster on three values: **1.50** (3:2 landscape, most common),
**0.67** (2:3 portrait), **0.80** (4:5). Heights therefore vary 313 / 588 / 705px
within a fixed 471px column — that variation *is* the rhythm.

**Orientation mix defines the category.** `/romantic` runs near 50/50
(126 landscape / 128 portrait) which reads as a full narrative; `/galleries/truth`
is 89 landscape / 8 portrait, reading as reportage.

**Reviews grid** is a different object: 3 columns × 453px, **23px** gap, and
110 of 112 tiles are portrait — phone screenshots, not photographs.

**Colour vs black-and-white:** both appear in the same masonry with no grouping —
B&W frames are interleaved among colour ones rather than segregated.

---

## 6. Recurring UX patterns — and what not to copy

**Worth taking:**

1. **Photography is the only ornament.** No gradients, no shadows, no decorative
   rules. Backgrounds are flat warm-white or flat near-black.
2. **Tight gutters, huge images.** 7–9px between tiles and edge-to-edge width —
   the grid nearly disappears.
3. **One typographic voice for the brand** (Amita script), one for reading
   (Frank Ruhl Libre serif). Nothing competes.
4. **Zero letter-spacing anywhere** — unusual for fashion sites and part of why
   it reads soft rather than editorial.
5. **Alternating full-bleed media and flat colour bands** paces the long scroll.
6. **Persistent conversion affordances:** sticky header, floating WhatsApp
   button, social icons in both header and footer. No prices anywhere — matches
   your brief.
7. **Contact page is a full-bleed photograph with the form laid over it.**

**Do not copy:**

1. **The mobile gallery is broken.** At every width below 1025px tiles render at
   **~45% of viewport in a single left-aligned column**, leaving the right half
   empty. Verified at 360, 390, 414 and 768px — ratio 0.45–0.46 throughout.
   Since most of your traffic arrives from Instagram, this is the single most
   important thing to do differently.
2. **Low-contrast text over photographs.** The contact form's labels sit directly
   on a bright image with no scrim.
3. **Nav promises more than the site delivers.** `/gallery`, `/instagram`,
   `/reels`, `/vogue`, `/bw` are nav-level entries with 2–15 images. Ship fewer
   sections, each full.
4. **Duplicate routes** (`/` = `/romantic`, `/brides` = `/galleries/brides`) and a
   path/label mismatch (`/galleries/style` labelled "Design").
5. **A cookie banner that covers content** and an inert language switcher.

---

## 7. Direct implications for your build

| Your brief | What the reference gives you |
| --- | --- |
| Hebrew RTL default + switcher | **Nothing.** Design from scratch. Frank Ruhl Libre is a usable Hebrew serif. |
| Flawless mobile | **Anti-pattern.** Its mobile gallery is broken; build 2-col masonry ≤767px. |
| Hero slideshow, slow fade | 10 slides, 16:10, `object-fit: cover`, 1s opacity crossfade. |
| Category grid | 5 cards at 2:3 portrait, label overlaid, one CTA below. |
| 4–6 style categories | It runs 8 and dilutes them. Stay at 4–6, fill each. |
| Full wedding galleries | 3-col masonry, 471px cols, 7–9px gutters, mixed orientation. |
| Film page | **No precedent** — the reference has no video section. |
| No prices | Confirmed: no pricing anywhere. |
| Lightbox + lazy loading | Both present (lazy loading required scroll-triggering to capture). |

---

## Reproducing this

```bash
cd .claude/skills/site-crawl
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
node crawl.mjs --base https://www.orichayun.com \
  --paths reference/orichayun-paths.txt \
  --viewports desktop:1440x900,mobile:390x844 \
  --locale he-IL --out ./audit
```
