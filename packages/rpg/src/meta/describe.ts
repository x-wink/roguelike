/**
 * describe 模块规则
 *
 * 职责：将引擎数据结构转换为面向 UI 的描述 token，不含任何渲染/样式逻辑。
 *
 * Token 设计原则：
 *   - 所有 token 均携带 info / debug 双描述字段。
 *     info  = 面向玩家的简要说明，不含具体数值与技术细节。
 *     debug = 在 info 基础上补充具体数值、公式、内部 key 等技术信息；
 *             与 info 相同时可省略（UI 层 fallback 到 info）。
 *   - token 是纯数据，无函数引用，可 JSON 序列化。
 *   - render* 函数是可选的 token → 字符串辅助层，供纯文本场景使用。
 *
 * 入口函数：
 *   tokenizeBehavior(EffectBehavior)  → BehaviorToken | null
 *   tokenizeEffect(EffectData)        → EffectDescToken | null
 *   describeSkill(SkillData)          → DescToken[]
 *
 * UI 层约定：
 *   - 不得在 UI 层拼接描述字符串，统一调用 describe.ts 提供的函数。
 *   - buildPropTipJson / buildFormulaTipJson 是 tooltip 的唯一构建入口。
 *   - 根据当前 LogLevel 选择 info 或 debug 字段渲染。
 */

import type { BuffData } from '../combat/buff'
import type { EffectBehavior, EffectData } from '../combat/effect'
import type { TickType } from '../core/tick'
import type { BaseProp, BuffStat, FightProp, ModMode, StatProp } from '../core/prop'
import type {
  MultiplierDef,
  SkillCondition,
  SkillData,
  SkillTrigger,
  SkillTriggerEvent,
  SkillUpgradeDelta,
} from '../combat/skill'
import { FIGHT_PROPS } from '../core/unit'

export type TipLevel = 'debug' | 'trace' | 'info' | 'warn' | 'error'

/** info 及以上为脱敏模式（语义词），debug/trace 为原始数值模式 */
function isMasked(level: TipLevel): boolean {
  return level !== 'debug' && level !== 'trace'
}

// ── 属性 token ────────────────────────────────────────────────────────────────

/** 纯文字描述，面向玩家 */
export type PropInfoToken = {
  kind: 'info'
  label: string
  icon: string
  /** 简约描述，不含具体数值与公式 */
  info: string
  /** 详细描述，在 info 基础上补充具体数值与公式；与 info 相同时可省略 */
  debug?: string
}

export type PropFormulaToken = {
  kind: 'formula'
  src: BaseProp | 'const'
  multiplier: number
  offset: number
  /** 永久加成（Prop.value），0 时省略 */
  bonus: number
}

export type PropDeriveToken = {
  kind: 'derive'
  targets: FightProp[]
}

export type PropDescToken = PropInfoToken | PropFormulaToken | PropDeriveToken

export const PROP_TOKEN: Partial<Record<BuffStat, PropInfoToken>> = {
  health: { kind: 'info', label: '血量', icon: '❤️', info: '生命值归零时战败。' },
  energy: {
    kind: 'info',
    label: '能量',
    icon: '⚡',
    info: '气力是技能的消耗资源，每回合开始时恢复一定量。',
  },
  shield: {
    kind: 'info',
    label: '护盾',
    icon: '🔵',
    info: '护盾值，受伤时优先抵消，上限与生命上限相同。',
  },
  str: { kind: 'info', label: '力量', icon: '💪', info: '影响物理输出与反击能力的核心力量属性。' },
  con: { kind: 'info', label: '体质', icon: '🛡️', info: '影响承伤能力的核心防御属性。' },
  agi: { kind: 'info', label: '敏捷', icon: '🌀', info: '影响行动速度与机动能力的核心敏捷属性。' },
  int: { kind: 'info', label: '智力', icon: '📖', info: '智力暂未参与推导，留作后续扩展。' },
  lck: { kind: 'info', label: '幸运', icon: '🍀', info: '影响暴击相关能力的核心幸运属性。' },
  atk: { kind: 'info', label: '攻击', icon: '⚔️', info: '攻击力决定技能基础伤害。' },
  def: {
    kind: 'info',
    label: '防御',
    icon: '🛡️',
    info: '防御力减少受到的伤害。',
    debug: '防御力每点减少等量伤害。',
  },
  spd: {
    kind: 'info',
    label: '速度',
    icon: '💨',
    info: '速度决定行动频率。',
    debug: '速度决定 CTB 时间轴上的行动频率。',
  },
  crit: { kind: 'info', label: '暴击率', icon: '🎯', info: '触发暴击时伤害乘以暴击伤害系数。' },
  critDmg: { kind: 'info', label: '暴击伤害', icon: '💥', info: '暴击时的伤害倍率。' },
  dodge: { kind: 'info', label: '闪避', icon: '🌪️', info: '成功闪避时完全规避伤害。' },
  hit: { kind: 'info', label: '命中', icon: '🎯', info: '超出目标闪避的部分抵消闪避。' },
  combo: { kind: 'info', label: '连击', icon: '⚡', info: '命中后有概率追加一次普通攻击。' },
  counter: { kind: 'info', label: '反击', icon: '↩️', info: '受到伤害后有概率立即反击。' },
  armorPen: {
    kind: 'info',
    label: '破甲',
    icon: '🔩',
    info: '无视目标等比例减伤，破甲 30% 则有效减伤降低 30%。',
  },
  damageFinalPct: {
    kind: 'info',
    label: '最终增伤',
    icon: '📈',
    info: '最终增伤系数，叠加于伤害计算末段。',
    debug: '最终增伤系数（0.2 = +20%），参与伤害 Step 2 finalPercent。',
  },
  damageReduction: {
    kind: 'info',
    label: '最终减伤',
    icon: '🔰',
    info: '最终减伤系数，叠加于伤害计算末段。',
    debug: '最终减伤系数（0.1 = 10% 减伤），参与伤害 Step 5。',
  },
}

/** 业务层调用以注册扩展属性的描述 token（如 san 等） */
export function registerPropToken(stat: BuffStat, token: PropInfoToken): void {
  PROP_TOKEN[stat] = token
}

function getPropToken(stat: BuffStat): PropInfoToken {
  const t = PROP_TOKEN[stat]
  if (!t) {
    return { kind: 'info', label: String(stat), icon: '·', info: String(stat) }
  }
  return t
}

export const PROP_LABEL: Partial<Record<BuffStat, string>> = new Proxy(
  {} as Partial<Record<BuffStat, string>>,
  {
    get: (_t, key: string): string | undefined => PROP_TOKEN[key as BuffStat]?.label,
    has: (_t, key: string): boolean => key in PROP_TOKEN,
    ownKeys: (): string[] => Object.keys(PROP_TOKEN),
    getOwnPropertyDescriptor: (_t, key: string) =>
      key in PROP_TOKEN
        ? { configurable: true, enumerable: true, value: PROP_TOKEN[key as BuffStat]?.label }
        : undefined,
  },
)

export const STAT_PROP_LABEL: Partial<Record<StatProp, string>> = new Proxy(
  {} as Partial<Record<StatProp, string>>,
  {
    get: (_t, key: string): string | undefined => PROP_TOKEN[key as BuffStat]?.label,
    has: (_t, key: string): boolean => key in PROP_TOKEN,
    ownKeys: (): string[] => Object.keys(PROP_TOKEN),
    getOwnPropertyDescriptor: (_t, key: string) =>
      key in PROP_TOKEN
        ? { configurable: true, enumerable: true, value: PROP_TOKEN[key as BuffStat]?.label }
        : undefined,
  },
)

export const BASE_PROP_DERIVE_TOKEN: Record<BaseProp, PropDeriveToken> = (() => {
  const map = { str: [], con: [], agi: [], int: [], lck: [] } as Record<BaseProp, FightProp[]>
  for (const [k, f] of Object.entries(FIGHT_PROPS) as [FightProp, { stat: string }][]) {
    if (f.stat in map) map[f.stat as BaseProp].push(k)
  }
  return Object.fromEntries(
    Object.entries(map).map(([k, targets]) => [k, { kind: 'derive' as const, targets }]),
  ) as Record<BaseProp, PropDeriveToken>
})()

export const FIGHT_PROP_FORMULA_TOKEN: Record<FightProp, PropFormulaToken> = (() =>
  Object.fromEntries(
    (
      Object.entries(FIGHT_PROPS) as [
        FightProp,
        { stat: string; multiplier?: number; offset?: number },
      ][]
    ).map(([k, f]) => [
      k,
      {
        kind: 'formula' as const,
        src: f.stat as BaseProp | 'const',
        multiplier: f.multiplier ?? 1,
        offset: f.offset ?? 0,
        bonus: 0,
      },
    ]),
  ) as Record<FightProp, PropFormulaToken>)()

// ── Token → 字符串渲染 ────────────────────────────────────────────────────────

export type PropTipData = { icon: string; title: string; content: string }

const BASE_PROP_SHORT: Record<BaseProp | 'const', string> = {
  str: 'STR',
  con: 'CON',
  agi: 'AGI',
  int: 'INT',
  lck: 'LCK',
  const: '—',
}

export function renderFormulaToken(t: PropFormulaToken, bonus = t.bonus): string {
  const base = BASE_PROP_SHORT[t.src]
  const mult = t.multiplier !== 1 ? ` × ${t.multiplier}` : ''
  const off = t.offset ? ` + ${t.offset}` : ''
  const bon = bonus !== 0 ? ` + ${bonus}` : ''
  return `${base}${mult}${off}${bon}`
}

export function renderDeriveToken(t: PropDeriveToken): string {
  if (t.targets.length === 0) return '暂无推导'
  return t.targets
    .map((k) =>
      renderFormulaToken({ ...FIGHT_PROP_FORMULA_TOKEN[k], bonus: 0 }, 0).replace(
        /^/,
        `${getPropToken(k).label} = `,
      ),
    )
    .join('，')
}

export function buildPropTip(key: BuffStat, level: TipLevel = 'info'): PropTipData {
  const t = getPropToken(key)
  return { icon: t.icon, title: t.label, content: level === 'debug' && t.debug ? t.debug : t.info }
}

export function buildPropTipJson(key: BuffStat, level: TipLevel = 'info'): string {
  return JSON.stringify(buildPropTip(key, level))
}

export function buildFormulaTipJson(key: FightProp | BaseProp, formula: string): string {
  return JSON.stringify({ title: getPropToken(key).label, subtitle: formula })
}

// ── BehaviorToken ─────────────────────────────────────────────────────────────

export type PropModToken = {
  kind: 'propMod'
  stat: BuffStat
  mode: ModMode
  value: number
  label: string
}
export type StatDeltaToken = {
  kind: 'statDelta'
  stat: BuffStat
  amount: number
}
export type ControlToken = { kind: 'control' }
export type ExecuteToken = { kind: 'execute' }
export type ApplyBuffToken = {
  kind: 'applyBuff'
  buffId: string
  buffName: string
  duration: number
}
export type CostBehaviorToken = {
  kind: 'costBehavior'
  stat: BuffStat
  value: number
  mode: 'flat' | 'pct'
}
export type HealBehaviorToken = { kind: 'healBehavior'; stat: BuffStat; value: number }
export type BehaviorToken =
  | PropModToken
  | StatDeltaToken
  | ControlToken
  | ExecuteToken
  | ApplyBuffToken
  | CostBehaviorToken
  | HealBehaviorToken

// ── 数值语义词 ────────────────────────────────────────────────────────────────

/** 将百分比绝对值（0–1）映射为语义词；debug/trace 级别直接返回精确数值字符串 */
export function pctTier(
  abs: number,
  context: 'stat' | 'chance' = 'stat',
  level: TipLevel = 'info',
): string {
  if (!isMasked(level)) {
    return context === 'chance' ? `${Math.round(abs * 100)}% 概率` : `${Math.round(abs * 100)}%`
  }
  if (context === 'chance') {
    if (abs === 0) return '不会触发'
    if (abs <= 0.1) return '极低概率'
    if (abs <= 0.2) return '低概率'
    if (abs <= 0.35) return '有概率'
    if (abs <= 0.5) return '半数概率'
    if (abs <= 0.65) return '较高概率'
    if (abs <= 0.8) return '高概率'
    if (abs < 1.0) return '极高概率'
    return '必定触发'
  }
  if (abs === 0) return '无变化'
  if (abs <= 0.05) return '极微'
  if (abs <= 0.1) return '微量'
  if (abs <= 0.2) return '少量'
  if (abs <= 0.3) return '一些'
  if (abs <= 0.4) return '中量'
  if (abs <= 0.5) return '较多'
  if (abs <= 0.6) return '很多'
  if (abs <= 0.7) return '大量'
  if (abs <= 0.8) return '巨量'
  if (abs <= 1.0) return '海量'
  return '极限'
}

export function tokenizeBehavior(b: EffectBehavior): BehaviorToken {
  switch (b.kind) {
    case 'propMod': {
      const label = getPropToken(b.stat as BuffStat).label
      return { kind: 'propMod', stat: b.stat, mode: b.mode, value: b.value, label }
    }
    case 'stat':
      return { kind: 'statDelta', stat: b.prop, amount: b.amount }
    case 'control':
      return { kind: 'control' }
    case 'execute':
      return { kind: 'execute' }
    case 'buff':
      return {
        kind: 'applyBuff',
        buffId: b.data.id,
        buffName: b.data.name,
        duration: b.data.duration,
      }
    case 'cost':
      return { kind: 'costBehavior', stat: b.stat, value: b.value, mode: b.mode ?? 'flat' }
    case 'heal':
      return { kind: 'healBehavior', stat: b.stat, value: b.value }
  }
}

export function renderBehaviorToken(t: BehaviorToken, level: TipLevel = 'info'): string {
  const masked = isMasked(level)
  switch (t.kind) {
    case 'propMod': {
      const { mode, value, label } = t
      if (mode === 'basePercent' || mode === 'finalPercent') {
        const pct = Math.round(value * 100)
        const sign = pct >= 0 ? '+' : '−'
        if (masked) {
          const word = pctTier(Math.abs(value), 'stat', level)
          return pct === 0 ? `${label} 无变化` : `${label} ${pct >= 0 ? '提升' : '降低'} ${word}`
        }
        const tier = mode === 'basePercent' ? '基础' : '最终'
        return pct === 0 ? `${label} 无变化` : `${label} ${sign}${Math.abs(pct)}%（${tier}百分比）`
      }
      const sign = value >= 0 ? '+' : ''
      if (masked) return `${label} ${sign}${value}`
      const tier = mode === 'baseFlat' ? '基础' : '最终'
      return `${label} ${sign}${value}（${tier}固定值）`
    }
    case 'statDelta': {
      const label = getPropToken(t.stat as BuffStat).label
      const sign = t.amount > 0 ? '+' : ''
      return masked
        ? `${label} ${sign}${t.amount}`
        : `${label} ${sign}${t.amount}（stat: ${t.stat}）`
    }
    case 'control':
      return masked ? '禁止行动' : '禁止行动（control）'
    case 'execute':
      return masked ? '斩杀' : '斩杀（HP 归零）'
    case 'applyBuff': {
      const dur = t.duration > 0 ? ` ${t.duration} 回合` : ''
      return masked ? `施加 [${t.buffName}]${dur}` : `施加 [${t.buffName}]${dur}（id: ${t.buffId}）`
    }
    case 'costBehavior': {
      const label = getPropToken(t.stat as BuffStat).label
      const isRestore = t.value < 0
      const absVal = Math.abs(t.value)
      const valText = t.mode === 'pct' ? `${Math.round(absVal * 100)}%` : String(absVal)
      const verb = isRestore ? '回复' : '消耗'
      return masked
        ? `${verb} ${label} ${valText}`
        : `${verb} ${label} ${valText}（stat: ${t.stat}，mode: ${t.mode}）`
    }
    case 'healBehavior': {
      const label = getPropToken(t.stat as BuffStat).label
      return masked ? `回复 ${label} ${t.value}` : `回复 ${label} ${t.value}（stat: ${t.stat}）`
    }
  }
}

// ── EffectDescToken ───────────────────────────────────────────────────────────

export const WHEN_LABEL: Record<TickType, string> = {
  mount: '立即',
  unmount: '移除时',
  turnStart: '每回合开始',
  turnEnd: '每回合结束',
  castStart: '施法开始',
  castEnd: '施法结束',
  targetStart: '目标开始',
  targetEnd: '目标结束',
  eventStart: '效果开始',
  eventEnd: '效果结束',
  effectStart: '行为开始',
  effectEnd: '行为结束',
  preEffect: '行为前',
  onResist: '被抵抗时',
  onEffect: '行为触发时',
  postEffect: '行为后',
  hitStart: '命中开始',
  hitEnd: '命中结束',
  preHit: '命中前',
  onCrit: '暴击时',
  onMiss: '未命中时',
  onTakeDamage: '受伤时',
  onMakeDamage: '造伤时',
  postHit: '命中后',
  comboStart: '连击开始',
  preCombo: '连击前',
  postCombo: '连击后',
  comboEnd: '连击结束',
  onKill: '击杀时',
  onUltimate: '大招命中时',
}

export type EffectDescToken = {
  kind: 'effectDesc'
  when: TickType
  whenLabel: string
  isPropMod: boolean
  behavior: BehaviorToken
  condition?: import('../combat/effect').EffectCondition[]
}

function describeEffectCondition(c: import('../combat/effect').EffectCondition): string {
  switch (c.kind) {
    case 'targetHasDebuff':
      return `目标有 [${c.debuffId}]`
    case 'ownerHpPct':
      return `自身 HP ${c.op} ${Math.round(c.value * 100)}%`
    case 'targetHpPct':
      return `目标 HP ${c.op} ${Math.round(c.value * 100)}%`
    case 'ownerStatPct': {
      const label = getPropToken(c.stat as BuffStat).label
      return `自身 ${label} ${c.op} ${Math.round(c.value * 100)}%`
    }
  }
}

export function tokenizeEffect(e: EffectData): EffectDescToken {
  const behavior = tokenizeBehavior(e.behavior)
  const whenLabel = WHEN_LABEL[e.when] ?? e.when
  const isPropMod = e.behavior.kind === 'propMod'
  return {
    kind: 'effectDesc',
    when: e.when,
    whenLabel,
    isPropMod,
    behavior,
    condition: e.condition,
  }
}

export function renderEffectToken(t: EffectDescToken, level: TipLevel = 'info'): string {
  const text = renderBehaviorToken(t.behavior, level)
  const condSuffix =
    !isMasked(level) && t.condition?.length
      ? `（条件：${t.condition.map(describeEffectCondition).join('，')}）`
      : ''
  return t.isPropMod ? `${text}${condSuffix}` : `${t.whenLabel}：${text}${condSuffix}`
}

// ── DescToken（技能描述 token）───────────────────────────────────────────────

export type DamageToken = {
  kind: 'damage'
  formula: 'atk_vs_def' | 'atk_true' | 'hp_pct' | 'fixed'
  /** 倍率范围；固定值时 min === max */
  min: number
  max: number
  hits: number
}
export type CostToken = {
  kind: 'cost'
  stat: BuffStat
  value: number
  mode?: 'flat' | 'pct'
}
export type BuffDescToken = {
  kind: 'buff'
  id: string
  name: string
  duration: number
  target: 'self' | 'enemy'
  effects: EffectDescToken[]
}
export type TriggerToken = {
  kind: 'trigger'
  on: SkillTriggerEvent
  chance?: number
  effects: EffectDescToken[]
}
export type ConditionToken = {
  kind: 'condition'
  cond: SkillCondition
}
export type FlavorToken = { kind: 'flavor'; text: string }
export type DescToken =
  | DamageToken
  | CostToken
  | BuffDescToken
  | TriggerToken
  | ConditionToken
  | FlavorToken
  | EffectDescToken

const TRIGGER_EVENT_LABEL: Record<SkillTriggerEvent, string> = {
  onHit: '命中时',
  onCrit: '暴击时',
  onKill: '击杀时',
  onCombo: '连击时',
}

const DAMAGE_FORMULA_LABEL: Record<DamageToken['formula'], string> = {
  atk_vs_def: 'ATK − DEF',
  atk_true: 'ATK（无视防御）',
  hp_pct: '目标当前 HP%',
  fixed: '固定值',
}

function conditionText(cond: SkillCondition): string {
  switch (cond.kind) {
    case 'actorHpPct':
      return `自身 HP ${cond.op} ${cond.value * 100}%`
    case 'targetHpPct':
      return `目标 HP ${cond.op} ${cond.value * 100}%`
    case 'actorStat': {
      const label = getPropToken(cond.stat as BuffStat).label
      return `自身${label} ${cond.op} ${cond.value}`
    }
    case 'targetHasBuff':
      return `目标持有 [${cond.buffId}]`
    case 'turnParity':
      return cond.parity === 'even' ? '偶数回合' : '奇数回合'
  }
}

function getMultRange(m: number | MultiplierDef): [number, number] {
  return typeof m === 'number' ? [m, m] : [m.min, m.max]
}

function tokenizeTrigger(t: SkillTrigger): TriggerToken {
  const effects = (t.effects ?? []).map(tokenizeEffect)
  return { kind: 'trigger', on: t.on, chance: t.chance, effects }
}

function tokenizeBuffData(data: BuffData, target: 'self' | 'enemy'): BuffDescToken {
  const effects = data.effects.map(tokenizeEffect)
  return { kind: 'buff', id: data.id, name: data.name, duration: data.duration, target, effects }
}

export function describeSkill(skill: SkillData): DescToken[] {
  const tokens: DescToken[] = []
  const effects = skill.effects ?? []

  const [multMin, multMax] = getMultRange(skill.multiplier)
  if (multMax > 0) {
    tokens.push({
      kind: 'damage',
      formula: skill.damageFormula ?? 'atk_vs_def',
      min: multMin,
      max: multMax,
      hits: skill.hits ?? 1,
    })
  }

  for (const e of effects) {
    const b = e.behavior
    if (b.kind === 'buff') {
      if (b.data.duration < 0) {
        for (const inner of b.data.effects) {
          if (inner.behavior.kind === 'propMod') tokens.push(tokenizeEffect(inner))
        }
      } else {
        tokens.push(tokenizeBuffData(b.data, e.target ?? 'self'))
      }
    } else {
      const token = tokenizeEffect(e)
      const ct = token.behavior
      if (ct.kind === 'costBehavior' || ct.kind === 'healBehavior') {
        tokens.push({
          kind: 'cost',
          stat: ct.stat,
          value: ct.kind === 'healBehavior' ? -ct.value : ct.value,
          mode: ct.kind === 'costBehavior' ? ct.mode : undefined,
        })
      }
    }
  }

  for (const t of skill.triggers ?? []) tokens.push(tokenizeTrigger(t))
  for (const cond of skill.conditions ?? []) tokens.push({ kind: 'condition', cond })
  if (skill.note) tokens.push({ kind: 'flavor', text: skill.note })

  return tokens
}

// ── DescToken render 函数 ─────────────────────────────────────────────────────

export function renderDamageToken(t: DamageToken, level: TipLevel = 'info'): string {
  const masked = isMasked(level)
  const hits = t.hits > 1 ? ` × ${t.hits} 段` : ''
  const { min, max } = t
  const isRange = min !== max
  const formulaLabel = DAMAGE_FORMULA_LABEL[t.formula]
  if (!masked) {
    if (isRange) {
      return `造成 ${Math.round(min * 100)}%–${Math.round(max * 100)}% ATK 伤害${hits}（公式：${formulaLabel}，range: [${min}, ${max}]）`
    }
    const pct = Math.round(max * 100)
    return `造成 ${pct}% ATK 伤害${hits}（公式：${formulaLabel}，multiplier: ${max}）`
  }
  if (isRange) {
    const minPct = Math.round(min * 100)
    const maxPct = Math.round(max * 100)
    const formulaNote = t.formula !== 'atk_vs_def' ? `（${formulaLabel}）` : ''
    return `造成 ${minPct}%–${maxPct}% 随机伤害${hits}${formulaNote}`
  }
  const deviation = max - 1.0
  const devWord = pctTier(Math.abs(deviation), 'stat', level)
  const devDir = deviation > 0.05 ? `${devWord}提升` : deviation < -0.05 ? `${devWord}降低` : '标准'
  const formulaNote = t.formula !== 'atk_vs_def' ? `（${formulaLabel}）` : ''
  return `${devDir}伤害${hits}${formulaNote}`
}

export function renderCostToken(t: CostToken, level: TipLevel = 'info'): string {
  const masked = isMasked(level)
  const label = getPropToken(t.stat as BuffStat).label
  const isRestore = t.value < 0
  const absVal = Math.abs(t.value)
  const valText = t.mode === 'pct' ? `${Math.round(absVal * 100)}%` : String(absVal)
  const verb = isRestore ? '回复' : '消耗'
  return masked
    ? `${verb} ${label} ${valText}`
    : `${verb} ${label} ${valText}（stat: ${t.stat}，mode: ${t.mode ?? 'flat'}）`
}

export function renderBuffDescToken(t: BuffDescToken, level: TipLevel = 'info'): string {
  const masked = isMasked(level)
  const targetLabel = t.target === 'self' ? '自身' : '目标'
  const durationText = t.duration < 0 ? '永久' : t.duration > 0 ? `${t.duration} 回合` : '立即'
  if (masked) return `${targetLabel}：${t.name}（${durationText}）`
  const effectsText = t.effects.map((e) => renderEffectToken(e, level)).join('，') || '无效果'
  return `${targetLabel}：${t.name}（${durationText}，id: ${t.id}）— ${effectsText}`
}

export function renderTriggerToken(t: TriggerToken, level: TipLevel = 'info'): string {
  const masked = isMasked(level)
  const eventLabel = TRIGGER_EVENT_LABEL[t.on] ?? t.on
  const chanceText = t.chance !== undefined ? pctTier(t.chance, 'chance', level) : ''
  const effectsText = t.effects.map((e) => renderEffectToken(e, level)).join('，') || '无效果'
  const header = chanceText ? `${eventLabel}（${chanceText}）` : eventLabel
  const suffix = masked ? '' : `，on: ${t.on}`
  return `${header}${suffix}：${effectsText}`
}

export function renderConditionToken(t: ConditionToken, level: TipLevel = 'info'): string {
  const text = conditionText(t.cond)
  return isMasked(level) ? text : `${text}（kind: ${t.cond.kind}）`
}

/**
 * 将升级 delta 转换为可读描述行，用于技能选取 UI。
 */
export function describeUpgradeDelta(delta: SkillUpgradeDelta, level: TipLevel = 'info'): string[] {
  const lines: string[] = []

  if (delta.multiplier) {
    const sign = delta.multiplier > 0 ? '+' : ''
    lines.push(`伤害倍率 ${sign}${Math.round(delta.multiplier * 100)}%`)
  }
  if (delta.hits) lines.push(`攻击段数 +${delta.hits}`)
  if (delta.armorPen) lines.push(`破甲 +${Math.round(delta.armorPen * 100)}%`)
  if (delta.addTags?.length) {
    const TAG_LABEL: Record<string, string> = {
      attack: '攻击',
      defense: '防御',
      buff: '增益',
      debuff: '减益',
      control: '控制',
      heal: '回复',
      protect: '保护',
    }
    lines.push(`流派：${delta.addTags.map((t) => TAG_LABEL[t] ?? t).join('、')}`)
  }
  for (const e of delta.addEffects ?? []) {
    const b = e.behavior
    if (b.kind === 'buff') {
      lines.push(renderBuffDescToken(tokenizeBuffData(b.data, e.target ?? 'self'), level))
    } else {
      lines.push(renderEffectToken(tokenizeEffect(e), level))
    }
  }
  for (const t of delta.addTriggers ?? []) {
    lines.push(renderTriggerToken(tokenizeTrigger(t), level))
  }
  return lines.length ? lines : ['强化效果']
}

// ── 向后兼容 ──────────────────────────────────────────────────────────────────

/** @deprecated 使用 tokenizeEffect + renderEffectToken 替代 */
export function describeBuffEffect(e: EffectData): { kind: 'props' | 'tick'; label: string } {
  const token = tokenizeEffect(e)
  return { kind: token.isPropMod ? 'props' : 'tick', label: renderEffectToken(token) }
}

/** @deprecated 使用 renderBehaviorToken(tokenizeBehavior(b)) 替代 */
export function describeTickBehavior(b: EffectBehavior): string {
  return renderBehaviorToken(tokenizeBehavior(b))
}
