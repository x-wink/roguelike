<template>
  <div class="flex-1 flex flex-col" style="background: #2e2e2e">
    <div class="px-5 pt-10 pb-4 border-b border-[#404040]">
      <p class="text-[0.68rem] tracking-[0.3em] text-[#777] font-mono uppercase mb-1">Event</p>
      <h2 class="text-xl font-semibold text-[#f0eeeb]">{{ game.currentEvent?.name }}</h2>
    </div>

    <div class="flex-1 px-5 py-6 flex flex-col gap-4 overflow-y-auto">
      <p class="text-sm text-[#aaa] leading-relaxed">{{ game.currentEvent?.description }}</p>

      <div class="flex flex-col gap-2 mt-2">
        <button
          v-for="(option, i) in game.currentEvent?.options ?? []"
          :key="i"
          class="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-[#484848] bg-[#363636] text-left transition-all hover:border-[#5a5a5a] hover:bg-[#3c3c3c]"
          @click="game.resolveEvent(i)"
        >
          <span class="text-sm font-medium text-[#e0ddd8]">{{ option.label }}</span>
          <span class="text-[0.68rem] font-mono text-[#777] shrink-0 ml-3">{{
            describeEventEffect(option.effect)
          }}</span>
        </button>
      </div>
    </div>

    <PlayerStatusBar />
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/store/game'
import PlayerStatusBar from '@/ui/components/PlayerStatusBar.vue'
import { describeEventEffect } from '@/game/meta'

const game = useGameStore()
</script>
