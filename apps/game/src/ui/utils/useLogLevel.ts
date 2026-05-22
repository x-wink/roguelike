import { computed } from 'vue'
import { useRoute } from 'vue-router'

export const LOG_LEVELS = ['debug', 'trace', 'info', 'warn', 'error'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  trace: 1,
  info: 2,
  warn: 3,
  error: 4,
}

const DEFAULT_MIN: LogLevel = 'info'
const VALID_LEVELS = new Set<string>(LOG_LEVELS)

export function useLogLevel() {
  const route = useRoute()

  const minLevel = computed<LogLevel>(() => {
    const q = route.query._level
    return typeof q === 'string' && VALID_LEVELS.has(q) ? (q as LogLevel) : DEFAULT_MIN
  })

  function isVisible(level: LogLevel = 'info'): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel.value]
  }

  return { minLevel, isVisible }
}
