<template>
  <div class="flex-1 flex flex-col h-full" style="background: #2e2e2e">
    <!-- Enemy (top) -->
    <div class="px-5 pt-8 pb-5 border-b border-[#404040]">
      <div class="flex items-baseline justify-between mb-3">
        <div>
          <p class="text-[0.68rem] tracking-[0.3em] text-[#777] font-mono uppercase mb-0.5">
            {{ game.enemy?.isBoss ? 'Boss' : game.enemy?.isElite ? 'Elite' : 'Enemy' }}
          </p>
          <h2 class="text-2xl font-bold text-[#f0eeeb] tracking-tight">{{ game.enemy?.name }}</h2>
        </div>
        <span class="text-xs font-mono text-[#555]">T{{ game.turn }}</span>
      </div>
      <div class="flex justify-between text-[0.68rem] text-[#777] mb-1.5">
        <span>HP</span><span>{{ enemyHp }} / {{ game.enemy?.health.max }}</span>
      </div>
      <HpBar :current="enemyHp" :max="game.enemy?.health.max ?? 0" color="red" />
      <div v-if="(game.enemy?.buffs.visible.length ?? 0) > 0" class="flex flex-wrap gap-1 mt-2">
        <span
          v-for="buf in game.enemy?.buffs.visible"
          :key="buf.id"
          class="text-[0.6rem] font-mono px-1.5 py-0.5 rounded-full"
          :class="
            buf.tags.has('debuff') ? 'bg-red-900/25 text-red-400' : 'bg-sky-900/25 text-sky-400'
          "
          >{{ buf.name }} {{ buf.duration < 0 ? '永' : buf.duration }}</span
        >
      </div>
    </div>

    <!-- Timeline -->
    <div class="px-5 py-2.5 border-b border-[#404040]">
      <BattleTimeline
        :player-time="game.playerNextActionTime"
        :enemy-time="game.enemyNextActionTime"
        :player-name="game.player.name"
        :enemy-name="game.enemy?.name ?? ''"
        :duration="timelineDuration"
        @animation-end="game.onTimelineAnimationEnd()"
      />
    </div>

    <!-- Battle log (middle, grows) -->
    <div class="flex-1 px-5 py-3 flex flex-col gap-1 justify-end overflow-hidden">
      <template v-if="settings.showBattleLog">
        <div v-if="recentLog.length === 0" class="text-[0.72rem] text-[#555] font-mono">—</div>
        <div
          v-for="(entry, i) in recentLog"
          :key="i"
          class="text-[0.72rem] font-mono flex items-baseline gap-1"
          :class="entry.actor === game.player.name ? 'text-[#c8c4be]' : 'text-[#888]'"
        >
          <span class="text-[#666] shrink-0">{{ entry.actor }}</span>
          <span class="text-[#555] shrink-0">›</span>
          <span class="shrink-0">{{ entry.skill }}</span>
          <span class="ml-auto shrink-0 flex items-baseline gap-1">
            <span v-if="entry.isDodge" class="text-[#666] text-[0.62rem]">MISS</span>
            <template v-else-if="entry.damage > 0">
              <span :class="entry.isCrit ? 'text-red-400 font-bold' : 'text-[#888]'"
                >-{{ entry.damage }}</span
              >
              <span v-if="entry.isCrit" class="text-red-400 text-[0.58rem]">CRIT</span>
              <span v-if="entry.isCombo" class="text-sky-400 text-[0.58rem]">连击</span>
            </template>
            <span v-if="entry.counterDamage" class="text-orange-400 text-[0.58rem]"
              >↩-{{ entry.counterDamage }}</span
            >
          </span>
        </div>
      </template>
    </div>

    <!-- Player status (bottom) -->
    <PlayerStatusBar />
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/store/game'
import HpBar from '@/ui/components/HpBar.vue'
import PlayerStatusBar from '@/ui/components/PlayerStatusBar.vue'
import BattleTimeline from '@/ui/components/BattleTimeline.vue'
import { useSettingsStore } from '@/store/settings'
import { computed } from 'vue'

const game = useGameStore()
const settings = useSettingsStore()
const recentLog = computed(() => game.battleLog)
const enemyHp = computed(() => game.enemy?.health.value ?? 0)
const timelineDuration = computed(() => {
  switch (settings.battleSpeed) {
    case 'slow':
      return 800
    case 'fast':
      return 150
    default:
      return 400
  }
})
</script>
