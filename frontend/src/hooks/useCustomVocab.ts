import { useState, useCallback } from 'react'
import type { VocabItem, LevelConfig } from '../config/gameConfig'
import { CUSTOM_VOCAB_KEY } from '../config/wordParser'

interface CustomVocabData {
  vocab: VocabItem[]
  levels: LevelConfig[]
  importedAt: number
}

function loadCustom(): CustomVocabData | null {
  try {
    const raw = localStorage.getItem(CUSTOM_VOCAB_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data?.vocab?.length > 0 && data?.levels?.length > 0) return data
    return null
  } catch {
    return null
  }
}

function saveCustom(vocab: VocabItem[], levels: LevelConfig[]) {
  try {
    localStorage.setItem(CUSTOM_VOCAB_KEY, JSON.stringify({ vocab, levels, importedAt: Date.now() }))
  } catch { /* quota exceeded */ }
}

function clearCustom() {
  try { localStorage.removeItem(CUSTOM_VOCAB_KEY) } catch { /* ignore */ }
}

export function useCustomVocab() {
  const [data, setData] = useState<CustomVocabData | null>(loadCustom)

  const importVocab = useCallback((vocab: VocabItem[], levels: LevelConfig[]) => {
    saveCustom(vocab, levels)
    setData({ vocab, levels, importedAt: Date.now() })
  }, [])

  const clearVocab = useCallback(() => {
    clearCustom()
    setData(null)
  }, [])

  return {
    customVocab: data?.vocab ?? null,
    customLevels: data?.levels ?? null,
    customCount: data?.vocab?.length ?? 0,
    hasCustom: data !== null,
    importVocab,
    clearVocab,
  }
}
