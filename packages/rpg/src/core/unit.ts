// core/unit — RPG 单位层，继承 Entity。
//
// 属性体系：通过 declare module 将所有 RPG Prop 键注入 Engine.EntityProps，
// 使 unit.props.health 具备类型安全；同时暴露 getter（unit.health）保持
// 现有调用方无需改动。
//
// 子类字段必须用 declare 声明，不写初始化表达式。
// JS 类字段语义会在 super() 后执行默认初始化，覆盖 init() 已写入的值。

import { Entity } from '@xwink/engine'
import { fourTierCalc } from './calc'
import type { BuffData } from '../combat/types'

// ── IBuff / IBuffPool 接口（core 层只依赖接口，不依赖 Buff/BuffPool 实现）────

export interface IBuff {
  readonly id: string
  readonly name: string
  readonly isDebuff: boolean
  readonly anonymous: boolean
  readonly expired: boolean
  readonly data: BuffData
  readonly tags: ReadonlySet<string>
  duration: number
  readonly stack: { value: number }
}

export interface IBuffPool {
  readonly all: IBuff[]
  readonly visible: IBuff[]
  restore(list: IBuff[]): void
  clear(): void
}
import {
  Prop,
  type BonusProp,
  type BuffStat,
  type DerivedFormula,
  type PropSnapshot,
  type StatProp,
} from './prop'
import type { SkillData } from '../combat/skill'
import { SkillPool } from '../combat/skill-pool'

// ── Engine.EntityProps 扩充：声明所有 RPG Prop 键 ────────────────────────────

declare module '@xwink/engine' {
  namespace Engine {
    interface EntityProps {
      // 状态值（StatProp）
      health: Prop
      energy: Prop
      shield: Prop
      // 基础属性（BaseProp）
      str: Prop
      con: Prop
      agi: Prop
      int: Prop
      lck: Prop
      // 战斗派生属性（FightProp）
      atk: Prop
      def: Prop
      spd: Prop
      crit: Prop
      critDmg: Prop
      dodge: Prop
      hit: Prop
      combo: Prop
      counter: Prop
      armorPen: Prop
      // 战斗加成属性（BonusProp）
      damageFinalPct: Prop
      damageReduction: Prop
    }
  }
}

// ── 属性分组定义（单一事实来源）────────────────────────────────────────────────

/** 状态值：有上限，可直接 add/set，归零触发战败或其他效果 */
export const STATE_PROPS = {
  health: null, // 初始值由 UnitData 提供，null 仅作占位
  energy: null,
  shield: null,
} as const

/** 基础属性：决定战斗属性的推导基数 */
export const BASE_PROPS = {
  str: null,
  con: null,
  agi: null,
  int: null,
  lck: null,
} as const

/** 战斗派生属性：由基础属性推导，可附加永久加成 */
export const FIGHT_PROPS = {
  atk: { stat: 'str', multiplier: 2 },
  def: { stat: 'con', multiplier: 2 },
  spd: { stat: 'agi' },
  crit: { stat: 'lck', multiplier: 0.5 },
  critDmg: { stat: 'lck', multiplier: 1, offset: 150 },
  dodge: { stat: 'agi', multiplier: 0.3 },
  hit: { stat: 'const', offset: 100 },
  combo: { stat: 'agi', multiplier: 0.3 },
  counter: { stat: 'str', multiplier: 0.3 },
  armorPen: { stat: 'const', offset: 0 },
} satisfies Record<string, DerivedFormula>

export type BaseProp = keyof typeof BASE_PROPS
export type FightProp = keyof typeof FIGHT_PROPS
export type { StatProp }

/** 战斗加成属性（最终增伤 / 最终减伤），固有值存在 Prop.value，max=Infinity 允许正值 */
export const BONUS_PROPS = ['damageFinalPct', 'damageReduction'] as const
export type { BonusProp }

/** 所有挂载在 Unit 上的 Prop 字段名 */
export type UnitProp = StatProp | BaseProp | FightProp | BonusProp

/** 所有 UnitProp 键列表（运行时可迭代） */
export const ALL_UNIT_PROPS: UnitProp[] = [
  ...(Object.keys(STATE_PROPS) as StatProp[]),
  ...(Object.keys(BASE_PROPS) as BaseProp[]),
  ...(Object.keys(FIGHT_PROPS) as FightProp[]),
  ...BONUS_PROPS,
]

// ── 快照类型（供 Sandbox 使用）───────────────────────────────────────────────

export type UnitSnapshot = {
  id: string
  name: string
  /** 按 props 实际持有的键序列化；UnitProp 之外的业务键由子类扩展时一并入快照 */
  props: Record<string, PropSnapshot>
  buffs: Array<{ data: BuffData; duration: number; stack: number }>
  skills: SkillData[]
}
// UnitData 为全局只读数据；战斗时通过 Sandbox 构造独立实例，所有运行时变化不回写全局数据。
export type UnitData = {
  id: string
  name: string
  health: number // 初始值同时作为上限（Prop.max）
  energy: number
  str: number
  con: number
  agi: number
  int: number
  lck: number
  /** 初始护盾值（可选，默认 0） */
  shield?: number
  /** 技能列表，按 role 区分：normal/ultimate/passive */
  skills: SkillData[]
  /** 固有最终增伤系数（0.2 = +20%），叠加 buff 后参与伤害 Step 2 finalPercent */
  damageFinalPct?: number
  /** 固有最终减伤系数（0.1 = 10% 减伤），叠加 buff 后参与伤害 Step 5 */
  damageReduction?: number
  /** 业务层扩展字段：通过 declare module 扩充 EntityProps 后由子类型注入 */
  [extra: string]: unknown
}

// ── 辅助类型：运行时动态属性访问 ─────────────────────────────────────────────

type PropsRecord = Record<string, Prop | undefined>

export class Unit extends Entity {
  declare id: string
  declare name: string

  // ── getter 代理：外部调用方保持 unit.health 语法不变 ───────────────────────
  get health(): Prop {
    return this.props.health
  }
  get energy(): Prop {
    return this.props.energy
  }
  get shield(): Prop {
    return this.props.shield
  }
  get str(): Prop {
    return this.props.str
  }
  get con(): Prop {
    return this.props.con
  }
  get agi(): Prop {
    return this.props.agi
  }
  get int(): Prop {
    return this.props.int
  }
  get lck(): Prop {
    return this.props.lck
  }
  get atk(): Prop {
    return this.props.atk
  }
  get def(): Prop {
    return this.props.def
  }
  get spd(): Prop {
    return this.props.spd
  }
  get crit(): Prop {
    return this.props.crit
  }
  get critDmg(): Prop {
    return this.props.critDmg
  }
  get dodge(): Prop {
    return this.props.dodge
  }
  get hit(): Prop {
    return this.props.hit
  }
  get combo(): Prop {
    return this.props.combo
  }
  get counter(): Prop {
    return this.props.counter
  }
  get armorPen(): Prop {
    return this.props.armorPen
  }
  get damageFinalPct(): Prop {
    return this.props.damageFinalPct
  }
  get damageReduction(): Prop {
    return this.props.damageReduction
  }

  /** 技能池，收敛所有技能读取逻辑 */
  pool: SkillPool = new SkillPool([])

  /** buff 池，由 battle 层注入具体实现；core 层只持有接口 */
  buffs: IBuffPool = { all: [], visible: [], restore() {}, clear() {} }

  constructor(data: UnitData) {
    super()
    this.init(data)
  }

  init(data: UnitData): void {
    this.id = data.id
    this.name = data.name

    const p = this.props as unknown as Record<string, Prop>

    for (const k of Object.keys(STATE_PROPS) as StatProp[]) {
      if (k === 'shield') {
        p[k] = new Prop({ value: data.shield ?? 0, max: data.health })
      } else {
        p[k] = new Prop(data[k as keyof UnitData] as number)
      }
    }
    for (const k of Object.keys(BASE_PROPS) as BaseProp[]) {
      p[k] = new Prop({ value: data[k], max: Infinity })
    }
    for (const [k, formula] of Object.entries(FIGHT_PROPS)) {
      const prop = new Prop(0)
      prop.formula = formula
      p[k] = prop
    }
    for (const k of BONUS_PROPS) {
      const prop = new Prop(0)
      prop.max = Infinity
      const v = data[k as keyof UnitData]
      if (typeof v === 'number' && v > 0) prop.add(v)
      p[k] = prop
    }

    this.pool = new SkillPool(data.skills)
    this.buffs = { all: [], visible: [], restore() {}, clear() {} }
  }

  // ── 快照 / 恢复（供 Sandbox 调用，其他调用方无需关心）────────────────────────

  snapshot(): UnitSnapshot {
    const snap: Record<string, PropSnapshot> = {}
    const p = this.props as unknown as PropsRecord
    for (const k of Object.keys(p)) {
      const prop = p[k]
      if (prop instanceof Prop) snap[k] = prop.snapshot()
    }
    return {
      id: this.id,
      name: this.name,
      props: snap,
      buffs: this.buffs.all.map((b) => ({
        data: b.data,
        duration: b.duration,
        stack: b.stack.value,
      })),
      skills: this.pool.raw.map((s) => ({ ...s })),
    }
  }

  restore(snap: UnitSnapshot, buffs?: IBuff[]): void {
    this.id = snap.id
    this.name = snap.name
    const p = this.props as unknown as PropsRecord
    for (const k of Object.keys(snap.props)) {
      const propSnap = snap.props[k]
      if (!propSnap) continue
      const prop = p[k]
      if (prop instanceof Prop) prop.restore(propSnap)
    }
    if (buffs) this.buffs.restore(buffs)
    this.pool.replace(snap.skills)
  }

  // ── 属性计算 ───────────────────────────────────────────

  /**
   * 读取属性最终值。
   * 全局层（当前无遗物/图鉴加成）：derivedBase = formula 推导值 + prop.value（永久加成）。
   * 战斗层：globalValue 经四段公式叠加当前 BuffPool 中对应属性的修正后返回 finalValue。
   */
  getStat(stat: BuffStat): number {
    const p = this.props as unknown as PropsRecord
    const prop = p[stat as string]
    let globalValue: number

    if (prop?.formula) {
      const { stat: fs, multiplier = 1, offset = 0 } = prop.formula
      const src = fs === 'const' ? 0 : (p[fs]?.value ?? 0)
      globalValue = src * multiplier + offset + prop.value
    } else if (prop) {
      globalValue = prop.value
    } else {
      globalValue = 0
    }

    let baseFlat = 0,
      basePercent = 0,
      finalFlat = 0,
      finalPercent = 0

    if (prop) {
      // 带 effectId 的条目按 `effectId:mode` 分组，取 |value| 最大者（高级覆盖低级）；
      // 无 effectId 的条目直接累加（叠加语义）。
      const overrides = new Map<string, number>()
      for (const mod of prop.mods) {
        if (mod.effectId !== undefined) {
          const key = `${mod.effectId}:${mod.mode}`
          const prev = overrides.get(key)
          if (prev === undefined || Math.abs(mod.value) > Math.abs(prev)) {
            overrides.set(key, mod.value)
          }
        } else {
          switch (mod.mode) {
            case 'baseFlat':
              baseFlat += mod.value
              break
            case 'basePercent':
              basePercent += mod.value
              break
            case 'finalFlat':
              finalFlat += mod.value
              break
            case 'finalPercent':
              finalPercent += mod.value
              break
          }
        }
      }
      for (const [key, value] of overrides) {
        const mode = key.slice(key.lastIndexOf(':') + 1)
        switch (mode) {
          case 'baseFlat':
            baseFlat += value
            break
          case 'basePercent':
            basePercent += value
            break
          case 'finalFlat':
            finalFlat += value
            break
          case 'finalPercent':
            finalPercent += value
            break
        }
      }
    }

    return fourTierCalc({ base: globalValue, baseFlat, basePercent, finalFlat, finalPercent })
  }
}
