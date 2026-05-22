<template>
  <div class="flex items-center gap-1">
    <component
      :is="tab.to ? RouterLink : 'button'"
      v-for="tab in tabs"
      :key="tab.key ?? tab.to ?? tab.label"
      v-bind="tab.to ? { to: tab.to } : {}"
      class="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors"
      :class="
        isActive(tab)
          ? 'bg-gray-900 text-white'
          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
      "
      @click="tab.to ? undefined : emit('select', tab)"
    >
      <component :is="tab.icon" v-if="tab.icon" class="w-4 h-4 shrink-0" />
      <span class="text-xs font-medium">{{ tab.label }}</span>
      <span
        v-if="tab.badge != null"
        class="text-[0.6rem] transition-colors"
        :class="isActive(tab) ? 'opacity-50' : 'opacity-60'"
        >{{ tab.badge }}</span
      >
    </component>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import type { Component } from 'vue'

export type TabItem = {
  /** 唯一标识，to/label 均可作为 key */
  key?: string
  label: string
  icon?: Component
  /** 路由模式：传 to 则渲染 RouterLink，否则渲染 button */
  to?: string
  /** 非路由模式下的激活判断值 */
  active?: boolean
  /** 可选角标，显示在 label 右侧 */
  badge?: string | number
}

defineProps<{ tabs: TabItem[] }>()
const emit = defineEmits<{ select: [tab: TabItem] }>()

const route = useRoute()

function isActive(tab: TabItem): boolean {
  if (tab.to) return tab.to === route.path
  return tab.active ?? false
}
</script>
