// game/meta/types — Roguelike 跑图元数据类型。
// 定义本游戏特有的状态机、节点类型、事件 / 商店效果，rpg 通用层不感知。

import type { BuffData } from '@xwink/rpg'
import type { NpcId } from './npcs'

/** battle=普通战斗 / elite=精英 / boss=关卡终点 / rest=回复 / event=随机文本选择 / shop=消耗资源购买 */
export type NodeType = 'battle' | 'elite' | 'boss' | 'rest' | 'event' | 'shop'

/** 渊的五个层级，由外向内 */
export type ZoneId = 'wasteland' | 'wandering' | 'wall' | 'settlement' | 'apex'

export interface MapNode {
  id: string
  type: NodeType
  enemyId?: string
  completed: boolean
  zoneId: ZoneId
  /** 进入战斗节点时附加的变异词条 id 列表 */
  appliedMutations?: string[]
  /** 驻渊区域节点关联的 NPC，服务界面据此展示身份 */
  npcId?: NpcId
  /** 地图行索引（0-based），同一行的节点为并列分支选项 */
  row: number
  /** 同行中的列索引（0-based） */
  col: number
}

/** 状态机：home=主界面枢纽 / map=节点选择 / story=剧情演出 / relic-pick=遗物选取 / skill-pick=强化候选三选一 / result=结局界面，其余与 NodeType 同名节点对应 */
export type GamePhase =
  | 'home'
  | 'map'
  | 'story'
  | 'battle'
  | 'relic-pick'
  | 'skill-pick'
  | 'rest'
  | 'event'
  | 'shop'
  | 'result'

/** 结局原因。
 * victory: boss=击败 zone 终点 boss；session-clear=非 boss 节点全部完成；arena=演武场胜利。
 * defeat: hp-zero=HP 归零；san-zero=SAN 归零（涣散，HP 由 SanPlugin 削为 0）；arena=演武场败北。
 */
export type GameResult =
  | { kind: 'victory'; reason: 'boss' | 'session-clear' | 'arena' }
  | { kind: 'defeat'; reason: 'hp-zero' | 'san-zero' | 'arena' }
  | null

// ── 事件 / 商店 ───────────────────────────────────────────────────────────────

export type EventEffect =
  | { kind: 'healHp'; amount: number }
  | { kind: 'loseHp'; amount: number }
  | { kind: 'healSan'; amount: number }
  | { kind: 'loseSan'; amount: number }
  | { kind: 'maxHpUp'; amount: number }
  | { kind: 'maxEnergyUp'; amount: number }
  | { kind: 'healFull' }
  | { kind: 'gainGold'; amount: number }

export type EventOption = {
  label: string
  effect: EventEffect
}

export type GameEvent = {
  id: string
  name: string
  description: string
  options: EventOption[]
}

export type ShopItem = {
  id: string
  name: string
  description: string
  cost: number
  effect: EventEffect
}

// ── 遗物 ──────────────────────────────────────────────────────────────────────

export type RelicRarity = 'common' | 'rare' | 'epic'

/** 切割型：普通战斗 / 事件节点掉落；封存型：精英 / 渊正掉落 */
export type RelicType = 'cut' | 'sealed'

export type RelicEffect =
  | { kind: 'maxHpFlat'; amount: number }
  | { kind: 'maxEnergyFlat'; amount: number }
  | { kind: 'maxSanFlat'; amount: number }
  | { kind: 'statFlat'; stat: 'str' | 'con' | 'agi' | 'int' | 'lck'; amount: number }
  | { kind: 'goldBonus'; amount: number }

export type RelicData = {
  id: string
  name: string
  description: string
  /** 记忆文本，选取前封印，选取后永久收录图鉴 */
  lore: string
  rarity: RelicRarity
  type: RelicType
  effects: RelicEffect[]
}

// ── 变异词条 ──────────────────────────────────────────────────────────────────

export type MutationDef = {
  id: string
  name: string
  description: string
  /** 本次战斗胜利金币倍率（1.0 = 无加成） */
  goldMultiplier: number
  buff: BuffData
}
