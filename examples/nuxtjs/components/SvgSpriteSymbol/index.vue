<template>
  <!-- 避免 SSR 警告 -->
  <slot></slot>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { SvgSpriteSymbolProps } from '../../../../packages/unplugin/src/types'

const props = defineProps<{ sprite: SvgSpriteSymbolProps }>()
console.log("🚀 ~ file: index.vue:8 ~ props:", props)
const { sprite } = props

const domStrRef = ref(sprite.domStr)
let fetchingRef = ref(false)

watch(domStrRef, () => {
  if (!domStrRef.value) {
    return
  }
  const div = document.createElement('div')
  div.innerHTML = domStrRef.value

  // It will render empty svg icon if mount svg sprite node by DOMParser.
  // Unclear for the time being.
  const targetSvg = div.querySelector('svg')

  if (!targetSvg) {
    return
  }

  targetSvg.setAttribute('width', '0')
  targetSvg.setAttribute('height', '0')
  targetSvg.style.position = 'absolute'
  targetSvg.style.bottom = '0'
  targetSvg.style.right = '0'

  document.body.appendChild(targetSvg)
})

onMounted(() => {
  async function run() {
    if (!sprite.pathname) {
      return
    }
    if (fetchingRef.value) {
      return
    }
    fetchingRef.value = true
    const response = await fetch(sprite.pathname)

    if (response.ok) {
      const data = await response.text()
      domStrRef.value = data
    }
  }

  run()
})
</script>
