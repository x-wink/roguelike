// core/calc — 纯计算层。fourTierCalc 四段公式与 calcDamageEvent 六步伤害，均为无副作用纯函数。
// 无内部依赖，不得引入任何状态或副作用。

// ── FourTierCalc ─────────────────────────────────────────────────────────────
// 四段公式：((base + baseFlat) × (1 + basePercent) + finalFlat) × (1 + finalPercent)
// 属性层（getStat）与伤害层（Step 2）共用同一套公式。

export type FourTierInput = {
  base: number
  baseFlat?: number
  basePercent?: number
  finalFlat?: number
  finalPercent?: number
}

export function fourTierCalc({
  base,
  baseFlat = 0,
  basePercent = 0,
  finalFlat = 0,
  finalPercent = 0,
}: FourTierInput): number {
  return ((base + baseFlat) * (1 + basePercent) + finalFlat) * (1 + finalPercent)
}

// ── DamageCalc ────────────────────────────────────────────────────────────────
// 六步伤害流程，每段独立事件各自完整执行，最终取整。
// 调用方负责收集 buff 数值并组装 DamageEventInput。

export type DamageEventInput = {
  /** Step 1 已算好的 skillBase */
  skillBase: number
  /** hp_pct / fixed 公式跳过 baseFlat / finalFlat 段 */
  skipFlat: boolean
  /** Step 2：来自攻击方 BuffPool 的四段增伤（含业务层匿名 buff 写入的 damageFinalPct） */
  baseFlat: number
  basePercent: number
  finalFlat: number
  finalPercent: number
  /** Step 3：暴击乘数，未暴击时传 1 */
  critMultiplier: number
  /** Step 4：防御方减伤比例（0–1），含业务层 buff 写入的 damageReduction 修正 */
  damageReduction: number
  /** Step 4：攻击方破甲比例（0–1），有效减伤 = damageReduction × (1 - armorPen) */
  armorPen: number
  /** Step 5：防御方当前护盾剩余值 */
  shield: number
}

export type DamageEventResult = {
  hpDamage: number
  shieldAbsorb: number
}

export function calcDamageEvent(input: DamageEventInput): DamageEventResult {
  // Step 2: 四段增伤
  const bonusDmg = fourTierCalc({
    base: input.skillBase,
    baseFlat: input.skipFlat ? 0 : input.baseFlat,
    basePercent: input.basePercent,
    finalFlat: input.skipFlat ? 0 : input.finalFlat,
    finalPercent: input.finalPercent,
  })

  // Step 3: 暴击
  const critResult = bonusDmg * input.critMultiplier

  // Step 4: 目标减伤（破甲削减有效减伤；业务层效果已通过 propMod 计入 damageFinalPct / damageReduction）
  const effectiveReduction = input.damageReduction * (1 - input.armorPen)
  const received = critResult * (1 - effectiveReduction)

  // Step 5: 护盾吸收 + 取整
  const shieldAbsorb = Math.min(input.shield, received)
  const hpDamage = Math.floor(received - shieldAbsorb)

  return { hpDamage, shieldAbsorb }
}
