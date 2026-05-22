// game/modes/auto — 自动战斗模式。
// 根据能量自动选择技能（普通 / 大招），实现 BattleMode 接口。
// BattleContainer 保证 executeTurn 仅在 canAct = true 时被调用，此处无需重复检查。

import {
  Mult,
  type BattleMode,
  type BattleState,
  type TurnResult,
  type UseSkillFn,
  type Unit,
} from '@xwink/rpg'

/** 每回合充能量；游戏平衡常量，属于战斗模式配置 */
const TURN_ENERGY = 30

export class AutoBattleMode implements BattleMode {
  executeTurn(
    actor: Unit,
    opponent: Unit,
    turn: number,
    battleState: BattleState,
    useSkill: UseSkillFn,
  ): TurnResult {
    const actorState = battleState.get(actor.id)!
    actor.energy.add(TURN_ENERGY)

    const ult = actor.pool.resolvedUltimate
    const energyFull = actor.energy.value >= actor.energy.max
    const ultFallback = ult !== undefined && actorState.turnsSinceLastUlt >= 5
    const shouldFireUlt = ult !== undefined && (energyFull || ultFallback)

    const normal = actor.pool.resolvedNormal ?? actor.pool.raw[0]
    if (!normal) throw new Error(`Unit "${actor.name}" has no normal skill`)

    const normalResult = useSkill(normal, actor, opponent, turn)
    let ultimateResult = undefined
    let isUltFallback = false
    let ultScale = 1

    if (shouldFireUlt) {
      let resolvedUlt = ult!
      if (!energyFull && ultFallback) {
        isUltFallback = true
        ultScale = Math.max(actor.energy.value / actor.energy.max, 0.5)
        const baseMult = resolvedUlt.multiplier
        const scaledMult =
          typeof baseMult === 'number'
            ? baseMult * ultScale
            : Mult([baseMult.min * ultScale, baseMult.max * ultScale], baseMult.strategy)
        resolvedUlt = {
          ...resolvedUlt,
          multiplier: scaledMult,
          upgrades: undefined,
          upgradeLevel: 0,
        }
      }
      ultimateResult = useSkill(resolvedUlt, actor, opponent, turn, undefined, {
        skipCombo: true,
        skipCounter: true,
        isUltimate: true,
      })
      actorState.turnsSinceLastUlt = 0
    } else {
      actorState.turnsSinceLastUlt++
    }

    return { skipped: false, normalResult, ultimateResult, isUltFallback, ultScale }
  }
}

export const autoBattle = new AutoBattleMode()
