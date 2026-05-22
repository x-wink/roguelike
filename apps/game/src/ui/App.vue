<template>
  <div class="game-shell flex flex-col overflow-hidden" style="background: #2e2e2e; color: #f0eeeb">
    <RouterView />
    <GlobalTips />

    <button class="settings-btn" :title="t('settings.title')" @click="settings.panelOpen = true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        />
      </svg>
    </button>

    <SettingsModal :visible="settings.panelOpen" @close="settings.panelOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { watchEffect } from 'vue'
import GlobalTips from '@/ui/components/GlobalTips.vue'
import SettingsModal from '@/ui/components/SettingsModal.vue'
import { useSettingsStore } from '@/store/settings'
import { useT } from '@/i18n'

const settings = useSettingsStore()
const t = useT()

watchEffect(() => {
  document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion)
})
</script>

<style scoped>
.settings-btn {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 100;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(37, 37, 37, 0.8);
  border: 1px solid rgba(74, 74, 74, 0.5);
  color: #666666;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s;
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

.settings-btn:hover {
  color: #aaaaaa;
  border-color: rgba(74, 74, 74, 0.9);
}

.settings-btn svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
</style>
