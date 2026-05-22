<template>
  <DebugLayout title="Effect 一览">
    <div class="flex-1 overflow-y-auto">
      <div class="grid grid-cols-2 gap-10 items-start">
        <!-- STAT effects (props) -->
        <section>
          <p class="text-xs tracking-[0.3em] font-mono uppercase text-gray-400 mb-5">
            Stat Effects
          </p>
          <div class="flex flex-col gap-5">
            <div v-for="group in propsGroups" :key="group.stat">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[0.6rem] font-mono font-semibold tracking-widest text-gray-500">
                  {{ STAT_LABEL[group.stat] }}
                </span>
                <div class="flex-1 h-px bg-gray-100" />
                <span class="text-[0.5rem] font-mono text-gray-300">{{ group.items.length }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <div
                  v-for="(row, i) in group.items"
                  :key="i"
                  class="flex items-center gap-2 bg-white rounded-xl border px-3 py-2"
                  :class="row.buff.tags?.includes('debuff') ? 'border-red-100' : 'border-gray-100'"
                >
                  <span
                    class="text-[0.5rem] font-mono px-1.5 py-0.5 rounded shrink-0"
                    :class="modeChipClass(row.effect.behavior.mode)"
                    >{{ row.effect.behavior.mode }}</span
                  >
                  <span
                    class="text-[0.7rem] font-mono font-bold w-10 shrink-0 tabular-nums"
                    :class="valueClass(row.effect, row.buff)"
                    >{{ formatValue(row.effect) }}</span
                  >
                  <span class="text-xs text-gray-600 flex-1 truncate">{{
                    row.buff.name || row.buff.id
                  }}</span>
                  <span class="text-[0.55rem] font-mono text-gray-300 shrink-0">
                    {{ row.buff.duration > 0 ? `${row.buff.duration}T` : 'inst' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- TICK effects -->
        <section>
          <p class="text-xs tracking-[0.3em] font-mono uppercase text-gray-400 mb-5">
            Tick Effects
          </p>
          <div class="flex flex-col gap-5">
            <div v-for="group in tickGroups" :key="group.when">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[0.6rem] font-mono font-semibold tracking-widest text-gray-500">
                  {{ WHEN_LABEL[group.when] }}
                </span>
                <div class="flex-1 h-px bg-gray-100" />
                <span class="text-[0.5rem] font-mono text-gray-300">{{ group.items.length }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <div
                  v-for="(row, i) in group.items"
                  :key="i"
                  class="flex items-center gap-2 bg-white rounded-xl border px-3 py-2"
                  :class="row.buff.tags?.includes('debuff') ? 'border-red-100' : 'border-gray-100'"
                >
                  <span
                    class="text-[0.5rem] font-mono px-1.5 py-0.5 rounded shrink-0"
                    :class="tickChipClass(row.buff)"
                    >{{ tickChipLabel(row.buff) }}</span
                  >
                  <span
                    class="text-[0.5rem] font-mono px-1.5 py-0.5 rounded shrink-0"
                    :class="behaviorClass(row.effect)"
                    >{{ behaviorLabel(row.effect) }}</span
                  >
                  <span class="text-xs text-gray-600 flex-1">{{
                    row.buff.name || row.buff.id
                  }}</span>
                  <span class="text-[0.55rem] font-mono text-gray-300 shrink-0">
                    {{ row.buff.duration > 0 ? `${row.buff.duration}T` : '—' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </DebugLayout>
</template>

<script setup lang="ts">
import { BUFF_PRESETS } from '@/data'
import type { BuffData, EffectData } from '@xwink/rpg'

const STAT_SHORT: Record<string, string> = {
  health: 'HP',
  energy: 'NRG',
  san: 'SAN',
}
import DebugLayout from './Layout.vue'

type PropModRow = {
  buff: BuffData
  effect: EffectData & {
    behavior: { kind: 'propMod'; stat: string; mode: string; value: number }
  }
}
type TickRow = { buff: BuffData; effect: EffectData }

const ALL_BUFFS: BuffData[] = BUFF_PRESETS

const propsRows = ALL_BUFFS.flatMap((buf) =>
  buf.effects
    .filter((e): e is PropModRow['effect'] => e.behavior.kind === 'propMod')
    .map((e) => ({ buff: buf, effect: e })),
) as PropModRow[]

const tickRows: TickRow[] = ALL_BUFFS.flatMap((buf) =>
  buf.effects.filter((e) => e.behavior.kind !== 'propMod').map((e) => ({ buff: buf, effect: e })),
)

const STAT_ORDER = [
  'health',
  'energy',
  'san',
  'str',
  'con',
  'agi',
  'int',
  'lck',
  'atk',
  'def',
  'spd',
  'crit',
  'critDmg',
  'dodge',
  'hit',
  'combo',
  'counter',
] as const
const STAT_LABEL: Record<string, string> = {
  health: 'HP',
  energy: 'NRG',
  san: 'SAN',
  str: 'STR',
  con: 'CON',
  agi: 'AGI',
  int: 'INT',
  lck: 'LCK',
  atk: 'ATK',
  def: 'DEF',
  spd: 'SPD',
  crit: 'CRIT',
  critDmg: 'CRIT DMG',
  dodge: 'DODGE',
  hit: 'HIT',
  combo: 'COMBO',
  counter: 'CTR',
}

const WHEN_ORDER = ['mount', 'turnStart', 'turnEnd', 'unmount'] as const
const WHEN_LABEL: Record<string, string> = {
  mount: 'MOUNT',
  turnStart: 'TURN START',
  turnEnd: 'TURN END',
  unmount: 'UNMOUNT',
}

const MODE_ORDER = ['baseFlat', 'basePercent', 'finalFlat', 'finalPercent'] as const

const propsGroups = STAT_ORDER.map((stat) => ({
  stat,
  items: propsRows
    .filter((r) => r.effect.behavior.stat === stat)
    .sort(
      (a, b) =>
        MODE_ORDER.indexOf(a.effect.behavior.mode as (typeof MODE_ORDER)[number]) -
        MODE_ORDER.indexOf(b.effect.behavior.mode as (typeof MODE_ORDER)[number]),
    ),
})).filter((g) => g.items.length > 0)

const tickGroups = WHEN_ORDER.map((when) => ({
  when,
  items: tickRows.filter((r) => r.effect.when === when),
})).filter((g) => g.items.length > 0)

function modeChipClass(mode: string): string {
  if (mode === 'baseFlat' || mode === 'finalFlat') return 'bg-sky-50 text-sky-400'
  return 'bg-gray-100 text-gray-400'
}

function formatValue(e: PropModRow['effect']): string {
  const b = e.behavior
  if (b.mode === 'basePercent' || b.mode === 'finalPercent') {
    const pct = Math.round(b.value * 100)
    return pct >= 0 ? `+${pct}%` : `${pct}%`
  }
  return b.value >= 0 ? `+${b.value}` : `${b.value}`
}

function valueClass(e: PropModRow['effect'], buf: BuffData): string {
  const b = e.behavior
  if (b.mode === 'basePercent' || b.mode === 'finalPercent')
    return b.value >= 0 && !buf.tags?.includes('debuff') ? 'text-sky-500' : 'text-red-400'
  return b.value >= 0 ? 'text-sky-500' : 'text-red-400'
}

function tickChipClass(buf: BuffData): string {
  if (buf.tags?.includes('debuff')) return 'bg-red-50 text-red-400'
  if (buf.tags?.includes('anonymous')) return 'bg-amber-50 text-amber-400'
  return 'bg-sky-50 text-sky-400'
}

function tickChipLabel(buf: BuffData): string {
  if (buf.tags?.includes('debuff')) return 'DEB'
  if (buf.tags?.includes('anonymous')) return 'inst'
  return 'BUF'
}

function behaviorLabel(e: EffectData): string {
  const b = e.behavior
  if (b.kind === 'stat') {
    const stat = STAT_SHORT[b.prop] ?? b.prop.toUpperCase()
    return b.amount > 0 ? `${stat} +${b.amount}` : `${stat} ${b.amount}`
  }
  return 'LOCK'
}

function behaviorClass(e: EffectData): string {
  const b = e.behavior
  if (b.kind === 'control') return 'bg-orange-50 text-orange-400'
  if (b.kind === 'stat') return b.amount > 0 ? 'bg-sky-50 text-sky-400' : 'bg-red-50 text-red-400'
  return 'bg-gray-100 text-gray-400'
}
</script>
