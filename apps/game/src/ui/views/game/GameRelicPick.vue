<template>
  <div class="relic-pick-shell">
    <div class="relic-header">
      <p class="relic-eyebrow">RELIC</p>
      <h2 class="relic-title">选取遗物</h2>
      <p class="relic-hint">选择一件遗物，或跳过</p>
    </div>

    <div class="relic-list">
      <button
        v-for="relic in game.relicCandidates"
        :key="relic.id"
        class="relic-card"
        :class="`rarity--${relic.rarity}`"
        @click="game.pickRelic(relic)"
      >
        <div class="card-top">
          <span class="card-name">{{ relic.name }}</span>
          <span class="card-rarity">{{ RARITY_LABEL[relic.rarity] }}</span>
        </div>
        <p class="card-desc">{{ relic.description }}</p>
      </button>
    </div>

    <div class="relic-footer">
      <button class="btn-skip" @click="game.skipRelicPick()">跳过</button>
    </div>

    <PlayerStatusBar />
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/store/game'
import PlayerStatusBar from '@/ui/components/PlayerStatusBar.vue'
import type { RelicRarity } from '@/game/meta'

const game = useGameStore()

const RARITY_LABEL: Record<RelicRarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
}
</script>

<style scoped>
.relic-pick-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1a1714;
  color: #e8e4e0;
}

.relic-header {
  padding: 2.5rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(74, 74, 74, 0.5);
}

.relic-eyebrow {
  font-family: 'Jersey25', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.35em;
  color: #666;
  margin: 0 0 0.3rem;
}

.relic-title {
  font-family: 'XiangCui', serif;
  font-size: 1.4rem;
  letter-spacing: 0.15em;
  color: #f0eeeb;
  margin: 0 0 0.25rem;
}

.relic-hint {
  font-size: 0.8rem;
  color: #666;
  margin: 0;
  letter-spacing: 0.08em;
}

.relic-list {
  flex: 1;
  padding: 1.25rem 1.25rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
}

.relic-card {
  width: 100%;
  padding: 1rem 1.25rem;
  background: rgba(30, 26, 22, 0.9);
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.1s;
}

.relic-card:active {
  transform: scale(0.98);
}

/* 稀有度边框色 */
.rarity--common {
  border: 1px solid rgba(140, 140, 140, 0.4);
}
.rarity--common:hover {
  background: rgba(50, 46, 42, 0.9);
  border-color: rgba(180, 180, 180, 0.6);
}

.rarity--rare {
  border: 1px solid rgba(60, 100, 200, 0.45);
}
.rarity--rare:hover {
  background: rgba(30, 40, 70, 0.9);
  border-color: rgba(80, 130, 240, 0.7);
}

.rarity--epic {
  border: 1px solid rgba(150, 60, 200, 0.45);
}
.rarity--epic:hover {
  background: rgba(40, 20, 60, 0.9);
  border-color: rgba(180, 80, 240, 0.7);
}

.card-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.card-name {
  font-family: 'XiangCui', serif;
  font-size: 1.05rem;
  letter-spacing: 0.1em;
  color: #f0eeeb;
}

.card-rarity {
  font-family: 'Jersey25', monospace;
  font-size: 0.6rem;
  letter-spacing: 0.2em;
}

.rarity--common .card-rarity {
  color: #888;
}
.rarity--rare .card-rarity {
  color: #6aa3e8;
}
.rarity--epic .card-rarity {
  color: #c06ae8;
}

.card-desc {
  font-size: 0.82rem;
  line-height: 1.55;
  color: #999;
  margin: 0;
  letter-spacing: 0.04em;
}

.relic-footer {
  padding: 0.75rem 1.5rem;
}

.btn-skip {
  width: 100%;
  padding: 0.7rem;
  background: transparent;
  border: none;
  font-size: 0.82rem;
  color: #555;
  cursor: pointer;
  letter-spacing: 0.1em;
  transition: color 0.15s;
}

.btn-skip:hover {
  color: #888;
}
</style>
