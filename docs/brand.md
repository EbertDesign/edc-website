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
| `--label` / `--label-lg` | `11px` / `22px` | same | the two Departure sizes |

`--system` is the brief's own sentence made into a token: *"signal-green is the
system: data, annotations, states and links on dark."* On a light ground green
is legal only as a fill and is invisible anyway (1.15:1), and orange belongs to
the CTA — so in Field the system colour is full `--ink` and a marker or a link
states itself by weight rather than hue. Ask for `--system`; never name a hue
at the call site.

## Fonts

| Stack | Families |
|---|---|
| `--font-grotesk` | `aktiv-grotesk, "Aktiv Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif` |
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

  ⚠️ **The kit serves weights 400 and 700 only** (plus 200 as a separate
  `aktiv-grotesk-thin` family). The type scale asks for **500** on display-xl
  through h3. Until Medium is added to the web project, CSS font matching
  resolves 500 down to 400 and those five styles render a step light. Adding
  it is a change in the Adobe Fonts project, not in this repo.

  The kit also ships `font-display: auto`, which can flash invisible text.
  `swap` is settable in the kit's own settings and worth turning on.
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
| display-xl | grotesk | 120 / 56 | 500 | 0.95 | -0.03em |
| display | grotesk | 72 / 44 | 500 | 1.0 | -0.02em |
| h1 | grotesk | 48 / 36 | 500 | 1.08 | -0.015em |
| h2 | grotesk | 32 / 28 | 500 | 1.15 | -0.01em |
| h3 | grotesk | 24 / 20 | 500 | 1.25 | -0.005em |
| lead | grotesk | 20 / 18 | 400 | 1.4 | 0 |
| body | grotesk | 16 | 400 | 1.55 | 0 |
| small | grotesk | 14 | 400 | 1.45 | 0 |
| tech | mono | 14 | 400 | 1.6 | 0 |
| caption | mono | 12 | 400 | 1.5 | 0 |
| label-lg | pixel | 22 | 400 | 24px | 0, uppercase |
| label | pixel | 11 | 400 | 16px | 0, uppercase |

- **Departure Mono is set at exactly 11px or 22px, with no letter-spacing.**
  Any other size blurs it. These two are the one place `px` is correct —
  `LUMOS.md` otherwise forbids it, and this is the documented exception. Line
  heights for the two label styles are px for the same reason. Use the
  `--label` / `--label-lg` tokens rather than typing the numbers, and keep
  them in `px`: a `rem` would let a browser text-zoom land the font between
  the only two sizes it is legible at.
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
`.text-style-label-lg`.
- Use no more than **three grotesk sizes per section**, plus labels.
- **Numbers in tables and stats use a mono font.**

## Color jobs

- **signal-green is the system**: data, annotations, states and links on dark.
  On light grounds use it **only as a fill, never as text** — it is 1.15:1 on
  paper. Reach for `--system`, which resolves this per mode.
- **safety-orange is the human moment**: the primary CTA, or the one key
  number. **One orange moment per section.** Never as text on paper (2.99:1),
  never as a large fill.
- **Green and orange never share a component.**
- **Text on any accent fill is `--on-color`.**

## Flat everywhere

- no shadows or glows
- panels use `--ground-raised` or `--canopy`, with no border
- lists and tables use `--rule` hairlines
- where a blend is needed, use a bitmap dither rather than a gradient

> **Gradient exception, 2026-11-07.** The rule is "no gradients", but EDC is
> producing its own. The existing gradients stay until those land — the
> homepage hero's `mesh-gradient.png`, `Overlay variant="gradient"`, and the
> `Marquee` edge mask. Do not strip them as a flat-rule cleanup. Add no new
> ones.

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
| `--on-color` on `--signal-green` | 14.64 | — |
| `--on-color` on `--safety-orange` | 5.65 | — |
| `--on-color` on `--canopy` / `--sage` | 12.11 / 11.88 | — |
| `--signal-green` as text on `--ground` | — | 14.64 |
| `--safety-orange` as text on `--ground` | — | 5.65 |

`--rule` against `--ground` is 1.34:1 in both modes. That is fine for list and
table hairlines, which are structural rather than informational, but it means
**a form control must not be identified by its border alone** — fields are
distinguished by a `--ground-raised` fill.

## Logo

The 2026 logo is not final. The current files stay in place, wrapped in one
`Logo` component, so they can be swapped in one edit. Don't inline a logo
anywhere else.

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

- CTA button labels become sentence-case grotesk at `small`; uppercase leaves
  the button, since uppercase is Departure's alone.
- In Field, link hover keeps `--ink` text and thickens its rule to
  `--safety-orange`; heading emphasis drops color for a flat `--canopy` fill.
  Both are `--signal-green` in Signal. This exists because orange and green
  are both illegal as text on paper.
