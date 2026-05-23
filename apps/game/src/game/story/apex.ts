import type { StoryScript } from './types'

/**
 * 天渊·先遣台词——按元进度阶段分三幕。
 * 先遣是守在天渊入口的人，她在这里等了很久，但说不清楚在等什么。
 *
 * 阶段判定见 meta.pollApexStage()：
 *   0 → APEX_VANGUARD_0（首次踏入）
 *   1 → APEX_VANGUARD_1（积累后再至）
 *   2 → APEX_VANGUARD_2（深层到达）
 */

export const APEX_VANGUARD_0: StoryScript = {
  id: 'apex-vanguard-0',
  beats: [
    {
      bgVariant: 'void',
      text: '天渊入口。空气比别处更薄，光比别处更少。',
    },
    {
      bgVariant: 'void',
      speaker: '先遣',
      text: '你来这里做什么。',
    },
    {
      bgVariant: 'void',
      speaker: '先遣',
      text: '不是问句。只是你走到这里的时候，我想知道你是不是知道自己在走向哪里。',
    },
    {
      bgVariant: 'void',
      speaker: '先遣',
      text: '大多数人到这里还没散掉——是运气，不是实力。',
    },
    {
      bgVariant: 'void',
      speaker: '先遣',
      text: '进去吧。反正没人能拦住。',
    },
  ],
}

export const APEX_VANGUARD_1: StoryScript = {
  id: 'apex-vanguard-1',
  beats: [
    {
      bgVariant: 'void',
      speaker: '先遣',
      text: '又来了。',
    },
    {
      bgVariant: 'void',
      speaker: '先遣',
      text: '我记得你。不是脸，是那种走法——总在往上看。',
    },
    {
      bgVariant: 'void',
      speaker: '先遣',
      text: '你比上次走到更里面。带回来了什么？',
    },
    {
      bgVariant: 'void',
      speaker: '先遣',
      text: '算了，不重要。留在身上的东西你自己会知道。',
    },
    {
      bgVariant: 'void',
      speaker: '先遣',
      text: '前面不一样了。去看吧。',
    },
  ],
}

export const APEX_VANGUARD_2: StoryScript = {
  id: 'apex-vanguard-2',
  beats: [
    {
      bgVariant: 'void',
      speaker: '先遣',
      text: '你知道我在这里等了多久了吗。',
    },
    {
      bgVariant: 'void',
      speaker: '先遣',
      text: '不是等你。是等某种事情发生——说不清楚是什么，但会认出来。',
    },
    {
      bgVariant: 'void',
      speaker: '先遣',
      text: '每次有人走到这里，我都看一眼。大多数人身上什么都没有。',
    },
    {
      bgVariant: 'void',
      speaker: '先遣',
      text: '你身上有。我不知道那是什么，但它比你本人更重。',
    },
    {
      bgVariant: 'void',
      speaker: '先遣',
      text: '进去。如果还能回来，我们再说。',
    },
  ],
}

export const APEX_VANGUARD_SCRIPTS: StoryScript[] = [
  APEX_VANGUARD_0,
  APEX_VANGUARD_1,
  APEX_VANGUARD_2,
]
