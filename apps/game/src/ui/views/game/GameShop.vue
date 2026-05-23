<template>
  <div class="flex-1 flex flex-col" style="background: #2e2e2e">
    <div class="px-5 pt-10 pb-4 border-b border-[#404040]">
      <p class="text-[0.68rem] tracking-[0.3em] text-[#777] font-mono uppercase mb-1">
        {{ npc ? npc.role : 'Shop' }}
      </p>
      <h2 class="text-xl font-semibold text-[#f0eeeb]">{{ npc ? npc.name : t('shop.title') }}</h2>
      <div class="flex items-center gap-2 mt-1">
        <p class="text-sm text-[#888]">{{ t('shop.hint') }}</p>
        <span class="text-[0.72rem] font-mono text-[#c8a840] ml-auto">
          ◈ {{ game.player.backpack.gold }}
        </span>
      </div>
    </div>

    <div class="flex-1 px-5 py-6 flex flex-col gap-3 overflow-y-auto">
      <!-- 消耗品 -->
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

      <!-- 装备 -->
      <template v-if="equipItems.length > 0">
        <p class="text-[0.68rem] text-[#555] font-mono tracking-widest mt-1 px-1">── 装备 ──</p>
        <button
          v-for="eq in equipItems"
          :key="eq.id"
          class="w-full flex items-start justify-between px-4 py-4 rounded-xl border text-left transition-all"
          :class="
            equipBuyable(eq)
              ? 'border-[#4a4540] bg-[#363630] hover:border-[#6a6050] hover:bg-[#3c3a30] cursor-pointer'
              : 'border-[#383530] bg-[#282620] opacity-50 cursor-not-allowed'
          "
          :disabled="!equipBuyable(eq)"
          @click="equipBuyable(eq) && onBuyEquip(eq)"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span
                class="text-sm font-semibold"
                :class="canAffordEquip(eq) ? 'text-[#e0ddd8]' : 'text-[#777]'"
                >{{ eq.name }}</span
              >
              <span
                class="text-[0.6rem] font-mono px-1.5 py-0.5 rounded"
                :class="rarityClass(eq.rarity)"
                >{{ SLOT_LABEL[eq.slot] }}</span
              >
              <span
                v-if="meta.getEquipped(eq.slot)?.defId === eq.id"
                class="text-[0.6rem] text-[#c8a840] font-mono"
                >已装备</span
              >
              <span
                v-else-if="meta.getEquipped(eq.slot)"
                class="text-[0.6rem] text-[#c87a40] font-mono"
                >替换 {{ replacedName(eq.slot) }}</span
              >
            </div>
            <div class="text-[0.72rem] text-[#888] mt-0.5">{{ eq.description }}</div>
            <div class="text-[0.65rem] text-[#666] mt-0.5">
              随机词条 ×{{ eq.affixCount }}：<span
                v-for="(aff, i) in eq.affixPool"
                :key="aff.id"
                class="text-[#998866]"
                >{{ aff.name
                }}<span v-if="i < eq.affixPool.length - 1" class="text-[#555]"> · </span></span
              >
            </div>
            <div class="text-[0.65rem] text-[#555] mt-0.5 italic">{{ eq.lore }}</div>
          </div>
          <span
            class="text-[0.72rem] font-mono shrink-0 ml-3 mt-0.5"
            :class="canAffordEquip(eq) ? 'text-[#c8a840]' : 'text-[#666]'"
          >
            ◈ {{ eq.price }}
          </span>
        </button>
      </template>
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
import { computed } from 'vue'
import { useGameStore } from '@/store/game'
import { useMetaStore } from '@/store/meta'
import { useT } from '@/i18n'
import PlayerStatusBar from '@/ui/components/PlayerStatusBar.vue'
import { describeEventEffect, NPC_DEFS } from '@/game/meta'
import { EQUIPMENTS } from '@/data'
import type { EquipmentDef, EquipRarity, EquipSlot, ShopItem } from '@/game/meta'

const game = useGameStore()
const meta = useMetaStore()
const t = useT()
const npc = computed(() => {
  const id = game.currentNode?.npcId
  return id ? NPC_DEFS[id] : null
})

const gold = computed(() => game.player.backpack.gold)

const SLOT_LABEL: Record<EquipSlot, string> = { weapon: '武器', armor: '护甲', accessory: '饰品' }

const RARITY_CLASS: Record<EquipRarity, string> = {
  common: 'text-[#888] bg-[#333]',
  rare: 'text-[#6aa3c8] bg-[#1a2a38]',
  epic: 'text-[#a87cc8] bg-[#251a38]',
}

function rarityClass(r: EquipRarity) {
  return RARITY_CLASS[r]
}

function replacedName(slot: EquipSlot): string {
  const inst = meta.getEquipped(slot)
  if (!inst) return ''
  return EQUIPMENTS.find((d) => d.id === inst.defId)?.name ?? ''
}

const equipItems = computed(() => EQUIPMENTS)

function canAfford(item: ShopItem): boolean {
  return gold.value >= item.cost
}
function canAffordEquip(eq: EquipmentDef): boolean {
  return gold.value >= eq.price
}
function equipBuyable(eq: EquipmentDef): boolean {
  return canAffordEquip(eq) && meta.getEquipped(eq.slot)?.defId !== eq.id
}

function onBuyEquip(eq: EquipmentDef) {
  if (gold.value < eq.price) return
  if (meta.getEquipped(eq.slot)?.defId === eq.id) return
  if (!game.player.backpack.spendGold(eq.price)) return
  meta.buyEquipment(eq.id, game.srand)
}
</script>
