// plugins/battle-plugin — 战斗协调中枢 + useSkill 宿主 + 确定性回放。
//
// 三重职责：
//   1. 回合协调：runTurn 推进 timeline、广播 turn 事件、调用 BattleMode.executeTurn、判胜负
//   2. useSkill 宿主：所有伤害事件通过 this.engine.emit；所有随机判定通过 this.rng
//   3. 确定性回放：start 时记录 seed → exportRecord 导出 record → replay 复刻战斗

import { Buff, BuffPool } from '../combat/buff'
import { applyBehavior, evalConditions, type EffectData } from '../combat/effect'
import {
  execBuffMount,
  execBuffRemove,
  execBuffTick,
  initBuffPool,
  mountPassiveBuffs,
} from '../combat/executor'
import { calcDamageEvent } from '../core/calc'
import { createRng, randomSeed } from '@xwink/engine'
import {
  resolveSkill,
  sampleMultiplier,
  type MultiplierDef,
  type SkillData,
  type SkillTrigger,
} from '../combat/skill'
import { buildBattleContext } from '../combat/timeline'
import type { TurnResult, UseSkillResult, BattleContext } from '../combat/types'
import type { BattleMode } from '../combat/runner'
import type { BattleLogEntry } from '../meta/types'
import type { Unit, UnitData, UnitSnapshot } from '../core/unit'
import type { EngineContainer, EnginePlugin } from '@xwink/engine'
import type { UnitContainer } from './unit-plugin'
import type { TimelineContainer } from './timeline-plugin'
import { BASE_ACTION_COST } from './timeline-plugin'

// ── BattleRecord 类型（确定性回放结构）───────────────────────────────────────

/** 当前引擎版本：随 useSkill 公式 / 事件序列变化时升 minor */
export const ENGINE_VERSION = '1.0.0'

export type BattleRecord = {
  /** 引擎版本，replay 时不匹配则抛错（不允许静默降级） */
  version: string
  /** PRNG 种子，用相同种子重跑产生完全相同的随机序列 */
  seed: number
  player: {
    data: UnitData
    snapshot?: UnitSnapshot
  }
  enemy: UnitData
  /** 人类可读日志，仅用于展示，不参与推演 */
  log: BattleLogEntry[]
}

// ── 胜负条件 ────────────────────────────────────────────────────────────────

export interface WinCondition {
  check(state: {
    unit: UnitContainer
    timeline: TimelineContainer
    turn: number
  }): 'win' | 'lose' | 'continue'
}

/** 默认实现：玩家 HP≤0 为败，敌方 HP≤0 为胜 */
export class HPWinCondition implements WinCondition {
  constructor(
    private readonly playerId: string,
    private readonly enemyId: string,
  ) {}

  check({
    unit,
  }: {
    unit: UnitContainer
    timeline: TimelineContainer
    turn: number
  }): 'win' | 'lose' | 'continue' {
    if (unit.get(this.enemyId).health.value <= 0) return 'win'
    if (unit.get(this.playerId).health.value <= 0) return 'lose'
    return 'continue'
  }
}

// ── runTurn 结果 ─────────────────────────────────────────────────────────────

export type CoordinatorTurnResult = {
  actor: Unit
  opponent: Unit
  turnResult: TurnResult
  /** 无法行动时的日志条目；正常行动为 null（日志已在 TurnResult 内） */
  skipLog: BattleLogEntry | null
  /** null = 战斗继续 */
  battleResult: 'win' | 'lose' | null
}

// ── namespace 扩充：声明全量 Engine.Events ──────────────────────────────────

declare module '@xwink/engine' {
  namespace Engine {
    interface Containers {
      battle: BattleContainer
    }
    interface Events {
      'turn:start': { actor: Unit; opponent: Unit; turn: number }
      'turn:end': { actor: Unit; opponent: Unit; turn: number }
      'cast:start': { actor: Unit; target: Unit; turn: number; isUltimate?: boolean }
      'cast:end': { actor: Unit; target: Unit; turn: number; isUltimate?: boolean }
      'hit:pre': { actor: Unit; target: Unit; turn: number; cancel: boolean }
      'hit:start': { actor: Unit; target: Unit; turn: number; isCounter?: boolean }
      'hit:end': { actor: Unit; target: Unit; turn: number; isCounter?: boolean }
      'hit:post': { actor: Unit; target: Unit; turn: number }
      'hit:crit': { actor: Unit; target: Unit; turn: number }
      'hit:miss': { actor: Unit; target: Unit; turn: number }
      'damage:dealt': { actor: Unit; target: Unit; turn: number; amount: number }
      'damage:taken': { actor: Unit; target: Unit; turn: number; amount: number }
      'combo:start': { actor: Unit; target: Unit; turn: number }
      'combo:post': { actor: Unit; target: Unit; turn: number }
      'skill:ultimate': { actor: Unit; target: Unit; turn: number }
      'battle:end': { result: 'win' | 'lose' }

      // ── 细粒度子事件（供 effect 系统的 fine-grained hook 使用）──────────────
      'effect:event-start': { actor: Unit; target: Unit; turn: number }
      'effect:event-end': { actor: Unit; target: Unit; turn: number }
      'effect:resist': { actor: Unit; target: Unit; turn: number }
      'effect:effect-start': { actor: Unit; target: Unit; turn: number }
      'effect:effect-end': { actor: Unit; target: Unit; turn: number }
      'effect:pre': { actor: Unit; target: Unit; turn: number }
      'effect:post': { actor: Unit; target: Unit; turn: number }
      'cast:target-start': { actor: Unit; target: Unit; turn: number; isUltimate?: boolean }
      'cast:target-end': { actor: Unit; target: Unit; turn: number; isUltimate?: boolean }
      'combo:pre': { actor: Unit; target: Unit; turn: number }
      'combo:end': { actor: Unit; target: Unit; turn: number }
      'unit:killed': { id: string; killedBy: string }
    }
  }
}

// ── BattleContext 构造（迁移自 timeline.buildBattleContext，由 BattleContainer 拥有）

// ── 倍率规范化辅助（由实例方法取 rng） ─────────────────────────────────────

function multMax(m: number | MultiplierDef): number {
  return typeof m === 'number' ? m : m.max
}

// ── BattleContainer ─────────────────────────────────────────────────────────

export type UseSkillOptions = {
  skipCombo?: boolean
  skipCounter?: boolean
  isUltimate?: boolean
}

export class BattleContainer {
  private rng!: () => number
  private _seed = 0
  private _record: BattleRecord = {
    version: ENGINE_VERSION,
    seed: 0,
    player: { data: {} as UnitData },
    enemy: {} as UnitData,
    log: [],
  }
  private _turn = 0
  private _winCondition: WinCondition = new HPWinCondition('', '')
  private _started = false

  constructor(
    private readonly engine: EngineContainer,
    private readonly deps: {
      unit: UnitContainer
      timeline: TimelineContainer
    },
  ) {}

  // ── 初始化 ─────────────────────────────────────────────────────────────────

  /** 战斗开始：创建 player + enemy 单位、初始化 timeline、生成种子、初始化 record */
  start(
    player: { data: UnitData; snapshot?: UnitSnapshot },
    enemy: UnitData,
    options: { seed?: number } = {},
  ): void {
    const seed = options.seed ?? randomSeed()
    this._seed = seed
    this.rng = createRng(seed)

    const { unit, timeline } = this.deps

    unit.create(player.data)
    if (player.snapshot) unit.restore(player.snapshot)
    unit.create(enemy)
    initBuffPool(unit.get(player.data.id))
    initBuffPool(unit.get(enemy.id))

    timeline.init([unit.get(player.data.id), unit.get(enemy.id)])

    // 挂载双方被动 buff（来自 skill.role === 'passive'）
    const playerUnit = unit.get(player.data.id)
    const enemyUnit = unit.get(enemy.id)
    mountPassiveBuffs(playerUnit, enemyUnit, 0, this._battleStateView())
    mountPassiveBuffs(enemyUnit, playerUnit, 0, this._battleStateView())

    this._record = {
      version: ENGINE_VERSION,
      seed,
      player: { data: player.data, snapshot: player.snapshot },
      enemy,
      log: [],
    }
    this._turn = 0
    this._winCondition = new HPWinCondition(player.data.id, enemy.id)
    this._started = true

    // 通知所有插件会话已开始（业务插件用来初始化匿名 buff 等）
    this.engine.notifySessionStart()
  }

  /** 回放：从 BattleRecord 复刻战斗，相同 seed 产生相同事件序列 */
  replay(record: BattleRecord): void {
    if (record.version !== ENGINE_VERSION) {
      throw new Error(
        `BattleContainer.replay: version mismatch (record=${record.version}, engine=${ENGINE_VERSION})`,
      )
    }
    this.start(record.player, record.enemy, { seed: record.seed })
  }

  /** 设置胜负条件，覆盖默认（player.hp<=0 lose / enemy.hp<=0 win） */
  setWinCondition(wc: WinCondition): this {
    this._winCondition = wc
    return this
  }

  /** 导出录像：可重新通过 replay 回放 */
  exportRecord(): BattleRecord {
    return JSON.parse(JSON.stringify(this._record)) as BattleRecord
  }

  // ── 回合推进 ──────────────────────────────────────────────────────────────

  runTurn(mode: BattleMode): CoordinatorTurnResult {
    if (!this._started) {
      throw new Error('BattleContainer.runTurn: call start() first')
    }
    const { timeline, unit } = this.deps
    const actor = timeline.advance()
    const opponent = unit.all().find((u) => u !== actor)!
    const actorState = timeline.getState(actor.id)
    const timelinePosition = actorState.actionValue
    const turn = this._turn

    this.engine.emit('turn:start', { actor, opponent, turn })

    let turnResult: TurnResult
    let skipLog: BattleLogEntry | null = null

    if (!actorState.canAct) {
      timeline.setState(actor.id, {
        actionValue: actorState.actionValue + BASE_ACTION_COST / actor.getStat('spd'),
        turnsSinceLastUlt: actorState.turnsSinceLastUlt + 1,
      })
      turnResult = { skipped: true, isUltFallback: false, ultScale: 1 }
      skipLog = {
        turn,
        actor: actor.name,
        skill: '（无法行动）',
        target: opponent.name,
        damage: 0,
        isCrit: false,
        timelinePosition,
      }
    } else {
      // 把 useSkill 注入给 BattleMode，避免 mode 依赖 BattleContainer 实例。
      turnResult = mode.executeTurn(
        actor,
        opponent,
        turn,
        this._battleStateView(),
        (skill, a, t, tt, tp, opt) => this.useSkill(skill, a, t, tt, tp, opt),
      )
      timeline.setState(actor.id, {
        actionValue: timelinePosition + BASE_ACTION_COST / actor.getStat('spd'),
      })
    }

    this.engine.emit('turn:end', { actor, opponent, turn })

    // 两阶段删除收尾：所有 turn:end handler（含 EngineHandlersPlugin.tickBuffDuration
    // 和业务插件）跑完后，统一 sweep expired buff。
    // 此刻不再有人遍历 BuffPool._list，移除是安全的。
    this.sweepBuffs(actor.id)
    this.sweepBuffs(opponent.id)

    // 日志归档
    if (skipLog) this._record.log.push(skipLog)
    if (turnResult.normalResult) this._record.log.push(turnResult.normalResult.log)
    if (turnResult.ultimateResult) this._record.log.push(turnResult.ultimateResult.log)

    this._turn++

    const checkResult = this._winCondition.check({
      unit: this.deps.unit,
      timeline: this.deps.timeline,
      turn: this._turn,
    })
    const battleResult = checkResult !== 'continue' ? checkResult : null
    if (battleResult) {
      this.engine.emit('battle:end', { result: battleResult })
      this.engine.notifySessionEnd(battleResult)
    }

    return { actor, opponent, turnResult, skipLog, battleResult }
  }

  /** 给 BattleMode 看的 BattleState 视图（兼容旧 BattleMode 接口） */
  private _battleStateView(): Map<
    string,
    { canAct: boolean; actionValue: number; turnsSinceLastUlt: number }
  > {
    const m = new Map<string, { canAct: boolean; actionValue: number; turnsSinceLastUlt: number }>()
    for (const u of this.deps.unit.all()) {
      const s = this.deps.timeline.getState(u.id)
      // 同引用：返回 timeline 内部 state，让 BattleMode 修改 turnsSinceLastUlt 反映回去
      m.set(u.id, s)
    }
    return m
  }

  // ── useSkill（伤害结算入口；所有伤害事件走 this.engine.emit，所有随机判定走 this.rng） ──

  private useSkill(
    skill: SkillData,
    actor: Unit,
    target: Unit,
    turn: number,
    timelinePosition?: number,
    options: UseSkillOptions = {},
  ): UseSkillResult {
    const { timeline } = this.deps
    const battleState = this._battleStateView()
    const s = resolveSkill(skill)
    const effects = s.effects ?? []
    const triggers = s.triggers ?? []

    const energyBefore = actor.getStat('energy')

    const selfCtx = buildBattleContext(actor, target, turn, battleState)
    const targetCtx = buildBattleContext(target, actor, turn, battleState)

    this.engine.emit('cast:start', { actor, target, turn, isUltimate: options.isUltimate })
    this._executeEffects(effects, actor, target, selfCtx, targetCtx)

    this.engine.emit('cast:target-start', { actor, target, turn, isUltimate: options.isUltimate })

    const effectiveDodge = Math.max(
      0,
      target.getStat('dodge') - Math.max(0, actor.getStat('hit') - 100),
    )
    const isDodge = multMax(s.multiplier) > 0 && this.rng() < effectiveDodge / 100

    if (isDodge) this.engine.emit('hit:miss', { actor, target, turn })

    let damage = 0
    let anyCrit = false
    if (multMax(s.multiplier) > 0 && !isDodge) {
      this.engine.emit('hit:start', { actor, target, turn })
      const hits = s.hits ?? 1
      for (let h = 0; h < hits; h++) {
        const hit = this._calcOneHit(s, actor, target, turn)
        damage += hit.hpDamage
        if (hit.isCrit) anyCrit = true
      }
      if (anyCrit) this._fireTriggers(triggers, 'onCrit', actor, target, selfCtx, targetCtx)
      if (damage > 0) this._fireTriggers(triggers, 'onHit', actor, target, selfCtx, targetCtx)
      this.engine.emit('hit:end', { actor, target, turn })
    }

    let isCombo = false
    if (!options.skipCombo) {
      const effectiveCombo = Math.min(actor.getStat('combo'), 50)
      if (!isDodge && damage > 0 && this.rng() < effectiveCombo / 100) {
        isCombo = true
        this.engine.emit('combo:start', { actor, target, turn })
        this.engine.emit('combo:pre', { actor, target, turn })
        const comboSkill: SkillData = { id: '_combo', name: '', tags: [], multiplier: 1.0 }
        const comboHit = this._calcOneHit(comboSkill, actor, target, turn, true)
        damage += comboHit.hpDamage
        this._fireTriggers(triggers, 'onCombo', actor, target, selfCtx, targetCtx)
        this.engine.emit('combo:post', { actor, target, turn })
        this.engine.emit('combo:end', { actor, target, turn })
      }
    }

    this.engine.emit('cast:target-end', { actor, target, turn, isUltimate: options.isUltimate })

    target.health.add(-damage)

    if (damage > 0 && target.health.value <= 0) {
      this._fireTriggers(triggers, 'onKill', actor, target, selfCtx, targetCtx)
      // killedBy 通过 actor.id 注入
      this.engine.emit('unit:killed', { id: target.id, killedBy: actor.id })
    }

    if (options.isUltimate && !isDodge) this.engine.emit('skill:ultimate', { actor, target, turn })

    let counterDamage = 0
    if (
      !options.skipCounter &&
      !isDodge &&
      damage > 0 &&
      this.rng() < target.getStat('counter') / 100
    ) {
      const counterSkill: SkillData = { id: '_counter', name: '', tags: [], multiplier: 1.0 }
      this.engine.emit('hit:start', { actor: target, target: actor, turn, isCounter: true })
      const counterHit = this._calcOneHit(counterSkill, target, actor, turn, true)
      counterDamage = counterHit.hpDamage
      actor.health.add(-counterDamage)
      this.engine.emit('hit:end', { actor: target, target: actor, turn, isCounter: true })
    }

    this.engine.emit('cast:end', { actor, target, turn, isUltimate: options.isUltimate })

    // timeline 仅作旁路；timelinePosition 仅用于日志
    void timeline

    return {
      damage,
      isCrit: anyCrit && !isDodge,
      isDodge,
      isCombo,
      counterDamage,
      log: {
        turn,
        actor: actor.name,
        skill: s.name,
        target: target.name,
        damage,
        isCrit: anyCrit && !isDodge,
        isDodge,
        isCombo,
        counterDamage,
        energyBefore,
        energyAfter: actor.getStat('energy'),
        timelinePosition,
        isUltimate: options.isUltimate,
      },
    }
  }

  // ── 内部：单段命中 ────────────────────────────────────────────────────────

  private _sampleMult(m: number | MultiplierDef): number {
    if (typeof m === 'number') return m
    return sampleMultiplier(m, this.rng)
  }

  private _calcOneHit(
    skill: SkillData,
    actor: Unit,
    target: Unit,
    turn: number,
    noCrit = false,
  ): { hpDamage: number; isCrit: boolean } {
    const formula = skill.damageFormula ?? 'atk_vs_def'
    const skipFlat = formula === 'hp_pct' || formula === 'fixed'
    const mult = this._sampleMult(skill.multiplier)

    let skillBase: number
    switch (formula) {
      case 'atk_true':
        skillBase = Math.max(1, mult * actor.getStat('atk'))
        break
      case 'hp_pct':
        skillBase = target.health.value * mult
        break
      case 'fixed':
        skillBase = mult
        break
      default:
        skillBase = Math.max(1, mult * actor.getStat('atk') - target.getStat('def'))
    }

    const isCrit = !noCrit && this.rng() < actor.getStat('crit') / 100
    const critMultiplier = isCrit ? actor.getStat('critDmg') / 100 : 1

    const preCtx = { actor, target, turn, cancel: false }
    this.engine.emit('hit:pre', preCtx)
    if (preCtx.cancel) return { hpDamage: 0, isCrit: false }
    if (isCrit) this.engine.emit('hit:crit', { actor, target, turn })

    const damageReduction = Math.min(1, Math.max(0, target.getStat('damageReduction')))
    const armorPen = Math.min(
      1,
      Math.max(0, actor.getStat('armorPen') / 100 + (skill.armorPen ?? 0)),
    )
    const shield = target.shield.value

    const result = calcDamageEvent({
      skillBase,
      skipFlat,
      baseFlat: 0,
      basePercent: 0,
      finalFlat: 0,
      finalPercent: actor.getStat('damageFinalPct'),
      critMultiplier,
      damageReduction,
      armorPen,
      shield,
    })

    if (result.shieldAbsorb > 0) target.shield.add(-result.shieldAbsorb)

    if (result.hpDamage > 0) {
      this.engine.emit('damage:dealt', { actor, target, turn, amount: result.hpDamage })
      this.engine.emit('damage:taken', { actor, target, turn, amount: result.hpDamage })
    }
    this.engine.emit('hit:post', { actor, target, turn })

    return { hpDamage: result.hpDamage, isCrit }
  }

  // ── 内部：effect 执行 ─────────────────────────────────────────────────────

  private _executeEffect(
    effect: EffectData,
    actor: Unit,
    target: Unit,
    selfCtx: BattleContext,
    targetCtx: BattleContext,
  ): void {
    const turn = selfCtx.turn
    this.engine.emit('effect:event-start', { actor, target, turn })

    if (!evalConditions(effect.condition, selfCtx)) {
      this.engine.emit('effect:resist', { actor, target, turn })
      this.engine.emit('effect:event-end', { actor, target, turn })
      return
    }

    const tgt = effect.target === 'enemy' ? target : actor
    const ctx = effect.target === 'enemy' ? targetCtx : selfCtx

    this.engine.emit('effect:effect-start', { actor, target, turn })
    this.engine.emit('effect:pre', { actor, target, turn })

    switch (effect.behavior.kind) {
      case 'cost': {
        const b = effect.behavior
        const prop = (
          actor.props as unknown as Record<
            string,
            { value: number; max: number; add: (n: number) => void } | undefined
          >
        )[b.stat]
        if (prop) {
          const amount = b.mode === 'pct' ? prop.max * b.value : b.value
          prop.add(-amount)
        }
        break
      }
      case 'heal': {
        const b = effect.behavior
        const prop = (
          tgt.props as unknown as Record<string, { add: (n: number) => void } | undefined>
        )[b.stat]
        if (prop) prop.add(b.value)
        break
      }
      case 'buff':
        execBuffMount(tgt, new Buff(effect.behavior.data), ctx)
        break
      default:
        applyBehavior(effect.when, effect.behavior, ctx, 1, '', effect.id, effect.target)
    }

    this.engine.emit('effect:post', { actor, target, turn })
    this.engine.emit('effect:effect-end', { actor, target, turn })
    this.engine.emit('effect:event-end', { actor, target, turn })
  }

  private _executeEffects(
    effects: EffectData[],
    actor: Unit,
    target: Unit,
    selfCtx: BattleContext,
    targetCtx: BattleContext,
  ): void {
    for (const e of effects) this._executeEffect(e, actor, target, selfCtx, targetCtx)
  }

  private _fireTriggers(
    triggers: SkillTrigger[],
    event: SkillTrigger['on'],
    actor: Unit,
    target: Unit,
    selfCtx: BattleContext,
    targetCtx: BattleContext,
  ): void {
    for (const t of triggers) {
      if (t.on !== event) continue
      if (t.chance !== undefined && this.rng() >= t.chance) continue
      this._executeEffects(t.effects ?? [], actor, target, selfCtx, targetCtx)
    }
  }

  // ── Buff 生命周期外部触发（供 EngineHandlersPlugin 用） ─────────────────

  /** 在指定 unit 上执行 buff effects 的特定 when（turnStart / turnEnd / 等） */
  triggerBuffWhen(unitId: string, when: EffectData['when']): void {
    const unit = this.deps.unit.get(unitId)
    const opp = this.deps.unit.all().find((u) => u !== unit)
    const ctx = buildBattleContext(unit, opp ?? unit, this._turn, this._battleStateView())
    execBuffTick(unit, when, ctx)
  }

  /**
   * 在指定 unit 上执行 buff duration 衰减 + 标记 expired（不立即移除）。
   * sweepBuffs 在 turn:end handler 全部完成后由调用方触发。
   */
  tickBuffDuration(unitId: string): void {
    const unit = this.deps.unit.get(unitId)
    const pool = unit.buffs as BuffPool
    // tick duration（不通过 markExpired，因为 BuffPool.tickDuration 会做删除）
    // 这里改为：先 tick，再 mark；sweep 留给 sweepBuffs
    for (const b of pool.all) b.duration--
    for (const b of pool.all) {
      if (b.expired) {
        // 走两阶段：先把 unmount effects + propMod 清除立刻处理（在 turn:end handler 内）
        const opp = this.deps.unit.all().find((u) => u !== unit) ?? unit
        const ctx = buildBattleContext(unit, opp, this._turn, this._battleStateView())
        for (const { sourceKey } of b.propMods()) {
          applyBehavior(
            'unmount',
            { kind: 'propMod', stat: 'atk', mode: 'baseFlat', value: 0 },
            ctx,
            1,
            sourceKey,
          )
        }
        for (const e of b.collect('unmount')) {
          applyBehavior(e.when, e.behavior, ctx, b.stack.value, '', e.id, e.target)
        }
      }
    }
    // expired buff 仍留在池中等待 sweepBuffs 统一清除
  }

  /** 调用 BuffPool.sweep 清除已 expired 的 buff（两阶段第二步） */
  sweepBuffs(unitId: string): void {
    const pool = this.deps.unit.get(unitId).buffs as BuffPool
    pool.sweep()
  }

  /** 战斗内 buff 主动挂载（供业务层匿名状态 buff 等业务入口使用） */
  mountBuff(unitId: string, buff: Buff): void {
    const unit = this.deps.unit.get(unitId)
    const opp = this.deps.unit.all().find((u) => u !== unit) ?? unit
    const ctx = buildBattleContext(unit, opp, this._turn, this._battleStateView())
    execBuffMount(unit, buff, ctx)
  }

  /** 战斗内 buff 主动卸载（供业务层刷新业务状态 buff 等使用） */
  unmountBuff(unitId: string, buffId: string): void {
    const unit = this.deps.unit.get(unitId)
    const opp = this.deps.unit.all().find((u) => u !== unit) ?? unit
    const ctx = buildBattleContext(unit, opp, this._turn, this._battleStateView())
    execBuffRemove(unit, buffId, ctx)
  }

  /** 当前回合数（供调试 / 业务插件读取） */
  get turn(): number {
    return this._turn
  }

  /** 当前种子（供调试） */
  get seed(): number {
    return this._seed
  }

  // ── 序列化（供 store 层 Sandbox 使用）────────────────────────────────────

  serialize(): { record: BattleRecord; turn: number; seed: number; started: boolean } {
    return {
      record: JSON.parse(JSON.stringify(this._record)) as BattleRecord,
      turn: this._turn,
      seed: this._seed,
      started: this._started,
    }
  }

  hydrate(snap: { record: BattleRecord; turn: number; seed: number; started: boolean }): void {
    this._record = JSON.parse(JSON.stringify(snap.record)) as BattleRecord
    this._turn = snap.turn
    this._seed = snap.seed
    this._started = snap.started
    this.rng = createRng(snap.seed)
  }
}

// ── BattlePlugin ────────────────────────────────────────────────────────────

export const BattlePlugin: EnginePlugin<'battle', readonly ['unit', 'timeline']> = {
  namespace: 'battle',
  dependencies: ['unit', 'timeline'] as const,
  install({ engine, deps }) {
    engine.mount('battle', new BattleContainer(engine, deps))
  },
}
