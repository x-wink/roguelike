import { useSettingsStore } from '@/store/settings'
import zh, { type TKey } from './zh'
import en from './en'

const locales = { zh, en } as const

export type { TKey }

export function useT(): (key: TKey) => string {
  const settings = useSettingsStore()
  return (key: TKey) => {
    const map = locales[settings.locale] as Record<string, string>
    return map[key] ?? (zh as Record<string, string>)[key] ?? key
  }
}
