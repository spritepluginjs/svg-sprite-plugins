import path from 'node:path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  vue: {
    runtimeCompiler: true,
  },
  modules: [
    [
      '../../packages/unplugin/src/nuxt',
      {
        content: ['assets/**/*.svg'],
        symbol: {
          runtime: {
            itemGenerator: path.join(
              __dirname,
              'scripts',
              'sprites',
              'symbol',
              'item-generator.mjs',
            ),
            spriteGenerator: path.join(
              __dirname,
              'scripts',
              'sprites',
              'symbol',
              'sprite-generator.mjs',
            ),
          },
        },
      },
    ],
  ],
})
