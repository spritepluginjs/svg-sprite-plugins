<template>
  <svg>
    <use :href="props.item.href" :xlink:href="props.item.href" />
  </svg>
</template>

<script setup lang="ts">
import type { SvgSpriteSymbolItemProps } from '../../../../../packages/core/src/types'

const props = defineProps<SvgSpriteSymbolItemProps>()

onMounted(() => {
  console.log('props.item', props.item)
})
</script>
