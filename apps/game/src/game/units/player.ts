// game/units/player — 玩家单位，组合 Growth 成长系统，提供属性点分配接口。

import { Prop } from '@xwink/rpg'
import { BASE_PROPS, Growth, Unit, type BaseProp, type GrowthData, type UnitData } from '@xwink/rpg'
import { Backpack, type BackpackSnapshot } from '@/game/backpack'

export type PlayerData = UnitData & {
  /** 业务字段：理智值，归零时战败 */
  san: number
  growth?: GrowthData
  /** 已分配属性点记录，用于支持撤回调整 */
  allocation?: Partial<Record<BaseProp, number>>
  backpack?: BackpackSnapshot
}

export class Player extends Unit {
  growth: Growth
  /** 各基础属性已分配的点数 */
  allocation: Record<BaseProp, number>
  backpack: Backpack

  constructor(data: PlayerData) {
    super(data)
    this.growth = new Growth(data.growth)
    const base = {} as Record<BaseProp, number>
    for (const k of Object.keys(BASE_PROPS) as BaseProp[]) {
      base[k] = data.allocation?.[k] ?? 0
    }
    this.allocation = base
    this.backpack = data.backpack ? Backpack.from(data.backpack) : new Backpack()
  }

  /** 在 rpg 通用 init 之上追加业务属性 san；缺省时默认 0，由 unit.restore 从快照写回 */
  override init(data: UnitData): void {
    super.init(data)
    const san = (data as PlayerData).san ?? 0
    ;(this.props as unknown as Record<string, Prop>).san = new Prop(san)
  }

  allocate(stat: BaseProp, amount = 1): boolean {
    const prop = this[stat] as Prop | undefined
    if (!prop) return false
    if (!this.growth.spend(amount)) return false
    prop.add(amount)
    this.allocation[stat] += amount
    return true
  }

  deallocate(stat: BaseProp, amount = 1): boolean {
    const prop = this[stat] as Prop | undefined
    if (!prop) return false
    if (amount <= 0 || amount > this.allocation[stat]) return false
    prop.add(-amount)
    this.allocation[stat] -= amount
    this.growth.unspentPoints += amount
    return true
  }

  resetStat(stat: BaseProp): boolean {
    return this.deallocate(stat, this.allocation[stat])
  }

  resetAll(): void {
    for (const k of Object.keys(BASE_PROPS) as BaseProp[]) {
      this.resetStat(k)
    }
  }
}
