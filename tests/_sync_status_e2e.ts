/* _sync_status_e2e.ts — 首页左下角同步指示器回归（真实浏览器 + 真实 _core.js）
 * 验证：未登录灰点 → 登录后绿灯 + 黑底浮层 → 点刷新橙灯 + 箭头旋转 → 回绿灯。
 * 色值/文案照搬菠萝日程，位置按要求放在首页白框左下角。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { handleRequest, memoryStore } from '../functions/api/sync/_core.js'

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
const EMAIL = 'parent@example.com'
let fail = 0
const ok = (c: any, l: string, e = '') => {
  if (c) console.log('  ✅', l)
  else { fail++; console.log('  ❌', l, e) }
}

const store: any = memoryStore()
const env: any = { ALLOW_DEV_CODE: '1' }

async function attach(page: any) {
  await page.route('**/sync-api/*', async (route: any) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^.*\/sync-api\/?/, '')
    let body: any = {}
    try { if (req.method() === 'POST' || req.method() === 'DELETE') body = req.postDataJSON() } catch {}
    const out: any = await handleRequest(env, {
      method: req.method(), path, body,
      headers: { authorization: req.headers()['authorization'] || '', ip: 'e2e' },
      store, now: Date.now(),
    })
    await route.fulfill({
      status: out.status, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(out.body),
    })
  })
}

;(async () => {
  const browser = await chromium.launch({ executablePath: CHROME })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
  await ctx.addInitScript(() => { try { localStorage.setItem('wordblast_banner_v2', 'v3.4') } catch {} })
  const page: any = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', (e: any) => errors.push(e.message))
  await attach(page)
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)

  const dotCls = () => page.locator('[data-testid="sync-dot"]').getAttribute('class')
  const dotBtn = page.locator('[data-testid="sync-dot-btn"]')

  console.log('\n[1] 未登录：灰点 + 点开说明')
  ok((await dotCls() || '').includes('D9D4CF'), '未登录是灰点 #D9D4CF', await dotCls())
  await dotBtn.click()
  const tip0 = await page.locator('[data-testid="sync-tip"]').innerText()
  ok(tip0.includes('未开启'), '点开显示未开启说明', tip0)
  await dotBtn.click()

  console.log('\n[2] 登录：绿灯 + 菠萝日程同款黑底浮层')
  await page.getByRole('button', { name: /跨设备同步/ }).click()
  await page.waitForTimeout(350)
  await page.getByRole('textbox', { name: '邮箱' }).fill(EMAIL)
  await page.getByRole('button', { name: /发送验证码/ }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /登录并开启同步/ }).click()
  await page.waitForTimeout(1700)
  await page.getByRole('button', { name: '关闭' }).click()
  await page.waitForTimeout(900)
  ok((await dotCls() || '').includes('059669'), '已登录是绿灯 #059669', await dotCls())
  await dotBtn.click()
  const tip = await page.locator('[data-testid="sync-tip"]').innerText()
  ok(tip.includes(EMAIL) && tip.includes('已同步 · 多设备自动同步'), '浮层显示邮箱与同步态', tip)
  await dotBtn.click()

  console.log('\n[3] 点刷新：橙灯 + 旋转箭头（至少 600ms）→ 回绿灯')
  await page.locator('[data-testid="sync-refresh"]').click()
  await page.waitForTimeout(120)
  const svgCls = await page.locator('[data-testid="sync-refresh"] svg').getAttribute('class')
  ok((svgCls || '').includes('animate-spin'), '同步中箭头旋转', svgCls || '')
  ok((await dotCls() || '').includes('ED6A3B'), '同步中是橙灯 #ED6A3B', await dotCls())
  await page.waitForTimeout(1000)
  ok((await dotCls() || '').includes('059669'), '同步结束回绿灯', await dotCls())
  ok(errors.length === 0, '无页面错误', errors.slice(0, 2).join(' | '))

  console.log('\n[静态断言]')
  const src = readFileSync(resolve(__dirname, '../frontend/src/components/SyncStatus.tsx'), 'utf-8')
  ok(src.includes('bg-[#059669]') && src.includes('bg-[#ED6A3B]') && src.includes('bg-[#D9D4CF]'), '三态色值照搬菠萝日程')
  ok(src.includes('#1C1C1C') && src.includes('#34d399') && src.includes('#A0A0A0'), '黑底浮层配色照搬')
  ok(src.includes('600'), '同步中最短显示 600ms，箭头不会一闪而过')
  const home = readFileSync(resolve(__dirname, '../frontend/src/components/HomeScreen.tsx'), 'utf-8')
  ok(home.indexOf('justify-between mt-1') > -1 && home.indexOf('<SyncStatus') > -1, '指示器在白框内容底部左侧')

  await browser.close()
  console.log(fail === 0 ? '\n同步指示器 E2E 全部通过 ✅' : `\n${fail} 项失败 ❌`)
  process.exit(fail ? 1 : 0)
})().catch((e: any) => { console.error('异常:', e); process.exit(1) })
