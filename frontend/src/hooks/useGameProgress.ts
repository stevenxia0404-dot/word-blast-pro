import { useState, useCallback, useRef, useEffect } from 'react'
import { LEVELS, getStars, SCORE } from '../config/gameConfig'
import type { LevelConfig } from '../config/gameConfig'

interface LevelResult {
  stars: number
  accuracy: number
  score: number
}

interface HelpState {
  consecutiveErrors: number
  helpLevel: number
}

export type GamePhase = 'welcome' | 'playing' | 'levelComplete' | 'allComplete'

const SAVE_KEY = 'wordblast_save_v1'

interface SavedState {
  phase: GamePhase
  levelIndex: number
  subsectionIndex: number
  totalScore: number
  combo: number
  levelResults: LevelResult[]
  subsectionScore: number
  subsectionCorrect: number
  subsectionAttempts: number
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    return data as SavedState
  } catch {
    return null
  }
}

function saveState(state: SavedState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch { /* quota exceeded — silently drop */ }
}

function clearState() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch { /* ignore */ }
}

function getDefault(loaded: SavedState | null): {
  phase: GamePhase; levelIndex: number; subsectionIndex: number
  totalScore: number; combo: number; levelResults: LevelResult[]
  subsectionScore: number; subsectionCorrect: number; subsectionAttempts: number
} {
  if (!loaded) return {
    phase: 'welcome', levelIndex: 0, subsectionIndex: 0,
    totalScore: 0, combo: 0, levelResults: [],
    subsectionScore: 0, subsectionCorrect: 0, subsectionAttempts: 0,
  }
  return {
    phase: loaded.phase,
    levelIndex: loaded.levelIndex ?? 0,
    subsectionIndex: loaded.subsectionIndex ?? 0,
    totalScore: loaded.totalScore ?? 0,
    combo: 0, // combo always resets on load
    levelResults: loaded.levelResults ?? [],
    subsectionScore: 0, subsectionCorrect: 0, subsectionAttempts: 0, // subsection restarts on load
  }
}

export function useGameProgress(customLevels?: LevelConfig[] | null) {
  const activeLevels = customLevels?.length ? customLevels : LEVELS
  const defaultState = getDefault(loadState())
  const [phase, setPhase] = useState<GamePhase>(defaultState.phase)
  const [levelIndex, setLevelIndex] = useState(defaultState.levelIndex)
  const [subsectionIndex, setSubsectionIndex] = useState(defaultState.subsectionIndex)
  const [totalScore, setTotalScore] = useState(defaultState.totalScore)
  const [combo, setCombo] = useState(0)
  const [levelResults, setLevelResults] = useState<LevelResult[]>(defaultState.levelResults)
  const [help, setHelp] = useState<HelpState>({ consecutiveErrors: 0, helpLevel: 0 })
  const [subsectionScore, setSubsectionScore] = useState(0)
  const [subsectionCorrect, setSubsectionCorrect] = useState(0)
  const [subsectionAttempts, setSubsectionAttempts] = useState(0)

  const levelCorrectRef = useRef(0)
  const levelAttemptsRef = useRef(0)
  const levelScoreRef = useRef(0)

  const currentLevel = activeLevels[levelIndex]
  const totalLevels = activeLevels.length
  const isLastLevel = levelIndex >= totalLevels - 1

  const accuracy = subsectionAttempts === 0 ? 100
    : Math.round((subsectionCorrect / subsectionAttempts) * 100)

  const resetProgress = useCallback(() => {
    setCombo(0)
    setHelp({ consecutiveErrors: 0, helpLevel: 0 })
    setSubsectionScore(0)
    setSubsectionCorrect(0)
    setSubsectionAttempts(0)
    levelCorrectRef.current = 0
    levelAttemptsRef.current = 0
    levelScoreRef.current = 0
  }, [])

  const addCorrect = useCallback((baseScore: number) => {
    const bonus = combo * SCORE.comboBonus
    const earned = baseScore + bonus
    setTotalScore(s => s + earned)
    setCombo(c => c + 1)
    setSubsectionScore(s => s + earned)
    setSubsectionCorrect(c => c + 1)
    setSubsectionAttempts(a => a + 1)
    levelCorrectRef.current += 1
    levelAttemptsRef.current += 1
    levelScoreRef.current += earned
    setHelp({ consecutiveErrors: 0, helpLevel: 0 })
  }, [combo])

  const addWrong = useCallback(() => {
    setCombo(0)
    setSubsectionAttempts(a => a + 1)
    levelAttemptsRef.current += 1
    setHelp(h => ({ ...h, consecutiveErrors: h.consecutiveErrors + 1 }))
  }, [])

  const useHelp = useCallback(() => {
    setHelp(h => {
      const nextLevel = h.helpLevel + 1
      if (nextLevel > 3) return h
      setTotalScore(s => s - SCORE.helpCost[nextLevel])
      return { ...h, helpLevel: nextLevel }
    })
  }, [])

  const addHelpCorrect = useCallback((earnedScore: number) => {
    setTotalScore(s => s + earnedScore)
    setCombo(0)
    setSubsectionScore(s => s + earnedScore)
    levelScoreRef.current += earnedScore
    setHelp({ consecutiveErrors: 0, helpLevel: 0 })
  }, [])

  const finishSubsection = useCallback(() => {
    setCombo(0)
    setHelp({ consecutiveErrors: 0, helpLevel: 0 })
  }, [])

  const advanceSubsection = useCallback(() => {
    setSubsectionIndex(i => {
      const next = i + 1
      if (next >= 3) return i
      return next
    })
    setSubsectionScore(0)
    setSubsectionCorrect(0)
    setSubsectionAttempts(0)
  }, [])

  const completeLevel = useCallback(() => {
    const totalCorrect = levelCorrectRef.current
    const totalAttempts = levelAttemptsRef.current
    const levelAcc = totalAttempts === 0 ? 100
      : Math.round((totalCorrect / totalAttempts) * 100)
    const stars = getStars(levelAcc)
    setLevelResults(prev => [...prev, { stars, accuracy: levelAcc, score: levelScoreRef.current }])
    levelCorrectRef.current = 0
    levelAttemptsRef.current = 0
    levelScoreRef.current = 0
    setSubsectionIndex(0)
    setSubsectionScore(0)
    setSubsectionCorrect(0)
    setSubsectionAttempts(0)
    setCombo(0)
    if (isLastLevel) {
      setPhase('allComplete')
    } else {
      setLevelIndex(i => i + 1)
      setPhase('levelComplete')
    }
  }, [isLastLevel])

  const nextLevel = useCallback(() => {
    setPhase('playing')
  }, [])

  const startGame = useCallback(() => {
    clearState()
    resetProgress()
    setPhase('playing')
    setLevelIndex(0)
    setSubsectionIndex(0)
    setTotalScore(0)
    setLevelResults([])
  }, [resetProgress])

  const restartGame = useCallback(() => {
    startGame()
  }, [startGame])

  /* ── Auto-save to localStorage ── */
  useEffect(() => {
    if (phase === 'welcome') { clearState(); return }
    saveState({
      phase,
      levelIndex,
      subsectionIndex,
      totalScore,
      combo,
      levelResults,
      subsectionScore,
      subsectionCorrect,
      subsectionAttempts,
    })
  }, [phase, levelIndex, subsectionIndex, totalScore, combo, levelResults, subsectionScore, subsectionCorrect, subsectionAttempts])

  const debug = {
    jumpToLevel: useCallback((idx: number) => {
      if (idx < 0 || idx >= activeLevels.length) return
      resetProgress()
      setLevelIndex(idx)
      setSubsectionIndex(0)
      setPhase('playing')
    }, [resetProgress]),
    jumpToSubsection: useCallback((idx: number) => {
      if (idx < 0 || idx > 2) return
      resetProgress()
      setSubsectionIndex(idx)
      setPhase('playing')
    }, [resetProgress]),
    jumpToPhase: useCallback((p: GamePhase) => {
      setPhase(p)
    }, []),
    setScore: useCallback((s: number) => {
      setTotalScore(s)
    }, []),
    resetAll: useCallback(() => {
      clearState()
      resetProgress()
      setPhase('welcome')
      setLevelIndex(0)
      setSubsectionIndex(0)
      setTotalScore(0)
      setLevelResults([])
    }, [resetProgress]),
  }

  return {
    phase, setPhase,
    levelIndex, subsectionIndex,
    totalScore, combo, accuracy,
    levelResults, totalLevels,
    currentLevel, isLastLevel,
    help,
    subsectionScore, subsectionCorrect, subsectionAttempts,
    addCorrect, addWrong, addHelpCorrect, useHelp,
    finishSubsection, advanceSubsection, completeLevel, nextLevel,
    startGame, restartGame,
    debug,
  }
}
