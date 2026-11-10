/* _sync_entry_test.ts — 三个功能区入口（真实面板）回归 */
function loadPlaywright() {
  for (const c of ['playwright', process.env.PLAYWRIGHT_PATH,
    'C:/Users/86139/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright']) {
    try { return require(c) } catch {}
  }
  throw new Error('no playwright')
}
const CHROME = process.env.CHROME_PATH || 'C:/Users/86139/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe'
const { chromium } = loadPlaywright()
const BASE = 'http://127.0.0.1:5173/'
let fail = 0
const ok = (c, l, e = '') => { if (c) console.log('  ✅', l); else { fail++; console.log('  ❌', l, e) } }

;(async () => {
  const browser = await chromium.launch({ executablePath: CHROME })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => { try { localStorage.setItem('wordblast_banner_v2', 'v3.3') } catch {} })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  // 配置探测给个离线可用的响应，避免 dev 下转发到未启动的 8788
  await page.route('**/sync-api/*', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, mailEnabled: false, devMode: false, maxBytes: 262144, tokenDays: 30 }),
    })
  })
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)

  console.log('\n[1] 首页三个功能区入口')
  const home = await page.locator('body').innerText()
  ok(home.includes('跨设备同步'), '首页显示「跨设备同步」入口')
  ok(home.includes('家长区'), '首页显示「家长区」入口')
  ok(home.includes('学习报告'), '首页显示「学习报告」入口')
  ok(!home.includes('即将上线'), '不再有「即将上线」占位')
  ok(home.includes('本机离线可用'), '底部写明本机离线可用')
  ok(home.includes('v3.3'), '首页版本号 v3.3')

  console.log('\n[2] 同步面板是真实功能，不是说明占位')
  await page.getByRole('button', { name: /跨设备同步/ }).click()
  await page.waitForTimeout(500)
  const sync = await page.locator('body').innerText()
  ok(sync.includes('创建同步空间'), '可创建同步空间')
  ok(sync.includes('加入同步空间'), '可用同步码加入')
  ok(sync.includes('不上传孩子的录音'), '隐私承诺保留')
  ok(sync.includes('没登录') || sync.includes('断网'), '说明降级不挡人')
  ok(!sync.includes('正在做'), '不再写「正在做」')
  await page.getByRole('button', { name: '关闭' }).click()
  await page.waitForTimeout(300)
  ok(!(await page.locator('body').innerText()).includes('创建同步空间'), '面板可关闭')

  console.log('\n[3] 家长区')
  await page.getByRole('button', { name: /家长区/ }).click()
  await page.waitForTimeout(400)
  const parent = await page.locator('body').innerText()
  ok(parent.includes('本机数据概览') && parent.includes('已完成'), '显示真实本机数据')
  ok(parent.includes('课本单词') && parent.includes('学习报告'), '含词库管理与学习报告入口')
  ok(parent.includes('导出学习数据'), '含导出学习数据')
  await page.getByRole('button', { name: '关闭' }).click()
  await page.waitForTimeout(300)

  console.log('\n[4] 学习报告')
  await page.getByRole('button', { name: /学习报告/ }).click()
  await page.waitForTimeout(400)
  const report = await page.locator('body').innerText()
  ok(report.includes('闯关练习') && report.includes('跟读练习') && report.includes('对话练习'), '三模块完成度')
  ok(report.includes('近 7 天练习'), '近 7 天活跃统计')
  ok(report.includes('需要重点复习的关卡'), '薄弱关卡清单')
  ok(report.includes('称号'), '称号进度')
  ok(report.includes('暂无') || report.includes('没有'), '无数据时如实说明，不编造')
  await page.getByRole('button', { name: '关闭' }).click()
  await page.waitForTimeout(300)

  console.log('\n页面错误：', errors.length ? errors.slice(0, 2) : '无 ✅')
  if (errors.length) fail++
  console.log(fail === 0 ? '\n全部通过 ✅' : `\n${fail} 项失败 ❌`)
  await browser.close()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('异常:', e.message); process.exit(1) })
