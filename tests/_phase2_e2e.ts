// 二期第一批真实浏览器验证（Playwright）：对话模块 + 勋章墙 + 金色大满贯证书
function loadPlaywright() {
  const candidates = [
    'playwright',
    process.env.PLAYWRIGHT_PATH,
    'C:/Users/86139/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright',
  ].filter(Boolean)
  for (const c of candidates) {
    try { return require(c) } catch { /* next */ }
  }
  throw new Error('playwright 未找到：设 PLAYWRIGHT_PATH')
}
const CHROME = process.env.CHROME_PATH || 'C:/Users/86139/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe'
const { chromium } = loadPlaywright()
const BASE = 'http://127.0.0.1:5173/'

let fail = 0
const ok = (c: unknown, label: string) => {
  if (c) console.log('  ✅', label)
  else { fail++; console.log('  ❌', label) }
}

;(async () => {
  const browser = await chromium.launch({ executablePath: CHROME })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await ctx.addInitScript(() => {
    try { localStorage.setItem('wordblast_banner_v2', 'v3.2') } catch {}
  })
  const errors: string[] = []
  // 只收应用自身报错：Cloudflare RUM / 第三方资源在 localhost 下的 CORS 噪音不算回归
  const externalNoise = (s: string) => s.includes('cloudflareinsights.com') || s.includes('net::ERR_FAILED')
  page.on('pageerror', e => { if (!externalNoise(e.message)) errors.push('pageerror: ' + e.message) })
  page.on('console', m => {
    if (m.type() === 'error' && !externalNoise(m.text())) errors.push('console: ' + m.text())
  })

  console.log('\n[1] 首页：三卡全亮 + 勋章墙')
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  const home = await page.locator('body').innerText()
  ok(home.includes('闯关练习') && home.includes('跟读练习') && home.includes('对话练习'), '三张模块卡都在')
  ok(home.includes('一问一答'), '对话卡副标题是「一问一答」')
  ok(home.includes('三枚勋章全亮'), '首页显示勋章/大满贯提示')
  ok((await page.locator('[aria-disabled="true"]').count()) === 0, '没有置灰的模块卡')
  ok(home.includes('v3.2'), '首页版本号 v3.2')

  console.log('\n[2] 对话模块：听 → 答 → 参考答案 → 返回')
  await page.getByText('对话练习').first().click()
  await page.waitForTimeout(700)
  const dlg = await page.locator('body').innerText()
  ok(dlg.includes('💬 对话练习'), '进入对话模块')
  ok(dlg.includes('Emma 说') && dlg.includes('轮到我说'), '两个对话回合都在')
  ok(dlg.includes('Unit'), '显示教材单元情景')
  ok(dlg.includes('🐢 慢速') && dlg.includes('听一遍'), 'Emma 正常/慢速播放按钮在')
  await page.getByText('💡 想不起来？看参考答案').click()
  await page.waitForTimeout(200)
  const shown = await page.locator('body').innerText()
  ok(shown.includes('听 Emma 示范'), '参考答案可展开且能播 Emma 示范')
  ok(shown.includes('录音') || shown.includes('🎤'), '麦克风入口在')
  await page.getByLabel('退出对话').click()
  await page.waitForTimeout(400)
  ok((await page.locator('body').innerText()).includes('闯关练习'), '退出回首页')

  console.log('\n[3] 演示模式：三枚勋章 + 金色大满贯证书')
  await page.goto(BASE + '?grand', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  const demoHome = await page.locator('body').innerText()
  ok(demoHome.includes('已解锁金色大满贯证书'), '三枚勋章全亮提示')
  ok(demoHome.includes('演示：查看大满贯证书'), 'dev 演示按钮存在')
  const locks = await page.getByText('🔒').count()
  ok(locks === 0, '没有未点亮的锁勋章')
  await page.getByText('演示：查看大满贯证书').click()
  await page.waitForTimeout(1800)
  const cert = await page.locator('body').innerText()
  ok(cert.includes('大满贯证书'), '显示大满贯证书标题')
  ok(cert.includes('三模块全达成'), '写明三模块全达成')
  ok(cert.includes('闯关') && cert.includes('跟读') && cert.includes('对话'), '三模块成绩摘要在')
  await page.getByText('🏠 回首页').click()
  await page.waitForTimeout(300)
  ok((await page.locator('body').innerText()).includes('闯关练习'), '证书可回首页')

  console.log('\n[4] 应用自身无报错（外部 RUM 的 CORS 噪音已排除）')
  ok(errors.length === 0, '无页面错误 / 应用 console error：' + (errors.slice(0, 2).join(' | ') || '无'))

  console.log(fail === 0 ? '\n二期 E2E 全部通过 ✅' : `\n${fail} 项失败 ❌`)
  await browser.close()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('异常:', e.message); process.exit(1) })
