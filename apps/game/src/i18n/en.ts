import type { TKey } from './zh'

const en: Record<TKey, string> = {
  // ── Settings ──────────────────────────────────────────────────────────────
  'settings.title': 'Settings',
  'settings.tab.global': 'General',
  'settings.tab.battle': 'Battle',
  'settings.language': 'Language',
  'settings.bgm': 'BGM Volume',
  'settings.sfx': 'SFX Volume',
  'settings.motion': 'Reduce Motion',
  'settings.motion.desc': 'Disable non-essential animations',
  'settings.speed': 'Battle Speed',
  'settings.speed.slow': 'Slow',
  'settings.speed.normal': 'Normal',
  'settings.speed.fast': 'Fast',
  'settings.log': 'Battle Log',
  'settings.log.desc': 'Show skill usage record',
  'settings.reset': 'Reset to Defaults',
  'settings.close': 'Close',
  'lang.zh': '中文',
  'lang.en': 'English',

  // ── Pause Menu ────────────────────────────────────────────────────────────
  'menu.title': 'Paused',
  'menu.resume': 'Resume',
  'menu.settings': 'Settings',
  'menu.save': 'Save Progress',
  'menu.save.done': 'Saved',
  'menu.exit': 'Exit to Camp',
  'menu.exit.confirm': 'Abandon this run and return to camp?',

  // ── Node Types (Map) ───────────────────────────────────────────────────────
  'node.battle': 'Battle',
  'node.elite': 'Elite',
  'node.boss': 'Boss',
  'node.rest': 'Rest',
  'node.event': 'Event',
  'node.shop': 'Shop',
  'node.battle.desc': 'Standard enemy',
  'node.elite.desc': 'Hardened enemy, better drops',
  'node.boss.desc': 'Zone end',
  'node.rest.desc': 'Restore HP or upgrade a skill',
  'node.event.desc': 'Random event',
  'node.shop.desc': 'Purchase items',
  'node.select': 'Select →',

  // ── World Map ─────────────────────────────────────────────────────────────
  'world.cleared': 'Cleared',
  'world.locked': 'Locked',
  'world.enter': 'Enter →',

  // ── Battle ────────────────────────────────────────────────────────────────
  'battle.combo': 'Combo',
  'battle.buff.permanent': '∞',

  // ── Skill Pick ────────────────────────────────────────────────────────────
  'skill-pick.header': 'Victory',
  'skill-pick.title': 'Enhance Skill',
  'skill-pick.hint': 'Pick one enhancement for your skill pool',
  'skill-pick.acquire': 'Acquire',
  'skill-pick.upgrade': 'Upgrade',
  'skill-pick.breadth': 'Breadth',
  'skill-pick.depth': 'Depth',
  'skill-pick.multiplier': 'Multiplier',
  'skill-pick.empty': 'No enhancements available',
  'skill-pick.skip': 'Skip',

  // ── Relic Pick ────────────────────────────────────────────────────────────
  'relic-pick.title': 'Choose Relic',
  'relic-pick.hint': 'Choose a relic, or skip',
  'relic-pick.skip': 'Skip',
  'rarity.common': 'Common',
  'rarity.rare': 'Rare',
  'rarity.epic': 'Epic',
  'relic.type.cut': 'Cut',
  'relic.type.sealed': 'Sealed',

  // ── Rest ──────────────────────────────────────────────────────────────────
  'rest.title': 'Rest Point',
  'rest.heal': 'Recover',
  'rest.heal.desc': 'Restore 30% max HP',
  'rest.or-upgrade': '— or upgrade a skill —',

  // ── Shop ──────────────────────────────────────────────────────────────────
  'shop.title': 'Supply Depot',
  'shop.hint': 'Choose a supply',
  'shop.skip': 'Skip',

  // ── Result ────────────────────────────────────────────────────────────────
  'result.san': 'Sanity',
  'result.nodes': 'Nodes',
  'result.gold': 'Gold',
  'result.replay': 'Try Again',
  'result.exit': 'Return to Camp',

  // ── Story ─────────────────────────────────────────────────────────────────
  'story.skip': 'Skip',
  'story.confirm': 'Confirm',

  // ── Lore ──────────────────────────────────────────────────────────────────
  'lore.title': 'Relic Compendium',
}

export default en
