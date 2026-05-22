<template>
  <div class="world-map">
    <div v-for="(zone, i) in ZONES" :key="zone.id" class="zone-row">
      <div v-if="i > 0" class="zone-connector">
        <div class="connector-line" :class="{ 'connector-line--locked': !isUnlocked(zone.id) }" />
        <span class="connector-arrow" :class="{ 'connector-arrow--locked': !isUnlocked(zone.id) }"
          >↓</span
        >
      </div>
      <button
        class="zone-card"
        :class="isUnlocked(zone.id) ? 'zone-card--open' : 'zone-card--locked'"
        :disabled="!isUnlocked(zone.id)"
        @click="isUnlocked(zone.id) && emit('select', zone.id)"
      >
        <div class="zone-body">
          <div class="zone-name" :class="{ 'zone-name--locked': !isUnlocked(zone.id) }">
            {{ zone.name }}
          </div>
          <div class="zone-subtitle">{{ zone.subtitle }}</div>
          <div class="zone-desc">{{ zone.desc }}</div>
        </div>
        <div class="zone-meta">
          <span v-if="isCleared(zone.id)" class="zone-tag zone-tag--cleared">已通</span>
          <span v-else-if="isUnlocked(zone.id)" class="zone-tag zone-tag--open"
            >{{ rowCount(zone.id) }} 行</span
          >
          <span v-else class="zone-tag zone-tag--locked">锁定</span>
          <span v-if="isUnlocked(zone.id)" class="zone-enter">进入 →</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/store/game'
import { ZONE_META, ZONE_ORDER, getZoneRowRange, type ZoneId } from '@/game/meta'

const emit = defineEmits<{ select: [zone: ZoneId] }>()
const game = useGameStore()

const ZONES = ZONE_ORDER.map((id) => ZONE_META[id])

function isUnlocked(id: ZoneId): boolean {
  const idx = ZONE_ORDER.indexOf(id)
  if (idx === 0) return true
  return game.clearedZones.includes(ZONE_ORDER[idx - 1])
}

function isCleared(id: ZoneId): boolean {
  return game.clearedZones.includes(id)
}

function rowCount(id: ZoneId): number {
  return getZoneRowRange(id).min
}
</script>

<style scoped>
.world-map {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  overflow-y: auto;
  gap: 0;
  background: var(--black);
}

.zone-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.zone-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 1.2rem;
  flex-shrink: 0;
}

.connector-line {
  width: 1px;
  flex: 1;
  background: #4a4a4a;
}

.connector-line--locked {
  background: #2e2e2e;
}

.connector-arrow {
  font-size: 0.6rem;
  color: #666;
  line-height: 1;
}

.connector-arrow--locked {
  color: #333;
}

/* ── Zone card ─────────────────────────────── */
.zone-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem;
  border: 1px solid #404040;
  background: #353535;
  text-align: left;
  border-radius: 4px;
  transition:
    border-color 0.15s,
    background 0.15s;
  gap: 0.75rem;
}

.zone-card--open {
  cursor: pointer;
}

.zone-card--open:hover {
  border-color: #5a5a5a;
  background: #3c3c3c;
}

.zone-card--locked {
  cursor: default;
  border-color: #2e2e2e;
  background: #252525;
  opacity: 0.55;
}

/* ── Zone body ─────────────────────────────── */
.zone-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.zone-name {
  font-family: 'XiangCui', serif;
  font-size: 1.15rem;
  letter-spacing: 0.15em;
  color: #e8e4e0;
  line-height: 1.2;
}

.zone-name--locked {
  color: #555;
}

.zone-subtitle {
  font-family: 'Jersey25', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  color: #888;
}

.zone-desc {
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  color: #777;
  margin-top: 0.05rem;
}

/* ── Zone meta ─────────────────────────────── */
.zone-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
  flex-shrink: 0;
}

.zone-tag {
  font-family: 'Jersey25', monospace;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
}

.zone-tag--open {
  color: #aaa;
  background: #2e2e2e;
  border: 1px solid #4a4a4a;
}

.zone-tag--cleared {
  color: var(--ember-bright);
  background: rgba(192, 57, 43, 0.12);
  border: 1px solid rgba(192, 57, 43, 0.35);
}

.zone-tag--locked {
  color: #444;
  background: transparent;
  border: 1px solid #333;
}

.zone-enter {
  font-family: 'Jersey25', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.15em;
  color: var(--ember-bright);
}
</style>
