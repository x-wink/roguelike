<template>
  <DebugLayout title="字体一览">
    <div class="flex-1 overflow-y-auto">
      <div
        v-if="loading"
        class="flex items-center justify-center py-16 text-sm text-gray-300 font-mono tracking-widest"
      >
        Loading fonts...
      </div>

      <template v-else>
        <div v-for="section in sections" :key="section.label" class="mb-10">
          <div class="flex items-center gap-4 mb-4">
            <span class="text-[0.65rem] tracking-[0.4em] font-mono uppercase text-gray-400">{{
              section.label
            }}</span>
            <div class="flex-1 h-px bg-gray-200" />
            <span class="text-[0.6rem] tracking-widest font-mono text-gray-300"
              >{{ section.groups.length }} fonts</span
            >
          </div>

          <div v-if="section.groups.length === 0" class="text-sm text-gray-300 font-mono py-4">
            — 无匹配字体
          </div>

          <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
            <div
              v-for="group in section.groups"
              :key="group.name"
              class="bg-white rounded-2xl border border-gray-200 px-5 py-5 flex flex-col gap-3 overflow-hidden"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-gray-900">{{ group.name }}</span>
                <span class="text-[0.55rem] font-mono text-gray-300"
                  >{{ group.variants.length }}v</span
                >
                <div v-if="group.variants.length > 1" class="ml-auto">
                  <select
                    class="bg-gray-50 text-gray-500 border border-gray-200 px-2 pr-6 py-0.5 text-[0.65rem] font-mono cursor-pointer outline-none appearance-none rounded transition-colors hover:border-gray-400 focus:border-gray-500 variant-select"
                    :value="activeTab[group.name]"
                    @change="activeTab[group.name] = ($event.target as HTMLSelectElement).value"
                  >
                    <option v-for="v in group.variants" :key="v.family" :value="v.family">
                      {{ v.label }}
                    </option>
                  </select>
                </div>
              </div>

              <div
                class="leading-none text-gray-900 overflow-hidden"
                :style="{
                  fontFamily: `'${current(group)}', serif`,
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                }"
              >
                {{ section.sampleXl }}
              </div>

              <div class="flex flex-col gap-1 border-t border-gray-100 pt-3">
                <div
                  class="leading-snug text-gray-600"
                  :style="{
                    fontFamily: `'${current(group)}'`,
                    fontSize: 'clamp(0.8rem, 1.5vw, 1rem)',
                  }"
                >
                  {{ section.sampleLg }}
                </div>
                <div
                  class="text-[0.75rem] leading-relaxed text-gray-400"
                  :style="{ fontFamily: `'${current(group)}'` }"
                >
                  {{ section.sampleMd }}
                </div>
                <div
                  class="text-[0.6rem] leading-relaxed text-gray-300 tracking-wide"
                  :style="{ fontFamily: `'${current(group)}'` }"
                >
                  {{ section.sampleSm }}
                </div>
              </div>

              <div
                class="flex items-baseline flex-wrap gap-3 pt-2 border-t border-gray-100 overflow-hidden"
              >
                <span
                  v-for="size in sizes"
                  :key="size"
                  class="text-gray-300"
                  :style="{ fontFamily: `'${current(group)}'`, fontSize: size }"
                  >{{ section.sizeChar }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </DebugLayout>
</template>

<script setup lang="ts">
import { loadFontGroups, type FontGroup } from '@/utils/fonts'
import { computed, onMounted, reactive, ref } from 'vue'
import DebugLayout from './Layout.vue'

const loading = ref(true)
const groups = ref<FontGroup[]>([])
const activeTab = reactive<Record<string, string>>({})

function hasChinese(s: string) {
  return /[一-鿿㐀-䶿]/.test(s)
}

function isChinese(group: FontGroup) {
  return hasChinese(group.name) || group.variants.some((v) => hasChinese(v.label))
}

const chineseGroups = computed(() => groups.value.filter((g) => isChinese(g)))
const englishGroups = computed(() => groups.value.filter((g) => !isChinese(g)))

const sections = computed(() => [
  {
    label: '中文字体',
    groups: chineseGroups.value,
    sampleXl: '囚烬日记',
    sampleLg: '试炼已始，无路可退',
    sampleMd: '亿万之中，你被选中。操盘者实时调整试炼规则，测试蛊虫的适应性。',
    sampleSm: '开始试炼 · 载入中... · 试炼已记录 · 距下一轮清算 · 所有数据均被记录',
    sizeChar: '囚烬',
  },
  {
    label: '英文字体',
    groups: englishGroups.value,
    sampleXl: 'Crucible',
    sampleLg: 'TRIAL PROTOCOL · SECTOR UNKNOWN',
    sampleMd: 'OBSERVER_ID: ██████ · SUBJECT_COUNT: 847293641 · TRIAL_STATUS: ACTIVE',
    sampleSm: 'You have been selected. The trial has begun. There is no turning back.',
    sizeChar: 'Aa1',
  },
])

function current(group: FontGroup): string {
  return activeTab[group.name] ?? group.variants[0].family
}

const sizes = ['0.7rem', '1rem', '1.4rem', '2rem', '3rem']

onMounted(async () => {
  const loaded = await loadFontGroups()
  groups.value = loaded
  for (const g of loaded) activeTab[g.name] = g.variants[0].family
  loading.value = false
})
</script>

<style scoped>
.variant-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
}
</style>
