// engine/container — 引擎空容器 + 插件注册体系。
//
// 定位：引擎本身不感知任何业务，只提供「插件注册 / 子容器挂载 / 事件总线 / 缓冲队列 /
// 暂停 / 错误边界 / 内省 / 会话级生命周期」八类能力。具体业务（unit / timeline /
// battle / 任意自定义系统 / ...）通过 EnginePlugin 注入。
//
// 类型扩充约定：插件用 `declare module '@xwink/engine' { namespace Engine { ... } }`
// 扩充 Containers / Events / Queue 三个注册表，跨插件保持类型安全。

// ── Engine namespace（三个空注册表，供 declare module 扩充）──────────────────

export namespace Engine {
  /** 子容器注册表：插件挂载子容器后，通过 declare module 扩充本接口 */
  export interface Containers {}

  /** Observer 事件注册表：立即同步派发，用于战斗逻辑（伤害、命中、击杀…）*/
  export interface Events {}

  /** Queue 缓冲队列注册表：runTurn 末统一消费，用于日志 / UI 通知 */
  export interface Queue {}

  /** 实体属性注册表：各游戏 / 插件通过 declare module 扩充，声明属于本类型的属性键 */
  export interface EntityProps {}
}

// ── EnginePlugin ──────────────────────────────────────────────────────────────

/**
 * 引擎插件契约。
 *
 * 类型参数：
 *  - `NS`   插件提供的子容器命名空间（必须存在于 `Engine.Containers`）
 *  - `Deps` 依赖的子容器 namespace 列表（必须存在于 `Engine.Containers`）
 *
 * 生命周期顺序：
 *   register → init（拓扑排序）→ install({ engine, deps }) → 会话期间 onSessionStart /
 *   onSave / onRestore / onSessionEnd → install 返回的 cleanup 函数（可选）
 *
 * 「会话」是引擎对一段有起止的运行片段的中性称呼，业务层（如 RPG 战斗、关卡、
 * 探索回合）按需把它解释为对应概念。
 */
export interface EnginePlugin<
  NS extends keyof Engine.Containers = keyof Engine.Containers,
  Deps extends readonly (keyof Engine.Containers)[] = readonly (keyof Engine.Containers)[],
> {
  /** 命名空间，用于挂载子容器到 Engine.Containers[NS] */
  namespace: NS

  /** 依赖列表，决定 install 顺序（拓扑排序）*/
  dependencies?: Deps

  // ── handler 执行顺序（对标 Bevy SystemSet .before / .after）──────────────────
  /** 本插件的 handler 必须在这些命名空间的 handler 之后执行 */
  runAfter?: (keyof Engine.Containers)[]
  /** 本插件的 handler 必须在这些命名空间的 handler 之前执行 */
  runBefore?: (keyof Engine.Containers)[]

  // ── 分层暂停（对标 Godot ProcessMode）───────────────────────────────────────
  /**
   * `true` = `engine.pause()` 时本插件的 `engine.on(...)` handler 停止触发；
   * `false` 或省略 = 始终触发（UI / 日志类插件用）
   */
  pausable?: boolean

  /**
   * 初始化入口：挂载子容器、订阅事件。
   * 返回的函数将在 engine 重置 / 战斗销毁时统一调用，用于 cleanup。
   */
  install(ctx: {
    engine: EngineContainer
    deps: { [K in Deps[number]]: Engine.Containers[K] }
  }): (() => void) | void

  // ── 可选生命周期钩子（对标 Godot _ready / _exit_tree）──────────────────────
  /** 会话开始通知，由业务层（例如 BattleContainer.start）触发 */
  onSessionStart?(ctx: { engine: EngineContainer }): void
  /** 会话结束通知，由业务层在结算后触发；result 由业务层定义 */
  onSessionEnd?(ctx: { engine: EngineContainer; result: unknown }): void
  /** 序列化插件自身状态，由 engine.saveAll 调用 */
  onSave?(): unknown
  /** 反序列化插件自身状态，由 engine.restoreAll 调用 */
  onRestore?(data: unknown): void
}

// ── 内部辅助类型 ──────────────────────────────────────────────────────────────

type AnyPlugin = EnginePlugin<keyof Engine.Containers, readonly (keyof Engine.Containers)[]>
type EventKey = keyof Engine.Events
type QueueKey = keyof Engine.Queue
type ContainerKey = keyof Engine.Containers

type EventHandlerEntry = {
  handler: (payload: unknown) => void
  /** 注册该 handler 的插件（命名空间），用于 pausable / 错误上下文 */
  pluginNs: ContainerKey | null
}

type ErrorHandler = (err: unknown, ctx: { event: string; plugin: string }) => void

// ── Kahn 拓扑排序（dependencies）─────────────────────────────────────────────

function topoSortByDependencies(plugins: AnyPlugin[]): AnyPlugin[] {
  const byNs = new Map<ContainerKey, AnyPlugin>()
  for (const p of plugins) {
    if (byNs.has(p.namespace)) {
      throw new Error(`EngineContainer.init: duplicate plugin namespace '${String(p.namespace)}'`)
    }
    byNs.set(p.namespace, p)
  }

  const indeg = new Map<ContainerKey, number>()
  const adj = new Map<ContainerKey, ContainerKey[]>()
  for (const p of plugins) {
    indeg.set(p.namespace, 0)
    adj.set(p.namespace, [])
  }
  for (const p of plugins) {
    for (const dep of p.dependencies ?? []) {
      if (!byNs.has(dep)) {
        throw new Error(
          `EngineContainer.init: plugin '${String(p.namespace)}' depends on missing '${String(dep)}'`,
        )
      }
      adj.get(dep)!.push(p.namespace)
      indeg.set(p.namespace, (indeg.get(p.namespace) ?? 0) + 1)
    }
  }

  const queue: ContainerKey[] = []
  for (const [ns, deg] of indeg) if (deg === 0) queue.push(ns)
  const out: AnyPlugin[] = []
  while (queue.length) {
    const ns = queue.shift()!
    out.push(byNs.get(ns)!)
    for (const next of adj.get(ns) ?? []) {
      const d = (indeg.get(next) ?? 0) - 1
      indeg.set(next, d)
      if (d === 0) queue.push(next)
    }
  }
  if (out.length !== plugins.length) {
    const remaining = plugins
      .filter((p) => !out.includes(p))
      .map((p) => String(p.namespace))
      .join(' / ')
    throw new Error(`EngineContainer.init: dependencies cycle detected among [${remaining}]`)
  }
  return out
}

// ── runAfter / runBefore 排序（handler 二次排列）──────────────────────────────

/**
 * 基于插件已确定的 install 顺序，结合 runAfter / runBefore 再做一次拓扑排序。
 * 冲突（A.runBefore=B 且 B.runBefore=A）时抛错。
 *
 * 返回结果用于决定同一事件下不同插件 handler 的相对触发顺序。
 */
function topoSortHandlers(plugins: AnyPlugin[]): ContainerKey[] {
  const present = new Set(plugins.map((p) => p.namespace))
  const indeg = new Map<ContainerKey, number>()
  const adj = new Map<ContainerKey, ContainerKey[]>()
  for (const p of plugins) {
    indeg.set(p.namespace, 0)
    adj.set(p.namespace, [])
  }
  // a -> b 表示 a 必须在 b 之前执行
  const addEdge = (a: ContainerKey, b: ContainerKey): void => {
    if (!present.has(a) || !present.has(b)) return
    adj.get(a)!.push(b)
    indeg.set(b, (indeg.get(b) ?? 0) + 1)
  }
  for (const p of plugins) {
    for (const before of p.runBefore ?? []) addEdge(p.namespace, before)
    for (const after of p.runAfter ?? []) addEdge(after, p.namespace)
  }

  // 起始顺序保留 plugins 顺序（dependencies 已确定），保证拓扑排序结果稳定
  const queue: ContainerKey[] = []
  for (const p of plugins) if ((indeg.get(p.namespace) ?? 0) === 0) queue.push(p.namespace)
  const out: ContainerKey[] = []
  while (queue.length) {
    const ns = queue.shift()!
    out.push(ns)
    for (const next of adj.get(ns) ?? []) {
      const d = (indeg.get(next) ?? 0) - 1
      indeg.set(next, d)
      if (d === 0) queue.push(next)
    }
  }
  if (out.length !== plugins.length) {
    const remaining = plugins
      .map((p) => p.namespace)
      .filter((n) => !out.includes(n))
      .map(String)
      .join(' / ')
    throw new Error(`EngineContainer.init: runAfter/runBefore cycle detected among [${remaining}]`)
  }
  return out
}

// ── EngineContainer ──────────────────────────────────────────────────────────

export class EngineContainer {
  private _plugins: AnyPlugin[] = []
  private _initialized = false
  /** 排序后的插件顺序，install / 战斗钩子 / save / restore 均按此顺序遍历 */
  private _pluginOrder: AnyPlugin[] = []
  /** 命名空间 → 插件，方便 onSessionStart / pausable 判断 */
  private _byNs = new Map<ContainerKey, AnyPlugin>()
  /** handler 二次排序结果（namespace 级），同事件 handler 按此优先级排列 */
  private _handlerOrder: ContainerKey[] = []
  /** 命名空间 → 顺序索引，缓存，emit 时排序 handler 列表使用 */
  private _handlerRank = new Map<ContainerKey, number>()
  /** install 返回的 cleanup 列表，逆序调用 */
  private _cleanups: Array<() => void> = []

  private _containers = new Map<ContainerKey, unknown>()
  private _events = new Map<EventKey, EventHandlerEntry[]>()
  private _queues = new Map<QueueKey, unknown[]>()

  private _paused = false
  private _errorHandler: ErrorHandler = (err, ctx) => {
    console.error(
      `[EngineContainer] error in handler (event='${ctx.event}', plugin='${ctx.plugin}')`,
      err,
    )
  }

  /**
   * 当前正在订阅的插件命名空间。`on()` 在 install() 调用栈内访问此字段，
   * 把 handler 归属到对应插件，从而支持 pausable / 错误上下文 / inspect。
   */
  private _activeInstallNs: ContainerKey | null = null

  // ── 注册与初始化 ────────────────────────────────────────────────────────────

  register(...plugins: AnyPlugin[]): this {
    if (this._initialized) {
      throw new Error('EngineContainer.register: cannot register after init()')
    }
    for (const p of plugins) this._plugins.push(p)
    return this
  }

  init(): this {
    if (this._initialized) throw new Error('EngineContainer.init: already initialized')

    // ① dependencies 拓扑排序
    this._pluginOrder = topoSortByDependencies(this._plugins)
    this._byNs = new Map(this._pluginOrder.map((p) => [p.namespace, p] as const))

    // ② handler 顺序（runAfter / runBefore），缓存为 rank
    this._handlerOrder = topoSortHandlers(this._pluginOrder)
    this._handlerRank = new Map(this._handlerOrder.map((ns, i) => [ns, i] as const))

    // ③ 顺序 install，注入 deps（已挂载的子容器）
    for (const plugin of this._pluginOrder) {
      const deps: Record<string, unknown> = {}
      for (const dep of plugin.dependencies ?? []) {
        const sub = this._containers.get(dep)
        if (sub === undefined) {
          throw new Error(
            `EngineContainer.init: plugin '${String(plugin.namespace)}' depends on '${String(dep)}', but it is not mounted yet`,
          )
        }
        deps[dep as string] = sub
      }
      const prev = this._activeInstallNs
      this._activeInstallNs = plugin.namespace
      try {
        const cleanup = plugin.install({
          engine: this,
          deps: deps as never,
        })
        if (typeof cleanup === 'function') this._cleanups.push(cleanup)
      } finally {
        this._activeInstallNs = prev
      }
    }

    // ④ 重排已注册的事件 handler，使其按 _handlerRank 排列
    for (const list of this._events.values()) this._sortHandlers(list)

    this._initialized = true
    return this
  }

  // ── 子容器存取 ──────────────────────────────────────────────────────────────

  mount<K extends ContainerKey>(key: K, sub: Engine.Containers[K]): void {
    this._containers.set(key, sub)
  }

  get<K extends ContainerKey>(key: K): Engine.Containers[K] {
    if (!this._containers.has(key)) {
      throw new Error(`container '${String(key)}' not mounted`)
    }
    return this._containers.get(key) as Engine.Containers[K]
  }

  // ── Observer 层：立即同步 ───────────────────────────────────────────────────

  on<K extends EventKey>(event: K, handler: (p: Engine.Events[K]) => void): () => void {
    const list = this._events.get(event) ?? []
    const entry: EventHandlerEntry = {
      handler: handler as (p: unknown) => void,
      pluginNs: this._activeInstallNs,
    }
    list.push(entry)
    if (this._initialized) this._sortHandlers(list)
    this._events.set(event, list)
    return () => {
      const cur = this._events.get(event)
      if (!cur) return
      const idx = cur.indexOf(entry)
      if (idx !== -1) cur.splice(idx, 1)
    }
  }

  emit<K extends EventKey>(event: K, payload: Engine.Events[K]): void {
    const list = this._events.get(event)
    if (!list || list.length === 0) return
    // 拷贝快照：避免 handler 内部 cleanup 自身导致遍历错位
    for (const entry of [...list]) {
      const plugin = entry.pluginNs ? this._byNs.get(entry.pluginNs) : undefined
      if (this._paused && plugin?.pausable) continue
      try {
        entry.handler(payload)
      } catch (err) {
        this._errorHandler(err, {
          event: String(event),
          plugin: entry.pluginNs ? String(entry.pluginNs) : '<anonymous>',
        })
      }
    }
  }

  private _sortHandlers(list: EventHandlerEntry[]): void {
    list.sort((a, b) => {
      const ra = a.pluginNs
        ? (this._handlerRank.get(a.pluginNs) ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER
      const rb = b.pluginNs
        ? (this._handlerRank.get(b.pluginNs) ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER
      return ra - rb
    })
  }

  // ── Queue 层：缓冲队列 ──────────────────────────────────────────────────────

  queue<K extends QueueKey>(event: K, payload: Engine.Queue[K]): void {
    const list = this._queues.get(event) ?? []
    list.push(payload)
    this._queues.set(event, list)
  }

  consume<K extends QueueKey>(event: K): Engine.Queue[K][] {
    const list = this._queues.get(event)
    if (!list || list.length === 0) return []
    this._queues.set(event, [])
    return list as Engine.Queue[K][]
  }

  // ── 分层暂停 ────────────────────────────────────────────────────────────────

  pause(): void {
    this._paused = true
  }

  resume(): void {
    this._paused = false
  }

  get paused(): boolean {
    return this._paused
  }

  // ── 错误边界 ────────────────────────────────────────────────────────────────

  onError(handler: ErrorHandler): this {
    this._errorHandler = handler
    return this
  }

  // ── 运行时内省 ──────────────────────────────────────────────────────────────

  inspect(): {
    containers: Record<string, unknown>
    eventListeners: Record<string, number>
    queueLengths: Record<string, number>
    pluginOrder: string[]
    paused: boolean
  } {
    const containers: Record<string, unknown> = {}
    for (const [k, v] of this._containers) containers[String(k)] = v
    const eventListeners: Record<string, number> = {}
    for (const [k, list] of this._events) eventListeners[String(k)] = list.length
    const queueLengths: Record<string, number> = {}
    for (const [k, list] of this._queues) queueLengths[String(k)] = list.length
    return {
      containers,
      eventListeners,
      queueLengths,
      pluginOrder: this._pluginOrder.map((p) => String(p.namespace)),
      paused: this._paused,
    }
  }

  // ── 会话级生命周期 ──────────────────────────────────────────────────────────

  notifySessionStart(): void {
    for (const p of this._pluginOrder) p.onSessionStart?.({ engine: this })
  }

  notifySessionEnd(result: unknown): void {
    for (const p of this._pluginOrder) p.onSessionEnd?.({ engine: this, result })
  }

  saveAll(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const p of this._pluginOrder) {
      if (p.onSave) out[String(p.namespace)] = p.onSave()
    }
    return out
  }

  restoreAll(data: Record<string, unknown>): void {
    for (const p of this._pluginOrder) {
      const slot = data[String(p.namespace)]
      if (slot !== undefined) p.onRestore?.(slot)
    }
  }
}
