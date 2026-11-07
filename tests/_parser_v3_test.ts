import { previewParse as oldParse } from './_old_parser'
void oldParse
void oldParse
import { previewParse as newParse } from '../frontend/src/config/wordParser'

let fail = 0
const ok = (c: boolean, label: string, detail = '') => {
  if (c) console.log('  ✅', label)
  else { fail++; console.log('  ❌', label, detail) }
}

/* ── 1. 存量 bug 修复验证（v2 解析器这几条会错） ── */
console.log('\n[1] 存量 bug 修复')
{
  const r = newParse('robot (n.) 机器人')
  ok(r.items.length === 1 && r.items[0].en === 'robot' && r.items[0].zh === '机器人',
    '带括号词性标注：robot (n.) 机器人', JSON.stringify(r.items))

  const r2 = newParse('apple /ˈæpəl/ 苹果')
  ok(r2.items.length === 1 && r2.items[0].en === 'apple' && r2.items[0].zh === '苹果',
    '带音标：apple /ˈæpəl/ 苹果', JSON.stringify(r2.items))

  const r3 = newParse('color/colour 颜色')
  ok(r3.items.length === 1 && r3.items[0].en === 'color' && r3.items[0].zh === '颜色',
    '斜杠多拼：color/colour 颜色', JSON.stringify(r3.items))

  const r4 = newParse('苹果（水果）apple')
  ok(r4.items.length === 1 && r4.items[0].en === 'apple' && r4.items[0].zh === '苹果',
    '中文在前+括号：苹果（水果）apple', JSON.stringify(r4.items))

  const r5 = newParse('I pack my schoolbag. 我整理书包。')
  ok(r5.items.length === 1 && r5.items[0].en === 'I pack my schoolbag.' && r5.items[0].zh === '我整理书包。',
    '索引错位：I pack my schoolbag. 我整理书包。', JSON.stringify(r5.items))
}

/* ── 2. 老格式不退化（与 v2 解析器逐条对齐） ── */
console.log('\n[2] 老格式不退化')
{
  const cases: Array<[string, string, string, string]> = [
    // label, input, expected en, expected zh
    ['空格自由文本', 'apple 苹果', 'apple', '苹果'],
    ['空格+例句', 'dog 狗 The dog can run fast.', 'dog', '狗'],
    ['旧三列 英文,中文,例句', 'apple,苹果,I eat an apple every day.', 'apple', '苹果'],
    ['旧两列', 'apple,苹果', 'apple', '苹果'],
    ['中文在前', '苹果 apple', 'apple', '苹果'],
    ['行首编号', '1. robot 机器人', 'robot', '机器人'],
    ['多空格', 'apple    苹果', 'apple', '苹果'],
    ['短语', 'feed the cows 喂奶牛', 'feed the cows', '喂奶牛'],
  ]
  for (const [label, input, en, zh] of cases) {
    const r = newParse(input)
    const it = r.items[0]
    ok(r.items.length === 1 && it.en === en && it.zh === zh, label,
      `期望 en=${en} zh=${zh}，实得 ${JSON.stringify(it)}`)
  }
}

/* ── 3. 例句识别（v2 已有的能力不能丢） ── */
console.log('\n[3] 例句识别')
{
  const r = newParse('apple,苹果,I eat an apple every day.')
  ok(r.items[0].sentence === 'I eat an apple every day.', '旧三列例句仍能识别', r.items[0].sentence)

  const r2 = newParse('dog 狗 The dog can run fast.')
  ok(r2.items[0].sentence === 'The dog can run fast.', '空格分隔例句仍能识别', r2.items[0].sentence)

  const r3 = newParse('apple,苹果,I eat an apple every day.')
  ok(r3.items[0].type === 'word', '带例句的单词仍判为 word', r3.items[0].type)

  const r4 = newParse('My mum is a great cook.,我的妈妈是一位超棒的厨师')
  ok(r4.items[0].type === 'sentence', '句末句号的完整句子判为 sentence', r4.items[0].type)

  const r5 = newParse('apple. 苹果')
  ok(r5.items[0].type === 'word', '单词带句点不判成句子', r5.items[0].type)
}

/* ── 4. 新四列格式（核心需求） ── */
console.log('\n[4] 新四列格式')
{
  const tpl = '序号,英文单词,短语例句,中文翻译\n' +
    '1,apple,I eat an apple every day.,苹果\n' +
    '2,cat,The cat is cute.,猫\n' +
    '3,dog,,狗\n' +
    '4,feed the cows,,喂奶牛\n' +
    '5,My mum is a great cook.,,我的妈妈是一位超棒的厨师'
  const r = newParse(tpl)
  ok(r.hasHeader, '识别到表头', String(r.hasHeader))
  ok(r.items.length === 5, '表头行不计入词条，解析出 5 条', String(r.items.length))
  ok(r.items[0].en === 'apple' && r.items[0].zh === '苹果', '第1条 英文/中文正确', JSON.stringify(r.items[0]))
  ok(r.items[0].sentence === 'I eat an apple every day.', '第1条例句正确', r.items[0].sentence)
  ok(r.items[0].seq === 1 && r.items[4].seq === 5, '序号正确解析', `${r.items[0].seq}..${r.items[4].seq}`)
  ok(r.items[2].sentence === undefined, '空例句列 → 无例句', String(r.items[2].sentence))
  ok(r.items[3].en === 'feed the cows' && r.items[3].type === 'phrase', '短语归类正确', JSON.stringify(r.items[3]))
  ok(r.items[4].en === 'My mum is a great cook.' && r.items[4].type === 'sentence',
    '完整句子保留原大小写与句号', JSON.stringify(r.items[4]))
  ok(r.errors.length === 0, '无误报行', JSON.stringify(r.errors))
}

/* ── 5. 无表头的四列（内容特征分配） ── */
console.log('\n[5] 无表头四列')
{
  const r = newParse('1,apple,I eat an apple every day.,苹果')
  ok(r.items.length === 1 && r.items[0].en === 'apple' && r.items[0].zh === '苹果'
    && r.items[0].sentence === 'I eat an apple every day.', '无表头也能分配三列', JSON.stringify(r.items[0]))
  ok(r.items[0].seq === 1, '首列纯数字识别为序号', String(r.items[0].seq))

  const r2 = newParse('3,dog,,狗')
  ok(r2.items[0].en === 'dog' && r2.items[0].zh === '狗' && !r2.items[0].sentence,
    '空例句列（无表头）', JSON.stringify(r2.items[0]))
}

/* ── 6. 序号查漏 ── */
console.log('\n[6] 序号查漏')
{
  const r = newParse('序号,英文单词,短语例句,中文翻译\n1,a,,甲\n2,b,,乙\n4,d,,丁')
  ok(r.seqGaps.length === 1 && r.seqGaps[0] === 3, '检出缺号 3', JSON.stringify(r.seqGaps))
  ok(r.seqRange && r.seqRange.from === 1 && r.seqRange.to === 4, '序号区间正确', JSON.stringify(r.seqRange))
}

/* ── 7. 引号感知切列（Excel 另存 CSV） ── */
console.log('\n[7] 引号感知切列')
{
  const r = newParse('1,"apple, big",,苹果')
  ok(r.items.length === 1 && r.items[0].en === 'apple, big', '引号内逗号不切列', JSON.stringify(r.items[0]))

  const r2 = newParse('1,apple,"I like cats, dogs.",苹果')
  ok(r2.items.length === 1 && r2.items[0].sentence === 'I like cats, dogs.', '引号内例句保留', r2.items[0].sentence)
}

/* ── 8. 表头误判防护 ── */
console.log('\n[8] 表头误判防护')
{
  const r = newParse('word 意思')
  ok(r.items.length === 1 && r.items[0].en === 'word' && r.items[0].zh === '意思',
    '"word 意思" 不被当成表头', JSON.stringify(r.items))

  const r2 = newParse('apple,苹果')
  ok(!r2.hasHeader, '"apple,苹果" 不是表头', String(r2.hasHeader))

  const r3 = newParse('英文,中文,例句\napple,苹果,I eat an apple.')
  ok(r3.hasHeader && r3.items.length === 1, '旧三列表头也能识别', JSON.stringify({ h: r3.hasHeader, n: r3.items.length }))
}

/* ── 9. 数量核对 ── */
console.log('\n[9] 数量核对')
{
  const r = newParse('序号,英文单词,短语例句,中文翻译\n1,a,,甲\n2,b,,乙\n3,c,,丙')
  ok(r.items.length === 3, '条数与序号数一致', String(r.items.length))
  ok(r.typeCounts.word === 3, '类型统计正确', JSON.stringify(r.typeCounts))
}

console.log(fail === 0 ? '\n全部通过 ✅' : `\n${fail} 项失败 ❌`)
process.exit(fail ? 1 : 0)
