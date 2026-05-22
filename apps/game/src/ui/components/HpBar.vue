<template>
  <div class="w-full h-1.5 bg-[#404040] rounded-full overflow-hidden">
    <div
      class="h-full rounded-full transition-all duration-300"
      :class="color === 'red' ? 'bg-red-400' : 'bg-emerald-400'"
      :style="{ width: `${pct}%` }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ current: number; max: number; color?: 'green' | 'red' }>()
const pct = computed(() => Math.max(0, Math.min(100, (props.current / props.max) * 100)))
</script>
