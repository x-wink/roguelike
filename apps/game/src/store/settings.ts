import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Locale = 'zh' | 'en'
export type BattleSpeed = 'slow' | 'normal' | 'fast'

type SettingsSnap = {
  locale: Locale
  bgmVolume: number
  sfxVolume: number
  reducedMotion: boolean
  battleSpeed: BattleSpeed
  showBattleLog: boolean
}

const SETTINGS_KEY = 'crucible:settings'

const DEFAULTS: SettingsSnap = {
  locale: 'zh',
  bgmVolume: 70,
  sfxVolume: 80,
  reducedMotion: false,
  battleSpeed: 'normal',
  showBattleLog: true,
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export const useSettingsStore = defineStore('settings', () => {
  const locale = ref<Locale>(DEFAULTS.locale)
  const bgmVolume = ref(DEFAULTS.bgmVolume)
  const sfxVolume = ref(DEFAULTS.sfxVolume)
  const reducedMotion = ref(DEFAULTS.reducedMotion)
  const battleSpeed = ref<BattleSpeed>(DEFAULTS.battleSpeed)
  const showBattleLog = ref(DEFAULTS.showBattleLog)

  function _load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (!raw) return
      const d = JSON.parse(raw) as Partial<SettingsSnap>
      if (d.locale === 'zh' || d.locale === 'en') locale.value = d.locale
      if (typeof d.bgmVolume === 'number') bgmVolume.value = clamp(d.bgmVolume, 0, 100)
      if (typeof d.sfxVolume === 'number') sfxVolume.value = clamp(d.sfxVolume, 0, 100)
      if (typeof d.reducedMotion === 'boolean') reducedMotion.value = d.reducedMotion
      if (d.battleSpeed === 'slow' || d.battleSpeed === 'normal' || d.battleSpeed === 'fast')
        battleSpeed.value = d.battleSpeed
      if (typeof d.showBattleLog === 'boolean') showBattleLog.value = d.showBattleLog
    } catch {}
  }

  function reset() {
    locale.value = DEFAULTS.locale
    bgmVolume.value = DEFAULTS.bgmVolume
    sfxVolume.value = DEFAULTS.sfxVolume
    reducedMotion.value = DEFAULTS.reducedMotion
    battleSpeed.value = DEFAULTS.battleSpeed
    showBattleLog.value = DEFAULTS.showBattleLog
  }

  _load()

  watch([locale, bgmVolume, sfxVolume, reducedMotion, battleSpeed, showBattleLog], () => {
    try {
      const snap: SettingsSnap = {
        locale: locale.value,
        bgmVolume: bgmVolume.value,
        sfxVolume: sfxVolume.value,
        reducedMotion: reducedMotion.value,
        battleSpeed: battleSpeed.value,
        showBattleLog: showBattleLog.value,
      }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(snap))
    } catch {}
  })

  // 设置面板开关（跨组件共享，不持久化）
  const panelOpen = ref(false)

  return {
    locale,
    bgmVolume,
    sfxVolume,
    reducedMotion,
    battleSpeed,
    showBattleLog,
    reset,
    panelOpen,
  }
})
