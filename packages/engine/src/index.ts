// 引擎容器与插件接口（纯插件容器，零游戏类型假设）
export * from './container'

// 通用实体基类与属性注册表扩充入口
export { Entity } from './core/entity'

// 确定性随机数生成器（Mulberry32，与游戏类型无关）
export { createRng, randomSeed } from './core/rng'
