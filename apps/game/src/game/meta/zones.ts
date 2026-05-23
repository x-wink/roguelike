// game/meta/zones — Zone 元信息与随机地图生成。
// ZoneMeta 提供 UI 展示所需的名称/描述，供 WorldMap 组件导入。
// makeSessionNodes 接收 session 级 RNG，保证相同 seed 生成相同地图，支持存档复现。

import type { MapNode, NodeType, ZoneId } from './types'
import { SETTLEMENT_NODE_NPC } from './npcs'

// ── 区域元信息 ────────────────────────────────────────────────────────────────

export type ZoneMeta = {
  id: ZoneId
  name: string
  subtitle: string
  desc: string
}

export const ZONE_META: Record<ZoneId, ZoneMeta> = {
  wasteland: { id: 'wasteland', name: '荒渊', subtitle: '外围废墟带', desc: '新至者 · 渊虫' },
  wandering: {
    id: 'wandering',
    name: '游渊',
    subtitle: '游荡地带',
    desc: '多轮存活者 · 无名参与者',
  },
  wall: { id: 'wall', name: '壁渊', subtitle: '渊正壁垒带', desc: '渊正 · 穿越需代价' },
  settlement: {
    id: 'settlement',
    name: '驻渊',
    subtitle: '内驻地带',
    desc: '掌柜 · 缝合者 · 记录者 · 修补者',
  },
  apex: { id: 'apex', name: '天渊', subtitle: '', desc: '天渊·先遣' },
}

export const ZONE_ORDER: ZoneId[] = ['wasteland', 'wandering', 'wall', 'settlement', 'apex']

// ── 区域地图配置 ──────────────────────────────────────────────────────────────

type ZoneRowConfig = {
  minCols: number
  maxCols: number
  /** 该行节点可随机出现的类型池（每列独立随机） */
  types: NodeType[]
}

type ZoneConfig = {
  /** 普通行配置，boss 行自动追加为最后一行 */
  mapRows: ZoneRowConfig[]
  bossEnemyId: string
  battleEnemyIds: string[]
  eliteEnemyIds: string[]
}

const ZONE_CONFIG: Record<ZoneId, ZoneConfig> = {
  wasteland: {
    mapRows: [
      { minCols: 1, maxCols: 1, types: ['battle'] },
      { minCols: 2, maxCols: 2, types: ['battle', 'event'] },
      { minCols: 2, maxCols: 3, types: ['battle', 'rest', 'event'] },
      { minCols: 2, maxCols: 2, types: ['battle', 'shop'] },
      { minCols: 1, maxCols: 2, types: ['battle', 'elite'] },
    ],
    bossEnemyId: 'boss_wasteland',
    battleEnemyIds: ['grunt'],
    eliteEnemyIds: ['elite_warden'],
  },
  wandering: {
    mapRows: [
      { minCols: 2, maxCols: 2, types: ['battle', 'event'] },
      { minCols: 2, maxCols: 2, types: ['shop', 'rest'] },
      { minCols: 2, maxCols: 3, types: ['battle', 'elite', 'event'] },
      { minCols: 2, maxCols: 3, types: ['battle', 'rest', 'shop'] },
      { minCols: 2, maxCols: 2, types: ['elite', 'battle'] },
      { minCols: 2, maxCols: 2, types: ['elite', 'battle'] },
    ],
    bossEnemyId: 'boss_wandering',
    battleEnemyIds: ['wanderer'],
    eliteEnemyIds: ['elite_warden'],
  },
  wall: {
    mapRows: [
      { minCols: 1, maxCols: 2, types: ['elite'] },
      { minCols: 2, maxCols: 2, types: ['rest', 'event'] },
      { minCols: 2, maxCols: 2, types: ['elite', 'shop'] },
      { minCols: 2, maxCols: 2, types: ['elite', 'rest'] },
      { minCols: 2, maxCols: 3, types: ['elite', 'event', 'shop'] },
    ],
    bossEnemyId: 'boss_wall',
    battleEnemyIds: ['warden_guard'],
    eliteEnemyIds: ['elite_warden'],
  },
  settlement: {
    mapRows: [
      { minCols: 2, maxCols: 2, types: ['shop', 'event'] },
      { minCols: 2, maxCols: 2, types: ['rest', 'shop'] },
      { minCols: 2, maxCols: 3, types: ['event', 'rest', 'shop'] },
    ],
    bossEnemyId: 'guardian',
    battleEnemyIds: [],
    eliteEnemyIds: [],
  },
  apex: {
    mapRows: [
      { minCols: 2, maxCols: 2, types: ['elite', 'battle'] },
      { minCols: 2, maxCols: 2, types: ['elite', 'rest'] },
      { minCols: 2, maxCols: 2, types: ['elite', 'battle'] },
    ],
    bossEnemyId: 'boss_overseer',
    battleEnemyIds: ['apex_enforcer'],
    eliteEnemyIds: ['apex_enforcer'],
  },
}

// ── 随机地图生成 ──────────────────────────────────────────────────────────────

const COMBAT_NODE_TYPES = new Set<NodeType>(['battle', 'elite', 'boss'])
const isCombat = (t: NodeType) => COMBAT_NODE_TYPES.has(t)

/**
 * 为指定区域生成随机分支地图节点。
 * rng 必须是已初始化的 session 级 Mulberry32 序列，保证相同 seed 生成相同布局。
 * boss 行固定为最后一行，单列，不随机。
 *
 * 生成约束：
 * 1. 同一行内非战斗类型（rest/event/shop）不重复，战斗类型可重复。
 * 2. 全战斗行（该行所有分支均为战斗节点）数量不低于总行数的一半；
 *    若不足则将最早的混合行（有战斗 + 非战斗）强制转为全战斗；无战斗池的区域跳过此约束。
 */
export function makeSessionNodes(zoneId: ZoneId, rng: () => number): MapNode[] {
  const config = ZONE_CONFIG[zoneId]
  const nodes: MapNode[] = []
  const prefix = zoneId[0]

  config.mapRows.forEach((rowCfg, row) => {
    const span = rowCfg.maxCols - rowCfg.minCols
    const cols = rowCfg.minCols + (span > 0 ? Math.floor(rng() * (span + 1)) : 0)
    const usedNonCombat = new Set<NodeType>()

    for (let col = 0; col < cols; col++) {
      // 约束1：非战斗类型在同一行内不重复，战斗类型不限
      const available = rowCfg.types.filter((t) => isCombat(t) || !usedNonCombat.has(t))
      const pool = available.length > 0 ? available : rowCfg.types
      const type = pool[Math.floor(rng() * pool.length)]
      if (!isCombat(type)) usedNonCombat.add(type)

      let enemyId: string | undefined
      if (type === 'battle' && config.battleEnemyIds.length > 0) {
        enemyId = config.battleEnemyIds[Math.floor(rng() * config.battleEnemyIds.length)]
      } else if (type === 'elite' && config.eliteEnemyIds.length > 0) {
        enemyId = config.eliteEnemyIds[Math.floor(rng() * config.eliteEnemyIds.length)]
      }

      nodes.push({
        id: `${prefix}${row}_${col}`,
        type,
        enemyId,
        completed: false,
        zoneId,
        appliedMutations: [],
        npcId: zoneId === 'settlement' ? SETTLEMENT_NODE_NPC[type] : undefined,
        row,
        col,
      })
    }
  })

  // boss 行固定追加
  const bossRow = config.mapRows.length
  nodes.push({
    id: `${prefix}${bossRow}_0`,
    type: 'boss',
    enemyId: config.bossEnemyId,
    completed: false,
    zoneId,
    appliedMutations: [],
    row: bossRow,
    col: 0,
  })

  // 约束2：全战斗行数量不低于总行数一半（驻渊等无战斗池区域跳过）
  const hasCombatPool = config.battleEnemyIds.length > 0 || config.eliteEnemyIds.length > 0
  if (hasCombatPool) {
    const totalRows = bossRow + 1
    const required = Math.ceil(totalRows / 2)

    const byRow = new Map<number, MapNode[]>()
    for (const n of nodes) {
      if (!byRow.has(n.row)) byRow.set(n.row, [])
      byRow.get(n.row)!.push(n)
    }

    const isAllCombatRow = (rowNodes: MapNode[]) => rowNodes.every((n) => isCombat(n.type))
    let allCombatCount = [...byRow.values()].filter(isAllCombatRow).length

    if (allCombatCount < required) {
      const combatPool: NodeType[] = []
      if (config.battleEnemyIds.length > 0) combatPool.push('battle')
      if (config.eliteEnemyIds.length > 0) combatPool.push('elite')

      // 按行序取混合行（有战斗 + 有非战斗），依次转为全战斗直到满足要求
      const fixable = [...byRow.entries()]
        .filter(([, rn]) => !isAllCombatRow(rn) && rn.some((n) => isCombat(n.type)))
        .sort(([a], [b]) => a - b)

      for (const [, rowNodes] of fixable) {
        if (allCombatCount >= required) break
        for (const n of rowNodes) {
          if (!isCombat(n.type)) {
            const ct = combatPool[Math.floor(rng() * combatPool.length)]
            n.type = ct
            n.enemyId =
              ct === 'battle'
                ? config.battleEnemyIds[Math.floor(rng() * config.battleEnemyIds.length)]
                : config.eliteEnemyIds[Math.floor(rng() * config.eliteEnemyIds.length)]
            n.npcId = undefined
          }
        }
        allCombatCount++
      }
    }
  }

  return nodes
}

/** 各区域地图行数（含 boss 行）的上下限，供 UI 展示参考。 */
export function getZoneRowRange(zoneId: ZoneId): { min: number; max: number } {
  const config = ZONE_CONFIG[zoneId]
  return { min: config.mapRows.length + 1, max: config.mapRows.length + 1 }
}
