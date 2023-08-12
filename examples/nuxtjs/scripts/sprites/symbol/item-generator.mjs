export default function generator({ item, cwd }) {
  return `
    import SvgSpriteItem from '${cwd}/components/SvgSpriteSymbol/Item'

    export default {
      components: {
        SvgSpriteItem
      },
      data() {
        return {
          item: ${JSON.stringify(item)}
        }
      },
      template: \`
        <SvgSpriteItem v-bind:item="item" />
      \`
    }
  `
}
