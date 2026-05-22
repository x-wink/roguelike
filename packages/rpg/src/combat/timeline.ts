// combat/timeline — CTB 时间轴的纯数据类型与 BattleContext 构造原语。
//
// 调度逻辑（init / advance / getState / setState）由 plugins/timeline-plugin 的
// TimelineContainer 承担，本文件只保留：
//   1. UnitBattleState / BattleState：跨层共享的纯数据形态（Sandbox / serialize 用）
//   2. BASE_ACTION_COST：CTB 行动值步长常量
//   3. buildBattleContext：组装 BattleContext，使 control behavior 能写入 canAct

import type { Unit } from '../core/unit'
import type { BattleContext } from './types'

// ── BattleState ───────────────────────────────────────────────────────────────

export type UnitBattleState = {
  canAct: boolean
  actionValue: number
  turnsSinceLastUlt: number
}

export type BattleState = Map<string, UnitBattleState>

/** 每次行动后行动值步长；actionValue += BASE_ACTION_COST / spd */
export const BASE_ACTION_COST = 100

// ── BattleContext 构造 ────────────────────────────────────────────────────────

/**
 * 根据 owner / opponent / turn 构造 BattleContext。
 * setCanAct 从 BattleState 注入，使 control behavior 可写入禁止行动标志。
 */
export function buildBattleContext(
  owner: Unit,
  opponent: Unit,
  turn: number,
  battleState: BattleState,
): BattleContext {
  const state = battleState.get(owner.id)
  return {
    owner,
    opponent,
    turn,
    setCanAct: state
      ? (v) => {
          state.canAct = v
        }
      : undefined,
  }
}
