// L5 文案层验证（Playwright）
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
const ok = (c, l, e = '') => { if (c) console.log('  ✅', l); else { fail++; console.log('  ❌', l, e) } }
;(async () => {
  const browser = await chromium.launch({ executablePath: CHROME })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  const btnCount = await page.getByText('知道了').count()
  const bannerKey = await page.evaluate(() => localStorage.getItem('wordblast_banner_v2'))
  console.log('  [debug] 知道了按钮数:', btnCount, '| banner key:', bannerKey)
  if (!btnCount) {
    const dump = await page.locator('body').innerText()
    console.log('  [debug] 页面文本前 260 字:', JSON.stringify(dump.slice(0, 260)))
  }

  const bannerText = btnCount > 0 ? await page.locator('body').innerText() : ''
  ok(bannerText.includes('v3.2'), '版本弹窗显示 v3.2')
  ok(bannerText.includes('跟读练习'), '弹窗含跟读练习说明')
  ok(bannerText.includes('老成绩全部保留'), '弹窗含成绩保留说明')

  if (btnCount) {
    await page.getByText('知道了').click()
    await page.waitForTimeout(600)
    ok(await page.getByText('知道了').count() === 0, '弹窗可关闭')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    ok(await page.getByText('知道了').count() === 0, '确认后不再弹')
  }

  await page.getByLabel('使用说明').click()
  await page.waitForTimeout(900)
  const guide = await page.locator('body').innerText()
  ok(guide.includes('跟读练习'), '说明页含「跟读练习」章节')
  ok(guide.includes('对话练习'), '说明页含「对话练习」章节')
  ok(guide.includes('下载模板'), '说明页含导入模板说明')
  ok(guide.includes('发音说明'), '说明页含发音说明')
  ok(guide.includes('口语分独立记账'), '说明页写明口语分独立记账')
  ok(guide.includes('不保存'), '说明页写明录音不上传')
  ok(guide.includes('闯关分 + 口语分'), '说明页称号口径更新')
  ok(guide.includes('单词关'), '说明页写明单词关/运用关结构')
  ok(guide.includes('v3.2'), '说明页版本号 v3.2')
  ok(guide.includes('金色大满贯证书'), '说明页写明大满贯证书')
  ok(guide.includes('女声 Emma'), '说明页写明 Emma 音色')

  console.log('\n页面错误：', errors.length ? errors.slice(0, 3) : '无 ✅')
  console.log(fail === 0 ? '\nL5 全部通过 ✅' : `\n${fail} 项失败 ❌`)
  await browser.close()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('异常:', e.message); process.exit(1) })
