import type { VocabItem, LevelConfig, VocabType } from '../frontend/src/config/gameConfig'
import { classifyVocab } from '../frontend/src/config/gameConfig'

export interface PreviewItem {
  index: number
  en: string
  zh: string
  type: VocabType
  sentence?: string
  confidence: 'high' | 'low'
  original: string
}

export interface PreviewResult {
  items: PreviewItem[]
  errors: string[]
  dupCount: number
  typeCounts: { word: number; phrase: number; sentence: number }
}

export interface FinalResult {
  vocab: VocabItem[]
  levels: LevelConfig[]
  errors: string[]
  dupCount: number
  successCount: number
}

/* ── Universal cleaning pipeline ── */
/* Core idea: strip EVERYTHING except letters, CJK, spaces, then find language boundary */

// Characters to KEEP (everything else is noise)
const KEEP_RE = /[^a-zA-Z0-9㐀-鿿豈-﫿\s;；，、]/g

// All Chinese bracket variants + ASCII parens — strip content between them
const BRACKETS = /[\s]*[（(《〈【〔〖「『\(\[][^）)〉】〕〗」』\)\]\n]*[）)〉】〕〗」』\)\]]/g

// Residual POS tags after cleaning (single/double letter tokens)
const POS_TOKENS = /\b(n|v|vi|vt|adj|adv|det|prep|pron|conj|num|art|int|aux|pl|abbr)\b/gi

function cleanLine(line: string): string {
  return line
    // 1. Strip slashed alternatives early: color/colour → color
    .replace(/\b([a-zA-Z]+)\/([a-zA-Z]+)\b/g, '$1')
    // 2. Strip ALL bracket annotations BEFORE nuking characters
    .replace(BRACKETS, ' ')
    // 3. Strip phonetic transcriptions
    .replace(/\/[^\/\s]{2,}\//g, ' ')
    // 4. Strip ellipsis
    .replace(/…+/g, '')
    .replace(/\.{3,}/g, '')
    // 5. Strip leading numbering/list markers
    .replace(/^\s*\d+[\.\)、．\s]+/, '')
    // 6. Nuke everything except [a-zA-Z0-9 CJK spaces ;;，、]
    .replace(KEEP_RE, ' ')
    // 7. Strip residual POS tokens
    .replace(POS_TOKENS, ' ')
    // 8. Collapse multiple spaces
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/* Lite clean for sentence-side detection: keeps punctuation (sentence must stay verbatim) */
function liteClean(line: string): string {
  return line
    .replace(/^\s*\d+[\.\)、．\s]+/, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function hasCJK(s: string): boolean {
  return /[㐀-鿿豈-﫿]/.test(s)
}

function trimPunctuation(s: string): string {
  return s.replace(/^[,，、;；\s]+/, '').replace(/[,，、;；\s]+$/, '')
}

/* Sentence-side validation: pure Latin words, 3+ tokens, 8+ chars, punctuation kept */
const SENTENCE_RE = /^[A-Za-z0-9][A-Za-z0-9 ',.!?\-'’]*$/

function looksLikeSentence(s: string): boolean {
  const t = s.trim()
  if (t.length < 8) return false
  if (!SENTENCE_RE.test(t)) return false
  return t.split(/\s+/).filter(Boolean).length >= 3
}

/* ── Single-line extraction: find CJK boundary + sentence tail ── */

interface RawPair {
  en: string
  zh: string
  sentence?: string
  endsWithSentenceMark: boolean
}

function extractPair(line: string): RawPair | null {
  // Sentence/punctuation signals must be captured BEFORE the destructive cleanLine
  const lite = liteClean(line)
  const cleaned = cleanLine(line)
  if (!cleaned || !lite) return null

  const cjkMatch = /[㐀-鿿豈-﫿]/.exec(lite)
  if (!cjkMatch) return null // no Chinese → not a word pair

  const cjkStart = cjkMatch.index
  if (cjkStart === 0) {
    // Chinese first. Find where Latin starts after CJK
    const latinMatch = /[a-zA-Z]/.exec(lite)
    if (!latinMatch || latinMatch.index === 0) return null
    const zh = cleaned.slice(0, latinMatch.index).trim()
    const en = cleaned.slice(latinMatch.index).trim()
    return finalizePair(en, zh, false)
  }

  // English first (normal case)
  const enRaw = lite.slice(0, cjkStart)
  const endsWithSentenceMark = /[.!?][)）\]】"']*$/.test(enRaw.trim())

  // Sentence tail = after the LAST CJK char in the whole line (lite keeps punctuation)
  const lastCjk = findLastCJK(lite)
  let sentence: string | undefined
  if (lastCjk >= 0 && lastCjk + 1 < lite.length) {
    const tail = lite.slice(lastCjk + 1).replace(/^[\s,，;；、]+/, '').trim()
    if (looksLikeSentence(tail)) sentence = tail
  }

  const zhEndInCleaned = sentence ? findZhEnd(cleaned, cjkStart) : -1
  const zh = zhEndInCleaned > 0 ? cleaned.slice(cjkStart, zhEndInCleaned).trim() : cleaned.slice(cjkStart).trim()
  const en = cleaned.slice(0, cjkStart).trim()
  return finalizePair(en, zh, endsWithSentenceMark, sentence)
}

function findLastCJK(s: string): number {
  let last = -1
  for (let i = 0; i < s.length; i++) {
    if (/[㐀-鿿豈-﫿]/.test(s[i])) last = i
  }
  return last
}

/* When a sentence tail exists, zh side ends at its LAST CJK char in cleaned text */
function findZhEnd(cleaned: string, from: number): number {
  const last = findLastCJK(cleaned)
  return last >= from ? last + 1 : -1
}

function finalizePair(en: string, zh: string, endsWithSentenceMark: boolean, sentence?: string): RawPair | null {
  en = trimPunctuation(en).toLowerCase()
  zh = trimPunctuation(zh)

  if (!en || !zh) return null
  return { en, zh, sentence, endsWithSentenceMark }
}

/* Type classification: sentence-mark on the EN part (pre-clean) OR 5+ words */
function classifyRaw(en: string, endsWithSentenceMark: boolean): VocabType {
  if (endsWithSentenceMark) return 'sentence'
  return classifyVocab(en)
}

/* ── Public API ── */

export function previewParse(text: string): PreviewResult {
  const rawLines = text.split(/[\n\r]+/)
  const items: PreviewItem[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  let dupCount = 0
  const typeCounts = { word: 0, phrase: 0, sentence: 0 }

  for (const rawLine of rawLines) {
    const line = rawLine.trim()
    if (!line) continue
    // Skip obvious non-word lines (too short, all punctuation)
    if (line.length < 4 && !hasCJK(line)) continue

    const result = extractPair(line)
    if (!result) {
      const preview = line.length > 40 ? line.slice(0, 40) + '…' : line
      errors.push(preview)
      continue
    }

    const key = result.en.toLowerCase()
    if (seen.has(key)) { dupCount++; continue }
    seen.add(key)

    const type = classifyRaw(result.en, result.endsWithSentenceMark)
    const wordCount = result.en.split(' ').length
    const isLong =
      (type === 'word' && result.en.length > 14) ||
      (type === 'phrase' && wordCount > 4) ||
      (type === 'sentence' && wordCount > 12) ||
      result.zh.length > 10
    const confidence: 'high' | 'low' = isLong ? 'low' : 'high'
    typeCounts[type]++

    items.push({
      index: items.length, en: result.en, zh: result.zh, type,
      sentence: result.sentence, confidence, original: line.slice(0, 60),
    })
  }

  return { items, errors, dupCount, typeCounts }
}

export function finalizeImport(preview: PreviewResult): FinalResult {
  const vocab: VocabItem[] = preview.items.map((item, i) => ({
    id: i + 1, en: item.en, zh: item.zh, type: item.type, sentence: item.sentence,
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

export function generateCsvTemplate(): string {
  return (
    'apple,苹果,I eat an apple every day.\n' +
    'cat,猫,The cat is cute.\n' +
    'dog,狗,\n' +
    'book,书,\n' +
    'water,水,\n' +
    'sun,太阳,\n' +
    'feed the cows,喂奶牛,\n' +
    'My mum is a great cook.,我的妈妈是一位超棒的厨师,\n'
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
