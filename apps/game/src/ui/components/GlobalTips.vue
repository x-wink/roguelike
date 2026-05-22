<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-100"
      leave-active-class="transition-opacity duration-75"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible && (tip.title || tip.content || tip.icon)"
        class="fixed z-50 pointer-events-none min-w-[160px] max-w-[260px] rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-100/80 px-4 py-3.5 flex flex-col gap-2"
        :style="posStyle"
      >
        <!-- 头部 -->
        <div v-if="tip.icon || tip.title || tip.subtitle" class="flex items-start gap-2.5">
          <span v-if="tip.icon" class="text-base leading-none mt-0.5 shrink-0">{{ tip.icon }}</span>
          <div class="flex flex-col gap-0.5 min-w-0">
            <span v-if="tip.title" class="text-xs font-semibold text-gray-900 leading-tight">{{
              tip.title
            }}</span>
            <span v-if="tip.subtitle" class="text-[0.6rem] font-mono text-gray-400 leading-tight">{{
              tip.subtitle
            }}</span>
          </div>
        </div>
        <!-- 分隔线 -->
        <div
          v-if="(tip.icon || tip.title || tip.subtitle) && tip.content"
          class="border-t border-gray-100"
        />
        <!-- 正文 -->
        <p v-if="tip.content" class="text-[0.7rem] text-gray-500 leading-relaxed">
          {{ tip.content }}
        </p>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { LOG_LEVELS, type LogLevel, useLogLevel } from '@/ui/utils/useLogLevel'

export type TipData = {
  icon?: string
  title?: string
  subtitle?: string
  content?: string
  /** 日志级别，默认 info；低于当前路由 tipLevel 参数时不显示 */
  level?: LogLevel
}

const GAP = 8 // 浮层与锚点的间距（px）

const { isVisible } = useLogLevel()
const visible = ref(false)
const tip = reactive<TipData>({})
const anchorRect = ref<DOMRect | null>(null)

// ── 定位 ──────────────────────────────────────────────────────────────────────

// 浮层尺寸（首次渲染后才能读到，用估算值做初始定位）
const posStyle = computed(() => {
  const r = anchorRect.value
  if (!r) return {}
  // 默认 bottom-start，超出右边界时自动翻转到左侧（由 CSS max-w 控制宽度）
  return {
    top: `${r.bottom + GAP}px`,
    left: `${r.left}px`,
  }
})

// ── 事件监听 ──────────────────────────────────────────────────────────────────

type Found = { el: HTMLElement; raw: string; attrLevel?: LogLevel }

function findTipEl(target: EventTarget | null): Found | null {
  let el = target as HTMLElement | null
  // 向上查找最近的带 data-tips / data-[level]-tips 的祖先（最多 5 层）
  // 同一元素上优先取当前可见的最高精度 level-specific 属性，再 fallback 到 data-tips
  for (let i = 0; i < 5 && el; i++) {
    for (const lv of LOG_LEVELS) {
      const raw = (el.dataset as Record<string, string | undefined>)[`${lv}Tips`]
      if (raw !== undefined && isVisible(lv)) return { el, raw, attrLevel: lv }
    }
    if (el.dataset.tips) return { el, raw: el.dataset.tips }
    el = el.parentElement
  }
  return null
}

function onMouseOver(e: MouseEvent) {
  const found = findTipEl(e.target)
  if (!found) {
    visible.value = false
    return
  }
  let data: TipData
  try {
    data = JSON.parse(found.raw)
  } catch {
    data = { content: found.raw }
  }
  // 属性级别（data-[level]-tips）优先于 JSON 内 level 字段
  const level: LogLevel = found.attrLevel ?? data.level ?? 'info'
  if (!isVisible(level)) {
    visible.value = false
    return
  }
  Object.assign(tip, {
    icon: undefined,
    title: undefined,
    subtitle: undefined,
    content: undefined,
    ...data,
    level,
  })
  anchorRect.value = found.el.getBoundingClientRect()
  visible.value = true
}

function onMouseOut(e: MouseEvent) {
  const found = findTipEl(e.target)
  if (!found) return
  // 移出到子元素时不隐藏（relatedTarget 仍在同一 tip 元素内）
  const related = e.relatedTarget as HTMLElement | null
  if (related && found.el.contains(related)) return
  visible.value = false
}

onMounted(() => {
  document.addEventListener('mouseover', onMouseOver)
  document.addEventListener('mouseout', onMouseOut)
})
onUnmounted(() => {
  document.removeEventListener('mouseover', onMouseOver)
  document.removeEventListener('mouseout', onMouseOut)
})
</script>
