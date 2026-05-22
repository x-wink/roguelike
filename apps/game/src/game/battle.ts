// game/battle — 战斗引擎组装与战斗循环。
// Store 只持有 BattleSandbox 引用并调用本文件的接口；引擎内部细节对 store 不可见。

import { EngineContainer, randomSeed } from '@xwink/engine'
import {
  Buff,
  BattleContainer,
  BattlePlugin,
  EngineHandlersPlugin,
  Sandbox,
  TimelineContainer,
  TimelinePlugin,
  UnitPlugin,
  type BattleLogEntry,
  type CoordinatorTurnResult,
  type SandboxOps,
  type UnitData,
  type UnitSnapshot,
} from '@xwink/rpg'
import { autoBattle } from '@/game/modes/auto'
import { SanPlugin } from '@/game/plugins/san'
import { createUnitFactory } from '@/game/session'
import { Enemy } from '@/game/units/enemy'
import { Player, type PlayerData } from '@/game/units/player'
import type { MutationDef } from '@/game/meta'

// ── 跨层数据类型 ──────────────────────────────────────────────────────────────

export type BattleData = {
  playerData: PlayerData
  playerSnap: UnitSnapshot
  enemy: UnitData
  seed: number
}

type BattleEngineState = {
  units: UnitSnapshot[]
  timeline: unknown
  battle: unknown
  log: BattleLogEntry[]
  pending: boolean
}

export type EngineSession = {
  engine: EngineContainer
  log: BattleLogEntry[]
  pending: boolean
}

export type BattleSandbox = Sandbox<BattleData, EngineSession>

// ── 引擎组装 ──────────────────────────────────────────────────────────────────

export function buildEngine(): EngineContainer {
  const engine = new EngineContainer()
  engine.register(UnitPlugin, TimelinePlugin, BattlePlugin, EngineHandlersPlugin, SanPlugin).init()
  engine.get('unit').setFactory(createUnitFactory())
  return engine
}

const sandboxOps: SandboxOps<BattleData, EngineSession> = {
  snapshot(session) {
    const e = session.engine
    return {
      units: e.get('unit').serialize(),
      timeline: e.get('timeline').serialize(),
      battle: e.get('battle').serialize(),
      log: session.log.map((l) => ({ ...l })),
      pending: session.pending,
    }
  },
  restore(data, raw) {
    const snap = raw as BattleEngineState
    const engine = buildEngine()
    engine
      .get('battle')
      .start({ data: data.playerData, snapshot: data.playerSnap }, data.enemy, { seed: data.seed })
    engine.get('unit').hydrate(snap.units)
    type TLSnap = Parameters<TimelineContainer['hydrate']>[0]
    type BSnap = Parameters<BattleContainer['hydrate']>[0]
    engine.get('timeline').hydrate(snap.timeline as TLSnap)
    engine.get('battle').hydrate(snap.battle as BSnap)
    return {
      engine,
      log: snap.log.map((l) => ({ ...l })),
      pending: snap.pending,
    }
  },
}

export function createBattleSandbox(
  playerData: PlayerData,
  playerSnap: UnitSnapshot,
  enemyData: UnitData,
  seed?: number,
): BattleSandbox {
  const data: BattleData = {
    playerData,
    playerSnap,
    enemy: enemyData,
    seed: seed ?? randomSeed(),
  }
  return new Sandbox(
    data,
    (d) => {
      const engine = buildEngine()
      engine
        .get('battle')
        .start({ data: d.playerData, snapshot: d.playerSnap }, d.enemy, { seed: d.seed })
      return { engine, log: [], pending: false }
    },
    sandboxOps,
  )
}

// ── 战斗循环 ──────────────────────────────────────────────────────────────────

export function runBattleTurn(sandbox: BattleSandbox): {
  battleResult: CoordinatorTurnResult['battleResult']
} {
  const session = sandbox.unit
  const battle = session.engine.get('battle')

  sandbox.commit()

  const result: CoordinatorTurnResult = battle.runTurn(autoBattle)

  const newEntries: BattleLogEntry[] = []
  if (result.skipLog) newEntries.push(result.skipLog)
  if (result.turnResult.normalResult) newEntries.push(result.turnResult.normalResult.log)
  if (result.turnResult.ultimateResult) newEntries.push(result.turnResult.ultimateResult.log)
  if (newEntries.length) session.log = [...session.log, ...newEntries]

  session.pending = result.battleResult === null

  return { battleResult: result.battleResult }
}

// ── 变异 buff 挂载 ────────────────────────────────────────────────────────────

export function mountMutationBuffs(
  session: EngineSession,
  mutationIds: string[],
  mutations: Record<string, MutationDef>,
): void {
  const eng = session.engine
  const enemyUnit = eng
    .get('unit')
    .all()
    .find((u) => u.id !== 'player')
  if (!enemyUnit) return
  for (const mutId of mutationIds) {
    const mutDef = mutations[mutId]
    if (mutDef) eng.get('battle').mountBuff(enemyUnit.id, new Buff(mutDef.buff))
  }
}

// ── 会话查询辅助 ──────────────────────────────────────────────────────────────

export function isSanDrained(session: EngineSession, unitId: string): boolean {
  return session.engine.get('san').isDrained(unitId)
}

export function getSessionPlayer(session: EngineSession): Player {
  return session.engine.get('unit').get('player') as Player
}

export function getSessionEnemy(session: EngineSession): Enemy | undefined {
  return session.engine
    .get('unit')
    .all()
    .find((u) => u.id !== 'player') as Enemy | undefined
}

export function getUnitActionTime(session: EngineSession, unitId: string): number {
  try {
    return session.engine.get('timeline').getState(unitId).actionValue
  } catch {
    return 0
  }
}

export function getBattleTurn(session: EngineSession): number {
  return session.engine.get('battle').turn
}
