<template>
  <section>
    <p class="text-xs tracking-[0.3em] font-mono text-gray-400 mb-2">装备</p>
    <div class="flex flex-col gap-2">
      <div
        v-for="slot in SLOTS"
        :key="slot"
        class="rounded-2xl border border-gray-200 bg-white px-4 py-3"
      >
        <div class="flex items-center justify-between">
          <span class="text-[0.65rem] font-mono text-gray-400 tracking-[0.2em]">
            {{ SLOT_LABEL[slot] }}
          </span>
          <button
            v-if="defOf(slot)"
            class="text-[0.65rem] font-mono text-gray-400 hover:text-red-500"
            @click="meta.unequip(slot)"
          >
            卸下
          </button>
        </div>
        <template v-if="defOf(slot)">
          <div class="mt-1 flex items-center gap-2">
            <span class="text-sm font-medium text-gray-800">{{ defOf(slot)!.name }}</span>
            <span
              class="text-[0.6rem] font-mono px-1.5 py-0.5 rounded"
              :class="rarityClass(defOf(slot)!.rarity)"
            >
              {{ defOf(slot)!.rarity }}
            </span>
          </div>
          <p class="text-[0.7rem] text-gray-500 mt-1">{{ defOf(slot)!.description }}</p>
          <div v-if="affixesOf(slot).length > 0" class="mt-1.5 flex flex-wrap gap-1.5">
            <span
              v-for="aff in affixesOf(slot)"
              :key="aff.id"
              class="text-[0.65rem] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200"
            >
              {{ aff.name }}
            </span>
          </div>
        </template>
        <p v-else class="text-[0.7rem] text-gray-400 mt-1 italic">空</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMetaStore } from '@/store/meta'
import { EQUIPMENTS } from '@/data'
import type { EquipmentDef, EquipRarity, EquipSlot } from '@/game/meta'

const meta = useMetaStore()

const SLOTS: EquipSlot[] = ['weapon', 'armor', 'accessory']
const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: '武器',
  armor: '护甲',
  accessory: '饰品',
}

const RARITY_CLASS: Record<EquipRarity, string> = {
  common: 'text-gray-500 bg-gray-100',
  rare: 'text-sky-700 bg-sky-50',
  epic: 'text-purple-700 bg-purple-50',
}

function rarityClass(r: EquipRarity) {
  return RARITY_CLASS[r]
}

const slotDefs = computed(() => {
  const m: Partial<Record<EquipSlot, EquipmentDef | null>> = {}
  for (const slot of SLOTS) {
    const inst = meta.equipment[slot]
    m[slot] = inst ? (EQUIPMENTS.find((d) => d.id === inst.defId) ?? null) : null
  }
  return m
})

function defOf(slot: EquipSlot): EquipmentDef | null {
  return slotDefs.value[slot] ?? null
}

function affixesOf(slot: EquipSlot) {
  const inst = meta.equipment[slot]
  const def = defOf(slot)
  if (!inst || !def) return []
  return inst.affixIds
    .map((id) => def.affixPool.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a)
}
</script>
