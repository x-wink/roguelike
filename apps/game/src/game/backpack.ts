// game/backpack — 背包：独立资产表，与 Player 关联，局内持有。
// 持有：通用货币（金币）+ 遗物（局内，死亡重置）。
// 装备等全局持有资产在 Phase 2 引入。

import type { RelicData } from '@/game/meta'

export type BackpackSnapshot = {
  gold: number
  rareCurrency: number
  relics: RelicData[]
}

export class Backpack {
  gold = 0
  rareCurrency = 0
  relics: RelicData[] = []

  addGold(amount: number): void {
    this.gold = Math.max(0, this.gold + amount)
  }

  spendGold(amount: number): boolean {
    if (this.gold < amount) return false
    this.gold -= amount
    return true
  }

  addRareCurrency(amount: number): void {
    this.rareCurrency = Math.max(0, this.rareCurrency + amount)
  }

  spendRareCurrency(amount: number): boolean {
    if (this.rareCurrency < amount) return false
    this.rareCurrency -= amount
    return true
  }

  addRelic(relic: RelicData): void {
    this.relics.push({ ...relic, effects: [...relic.effects] })
  }

  /** 所有遗物提供的固定金币加成之和（每场战斗胜利时叠加） */
  goldBonusFromRelics(): number {
    return this.relics.reduce((sum, r) => {
      for (const e of r.effects) {
        if (e.kind === 'goldBonus') sum += e.amount
      }
      return sum
    }, 0)
  }

  serialize(): BackpackSnapshot {
    return {
      gold: this.gold,
      rareCurrency: this.rareCurrency,
      relics: this.relics.map((r) => ({ ...r, effects: [...r.effects] })),
    }
  }

  static from(snap: BackpackSnapshot): Backpack {
    const b = new Backpack()
    b.gold = snap.gold
    b.rareCurrency = snap.rareCurrency ?? 0
    b.relics = snap.relics.map((r) => ({ ...r, effects: [...r.effects] }))
    return b
  }
}
