// game/plugins/san — SAN（理智）业务系统。
//
// 通过 engine.on 订阅引擎事件，实现零和转移与单侧变化，业务层与引擎完全解耦。
// san_state 是匿名 buff，把 SAN 曲线对 damageFinalPct / damageReduction 的影响写入 propMod。
//
// 同时在此文件向 rpg 描述系统注册 san 的属性 token，使 buildPropTip / renderBehaviorToken
// 等通用渲染入口能识别 san 这一业务扩展属性。

import type { EngineContainer, EnginePlugin } from '@xwink/engine'
import {
  Buff,
  BuffEffectFactory,
  buildBattleContext,
  registerPropToken,
  type BattleContainer,
  type BattleContext,
  type Prop,
  type Unit,
  type UnitContainer,
} from '@xwink/rpg'

// ── 业务属性扩展：把 san 注入引擎 EntityProps 注册表 ─────────────────────────

declare module '@xwink/engine' {
  namespace Engine {
    interface EntityProps {
      san: Prop
    }
  }
}

registerPropToken('san', {
  kind: 'info',
  label: '理智',
  icon: '🧠',
  info: '理智影响伤害系数，归零时战败。',
  debug: '理智影响伤害系数：平静≥70，压力≥40，焦虑≥15，崩溃<15。归零时战败。',
})

// ── SAN 零和转移量（普通触发）────────────────────────────────────────────────

export const SAN_TRANSFER = { crit: 5, combo: 4, counter: 4, dodge: 4, ultimate: 10 } as const

/** 击杀目标时 actor 单方面恢复的 SAN */
export const SAN_KILL_GAIN = 15

/** 每回合固定 SAN 衰减量 */
export const SAN_TURN_DECAY = 2

// ── san_state 匿名 Buff ───────────────────────────────────────────────────────

const SAN_STATE_BUFF_ID = 'san_state'

/** 分段线性插值，points 按 x 升序 */
function piecewiseLerp(x: number, points: [number, number][]): number {
  if (x <= points[0][0]) return points[0][1]
  const last = points[points.length - 1]
  if (x >= last[0]) return last[1]
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
  }
  return last[1]
}

function sanDmgBonus(san: number, maxSan: number): number {
  return piecewiseLerp(1 - san / maxSan, [
    [0, 0],
    [0.4, 0.12],
    [0.75, 0.35],
    [1, 0.6],
  ])
}

function sanReductionLoss(san: number, maxSan: number): number {
  return piecewiseLerp(1 - san / maxSan, [
    [0, 0],
    [0.4, 0.08],
    [0.75, 0.25],
    [1, 0.5],
  ])
}

function makeSanStateBuff(san: number, maxSan: number) {
  return {
    id: SAN_STATE_BUFF_ID,
    name: '意识状态',
    duration: 999,
    tags: ['anonymous' as const],
    effects: [
      BuffEffectFactory.prop({
        stat: 'damageFinalPct',
        mode: 'baseFlat',
        value: sanDmgBonus(san, maxSan),
      }),
      BuffEffectFactory.prop({
        stat: 'damageReduction',
        mode: 'baseFlat',
        value: -sanReductionLoss(san, maxSan),
      }),
    ],
  }
}

// ── namespace 扩充 ────────────────────────────────────────────────────────────

declare module '@xwink/engine' {
  namespace Engine {
    interface Containers {
      san: SanMarker
    }
    interface Events {
      'san:changed': { id: string; from: number; to: number }
      'san:drained': { id: string }
    }
  }
}

/** SAN 状态查询入口。`drained` 在 san:drained 事件触发时由 plugin 写入，
 * 用于 store 在战败结算时显式区分 san-zero / hp-zero，不再依赖 turn:end 时序。 */
export class SanMarker {
  private _drained = new Set<string>()
  markDrained(id: string): void {
    this._drained.add(id)
  }
  isDrained(id: string): boolean {
    return this._drained.has(id)
  }
}

// ── SAN 变化原语 ──────────────────────────────────────────────────────────────

function refreshSanStateBuff(unit: Unit, ctx: BattleContext, battle: BattleContainer): void {
  battle.unmountBuff(unit.id, SAN_STATE_BUFF_ID)
  battle.mountBuff(unit.id, new Buff(makeSanStateBuff(unit.props.san.value, unit.props.san.max)))
  void ctx
}

function changeSan(
  unit: Unit,
  delta: number,
  ctx: BattleContext,
  engine: EngineContainer,
  battle: BattleContainer,
): void {
  const from = unit.props.san.value
  unit.props.san.add(delta)
  const to = unit.props.san.value
  refreshSanStateBuff(unit, ctx, battle)
  if (from !== to) engine.emit('san:changed', { id: unit.id, from, to })
  if (from > 0 && to <= 0) engine.emit('san:drained', { id: unit.id })
}

/** 挂载初始 san_state buff（战斗开始时调用） */
export function mountSanStateBuff(unit: Unit, battle: BattleContainer): void {
  battle.mountBuff(unit.id, new Buff(makeSanStateBuff(unit.props.san.value, unit.props.san.max)))
}

// ── SanPlugin ────────────────────────────────────────────────────────────────

export const SanPlugin: EnginePlugin<'san', readonly ['unit', 'battle']> = {
  namespace: 'san',
  dependencies: ['unit', 'battle'] as const,
  install({ engine, deps }) {
    const marker = new SanMarker()
    engine.mount('san', marker)
    const unit: UnitContainer = deps.unit
    const battle: BattleContainer = deps.battle
    // pendingDrain 在每次 buildEngine() 重新 install 时新建，因此与战斗实例绑定，
    // 不会跨 session 残留。
    let pendingDrain = false

    const ctxFor = (u: Unit, opp: Unit, turn: number): BattleContext =>
      buildBattleContext(u, opp, turn, new Map())

    const transferSan = (gainer: Unit, loser: Unit, amount: number, turn: number): void => {
      changeSan(loser, -amount, ctxFor(loser, gainer, turn), engine, battle)
      changeSan(gainer, amount, ctxFor(gainer, loser, turn), engine, battle)
    }

    engine.on('turn:start', ({ actor, opponent, turn }) => {
      if (actor.id === 'player') {
        const pressure = (opponent as { sanPressure?: number }).sanPressure ?? 0
        changeSan(
          actor,
          -(SAN_TURN_DECAY + pressure),
          ctxFor(actor, opponent, turn),
          engine,
          battle,
        )
      } else {
        refreshSanStateBuff(actor, ctxFor(actor, opponent, turn), battle)
      }
    })

    engine.on('hit:crit', ({ actor, target, turn }) => {
      transferSan(actor, target, SAN_TRANSFER.crit, turn)
    })
    engine.on('hit:miss', ({ actor, target, turn }) => {
      transferSan(target, actor, SAN_TRANSFER.dodge, turn)
    })
    engine.on('combo:start', ({ actor, target, turn }) => {
      transferSan(actor, target, SAN_TRANSFER.combo, turn)
    })
    engine.on('unit:killed', ({ id, killedBy }) => {
      if (!killedBy) return
      const actor = unit.get(killedBy)
      const opp = unit.all().find((u) => u.id === id) ?? actor
      changeSan(actor, SAN_KILL_GAIN, ctxFor(actor, opp, battle.turn), engine, battle)
    })
    engine.on('skill:ultimate', ({ actor, target, turn }) => {
      transferSan(actor, target, SAN_TRANSFER.ultimate, turn)
    })
    engine.on('hit:end', ({ actor, target, turn, isCounter }) => {
      if (!isCounter) return
      transferSan(actor, target, SAN_TRANSFER.counter, turn)
    })

    // SAN 归零落 HP 归零延迟到 turn:end，避免 player 在 turn:start 衰减归零后
    // 本回合仍能行动甚至触发 unit:killed / win 判定。
    engine.on('san:drained', ({ id }) => {
      marker.markDrained(id)
      if (id === 'player') pendingDrain = true
    })
    engine.on('turn:end', () => {
      if (!pendingDrain) return
      pendingDrain = false
      const target = unit.get('player')
      const hp = target.health.value
      if (hp > 0) target.health.add(-hp)
    })
  },
  onSessionStart({ engine }) {
    const unit = engine.get('unit')
    const battle = engine.get('battle')
    for (const u of unit.all()) mountSanStateBuff(u, battle)
  },
}
