import { describe, it, expect, vi } from 'vitest'
import { EngineContainer, type EnginePlugin } from '@xwink/engine'

class FakeContainer {
  state = 0
}

declare module '@xwink/engine' {
  namespace Engine {
    interface Containers {
      a: FakeContainer
      b: FakeContainer
      bg: FakeContainer
      ui: FakeContainer
    }
    interface Events {
      'test:ping': { v: number }
      'test:tick': { turn: number }
    }
    interface Queue {
      'test:log': string
    }
  }
}

describe('EngineContainer / C03', () => {
  it('依赖顺序：B 依赖 A，A 先于 B 调用 install', () => {
    const order: string[] = []
    const a: EnginePlugin<'a', readonly []> = {
      namespace: 'a',
      install({ engine }) {
        order.push('a')
        engine.mount('a', new FakeContainer())
      },
    }
    const b: EnginePlugin<'b', readonly ['a']> = {
      namespace: 'b',
      dependencies: ['a'] as const,
      install({ engine, deps }) {
        order.push('b')
        expect(deps.a).toBeInstanceOf(FakeContainer)
        engine.mount('b', new FakeContainer())
      },
    }
    // 注册顺序故意反转，验证拓扑排序生效
    new EngineContainer().register(b, a).init()
    expect(order).toEqual(['a', 'b'])
  })

  it('循环依赖：A→B→A 时 init() 抛错', () => {
    const a: EnginePlugin<'a', readonly ['b']> = {
      namespace: 'a',
      dependencies: ['b'] as const,
      install() {},
    }
    const b: EnginePlugin<'b', readonly ['a']> = {
      namespace: 'b',
      dependencies: ['a'] as const,
      install() {},
    }
    const engine = new EngineContainer().register(a, b)
    expect(() => engine.init()).toThrow(/cycle/)
  })

  it("未挂载访问：get('a') 前未 mount 时抛错", () => {
    const engine = new EngineContainer()
    expect(() => engine.get('a')).toThrow(/not mounted/)
  })

  it('事件收发：emit 后订阅者收到 payload，cleanup() 后不再触发', () => {
    const engine = new EngineContainer().init()
    const fn = vi.fn()
    const off = engine.on('test:ping', fn)
    engine.emit('test:ping', { v: 1 })
    expect(fn).toHaveBeenCalledWith({ v: 1 })
    off()
    engine.emit('test:ping', { v: 2 })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("handler 执行顺序：runAfter: ['a'] 的插件 handler 晚于插件 a 的 handler 执行", () => {
    const order: string[] = []
    const a: EnginePlugin<'a', readonly []> = {
      namespace: 'a',
      install({ engine }) {
        engine.mount('a', new FakeContainer())
        engine.on('test:tick', () => order.push('a'))
      },
    }
    const b: EnginePlugin<'b', readonly []> = {
      namespace: 'b',
      runAfter: ['a'],
      install({ engine }) {
        engine.mount('b', new FakeContainer())
        engine.on('test:tick', () => order.push('b'))
      },
    }
    // 注册顺序故意反转，验证 runAfter 生效
    const engine = new EngineContainer().register(b, a).init()
    engine.emit('test:tick', { turn: 1 })
    expect(order).toEqual(['a', 'b'])
  })

  it("顺序冲突检测：A runBefore: ['B']，B runBefore: ['A'] 时 init() 抛错", () => {
    const a: EnginePlugin<'a', readonly []> = {
      namespace: 'a',
      runBefore: ['b'],
      install() {},
    }
    const b: EnginePlugin<'b', readonly []> = {
      namespace: 'b',
      runBefore: ['a'],
      install() {},
    }
    const engine = new EngineContainer().register(a, b)
    expect(() => engine.init()).toThrow(/cycle/)
  })

  it('错误隔离：handler 抛错后，同事件的后续 handler 仍然执行', () => {
    const errors: unknown[] = []
    const engine = new EngineContainer().onError((err) => errors.push(err)).init()
    const h2 = vi.fn()
    engine.on('test:ping', () => {
      throw new Error('boom')
    })
    engine.on('test:ping', h2)
    engine.emit('test:ping', { v: 1 })
    expect(h2).toHaveBeenCalledOnce()
    expect(errors).toHaveLength(1)
    expect((errors[0] as Error).message).toBe('boom')
  })

  it('pause / resume：pausable=true 的 handler 在 paused 时不触发；pausable=false 仍然触发', () => {
    const log: string[] = []
    const bg: EnginePlugin<'bg', readonly []> = {
      namespace: 'bg',
      pausable: true,
      install({ engine }) {
        engine.mount('bg', new FakeContainer())
        engine.on('test:tick', () => log.push('bg'))
      },
    }
    const ui: EnginePlugin<'ui', readonly []> = {
      namespace: 'ui',
      pausable: false,
      install({ engine }) {
        engine.mount('ui', new FakeContainer())
        engine.on('test:tick', () => log.push('ui'))
      },
    }
    const engine = new EngineContainer().register(bg, ui).init()

    engine.emit('test:tick', { turn: 1 })
    expect(log).toEqual(['bg', 'ui'])

    log.length = 0
    engine.pause()
    expect(engine.paused).toBe(true)
    engine.emit('test:tick', { turn: 2 })
    expect(log).toEqual(['ui'])

    log.length = 0
    engine.resume()
    expect(engine.paused).toBe(false)
    engine.emit('test:tick', { turn: 3 })
    expect(log).toEqual(['bg', 'ui'])
  })

  it("queue / consume 往返：queue('log', x) 后 consume('log') 返回累积，再次 consume 返回 []", () => {
    const engine = new EngineContainer()
    expect(engine.consume('test:log')).toEqual([])
    engine.queue('test:log', 'a')
    engine.queue('test:log', 'b')
    expect(engine.consume('test:log')).toEqual(['a', 'b'])
    expect(engine.consume('test:log')).toEqual([])
    engine.queue('test:log', 'c')
    expect(engine.consume('test:log')).toEqual(['c'])
  })

  it('inspect() 返回正确的监听数量、队列积压长度和插件顺序', () => {
    const a: EnginePlugin<'a', readonly []> = {
      namespace: 'a',
      install({ engine }) {
        engine.mount('a', new FakeContainer())
        engine.on('test:ping', () => {})
        engine.on('test:tick', () => {})
      },
    }
    const b: EnginePlugin<'b', readonly ['a']> = {
      namespace: 'b',
      dependencies: ['a'] as const,
      install({ engine }) {
        engine.mount('b', new FakeContainer())
        engine.on('test:ping', () => {})
      },
    }
    const engine = new EngineContainer().register(b, a).init()
    engine.queue('test:log', 'm1')
    engine.queue('test:log', 'm2')

    const snap = engine.inspect()
    expect(snap.pluginOrder).toEqual(['a', 'b'])
    expect(snap.eventListeners['test:ping']).toBe(2)
    expect(snap.eventListeners['test:tick']).toBe(1)
    expect(snap.queueLengths['test:log']).toBe(2)
    expect(snap.paused).toBe(false)
    expect(Object.keys(snap.containers).sort()).toEqual(['a', 'b'])
  })

  it('saveAll / restoreAll 往返：save 后 restore，插件状态一致', () => {
    let restored: unknown
    const payload = { token: 'A1', count: 7 }
    const a: EnginePlugin<'a', readonly []> = {
      namespace: 'a',
      install({ engine }) {
        engine.mount('a', new FakeContainer())
      },
      onSave() {
        return payload
      },
      onRestore(data) {
        restored = data
      },
    }
    const dump = new EngineContainer().register(a).init().saveAll()
    expect(dump).toEqual({ a: payload })

    new EngineContainer().register(a).init().restoreAll(dump)
    expect(restored).toEqual(payload)
  })
})
