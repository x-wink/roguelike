// RPG 业务层：回合制战斗、属性体系、技能 / Buff / 伤害公式、角色成长
// 依赖 @xwink/engine 的纯插件容器能力

// ── 属性原语层 ────────────────────────────────────────────────────────────────
export {
  Prop,
  type BuffStat,
  type DerivedFormula,
  type ModMode,
  type PropData,
  type PropSnapshot,
} from './core/prop'

// ── 核心 RPG 数据类型 ─────────────────────────────────────────────────────────
export {
  calcDamageEvent,
  fourTierCalc,
  type DamageEventInput,
  type DamageEventResult,
  type FourTierInput,
} from './core/calc'
export { Tick, type TickType } from './core/tick'
export {
  ALL_UNIT_PROPS,
  BASE_PROPS,
  BONUS_PROPS,
  FIGHT_PROPS,
  STATE_PROPS,
  Unit,
  type BaseProp,
  type BonusProp,
  type FightProp,
  type IBuff,
  type IBuffPool,
  type StatProp,
  type UnitData,
  type UnitProp,
  type UnitSnapshot,
} from './core/unit'

// ── 战斗 / 技能 / 效果 / Buff ──────────────────────────────────────────────────
export {
  type BattleContext,
  type BuffData,
  type BuffTag,
  type EffectBehavior,
  type EffectCondition,
  type EffectData,
  type TurnResult,
  type UseSkillResult,
} from './combat/types'
export { Buff, BuffEffectFactory, BuffFactory, BuffPool, type BuffSpec } from './combat/buff'
export { Effect, applyBehavior, evalConditions } from './combat/effect'
export {
  execBuffMount,
  execBuffRemove,
  execBuffTick,
  execBuffTickDuration,
  initBuffPool,
  mountPassiveBuffs,
} from './combat/executor'
export {
  applyUpgrade,
  buildSkillCandidates,
  canUse,
  Mult,
  resolveSkill,
  sampleMultiplier,
  skillCost,
  type DamageFormula,
  type DeltaCondition,
  type MultiplierDef,
  type SkillCandidate,
  type SkillCondition,
  type SkillData,
  type SkillTag,
  type SkillTrigger,
  type SkillTriggerEvent,
  type SkillUpgrade,
  type SkillUpgradeDelta,
} from './combat/skill'
export { SkillPool, type ArchetypeBonus } from './combat/skill-pool'
export { Sandbox, type SandboxOps } from './combat/sandbox'
export { type BattleMode, type UseSkillFn } from './combat/runner'
export { buildBattleContext, type BattleState } from './combat/timeline'

// ── 元数据：游戏流程 / 技能描述 / 成长 ──────────────────────────────────────
export { type BattleLogEntry } from './meta/types'
export {
  Growth,
  GROWTH_INITIAL_POINTS,
  GROWTH_POINTS_PER_LEVEL,
  expThreshold,
  type GrowthData,
} from './meta/growth'
export {
  BASE_PROP_DERIVE_TOKEN,
  buildFormulaTipJson,
  buildPropTip,
  buildPropTipJson,
  describeBuffEffect,
  describeSkill,
  describeUpgradeDelta,
  describeTickBehavior,
  FIGHT_PROP_FORMULA_TOKEN,
  PROP_LABEL as STAT_LABEL,
  PROP_TOKEN,
  registerPropToken,
  renderBehaviorToken,
  renderBuffDescToken,
  renderConditionToken,
  renderCostToken,
  renderDamageToken,
  renderDeriveToken,
  renderEffectToken,
  renderFormulaToken,
  renderTriggerToken,
  STAT_PROP_LABEL,
  tokenizeBehavior,
  tokenizeEffect,
  pctTier,
  WHEN_LABEL,
  type ApplyBuffToken,
  type BehaviorToken,
  type CostBehaviorToken,
  type HealBehaviorToken,
  type BuffDescToken,
  type ConditionToken,
  type ControlToken,
  type CostToken,
  type DamageToken,
  type DescToken,
  type EffectDescToken,
  type ExecuteToken,
  type FlavorToken,
  type PropDeriveToken,
  type PropFormulaToken,
  type PropInfoToken,
  type PropModToken,
  type PropTipData,
  type StatDeltaToken,
  type TipLevel,
  type TriggerToken,
} from './meta/describe'

// ── RPG 内置插件 ──────────────────────────────────────────────────────────────
export { UnitContainer, UnitPlugin, type BuffToken } from './plugins/unit-plugin'
export {
  BASE_ACTION_COST,
  CTBStrategy,
  makeTimelinePlugin,
  TimelineContainer,
  TimelinePlugin,
  type TurnOrderStrategy,
  type UnitBattleState,
} from './plugins/timeline-plugin'
export {
  BattleContainer,
  BattlePlugin,
  ENGINE_VERSION,
  HPWinCondition,
  type BattleRecord,
  type CoordinatorTurnResult,
  type UseSkillOptions,
  type WinCondition,
} from './plugins/battle-plugin'
export { EngineHandlersPlugin } from './plugins/engine-handlers-plugin'
