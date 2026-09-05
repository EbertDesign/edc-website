// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { SITE_URL } from "./src/consts.ts";
import { isNoindexRoute } from "./src/utils/seo.ts";

import sanity from "@sanity/astro";

export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap({
    filter: (page) => !isNoindexRoute(new URL(page).pathname),
  }), sanity({ projectId: 'eanpp6me', dataset: 'production', apiVersion: '2026-09-04', useCdn: false })],
  fonts: [
    {
      name: "Inter",
      cssVariable: "--font-inter",
      provider: fontProviders.local(),
      options: {
        variants: [
          {
            weight: 400,
            style: "normal",
            src: ["./src/assets/fonts/inter-regular.woff2"],
          },
        ],
      },
    },
  ],
  vite: { build: { cssTarget: "safari15.4" } },
});