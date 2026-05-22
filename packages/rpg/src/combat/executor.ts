// combat/executor — Buff 执行原语。battle 层统一承接所有 buff 生命周期的副作用执行。
// 职责：initBuffPool / execBuffMount / execBuffRemove / execBuffTick / execBuffTickDuration。
// 无业务逻辑，不依赖具体游戏层概念。

import { Buff, BuffPool } from './buff'
import { applyBehavior, evalConditions } from './effect'
import type { EffectData } from './effect'
import type { BattleContext } from './types'
import { buildBattleContext, type BattleState } from './timeline'
import type { Unit } from '../core/unit'

// ── BuffPool 注入 ─────────────────────────────────────────────────────────────

/** 为 Unit 注入 BuffPool 实例（battle 层负责，core 层只持有接口） */
export function initBuffPool(unit: Unit): BuffPool {
  const pool = new BuffPool()
  unit.buffs = pool
  return pool
}

// ── Buff 执行辅助 ─────────────────────────────────────────────────────────────

/** 挂载 buff：注入 BuffPool，执行 mount effects 和 propMod */
export function execBuffMount(unit: Unit, buf: Buff, ctx: BattleContext): void {
  const pool = unit.buffs as BuffPool
  const result = pool.add(buf)
  if (!result) return
  for (const { effect, sourceKey } of result.buf.propMods()) {
    applyBehavior('mount', effect.behavior, ctx, result.buf.stack.value, sourceKey, effect.id)
  }
  for (const e of result.effects) {
    if (!evalConditions(e.condition, ctx)) continue
    applyBehavior(e.when, e.behavior, ctx, result.buf.stack.value, '', e.id, e.target)
  }
}

/** 卸载 buff：执行 unmount effects，清除 propMod */
export function execBuffRemove(unit: Unit, id: string, ctx: BattleContext): void {
  const pool = unit.buffs as BuffPool
  const result = pool.remove(id)
  if (!result) return
  for (const { sourceKey } of result.propMods) {
    applyBehavior(
      'unmount',
      { kind: 'propMod', stat: 'atk', mode: 'baseFlat', value: 0 },
      ctx,
      1,
      sourceKey,
    )
  }
  for (const e of result.effects) {
    applyBehavior(e.when, e.behavior, ctx, result.buf.stack.value, '', e.id, e.target)
  }
}

/** 触发指定时机的所有 buff effects */
export function execBuffTick(unit: Unit, when: EffectData['when'], ctx: BattleContext): void {
  const pool = unit.buffs as BuffPool
  for (const { effects, buf } of pool.collectTick(when)) {
    for (const e of effects) {
      if (!evalConditions(e.condition, ctx)) continue
      applyBehavior(e.when, e.behavior, ctx, buf.stack.value, '', e.id, e.target)
    }
  }
}

/** 挂载单位被动技能中面向自身的 buff effects（不含游戏层扩展） */
export function mountPassiveBuffs(
  unit: Unit,
  opponent: Unit,
  turn: number,
  battleState: BattleState,
): void {
  const ctx = buildBattleContext(unit, opponent, turn, battleState)
  for (const passive of unit.pool.resolvedPassives) {
    for (const e of passive.effects ?? []) {
      if (e.behavior.kind === 'buff' && e.target !== 'enemy') {
        execBuffMount(unit, new Buff(e.behavior.data), ctx)
      }
    }
  }
}

/** duration-- 并执行到期 buff 的 unmount（propMod 清除 + unmount effects） */
export function execBuffTickDuration(unit: Unit, ctx: BattleContext): void {
  const pool = unit.buffs as BuffPool
  for (const { effects, propMods, buf } of pool.tickDuration()) {
    for (const { sourceKey } of propMods) {
      applyBehavior(
        'unmount',
        { kind: 'propMod', stat: 'atk', mode: 'baseFlat', value: 0 },
        ctx,
        1,
        sourceKey,
      )
    }
    for (const e of effects) {
      applyBehavior(e.when, e.behavior, ctx, buf.stack.value, '', e.id, e.target)
    }
  }
}
