import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const META_KEY = 'crucible:meta'

type MetaSnap = {
  v: 1
  unlockedSkillIds: string[]
  rareCurrency: number
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

export const useMetaStore = defineStore('meta', () => {
  // 只记录「额外解锁」，starter 集合不写入
  const _unlockedIds = ref<Set<string>>(new Set())
  const rareCurrency = ref(0)

  function _load() {
    try {
      const raw = localStorage.getItem(META_KEY)
      if (!raw) return
      const snap = JSON.parse(raw) as Partial<MetaSnap>
      if (snap.v !== 1) return
      if (Array.isArray(snap.unlockedSkillIds)) {
        _unlockedIds.value = new Set(snap.unlockedSkillIds)
      }
      if (typeof snap.rareCurrency === 'number') {
        rareCurrency.value = Math.max(0, snap.rareCurrency)
      }
    } catch {}
  }

  function _save() {
    try {
      const snap: MetaSnap = {
        v: 1,
        unlockedSkillIds: [..._unlockedIds.value],
        rareCurrency: rareCurrency.value,
      }
      localStorage.setItem(META_KEY, JSON.stringify(snap))
    } catch {}
  }

  _load()
  watch([_unlockedIds, rareCurrency], _save, { deep: true })

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

  return {
    rareCurrency,
    unlockedCount,
    isUnlocked,
    unlockSkill,
    earnRareCurrency,
    spendRareCurrency,
  }
})
