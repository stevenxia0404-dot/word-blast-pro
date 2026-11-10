/* _sync_e2e.ts — 同步端到端：真实浏览器 + 真实核心逻辑（memoryStore）
 * Playwright 拦截 /sync-api/*，背后跑的就是线上那份 _core.js，不是假响应。
 */
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

async function attach(page: any) {
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
      now: Date.now(),
    })
    await route.fulfill({
      status: out.status,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(out.body),
    })
  })
}

;(async () => {
  const browser = await chromium.launch({ executablePath: CHROME })

  console.log('\n[1] 设备 A：造一份本机进度 → 创建同步空间')
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctxA.addInitScript(() => {
    try {
      localStorage.setItem('wordblast_banner_v2', 'v3.3')
      localStorage.setItem('wordblast_save_v1', JSON.stringify({
        version: 2, phase: 'playing', levelIndex: 2, subsectionIndex: 0,
        totalScore: 640, combo: 0,
        levelResults: [
          { stars: 3, accuracy: 95, score: 200 },
          { stars: 2, accuracy: 72, score: 150 },
        ],
        subsectionScore: 0, subsectionCorrect: 0, subsectionAttempts: 0,
      }))
      localStorage.setItem('wordblast_spoken_score_v1', JSON.stringify({
        score: 180, mastered: 3, reviewed: 1, updatedAt: Date.now(),
      }))
      localStorage.setItem('wordblast_spoken_v1', JSON.stringify({ apple: Date.now() - 86400000 }))
      localStorage.setItem('wordblast_custom_v1', JSON.stringify({
        groups: [{ id: 'g1', name: 'Unit1', vocab: [{ id: 1, en: 'apple', zh: '苹果', type: 'word' }], importedAt: Date.now() }],
      }))
    } catch {}
  })
  const pageA: any = await ctxA.newPage()
  await attach(pageA)
  const errsA: string[] = []
  pageA.on('pageerror', (e: any) => errsA.push(e.message))
  await pageA.goto(BASE, { waitUntil: 'domcontentloaded' })
  await pageA.waitForTimeout(700)
  await pageA.getByRole('button', { name: /跨设备同步/ }).click()
  await pageA.waitForTimeout(400)
  await pageA.getByRole('button', { name: /创建同步空间/ }).click()
  await pageA.waitForTimeout(1600)
  const code = (await pageA.locator('[data-testid="sync-code"]').innerText()).trim()
  ok(/^[A-Z0-9]{20}$/.test(code), '创建后展示 20 位同步码', code)
  const textA = await pageA.locator('body').innerText()
  ok(textA.includes('已同步'), 'A 设备自动完成首次同步', textA.slice(-200))
  ok(errsA.length === 0, 'A 设备无页面错误', errsA.join(' | '))

  console.log('\n[2] 设备 B：输入同步码加入 → 拉到 A 的全部数据')
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctxB.addInitScript(() => {
    try { localStorage.setItem('wordblast_banner_v2', 'v3.3') } catch {}
  })
  const pageB: any = await ctxB.newPage()
  await attach(pageB)
  const errsB: string[] = []
  pageB.on('pageerror', (e: any) => errsB.push(e.message))
  await pageB.goto(BASE, { waitUntil: 'domcontentloaded' })
  await pageB.waitForTimeout(600)
  await pageB.getByRole('button', { name: /跨设备同步/ }).click()
  await pageB.waitForTimeout(350)
  await pageB.getByRole('textbox', { name: '同步码' }).fill(code.toLowerCase())
  await pageB.getByRole('button', { name: /加入同步空间/ }).click()
  await pageB.waitForTimeout(1800)
  const textB = await pageB.locator('body').innerText()
  ok(textB.includes('已同步'), 'B 设备加入后自动同步', textB.slice(-200))
  const pulled = await pageB.evaluate(() => ({
    score: JSON.parse(localStorage.getItem('wordblast_spoken_score_v1') || '{}').score,
    levelIndex: JSON.parse(localStorage.getItem('wordblast_save_v1') || '{}').levelIndex,
    apple: !!JSON.parse(localStorage.getItem('wordblast_spoken_v1') || '{}').apple,
    groups: (JSON.parse(localStorage.getItem('wordblast_custom_v1') || '{}').groups || []).length,
  }))
  ok(pulled.score === 180, '口语分同步到 B', JSON.stringify(pulled))
  ok(pulled.levelIndex === 2 && pulled.apple, '闯关进度与跟读记录同步到 B')
  ok(pulled.groups === 1, '自定义词库同步到 B')
  ok(errsB.length === 0, 'B 设备无页面错误', errsB.join(' | '))

  console.log('\n[3] 冲突合并：B 自己练出新分数，A 不回退')
  await pageB.evaluate(() => {
    localStorage.setItem('wordblast_spoken_score_v1', JSON.stringify({
      score: 260, mastered: 4, reviewed: 2, updatedAt: Date.now(),
    }))
  })
  await pageB.getByRole('button', { name: /立即同步/ }).click()
  await pageB.waitForTimeout(1200)
  const cloud = await handleRequest(env, {
    method: 'GET', path: 'data', body: {},
    headers: { authorization: 'Bearer ' + (await pageB.evaluate(() => localStorage.getItem('wordblast_sync_token_v1') || '')) },
    store, now: Date.now(),
  })
  ok((cloud as any).body.data.spokenScore.score === 260, 'B 的新分数写入云端', JSON.stringify((cloud as any).body.data.spokenScore))
  ok((cloud as any).body.data.save.totalScore === 640, 'A 的闯关分没有被 B 覆盖')

  console.log('\n[4] 家长区 / 学习报告显示同步后的真实数据')
  await pageB.getByRole('button', { name: '关闭' }).click()
  await pageB.waitForTimeout(250)
  await pageB.getByRole('button', { name: /家长区/ }).click()
  await pageB.waitForTimeout(350)
  const parent = await pageB.locator('body').innerText()
  ok(parent.includes('已开启') && parent.includes('260'), '家长区显示同步状态与真实口语分', parent.slice(0, 260))
  await pageB.getByRole('button', { name: '关闭' }).click()
  await pageB.waitForTimeout(250)
  await pageB.getByRole('button', { name: /学习报告/ }).click()
  await pageB.waitForTimeout(350)
  const report = await pageB.locator('body').innerText()
  ok(report.includes('2/12') && report.includes('第 2 关'), '报告显示已完成关卡与低正确率关卡', report.slice(0, 300))
  await pageB.getByRole('button', { name: '关闭' }).click()

  console.log('\n[5] 微信内置浏览器 → 录音降级不挡人')
  const ctxC = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 MicroMessenger/8.0.44',
  })
  await ctxC.addInitScript(() => {
    try { localStorage.setItem('wordblast_banner_v2', 'v3.3') } catch {}
  })
  const pageC: any = await ctxC.newPage()
  await attach(pageC)
  const errsC: string[] = []
  pageC.on('pageerror', (e: any) => errsC.push(e.message))
  await pageC.goto(BASE, { waitUntil: 'domcontentloaded' })
  await pageC.waitForTimeout(700)
  await pageC.getByRole('button', { name: /跟读练习/ }).click()
  await pageC.waitForTimeout(900)
  const before = await pageC.locator('body').innerText()
  ok(before.includes('跳过录音'), '微信内置浏览器显示「跳过录音」入口', before.slice(0, 250))
  ok(before.includes('内置浏览器不支持录音'), '给出明确原因与「用系统浏览器打开」引导')
  await pageC.getByRole('button', { name: /跳过录音/ }).first().click()
  await pageC.waitForTimeout(400)
  const after = await pageC.locator('body').innerText()
  ok(after.includes('我会了'), '跳过后自评按钮可用（分数照常计入）', after.slice(0, 250))
  ok(after.includes('已跳过录音'), '对比面板标明已跳过')
  ok(errsC.length === 0, '降级路径无页面错误', errsC.join(' | '))

  console.log(fail === 0 ? '\n同步端到端全部通过 ✅' : `\n${fail} 项失败 ❌`)
  await browser.close()
  process.exit(fail ? 1 : 0)
})().catch((e: any) => { console.error('异常:', e); process.exit(1) })
