<template>
  <DebugLayout title="演武场">
    <!-- ── STEP INDICATOR ──────────────────────────────────────── -->
    <div v-if="arenaPhase !== 'battle'" class="flex items-center gap-2 mb-6">
      <div v-for="(label, idx) in STEPS" :key="idx" class="flex items-center gap-2">
        <div
          class="flex items-center gap-1.5 text-xs font-mono"
          :class="
            stepIndex === idx
              ? 'text-gray-900'
              : stepIndex > idx
                ? 'text-gray-300'
                : 'text-gray-200'
          "
        >
          <span
            class="w-5 h-5 rounded-full flex items-center justify-center text-[0.6rem]"
            :class="
              stepIndex === idx
                ? 'bg-gray-900 text-white'
                : stepIndex > idx
                  ? 'bg-gray-200 text-gray-400'
                  : 'bg-gray-100 text-gray-300'
            "
            >{{ idx + 1 }}</span
          >
          {{ label }}
        </div>
        <span v-if="idx < STEPS.length - 1" class="text-gray-200 text-xs">›</span>
      </div>
    </div>

    <!-- ── STEP 1: 选对手 ──────────────────────────────────────── -->
    <div v-if="arenaPhase === 'enemy'" class="flex gap-6 flex-1 min-h-0">
      <!-- 左栏：敌人列表 -->
      <div class="flex flex-col gap-3 w-48 shrink-0 overflow-y-auto">
        <p class="text-xs tracking-[0.3em] font-mono text-gray-400">选择对手</p>

        <!-- tag 筛选 -->
        <FilterTags :options="ENEMY_TAG_OPTIONS" v-model="selectedEnemyTags" />

        <button
          v-for="(en, id) in filteredEnemies"
          :key="id"
          class="px-4 py-3 rounded-2xl border text-left transition-all"
          :class="
            selectedEnemyId === id
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 bg-white hover:border-gray-400'
          "
          @click="selectedEnemyId = id as string"
        >
          <p
            class="text-xs font-mono uppercase mb-1"
            :class="
              selectedEnemyId === id
                ? 'text-gray-400'
                : en.isBoss
                  ? 'text-red-400'
                  : en.isElite
                    ? 'text-orange-400'
                    : en.tags?.includes('dummy')
                      ? 'text-purple-400'
                      : 'text-gray-400'
            "
          >
            {{
              en.isBoss
                ? 'BOSS'
                : en.isElite
                  ? 'ELITE'
                  : en.tags?.includes('dummy')
                    ? 'DUMMY'
                    : 'NORMAL'
            }}
          </p>
          <p class="text-sm font-semibold">{{ en.name }}</p>
        </button>

        <button
          class="mt-2 px-6 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold transition-colors hover:bg-gray-700"
          @click="arenaPhase = 'skills'"
        >
          下一步
        </button>
      </div>

      <!-- 右栏：选中敌人的完整属性 -->
      <div class="flex-1 min-w-0 overflow-y-auto">
        <UnitStatsPanel :unit="enemyUnits[selectedEnemyId]" />
      </div>
    </div>

    <!-- ── STEP 2: 选技能 ──────────────────────────────────────── -->
    <div v-else-if="arenaPhase === 'skills'" class="flex gap-6 flex-1 min-h-0">
      <!-- 左栏：已选摘要 + 操作 -->
      <div class="w-52 shrink-0 flex flex-col gap-4">
        <div>
          <p class="text-xs tracking-[0.3em] font-mono text-gray-400 mb-2">普攻</p>
          <div v-if="selectedNormal" class="px-3 py-2.5 rounded-xl border border-gray-200 bg-white">
            <p class="text-sm font-semibold text-gray-900">{{ selectedNormal.name }}</p>
            <p v-if="selectedNormal.note" class="text-xs text-gray-400 mt-0.5 italic">
              {{ selectedNormal.note }}
            </p>
          </div>
          <p v-else class="text-xs font-mono text-gray-300 px-1">— 未选</p>
        </div>

        <div>
          <p class="text-xs tracking-[0.3em] font-mono text-gray-400 mb-2">大招</p>
          <div
            v-if="selectedUltimate"
            class="px-3 py-2.5 rounded-xl border border-gray-200 bg-white"
          >
            <p class="text-sm font-semibold text-gray-900">{{ selectedUltimate.name }}</p>
            <p v-if="selectedUltimate.note" class="text-xs text-gray-400 mt-0.5 italic">
              {{ selectedUltimate.note }}
            </p>
          </div>
          <p v-else class="text-xs font-mono text-gray-300 px-1">— 未选</p>
        </div>

        <div>
          <div class="flex items-baseline gap-2 mb-2">
            <p class="text-xs tracking-[0.3em] font-mono text-gray-400">被动</p>
            <span class="text-xs font-mono text-gray-300">{{ selectedPassives.length }} / 3</span>
          </div>
          <div class="flex flex-col gap-1.5">
            <div
              v-for="skill in selectedPassives"
              :key="skill.id"
              class="px-3 py-2 rounded-xl border border-gray-200 bg-white"
            >
              <p class="text-sm font-semibold text-gray-900">{{ skill.name }}</p>
              <p v-if="skill.note" class="text-xs text-gray-400 mt-0.5 italic">{{ skill.note }}</p>
            </div>
            <p v-if="selectedPassives.length === 0" class="text-xs font-mono text-gray-300 px-1">
              — 未选
            </p>
          </div>
        </div>

        <div class="mt-auto flex flex-col gap-2">
          <button
            class="w-full px-4 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold transition-colors hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!selectedNormal || !selectedUltimate"
            @click="startBattle"
          >
            开始战斗
          </button>
          <button
            class="w-full px-4 py-2 rounded-2xl border border-gray-200 text-sm text-gray-500 hover:border-gray-400 transition-colors"
            @click="arenaPhase = 'enemy'"
          >
            上一步
          </button>
        </div>
      </div>

      <!-- 右栏：技能浏览器（普攻/大招/被动） -->
      <div class="flex-1 min-w-0 flex flex-col min-h-0">
        <SkillBrowser
          mode="pick"
          :columns="1"
          :model-value="selectedSkillIds"
          @update:model-value="handleSkillIdsUpdate"
        />
      </div>
    </div>

    <!-- ── STEP 3: 战斗 ──────────────────────────────────────────── -->
    <div v-else class="flex-1 flex flex-col min-h-0 relative -mx-8 -mb-8">
      <!-- 战斗控制栏 -->
      <div class="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 bg-white">
        <button
          class="text-xs font-mono px-3 py-1.5 rounded-lg border transition-all"
          :class="
            game.arenaAutoPlay
              ? 'border-gray-800 bg-gray-900 text-white'
              : 'border-gray-200 text-gray-500 hover:border-gray-400'
          "
          @click="toggleAutoPlay"
        >
          {{ game.arenaAutoPlay ? '自动中' : '自动' }}
        </button>
        <button
          v-if="!game.arenaAutoPlay"
          class="text-xs font-mono px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="!game.pendingAdvance || game.phase === 'result'"
          @click="game.confirmAdvance()"
        >
          下一步
        </button>
        <div class="flex-1" />
        <button
          class="text-xs font-mono px-3 py-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 transition-all disabled:opacity-30"
          :disabled="!game.canUndoTurn"
          @click="game.undoTurn()"
        >
          ↩ 撤回
        </button>
        <button
          class="text-xs font-mono px-3 py-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 transition-all disabled:opacity-30"
          :disabled="!game.canRedoTurn"
          @click="game.redoTurn()"
        >
          重做 ↪
        </button>
      </div>

      <!-- 结果遮罩 -->
      <div
        v-if="game.phase === 'result'"
        class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm"
      >
        <p
          class="text-3xl font-bold"
          :class="game.result?.kind === 'victory' ? 'text-emerald-600' : 'text-red-500'"
        >
          {{ game.result?.kind === 'victory' ? '胜利' : '败北' }}
        </p>
        <button
          class="px-8 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
          @click="reset"
        >
          重置
        </button>
      </div>

      <!-- 战斗主体 -->
      <GameBattle />
    </div>
  </DebugLayout>
</template>

<script setup lang="ts">
import { ENEMIES, PLAYER_START, SKILL_POOL } from '@/data'
import type { SkillData } from '@xwink/rpg'
import { Enemy } from '@/game/units/enemy'
import type { EnemyTag } from '@/game/units/enemy'
import { Player } from '@/game/units/player'
import type { FilterOption } from '@/ui/views/debug/FilterTags.vue'
import { useGameStore } from '@/store/game'
import GameBattle from '@/ui/views/game/GameBattle.vue'
import UnitStatsPanel from '@/ui/components/UnitStatsPanel.vue'
import SkillBrowser from '@/ui/components/SkillBrowser.vue'
import FilterTags from '@/ui/views/debug/FilterTags.vue'
import { computed, ref, watch } from 'vue'
import DebugLayout from './Layout.vue'

const game = useGameStore()

const STEPS = ['选对手', '选技能', '战斗']

const enemyUnits: Record<string, Enemy> = Object.fromEntries(
  Object.entries(ENEMIES).map(([id, data]) => [id, new Enemy(data)]),
)

// ── 敌人 tag 筛选 ─────────────────────────────────────────────────────────────

const ENEMY_TAG_OPTIONS: FilterOption<EnemyTag>[] = [
  { value: 'normal', label: '普通', activeClass: 'border-gray-400 text-gray-600 bg-gray-100' },
  { value: 'elite', label: '精英', activeClass: 'border-orange-300 text-orange-500 bg-orange-50' },
  { value: 'boss', label: 'BOSS', activeClass: 'border-red-300 text-red-500 bg-red-50' },
  { value: 'dummy', label: '假人', activeClass: 'border-purple-300 text-purple-500 bg-purple-50' },
]

const selectedEnemyTags = ref(new Set<EnemyTag>(ENEMY_TAG_OPTIONS.map((o) => o.value!)))

const filteredEnemies = computed(() =>
  Object.fromEntries(
    Object.entries(enemyUnits).filter(([, en]) =>
      en.tags.some((t) => selectedEnemyTags.value.has(t as EnemyTag)),
    ),
  ),
)

type ArenaPhase = 'enemy' | 'skills' | 'battle'
const arenaPhase = ref<ArenaPhase>('enemy')
const stepIndex = computed(() =>
  arenaPhase.value === 'enemy' ? 0 : arenaPhase.value === 'skills' ? 1 : 2,
)

const selectedEnemyId = ref<string>(Object.keys(ENEMIES)[0])

watch(filteredEnemies, (filtered) => {
  if (!(selectedEnemyId.value in filtered)) {
    const first = Object.keys(filtered)[0]
    if (first) selectedEnemyId.value = first
  }
})

// 技能选择：用 id set 统一管理，普攻/大招单选，被动多选最多 3 个
const selectedSkillIds = ref<Set<string>>(
  new Set(
    [
      PLAYER_START.skills.find((s) => s.role === 'normal')?.id ?? '',
      PLAYER_START.skills.find((s) => s.role === 'ultimate')?.id ?? '',
    ].filter(Boolean),
  ),
)

const selectedNormal = computed<SkillData | undefined>(() =>
  SKILL_POOL.filter((s) => (s.role ?? 'normal') === 'normal').find((s) =>
    selectedSkillIds.value.has(s.id),
  ),
)

const selectedUltimate = computed<SkillData | undefined>(() =>
  SKILL_POOL.filter((s) => s.role === 'ultimate').find((s) => selectedSkillIds.value.has(s.id)),
)

const selectedPassives = computed<SkillData[]>(() =>
  SKILL_POOL.filter((s) => s.role === 'passive' && selectedSkillIds.value.has(s.id)),
)

// SkillBrowser pick 模式的 update 处理：普攻/大招单选不可取消，被动最多 3 个可取消
function handleSkillIdsUpdate(next: Set<string>) {
  const byRole = (role: string) =>
    new Set(SKILL_POOL.filter((s) => (s.role ?? 'normal') === role).map((s) => s.id))
  const normalIds = byRole('normal')
  const ultIds = byRole('ultimate')
  const passiveIds = byRole('passive')

  const added = [...next].find((id) => !selectedSkillIds.value.has(id))
  const result = new Set(selectedSkillIds.value)

  if (added) {
    if (normalIds.has(added)) {
      normalIds.forEach((id) => result.delete(id))
      result.add(added)
    } else if (ultIds.has(added)) {
      ultIds.forEach((id) => result.delete(id))
      result.add(added)
    } else if (passiveIds.has(added)) {
      const currentCount = [...result].filter((id) => passiveIds.has(id)).length
      if (currentCount < 3) result.add(added)
    }
  } else {
    // 取消选中：普攻/大招不允许取消，只有被动可以取消
    const removed = [...selectedSkillIds.value].find((id) => !next.has(id))
    if (removed && passiveIds.has(removed)) result.delete(removed)
  }

  selectedSkillIds.value = result
}

function makeArenaPlayer(): Player {
  const normal =
    selectedNormal.value ?? SKILL_POOL.filter((s) => (s.role ?? 'normal') === 'normal')[0]
  const ult = selectedUltimate.value ?? SKILL_POOL.filter((s) => s.role === 'ultimate')[0]
  const passives = selectedPassives.value
  const skills = [normal, ult, ...passives].filter((s): s is SkillData => s != null)
  return new Player({
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
    skills,
  })
}

function startBattle() {
  const arenaPlayer = makeArenaPlayer()
  const arenaEnemy = new Enemy(ENEMIES[selectedEnemyId.value])
  game.arenaStartBattle(arenaPlayer, arenaEnemy)
  arenaPhase.value = 'battle'
}

function reset() {
  game.exitArena()
  arenaPhase.value = 'enemy'
}

function toggleAutoPlay() {
  game.arenaSetAutoPlay(!game.arenaAutoPlay)
}
</script>
