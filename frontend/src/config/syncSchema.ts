/* syncSchema.ts — 同步数据白名单（纯函数）
 * 只有这 5 个 key 会离开本机：闯关存档 / 跟读记录 / 对话记录 / 口语分 / 自定义词库。
 * 录音 blob、音频、UI 状态、版本弹窗标记一律不同步（隐私承诺：录音不上传）。
 */
export const SYNC_KEYS = {
  save: 'wordblast_save_v1',
  spoken: 'wordblast_spoken_v1',
  dialogue: 'wordblast_dialogue_v1',
  spokenScore: 'wordblast_spoken_score_v1',
  customVocab: 'wordblast_custom_v1',
} as const

export interface SyncLevelResult { stars: number; accuracy: number; score: number }
export interface SyncSave {
  version: number
  phase: string
  levelIndex: number
  subsectionIndex: number
  totalScore: number
  combo: number
  levelResults: SyncLevelResult[]
  subsectionScore: number
  subsectionCorrect: number
  subsectionAttempts: number
}
export interface SyncScore { score: number; mastered: number; reviewed: number; updatedAt: number }
export interface SyncVocabGroup {
  id: string; name: string; vocab: unknown[]; importedAt: number
  source?: string; sourceName?: string
}
export interface SyncCustomVocab { groups: SyncVocabGroup[]; cleared: boolean; updatedAt: number }
export interface SyncData {
  save: SyncSave | null
  spoken: Record<string, number> | null
  dialogue: Record<string, number> | null
  spokenScore: SyncScore | null
  customVocab: SyncCustomVocab | null
}

function readObj<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? (v as T) : null
  } catch { return null }
}

/** 采集本机数据。没有的词库传 null（保留云端），明确清空才传 cleared:true */
export function collectLocalData(): SyncData {
  const cv = readObj<{ groups?: SyncVocabGroup[]; cleared?: boolean; updatedAt?: number }>(SYNC_KEYS.customVocab)
  const groups = cv && Array.isArray(cv.groups) ? cv.groups : null
  // 关键：只有「有词库」或「用户明确清空」才提交词库字段。
  // 从没导入过词库的设备（挂载时写了 groups:[]）传 null，服务端保留云端词库。
  const shouldSend = !!groups && (groups.length > 0 || cv?.cleared === true)
  return {
    save: readObj<SyncSave>(SYNC_KEYS.save),
    spoken: readObj<Record<string, number>>(SYNC_KEYS.spoken),
    dialogue: readObj<Record<string, number>>(SYNC_KEYS.dialogue),
    spokenScore: readObj<SyncScore>(SYNC_KEYS.spokenScore),
    customVocab: shouldSend
      ? { groups: groups!, cleared: groups!.length === 0, updatedAt: cv?.updatedAt ?? 0 }
      : null,
  }
}

/** 把服务端合并结果写回本机（只写非空字段，不删本机独有数据） */
export function applyRemoteData(data: Partial<SyncData> | null | undefined): void {
  if (!data) return
  const pairs: [string, unknown][] = [
    [SYNC_KEYS.save, data.save],
    [SYNC_KEYS.spoken, data.spoken],
    [SYNC_KEYS.dialogue, data.dialogue],
    [SYNC_KEYS.spokenScore, data.spokenScore],
  ]
  for (const [key, value] of pairs) {
    if (value == null) continue
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* 隐私模式 / 配额满：静默降级 */ }
  }
  if (data.customVocab) {
    const cv = data.customVocab as SyncCustomVocab
    try {
      localStorage.setItem(SYNC_KEYS.customVocab, JSON.stringify({
        groups: cv.groups ?? [],
        cleared: (cv.groups?.length ?? 0) === 0 && !!cv.cleared,
        updatedAt: cv.updatedAt ?? Date.now(),
      }))
    } catch { /* ignore */ }
  }
}

/** 稳定指纹：键顺序由 collectLocalData 固定，可直接比较 */
export function fingerprint(data: SyncData): string {
  return JSON.stringify(data)
}

export function localSnapshot(): SyncData { return collectLocalData() }

export function exportStudyJson(): string {
  return JSON.stringify({
    app: 'Word Blast',
    exportedAt: new Date().toISOString(),
    note: '本机学习数据（不含录音）',
    data: collectLocalData(),
  }, null, 2)
}

export function downloadText(filename: string, text: string, mime = 'application/json;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
