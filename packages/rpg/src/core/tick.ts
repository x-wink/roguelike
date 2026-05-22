// core/tick — Effect 时机字面量字典。
//
// 本文件只承载 EffectData.when 的取值集合，不再持有运行时事件总线（旧 `Lifecycle` 已废弃）。
// 全局战斗事件统一走 EngineContainer.on / emit；细粒度子事件由 BattleContainer 直接 emit
// 字符串字面量（如 'effect:event-start'），与本字典互不耦合。

export const Tick = {
  turnStart: 'turnStart',

  castStart: 'castStart',

  /** 开始作用于目标（actor=施法者，target=目标） */
  targetStart: 'targetStart',
  /** 每个技能效果（cost/heal/buff）开始处理 */
  eventStart: 'eventStart',
  /** 单个效果行为开始执行 */
  effectStart: 'effectStart',
  /** 效果行为执行前（fine-grained pre-hook） */
  preEffect: 'preEffect',
  /** 效果被抵抗（条件不满足导致跳过） */
  onResist: 'onResist',
  /** 效果行为执行完成 */
  onEffect: 'onEffect',
  /** 效果行为执行后（fine-grained post-hook） */
  postEffect: 'postEffect',
  /** 单个效果行为结束 */
  effectEnd: 'effectEnd',
  /** 技能效果处理结束 */
  eventEnd: 'eventEnd',

  hitStart: 'hitStart',
  onMiss: 'onMiss',
  onCrit: 'onCrit',
  preHit: 'preHit',
  onTakeDamage: 'onTakeDamage',
  onMakeDamage: 'onMakeDamage',
  postHit: 'postHit',
  hitEnd: 'hitEnd',

  /** 对目标的所有行为（含连击）结束 */
  targetEnd: 'targetEnd',

  comboStart: 'comboStart',
  /** 连击伤害计算前 */
  preCombo: 'preCombo',
  postCombo: 'postCombo',
  /** 连击序列全部结束 */
  comboEnd: 'comboEnd',

  /** 击杀目标时触发（actor=行动单位，target=被击杀单位） */
  onKill: 'onKill',
  /** 成功使用大招时触发（actor=施放单位） */
  onUltimate: 'onUltimate',

  castEnd: 'castEnd',
  turnEnd: 'turnEnd',

  /** 作为 EffectData.when 值由 executor 直接处理，不通过 emit 派发 */
  mount: 'mount',
  /** 作为 EffectData.when 值由 executor 直接处理，不通过 emit 派发 */
  unmount: 'unmount',
} as const

export type TickType = (typeof Tick)[keyof typeof Tick]
