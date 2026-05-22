<template>
  <div class="flex flex-col gap-4">
    <!-- 状态值 -->
    <section>
      <p class="text-xs tracking-[0.3em] font-mono text-gray-400 mb-2">状态值</p>
      <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div class="grid grid-cols-2">
          <div
            v-for="(row, i) in stateRows"
            :key="row.key"
            class="flex items-center gap-2 px-4 py-2.5"
            :class="[
              i % 2 === 0 ? 'border-r border-gray-100' : '',
              i < stateRows.length - 2 ? 'border-b border-gray-100' : '',
              i === stateRows.length - 1 && stateRows.length % 2 !== 0
                ? 'col-span-2 border-r-0'
                : '',
            ]"
          >
            <span class="text-[0.65rem] font-mono text-gray-400 w-10 shrink-0">{{
              row.label
            }}</span>
            <div class="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden min-w-0">
              <div
                class="h-full rounded-full transition-all"
                :class="row.barColor"
                :style="{ width: `${row.pct}%` }"
              />
            </div>
            <span class="text-xs font-mono text-gray-700 shrink-0 tabular-nums">
              {{ row.value }}<span class="text-gray-300">/{{ row.max }}</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 基础属性 -->
    <section>
      <p class="text-xs tracking-[0.3em] font-mono text-gray-400 mb-2">基础属性</p>
      <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div class="grid grid-cols-5">
          <div
            v-for="(row, i) in baseRows"
            :key="row.key"
            class="flex flex-col items-center gap-1 py-3 px-2"
            :class="i < baseRows.length - 1 ? 'border-r border-gray-100' : ''"
          >
            <span class="text-[0.6rem] font-mono text-gray-400">{{
              PROP_TOKEN[row.key]?.label ?? row.key
            }}</span>
            <span class="text-sm font-mono font-medium text-gray-800 tabular-nums">{{
              row.value
            }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 战斗属性 -->
    <section>
      <p class="text-xs tracking-[0.3em] font-mono text-gray-400 mb-2">战斗属性</p>
      <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div class="grid grid-cols-3">
          <div
            v-for="(row, i) in fightRows"
            :key="row.key"
            class="flex items-center justify-between gap-2 px-4 py-2"
            :class="[
              i % 3 !== 2 ? 'border-r border-gray-100' : '',
              i < fightRows.length - 3 ? 'border-b border-gray-100' : '',
            ]"
          >
            <span class="text-[0.65rem] font-mono text-gray-400 shrink-0">{{
              PROP_TOKEN[row.key]?.label ?? row.key
            }}</span>
            <span class="text-xs font-mono text-gray-800 tabular-nums">
              {{ row.isPercent ? row.value.toFixed(1) + '%' : row.value.toFixed(0) }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 加成属性 -->
    <section>
      <p class="text-xs tracking-[0.3em] font-mono text-gray-400 mb-2">加成属性</p>
      <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div class="grid grid-cols-2">
          <div
            v-for="(row, i) in bonusRows"
            :key="row.key"
            class="flex items-center justify-between gap-2 px-4 py-2.5"
            :class="i % 2 === 0 ? 'border-r border-gray-100' : ''"
          >
            <span class="text-[0.65rem] font-mono text-gray-400 shrink-0">{{
              PROP_TOKEN[row.key]?.label ?? row.key
            }}</span>
            <span class="text-xs font-mono text-gray-800 tabular-nums"
              >{{ (row.value * 100).toFixed(1) }}%</span
            >
          </div>
        </div>
      </div>
    </section>

    <!-- 技能池 -->
    <section v-if="skills.length">
      <p class="text-xs tracking-[0.3em] font-mono text-gray-400 mb-2">技能</p>
      <div class="flex flex-col gap-2">
        <SkillCard v-for="skill in skills" :key="skill.id" :skill="skill" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  BASE_PROPS,
  BONUS_PROPS,
  FIGHT_PROPS,
  PROP_TOKEN,
  STATE_PROPS,
  type BaseProp,
  type BonusProp,
  type FightProp,
  type Prop,
  type StatProp,
  type Unit,
} from '@xwink/rpg'
import { computed } from 'vue'
import SkillCard from '@/ui/views/debug/SkillCard.vue'

const props = defineProps<{ unit: Unit }>()

const skills = computed(() => props.unit.pool.raw)
/** 状态值条颜色：rpg 内置三类 + 业务扩展 san */
const STATE_BAR_COLOR: Record<string, string> = {
  health: 'bg-red-400',
  energy: 'bg-amber-400',
  shield: 'bg-blue-300',
  san: 'bg-sky-400',
}

/** 默认 rpg 状态属性（按声明顺序），业务扩展属性追加在尾部 */
const stateRows = computed(() => {
  const builtin = Object.keys(STATE_PROPS) as StatProp[]
  const propsRecord = props.unit.props as unknown as Record<string, Prop | undefined>
  const extras = Object.keys(propsRecord).filter(
    (k) =>
      !(builtin as readonly string[]).includes(k) &&
      !(Object.keys(BASE_PROPS) as readonly string[]).includes(k) &&
      !(Object.keys(FIGHT_PROPS) as readonly string[]).includes(k) &&
      !(BONUS_PROPS as readonly string[]).includes(k),
  )
  const keys = [...builtin, ...extras]
  return keys
    .map((key) => {
      const prop = propsRecord[key]
      if (!prop) return null
      const max = isFinite(prop.max) ? prop.max : 0
      return {
        key,
        label: PROP_TOKEN[key as StatProp]?.label ?? key,
        value: prop.value,
        max,
        pct: max > 0 ? Math.min((prop.value / max) * 100, 100) : 0,
        barColor: STATE_BAR_COLOR[key] ?? 'bg-gray-300',
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
})

const baseRows = computed(() =>
  (Object.keys(BASE_PROPS) as BaseProp[]).map((key) => ({ key, value: props.unit[key].value })),
)

const PERCENT_PROPS = new Set<FightProp>(['crit', 'critDmg', 'dodge', 'hit', 'combo', 'counter'])

const fightRows = computed(() =>
  (Object.keys(FIGHT_PROPS) as FightProp[]).map((key) => ({
    key,
    value: props.unit.getStat(key),
    isPercent: PERCENT_PROPS.has(key),
  })),
)

const bonusRows = computed(() =>
  (BONUS_PROPS as readonly BonusProp[]).map((key) => ({ key, value: props.unit[key].value })),
)
</script>
