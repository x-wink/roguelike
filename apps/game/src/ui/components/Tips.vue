<template>
  <span ref="triggerEl" class="inline-flex" @mouseenter="show = true" @mouseleave="show = false">
    <slot />
    <Overlay v-bind="$attrs" :anchor="triggerEl" :visible="show">
      <div
        class="pointer-events-auto min-w-[160px] max-w-[260px] rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-100/80 px-4 py-3.5 flex flex-col gap-2"
        @mouseenter="show = true"
        @mouseleave="show = false"
      >
        <!-- 头部：icon + title + subtitle -->
        <div v-if="icon || title || subtitle" class="flex items-start gap-2.5">
          <span v-if="icon" class="text-base leading-none mt-0.5 shrink-0">{{ icon }}</span>
          <div class="flex flex-col gap-0.5 min-w-0">
            <span v-if="title" class="text-xs font-semibold text-gray-900 leading-tight">{{
              title
            }}</span>
            <span v-if="subtitle" class="text-[0.6rem] font-mono text-gray-400 leading-tight">{{
              subtitle
            }}</span>
          </div>
        </div>

        <!-- 分隔线 -->
        <div
          v-if="(icon || title || subtitle) && (content || $slots.content)"
          class="border-t border-gray-100"
        />

        <!-- 正文 -->
        <p v-if="content" class="text-[0.7rem] text-gray-500 leading-relaxed">{{ content }}</p>

        <!-- 自定义内容 slot -->
        <slot name="content" />
      </div>
    </Overlay>
  </span>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Overlay from './Overlay.vue'

defineOptions({ inheritAttrs: false })

defineProps<{
  icon?: string
  title?: string
  subtitle?: string
  content?: string
}>()

const triggerEl = ref<HTMLElement>()
const show = ref(false)
</script>
