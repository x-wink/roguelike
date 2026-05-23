// game/session — 游戏层非战斗业务工具。
// 战斗组装迁入 EngineContainer，本文件只保留：
//   1. extractPlayerData / extractEnemyData：把 Player/Enemy 实例还原成可持久化 Data
//   2. createPlayerFromSnapshot：从 PlayerData + Snapshot 重建 Player（地图阶段使用）
//   3. applyEventEffect：地图事件 / 商店购买等战斗外副作用
//   4. createUnitFactory：注入给 UnitContainer，让其能产出 Player/Enemy 子类

import {
  Buff,
  initBuffPool,
  Prop,
  type EffectData,
  type SkillData,
  type Unit,
  type UnitData,
  type UnitSnapshot,
} from '@xwink/rpg'
import { EQUIPMENTS } from '@/data'
import { Enemy, type EnemyData } from '@/game/units/enemy'
import { Player, type PlayerData } from '@/game/units/player'
import type {
  EquipmentInstance,
  EquipPassive,
  EquipSlot,
  EventEffect,
  RelicData,
} from '@/game/meta/types'

// ── Unit 工厂注入（UnitContainer.setFactory）─────────────────────────────────

/** 通过 data.id 区分玩家与敌人；id === 'player' 视作玩家 */
export function createUnitFactory(): (data: UnitData) => Unit {
  return (data) => {
    if (data.id === 'player') return new Player(data as PlayerData)
    return new Enemy(data as EnemyData)
  }
}

// ── Player / Enemy 重建辅助 ──────────────────────────────────────────────────

function restoreBuffs(list: UnitSnapshot['buffs']): Buff[] {
  return list.map((bs) => {
    const b = new Buff(bs.data)
    b.duration = bs.duration
    b.stack.value = bs.stack
    return b
  })
}

/** 从 PlayerData + UnitSnapshot 重建 Player（地图阶段持久化恢复用）*/
export function createPlayerFromSnapshot(data: PlayerData, snap: UnitSnapshot): Player {
  const p = new Player(data)
  initBuffPool(p)
  p.restore(snap, restoreBuffs(snap.buffs))
  return p
}

// ── 数据提取 ──────────────────────────────────────────────────────────────────

export function extractPlayerData(p: Player, equipSkills: SkillData[] = []): PlayerData {
  return {
    id: p.id,
    name: p.name,
    health: p.health.max,
    energy: p.energy.max,
    san: p.props.san.max,
    str: p.str.value,
    con: p.con.value,
    agi: p.agi.value,
    int: p.int.value,
    lck: p.lck.value,
    skills: [...p.pool.raw.map((s) => ({ ...s })), ...equipSkills],
    damageFinalPct: p.damageFinalPct.value > 0 ? p.damageFinalPct.value : undefined,
    damageReduction: p.damageReduction.value > 0 ? p.damageReduction.value : undefined,
    growth: { level: p.growth.level, exp: p.growth.exp, unspentPoints: p.growth.unspentPoints },
    allocation: { ...p.allocation },
    backpack: p.backpack.serialize(),
  }
}

// ── 装备被动注入 ──────────────────────────────────────────────────────────────

function _mergePassives(
  slot: EquipSlot,
  defId: string,
  passives: EquipPassive[],
): { effects?: EffectData[]; triggers?: SkillData['triggers'] } {
  const allMods = passives.flatMap((p) => p.mods ?? [])
  const allTriggers = passives.flatMap((p) => p.triggers ?? [])

  const buffEffects: EffectData[] = allMods.map((mod) => ({
    when: 'mount' as const,
    behavior: { kind: 'propMod' as const, stat: mod.stat, mode: mod.mode, value: mod.value },
  }))

  const effects: EffectData[] | undefined =
    buffEffects.length > 0
      ? [
          {
            when: 'mount' as const,
            target: 'self' as const,
            behavior: {
              kind: 'buff' as const,
              data: {
                // id 必须与装备实例稳定关联，replay/seed 重放才能复现
                id: `_equip_buff_${slot}_${defId}`,
                name: '',
                duration: -1,
                effects: buffEffects,
              },
            },
          },
        ]
      : undefined

  return {
    effects,
    triggers: allTriggers.length > 0 ? allTriggers : undefined,
  }
}

/** 把当前装备实例转换为注入战斗引擎的虚拟被动 SkillData 列表 */
export function buildEquipmentPassives(
  equipSlots: Record<EquipSlot, EquipmentInstance | null>,
): SkillData[] {
  const result: SkillData[] = []
  for (const [slotKey, inst] of Object.entries(equipSlots)) {
    if (!inst) continue
    const slot = slotKey as EquipSlot
    const def = EQUIPMENTS.find((d) => d.id === inst.defId)
    if (!def) continue
    const passives: EquipPassive[] = [
      def.passive,
      ...inst.affixIds.map((id) => def.affixPool.find((a) => a.id === id)?.passive ?? {}),
    ]
    const { effects, triggers } = _mergePassives(slot, def.id, passives)
    result.push({
      id: `equip_${def.id}`,
      name: def.name,
      tags: [],
      multiplier: 0,
      role: 'passive',
      effects,
      triggers,
    })
  }
  return result
}

export function extractEnemyData(e: Enemy): EnemyData {
  return {
    id: e.id,
    name: e.name,
    health: e.health.max,
    energy: e.energy.max,
    san: e.props.san.max,
    str: e.str.value,
    con: e.con.value,
    agi: e.agi.value,
    int: e.int.value,
    lck: e.lck.value,
    skills: e.pool.raw.map((s) => ({ ...s })),
    isElite: e.isElite,
    isBoss: e.isBoss,
    sanPressure: e.sanPressure > 0 ? e.sanPressure : undefined,
    damageFinalPct: e.damageFinalPct.value > 0 ? e.damageFinalPct.value : undefined,
    damageReduction: e.damageReduction.value > 0 ? e.damageReduction.value : undefined,
  }
}

// ── 事件效果（地图事件 / 商店触发，仅在战斗外调用）────────────────────────────

export function applyEventEffect(effect: EventEffect, player: Player): void {
  switch (effect.kind) {
    case 'healHp':
      player.health.add(effect.amount)
      break
    case 'loseHp':
      player.health.add(-effect.amount)
      break
    case 'healSan':
      player.props.san.add(effect.amount)
      break
    case 'loseSan':
      player.props.san.add(-effect.amount)
      break
    case 'maxHpUp':
      player.health.max += effect.amount
      break
    case 'maxEnergyUp':
      player.energy.max += effect.amount
      break
    case 'healFull':
      player.health.add(player.health.max)
      break
    case 'gainGold':
      player.backpack.addGold(effect.amount)
      break
  }
}

// ── 遗物应用（战斗外，选取遗物后调用）────────────────────────────────────────

export function applyRelicToPlayer(relic: RelicData, player: Player): void {
  player.backpack.addRelic(relic)
  for (const effect of relic.effects) {
    switch (effect.kind) {
      case 'maxHpFlat':
        player.health.max += effect.amount
        player.health.add(effect.amount)
        break
      case 'maxEnergyFlat':
        player.energy.max += effect.amount
        player.energy.add(effect.amount)
        break
      case 'maxSanFlat':
        player.props.san.max += effect.amount
        player.props.san.add(effect.amount)
        break
      case 'statFlat': {
        const prop = (player as unknown as Record<string, Prop>)[effect.stat]
        if (prop instanceof Prop) {
          prop.max += effect.amount
          prop.add(effect.amount)
        }
        break
      }
      case 'goldBonus':
        // goldBonus 在战斗胜利时动态计算，无立即效果
        break
    }
  }
}
