// engine/combat/runner — 战斗模式抽象接口。
// 引擎只依赖此接口，具体模式（自动 / 手动 / PvP）在 game 层实现并热拔插。
//
// BattleMode 通过构造注入或 executeTurn 的 useSkill 形参获得伤害结算入口，
// 不直接持有 BattleContainer 引用，保持 mode 与容器解耦。

import type { Unit } from '../core/unit'
import type { BattleState } from './timeline'
import type { TurnResult, UseSkillResult } from './types'
import type { SkillData } from './skill'

export type { TurnResult }

export type UseSkillFn = (
  skill: SkillData,
  actor: Unit,
  target: Unit,
  turn: number,
  timelinePosition?: number,
  options?: { skipCombo?: boolean; skipCounter?: boolean; isUltimate?: boolean },
) => UseSkillResult

/**
 * 战斗模式接口。
 * 引擎负责 时间轴推进 / 生命周期事件 / buff 执行；
 * BattleMode 只决定 actor 本回合执行什么行动。
 */
export interface BattleMode {
  executeTurn(
    actor: Unit,
    opponent: Unit,
    turn: number,
    battleState: BattleState,
    useSkill: UseSkillFn,
  ): TurnResult
}
