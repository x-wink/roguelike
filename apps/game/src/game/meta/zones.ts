// game/meta/zones — Zone 元信息与随机地图生成。
// ZoneMeta 提供 UI 展示所需的名称/描述，供 WorldMap 组件导入。
// makeSessionNodes 接收 session 级 RNG，保证相同 seed 生成相同地图，支持存档复现。

import type { MapNode, NodeType, ZoneId } from './types'

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

/**
 * 为指定区域生成随机分支地图节点。
 * rng 必须是已初始化的 session 级 Mulberry32 序列，保证相同 seed 生成相同布局。
 * boss 行固定为最后一行，单列，不随机。
 */
export function makeSessionNodes(zoneId: ZoneId, rng: () => number): MapNode[] {
  const config = ZONE_CONFIG[zoneId]
  const nodes: MapNode[] = []
  const prefix = zoneId[0]

  config.mapRows.forEach((rowCfg, row) => {
    const span = rowCfg.maxCols - rowCfg.minCols
    const cols = rowCfg.minCols + (span > 0 ? Math.floor(rng() * (span + 1)) : 0)

    for (let col = 0; col < cols; col++) {
      const type = rowCfg.types[Math.floor(rng() * rowCfg.types.length)]
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

  return nodes
}

/** 各区域地图行数（含 boss 行）的上下限，供 UI 展示参考。 */
export function getZoneRowRange(zoneId: ZoneId): { min: number; max: number } {
  const config = ZONE_CONFIG[zoneId]
  return { min: config.mapRows.length + 1, max: config.mapRows.length + 1 }
}
