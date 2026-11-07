/* useSpokenRecords.ts — 跟读完成记录（localStorage）
 * key = 词条英文（小写），value = 首次完成时间戳
 * 用途：首次「我会了」给全额分、复习给小额分（防刷）；二期同步模块的 spoken_records 数据源
 */

const KEY = 'wordblast_spoken_v1'

export type SpokenRecords = Record<string, number>

export function loadSpoken(): SpokenRecords {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as SpokenRecords
  } catch {
    return {}
  }
}

/** 标记完成。返回 true = 首次（本次才给全额分） */
export function markSpoken(en: string): boolean {
  const key = en.trim().toLowerCase()
  const records = loadSpoken()
  if (records[key]) return false
  records[key] = Date.now()
  try {
    localStorage.setItem(KEY, JSON.stringify(records))
  } catch { /* quota exceeded：记录丢就丢了，不影响玩 */
  }
  return true
}

export function spokenCount(): number {
  return Object.keys(loadSpoken()).length
}
