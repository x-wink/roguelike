// meta/types — RPG 通用元数据类型。
// 仅含战斗日志条目类型；Roguelike 跑图状态机、事件 / 商店等业务结构由 game 层定义。

export type BattleLogEntry = {
  turn: number
  actor: string
  skill: string
  target: string
  damage: number
  isCrit: boolean
  isDodge?: boolean
  isCombo?: boolean
  counterDamage?: number
  energyBefore?: number
  energyAfter?: number
  /** 行动发生时的时间轴位置 */
  timelinePosition?: number
  /** 是否为大招 */
  isUltimate?: boolean
}
