<template>
  <DebugLayout title="Buff 一览">
    <div class="flex-1 overflow-y-auto">
      <!-- 筛选栏 -->
      <div class="flex flex-wrap gap-4 mb-6">
        <FilterTags :options="TAG_OPTIONS" v-model="selectedTags" />
        <div class="w-px bg-gray-200 self-stretch" />
        <FilterTags :options="TYPE_OPTIONS" v-model="selectedTypes" />
      </div>

      <!-- 列表 -->
      <div class="grid grid-cols-3 gap-4">
        <BuffCard v-for="buf in filtered" :key="buf.id" :buf="buf" />
        <p v-if="filtered.length === 0" class="col-span-3 text-sm text-gray-300 font-mono">
          — 无匹配
        </p>
      </div>
    </div>
  </DebugLayout>
</template>

<script setup lang="ts">
import { BUFF_PRESETS } from '@/data'
import type { BuffData } from '@xwink/rpg'
import { computed, ref } from 'vue'
import BuffCard from './BuffCard.vue'
import FilterTags from './FilterTags.vue'
import DebugLayout from './Layout.vue'

const ALL_BUFFS: BuffData[] = BUFF_PRESETS

type TagFilter = 'buff' | 'debuff' | 'control' | 'anon'
type TypeFilter = 'props' | 'tick'

const TAG_OPTIONS = [
  {
    value: 'buff' as TagFilter,
    label: '增益',
    activeClass: 'border-sky-300 text-sky-500 bg-sky-50',
  },
  {
    value: 'debuff' as TagFilter,
    label: '减益',
    activeClass: 'border-red-300 text-red-400 bg-red-50',
  },
  {
    value: 'control' as TagFilter,
    label: '控制',
    activeClass: 'border-orange-300 text-orange-400 bg-orange-50',
  },
  {
    value: 'anon' as TagFilter,
    label: '匿名',
    activeClass: 'border-amber-300 text-amber-500 bg-amber-50',
  },
]

const TYPE_OPTIONS = [
  {
    value: 'props' as TypeFilter,
    label: '状态',
    activeClass: 'border-gray-400 text-gray-600 bg-gray-100',
  },
  {
    value: 'tick' as TypeFilter,
    label: '机制',
    activeClass: 'border-amber-300 text-amber-500 bg-amber-50',
  },
]

function buffTag(buf: BuffData): TagFilter {
  if (buf.tags?.includes('anonymous')) return 'anon'
  if (!buf.tags?.includes('debuff')) return 'buff'
  if (buf.effects.some((e) => e.behavior.kind === 'control' && e.when === 'turnStart'))
    return 'control'
  return 'debuff'
}

const selectedTags = ref(new Set<TagFilter>(TAG_OPTIONS.map((o) => o.value)))
const selectedTypes = ref(new Set<TypeFilter>(TYPE_OPTIONS.map((o) => o.value)))

function effectType(e: { behavior: { kind: string } }): TypeFilter {
  return e.behavior.kind === 'propMod' ? 'props' : 'tick'
}

const filtered = computed(() =>
  ALL_BUFFS.filter((buf) => {
    if (!selectedTags.value.has(buffTag(buf))) return false
    return buf.effects.some((e) => selectedTypes.value.has(effectType(e)))
  }),
)
</script>
