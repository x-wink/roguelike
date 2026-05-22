// plugins/timeline-plugin — CTB 时间轴容器化封装。
//
// 职责：BattleState 管理（actionValue / canAct / turnsSinceLastUlt）+ 推进选择下一行动单位。
// 不更新 actionValue 累加：累加由 BattleContainer.runTurn 在每回合执行后写入。
// 这里只提供选取与状态读写两类原语。
//
// UnitBattleState / BASE_ACTION_COST 的定义权威源在 combat/timeline；本文件只复用。

import type { Unit } from '../core/unit'
import type { EnginePlugin } from '@xwink/engine'
import type { UnitContainer } from './unit-plugin'
import { BASE_ACTION_COST, type UnitBattleState } from '../combat/timeline'

export { BASE_ACTION_COST, type UnitBattleState }

// ── namespace 扩充 ──────────────────────────────────────────────────────────

declare module '@xwink/engine' {
  namespace Engine {
    interface Containers {
      timeline: TimelineContainer
    }
  }
}

// ── TurnOrderStrategy ────────────────────────────────────────────────────────

/** 回合顺序策略接口：决定下一个行动的实体 */
export interface TurnOrderStrategy {
  advance(units: Unit[], getState: (id: string) => UnitBattleState): Unit
}

/** CTB 策略（对标最终幻想 X）：行动值最小者先行动，相同时速度高者优先 */
export class CTBStrategy implements TurnOrderStrategy {
  advance(units: Unit[], getState: (id: string) => UnitBattleState): Unit {
    return units.reduce((a, b) => {
      const ta = getState(a.id).actionValue
      const tb = getState(b.id).actionValue
      if (ta === tb) return a.getStat('spd') >= b.getStat('spd') ? a : b
      return ta < tb ? a : b
    })
  }
}

// ── TimelineContainer ───────────────────────────────────────────────────────

export class TimelineContainer {
  private readonly _state = new Map<string, UnitBattleState>()
  /** init() 记录的参战单位 id 顺序，advance() 据此从 UnitContainer 取实例 */
  private _unitIds: string[] = []

  constructor(
    private readonly units: UnitContainer,
    private readonly strategy: TurnOrderStrategy = new CTBStrategy(),
  ) {}

  /**
   * 初始化 BattleState：所有单位的 actionValue=0、canAct=true、turnsSinceLastUlt=0。
   * 已存在的状态会被重置（用于战斗重开）。
   */
  init(units: Unit[]): void {
    this._state.clear()
    this._unitIds = units.map((u) => u.id)
    for (const u of units) {
      this._state.set(u.id, { canAct: true, actionValue: 0, turnsSinceLastUlt: 0 })
    }
  }

  /**
   * 选取下一行动单位，由注入的 TurnOrderStrategy 决定顺序。
   * 默认 CTBStrategy：actionValue 最小者；相同时速度高者优先。
   */
  advance(): Unit {
    if (this._unitIds.length === 0) {
      throw new Error('TimelineContainer.advance: not initialized (call init(units) first)')
    }
    const list = this._unitIds.map((id) => this.units.get(id))
    return this.strategy.advance(list, (id) => this._mustGet(id))
  }

  getState(id: string): UnitBattleState {
    return this._mustGet(id)
  }

  setState(id: string, patch: Partial<UnitBattleState>): void {
    const s = this._mustGet(id)
    if (patch.canAct !== undefined) s.canAct = patch.canAct
    if (patch.actionValue !== undefined) s.actionValue = patch.actionValue
    if (patch.turnsSinceLastUlt !== undefined) s.turnsSinceLastUlt = patch.turnsSinceLastUlt
  }

  /** 内部访问辅助；id 不存在时抛错 */
  private _mustGet(id: string): UnitBattleState {
    const s = this._state.get(id)
    if (!s) throw new Error(`TimelineContainer: no battle state for unit '${id}'`)
    return s
  }

  // ── 序列化（供 store 层 Sandbox 使用）────────────────────────────────────

  serialize(): { unitIds: string[]; states: Array<[string, UnitBattleState]> } {
    return {
      unitIds: [...this._unitIds],
      states: [...this._state.entries()].map(([id, s]) => [id, { ...s }]),
    }
  }

  hydrate(snap: { unitIds: string[]; states: Array<[string, UnitBattleState]> }): void {
    this._unitIds = [...snap.unitIds]
    this._state.clear()
    for (const [id, s] of snap.states) this._state.set(id, { ...s })
  }
}

// ── TimelinePlugin ──────────────────────────────────────────────────────────

/** 工厂函数：注入自定义时序策略；默认使用 CTBStrategy */
export function makeTimelinePlugin(
  strategy: TurnOrderStrategy = new CTBStrategy(),
): EnginePlugin<'timeline', readonly ['unit']> {
  return {
    namespace: 'timeline',
    dependencies: ['unit'] as const,
    install({ engine, deps }) {
      engine.mount('timeline', new TimelineContainer(deps.unit, strategy))
    },
  }
}

/** 默认 CTB 时序插件，等价于 makeTimelinePlugin(new CTBStrategy()) */
export const TimelinePlugin = makeTimelinePlugin()
