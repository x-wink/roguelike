# 美术资源表

全局美术风格为**饥荒（Don't Starve）风格**——厚重手绘轮廓、黑褐底色、低饱和局部点缀、炭笔质感。详细规范见 `roadmap.md · 美术风格`。

---

## 场景背景

尺寸规格：**1280 × 720 px，PNG**（允许 JPG，无透明需求时）

| 资源 ID             | 描述             | 资源路径                                          | 使用场景          | 提示词                                                                                                    | 完成  |
| ------------------- | ---------------- | ------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------- | ----- |
| `bg_landing`        | 起始画面背景     | `public/assets/backgrounds/bg-landing.png`        | Landing 页        | 幽暗渊底俯视，黑褐石板地面带裂缝，零星橘红火星漂浮，无人物，深远感，Don't Starve 风格                     | `[ ]` |
| `bg_map_abyss`      | 荒渊地图背景     | `public/assets/backgrounds/bg-map-abyss.png`      | 地图节点选择界面  | 荒渊俯视构图，碎石与干裂地面，灰褐色调，隐约节点路径痕迹，无人，Don't Starve 风格                         | `[ ]` |
| `bg_battle_abyss`   | 荒渊战斗场景背景 | `public/assets/backgrounds/bg-battle-abyss.png`   | 战斗界面          | 荒渊废墟，破损墙壁为远景，地面碎石，昏暗侧光（烛火或渊光），无人物，留出前景战斗区空间，Don't Starve 风格 | `[ ]` |
| `bg_rest`           | 枢纽营地休息场景 | `public/assets/backgrounds/bg-rest.png`           | 休息节点界面      | 破损墙根角落，篝火余烬微弱橙光，地上有布卷和装备痕迹，温暖但衰败，Don't Starve 风格                       | `[ ]` |
| `bg_shop`           | 商店场景         | `public/assets/backgrounds/bg-shop.png`           | 商店界面          | 类营地但有货物陈列，木箱布袋堆叠，吊灯摇曳，昏黄光源，破旧商铺氛围，Don't Starve 风格                     | `[ ]` |
| `bg_result_victory` | 胜利结算画面     | `public/assets/backgrounds/bg-result-victory.png` | GameResult 胜利态 | 荒渊废墟远景，隐约光柱从裂缝透入，轻微尘埃飘落，压抑中有一丝突破感，Don't Starve 风格                     | `[ ]` |
| `bg_result_defeat`  | 失败结算画面     | `public/assets/backgrounds/bg-result-defeat.png`  | GameResult 失败态 | 荒渊废墟，画面更暗，地面有碎片痕迹和淡淡阴影残影，无光源，死寂氛围，Don't Starve 风格                     | `[ ]` |

---

## 角色形象

尺寸规格：**512 × 768 px，PNG（透明背景）**，全身立绘，留底部 1/5 作裁切余量

| 资源 ID           | 描述         | 资源路径                                       | 使用场景                 | 提示词                                                                                                      | 完成  |
| ----------------- | ------------ | ---------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- | ----- |
| `char_player`     | 玩家角色立绘 | `public/assets/characters/char-player.png`     | 营地顶部头像、战斗、结局 | 男性，瘦高身形，暗色破旧囚服带残旧束缚，面部阴影遮挡，站姿疲惫但警觉，全身立绘，透明背景，Don't Starve 风格 | `[ ]` |
| `char_ember`      | 余烬立绘     | `public/assets/characters/char-ember.png`      | 营地伴侣立绘、剧情对话   | 女性，精干体型，焦烬色短发，暗红旧战衣有磨损，站姿静默沉着微侧，全身立绘，透明背景，Don't Starve 风格       | `[ ]` |
| `char_shopkeeper` | 掌柜立绘     | `public/assets/characters/char-shopkeeper.png` | 驻渊商店                 | 性别模糊，身形矮胖，宽沿破帽遮脸，褴褛商人服装，双手交叠于腹前，全身立绘，透明背景，Don't Starve 风格       | `[ ]` |
| `char_stitcher`   | 缝合者立绘   | `public/assets/characters/char-stitcher.png`   | 驻渊服务节点             | 身形细长，双手纤细，白色破损绷带缠绕双臂，医师背景，手持弯针与线，全身立绘，透明背景，Don't Starve 风格     | `[ ]` |
| `char_recorder`   | 记录者立绘   | `public/assets/characters/char-recorder.png`   | 驻渊服务节点             | 佝偻老者，抱着厚重卷册，手指有墨迹，眼神锐利，记录者形象，全身立绘，透明背景，Don't Starve 风格             | `[ ]` |
| `char_mender`     | 修补者立绘   | `public/assets/characters/char-mender.png`     | 驻渊服务节点             | 粗壮体型，工匠装束，肩背工具包，腰间挂锤凿，表情寡言，全身立绘，透明背景，Don't Starve 风格                 | `[ ]` |

---

## 敌人形象

尺寸规格：**256 × 256 px，PNG（透明背景）**；Boss 类 **512 × 512 px**

| 资源 ID                | 描述               | 资源路径                                         | 使用场景       | 提示词                                                                                                      | 完成  |
| ---------------------- | ------------------ | ------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------- | ----- |
| `enemy_grunt`          | 普通敌人，荒渊杂兵 | `public/assets/enemies/enemy-grunt.png`          | 普通战斗节点   | 类人但严重扭曲的渊虫，骨架外露，低矮爬行姿态，空洞眼窝，手臂异常延长，透明背景，Don't Starve 风格           | `[ ]` |
| `enemy_boss_wasteland` | Boss，荒渊尽头     | `public/assets/enemies/enemy-boss-wasteland.png` | 荒渊 Boss 节点 | 大型渊虫 Boss，厚重几丁质甲壳，六肢伸展，体型压迫，头部有残存面孔痕迹，512×512，透明背景，Don't Starve 风格 | `[ ]` |
| `enemy_elite_warden`   | 精英敌人，壁渊守卫 | `public/assets/enemies/enemy-elite-warden.png`   | 壁渊精英节点   | 高大守卫型渊虫，石质甲壳，持残破长戟，面部结晶封存，气质沉滞，透明背景，Don't Starve 风格                   | `[ ]` |
| `enemy_boss_overseer`  | Boss，顶渊监察者   | `public/assets/enemies/enemy-boss-overseer.png`  | 顶渊 Boss 节点 | 球形悬浮 Boss，多眼分布，触手下垂，散发冷蓝光，体积庞大，512×512，透明背景，Don't Starve 风格               | `[ ]` |

---

## 地图节点图标

尺寸规格：**64 × 64 px，PNG（透明背景）**

| 资源 ID            | 描述             | 资源路径                                   | 使用场景 | 提示词                                                                     | 完成  |
| ------------------ | ---------------- | ------------------------------------------ | -------- | -------------------------------------------------------------------------- | ----- |
| `icon_node_battle` | 普通战斗节点图标 | `public/assets/icons/icon-node-battle.png` | 地图节点 | 交叉骨刀剪影，简洁符号感，暗红色调，64×64，Don't Starve 图标风格           | `[ ]` |
| `icon_node_boss`   | Boss 节点图标    | `public/assets/icons/icon-node-boss.png`   | 地图节点 | 骷髅或大眼符号，厚轮廓，警示感，深色背景轮廓，64×64，Don't Starve 图标风格 | `[ ]` |
| `icon_node_rest`   | 休息节点图标     | `public/assets/icons/icon-node-rest.png`   | 地图节点 | 篝火或营地符号，橙暖色点缀，圆形剪影，64×64，Don't Starve 图标风格         | `[ ]` |
| `icon_node_event`  | 事件节点图标     | `public/assets/icons/icon-node-event.png`  | 地图节点 | 问号或卷轴符号，灰蓝色调，探索感，64×64，Don't Starve 图标风格             | `[ ]` |
| `icon_node_shop`   | 商店节点图标     | `public/assets/icons/icon-node-shop.png`   | 地图节点 | 钱袋或秤砣符号，暗金色调，64×64，Don't Starve 图标风格                     | `[ ]` |
| `icon_node_elite`  | 精英节点图标     | `public/assets/icons/icon-node-elite.png`  | 地图节点 | 带冠骷髅或锁链符号，比普通战斗更压迫，64×64，Don't Starve 图标风格         | `[ ]` |

---

## 技能卡牌边框

尺寸规格：**128 × 128 px，PNG（透明背景）**；卡牌整体比例 2:3

| 资源 ID                     | 描述             | 资源路径                                         | 使用场景             | 提示词                                                        | 完成  |
| --------------------------- | ---------------- | ------------------------------------------------ | -------------------- | ------------------------------------------------------------- | ----- |
| `card_skill_frame_normal`   | 普通技能卡牌边框 | `public/assets/ui/card-skill-frame-normal.png`   | 技能选择、技能浏览器 | 暗色石板纹边框，粗轮廓线，无装饰，Don't Starve 风格           | `[ ]` |
| `card_skill_frame_ultimate` | 终结技卡牌边框   | `public/assets/ui/card-skill-frame-ultimate.png` | 技能选择、技能浏览器 | 暗金色边框，轻微浮雕纹理，比普通边框更厚重，Don't Starve 风格 | `[ ]` |
| `card_skill_frame_passive`  | 被动技能卡牌边框 | `public/assets/ui/card-skill-frame-passive.png`  | 技能选择、技能浏览器 | 灰蓝石纹边框，内嵌圆形区域，Don't Starve 风格                 | `[ ]` |

---

## 遗物

尺寸规格：遗物图标 **64 × 64 px，PNG（透明背景）**；边框 **160 × 200 px，PNG**

| 资源 ID                | 描述                           | 资源路径                                        | 使用场景       | 提示词                                                             | 完成  |
| ---------------------- | ------------------------------ | ----------------------------------------------- | -------------- | ------------------------------------------------------------------ | ----- |
| `card_relic_frame`     | 遗物卡牌通用边框               | `public/assets/ui/card-relic-frame.png`         | 遗物选择界面   | 破旧木框或石框，角落有钉痕，无装饰，Don't Starve 风格              | `[ ]` |
| `relic_iron_will`      | 铁意（最大生命 +20）图标       | `public/assets/relics/relic-iron-will.png`      | 遗物选择、图鉴 | 带裂纹的铁盾剪影，暗灰色调，64×64，Don't Starve 图标风格           | `[ ]` |
| `relic_calm_core`      | 冷核（最大理智 +20）图标       | `public/assets/relics/relic-calm-core.png`      | 遗物选择、图鉴 | 蓝白色结晶球，内有静止漩涡，64×64，Don't Starve 图标风格           | `[ ]` |
| `relic_blood_currency` | 血酬（胜利金币 +10）图标       | `public/assets/relics/relic-blood-currency.png` | 遗物选择、图鉴 | 滴血的金币剪影，暗红与金色，64×64，Don't Starve 图标风格           | `[ ]` |
| `relic_ancient_fang`   | 古牙（力量 +3）图标            | `public/assets/relics/relic-ancient-fang.png`   | 遗物选择、图鉴 | 弯曲古兽牙，带刻痕，骨白色调，64×64，Don't Starve 图标风格         | `[ ]` |
| `relic_ember_core`     | 烬核（气力 +20、生命 +10）图标 | `public/assets/relics/relic-ember-core.png`     | 遗物选择、图鉴 | 炽热余烬碎块，橘红内发光，表面黑炭，64×64，Don't Starve 图标风格   | `[ ]` |
| `relic_void_echo`      | 渊响（幸运 +3、金币 +20）图标  | `public/assets/relics/relic-void-echo.png`      | 遗物选择、图鉴 | 空心渊眼符号，幽暗蓝绿色，似乎在回响，64×64，Don't Starve 图标风格 | `[ ]` |

---

## 状态与属性图标

尺寸规格：**32 × 32 px，PNG（透明背景）**

| 资源 ID                | 描述             | 资源路径                                       | 使用场景             | 提示词                                                                            | 完成  |
| ---------------------- | ---------------- | ---------------------------------------------- | -------------------- | --------------------------------------------------------------------------------- | ----- |
| `icon_hp`              | 生命值图标       | `public/assets/icons/icon-hp.png`              | 单位状态栏、结局统计 | 暗红色心脏剪影，粗轮廓，略带裂纹感，32×32，Don't Starve 图标风格                  | `[ ]` |
| `icon_san`             | 理智值图标       | `public/assets/icons/icon-san.png`             | 单位状态栏           | 蓝白眼球符号，瞳孔漩涡状，32×32，Don't Starve 图标风格                            | `[ ]` |
| `icon_energy`          | 能量图标         | `public/assets/icons/icon-energy.png`          | 单位状态栏           | 闪电或火焰剪影，橘黄色调，32×32，Don't Starve 图标风格                            | `[ ]` |
| `icon_currency_common` | 通用货币图标     | `public/assets/icons/icon-currency-common.png` | 商店、战斗结算       | 带裂纹的六棱宝石，暗紫或暗金，32×32，Don't Starve 图标风格                        | `[ ]` |
| `icon_currency_rare`   | 稀有货币图标     | `public/assets/icons/icon-currency-rare.png`   | 成就结算             | 带裂缝的黑曜石碎片，内有渊光，32×32，Don't Starve 图标风格                        | `[ ]` |
| `icon_buff_*`          | 各 buff 状态图标 | `public/assets/icons/icon-buff-{buff_id}.png`  | 战斗界面 buff 栏     | 与 buff 效果语义对应的简洁符号，32×32，Don't Starve 图标风格（随 buffs 扩展补充） | `[ ]` |

---

## 特效

尺寸规格：spritesheet，**单帧 128 × 128 px，PNG（透明背景）**

| 资源 ID             | 描述             | 资源路径                                 | 使用场景 | 提示词                                                                          | 完成  |
| ------------------- | ---------------- | ---------------------------------------- | -------- | ------------------------------------------------------------------------------- | ----- |
| `fx_hit_normal`     | 普通攻击命中特效 | `public/assets/fx/fx-hit-normal.png`     | 战斗     | 白色冲击波 spritesheet，6~8 帧，简洁扩散后消散，Don't Starve 风格               | `[ ]` |
| `fx_hit_crit`       | 暴击命中特效     | `public/assets/fx/fx-hit-crit.png`       | 战斗     | 橙红爆裂 spritesheet，6~8 帧，比普通更大更亮，带火星飞溅，Don't Starve 风格     | `[ ]` |
| `fx_skill_ultimate` | 终结技释放特效   | `public/assets/fx/fx-skill-ultimate.png` | 战斗     | 暗红能量爆发 spritesheet，8~12 帧，向外扩散带余烬粒子，Don't Starve 风格        | `[ ]` |
| `fx_san_drain`      | SAN 耗尽特效     | `public/assets/fx/fx-san-drain.png`      | 战斗     | 蓝白漩涡向内收缩 spritesheet，6~8 帧，眼球符号短暂浮现后消散，Don't Starve 风格 | `[ ]` |

---

## 音频

| 资源 ID                | 描述             | 资源路径                                   | 使用场景          | 提示词                                                                           | 完成  |
| ---------------------- | ---------------- | ------------------------------------------ | ----------------- | -------------------------------------------------------------------------------- | ----- |
| `bgm_landing`          | Landing 页氛围音 | `public/assets/audio/bgm/bgm-landing.ogg`  | Landing 页        | dark ambient, dungeon, slow drone, no melody, oppressive atmosphere, loopable    | `[ ]` |
| `bgm_battle_wasteland` | 荒渊战斗背景音乐 | `public/assets/audio/bgm/bgm-battle.ogg`   | 战斗界面          | dark battle theme, percussion-driven, tense rhythm, fantasy RPG, loopable        | `[ ]` |
| `sfx_hit`              | 普通攻击命中音效 | `public/assets/audio/sfx/sfx-hit.wav`      | 战斗              | short sword swing impact, dry hit, no reverb, under 0.5s                         | `[ ]` |
| `sfx_skill_ultimate`   | 终结技释放音效   | `public/assets/audio/sfx/sfx-ultimate.wav` | 战斗              | dark magic spell release, low rumble + sharp crack, ominous, under 1s            | `[ ]` |
| `sfx_result_victory`   | 胜利结算音效     | `public/assets/audio/sfx/sfx-victory.wav`  | GameResult 胜利态 | short victory fanfare, brass stab, muted celebration, bittersweet tone, under 3s | `[ ]` |
| `sfx_result_defeat`    | 失败结算音效     | `public/assets/audio/sfx/sfx-defeat.wav`   | GameResult 失败态 | somber defeat sting, low tone fade, no reverb tail, under 2s                     | `[ ]` |

---

## Logo 与品牌

| 资源 ID     | 描述                    | 资源路径                            | 使用场景            | 提示词                                                                              | 完成  |
| ----------- | ----------------------- | ----------------------------------- | ------------------- | ----------------------------------------------------------------------------------- | ----- |
| `logo_main` | 游戏主 Logo，中英文组合 | `public/assets/brand/logo-main.png` | Landing、Steam 页面 | 「囚烬日记 / Crucible」竖排中文+横排英文，炭烬质感，暗红火星点缀，Don't Starve 风格 | `[ ]` |
| `icon_app`  | 应用图标                | `public/assets/brand/icon-app.png`  | Tauri 打包、Steam   | 余烬碎块剪影，橘红底色，方形裁切，适配 512×512 图标规格，Don't Starve 风格          | `[ ]` |
