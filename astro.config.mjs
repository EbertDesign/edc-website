// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { SITE_URL } from "./src/consts.ts";
import { isNoindexRoute } from "./src/utils/seo.ts";

import sanity from "@sanity/astro";

// No `fonts` block: the 2026 brand's three families are not loaded through
// Astro's font API, which hashes the family name it generates and so can only
// be reached through its own variable. Aktiv Grotesk comes from an Adobe
// Fonts kit, Departure Mono is self-hosted, and IBM Plex Mono comes from
// Fontsource — all under their real names. See docs/brand.md.
export default defineConfig({
  site: SITE_URL,
  integrations: [
    sitemap({
      filter: (page) => !isNoindexRoute(new URL(page).pathname),
    }),
    sanity({
      projectId: "eanpp6me",
      dataset: "production",
      apiVersion: "2026-09-04",
      useCdn: false,
    }),
  ],
  vite: { build: { cssTarget: "safari15.4" } },
});
