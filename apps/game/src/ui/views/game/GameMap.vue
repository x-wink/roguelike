<template>
  <div class="node-list">
    <div v-for="(node, i) in game.nodes" :key="node.id" class="node-row">
      <!-- 步骤点 -->
      <div class="step-col">
        <div class="step-dot" :class="stepDotClass(node)">
          <span v-if="node.completed">✓</span>
          <span v-else>{{ i + 1 }}</span>
        </div>
        <div
          v-if="i < game.nodes.length - 1"
          class="step-line"
          :class="node.completed ? 'step-line--done' : ''"
        />
      </div>

      <!-- 节点卡片 -->
      <button
        class="node-card"
        :class="nodeCardClass(node)"
        :disabled="node.id !== game.currentNode?.id || node.completed"
        @click="game.enterNode()"
      >
        <div class="node-info">
          <span class="node-icon">{{ nodeIcon(node.type) }}</span>
          <div>
            <div class="node-label">{{ nodeLabel(node.type) }}</div>
            <div class="node-desc">{{ nodeDesc(node.type) }}</div>
          </div>
        </div>
        <span v-if="node.id === game.currentNode?.id && !node.completed" class="node-cta"
          >进入 →</span
        >
        <span v-else-if="node.completed" class="node-done">完成</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/store/game'
import type { NodeType, MapNode } from '@/game/meta'

const game = useGameStore()

function nodeIcon(type: NodeType) {
  return { battle: '⚔️', elite: '💀', boss: '👁', rest: '🌿', event: '?', shop: '◇' }[type]
}

function nodeLabel(type: NodeType) {
  return {
    battle: '普通战斗',
    elite: '精英战斗',
    boss: 'Boss',
    rest: '休息点',
    event: '事件',
    shop: '商店',
  }[type]
}

function nodeDesc(type: NodeType) {
  return {
    battle: '标准敌人',
    elite: '强化敌人，掉落更优质',
    boss: '关卡终点',
    rest: '回复 HP 或强化技能',
    event: '随机事件',
    shop: '购买道具',
  }[type]
}

function stepDotClass(node: MapNode) {
  if (node.completed) return 'step-dot--done'
  if (node.id === game.currentNode?.id) return 'step-dot--active'
  return 'step-dot--pending'
}

function nodeCardClass(node: MapNode) {
  if (node.completed) return 'node-card--done'
  if (node.id === game.currentNode?.id) return 'node-card--active'
  return 'node-card--locked'
}
</script>

<style scoped>
.node-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 1rem;
  overflow-y: auto;
  background: #2e2e2e;
}

.node-row {
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

/* ── Step indicator ─────────────────────── */
.step-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 1.75rem;
  flex-shrink: 0;
}

.step-dot {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-family: 'Jersey25', monospace;
  flex-shrink: 0;
}

.step-dot--done {
  background: #404040;
  color: #777;
}

.step-dot--active {
  background: #c0392b;
  color: #fff;
}

.step-dot--pending {
  background: #383838;
  color: #555;
}

.step-line {
  width: 1px;
  flex: 1;
  min-height: 0.75rem;
  margin: 3px 0;
  background: #404040;
}

.step-line--done {
  background: #505050;
}

/* ── Node card ──────────────────────────── */
.node-card {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid #404040;
  text-align: left;
  transition:
    border-color 0.15s,
    background 0.15s,
    box-shadow 0.15s;
  gap: 0.5rem;
}

.node-card--done {
  background: #2a2a2a;
  border-color: #383838;
  opacity: 0.55;
  cursor: default;
}

.node-card--active {
  background: #383838;
  border-color: #555;
  cursor: pointer;
}

.node-card--active:hover {
  border-color: rgba(192, 57, 43, 0.6);
  background: #3a3030;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.node-card--locked {
  background: #2a2a2a;
  border-color: #383838;
  opacity: 0.5;
  cursor: default;
}

.node-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.node-icon {
  font-size: 1rem;
}

.node-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #d8d5d0;
}

.node-desc {
  font-size: 0.72rem;
  color: #777;
  margin-top: 0.15rem;
}

.node-cta {
  font-family: 'Jersey25', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  color: #c0392b;
  flex-shrink: 0;
}

.node-done {
  font-family: 'Jersey25', monospace;
  font-size: 0.68rem;
  color: #555;
  flex-shrink: 0;
}
</style>
