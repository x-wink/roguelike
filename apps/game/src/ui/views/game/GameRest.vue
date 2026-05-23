<template>
  <div class="flex-1 flex flex-col" style="background: #2e2e2e">
    <div class="px-5 pt-10 pb-4 border-b border-[#404040]">
      <p class="text-[0.68rem] tracking-[0.3em] text-[#777] font-mono uppercase mb-1">
        {{ npc ? npc.role : 'Rest Point' }}
      </p>
      <h2 class="text-xl font-semibold text-[#f0eeeb]">
        {{ npc ? npc.name : t('rest.title') }}
      </h2>
    </div>

    <div class="flex-1 px-5 py-5 flex flex-col gap-3 overflow-y-auto">
      <!-- Heal option -->
      <button
        class="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-[#484848] bg-[#363636] text-left transition-all hover:border-[#5a5a5a] hover:bg-[#3c3c3c]"
        @click="game.restHeal()"
      >
        <span class="text-2xl">🌿</span>
        <div>
          <div class="text-sm font-semibold text-[#e0ddd8]">{{ t('rest.heal') }}</div>
          <div class="text-[0.72rem] text-[#888] mt-0.5">{{ t('rest.heal.desc') }}</div>
        </div>
      </button>

      <!-- Upgrade options -->
      <div v-if="upgradableSkills.length > 0">
        <p class="text-[0.68rem] text-[#666] font-mono tracking-widest mb-2 px-1">
          <template v-if="companionNpc">{{ companionNpc.name }} · </template
          >{{ t('rest.or-upgrade') }}
        </p>
        <button
          v-for="skill in upgradableSkills"
          :key="skill.id"
          class="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-[#484848] bg-[#363636] text-left transition-all hover:border-[#5a5a5a] hover:bg-[#3c3c3c] mb-2"
          @click="game.restUpgradeSkill(skill.id)"
        >
          <div>
            <div class="text-sm font-medium text-[#e0ddd8]">{{ skill.name }}</div>
            <div class="text-[0.68rem] text-[#888] mt-0.5">{{ skill.note }}</div>
          </div>
          <div class="text-[0.68rem] font-mono text-[#777] shrink-0 ml-3">
            ×{{ multVal(skill.multiplier).toFixed(1) }}<span class="text-[#555]"> → </span>×{{
              (multVal(skill.multiplier) + 0.1).toFixed(1)
            }}
          </div>
        </button>
      </div>

      <!-- 装备词条洗练（修补者服务） -->
      <div v-if="companionNpc && rerollableSlots.length > 0">
        <p class="text-[0.68rem] text-[#666] font-mono tracking-widest mb-2 px-1">
          {{ companionNpc.name }} · 词条洗练
        </p>
        <div
          v-for="{ slot, inst, def } in rerollableSlots"
          :key="slot"
          class="mb-2 px-4 py-3.5 rounded-xl border border-[#4a4540] bg-[#363630]"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-[#e0ddd8]">{{ def.name }}</span>
            <span class="text-[0.62rem] font-mono text-[#888]">{{ SLOT_LABEL[slot] }}</span>
          </div>
          <div class="flex flex-col gap-1.5">
            <button
              v-for="(affixId, idx) in inst.affixIds"
              :key="idx"
              class="flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all"
              :class="
                canAffordReroll(inst)
                  ? 'border-[#5a5040] bg-[#2e2a20] hover:border-[#8a7050] cursor-pointer'
                  : 'border-[#3a3530] bg-[#252220] opacity-50 cursor-not-allowed'
              "
              :disabled="!canAffordReroll(inst)"
              @click="canAffordReroll(inst) && onReroll(slot, idx)"
            >
              <span class="text-[0.72rem] text-[#c8b99a]">{{ affixName(def, affixId) }}</span>
              <span class="text-[0.68rem] font-mono text-[#c8a840] shrink-0 ml-2">
                ◈ {{ rerollPrice(inst.rerollCount) }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <PlayerStatusBar />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/store/game'
import { useMetaStore, rerollPrice } from '@/store/meta'
import { useT } from '@/i18n'
import PlayerStatusBar from '@/ui/components/PlayerStatusBar.vue'
import { NPC_DEFS } from '@/game/meta'
import { EQUIPMENTS } from '@/data'
import type { EquipmentDef, EquipmentInstance, EquipSlot } from '@/game/meta'
import type { MultiplierDef } from '@xwink/rpg'

const t = useT()
const game = useGameStore()
const meta = useMetaStore()
const npc = computed(() => {
  const id = game.currentNode?.npcId
  return id ? NPC_DEFS[id] : null
})
const companionNpc = computed(() => {
  const cid = npc.value?.companion
  return cid ? NPC_DEFS[cid] : null
})
const upgradableSkills = computed(() =>
  game.player.pool.raw.filter((s) => multVal(s.multiplier) > 0),
)

function multVal(m: number | MultiplierDef): number {
  return typeof m === 'number' ? m : m.max
}

const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: '武器',
  armor: '护甲',
  accessory: '饰品',
}

type RerollSlot = { slot: EquipSlot; inst: EquipmentInstance; def: EquipmentDef }

const rerollableSlots = computed<RerollSlot[]>(() => {
  const slots: EquipSlot[] = ['weapon', 'armor', 'accessory']
  const out: RerollSlot[] = []
  for (const slot of slots) {
    const inst = meta.equipment[slot]
    if (!inst || inst.affixIds.length === 0) continue
    const def = EQUIPMENTS.find((d) => d.id === inst.defId)
    if (!def) continue
    out.push({ slot, inst, def })
  }
  return out
})

function canAffordReroll(inst: EquipmentInstance): boolean {
  return game.player.backpack.gold >= rerollPrice(inst.rerollCount)
}

function affixName(def: EquipmentDef, affixId: string): string {
  return def.affixPool.find((a) => a.id === affixId)?.name ?? affixId
}

function onReroll(slot: EquipSlot, idx: number) {
  meta.rerollAffix(slot, idx, (price) => game.player.backpack.spendGold(price), game.srand)
}
</script>
