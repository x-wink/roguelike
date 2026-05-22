// game/units/enemy — 敌人单位类，扩展引擎 Unit 基类，携带 SAN 压力等业务字段。

import { Prop, Unit, type UnitData } from '@xwink/rpg'

export type EnemyTag =
  | 'normal'
  | 'elite'
  | 'boss'
  | 'dummy'
  | 'balanced'
  | 'aggressive'
  | 'defensive'
  | 'gambler'

export type EnemyData = UnitData & {
  /** 业务字段：理智值，归零时战败 */
  san: number
  isElite?: boolean
  isBoss?: boolean
  /** 每回合对玩家施加的 SAN 压力（叠加到固定衰减上） */
  sanPressure?: number
  tags?: EnemyTag[]
  /** 击败后基础金币掉落 */
  goldDrop?: number
  /** 本节点附加变异词条的概率（0–1） */
  mutationChance?: number
}

export class Enemy extends Unit {
  declare isElite: boolean | undefined
  declare isBoss: boolean | undefined
  declare sanPressure: number
  declare tags: EnemyTag[]
  declare goldDrop: number
  declare mutationChance: number

  constructor(data: EnemyData) {
    super(data)
  }

  override init(data: UnitData): void {
    super.init(data)
    const d = data as EnemyData
    ;(this.props as unknown as Record<string, Prop>).san = new Prop(d.san ?? 0)
    this.isElite = d.isElite
    this.isBoss = d.isBoss
    this.sanPressure = d.sanPressure ?? 0
    this.tags = d.tags ?? []
    this.goldDrop = d.goldDrop ?? 0
    this.mutationChance = d.mutationChance ?? 0
  }
}
