<template>
  <div class="flex flex-col gap-3 min-h-0">
    <!-- 搜索框 -->
    <div class="relative shrink-0">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索技能名…"
        class="w-full text-sm font-mono px-3 py-2 pl-8 rounded-xl border border-gray-200 bg-white text-gray-700 placeholder-gray-300 outline-none focus:border-gray-400 transition-colors"
      />
      <svg
        class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <button
        v-if="searchQuery"
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
        @click="searchQuery = ''"
      >
        <svg
          class="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Role 筛选（仅在未锁定 role 时显示） -->
    <div v-if="!lockRole" class="flex flex-wrap gap-1.5 shrink-0">
      <button
        v-for="opt in ROLE_OPTIONS"
        :key="opt.value"
        class="text-xs font-mono px-3 py-1 rounded-full border transition-all"
        :class="selectedRoles.has(opt.value) ? opt.activeClass : INACTIVE"
        @click="toggleRole(opt.value)"
        @contextmenu.prevent="soloRole(opt.value)"
      >
        {{ opt.label }}<span class="opacity-40 ml-1">{{ roleCount(opt.value) }}</span>
      </button>
    </div>

    <!-- 流派筛选 -->
    <div class="flex flex-wrap gap-1.5 shrink-0">
      <button
        v-for="opt in ARCHETYPE_OPTIONS"
        :key="opt.value"
        class="text-xs font-mono px-3 py-1 rounded-full border transition-all"
        :class="selectedArchetypes.has(opt.value) ? opt.activeClass : INACTIVE"
        @click="toggleArchetype(opt.value)"
        @contextmenu.prevent="soloArchetype(opt.value)"
      >
        {{ opt.label }}<span class="opacity-40 ml-1">{{ archetypeCount(opt.value) }}</span>
      </button>
    </div>

    <!-- 标签筛选 -->
    <div class="shrink-0">
      <FilterTags :options="TAG_OPTIONS" v-model="selectedTags" />
    </div>

    <!-- 结果计数 -->
    <p class="text-[0.65rem] font-mono text-gray-300 shrink-0">
      {{ filtered.length }} / {{ pool.length }} 个技能
    </p>

    <!-- 卡片列表 -->
    <div class="overflow-y-auto flex-1 min-h-0">
      <div
        class="pb-2"
        :class="props.columns === 1 ? 'flex flex-col gap-3' : 'grid grid-cols-2 gap-3'"
      >
        <template v-for="skill in filtered" :key="skill.id">
          <!-- pick 模式：可选中的卡片 -->
          <div v-if="mode === 'pick'" class="relative cursor-pointer" @click="togglePick(skill)">
            <div
              class="absolute inset-0 rounded-2xl border-2 transition-all pointer-events-none z-10"
              :class="isSelected(skill) ? 'border-gray-900' : 'border-transparent'"
            />
            <div
              v-if="isSelected(skill)"
              class="absolute top-2 right-2 z-20 w-4 h-4 rounded-full bg-gray-900 flex items-center justify-center"
            >
              <svg
                class="w-2.5 h-2.5 text-white"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                viewBox="0 0 24 24"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <SkillCard :skill="skill" :selectable="true" />
          </div>

          <!-- browse 模式：普通卡片 -->
          <SkillCard v-else :skill="skill" />
        </template>

        <p v-if="filtered.length === 0" class="col-span-2 text-sm text-gray-300 font-mono py-4">
          — 无匹配
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SKILL_POOL } from '@/data'
import type { SkillData, SkillTag } from '@xwink/rpg'
import { computed, ref } from 'vue'
import type { FilterOption } from '@/ui/views/debug/FilterTags.vue'
import FilterTags from '@/ui/views/debug/FilterTags.vue'
import SkillCard from '@/ui/views/debug/SkillCard.vue'

type SkillRole = 'normal' | 'ultimate' | 'passive'
type ArchetypeKey = 'balanced' | 'aggressive' | 'defensive' | 'gambler' | 'generic'

const props = withDefaults(
  defineProps<{
    mode?: 'browse' | 'pick'
    /** pick 模式下当前已选技能 id 集合 */
    modelValue?: Set<string>
    /** 锁定只显示某些 role，不显示 role 筛选器 */
    lockRole?: SkillRole[]
    /** 自定义技能池，默认用全局 SKILL_POOL */
    pool?: SkillData[]
    /** 卡片列数，默认 2 */
    columns?: 1 | 2
  }>(),
  {
    mode: 'browse',
    modelValue: () => new Set(),
    pool: () => SKILL_POOL,
    columns: 2,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: Set<string>]
}>()

// ── 搜索 ──────────────────────────────────────────────────────────────────────

const searchQuery = ref('')

// ── Role 筛选 ─────────────────────────────────────────────────────────────────

const INACTIVE = 'border-gray-200 text-gray-400 bg-white'

const ROLE_OPTIONS: { value: SkillRole; label: string; activeClass: string }[] = [
  { value: 'normal', label: '普攻', activeClass: 'border-red-300 text-red-500 bg-red-50' },
  {
    value: 'ultimate',
    label: '大招',
    activeClass: 'border-violet-300 text-violet-500 bg-violet-50',
  },
  { value: 'passive', label: '被动', activeClass: 'border-sky-300 text-sky-500 bg-sky-50' },
]

const _defaultRoles = computed<Set<SkillRole>>(() =>
  props.lockRole ? new Set(props.lockRole) : new Set(['normal', 'ultimate', 'passive']),
)
const selectedRoles = ref<Set<SkillRole>>(new Set(_defaultRoles.value))

function roleCount(role: SkillRole) {
  return props.pool.filter((s) => (s.role ?? 'normal') === role).length
}

function toggleRole(v: SkillRole) {
  const s = new Set(selectedRoles.value)
  s.has(v) ? s.delete(v) : s.add(v)
  selectedRoles.value = s.size === 0 ? new Set(_defaultRoles.value) : s
}

function soloRole(v: SkillRole) {
  selectedRoles.value = new Set([v])
}

// ── 流派筛选 ──────────────────────────────────────────────────────────────────

function archetypeOf(id: string): ArchetypeKey {
  if (id.includes('_bal_') || id === 'normal_balanced' || id === 'ultimate_balanced')
    return 'balanced'
  if (id.includes('_agg_') || id === 'normal_aggressive' || id === 'ultimate_aggressive')
    return 'aggressive'
  if (id.includes('_def_') || id === 'normal_defensive' || id === 'ultimate_defensive')
    return 'defensive'
  if (id.includes('_gmb_') || id === 'normal_gambler' || id === 'ultimate_gambler') return 'gambler'
  return 'generic'
}

const ARCHETYPE_OPTIONS: { value: ArchetypeKey; label: string; activeClass: string }[] = [
  { value: 'balanced', label: '均衡', activeClass: 'border-teal-300 text-teal-600 bg-teal-50' },
  { value: 'aggressive', label: '猛攻', activeClass: 'border-red-300 text-red-500 bg-red-50' },
  { value: 'defensive', label: '龟缩', activeClass: 'border-blue-300 text-blue-500 bg-blue-50' },
  {
    value: 'gambler',
    label: '赌狗',
    activeClass: 'border-purple-300 text-purple-500 bg-purple-50',
  },
  { value: 'generic', label: '通用', activeClass: 'border-gray-400 text-gray-600 bg-gray-100' },
]

const selectedArchetypes = ref(
  new Set<ArchetypeKey>(['balanced', 'aggressive', 'defensive', 'gambler', 'generic']),
)

function archetypeCount(a: ArchetypeKey) {
  return props.pool.filter((s) => archetypeOf(s.id) === a).length
}

function toggleArchetype(v: ArchetypeKey) {
  const s = new Set(selectedArchetypes.value)
  s.has(v) ? s.delete(v) : s.add(v)
  selectedArchetypes.value = s.size === 0 ? new Set(ARCHETYPE_OPTIONS.map((o) => o.value)) : s
}

function soloArchetype(v: ArchetypeKey) {
  selectedArchetypes.value = new Set([v])
}

// ── 标签筛选 ──────────────────────────────────────────────────────────────────

function leafValues<T extends string>(opts: FilterOption<T>[]): T[] {
  return opts.flatMap((o) => (o.children ? leafValues(o.children) : o.value ? [o.value] : []))
}

const TAG_OPTIONS: FilterOption<SkillTag>[] = [
  { value: 'attack', label: '攻击', activeClass: 'border-red-300 text-red-400 bg-red-50' },
  { value: 'defense', label: '防御', activeClass: 'border-blue-300 text-blue-400 bg-blue-50' },
  {
    label: '辅助',
    activeClass: 'border-violet-300 text-violet-500 bg-violet-50',
    children: [
      {
        value: 'buff',
        label: '增益',
        activeClass: 'border-yellow-300 text-yellow-500 bg-yellow-50',
      },
      {
        value: 'debuff',
        label: '减益',
        activeClass: 'border-purple-300 text-purple-400 bg-purple-50',
      },
      {
        value: 'control',
        label: '控制',
        activeClass: 'border-orange-300 text-orange-400 bg-orange-50',
      },
      { value: 'heal', label: '回复', activeClass: 'border-green-300 text-green-500 bg-green-50' },
      { value: 'protect', label: '保护', activeClass: 'border-sky-300 text-sky-400 bg-sky-50' },
    ],
  },
]

const selectedTags = ref(new Set<SkillTag>(leafValues(TAG_OPTIONS)))

// ── 过滤 ──────────────────────────────────────────────────────────────────────

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const roles = props.lockRole ? new Set(props.lockRole) : selectedRoles.value
  return props.pool.filter((s) => {
    if (!roles.has((s.role ?? 'normal') as SkillRole)) return false
    if (!selectedArchetypes.value.has(archetypeOf(s.id))) return false
    if (s.tags.length > 0 && !s.tags.some((t) => selectedTags.value.has(t))) return false
    if (q && !s.name.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q)) return false
    return true
  })
})

// ── pick 模式选中逻辑 ─────────────────────────────────────────────────────────

function isSelected(skill: SkillData): boolean {
  return props.modelValue.has(skill.id)
}

function togglePick(skill: SkillData) {
  const next = new Set(props.modelValue)
  if (next.has(skill.id)) {
    next.delete(skill.id)
  } else {
    next.add(skill.id)
  }
  emit('update:modelValue', next)
}
</script>
