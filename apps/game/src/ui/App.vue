<template>
  <div class="game-shell flex flex-col overflow-hidden" style="background: #2e2e2e; color: #f0eeeb">
    <RouterView />
    <GlobalTips />
    <AchievementToast />

    <!-- 游戏中显示菜单按钮；home 页只显示设置齿轮 -->
    <template v-if="inSession">
      <button class="settings-btn" @click="menuOpen = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <PauseMenu
        :visible="menuOpen"
        :can-exit="game.phase !== 'home'"
        @close="menuOpen = false"
        @open-settings="onOpenSettings"
      />
    </template>
    <template v-else-if="showSettingsBtn">
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
    </template>

    <SettingsModal :visible="settings.panelOpen" @close="settings.panelOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import GlobalTips from '@/ui/components/GlobalTips.vue'
import AchievementToast from '@/ui/components/AchievementToast.vue'
import SettingsModal from '@/ui/components/SettingsModal.vue'
import PauseMenu from '@/ui/components/PauseMenu.vue'
import { useSettingsStore } from '@/store/settings'
import { useGameStore } from '@/store/game'
import { useT } from '@/i18n'

const settings = useSettingsStore()
const game = useGameStore()
const t = useT()

const menuOpen = ref(false)

const SESSION_PHASES = new Set([
  'map',
  'battle',
  'relic-pick',
  'skill-pick',
  'rest',
  'event',
  'shop',
])
const inSession = computed(() => SESSION_PHASES.has(game.phase))
const showSettingsBtn = computed(() => game.phase === 'home')

// session 结束时归零，避免重进时菜单自动弹出
watch(inSession, (v) => {
  if (!v) menuOpen.value = false
})

function onOpenSettings() {
  menuOpen.value = false
  settings.panelOpen = true
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (settings.panelOpen) {
    settings.panelOpen = false
    return
  }
  if (menuOpen.value) {
    menuOpen.value = false
    return
  }
  if (inSession.value) menuOpen.value = true
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

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
