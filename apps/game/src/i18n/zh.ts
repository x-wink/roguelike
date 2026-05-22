const zh = {
  'settings.title': '设置',
  'settings.tab.global': '全局',
  'settings.tab.battle': '战斗',
  'settings.language': '语言',
  'settings.bgm': 'BGM 音量',
  'settings.sfx': '音效音量',
  'settings.motion': '减少动效',
  'settings.motion.desc': '关闭非必要动画',
  'settings.speed': '战斗速度',
  'settings.speed.slow': '慢',
  'settings.speed.normal': '标准',
  'settings.speed.fast': '快',
  'settings.log': '战斗日志',
  'settings.log.desc': '显示技能使用记录',
  'settings.reset': '恢复默认',
  'settings.close': '关闭',
  'lang.zh': '中文',
  'lang.en': 'English',
} as const

export default zh
export type TKey = keyof typeof zh
