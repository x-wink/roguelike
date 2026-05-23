<template>
  <div class="bg-white rounded-2xl border px-4 py-4" :class="cardBorderClass">
    <!-- 标题行 -->
    <div class="flex items-center justify-between mb-3">
      <span class="text-base font-semibold text-gray-900">{{ buf.name || buf.id }}</span>
      <div class="flex gap-1.5">
        <span
          v-if="buf.tags?.includes('anonymous')"
          class="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-500"
          >ANON</span
        >
        <span
          class="text-xs font-mono px-2 py-0.5 rounded-full"
          :class="
            buf.tags?.includes('debuff') ? 'bg-red-50 text-red-400' : 'bg-sky-50 text-sky-500'
          "
          >{{ buf.tags?.includes('debuff') ? 'DEBUFF' : 'BUFF' }}</span
        >
      </div>
    </div>

    <!-- 效果列表 -->
    <div class="flex flex-col gap-1.5 mb-3">
      <div v-for="(line, i) in effectLines" :key="i" class="flex items-center gap-2">
        <span
          class="text-xs font-mono px-1.5 py-0.5 rounded shrink-0"
          :class="
            line.kind === 'props' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-500'
          "
          >{{ line.kind === 'props' ? 'STAT' : 'TICK' }}</span
        >
        <span class="text-sm text-gray-600">{{ line.label }}</span>
      </div>
    </div>

    <!-- 底部信息 -->
    <div class="text-xs font-mono text-gray-400">
      {{ buf.duration < 0 ? '永久' : buf.duration > 0 ? `${buf.duration} 回合` : '立即触发' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { describeBuffEffect, type BuffData } from '@xwink/rpg'

const props = defineProps<{ buf: BuffData }>()

const cardBorderClass = computed(() => {
  if (props.buf.tags?.includes('anonymous')) return 'border-dashed border-amber-300'
  if (props.buf.tags?.includes('debuff')) return 'border-red-300'
  return 'border-gray-300'
})

const effectLines = computed(() => props.buf.effects.map(describeBuffEffect))
</script>
