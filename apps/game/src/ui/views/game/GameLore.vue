<template>
  <div class="lore-view">
    <header class="lore-header">
      <span class="lore-title">{{ t('lore.title') }}</span>
      <span class="lore-count">{{ meta.discoveredCount }} / {{ RELICS.length }}</span>
    </header>

    <div class="lore-grid">
      <div
        v-for="relic in RELICS"
        :key="relic.id"
        class="lore-slot"
        :class="[
          `rarity-${relic.rarity}`,
          `type-${relic.type}`,
          { discovered: meta.isDiscovered(relic.id) },
        ]"
      >
        <div class="slot-type-badge" :class="`type-${relic.type}`">
          {{ t(TYPE_LABEL[relic.type]) }}
        </div>

        <template v-if="meta.isDiscovered(relic.id)">
          <div class="slot-name">{{ relic.name }}</div>
          <div class="slot-desc">{{ relic.description }}</div>
          <div class="slot-lore">{{ relic.lore }}</div>
        </template>
        <template v-else>
          <div class="slot-name unknown">???</div>
          <div class="slot-desc unknown">▓▓▓▓▓▓▓▓▓▓▓▓</div>
          <div class="slot-lore unknown">▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓</div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RELICS } from '@/data'
import { useMetaStore } from '@/store/meta'
import { useT } from '@/i18n'
import type { RelicType } from '@/game/meta'

const t = useT()

const meta = useMetaStore()

const TYPE_LABEL: Record<RelicType, Parameters<typeof t>[0]> = {
  cut: 'relic.type.cut',
  sealed: 'relic.type.sealed',
}
</script>

<style scoped>
.lore-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px 14px;
  overflow: hidden;
}

.lore-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.lore-title {
  font-size: 13px;
  color: #c8b99a;
  letter-spacing: 0.05em;
}

.lore-count {
  font-size: 11px;
  color: #7a6e60;
}

.lore-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex: 1;
  padding-right: 2px;
}

.lore-slot {
  position: relative;
  border: 1px solid #3a3530;
  border-radius: 6px;
  padding: 10px 12px 10px 46px;
  background: #1a1714;
  transition: border-color 0.15s;
}

.lore-slot.discovered {
  background: #1e1b18;
}

.lore-slot.discovered.rarity-common {
  border-color: #4a4540;
}

.lore-slot.discovered.rarity-rare {
  border-color: #4a5a6a;
}

.lore-slot.discovered.rarity-epic {
  border-color: #5a4a6a;
}

.slot-type-badge {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  writing-mode: vertical-rl;
  font-size: 9px;
  letter-spacing: 0.1em;
  padding: 4px 3px;
  border-radius: 3px;
  opacity: 0.7;
}

.slot-type-badge.type-cut {
  color: #c8864a;
  border: 1px solid #c8864a44;
}

.slot-type-badge.type-sealed {
  color: #6aa3c8;
  border: 1px solid #6aa3c844;
}

.slot-name {
  font-size: 13px;
  color: #d4c9b8;
  margin-bottom: 3px;
  font-family: 'XiangCui', serif;
}

.slot-desc {
  font-size: 11px;
  color: #9a9080;
  margin-bottom: 4px;
  line-height: 1.4;
}

.slot-lore {
  font-size: 10px;
  color: #6a6058;
  line-height: 1.5;
  font-style: italic;
}

.slot-name.unknown,
.slot-desc.unknown,
.slot-lore.unknown {
  color: #3a3530;
  user-select: none;
}
</style>
