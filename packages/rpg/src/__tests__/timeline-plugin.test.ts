import { describe, it, expect } from 'vitest'
import { EngineContainer } from '@xwink/engine'
import {
  BASE_ACTION_COST,
  TimelineContainer,
  TimelinePlugin,
  UnitPlugin,
  type UnitData,
} from '@xwink/rpg'

function makeData(overrides: Partial<UnitData> = {}): UnitData {
  return {
    id: 'a',
    name: 'A',
    health: 100,
    energy: 50,
    str: 10,
    con: 8,
    agi: 6,
    int: 4,
    lck: 2,
    skills: [],
    ...overrides,
  }
}

function setup(units: UnitData[] = []) {
  const engine = new EngineContainer().register(UnitPlugin, TimelinePlugin).init()
  const unitC = engine.get('unit')
  const timeline = engine.get('timeline')
  for (const d of units) unitC.create(d)
  return { engine, unit: unitC, timeline }
}

describe('C05 / TimelinePlugin install', () => {
  it('依赖 unit，install 后 engine.get("timeline") 拿到 TimelineContainer', () => {
    const { timeline } = setup()
    expect(timeline).toBeInstanceOf(TimelineContainer)
  })

  it('BASE_ACTION_COST 暴露常量值 100', () => {
    expect(BASE_ACTION_COST).toBe(100)
  })
})

describe('C05 / init', () => {
  it('init 为每个 unit 创建初始状态（canAct=true，actionValue=0，turnsSinceLastUlt=0）', () => {
    const { unit, timeline } = setup([makeData({ id: 'a' }), makeData({ id: 'b' })])
    timeline.init([unit.get('a'), unit.get('b')])
    expect(timeline.getState('a')).toEqual({ canAct: true, actionValue: 0, turnsSinceLastUlt: 0 })
    expect(timeline.getState('b')).toEqual({ canAct: true, actionValue: 0, turnsSinceLastUlt: 0 })
  })

  it('重复 init 重置状态', () => {
    const { unit, timeline } = setup([makeData({ id: 'a' })])
    timeline.init([unit.get('a')])
    timeline.setState('a', { actionValue: 50 })
    timeline.init([unit.get('a')])
    expect(timeline.getState('a').actionValue).toBe(0)
  })
})

describe('C05 / advance', () => {
  it('选取 actionValue 最小的 unit', () => {
    const { unit, timeline } = setup([makeData({ id: 'a' }), makeData({ id: 'b' })])
    timeline.init([unit.get('a'), unit.get('b')])
    timeline.setState('a', { actionValue: 10 })
    timeline.setState('b', { actionValue: 5 })
    expect(timeline.advance().id).toBe('b')
  })

  it('actionValue 相同时速度高者优先', () => {
    const { unit, timeline } = setup([
      makeData({ id: 'slow', agi: 4 }),
      makeData({ id: 'fast', agi: 20 }),
    ])
    timeline.init([unit.get('slow'), unit.get('fast')])
    timeline.setState('slow', { actionValue: 10 })
    timeline.setState('fast', { actionValue: 10 })
    expect(timeline.advance().id).toBe('fast')
  })

  it('未 init 调 advance 抛错', () => {
    const { timeline } = setup()
    expect(() => timeline.advance()).toThrow(/not initialized/)
  })
})

describe('C05 / getState / setState', () => {
  it('getState 未知 id 抛错', () => {
    const { timeline } = setup()
    expect(() => timeline.getState('ghost')).toThrow(/no battle state/)
  })

  it('setState 部分字段更新，其他字段保留', () => {
    const { unit, timeline } = setup([makeData({ id: 'a' })])
    timeline.init([unit.get('a')])
    timeline.setState('a', { canAct: false })
    expect(timeline.getState('a')).toEqual({
      canAct: false,
      actionValue: 0,
      turnsSinceLastUlt: 0,
    })
    timeline.setState('a', { actionValue: 25, turnsSinceLastUlt: 3 })
    expect(timeline.getState('a')).toEqual({
      canAct: false,
      actionValue: 25,
      turnsSinceLastUlt: 3,
    })
  })

  it('setState 未知 id 抛错', () => {
    const { timeline } = setup()
    expect(() => timeline.setState('ghost', { canAct: false })).toThrow(/no battle state/)
  })
})

describe('C05 / 多回合推进语义（手动累加 actionValue 模拟 BattleContainer 行为）', () => {
  it('每次行动后 actionValue += BASE_ACTION_COST / spd，下一行动者随之切换', () => {
    const { unit, timeline } = setup([
      makeData({ id: 'p', agi: 20 }), // spd=20，每次 +5
      makeData({ id: 'e', agi: 10 }), // spd=10，每次 +10
    ])
    timeline.init([unit.get('p'), unit.get('e')])

    // 回合 1：均为 0，p 速度高 → p 先动
    let actor = timeline.advance()
    expect(actor.id).toBe('p')
    timeline.setState('p', { actionValue: BASE_ACTION_COST / actor.getStat('spd') })

    // 回合 2：p=5, e=0 → e 行动
    actor = timeline.advance()
    expect(actor.id).toBe('e')
    timeline.setState('e', { actionValue: BASE_ACTION_COST / actor.getStat('spd') })

    // 回合 3：p=5, e=10 → p 行动
    actor = timeline.advance()
    expect(actor.id).toBe('p')
  })
})
