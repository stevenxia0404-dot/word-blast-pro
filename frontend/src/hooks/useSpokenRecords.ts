/* useSpokenRecords.ts — 口语分独立记账 + 三模块进度（localStorage）
 *
 * 三份数据，四个 key：
 *   wordblast_spoken_v1         跟读完成记录（每词时间戳，判首次 vs 复习）
 *   wordblast_dialogue_v1       对话完成记录（按 reply 判首次，与跟读互不干扰）
 *   wordblast_spoken_score_v1   累计口语分 —— 跟读与对话共用的同一个积分池
 *   wordblast_save_v1           闯关分（在 saveSchema，不在这里）
 *
 * 为什么独立记账：口语分不塞进闯关总分（totalScore），否则会出现
 * 「跟读加了分，一进闯关就被 startGame() 清零」—— 那个 bug 的根因就是
 * 两套分数共用一个字段又共用一套存档时机。分开存，分数就再也丢不了。
 */

import { SCORE, VOCABULARY } from '../config/gameConfig'
import { DIALOGUES } from '../config/dialogues'

const KEY = 'wordblast_spoken_v1'
const DIALOGUE_KEY = 'wordblast_dialogue_v1'
const SCORE_KEY = 'wordblast_spoken_score_v1'

export type SpokenRecords = Record<string, number>

export interface SpokenScore {
  score: number
  mastered: number
  reviewed: number
  updatedAt: number
}

const EMPTY_SCORE: SpokenScore = { score: 0, mastered: 0, reviewed: 0, updatedAt: 0 }

function loadRecords(key: string): SpokenRecords {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as SpokenRecords
  } catch {
    return {}
  }
}

function saveRecords(key: string, records: SpokenRecords) {
  try {
    localStorage.setItem(key, JSON.stringify(records))
  } catch { /* quota exceeded：记录丢就丢了，不影响玩 */ }
}

export function loadSpoken(): SpokenRecords { return loadRecords(KEY) }
export function loadDialogue(): SpokenRecords { return loadRecords(DIALOGUE_KEY) }

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

/** 口语总分（称号判定用：闯关分 + 这个）。跟读与对话共用这一个池 */
export function spokenTotal(): number {
  return loadSpokenScore().score
}

/** 加一次口语分（跟读 / 对话都走这里）—— 单一积分池，称号门槛不动（方案 A） */
function addSpokenPoints(points: number, isFirst: boolean): number {
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
  return next.score
}

/** 标记完成。返回 true = 首次（本次才给全额分）。不加分，只记时间戳。 */
export function markSpoken(en: string): boolean {
  const key = en.trim().toLowerCase()
  const records = loadSpoken()
  if (records[key]) return false
  records[key] = Date.now()
  saveRecords(KEY, records)
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
    saveRecords(KEY, records)
  }

  // 句子跟读分值更高（整句开口比单词难）
  const points = isSentence
    ? (isFirst ? SCORE.repeatSentenceFirst : SCORE.repeatSentenceReview)
    : (isFirst ? SCORE.repeatFirst : SCORE.repeatReview)
  const total = addSpokenPoints(points, isFirst)
  return { isFirst, points, total }
}

/** 记录一次对话回答。按 reply 独立判首次 —— 跟读练过同一句不会让对话直接变「复习」 */
export function recordDialogue(reply: string): { isFirst: boolean; points: number; total: number } {
  const key = reply.trim().toLowerCase()
  const records = loadDialogue()
  const isFirst = !records[key]

  if (isFirst) {
    records[key] = Date.now()
    saveRecords(DIALOGUE_KEY, records)
  }

  const points = isFirst ? SCORE.dialogueFirst : SCORE.dialogueReview
  const total = addSpokenPoints(points, isFirst)
  return { isFirst, points, total }
}

export function spokenCount(): number {
  return Object.keys(loadSpoken()).length
}

export function dialogueCount(): number {
  return Object.keys(loadDialogue()).length
}

/* ── 三模块进度：勋章墙 / 大满贯证书共用 ── */

export interface ModuleProgress {
  blastDone: boolean
  repeatDone: boolean
  dialogueDone: boolean
  grandSlam: boolean
  repeatCount: number
  repeatTotal: number
  dialogueCount: number
  dialogueTotal: number
}

/**
 * 闯关完成由调用方传（useGameProgress.phase === 'allComplete'）。
 * 跟读勋章 = 66 个词库词条全部首次跟读完成（定稿口径：词库全部词）。
 * 对话勋章 = 全部对话组的 reply 都答过一次。
 * demo 仅 dev 使用：强制点亮三枚看金色证书，不写任何存档、不动用户数据。
 */
export function loadModuleProgress(blastDone: boolean, demo = false): ModuleProgress {
  const repeatTotal = VOCABULARY.length
  const dialogueTotal = DIALOGUES.length

  const vocabKeys = new Set(VOCABULARY.map(v => v.en.trim().toLowerCase()))
  const spoken = loadSpoken()
  const repeatCount = Object.keys(spoken).filter(k => vocabKeys.has(k)).length

  const replyKeys = new Set(DIALOGUES.map(d => d.reply.trim().toLowerCase()))
  const dlg = loadDialogue()
  const dlgCount = Object.keys(dlg).filter(k => replyKeys.has(k)).length

  const repeatDone = demo || (repeatTotal > 0 && repeatCount >= repeatTotal)
  const dialogueDone = demo || (dialogueTotal > 0 && dlgCount >= dialogueTotal)
  const blast = demo || blastDone

  return {
    blastDone: blast,
    repeatDone,
    dialogueDone,
    grandSlam: blast && repeatDone && dialogueDone,
    repeatCount: demo ? repeatTotal : repeatCount,
    repeatTotal,
    dialogueCount: demo ? dialogueTotal : dlgCount,
    dialogueTotal,
  }
}
