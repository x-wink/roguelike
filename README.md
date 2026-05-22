# 囚烬日记 · Crucible

叙事驱动的 Roguelike 回合制 RPG。每局随机跑程，死亡重置局内一切；跨局积累记忆碎片，拼凑真相，走向五条不同的终路。

---

## 快速开始

```bash
pnpm install   # 安装依赖，同时配置 git 钩子
pnpm dev       # 启动开发服务器
```

> 需要 Node.js ≥ 20 和 pnpm ≥ 9。

## 项目结构

```
packages/
  engine/   @xwink/engine  — 自研插件容器引擎
  rpg/      @xwink/rpg     — 回合制 RPG 机制层
apps/
  game/     @apps/game     — Vite + Vue 3 浏览器应用
docs/
  roadmap.md        开发路线图与架构原则
  worldbuilding.md  世界观、NPC、记忆系统、遗物、剧情骨架
  storyline.md      剧情演出脚本（七幕对白与触发节点）
  assets.md         美术资源表（路径、使用场景、提示词）
```

## 常用命令

```bash
pnpm build        # 类型检查 + 生产构建
pnpm typecheck    # 全包类型检查
pnpm test         # 全包测试
pnpm lint         # oxlint 检查
pnpm format       # oxfmt 格式化
```

## 技术栈

| 层       | 技术                       |
| -------- | -------------------------- |
| 语言     | TypeScript                 |
| 前端框架 | Vue 3 + Pinia + Vue Router |
| 构建     | Vite                       |
| 游戏引擎 | @xwink/engine（自研）      |
| RPG 机制 | @xwink/rpg（自研）         |
| 测试     | Vitest                     |
| 包管理   | pnpm workspace             |

## 许可证

本项目仅供个人学习使用，不可用于任何商业目的。详见 [LICENSE](./LICENSE)。
