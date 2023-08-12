import type {
  SvgSpriteCoreOptions,
  SymbolSpriteOptions,
} from '@spritepluginjs/svg-core'

export interface Options extends Omit<SvgSpriteCoreOptions, 'sprites'> {
  symbol: SymbolSpriteOptions
}
