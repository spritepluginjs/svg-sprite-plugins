# @spritepluginjs/svg-unplugin

[![npm version][npm-version-src]][npm-version-href] [![npm downloads][npm-downloads-src]][npm-downloads-href] [![License][license-src]][license-href]

## 🎉 Features

- 🦄 [Unified plugin](https://github.com/unjs/unplugin), support Vite/Rollup/Webpack/Nuxt/esbuild
- ❤️ Framework-agnostic, use whatever framework you like
- 😎 Import SVG file directly in the source code
- 🪁 \*Inject **dynamic SVG sprite** only
- 😄 HMR supported (Vite/Webpack)
- 🤖 Detect duplicated SVG shapes
- 🚀 Auto optimization for unused and duplicated svg shapes (After build)

> There is [some SVG nodes](https://stackoverflow.com/a/74173265/8335317) will make SVG item broken, if `use` node `href` property is external link like `/svg-sprite-symbol#unplugin`. I call it `dynamic SVG`, because regular SVG can use with external **static resource** link smoothly.
>
> Fortunately, with the plugin, you can just use injected `href` property to resolve the situation. Only **dynamic SVG sprite** will inject to the DOM.

## 👀 Install

```bash
npm i @spritepluginjs/svg-unplugin
```

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import svgSprite from '@spritepluginjs/svg-unplugin/vite'

export default defineConfig({
  plugins: [
    svgSprite({
      /* options */
    }),
  ],
})
```

Example: [`playground/`](./playground/)

<br></details>

<details>
<summary>Rollup</summary><br>

```ts
// rollup.config.js
import svgSprite from '@spritepluginjs/svg-unplugin/rollup'

export default {
  plugins: [
    svgSprite({
      /* options */
    }),
  ],
}
```

<br></details>

<details>
<summary>Webpack</summary><br>

```ts
// webpack.config.js
module.exports = {
  /* ... */
  plugins: [
    require('@spritepluginjs/svg-unplugin/webpack')({
      /* options */
    }),
  ],
}
```

<br></details>

<details>
<summary>Nuxt</summary><br>

```ts
// nuxt.config.js
export default {
  vue: {
    runtimeCompiler: true,
  },
  // Nuxt 2 move `modules` into `buildModules`
  modules: [
    [
      '@spritepluginjs/svg-unplugin/nuxt',
      {
        /* options */
      },
    ],
  ],
}
```

> This module works for both Nuxt 2 and [Nuxt Vite](https://github.com/nuxt/vite)

<br></details>

<details>
<summary>Vue CLI</summary><br>

```ts
// vue.config.js
module.exports = {
  configureWebpack: {
    plugins: [
      require('@spritepluginjs/svg-unplugin/webpack')({
        /* options */
      }),
    ],
  },
}
```

<br></details>

<details>
<summary>esbuild</summary><br>

```ts
// esbuild.config.js
import { build } from 'esbuild'
import svgSprite from '@spritepluginjs/svg-unplugin/esbuild'

build({
  plugins: [svgSprite()],
})
```

<br></details>

## 🗺️ Road Map

[Check **todo** issues](https://github.com/yunsii/@spritepluginjs/svg-unplugin/issues?q=is%3Aopen+label%3Atodo+sort%3Aupdated-desc)

## 📚 References

- [svg-sprite](https://github.com/svg-sprite/svg-sprite)
- [How SVG Fragment Identifiers Work](https://css-tricks.com/svg-fragment-identifiers-work/)
- [SVG Stacks](https://simurai.com/blog/2012/04/02/svg-stacks)
- [SVGO](https://github.com/svg/svgo)

## License

[MIT](./LICENSE) License © 2023-PRESENT [yunsii](https://github.com/yunsii)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/spritepluginjs/svg-unplugin?color=a1b858&label=
[npm-version-href]: https://www.npmjs.com/package/spritepluginjs/svg-unplugin
[npm-downloads-src]: https://img.shields.io/npm/dm/spritepluginjs/svg-unplugin.svg?color=a1b858
[npm-downloads-href]: https://www.npmjs.com/package/spritepluginjs/svg-unplugin
[license-src]: https://img.shields.io/github/license/spritepluginjs/svg-sprite-plugins/packages/unplugin.svg?style=flat&colorB=a1b858
[license-href]: https://github.com/spritepluginjs/svg-unplugin/blob/main/LICENSE
