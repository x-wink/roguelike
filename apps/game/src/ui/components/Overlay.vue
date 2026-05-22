<template>
  <Teleport :to="to">
    <div
      v-if="effectiveVisible"
      ref="overlayEl"
      class="fixed z-50 pointer-events-none"
      :style="posStyle"
    >
      <slot />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { type LogLevel, useLogLevel } from '@/ui/utils/useLogLevel'

export type OverlayPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end'

const props = withDefaults(
  defineProps<{
    /** Teleport 挂载节点，默认 body */
    to?: string | HTMLElement
    /** 定位锚点元素，undefined 时不定位（由父级控制位置） */
    anchor?: HTMLElement | null
    /** 相对锚点的悬浮方向，默认 bottom-start */
    placement?: OverlayPlacement
    /** 与锚点的间距（px），默认 6 */
    gap?: number
    visible?: boolean
    /** 最低显示级别，低于当前路由 tipLevel 参数时强制隐藏 */
    level?: LogLevel
  }>(),
  {
    to: 'body',
    anchor: undefined,
    placement: 'bottom-start',
    gap: 6,
    visible: true,
    level: 'info',
  },
)

const { isVisible } = useLogLevel()
const effectiveVisible = computed(() => props.visible && isVisible(props.level))

const overlayEl = ref<HTMLElement>()

// ── 定位计算 ──────────────────────────────────────────────────────────────────

type Pos = { top?: number; bottom?: number; left?: number; right?: number }

const pos = ref<Pos>({})

function recompute() {
  if (!props.anchor || !overlayEl.value) return
  const a = props.anchor.getBoundingClientRect()
  const o = overlayEl.value.getBoundingClientRect()
  const g = props.gap
  const p = props.placement
  const result: Pos = {}

  // 主轴
  if (p.startsWith('top')) result.top = a.top - o.height - g
  if (p.startsWith('bottom')) result.top = a.bottom + g
  if (p.startsWith('left')) result.left = a.left - o.width - g
  if (p.startsWith('right')) result.left = a.right + g

  // 交叉轴
  if (p.startsWith('top') || p.startsWith('bottom')) {
    if (p.endsWith('start')) result.left = a.left
    else if (p.endsWith('end')) result.left = a.right - o.width
    else result.left = a.left + (a.width - o.width) / 2
  }
  if (p.startsWith('left') || p.startsWith('right')) {
    if (p.endsWith('start')) result.top = a.top
    else if (p.endsWith('end')) result.top = a.bottom - o.height
    else result.top = a.top + (a.height - o.height) / 2
  }

  pos.value = result
}

const posStyle = computed(() => ({
  top: pos.value.top != null ? `${pos.value.top}px` : undefined,
  left: pos.value.left != null ? `${pos.value.left}px` : undefined,
}))

// 锚点或 visible 变化时重新计算
watch(
  () => [props.anchor, effectiveVisible.value, props.placement],
  () => {
    if (effectiveVisible.value) requestAnimationFrame(recompute)
  },
  { flush: 'post' },
)

// 滚动 / resize 时跟随
function onScroll() {
  if (effectiveVisible.value) recompute()
}
onMounted(() => {
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onScroll)
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', onScroll)
})
</script>
