<template>
  <DebugLayout title="元进度">
    <div class="flex-1 overflow-y-auto">
      <div class="flex flex-col gap-8 max-w-2xl">
        <!-- 状态快照 -->
        <section>
          <p class="section-label">当前状态</p>
          <div class="mono-grid">
            <span class="k">rareCurrency</span><span class="v">{{ meta.rareCurrency }}</span>
            <span class="k">shownApexStage</span
            ><span class="v">{{
              meta.shownApexStage === -1 ? '未看过' : meta.shownApexStage
            }}</span>
            <span class="k">clearedZones</span
            ><span class="v">{{ meta.stats.clearedZones.join(', ') || '—' }}</span>
            <span class="k">totalRuns</span><span class="v">{{ meta.stats.totalRuns }}</span>
            <span class="k">totalBattleWins</span
            ><span class="v">{{ meta.stats.totalBattleWins }}</span>
            <span class="k">discoveredRelics</span><span class="v">{{ meta.discoveredCount }}</span>
          </div>
        </section>

        <!-- 区域跳转 -->
        <section>
          <p class="section-label">跳转区域（直接进入，跳过世界地图）</p>
          <div class="flex flex-wrap gap-2">
            <button v-for="z in ZONE_ORDER" :key="z" class="dbg-btn" @click="jumpToZone(z)">
              {{ ZONE_META[z].name }}
            </button>
          </div>
        </section>

        <!-- 通关区域 -->
        <section>
          <p class="section-label">已通关区域（点击切换，影响先遣阶段计算）</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="z in ZONE_ORDER"
              :key="z"
              class="dbg-btn"
              :class="{ active: meta.stats.clearedZones.includes(z) }"
              @click="toggleZoneCleared(z)"
            >
              {{ ZONE_META[z].name }}
            </button>
          </div>
          <button class="dbg-btn danger mt-2" @click="meta.stats.clearedZones = []">
            清空全部
          </button>
        </section>

        <!-- 天渊先遣 -->
        <section>
          <p class="section-label">天渊·先遣台词</p>
          <div class="flex flex-wrap gap-2">
            <button v-for="i in [0, 1, 2]" :key="i" class="dbg-btn" @click="playApexStage(i)">
              阶段 {{ i }} 台词
            </button>
            <button class="dbg-btn danger" @click="meta.resetApexStage()">重置已看阶段</button>
          </div>
          <p class="hint">重置后下次进天渊会重新触发阶段 0</p>
        </section>

        <!-- 稀有货币 -->
        <section>
          <p class="section-label">稀有货币</p>
          <div class="flex flex-wrap gap-2">
            <button class="dbg-btn" @click="meta.earnRareCurrency(1)">+1</button>
            <button class="dbg-btn" @click="meta.earnRareCurrency(5)">+5</button>
            <button class="dbg-btn" @click="meta.earnRareCurrency(20)">+20</button>
            <button class="dbg-btn danger" @click="meta.earnRareCurrency(-meta.rareCurrency)">
              清零
            </button>
          </div>
        </section>

        <!-- 成就统计 patch -->
        <section>
          <p class="section-label">成就统计 patch</p>
          <div class="flex flex-wrap gap-2">
            <button class="dbg-btn" @click="meta.checkAchievements({ totalBattleWins: 1 })">
              +1 battleWin
            </button>
            <button class="dbg-btn" @click="meta.checkAchievements({ totalRuns: 1 })">
              +1 run
            </button>
            <button class="dbg-btn" @click="meta.checkAchievements({ totalRelicsCollected: 1 })">
              +1 relic
            </button>
            <button class="dbg-btn" @click="meta.checkAchievements({ totalUpgrades: 1 })">
              +1 upgrade
            </button>
          </div>
        </section>
      </div>
    </div>
  </DebugLayout>
</template>

<script setup lang="ts">
import { useMetaStore } from '@/store/meta'
import { useGameStore } from '@/store/game'
import { ZONE_META, ZONE_ORDER } from '@/game/meta'
import { APEX_VANGUARD_SCRIPTS } from '@/game/story/apex'
import type { ZoneId } from '@/game/meta'
import DebugLayout from './Layout.vue'

const meta = useMetaStore()
const game = useGameStore()
const router = useRouter()

function jumpToZone(zoneId: ZoneId) {
  game.enterZone(zoneId)
  // phase watcher 已统一接管路由，不手动 push
}

function toggleZoneCleared(zoneId: ZoneId) {
  const zones = meta.stats.clearedZones
  if (zones.includes(zoneId)) {
    meta.stats.clearedZones = zones.filter((z) => z !== zoneId)
  } else {
    meta.checkAchievements({ clearedZones: [zoneId] })
  }
}

function playApexStage(stage: number) {
  const script = APEX_VANGUARD_SCRIPTS[stage]
  if (!script) return
  meta.markApexStageShown(stage)
  game.playStory(script, 'map')
}
</script>

<style scoped>
.section-label {
  font-size: 0.65rem;
  letter-spacing: 0.3em;
  font-family: monospace;
  color: #9ca3af;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
}

.mono-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 1rem;
  font-family: monospace;
  font-size: 0.75rem;
}

.mono-grid .k {
  color: #6b7280;
}
.mono-grid .v {
  color: #111827;
  font-weight: 600;
}

.dbg-btn {
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  background: white;
  font-size: 0.75rem;
  font-family: monospace;
  color: #374151;
  cursor: pointer;
  transition: all 0.1s;
}

.dbg-btn:hover {
  border-color: #6b7280;
  background: #f9fafb;
}
.dbg-btn.active {
  border-color: #111827;
  background: #111827;
  color: white;
}
.dbg-btn.danger {
  border-color: #fca5a5;
  color: #dc2626;
}
.dbg-btn.danger:hover {
  background: #fef2f2;
}

.hint {
  margin-top: 0.5rem;
  font-size: 0.65rem;
  color: #9ca3af;
  font-family: monospace;
}
</style>
