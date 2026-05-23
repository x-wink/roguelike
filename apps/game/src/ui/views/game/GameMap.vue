<template>
  <div class="map-container">
    <div v-for="row in uniqueRows" :key="row" class="map-section">
      <!-- 行间连接线 -->
      <div v-if="row > 0" class="row-connector">
        <div class="connector-line" />
        <span class="connector-arrow">↓</span>
      </div>

      <!-- 该行所有节点 -->
      <div class="row-nodes" :class="rowClass(row)">
        <button
          v-for="node in nodesInRow(row)"
          :key="node.id"
          class="node-card"
          :class="nodeCardClass(node)"
          :disabled="!isSelectable(node)"
          @click="isSelectable(node) && game.enterNode(node.id)"
        >
          <div class="node-info">
            <span class="node-icon">{{ nodeIcon(node.type) }}</span>
            <div>
              <div class="node-label">{{ nodeLabel(node) }}</div>
              <div class="node-desc">{{ nodeDesc(node) }}</div>
            </div>
          </div>
          <span v-if="isSelectable(node)" class="node-cta">{{ t('node.select') }}</span>
          <span v-else-if="node.completed" class="node-done">✓</span>
          <span v-else-if="wasSkipped(node)" class="node-skip">—</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/store/game'
import { useT } from '@/i18n'
import { NPC_DEFS } from '@/game/meta'
import type { NodeType, MapNode } from '@/game/meta'

const game = useGameStore()
const t = useT()

const uniqueRows = computed(() => {
  const rows = [...new Set(game.nodes.map((n) => n.row))].sort((a, b) => a - b)
  return rows
})

function nodesInRow(row: number): MapNode[] {
  return game.nodes.filter((n) => n.row === row).sort((a, b) => a.col - b.col)
}

function isSelectable(node: MapNode): boolean {
  return node.row === game.currentRow && !node.completed
}

function wasSkipped(node: MapNode): boolean {
  return node.row < game.currentRow && !node.completed
}

function rowClass(row: number): string {
  if (row < game.currentRow) return 'row-nodes--past'
  if (row === game.currentRow) return 'row-nodes--current'
  return 'row-nodes--future'
}

function nodeCardClass(node: MapNode): string {
  if (node.completed) return 'node-card--done'
  if (wasSkipped(node)) return 'node-card--skipped'
  if (isSelectable(node)) return 'node-card--choice'
  return 'node-card--locked'
}

function nodeIcon(type: NodeType) {
  return { battle: '⚔️', elite: '💀', boss: '👁', rest: '🌿', event: '?', shop: '◇' }[type]
}

function nodeLabel(node: MapNode) {
  if (node.npcId) return NPC_DEFS[node.npcId].name
  const map: Record<NodeType, Parameters<typeof t>[0]> = {
    battle: 'node.battle',
    elite: 'node.elite',
    boss: 'node.boss',
    rest: 'node.rest',
    event: 'node.event',
    shop: 'node.shop',
  }
  return t(map[node.type])
}

function nodeDesc(node: MapNode) {
  if (node.npcId) return NPC_DEFS[node.npcId].role
  const map: Record<NodeType, Parameters<typeof t>[0]> = {
    battle: 'node.battle.desc',
    elite: 'node.elite.desc',
    boss: 'node.boss.desc',
    rest: 'node.rest.desc',
    event: 'node.event.desc',
    shop: 'node.shop.desc',
  }
  return t(map[node.type])
}
</script>

<style scoped>
.map-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  overflow-y: auto;
  background: #2e2e2e;
  gap: 0;
}

/* ── 行间连接 ──────────────────────────── */
.row-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.25rem 0;
}

.connector-line {
  width: 1px;
  height: 0.75rem;
  background: #404040;
}

.connector-arrow {
  font-size: 0.65rem;
  color: #505050;
  line-height: 1;
}

/* ── 节点行 ─────────────────────────────── */
.row-nodes {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
}

.row-nodes--current .node-card--choice {
  border-color: #555;
  background: #383838;
}

.row-nodes--past {
  opacity: 0.7;
}

.row-nodes--future {
  opacity: 0.35;
  pointer-events: none;
}

/* ── 节点卡片 ────────────────────────────── */
.node-card {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.85rem;
  border-radius: 6px;
  border: 1px solid #404040;
  text-align: left;
  transition:
    border-color 0.15s,
    background 0.15s,
    box-shadow 0.15s;
  gap: 0.5rem;
  min-width: 0;
}

.node-card--choice {
  cursor: pointer;
}

.node-card--choice:hover {
  border-color: rgba(192, 57, 43, 0.7);
  background: #3a3030;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.node-card--done {
  background: #2a2a2a;
  border-color: #404040;
}

.node-card--skipped {
  background: #262626;
  border-color: #333;
  opacity: 0.5;
}

.node-card--locked {
  background: #2a2a2a;
  border-color: #383838;
  cursor: default;
}

.node-info {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.node-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.node-label {
  font-size: 0.88rem;
  font-weight: 500;
  color: #d8d5d0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-desc {
  font-size: 0.7rem;
  color: #777;
  margin-top: 0.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-cta {
  font-family: 'Jersey25', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: #c0392b;
  flex-shrink: 0;
}

.node-done {
  font-size: 0.85rem;
  color: #555;
  flex-shrink: 0;
}

.node-skip {
  font-size: 0.85rem;
  color: #404040;
  flex-shrink: 0;
}
</style>
