// game/session — 游戏层非战斗业务工具。
// 战斗组装迁入 EngineContainer，本文件只保留：
//   1. extractPlayerData / extractEnemyData：把 Player/Enemy 实例还原成可持久化 Data
//   2. createPlayerFromSnapshot：从 PlayerData + Snapshot 重建 Player（地图阶段使用）
//   3. applyEventEffect：地图事件 / 商店购买等战斗外副作用
//   4. createUnitFactory：注入给 UnitContainer，让其能产出 Player/Enemy 子类

import { Buff, initBuffPool, Prop, type Unit, type UnitData, type UnitSnapshot } from '@xwink/rpg'
import { Enemy, type EnemyData } from '@/game/units/enemy'
import { Player, type PlayerData } from '@/game/units/player'
import type { EventEffect, RelicData } from '@/game/meta/types'

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

export function extractPlayerData(p: Player): PlayerData {
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
    skills: p.pool.raw.map((s) => ({ ...s })),
    damageFinalPct: p.damageFinalPct.value > 0 ? p.damageFinalPct.value : undefined,
    damageReduction: p.damageReduction.value > 0 ? p.damageReduction.value : undefined,
    growth: { level: p.growth.level, exp: p.growth.exp, unspentPoints: p.growth.unspentPoints },
    allocation: { ...p.allocation },
    backpack: p.backpack.serialize(),
  }
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
