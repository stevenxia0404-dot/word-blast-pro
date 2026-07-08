import type { VocabItem, LevelConfig } from './gameConfig'

export interface PreviewItem {
  index: number
  en: string
  zh: string
  confidence: 'high' | 'low'
  original: string
}

export interface PreviewResult {
  items: PreviewItem[]
  errors: string[]
  dupCount: number
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
const KEEP_RE = /[^a-zA-Z0-9㐀-鿿豈-﫿\s;；，、]/g

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

function hasCJK(s: string): boolean {
  return /[㐀-鿿豈-﫿]/.test(s)
}

function trimPunctuation(s: string): string {
  return s.replace(/^[,，、;；\s]+/, '').replace(/[,，、;；\s]+$/, '')
}

/* ── Single-line extraction: find CJK boundary ── */

function extractPair(line: string): { en: string; zh: string } | null {
  const cleaned = cleanLine(line)
  if (!cleaned) return null

  // Find the language boundary: where do CJK characters start?
  const cjkMatch = /[㐀-鿿豈-﫿]/.exec(cleaned)
  if (!cjkMatch) return null // no Chinese → not a word pair

  const cjkStart = cjkMatch.index
  if (cjkStart === 0) {
    // Chinese first. Find where Latin starts after CJK
    const latinMatch = /[a-zA-Z]/.exec(cleaned)
    if (!latinMatch || latinMatch.index === 0) return null
    const zh = cleaned.slice(0, latinMatch.index).trim()
    const en = cleaned.slice(latinMatch.index).trim()
    return finalizePair(en, zh)
  }

  // English first (normal case)
  const en = cleaned.slice(0, cjkStart).trim()
  const zh = cleaned.slice(cjkStart).trim()
  return finalizePair(en, zh)
}

function finalizePair(en: string, zh: string): { en: string; zh: string } | null {
  en = trimPunctuation(en).toLowerCase()
  zh = trimPunctuation(zh)

  if (!en || !zh) return null
  return { en, zh }
}

/* ── Public API ── */

export function previewParse(text: string): PreviewResult {
  const rawLines = text.split(/[\n\r]+/)
  const items: PreviewItem[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  let dupCount = 0

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

    const wordCount = result.en.split(' ').length
    const isLong = wordCount > 4 || result.zh.length > 10
    const confidence: 'high' | 'low' = isLong ? 'low' : 'high'

    items.push({ index: items.length, en: result.en, zh: result.zh, confidence, original: line.slice(0, 60) })
  }

  return { items, errors, dupCount }
}

export function finalizeImport(preview: PreviewResult): FinalResult {
  const vocab: VocabItem[] = preview.items.map((item, i) => ({
    id: i + 1, en: item.en, zh: item.zh,
  }))
  const messages = [...preview.errors]
  if (preview.dupCount > 0) messages.push(`已跳过 ${preview.dupCount} 个重复词条`)
  if (vocab.length < 2) {
    return { vocab: [], levels: [], errors: [...messages, '至少需要 2 个词条才能生成关卡'], dupCount: preview.dupCount, successCount: 0 }
  }
  const levels = generateLevels(vocab)
  return { vocab, levels, errors: messages, dupCount: preview.dupCount, successCount: vocab.length }
}

/* ── Level generation ── */

function generateLevels(vocab: VocabItem[]): LevelConfig[] {
  const hasPhrase = vocab.some(v => v.en.includes(' '))
  const WORDS_PER_LEVEL = 10
  const levels: LevelConfig[] = []
  for (let i = 0, lid = 1; i < vocab.length; i += WORDS_PER_LEVEL, lid++) {
    const chunk = vocab.slice(i, i + WORDS_PER_LEVEL)
    if (chunk.length < 2) break
    const cols = (hasPhrase || chunk.some(v => v.en.length > 8)) ? 2 : (chunk.length <= 6 ? 2 : 3)
    const rows = Math.ceil(chunk.length / cols)
    const name = chunk.slice(0, 3).map(v => v.zh).join('、') + (chunk.length > 3 ? '…' : '')
    levels.push({ id: lid, name, cols, rows, wordIds: chunk.map(v => v.id) })
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
  return 'apple,苹果\ncat,猫\ndog,狗\nbook,书\nwater,水\nsun,太阳\nmoon,月亮\nstar,星星\nhappy,快乐的\nbig,大的'
}

export const CUSTOM_VOCAB_KEY = 'wordblast_custom_v1'
