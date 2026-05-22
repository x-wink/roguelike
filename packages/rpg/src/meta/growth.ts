// meta/growth — 成长系统。Growth 管理等级/经验/属性点，gainExp 自动升级并发放属性点。
// 无内部依赖，不持有 Unit 引用，由 Player 组合使用。

export const GROWTH_INITIAL_POINTS = 10
export const GROWTH_POINTS_PER_LEVEL = 5
const EXP_BASE = 100
const EXP_RATIO = 1.5

/** 升至下一级所需经验值（指数级，1.5 倍增长） */
export function expThreshold(level: number): number {
  return Math.floor(EXP_BASE * EXP_RATIO ** (level - 1))
}

export type GrowthData = {
  level?: number
  exp?: number
  /** 未分配属性点；缺省时按等级计算初始值 */
  unspentPoints?: number
}

export class Growth {
  level: number
  exp: number
  unspentPoints: number

  constructor(data?: GrowthData) {
    this.level = data?.level ?? 1
    this.exp = data?.exp ?? 0
    this.unspentPoints =
      data?.unspentPoints ?? GROWTH_INITIAL_POINTS + (this.level - 1) * GROWTH_POINTS_PER_LEVEL
  }

  get expToNext(): number {
    return expThreshold(this.level)
  }

  get totalPoints(): number {
    return GROWTH_INITIAL_POINTS + (this.level - 1) * GROWTH_POINTS_PER_LEVEL
  }

  gainExp(amount: number): number {
    this.exp += amount
    let levels = 0
    while (this.exp >= this.expToNext) {
      this.exp -= this.expToNext
      this.level++
      this.unspentPoints += GROWTH_POINTS_PER_LEVEL
      levels++
    }
    return levels
  }

  spend(amount: number): boolean {
    if (amount <= 0 || amount > this.unspentPoints) return false
    this.unspentPoints -= amount
    return true
  }
}
