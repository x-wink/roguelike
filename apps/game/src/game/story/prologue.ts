import type { StoryScript } from './types'

/** 第一幕·醒来：主角在荒渊废墟独自成形，还没遇见余烬 */
export const PROLOGUE_AWAKEN: StoryScript = {
  id: 'prologue-awaken',
  beats: [
    {
      bgVariant: 'ruins',
      text: '某个瞬间有了轮廓。不是出生——是某种东西第一次有了「我」的轮廓。',
    },
    {
      bgVariant: 'ruins',
      text: '你看着自己的手，像第一次看见手。',
    },
    {
      bgVariant: 'ruins',
      text: '荒渊废墟里有声音。你知道你该应战。',
    },
    {
      bgVariant: 'black',
      text: '意识涣散。',
    },
    {
      bgVariant: 'black',
      text: '渊给新人的第一句话——死不是结束，是回到这里。',
    },
    {
      bgVariant: 'black',
      text: '下一刻在原点重新醒来，只剩下一些说不清楚从哪里来的、零碎的印记。',
    },
  ],
}

/** 第一幕·初遇：第一次死亡回营后，余烬出现，命名发生 */
export const PROLOGUE_ENCOUNTER: StoryScript = {
  id: 'prologue-encounter',
  beats: [
    {
      bgVariant: 'camp',
      text: '第二次回到枢纽，多了一个人坐在破墙根部。她的姿势像是已经在那里很久了。',
    },
    {
      bgVariant: 'camp',
      speaker: '神秘女子',
      text: '你又站起来了。每次都是。',
    },
    {
      bgVariant: 'camp',
      speaker: '主角',
      text: '你是谁。',
    },
    {
      bgVariant: 'camp',
      speaker: '神秘女子',
      text: '比你早。也没停下来过。',
    },
    {
      bgVariant: 'camp',
      speaker: '主角',
      text: '在等我？',
    },
    {
      bgVariant: 'camp',
      speaker: '神秘女子',
      text: '看见你就想等。说不清楚。',
    },
    {
      bgVariant: 'camp',
      speaker: '神秘女子',
      text: '你叫什么？',
    },
    {
      kind: 'input' as const,
      bgVariant: 'camp',
      inputId: 'player-name',
      inputPlaceholder: '输入名字',
      text: '',
    },
    {
      bgVariant: 'camp',
      speaker: '余烬',
      text: '记住了。我叫余烬——某场战斗后听到这两个字，就跟着我了。',
    },
    {
      bgVariant: 'camp',
      speaker: '余烬',
      text: '拿着。比我会用。',
    },
    {
      bgVariant: 'camp',
      text: '两人都没追问对方的来历。两人都不知道为什么没追问。',
    },
  ],
}
