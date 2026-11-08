/* useSpokenRecords.ts — 跟读完成记录 + 口语分独立记账（localStorage）
 *
 * 两份数据，两个 key：
 *   wordblast_spoken_v1        每个词的完成时间戳（用于判首次 vs 复习）
 *   wordblast_spoken_score_v1  累计口语分（score / mastered / reviewed）
 *
 * 为什么独立记账：口语分不塞进闯关总分（totalScore），否则会出现
 * 「跟读加了分，一进闯关就被 startGame() 清零」—— 那个 bug 的根因就是
 * 两套分数共用一个字段又共用一套存档时机。分开存，分数就再也丢不了。
 */

import { SCORE } from '../config/gameConfig'

const KEY = 'wordblast_spoken_v1'
const SCORE_KEY = 'wordblast_spoken_score_v1'

export type SpokenRecords = Record<string, number>

export interface SpokenScore {
  score: number
  mastered: number
  reviewed: number
  updatedAt: number
}

const EMPTY_SCORE: SpokenScore = { score: 0, mastered: 0, reviewed: 0, updatedAt: 0 }

export function loadSpoken(): SpokenRecords {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as SpokenRecords
  } catch {
    return {}
  }
}

export function loadSpokenScore(): SpokenScore {
  try {
    const raw = localStorage.getItem(SCORE_KEY)
    if (!raw) return { ...EMPTY_SCORE }
    const d = JSON.parse(raw) as Partial<SpokenScore>
    const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
    return {
      score: Math.max(0, n(d.score)),
      mastered: Math.max(0, n(d.mastered)),
      reviewed: Math.max(0, n(d.reviewed)),
      updatedAt: n(d.updatedAt),
    }
  } catch {
    return { ...EMPTY_SCORE }
  }
}

/** 口语总分（称号判定用：闯关分 + 这个） */
export function spokenTotal(): number {
  return loadSpokenScore().score
}

/** 标记完成。返回 true = 首次（本次才给全额分）。不加分，只记时间戳。 */
export function markSpoken(en: string): boolean {
  const key = en.trim().toLowerCase()
  const records = loadSpoken()
  if (records[key]) return false
  records[key] = Date.now()
  try {
    localStorage.setItem(KEY, JSON.stringify(records))
  } catch { /* quota exceeded：记录丢就丢了，不影响玩 */ }
  return true
}

/**
 * 记录一次跟读并结算分数。
 * per-word 记录与累计分在同一个同步函数里写，避免「记录成功但分数没加」。
 */
export function recordSpoken(
  en: string,
  isSentence = false,
): { isFirst: boolean; points: number; total: number } {
  const key = en.trim().toLowerCase()
  const records = loadSpoken()
  const isFirst = !records[key]

  if (isFirst) {
    records[key] = Date.now()
    try {
      localStorage.setItem(KEY, JSON.stringify(records))
    } catch { /* quota exceeded */ }
  }

  // 句子跟读分值更高（整句开口比单词难）
  const points = isSentence
    ? (isFirst ? SCORE.repeatSentenceFirst : SCORE.repeatSentenceReview)
    : (isFirst ? SCORE.repeatFirst : SCORE.repeatReview)
  const cur = loadSpokenScore()
  const next: SpokenScore = {
    score: cur.score + points,
    mastered: cur.mastered + (isFirst ? 1 : 0),
    reviewed: cur.reviewed + (isFirst ? 0 : 1),
    updatedAt: Date.now(),
  }
  try {
    localStorage.setItem(SCORE_KEY, JSON.stringify(next))
  } catch { /* quota exceeded */ }

  return { isFirst, points, total: next.score }
}

export function spokenCount(): number {
  return Object.keys(loadSpoken()).length
}
