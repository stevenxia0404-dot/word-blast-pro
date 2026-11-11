/* _devmarks_e2e.ts — dev-frame 标注「标完自动送达」通道（真实浏览器） */
function loadPlaywright() {
  for (const c of ['playwright', process.env.PLAYWRIGHT_PATH,
    'C:/Users/86139/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright']) {
    try { return require(c) } catch {}
  }
  throw new Error('no playwright')
}
const CHROME = process.env.CHROME_PATH || 'C:/Users/86139/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe'
const { chromium } = loadPlaywright()
const fs = require('fs')
const path = require('path')
const SNAP = path.resolve(__dirname, '../.workbuddy/marks.json')
const BASE = 'http://127.0.0.1:5173/'
let fail = 0
const ok = (c: any, l: string, e = '') => {
  if (c) console.log('  ✅', l)
  else { fail++; console.log('  ❌', l, e) }
}

;(async () => {
  try { fs.writeFileSync(SNAP, JSON.stringify({ count: 0, marks: [] }), 'utf8') } catch {}
  const browser = await chromium.launch({ executablePath: CHROME })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  // 欢迎弹窗会挡住点击；addInitScript 对 iframe 同样生效
  await ctx.addInitScript(() => {
    try { localStorage.setItem('wordblast_banner_v2', 'v3.4') } catch {}
  })
  const page = await ctx.newPage()
  const errs: string[] = []
  page.on('pageerror', e => errs.push(String(e)))

  await page.goto(BASE + 'dev-frame.html', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1800)
  const f = page.frames().find(x => x.url().startsWith(BASE) && !x.url().includes('dev-frame'))
  ok(!!f, 'dev-frame 里的应用 iframe 已加载')
  if (!f) { await browser.close(); process.exit(1) }

  // 开标注模式（画布通过 postMessage 控制 iframe 里的 Inspector）
  await f.evaluate(() => window.postMessage({ type: 'dev:toggle-inspector' }, '*'))
  await page.waitForTimeout(350)

  const target = f.locator('[data-testid="sync-status"]').first()
  ok(await target.count() > 0, '首页左下角同步指示器可点')
  await target.click()
  await page.waitForTimeout(1600)

  const n = await f.evaluate(() => ((window as any).__marks || []).length)
  ok(n >= 1, '点一下就产生了标注，数量=' + n)

  const snap = JSON.parse(fs.readFileSync(SNAP, 'utf8'))
  ok(snap.count >= 1, '标注自动写入本机快照（无需复制粘贴），count=' + snap.count)
  const m = snap.marks[0] || {}
  ok(typeof m.selector === 'string' && m.selector.length > 0 && m.rect && typeof m.rect.w === 'number',
     '含选择器 / 坐标 / 尺寸等结构化信息：' + (m.selector || '').slice(0, 70))
  ok(errs.length === 0, '无页面错误', errs.join(' | '))
  await browser.close()
  if (fail) { console.log(`失败 ${fail} 项`); process.exit(1) }
  console.log('标注自动送达通道全部通过 ✅')
})().catch(e => { console.error('异常:', e); process.exit(1) })
