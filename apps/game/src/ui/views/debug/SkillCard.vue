<template>
  <!-- 卡片 -->
  <div
    class="rounded-2xl px-4 py-4 cursor-pointer hover:shadow-md transition-all"
    :class="[roleBorderClass, archetypeBgClass]"
    @click="!selectable && (open = true)"
  >
    <!-- 标题行 -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-gray-900">{{ skill.name }}</span>
        <span class="text-[0.6rem] font-mono text-gray-300 uppercase">{{
          ROLE_LABEL[skill.role ?? 'normal']
        }}</span>
      </div>
      <div class="flex gap-1">
        <span
          v-for="tag in skill.tags"
          :key="tag"
          class="text-xs font-mono px-1.5 py-0.5 rounded-full"
          :class="TAG_CLASS[tag]"
          >{{ TAG_LABEL[tag] }}</span
        >
      </div>
    </div>

    <!-- note：搞怪备注 -->
    <p v-if="skill.note" class="text-[0.68rem] text-gray-300 italic mb-2 leading-relaxed">
      // {{ skill.note }}
    </p>

    <!-- Token 列表 -->
    <div class="flex flex-col gap-1.5">
      <template v-for="(token, i) in tokens" :key="i">
        <div v-if="token.kind === 'damage'" class="flex items-start gap-1.5">
          <span class="text-xs font-mono px-1.5 py-0.5 rounded bg-red-50 text-red-400 shrink-0"
            >伤害</span
          >
          <span class="text-xs text-gray-700 min-w-0 leading-snug">{{
            renderDamageToken(token, level)
          }}</span>
        </div>

        <div v-else-if="token.kind === 'cost'" class="flex items-start gap-1.5">
          <span
            class="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-500 shrink-0"
            >{{ token.value < 0 ? '回复' : '消耗' }}</span
          >
          <span class="text-xs min-w-0 leading-snug" :class="COST_STAT_CLASS[token.stat]">
            {{ renderCostToken(token, level) }}
          </span>
        </div>

        <div
          v-else-if="token.kind === 'buff' && !(skill.note && token.duration < 0)"
          class="flex items-start gap-1.5"
        >
          <span
            class="text-xs font-mono px-1.5 py-0.5 rounded shrink-0"
            :class="
              token.target === 'self'
                ? 'bg-sky-50 text-sky-500'
                : isDebuffToken(token)
                  ? 'bg-red-50 text-red-400'
                  : 'bg-violet-50 text-violet-400'
            "
            >{{ token.target === 'self' ? '自身' : '目标' }}</span
          >
          <span
            class="text-xs min-w-0 leading-snug cursor-default"
            :class="isDebuffToken(token) ? 'text-red-500' : 'text-gray-700'"
            :data-tips="buffDescTips(token)"
          >
            {{ token.name
            }}<span v-if="token.duration !== 0" class="text-gray-400 ml-1"
              >{{ token.duration < 0 ? '永久' : `${token.duration} 回合` }}</span
            >
          </span>
        </div>

        <div v-else-if="token.kind === 'effectDesc'" class="flex items-start gap-1.5">
          <span class="text-xs font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-500 shrink-0"
            >永久</span
          >
          <span class="text-xs text-gray-700 min-w-0 leading-snug">{{
            renderEffectToken(token, level)
          }}</span>
        </div>

        <div v-else-if="token.kind === 'trigger'" class="flex items-start gap-1.5">
          <span
            class="text-xs font-mono px-1.5 py-0.5 rounded shrink-0"
            :class="TRIGGER_CLASS[token.on]"
            >{{ TRIGGER_LABEL[token.on] }}</span
          >
          <div class="flex flex-col gap-0.5 min-w-0">
            <span v-if="token.chance !== undefined" class="text-xs text-gray-400 leading-snug">{{
              pctTier(token.chance, 'chance', level)
            }}</span>
            <template v-for="e in token.effects" :key="e.when + e.behavior.kind">
              <span class="text-xs text-gray-600 leading-snug">{{
                renderEffectToken(e, level)
              }}</span>
            </template>
          </div>
        </div>

        <div v-else-if="token.kind === 'condition'" class="flex items-start gap-1.5">
          <span
            class="text-xs font-mono px-1.5 py-0.5 rounded bg-orange-50 text-orange-400 shrink-0"
            >条件</span
          >
          <span class="text-xs text-orange-500 min-w-0 leading-snug">{{
            renderConditionToken(token, level)
          }}</span>
        </div>

        <p
          v-else-if="token.kind === 'flavor' && !skill.note"
          class="text-xs text-gray-400 italic mt-1 leading-snug"
        >
          {{ token.text }}
        </p>
      </template>
    </div>
  </div>

  <!-- 弹出层 -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-6"
        @click.self="open = false"
      >
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="open = false" />

        <!-- 面板 -->
        <div
          class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
        >
          <!-- 头部 -->
          <div class="sticky top-0 bg-white rounded-t-3xl px-6 pt-6 pb-4 border-b border-gray-100">
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <h2 class="text-lg font-semibold text-gray-900">{{ skill.name }}</h2>
                  <span class="text-[0.6rem] font-mono text-gray-300 uppercase">{{
                    ROLE_LABEL[skill.role ?? 'normal']
                  }}</span>
                </div>
                <p v-if="skill.note" class="text-xs text-gray-300 italic">// {{ skill.note }}</p>
              </div>
              <button
                class="text-gray-300 hover:text-gray-500 transition-colors ml-4 mt-0.5"
                @click="open = false"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="flex gap-1 mt-2">
              <span
                v-for="tag in skill.tags"
                :key="tag"
                class="text-xs font-mono px-1.5 py-0.5 rounded-full"
                :class="TAG_CLASS[tag]"
                >{{ TAG_LABEL[tag] }}</span
              >
            </div>
          </div>

          <div class="px-6 py-4 flex flex-col gap-5">
            <!-- 基础效果 -->
            <div>
              <p class="text-[0.6rem] font-mono tracking-widest text-gray-300 uppercase mb-2">
                Base
              </p>
              <div class="flex flex-col gap-1.5">
                <template v-for="(token, i) in tokens" :key="i">
                  <div v-if="token.kind === 'damage'" class="flex items-center gap-2">
                    <span class="text-xs font-mono px-1.5 py-0.5 rounded bg-red-50 text-red-400"
                      >伤害</span
                    >
                    <span class="text-sm text-gray-700">{{ renderDamageToken(token, level) }}</span>
                  </div>
                  <div v-else-if="token.kind === 'cost'" class="flex items-center gap-2">
                    <span
                      class="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-500"
                      >{{ token.value < 0 ? '回复' : '消耗' }}</span
                    >
                    <span class="text-sm" :class="COST_STAT_CLASS[token.stat]">{{
                      renderCostToken(token, level)
                    }}</span>
                  </div>
                  <div
                    v-else-if="token.kind === 'buff' && !(skill.note && token.duration < 0)"
                    class="flex items-center gap-2"
                  >
                    <span
                      class="text-xs font-mono px-1.5 py-0.5 rounded shrink-0"
                      :class="
                        token.target === 'self'
                          ? 'bg-sky-50 text-sky-500'
                          : isDebuffToken(token)
                            ? 'bg-red-50 text-red-400'
                            : 'bg-violet-50 text-violet-400'
                      "
                      >{{ token.target === 'self' ? '自身' : '目标' }}</span
                    >
                    <span
                      class="text-sm"
                      :class="isDebuffToken(token) ? 'text-red-500' : 'text-gray-700'"
                      >{{ token.name
                      }}<span v-if="token.duration !== 0" class="text-xs text-gray-400 ml-1"
                        >{{ token.duration < 0 ? '永久' : `${token.duration} 回合` }}</span
                      ></span
                    >
                  </div>
                  <div v-else-if="token.kind === 'trigger'" class="flex items-start gap-2">
                    <span
                      class="text-xs font-mono px-1.5 py-0.5 rounded shrink-0"
                      :class="TRIGGER_CLASS[token.on]"
                      >{{ TRIGGER_LABEL[token.on] }}</span
                    >
                    <div class="flex flex-col gap-0.5">
                      <span v-if="token.chance !== undefined" class="text-xs text-gray-400">{{
                        pctTier(token.chance, 'chance', level)
                      }}</span>
                      <span
                        v-for="e in token.effects"
                        :key="e.when"
                        class="text-xs text-gray-600"
                        >{{ renderEffectToken(e, level) }}</span
                      >
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- Delta 列表 -->
            <div v-if="skill.upgrades?.length">
              <p class="text-[0.6rem] font-mono tracking-widest text-gray-300 uppercase mb-2">
                Upgrades
              </p>
              <div class="flex flex-col gap-2">
                <div
                  v-for="(upg, i) in skill.upgrades"
                  :key="i"
                  class="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
                >
                  <!-- type badge -->
                  <div class="flex items-center gap-1.5 mb-1.5">
                    <span
                      class="text-[0.6rem] font-mono px-1.5 py-0.5 rounded-full"
                      :class="
                        upg.type === 'depth'
                          ? 'bg-blue-50 text-blue-400'
                          : 'bg-violet-50 text-violet-400'
                      "
                      >{{ upg.type === 'depth' ? 'DEPTH' : 'BREADTH' }}</span
                    >
                    <span v-if="upg.maxUses" class="text-[0.6rem] font-mono text-gray-300"
                      >max ×{{ upg.maxUses }}</span
                    >
                  </div>
                  <!-- delta 描述行 -->
                  <div class="flex flex-col gap-0.5">
                    <span
                      v-for="line in describeUpgradeDelta(upg.delta, level)"
                      :key="line"
                      class="text-xs text-gray-700"
                      >{{ line }}</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  resolveSkill,
  describeSkill,
  describeUpgradeDelta,
  renderDamageToken,
  renderCostToken,
  renderConditionToken,
  renderEffectToken,
  pctTier,
  type BuffDescToken,
  type EffectDescToken,
  type SkillData,
  type SkillTag,
} from '@xwink/rpg'
import { useLogLevel } from '@/ui/utils/useLogLevel'

const props = defineProps<{ skill: SkillData; selectable?: boolean }>()

const open = ref(false)
const resolved = computed(() => resolveSkill(props.skill))
const tokens = computed(() => describeSkill(resolved.value))

const { minLevel } = useLogLevel()
const level = computed(() => minLevel.value)

// ── role 边框 ─────────────────────────────────────────────────────────────────

const ROLE_BORDER: Record<string, string> = {
  normal: 'border-2 border-gray-400',
  ultimate: 'border-2 border-amber-400',
  passive: 'border border-gray-200',
}

const roleBorderClass = computed(() => ROLE_BORDER[props.skill.role ?? 'normal'])

// ── 流派底色：base tags 优先，否则从 upgrades.addTags 中取第一个 ────────────────

const ARCHETYPE_BG: Record<SkillTag, string> = {
  attack: 'bg-red-50',
  defense: 'bg-blue-50',
  buff: 'bg-yellow-50',
  debuff: 'bg-purple-50',
  control: 'bg-orange-50',
  heal: 'bg-green-50',
  protect: 'bg-sky-50',
}

const archetypeBgClass = computed(() => {
  const base = props.skill.tags[0] as SkillTag | undefined
  if (base) return ARCHETYPE_BG[base]
  for (const upg of props.skill.upgrades ?? []) {
    const t = upg.delta.addTags?.[0] as SkillTag | undefined
    if (t) return ARCHETYPE_BG[t]
  }
  return 'bg-white'
})

const ROLE_LABEL: Record<string, string> = { normal: 'N', ultimate: 'ULT', passive: 'PSV' }

const TAG_LABEL: Record<SkillTag, string> = {
  attack: 'ATK',
  defense: 'DEF',
  buff: 'BUF',
  debuff: 'DEB',
  control: 'CTL',
  heal: 'HEL',
  protect: 'PRO',
}

const TAG_CLASS: Record<SkillTag, string> = {
  attack: 'bg-red-50 text-red-400',
  defense: 'bg-blue-50 text-blue-400',
  buff: 'bg-yellow-50 text-yellow-500',
  debuff: 'bg-purple-50 text-purple-400',
  control: 'bg-orange-50 text-orange-400',
  heal: 'bg-green-50 text-green-500',
  protect: 'bg-sky-50 text-sky-400',
}

const COST_STAT_CLASS: Record<string, string> = {
  energy: 'text-amber-500',
  san: 'text-purple-400',
  health: 'text-red-400',
}

const TRIGGER_LABEL: Record<string, string> = {
  onHit: '命中时',
  onCrit: '暴击时',
  onKill: '击杀时',
  onCombo: '连击时',
}

const TRIGGER_CLASS: Record<string, string> = {
  onHit: 'bg-gray-100 text-gray-500',
  onCrit: 'bg-yellow-50 text-yellow-500',
  onKill: 'bg-red-50 text-red-400',
  onCombo: 'bg-sky-50 text-sky-500',
}

function isDebuffToken(token: BuffDescToken): boolean {
  return token.effects.some((e) => e.behavior.kind === 'propMod' && e.behavior.value < 0)
}

function buffDescTips(token: BuffDescToken): string {
  const lines = token.effects.map((e: EffectDescToken) => renderEffectToken(e, level.value))
  return JSON.stringify({
    title: token.name,
    subtitle: token.duration < 0 ? '永久' : token.duration > 0 ? `持续 ${token.duration} 回合` : '立即触发',
    content: lines.join('\n') || '无效果',
  })
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition:
    transform 0.15s ease,
    opacity 0.15s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.96);
  opacity: 0;
}
</style>
