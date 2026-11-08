import {
  LEVELS, VOCABULARY, SENTENCES, ALL_ITEMS, getSubsections, resolveSubsections,
  getExampleSentence, classifyVocab,
} from '../frontend/src/config/gameConfig'

let fail = 0
const ok = (c: boolean, label: string, detail = '') => {
  if (c) console.log('  ✅', label)
  else { fail++; console.log('  ❌', label, detail) }
}

console.log('\n[1] 词库构成')
ok(VOCABULARY.length === 66, `词汇 66 条`, String(VOCABULARY.length))
ok(SENTENCES.length === 50, `句子 50 条`, String(SENTENCES.length))
ok(ALL_ITEMS.length === 116, `合计 116 条`, String(ALL_ITEMS.length))
const words = VOCABULARY.filter(v => v.type === 'word')
const phrases = VOCABULARY.filter(v => v.type === 'phrase')
ok(words.length === 50 && phrases.length === 16, `单词 50 · 短语 16`, `${words.length}/${phrases.length}`)

console.log('\n[2] 旧占位内容已清除')
ok(!ALL_ITEMS.some(v => v.en === 'robot'), '旧的 robot 等通用词已删')
ok(!ALL_ITEMS.some(v => v.en === 'music'), '旧的 music 已删')
ok(!ALL_ITEMS.some(v => v.en.includes('I can see a')), '占位例句模板未进词库')
// getExampleSentence 对单词不再返回假例句
const w0 = VOCABULARY[0]
ok(getExampleSentence(w0) === '', '单词无例句时返回空串（不再造假句）', getExampleSentence(w0))

console.log('\n[3] 关卡编排 12 关')
ok(LEVELS.length === 12, `共 12 关`, String(LEVELS.length))
const wordLv = LEVELS.filter(l => l.name.startsWith('单词'))
const phraseLv = LEVELS.filter(l => l.name.startsWith('短语'))
const sentLv = LEVELS.filter(l => l.name.startsWith('句子'))
ok(wordLv.length === 5, `单词关 5 个`, String(wordLv.length))
ok(phraseLv.length === 2, `短语关 2 个`, String(phraseLv.length))
ok(sentLv.length === 5, `句子关 5 个`, String(sentLv.length))

console.log('\n[4] 关卡内容归属正确')
for (const l of wordLv) {
  const items = l.wordIds.map(id => VOCABULARY.find(v => v.id === id)!).filter(Boolean)
  ok(items.every(i => i.type === 'word'), `${l.name} 全是单词`, items.map(i => i.type).join(','))
}
for (const l of phraseLv) {
  const items = l.wordIds.map(id => VOCABULARY.find(v => v.id === id)!).filter(Boolean)
  ok(items.every(i => i.type === 'phrase'), `${l.name} 全是短语`, items.map(i => i.type).join(','))
}
for (const l of sentLv) {
  const items = l.wordIds.map(id => SENTENCES.find(v => v.id === id)!).filter(Boolean)
  ok(items.length === l.wordIds.length, `${l.name} 全部命中句子（${items.length}/${l.wordIds.length}）`)
  ok(items.every(i => i.type === 'sentence'), `${l.name} 类型正确`)
}

console.log('\n[5] 覆盖完整性（无遗漏无重复）')
const usedWords = new Set(LEVELS.flatMap(l => l.wordIds))
const allWordIds = VOCABULARY.map(v => v.id)
const allSentIds = SENTENCES.map(v => v.id)
// 词汇 id 与句子 id 空间独立，关卡按类型取
const coveredWords = allWordIds.filter(id => wordLv.some(l => l.wordIds.includes(id)))
const coveredPhrases = allWordIds.filter(id => phraseLv.some(l => l.wordIds.includes(id)))
const coveredSent = allSentIds.filter(id => sentLv.some(l => l.wordIds.includes(id)))
ok(coveredWords.length === words.length, `单词全覆盖 ${coveredWords.length}/${words.length}`)
ok(coveredPhrases.length === phrases.length, `短语全覆盖 ${coveredPhrases.length}/${phrases.length}`)
ok(coveredSent.length === SENTENCES.length, `句子全覆盖 ${coveredSent.length}/${SENTENCES.length}`)

console.log('\n[6] 小节玩法')
ok(getSubsections(1).length === 2, '单词关 2 小节（无例句填空）', String(getSubsections(1).length))
ok(getSubsections(1).every(s => s.type === 'match' || s.type === 'spell'), '单词关只有消消+拼写')
ok(getSubsections(6).length === 3, '短语关 3 小节', String(getSubsections(6).length))
ok(getSubsections(8).length === 2, '句子关 2 小节', String(getSubsections(8).length))
ok(getSubsections(8).every(s => s.type === 'cloze'), '句子关都是挖空')
ok(!getSubsections(1).some(s => s.label.includes('例句填空')), '单词关不再有「例句填空」')
// resolveSubsections 与 getSubsections 一致
ok(
  JSON.stringify(resolveSubsections(LEVELS[0], ALL_ITEMS)) === JSON.stringify(getSubsections(1)),
  'resolveSubsections 与 getSubsections 一致（单词关）',
)
ok(
  JSON.stringify(resolveSubsections(LEVELS[7], ALL_ITEMS)) === JSON.stringify(getSubsections(8)),
  'resolveSubsections 与 getSubsections 一致（句子关）',
)

console.log('\n[7] 挖空数据可用性')
const withBlanks = SENTENCES.filter(s => s.blanks.length > 0)
ok(withBlanks.length >= 35, `有挖空候选的句子 ${withBlanks.length}/50`, String(withBlanks.length))
let blankBad = 0
for (const s of withBlanks) {
  for (const b of s.blanks) {
    if (b.display.replace('___', b.token) !== s.en) blankBad++
    if (!b.display.includes('___')) blankBad++
  }
}
ok(blankBad === 0, '所有挖空 display 还原后等于原句', String(blankBad))
// 挖空的词必须在词库里
const inVocab = withBlanks.every(s => s.blanks.every(b =>
  VOCABULARY.some(v => v.en.toLowerCase() === b.wordEn.toLowerCase())))
ok(inVocab, '挖空的词都能对应到词库词条')

console.log('\n[8] 单元字段保留（将来按单元编排）')
ok(VOCABULARY.every(v => v.unit >= 1 && v.unit <= 5), '词汇保留 unit 字段')
ok(SENTENCES.every(v => v.unit >= 1 && v.unit <= 5), '句子保留 unit 字段')
const u1 = VOCABULARY.filter(v => v.unit === 1)
ok(u1.length === 15, `U1 词汇 15 条`, String(u1.length))

console.log(fail === 0 ? '\n全部通过 ✅' : `\n${fail} 项失败 ❌`)
process.exit(fail ? 1 : 0)
