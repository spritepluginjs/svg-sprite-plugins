import crypto from 'node:crypto'

import pathe from 'pathe'
import { get, isPlainObject, omitBy, padStart } from 'lodash'
import SVGSpriter from 'svg-sprite'
import fse from 'fs-extra'
import { minimatch } from 'minimatch'

import { logger } from './logger'
import { IS_DEV, OUTPUT_DIR, SpriteMode } from './constants'

import type {
  SvgSpriteCompiledResult,
  SvgSpriteCoreOptions,
  TransformMap,
} from './types'

export class SvgSpriteCore {
  static core: SvgSpriteCore

  content = ['**/*.svg']
  spriterConfig: SvgSpriteCoreOptions['spriterConfig']
  sprites: SvgSpriteCoreOptions['sprites']
  debug = false
  silent = false
  paths: {
    publicDir: string
    outputDir: string
    absolutePublicPath: string
    absoluteOutputPath: string
    absoluteOutputStaticPath: string
    absoluteOutputDynamicPath: string
  } = {} as any

  store = {
    /** All SVG cache map */
    transformMap: new Map() as TransformMap,
    /** hash, uniq path */
    duplicatedHashes: {} as Record<string, string>,
    svgSpriteCompiledResult: null as SvgSpriteCompiledResult | null,
  }

  constructor(options: SvgSpriteCoreOptions) {
    if (!Object.keys(options.sprites).length) {
      throw new Error(
        `Pick a sprite mode required, supported [${Object.values(
          SpriteMode,
        ).join(', ')}]`,
      )
    }
    this.paths.publicDir = options.publicDir || 'public'
    this.paths.outputDir = options.outputDir || OUTPUT_DIR
    this.paths.absolutePublicPath = pathe.join(
      process.cwd(),
      this.paths.publicDir,
    )
    this.paths.absoluteOutputPath = pathe.join(
      this.paths.absolutePublicPath,
      this.paths.outputDir,
    )
    this.paths.absoluteOutputStaticPath = pathe.join(
      this.paths.absoluteOutputPath,
      'static',
    )
    this.paths.absoluteOutputDynamicPath = pathe.join(
      this.paths.absoluteOutputPath,
      'dynamic',
    )
    this.content = [
      ...(options.content || ['**/*.svg']),
      `!${this.paths.publicDir}/${this.paths.outputDir}`,
      `!node_modules`,
    ]

    this.sprites = options.sprites || {}
    this.debug = options.debug || false
    this.silent = options.silent || false
    this.spriterConfig = {
      ...options.spriterConfig,
      shape: {
        transform: [
          {
            // svg-sprite internal logic: https://github.com/svg-sprite/svg-sprite/blob/main/lib/svg-sprite/transform/svgo.js#L48
            // ref: https://github.com/svg/svgo#configuration
            svgo: {
              plugins: [
                'preset-default',
                { name: 'removeDimensions', active: true },
                { name: 'removeViewBox', active: false },
              ],
            },
          },
        ],
        ...options.spriterConfig?.shape,
      },
      svg: {
        xmlDeclaration: false,
        doctypeDeclaration: false,
        dimensionAttributes: false,
        ...options.spriterConfig?.svg,
      },
      log: this.debug ? 'debug' : undefined,
    } as any as SVGSpriter.Config
  }

  static getInstance(options: SvgSpriteCoreOptions) {
    if (options.debug) {
      // ref: https://github.com/unjs/consola#log-level
      logger.level = 4
    }
    if (options.silent) {
      logger.level = 1
    }
    if (!SvgSpriteCore.core) {
      logger.debug('Create new core')
      SvgSpriteCore.core = new SvgSpriteCore(options)
    }
    logger.debug('Reuse core')
    return SvgSpriteCore.core
  }

  useSymbolMode() {
    return 'symbol' in this.sprites
  }

  useSymbolResourceQuery() {
    return this.useSymbolMode() && !!this.sprites.symbol?.runtime.resourceQuery
  }

  isDynamicSvg = (svgStr: string) => {
    // ref: https://stackoverflow.com/a/74173265/8335317
    return [
      'linearGradient',
      'radialGradient',
      'filter',
      'clipPath',
      ...(this.sprites.symbol?.runtime.dynamicSvgNodes || []),
    ].some((item) => {
      return svgStr.includes(`<${item}`)
    })
  }

  compile = async (
    options: { optimization?: boolean } = { optimization: false },
  ) => {
    const { optimization = false } = options

    if (optimization) {
      logger.debug('Spriter compile with optimization start...')
    } else {
      logger.debug('Spriter compile start...')
    }

    const spriterMode = Object.keys(this.sprites).reduce((prev, current) => {
      const userCurrentConfig = get(this.sprites, [current])
      const mergedConfig = isPlainObject(userCurrentConfig)
        ? userCurrentConfig
        : {}

      return {
        ...prev,
        [current]: {
          example: !optimization && this.debug,
          /** For better HMR, SVG sprite file name without hash in DEV env */
          bust: !IS_DEV,
          ...mergedConfig,
        },
      }
    }, {} as SVGSpriter.Mode)

    const staticSpriter = new SVGSpriter({
      ...this.spriterConfig,
      dest: this.paths.absoluteOutputStaticPath,
      mode: spriterMode,
    })

    const dynamicSpriter = new SVGSpriter({
      ...this.spriterConfig,
      dest: this.paths.absoluteOutputDynamicPath,
      mode: spriterMode,
    })

    let staticCount = 0
    let dynamicCount = 0

    const addedDuplicatedHashes: string[] = []

    this.store.transformMap.forEach((item, key) => {
      if (optimization && !item.used) {
        logger.debug(`Never been used svg: ${key}`)
        return
      }
      if (optimization && this.store.duplicatedHashes[item.hash]) {
        if (addedDuplicatedHashes.includes(item.hash)) {
          logger.debug(`Duplicated svg [${item.hash}]: ${key}`)
          return
        } else {
          addedDuplicatedHashes.push(item.hash)
        }
      }

      if (item.type === 'static') {
        staticCount += 1
        staticSpriter.add(item.svgHashPath, null, item.svgStr)
      } else {
        dynamicCount += 1
        dynamicSpriter.add(item.svgHashPath, null, item.svgStr)
      }
    })

    if (optimization) {
      let originStaticSize = 0
      let originDynamicSize = 0
      this.store.transformMap.forEach((item) => {
        if (item.type === 'static') {
          originStaticSize += 1
        } else {
          originDynamicSize += 1
        }
      })

      if (originStaticSize !== staticCount) {
        logger.warn(
          `Static svg sprite size optimized: ${originStaticSize} => ${staticCount}`,
        )
      }
      if (originDynamicSize !== dynamicCount) {
        logger.warn(
          `Dynamic svg sprite size optimized: ${originStaticSize} => ${staticCount}`,
        )
      }
    } else {
      logger.log(`SVG sprite static transform size: ${staticCount}`)
      logger.log(`SVG sprite dynamic transform size: ${dynamicCount}`)
    }

    const [staticResult, dynamicResult] = await Promise.all([
      staticSpriter.compileAsync(),
      dynamicSpriter.compileAsync(),
    ])
    this.store.svgSpriteCompiledResult = {
      static: staticResult,
      dynamic: dynamicResult,
    }

    if (this.debug) {
      if (optimization) {
        logger.debug('Spriter compile with optimization end')
      } else {
        logger.debug('Spriter compile end')
      }
    }

    if (optimization) {
      logger.debug('Write optimized sprite files start...')
    } else {
      logger.debug('Write sprite files start...')
    }

    const { globbySync } = await import('globby')
    const generatedSvgSprites = globbySync(
      ['static/**/sprite.*.svg', 'dynamic/**/sprite.*.svg'],
      {
        cwd: this.paths.absoluteOutputPath,
      },
    )

    fse.emptyDirSync(this.paths.absoluteOutputPath)

    const writeStaticFiles = async () => {
      for (const [mode, modeResult] of Object.entries(
        this.store.svgSpriteCompiledResult!.static.result,
      )) {
        for (const resource of Object.values(modeResult)) {
          await fse.ensureDir(pathe.dirname(resource.path))

          // Only write svg sprite if compile with optimization
          if (optimization) {
            if (resource.path.endsWith('.svg')) {
              // Find generated svg sprite path in build start stage
              const targetGeneratedPath = generatedSvgSprites.find((item) => {
                return pathe
                  .normalize(item)
                  .startsWith(pathe.join('static', mode))
              })
              if (!targetGeneratedPath) {
                throw new Error('targetGeneratedPath not found')
              }
              const optimizedFilePath = pathe.join(
                this.paths.absoluteOutputPath,
                targetGeneratedPath,
              )
              await fse.writeFile(optimizedFilePath, resource.contents)
              logger.log(
                `Output optimized static svg sprite: ${optimizedFilePath}`,
              )
            }
            return
          }

          await fse.writeFile(resource.path, resource.contents)
          if (resource.path.endsWith('.svg')) {
            logger.debug(`Output static svg sprite: ${resource.path}`)
          }
        }
      }
    }
    const writeDynamicFiles = async () => {
      for (const [mode, modeResult] of Object.entries(
        this.store.svgSpriteCompiledResult!.dynamic.result,
      )) {
        for (const resource of Object.values(modeResult)) {
          await fse.ensureDir(pathe.dirname(resource.path))

          // Only write svg sprite if compile with optimization
          if (optimization) {
            if (resource.path.endsWith('.svg')) {
              // Find generated svg sprite path in build start stage
              const targetGeneratedPath = generatedSvgSprites.find((item) => {
                return pathe
                  .normalize(item)
                  .startsWith(pathe.join('dynamic', mode))
              })
              if (!targetGeneratedPath) {
                throw new Error('targetGeneratedPath not found')
              }
              const optimizedFilePath = pathe.join(
                this.paths.absoluteOutputPath,
                targetGeneratedPath,
              )
              await fse.writeFile(optimizedFilePath, resource.contents)
              logger.log(
                `Output optimized dynamic svg sprite: ${optimizedFilePath}`,
              )
            }
            return
          }

          await fse.writeFile(resource.path, resource.contents)
          if (resource.path.endsWith('.svg')) {
            logger.debug(`Output dynamic svg sprite: ${resource.path}`)
          }
        }
      }
    }
    const stat = () => {
      return Array.from(this.store.transformMap).reduce(
        (prev, [key, value]) => {
          const grouped = Object.keys(prev).find((item) => {
            return value.hash === item
          })
          if (grouped) {
            prev[grouped] = [...prev[grouped], key]
            return prev
          }
          return {
            ...prev,
            [value.hash]: [key],
          }
        },
        // a hash with same hash files
        {} as Record<string, string[]>,
      )
    }

    const printStat = () => {
      const result = omitBy(stat(), (value) => value.length <= 1)
      if (Object.keys(result).length) {
        const format = Object.keys(result).reduce(
          (prev, current, index, array) => {
            prev += `🤖 ${padStart(
              `${index + 1}`,
              String(array.length).length,
              '0',
            )}.${current}\n`
            prev += `  - ${result[current].join('\n  - ')}\n`
            return prev
          },
          '\n\n',
        )
        logger.log(
          `There are some SVGs have same file hash (after [ \\n\\t] removed):${format}`,
        )
      } else {
        logger.debug('No duplicate svg files')
      }
    }

    await Promise.all([writeStaticFiles(), writeDynamicFiles()])

    if (optimization) {
      logger.debug('Write optimized sprite files end')
      return
    } else {
      logger.debug('Write sprite files end')
    }

    logger.debug('Svg stat start')
    printStat()
    logger.debug('Svg stat end')
  }

  upsertSvg = (path: string, _map: TransformMap, watch = false) => {
    const svgStr = fse.readFileSync(path, { encoding: 'utf-8' })

    const hash = crypto
      .createHash('md5')
      .update(svgStr.replace(/[ \n\t]/g, ''), 'utf8')
      .digest('hex')
      .slice(0, 8)

    const svgId = `${pathe.parse(path).name}-${hash}`

    const type = this.isDynamicSvg(svgStr) ? 'dynamic' : 'static'

    const svgHashPath = pathe.join(pathe.dirname(path), `${svgId}.svg`)

    if (_map.get(path)) {
      logger.debug(`Update ${type} svg`, path)
    } else {
      if (watch) {
        logger.debug(`Add ${type} svg`, path)
      } else {
        logger.debug(`Add ${type} svg`, path)
      }
    }

    _map.set(path, {
      type,
      svgStr,
      hash,
      svgHashPath,
      runtimeId: svgId,
      used: false,
    })
  }

  scanDirs = async () => {
    const { globbySync } = await import('globby')
    const svgFiles = globbySync(this.content)

    logger.debug('Match files:', svgFiles.length)

    const _transformMap = new Map() as TransformMap

    svgFiles
      .filter((item) => item.endsWith('.svg'))
      .map((item) => {
        return pathe.join(process.cwd(), item)
      })
      .forEach((item) => {
        this.upsertSvg(item, _transformMap)
      })

    const hashed: Record<string, string> = {}
    _transformMap.forEach((item, key) => {
      if (hashed[item.hash]) {
        if (!this.store.duplicatedHashes[item.hash]) {
          this.store.duplicatedHashes[item.hash] = hashed[item.hash]
        }
        const originData = _transformMap.get(hashed[item.hash])!
        _transformMap.set(key, originData)
      } else {
        hashed[item.hash] = key
      }
    })

    this.store.transformMap = _transformMap

    await this.compile()
  }

  waitSpriteCompiled = () => {
    return new Promise<void>((resolve, reject) => {
      if (this.store.svgSpriteCompiledResult) {
        resolve()
      }

      let count = 0

      const check = () => {
        setTimeout(() => {
          count += 1
          if (this.store.svgSpriteCompiledResult) {
            resolve()
            return
          }

          if (count >= 100) {
            reject(new Error(`Compile by svg-sprite timeout of ${count}s`))
          }

          check()
        }, 1e3)
      }

      check()
    })
  }

  timer: Record<string, NodeJS.Timeout> = {}

  handleSvgUpsert = (path: string) => {
    const relativePath = pathe.relative(process.cwd(), path)
    if (
      this.content
        .map((item) => minimatch(relativePath, item))
        .every((item) => item === true)
    ) {
      clearTimeout(this.timer[path])
      this.timer[path] = setTimeout(() => {
        this.upsertSvg(path, this.store.transformMap, true)
        this.compile()
        delete this.timer[path]
      })
    }
  }

  handleSvgUnlink = (path: string) => {
    const relativePath = pathe.relative(process.cwd(), path)
    const type = this.store.transformMap.get(path)?.type
    if (
      this.content
        .map((item) => minimatch(relativePath, item))
        .every((item) => item === true) &&
      type
    ) {
      this.store.transformMap.delete(path)
      logger.debug(`Delete ${type} svg`, path)
      this.compile()
    }
  }
}

export function getCore(options: SvgSpriteCoreOptions) {
  return SvgSpriteCore.getInstance(options)
}
