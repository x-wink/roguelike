// combat/sandbox — 通用沙箱。与具体逻辑层完全解耦，通过 SandboxOps 注入快照/恢复策略。
// 无内部依赖，可独立用于任意 (TData, TUnit) 对。

// ── SandboxOps ───────────────────────────────────────────────────────────────

/**
 * 沙箱操作接口：描述"如何拍快照"与"如何从快照恢复"。
 * 与具体逻辑层类型完全解耦，可用于任意 (TData, TUnit) 对。
 */
export type SandboxOps<TData, TUnit> = {
  /** 将逻辑层当前状态序列化为可 JSON 化的快照。 */
  snapshot: (unit: TUnit) => unknown
  /** 从初始数据 + 历史快照重建逻辑层。data 提供不变量（max 等），state 提供运行时状态。 */
  restore: (data: TData, state: unknown) => TUnit
}

// ── Sandbox ───────────────────────────────────────────────────────────────────

/**
 * 通用沙箱：隔离数据层（TData，只读）与逻辑层（TUnit，可变），
 * 提供历史管理（commit/undo/redo）、重置（init）、序列化（serialize/deserialize）
 * 与克隆（clone）能力。
 */
export class Sandbox<TData, TUnit> {
  /** 原始只读数据（数据层），冻结后不受战斗层修改影响 */
  readonly data: Readonly<TData>
  /** 当前逻辑层实例（战斗层） */
  unit: TUnit

  private readonly _factory: (data: TData) => TUnit
  private readonly _ops: SandboxOps<TData, TUnit>
  private _past: unknown[] = []
  private _future: unknown[] = []

  constructor(data: TData, factory: (data: TData) => TUnit, ops: SandboxOps<TData, TUnit>) {
    this.data = Object.freeze({ ...data } as TData)
    this._factory = factory
    this._ops = ops
    this.unit = factory(data)
  }

  // ── 历史管理 ───────────────────────────────────────────────────────────────

  /** 将当前状态压入历史栈，清空 redo 队列。在每次行动前调用。 */
  commit(): void {
    this._past.push(this._ops.snapshot(this.unit))
    this._future = []
  }

  /** 撤销：恢复到上一个 commit 点，当前状态压入 redo 队列。 */
  undo(): boolean {
    if (this._past.length === 0) return false
    this._future.push(this._ops.snapshot(this.unit))
    this.unit = this._ops.restore(this.data as TData, this._past.pop()!)
    return true
  }

  /** 重做：重新应用被撤销的状态。 */
  redo(): boolean {
    if (this._future.length === 0) return false
    this._past.push(this._ops.snapshot(this.unit))
    this.unit = this._ops.restore(this.data as TData, this._future.pop()!)
    return true
  }

  get canUndo(): boolean {
    return this._past.length > 0
  }

  get canRedo(): boolean {
    return this._future.length > 0
  }

  // ── 数据操作 ───────────────────────────────────────────────────────────────

  /** 重置：从初始数据重新创建逻辑层，清空所有历史。 */
  init(): void {
    this.unit = this._factory(this.data as TData)
    this._past = []
    this._future = []
  }

  /** 序列化：将当前逻辑层状态导出为 JSON 字符串。 */
  serialize(): string {
    return JSON.stringify(this._ops.snapshot(this.unit))
  }

  /** 反序列化：从 `serialize()` 输出的 JSON 恢复逻辑层状态（不影响历史栈）。 */
  deserialize(json: string): void {
    this.unit = this._ops.restore(this.data as TData, JSON.parse(json))
  }

  /**
   * 克隆：返回具有相同初始数据、当前状态和完整历史副本的新沙箱，两者完全独立。
   */
  clone(): Sandbox<TData, TUnit> {
    const s = new Sandbox(this.data as TData, this._factory, this._ops)
    s.unit = this._ops.restore(this.data as TData, this._ops.snapshot(this.unit))
    s._past = this._past.map((snap) => JSON.parse(JSON.stringify(snap)))
    s._future = this._future.map((snap) => JSON.parse(JSON.stringify(snap)))
    return s
  }
}
