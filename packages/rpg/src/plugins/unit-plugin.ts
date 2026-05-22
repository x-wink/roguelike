// plugins/unit-plugin — Unit 容器化封装。
//
// 数据边界原则：UnitContainer 是唯一组装点。外部只传数据（UnitData / UnitSnapshot），
// 实例 (Unit) 不跨层；store / 战斗外的调用方拿不到也不需要持有 Unit 实例。
//
// Buff 生命周期：参考 OpenRA IConditionConsumer 的 token-based 管理 +
// EnTT mark-then-sweep 的两阶段删除。grantBuff 返回不透明 BuffToken，
// revokeBuff 凭 token 精确撤销（mark），由 sweepBuffs 在 iteration 结束后统一清除。

import { Buff, BuffPool } from '../combat/buff'
import type { BuffData } from '../combat/types'
import { Unit, type UnitData, type UnitSnapshot } from '../core/unit'
import type { EnginePlugin } from '@xwink/engine'

// ── BuffToken：branded string，外部不可伪造，不持有 Buff 实例引用 ─────────────

export type BuffToken = string & { readonly _brand: 'BuffToken' }

let _tokenSeq = 0
function nextToken(): BuffToken {
  _tokenSeq += 1
  return `bt_${_tokenSeq}` as BuffToken
}

// ── namespace 扩充 ────────────────────────────────────────────────────────────

declare module '@xwink/engine' {
  namespace Engine {
    interface Containers {
      unit: UnitContainer
    }
  }
}

// ── UnitContainer ─────────────────────────────────────────────────────────────

export type UnitFactory = (data: UnitData) => Unit

export class UnitContainer {
  private readonly _units = new Map<string, Unit>()
  /** token → buff 实例引用，配合 BuffPool 实现 token-based 撤销 */
  private readonly _buffByToken = new Map<BuffToken, Buff>()
  /** buff 实例 → 它所属的 unit id，sweepBuffs 时用 */
  private readonly _ownerByBuff = new WeakMap<Buff, string>()
  private _factory: UnitFactory = (data) => new Unit(data)

  constructor() {}

  /** 注入 Unit 工厂（game 层用来产出 Player / Enemy 子类） */
  setFactory(factory: UnitFactory): void {
    this._factory = factory
  }

  // ── 数据入口（外部只传数据，实例由容器内部组装）──────────────────────────

  /** 用 UnitData 创建并挂载一个 Unit；同 id 重复创建时抛错 */
  create(data: UnitData): void {
    if (this._units.has(data.id)) {
      throw new Error(`UnitContainer.create: unit '${data.id}' already exists`)
    }
    const unit = this._factory(data)
    unit.buffs = new BuffPool()
    this._units.set(data.id, unit)
  }

  /** 从 UnitSnapshot 恢复 Unit 实例（含 Prop mods 与 BuffPool） */
  restore(snap: UnitSnapshot): void {
    const buffs = snap.buffs.map((bs) => {
      const b = new Buff(bs.data)
      b.duration = bs.duration
      b.stack.value = bs.stack
      return b
    })
    const existing = this._units.get(snap.id)
    const unit = existing ?? this._factory({ ...this._dataFromSnap(snap) })
    if (!existing) {
      unit.buffs = new BuffPool()
      this._units.set(snap.id, unit)
    }
    unit.restore(snap, buffs)
    // 重建 token 映射；恢复后旧 token 失效，调用方需重新 grantBuff 才能 revoke
    for (const buf of buffs) this._ownerByBuff.set(buf, snap.id)
  }

  /**
   * snapshot 不含 UnitData 的全量字段（如 skills、health.max 等会从 props/skills 恢复），
   * restore() 在没有现成 Unit 时需用 snap 中能拿到的字段构造一个壳，再用 unit.restore
   * 把 props / buffs / skills 写回。这里只组装 Unit 构造器要求的最小字段；业务层 props
   * （如 san）通过 Object.keys(snap.props) 由 unit.restore 一并写回。
   */
  private _dataFromSnap(snap: UnitSnapshot): UnitData {
    const v = (k: string): number => snap.props[k]?.value ?? 0
    const max = (k: string): number => {
      const m = snap.props[k]?.max
      return m === null || m === undefined ? 0 : m
    }
    return {
      id: snap.id,
      name: snap.name,
      health: max('health'),
      energy: max('energy'),
      str: v('str'),
      con: v('con'),
      agi: v('agi'),
      int: v('int'),
      lck: v('lck'),
      skills: snap.skills.map((s) => ({ ...s })),
    }
  }

  // ── 数据出口（对外只吐数据，不暴露实例）──────────────────────────────────

  snapshot(id: string): UnitSnapshot {
    return this._mustGet(id).snapshot()
  }

  snapshotAll(): UnitSnapshot[] {
    return [...this._units.values()].map((u) => u.snapshot())
  }

  // ── 容器内部访问（Battle / Timeline 等同包内插件使用，不跨层）───────────

  get(id: string): Unit {
    return this._mustGet(id)
  }

  all(): Unit[] {
    return [...this._units.values()]
  }

  has(id: string): boolean {
    return this._units.has(id)
  }

  private _mustGet(id: string): Unit {
    const u = this._units.get(id)
    if (!u) throw new Error(`UnitContainer: unit '${id}' not found`)
    return u
  }

  // ── Buff 令牌化管理（对标 OpenRA IConditionConsumer + EnTT mark-then-sweep）

  /**
   * 挂载 buff 并返回 token；token 失败时（如 duration<=0 的一次性 buff 无需 revoke）
   * 也返回一个 token，但调用 revokeBuff 时会被忽略。
   *
   * 注意：本方法只挂载 buff 到 BuffPool，不执行 propMod / mount effects 的副作用——
   * 这部分逻辑属于 battle 层（C07/C08），由 UnitContainer 持有引用即可。
   */
  grantBuff(id: string, data: BuffData): BuffToken {
    const unit = this._mustGet(id)
    const pool = unit.buffs as BuffPool
    const buf = new Buff(data)
    pool.add(buf)
    const token = nextToken()
    this._buffByToken.set(token, buf)
    this._ownerByBuff.set(buf, id)
    return token
  }

  /**
   * 凭 token 撤销 buff——只标记 expired，不立即从 BuffPool 移除。
   * 由 sweepBuffs 在 iteration 结束后统一清除。
   */
  revokeBuff(id: string, token: BuffToken): void {
    const buf = this._buffByToken.get(token)
    if (!buf) return
    const owner = this._ownerByBuff.get(buf)
    if (owner !== id) return
    const unit = this._units.get(id)
    if (!unit) return
    const pool = unit.buffs as BuffPool
    pool.markExpired(buf)
    this._buffByToken.delete(token)
  }

  /**
   * 清除所有已标记 expired 的 buff。
   * 在 turn:end 全部 handler 执行完后调用，避免遍历中修改集合。
   */
  sweepBuffs(id: string): void {
    const unit = this._units.get(id)
    if (!unit) return
    const pool = unit.buffs as BuffPool
    pool.sweep()
  }
  // ── 序列化（供 store 层 Sandbox 使用）────────────────────────────────────

  serialize(): UnitSnapshot[] {
    return this.snapshotAll()
  }

  hydrate(snaps: UnitSnapshot[]): void {
    for (const s of snaps) {
      if (!this._units.has(s.id)) this.create(this._dataFromSnap(s))
      this.restore(s)
    }
  }
}

// ── UnitPlugin ────────────────────────────────────────────────────────────────

export const UnitPlugin: EnginePlugin<'unit', readonly []> = {
  namespace: 'unit',
  install({ engine }) {
    engine.mount('unit', new UnitContainer())
  },
}
