<template>
  <Teleport to="body">
    <Transition name="ach-slide">
      <div v-if="current" class="ach-toast">
        <span class="ach-mark">◈</span>
        <div class="ach-body">
          <p class="ach-label">成就达成</p>
          <p class="ach-name">{{ current.name }}</p>
          <p v-if="current.title" class="ach-title-badge">称号：{{ current.title }}</p>
        </div>
        <span class="ach-reward">+{{ current.rareCurrency }} ◆</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useMetaStore } from '@/store/meta'
import type { AchievementDef } from '@/data/achievements'

const meta = useMetaStore()
const current = ref<AchievementDef | null>(null)
let timer: ReturnType<typeof setTimeout> | null = null

function showNext() {
  if (current.value) return
  const next = meta.shiftPendingAchievement()
  if (!next) return
  current.value = next
  timer = setTimeout(() => {
    current.value = null
    timer = null
    showNext()
  }, 3000)
}

watch(() => meta.pendingAchievements.length, showNext)

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.ach-toast {
  position: fixed;
  top: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1.25rem;
  background: #2a2a2a;
  border: 1px solid rgba(192, 57, 43, 0.35);
  min-width: 220px;
  clip-path: polygon(
    6px 0%,
    calc(100% - 6px) 0%,
    100% 6px,
    100% calc(100% - 6px),
    calc(100% - 6px) 100%,
    6px 100%,
    0% calc(100% - 6px),
    0% 6px
  );
}

.ach-mark {
  font-size: 0.85rem;
  color: var(--ember-bright, #c0392b);
  flex-shrink: 0;
}

.ach-body {
  flex: 1;
  min-width: 0;
}

.ach-label {
  font-size: 0.58rem;
  letter-spacing: 0.25em;
  color: #666;
  margin: 0 0 0.15rem;
  font-family: 'Jersey25', monospace;
}

.ach-name {
  font-size: 0.88rem;
  letter-spacing: 0.1em;
  color: #e8e4e0;
  margin: 0;
  font-family: 'XiangCui', serif;
}

.ach-title-badge {
  font-size: 0.62rem;
  color: #888;
  letter-spacing: 0.08em;
  margin: 0.1rem 0 0;
}

.ach-reward {
  font-family: 'Jersey25', monospace;
  font-size: 0.72rem;
  color: #6aa3c8;
  flex-shrink: 0;
}

.ach-slide-enter-active,
.ach-slide-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.ach-slide-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

.ach-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>
