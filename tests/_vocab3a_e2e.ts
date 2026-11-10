// 浏览器端到端：3A 教材新词库（单词关 / 句子关挖空 / 跟读句子）
function loadPlaywright() {
  for (const c of ['playwright', process.env.PLAYWRIGHT_PATH,
    'C:/Users/86139/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright']) {
    try { return require(c) } catch {}
  }
  throw new Error('playwright 未找到')
}
const CHROME = process.env.CHROME_PATH || 'C:/Users/86139/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe'
const { chromium } = loadPlaywright()
const BASE = 'http://127.0.0.1:5173/'
let fail = 0
const ok = (c, l, e = '') => { if (c) console.log('  ✅', l); else { fail++; console.log('  ❌', l, e) } }

// 3A 词条候选（跟读/句子是随机抽的，卡到哪个都算通过）
const VOCAB_3A = [
  'new', 'school', 'cook', 'help', 'garden', 'water', 'draw', 'sing', 'book', 'fox',
  'plant', 'teacher', 'friend', 'tea', 'cloud', 'rain', 'snow', 'lake', 'sea', 'ice',
  'air', 'sky', 'ant', 'want', 'read', 'study', 'hard', 'goal', 'plan', 'follow',
  'start', 'umbrella', 'proud', 'jump', 'grow', 'carrot', 'leaf', 'flower', 'apple',
  'cat', 'dog', 'classmate', 'river', 'vegetable', 'strawberry', 'tomato',
  // 短语（跟读队列也会抽到）
  'play sports', 'tell a story', 'use the computer', 'be good at', 'act out',
  'orange tree', 'school garden report', 'water vapour', 'water drop', 'lab report',
  'do the dishes', 'clean the table', 'walk the dog', 'give your seat',
  'help with cooking', 'take my seat',
]
const OLD_VOCAB = ['robot', 'music', 'lion', 'mouse', 'share', 'mother']

;(async () => {
  const browser = await chromium.launch({ executablePath: CHROME })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await ctx.addInitScript(() => {
    try { localStorage.setItem('wordblast_banner_v2', 'v3.3') } catch {}
  })
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.removeItem('wordblast_save_v1')
    localStorage.removeItem('wordblast_custom_v1')
    localStorage.removeItem('wordblast_spoken_v1')
    localStorage.removeItem('wordblast_spoken_score_v1')
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  console.log('\n[1] 首页加载')
  ok((await page.locator('body').innerText()).includes('闯关练习'), '首页正常')

  console.log('\n[2] 第一关是单词关')
  await page.getByRole('button', { name: /开始闯关|继续闯关/ }).click()
  await page.waitForTimeout(1200)
  const lv1 = await page.locator('body').innerText()
  ok(lv1.includes('单词 1'), '关卡名为「单词 1」', lv1.slice(0, 60))
  ok(lv1.includes('1/12'), '共 12 关', lv1.slice(0, 60))
  ok(!OLD_VOCAB.some(w => lv1.includes(w)), '旧通用词已消失')

  console.log('\n[3] 单词关只有 2 小节')
  ok(lv1.includes('配对消消'), '含配对消消')
  ok(!lv1.includes('例句填空'), '没有「例句填空」小节')

  console.log('\n[4] 跳到句子关（第 8 关）')
  await page.evaluate(() => {
    localStorage.setItem('wordblast_save_v1', JSON.stringify({
      phase: 'playing', levelIndex: 7, subsectionIndex: 0,
      totalScore: 0, combo: 0, levelResults: [],
      subsectionScore: 0, subsectionCorrect: 0, subsectionAttempts: 0,
    }))
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const cont = page.getByRole('button', { name: /继续闯关/ })
  if (await cont.count() > 0) { await cont.first().click(); await page.waitForTimeout(1500) }
  const lv8 = await page.locator('body').innerText()
  ok(lv8.includes('句子 1') || lv8.includes('8/12'), '进入句子关', lv8.slice(0, 100))

  console.log('\n[5] 句子关是教材原句挖空')
  ok(lv8.includes('句子填空'), '显示「句子填空」小节')
  ok(/[A-Za-z][^\n]*___[^\n]*[.!?]/.test(lv8), '画面出现带空格的教材句子', lv8.slice(0, 200))
  // 中文对照：挖空题下方必有中文（教材原句翻译）
  // 不硬编码具体句子 —— 句子是随机抽的
  ok(/[\u4e00-\u9fff]{2,}/.test(lv8), '画面出现中文翻译', lv8.slice(0, 250))
  ok(!OLD_VOCAB.some(w => lv8.includes(w)), '句子关无旧通用词')

  console.log('\n[6] 跟读模块用 3A 词条')
  await page.getByLabel('返回首页').first().click().catch(() => {})
  await page.waitForTimeout(900)
  ok((await page.locator('body').innerText()).includes('跟读练习'), '回到首页')
  await page.getByRole('button', { name: /跟读练习/ }).click()
  await page.waitForTimeout(1500)
  const rep = await page.locator('body').innerText()
  ok(rep.includes('标准音') && rep.includes('慢速'), '跟读模块加载（听/慢速）', rep.slice(0, 120))
  ok(VOCAB_3A.some(w => rep.includes(w)), '跟读卡片是 3A 词条', rep.slice(0, 200))
  ok(!OLD_VOCAB.some(w => rep.includes(w)), '跟读无旧通用词', rep.slice(0, 200))

  console.log('\n[7] 音频清单')
  const audio = await page.evaluate(async () => {
    const r = await fetch('/audio/manifest.json')
    const m = await r.json()
    return Object.keys(m.ana || {})
  })
  ok(audio.length === 116, `manifest 116 条（词+句）`, String(audio.length))
  ok(audio.includes('new') && audio.includes('a new start.'), '含 3A 词汇与教材句子音频')

  console.log('\n页面错误：', errors.length ? errors.slice(0, 3) : '无 ✅')
  console.log(fail === 0 ? '\n全部通过 ✅' : `\n${fail} 项失败 ❌`)
  await browser.close()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('异常:', e.message); process.exit(1) })
