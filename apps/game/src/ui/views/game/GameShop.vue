<template>
  <div class="flex-1 flex flex-col" style="background: #2e2e2e">
    <div class="px-5 pt-10 pb-4 border-b border-[#404040]">
      <p class="text-[0.68rem] tracking-[0.3em] text-[#777] font-mono uppercase mb-1">Shop</p>
      <h2 class="text-xl font-semibold text-[#f0eeeb]">{{ t('shop.title') }}</h2>
      <div class="flex items-center gap-2 mt-1">
        <p class="text-sm text-[#888]">{{ t('shop.hint') }}</p>
        <span class="text-[0.72rem] font-mono text-[#c8a840] ml-auto">
          ◈ {{ game.player.backpack.gold }}
        </span>
      </div>
    </div>

    <div class="flex-1 px-5 py-6 flex flex-col gap-3 overflow-y-auto">
      <button
        v-for="item in game.shopItems"
        :key="item.id"
        class="w-full flex items-center justify-between px-4 py-4 rounded-xl border text-left transition-all"
        :class="
          canAfford(item)
            ? 'border-[#484848] bg-[#363636] hover:border-[#5a5a5a] hover:bg-[#3c3c3c] cursor-pointer'
            : 'border-[#383838] bg-[#2a2a2a] opacity-50 cursor-not-allowed'
        "
        :disabled="!canAfford(item)"
        @click="canAfford(item) && game.buyShopItem(item)"
      >
        <div>
          <div
            class="text-sm font-semibold"
            :class="canAfford(item) ? 'text-[#e0ddd8]' : 'text-[#777]'"
          >
            {{ item.name }}
          </div>
          <div class="text-[0.72rem] text-[#888] mt-0.5">{{ item.description }}</div>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0 ml-3">
          <span
            class="text-[0.72rem] font-mono"
            :class="canAfford(item) ? 'text-[#c8a840]' : 'text-[#666]'"
          >
            ◈ {{ item.cost }}
          </span>
          <span class="text-[0.62rem] font-mono text-[#666]">{{
            describeEventEffect(item.effect)
          }}</span>
        </div>
      </button>
    </div>

    <div class="px-5 pb-4">
      <button
        class="w-full py-3 text-sm text-[#666] hover:text-[#999] transition-colors"
        @click="game.skipShop()"
      >
        {{ t('shop.skip') }}
      </button>
    </div>

    <PlayerStatusBar />
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/store/game'
import { useT } from '@/i18n'
import PlayerStatusBar from '@/ui/components/PlayerStatusBar.vue'
import { describeEventEffect } from '@/game/meta'
import type { ShopItem } from '@/game/meta'

const game = useGameStore()
const t = useT()

function canAfford(item: ShopItem): boolean {
  return game.player.backpack.gold >= item.cost
}
</script>
