/* _audio_e2e.ts — 音频预热与快速连点互斥（真实浏览器） */
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

;(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => {
    try { localStorage.setItem('wordblast_banner_v2', 'v3.4') } catch {}
    const w: any = window
    w.__preloads = 0
    w.__ttsSpeak = 0
    w.__ttsCancel = 0
    // v3.4.5：预热改用 fetch 全量 200（不再用 <audio>.load() 发 Range），
    // 所以这里计数 mp3 的 fetch 请求，而不是 media.load()。
    const origFetch = window.fetch
    ;(window as any).fetch = function (input: any, init?: any) {
      const url = typeof input === 'string' ? input : (input && input.url) || ''
      if (/\/audio\/.*\.mp3/.test(url)) w.__preloads++
      return origFetch.call(window, input, init)
    }
    try {
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          getVoices: () => [],
          cancel: () => { w.__ttsCancel++ },
          speak: () => { w.__ttsSpeak++ },
          onvoiceschanged: null,
        },
      })
    } catch {}
  })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', (e: any) => errors.push(e.message))
  await page.route('**/sync-api/*', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, mailEnabled: false, devMode: false }),
    })
  })
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(600)

  console.log('\n[1] 进入跟读：本组音频被提前预热')
  await page.getByRole('button', { name: /跟读练习/ }).click()
  await page.waitForTimeout(1400)
  const pre1 = await page.evaluate(() => (window as any).__preloads)
  ok(pre1 >= 5, '跟读队列示范音已预热（mp3 fetch ' + pre1 + ' 次）')

  console.log('\n[2] 快速连点示范音：不回退系统 TTS、不叠音')
  const buttons = page.locator('button')
  const n = await buttons.count()
  let clicked = 0
  for (let i = 0; i < n; i++) {
    const t = await buttons.nth(i).innerText().catch(() => '')
    if (/听|示范|慢速|标准音/.test(t)) {
      await buttons.nth(i).click({ timeout: 1200 }).catch(() => {})
      clicked++
    }
  }
  await page.waitForTimeout(900)
  const tts = await page.evaluate(() => ({ speak: (window as any).__ttsSpeak, cancel: (window as any).__ttsCancel }))
  ok(clicked >= 1, '至少触发了一次示范音播放（点了 ' + clicked + ' 个按钮）')
  ok(tts.speak <= 1, '快速连点没有反复降级到系统 TTS（speak ' + tts.speak + ' 次）')
  ok(tts.cancel >= 1, '每次播放前都掐掉系统 TTS 通道')
  ok(errors.length === 0, '跟读音频路径无页面错误', errors.slice(0, 2).join(' | '))

  console.log('\n[3] 退出 → 进入对话：Emma 音频同样预热')
  await page.getByLabel('退出跟读').click().catch(async () => {
    const bs = page.locator('button')
    for (let i = 0; i < await bs.count(); i++) {
      const t = await bs.nth(i).innerText().catch(() => '')
      if (/返回|退出/.test(t)) { await bs.nth(i).click().catch(() => {}); break }
    }
  })
  await page.waitForTimeout(500)
  const pre2 = await page.evaluate(() => (window as any).__preloads)
  await page.getByRole('button', { name: /对话练习/ }).click()
  await page.waitForTimeout(1400)
  const pre3 = await page.evaluate(() => (window as any).__preloads)
  ok(pre3 > pre2, '对话队列 cue/reply 也触发了预热（' + pre2 + ' → ' + pre3 + '）')
  ok(errors.length === 0, '对话音频路径无页面错误', errors.slice(0, 2).join(' | '))

  console.log(fail === 0 ? '\n音频端到端全部通过 ✅' : `\n${fail} 项失败 ❌`)
  await browser.close()
  process.exit(fail ? 1 : 0)
})().catch((e: any) => { console.error('异常:', e); process.exit(1) })
