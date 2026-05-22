<template>
  <div class="flex flex-col gap-2">
    <!-- 顶层 pill 行 -->
    <div class="flex flex-wrap gap-2">
      <template v-for="opt in options" :key="opt.label">
        <!-- 叶子节点 -->
        <button
          v-if="!opt.children"
          class="text-xs font-mono px-3 py-1 rounded-full border transition-all"
          :class="modelValue.has(opt.value!) ? opt.activeClass : INACTIVE"
          @click="toggleLeaf(opt.value!)"
          @contextmenu.prevent="soloLeaf(opt.value!)"
        >
          {{ opt.label }}
        </button>

        <!-- 分组节点 -->
        <button
          v-else
          class="text-xs font-mono px-3 py-1 rounded-full border transition-all"
          :class="groupClass(opt)"
          @click="toggleGroup(opt)"
          @contextmenu.prevent="soloGroup(opt)"
        >
          {{ opt.label }}
        </button>
      </template>
    </div>

    <!-- 子级 pill 行（每个有 children 的分组各一行） -->
    <template v-for="opt in options.filter((o) => o.children)" :key="`c-${opt.label}`">
      <div class="flex flex-wrap gap-1.5 pl-4 border-l-2 border-gray-200">
        <button
          v-for="child in opt.children"
          :key="child.value"
          class="text-[0.7rem] font-mono px-2.5 py-0.5 rounded-full border transition-all"
          :class="modelValue.has(child.value!) ? child.activeClass : INACTIVE"
          @click="toggleLeaf(child.value!)"
          @contextmenu.prevent="soloLeaf(child.value!)"
        >
          {{ child.label }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
export interface FilterOption<V extends string = string> {
  value?: V
  label: string
  activeClass: string
  children?: FilterOption<V>[]
}

const props = defineProps<{
  options: FilterOption<T>[]
  modelValue: Set<T>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Set<T>]
}>()

const INACTIVE = 'border-gray-200 text-gray-400 bg-white'

function allLeaves(opts: FilterOption<T>[]): T[] {
  return opts.flatMap((o) => (o.children ? allLeaves(o.children) : o.value ? [o.value] : []))
}

/** 顶层直接叶子节点的值（非 group 的子项） */
function topLeaves(opts: FilterOption<T>[]): T[] {
  return opts.filter((o) => !o.children && o.value).map((o) => o.value!)
}

/** 找到某个值所属的分组（找不到说明是顶层叶子） */
function parentOf(v: T): FilterOption<T> | null {
  return props.options.find((o) => o.children?.some((c) => c.value === v)) ?? null
}

function toggleLeaf(v: T) {
  const s = new Set(props.modelValue)
  s.has(v) ? s.delete(v) : s.add(v)
  emit('update:modelValue', s.size === 0 ? new Set(allLeaves(props.options)) : s)
}

function soloLeaf(v: T) {
  const parent = parentOf(v)
  const s = new Set(props.modelValue)
  if (parent) {
    // 子项：只清空同组兄弟，顶层和其他组不变
    allLeaves(parent.children!).forEach((sib) => s.delete(sib))
  } else {
    // 顶层叶子：只清空其他顶层叶子，子组不变
    topLeaves(props.options).forEach((l) => s.delete(l))
  }
  s.add(v)
  emit('update:modelValue', s)
}

function toggleGroup(opt: FilterOption<T>) {
  const leaves = allLeaves(opt.children!)
  const allActive = leaves.every((v) => props.modelValue.has(v))
  const s = new Set(props.modelValue)
  leaves.forEach((v) => (allActive ? s.delete(v) : s.add(v)))
  emit('update:modelValue', s.size === 0 ? new Set(allLeaves(props.options)) : s)
}

function soloGroup(opt: FilterOption<T>) {
  const s = new Set(props.modelValue)
  // 清空同层其他项：顶层叶子 + 其他分组的子项
  topLeaves(props.options).forEach((v) => s.delete(v))
  props.options
    .filter((o) => o.children && o.label !== opt.label)
    .forEach((o) => allLeaves(o.children!).forEach((v) => s.delete(v)))
  // 选中本组全部子项
  allLeaves(opt.children!).forEach((v) => s.add(v))
  emit('update:modelValue', s)
}

function groupClass(opt: FilterOption<T>): string {
  const leaves = allLeaves(opt.children!)
  const activeCount = leaves.filter((v) => props.modelValue.has(v)).length
  if (activeCount === 0) return INACTIVE
  if (activeCount === leaves.length) return opt.activeClass
  return opt.activeClass + ' !bg-white' // 部分激活：只显示边框和文字，不填充背景
}
</script>
