import { useState, useCallback, useEffect, useMemo } from 'react'
import type { VocabItem, LevelConfig } from '../config/gameConfig'
import { classifyVocab } from '../config/gameConfig'
import { CUSTOM_VOCAB_KEY, generateLevels } from '../config/wordParser'

/** 一组词库的元信息 */
export interface VocabGroup {
  id: string
  /** 组名，家长可改（默认「词库 N」） */
  name: string
  vocab: VocabItem[]
  importedAt: number
  /** 来源：粘贴文本 / 上传文件 */
  source?: 'paste' | 'file'
  /** 上传文件名（仅文件来源有值） */
  sourceName?: string
}

interface CustomVocabDataV2 {
  groups: VocabGroup[]
}

interface CustomVocabDataV1 {
  vocab: VocabItem[]
  levels: LevelConfig[]
  importedAt: number
}

function isV1(data: unknown): data is CustomVocabDataV1 {
  const d = data as Record<string, unknown>
  return Array.isArray(d?.vocab) && Array.isArray(d?.levels)
}

function migrate(data: CustomVocabDataV1): CustomVocabDataV2 {
  return {
    groups: [{
      id: String(data.importedAt || Date.now()),
      name: '词库 1',
      vocab: data.vocab,
      importedAt: data.importedAt || Date.now(),
      source: 'paste',
    }],
  }
}

function load(): VocabGroup[] {
  try {
    const raw = localStorage.getItem(CUSTOM_VOCAB_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (isV1(data)) {
      const migrated = migrate(data)
      localStorage.setItem(CUSTOM_VOCAB_KEY, JSON.stringify(migrated))
      return migrated.groups
    }
    const groups = (data as CustomVocabDataV2)?.groups ?? []
    // 旧存档补默认字段（source/name 可能缺失）
    return groups.map((g, i) => ({
      ...g,
      name: g.name || `词库 ${i + 1}`,
      source: g.source ?? 'paste',
    }))
  } catch {
    return []
  }
}

function save(groups: VocabGroup[]) {
  try {
    localStorage.setItem(CUSTOM_VOCAB_KEY, JSON.stringify({ groups }))
  } catch { /* quota exceeded */ }
}

/** 唯一 id：Date.now() 在同一毫秒内可能重复，加随机后缀兜底 */
function uniqueId(existing: VocabGroup[]): string {
  const base = String(Date.now())
  let id = base
  let n = 0
  const taken = new Set(existing.map(g => g.id))
  while (taken.has(id)) { id = `${base}-${++n}` }
  return id
}

function buildCombined(groups: VocabGroup[]): { vocab: VocabItem[]; levels: LevelConfig[] } {
  if (groups.length === 0) return { vocab: [], levels: [] }
  const vocab: VocabItem[] = []
  let id = 1
  for (const g of groups) {
    for (const v of g.vocab) {
      // 旧存档词条缺 type：入口补判，一次到位
      vocab.push({ ...v, id: id++, type: v.type ?? classifyVocab(v.en) })
    }
  }
  // 关卡永远从词库派生 → 编辑词条后自动重算
  const levels = generateLevels(vocab)
  return { vocab, levels }
}

/* ── Hook ── */

export function useCustomVocab() {
  const [groups, setGroups] = useState<VocabGroup[]>(load)

  const combined = useMemo(() => buildCombined(groups), [groups])

  /* 持久化统一放这里：setState updater 在 StrictMode 下会被双调用，
   * 写盘副作用若放在 updater 内会时序错乱（曾导致二次导入整组丢失）。
   * effect 是幂等的，双调用无影响。 */
  useEffect(() => {
    save(groups)
  }, [groups])

  /** 导入新的一组（累加，不覆盖历史） */
  const importVocab = useCallback((
    vocab: VocabItem[],
    _levels: LevelConfig[],
    meta?: { source?: 'paste' | 'file'; sourceName?: string },
  ) => {
    setGroups(prev => {
      const group: VocabGroup = {
        id: uniqueId(prev),
        name: `词库 ${prev.length + 1}`,
        vocab,
        importedAt: Date.now(),
        source: meta?.source ?? 'paste',
        sourceName: meta?.sourceName,
      }
      const next = [...prev, group]
      return next
    })
  }, [])

  /** 删除整组 */
  const deleteGroup = useCallback((id: string) => {
    setGroups(prev => {
      const next = prev.filter(g => g.id !== id)
      return next
    })
  }, [])

  /** 清空全部 */
  const clearAllVocab = useCallback(() => {
    setGroups([])
  }, [])

  /** 重命名（家长自己起名，如「三年级上册 Unit1-3」） */
  const renameGroup = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setGroups(prev => {
      const next = prev.map(g => (g.id === id ? { ...g, name: trimmed } : g))
      return next
    })
  }, [])

  /**
   * 编辑某组内的词条（改英文/中文/例句）。
   * 传入新的完整词条数组，类型按新内容重新判定 → 关卡归属随之变化。
   */
  const updateGroupVocab = useCallback((id: string, vocab: VocabItem[]) => {
    setGroups(prev => {
      const next = prev.map(g => (g.id === id
        ? { ...g, vocab: vocab.map(v => ({ ...v, type: classifyVocab(v.en) })) }
        : g))
      return next
    })
  }, [])

  /** 往某组里补一个词 */
  const addWordToGroup = useCallback((id: string, item: Omit<VocabItem, 'id'>) => {
    setGroups(prev => {
      const next = prev.map(g => {
        if (g.id !== id) return g
        const type = item.type ?? classifyVocab(item.en)
        const newItem: VocabItem = { ...item, id: g.vocab.length + 1, type }
        return { ...g, vocab: [...g.vocab, newItem] }
      })
      return next
    })
  }, [])

  /** 从某组里删掉一个词 */
  const removeWordFromGroup = useCallback((id: string, wordId: number) => {
    setGroups(prev => {
      const next = prev.map(g => (g.id === id
        ? { ...g, vocab: g.vocab.filter(v => v.id !== wordId) }
        : g))
      return next
    })
  }, [])

  return {
    customVocab: combined.vocab.length > 0 ? combined.vocab : null,
    customLevels: combined.vocab.length > 0 ? combined.levels : null,
    customCount: combined.vocab.length,
    hasCustom: combined.vocab.length > 0,
    groups,
    importVocab,
    deleteGroup,
    clearAllVocab,
    renameGroup,
    updateGroupVocab,
    addWordToGroup,
    removeWordFromGroup,
  }
}
