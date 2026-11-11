/* _sync_poll_e2e.ts — 定时拉取回归（真实浏览器 + 真实 _core.js/memoryStore）
 * 场景：A 设备打出 7850 上传云端，B 设备页面一直开着、不刷新、不点任何按钮，
 *       靠 30 秒轮询自动把新分数显示出来。
 * 手法：addInitScript 把产品的 30000/15000 定时器压缩成 300/1500ms，
 *       不改产品代码、不造假响应。B 设备时间线前移 62 秒跨过发码限流。
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
let fail = 0
const ok = (c: any, l: string, e = '') => {
  if (c) console.log('  ✅', l)
  else { fail++; console.log('  ❌', l, e) }
}

const store: any = memoryStore()
const env: any = { ALLOW_DEV_CODE: '1' }
const EMAIL = 'parent@example.com'

/** 只压缩同步用的两个间隔，其它定时器原样放行 */
function speedUpTimers() {
  const native = window.setInterval.bind(window)
  window.setInterval = function (fn: any, ms: any, ...rest: any[]) {
    return native(fn, ms === 30000 ? 300 : ms === 15000 ? 1500 : ms, ...rest)
  } as any
}

async function attach(page: any, offset = 0) {
  await page.route('**/sync-api/*', async (route: any) => {
    const req = route.request()
    const u = new URL(req.url())
    const path = u.pathname.replace(/^.*\/sync-api\/?/, '')
    let body: any = {}
    try {
      if (req.method() === 'POST' || req.method() === 'DELETE') body = req.postDataJSON()
    } catch { body = {} }
    const out: any = await handleRequest(env, {
      method: req.method(),
      path,
      body,
      headers: { authorization: req.headers()['authorization'] || '', ip: 'e2e' },
      store,
      now: Date.now() + offset,
    })
    await route.fulfill({
      status: out.status,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(out.body),
    })
  })
}

async function login(page: any) {
  await page.getByRole('button', { name: /跨设备同步/ }).click()
  await page.waitForTimeout(350)
  await page.getByRole('textbox', { name: '邮箱' }).fill(EMAIL)
  await page.getByRole('button', { name: /发送验证码/ }).click()
  await page.waitForTimeout(400)
  const filled = await page.getByRole('textbox', { name: '验证码' }).inputValue()
  ok(/^\d{6}$/.test(filled), 'dev 模式验证码自动填入', filled)
  await page.getByRole('button', { name: /登录并开启同步/ }).click()
  await page.waitForTimeout(1700)
}

async function scoreOf(page: any) {
  try {
    const t = await page.locator('span.text-emerald-700').first().innerText({ timeout: 2500 })
    const m = t.match(/\d+/)
    return m ? Number(m[0]) : -1
  } catch { return -1 }
}

async function cloudVersion(token: string, offset = 0) {
  const out: any = await handleRequest(env, {
    method: 'GET', path: 'data', body: {},
    headers: { authorization: 'Bearer ' + token },
    store, now: Date.now() + offset,
  })
  return { version: Number(out.body.version) || 0, score: out.body.data?.save?.totalScore ?? -1 }
}

;(async () => {
  const browser = await chromium.launch({ executablePath: CHROME })
  const errors: string[] = []

  console.log('\n[1] 设备 A 登录')
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
  await ctxA.addInitScript(speedUpTimers)
  await ctxA.addInitScript(() => { try { localStorage.setItem('wordblast_banner_v2', 'v3.4') } catch {} })
  const pageA: any = await ctxA.newPage()
  pageA.on('pageerror', (e: any) => errors.push('A: ' + e.message))
  await attach(pageA)
  await pageA.goto(BASE, { waitUntil: 'domcontentloaded' })
  await pageA.waitForTimeout(700)
  await login(pageA)

  console.log('\n[2] 设备 B 用同一邮箱登录，回首页（保持页面打开，之后不刷新）')
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
  await ctxB.addInitScript(speedUpTimers)
  await ctxB.addInitScript(() => { try { localStorage.setItem('wordblast_banner_v2', 'v3.4') } catch {} })
  const pageB: any = await ctxB.newPage()
  pageB.on('pageerror', (e: any) => errors.push('B: ' + e.message))
  await attach(pageB, 62000)
  await pageB.goto(BASE, { waitUntil: 'domcontentloaded' })
  await pageB.waitForTimeout(600)
  await login(pageB)
  const tokenB = await pageB.evaluate(() => localStorage.getItem('wordblast_sync_token_v1') || '')
  await pageB.getByRole('button', { name: '关闭' }).click()
  await pageB.waitForTimeout(300)
  ok(await scoreOf(pageB) === 0, 'B 初始闯关分为 0', String(await scoreOf(pageB)))

  console.log('\n[3] A 设备打出 7850 并上传云端')
  await pageA.evaluate(() => {
    localStorage.setItem('wordblast_save_v1', JSON.stringify({
      version: 2, phase: 'levelComplete', levelIndex: 2, subsectionIndex: 0,
      totalScore: 7850, combo: 0,
      levelResults: [{ stars: 3, accuracy: 96, score: 7850 }],
      subsectionScore: 0, subsectionCorrect: 0, subsectionAttempts: 0,
    }))
    window.dispatchEvent(new Event('wordblast:sync-applied'))
  })
  await pageA.waitForTimeout(700)
  await pageA.getByRole('button', { name: /立即同步/ }).click()
  await pageA.waitForTimeout(1200)
  const before = await cloudVersion(tokenB, 62000)
  ok(before.score === 7850, 'A 的 7850 已写入云端', JSON.stringify(before))
  await pageA.close() // 关掉 A，避免它自己的定时器干扰版本号稳定性断言

  console.log('\n[4] B 不刷新、不点同步，等轮询自动落地')
  let shown = -1
  for (let i = 0; i < 12; i++) {
    await pageB.waitForTimeout(300)
    shown = await scoreOf(pageB)
    if (shown === 7850) break
  }
  ok(shown === 7850, 'B 首页自动显示 7850（未刷新、未手动同步）', String(shown))
  const lsB = await pageB.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('wordblast_save_v1') || '{}') } catch { return {} }
  })
  ok(lsB.totalScore === 7850, 'B 本地存档已落地 7850', JSON.stringify(lsB).slice(0, 160))

  console.log('\n[5] 拉取不写库，版本号不来回涨')
  await pageB.waitForTimeout(1200)
  const v2 = (await cloudVersion(tokenB, 62000)).version
  await pageB.waitForTimeout(1200)
  const v3 = (await cloudVersion(tokenB, 62000)).version
  ok(v3 === v2, '版本号最终稳定，无轮询写库风暴', `${before.version} → ${v2} → ${v3}`)
  ok(errors.length === 0, 'A/B 均无页面错误', errors.slice(0, 3).join(' | '))

  console.log('\n[静态断言]')
  const src = readFileSync(resolve(__dirname, '../frontend/src/hooks/useSync.ts'), 'utf-8')
  ok(src.includes('POLL_MS = 30_000'), '产品轮询间隔 30 秒（测试里才压缩）')
  ok(src.includes("call('data', 'GET'"), '探测走只读 GET，不产生无谓写入')
  ok(src.includes("visibilityState !== 'visible'"), '后台 / 锁屏时跳过轮询')
  ok(src.includes("addEventListener('online'"), '断网恢复立即补传')

  await browser.close()
  console.log(fail === 0 ? '\n定时拉取 E2E 全部通过 ✅' : `\n${fail} 项失败 ❌`)
  process.exit(fail ? 1 : 0)
})().catch((e: any) => { console.error('异常:', e); process.exit(1) })
