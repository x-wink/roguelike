// core/entity — 引擎通用实体基类。
//
// props 是动态属性注册表：各游戏 / 插件通过
//   declare module '@xwink/engine' { namespace Engine { interface EntityProps { ... } } }
// 将自己的属性键注入到 Engine.EntityProps，与 Engine.Containers / Engine.Events 机制对称。
//
// Entity 本身不携带任何游戏类型假设；RPG 层（Unit）在此基础上扩充属性键。

import type { Engine } from '../container'

export class Entity {
  props: Engine.EntityProps = {} as Engine.EntityProps
}
