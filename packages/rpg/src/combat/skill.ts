// combat/skill — 技能数据与升级系统。SkillData 是纯数据，resolveSkill 应用升级后返回最终快照。
// canUse/skillCost 是合法性检查入口，不执行任何状态变更。

import type { EffectData } from './effect'
import type { Prop, BuffStat } from '../core/prop'
import type { Unit } from '../core/unit'

// ── 技能系统 ─────────────────────────────────────────────────────────────────
// 元进度层解锁技能 → 对局前从已解锁中选 4 个入局内池 → 强化节点按 tag 权重收敛生成三选一候选。
// 收敛：已选技能的 tag 出现次数线性提升同 tag 权重，噪点兜底 10%；LCK 提升广度 delta 权重。
// 消耗通过 effects 中 kind:'cost' 的 EffectData 声明；升级 delta 累加，resolveSkill 不修改原始数据。

/** 七大行动类型标签，一个技能可携带多个；用于局内候选收敛权重和副职业改造（扩展模块）。
 *  attack=直接伤害 / defense=减少受伤 / buff=增益 / debuff=削弱 / control=限制行动 / heal=回复 / protect=替代或屏蔽伤害 */
export type SkillTag = 'attack' | 'defense' | 'buff' | 'debuff' | 'control' | 'heal' | 'protect'

// ── TargetStrategy ────────────────────────────────────────────────────────────

/** 单体目标选取策略，战斗层按此排序后取第一个 */
export type TargetSort = 'hp_highest' | 'hp_lowest' | 'atk_highest' | 'def_highest' | 'def_lowest'

/**
 * 目标选取策略：
 * - 'all'    全体目标
 * - 'random' 随机一体
 * - { kind: 'single'; by: TargetSort } 按策略排序后取第一个（1v1 时等同于 single）
 * 默认视为 { kind: 'single'; by: 'hp_highest' }
 */
export type TargetStrategy = 'all' | 'random' | { kind: 'single'; by: TargetSort }

// ── MultiplierDef ─────────────────────────────────────────────────────────────

/**
 * 区间采样策略：
 * - uniform  均匀随机（默认）
 * - high     偏向高值（两次随机取较大值）
 * - low      偏向低值（两次随机取较小值）
 * - extreme  极端取值（只取 min 或 max，各 50%）
 */
export type SamplingStrategy = 'uniform' | 'high' | 'low' | 'extreme'

/**
 * 倍率区间纯数据；固定值时 min === max。
 * 采样由独立函数 sampleMultiplier 完成，保证 JSON 可序列化。
 */
export type MultiplierDef = {
  readonly min: number
  readonly max: number
  readonly strategy: SamplingStrategy
}

/** 创建倍率区间数据；固定值令 min === max */
export function Mult(
  range: [number, number],
  strategy: SamplingStrategy = 'uniform',
): MultiplierDef {
  return { min: range[0], max: range[1], strategy }
}

/** 按策略对 MultiplierDef 采样一次；固定值直接返回 min。
 *  rng 可选，未传时退化到 Math.random（仅供 BattleContainer 外的旧调用兼容）。 */
export function sampleMultiplier(m: MultiplierDef, rng: () => number = Math.random): number {
  const { min, max, strategy } = m
  if (min === max) return min
  const r = max - min
  switch (strategy) {
    case 'high':
      return min + Math.max(rng(), rng()) * r
    case 'low':
      return min + Math.min(rng(), rng()) * r
    case 'extreme':
      return rng() < 0.5 ? min : max
    default:
      return min + rng() * r
  }
}

// ── DamageFormula ─────────────────────────────────────────────────────────────

/**
 * 伤害计算公式。
 * - atk_vs_def  标准：multiplier × ATK − DEF（默认）
 * - atk_true    无视防御：multiplier × ATK
 * - hp_pct      基于目标当前 HP 百分比：target.health.value × multiplier
 * - fixed       固定值：multiplier（直接作为伤害数值）
 */
export type DamageFormula = 'atk_vs_def' | 'atk_true' | 'hp_pct' | 'fixed'

// ── SkillCondition ────────────────────────────────────────────────────────────

/** 使用条件，全部满足才可使用（AND 语义）。 */
export type SkillCondition =
  | { kind: 'actorHpPct'; op: '<=' | '>='; value: number } // 自身 HP 百分比
  | { kind: 'targetHpPct'; op: '<=' | '>='; value: number } // 目标 HP 百分比
  | { kind: 'actorStat'; stat: BuffStat; op: '<=' | '>='; value: number } // 自身指定属性绝对值
  | { kind: 'targetHasBuff'; buffId: string } // 目标身上有指定 buff
  | { kind: 'turnParity'; parity: 'even' | 'odd' } // 偶数/奇数回合

// ── SkillTrigger ──────────────────────────────────────────────────────────────

/**
 * 命中后条件触发效果。
 * - onHit    命中（未闪避）时触发
 * - onCrit   暴击时触发
 * - onKill   击杀目标时触发
 * - onCombo  触发连击时触发
 */
export type SkillTriggerEvent = 'onHit' | 'onCrit' | 'onKill' | 'onCombo'

export type SkillTrigger = {
  on: SkillTriggerEvent
  /** 触发概率 0–1，默认 1（必触发） */
  chance?: number
  effects?: EffectData[]
}

// ── SkillUpgrade ──────────────────────────────────────────────────────────────

/**
 * 单次升级描述的 delta effect。所有字段可选，只写需要变化的部分。
 * 升级后的最终值 = 基础值 + 各级 delta 累加。
 */
export type SkillUpgradeDelta = {
  /** 倍率增量，如 +0.3 表示 multiplier += 0.3 */
  multiplier?: number
  /** 段数增量 */
  hits?: number
  /** 技能级破甲增量（0–1），战斗层叠加到 actor.armorPen 上参与本次伤害计算 */
  armorPen?: number
  /** 追加流派 tag，协同加成遍历所有已选 delta 的 tags 合并去重计数 */
  addTags?: SkillTag[]
  /** 追加到 effects 的效果（不替换原有） */
  addEffects?: EffectData[]
  /** 追加触发器 */
  addTriggers?: SkillTrigger[]
}

// ── DeltaCondition ────────────────────────────────────────────────────────────

/** delta 前置条件，不满足时不进入候选池。 */
export type DeltaCondition =
  | { kind: 'hasSkill'; skillId: string }
  | { kind: 'upgradeCount'; op: '>=' | '<='; value: number }
  | { kind: 'statThreshold'; stat: BuffStat; op: '>=' | '<='; value: number }
  | { kind: 'subclass'; id: string }
  | { kind: 'race'; id: string }

// ── SkillUpgrade / SkillDelta ─────────────────────────────────────────────────

export type SkillUpgrade = {
  /** 升级方向提示，可选；缺省时由 describeUpgradeDelta 自动生成描述 */
  label?: string
  /** 方向：depth=深度（增强数值）/ breadth=广度（追加新效果） */
  type?: 'depth' | 'breadth'
  /** 基础抽取权重；未指定时视为 1 */
  weight?: number
  /** 本局最大生效次数，达到上限后从候选池移除 */
  maxUses?: number
  /** 前置条件，不满足时不进入候选池 */
  condition?: DeltaCondition
  delta: SkillUpgradeDelta
}

// ── SkillData ─────────────────────────────────────────────────────────────────

export type SkillData = {
  id: string
  name: string
  /** 基础流派 tag，仅用于技能池筛选权重；流派归属以 delta 积累的 tags 为准 */
  tags: SkillTag[]
  /** 伤害倍率：固定数值或 Mult([min, max], strategy) 区间对象 */
  multiplier: number | MultiplierDef
  /** 技能角色：normal=普攻 / ultimate=大招 / passive=被动（默认 normal） */
  role?: 'normal' | 'ultimate' | 'passive'
  /** 目标选取策略，默认 { kind: 'single'; by: 'hp_highest' } */
  target?: TargetStrategy
  /** 搞怪备注，不参与引擎逻辑，仅供 UI 展示 */
  note?: string
  /** 伤害段数，默认 1 */
  hits?: number
  /** 伤害计算公式，默认 atk_vs_def */
  damageFormula?: DamageFormula
  /** 技能级破甲（0–1），叠加到 actor.armorPen 参与本次伤害计算，由 delta 累加 */
  armorPen?: number
  /** 额外使用条件（资源检查之外） */
  conditions?: SkillCondition[]
  /** 命中后条件触发效果 */
  triggers?: SkillTrigger[]
  /** 升级路径，index 0 = 第 1 次升级 */
  upgrades?: SkillUpgrade[]
  /** 当前已升级次数（运行时字段，数据层默认 0） */
  upgradeLevel?: number
  /** 技能效果列表：cost/heal/actionCost/buff，统一描述资源消耗与 buff 挂载 */
  effects?: EffectData[]
}

// ── 工具函数 ──────────────────────────────────────────────────────────────────

/** 返回技能对指定属性的消耗量（已解析 pct），需传入 unit 以计算百分比 */
export function skillCost(effects: EffectData[], stat: BuffStat, unit: Unit): number {
  let total = 0
  const props = unit.props as unknown as Record<string, Prop | undefined>
  for (const e of effects) {
    if (e.behavior.kind === 'cost' && e.behavior.stat === stat) {
      const b = e.behavior
      const propMax = props[b.stat]?.max ?? 0
      total += b.mode === 'pct' ? propMax * b.value : b.value
    }
  }
  return total
}

/** 检查单个条件是否满足 */
function checkCondition(cond: SkillCondition, actor: Unit, target: Unit, turn: number): boolean {
  switch (cond.kind) {
    case 'actorHpPct': {
      const pct = actor.health.max > 0 ? actor.health.value / actor.health.max : 0
      return cond.op === '<=' ? pct <= cond.value : pct >= cond.value
    }
    case 'targetHpPct': {
      const pct = target.health.max > 0 ? target.health.value / target.health.max : 0
      return cond.op === '<=' ? pct <= cond.value : pct >= cond.value
    }
    case 'actorStat': {
      const v = actor.getStat(cond.stat)
      return cond.op === '<=' ? v <= cond.value : v >= cond.value
    }
    case 'targetHasBuff':
      return target.buffs.all.some((b) => b.id === cond.buffId)
    case 'turnParity':
      return cond.parity === 'even' ? turn % 2 === 0 : turn % 2 !== 0
  }
}

export function canUse(skill: SkillData, actor: Unit, target?: Unit, turn = 0): boolean {
  const effects = skill.effects ?? []
  const props = actor.props as unknown as Record<string, Prop | undefined>
  // 资源检查：遍历技能 cost 涉及的所有 stat，若属性存在则核对最终值是否够 cost
  const costs = new Map<BuffStat, number>()
  for (const e of effects) {
    if (e.behavior.kind === 'cost') {
      const stat = e.behavior.stat
      const cur = costs.get(stat) ?? 0
      costs.set(stat, cur + skillCost([e], stat, actor))
    }
  }
  for (const [stat, total] of costs) {
    if (props[stat as string] === undefined) continue
    if (actor.getStat(stat) < total) return false
  }
  if (skill.conditions && target) {
    for (const cond of skill.conditions) {
      if (!checkCondition(cond, actor, target, turn)) return false
    }
  }
  return true
}

// ── 候选池生成 ────────────────────────────────────────────────────────────────

/** 强化节点候选项：获取新技能 或 升级已有技能的某个 delta */
export type SkillCandidate =
  | { kind: 'acquire'; skill: SkillData }
  | { kind: 'upgrade'; skill: SkillData; upgradeIndex: number; upgrade: SkillUpgrade }

/** 检查 DeltaCondition 是否满足（仅实现局内可判断的类型） */
function checkDeltaCondition(cond: DeltaCondition, ownedSkills: SkillData[]): boolean {
  switch (cond.kind) {
    case 'hasSkill':
      return ownedSkills.some((s) => s.id === cond.skillId)
    case 'upgradeCount': {
      const total = ownedSkills.reduce((sum, s) => sum + (s.upgradeLevel ?? 0), 0)
      return cond.op === '>=' ? total >= cond.value : total <= cond.value
    }
    // statThreshold / subclass / race 依赖扩展模块，暂时放行
    default:
      return true
  }
}

/**
 * 生成强化节点三选一候选池。
 * - 混合"获取新技能"与"升级已有技能 delta"两类候选
 * - 权重：depth delta 用 weight??1，breadth delta 额外乘以 (1 + lck/100)
 * - 噪点兜底：每个候选最低权重为总权重的 10% / 候选数，防止某类完全消失
 * - 过滤：已达 maxUses（upgradeLevel >= maxUses）或 condition 不满足的 delta 不进入池
 */
export function buildSkillCandidates(
  ownedSkills: SkillData[],
  skillPool: SkillData[],
  lck: number,
  count = 3,
): SkillCandidate[] {
  const breadthBonus = 1 + lck / 100

  const weighted: Array<{ candidate: SkillCandidate; weight: number }> = []

  // 获取新技能（不在已持有列表中的）
  const ownedIds = new Set(ownedSkills.map((s) => s.id))
  for (const skill of skillPool) {
    if (!ownedIds.has(skill.id)) {
      const w = skill.tags.includes('attack') ? 1 : breadthBonus
      weighted.push({ candidate: { kind: 'acquire', skill }, weight: w })
    }
  }

  // 升级已有技能：只取 upgrades[level]，不允许跳级
  for (const skill of ownedSkills) {
    const upgrades = skill.upgrades ?? []
    const level = skill.upgradeLevel ?? 0
    if (level >= upgrades.length) continue
    const upg = upgrades[level]
    if (upg.maxUses !== undefined && level >= upg.maxUses) continue
    if (upg.condition && !checkDeltaCondition(upg.condition, ownedSkills)) continue
    const baseW = upg.weight ?? 1
    const w = upg.type === 'breadth' ? baseW * breadthBonus : baseW
    weighted.push({
      candidate: { kind: 'upgrade', skill, upgradeIndex: level, upgrade: upg },
      weight: w,
    })
  }

  if (weighted.length === 0) return []

  // 噪点兜底：每项最低权重 = 总权重 * 0.1 / 候选数
  const totalW = weighted.reduce((s, x) => s + x.weight, 0)
  const minW = (totalW * 0.1) / weighted.length
  const adjusted = weighted.map((x) => ({ ...x, weight: Math.max(x.weight, minW) }))

  // 加权随机不重复抽取 count 个
  const result: SkillCandidate[] = []
  const pool = [...adjusted]
  const take = Math.min(count, pool.length)
  for (let i = 0; i < take; i++) {
    const total = pool.reduce((s, x) => s + x.weight, 0)
    let r = Math.random() * total
    const idx = pool.findIndex((x) => {
      r -= x.weight
      return r <= 0
    })
    const picked = idx >= 0 ? idx : pool.length - 1
    result.push(pool[picked].candidate)
    pool.splice(picked, 1)
  }
  return result
}

// ── 升级系统 ──────────────────────────────────────────────────────────────────

/**
 * 将升级 delta 合并到技能数据，返回新对象（不修改原始数据）。
 * 调用方负责将 upgradeLevel 写回运行时技能列表。
 */
export function applyUpgrade(skill: SkillData, delta: SkillUpgradeDelta): SkillData {
  const dm = delta.multiplier ?? 0
  const baseMult = skill.multiplier
  // 加法后舍入到两位小数，消除 IEEE 754 误差累积（0.1+0.2 = 0.30000...4 等问题）。
  const r2 = (v: number) => Math.round(v * 100) / 100
  const newMult: number | MultiplierDef =
    typeof baseMult === 'number'
      ? r2(baseMult + dm)
      : Mult([r2(baseMult.min + dm), r2(baseMult.max + dm)], baseMult.strategy)
  return {
    ...skill,
    multiplier: newMult,
    hits: (skill.hits ?? 1) + (delta.hits ?? 0),
    armorPen: (skill.armorPen ?? 0) + (delta.armorPen ?? 0),
    tags: delta.addTags ? [...new Set([...skill.tags, ...delta.addTags])] : skill.tags,
    effects: [...(skill.effects ?? []), ...(delta.addEffects ?? [])],
    triggers: [...(skill.triggers ?? []), ...(delta.addTriggers ?? [])],
  }
}

/**
 * 将技能升级到指定等级（从 0 开始累加所有 delta）。
 * 返回应用了所有升级的新 SkillData。
 */
export function resolveSkill(skill: SkillData): SkillData {
  const level = skill.upgradeLevel ?? 0
  if (level === 0 || !skill.upgrades?.length) return skill
  let resolved = skill
  for (let i = 0; i < Math.min(level, skill.upgrades.length); i++) {
    resolved = applyUpgrade(resolved, skill.upgrades[i].delta)
  }
  return { ...resolved, upgradeLevel: level }
}
