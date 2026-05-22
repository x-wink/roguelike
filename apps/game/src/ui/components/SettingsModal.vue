<template>
  <Teleport to="body">
    <Transition name="settings-fade">
      <div
        v-if="visible"
        class="settings-overlay"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        @click.self="emit('close')"
        @keydown.esc="emit('close')"
      >
        <div class="settings-panel">
          <div class="panel-header">
            <p class="panel-mark">◈</p>
            <h2 class="panel-title">{{ t('settings.title') }}</h2>
          </div>

          <div class="tab-nav">
            <button
              :class="['tab-btn', { 'tab-btn--active': tab === 'global' }]"
              @click="tab = 'global'"
            >
              {{ t('settings.tab.global') }}
            </button>
            <button
              :class="['tab-btn', { 'tab-btn--active': tab === 'battle' }]"
              @click="tab = 'battle'"
            >
              {{ t('settings.tab.battle') }}
            </button>
          </div>

          <div class="settings-body">
            <!-- 全局 -->
            <template v-if="tab === 'global'">
              <div class="setting-row">
                <span class="setting-label">{{ t('settings.language') }}</span>
                <div class="seg-group">
                  <button
                    :class="['seg-btn', { 'seg-btn--active': settings.locale === 'zh' }]"
                    @click="settings.locale = 'zh'"
                  >
                    {{ t('lang.zh') }}
                  </button>
                  <button
                    :class="['seg-btn', { 'seg-btn--active': settings.locale === 'en' }]"
                    @click="settings.locale = 'en'"
                  >
                    {{ t('lang.en') }}
                  </button>
                </div>
              </div>

              <div class="setting-row setting-row--col">
                <div class="setting-label-row">
                  <span class="setting-label">{{ t('settings.bgm') }}</span>
                  <span class="setting-val">{{ settings.bgmVolume }}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  v-model.number="settings.bgmVolume"
                  class="vol-slider"
                />
              </div>

              <div class="setting-row setting-row--col">
                <div class="setting-label-row">
                  <span class="setting-label">{{ t('settings.sfx') }}</span>
                  <span class="setting-val">{{ settings.sfxVolume }}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  v-model.number="settings.sfxVolume"
                  class="vol-slider"
                />
              </div>

              <div class="setting-row">
                <div class="setting-label-group">
                  <span class="setting-label">{{ t('settings.motion') }}</span>
                  <span class="setting-desc">{{ t('settings.motion.desc') }}</span>
                </div>
                <button
                  :class="['toggle-btn', { 'toggle-btn--on': settings.reducedMotion }]"
                  @click="settings.reducedMotion = !settings.reducedMotion"
                  :aria-pressed="settings.reducedMotion"
                />
              </div>
            </template>

            <!-- 战斗 -->
            <template v-else>
              <div class="setting-row">
                <span class="setting-label">{{ t('settings.speed') }}</span>
                <div class="seg-group">
                  <button
                    v-for="s in SPEEDS"
                    :key="s"
                    :class="['seg-btn', { 'seg-btn--active': settings.battleSpeed === s }]"
                    @click="settings.battleSpeed = s"
                  >
                    {{ t(`settings.speed.${s}`) }}
                  </button>
                </div>
              </div>

              <div class="setting-row">
                <div class="setting-label-group">
                  <span class="setting-label">{{ t('settings.log') }}</span>
                  <span class="setting-desc">{{ t('settings.log.desc') }}</span>
                </div>
                <button
                  :class="['toggle-btn', { 'toggle-btn--on': settings.showBattleLog }]"
                  @click="settings.showBattleLog = !settings.showBattleLog"
                  :aria-pressed="settings.showBattleLog"
                />
              </div>
            </template>
          </div>

          <div class="panel-footer">
            <button class="btn-reset" @click="settings.reset()">{{ t('settings.reset') }}</button>
            <button class="btn-close" @click="emit('close')">{{ t('settings.close') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore, type BattleSpeed } from '@/store/settings'
import { useT } from '@/i18n'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const settings = useSettingsStore()
const t = useT()
const tab = ref<'global' | 'battle'>('global')
const SPEEDS: BattleSpeed[] = ['slow', 'normal', 'fast']
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(2px);
}

.settings-panel {
  width: min(360px, calc(100vw - 2rem));
  background: var(--ash);
  border: 1px solid color-mix(in srgb, var(--cinder) 80%, transparent);
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Header ── */

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--cinder) 60%, transparent);
}

.panel-mark {
  font-family: var(--font-jersey);
  font-size: 0.9rem;
  color: var(--ember);
  margin: 0;
}

.panel-title {
  font-family: var(--font-jersey);
  font-size: 0.85rem;
  letter-spacing: 0.25em;
  color: var(--text-bright);
  margin: 0;
}

/* ── Tabs ── */

.tab-nav {
  display: flex;
  border-bottom: 1px solid color-mix(in srgb, var(--cinder) 60%, transparent);
}

.tab-btn {
  flex: 1;
  padding: 0.55rem 0;
  font-family: var(--font-jersey);
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  color: var(--text-dim);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
}

.tab-btn:hover {
  color: var(--text-mid);
}

.tab-btn--active {
  color: var(--text-bright);
  border-bottom: 1px solid var(--ember);
  margin-bottom: -1px;
}

/* ── Settings Body ── */

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0.25rem 0;
  min-height: 200px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  gap: 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--cinder) 30%, transparent);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-row--col {
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
}

.setting-label-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.setting-label {
  font-family: var(--font-jersey);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  color: var(--text-bright);
}

.setting-val {
  font-family: var(--font-jersey);
  font-size: 0.72rem;
  color: var(--ember-glow);
  min-width: 2.5rem;
  text-align: right;
}

.setting-label-group {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.setting-desc {
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  color: var(--text-dim);
}

/* ── Segmented Button Group ── */

.seg-group {
  display: flex;
  gap: 2px;
}

.seg-btn {
  padding: 0.3rem 0.65rem;
  font-family: var(--font-jersey);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--cinder) 70%, transparent);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
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

.seg-btn:hover {
  color: var(--text-mid);
  border-color: var(--cinder);
}

.seg-btn--active {
  color: var(--text-bright);
  border-color: color-mix(in srgb, var(--ember-bright) 60%, transparent);
  background: color-mix(in srgb, var(--ember) 12%, transparent);
}

/* ── Volume Slider ── */

.vol-slider {
  width: 100%;
  height: 2px;
  appearance: none;
  background: linear-gradient(
    to right,
    var(--ember) calc(var(--pct, 0) * 1%),
    color-mix(in srgb, var(--cinder) 70%, transparent) calc(var(--pct, 0) * 1%)
  );
  outline: none;
  cursor: pointer;
}

.vol-slider::-webkit-slider-thumb {
  appearance: none;
  width: 10px;
  height: 10px;
  background: var(--ember-bright);
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  cursor: pointer;
}

.vol-slider::-moz-range-thumb {
  width: 10px;
  height: 10px;
  background: var(--ember-bright);
  border: none;
  cursor: pointer;
}

/* ── Toggle ── */

.toggle-btn {
  position: relative;
  width: 34px;
  height: 18px;
  background: color-mix(in srgb, var(--cinder) 70%, transparent);
  border: 1px solid color-mix(in srgb, var(--cinder) 80%, transparent);
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.2s,
    border-color 0.2s;
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

.toggle-btn::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  background: var(--text-dim);
  transition:
    left 0.2s,
    background 0.2s;
  clip-path: polygon(
    3px 0%,
    calc(100% - 3px) 0%,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    0% calc(100% - 3px),
    0% 3px
  );
}

.toggle-btn--on {
  background: color-mix(in srgb, var(--ember) 20%, transparent);
  border-color: color-mix(in srgb, var(--ember-bright) 50%, transparent);
}

.toggle-btn--on::after {
  left: calc(100% - 14px);
  background: var(--ember-bright);
}

/* ── Footer ── */

.panel-footer {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--cinder) 60%, transparent);
}

.btn-reset,
.btn-close {
  flex: 1;
  padding: 0.55rem 0.5rem;
  font-family: var(--font-jersey);
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  cursor: pointer;
  background: transparent;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
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

.btn-reset {
  color: var(--text-dim);
  border: 1px solid color-mix(in srgb, var(--cinder) 60%, transparent);
}

.btn-reset:hover {
  color: var(--text-mid);
  border-color: var(--cinder);
}

.btn-close {
  color: var(--text-bright);
  border: 1px solid color-mix(in srgb, var(--ember-bright) 50%, transparent);
}

.btn-close:hover {
  color: var(--text-white);
  border-color: var(--ember-bright);
  background: color-mix(in srgb, var(--ember) 15%, transparent);
}

/* ── Transition ── */

.settings-fade-enter-active,
.settings-fade-leave-active {
  transition: opacity 0.18s;
}

.settings-fade-enter-from,
.settings-fade-leave-to {
  opacity: 0;
}
</style>
