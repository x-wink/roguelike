# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

所有回复、文档、提交信息都使用中文。

## Commands

```bash
pnpm install          # 安装所有依赖（同时执行 prepare，配置 .githooks）
pnpm dev              # 启动游戏开发服务器（apps/game）
pnpm build            # 类型检查 + 生产构建
pnpm typecheck        # 全包类型检查
pnpm test             # 全包测试
pnpm lint             # oxlint 全局检查
pnpm format           # oxfmt 全局格式化
```

单包测试：

```bash
pnpm --filter @xwink/engine test
pnpm --filter @xwink/rpg test
pnpm --filter @apps/game test
```

## 架构

pnpm monorepo，三层依赖链：`@apps/game` → `@xwink/rpg` → `@xwink/engine`

```
packages/
  engine/   @xwink/engine  — 纯插件容器，零业务假设
  rpg/      @xwink/rpg     — 回合制 RPG 机制，依赖 engine 插件能力
apps/
  game/     @apps/game     — Vite + Vue 3 浏览器应用（PixiJS 渲染）
```

库包的 `main`/`types` 直接指向 `src/index.ts`，无构建步骤，bundler 直接解析源码。

### @xwink/engine — 插件容器

`EngineContainer` 本身不包含任何游戏逻辑，只提供：事件总线（`engine.on`/`engine.emit`）、缓冲队列、子容器挂载、暂停控制、错误边界、会话生命周期（`onSessionStart/End/Save/Restore`）。

**类型扩充约定**：插件通过 `declare module '@xwink/engine'` 向四个注册表注入类型：

```ts
Engine.Containers // 子容器（engine.get('unit') 等）
Engine.Events // 同步事件（战斗命中、击杀…）
Engine.Queue // 缓冲队列（日志、UI 通知…）
Engine.EntityProps // 实体属性（san、energy…）
```

### @xwink/rpg — RPG 机制层

以插件形式组合进 engine，提供：

| 插件                   | 职责                                      |
| ---------------------- | ----------------------------------------- |
| `UnitPlugin`           | 单位管理、属性体系（`Prop`）、`BuffPool`  |
| `TimelinePlugin`       | CTB 时间轴回合顺序                        |
| `BattlePlugin`         | 战斗生命周期、胜负判断                    |
| `EngineHandlersPlugin` | 内置战斗事件处理（伤害结算、buff 执行等） |

`Sandbox<D, S>` 包裹引擎，支持确定性重放：给定相同 seed 和输入，战斗结果可完整复现。

### @apps/game — 游戏应用层

#### 引擎组装（`game/battle.ts`）

`buildEngine()` 将上述四个 RPG 插件 + 业务插件 `SanPlugin` 注册进 `EngineContainer`，返回完整战斗引擎实例。`BattleSandbox`（`Sandbox<BattleData, EngineSession>`）由 store 持有，对 store 屏蔽引擎内部细节。

#### 业务插件（`game/plugins/`）

`SanPlugin` 是扩展插件的典型示例：通过 `declare module` 将 `san` 注入 `Engine.EntityProps`，订阅引擎事件实现零和转移与崩溃逻辑，同时向 rpg 描述系统注册 token，使通用渲染入口能识别 `san` 这一扩展属性。

#### 状态机（`store/game.ts`）

Pinia store 是唯一顶层状态机，持有 `phase: GamePhase`、`player: Player`、地图节点列表、战斗沙盒引用。`GamePhase` 驱动路由跳转——每个游戏阶段对应一个 Vue 路由视图：

```
home → /game/home（营地 + 地图入口）
battle / rest / event / shop / ... → 对应 /game/* 路由
story → /game/story（剧情演出）
result → /game/result（胜负结算）
```

持久化键：`crucible:store`（localStorage，当前格式版本 v5）。

#### 数据层（`game/data/`）

JSON 文件（`skills.json`、`enemies.json`、`relics.json` 等）由 `loader.ts` 在运行时做最低限度结构校验，字段缺失或类型错误立即抛出，禁止静默使用错误数据。校验后的常量（`SKILL_POOL`、`ENEMIES`、`RELICS` 等）从 `data/index.ts` 统一导出。

#### 渲染分层

- **PixiJS**（`pixi/app.ts`）：WebGL 画布，负责战斗动画、特效
- **Vue 3**（`#vue-ui` overlay）：所有 UI 界面，叠加在画布之上
- 两层通过 store/事件通信，互不直接操作对方

### App 技术栈

- **路径别名**：`@` → `src/`
- **自动导入**：`unplugin-auto-import`（vue、vue-router、pinia）；`unplugin-vue-components`（`src/ui/components/`）
- **图标**：`unplugin-icons` + Lucide 图标集（`~icons/lucide/*`）
- **样式**：Tailwind CSS v4

### Git 钩子

`.githooks/` 目录受版本控制，`pnpm install` 时自动激活（`prepare` 脚本）：

- `pre-commit`：对暂存文件运行 oxlint 检查 + oxfmt 格式化并重新 stage
- `commit-msg`：校验 Conventional Commits 格式（`type(scope): subject`）

---

## 架构原则

来自 `docs/roadmap.md`，所有开发决策应遵循：

**分层方向单向**：`UI → Store → Game → rpg → engine`，下层不感知上层。`@xwink/engine / @xwink/rpg` 是主体，`apps/game` 是验证其能力的业务层。

**跨层只传数据，不传实例**：层间通信只传 `Data` / `Snapshot` 类型对象；`UnitContainer` 是唯一的实例组装点，其他层不持有 `Unit` 实例。

**二层事件系统，不混用**：

- `engine.on/emit`：同步执行，用于战斗逻辑（buff 挂载、伤害计算）
- `engine.queue/consume`：缓冲，用于日志和 UI 更新

**BattleMode 热拔插**：战斗决策是可替换接口；`AutoBattleMode`（主线）和未来的 `ManualBattleMode` 通过同一接口接入，引擎不感知具体策略。

**确定性 RNG，按层分桶**：

- 战斗内 RNG：由 `BattlePlugin` 自治（战斗 seed，写入 sandbox 快照）
- session 编排层 RNG：节点变异 / 事件抽取 / 商店洗牌 / 遗物三选一，另起独立 Mulberry32 序列（session seed + 消耗 count 写入存档，恢复时空跑 count 步复现位置）
- 两条序列不混用

**Token 渲染边界**：逻辑层只暴露结构化 Token，不产出自然语言字符串；渲染层负责 Token → 文本转换。`@xwink/rpg` 的 `describe` 模块遵循此结构，新增描述文本对齐同一规范。

---

## 持久化约定

| key                 | 内容                                              | 当前格式版本   |
| ------------------- | ------------------------------------------------- | -------------- |
| `crucible:store`    | 游戏存档（phase、节点、战斗 sandbox、sessionRng） | v5             |
| `crucible:settings` | 设置（语言、BGM/音效音量、减少动效、战斗速度）    | 独立，容错加载 |

- 存档结构携带版本号；升级时就地迁移，迁移失败回退而非静默损坏
- 存档内容是状态快照，不包含可推导的中间计算结果
- 存档层是纯 I/O 边界，逻辑层不感知存储媒介

**减少动效**：通过 `html.reduced-motion` class 压制全局 `animation-duration` / `transition-duration`，组件无需逐一适配。

---

## i18n 约定

- UI 层通过 `i18n/useT()` 组合式函数获取翻译，locale 状态由 `store/settings.ts` 持有
- `i18n/zh.ts` 导出 `TKey` 作为全局 key 集合；`i18n/en.ts` 类型强制为 `Record<TKey, string>`，编译期确保不漏译
- 战斗描述通过 Token 渲染边界处理，与 UI 层 i18n 两层分工，不在组件内硬编码多语言分支

---

## 游戏内文本用语规则

渊是一个独立完整的世界，没有"出去 / 离开 / 出口"的空间概念。所有游戏内文本遵循：

| 不用                 | 改用                              |
| -------------------- | --------------------------------- |
| 离开 / 出去 / 出口   | 到顶 / 抵达天渊 / 升至中心        |
| 走进去 / 进来 / 走出 | 抵达 / 来到 / 站到面前 / 踏入门槛 |
| 走不掉 / 出不去      | 停不下 / 没停下来                 |
| 那扇门 / 最后那扇门  | 门槛（仅此一处）                  |

---

## 当前进度

**Phase 1（能玩）** 已完成：完整荒渊跑程、SAN 双失败路径、遗物/技能/商店节点、localStorage 存档（v5）、i18n 基础设施、设置系统。

**Phase 2（有世界）** 进行中：五层世界、随机地图生成、驻渊 NPC、装备系统等。详见 `docs/roadmap.md`。
