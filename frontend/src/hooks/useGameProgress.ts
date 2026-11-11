import { useState, useCallback, useRef, useEffect } from 'react'
import { LEVELS, getStars, SCORE } from '../config/gameConfig'
import type { LevelConfig } from '../config/gameConfig'
import {
  SAVE_VERSION, migrateSave, readSaveRaw, writeSave, clearSave, shouldPersistSave,
} from '../config/saveSchema'
import type { GamePhase, LevelResult, SavedStateV2 } from '../config/saveSchema'

/* 类型单一来源在 saveSchema，这里 re-export 保持既有 import 路径可用 */
export type { GamePhase, LevelResult } from '../config/saveSchema'

interface HelpState {
  consecutiveErrors: number
  helpLevel: number
}

function loadState(ctx: { totalLevels: number; usingCustom: boolean }): SavedStateV2 | null {
  const raw = readSaveRaw()
  if (!raw) return null
  // 老存档（13 关版）在读入时就地迁移 —— 必须在首屏 state 初始化处做，
  // 放到 effect 里会先闪一下旧进度
  return migrateSave(raw, ctx)
}

function getDefault(loaded: SavedStateV2 | null): {
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
  const defaultState = getDefault(loadState({
    totalLevels: activeLevels.length,
    usingCustom: !!customLevels?.length,
  }))
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
    resetProgress()
    setPhase('playing')
    setLevelIndex(0)
    setSubsectionIndex(0)
    setTotalScore(0)
    setLevelResults([])
  }, [resetProgress])

  /** 续玩：不清零、不删档，保留关卡序号与闯关分，只重置小节内状态 */
  const resumeGame = useCallback(() => {
    resetProgress()
    setPhase('playing')
  }, [resetProgress])

  /** 是否有进度可续（有分数 / 有星 / 关卡往前走过） */
  const hasProgress = levelResults.length > 0 || levelIndex > 0 || totalScore > 0

  const restartGame = useCallback(() => {
    startGame()
  }, [startGame])

  /* ── Auto-save to localStorage ──
   * 关键修复：以前 phase==='welcome' 会 clearState()（删档），跟读模块全程处于
   * welcome 态 → 口语分永远存不下来。现在改为始终写入，
   * 只有「完全没进度」才清掉空档（新用户不留垃圾存档）。 */
  useEffect(() => {
    if (!shouldPersistSave({ phase, levelIndex, levelResults, totalScore })) {
      clearSave()
      return
    }
    writeSave({
      version: SAVE_VERSION,
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

  /* ── 跨设备同步落地：把合并结果灌回 React state ──
   * useSync 只写 localStorage 后派发 wordblast:sync-applied；不更新 state 的话，
   * 首页分数会一直停在旧值（要手动刷新才看得见），下一次 auto-save 还会用旧 state
   * 把刚拉回来的高分盖掉。只在「云端更靠前」时推进，绝不回退本机进度。
   * phase 不动：避免在同步瞬间弹出关卡完成层 / 打断正在进行的练习。 */
  useEffect(() => {
    const onSyncApplied = () => {
      const raw = readSaveRaw()
      const remote = migrateSave(raw, {
        totalLevels: activeLevels.length,
        usingCustom: !!customLevels?.length,
      })
      if (!remote) return
      setTotalScore(prev => Math.max(prev, remote.totalScore ?? 0))
      setLevelIndex(prev => Math.max(prev, remote.levelIndex ?? 0))
      setLevelResults(prev => {
        if (!remote.levelResults.length) return prev
        const next = prev.slice()
        let changed = false
        for (let i = 0; i < remote.levelResults.length; i++) {
          const a = next[i], b = remote.levelResults[i]
          if (!a) { next[i] = b; changed = true; continue }
          const merged = {
            stars: Math.max(a.stars, b.stars),
            accuracy: Math.max(a.accuracy, b.accuracy),
            score: Math.max(a.score, b.score),
          }
          if (merged.stars !== a.stars || merged.accuracy !== a.accuracy || merged.score !== a.score) {
            next[i] = merged
            changed = true
          }
        }
        return changed ? next : prev
      })
    }
    window.addEventListener('wordblast:sync-applied', onSyncApplied)
    return () => window.removeEventListener('wordblast:sync-applied', onSyncApplied)
  }, [activeLevels.length, !!customLevels?.length])

  const debug = {
    jumpToLevel: useCallback((idx: number) => {
      if (idx < 0 || idx >= activeLevels.length) return
      resetProgress()
      setLevelIndex(idx)
      setSubsectionIndex(0)
      setPhase('playing')
    }, [activeLevels, resetProgress]),
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
      clearSave()
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
    hasProgress,
    addCorrect, addWrong, addHelpCorrect, useHelp,
    finishSubsection, advanceSubsection, completeLevel, nextLevel,
    startGame, restartGame, resumeGame,
    debug,
  }
}
