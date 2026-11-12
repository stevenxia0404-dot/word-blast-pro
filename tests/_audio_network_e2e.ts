/* _audio_network_e2e.ts — v3.4.5 音频滞后/降级/重叠 真实浏览器回归（A 快网 / B 慢网 / C 抖动） */
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

async function run(browser: any, label: string, delayMs: number, failEvery = 0) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
  await ctx.addInitScript(() => {
    try { localStorage.setItem('wordblast_banner_v2', 'v3.4') } catch {}
    const w: any = window
    w.__d = { plays: [], tts: 0, cancels: 0, loads: 0, lastTts: '', fetches: 0, inflight: 0, maxInflight: 0 }
    // 预热改走 fetch 全量；记录并发峰值，验证并发限流没有把带宽抢光
    const origFetch = window.fetch
    ;(window as any).fetch = function (input: any, init?: any) {
      const url = typeof input === 'string' ? input : (input && input.url) || ''
      if (/\/audio\/.*\.mp3/.test(url)) {
        w.__d.fetches++
        w.__d.inflight++
        w.__d.maxInflight = Math.max(w.__d.maxInflight, w.__d.inflight)
        return origFetch.call(window, input, init).finally(() => { w.__d.inflight-- })
      }
      return origFetch.call(window, input, init)
    }
    const origPlay = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      const rec: any = { t: Math.round(performance.now()), src: (this.currentSrc || this.src || '').split('/').pop(), status: 'pending' }
      w.__d.plays.push(rec)
      const pr = origPlay.call(this)
      pr.then(() => { rec.status = 'ok'; rec.ms = Math.round(performance.now() - rec.t) })
        .catch((e: any) => { rec.status = 'reject'; rec.err = (e && e.name ? e.name + ': ' + String(e.message).slice(0, 70) : String(e)); rec.ms = Math.round(performance.now() - rec.t) })
      return pr
    }
    const origLoad = HTMLMediaElement.prototype.load
    HTMLMediaElement.prototype.load = function () { w.__d.loads++; return origLoad.call(this) }
    try {
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices: () => [], cancel: () => { w.__d.cancels++ },
        speak: (u: any) => { w.__d.tts++; w.__d.lastTts = u && u.text }, onvoiceschanged: null,
      }})
    } catch {}
  })
  const page = await ctx.newPage()
  const errs: string[] = []
  page.on('pageerror', (e: any) => errs.push(e.message))
  await page.route('**/sync-api/*', (r: any) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, mailEnabled: false, devMode: false }) }))
  if (delayMs || failEvery) {
    let n = 0
    await page.route('**/audio/*.mp3', async (r: any) => {
      n++
      if (failEvery && n % failEvery === 0) { await r.fulfill({ status: 404, body: 'not found' }); return }
      if (delayMs) await new Promise(res => setTimeout(res, delayMs))
      await r.continue().catch(() => {})
    })
  }
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /跟读练习/ }).click()
  await page.waitForTimeout(delayMs ? 500 : 1300)  // 慢网络：预热尚未完成就开始点

  const btns = page.locator('button')
  let idx = -1
  for (let i = 0; i < await btns.count(); i++) {
    const t = await btns.nth(i).innerText().catch(() => '')
    if (/听|示范|标准音/.test(t)) { idx = i; break }
  }
  if (idx < 0) { console.log(label, '未找到示范按钮'); await ctx.close(); return null }
  const target = btns.nth(idx)
  for (let k = 0; k < 6; k++) {
    await target.click({ force: true, timeout: 1200 }).catch(() => {})
    await page.waitForTimeout(140)
  }
  await page.waitForTimeout(delayMs ? delayMs + 1200 : 900)
  const d = await page.evaluate(() => (window as any).__d)
  const rejects = d.plays.filter((x: any) => x.status === 'reject')
  const oks = d.plays.filter((x: any) => x.status === 'ok')
  const avg = oks.length ? Math.round(oks.reduce((s: number, x: any) => s + (x.ms || 0), 0) / oks.length) : -1
  console.log('\n=== ' + label + ' ===')
  console.log('预热 load:', d.loads, '| play 调用:', d.plays.length, '| 成功:', oks.length, '| 平均 play() 耗时:', avg, 'ms')
  console.log('play() 被拒:', rejects.length, '| 错误样本:', [...new Set(rejects.map((x: any) => x.err))].slice(0, 3))
  console.log('系统 TTS 降级:', d.tts, '次 | 最后文本:', d.lastTts || '-', '| cancel:', d.cancels, '| 页面错误:', errs.length)
  await ctx.close()
  console.log('预热 fetch:', d.fetches, '个 mp3 | 并发峰值:', d.maxInflight)
  return { tts: d.tts, rejects: rejects.length, avg, fetches: d.fetches, maxInflight: d.maxInflight, errs: errs.length }
}

;(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--autoplay-policy=no-user-gesture-required'] })
  const a = await run(browser, 'A 快网络（对照组）', 0)
  const b = await run(browser, 'B 慢网络（mp3 延迟 900ms + 预热未完成就连点 6 次）', 900)
  const c = await run(browser, 'C 网络抖动（每 3 个 mp3 请求有 1 个 404）', 0, 3)
  console.log('\n=== 判定 ===')
  console.log('慢网络起播延迟:', a && b ? a.avg + ' → ' + b.avg + ' ms' : 'n/a')
  let fail = 0
  const ok = (cond: any, label: string) => {
    if (cond) console.log('  ✅', label)
    else { fail++; console.log('  ❌', label) }
  }
  ok(!!(a && b && c), 'A/B/C 三组场景全部跑通')
  ok(!!a && a.tts === 0, '快网络：0 次系统 TTS 降级')
  ok(!!b && b.tts === 0, '慢网络（900ms 延迟 + 连点 6 次）：0 次系统 TTS 降级')
  ok(!!c && c.tts === 0, '网络抖动（每 3 个 mp3 有 1 个 404）：0 次系统 TTS 降级 ← 旧版 3 次')
  ok(!!a && a.fetches > 0, '预热确实发出全量 fetch（旧版 audio.load 发 Range 得 206）')
  ok(!!a && a.maxInflight <= 3 && a.maxInflight > 0,
     '预热并发峰值 <= 3（旧版 100 个并发抢带宽），实测=' + (a ? a.maxInflight : 'n/a'))
  ok(!!(a && b && c) && a.errs === 0 && b.errs === 0 && c.errs === 0, '三组均无页面错误')
  await browser.close()
  if (fail) { console.log(`\n${fail} 项失败 ❌`); process.exit(1) }
  console.log('\n音频网络退化场景全部通过 ✅')
})().catch((e: any) => { console.error('异常:', e); process.exit(1) })
