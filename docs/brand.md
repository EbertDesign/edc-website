# EDC brand, 2026

The rules this site is built to. Read this before changing anything visual.

Tokens live in [`src/styles/brand.css`](../src/styles/brand.css). Fonts are
loaded from three places — see [Fonts](#fonts). Nothing visual should hardcode
a hex, a family or a type size: if a value is needed and no token carries it,
the token is missing and belongs in `brand.css`.

## The two modes

Theme is set with `data-theme` on `<html>` or on any section.

**Field** (`data-theme="field"`) is the default. Warm and editorial: paper and
canopy surfaces, real photography, generous whitespace.

**Signal** (`data-theme="signal"`) is for the places where EDC shows what it
builds — the home hero, case study results, stats, and motion. Black grounds,
Departure labels, Plex readouts.

The signature move is a **signal overlay on field imagery**: thin signal-green
annotation boxes and Departure labels laid over a real photo.

Field is the default, so a section needs `data-theme="signal"` to opt in.
Signal is a section-level theme more often than a page-level one.

## Tokens

These change with the mode:

| Token | Field | Signal |
|---|---|---|
| `--ground` | `#F8F7F3` | `#161616` |
| `--ground-raised` | `#EFEEE8` | `#1F2120` |
| `--ink` | `#161616` | `#F8F7F3` |
| `--ink-muted` | `#5E625F` | `#9AA19D` |
| `--rule` | `#D6D8D2` | `#2C2F2D` |

These are the same in both:

| Token | Value | |
|---|---|---|
| `--paper` | `#F8F7F3` | |
| `--black` | `#161616` | |
| `--sage` | `#CCD3CF` | |
| `--canopy` | `#BFDD9E` | |
| `--signal-green` | `#A6FF3D` | |
| `--safety-orange` | `#FF5500` | |
| `--on-color` | `#161616` | text on any accent fill |

Two tokens are derived rather than fixed, because their job changes with the
mode:

| Token | Field | Signal | |
|---|---|---|---|
| `--system` | `--ink` | `--signal-green` | data, annotations, states, links |
| `--accent-fill` | `--safety-orange` | `--signal-green` | the mode's one accent, as a fill or graphic mark |
| `--emphasis-fill` | `--canopy` | `--signal-green` | highlight behind emphasised words in a heading |
| `--label` / `--label-ui` / `--label-md` / `--label-lg` | `11px` / `14px` / `16px` / `22px` | same | the four Departure sizes |

`--system` is the brief's own sentence made into a token: *"signal-green is the
system: data, annotations, states and links on dark."* Green never appears on
paper and orange is never text, so in Field the system colour is full `--ink`
and a marker or a link states itself by weight rather than hue.

`--accent-fill` is the mode's accent: anything that fills with the accent —
a button, a tag, a key-stat block, a photo frame, a hover fill — asks for it,
and gets orange on paper and green on black without knowing which.

Ask for `--system` or `--accent-fill`; never name a hue at the call site.

## Fonts

| Stack | Families |
|---|---|
| `--font-grotesk` | `aktiv-grotesk, "Aktiv Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif` |
| `--font-grotesk-ex` | `aktiv-grotesk-extended, "Aktiv Grotesk Extended", "Aktiv Grotesk Ex", var(--font-grotesk)` — display-xl, display and h1 only. Kit serves 400/700, so their 500 renders at 400 until Extended Medium is added. |
| `--font-pixel` | `"Departure Mono", "IBM Plex Mono", ui-monospace, monospace` |
| `--font-mono` | `"IBM Plex Mono", ui-monospace, Menlo, monospace` |

Each family is loaded under the **name it actually declares**, so every
fallback in those stacks is reachable:

- **Aktiv Grotesk** — an Adobe Fonts web project, loaded by `<link>` in
  [`BaseLayout.astro`](../src/layouts/BaseLayout.astro). The kit ID is the env
  var `PUBLIC_ADOBE_FONTS_KIT_ID` (see `.env.example`); unset, the `<link>` is
  omitted and the stack falls to Helvetica.

  The family is **`aktiv-grotesk`** — lowercase, hyphenated. That is the slug
  the kit's `@font-face` uses; `"Aktiv Grotesk"` is only Adobe's display name
  and matches nothing. Written the other way round the brand face never loads
  and every grotesk style renders in Helvetica, with no error anywhere.

  The kit in use is **`nrt5nbz`** ("EDC 2026 — Aktiv Grotesk"), created
  2026-11-07 for `ebertdesign.co`, `www.ebertdesign.co`, `localhost` and
  `127.0.0.1`. It carries six styles — 400, 500 and 700, each roman and
  italic — which covers the scale's weights with italics for rich text.

  It replaced kit `svb0fpq`, which served 400 and 700 only: the scale asks for
  500 on display-xl through h3, and CSS font matching was quietly resolving
  that down to 400, so five styles rendered a step light. The Adobe Fonts API
  can create a kit but not add a font to an existing one, hence a new kit
  rather than an edit. **`svb0fpq` is still live** — retire it once nothing
  else points at it.

  ⚠️ The kit ships `font-display: auto`, which can flash invisible text.
  `swap` is a toggle in the kit's own settings at fonts.adobe.com and is not
  settable through the API — worth turning on.
- **Departure Mono** — self-hosted from the 1.500 release at
  `public/fonts/`, declared in [`fonts.css`](../src/styles/fonts.css).
  Licensed **SIL OFL 1.1**, © Helena Zhang — *not* MIT, which is what the
  source repository's own LICENSE covers. The OFL requires the license to
  travel with the font, so it ships at `public/fonts/DepartureMono-LICENSE.txt`.
  Keep it there.
- **IBM Plex Mono** — Fontsource (`@fontsource/ibm-plex-mono`), weights 400
  and 500, imported in `BaseLayout.astro`.

Do **not** move these to Astro's font API. It hashes the family it generates
(`Syne-e8c9578f5e022bbe`) and can only be reached through its own variable,
which would break every literal family name and fallback in the stacks above.

## Type scale

Desktop / mobile.

| Style | Font | Size | Weight | Line height | Tracking |
|---|---|---|---|---|---|
| display-xl | grotesk-ex | 120 / 56 | 500 | 0.95 | -0.03em |
| display | grotesk-ex | 72 / 44 | 500 | 1.0 | -0.02em |
| h1 | grotesk-ex | 48 / 36 | 500 | 1.08 | -0.015em |
| h2 | grotesk | 32 / 28 | 500 | 1.15 | -0.01em |
| h3 | grotesk | 24 / 20 | 500 | 1.25 | -0.005em |
| lead | grotesk | 20 / 18 | 400 | 1.4 | 0 |
| body | grotesk | 16 | 400 | 1.55 | 0 |
| small | grotesk | 14 | 400 | 1.45 | 0 |
| tech | mono | 14 | 400 | 1.6 | 0 |
| caption | mono | 12 | 400 | 1.5 | 0 |
| label-lg | pixel | 22 | 400 | 24px | 0, uppercase |
| label-md | pixel | 16 | 400 | 20px | 0, uppercase |
| label-ui | pixel | 14 | 400 | 18px | 0, uppercase |
| label | pixel | 11 | 400 | 16px | 0, uppercase |

- **Departure Mono is set at exactly 11px, 14px, 16px or 22px, with no
  letter-spacing.** The font is drawn on an 11px grid, so 11px and 22px are
  pixel-sharp. 16px (`label-md`) was added 2026-11-07 for labels that need
  more presence than 11px without the weight of 22px — first used for the
  service name on case cards. 14px (`label-ui`) was added 2026-11-21 for
  buttons and eyebrows. Both sit off the grid and render slightly soft
  on 1x screens; that trade was accepted on purpose. Any other size is not.
  These are the one place `px` is correct — `LUMOS.md` otherwise forbids it,
  and this is the documented exception. Line heights for the label styles are
  px for the same reason. Use the `--label` / `--label-ui` / `--label-md` /
  `--label-lg` tokens rather than typing the numbers, and keep them in `px`: a `rem` would
  let a browser text-zoom land the font on a size it was never approved at.
- In Signal mode, **h1 to h3 drop to weight 400**. The display sizes and the
  extension levels below keep theirs — the brief names h1 to h3 only.

**One documented extension.** The scale names three heading levels; this site
has six in use (`variant="h4"` appears 8 times, `h5` twice, and there are raw
`<h4>`–`<h6>` elements). Rather than invent sizes, h4–h6 reuse the scale's own
steps at heading weight:

| Level | Size | Weight |
|---|---|---|
| h4 | lead — 20 / 18 | 500 |
| h5 | body — 16 | 500 |
| h6 | small — 14 | 500 |

Tokens live in [`src/styles/type.css`](../src/styles/type.css). Styles the old
scale also had keep their token names, so the element rules, the
`.text-style-*` utilities and the `Heading` / `Paragraph` variants pick the new
scale up unchanged. The brief's names are available as utilities too —
`.text-style-lead`, `.text-style-body`, `.text-style-display-xl`,
`.text-style-tech`, `.text-style-caption`, `.text-style-label`,
`.text-style-label-ui`, `.text-style-label-md`, `.text-style-label-lg`.
- Use no more than **three grotesk sizes per section**, plus labels.
- **Numbers in tables and stats use a mono font.**

## Color jobs

**Each mode has one accent.** Field (paper) uses safety-orange. Signal
(black) uses signal-green. **Never mix them in the same section.** Reach for
`--accent-fill`, which resolves this per mode.

- **safety-orange is Field's accent, and only ever a fill or a graphic
  accent**: buttons, tags, key-stat blocks, photo frames. **It is never text**,
  in either mode. Text on it is `--on-color` (`#161616`).
- **signal-green is Signal's accent.** It appears **only on black**, or as
  annotation boxes and labels over photography. **Never on paper**, as text or
  as fill. On black it is the system colour too — data, annotations, states and
  links — which is what `--system` resolves to there.
- **On paper, text is `--ink` or `--ink-muted` only.** Links in running text
  use `--ink` with an underline. Navigation (nav and footer) is exempt from the
  underline and states itself with `--ink-muted` → `--ink`.
- **In Field, canopy and sage carry the green family** — panels, emphasis
  fills, quiet surfaces. They do not cross into Signal.
- **Text on any accent fill is `--on-color`.**

**Exceptions, decided 2026-11-18.** Two, and nothing else borrows them:

- The **logo symbol** is safety-orange in both modes (see [Logo](#logo)).
- The homepage **approach step numbers** (`01`–`04`,
  `SectionApproachHome`) are `--accent-fill` as *text*: signal-green on black,
  safety-orange on paper. Chosen knowing orange text on paper is 2.99:1,
  below even the 3:1 large-text minimum in [Accessibility](#accessibility).

## Flat everywhere

- no shadows or glows
- panels use `--ground-raised` or `--canopy`, with no border
- lists and tables use `--rule` hairlines
- where a blend is needed, use a bitmap dither rather than a gradient

> **Gradient exception, 2026-11-07.** The rule is "no gradients", but EDC is
> producing its own. The existing gradients stay until those land —
> `mesh-gradient.png` on the About hero, `Overlay variant="gradient"`, and the
> `Marquee` edge mask. Do not strip them as a flat-rule cleanup. Add no new
> ones.
>
> The homepage hero left this list on 2026-11-15: its mesh gradient was
> replaced by a live ASCII rendering of a forest-canopy video
> (`scripts/hero-ascii.ts`, footage by Dmitry Marchenkov via Pexels, free
> licence). Its look — the character ramp ` ·+×#`, 6×7px cells of 9px
> Departure (line spacing 0.8, so glyphs overlap their rows on purpose), the
> `--rule` → `--sage` → `--signal-green` colour ramp on `--ground` — was
> tuned in a prototype and is fixed; the values live in that script's
> `CONFIG` and on `.hero-art`. Retuned 2026-11-16 for contrast and
> legibility. The 9px face is the one exception to the three Departure
> sizes above, and holds for this art only.

## Copy

Headings are **sentence case**. Uppercase belongs only to Departure labels.
**Don't change any copy unless asked.**

## Motion

Motion is allowed. All of it must respect `prefers-reduced-motion`.
`base.css` already zeroes animation and transition durations under that query
globally, so new motion inherits it — verify against it rather than adding a
per-component guard.

## Accessibility

**Every text and background pair must meet 4.5:1, or 3:1 for large text.**

Measured for the token set:

| Pair | Field | Signal |
|---|---|---|
| `--ink` on `--ground` | 16.88 | 16.88 |
| `--ink` on `--ground-raised` | 15.57 | 15.11 |
| `--ink-muted` on `--ground` | 5.78 | 6.86 |
| `--ink-muted` on `--ground-raised` | 5.33 | 6.14 |
| `--on-color` on `--safety-orange` | 5.65 | — |
| `--on-color` on `--canopy` / `--sage` | 12.11 / 11.88 | — |
| `--on-color` on `--signal-green` | — | 14.64 |
| `--signal-green` as text on `--ground` | — | 14.64 |

Safety-orange as text is not in the table because it is never text, and
signal-green has no Field column because it never appears on paper.

`--rule` against `--ground` is 1.34:1 in both modes. That is fine for list and
table hairlines, which are structural rather than informational, but it means
**a form control must not be identified by its border alone** — fields are
distinguished by a `--ground-raised` fill.

## Logo

The 2026 logo is not final. The current files stay in place, wrapped in one
`Logo` component, so they can be swapped in one edit. Don't inline a logo
anywhere else.

**The logo is the one exception to one-accent-per-mode** (decided
2026-11-18): its symbol is safety-orange in both modes, including on black.
Nothing else borrows that exception. (The approach step numbers are a
separate exception, to "orange is never text" — see Color jobs.)

## Implementation notes

**Where the tokens sit.** `brand.css` is its own cascade layer, above
`webflow`, because the names collide: the Webflow export declares `--black`
and `--white` in a `:root` of its own, and custom properties cascade by layer
like any other declaration. Declared in `base`, `--black` would lose to the
export and quietly resolve to the old brand's `#0e0e0f`.

**Source order matters in `brand.css`.** `[data-theme="signal"]` must stay
below the Field block. On `<html data-theme="signal">` both match at equal
specificity — `:root` and an attribute selector are both 0-1-0 — so source
order is the only thing making signal win.

**Migration is not finished.** The old tokens in `base.css`, the `.theme-*`
classes and the `webflow` layer are all still live, and the site still renders
from them. `brand.css` carries values only; it paints nothing. `color-scheme`
and the paint rule for `[data-theme]` arrive when the global surfaces move.
Until the cleanup commit, expect both systems in the tree — that is the plan,
not a mistake.

**Provisional, pending review:**

- CTA button labels and eyebrows are Departure Mono in the `label-ui` style
  (14px, uppercase).
- In Field, link hover keeps `--ink` text and thickens its underline to
  `--safety-orange` — the underline is a graphic accent, so orange is legal
  there. Heading emphasis is a flat `--canopy` fill. In Signal both are
  `--signal-green`.

**Rule change, 2026-11-18.** The accents were made one per mode (above).
The signal-green ground (`signal-fill`) is gone: the homepage now scrolls to
`data-scroll-theme="field"` (paper), and the framework's `theme="brand"`
option resolves to Field. A scroll theme is always a mode name.
