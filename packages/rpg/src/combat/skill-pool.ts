// combat/skill-pool — 技能池。收敛单位技能列表的所有读取逻辑，战斗层只通过 SkillPool 访问技能。
// Unit 持有 pool: SkillPool，外部不直接读 unit.skills。

import { resolveSkill, type SkillData, type SkillTag } from './skill'

// ── 流派加成 ──────────────────────────────────────────────────────────────────

/**
 * 流派加成系数计算规则：
 * - 自由流（混搭）：流派数量 × 1 + 通用技能数量 × 0.5
 * - 其他流派：本流派技能数量 × 1.2
 *
 * 通用技能 = tags 为空的技能（无流派归属）。
 * 流派归属以 resolveSkill 后的 tags 为准（delta 积累）。
 */
export type ArchetypeBonus = {
  /** 主流派（tags 中出现次数最多的），null 表示自由流 */
  dominant: SkillTag | null
  /** 加成系数，乘以技能基础倍率 */
  multiplier: number
  /** 各流派 tag 计数（已去重，每个技能只计一次） */
  tagCounts: Map<SkillTag, number>
  /** 通用技能数量 */
  genericCount: number
}

function calcArchetypeBonus(skills: SkillData[]): ArchetypeBonus {
  const tagCounts = new Map<SkillTag, number>()
  let genericCount = 0

  for (const skill of skills) {
    const resolved = resolveSkill(skill)
    const uniqueTags = [...new Set(resolved.tags)] as SkillTag[]
    if (uniqueTags.length === 0) {
      genericCount++
    } else {
      for (const tag of uniqueTags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
      }
    }
  }

  // 找出出现次数最多的流派
  let dominant: SkillTag | null = null
  let maxCount = 0
  for (const [tag, count] of tagCounts) {
    if (count > maxCount) {
      maxCount = count
      dominant = tag
    }
  }

  const distinctArchetypes = tagCounts.size

  let multiplier: number
  if (distinctArchetypes >= 2) {
    // 自由流：流派数量 × 1 + 通用数量 × 0.5
    multiplier = 1 + distinctArchetypes * 1 + genericCount * 0.5
    dominant = null
  } else if (dominant !== null) {
    // 单一流派：本流派技能数量 × 1.2
    multiplier = 1 + maxCount * 1.2
  } else {
    // 全通用技能
    multiplier = 1 + genericCount * 0.5
  }

  return { dominant, multiplier, tagCounts, genericCount }
}

// ── SkillPool ─────────────────────────────────────────────────────────────────

export class SkillPool {
  private _skills: SkillData[]

  constructor(skills: SkillData[]) {
    this._skills = skills.filter(Boolean).map((s) => ({ ...s }))
  }

  // ── 原始数据访问 ──────────────────────────────────────────────────────────

  /** 所有技能原始数据（快照/序列化用） */
  get raw(): SkillData[] {
    return this._skills
  }

  // ── 按 role 过滤 ──────────────────────────────────────────────────────────

  /** 普攻原始数据（未 resolve） */
  get normal(): SkillData | undefined {
    return this._skills.find((s) => (s.role ?? 'normal') === 'normal')
  }

  /** 大招原始数据（未 resolve） */
  get ultimate(): SkillData | undefined {
    return this._skills.find((s) => s.role === 'ultimate')
  }

  /** 被动技能列表原始数据（未 resolve） */
  get passives(): SkillData[] {
    return this._skills.filter((s) => s.role === 'passive')
  }

  // ── resolve 后的技能（应用所有 delta）────────────────────────────────────

  /** 普攻 resolve 后快照，战斗层直接使用 */
  get resolvedNormal(): SkillData | undefined {
    const s = this.normal
    return s ? resolveSkill(s) : undefined
  }

  /** 大招 resolve 后快照，战斗层直接使用 */
  get resolvedUltimate(): SkillData | undefined {
    const s = this.ultimate
    return s ? resolveSkill(s) : undefined
  }

  /** 被动列表 resolve 后快照 */
  get resolvedPassives(): SkillData[] {
    return this.passives.map(resolveSkill)
  }

  // ── 流派加成 ──────────────────────────────────────────────────────────────

  /** 流派加成计算结果，基于所有技能 resolve 后的 tags */
  get archetypeBonus(): ArchetypeBonus {
    return calcArchetypeBonus(this._skills)
  }

  // ── 运行时修改 ────────────────────────────────────────────────────────────

  /** 替换整个技能列表（快照恢复时使用） */
  replace(skills: SkillData[]): void {
    this._skills = skills.map((s) => ({ ...s }))
  }

  /** 追加一个技能 */
  add(skill: SkillData): void {
    this._skills.push({ ...skill })
  }

  /** 按 id 移除技能 */
  remove(id: string): void {
    this._skills = this._skills.filter((s) => s.id !== id)
  }

  /** 按 id 更新技能（升级 delta 后写回） */
  update(skill: SkillData): void {
    const idx = this._skills.findIndex((s) => s.id === skill.id)
    if (idx >= 0) this._skills[idx] = { ...skill }
  }
}
