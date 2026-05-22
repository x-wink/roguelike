import { describe, it, expect } from 'vitest'
import { EngineContainer } from '@xwink/engine'
import { BuffFactory, UnitContainer, UnitPlugin, type UnitData } from '@xwink/rpg'

function makeData(overrides: Partial<UnitData> = {}): UnitData {
  return {
    id: 'hero',
    name: 'Hero',
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

function setup() {
  const engine = new EngineContainer().register(UnitPlugin).init()
  const unit = engine.get('unit')
  return { engine, unit }
}

describe('C04 / UnitPlugin install', () => {
  it('install 后 engine.get("unit") 拿到 UnitContainer 实例', () => {
    const { unit } = setup()
    expect(unit).toBeInstanceOf(UnitContainer)
  })
})

describe('C04 / 数据入口与出口', () => {
  it('create(data) 内部组装 Unit，外部不持有实例', () => {
    const { unit } = setup()
    unit.create(makeData())
    expect(unit.has('hero')).toBe(true)
    const snap = unit.snapshot('hero')
    expect(snap.id).toBe('hero')
    expect(snap.name).toBe('Hero')
    expect(snap.props.health?.value).toBe(100)
  })

  it('create 同 id 重复挂载抛错', () => {
    const { unit } = setup()
    unit.create(makeData())
    expect(() => unit.create(makeData())).toThrow(/already exists/)
  })

  it('snapshotAll 返回所有单位快照', () => {
    const { unit } = setup()
    unit.create(makeData({ id: 'a' }))
    unit.create(makeData({ id: 'b', name: 'B' }))
    const all = unit.snapshotAll()
    expect(all.map((s) => s.id).sort()).toEqual(['a', 'b'])
  })

  it('restore 从快照恢复 props 与 buffs', () => {
    const { unit } = setup()
    unit.create(makeData())
    unit.get('hero').health.add(-30)
    const snap = unit.snapshot('hero')

    const { unit: unit2 } = setup()
    unit2.restore(snap)
    expect(unit2.snapshot('hero').props.health?.value).toBe(70)
  })

  it('未注册 id 调 snapshot / get 抛错', () => {
    const { unit } = setup()
    expect(() => unit.get('ghost')).toThrow(/not found/)
    expect(() => unit.snapshot('ghost')).toThrow(/not found/)
  })
})

describe('C04 / Buff token-based 管理', () => {
  it('grantBuff 返回不同 token，buff 进入 BuffPool', () => {
    const { unit } = setup()
    unit.create(makeData())
    const t1 = unit.grantBuff('hero', BuffFactory.buffStat({ stat: 'atk', value: 0.2 }))
    const t2 = unit.grantBuff('hero', BuffFactory.buffStat({ stat: 'def', value: 0.1 }))
    expect(t1).not.toBe(t2)
    // BuffPool 存入两条不同 id 的 buff
    expect(unit.get('hero').buffs.all.length).toBe(2)
  })

  it('revokeBuff 标记 expired，sweepBuffs 后从 BuffPool 移除', () => {
    const { unit } = setup()
    unit.create(makeData())
    const token = unit.grantBuff(
      'hero',
      BuffFactory.hot({ stat: 'health', amount: 5, duration: 3 }),
    )

    // revoke 只 mark，不立即移除
    unit.revokeBuff('hero', token)
    expect(unit.get('hero').buffs.all.length).toBe(1)
    expect(unit.get('hero').buffs.all[0].duration).toBe(0)
    expect(unit.get('hero').buffs.all[0].expired).toBe(true)

    // sweep 后移除
    unit.sweepBuffs('hero')
    expect(unit.get('hero').buffs.all.length).toBe(0)
  })

  it('revokeBuff 用错 unit id 不影响', () => {
    const { unit } = setup()
    unit.create(makeData({ id: 'a' }))
    unit.create(makeData({ id: 'b' }))
    const token = unit.grantBuff('a', BuffFactory.buffStat({ stat: 'atk', value: 0.2 }))
    unit.revokeBuff('b', token) // 错 id，应被忽略
    expect(unit.get('a').buffs.all.length).toBe(1)
    expect(unit.get('a').buffs.all[0].expired).toBe(false)
  })

  it('revokeBuff 用已撤销 token 二次调用安全（无副作用）', () => {
    const { unit } = setup()
    unit.create(makeData())
    const token = unit.grantBuff('hero', BuffFactory.buffStat({ stat: 'atk', value: 0.2 }))
    unit.revokeBuff('hero', token)
    expect(() => unit.revokeBuff('hero', token)).not.toThrow()
  })

  it('sweepBuffs 不影响未到期 buff', () => {
    const { unit } = setup()
    unit.create(makeData())
    unit.grantBuff('hero', BuffFactory.hot({ stat: 'health', amount: 5, duration: 3 }))
    unit.sweepBuffs('hero')
    expect(unit.get('hero').buffs.all.length).toBe(1)
  })
})
