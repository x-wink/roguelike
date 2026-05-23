<template>
  <div class="home-shell">
    <!-- 顶部信息栏 -->
    <header class="top-bar">
      <div class="top-left">
        <div class="player-identity">
          <span class="player-name">{{ game.player.name || '???' }}</span>
          <span class="player-level">Lv.{{ game.player.growth.level }}</span>
        </div>
      </div>
      <div class="top-center">
        <div class="stat-row">
          <span class="stat-lbl">HP</span>
          <div class="stat-track">
            <div class="stat-fill fill-hp" :style="{ width: hpPct + '%' }" />
          </div>
          <span class="stat-val">{{ hp }}/{{ game.player.health.max }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-lbl">SAN</span>
          <div class="stat-track">
            <div
              class="stat-fill fill-san"
              :style="{ width: sanPct + '%' }"
              :class="sanFillClass"
            />
          </div>
          <span class="stat-val" :class="sanValClass">{{ san }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-lbl">EXP</span>
          <div class="stat-track">
            <div class="stat-fill fill-exp" :style="{ width: expPct + '%' }" />
          </div>
          <span class="stat-val">{{ exp }}/{{ expNext }}</span>
        </div>
      </div>
      <div class="top-right">
        <span class="currency-badge currency-gold">◈ {{ gold }}</span>
        <span class="currency-badge currency-rare">◆ {{ rareCurrency }}</span>
      </div>
    </header>

    <!-- 主体区域 -->
    <div class="body-layout">
      <!-- 中央内容（全宽） -->
      <main class="center-area">
        <!-- 营地视图 -->
        <div v-show="activeTab === 'camp'" class="camp-view">
          <div class="camp-scene">
            <div class="scene-ambient" />
            <div v-if="game.prologueStage >= 2" class="companion-stage" @click="onEmberClick">
              <div class="companion-portrait-wrap">
                <div class="companion-glyph">烬</div>
                <div class="companion-halo" />
              </div>
              <p class="companion-name">余烬</p>
              <p class="companion-state">在常坐的位置</p>
            </div>
            <div class="scene-floor" />
          </div>

          <Transition name="dialogue-pop">
            <div v-if="currentDialogue !== null" class="dialogue-zone">
              <span class="dialogue-mark">「</span>
              <p class="dialogue-text">{{ currentDialogue }}</p>
              <span class="dialogue-mark">」</span>
            </div>
          </Transition>

          <div class="action-zone">
            <button v-if="game.prologueStage >= 1" class="btn-enter" @click="onTabClick('map')">
              <span>踏入渊</span>
              <span class="btn-arrow">→</span>
            </button>
            <Transition name="lottery-pop">
              <p v-if="lotteryResult" class="lottery-toast">已解锁：{{ lotteryResult }}</p>
            </Transition>
            <button
              v-if="hasLockedSkills"
              class="btn-lottery"
              :disabled="rareCurrency < 1"
              @click="onLottery"
            >
              <span class="lottery-currency">◆1</span>
              <span>随机解锁技能</span>
            </button>
          </div>
        </div>

        <!-- 地图视图 -->
        <div v-show="activeTab === 'map'" class="map-view">
          <div class="map-header">
            <button v-if="game.activeZone" class="map-back" @click="game.exitSession()">←</button>
            <p class="map-label">
              {{ game.activeZone ? ZONE_META[game.activeZone].name + ' · 节点' : 'WORLD MAP · 渊' }}
            </p>
          </div>
          <WorldMap v-if="!game.activeZone" @select="game.enterZone($event)" />
          <GameMap v-else />
        </div>

        <!-- 角色 tab -->
        <div v-show="activeTab === 'char'" class="char-view">
          <UnitStatsPanel :unit="game.player" />
          <div class="mt-4">
            <EquipmentPanel />
          </div>
        </div>

        <!-- 图鉴 tab -->
        <div v-show="activeTab === 'lore'" class="lore-tab-view">
          <GameLore />
        </div>

        <!-- 其他 tab 占位 -->
        <div
          v-show="
            activeTab !== 'camp' &&
            activeTab !== 'map' &&
            activeTab !== 'char' &&
            activeTab !== 'lore'
          "
          class="placeholder-view"
        >
          <p class="placeholder-label">{{ currentTabLabel }}</p>
          <p class="placeholder-hint">尚未开放</p>
        </div>
      </main>

      <!-- 设置入口（仅营地 tab，浮动于右上角） -->
      <template v-if="activeTab === 'camp'">
        <button
          class="camp-menu-btn"
          :title="t('settings.title')"
          @click="settings.panelOpen = true"
        >
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
    </div>

    <!-- 底部 Tab 导航 -->
    <nav class="tab-bar">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="onTabClick(tab.id)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-name">{{ tab.name }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useGameStore } from '@/store/game'
import { useMetaStore } from '@/store/meta'
import { useSettingsStore } from '@/store/settings'
import { useT } from '@/i18n'
import { ZONE_META } from '@/game/meta'
import { SKILL_POOL } from '@/data'
import GameMap from './GameMap.vue'
import WorldMap from './WorldMap.vue'
import UnitStatsPanel from '@/ui/components/UnitStatsPanel.vue'
import EquipmentPanel from '@/ui/components/EquipmentPanel.vue'
import { PROLOGUE_AWAKEN, PROLOGUE_ENCOUNTER } from '@/game/story/prologue'
const game = useGameStore()
const settings = useSettingsStore()
const t = useT()

// 序章触发：
// - 第一次进营地 → 醒来幕
// - 至少跑过一次 session 且尚未看过初遇幕 → 余烬出现
// onMounted 兜底「endSession 在 GameResult → 路由跳转 → GameHome 挂载」之间已经
// 完成 runCount++，watch 会漏掉那次 0→1 变化的时序问题。
onMounted(() => {
  if (game.prologueStage === 0) {
    game.playStory(PROLOGUE_AWAKEN)
  } else if (game.prologueStage === 1 && game.runCount >= 1) {
    game.playStory(PROLOGUE_ENCOUNTER)
  }
})

// 仍保留 watch：覆盖玩家停留在营地时手动跑 session 后回来的场景（GameHome 不卸载）。
watch(
  () => game.runCount,
  (n, o) => {
    if (o === 0 && n === 1 && game.prologueStage === 1) game.playStory(PROLOGUE_ENCOUNTER)
  },
)

const hp = computed(() => game.player.health.value)
const san = computed(() => game.player.props.san.value)
const gold = computed(() => game.player.backpack.gold)
const meta = useMetaStore()
const rareCurrency = computed(() => meta.rareCurrency)
const hpPct = computed(() => Math.max(0, Math.min(100, (hp.value / game.player.health.max) * 100)))
const sanPct = computed(() =>
  Math.max(0, Math.min(100, (san.value / game.player.props.san.max) * 100)),
)

const sanState = computed(() => {
  const pct = sanPct.value
  if (pct >= 60) return 'calm'
  if (pct >= 25) return 'stressed'
  if (pct >= 10) return 'anxious'
  return 'breakdown'
})
const sanFillClass = computed(
  () =>
    ({
      calm: 'fill-san--calm',
      stressed: 'fill-san--stressed',
      anxious: 'fill-san--anxious',
      breakdown: 'fill-san--breakdown',
    })[sanState.value],
)
const sanValClass = computed(
  () =>
    ({
      calm: '',
      stressed: 'san-stressed',
      anxious: 'san-anxious',
      breakdown: 'san-breakdown',
    })[sanState.value],
)

const exp = computed(() => game.player.growth.exp)
const expNext = computed(() => game.player.growth.expToNext)
const expPct = computed(() => Math.max(0, Math.min(100, (exp.value / expNext.value) * 100)))

const TABS = [
  { id: 'camp', icon: '◆', name: '营地' },
  { id: 'map', icon: '▲', name: '地图' },
  { id: 'lore', icon: '◇', name: '图鉴' },
  { id: 'char', icon: '○', name: '角色' },
] as const

type TabId = (typeof TABS)[number]['id']

// phase='map' 时默认显示地图 tab
const activeTab = ref<TabId>(game.phase === 'map' ? 'map' : 'camp')

// 存档恢复后同步 tab
watch(
  () => game.phase,
  (p) => {
    if (p === 'map') activeTab.value = 'map'
    else if (p === 'home') activeTab.value = 'camp'
  },
)

function onTabClick(id: TabId) {
  activeTab.value = id
}

const currentTabLabel = computed(() => TABS.find((t) => t.id === activeTab.value)?.name ?? '')

// 阶段一固定对白池；后续阶段按元进度切换池
const DIALOGUES_PHASE1 = [
  '死了第几次？我以前数过，三十几就忘了。',
  '不是所有渊虫都疯了。有的只是不记得自己疯没疯。这区别有时候很重要。',
  '你打架的姿势变了一点。今天的招式跟昨天不一样。',
  '动过念头。一动就觉得有什么要丢了。也不知道是什么。',
  '你每次回来的时间跟上次不太一样。我一直在数。',
]

const currentDialogue = ref<string | null>(null)
let lastDialogueIdx = -1

function onEmberClick() {
  const pool = DIALOGUES_PHASE1
  let idx: number
  do {
    idx = Math.floor(Math.random() * pool.length)
  } while (pool.length > 1 && idx === lastDialogueIdx)
  lastDialogueIdx = idx
  currentDialogue.value = pool[idx]
}

// ── 技能抽奖 ──────────────────────────────────────────────────────────────────

const lotteryResult = ref<string | null>(null)
const hasLockedSkills = computed(() => SKILL_POOL.some((s) => !meta.isUnlocked(s.id)))

function onLottery() {
  const id = game.lotteryUnlock()
  if (id === null) return
  const skill = SKILL_POOL.find((s) => s.id === id)
  lotteryResult.value = skill?.name ?? id
  setTimeout(() => {
    lotteryResult.value = null
  }, 2500)
}
</script>

<style scoped>
.home-shell {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--black);
  color: var(--text-white);
  overflow: hidden;
}

/* ── 顶部信息栏 ────────────────────────────────────── */
.top-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 0.75rem;
  height: 4rem;
  background: var(--ash);
  border-bottom: 1px solid var(--cinder);
  flex-shrink: 0;
}

.top-left {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.player-avatar {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: cover;
  object-position: top;
  border-radius: 2px;
  border: 1px solid rgba(139, 26, 26, 0.4);
  flex-shrink: 0;
}

.player-identity {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.player-name {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: var(--text-bright);
  line-height: 1;
}

.player-level {
  font-size: 0.62rem;
  font-family: 'Jersey25', monospace;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  line-height: 1;
}

.top-center {
  width: 33%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.stat-lbl {
  font-size: 0.7rem;
  font-family: 'Jersey25', monospace;
  color: var(--text-dim);
  width: 2rem;
  flex-shrink: 0;
}

.stat-track {
  flex: 1;
  height: 5px;
  background: rgba(74, 74, 74, 0.8);
  border-radius: 2px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease;
}

.fill-hp {
  background: var(--ember-bright);
}

.fill-san {
  background: #7eb3d4;
}

.fill-san--stressed {
  background: #e2b24a;
}

.fill-san--anxious {
  background: #e07c34;
}

.fill-san--breakdown {
  background: var(--ember-glow);
}

.fill-exp {
  background: #6a9c6a;
}

.stat-val {
  font-size: 0.7rem;
  font-family: 'Jersey25', monospace;
  color: var(--text-mid);
  min-width: 2.8rem;
  text-align: right;
  flex-shrink: 0;
}

.san-stressed {
  color: #e2b24a;
}

.san-anxious {
  color: #e07c34;
}

.san-breakdown {
  color: var(--ember-glow);
}

.top-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
}

.currency-badge {
  font-size: 0.72rem;
  font-family: 'Jersey25', monospace;
  letter-spacing: 0.1em;
  min-width: 3.5rem;
  text-align: right;
}

.currency-gold {
  color: #c8a840;
}

.currency-rare {
  color: #8ab4cc;
}

/* ── 主体区域 ────────────────────────────────────────── */
.body-layout {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* ── 中央内容区（全宽） ──────────────────────────────── */
.center-area {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── 营地设置按钮（浮动，绝对定位） ──────────────────── */
.camp-menu-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 10;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(102, 102, 102, 0.7);
  transition: color 0.15s;
  padding: 0;
}

.camp-menu-btn:hover {
  color: rgba(170, 170, 170, 0.9);
}

.camp-menu-btn svg {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

/* ── 营地视图 ────────────────────────────────────────── */
.camp-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.camp-scene {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.scene-ambient {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 70% 60% at 50% 60%,
    rgba(139, 26, 26, 0.08) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.companion-stage {
  position: relative;
  z-index: 1;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.companion-portrait-wrap {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.companion-portrait {
  height: clamp(8rem, 38vh, 16rem);
  object-fit: contain;
  object-position: bottom;
  filter: drop-shadow(0 0 18px rgba(192, 57, 43, 0.22));
  position: relative;
  z-index: 1;
  animation: companionBreathe 4s ease-in-out infinite;
  transition: filter 0.2s;
}

.companion-stage:hover .companion-portrait {
  filter: drop-shadow(0 0 26px rgba(192, 57, 43, 0.42));
}

.companion-glyph {
  font-family: 'XiangCui', serif;
  font-size: 3.2rem;
  color: var(--text-bright);
  position: relative;
  z-index: 1;
  animation: companionBreathe 4s ease-in-out infinite;
}

.companion-halo {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 8rem;
  height: 4rem;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(192, 57, 43, 0.18) 0%, transparent 70%);
  animation: haloPulse 4s ease-in-out infinite;
}

.companion-name {
  font-size: 0.85rem;
  letter-spacing: 0.2em;
  color: var(--text-bright);
  margin: 0;
}

.companion-state {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  font-family: 'Jersey25', monospace;
  margin: 0;
}

.scene-floor {
  position: absolute;
  bottom: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(139, 26, 26, 0.3), transparent);
}

/* ── 对话区 ──────────────────────────────────────────── */
.dialogue-pop-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.dialogue-pop-leave-active {
  transition: opacity 0.15s ease;
}
.dialogue-pop-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.dialogue-pop-leave-to {
  opacity: 0;
}

.dialogue-zone {
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(74, 74, 74, 0.5);
  border-bottom: 1px solid rgba(74, 74, 74, 0.5);
  background: rgba(37, 37, 37, 0.9);
  flex-shrink: 0;
}

.dialogue-mark {
  font-family: 'XiangCui', serif;
  font-size: 1rem;
  color: var(--ember);
  line-height: 1.6;
  flex-shrink: 0;
}

.dialogue-text {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--text-mid);
  letter-spacing: 0.06em;
  margin: 0;
}

/* ── 行动区 ──────────────────────────────────────────── */
.action-zone {
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.btn-enter {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 2.5rem;
  font-size: 0.85rem;
  letter-spacing: 0.3em;
  color: var(--text-bright);
  background: transparent;
  border: 1px solid rgba(139, 26, 26, 0.5);
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;
  clip-path: polygon(
    10px 0%,
    calc(100% - 10px) 0%,
    100% 10px,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    10px 100%,
    0% calc(100% - 10px),
    0% 10px
  );
}

.btn-enter:hover {
  color: #fff;
  border-color: var(--ember-bright);
  background: rgba(139, 26, 26, 0.12);
}

.btn-arrow {
  font-family: 'Jersey25', monospace;
  color: var(--ember);
  transition: transform 0.2s;
}

.btn-enter:hover .btn-arrow {
  transform: translateX(3px);
  color: var(--ember-glow);
}

.btn-lottery {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.2rem;
  background: transparent;
  border: 1px solid rgba(106, 163, 200, 0.3);
  color: #6aa3c8;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
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

.btn-lottery:hover:not(:disabled) {
  border-color: rgba(106, 163, 200, 0.7);
  color: #8dc4e8;
  background: rgba(106, 163, 200, 0.06);
}

.btn-lottery:disabled {
  opacity: 0.35;
  cursor: default;
}

.lottery-currency {
  font-family: 'Jersey25', monospace;
  font-size: 0.7rem;
  color: inherit;
}

.lottery-toast {
  font-size: 0.78rem;
  color: #6aa3c8;
  letter-spacing: 0.08em;
  margin: 0;
}

.lottery-pop-enter-active,
.lottery-pop-leave-active {
  transition: opacity 0.3s;
}
.lottery-pop-enter-from,
.lottery-pop-leave-to {
  opacity: 0;
}

/* ── 地图视图 ────────────────────────────────────────── */
.map-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--black);
  color: var(--text-bright);
}

.map-header {
  display: flex;
  align-items: center;
  padding: 0.65rem 1rem 0.5rem;
  border-bottom: 1px solid rgba(74, 74, 74, 0.5);
  background: var(--ash);
  flex-shrink: 0;
}

.map-label {
  font-size: 0.72rem;
  font-family: 'Jersey25', monospace;
  letter-spacing: 0.2em;
  color: var(--text-mid);
  margin: 0;
}

.map-back {
  background: transparent;
  border: none;
  padding: 0 0.6rem 0 0;
  font-family: 'Jersey25', monospace;
  font-size: 0.8rem;
  color: var(--text-mid);
  cursor: pointer;
  line-height: 1;
}

.map-back:hover {
  color: var(--ember-bright);
}

/* ── 角色视图 ─────────────────────────────────────────── */
.char-view {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: var(--black);
}

/* ── 图鉴 tab ────────────────────────────────────────── */
.lore-tab-view {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--black);
}

/* ── 占位视图 ────────────────────────────────────────── */
.placeholder-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.placeholder-label {
  font-family: 'XiangCui', serif;
  font-size: 1.1rem;
  letter-spacing: 0.2em;
  color: var(--text-dim);
  margin: 0;
}

.placeholder-hint {
  font-family: 'Jersey25', monospace;
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  color: rgba(102, 102, 102, 0.6);
  margin: 0;
}

/* ── 底部 Tab 导航 ────────────────────────────────────── */
.tab-bar {
  height: 4rem;
  flex-shrink: 0;
  display: flex;
  background: var(--ash);
  border-top: 1px solid var(--cinder);
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  color: var(--text-dim);
}

.tab-btn:hover {
  background: rgba(74, 74, 74, 0.4);
  color: var(--text-mid);
}

.tab-btn.active {
  color: var(--ember-bright);
  position: relative;
}

.tab-btn.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 1px;
  background: var(--ember-bright);
}

.tab-icon {
  font-size: 0.9rem;
  line-height: 1;
}

.tab-name {
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  font-family: 'Jersey25', monospace;
}

/* ── 动画 ─────────────────────────────────────────────── */
@keyframes companionBreathe {
  0%,
  100% {
    opacity: 0.85;
    text-shadow: 0 0 20px rgba(192, 57, 43, 0.2);
  }
  50% {
    opacity: 1;
    text-shadow:
      0 0 35px rgba(192, 57, 43, 0.45),
      0 0 60px rgba(139, 26, 26, 0.2);
  }
}

@keyframes haloPulse {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.25);
  }
}
</style>
