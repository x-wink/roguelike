<template>
  <div class="w-full h-full flex flex-col bg-gray-50 p-8">
    <div class="mb-8 pb-5 border-b border-gray-200">
      <div class="mb-3">
        <p class="text-xs tracking-[0.3em] text-gray-400 font-mono uppercase mb-1">DEBUG</p>
        <h1 class="text-3xl font-bold text-gray-900">{{ title }}</h1>
      </div>
      <TabNav :tabs="tabs" />
    </div>
    <div class="flex-1 min-h-0 overflow-hidden flex flex-col">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Component } from 'vue'
import TabNav from '@/ui/components/TabNav.vue'

defineProps<{ title: string }>()

const router = useRouter()

const tabs = computed(() =>
  router
    .getRoutes()
    .filter((r) => r.path.startsWith('/debug/'))
    .map((r) => ({
      to: r.path,
      label: (r.meta.label as string | undefined) ?? r.path.split('/').pop()!,
      icon: r.meta.icon as Component | undefined,
    })),
)
</script>
