<template>
  <div
    class="story-scene"
    tabindex="0"
    @click="onTap"
    @keydown.space.prevent="onTap"
    @keydown.enter.prevent="onTap"
  >
    <!-- 背景层：bgVariant 变化时交叉淡入 -->
    <Transition name="bg-fade">
      <div :key="activeBgVariant" class="story-bg" :class="`bg--${activeBgVariant}`">
        <img v-if="currentBeat.bg" :src="currentBeat.bg" class="bg-img" alt="" />
      </div>
    </Transition>

    <!-- 底部渐变遮罩，增强对话区可读性 -->
    <div class="story-shade" />

    <!-- 跳过按钮 -->
    <button class="story-skip" @click.stop="onSkip">{{ t('story.skip') }}</button>

    <!-- 对话框 -->
    <div
      class="story-dialogue"
      :class="{ 'dialogue--narrate': !currentBeat.speaker && currentBeat.kind !== 'input' }"
    >
      <div
        v-if="currentBeat.speaker"
        class="dialogue-speaker"
        :class="`speaker--${speakerVariant}`"
      >
        {{ speakerDisplay }}
      </div>

      <!-- 普通对话文本 -->
      <template v-if="currentBeat.kind !== 'input'">
        <p class="dialogue-text">
          {{ displayedText }}<span class="text-caret" :class="{ 'caret--hidden': !isTyping }" />
        </p>
        <div class="dialogue-next" :class="{ 'next--visible': !isTyping }">◆</div>
      </template>

      <!-- 命名输入框 -->
      <template v-else>
        <div class="input-row" @click.stop>
          <input
            ref="nameInputEl"
            v-model="storyInputValue"
            class="story-input"
            :placeholder="currentBeat.inputPlaceholder ?? ''"
            @keydown.enter.prevent="onSubmitInput"
          />
          <button class="story-input-btn" @click="onSubmitInput">{{ t('story.confirm') }}</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/store/game'
import { useT } from '@/i18n'
import type { BgVariant } from '@/game/story/types'
const game = useGameStore()
const router = useRouter()
const t = useT()

// 刷新时 currentScript 不复原（设计如此），回 home 由 GameHome.onMounted 决定后续流程
onMounted(() => {
  if (!game.currentScript) router.replace('/game/home')
})

const beats = computed(() => game.currentScript?.beats ?? [])
const currentIndex = ref(0)
const currentBeat = computed(() => beats.value[currentIndex.value] ?? { text: '' })

// 打字机
const displayedText = ref('')
const isTyping = ref(false)
let typingTimer: ReturnType<typeof setInterval> | null = null

function clearTimer() {
  if (typingTimer !== null) {
    clearInterval(typingTimer)
    typingTimer = null
  }
}

function startTyping() {
  clearTimer()
  const beat = currentBeat.value
  if (beat.kind === 'input') {
    storyInputValue.value = ''
    nextTick(() => nameInputEl.value?.focus())
    return
  }
  displayedText.value = ''
  isTyping.value = true
  const full = beat.text
  let i = 0
  typingTimer = setInterval(() => {
    i++
    displayedText.value = full.slice(0, i)
    if (i >= full.length) {
      clearTimer()
      isTyping.value = false
    }
  }, 38)
}

// 切换幕时重新打字
watch(currentIndex, startTyping)
onMounted(startTyping)
onBeforeUnmount(clearTimer)

// 点击处理：input 幕忽略；打字中→直接显示全文；打字完→下一幕
function onTap() {
  if (currentBeat.value.kind === 'input') return
  if (isTyping.value) {
    clearTimer()
    displayedText.value = currentBeat.value.text
    isTyping.value = false
  } else {
    advanceBeat()
  }
}

function advanceBeat() {
  if (currentIndex.value < beats.value.length - 1) {
    currentIndex.value++
  } else {
    game.endStory()
  }
}

function onSkip() {
  clearTimer()
  // 序章命名是必填项；若玩家既没提交也没在输入框留下内容，跳过时兜底默认名字。
  // 已经提交过名字（player.name 不再是空串）则尊重玩家选择，不覆盖。
  if (game.player.name === '') {
    for (const beat of beats.value) {
      if (beat.kind === 'input' && beat.inputId === 'player-name') {
        const fallback = storyInputValue.value.trim() || '无名'
        game.submitStoryInput(beat.inputId, fallback)
        break
      }
    }
  }
  game.endStory()
}

// 命名输入
const storyInputValue = ref('')
const nameInputEl = ref<HTMLInputElement | null>(null)

function onSubmitInput() {
  const beat = currentBeat.value
  if (beat.kind !== 'input') return
  if (!storyInputValue.value.trim()) return
  game.submitStoryInput(beat.inputId, storyInputValue.value)
  storyInputValue.value = ''
  advanceBeat()
}

// 背景只在 variant 真正变化时切换（同 variant 连续几幕不重新淡入）
const activeBgVariant = ref<BgVariant>(currentBeat.value.bgVariant ?? 'black')
watch(currentBeat, (beat) => {
  const v = beat.bgVariant ?? 'black'
  if (v !== activeBgVariant.value) activeBgVariant.value = v
})

// 说话者显示名：主角未命名时显示 ???
const speakerDisplay = computed(() => {
  const s = currentBeat.value.speaker
  if (!s) return ''
  if (s === '主角' && game.player.name === '') return '???'
  if (s === '主角') return game.player.name
  return s
})

// 说话者颜色变体
const SPEAKER_VARIANT: Record<string, string> = {
  余烬: 'ember',
  主角: 'player',
}
const speakerVariant = computed(() => SPEAKER_VARIANT[currentBeat.value.speaker ?? ''] ?? 'npc')
</script>

<style scoped>
/* ── 根容器 ───────────────────────────────────────────────────────────────── */
.story-scene {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: pointer;
  outline: none;
  user-select: none;
}

/* ── 背景层 ───────────────────────────────────────────────────────────────── */
.story-bg {
  position: absolute;
  inset: 0;
}

.bg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ---- 变体：black ---- */
.bg--black {
  background: #090807;
}

/* ---- 变体：void ---- */
.bg--void {
  background: #0d0c0b;
}
.bg--void::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 52%, rgba(139, 26, 26, 0.07) 0%, transparent 65%);
}

/* ---- 变体：ruins（荒渊废墟） ---- */
.bg--ruins {
  background: #13100e;
}
.bg--ruins::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 90% 45% at 50% 105%, rgba(139, 26, 26, 0.22) 0%, transparent 100%),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.55) 0%, transparent 40%);
}
.bg--ruins::after {
  content: '';
  position: absolute;
  inset: 0;
  /* 横向碎壁剪影 */
  background:
    linear-gradient(
      to right,
      transparent 28%,
      rgba(40, 32, 26, 0.35) 29%,
      rgba(40, 32, 26, 0.35) 30%,
      transparent 31%
    ),
    linear-gradient(
      to right,
      transparent 62%,
      rgba(40, 32, 26, 0.2) 63%,
      rgba(40, 32, 26, 0.2) 64%,
      transparent 65%
    );
  mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.6) 20%,
    rgba(0, 0, 0, 0.1) 70%,
    transparent 100%
  );
}

/* ---- 变体：camp（枢纽营地） ---- */
.bg--camp {
  background: #100e0c;
}
.bg--camp::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 65% 55% at 50% 78%,
      rgba(192, 57, 43, 0.24) 0%,
      rgba(139, 26, 26, 0.1) 45%,
      transparent 100%
    ),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.65) 0%, transparent 55%);
  animation: campBreath 5s ease-in-out infinite;
}

@keyframes campBreath {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.78;
  }
}

/* ── 背景淡入淡出 ─────────────────────────────────────────────────────────── */
.bg-fade-enter-active,
.bg-fade-leave-active {
  transition: opacity 0.6s ease;
}
.bg-fade-enter-from,
.bg-fade-leave-to {
  opacity: 0;
}

/* ── 底部遮罩（对话模式用；旁白居中时仍保留但权重降低） ──────────────────── */
.story-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 35%,
    rgba(8, 7, 6, 0.5) 75%,
    rgba(8, 7, 6, 0.82) 100%
  );
  pointer-events: none;
}

/* ── 跳过按钮 ─────────────────────────────────────────────────────────────── */
.story-skip {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-family: 'Jersey25', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.18em;
  color: rgba(170, 170, 170, 0.4);
  background: transparent;
  border: 1px solid rgba(74, 74, 74, 0.25);
  padding: 0.3rem 0.75rem;
  border-radius: 2px;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
  z-index: 10;
}
.story-skip:hover {
  color: rgba(170, 170, 170, 0.8);
  border-color: rgba(74, 74, 74, 0.5);
}

/* ── 对话框（底部面板：有 speaker 或 input 时） ───────────────────────────── */
.story-dialogue {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  min-height: 10rem;
  padding: 1.25rem 1.5rem 1.75rem;
  background: rgba(10, 8, 6, 0.88);
  border-top: 1px solid rgba(74, 74, 74, 0.3);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 旁白模式：绝对居中，去掉底部面板样式 */
.dialogue--narrate {
  top: 50%;
  bottom: auto;
  left: 50%;
  right: auto;
  transform: translate(-50%, -50%);
  width: min(32rem, 88%);
  min-height: 0;
  padding: 1.5rem 1rem;
  background: transparent;
  border-top: none;
  align-items: center;
  text-align: center;
}

.dialogue--narrate .dialogue-text {
  font-style: italic;
  color: #b0aca6;
  text-align: center;
  text-shadow:
    0 0 24px rgba(0, 0, 0, 1),
    0 2px 10px rgba(0, 0, 0, 0.9);
  padding: 0;
}

.dialogue--narrate .dialogue-next {
  align-self: center;
}

/* ── 人物立绘 ─────────────────────────────────────────────────────────────── */
.story-portrait {
  position: absolute;
  bottom: 0;
  right: 8%;
  height: 72%;
  max-height: 26rem;
  object-fit: contain;
  object-position: bottom;
  pointer-events: none;
  mask-image: linear-gradient(to top, transparent 6%, black 22%);
  filter: drop-shadow(-4px 0 12px rgba(0, 0, 0, 0.6));
}

.portrait-fade-enter-active,
.portrait-fade-leave-active {
  transition: opacity 0.3s ease;
}
.portrait-fade-enter-from,
.portrait-fade-leave-to {
  opacity: 0;
}

/* ── 说话者名字 ───────────────────────────────────────────────────────────── */
.dialogue-speaker {
  font-family: 'Jersey25', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  margin-bottom: 0.1rem;
}

.speaker--ember {
  color: #d4a040;
}

.speaker--player {
  color: #b8b4ae;
}

.speaker--npc {
  color: #8ab4cc;
}

/* ── 对话文本 ─────────────────────────────────────────────────────────────── */
.dialogue-text {
  font-family: 'XiangCui', serif;
  font-size: 1rem;
  line-height: 1.75;
  letter-spacing: 0.05em;
  color: #e8e4e0;
  margin: 0;
  min-height: 3.5rem;
}

/* 打字光标 */
.text-caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: #c0392b;
  vertical-align: text-bottom;
  margin-left: 1px;
  animation: caretBlink 0.7s step-end infinite;
}
.caret--hidden {
  display: none;
}

@keyframes caretBlink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* ── 命名输入框 ───────────────────────────────────────────────────────────── */
.input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0;
}

.story-input {
  flex: 1;
  background: rgba(20, 16, 12, 0.9);
  border: 1px solid rgba(139, 26, 26, 0.5);
  border-radius: 2px;
  color: #e8e4e0;
  font-family: 'XiangCui', serif;
  font-size: 0.95rem;
  padding: 0.45rem 0.75rem;
  outline: none;
  letter-spacing: 0.05em;
  transition: border-color 0.15s;
}

.story-input::placeholder {
  color: rgba(170, 160, 150, 0.35);
}

.story-input:focus {
  border-color: rgba(192, 57, 43, 0.7);
}

.story-input-btn {
  font-family: 'Jersey25', monospace;
  font-size: 0.68rem;
  letter-spacing: 0.2em;
  color: #e8e4e0;
  background: rgba(139, 26, 26, 0.35);
  border: 1px solid rgba(139, 26, 26, 0.5);
  border-radius: 2px;
  padding: 0.45rem 1rem;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
  flex-shrink: 0;
}

.story-input-btn:hover {
  background: rgba(192, 57, 43, 0.5);
  border-color: rgba(192, 57, 43, 0.7);
}

/* ── 继续指示器 ───────────────────────────────────────────────────────────── */
.dialogue-next {
  align-self: flex-end;
  font-size: 0.55rem;
  color: rgba(192, 57, 43, 0.6);
  opacity: 0;
  transition: opacity 0.2s;
  animation: nextPulse 1.4s ease-in-out infinite;
}
.next--visible {
  opacity: 1;
}

@keyframes nextPulse {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.6;
  }
  50% {
    transform: translateY(2px);
    opacity: 1;
  }
}
</style>
