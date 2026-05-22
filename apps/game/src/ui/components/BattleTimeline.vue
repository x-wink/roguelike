<template>
  <div class="select-none">
    <!-- 轨道 -->
    <div class="relative h-10 flex items-center">
      <!-- 背景轨道线 -->
      <div class="absolute inset-x-4 h-px bg-gray-100" />

      <!-- 终点标记 -->
      <div class="absolute right-4 top-1/2 -translate-y-1/2 w-px h-3 bg-gray-300" />

      <!-- 头像 -->
      <div
        v-for="unit in units"
        :key="unit.id"
        class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
        :style="{
          left: `calc(1rem + ${unit.pct}% * (100% - 2rem) / 100)`,
          transition: `left ${animDuration}ms linear`,
        }"
      >
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border-2 transition-all duration-300"
          :class="[
            unit.isPlayer
              ? 'bg-sky-50 text-sky-600 border-sky-200'
              : 'bg-red-50 text-red-500 border-red-200',
            unit.isNext
              ? unit.isPlayer
                ? 'border-sky-500 shadow-sky-200 shadow-md scale-110'
                : 'border-red-400 shadow-red-200 shadow-md scale-110'
              : '',
          ]"
        >
          {{ unit.initial }}
        </div>
        <div
          v-if="unit.isNext"
          class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
          :class="unit.isPlayer ? 'bg-sky-400' : 'bg-red-400'"
        />
      </div>
    </div>

    <!-- 名字行 -->
    <div class="flex justify-between px-4 mt-0.5">
      <span
        v-for="unit in units"
        :key="unit.id"
        class="text-[0.55rem] font-mono transition-colors duration-200"
        :class="[unit.isNext ? (unit.isPlayer ? 'text-sky-500' : 'text-red-400') : 'text-gray-300']"
        :style="{ marginLeft: unit.isPlayer ? '0' : 'auto' }"
      >
        {{ unit.name }}{{ unit.isNext ? ' ▸' : '' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BASE_ACTION_COST } from '@xwink/rpg'
import { computed, onUnmounted, watch } from 'vue'

const props = defineProps<{
  playerTime: number
  enemyTime: number
  playerName: string
  enemyName: string
  duration?: number
}>()

const emit = defineEmits<{
  animationEnd: []
}>()

const animDuration = computed(() => props.duration ?? 400)

// 动画结束后触发：用 setTimeout 替代 transitionend，
// 避免"单位不移动时 transition 不触发"的边界情况。
let timer: ReturnType<typeof setTimeout> | null = null

function scheduleEmit() {
  if (timer) clearTimeout(timer)
  // +16ms（一帧）作为 transition 完成缓冲
  timer = setTimeout(() => {
    timer = null
    emit('animationEnd')
  }, animDuration.value + 16)
}

// immediate: true 保证首次渲染后也能推进第一回合
watch([() => props.playerTime, () => props.enemyTime], scheduleEmit, { immediate: true })

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})

const units = computed(() => {
  const { playerTime, enemyTime } = props
  // 下一个行动的单位 actionValue 最小，将其映射到 100%（终点），
  // 另一方按时间差线性落后。差值超过 BASE_ACTION_COST 时钳制到 0%。
  const minTime = Math.min(playerTime, enemyTime)
  const playerPct = Math.max(
    0,
    Math.min(100, 100 - ((playerTime - minTime) / BASE_ACTION_COST) * 100),
  )
  const enemyPct = Math.max(
    0,
    Math.min(100, 100 - ((enemyTime - minTime) / BASE_ACTION_COST) * 100),
  )
  const playerIsNext = playerTime <= enemyTime

  return [
    {
      id: 'player',
      name: props.playerName,
      initial: props.playerName.charAt(0),
      pct: playerPct,
      isPlayer: true,
      isNext: playerIsNext,
    },
    {
      id: 'enemy',
      name: props.enemyName,
      initial: props.enemyName.charAt(0),
      pct: enemyPct,
      isPlayer: false,
      isNext: !playerIsNext,
    },
  ]
})
</script>
