// combat/buff — Buff 数据层。Buff 是纯数据容器 + 过滤逻辑，不执行任何 behavior。
// BuffPool 管理 buff 列表，所有 fire/tick 方法返回待执行的 EffectData[]，由 battle 层执行。

import type { BuffData, BuffTag, EffectData } from './types'
import type { StatProp, ModMode, BuffStat } from '../core/prop'
import { Prop } from '../core/prop'

// 重新导出供其他模块使用
export type { BuffData, BuffTag }

// ── Buff ──────────────────────────────────────────────────────────────────────

export class Buff {
  readonly data: BuffData
  readonly id: string
  readonly name: string
  readonly tags: ReadonlySet<BuffTag>
  readonly refreshOnStack: boolean
  readonly force: boolean
  readonly effects: EffectData[]
  duration: number
  readonly stack: Prop

  constructor(data: BuffData) {
    this.data = data
    this.id = data.id
    this.name = data.name
    this.duration = data.duration
    this.tags = new Set(data.tags ?? [])
    this.refreshOnStack = data.refreshOnStack ?? true
    this.force = data.force ?? false
    this.effects = data.effects
    const initial = data.stack?.initial ?? 1
    const max = data.stack?.max ?? 1
    this.stack = new Prop({ value: initial, min: 1, max })
  }

  get isDebuff(): boolean {
    return this.tags.has('debuff')
  }
  get anonymous(): boolean {
    return this.tags.has('anonymous')
  }
  get expired(): boolean {
    return this.duration === 0
  }

  /**
   * 返回指定时机应执行的 EffectData 列表，不执行任何副作用。
   * propMod unmount 由 battle 层通过 sourceKey 直接调用 prop.removeMod()，不经此路径。
   */
  collect(when: EffectData['when']): EffectData[] {
    return this.effects.filter((e) => {
      if (e.behavior.kind === 'propMod') return false // propMod 由 battle 层直接管理
      return e.when === when
    })
  }

  /** 返回所有 propMod effects，供 battle 层在 mount/unmount 时维护 sourceKey */
  propMods(): Array<{ effect: EffectData; sourceKey: string }> {
    return this.effects
      .map((e, i) => ({ effect: e, sourceKey: `${this.id}:${i}` }))
      .filter((x) => x.effect.behavior.kind === 'propMod')
  }

  tick(): void {
    if (this.duration > 0) this.duration--
  }
}

// ── BuffEffect 工厂 ───────────────────────────────────────────────────────────

const STAT_LABEL: Partial<Record<BuffStat, string>> = {
  atk: '攻击',
  def: '防御',
  spd: '速度',
  lck: '幸运',
  str: '力量',
  con: '体质',
  agi: '敏捷',
  int: '智力',
}

export const BuffEffectFactory = {
  prop: (s: {
    stat: BuffStat
    mode: ModMode
    value: number
    id?: string
    name?: string
  }): EffectData => ({
    when: 'mount',
    behavior: { kind: 'propMod', stat: s.stat, mode: s.mode, value: s.value },
    ...(s.id !== undefined ? { id: s.id } : {}),
    ...(s.name !== undefined ? { name: s.name } : {}),
  }),
  tick: (s: EffectData): EffectData => s,
}

const { prop, tick } = BuffEffectFactory

// ── Buff 工厂 ─────────────────────────────────────────────────────────────────

const statBuff =
  (isDebuff: boolean) =>
  (s: { stat: BuffStat; value: number; duration?: number }): BuffData => ({
    id: `${isDebuff ? 'debuff' : 'buff'}_${s.stat}`,
    name: `${isDebuff ? '削弱' : '强化'}${STAT_LABEL[s.stat] ?? s.stat.toUpperCase()}`,
    duration: s.duration ?? 2,
    tags: [isDebuff ? 'debuff' : 'buff'],
    effects: [prop({ stat: s.stat, mode: 'basePercent', value: s.value })],
  })

const buffMakers = {
  hot: (s: { stat: StatProp; amount: number; duration: number }): BuffData => {
    const HOT_NAME: Record<StatProp, string> = {
      health: '生命',
      energy: '气力',
      shield: '护盾',
    }
    return {
      id: `hot_${s.stat}`,
      name: `回复${HOT_NAME[s.stat] ?? s.stat}`,
      duration: s.duration,
      tags: ['buff'],
      effects: [
        tick({ when: 'turnStart', behavior: { kind: 'stat', prop: s.stat, amount: s.amount } }),
      ],
    }
  },

  dot: (s: {
    stat: StatProp
    amount: number
    id: string
    name: string
    duration: number
    maxStacks?: number
  }): BuffData => ({
    id: s.id,
    name: s.name,
    duration: s.duration,
    tags: ['debuff', 'dot'],
    stack: s.maxStacks ? { max: s.maxStacks } : undefined,
    effects: [
      tick({ when: 'turnStart', behavior: { kind: 'stat', prop: s.stat, amount: -s.amount } }),
    ],
  }),

  buffStat: statBuff(false),
  debuffStat: statBuff(true),

  disable: (s: { id?: string; name?: string; duration?: number; force?: boolean }): BuffData => ({
    id: s.id ?? 'disable',
    name: s.name ?? '禁止行动',
    duration: s.duration ?? 1,
    tags: ['debuff', 'control'],
    force: s.force ?? true,
    effects: [tick({ when: 'turnStart', behavior: { kind: 'control' } })],
  }),

  shield: (s: { id?: string; name?: string; value: number; duration: number }): BuffData => ({
    id: s.id ?? 'shield',
    name: s.name ?? '护盾',
    duration: s.duration,
    tags: ['buff'],
    effects: [tick({ when: 'mount', behavior: { kind: 'stat', prop: 'shield', amount: s.value } })],
  }),

  execute: (s: { hpPct: number; id?: string; name?: string }): BuffData => ({
    id: s.id ?? 'execute',
    name: s.name ?? '斩杀',
    duration: 0,
    tags: ['debuff'],
    effects: [
      tick({
        when: 'mount',
        behavior: { kind: 'execute' },
        condition: [{ kind: 'ownerHpPct', op: '<=', value: s.hpPct }],
      }),
    ],
  }),
}

export type BuffSpec = {
  [K in keyof typeof buffMakers]: Parameters<(typeof buffMakers)[K]>[0] & { type: K }
}[keyof typeof buffMakers]

export const BuffFactory = {
  ...buffMakers,
  make(spec: BuffSpec): BuffData {
    return (buffMakers[spec.type] as (s: unknown) => BuffData)(spec)
  },
}

// ── BuffPool ──────────────────────────────────────────────────────────────────

/**
 * 管理单个 Unit 的 buff 列表。
 * 所有触发方法返回 { effects, buff } 列表，由 battle 层负责执行。
 * propMod 的 mount/unmount 通过 Buff.propMods() 暴露 sourceKey，由 battle 层直接操作 Prop。
 */
export class BuffPool {
  private _list: Buff[] = []

  get visible(): Buff[] {
    return this._list.filter((b) => !b.anonymous)
  }

  get all(): Buff[] {
    return this._list
  }

  /**
   * 挂载 buff，返回需要执行的 mount effects。
   * - duration=0：一次性，返回 mount effects 后不加入列表。
   * - 同 id 已存在：叠加层数 / 刷新 duration，不重复触发 mount。
   */
  add(buf: Buff): { effects: EffectData[]; buf: Buff } | null {
    if (buf.duration === 0) {
      return { effects: buf.collect('mount'), buf }
    }
    const existing = this._list.find((b) => b.id === buf.id)
    if (existing) {
      existing.stack.add(1)
      if (existing.refreshOnStack) existing.duration = buf.duration
      return null // 叠加不重复触发 mount
    }
    this._list.push(buf)
    return { effects: buf.collect('mount'), buf }
  }

  /**
   * 按 id 主动卸载 buff，返回需要执行的 unmount effects 和 propMods（供 battle 层清除 mod）。
   * force=true 的硬控 buff 不可卸载。
   */
  remove(
    id: string,
  ): { effects: EffectData[]; propMods: Array<{ sourceKey: string }>; buf: Buff } | null {
    const idx = this._list.findIndex((b) => b.id === id)
    if (idx === -1) return null
    if (this._list[idx].force) return null
    const [buf] = this._list.splice(idx, 1)
    return {
      effects: buf.collect('unmount'),
      propMods: buf.propMods().map((x) => ({ sourceKey: x.sourceKey })),
      buf,
    }
  }

  /** 返回指定时机所有 buff 的待执行 effects */
  collectTick(when: EffectData['when']): Array<{ effects: EffectData[]; buf: Buff }> {
    return this._list.map((buf) => ({ effects: buf.collect(when), buf }))
  }

  /**
   * duration-- 并收集到期 buff 的 unmount 信息，由 battle 层执行后调用 expireCollected() 清除列表。
   */
  tickDuration(): Array<{
    effects: EffectData[]
    propMods: Array<{ sourceKey: string }>
    buf: Buff
  }> {
    for (const buf of this._list) buf.tick()
    const expired = this._list.filter((b) => b.expired)
    this._list = this._list.filter((b) => !b.expired)
    return expired.map((buf) => ({
      effects: buf.collect('unmount'),
      propMods: buf.propMods().map((x) => ({ sourceKey: x.sourceKey })),
      buf,
    }))
  }

  /**
   * 两阶段删除（mark-then-sweep，参考 EnTT）：
   * 通过把 duration 置 0 让 buff 进入 expired 状态，但仍保留在 _list 中。
   * 由 UnitContainer.sweepBuffs 在 iteration 结束后调用 sweep() 统一移除，
   * 避免在 turn:end handler 遍历期间修改集合。
   */
  markExpired(buf: Buff): void {
    buf.duration = 0
  }

  /**
   * 移除所有 expired buff，返回被移除的 buff 列表（含 unmount effects 与 propMods）。
   * 与 tickDuration 不同：不调用 tick()，纯移除已标记 expired 的实例。
   */
  sweep(): Array<{
    effects: EffectData[]
    propMods: Array<{ sourceKey: string }>
    buf: Buff
  }> {
    const expired = this._list.filter((b) => b.expired)
    if (expired.length === 0) return []
    this._list = this._list.filter((b) => !b.expired)
    return expired.map((buf) => ({
      effects: buf.collect('unmount'),
      propMods: buf.propMods().map((x) => ({ sourceKey: x.sourceKey })),
      buf,
    }))
  }

  clear(): void {
    this._list = []
  }

  restore(list: Buff[]): void {
    this._list = list
  }
}
