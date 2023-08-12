export const OUTPUT_DIR = 'svg-sprite'

export enum SpriteMode {
  Symbol = 'symbol',
  Stack = 'stack',
}

export const IS_DEV = process.env.NODE_ENV === 'development'
