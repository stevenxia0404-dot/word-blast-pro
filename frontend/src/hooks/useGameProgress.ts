import { useState, useCallback, useRef } from 'react'
import { LEVELS, getStars, SCORE } from '../config/gameConfig'

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

export function useGameProgress() {
  const [phase, setPhase] = useState<GamePhase>('welcome')
  const [levelIndex, setLevelIndex] = useState(0)
  const [subsectionIndex, setSubsectionIndex] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [levelResults, setLevelResults] = useState<LevelResult[]>([])
  const [help, setHelp] = useState<HelpState>({ consecutiveErrors: 0, helpLevel: 0 })
  const [subsectionScore, setSubsectionScore] = useState(0)
  const [subsectionCorrect, setSubsectionCorrect] = useState(0)
  const [subsectionAttempts, setSubsectionAttempts] = useState(0)

  const levelCorrectRef = useRef(0)
  const levelAttemptsRef = useRef(0)
  const levelScoreRef = useRef(0)

  const currentLevel = LEVELS[levelIndex]
  const totalLevels = LEVELS.length
  const isLastLevel = levelIndex >= totalLevels - 1

  const accuracy = subsectionAttempts === 0 ? 100
    : Math.round((subsectionCorrect / subsectionAttempts) * 100)

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
    levelCorrectRef.current = 0
    levelAttemptsRef.current = 0
    levelScoreRef.current = 0
    setPhase('playing')
    setLevelIndex(0)
    setSubsectionIndex(0)
    setTotalScore(0)
    setCombo(0)
    setLevelResults([])
    setHelp({ consecutiveErrors: 0, helpLevel: 0 })
    setSubsectionScore(0)
    setSubsectionCorrect(0)
    setSubsectionAttempts(0)
  }, [])

  const restartGame = useCallback(() => {
    startGame()
  }, [startGame])

  const debug = {
    jumpToLevel: useCallback((idx: number) => {
      if (idx < 0 || idx >= LEVELS.length) return
      setLevelIndex(idx)
      setSubsectionIndex(0)
      setPhase('playing')
      setCombo(0)
      setHelp({ consecutiveErrors: 0, helpLevel: 0 })
      setSubsectionScore(0)
      setSubsectionCorrect(0)
      setSubsectionAttempts(0)
      levelCorrectRef.current = 0
      levelAttemptsRef.current = 0
      levelScoreRef.current = 0
    }, []),
    jumpToSubsection: useCallback((idx: number) => {
      if (idx < 0 || idx > 2) return
      setSubsectionIndex(idx)
      setPhase('playing')
      setCombo(0)
      setHelp({ consecutiveErrors: 0, helpLevel: 0 })
      setSubsectionScore(0)
      setSubsectionCorrect(0)
      setSubsectionAttempts(0)
      levelCorrectRef.current = 0
      levelAttemptsRef.current = 0
      levelScoreRef.current = 0
    }, []),
    jumpToPhase: useCallback((p: GamePhase) => {
      setPhase(p)
    }, []),
    setScore: useCallback((s: number) => {
      setTotalScore(s)
    }, []),
    resetAll: useCallback(() => {
      setPhase('welcome')
      setLevelIndex(0)
      setSubsectionIndex(0)
      setTotalScore(0)
      setCombo(0)
      setLevelResults([])
      setHelp({ consecutiveErrors: 0, helpLevel: 0 })
      setSubsectionScore(0)
      setSubsectionCorrect(0)
      setSubsectionAttempts(0)
      levelCorrectRef.current = 0
      levelAttemptsRef.current = 0
      levelScoreRef.current = 0
    }, []),
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
