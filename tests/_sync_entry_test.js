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
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await ctx.addInitScript(() => { try { localStorage.setItem('wordblast_banner_v2','v3.0') } catch {} })
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)

  console.log('\n[1] 首页有同步入口')
  const body = await page.locator('body').innerText()
  ok(body.includes('跨设备同步'), '首页显示「跨设备同步」入口')
  ok(body.includes('家长区'), '首页显示「家长区」入口')
  ok(body.includes('学习报告'), '首页显示「学习报告」入口')
  ok(body.includes('即将上线'), '标注了「即将上线」状态')

  console.log('\n[2] 点同步 → 弹层内容')
  await page.getByRole('button', { name: /跨设备同步/ }).click()
  await page.waitForTimeout(600)
  const b2 = await page.locator('body').innerText()
  ok(b2.includes('邮箱') && b2.includes('验证码'), '说明邮箱验证码登录方式')
  ok(b2.includes('多设备') || b2.includes('共享'), '说明多设备共享')
  ok(b2.includes('不上传孩子的录音'), '说明录音不上传（隐私承诺）')
  ok(b2.includes('没登录也完全能用'), '说明降级不挡人（同步非前置）')
  await page.getByRole('button', { name: '知道了' }).click()
  await page.waitForTimeout(500)
  ok(!(await page.locator('body').innerText()).includes('验证码登录'), '弹层可关闭')

  console.log('\n[3] 家长区')
  await page.getByRole('button', { name: /家长区/ }).click()
  await page.waitForTimeout(600)
  const b3 = await page.locator('body').innerText()
  ok(b3.includes('学习报告') && b3.includes('证书'), '家长区说明含学习报告与证书')
  await page.getByRole('button', { name: '知道了' }).click()
  await page.waitForTimeout(400)

  console.log('\n[4] 学习报告')
  await page.getByRole('button', { name: /学习报告/ }).click()
  await page.waitForTimeout(600)
  const b4 = await page.locator('body').innerText()
  ok(b4.includes('练习时长') && b4.includes('反复出错'), '学习报告说明含时长与薄弱词')
  await page.getByRole('button', { name: '知道了' }).click()
  await page.waitForTimeout(400)

  console.log('\n[5] 底部提示写明现状')
  const b5 = await page.locator('body').innerText()
  ok(b5.includes('词库保存在当前设备上'), '明说词库当前只存本机')
  ok(b5.includes('跨设备同步即将上线'), '明说同步即将上线')

  console.log('\n页面错误：', errors.length ? errors.slice(0,2) : '无 ✅')
  console.log(fail === 0 ? '\n全部通过 ✅' : `\n${fail} 项失败 ❌`)
  await browser.close()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('异常:', e.message); process.exit(1) })
