import {
  applyEventEffect,
  applyRelicToPlayer,
  createPlayerFromSnapshot,
  extractEnemyData,
  extractPlayerData,
} from '@/game/session'
import {
  createBattleSandbox,
  getBattleTurn,
  getSessionEnemy,
  getSessionPlayer,
  getUnitActionTime,
  isSanDrained,
  mountMutationBuffs,
  runBattleTurn,
  type BattleData,
  type BattleSandbox,
} from '@/game/battle'
import { createRng, randomSeed } from '@xwink/engine'
import {
  applyUpgrade,
  buildSkillCandidates,
  type BattleLogEntry,
  type SkillCandidate,
  type UnitSnapshot,
} from '@xwink/rpg'
import type {
  GameEvent,
  GamePhase,
  GameResult,
  MapNode,
  RelicData,
  ShopItem,
  ZoneId,
} from '@/game/meta'
import { makeSessionNodes } from '@/game/meta'
import type { StoryScript } from '@/game/story/types'
import {
  ENEMIES,
  EVENT_POOL,
  MUTATIONS,
  PLAYER_START,
  RELICS,
  SHOP_ITEMS,
  SKILL_POOL,
} from '@/data'
import { Player, type PlayerData } from '@/game/units/player'
import { Enemy } from '@/game/units/enemy'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef, triggerRef, watch } from 'vue'
import router from '@/router'

// ── 持久化 ────────────────────────────────────────────────────────────────────

const STORE_KEY = 'crucible:store'

type StoreSnap = {
  v: 5
  phase: GamePhase
  result: GameResult
  activeZone: ZoneId | null
  nodes: MapNode[]
  idx: number
  pending: boolean
  event: GameEvent | null
  shop: ShopItem[]
  skills: SkillCandidate[]
  relics: RelicData[]
  playerData: unknown
  playerSnap: unknown
  globalPlayerData: unknown
  globalPlayerSnap: unknown
  battleData: unknown
  battleSession: unknown
  storyId: string | null
  sessionSeed: number
  sessionRngCount: number
  prologueStage: 0 | 1 | 2
  runCount: number
  clearedZones: ZoneId[]
}

function makePlayer(): Player {
  return new Player({
    id: 'player',
    name: '',
    health: 80,
    energy: 80,
    san: 100,
    str: 6,
    con: 3,
    agi: 8,
    int: 5,
    lck: 8,
    skills: PLAYER_START.skills,
  })
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = defineStore('game', () => {
  const phase = ref<GamePhase>('home')
  const result = ref<GameResult>(null)

  // ── 序章进度（跨 session 保持） ───────────────────────────────────────────
  // 0 = 未看醒来；1 = 醒来已播，待初遇；2 = 初遇已播（余烬出现、命名完成）
  const prologueStage = ref<0 | 1 | 2>(0)

  // ── 局数计数器（每次 endSession +1，用于余烬对话轮转） ────────────────────
  const runCount = ref(0)

  // ── 已通关区域（解锁下一层的凭据） ──────────────────────────────────────
  const clearedZones = ref<ZoneId[]>([])

  // ── 全局属性（session 间保持，session 内只读） ─────────────────────────────
  const globalPlayer = shallowRef<Player>(makePlayer())

  // ── Session 状态（enterZone 时从 globalPlayer 克隆，endSession 时销毁） ────
  const activeZone = ref<ZoneId | null>(null)
  const player = shallowRef<Player>(makePlayer())
  const nodes = ref<MapNode[]>([])
  const currentNodeIndex = ref(0)
  const pendingAdvance = ref(false)
  const skillCandidates = shallowRef<SkillCandidate[]>([])
  const relicCandidates = shallowRef<RelicData[]>([])
  const currentEvent = ref<GameEvent | null>(null)
  const shopItems = shallowRef<ShopItem[]>([])
  const _battle = shallowRef<BattleSandbox | null>(null)

  // ── Session 级确定性 RNG（变异/事件/商店/遗物三选一） ──────────────────────
  // 战斗内 RNG 由 BattlePlugin 自治；session 编排层另起一条 Mulberry32 序列，
  // 通过持久化 sessionSeed + sessionRngCount 实现存档重开后的可复现。
  let _sessionSeed = 0
  let _sessionRngCount = 0
  let _sessionRng: () => number = () => Math.random() // enterZone 前用占位（home 阶段不会调用）
  function _resetSessionRng(seed: number, count: number) {
    _sessionSeed = seed
    _sessionRngCount = count
    const raw = createRng(seed)
    for (let i = 0; i < count; i++) raw()
    _sessionRng = () => {
      _sessionRngCount++
      return raw()
    }
  }
  function srand(): number {
    return _sessionRng()
  }
  function srandInt(n: number): number {
    return Math.floor(srand() * n)
  }
  function sshuffle<T>(arr: readonly T[]): T[] {
    const out = [...arr]
    for (let i = out.length - 1; i > 0; i--) {
      const j = srandInt(i + 1)
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  // ── 剧情 ──────────────────────────────────────────────────────────────────
  const currentScript = shallowRef<StoryScript | null>(null)

  function playStory(script: StoryScript) {
    currentScript.value = script
    phase.value = 'story'
  }

  function endStory() {
    const scriptId = currentScript.value?.id
    currentScript.value = null
    if (scriptId === 'prologue-awaken') prologueStage.value = 1
    else if (scriptId === 'prologue-encounter') prologueStage.value = 2
    phase.value = 'home'
    _persist()
  }

  function submitStoryInput(inputId: string, value: string) {
    if (currentScript.value?.id === 'prologue-encounter' && inputId === 'player-name') {
      const name = value.trim()
      if (name) {
        player.value.name = name
        globalPlayer.value.name = name
        triggerRef(player)
        _persist()
      }
      return
    }
    // 未匹配的输入静默吞掉容易掩盖未来剧情接线遗漏。
    console.warn(
      `[story] unrouted input: scriptId="${currentScript.value?.id ?? 'null'}" inputId="${inputId}"`,
    )
  }

  // ── Arena 演武场独立状态 ──────────────────────────────────────────────────
  const _isArena = ref(false)
  let _savedPlayer: Player | null = null
  const arenaAutoPlay = ref(false)
  let _autoPlayTimer: ReturnType<typeof setTimeout> | null = null

  // phase 变化时同步推送路由；'map' 留在营地，arena/skipNav 时跳过
  let _skipNav = false
  watch(phase, (p) => {
    if (_isArena.value || _skipNav) return
    void router.push(p === 'map' ? '/game/home' : '/game/' + p)
  })

  // ── 派生状态 ──────────────────────────────────────────────────────────────
  const enemy = computed(() => {
    const session = _battle.value?.unit
    return session ? (getSessionEnemy(session) ?? null) : null
  })
  const battleLog = computed<BattleLogEntry[]>(() => _battle.value?.unit.log ?? [])
  const turn = computed<number>(() => {
    const session = _battle.value?.unit
    return session ? getBattleTurn(session) : 0
  })
  const canUndoTurn = computed<boolean>(() => _battle.value?.canUndo ?? false)
  const canRedoTurn = computed<boolean>(() => _battle.value?.canRedo ?? false)
  const playerNextActionTime = computed(() => {
    const session = _battle.value?.unit
    return session ? getUnitActionTime(session, 'player') : 0
  })
  const enemyNextActionTime = computed(() => {
    const session = _battle.value?.unit
    const e = enemy.value
    return session && e ? getUnitActionTime(session, e.id) : 0
  })

  const currentNode = computed(() => nodes.value[currentNodeIndex.value] ?? null)

  function _notify() {
    triggerRef(player)
    triggerRef(_battle)
  }

  // ── 持久化 ────────────────────────────────────────────────────────────────

  function _persist(): void {
    if (_isArena.value) return
    try {
      const inBattle = phase.value === 'battle' && _battle.value !== null
      // 剧情阶段（首次序章，未来分支剧情）不支持中途 resume：组件本地 currentBeatIndex
      // 不可恢复，强行复原会让玩家从第 0 幕重看。持久化时 phase 写为 'home'，
      // 玩家刷新后落在主菜单，剧情靠手动重放。
      const persistPhase: GamePhase = phase.value === 'story' ? 'home' : phase.value
      const snap: StoreSnap = {
        v: 5,
        phase: persistPhase,
        result: result.value,
        activeZone: activeZone.value,
        nodes: nodes.value,
        idx: currentNodeIndex.value,
        pending: pendingAdvance.value,
        event: currentEvent.value,
        shop: shopItems.value,
        skills: skillCandidates.value,
        relics: relicCandidates.value,
        playerData: extractPlayerData(player.value),
        playerSnap: player.value.snapshot(),
        globalPlayerData: extractPlayerData(globalPlayer.value),
        globalPlayerSnap: globalPlayer.value.snapshot(),
        battleData: inBattle ? _battle.value!.data : null,
        battleSession: inBattle ? JSON.parse(_battle.value!.serialize()) : null,
        storyId: null,
        sessionSeed: _sessionSeed,
        sessionRngCount: _sessionRngCount,
        prologueStage: prologueStage.value,
        runCount: runCount.value,
        clearedZones: clearedZones.value,
      }
      localStorage.setItem(STORE_KEY, JSON.stringify(snap))
    } catch {
      // localStorage 不可用或超出配额，静默忽略
    }
  }

  function _restore(): boolean {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (!raw) return false
      const snap = JSON.parse(raw) as StoreSnap
      if (snap.v !== 5) {
        // 旧版本/脏数据：直接清理，避免每次启动都走解析失败路径。
        localStorage.removeItem(STORE_KEY)
        return false
      }
      // 结局阶段视为本局已结束：旧存档不应在下次启动时把玩家强制带回 result 页。
      if (snap.phase === 'result') {
        localStorage.removeItem(STORE_KEY)
        return false
      }

      _skipNav = true
      phase.value = snap.phase
      result.value = snap.result
      activeZone.value = snap.activeZone
      prologueStage.value = snap.prologueStage ?? 0
      runCount.value = snap.runCount ?? 0
      clearedZones.value = snap.clearedZones ?? []

      // 优先重建 globalPlayer：承载主角姓名/全局属性，session 期与 home 期都依赖它。
      if (snap.globalPlayerData && snap.globalPlayerSnap) {
        globalPlayer.value = createPlayerFromSnapshot(
          snap.globalPlayerData as PlayerData,
          snap.globalPlayerSnap as UnitSnapshot,
        )
      }

      if (snap.activeZone !== null) {
        nodes.value = snap.nodes
        currentNodeIndex.value = snap.idx
        pendingAdvance.value = snap.pending
        currentEvent.value = snap.event
        shopItems.value = snap.shop as ShopItem[]
        skillCandidates.value = snap.skills as SkillCandidate[]
        relicCandidates.value = snap.relics as RelicData[]
        // sessionRng 恢复：seed 不变，count 跑回原位置。
        _resetSessionRng(snap.sessionSeed, snap.sessionRngCount)

        if (snap.battleData && snap.battleSession && snap.phase === 'battle') {
          const bd = snap.battleData as BattleData
          const sandbox = createBattleSandbox(bd.playerData, bd.playerSnap, bd.enemy, bd.seed)
          sandbox.deserialize(JSON.stringify(snap.battleSession))
          _battle.value = sandbox
          player.value = getSessionPlayer(sandbox.unit)
        } else if (snap.playerData && snap.playerSnap) {
          player.value = createPlayerFromSnapshot(
            snap.playerData as PlayerData,
            snap.playerSnap as UnitSnapshot,
          )
        }
      } else {
        player.value = globalPlayer.value
      }

      _skipNav = false

      const resumePhases: GamePhase[] = [
        'battle',
        'relic-pick',
        'skill-pick',
        'event',
        'shop',
        'rest',
      ]
      if (router.currentRoute.value.path.startsWith('/game') && resumePhases.includes(snap.phase)) {
        void router.isReady().then(() => void router.replace('/game/' + snap.phase))
      }

      return true
    } catch {
      return false
    }
  }

  // ── Session 管理 ──────────────────────────────────────────────────────────

  function enterZone(zoneId: ZoneId) {
    // 从全局属性克隆 session 初始状态
    const pData = extractPlayerData(globalPlayer.value)
    const pSnap = globalPlayer.value.snapshot()
    player.value = createPlayerFromSnapshot(pData, pSnap as UnitSnapshot)

    activeZone.value = zoneId
    nodes.value = makeSessionNodes(zoneId)
    currentNodeIndex.value = 0
    pendingAdvance.value = false
    skillCandidates.value = []
    relicCandidates.value = []
    currentEvent.value = null
    shopItems.value = []
    _battle.value = null
    result.value = null
    _resetSessionRng(randomSeed(), 0)

    phase.value = 'map'
    _persist()
  }

  function endSession() {
    // session 数据销毁，全局属性不受影响
    runCount.value++
    player.value = globalPlayer.value
    activeZone.value = null
    nodes.value = []
    currentNodeIndex.value = 0
    pendingAdvance.value = false
    skillCandidates.value = []
    relicCandidates.value = []
    currentEvent.value = null
    shopItems.value = []
    _battle.value = null
    result.value = null

    phase.value = 'home'
    // 持久化营地状态：globalPlayer（含姓名）、prologueStage、runCount 等需跨刷新保留
    _persist()
  }

  // 手动退出 session（同 endSession，语义上区分「完成/死亡结束」与「玩家主动退出」）
  const exitSession = endSession

  // ── 地图节点 ──────────────────────────────────────────────────────────────

  function enterNode() {
    const node = currentNode.value
    if (!node) return
    if (node.type === 'rest') {
      phase.value = 'rest'
    } else if (node.type === 'event') {
      const idx = srandInt(EVENT_POOL.length)
      currentEvent.value = EVENT_POOL[idx]
      phase.value = 'event'
    } else if (node.type === 'shop') {
      shopItems.value = sshuffle(SHOP_ITEMS).slice(0, 3)
      phase.value = 'shop'
    } else if (['battle', 'elite', 'boss'].includes(node.type)) {
      // 普通战斗/精英节点有概率附加变异词条
      if (['battle', 'elite'].includes(node.type)) {
        const mutChance = ENEMIES[node.enemyId!]?.mutationChance ?? 0
        const appliedMutations: string[] = []
        if (mutChance > 0 && srand() < mutChance) {
          const mutKeys = Object.keys(MUTATIONS)
          appliedMutations.push(mutKeys[srandInt(mutKeys.length)])
        }
        node.appliedMutations = appliedMutations
      }

      const p = player.value
      p.energy.value = 0
      const playerData = extractPlayerData(p)
      const playerSnap = p.snapshot()
      const battle = createBattleSandbox(playerData, playerSnap, ENEMIES[node.enemyId!])

      if (node.appliedMutations?.length) {
        mountMutationBuffs(battle.unit, node.appliedMutations, MUTATIONS)
      }

      _battle.value = battle
      player.value = getSessionPlayer(battle.unit)

      phase.value = 'battle'
      _advanceToNextActor()
      return
    }
    _persist()
  }

  // ── 战斗 ──────────────────────────────────────────────────────────────────

  function _advanceToNextActor() {
    const sandbox = _battle.value!

    const { battleResult } = runBattleTurn(sandbox)
    _notify()

    if (battleResult === 'win') {
      _onBattleWin()
      return
    }
    if (battleResult === 'lose') {
      phase.value = 'result'
      if (_isArena.value) {
        result.value = { kind: 'defeat', reason: 'arena' }
        return
      }
      // san-zero 路径由 SanPlugin 在 san:drained 时打标志，与 turn:end 时序解耦：
      // 即便未来调整 HP 削为 0 的时机，这里仍能从 marker 拿到准确判定。
      const drained = isSanDrained(sandbox.unit, 'player')
      result.value = { kind: 'defeat', reason: drained ? 'san-zero' : 'hp-zero' }
      _persist()
      return
    }

    pendingAdvance.value = true
    _persist()
    if (_isArena.value && arenaAutoPlay.value) {
      _scheduleAutoAdvance(800)
    }
  }

  function confirmAdvance() {
    if (!pendingAdvance.value) return
    pendingAdvance.value = false
    _advanceToNextActor()
  }

  function onTimelineAnimationEnd() {
    if (_isArena.value && !arenaAutoPlay.value) return
    confirmAdvance()
  }

  function arenaSetAutoPlay(enabled: boolean, intervalMs = 800): void {
    arenaAutoPlay.value = enabled
    if (_autoPlayTimer !== null) {
      clearTimeout(_autoPlayTimer)
      _autoPlayTimer = null
    }
    if (enabled && pendingAdvance.value && phase.value === 'battle') {
      _scheduleAutoAdvance(intervalMs)
    }
  }

  function _scheduleAutoAdvance(intervalMs: number): void {
    _autoPlayTimer = setTimeout(() => {
      _autoPlayTimer = null
      if (arenaAutoPlay.value && pendingAdvance.value && phase.value === 'battle') {
        confirmAdvance()
      }
    }, intervalMs)
  }

  function undoTurn(): boolean {
    if (!_battle.value?.undo()) return false
    pendingAdvance.value = true
    player.value = getSessionPlayer(_battle.value.unit)
    triggerRef(_battle)
    _persist()
    return true
  }

  function redoTurn(): boolean {
    if (!_battle.value?.redo()) return false
    pendingAdvance.value = true
    player.value = getSessionPlayer(_battle.value.unit)
    triggerRef(_battle)
    _persist()
    return true
  }

  function exportBattle(): string | null {
    return _battle.value?.serialize() ?? null
  }

  function _onBattleWin() {
    _notify()

    if (_isArena.value) {
      phase.value = 'result'
      result.value = { kind: 'victory', reason: 'arena' }
      return
    }

    nodes.value[currentNodeIndex.value].completed = true

    // 计算并发放金币
    const node = currentNode.value
    const baseGold = node?.enemyId ? (ENEMIES[node.enemyId]?.goldDrop ?? 0) : 0
    const goldMult = (node?.appliedMutations ?? []).reduce(
      (acc, mid) => acc * (MUTATIONS[mid]?.goldMultiplier ?? 1),
      1,
    )
    const gold = Math.floor(baseGold * goldMult) + player.value.backpack.goldBonusFromRelics()
    if (gold > 0) player.value.backpack.addGold(gold)

    // Boss 直接结束 session
    if (node?.type === 'boss') {
      _markZoneCleared()
      phase.value = 'result'
      result.value = { kind: 'victory', reason: 'boss' }
      _persist()
      return
    }

    _offerRelicPick()
    _persist()
  }

  // ── 事件 ──────────────────────────────────────────────────────────────────

  function resolveEvent(optionIndex: number) {
    const ev = currentEvent.value
    if (!ev) return
    applyEventEffect(ev.options[optionIndex].effect, player.value)
    currentEvent.value = null
    nodes.value[currentNodeIndex.value].completed = true
    _notify()
    _advanceNode()
  }

  // ── 商店 ──────────────────────────────────────────────────────────────────

  function buyShopItem(item: ShopItem) {
    if (!player.value.backpack.spendGold(item.cost)) return
    applyEventEffect(item.effect, player.value)
    shopItems.value = []
    nodes.value[currentNodeIndex.value].completed = true
    _notify()
    _advanceNode()
  }

  function skipShop() {
    shopItems.value = []
    nodes.value[currentNodeIndex.value].completed = true
    _advanceNode()
  }

  // ── 遗物选择 ──────────────────────────────────────────────────────────────

  function _offerRelicPick() {
    const picks = sshuffle(RELICS).slice(0, Math.min(3, RELICS.length))
    if (picks.length === 0) {
      // 无候选直接跳过，避免 UI 卡死在空 relic-pick 阶段。
      _offerSkillPick()
      _persist()
      return
    }
    relicCandidates.value = picks
    phase.value = 'relic-pick'
  }

  function pickRelic(relic: RelicData) {
    applyRelicToPlayer(relic, player.value)
    relicCandidates.value = []
    triggerRef(player)
    _offerSkillPick()
    _persist()
  }

  function skipRelicPick() {
    relicCandidates.value = []
    _offerSkillPick()
    _persist()
  }

  // ── 技能选择 ──────────────────────────────────────────────────────────────

  function _offerSkillPick() {
    const p = player.value
    const candidates = buildSkillCandidates(p.pool.raw, SKILL_POOL, p.getStat('lck'), 3)
    skillCandidates.value = candidates
    phase.value = 'skill-pick'
  }

  function pickSkill(candidate: SkillCandidate) {
    const p = player.value
    if (candidate.kind === 'acquire') {
      const skill = candidate.skill
      const role = skill.role ?? 'normal'
      if (role === 'passive') {
        const passives = p.pool.passives
        if (passives.length < 3) {
          p.pool.add(skill)
        } else {
          const last = passives[passives.length - 1]
          p.pool.remove(last.id)
          p.pool.add(skill)
        }
      } else {
        const existing = p.pool.raw.find((s) => (s.role ?? 'normal') === role)
        if (existing) p.pool.remove(existing.id)
        p.pool.add(skill)
      }
    } else {
      const skill = p.pool.raw.find((s) => s.id === candidate.skill.id)
      if (skill) {
        const upgraded = applyUpgrade(skill, candidate.upgrade.delta)
        upgraded.upgradeLevel = (skill.upgradeLevel ?? 0) + 1
        p.pool.update(upgraded)
      }
    }
    skillCandidates.value = []
    _advanceNode()
  }

  function skipSkillPick() {
    skillCandidates.value = []
    _advanceNode()
  }

  // ── 休息 ──────────────────────────────────────────────────────────────────

  function restHeal() {
    player.value.health.add(Math.floor(player.value.health.max * 0.3))
    _notify()
    nodes.value[currentNodeIndex.value].completed = true
    _advanceNode()
  }

  function restUpgradeSkill(skillId: string) {
    const p = player.value
    const skill = p.pool.raw.find((s) => {
      const m = s.multiplier
      return s.id === skillId && (typeof m === 'number' ? m : m.max) > 0
    })
    if (skill) {
      p.pool.update(applyUpgrade(skill, { multiplier: 0.1 }))
      _notify()
    }
    nodes.value[currentNodeIndex.value].completed = true
    _advanceNode()
  }

  // ── 区域通关记录 ──────────────────────────────────────────────────────────

  function _markZoneCleared() {
    const zone = activeZone.value
    if (!zone || clearedZones.value.includes(zone)) return
    clearedZones.value = [...clearedZones.value, zone]
  }

  // ── 节点推进 ──────────────────────────────────────────────────────────────

  function _advanceNode() {
    if (currentNodeIndex.value < nodes.value.length - 1) {
      currentNodeIndex.value++
      phase.value = 'map'
    } else {
      // session 全部节点完成（最后一个节点不是 boss 时走到这里，常规路径由 _onBattleWin 直接结算 boss）
      _markZoneCleared()
      phase.value = 'result'
      result.value = { kind: 'victory', reason: 'session-clear' }
    }
    _persist()
  }

  // ── 演武场 ────────────────────────────────────────────────────────────────

  function arenaStartBattle(arenaPlayer: Player, arenaEnemy: Enemy): void {
    _isArena.value = true
    _savedPlayer = player.value

    arenaPlayer.energy.value = 0
    const playerData = extractPlayerData(arenaPlayer)
    const playerSnap = arenaPlayer.snapshot()
    const enemyData = extractEnemyData(arenaEnemy)
    const battle = createBattleSandbox(playerData, playerSnap, enemyData)
    _battle.value = battle
    player.value = getSessionPlayer(battle.unit)

    pendingAdvance.value = false
    result.value = null
    phase.value = 'battle'
    _advanceToNextActor()
  }

  function exitArena(): void {
    if (_autoPlayTimer !== null) {
      clearTimeout(_autoPlayTimer)
      _autoPlayTimer = null
    }
    arenaAutoPlay.value = false
    _isArena.value = false
    if (_savedPlayer) {
      player.value = _savedPlayer
      _savedPlayer = null
    }
    _battle.value = null
    pendingAdvance.value = false
    result.value = null
    _skipNav = true
    phase.value = 'home'
    _skipNav = false
    _persist()
  }

  // ── 初始化恢复 ────────────────────────────────────────────────────────────
  _restore()

  return {
    phase,
    result,
    player,
    nodes,
    currentNodeIndex,
    currentNode,
    activeZone,
    enemy,
    battleLog,
    turn,
    pendingAdvance,
    skillCandidates,
    relicCandidates,
    currentEvent,
    shopItems,
    canUndoTurn,
    canRedoTurn,
    playerNextActionTime,
    enemyNextActionTime,
    confirmAdvance,
    onTimelineAnimationEnd,
    undoTurn,
    redoTurn,
    exportBattle,
    enterZone,
    endSession,
    exitSession,
    enterNode,
    resolveEvent,
    buyShopItem,
    skipShop,
    pickRelic,
    skipRelicPick,
    pickSkill,
    skipSkillPick,
    restHeal,
    restUpgradeSkill,
    arenaStartBattle,
    arenaSetAutoPlay,
    arenaAutoPlay,
    exitArena,
    currentScript,
    playStory,
    endStory,
    submitStoryInput,
    prologueStage,
    runCount,
    clearedZones,
  }
})
