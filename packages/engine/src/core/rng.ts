// core/rng — 可种子化伪随机数生成器（Mulberry32）。
// 引擎所有"随机"判定均通过此 PRNG，相同种子 → 相同序列，构成确定性回放（C07）的基石。

/** 创建一个种子化 PRNG 函数；返回值范围 [0, 1)。 */
export function createRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 默认种子源：Date.now() ^ Math.random()*2^32，避免相同时刻多个战斗共用种子。 */
export function randomSeed(): number {
  return ((Date.now() & 0xffffffff) ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
}
