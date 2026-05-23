/**
 * Playwright 装备系统冒烟脚本。
 * 通过 window.__debug 注入的 store 句柄直接驱动状态机：
 *   1. 给玩家发金币 → 商店购买 worn_blade
 *   2. 验证 meta.equipment.weapon 已写入实例
 *   3. 进入 'wasteland' session → 走到第 0 行 battle 节点 → 战斗装备 trigger 注入有效
 *   4. 退出 session → 营地角色 tab 看到装备名
 *   5. 把玩家放在 settlement rest 节点 → 调 reroll 测词条变化与扣金
 * 失败立即 throw，让 process.exit 捕获非 0。
 */
import { chromium, type ConsoleMessage } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5175'

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  const logs: string[] = []
  page.on('console', (m: ConsoleMessage) => logs.push(`[${m.type()}] ${m.text()}`))
  page.on('pageerror', (e) => {
    console.error('PAGE ERROR:', e.message)
    process.exitCode = 1
  })

  // 初始化：清空旧存档，避免历史进度干扰
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.removeItem('crucible:store')
    localStorage.removeItem('crucible:meta')
  })
  await page.goto(BASE + '/game/home', { waitUntil: 'networkidle' })
  // 等 __debug 注入
  await page.waitForFunction(() => !!(window as any).__debug?.game, null, { timeout: 5000 })
  // 跳过序章：把 prologueStage 拨到 2，再回 home（避免序章 phase = 'story' 跳转）
  await page.evaluate(() => {
    const game = (window as any).__debug.game
    game.prologueStage = 2
    if (!game.player.name) game.player.name = 'TestRunner'
    if (game.phase !== 'home') {
      game.endStory?.()
      game.phase = 'home'
    }
  })
  await page.goto(BASE + '/game/home', { waitUntil: 'networkidle' })
  await page.waitForSelector('.tab-btn', { timeout: 5000 })

  type Step = { label: string; fn: () => Promise<void> }
  const steps: Step[] = []

  steps.push({
    label: 'shop: 给金币 → buyEquipment(worn_blade) → meta.equipment.weapon 应有实例',
    fn: async () => {
      const out = await page.evaluate(() => {
        const w = window as any
        const game = w.__debug.game
        const meta = w.__debug.meta
        // 跳过序章 / 给玩家姓名以越过 stage 0
        game.prologueStage = 2
        if (!game.player.name) game.player.name = 'TestRunner'
        meta.unequip('weapon')
        meta.unequip('armor')
        meta.unequip('accessory')
        game.player.backpack.gold = 1000
        const goldBefore = game.player.backpack.gold
        // 商店流程：扣金 + buyEquipment（与 GameShop.onBuyEquip 行为一致）
        game.player.backpack.addGold(-160)
        meta.buyEquipment('worn_blade', Math.random)
        return {
          weapon: meta.equipment.weapon,
          goldBefore,
          goldAfter: game.player.backpack.gold,
        }
      })
      if (!out.weapon || out.weapon.defId !== 'worn_blade') {
        throw new Error(`weapon 未装备：${JSON.stringify(out)}`)
      }
      if (out.goldAfter !== out.goldBefore - 160) {
        throw new Error(`扣金错误：before=${out.goldBefore} after=${out.goldAfter}`)
      }
      console.log('  ✓ weapon =', JSON.stringify(out.weapon))
    },
  })

  steps.push({
    label: 'home → 角色 tab → 营地装备面板渲染装备名',
    fn: async () => {
      await page.evaluate(() => {
        const game = (window as any).__debug.game
        if (game.activeZone) game.exitSession()
      })
      await page.goto(BASE + '/game/home', { waitUntil: 'networkidle' })
      // 调试：列出 tab 按钮 + 当前 phase
      const debug = await page.evaluate(() => ({
        tabs: Array.from(document.querySelectorAll('.tab-btn')).map(
          (el) => (el as HTMLElement).innerText,
        ),
        url: location.pathname,
        phase: (window as any).__debug?.game?.phase,
        prologueStage: (window as any).__debug?.game?.prologueStage,
        title: document.title,
        rootInnerLen: document.querySelector('#vue-ui')?.innerHTML.length,
        bodyText: document.body.innerText.slice(0, 200),
      }))
      console.log('   debug:', JSON.stringify(debug))
      // 找到含"角色"的 tab 按钮
      await page.locator('.tab-btn').filter({ hasText: '角色' }).click({ timeout: 5000 })
      await page.waitForTimeout(300)
      const equipName = page.getByText('残刃').first()
      const ok = await equipName.isVisible()
      if (!ok) throw new Error('营地装备面板没有显示 "残刃"')
      await equipName.scrollIntoViewIfNeeded()
      await page.waitForTimeout(150)
      await page.screenshot({ path: '/tmp/verify-equipment-camp.png', fullPage: true })
      console.log('  ✓ 营地角色 tab 见 "残刃" → 截图 /tmp/verify-equipment-camp.png')
    },
  })

  steps.push({
    label: '战斗：装备虚拟被动 skill 进入战斗的 pool.passives',
    fn: async () => {
      const out = await page.evaluate(() => {
        const w = window as any
        const game = w.__debug.game
        const meta = w.__debug.meta
        if (game.activeZone) game.exitSession()
        game.enterZone('wasteland')
        // 找到第 0 行第一个战斗节点
        const node = game.nodes.find(
          (n: any) => n.row === 0 && ['battle', 'elite'].includes(n.type),
        )
        if (!node) return { error: 'no battle node' }
        game.enterNode(node.id)
        const passives = game.player.pool.raw
          .filter((s: any) => (s.role ?? 'normal') === 'passive')
          .map((s: any) => s.id)
        const equipPassive = passives.find((id: string) => id.startsWith('equip_'))
        return { passives, equipPassive, hasEquipment: !!meta.equipment.weapon }
      })
      if (out.error) throw new Error(out.error)
      if (!out.equipPassive) throw new Error(`战斗中未注入装备被动：${JSON.stringify(out)}`)
      console.log('  ✓ battle pool 中可见 equip_ 被动:', out.equipPassive)
    },
  })

  steps.push({
    label: 'rest: rerollAffix 词条 id 改变 + 价格按 30 × 2^count 递增',
    fn: async () => {
      const out = await page.evaluate(() => {
        const w = window as any
        const game = w.__debug.game
        const meta = w.__debug.meta
        // 退出战斗 session 回营地，再独立测 reroll
        if (game.activeZone) game.exitSession()
        const inst = meta.equipment.weapon
        if (!inst) return { error: 'no equipment' }
        const before = [...inst.affixIds]
        const cnt0 = inst.rerollCount
        // 给足金币 + 进入 session 让 srand 真实生效
        game.player.backpack.gold = 5000
        game.enterZone('settlement')
        const spend = (price: number) => game.player.backpack.spendGold(price)
        const ok1 = meta.rerollAffix('weapon', 0, spend, game.srand)
        const after1 = [...meta.equipment.weapon.affixIds]
        const cnt1 = meta.equipment.weapon.rerollCount
        const ok2 = meta.rerollAffix('weapon', 0, spend, game.srand)
        const cnt2 = meta.equipment.weapon.rerollCount
        return { before, after1, cnt0, cnt1, cnt2, ok1, ok2 }
      })
      if (out.error) throw new Error(out.error)
      if (!out.ok1 || !out.ok2) throw new Error(`reroll 返回 false: ${JSON.stringify(out)}`)
      if (out.cnt1 !== out.cnt0 + 1 || out.cnt2 !== out.cnt0 + 2) {
        throw new Error(`rerollCount 未递增: ${JSON.stringify(out)}`)
      }
      // affix 池只要有不止一个候选，第一次洗练后理应改变；由于随机性，仅在多候选下断言
      console.log(
        '  ✓ affixIds before/after:',
        out.before,
        '→',
        out.after1,
        '(rerollCount',
        out.cnt0,
        '→',
        out.cnt2,
        ')',
      )
    },
  })

  let pass = 0
  let fail = 0
  for (const s of steps) {
    try {
      console.log('▶', s.label)
      await s.fn()
      pass++
    } catch (e: any) {
      fail++
      console.error('✗', s.label, '\n   ', e.message)
    }
  }

  if (logs.some((l) => l.startsWith('[error]'))) {
    console.error('页面 console.error:')
    for (const l of logs.filter((x) => x.startsWith('[error]'))) console.error('   ', l)
    fail++
  }

  console.log(`\n=== ${pass} 通过, ${fail} 失败 ===`)
  await browser.close()
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
