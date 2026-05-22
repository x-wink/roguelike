// plugins/engine-handlers-plugin — Buff 生命周期默认订阅。
//
// 订阅 turn:start / turn:end，借由 BattleContainer 的 buff 操作原语完成 buff 生命周期：
//   turn:start → 触发各单位 buff 在 turnStart 时机的 effects（不含 duration tick）
//   turn:end   → 触发各单位 buff 在 turnEnd 时机的 effects → tickDuration → sweepBuffs
//
// 两阶段删除（参考 EnTT）：tickDuration 期间只 mark expired，不立即从池中移除；
// 全部 turn:end handler 跑完后由 BattleContainer 在 emit('turn:end') 之后调用 sweepBuffs。

import type { EnginePlugin } from '@xwink/engine'

/** 空 marker，仅作 namespace 挂载占位；本插件不持有任何容器状态 */
export class EngineHandlersMarker {}

declare module '@xwink/engine' {
  namespace Engine {
    interface Containers {
      'engine-handlers': EngineHandlersMarker
    }
  }
}

export const EngineHandlersPlugin: EnginePlugin<'engine-handlers', readonly ['unit', 'battle']> = {
  namespace: 'engine-handlers',
  dependencies: ['unit', 'battle'] as const,
  install({ engine, deps }) {
    engine.mount('engine-handlers', new EngineHandlersMarker())
    const battle = deps.battle

    engine.on('turn:start', ({ actor }) => {
      battle.triggerBuffWhen(actor.id, 'turnStart')
    })

    engine.on('turn:end', ({ actor }) => {
      battle.triggerBuffWhen(actor.id, 'turnEnd')
      // 两阶段删除：先 tick + mark expired，sweep 由 BattleContainer 在 emit('turn:end') 后统一调用
      battle.tickBuffDuration(actor.id)
    })
  },
}
