// combat/types — 跨层共享的纯数据类型。零逻辑，零运行时依赖，可安全被任意层 import。

import type { TickType } from '../core/tick'
import type { BuffStat, ModMode } from '../core/prop'
import type { Unit } from '../core/unit'
import type { BattleLogEntry } from '../meta/types'

// ── BattleContext ─────────────────────────────────────────────────────────────

export type BattleContext = {
  owner: Unit
  opponent: Unit
  turn: number
  /** 由 battle 层在构造 ctx 时注入；control behavior 通过此字段写入禁止行动状态 */
  setCanAct?: (value: boolean) => void
}

// ── EffectBehavior ────────────────────────────────────────────────────────────

/** 纯数据行为描述，无函数引用，可 JSON 序列化 */
export type EffectBehavior =
  | { kind: 'stat'; prop: BuffStat; amount: number }
  | { kind: 'control' }
  | { kind: 'execute' }
  | { kind: 'propMod'; stat: BuffStat; mode: ModMode; value: number }
  | { kind: 'cost'; stat: BuffStat; value: number; mode?: 'flat' | 'pct' }
  | { kind: 'heal'; stat: BuffStat; value: number }
  | { kind: 'buff'; data: BuffData }

// ── EffectCondition ───────────────────────────────────────────────────────────

export type EffectCondition =
  | { kind: 'targetHasDebuff'; debuffId: string }
  | { kind: 'ownerHpPct'; op: '<=' | '>='; value: number }
  | { kind: 'targetHpPct'; op: '<=' | '>='; value: number }
  /** 通用属性百分比条件：value 为占 max 的比例（0–1），适用于 owner 任一 StatProp 或扩展属性 */
  | { kind: 'ownerStatPct'; stat: BuffStat; op: '<=' | '>='; value: number }

// ── EffectData ────────────────────────────────────────────────────────────────

export type EffectData = {
  id?: string
  name?: string
  when: TickType
  target?: 'self' | 'enemy'
  behavior: EffectBehavior
  condition?: EffectCondition[]
}

// ── BuffData ──────────────────────────────────────────────────────────────────

/** 语义标识，不参与实际逻辑运算，仅用于 UI 展示与描述系统 */
export type BuffTag = 'buff' | 'debuff' | 'anonymous' | 'control' | 'dot'

// ── UseSkillResult / TurnResult ───────────────────────────────────────────────

export type UseSkillResult = {
  damage: number
  isCrit: boolean
  isDodge: boolean
  isCombo: boolean
  counterDamage: number
  log: BattleLogEntry
}

export type TurnResult = {
  skipped: boolean
  normalResult?: UseSkillResult
  ultimateResult?: UseSkillResult
  isUltFallback: boolean
  ultScale: number
}

export type BuffData = {
  id: string
  name: string
  duration: number
  tags?: BuffTag[]
  stack?: { initial?: number; max?: number }
  refreshOnStack?: boolean
  force?: boolean
  effects: EffectData[]
}
