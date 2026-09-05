// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { SITE_URL } from "./src/consts.ts";
import { isNoindexRoute } from "./src/utils/seo.ts";

import sanity from "@sanity/astro";

// Three families, because the imported design uses three. Syne sets the
// display scale and links, Inter the headings and UI, and Switzer is the
// body face everything inherits. ClashDisplay and Spectral shipped in the
// Webflow export with 0 uses between them and are deliberately absent.
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
  fonts: [
    {
      name: "Syne",
      cssVariable: "--font-syne",
      provider: fontProviders.google(),
      weights: [400, 500, 600],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["sans-serif"],
    },
    {
      name: "Inter",
      cssVariable: "--font-inter",
      provider: fontProviders.google(),
      weights: [400, 500, 700],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["sans-serif"],
    },
    {
      name: "Switzer",
      cssVariable: "--font-switzer",
      provider: fontProviders.local(),
      fallbacks: ["sans-serif"],
      options: {
        variants: [
          { weight: 400, style: "normal", src: ["./src/assets/fonts/Switzer-Regular.woff2"] },
          { weight: 400, style: "italic", src: ["./src/assets/fonts/Switzer-Italic.woff2"] },
          { weight: 500, style: "normal", src: ["./src/assets/fonts/Switzer-Medium.woff2"] },
          { weight: 600, style: "normal", src: ["./src/assets/fonts/Switzer-Semibold.woff2"] },
          { weight: 700, style: "normal", src: ["./src/assets/fonts/Switzer-Bold.woff2"] },
        ],
      },
    },
  ],
  vite: { build: { cssTarget: "safari15.4" } },
});
