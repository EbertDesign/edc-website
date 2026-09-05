import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'eanpp6me',
    dataset: 'production'
  },
  /* TypeGen for the Astro frontend one level up: queries are found in
     ../src, and the generated types land beside the frontend's tsconfig. */
  typegen: {
    path: '../src/**/*.{ts,tsx,js,jsx,astro}',
    schema: 'schema.json',
    generates: '../sanity.types.ts',
    overloadClientMethods: true,
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
})
