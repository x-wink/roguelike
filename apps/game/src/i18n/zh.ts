const zh = {
  // ── 设置 ──────────────────────────────────────────────────────────────────
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

  // ── 暂停菜单 ───────────────────────────────────────────────────────────────
  'menu.title': '暂停',
  'menu.resume': '继续',
  'menu.settings': '设置',
  'menu.save': '保存进度',
  'menu.save.done': '已保存',
  'menu.exit': '退出至营地',
  'menu.exit.confirm': '放弃本次探索并返回营地？',

  // ── 节点类型（地图）────────────────────────────────────────────────────────
  'node.battle': '普通战斗',
  'node.elite': '精英战斗',
  'node.boss': 'Boss',
  'node.rest': '休息点',
  'node.event': '事件',
  'node.shop': '商店',
  'node.battle.desc': '标准敌人',
  'node.elite.desc': '强化敌人，掉落更优质',
  'node.boss.desc': '关卡终点',
  'node.rest.desc': '回复 HP 或强化技能',
  'node.event.desc': '随机事件',
  'node.shop.desc': '购买道具',
  'node.select': '选择 →',

  // ── 世界地图 ───────────────────────────────────────────────────────────────
  'world.cleared': '已通',
  'world.locked': '锁定',
  'world.enter': '进入 →',

  // ── 战斗 ──────────────────────────────────────────────────────────────────
  'battle.combo': '连击',
  'battle.buff.permanent': '永',

  // ── 技能强化 ───────────────────────────────────────────────────────────────
  'skill-pick.header': '战斗胜利',
  'skill-pick.title': '强化技能',
  'skill-pick.hint': '选一项强化加入你的技能池',
  'skill-pick.acquire': '获取',
  'skill-pick.upgrade': '升级',
  'skill-pick.breadth': '广度',
  'skill-pick.depth': '深度',
  'skill-pick.multiplier': '倍率',
  'skill-pick.empty': '暂无可用强化',
  'skill-pick.skip': '跳过',

  // ── 遗物选取 ───────────────────────────────────────────────────────────────
  'relic-pick.title': '选取遗物',
  'relic-pick.hint': '选择一件遗物，或跳过',
  'relic-pick.skip': '跳过',
  'rarity.common': '普通',
  'rarity.rare': '稀有',
  'rarity.epic': '史诗',
  'relic.type.cut': '切割型',
  'relic.type.sealed': '封存型',

  // ── 休息点 ────────────────────────────────────────────────────────────────
  'rest.title': '休息点',
  'rest.heal': '恢复',
  'rest.heal.desc': '回复 30% 最大 HP',
  'rest.or-upgrade': '— 或强化技能 —',

  // ── 商店 ──────────────────────────────────────────────────────────────────
  'shop.title': '补给站',
  'shop.hint': '选择一项补给',
  'shop.skip': '跳过',

  // ── 结算 ──────────────────────────────────────────────────────────────────
  'result.san': '理智',
  'result.nodes': '节点',
  'result.gold': '金币',
  'result.replay': '再来一局',
  'result.exit': '返回营地',

  // ── 剧情 ──────────────────────────────────────────────────────────────────
  'story.skip': '跳过',
  'story.confirm': '确认',

  // ── 图鉴 ──────────────────────────────────────────────────────────────────
  'lore.title': '遗物图鉴',
} as const

export default zh
export type TKey = keyof typeof zh
