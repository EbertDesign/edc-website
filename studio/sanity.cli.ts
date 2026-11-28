import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'eanpp6me',
    dataset: 'production',
  },
  /* The deployed Studio: https://ebert-design.sanity.studio. Set here rather
     than passed to `sanity deploy` so every deploy targets the same host. */
  studioHost: 'ebert-design',
  /* TypeGen for the Astro frontend one level up: queries are found in
     ../src, and the generated types land beside the frontend's tsconfig. */
  typegen: {
    path: '../src/**/*.{ts,tsx,js,jsx,astro}',
    schema: 'schema.json',
    generates: '../sanity.types.ts',
    overloadClientMethods: true,
  },
  /* `lexorank`, a dependency of @sanity/orderable-document-list, ships
     CommonJS. The CLI's schema worker (`sanity schema extract`, so `npm run
     typegen`, and `sanity deploy`) runs everything through Vite and fails on
     it with "exports is not defined"; left external, Node loads it itself. */
  vite: {ssr: {external: ['lexorank']}},
  deployment: {
    /* The deployed application, so `sanity deploy` never prompts for it. */
    appId: 'szwveao4wccftyoaaegpo5gt',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
})
