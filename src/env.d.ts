/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

/* Augments the interface `astro/client` already declares, rather than
   redeclaring `ImportMeta`. */
interface ImportMetaEnv {
  /** Adobe Fonts web project ID serving Aktiv Grotesk. See `.env.example`. */
  readonly PUBLIC_ADOBE_FONTS_KIT_ID?: string;
}
