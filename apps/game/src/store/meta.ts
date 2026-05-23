import { ACHIEVEMENTS, EQUIPMENTS } from '@/data'
import { checkCondition, type AchievementDef, type AchievementStats } from '@/data/achievements'
import type { EquipmentInstance, EquipSlot } from '@/game/meta'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const META_KEY = 'crucible:meta'

type EquipSlots = Record<EquipSlot, EquipmentInstance | null>

type MetaSnap = {
  v: 5
  unlockedSkillIds: string[]
  rareCurrency: number
  completedAchievementIds: string[]
  stats: AchievementStats
  discoveredRelicIds: string[]
  shownApexStage: number
  equipment: EquipSlots
}

function emptySlots(): EquipSlots {
  return { weapon: null, armor: null, accessory: null }
}

/** 校验存档里的单个槽位 shape，不合法整槽丢弃。 */
function _coerceInstance(raw: unknown): EquipmentInstance | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.defId !== 'string') return null
  if (!Array.isArray(r.affixIds) || r.affixIds.some((x) => typeof x !== 'string')) return null
  if (typeof r.rerollCount !== 'number' || r.rerollCount < 0) return null
  return { defId: r.defId, affixIds: [...(r.affixIds as string[])], rerollCount: r.rerollCount }
}

/** 洗练价格：30 × 2^rerollCount */
export function rerollPrice(rerollCount: number): number {
  return 30 * Math.pow(2, rerollCount)
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
  const _discoveredRelicIds = ref<Set<string>>(new Set())
  const shownApexStage = ref(-1) // -1 = 从未看过任何阶段
  const equipment = ref<EquipSlots>(emptySlots())

  // 待显示的成就通知队列（瞬态，不持久化）
  const pendingAchievements = ref<AchievementDef[]>([])

  function _load() {
    try {
      const raw = localStorage.getItem(META_KEY)
      if (!raw) return
      const snap = JSON.parse(raw) as Partial<MetaSnap>
      const v = snap.v as number
      if (v < 1 || v > 5) return
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
      if (Array.isArray(snap.discoveredRelicIds)) {
        _discoveredRelicIds.value = new Set(snap.discoveredRelicIds)
      }
      if (typeof snap.shownApexStage === 'number') {
        shownApexStage.value = snap.shownApexStage
      }
      if (snap.equipment && typeof snap.equipment === 'object') {
        const e = snap.equipment as Record<string, unknown>
        equipment.value = {
          weapon: _coerceInstance(e.weapon),
          armor: _coerceInstance(e.armor),
          accessory: _coerceInstance(e.accessory),
        }
      }
    } catch {}
  }

  function _save() {
    try {
      const snap: MetaSnap = {
        v: 5,
        unlockedSkillIds: [..._unlockedIds.value],
        rareCurrency: rareCurrency.value,
        completedAchievementIds: [..._completedIds.value],
        stats: { ...stats.value },
        discoveredRelicIds: [..._discoveredRelicIds.value],
        shownApexStage: shownApexStage.value,
        equipment: equipment.value,
      }
      localStorage.setItem(META_KEY, JSON.stringify(snap))
    } catch {}
  }

  _load()
  watch(
    [
      _unlockedIds,
      rareCurrency,
      _completedIds,
      stats,
      _discoveredRelicIds,
      shownApexStage,
      equipment,
    ],
    _save,
    { deep: true },
  )

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

  // ── 装备系统 ─────────────────────────────────────────────────────────────────

  function getEquipped(slot: EquipSlot): EquipmentInstance | null {
    return equipment.value[slot]
  }

  /** 购买装备：随机初始化词条，装入指定槽位（替换旧装备） */
  function buyEquipment(defId: string, rng: () => number): void {
    const def = EQUIPMENTS.find((d) => d.id === defId)
    if (!def) return
    const pool = def.affixPool
    const affixIds: string[] = []
    const available = pool.map((a) => a.id)
    for (let i = 0; i < def.affixCount && available.length > 0; i++) {
      const idx = Math.floor(rng() * available.length)
      affixIds.push(available[idx])
      available.splice(idx, 1)
    }
    equipment.value = {
      ...equipment.value,
      [def.slot]: { defId, affixIds, rerollCount: 0 },
    }
  }

  /**
   * 洗练指定槽位装备的第 affixIndex 个词条。
   * spend 回调用于扣金，扣失败则 reroll 不执行（原子）。
   * 返回 false 表示槽位无装备或扣金失败。
   */
  function rerollAffix(
    slot: EquipSlot,
    affixIndex: number,
    spend: (price: number) => boolean,
    rng: () => number,
  ): boolean {
    const inst = equipment.value[slot]
    if (!inst) return false
    const def = EQUIPMENTS.find((d) => d.id === inst.defId)
    if (!def) return false
    const currentId = inst.affixIds[affixIndex]
    const candidates = def.affixPool.map((a) => a.id).filter((id) => id !== currentId)
    if (candidates.length === 0) return false

    const price = rerollPrice(inst.rerollCount)
    if (!spend(price)) return false

    const newId = candidates[Math.floor(rng() * candidates.length)]
    const newAffixIds = [...inst.affixIds]
    newAffixIds[affixIndex] = newId
    equipment.value = {
      ...equipment.value,
      [slot]: { ...inst, affixIds: newAffixIds, rerollCount: inst.rerollCount + 1 },
    }
    return true
  }

  function unequip(slot: EquipSlot): void {
    equipment.value = { ...equipment.value, [slot]: null }
  }

  // ── 遗物图鉴 ─────────────────────────────────────────────────────────────────

  const discoveredCount = computed(() => _discoveredRelicIds.value.size)

  function isDiscovered(id: string): boolean {
    return _discoveredRelicIds.value.has(id)
  }

  function discoverRelic(id: string): void {
    if (_discoveredRelicIds.value.has(id)) return
    _discoveredRelicIds.value = new Set([..._discoveredRelicIds.value, id])
  }

  // ── 天渊先遣进度 ──────────────────────────────────────────────────────────────

  /**
   * 根据已通关区域数计算先遣台词阶段。
   * 0：首次踏入天渊（0–1 区域）
   * 1：初具积累（2–3 区域）
   * 2：深层到达（4+ 区域）
   */
  function computeApexStage(): number {
    const n = stats.value.clearedZones.length
    if (n >= 4) return 2
    if (n >= 2) return 1
    return 0
  }

  /** 若当前元进度对应的阶段高于已看阶段，返回该阶段编号；否则返回 -1（无需播放）。 */
  function pollApexStage(): number {
    const stage = computeApexStage()
    if (stage > shownApexStage.value) return stage
    return -1
  }

  function markApexStageShown(stage: number): void {
    if (stage > shownApexStage.value) shownApexStage.value = stage
  }

  function resetApexStage(): void {
    shownApexStage.value = -1
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
    discoveredCount,
    isDiscovered,
    discoverRelic,
    pollApexStage,
    markApexStageShown,
    resetApexStage,
    shownApexStage,
    equipment,
    getEquipped,
    buyEquipment,
    rerollAffix,
    unequip,
  }
})
