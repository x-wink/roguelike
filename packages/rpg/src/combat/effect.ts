// combat/effect — 效果执行层。evalConditions/applyBehavior 是执行入口。
// 职责：描述机制（EffectBehavior/EffectCondition/EffectData）+ 执行机制（applyBehavior）。
// 不依赖 buff.ts / battle.ts，不持有任何实例引用。

import type { Prop } from '../core/prop'
import type { BattleContext, EffectBehavior, EffectCondition, EffectData } from './types'

// 重新导出供其他模块使用，避免各处直接 import types.ts
export type { EffectBehavior, EffectCondition, EffectData }

// ── Effect Factory ────────────────────────────────────────────────────────────

import type { BuffData } from './types'
import type { StatProp } from '../core/prop'

export const Effect = {
  cost: (stat: StatProp, value: number, mode?: 'flat' | 'pct'): EffectData => ({
    when: 'mount',
    target: 'self',
    behavior: { kind: 'cost', stat, value, ...(mode && mode !== 'flat' ? { mode } : {}) },
  }),
  heal: (stat: StatProp, value: number, target: 'self' | 'enemy' = 'self'): EffectData => ({
    when: 'mount',
    target,
    behavior: { kind: 'heal', stat, value },
  }),
  buff: (data: BuffData, target: 'self' | 'enemy' = 'self'): EffectData => ({
    when: 'mount',
    target,
    behavior: { kind: 'buff', data },
  }),
}

// ── Condition 执行 ────────────────────────────────────────────────────────────

function evalCondition(cond: EffectCondition, ctx: BattleContext): boolean {
  switch (cond.kind) {
    case 'targetHasDebuff':
      return ctx.opponent.buffs.all.some((b) => b.id === cond.debuffId && b.isDebuff)
    case 'ownerHpPct': {
      const pct = ctx.owner.health.value / ctx.owner.health.max
      return cond.op === '<=' ? pct <= cond.value : pct >= cond.value
    }
    case 'targetHpPct': {
      const pct = ctx.opponent.health.value / ctx.opponent.health.max
      return cond.op === '<=' ? pct <= cond.value : pct >= cond.value
    }
    case 'ownerStatPct': {
      const prop = (ctx.owner.props as unknown as Record<string, { value: number; max: number }>)[
        cond.stat
      ]
      if (!prop || prop.max <= 0) return false
      const pct = prop.value / prop.max
      return cond.op === '<=' ? pct <= cond.value : pct >= cond.value
    }
  }
}

export function evalConditions(
  conditions: EffectCondition[] | undefined,
  ctx: BattleContext,
): boolean {
  return !conditions || conditions.every((c) => evalCondition(c, ctx))
}

// ── Behavior 执行 ─────────────────────────────────────────────────────────────

/**
 * 执行单个 behavior。
 * - buff：不在此处理，由 battle 层统一挂载。
 * - propMod mount/unmount：sourceKey 由调用方（battle 层）维护，保证对称性。
 */
export function applyBehavior(
  when: 'mount' | 'unmount' | string,
  behavior: EffectBehavior,
  ctx: BattleContext,
  stacks = 1,
  sourceKey = '',
  overrideId?: string,
  target: 'self' | 'enemy' = 'self',
): void {
  const unit = target === 'enemy' ? ctx.opponent : ctx.owner
  const propsOf = (u: typeof unit): Record<string, Prop | undefined> =>
    u.props as unknown as Record<string, Prop | undefined>
  switch (behavior.kind) {
    case 'stat': {
      const p = propsOf(unit)[behavior.prop]
      if (p) p.add(behavior.amount * stacks)
      break
    }
    case 'control':
      ctx.setCanAct?.(false)
      break
    case 'execute':
      unit.health.value = 0
      break
    case 'propMod': {
      const prop = propsOf(ctx.owner)[behavior.stat]
      if (!prop) break
      if (when === 'unmount') {
        prop.removeMod(sourceKey)
      } else {
        prop.addMod(sourceKey, behavior.mode, behavior.value, overrideId)
      }
      break
    }
    case 'cost': {
      const prop = propsOf(ctx.owner)[behavior.stat]
      if (!prop) break
      const amount = behavior.mode === 'pct' ? prop.max * behavior.value : behavior.value
      prop.add(-amount * stacks)
      break
    }
    case 'heal': {
      const prop = propsOf(unit)[behavior.stat]
      if (prop) prop.add(behavior.value * stacks)
      break
    }
    case 'buff':
      // buff 挂载由 battle 层统一处理，此处为 no-op
      break
  }
}
