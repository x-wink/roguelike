<template>
  <div class="flex-1 flex flex-col" style="background: #2e2e2e">
    <div class="px-5 pt-10 pb-4 border-b border-[#404040]">
      <p class="text-[0.68rem] tracking-[0.3em] text-[#777] font-mono uppercase mb-1">战斗胜利</p>
      <h2 class="text-xl font-semibold text-[#f0eeeb]">强化技能</h2>
      <p class="text-sm text-[#888] mt-1">选一项强化加入你的技能池</p>
    </div>

    <div class="flex-1 px-5 py-6 flex flex-col gap-3 overflow-y-auto">
      <button
        v-for="(candidate, i) in game.skillCandidates"
        :key="i"
        class="w-full flex flex-col gap-2 px-4 py-4 rounded-xl border text-left transition-all hover:shadow-md"
        :class="candidateBorderClass(candidate)"
        @click="game.pickSkill(candidate)"
      >
        <!-- 获取新技能 -->
        <template v-if="candidate.kind === 'acquire'">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-[0.6rem] font-mono px-1.5 py-0.5 rounded bg-[#404040] text-[#888]"
                >获取</span
              >
              <span class="text-base font-semibold text-[#e8e4e0]">{{ candidate.skill.name }}</span>
            </div>
            <span
              class="text-[0.62rem] font-mono px-2 py-0.5 rounded-full"
              :class="tagClass(candidate.skill.tags[0])"
              >{{ candidate.skill.tags.join(' + ') }}</span
            >
          </div>
          <p v-if="candidate.skill.note" class="text-sm text-[#aaa]">
            {{ candidate.skill.note }}
          </p>
          <p
            v-if="multVal(candidate.skill.multiplier) > 0"
            class="text-[0.68rem] text-[#666] font-mono"
          >
            倍率 ×{{ multVal(candidate.skill.multiplier).toFixed(1) }}
          </p>
        </template>

        <!-- 升级已有技能 -->
        <template v-else>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span
                class="text-[0.6rem] font-mono px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400"
                >升级</span
              >
              <span class="text-base font-semibold text-[#e8e4e0]">{{ candidate.skill.name }}</span>
            </div>
            <span
              class="text-[0.62rem] font-mono px-2 py-0.5 rounded-full"
              :class="tagClass(candidate.skill.tags[0])"
              >{{ candidate.skill.tags.join(' + ') }}</span
            >
          </div>
          <div class="flex flex-col gap-0.5">
            <p
              v-for="line in describeUpgradeDelta(candidate.upgrade.delta)"
              :key="line"
              class="text-sm text-[#c8c4be]"
            >
              {{ line }}
            </p>
          </div>
          <p class="text-[0.68rem] text-[#777] font-mono">
            Lv.{{ candidate.skill.upgradeLevel ?? 0 }} → Lv.{{
              (candidate.skill.upgradeLevel ?? 0) + 1
            }}
            <span v-if="candidate.upgrade.type" class="ml-1 opacity-60">{{
              candidate.upgrade.type === 'breadth' ? '广度' : '深度'
            }}</span>
          </p>
        </template>
      </button>

      <p v-if="game.skillCandidates.length === 0" class="text-sm text-[#666] text-center py-8">
        暂无可用强化
      </p>
    </div>

    <div class="px-5 pb-4">
      <button
        class="w-full py-3 text-sm text-[#666] hover:text-[#999] transition-colors"
        @click="game.skipSkillPick()"
      >
        跳过
      </button>
    </div>

    <PlayerStatusBar />
  </div>
</template>

<script setup lang="ts">
import {
  describeUpgradeDelta,
  type MultiplierDef,
  type SkillCandidate,
  type SkillTag,
} from '@xwink/rpg'
import { useGameStore } from '@/store/game'
import PlayerStatusBar from '@/ui/components/PlayerStatusBar.vue'

const game = useGameStore()

function multVal(m: number | MultiplierDef): number {
  return typeof m === 'number' ? m : m.max
}

function tagClass(type: SkillTag) {
  const map: Record<SkillTag, string> = {
    attack: 'bg-red-900/25 text-red-400',
    defense: 'bg-blue-900/25 text-blue-400',
    buff: 'bg-yellow-900/25 text-yellow-400',
    debuff: 'bg-purple-900/25 text-purple-400',
    control: 'bg-orange-900/25 text-orange-400',
    heal: 'bg-green-900/25 text-green-400',
    protect: 'bg-sky-900/25 text-sky-400',
  }
  return map[type] ?? 'bg-[#404040] text-[#888]'
}

function candidateBorderClass(candidate: SkillCandidate) {
  if (candidate.kind === 'upgrade') {
    return 'border-amber-700/40 bg-amber-900/10 hover:border-amber-600/60'
  }
  return 'border-[#484848] bg-[#363636] hover:border-[#5a5a5a]'
}
</script>
