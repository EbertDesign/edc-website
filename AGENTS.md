# Lumos for Astro

This repository is **Lumos for Astro**: an Astro component framework, styled
with plain CSS and custom properties.

It is not **Lumos for Webflow**, which is a different product with its own
class naming, structure and utilities. If a Lumos skill targeting Webflow is
installed on your account, ignore it while working here — none of its
conventions apply. What governs this project is LUMOS.md and the skills in
`.claude/skills/`.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Building

Read [LUMOS.md](LUMOS.md) before adding pages, components, or styles. It
covers the conventions that keep a Lumos site consistent as it grows.

## Brand

The site is moving to EDC's 2026 brand. Read [docs/brand.md](docs/brand.md)
before changing anything visual — color, type, surfaces, motion or spacing.
The short version:

- Tokens live in `src/styles/brand.css`. Never hardcode a hex, a family or a
  type size; if no token carries the value, the token is missing.
- Theme is `data-theme="field"` (light, the default) or `data-theme="signal"`
  (dark), on `<html>` or on any section.
- One accent per mode, never mixed in a section: Field uses
  `--safety-orange`, Signal uses `--signal-green`. Ask for `--accent-fill`
  (fills) or `--system` (data, states, links) rather than naming a hue.
- Orange is only ever a fill or graphic mark, never text; text on it is
  `--on-color`. Green appears only on black or as annotations over photos,
  never on paper. On paper, text is `--ink` or `--ink-muted` only. Two
  documented exceptions, nothing else: the logo's orange symbol, and the
  homepage approach step numbers (orange text on paper).
- Flat: no shadows or glows. The gradients still in the tree are a documented
  exception — don't strip them, don't add more.
- Departure Mono is set only at 11px, 16px or 22px (`--label`,
  `--label-md`, `--label-lg`). It is the one place `px` is correct, against
  `LUMOS.md`'s general rule.
- Headings are sentence case; uppercase belongs to Departure labels alone.
  Don't change copy unless asked.
- The migration is unfinished by design: the old tokens, the `.theme-*`
  classes and the `webflow` layer are all still live. brand.md records what is
  still provisional.

## Skills

Task-specific procedures live in `.claude/skills/`, one folder each, with a
`SKILL.md` and any scripts it needs.

- `lumos-import-figma` — build a page or fill in variables from a Figma file,
  including a messy one. Converts px to rem, line heights to unitless, and
  Figma's faked opacity back to `color-mix`.
- `lumos-audit-props` — occasional sweep for prop order and tooltip
  consistency across the component library.
- `lumos-scaling-graphic` — build an illustration or mockup that scales as one
  piece while staying real elements, using an aspect-ratio artboard and `cqw`.
- `lumos-import-webflow` — move a site off Webflow in three passes: rebuild it
  exactly from the export, swap in the components Lumos already has, then
  connect the CMS. Each pass is verified against the one before.
- `lumos-upgrade-version` — move a site onto the latest framework without losing its
  customizations. Three-way merges against the commit it was scaffolded from,
  and pixel-diffs every page before and after.

In Claude Code these load on their own, or with `/lumos-import-figma`. Any other
assistant can read the `SKILL.md` directly and follow it — the steps are plain
markdown and the scripts are plain Node.
