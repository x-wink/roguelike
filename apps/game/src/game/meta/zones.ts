// game/meta/zones — Zone 节点模板表。
// 节点结构是逻辑层与 UI 层共用的元信息：store 用它生成本局节点序列，
// WorldMap 用它派生节点数量。统一维护避免双源真实状态。
//
// `Omit<MapNode, 'completed'>` —— completed 是局内状态，模板不携带；
// store/makeSessionNodes 在每次 enterZone 时深拷贝并补全。

import type { MapNode, ZoneId } from './types'

export type NodeTemplate = Omit<MapNode, 'completed'>

export const ZONE_NODES: Record<ZoneId, NodeTemplate[]> = {
  wasteland: [
    { id: 'w1', type: 'battle', enemyId: 'grunt', zoneId: 'wasteland' },
    { id: 'w2', type: 'event', zoneId: 'wasteland' },
    { id: 'w3', type: 'battle', enemyId: 'grunt', zoneId: 'wasteland' },
    { id: 'w4', type: 'rest', zoneId: 'wasteland' },
    { id: 'w5', type: 'boss', enemyId: 'boss_wasteland', zoneId: 'wasteland' },
  ],
  wandering: [
    { id: 'g1', type: 'battle', enemyId: 'grunt', zoneId: 'wandering' },
    { id: 'g2', type: 'shop', zoneId: 'wandering' },
    { id: 'g3', type: 'rest', zoneId: 'wandering' },
    { id: 'g4', type: 'battle', enemyId: 'grunt', zoneId: 'wandering' },
  ],
  wall: [
    { id: 'b1', type: 'elite', enemyId: 'elite_warden', zoneId: 'wall' },
    { id: 'b2', type: 'rest', zoneId: 'wall' },
    { id: 'b3', type: 'elite', enemyId: 'elite_warden', zoneId: 'wall' },
  ],
  settlement: [
    { id: 's1', type: 'shop', zoneId: 'settlement' },
    { id: 's2', type: 'event', zoneId: 'settlement' },
    { id: 's3', type: 'rest', zoneId: 'settlement' },
  ],
  apex: [
    { id: 'a1', type: 'battle', enemyId: 'grunt', zoneId: 'apex' },
    { id: 'a2', type: 'boss', enemyId: 'boss_overseer', zoneId: 'apex' },
  ],
}

export function makeSessionNodes(zoneId: ZoneId): MapNode[] {
  return ZONE_NODES[zoneId].map((n) => ({ ...n, completed: false }))
}
