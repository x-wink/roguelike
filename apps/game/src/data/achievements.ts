// achievements — 纯类型定义与条件求值函数。
// AchievementDef 是可序列化的纯数据（condition 是结构体，不是闭包）。
// 具体定义在 achievements.json，由 loader 校验后以 ACHIEVEMENTS 导出。

export type AchievementStats = {
  totalBattleWins: number
  totalRuns: number
  totalRelicsCollected: number
  totalSealedRelics: number
  totalUpgrades: number
  totalLotteryUnlocks: number
  clearedZones: string[]
}

/** 可序列化的成就条件，类比 BuffBehavior */
export type AchievementCondition =
  | { kind: 'statGte'; stat: keyof Omit<AchievementStats, 'clearedZones'>; value: number }
  | { kind: 'zoneCleared'; zoneId: string }

export type AchievementDef = {
  id: string
  name: string
  description: string
  rareCurrency: number
  title?: string
  condition: AchievementCondition
}

/** 纯函数——条件求值，类比 executor */
export function checkCondition(cond: AchievementCondition, stats: AchievementStats): boolean {
  switch (cond.kind) {
    case 'statGte':
      return stats[cond.stat] >= cond.value
    case 'zoneCleared':
      return stats.clearedZones.includes(cond.zoneId)
  }
}
