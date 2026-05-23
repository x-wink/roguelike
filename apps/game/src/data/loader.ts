// data/loader — 数据层统一入口。
// 从 JSON 文件加载游戏数据，运行时做最低限度的结构校验：
// 字段缺失或类型错误时抛出 `invalid data: {file} → {field}`，禁止静默使用错误数据。

import rawBuffsJson from './buffs.json'
import rawEnemiesJson from './enemies.json'
import rawEventsJson from './events.json'
import rawMutationsJson from './mutations.json'
import rawRelicsJson from './relics.json'
import rawShopJson from './shop.json'
import rawSkillsJson from './skills.json'

import type { BuffData, EffectData, SkillData } from '@xwink/rpg'
import type { GameEvent, MutationDef, RelicData, ShopItem } from '@/game/meta'
import type { EnemyData } from '@/game/units/enemy'

// ── 校验工具 ──────────────────────────────────────────────────────────────────

function fail(file: string, path: string): never {
  throw new Error(`invalid data: ${file} → ${path}`)
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function ensureString(file: string, path: string, v: unknown): string {
  if (typeof v !== 'string') fail(file, path)
  return v
}

function ensureNumber(file: string, path: string, v: unknown): number {
  if (typeof v !== 'number' || Number.isNaN(v)) fail(file, path)
  return v
}

function ensureArray(file: string, path: string, v: unknown): unknown[] {
  if (!Array.isArray(v)) fail(file, path)
  return v
}

// ── 通用：EffectData / BuffData（结构校验仅校验顶层关键字段）─────────────────

function validateEffectData(file: string, path: string, raw: unknown): EffectData {
  if (!isObj(raw)) fail(file, path)
  if (typeof raw.when !== 'string') fail(file, `${path}.when`)
  if (!isObj(raw.behavior) || typeof raw.behavior.kind !== 'string') {
    fail(file, `${path}.behavior.kind`)
  }
  return raw as unknown as EffectData
}

function validateBuffData(file: string, path: string, raw: unknown): BuffData {
  if (!isObj(raw)) fail(file, path)
  ensureString(file, `${path}.id`, raw.id)
  ensureString(file, `${path}.name`, raw.name)
  ensureNumber(file, `${path}.duration`, raw.duration)
  const effects = ensureArray(file, `${path}.effects`, raw.effects)
  effects.forEach((e, i) => validateEffectData(file, `${path}.effects[${i}]`, e))
  return raw as unknown as BuffData
}

// ── SkillData ────────────────────────────────────────────────────────────────

function validateSkillData(file: string, path: string, raw: unknown): SkillData {
  if (!isObj(raw)) fail(file, path)
  ensureString(file, `${path}.id`, raw.id)
  ensureString(file, `${path}.name`, raw.name)
  ensureArray(file, `${path}.tags`, raw.tags)
  // multiplier: number | { min, max, strategy }
  const m = raw.multiplier
  if (typeof m === 'number') {
    // ok
  } else if (isObj(m)) {
    ensureNumber(file, `${path}.multiplier.min`, m.min)
    ensureNumber(file, `${path}.multiplier.max`, m.max)
    ensureString(file, `${path}.multiplier.strategy`, m.strategy)
  } else {
    fail(file, `${path}.multiplier`)
  }
  if (raw.effects !== undefined) {
    const arr = ensureArray(file, `${path}.effects`, raw.effects)
    arr.forEach((e, i) => validateEffectData(file, `${path}.effects[${i}]`, e))
  }
  return raw as unknown as SkillData
}

// ── 各文件校验入口 ────────────────────────────────────────────────────────────

function validateSkills(raw: unknown): SkillData[] {
  const arr = ensureArray('skills.json', 'root', raw)
  return arr.map((s, i) => validateSkillData('skills.json', `[${i}]`, s))
}

function validateBuffs(raw: unknown): BuffData[] {
  const arr = ensureArray('buffs.json', 'root', raw)
  return arr.map((b, i) => validateBuffData('buffs.json', `[${i}]`, b))
}

function validateEnemies(raw: unknown): Record<string, EnemyData> {
  if (!isObj(raw)) fail('enemies.json', 'root')
  const out: Record<string, EnemyData> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!isObj(value)) fail('enemies.json', key)
    ensureString('enemies.json', `${key}.id`, value.id)
    ensureString('enemies.json', `${key}.name`, value.name)
    const skills = ensureArray('enemies.json', `${key}.skills`, value.skills)
    skills.forEach((s, i) => validateSkillData('enemies.json', `${key}.skills[${i}]`, s))
    out[key] = value as unknown as EnemyData
  }
  return out
}

function validateEvents(raw: unknown): GameEvent[] {
  const arr = ensureArray('events.json', 'root', raw)
  return arr.map((e, i) => {
    if (!isObj(e)) fail('events.json', `[${i}]`)
    ensureString('events.json', `[${i}].id`, e.id)
    ensureString('events.json', `[${i}].name`, e.name)
    ensureString('events.json', `[${i}].description`, e.description)
    const opts = ensureArray('events.json', `[${i}].options`, e.options)
    opts.forEach((o, j) => {
      if (!isObj(o)) fail('events.json', `[${i}].options[${j}]`)
      ensureString('events.json', `[${i}].options[${j}].label`, o.label)
      if (!isObj(o.effect) || typeof o.effect.kind !== 'string') {
        fail('events.json', `[${i}].options[${j}].effect.kind`)
      }
    })
    return e as unknown as GameEvent
  })
}

function validateShop(raw: unknown): ShopItem[] {
  const arr = ensureArray('shop.json', 'root', raw)
  return arr.map((s, i) => {
    if (!isObj(s)) fail('shop.json', `[${i}]`)
    ensureString('shop.json', `[${i}].id`, s.id)
    ensureString('shop.json', `[${i}].name`, s.name)
    ensureString('shop.json', `[${i}].description`, s.description)
    ensureNumber('shop.json', `[${i}].cost`, s.cost)
    if (!isObj(s.effect) || typeof s.effect.kind !== 'string') {
      fail('shop.json', `[${i}].effect.kind`)
    }
    return s as unknown as ShopItem
  })
}

function ensureNonEmptyString(file: string, path: string, v: unknown): string {
  const s = ensureString(file, path, v)
  if (s.length === 0) fail(file, path)
  return s
}

function validateRelicEffect(file: string, path: string, raw: unknown): void {
  if (!isObj(raw)) fail(file, path)
  const kind = ensureString(file, `${path}.kind`, raw.kind)
  switch (kind) {
    case 'maxHpFlat':
    case 'maxEnergyFlat':
    case 'maxSanFlat':
    case 'goldBonus':
      ensureNumber(file, `${path}.amount`, raw.amount)
      return
    case 'statFlat': {
      const stat = ensureString(file, `${path}.stat`, raw.stat)
      if (!['str', 'con', 'agi', 'int', 'lck'].includes(stat)) fail(file, `${path}.stat`)
      ensureNumber(file, `${path}.amount`, raw.amount)
      return
    }
    default:
      fail(file, `${path}.kind`)
  }
}

function validateRelics(raw: unknown): RelicData[] {
  const arr = ensureArray('relics.json', 'root', raw)
  return arr.map((item, i) => {
    if (!isObj(item)) fail('relics.json', `[${i}]`)
    ensureNonEmptyString('relics.json', `[${i}].id`, item.id)
    ensureNonEmptyString('relics.json', `[${i}].name`, item.name)
    ensureNonEmptyString('relics.json', `[${i}].description`, item.description)
    const rarity = ensureString('relics.json', `[${i}].rarity`, item.rarity)
    if (!['common', 'rare', 'epic'].includes(rarity)) fail('relics.json', `[${i}].rarity`)
    const type = ensureString('relics.json', `[${i}].type`, item.type)
    if (!['cut', 'sealed'].includes(type)) fail('relics.json', `[${i}].type`)
    ensureNonEmptyString('relics.json', `[${i}].lore`, item.lore)
    const effects = ensureArray('relics.json', `[${i}].effects`, item.effects)
    if (effects.length === 0) fail('relics.json', `[${i}].effects`)
    effects.forEach((e, j) => validateRelicEffect('relics.json', `[${i}].effects[${j}]`, e))
    return item as unknown as RelicData
  })
}

function validateMutations(raw: unknown): Record<string, MutationDef> {
  const arr = ensureArray('mutations.json', 'root', raw)
  const out: Record<string, MutationDef> = {}
  for (const [i, item] of arr.entries()) {
    if (!isObj(item)) fail('mutations.json', `[${i}]`)
    const id = ensureString('mutations.json', `[${i}].id`, item.id)
    if (id in out) fail('mutations.json', `[${i}].id (duplicate "${id}")`)
    ensureString('mutations.json', `[${i}].name`, item.name)
    ensureNumber('mutations.json', `[${i}].goldMultiplier`, item.goldMultiplier)
    validateBuffData('mutations.json', `[${i}].buff`, item.buff)
    out[id] = item as unknown as MutationDef
  }
  return out
}

// ── 导出（运行时执行校验，校验失败立即抛错）────────────────────────────────

export const SKILL_POOL: SkillData[] = validateSkills(rawSkillsJson)
export const BUFF_PRESETS: BuffData[] = validateBuffs(rawBuffsJson)
export const ENEMIES: Record<string, EnemyData> = validateEnemies(rawEnemiesJson)
export const EVENT_POOL: GameEvent[] = validateEvents(rawEventsJson)
export const SHOP_ITEMS: ShopItem[] = validateShop(rawShopJson)
export const RELICS: RelicData[] = validateRelics(rawRelicsJson)
export const MUTATIONS: Record<string, MutationDef> = validateMutations(rawMutationsJson)

/** 玩家初始技能配置：按 id 从技能池取出（保持 SKILL_POOL 引用一致，便于运行时升级写回） */
const PLAYER_START_IDS = ['normal_balanced', 'ultimate_balanced'] as const

function pickSkillsByIds(ids: readonly string[]): SkillData[] {
  return ids.map((id) => {
    const found = SKILL_POOL.find((s) => s.id === id)
    if (!found) throw new Error(`PLAYER_START: skill "${id}" not found in skills.json`)
    return found
  })
}

export const PLAYER_START = {
  skills: pickSkillsByIds(PLAYER_START_IDS),
}

/** @deprecated 仍供调试工具使用 */
export const INITIAL_SKILLS: SkillData[] = pickSkillsByIds(PLAYER_START_IDS)
