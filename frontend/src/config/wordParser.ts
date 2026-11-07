import type { VocabItem, LevelConfig, VocabType } from './gameConfig'
import { classifyVocab } from './gameConfig'

export interface PreviewItem {
  index: number
  /** 用户填写的序号（模板第一列）。用于核对条数、查漏 */
  seq?: number
  en: string
  zh: string
  type: VocabType
  sentence?: string
  confidence: 'high' | 'low'
  /** 低置信原因，供预览表提示 */
  note?: string
  original: string
}

export interface PreviewResult {
  items: PreviewItem[]
  errors: string[]
  dupCount: number
  typeCounts: { word: number; phrase: number; sentence: number }
  /** 是否识别到表头（列含义由表头决定） */
  hasHeader: boolean
  /** 序号缺口：例如用户填了 1,2,4 → 缺 3 */
  seqGaps: number[]
  /** 识别到的序号区间 */
  seqRange?: { from: number; to: number }
}

export interface FinalResult {
  vocab: VocabItem[]
  levels: LevelConfig[]
  errors: string[]
  dupCount: number
  successCount: number
}

/* ══════════════════════════════════════════════════════════════
   v3 解析架构：先切列 → 再分配角色
   ────────────────────────────────────────────────────────────
   v2 的做法是「整行清洗 → 找 CJK 边界切两半」，有两个硬伤：
     ① 用原文的 CJK 下标去切清洗后的字符串（两者索引不对齐，
        清洗会删字符）→ "I pack my schoolbag. 我整理书包。" 会被
        切成 "i pack my schoolbag 我" / "整理书包"
     ② 括号/音标/斜杠多拼处理完，词条可能被清空 → 整行报废
   v3 改为按「列」解析：先切列（引号感知），再按表头或内容
   特征给每列分配角色（序号/英文/例句/中文），最后对每一列
   单独做轻量清洗。索引始终在同一个字符串内，不会错位。
   ══════════════════════════════════════════════════════════════ */

/* ── 字符集 ── */

const CJK_RE = /[㐀-鿿豈-﫿]/
const LATIN_RE = /[a-zA-Z]/
const PURE_NUM_RE = /^\d+$/

/* 列角色 */
type Role = 'seq' | 'en' | 'sentence' | 'zh'

/* 表头词表：精确匹配。同一角色不允许出现两次（避免 "word 意思" 这类真实数据被误判） */
const HEADER_TOKENS: Record<string, Role> = {
  /* 序号 */
  '序号': 'seq', '编号': 'seq', 'no': 'seq', 'num': 'seq', 'index': 'seq', 'seq': 'seq',
  /* 英文 */
  '英文': 'en', '英文单词': 'en', '单词': 'en', '词': 'en',
  'english': 'en', 'word': 'en', 'words': 'en',
  /* 例句 */
  '短语例句': 'sentence', '例句': 'sentence', '句子': 'sentence',
  'sentence': 'sentence', 'example': 'sentence', 'examples': 'sentence',
  /* 中文 */
  '中文': 'zh', '中文翻译': 'zh', '翻译': 'zh', '释义': 'zh', '意思': 'zh', '译文': 'zh',
  'chinese': 'zh', 'meaning': 'zh', 'translation': 'zh',
}

/* ── 切列（引号感知） ── */

/** 按逗号/制表符切列。引号内的分隔符不切，"" 转义为 " */
export function splitColumns(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ }
        else quoted = false
      } else cur += ch
      continue
    }
    if (ch === '"') { quoted = true; continue }
    if (ch === ',' || ch === '\t') { cells.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  cells.push(cur.trim())
  return cells
}

/* ── 清洗 ── */

const OPEN_BRACKETS = '（(《〈【〔〖「『[{'
const CLOSE_BRACKETS = '）)》〉】〕〗」』]}]'

/** 去掉括号及其内部内容（中文释义里的补充说明一并去掉） */
function stripBrackets(s: string): string {
  let out = ''
  let depth = 0
  for (const ch of s) {
    if (OPEN_BRACKETS.includes(ch)) { depth++; continue }
    if (CLOSE_BRACKETS.includes(ch)) { if (depth > 0) depth--; continue }
    if (depth === 0) out += ch
  }
  return out
}

/** 拉丁片段清洗：保留字母数字、词内撇号/连字符、句读。去掉括号、音标、斜杠多拼、词性标注 */
function cleanLatin(seg: string): string {
  let s = seg
  // 行首编号：1. robot / 2) robot / 3、robot
  s = s.replace(/^\s*\d+[\.\)、．\s]+/, '')
  // 斜杠多拼：color/colour → color（必须在音标规则之前）
  s = s.replace(/\b([a-zA-Z]+)\/([a-zA-Z]+)\b/g, '$1')
  s = stripBrackets(s)
  // 音标 /ˈæpəl/
  s = s.replace(/\/[^\/\s]{2,}\//g, ' ')
  // 词性标注：n. / v. / adj.（必须带句点，避免误删 "art" 这类正常单词）
  s = s.replace(/\s+(n|v|vi|vt|adj|adv|det|prep|pron|conj|num|art|int|aux|pl|abbr)\.\s*/gi, ' ')
  // 保留：拉丁字母、数字、空格、词内撇号/连字符、句读
  s = s.replace(/[^A-Za-z0-9À-ɏ\s'’\-.,!?]/g, ' ')
  s = s.replace(/[ \t]+/g, ' ').trim()
  return s
}

/** 中文片段清洗：保留汉字、字母数字、空格与中文标点 */
function cleanZh(seg: string): string {
  let s = stripBrackets(seg)
  s = s.replace(/[^㐀-鿿豈-﫿A-Za-z0-9\s，。、；：！？（）「」『』·%．,.;:!?'"()\-]/g, ' ')
  s = s.replace(/[ \t]+/g, ' ').trim()
  // 只剥首尾的分隔符，保留句末的 。！？ （中文句子本来就带句号）
  s = s.replace(/^[\s，、；：,;:]+/, '').replace(/[\s，、；：,;:]+$/, '')
  return s
}

/** 去掉首尾的句读（保留中间的） */
function trimEdgePunctuation(s: string): string {
  return s.replace(/^[\s.,!?;:'"’]+/, '').replace(/[\s]+$/, '')
}

function hasCJK(s: string): boolean { return CJK_RE.test(s) }
function hasLatin(s: string): boolean { return LATIN_RE.test(s) }
function wordCount(s: string): number { return s.split(/\s+/).filter(Boolean).length }

/* ── 表头识别 ── */

function normalizeHeaderCell(cell: string): string {
  return cell.trim().toLowerCase().replace(/[：:]+$/, '').replace(/\.$/, '')
}

/**
 * 判断一行是不是表头。
 * 规则：所有非空单元格都能映射到已知角色、角色互不重复、且至少 3 个角色
 * （2 个角色时必须含 seq，否则 "word 意思" 这类真实数据会被误判成表头）
 */
function detectHeader(cells: string[]): Role[] | null {
  const roles: Role[] = []
  const seen = new Set<Role>()
  let count = 0
  for (const cell of cells) {
    if (!cell.trim()) { roles.push('seq'); continue }  // 空列占位（保持下标对齐）
    const role = HEADER_TOKENS[normalizeHeaderCell(cell)]
    if (!role) return null
    if (seen.has(role)) return null
    seen.add(role)
    roles.push(role)
    count++
  }
  if (count < 3) return null
  if (count === 2 && !seen.has('seq')) return null
  return roles
}

/* ── 自由文本切分（空格分隔的课本粘贴） ── */

interface RawPair {
  en: string
  zh: string
  sentence?: string
  endsWithSentenceMark: boolean
}

const SENTENCE_RE = /^[A-Za-z0-9][A-Za-z0-9 ',.!?\-'’]*$/

function looksLikeSentence(s: string): boolean {
  const t = s.trim()
  if (t.length < 8) return false
  if (!SENTENCE_RE.test(t)) return false
  return wordCount(t) >= 3
}

/**
 * 自由文本切分：在「原文」上找 CJK 边界切三段（拉丁头 / 中文块 / 拉丁尾），
 * 然后对每段单独清洗。索引始终在同一个字符串内，不会像 v2 那样错位。
 *
 * 两种语序：
 *   英文在前  apple 苹果           → en=apple, zh=苹果
 *   中文在前  苹果 apple           → en=apple, zh=苹果
 *   英文在前带例句  dog 狗 The dog runs. → en=dog, zh=狗, sentence=The dog runs.
 */
function splitFreeText(line: string): RawPair | null {
  const firstCjk = line.search(CJK_RE)
  if (firstCjk < 0) return null

  if (firstCjk === 0) {
    // 中文在前：拉丁部分整体就是词条（与 v2 行为一致）
    const m = LATIN_RE.exec(line)
    if (!m || m.index === 0) return null
    const zh = cleanZh(line.slice(0, m.index))
    if (!zh) return null
    const en = cleanLatin(line.slice(m.index))
    if (!en) return null
    return { en, zh, sentence: undefined, endsWithSentenceMark: /[.!?]["')\]]*$/.test(en) }
  }

  // 英文在前：拉丁头是词条，中文块之后若还有拉丁内容，可能是例句
  const zhBlock = zhBlockOf(line, firstCjk)
  const zh = cleanZh(zhBlock)
  if (!zh) return null
  const zhEnd = firstCjk + zhBlock.length
  const en = cleanLatin(line.slice(0, firstCjk))
  const tail = cleanLatin(line.slice(zhEnd).replace(/^[\s,，;；、]+/, ''))

  let sentence: string | undefined
  if (tail && looksLikeSentence(tail)) sentence = tail
  if (!en) {
    // 没有拉丁头（可能是纯中文开头），退回用尾部当词条
    if (!sentence) return null
    return { en: sentence, zh, sentence: undefined, endsWithSentenceMark: true }
  }
  return { en, zh, sentence, endsWithSentenceMark: /[.!?]["')\]]*$/.test(en) }
}

/**
 * 取出从 firstCjk 开始的中文块（含末尾的中文标点，如「我整理书包。」）。
 * 遇到第一个非中文、非中文标点的字符就停。
 */
function zhBlockOf(line: string, firstCjk: number): string {
  let end = firstCjk
  for (let i = firstCjk; i < line.length; i++) {
    const ch = line[i]
    if (CJK_RE.test(ch)) { end = i + 1; continue }
    if ('。！？，、；：）」』】》'.includes(ch)) { end = i + 1; continue }
    break
  }
  return line.slice(firstCjk, end)
}

/* ── 列模式：给各列分配角色 ── */

interface ColumnSlots {
  seq?: string
  en?: string
  sentence?: string
  zh?: string
}

/**
 * 无表头时的内容特征分配：
 *   ① 首列纯数字 → 序号（需至少 3 列，避免 "7,七" 这类数字词条被吃掉）
 *   ② 每个单元格按内容分三类：
 *      · 纯中文 → 中文候选
 *      · 纯拉丁 → 英文/例句候选
 *      · 中英混合 → 按自由文本再切一刀（PDF 粘贴常见："apple 苹果"）
 *   ③ 中文取「纯中文」优先，其次混合单元格里的中文
 *   ④ 英文取词数少的那个，其余词数多的、像句子的 → 例句
 */
function assignByContent(cells: string[]): ColumnSlots {
  const slots: ColumnSlots = {}
  let rest = cells

  if (rest.length >= 3 && PURE_NUM_RE.test(rest[0])) {
    slots.seq = rest[0]
    rest = rest.slice(1)
  }

  const zhCandidates: string[] = []
  const enCandidates: string[] = []

  for (const cell of rest) {
    if (!cell.trim()) continue
    const hasC = hasCJK(cell)
    const hasL = hasLatin(cell)
    if (hasC && hasL) {
      // 混合格：按自由文本切分，拆出英文与中文
      const ft = splitFreeText(cell)
      if (ft) {
        enCandidates.push(ft.en)
        if (ft.zh) zhCandidates.push(ft.zh)
      } else {
        enCandidates.push(cleanLatin(cell))
      }
    } else if (hasC) {
      zhCandidates.push(cell)
    } else if (hasL) {
      enCandidates.push(cell)
    }
  }

  if (zhCandidates.length > 0) slots.zh = zhCandidates[0]
  if (enCandidates.length > 0) {
    // 英文 = 词数最少的候选；例句 = 词数最多且像句子的那个
    let minIdx = 0
    for (let i = 1; i < enCandidates.length; i++) {
      if (wordCount(enCandidates[i]) < wordCount(enCandidates[minIdx])) minIdx = i
    }
    slots.en = enCandidates[minIdx]

    if (enCandidates.length >= 2) {
      let maxIdx = minIdx
      for (let i = 0; i < enCandidates.length; i++) {
        if (wordCount(enCandidates[i]) > wordCount(enCandidates[maxIdx])) maxIdx = i
      }
      if (maxIdx !== minIdx) {
        const cand = cleanLatin(enCandidates[maxIdx])
        if (looksLikeSentence(cand)) slots.sentence = cand
      }
    }
  }

  return slots
}

/* ── 类型判定 ── */

/**
 * 解析结果的类型判定（比 gameConfig.classifyVocab 多一层句子保护）：
 *   ① 带句末标点且 ≥3 词 → 句子（"I pack my schoolbag."）
 *   ② ≥6 词 → 句子（漏了句号的长句）
 *   ③ ≥2 词 → 短语
 *   ④ 其余 → 单词
 * 「apple.」这种单词带句点不算句子。
 */
function classifyParsed(en: string): VocabType {
  const t = en.trim()
  const n = wordCount(t)
  const hasMark = /[.!?]$/.test(t)
  if (hasMark && n >= 3) return 'sentence'
  if (n >= 6) return 'sentence'
  if (n >= 2) return 'phrase'
  return 'word'
}

/* ── 单行解析 ── */

interface ParsedRow {
  en: string
  zh: string
  sentence?: string
  seq?: number
}

/** 从一段拉丁文本里剥掉「句末标点」——但只有 ≥3 词才保留（单词带句点视为误输入） */
function normalizeEntry(en: string): { en: string; hadMark: boolean } {
  const t = en.trim()
  const hasMark = /[.!?]$/.test(t)
  if (hasMark && wordCount(t) >= 3) return { en: t, hadMark: true }
  return { en: trimEdgePunctuation(t).replace(/[.!?]+$/, '').trim(), hadMark: false }
}

function parseRow(line: string, headerRoles: Role[] | null): ParsedRow | null {
  const cells = splitColumns(line)

  // 单列 → 走自由文本路径
  if (cells.length === 1) {
    const ft = splitFreeText(line)
    if (!ft) return null
    const norm = normalizeEntry(ft.en)
    const en = norm.en
    if (!en) return null
    return {
      en,
      zh: ft.zh,
      sentence: ft.sentence,
      seq: undefined,
    }
  }

  let slots: ColumnSlots
  if (headerRoles) {
    // 有表头：列位置权威
    slots = {}
    headerRoles.forEach((role, i) => {
      const cell = cells[i] ?? ''
      if (role === 'seq') slots.seq = cell
      else if (role === 'en') slots.en = cell
      else if (role === 'sentence') slots.sentence = cell
      else if (role === 'zh') slots.zh = cell
    })
    // 表头声明了列但数据行缺列 → 退回内容特征
    if (!slots.zh || !slots.en) {
      const guess = assignByContent(cells)
      slots = { ...guess, ...slots }
      if (!slots.zh) slots.zh = guess.zh
      if (!slots.en) slots.en = guess.en
    }
  } else {
    slots = assignByContent(cells)
  }

  const zh = slots.zh ? cleanZh(slots.zh) : ''
  if (!zh) return null

  const rawEn = slots.en ? cleanLatin(slots.en) : ''
  if (!rawEn) return null
  const norm = normalizeEntry(rawEn)

  // 例句：清洗但保留原始大小写与句末标点
  let sentence: string | undefined
  if (slots.sentence) {
    const s = cleanLatin(slots.sentence).replace(/^[\s,，;；、]+/, '').trim()
    if (s) sentence = s
  }

  let seq: number | undefined
  if (slots.seq && PURE_NUM_RE.test(slots.seq.trim())) {
    seq = parseInt(slots.seq.trim(), 10)
  }

  return { en: norm.en, zh, sentence, seq }
}

/* ── Public API ── */

export function previewParse(text: string): PreviewResult {
  const rawLines = text.split(/[\n\r]+/)
  const items: PreviewItem[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  let dupCount = 0
  const typeCounts = { word: 0, phrase: 0, sentence: 0 }
  let hasHeader = false
  let headerRoles: Role[] | null = null
  const seqSeen: number[] = []

  for (const rawLine of rawLines) {
    const line = rawLine.trim()
    if (!line) continue

    // 表头只在前 3 行里找（避免正文里的 "英文,中文" 被误判）
    if (!headerRoles && items.length === 0 && errors.length === 0) {
      const cells = splitColumns(line)
      if (cells.length >= 2) {
        const roles = detectHeader(cells)
        if (roles) {
          headerRoles = roles
          hasHeader = true
          continue
        }
      }
    }

    if (line.length < 2) continue

    const row = parseRow(line, headerRoles)
    if (!row) {
      const preview = line.length > 40 ? line.slice(0, 40) + '…' : line
      errors.push(preview)
      continue
    }

    const key = row.en.toLowerCase()
    if (seen.has(key)) { dupCount++; continue }
    seen.add(key)

    const type = classifyParsed(row.en)
    const n = wordCount(row.en)
    let note: string | undefined
    if (type === 'word' && n > 14) note = '词条偏长'
    else if (type === 'phrase' && n > 4) note = '短语偏长'
    else if (type === 'sentence' && n > 12) note = '句子偏长'
    else if (row.zh.length > 10) note = '中文释义偏长'
    else if (row.sentence && !row.sentence.toLowerCase().includes(row.en.toLowerCase())) {
      note = '例句里没有这个词，填空题会退回挖词条'
    }

    const confidence: 'high' | 'low' = note ? 'low' : 'high'
    typeCounts[type]++
    if (row.seq !== undefined) seqSeen.push(row.seq)

    items.push({
      index: items.length,
      seq: row.seq,
      en: row.en,
      zh: row.zh,
      type,
      sentence: row.sentence,
      confidence,
      note,
      original: line.slice(0, 60),
    })
  }

  // 序号查漏：1..max 中缺失的号
  let seqGaps: number[] = []
  let seqRange: { from: number; to: number } | undefined
  if (seqSeen.length > 0) {
    const sorted = [...seqSeen].sort((a, b) => a - b)
    const from = sorted[0]
    const to = sorted[sorted.length - 1]
    seqRange = { from, to }
    const present = new Set(seqSeen)
    for (let i = from; i <= to; i++) {
      if (!present.has(i)) seqGaps.push(i)
    }
  }

  return { items, errors, dupCount, typeCounts, hasHeader, seqGaps, seqRange }
}

export function finalizeImport(preview: PreviewResult): FinalResult {
  const vocab: VocabItem[] = preview.items.map((item, i) => ({
    id: i + 1,
    en: item.en,
    zh: item.zh,
    type: item.type,
    sentence: item.sentence,
    seq: item.seq,
  }))
  const messages = [...preview.errors]
  if (preview.dupCount > 0) messages.push(`已跳过 ${preview.dupCount} 个重复词条`)
  if (vocab.length < 2) {
    return { vocab: [], levels: [], errors: [...messages, '至少需要 2 个词条才能生成关卡'], dupCount: preview.dupCount, successCount: 0 }
  }
  const levels = generateLevels(vocab)
  return { vocab, levels, errors: messages, dupCount: preview.dupCount, successCount: vocab.length }
}

/* ── Level generation v2: route by type ── */
/* 单词 → 单词关（每 10 词，消消乐+拼写+例句完形）；短语+句子 → 运用关（完形家族） */

export function generateLevels(vocab: VocabItem[]): LevelConfig[] {
  const words = vocab.filter(v => (v.type ?? classifyVocab(v.en)) === 'word')
  const others = vocab.filter(v => (v.type ?? classifyVocab(v.en)) !== 'word')
  const levels: LevelConfig[] = []

  const WORDS_PER_LEVEL = 10
  for (let i = 0, lid = 1; i < words.length; i += WORDS_PER_LEVEL, lid++) {
    const chunk = words.slice(i, i + WORDS_PER_LEVEL)
    if (chunk.length < 2) break
    const cols = chunk.length <= 6 ? 2 : 3
    const rows = Math.ceil(chunk.length / cols)
    const name = chunk.slice(0, 3).map(v => v.zh).join('、') + (chunk.length > 3 ? '…' : '')
    levels.push({ id: lid, name, cols, rows, wordIds: chunk.map(v => v.id) })
  }

  const APPLY_PER_LEVEL = 15
  const applyGroupCount = Math.ceil(others.length / APPLY_PER_LEVEL)
  for (let i = 0, gid = 0; i < others.length; i += APPLY_PER_LEVEL, gid++) {
    const chunk = others.slice(i, i + APPLY_PER_LEVEL)
    if (chunk.length < 2) break
    const name = applyGroupCount > 1 ? `运用 ${'①②③④⑤⑥⑦⑧⑨⑩'[gid] ?? gid + 1}` : '短语与句子'
    const cols = 2
    const rows = Math.ceil(chunk.length / cols)
    levels.push({ id: levels.length + 1, name, cols, rows, wordIds: chunk.map(v => v.id) })
  }

  return levels
}

/* ── Legacy compat + helpers ── */

export function parseWordText(text: string) {
  const preview = previewParse(text)
  const final = finalizeImport(preview)
  return { vocab: final.vocab, levels: final.levels, errors: final.errors }
}

/**
 * CSV 模板：四列（序号 / 英文单词 / 短语例句 / 中文翻译）
 * 首行是表头，用户填数据时删掉表头行（表头行不会被当成词条解析）。
 * 示例行覆盖四种形态：单词+例句 / 单词无例句 / 短语 / 完整句子。
 */
export function generateCsvTemplate(): string {
  return (
    '序号,英文单词,短语例句,中文翻译\n' +
    '1,apple,I eat an apple every day.,苹果\n' +
    '2,cat,The cat is cute.,猫\n' +
    '3,dog,,狗\n' +
    '4,feed the cows,,喂奶牛\n' +
    '5,My mum is a great cook.,,我的妈妈是一位超棒的厨师\n'
  )
}

/** 下载 CSV 模板（首页与导入弹窗共用一份实现） */
export function downloadCsvTemplate() {
  const csv = generateCsvTemplate()
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'word_template.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export const CUSTOM_VOCAB_KEY = 'wordblast_custom_v1'
