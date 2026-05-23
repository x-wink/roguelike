<template>
  <Teleport to="body">
    <Transition name="pause-fade">
      <div
        v-if="visible"
        class="pause-overlay"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        @click.self="emit('close')"
      >
        <div class="pause-panel">
          <p class="pause-mark">◈</p>
          <h2 class="pause-title">{{ t('menu.title') }}</h2>

          <div class="pause-actions">
            <button class="pause-btn pause-btn--primary" @click="emit('close')">
              {{ t('menu.resume') }}
            </button>

            <button class="pause-btn" @click="emit('open-settings')">
              {{ t('menu.settings') }}
            </button>

            <button class="pause-btn" :disabled="saved" @click="handleSave">
              {{ saved ? t('menu.save.done') : t('menu.save') }}
            </button>

            <button v-if="canExit" class="pause-btn pause-btn--danger" @click="handleExit">
              {{ t('menu.exit') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useGameStore } from '@/store/game'
import { useT } from '@/i18n'

const props = defineProps<{ visible: boolean; canExit: boolean }>()
const emit = defineEmits<{
  close: []
  'open-settings': []
}>()

const t = useT()
const game = useGameStore()

const saved = ref(false)

watch(
  () => props.visible,
  (v) => {
    if (!v) saved.value = false
  },
)

function handleSave() {
  game.manualSave()
  saved.value = true
}

function handleExit() {
  if (confirm(t('menu.exit.confirm'))) {
    emit('close')
    nextTick(() => game.exitSession())
  }
}
</script>

<style scoped>
.pause-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pause-panel {
  background: #2a2a2a;
  border: 1px solid #484848;
  padding: 2rem 2.5rem;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  clip-path: polygon(
    8px 0%,
    calc(100% - 8px) 0%,
    100% 8px,
    100% calc(100% - 8px),
    calc(100% - 8px) 100%,
    8px 100%,
    0% calc(100% - 8px),
    0% 8px
  );
}

.pause-mark {
  font-size: 0.75rem;
  color: var(--ember-bright, #c0392b);
  letter-spacing: 0.2em;
  margin-bottom: 0.25rem;
}

.pause-title {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.25em;
  color: #e8e4e0;
  margin-bottom: 1rem;
  font-family: 'XiangCui', serif;
}

.pause-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.pause-btn {
  width: 100%;
  padding: 0.6rem 1.5rem;
  font-size: 0.8rem;
  letter-spacing: 0.15em;
  border: 1px solid #484848;
  background: #363636;
  color: #c8c4be;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
  clip-path: polygon(
    4px 0%,
    calc(100% - 4px) 0%,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    0% calc(100% - 4px),
    0% 4px
  );
}

.pause-btn:hover:not(:disabled) {
  background: #424242;
  border-color: #5a5a5a;
  color: #e8e4e0;
}

.pause-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.pause-btn--primary {
  border-color: rgba(192, 57, 43, 0.4);
  color: var(--ember-bright, #c0392b);
}

.pause-btn--primary:hover {
  border-color: rgba(192, 57, 43, 0.7);
  background: rgba(192, 57, 43, 0.08);
  color: var(--ember-bright, #c0392b) !important;
}

.pause-btn--danger {
  color: #888;
  border-color: #3a3a3a;
}

.pause-btn--danger:hover:not(:disabled) {
  color: #aaa;
  border-color: #4a4a4a;
  background: #363636;
}

.pause-fade-enter-active,
.pause-fade-leave-active {
  transition: opacity 0.15s;
}
.pause-fade-enter-from,
.pause-fade-leave-to {
  opacity: 0;
}
</style>
