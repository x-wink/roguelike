<template>
  <div class="landing">
    <canvas ref="canvasRef" class="particles-canvas"></canvas>
    <div class="ambient-glow"></div>
    <div class="vignette"></div>
    <div class="scanlines"></div>
    <div class="scan-flash" :class="{ active: scanFlashActive }"></div>

    <main>
      <p class="eyebrow">
        VESSEL ARCHIVE · CYCLE ████ · ONGOING<span class="blink-cursor">▮</span>
      </p>

      <div class="title-wrap">
        <span class="corner tl"></span>
        <span class="corner tr"></span>
        <h1 data-text="囚烬日记">囚烬日记</h1>
        <span class="corner bl"></span>
        <span class="corner br"></span>
      </div>

      <p class="subtitle">Crucible</p>
      <div class="divider"></div>

      <p class="tagline">
        渊没有招募。<em>你只是坠落了</em>。<br />
        密器从未打开——<em>蛊中之蛊，还是蛊</em>。
      </p>

      <div class="cta-wrap">
        <button class="cta" @click="handleCTA" @mouseenter="handleCTAHover">{{ ctaText }}</button>
      </div>
    </main>

    <footer>
      <div class="footer-left">
        <span class="glitch-text">{{ observerId }}</span
        ><br />
        <span
          >凝聚数: <span class="ember-text">{{ subjectCount }}</span></span
        ><br />
        <span
          >密器状态: <span class="active-text"><span class="status-dot"></span>运转中</span></span
        >
      </div>
      <div class="footer-right">
        <span>距下一轮涣散</span><br />
        <span class="countdown">{{ countdown }}</span
        ><br />
        <span class="dim-text">印记不灭</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const ctaText = ref('踏入渊')
const ctaDisabled = ref(false)
const countdown = ref('--:--:--')
const subjectCount = ref('3241587')
const observerId = ref('印记编号: ██████')
const scanFlashActive = ref(false)

// ─── Particle System ──────────────────────────────────────────────────────────

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  decay: number
  size: number
  type: 0 | 1 | 2
  rotation: number
  rotSpeed: number
  hue: number
  drift: number
  wobble: number
  wobbleSpeed: number
}

let W = 0,
  H = 0
let particles: Particle[] = []
let animId = 0
let ctx2d: CanvasRenderingContext2D | null = null

function resize() {
  if (!canvasRef.value) return
  W = canvasRef.value.width = canvasRef.value.offsetWidth
  H = canvasRef.value.height = canvasRef.value.offsetHeight
}

function createParticle(): Particle {
  const side = Math.random() < 0.7 ? 'top' : Math.random() < 0.5 ? 'left' : 'right'
  let x = 0,
    y = 0
  if (side === 'top') {
    x = Math.random() * W
    y = -10
  } else if (side === 'left') {
    x = -10
    y = Math.random() * H * 0.6
  } else {
    x = W + 10
    y = Math.random() * H * 0.6
  }
  const t = Math.random()
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 0.8,
    vy: Math.random() * 0.6 + 0.2,
    life: 1,
    decay: Math.random() * 0.003 + 0.001,
    size: Math.random() * 3 + 1,
    type: t < 0.5 ? 0 : t < 0.8 ? 1 : 2,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.04,
    hue: Math.random() * 20 - 10,
    drift: (Math.random() - 0.5) * 0.01,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.03 + 0.01,
  }
}

function spawnBurst(n: number) {
  for (let i = 0; i < n; i++) particles.push(createParticle())
}

function drawEmberShard(p: Particle) {
  if (!ctx2d) return
  ctx2d.save()
  ctx2d.translate(p.x, p.y)
  ctx2d.rotate(p.rotation)
  const s = p.size
  ctx2d.beginPath()
  ctx2d.moveTo(0, -s * 1.8)
  ctx2d.lineTo(s * 0.6, -s * 0.3)
  ctx2d.lineTo(s * 0.9, s * 0.8)
  ctx2d.lineTo(0, s * 0.4)
  ctx2d.lineTo(-s * 0.7, s * 0.9)
  ctx2d.lineTo(-s * 0.5, -s * 0.2)
  ctx2d.closePath()
  const alpha = Math.min(1, p.life * 1.1)
  const r = Math.min(255, 200 + p.hue * 3)
  const g = Math.max(0, 50 + p.hue * 2)
  ctx2d.fillStyle = `rgba(${r},${g},10,${alpha})`
  ctx2d.shadowColor = `rgba(240,80,10,${alpha * 0.9})`
  ctx2d.shadowBlur = s * 6
  ctx2d.fill()
  ctx2d.restore()
}

function drawAshFlake(p: Particle) {
  if (!ctx2d) return
  ctx2d.save()
  ctx2d.translate(p.x, p.y)
  ctx2d.rotate(p.rotation)
  const s = p.size * 1.4
  ctx2d.beginPath()
  const sides = 5 + Math.floor(p.size)
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2
    const r = s * (0.6 + Math.sin(angle * 3 + p.wobble) * 0.4)
    if (i === 0) ctx2d.moveTo(Math.cos(angle) * r, Math.sin(angle) * r)
    else ctx2d.lineTo(Math.cos(angle) * r, Math.sin(angle) * r)
  }
  ctx2d.closePath()
  const alpha = p.life * 0.75
  const grey = Math.floor(80 + p.life * 60)
  ctx2d.fillStyle = `rgba(${grey},${Math.max(0, grey - 20)},${Math.max(0, grey - 30)},${alpha})`
  ctx2d.fill()
  ctx2d.restore()
}

function drawSpark(p: Particle) {
  if (!ctx2d) return
  ctx2d.save()
  ctx2d.translate(p.x, p.y)
  ctx2d.rotate(p.rotation)
  const s = p.size * 0.7
  ctx2d.beginPath()
  ctx2d.ellipse(0, 0, s * 0.3, s * 2.5, 0, 0, Math.PI * 2)
  const alpha = p.life * 0.9
  const grad = ctx2d.createLinearGradient(0, -s * 2.5, 0, s * 2.5)
  grad.addColorStop(0, `rgba(255,220,100,${alpha})`)
  grad.addColorStop(0.4, `rgba(220,80,20,${alpha * 0.8})`)
  grad.addColorStop(1, `rgba(100,10,5,0)`)
  ctx2d.fillStyle = grad
  ctx2d.shadowColor = `rgba(255,160,40,${alpha})`
  ctx2d.shadowBlur = 10
  ctx2d.fill()
  ctx2d.restore()
}

function tick() {
  if (!ctx2d) return
  ctx2d.clearRect(0, 0, W, H)
  const grd = ctx2d.createLinearGradient(0, H * 0.75, 0, H)
  grd.addColorStop(0, 'rgba(80,10,10,0)')
  grd.addColorStop(1, 'rgba(40,5,5,0.18)')
  ctx2d.fillStyle = grd
  ctx2d.fillRect(0, H * 0.75, W, H * 0.25)

  if (particles.length < 120 && Math.random() < 0.35) particles.push(createParticle())

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.wobble += p.wobbleSpeed
    p.x += p.vx + Math.sin(p.wobble) * 0.3 + p.drift
    p.y += p.vy
    p.rotation += p.rotSpeed
    p.life -= p.decay
    if (p.type === 2) p.vy -= 0.005
    if (p.life <= 0 || p.y > H + 20 || p.x < -20 || p.x > W + 20) {
      particles.splice(i, 1)
      continue
    }
    if (p.type === 0) drawEmberShard(p)
    else if (p.type === 1) drawAshFlake(p)
    else drawSpark(p)
  }
  animId = requestAnimationFrame(tick)
}

// ─── Scan Flash ───────────────────────────────────────────────────────────────

let scanFlashTimer: ReturnType<typeof setTimeout> | null = null

function scheduleNextScan() {
  const delay = 9000 + Math.random() * 14000
  scanFlashTimer = setTimeout(() => {
    scanFlashActive.value = true
    setTimeout(() => {
      scanFlashActive.value = false
      scheduleNextScan()
    }, 2600)
  }, delay)
}

// ─── Countdown ────────────────────────────────────────────────────────────────

let countdownTimer = 0
function updateCountdown() {
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  const diff = next.getTime() - now.getTime()
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0')
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0')
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')
  countdown.value = `${h}:${m}:${s}`
}

// ─── Subject count ────────────────────────────────────────────────────────────

let countTimer = 0
let baseCount = 3241587
function updateCount() {
  baseCount += Math.floor(Math.random() * 4)
  subjectCount.value = baseCount.toString()
}

// ─── Glitch ───────────────────────────────────────────────────────────────────

let glitchTimer = 0
const glitchChars = '█▓▒░▄▀■□▪▫'
const originalId = '印记编号: ██████'
function glitch() {
  if (Math.random() < 0.15) {
    let out = ''
    for (let i = 0; i < originalId.length; i++) {
      out +=
        Math.random() < 0.08
          ? glitchChars[Math.floor(Math.random() * glitchChars.length)]
          : originalId[i]
    }
    observerId.value = out
    setTimeout(() => {
      observerId.value = originalId
    }, 80)
  }
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function handleCTAHover() {}

function handleCTA() {
  if (ctaDisabled.value) return
  ctaDisabled.value = true
  ctaText.value = '凝聚中...'
  spawnBurst(40)
  setTimeout(() => {
    ctaText.value = '印记已锚定'
    setTimeout(() => router.push('/game'), 600)
  }, 1200)
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
  if (!canvasRef.value) return
  ctx2d = canvasRef.value.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  spawnBurst(60)
  tick()
  updateCountdown()
  countdownTimer = window.setInterval(updateCountdown, 1000)
  countTimer = window.setInterval(updateCount, 2800)
  glitchTimer = window.setInterval(glitch, 1200)
  scheduleNextScan()
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', resize)
  clearInterval(countdownTimer)
  clearInterval(countTimer)
  clearInterval(glitchTimer)
  if (scanFlashTimer) clearTimeout(scanFlashTimer)
})
</script>

<style scoped>
.landing {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--black);
}

.particles-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

/* Pulsing red radial glow behind the title */
.ambient-glow {
  position: absolute;
  width: 70vw;
  height: 70vw;
  max-width: 560px;
  max-height: 560px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(139, 26, 26, 0.09) 0%, transparent 70%);
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: glowBreathe 5.5s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

.vignette {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    ellipse at center,
    transparent 30%,
    rgba(4, 2, 4, 0.6) 70%,
    rgba(4, 2, 4, 0.92) 100%
  );
  pointer-events: none;
  z-index: 1;
}

.scanlines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(180, 60, 20, 0.06) 3px,
    rgba(180, 60, 20, 0.06) 4px
  );
  pointer-events: none;
  z-index: 2;
}

/* Horizontal sweep line that fires every ~15s */
.scan-flash {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(180, 40, 10, 0.5) 25%,
    rgba(255, 170, 50, 0.85) 50%,
    rgba(180, 40, 10, 0.5) 75%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 50;
  opacity: 0;
}

.scan-flash.active {
  animation: scanSweep 2.6s cubic-bezier(0.4, 0, 0.8, 1) forwards;
}

main {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem 1.5rem;
  max-width: 720px;
  width: 100%;
  min-height: 100%;
  margin: 0 auto;
}

.eyebrow {
  font-size: 0.85rem;
  font-family: 'Jersey25', monospace;
  letter-spacing: 0.3em;
  color: var(--text-dim);
  text-transform: uppercase;
  margin-bottom: 2rem;
  opacity: 0;
  animation: fadeIn 1.2s ease 0.4s forwards;
}

.blink-cursor {
  color: var(--ember);
  margin-left: 2px;
  animation: blinkCursor 1.1s step-end infinite;
}

.title-wrap {
  position: relative;
  margin-bottom: 0.4rem;
  padding: 0.5rem 1rem;
}

/* Corner brackets */
.corner {
  position: absolute;
  width: 14px;
  height: 14px;
  border-color: rgba(139, 26, 26, 0.5);
  border-style: solid;
  opacity: 0;
  animation: fadeIn 1.5s ease 1s forwards;
}
.corner.tl {
  top: 0;
  left: 0;
  border-width: 2px 0 0 2px;
}
.corner.tr {
  top: 0;
  right: 0;
  border-width: 2px 2px 0 0;
}
.corner.bl {
  bottom: 0;
  left: 0;
  border-width: 0 0 2px 2px;
}
.corner.br {
  bottom: 0;
  right: 0;
  border-width: 0 2px 2px 0;
}

h1 {
  font-size: clamp(3rem, min(13vw, 8vh), 5rem);
  font-weight: 900;
  font-family: 'XiangCui', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  letter-spacing: 0.05em;
  line-height: 1;
  color: transparent;
  background: linear-gradient(180deg, #e8d0d0 0%, #c9a0a0 30%, #8b3030 65%, #3d1010 100%);
  -webkit-background-clip: text;
  background-clip: text;
  position: relative;
  opacity: 0;
  animation: titleReveal 1.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards;
  -webkit-text-stroke: 1px rgba(180, 80, 60, 0.25);
}

h1::before {
  content: attr(data-text);
  position: absolute;
  top: 1px;
  left: 1px;
  width: 100%;
  color: transparent;
  background: linear-gradient(180deg, #3d1010 0%, #1a0808 100%);
  -webkit-background-clip: text;
  background-clip: text;
  z-index: -2;
  opacity: 0.6;
}

h1::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  color: transparent;
  background: linear-gradient(180deg, #e8d0d0 0%, #c9a0a0 30%, #8b3030 65%, #3d1010 100%);
  -webkit-background-clip: text;
  background-clip: text;
  filter: blur(18px);
  opacity: 0.35;
  z-index: -1;
}

.subtitle {
  font-size: clamp(0.85rem, 2.5vw, 1.1rem);
  font-family: 'RubikDirt', sans-serif;
  letter-spacing: 0.35em;
  color: var(--ember);
  text-transform: uppercase;
  margin-bottom: 1.2rem;
  opacity: 0;
  animation: fadeIn 1.2s ease 1.2s forwards;
}

.divider {
  width: 120px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ember), transparent);
  margin: 0 auto 2.5rem;
  opacity: 0;
  animation: fadeIn 1s ease 1.4s forwards;
}

.tagline {
  font-size: clamp(0.9rem, 2.8vw, 1.15rem);
  color: var(--text-mid);
  letter-spacing: 0.12em;
  line-height: 1.9;
  margin-bottom: 2.5rem;
  font-weight: 300;
  opacity: 0;
  animation: fadeIn 1.2s ease 1.6s forwards;
}

.tagline em {
  font-style: normal;
  color: var(--text-bright);
}

.cta-wrap {
  opacity: 0;
  animation: fadeIn 1.2s ease 2s forwards;
  position: relative;
  display: inline-block;
  padding: 1px;
}

.cta {
  display: inline-block;
  padding: 0.9rem 3.5rem;
  color: var(--text-bright);
  font-size: 1rem;
  letter-spacing: 0.35em;
  cursor: pointer;
  background: var(--black);
  position: relative;
  overflow: hidden;
  transition:
    color 0.3s ease,
    background 0.3s ease;
  font-family: inherit;
  border: none;
  clip-path: polygon(
    14px 0%,
    calc(100% - 14px) 0%,
    100% 14px,
    100% calc(100% - 14px),
    calc(100% - 14px) 100%,
    14px 100%,
    0% calc(100% - 14px),
    0% 14px
  );
}

.cta-wrap::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--ember);
  clip-path: polygon(
    14px 0%,
    calc(100% - 14px) 0%,
    100% 14px,
    100% calc(100% - 14px),
    calc(100% - 14px) 100%,
    14px 100%,
    0% calc(100% - 14px),
    0% 14px
  );
  transition: background 0.3s ease;
  z-index: -1;
}

.cta-wrap:hover::before {
  background: var(--ember-glow);
}

.cta::before {
  content: '';
  position: absolute;
  top: 0;
  left: -60%;
  width: 35%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(220, 80, 30, 0.22), transparent);
  transform: skewX(-12deg);
  transition: left 0.55s ease;
  pointer-events: none;
}

.cta:hover::before {
  left: 130%;
}
.cta:hover {
  color: #fff;
  animation: emberPulse 1.8s ease-in-out infinite;
}
.cta:active {
  transform: scale(0.97);
  animation: none;
}

footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 10;
  padding: 1.2rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  pointer-events: none;
}

.footer-left,
.footer-right {
  font-size: 0.75rem;
  font-family: 'Jersey25', monospace;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  opacity: 0;
  animation: fadeIn 2s ease 2.5s forwards;
  font-variant-numeric: tabular-nums;
}
.footer-left {
  text-align: left;
  line-height: 1.8;
}
.footer-right {
  text-align: right;
  line-height: 1.8;
}

.ember-text {
  color: var(--ember-glow);
}
.countdown {
  color: var(--ember);
  font-variant-numeric: tabular-nums;
}
.active-text {
  color: var(--ember-glow);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dim-text {
  opacity: 0.5;
}

.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ember-glow);
  animation: statusBlink 2.2s ease-in-out infinite;
  flex-shrink: 0;
}

/* ─── Keyframes ─────────────────────────────────────────────────────────────── */

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes titleReveal {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.97);
    filter: blur(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes emberPulse {
  0%,
  100% {
    box-shadow:
      0 0 20px rgba(139, 26, 26, 0.5),
      0 0 40px rgba(139, 26, 26, 0.25),
      inset 0 0 20px rgba(139, 26, 26, 0.15);
  }
  50% {
    box-shadow:
      0 0 30px rgba(200, 50, 20, 0.7),
      0 0 60px rgba(139, 26, 26, 0.35),
      inset 0 0 25px rgba(139, 26, 26, 0.2);
  }
}

@keyframes glowBreathe {
  0%,
  100% {
    opacity: 0.6;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.22);
  }
}

@keyframes scanSweep {
  0% {
    transform: translateY(-4px);
    opacity: 0.9;
  }
  10% {
    opacity: 0.9;
  }
  85% {
    opacity: 0.4;
  }
  100% {
    transform: translateY(100vh);
    opacity: 0;
  }
}

@keyframes blinkCursor {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

@keyframes statusBlink {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 5px var(--ember-glow);
  }
  50% {
    opacity: 0.25;
    box-shadow: none;
  }
}

@media (max-width: 480px) {
  .footer-left {
    display: none;
  }
  .footer-right {
    width: 100%;
    text-align: center;
  }
  footer {
    justify-content: center;
  }
}
</style>
