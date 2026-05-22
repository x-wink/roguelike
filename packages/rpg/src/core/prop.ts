// core/prop — 属性原语层。定义 Prop 封装、ModMode 四段模式、PropSnapshot 序列化结构。
// 无内部依赖，是整个引擎的最底层模块，所有其他模块均可安全 import。

import type { Engine } from '@xwink/engine'

export type PropData = number | { value: number; min?: number; max: number }

/** buff propMod 效果的叠加模式，对应四段公式各段 */
export type ModMode = 'baseFlat' | 'basePercent' | 'finalFlat' | 'finalPercent'

/**
 * sourceKey = `${buffId}:${effectIndex}`，唯一标识一个活跃来源，用于 add/remove。
 * effectId  = Effect 的 `id` 字段（可选），相同 effectId + mode 的条目之间取 |value| 最大者，
 *             实现"高级覆盖低级"；无 effectId 则正常叠加。
 */
type ModEntry = { mode: ModMode; value: number; effectId?: string }

export type PropSnapshot = {
  value: number
  min: number
  /** null 表示 Infinity（JSON 无法序列化 Infinity） */
  max: number | null
  formula?: DerivedFormula
  mods: Array<[string, { mode: ModMode; value: number; effectId?: string }]>
}

export class Prop {
  private _value: number
  min: number
  max: number
  /** 派生属性推导公式，有值时 Unit.getStat 用公式计算 base，忽略 _value。 */
  formula?: DerivedFormula

  /** 活跃 propMod 修正表，key = buffId:effectIndex，由 Buff.fire() 在 mount/unmount 时维护。 */
  private readonly _mods = new Map<string, ModEntry>()

  constructor(data: PropData) {
    if (typeof data === 'number') {
      this.min = 0
      this.max = data
      this._value = data
    } else {
      this.min = data.min ?? 0
      this.max = data.max
      this._value = Math.min(Math.max(data.value, data.min ?? 0), data.max)
    }
  }

  get value(): number {
    return this._value
  }

  set value(value: number) {
    this._value = Math.min(Math.max(value, this.min), this.max)
  }

  add(delta: number): void {
    this.value += delta
  }

  addMod(sourceKey: string, mode: ModMode, value: number, effectId?: string): void {
    this._mods.set(sourceKey, { mode, value, effectId })
  }

  removeMod(id: string): void {
    this._mods.delete(id)
  }

  get mods(): IterableIterator<ModEntry> {
    return this._mods.values()
  }

  snapshot(): PropSnapshot {
    return {
      value: this._value,
      min: this.min,
      max: isFinite(this.max) ? this.max : null,
      formula: this.formula ? { ...this.formula } : undefined,
      mods: [...this._mods.entries()].map(([k, v]) => [k, { ...v }]),
    }
  }

  restore(snap: PropSnapshot): void {
    this._value = snap.value
    this.min = snap.min
    this.max = snap.max === null ? Infinity : snap.max
    this.formula = snap.formula ? { ...snap.formula } : undefined
    this._mods.clear()
    for (const [k, v] of snap.mods) {
      this._mods.set(k, { ...v })
    }
  }
}

// ── DerivedFormula ────────────────────────────────────────────────────────────

/** 可序列化的推导公式：base = unit[stat].value * multiplier + offset */
export type DerivedFormula = {
  /** 引用的基础属性；'const' 表示纯常量（base = 0） */
  stat: 'str' | 'con' | 'agi' | 'int' | 'lck' | 'const'
  multiplier?: number // 默认 1
  offset?: number // 默认 0
}

// ── UnitProp 类型（单一事实来源，供 buff.ts / unit.ts 共用）─────────────────

export type StatProp = 'health' | 'energy' | 'shield'
export type BaseProp = 'str' | 'con' | 'agi' | 'int' | 'lck'
export type FightProp =
  | 'atk'
  | 'def'
  | 'spd'
  | 'crit'
  | 'critDmg'
  | 'dodge'
  | 'hit'
  | 'combo'
  | 'counter'
  | 'armorPen'
/** 战斗加成属性：最终增伤 / 最终减伤，挂载在 Unit 上，全局层存固有值，战斗层叠加 buff */
export type BonusProp = 'damageFinalPct' | 'damageReduction'
/** 所有挂载在 Unit 上的 Prop 字段名（rpg 内置） */
export type UnitProp = StatProp | BaseProp | FightProp | BonusProp
/**
 * buff / skill 可引用的属性范围。
 * 业务层通过 `declare module '@xwink/engine' { Engine.EntityProps }` 注入扩展属性后，
 * 该类型会自动并入扩展键，保持类型安全的同时不锁死 rpg 内置集合。
 */
export type BuffStat = keyof Engine.EntityProps
