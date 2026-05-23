<template>
  <div class="px-5 py-3 border-t border-[#404040]" style="background: #252525">
    <div class="flex justify-between text-[0.7rem] text-[#888] mb-1.5">
      <span>{{ game.player.name }}</span>
      <span>{{ hp }} / {{ game.player.health.max }}</span>
    </div>
    <HpBar :current="hp" :max="game.player.health.max" />

    <!-- 气力 -->
    <div class="flex items-center gap-2 mt-2">
      <span class="text-[0.62rem] font-mono text-[#666] shrink-0 w-7">气力</span>
      <div class="flex-1 h-1.5 bg-[#404040] rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300 bg-amber-400"
          :style="{ width: `${staminaPct}%` }"
        />
      </div>
      <span class="text-[0.62rem] font-mono text-[#777] shrink-0 w-9 text-right">
        {{ stamina }}/{{ game.player.energy.max }}
      </span>
    </div>

    <!-- 理智 -->
    <div class="flex items-center gap-2 mt-1.5">
      <span class="text-[0.62rem] font-mono text-[#666] shrink-0 w-7">理智</span>
      <div class="flex-1 h-1.5 bg-[#404040] rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="sanBarColor"
          :style="{ width: `${sanPct}%` }"
        />
      </div>
      <span class="text-[0.62rem] font-mono shrink-0 w-9 text-right" :class="sanTextColor">
        {{ san }}
      </span>
    </div>

    <!-- 战斗属性 -->
    <div class="flex gap-4 mt-2">
      <span class="text-[0.62rem] font-mono text-[#666]"
        >ATK <span class="text-[#999]">{{ atk }}</span></span
      >
      <span class="text-[0.62rem] font-mono text-[#666]"
        >DEF <span class="text-[#999]">{{ def }}</span></span
      >
      <span class="text-[0.62rem] font-mono text-[#666]"
        >SPD <span class="text-[#999]">{{ spd }}</span></span
      >
      <span class="text-[0.62rem] font-mono text-[#666]"
        >LCK <span class="text-[#999]">{{ lck }}</span></span
      >
    </div>

    <!-- Buff 栏 -->
    <div v-if="game.player.buffs.visible.length > 0" class="flex flex-wrap gap-1 mt-2">
      <span
        v-for="buf in game.player.buffs.visible"
        :key="buf.id"
        class="text-[0.6rem] font-mono px-1.5 py-0.5 rounded-full"
        :class="
          buf.tags.has('debuff') ? 'bg-red-900/25 text-red-400' : 'bg-sky-900/25 text-sky-400'
        "
        >{{ buf.name }} {{ buf.duration < 0 ? '永' : buf.duration }}</span
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/store/game'
import HpBar from './HpBar.vue'

const game = useGameStore()

const hp = computed(() => game.player.health.value)
const stamina = computed(() => game.player.energy.value)
const san = computed(() => game.player.props.san.value)
const atk = computed(() => game.player.getStat('atk'))
const def = computed(() => game.player.getStat('def'))
const spd = computed(() => game.player.getStat('spd'))
const lck = computed(() => game.player.getStat('lck'))

const staminaPct = computed(() =>
  Math.max(0, Math.min(100, (stamina.value / game.player.energy.max) * 100)),
)
const sanPct = computed(() =>
  Math.max(0, Math.min(100, (san.value / game.player.props.san.max) * 100)),
)

const SAN_BAR_COLOR = {
  calm: 'bg-sky-400',
  stressed: 'bg-yellow-400',
  anxious: 'bg-orange-400',
  breakdown: 'bg-red-500',
} as const

const SAN_TEXT_COLOR = {
  calm: 'text-[#aaa]',
  stressed: 'text-yellow-400',
  anxious: 'text-orange-400',
  breakdown: 'text-red-500',
} as const

const sanState = computed(() => {
  const pct = sanPct.value
  if (pct >= 60) return 'calm'
  if (pct >= 25) return 'stressed'
  if (pct >= 10) return 'anxious'
  return 'breakdown'
})

const sanBarColor = computed(() => SAN_BAR_COLOR[sanState.value])
const sanTextColor = computed(() => SAN_TEXT_COLOR[sanState.value])
</script>
