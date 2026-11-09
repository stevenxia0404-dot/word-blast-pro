import { VOCAB_3A_WORDS, VOCAB_3A_SENTENCES } from './vocab3a'
import type { Vocab3aWord, Vocab3aSentence } from './vocab3a'

export type VocabType = 'word' | 'phrase' | 'sentence'

export interface VocabItem {
  id: number
  en: string
  zh: string
  /** 词条类型：单词 / 短语 / 句子。旧存档缺省时按 en 推导，无需手填 */
  type?: VocabType
  /** 例句（例句完形的语境）。缺省时：单词走占位句、短语/句子用自身；正式例句由内容资料替换 */
  sentence?: string
  /** 用户在导入表格里填的序号，用于核对条数、查漏。旧存档缺省 */
  seq?: number
}

/** 句子的一个可挖空位置：答案取句中原词（tomatoes 而非 tomato） */
export interface SentenceBlank {
  /** 句中被挖掉的词（保留原大小写） */
  token: string
  /** 正确答案 = token */
  answer: string
  /** 对应到词库里的词条（可能是复数/动名词形态的原形） */
  wordEn: string
  /** 该词条的中文 */
  zh: string
  /** 挖空后的整句（___ 位置已就位） */
  display: string
}

/** 词条分类：句末标点 → 句子；含空格 → 短语；其余 → 单词（解析层共用） */
export function classifyVocab(en: string): VocabType {
  if (/[.!?]$/.test(en.trim())) return 'sentence'
  if (/\s/.test(en)) return 'phrase'
  return 'word'
}

export interface LevelConfig {
  id: number
  name: string
  cols: number
  rows: number
  wordIds: number[]
}

export interface TitleDef {
  name: string
  emoji: string
  minScore: number
}

/* ── 词库：3A 教材 Unit 1-5（自动生成，见 vocab3a.ts） ── */


/** 词汇（单词 + 短语）：66 条 */
export const VOCABULARY: Vocab3aWord[] = VOCAB_3A_WORDS

/** 教材句子：50 条，带预计算的挖空位置 */
export const SENTENCES: Vocab3aSentence[] = VOCAB_3A_SENTENCES

/** 全部词条（词汇 + 句子）：跟读模块、音频生成都用它 */
export const ALL_ITEMS: (Vocab3aWord | Vocab3aSentence)[] = [...VOCABULARY, ...SENTENCES]

/* ── 关卡编排（12 关） ──
 * 单词关 ×5（50 词，每关 10）→ 消消乐 + 字母拼写
 * 短语关 ×2（16 短语，每关 8）→ 短语完形 + 选词拼短语
 * 句子关 ×5（50 句，每关 10）→ 句子挖空 + 换一批挖
 *
 * 关卡名暂用单元名（Unit 1-5）+ 类型。将来讨论单元编排时，
 * 只需改这里，不用重新导入资料（词库已保留 unit 字段）。
 */
const WORD_LEVELS = 5
const PHRASE_LEVELS = 2
const SENTENCE_LEVELS = 5
const PER_WORD_LEVEL = 10
const PER_PHRASE_LEVEL = 8
const PER_SENTENCE_LEVEL = 10

export const LEVELS: LevelConfig[] = (() => {
  const out: LevelConfig[] = []
  const words = VOCABULARY.filter(w => w.type === 'word')
  const phrases = VOCABULARY.filter(w => w.type === 'phrase')

  for (let i = 0; i < WORD_LEVELS; i++) {
    const chunk = words.slice(i * PER_WORD_LEVEL, (i + 1) * PER_WORD_LEVEL)
    if (chunk.length === 0) break
    out.push({
      id: out.length + 1,
      name: `单词 ${i + 1}`,
      cols: 3, rows: 4,
      wordIds: chunk.map(w => w.id),
    })
  }
  for (let i = 0; i < PHRASE_LEVELS; i++) {
    const chunk = phrases.slice(i * PER_PHRASE_LEVEL, (i + 1) * PER_PHRASE_LEVEL)
    if (chunk.length === 0) break
    out.push({
      id: out.length + 1,
      name: `短语 ${i + 1}`,
      cols: 2, rows: 4,
      wordIds: chunk.map(w => w.id),
    })
  }
  for (let i = 0; i < SENTENCE_LEVELS; i++) {
    const chunk = SENTENCES.slice(i * PER_SENTENCE_LEVEL, (i + 1) * PER_SENTENCE_LEVEL)
    if (chunk.length === 0) break
    out.push({
      id: out.length + 1,
      name: `句子 ${i + 1}`,
      cols: 2, rows: 5,
      wordIds: chunk.map(s => s.id),   // 句子 id 已是 1000+ 空间
    })
  }
  return out
})()

/* ── 小节类型 ── */

export type SubsectionType = 'match' | 'spell' | 'cloze' | 'wordSelect' | 'wordOrder'

export interface SubsectionDef {
  type: SubsectionType
  label: string
}

export function getSubsections(levelId: number): SubsectionDef[] {
  // 单词关（1-5）：消消乐 + 字母拼写
  // 词汇没有配对例句 → 不再有「例句填空」（曾用占位句 I can see a __. 撑场）
  if (levelId <= 5) {
    return [
      { type: 'match', label: '配对消消' },
      { type: 'spell', label: '字母拼写' },
    ]
  }
  // 短语关（6-7）
  if (levelId <= 7) {
    return [
      { type: 'cloze', label: '短语填空' },
      { type: 'wordSelect', label: '选词拼短语' },
      { type: 'cloze', label: '短语填空 · 换个空' },
    ]
  }
  // 句子关（8-12）：教材原句挖空
  return [
    { type: 'cloze', label: '句子填空' },
    { type: 'cloze', label: '句子填空 · 换个空' },
  ]
}

/** 按关卡「内容」决定玩法家族，而不是按关卡 id。
 *  内建 12 关的行为与 getSubsections 完全一致；
 *  自定义词库关卡（id 可能 >13）按实际词条类型判定，修掉玩法错位。 */
export function resolveSubsections(level: LevelConfig | undefined, vocab: VocabItem[]): SubsectionDef[] {
  if (!level) return []
  const items = level.wordIds
    .map(id => vocab.find(v => v.id === id))
    .filter((v): v is VocabItem => Boolean(v))
  if (items.length === 0) return []
  const types = items.map(v => v.type ?? classifyVocab(v.en))
  if (types.every(t => t === 'word')) {
    return [
      { type: 'match', label: '配对消消' },
      { type: 'spell', label: '字母拼写' },
    ]
  }
  if (types.includes('sentence')) {
    return [
      { type: 'cloze', label: '句子填空' },
      { type: 'cloze', label: '句子填空 · 换个空' },
    ]
  }
  return [
    { type: 'cloze', label: '短语填空' },
    { type: 'wordSelect', label: '选词拼短语' },
    { type: 'cloze', label: '短语填空 · 换个空' },
  ]
}

/* ── 例句 ──
 * 3A 教材里句子是独立词条（50 条），词汇没有配对例句 —— 不再造假占位句。
 * 无例句时返回空串，调用方据此走「挖词条自身」兜底。
 */
export function getExampleSentence(item: VocabItem): string {
  if (item.sentence) return item.sentence
  const type = item.type ?? classifyVocab(item.en)
  if (type !== 'word') return item.en
  return ''
}

/* ── 颜色主题 ── */

export const COLOR_THEMES = {
  enBg: '#eff6ff',
  enBorder: '#bfdbfe',
  enText: '#1e40af',
  zhBg: '#fff7ed',
  zhBorder: '#fed7aa',
  zhText: '#9a3412',
  selectedBg: '#84cc16',
  selectedBorder: '#a3e635',
  selectedText: '#ffffff',
  matchedBg: '#22c55e',
}

/* ── 积分规则 ── */

export const SCORE = {
  match: 100,
  spell: 100,
  comboBonus: 50,
  helpCost: [0, 300, 500, 800] as const,
  helpScore: [0, 30, 10, 0] as const,
  /* 跟读练习：首次「我会了」全额、复习小额；慢速不扣分（需要慢速是学习过程） */
  repeatFirst: 60,
  repeatReview: 10,
  /* 句子跟读分值更高：整句开口比单词难（Steven 拍板） */
  repeatSentenceFirst: 100,
  repeatSentenceReview: 15,
  /* 对话练习：首次「这句我会了」+100、复习 +15（定稿；与跟读共用一个口语分池，但各自独立防刷） */
  dialogueFirst: 100,
  dialogueReview: 15,
}

/* ── 称号 ── */

export const TITLES: TitleDef[] = [
  { name: '英语小芽', emoji: '🌱', minScore: 0 },
  { name: '英语小苗', emoji: '🌿', minScore: 500 },
  { name: '英语小树', emoji: '🌳', minScore: 1500 },
  { name: '英语学霸', emoji: '🔥', minScore: 3000 },
  { name: '单词大王', emoji: '👑', minScore: 5000 },
]

/** 称号判定：闯关分 + 口语分（跟读/对话）总和。
 *  门槛表不变，只把判定值改成两个来源相加 —— 老用户不会掉称号，口语练习也能挣称号。 */
export function getTitle(blastScore: number, spokenScore = 0): TitleDef {
  const total = blastScore + spokenScore
  let t = TITLES[0]
  for (const title of TITLES) {
    if (total >= title.minScore) t = title
  }
  return t
}

/* ── 星级评定 ── */

export function getStars(accuracy: number): number {
  if (accuracy >= 90) return 3
  if (accuracy >= 70) return 2
  return 1
}
