// L1-L4 真实浏览器验证（Playwright）
// playwright 加载：本地优先 → 环境变量 → npx 缓存兜底
function loadPlaywright() {
  const candidates = [
    'playwright',
    process.env.PLAYWRIGHT_PATH,
    'C:/Users/86139/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright',
  ].filter(Boolean)
  for (const c of candidates) {
    try { return require(c) } catch { /* try next */ }
  }
  throw new Error('playwright 未找到：npm i -D playwright 或设 PLAYWRIGHT_PATH')
}
// 已装的 chromium 版本可能与 playwright 版本不匹配，显式指定可执行文件
const CHROME = process.env.CHROME_PATH || 'C:/Users/86139/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe'
const { chromium } = loadPlaywright()

const BASE = 'http://127.0.0.1:5173/'
let fail = 0
const ok = (c, label, extra = '') => {
  if (c) console.log('  ✅', label)
  else { fail++; console.log('  ❌', label, extra) }
}

;(async () => {
  const browser = await chromium.launch({ executablePath: CHROME })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  // 跳过首次启动的版本更新弹窗（它 z-[300] 挡住点击；v3.0 文案在 L5 处理）
  await ctx.addInitScript(() => {
    try { localStorage.setItem('wordblast_banner_v2', 'v3.1') } catch {}
  })
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

  // ── 1. 首屏 = 首页三卡片 ──
  console.log('\n[1] 首页三卡片')
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.removeItem('wordblast_save_v1')
    localStorage.removeItem('wordblast_custom_v1')
    localStorage.removeItem('wordblast_spoken_v1')
    localStorage.removeItem('wordblast_spoken_score_v1')
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  ok(await page.getByText('闯关练习', { exact: false }).count() > 0, '闯关卡片存在')
  ok(await page.getByText('跟读练习', { exact: false }).count() > 0, '跟读卡片存在')
  ok(await page.getByText('对话练习', { exact: false }).count() > 0, '对话卡片存在')
  ok(await page.getByText('即将上线').count() > 0, '对话卡带「即将上线」徽标')
  ok(await page.getByText('下载模板').count() > 0, '导入行有「下载模板」')
  ok(await page.getByText('导入课本单词').count() > 0, '导入行有「导入课本单词」')

  // 对话卡置灰且点击无效
  const dlg = page.locator('[aria-disabled="true"]')
  ok(await dlg.count() > 0, '对话卡 aria-disabled')
  const before = await page.getByText('闯关练习').count()
  await dlg.first().click({ force: true }).catch(() => {})
  await page.waitForTimeout(500)
  ok(await page.getByText('闯关练习').count() === before, '点对话卡不跳转')

  // ── 2. 进闯关 → 画布渲染（最高回归风险点）──
  console.log('\n[2] 闯关画布不空白')
  await page.getByText('闯关练习').first().click()
  await page.waitForTimeout(1500)
  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return { found: false }
    const ctx = c.getContext('2d')
    const data = ctx.getImageData(0, 0, c.width, c.height).data
    let nonEmpty = 0
    for (let i = 3; i < data.length; i += 400) if (data[i] > 0) nonEmpty++
    return { found: true, w: c.width, h: c.height, nonEmpty }
  })
  ok(canvasInfo.found, 'canvas 已挂载')
  ok(canvasInfo.nonEmpty > 0, 'canvas 有绘制内容（非空白）', JSON.stringify(canvasInfo))

  // ── 3. 回首页 + 进度保留 ──
  console.log('\n[3] 回首页与进度')
  const homeBtn = page.getByLabel('返回首页')
  ok(await homeBtn.count() > 0, 'ScoreBoard 有 🏠 回首页')
  await homeBtn.first().click()
  await page.waitForTimeout(800)
  ok(await page.getByText('闯关练习').count() > 0, '已回首页')

  // ── 4. 跟读模块 ──
  console.log('\n[4] 跟读模块')
  await page.getByText('跟读练习').first().click()
  await page.waitForTimeout(1200)
  ok(await page.getByText('跟读练习').count() > 0, '跟读模块渲染')
  ok(await page.getByText('标准音').count() > 0, '有标准音按钮')
  ok(await page.getByText('慢速').count() > 0, '有慢速按钮')
  const mic = page.getByLabel('录音')
  ok(await mic.count() > 0, '有录音按钮')
  await page.getByLabel('返回首页').first().click().catch(() => {})
  await page.waitForTimeout(600)

  // ── 5. 老存档迁移（13 关 → 12 关）──
  console.log('\n[5] 13 关老存档迁移')
  await page.evaluate(() => {
    localStorage.setItem('wordblast_save_v1', JSON.stringify({
      phase: 'playing', levelIndex: 12, subsectionIndex: 0, totalScore: 4200, combo: 0,
      levelResults: Array.from({ length: 13 }, (_, i) => ({ stars: (i % 3) + 1, accuracy: 60 + i, score: 100 * (i + 1) })),
      subsectionScore: 0, subsectionCorrect: 0, subsectionAttempts: 0,
    }))
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('wordblast_save_v1') || '{}'))
  ok(saved.version === 2, '存档 version=2', JSON.stringify(saved.version))
  ok(Array.isArray(saved.levelResults) && saved.levelResults.length === 12, 'levelResults 长度 12', String(saved.levelResults?.length))
  ok(saved.levelIndex === 11, 'levelIndex 12→11', String(saved.levelIndex))
  ok(saved.totalScore === 4200, '闯关分保留')
  ok(await page.getByText('继续闯关').count() > 0, '首页显示「继续闯关」')

  // ── 6. 口语分独立记账 ──
  console.log('\n[6] 口语分独立记账')
  await page.evaluate(() => {
    localStorage.setItem('wordblast_spoken_score_v1', JSON.stringify({ score: 120, mastered: 2, reviewed: 0, updatedAt: Date.now() }))
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  ok(await page.getByText('口语分').count() > 0, '首页展示口语分')
  const titleShown = await page.getByText(/英语小苗|英语小树|英语学霸|单词大王/).count()
  ok(titleShown > 0, '首页展示称号（闯关分+口语分）')

  console.log('\n控制台错误：', errors.length ? errors.slice(0, 5) : '无 ✅')
  console.log(fail === 0 ? '\n全部通过 ✅' : `\n${fail} 项失败 ❌`)
  await browser.close()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('运行异常:', e.message); process.exit(1) })
