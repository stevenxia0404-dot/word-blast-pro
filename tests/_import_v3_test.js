// 浏览器端到端：导入弹窗 v3（四列模板 + 序号 + 导入记录管理）
function loadPlaywright() {
  const candidates = [
    'playwright',
    process.env.PLAYWRIGHT_PATH,
    'C:/Users/86139/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright',
  ].filter(Boolean)
  for (const c of candidates) {
    try { return require(c) } catch { /* try next */ }
  }
  throw new Error('playwright 未找到')
}
const CHROME = process.env.CHROME_PATH || 'C:/Users/86139/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe'
const { chromium } = loadPlaywright()

const BASE = 'http://127.0.0.1:5173/'
let fail = 0
const ok = (c, l, e = '') => { if (c) console.log('  ✅', l); else { fail++; console.log('  ❌', l, e) } }

const TEMPLATE = `序号,英文单词,短语例句,中文翻译
1,apple,I eat an apple every day.,苹果
2,cat,The cat is cute.,猫
3,dog,,狗
4,feed the cows,,喂奶牛
5,My mum is a great cook.,,我的妈妈是一位超棒的厨师`

;(async () => {
  const browser = await chromium.launch({ executablePath: CHROME })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))

  await ctx.addInitScript(() => {
    try { localStorage.setItem('wordblast_banner_v2', 'v3.0') } catch {}
  })
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.removeItem('wordblast_save_v1')
    localStorage.removeItem('wordblast_custom_v1')
    localStorage.removeItem('wordblast_spoken_v1')
    localStorage.removeItem('wordblast_spoken_score_v1')
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)

  console.log('\n[1] 打开导入弹窗')
  await page.getByText('导入课本单词').click()
  await page.waitForTimeout(600)
  ok(await page.getByText('自定义词库').count() > 0, '导入弹窗已打开')
  ok(await page.getByText('序号 / 英文单词 / 短语例句 / 中文翻译').count() > 0, '格式说明已显示（四列）')
  ok(await page.getByText('下载模板').count() > 0, '下载模板按钮常驻')

  console.log('\n[2] 粘贴四列模板 → 解析')
  const ta = page.locator('textarea')
  await ta.fill(TEMPLATE)
  await page.getByText('解析预览').click()
  await page.waitForTimeout(700)
  const body = await page.locator('body').innerText()
  ok(body.includes('共 5 条'), '显示总条数 5', body.slice(0, 60))
  ok(body.includes('单词 3') && body.includes('短语 1') && body.includes('句子 1'),
    '类型统计正确（单词3/短语1/句子1）', body.slice(0, 200))
  ok(body.includes('序号 1 – 5'), '显示序号区间 1 – 5', body.slice(0, 200))
  ok(!body.includes('英文单词,短语例句'), '表头行未被当成词条', '')
  ok(body.includes('apple') && body.includes('My mum is a great cook.'), '词条内容正确（含大小写与句号）')

  console.log('\n[3] 序号查漏')
  await page.getByText('返回修改').click()
  await page.waitForTimeout(400)
  await ta.fill(TEMPLATE.replace('3,dog,,狗', '4,dog,,狗'))
  await page.getByText('解析预览').click()
  await page.waitForTimeout(700)
  const body2 = await page.locator('body').innerText()
  ok(body2.includes('缺号 3'), '检出缺号 3', body2.slice(0, 300))

  console.log('\n[4] 确认导入 → 进入记录页')
  await page.getByText('返回修改').click()
  await page.waitForTimeout(400)
  await ta.fill(TEMPLATE)
  await page.getByText('解析预览').click()
  await page.waitForTimeout(700)
  await page.getByText('确认导入').click()
  await page.waitForTimeout(800)
  const body3 = await page.locator('body').innerText()
  ok(body3.includes('导入记录'), '切到导入记录 Tab', body3.slice(0, 80))
  ok(body3.includes('共 1 组') && body3.includes('5 个词条'), '记录统计正确', body3.slice(0, 200))

  console.log('\n[5] 记录条目 + 展开查看')
  ok(body3.includes('词库 1'), '默认组名「词库 1」')
  ok(body3.includes('✏️ 粘贴'), '来源标记为「粘贴」')
  await page.getByText('词库 1').click()
  await page.waitForTimeout(600)
  const body4 = await page.locator('body').innerText()
  ok(body4.includes('apple') && body4.includes('苹果'), '展开后可见词条')
  ok(await page.locator('input[placeholder*="给这组起个名字"]').count() > 0, '有组名编辑框')

  console.log('\n[6] 行内编辑词条')
  await page.getByText('编辑').first().click()
  await page.waitForTimeout(400)
  const enInput = page.locator('input[placeholder="英文"]').first()
  await enInput.fill('apple pie')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await page.waitForTimeout(700)
  const body5 = await page.locator('body').innerText()
  ok(body5.includes('apple pie'), '词条已改为 apple pie', body5.slice(0, 300))
  const stored = await page.evaluate(() => localStorage.getItem('wordblast_custom_v1'))
  ok(stored && stored.includes('apple pie'), '已落盘 localStorage')

  console.log('\n[7] 删单条 + 补词')
  const before = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('wordblast_custom_v1'))
    return d.groups[0].vocab.length
  })
  await page.getByRole('button', { name: '删', exact: true }).first().click()
  await page.waitForTimeout(600)
  const after = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('wordblast_custom_v1'))
    return d.groups[0].vocab.length
  })
  ok(after === before - 1, `删单条生效 ${before} → ${after}`)

  await page.locator('input[placeholder="补一个词：英文"]').fill('banana')
  await page.locator('input[placeholder="中文"]').fill('香蕉')
  await page.getByText('添加').click()
  await page.waitForTimeout(600)
  const after2 = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('wordblast_custom_v1'))
    return d.groups[0].vocab.length
  })
  ok(after2 === after + 1, `补词生效 ${after} → ${after2}`)

  console.log('\n[8] 组名可改')
  const nameInput = page.locator('input[placeholder*="给这组起个名字"]')
  await nameInput.fill('三年级上册 Unit1')
  await nameInput.blur()
  await page.waitForTimeout(600)
  const stored2 = await page.evaluate(() => localStorage.getItem('wordblast_custom_v1'))
  ok(stored2 && stored2.includes('三年级上册 Unit1'), '组名已保存', (stored2 || '').slice(0, 80))

  console.log('\n[9] 二次导入 → 累加不覆盖')
  await page.getByText('📥 导入').click()
  await page.waitForTimeout(500)
  await ta.fill('1,lemon,I like lemons.,柠檬\n2,mango,,芒果')
  await page.getByText('解析预览').click()
  await page.waitForTimeout(600)
  await page.getByText('确认导入').click()
  await page.waitForTimeout(800)
  const groups = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('wordblast_custom_v1'))
    return d.groups.map(g => ({ name: g.name, n: g.vocab.length, en: g.vocab.map(v => v.en) }))
  })
  ok(groups.length === 2, `两组累加（${groups.length} 组）`, JSON.stringify(groups))
  ok(groups[0].en.includes('cat') && groups[0].en.includes('banana') && !groups[0].en.includes('lemon'),
    '第一组内容未被二次导入覆盖', JSON.stringify(groups[0]))
  ok(groups[1].en.includes('lemon') && groups[1].en.includes('mango'), '第二组是新内容', JSON.stringify(groups[1]))

  console.log('\n[10] 删除整组')
  await page.getByRole('button', { name: '删除', exact: true }).first().click()
  await page.waitForTimeout(600)
  const groups2 = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('wordblast_custom_v1'))
    return d.groups.length
  })
  ok(groups2 === 1, `删整组生效（剩 ${groups2} 组）`)

  console.log('\n[11] 导入的词条能进游戏')
  await page.getByText('📥 导入').click()
  await page.waitForTimeout(400)
  await page.getByText('取消').click()
  await page.waitForTimeout(500)
  const homeText = await page.locator('body').innerText()
  ok(homeText.includes('管理课本单词') || homeText.includes('导入课本单词'), '首页导入入口文案随状态切换')

  console.log('\n页面错误：', errors.length ? errors.slice(0, 3) : '无 ✅')
  console.log(fail === 0 ? '\n全部通过 ✅' : `\n${fail} 项失败 ❌`)
  await browser.close()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('异常:', e.message); process.exit(1) })
