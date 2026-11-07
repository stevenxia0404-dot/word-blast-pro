/* saveSchema.ts — 存档结构定义 + 版本迁移（纯函数，无 React）
 *
 * 为什么要有它：v3.0 把关卡从 13 关改成 12 关（短语①+② 合并成语运用关），
 * 老存档里的关卡序号和成绩数组都对不上新结构，必须显式迁移，
 * 否则老用户一打开就错位甚至白屏。
 *
 * 单一来源：LevelResult / GamePhase / SavedState 都定义在这里，
 * useGameProgress 从这里 import 并 re-export。
 */

export const SAVE_KEY = 'wordblast_save_v1'   // key 不变：老存档要能被找到才能迁移
export const SAVE_VERSION = 2

export type GamePhase = 'welcome' | 'playing' | 'levelComplete' | 'allComplete'

export interface LevelResult {
  stars: number
  accuracy: number
  score: number
}

export interface SavedStateV2 {
  version: number
  phase: GamePhase
  levelIndex: number
  subsectionIndex: number
  /** 闯关分（不含口语分——口语分独立记账，见 useSpokenRecords） */
  totalScore: number
  combo: number
  levelResults: LevelResult[]
  subsectionScore: number
  subsectionCorrect: number
  subsectionAttempts: number
}

/* ── 字段级清洗：脏数据一律取默认值，绝不抛错 ── */

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function int(v: unknown, fallback: number): number {
  return Math.round(num(v, fallback))
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

const VALID_PHASES: GamePhase[] = ['welcome', 'playing', 'levelComplete', 'allComplete']

function phase(v: unknown): GamePhase {
  return VALID_PHASES.includes(v as GamePhase) ? (v as GamePhase) : 'welcome'
}

function sanitizeResult(v: unknown): LevelResult | null {
  if (!v || typeof v !== 'object') return null
  const r = v as Record<string, unknown>
  return {
    stars: clamp(int(r.stars, 0), 0, 3),
    accuracy: clamp(num(r.accuracy, 0), 0, 100),
    score: Math.max(0, num(r.score, 0)),
  }
}

function sanitizeResults(v: unknown): LevelResult[] {
  if (!Array.isArray(v)) return []
  return v.map(sanitizeResult).filter((r): r is LevelResult => r !== null)
}

/* ── 合并两关成绩：星级/准确率取高，分数求和 ── */
export function mergeLevelResults(a?: LevelResult, b?: LevelResult): LevelResult | undefined {
  if (!a && !b) return undefined
  if (!a) return b
  if (!b) return a
  return {
    stars: Math.max(a.stars, b.stars),
    accuracy: Math.max(a.accuracy, b.accuracy),
    score: a.score + b.score,
  }
}

/* ── 迁移入口 ── */

export interface MigrateContext {
  /** 当前可用关卡总数 */
  totalLevels: number
  /** 是否在用自定义词库（自定义关卡编排与旧版不可对齐，走另一分支） */
  usingCustom: boolean
}

/**
 * 老存档（13 关版）→ 新结构（12 关）：
 *   L1-L10 单词关      → L1-L10 原样
 *   L11 短语① + L12 短语② → L11 短语运用（成绩合并）
 *   L13 完整句子        → L12 句子运用
 * 自定义词库：旧编排与新版不可对齐 → 位置保留 + 越界裁剪（已知降级）
 *
 * 幂等：已是 version 2 的存档再跑一次，结果不变。
 */
export function migrateSave(raw: unknown, ctx: MigrateContext): SavedStateV2 | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Record<string, unknown>
  const isV2 = d.version === SAVE_VERSION

  const oldResults = sanitizeResults(d.levelResults)
  let results: LevelResult[]
  let levelIndex: number

  if (isV2) {
    // 已是新结构：只做越界裁剪
    results = oldResults.slice(0, ctx.totalLevels)
    levelIndex = clamp(int(d.levelIndex, 0), 0, Math.max(0, ctx.totalLevels - 1))
  } else if (ctx.usingCustom) {
    // 自定义词库：关卡编排与旧版不可对齐 → 位置保留 + 裁剪
    results = oldResults.slice(0, ctx.totalLevels)
    levelIndex = clamp(int(d.levelIndex, 0), 0, Math.max(0, ctx.totalLevels - 1))
  } else {
    // 内建词库：13 关 → 12 关映射
    results = []
    for (let i = 0; i < 10; i++) {
      if (oldResults[i]) results.push(oldResults[i])
    }
    const merged = mergeLevelResults(oldResults[10], oldResults[11])
    if (merged) results.push(merged)
    if (oldResults[12]) results.push(oldResults[12])

    const oldIndex = int(d.levelIndex, 0)
    if (oldIndex <= 9) levelIndex = oldIndex
    else if (oldIndex === 10) levelIndex = 10
    else if (oldIndex === 11) levelIndex = 10   // 旧短语② 并入新短语运用，该关需重做
    else levelIndex = 11                        // 旧句子关 → 新句子运用
    levelIndex = clamp(levelIndex, 0, Math.max(0, ctx.totalLevels - 1))
  }

  return {
    version: SAVE_VERSION,
    phase: phase(d.phase),
    levelIndex,
    subsectionIndex: clamp(int(d.subsectionIndex, 0), 0, 2),
    totalScore: Math.max(0, num(d.totalScore, 0)),
    combo: Math.max(0, num(d.combo, 0)),
    levelResults: results,
    subsectionScore: Math.max(0, num(d.subsectionScore, 0)),
    subsectionCorrect: Math.max(0, int(d.subsectionCorrect, 0)),
    subsectionAttempts: Math.max(0, int(d.subsectionAttempts, 0)),
  }
}

/* ── 读写（带 try/catch，隐私模式/配额超限都静默降级） ── */

export function readSaveRaw(): unknown {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function writeSave(state: SavedStateV2) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch { /* quota exceeded — silently drop */ }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch { /* ignore */ }
}
