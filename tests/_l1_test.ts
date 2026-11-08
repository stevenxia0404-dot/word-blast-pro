// L1 迁移与配置层业务测试（临时验证脚本）
import { migrateSave, mergeLevelResults } from '../frontend/src/config/saveSchema'
import { getTitle, getSubsections, resolveSubsections, LEVELS, VOCABULARY, SENTENCES, ALL_ITEMS } from '../frontend/src/config/gameConfig'

let fail = 0
const ok = (cond: boolean, label: string, extra = '') => {
  if (!cond) { fail++; console.log('FAIL:', label, extra) }
}

// ---- 1. 13 关老存档 → 12 关新结构 ----
const old13 = {
  phase: 'playing',
  levelIndex: 12,
  subsectionIndex: 1,
  totalScore: 4200,
  combo: 3,
  levelResults: Array.from({ length: 13 }, (_, i) => ({ stars: (i % 3) + 1, accuracy: 60 + i, score: 100 * (i + 1) })),
  subsectionScore: 100, subsectionCorrect: 1, subsectionAttempts: 1,
}
const m = migrateSave(old13, { totalLevels: 12, usingCustom: false })!
ok(m.version === 2, 'version=2')
ok(m.levelResults.length === 12, 'results length 12', String(m.levelResults.length))
ok(m.levelResults[0].score === 100 && m.levelResults[9].score === 1000, 'L1-L10 原样保留')
ok(m.levelResults[10].stars === Math.max(old13.levelResults[10].stars, old13.levelResults[11].stars), '合并关星级取高')
ok(m.levelResults[10].score === old13.levelResults[10].score + old13.levelResults[11].score, '合并关分数求和')
ok(m.levelResults[11].score === old13.levelResults[12].score, '旧L13 → 新L12')
ok(m.levelIndex === 11, 'levelIndex 12 → 11', String(m.levelIndex))
ok(m.totalScore === 4200 && m.phase === 'playing', '分数与 phase 保留')

// levelIndex 各档映射
ok(migrateSave({ ...old13, levelIndex: 9 }, { totalLevels: 12, usingCustom: false })!.levelIndex === 9, 'index 9 → 9')
ok(migrateSave({ ...old13, levelIndex: 10 }, { totalLevels: 12, usingCustom: false })!.levelIndex === 10, 'index 10 → 10')
ok(migrateSave({ ...old13, levelIndex: 11 }, { totalLevels: 12, usingCustom: false })!.levelIndex === 10, 'index 11 → 10')

// ---- 2. 幂等 ----
const again = migrateSave(m, { totalLevels: 12, usingCustom: false })!
ok(JSON.stringify(again) === JSON.stringify(m), '幂等：二次迁移结果一致')

// ---- 3. 脏数据不崩 ----
const dirty = migrateSave({ levelResults: 'x', levelIndex: 'abc', totalScore: null }, { totalLevels: 12, usingCustom: false })!
ok(dirty !== null && dirty.levelResults.length === 0 && dirty.levelIndex === 0 && dirty.totalScore === 0, '脏数据兜底')
ok(migrateSave(null, { totalLevels: 12, usingCustom: false }) === null, 'null → null（全新开始）')
ok(migrateSave('garbage', { totalLevels: 12, usingCustom: false }) === null, '字符串 → null')

// ---- 4. 自定义词库分支：位置保留 + 越界裁剪 ----
const custom = migrateSave({ ...old13, levelIndex: 20 }, { totalLevels: 5, usingCustom: true })!
ok(custom.levelResults.length === 5, '自定义：results 截断到 totalLevels')
ok(custom.levelIndex === 4, '自定义：index clamp 到末关', String(custom.levelIndex))

// ---- 5. 称号双来源 ----
ok(getTitle(0, 500).name === '英语小苗', '口语分也能挣称号')
ok(getTitle(500, 0).name === '英语小苗', '闯关分照常')
ok(getTitle(3000, 2000).name === '单词大王', '两分之和判定')
ok(getTitle(0).name === '英语小芽', '默认第一档')

// ---- 6. 内建 12 关：resolveSubsections 必须与 getSubsections 完全一致 ----
// 注意：必须传 ALL_ITEMS（含句子）——句子 id 在 1000+ 空间，只传 VOCABULARY 找不到句子
for (const lv of LEVELS) {
  const a = JSON.stringify(getSubsections(lv.id))
  const b = JSON.stringify(resolveSubsections(lv, ALL_ITEMS))
  ok(a === b, `L${lv.id} 玩法一致`, `${a} vs ${b}`)
}

// ---- 7. 自定义关卡（id>13）按内容判定 ----
// id 动态取，词库换了测试也不会失效
const firstWord = VOCABULARY.find(v => v.type === 'word')!.id
const firstPhrase = VOCABULARY.find(v => v.type === 'phrase')!.id
const firstSentence = SENTENCES[0].id
const fakeLevel = { id: 20, name: 'x', cols: 2, rows: 2, wordIds: [firstWord, firstWord + 1, firstWord + 2] }
const wordLv = resolveSubsections(fakeLevel, ALL_ITEMS)
ok(wordLv[0].type === 'match', '自定义单词关 → 消消乐')
const phraseLv = resolveSubsections({ ...fakeLevel, wordIds: [firstPhrase, firstPhrase + 1] }, ALL_ITEMS)
ok(phraseLv[0].type === 'cloze' && phraseLv[1].type === 'wordSelect', '自定义短语关 → 完形家族')
const sentLv = resolveSubsections({ ...fakeLevel, wordIds: [firstSentence, firstSentence + 1] }, ALL_ITEMS)
ok(sentLv[0].type === 'cloze' && sentLv.length === 2, '自定义句子关 → 句子挖空')
ok(resolveSubsections(undefined, ALL_ITEMS).length === 0, 'undefined 关卡 → 空')
ok(resolveSubsections({ ...fakeLevel, wordIds: [999999] }, ALL_ITEMS).length === 0, '词条全缺 → 空')

console.log(fail === 0 ? 'L1 全部通过 ✅' : `${fail} 项失败 ❌`)
process.exit(fail ? 1 : 0)
