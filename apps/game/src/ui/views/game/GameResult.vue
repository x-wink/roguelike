<template>
  <div class="result-shell" :class="shellClass">
    <div class="ambient" />

    <div class="title-zone">
      <p class="result-mark">{{ mark }}</p>
      <h1 class="result-title">{{ titleText }}</h1>
      <p class="result-subtitle">{{ subtitleText }}</p>
    </div>

    <p class="result-flavor">{{ flavorText }}</p>

    <div class="stat-card">
      <div class="stat-row">
        <span class="stat-label">HP</span>
        <span class="stat-value">{{ playerHp }} / {{ game.player.health.max }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">理智</span>
        <span class="stat-value" :class="{ 'stat-warn': playerSan === 0 }"
          >{{ playerSan }} / {{ game.player.props.san.max }}</span
        >
      </div>
      <div class="stat-row">
        <span class="stat-label">节点</span>
        <span class="stat-value">{{ nodesDone }} / {{ game.nodes.length }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">金币</span>
        <span class="stat-value">◈ {{ gold }}</span>
      </div>
    </div>

    <div class="action-zone">
      <button v-if="game.activeZone" class="btn-primary" @click="game.enterZone(game.activeZone!)">
        再来一局
      </button>
      <button class="btn-secondary" @click="game.endSession()">返回营地</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/store/game'

const game = useGameStore()

const playerHp = computed(() => game.player.health.value)
const playerSan = computed(() => game.player.props.san.value)
const gold = computed(() => game.player.backpack.gold)
const nodesDone = computed(() => game.nodes.filter((n) => n.completed).length)

const isVictory = computed(() => game.result?.kind === 'victory')

const mark = computed(() => (isVictory.value ? '◇' : '×'))

function exhaustive(_: never): never {
  throw new Error('unreachable')
}

const titleText = computed(() => {
  const r = game.result
  if (!r) return ''
  if (r.kind === 'victory') {
    const reason = r.reason
    switch (reason) {
      case 'boss':
        return '到顶'
      case 'session-clear':
        return '穿过'
      case 'arena':
        return '胜'
      default:
        return exhaustive(reason)
    }
  }
  const reason = r.reason
  switch (reason) {
    case 'san-zero':
      return '涣散'
    case 'hp-zero':
      return '坠回'
    case 'arena':
      return '败'
    default:
      return exhaustive(reason)
  }
})

const subtitleText = computed(() => {
  const r = game.result
  if (!r) return ''
  if (r.kind === 'victory') {
    const reason = r.reason
    switch (reason) {
      case 'boss':
        return '本层的尽头到了。位置在那里，没有人挪动它。'
      case 'session-clear':
        return '通路打开了。下一层在等。'
      case 'arena':
        return '胜负已定。'
      default:
        return exhaustive(reason)
    }
  }
  const reason = r.reason
  switch (reason) {
    case 'san-zero':
      return '凝聚归零。这一次，没有什么再聚回来。'
    case 'hp-zero':
      return '意识涣散，下一刻在原点重新醒来。'
    case 'arena':
      return '败。'
    default:
      return exhaustive(reason)
  }
})

const flavorText = computed(() => {
  const r = game.result
  if (!r) return ''
  if (r.kind === 'victory') {
    const reason = r.reason
    switch (reason) {
      case 'boss':
        return '密器记住了这次。下一次它仍然会运转。'
      case 'session-clear':
        return '走完一段路。前面还有更深的。'
      case 'arena':
        return ''
      default:
        return exhaustive(reason)
    }
  }
  const reason = r.reason
  switch (reason) {
    case 'san-zero':
      return '理智在某一刻松手了。剩下的部分，渊会留着。'
    case 'hp-zero':
      return '只剩下一些说不清楚从哪里来的、零碎的印记。'
    case 'arena':
      return ''
    default:
      return exhaustive(reason)
  }
})

const shellClass = computed(() =>
  isVictory.value ? 'result-shell--victory' : 'result-shell--defeat',
)
</script>

<style scoped>
.result-shell {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 2rem;
  gap: 1.5rem;
  background: var(--black);
  color: var(--text-bright);
  overflow: hidden;
}

.ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.result-shell--victory .ambient {
  background: radial-gradient(
    ellipse 65% 55% at 50% 35%,
    color-mix(in srgb, var(--ember-bright) 10%, transparent) 0%,
    transparent 70%
  );
}

.result-shell--defeat .ambient {
  background: radial-gradient(
    ellipse 65% 55% at 50% 35%,
    color-mix(in srgb, var(--black) 60%, transparent) 0%,
    transparent 70%
  );
}

.title-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.result-mark {
  font-family: 'Jersey25', monospace;
  font-size: 1.5rem;
  letter-spacing: 0.3em;
  margin: 0;
  color: var(--ember);
}

.result-shell--defeat .result-mark {
  color: var(--text-dim);
}

.result-title {
  font-family: 'XiangCui', serif;
  font-size: 2.6rem;
  letter-spacing: 0.4em;
  margin: 0;
  line-height: 1;
}

.result-shell--victory .result-title {
  color: var(--text-bright);
  text-shadow: 0 0 30px color-mix(in srgb, var(--ember-bright) 25%, transparent);
}

.result-shell--defeat .result-title {
  color: var(--text-mid);
}

.result-subtitle {
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  color: var(--text-mid);
  margin: 0;
  max-width: 22rem;
  line-height: 1.6;
}

.result-flavor {
  position: relative;
  font-size: 0.78rem;
  line-height: 1.8;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  text-align: center;
  max-width: 22rem;
  margin: 0;
  padding: 0 1rem;
  border-top: 1px solid color-mix(in srgb, var(--cinder) 40%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--cinder) 40%, transparent);
  padding-block: 0.85rem;
}

.stat-card {
  position: relative;
  width: 100%;
  max-width: 22rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 1rem 1.25rem;
  background: color-mix(in srgb, var(--ash) 70%, transparent);
  border: 1px solid color-mix(in srgb, var(--cinder) 60%, transparent);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
}

.stat-label {
  font-family: 'Jersey25', monospace;
  letter-spacing: 0.18em;
  color: var(--text-dim);
}

.stat-value {
  font-family: 'Jersey25', monospace;
  letter-spacing: 0.05em;
  color: var(--text-bright);
}

.stat-warn {
  color: var(--ember-glow);
}

.action-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
  max-width: 22rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  letter-spacing: 0.25em;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;
  background: transparent;
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

.btn-primary {
  color: var(--text-bright);
  border: 1px solid color-mix(in srgb, var(--ember-bright) 55%, transparent);
}

.btn-primary:hover {
  color: var(--text-white);
  border-color: var(--ember-bright);
  background: color-mix(in srgb, var(--ember) 18%, transparent);
}

.btn-secondary {
  color: var(--text-mid);
  border: 1px solid color-mix(in srgb, var(--cinder) 70%, transparent);
}

.btn-secondary:hover {
  color: var(--text-bright);
  border-color: var(--text-mid);
}
</style>
