import { describe, it, expect, vi } from 'vitest'
import { EngineContainer } from '@xwink/engine'
import {
  BattlePlugin,
  EngineHandlersPlugin,
  TimelinePlugin,
  UnitPlugin,
  type BattleMode,
  type UnitData,
} from '@xwink/rpg'

function makeData(overrides: Partial<UnitData> = {}): UnitData {
  return {
    id: 'p',
    name: 'P',
    health: 100,
    energy: 50,
    str: 10,
    con: 8,
    agi: 10,
    int: 4,
    lck: 2,
    skills: [{ id: 'atk', name: '普通攻击', tags: [], multiplier: 1.0 }],
    ...overrides,
  }
}

class StubMode implements BattleMode {
  executeTurn() {
    return { skipped: false, isUltFallback: false, ultScale: 1 }
  }
}

function setup(seed = 1234) {
  const engine = new EngineContainer()
    .register(UnitPlugin, TimelinePlugin, BattlePlugin, EngineHandlersPlugin)
    .init()
  const battle = engine.get('battle')
  battle.start({ data: makeData({ id: 'player' }) }, makeData({ id: 'enemy', name: 'E' }), { seed })
  return { engine, battle, unit: engine.get('unit'), timeline: engine.get('timeline') }
}

describe('C07 / BattlePlugin install', () => {
  it('register 顺序无关，install 后可拿到 BattleContainer', () => {
    const engine = new EngineContainer()
      .register(EngineHandlersPlugin, BattlePlugin, TimelinePlugin, UnitPlugin)
      .init()
    expect(engine.get('battle')).toBeDefined()
  })
})

describe('C07 / start / runTurn', () => {
  it('start 后 unit / timeline 容器就绪', () => {
    const { unit, timeline } = setup()
    expect(unit.has('player')).toBe(true)
    expect(unit.has('enemy')).toBe(true)
    expect(timeline.getState('player').actionValue).toBe(0)
  })

  it('runTurn 选取 actor / opponent，actionValue 累加，turn:start/turn:end 同步发射', () => {
    const { engine, battle } = setup()
    const turnStart = vi.fn()
    const turnEnd = vi.fn()
    engine.on('turn:start', turnStart)
    engine.on('turn:end', turnEnd)

    const r = battle.runTurn(new StubMode())
    expect(r.actor.id).toBe('player') // p/e agi 同 spd 同 → 顺序保留 → player
    expect(turnStart).toHaveBeenCalledOnce()
    expect(turnEnd).toHaveBeenCalledOnce()
  })

  it('未 start 调 runTurn 抛错', () => {
    const engine = new EngineContainer().register(UnitPlugin, TimelinePlugin, BattlePlugin).init()
    expect(() => engine.get('battle').runTurn(new StubMode())).toThrow(/start\(\)/)
  })
})

describe('C07 / 确定性回放', () => {
  it('exportRecord 后 replay 同种子 → 同 RNG 序列', () => {
    const { battle } = setup(42)
    const seedBefore = battle.seed
    const r1 = battle.exportRecord()
    expect(r1.seed).toBe(seedBefore)

    // 用同 record 在新 engine 内 replay，应当产生相同种子
    const engine2 = new EngineContainer()
      .register(UnitPlugin, TimelinePlugin, BattlePlugin, EngineHandlersPlugin)
      .init()
    const battle2 = engine2.get('battle')
    battle2.replay(r1)
    expect(battle2.seed).toBe(42)
  })

  it('replay 版本不匹配抛错', () => {
    const { battle } = setup()
    const r = battle.exportRecord()
    r.version = '0.0.0-broken'
    const engine2 = new EngineContainer().register(UnitPlugin, TimelinePlugin, BattlePlugin).init()
    expect(() => engine2.get('battle').replay(r)).toThrow(/version mismatch/)
  })
})

describe('C07 / EngineHandlersPlugin 两阶段删除', () => {
  it('turn:end → tick duration → sweep，duration=1 的 buff 在第一回合 turn:end 后被移除', () => {
    const { battle, unit } = setup()
    // 给 player 挂一个 duration=1 的 buff，turn:end 后应被移除
    const token = unit.grantBuff('player', {
      id: 'tmp',
      name: 'tmp',
      duration: 1,
      effects: [],
    })
    expect(token).toBeDefined()
    expect(unit.get('player').buffs.all.length).toBe(1)

    battle.runTurn(new StubMode())
    // 第一个回合 actor=player（agi 同 spd 同 → 注册顺序），turn:end 后 sweep
    expect(unit.get('player').buffs.all.length).toBe(0)
  })
})
