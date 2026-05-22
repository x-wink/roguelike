<template>
  <DebugLayout title="属性面板">
    <div class="flex-1 overflow-y-auto">
      <div class="flex flex-col gap-6 max-w-2xl">
        <!-- Unit 选择 -->
        <section>
          <p class="text-xs tracking-[0.3em] font-mono text-gray-400 mb-3">选择单位</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="u in units"
              :key="u.id"
              class="px-3 py-1.5 rounded-xl border text-xs font-mono transition-all"
              :class="
                selected?.id === u.id
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
              "
              @click="selected = u"
            >
              {{ u.name }}
            </button>
          </div>
        </section>

        <UnitStatsPanel v-if="selected" :unit="selected as Unit" />
      </div>
    </div>
  </DebugLayout>
</template>

<script setup lang="ts">
import { ENEMIES, PLAYER_START } from '@/data'
import { Unit } from '@xwink/rpg'
import { Player } from '@/game/units/player'
import { Enemy } from '@/game/units/enemy'
import { ref } from 'vue'
import DebugLayout from './Layout.vue'
import UnitStatsPanel from '@/ui/components/UnitStatsPanel.vue'

const player = new Player({
  id: 'player',
  name: '李火旺',
  health: 80,
  energy: 80,
  san: 100,
  str: 6,
  con: 3,
  agi: 8,
  int: 5,
  lck: 8,
  skills: PLAYER_START.skills,
})

const units = [player, ...Object.values(ENEMIES).map((e) => new Enemy(e))]
const selected = ref<Unit | Enemy>(units[0])
</script>
