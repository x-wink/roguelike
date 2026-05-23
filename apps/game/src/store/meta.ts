import { ACHIEVEMENTS } from '@/data'
import { checkCondition, type AchievementDef, type AchievementStats } from '@/data/achievements'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const META_KEY = 'crucible:meta'

type MetaSnap = {
  v: 2
  unlockedSkillIds: string[]
  rareCurrency: number
  completedAchievementIds: string[]
  stats: AchievementStats
}

/** 初始就可用的技能——无需解锁 */
export const STARTER_SKILL_IDS = new Set([
  'normal_balanced',
  'ultimate_balanced',
  'passive_bal_dot',
  'passive_bal_debuff',
  'passive_bal_synergy',
  'normal_aggressive',
  'ultimate_aggressive',
  'passive_agg_frenzy',
  'passive_atk',
  'passive_def',
  'passive_spd',
  'passive_hp',
])

function defaultStats(): AchievementStats {
  return {
    totalBattleWins: 0,
    totalRuns: 0,
    totalRelicsCollected: 0,
    totalSealedRelics: 0,
    totalUpgrades: 0,
    totalLotteryUnlocks: 0,
    clearedZones: [],
  }
}

export const useMetaStore = defineStore('meta', () => {
  const _unlockedIds = ref<Set<string>>(new Set())
  const rareCurrency = ref(0)
  const _completedIds = ref<Set<string>>(new Set())
  const stats = ref<AchievementStats>(defaultStats())

  // 待显示的成就通知队列（瞬态，不持久化）
  const pendingAchievements = ref<AchievementDef[]>([])

  function _load() {
    try {
      const raw = localStorage.getItem(META_KEY)
      if (!raw) return
      const snap = JSON.parse(raw) as Partial<MetaSnap>
      // v1 → v2 无破坏性字段变更，兼容读取
      const v = snap.v as number
      if (v !== 1 && v !== 2) return
      if (Array.isArray(snap.unlockedSkillIds)) {
        _unlockedIds.value = new Set(snap.unlockedSkillIds)
      }
      if (typeof snap.rareCurrency === 'number') {
        rareCurrency.value = Math.max(0, snap.rareCurrency)
      }
      if (Array.isArray(snap.completedAchievementIds)) {
        _completedIds.value = new Set(snap.completedAchievementIds)
      }
      if (snap.stats && typeof snap.stats === 'object') {
        stats.value = { ...defaultStats(), ...snap.stats }
      }
    } catch {}
  }

  function _save() {
    try {
      const snap: MetaSnap = {
        v: 2,
        unlockedSkillIds: [..._unlockedIds.value],
        rareCurrency: rareCurrency.value,
        completedAchievementIds: [..._completedIds.value],
        stats: { ...stats.value },
      }
      localStorage.setItem(META_KEY, JSON.stringify(snap))
    } catch {}
  }

  _load()
  watch([_unlockedIds, rareCurrency, _completedIds, stats], _save, { deep: true })

  // ── 技能解锁 ─────────────────────────────────────────────────────────────────

  const unlockedCount = computed(() => STARTER_SKILL_IDS.size + _unlockedIds.value.size)

  function isUnlocked(id: string): boolean {
    return STARTER_SKILL_IDS.has(id) || _unlockedIds.value.has(id)
  }

  function unlockSkill(id: string): void {
    if (isUnlocked(id)) return
    _unlockedIds.value = new Set([..._unlockedIds.value, id])
  }

  function earnRareCurrency(amount: number): void {
    rareCurrency.value = Math.max(0, rareCurrency.value + amount)
  }

  function spendRareCurrency(amount: number): boolean {
    if (rareCurrency.value < amount) return false
    rareCurrency.value -= amount
    return true
  }

  // ── 成就系统 ─────────────────────────────────────────────────────────────────

  function isAchieved(id: string): boolean {
    return _completedIds.value.has(id)
  }

  /** 更新统计计数器，然后扫描所有未完成成就，触发新解锁 */
  function checkAchievements(patch: Partial<AchievementStats>): void {
    const s = stats.value
    if (patch.totalBattleWins) s.totalBattleWins += patch.totalBattleWins
    if (patch.totalRuns) s.totalRuns += patch.totalRuns
    if (patch.totalRelicsCollected) s.totalRelicsCollected += patch.totalRelicsCollected
    if (patch.totalSealedRelics) s.totalSealedRelics += patch.totalSealedRelics
    if (patch.totalUpgrades) s.totalUpgrades += patch.totalUpgrades
    if (patch.totalLotteryUnlocks) s.totalLotteryUnlocks += patch.totalLotteryUnlocks
    if (patch.clearedZones?.length) {
      for (const z of patch.clearedZones) {
        if (!s.clearedZones.includes(z)) s.clearedZones.push(z)
      }
    }

    for (const def of ACHIEVEMENTS) {
      if (_completedIds.value.has(def.id)) continue
      if (!checkCondition(def.condition, s)) continue
      _completedIds.value = new Set([..._completedIds.value, def.id])
      earnRareCurrency(def.rareCurrency)
      pendingAchievements.value.push(def)
    }
  }

  function shiftPendingAchievement(): AchievementDef | undefined {
    return pendingAchievements.value.shift()
  }

  return {
    rareCurrency,
    unlockedCount,
    isUnlocked,
    unlockSkill,
    earnRareCurrency,
    spendRareCurrency,
    stats,
    isAchieved,
    checkAchievements,
    pendingAchievements,
    shiftPendingAchievement,
  }
})
