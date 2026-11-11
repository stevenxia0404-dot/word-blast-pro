/* _sync_state_e2e.ts — 跨设备同步落地后界面即时刷新回归
 * 复现场景：A 设备闯关 7850 分上传云端，B 设备登录同一邮箱后，
 * useSync 把合并结果写进 localStorage 并派发 wordblast:sync-applied，
 * 但 useGameProgress 的 useState 仍停在 0，首页看不到、下次 auto-save 还会盖掉存档。
 */
import { readFileSync, existsSync } from 'fs'
const SRC = existsSync('src/hooks/useGameProgress.ts') ? 'src/hooks/useGameProgress.ts' : '../frontend/src/hooks/useGameProgress.ts'

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

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const ctx = await browser.newContext({ serviceWorkers: 'block' })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1400)
  const scoreOf = async () => {
    try {
      const t = await page.locator('span.text-emerald-700').first().innerText({ timeout: 2500 })
      const m = t.match(/\d+/)
      return m ? Number(m[0]) : -1
    } catch { return -1 }
  }
  ok(await scoreOf() === 0, '全新设备首页闯关分为 0', String(await scoreOf()))

  console.log('\n[模拟云端同步落地：写 localStorage + 派发 sync-applied，不刷新页面]')
  await page.evaluate(() => {
    localStorage.setItem('wordblast_save_v1', JSON.stringify({
      version: 2, phase: 'levelComplete', levelIndex: 1, subsectionIndex: 0,
      totalScore: 7850, combo: 0,
      levelResults: [{ stars: 3, accuracy: 96, score: 7850 }],
      subsectionScore: 0, subsectionCorrect: 0, subsectionAttempts: 0,
    }))
    localStorage.setItem('wordblast_spoken_score_v1', JSON.stringify({
      score: 180, mastered: 3, reviewed: 1, updatedAt: Date.now(),
    }))
    window.dispatchEvent(new Event('wordblast:sync-applied'))
  })
  await page.waitForTimeout(700)
  ok(await scoreOf() === 7850, '同步落地后首页立刻显示 7850（无需刷新）', String(await scoreOf()))

  console.log('\n[等 auto-save effect 跑完，确认旧 state 不会把存档写回 0]')
  await page.waitForTimeout(1200)
  const ls = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('wordblast_save_v1') || '{}') } catch { return {} }
  })
  ok(ls.totalScore === 7850, '本地存档保持 7850，未被旧 state 覆盖', JSON.stringify(ls).slice(0, 160))
  ok(await scoreOf() === 7850, '关闭面板后首页仍是 7850', String(await scoreOf()))

  console.log('\n[静态断言]')
  const src = readFileSync(SRC, 'utf-8')
  ok(src.includes("addEventListener('wordblast:sync-applied'"), 'useGameProgress 监听同步落地事件')
  ok(src.includes("removeEventListener('wordblast:sync-applied'"), '卸载时移除监听，无泄漏')
  ok(errors.length === 0, '无页面错误', errors.slice(0, 2).join(' | '))

  await browser.close()
  console.log(fail === 0 ? '\n同步状态刷新 E2E 全部通过 ✅' : `\n${fail} 项失败 ❌`)
  process.exit(fail ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
