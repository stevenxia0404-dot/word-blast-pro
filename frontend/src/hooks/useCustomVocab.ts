import { useState, useCallback, useMemo } from 'react'
import type { VocabItem, LevelConfig } from '../config/gameConfig'
import { CUSTOM_VOCAB_KEY } from '../config/wordParser'

interface VocabGroup {
  id: string
  name: string
  vocab: VocabItem[]
  importedAt: number
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
    return (data as CustomVocabDataV2)?.groups ?? []
  } catch {
    return []
  }
}

function save(groups: VocabGroup[]) {
  try {
    localStorage.setItem(CUSTOM_VOCAB_KEY, JSON.stringify({ groups }))
  } catch { /* quota exceeded */ }
}

function buildCombined(groups: VocabGroup[]): { vocab: VocabItem[]; levels: LevelConfig[] } {
  if (groups.length === 0) return { vocab: [], levels: [] }
  const vocab: VocabItem[] = []
  let id = 1
  for (const g of groups) {
    for (const v of g.vocab) {
      vocab.push({ ...v, id: id++ })
    }
  }
  const levels = generateLevels(vocab)
  return { vocab, levels }
}

/* ── Level generation (same logic as wordParser.ts) ── */

function generateLevels(vocab: VocabItem[]): LevelConfig[] {
  if (vocab.length < 2) return []
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

/* ── Hook ── */

export function useCustomVocab() {
  const [groups, setGroups] = useState<VocabGroup[]>(load)

  const combined = useMemo(() => buildCombined(groups), [groups])

  const importVocab = useCallback((vocab: VocabItem[], _levels: LevelConfig[]) => {
    const group: VocabGroup = {
      id: String(Date.now()),
      name: `词库 ${groups.length + 1}`,
      vocab,
      importedAt: Date.now(),
    }
    const next = [...groups, group]
    setGroups(next)
    save(next)
  }, [groups])

  const deleteGroup = useCallback((id: string) => {
    const next = groups.filter(g => g.id !== id)
    setGroups(next)
    save(next)
  }, [groups])

  const clearAllVocab = useCallback(() => {
    setGroups([])
    save([])
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
  }
}