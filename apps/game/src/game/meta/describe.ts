// game/meta/describe — 事件效果的描述 token 与渲染函数。
// 与 rpg/meta/describe 风格一致：tokenize → render，渲染层不直接拼字符串。

import type { TipLevel } from '@xwink/rpg'
import type { EventEffect } from './types'

export type EventEffectStat =
  | 'health'
  | 'energy'
  | 'san'
  | 'shield'
  | 'maxHp'
  | 'maxEnergy'
  | 'gold'

export type EventEffectToken = {
  kind: 'eventEffect'
  stat: EventEffectStat
  delta: number
}

const EVENT_STAT_LABEL: Record<EventEffectStat, string> = {
  health: 'HP',
  energy: '气力',
  san: '理智',
  shield: '护盾',
  maxHp: '最大 HP',
  maxEnergy: '最大气力',
  gold: '金币',
}

function isMasked(level: TipLevel): boolean {
  return level !== 'debug' && level !== 'trace'
}

function eventEffectText(stat: EventEffectStat, delta: number, level: TipLevel): string {
  const label = EVENT_STAT_LABEL[stat]
  if (!isFinite(delta)) return `${label} 满值恢复`
  const sign = delta >= 0 ? '+' : '−'
  const abs = Math.abs(delta)
  return isMasked(level) ? `${label} ${sign}${abs}` : `${label} ${sign}${abs}（stat: ${stat}）`
}

export function tokenizeEventEffect(e: EventEffect): EventEffectToken {
  switch (e.kind) {
    case 'healHp':
      return { kind: 'eventEffect', stat: 'health', delta: e.amount }
    case 'loseHp':
      return { kind: 'eventEffect', stat: 'health', delta: -e.amount }
    case 'healSan':
      return { kind: 'eventEffect', stat: 'san', delta: e.amount }
    case 'loseSan':
      return { kind: 'eventEffect', stat: 'san', delta: -e.amount }
    case 'maxHpUp':
      return { kind: 'eventEffect', stat: 'maxHp', delta: e.amount }
    case 'maxEnergyUp':
      return { kind: 'eventEffect', stat: 'maxEnergy', delta: e.amount }
    case 'healFull':
      return { kind: 'eventEffect', stat: 'health', delta: Infinity }
    case 'gainGold':
      return { kind: 'eventEffect', stat: 'gold', delta: e.amount }
  }
}

export function renderEventEffectToken(t: EventEffectToken, level: TipLevel = 'info'): string {
  return eventEffectText(t.stat, t.delta, level)
}

export function describeEventEffect(e: EventEffect): string {
  return renderEventEffectToken(tokenizeEventEffect(e))
}
