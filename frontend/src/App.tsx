import { useRef, useState, useEffect, useCallback } from 'react'
import { VOCABULARY, LEVELS, SCORE, getSubsections } from './config/gameConfig'
import type { VocabItem, SubsectionType, LevelConfig } from './config/gameConfig'
import { useGameEngine } from './hooks/useGameEngine'
import { useSpellEngine } from './hooks/useSpellEngine'
import { useGameProgress } from './hooks/useGameProgress'
import { useCustomVocab } from './hooks/useCustomVocab'
import { preloadVoices, unlockAudio, speakWord } from './hooks/useAudio'
import { WelcomeOverlay } from './components/WelcomeOverlay'
import { ScoreBoard } from './components/ScoreBoard'
import { GameCanvas } from './components/GameCanvas'
import { SpellCanvas } from './components/SpellCanvas'
import { StatusBar } from './components/StatusBar'
import { Certificate } from './components/Certificate'
import { DebugPanel } from './components/DebugPanel'
import { GuidePage } from './components/GuidePage'
import { LevelCompleteOverlay } from './components/LevelCompleteOverlay'
import { VersionBanner } from './components/VersionBanner'
import { WordImport } from './components/WordImport'
import { FeedbackForm } from './components/FeedbackForm'

/** For built-in levels use original logic; custom levels (>13) default to word mode */
function resolveSubsections(level: LevelConfig) {
  return getSubsections(level.id <= 13 ? level.id : 1)
}

function App() {
  const { canvasRef, setupCanvas, initGame, startRender, stopRender, handleTap } = useGameEngine()
  const { state: spellState, initSpell, tapCandidate, tapSlot, revealHelp } = useSpellEngine()
  const { customVocab, customLevels, hasCustom, customCount, importVocab, clearVocab } = useCustomVocab()
  const activeLevels = customLevels ?? LEVELS
  const prog = useGameProgress(customLevels)

  const [wordQueue, setWordQueue] = useState<VocabItem[]>([])
  const [currentWordIdx, setCurrentWordIdx] = useState(0)
  const [subsectionType, setSubsectionType] = useState<SubsectionType>('match')
  const [showHelpBtn, setShowHelpBtn] = useState(false)
  const [spellResult, setSpellResult] = useState<boolean | null>(null)
  const [debugOpen, setDebugOpen] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showWordImport, setShowWordImport] = useState(false)
  const subsectionInitedRef = useRef('')
  const matchInitedRef = useRef('')
  const spellInitedRef = useRef('')
  const subsectionRef = useRef(prog.subsectionIndex)
  subsectionRef.current = prog.subsectionIndex

  const activeVocab = customVocab ?? VOCABULARY
  const level = prog.currentLevel
  const subsections = level ? resolveSubsections(level) : []
  const currentSub = subsections[prog.subsectionIndex]
  const levelVocab = level ? level.wordIds.map(id => activeVocab.find(v => v.id === id)!).filter(Boolean) : []

  /* ── Welcome → start ── */
  const handleWelcomeStart = useCallback(() => {
    preloadVoices()
    unlockAudio()
    subsectionInitedRef.current = ''
    matchInitedRef.current = ''
    spellInitedRef.current = ''
    prog.startGame()
  }, [prog.startGame])

  /* ── Match callbacks (stable via refs) ── */
  const onMatchCorrectRef = useRef<() => void>(() => {})
  const onMatchWrongRef = useRef<() => void>(() => {})
  const onAllMatchedRef = useRef<() => void>(() => {})

  onMatchCorrectRef.current = () => prog.addCorrect(SCORE.match)
  onMatchWrongRef.current = () => prog.addWrong()

  onAllMatchedRef.current = () => {
    prog.finishSubsection()
    setTimeout(() => {
      if (subsectionRef.current >= 2) {
        prog.completeLevel()
      } else {
        prog.advanceSubsection()
      }
    }, 800)
  }

  /* ── Initialize subsection → set type ── */
  useEffect(() => {
    if (prog.phase !== 'playing' || !level) return
    const sub = subsections[prog.subsectionIndex]
    if (!sub) return
    const key = `${prog.levelIndex}-${prog.subsectionIndex}`
    if (subsectionInitedRef.current === key) return
    subsectionInitedRef.current = key

    setSubsectionType(sub.type)
    setShowHelpBtn(false)
    setSpellResult(null)
  }, [prog.phase, prog.levelIndex, prog.subsectionIndex])

  /* ── Init match canvas ── (after subsectionType committed, canvas is mounted) */
  useEffect(() => {
    if (prog.phase !== 'playing' || !level) return
    if (subsectionType !== 'match') return
    const key = `${prog.levelIndex}-${prog.subsectionIndex}`
    if (matchInitedRef.current === key) return
    matchInitedRef.current = key

    const timer = setTimeout(() => {
      setupCanvas()
      initGame(
        levelVocab, level.cols, level.rows,
        () => onMatchCorrectRef.current(),
        () => onMatchWrongRef.current(),
        () => onAllMatchedRef.current(),
      )
      startRender()
    }, 50)
    return () => clearTimeout(timer)
  }, [subsectionType, prog.phase, prog.levelIndex, prog.subsectionIndex])

  /* ── Init spell/cloze queue ── (after DOM commit) */
  useEffect(() => {
    if (prog.phase !== 'playing' || !level) return
    if (subsectionType === 'match') return
    const key = `s-${prog.levelIndex}-${prog.subsectionIndex}`
    if (spellInitedRef.current === key) return
    spellInitedRef.current = key

    stopRender()
    const queue = [...levelVocab].sort(() => Math.random() - 0.5)
    setWordQueue(queue)
    setCurrentWordIdx(0)
  }, [subsectionType, prog.phase, prog.levelIndex, prog.subsectionIndex])

  /* ── Init spell/cloze for current word ── */
  useEffect(() => {
    if (subsectionType === 'match') return
    if (wordQueue.length === 0) return
    if (currentWordIdx >= wordQueue.length) return
    const item = wordQueue[currentWordIdx]
    initSpell(item, subsectionType, activeVocab, prog.help.helpLevel)
    setShowHelpBtn(false)
    setSpellResult(null)
  }, [currentWordIdx, wordQueue, subsectionType])

  /* ── Help reveal ── */
  useEffect(() => {
    if (subsectionType === 'match') return
    if (prog.help.helpLevel > 0) {
      revealHelp(prog.help.helpLevel)
    }
  }, [prog.help.helpLevel])

  /* ── Watch spell result ── */
  useEffect(() => {
    if (!spellState || subsectionType === 'match') return
    if (spellState.isCorrect === true) {
      speakWord(spellState.enWord)
      const usedHelp = prog.help.helpLevel > 0
      if (usedHelp) {
        prog.addHelpCorrect(SCORE.helpScore[prog.help.helpLevel])
      } else {
        prog.addCorrect(SCORE.spell)
      }
      setSpellResult(true)
      setTimeout(() => {
        setSpellResult(null)
        if (currentWordIdx + 1 >= wordQueue.length) {
          prog.finishSubsection()
          if (subsectionRef.current >= 2) {
            prog.completeLevel()
          } else {
            prog.advanceSubsection()
          }
        } else {
          setCurrentWordIdx(i => i + 1)
        }
      }, 600)
    } else if (spellState.isCorrect === false) {
      prog.addWrong()
      setSpellResult(false)
      setShowHelpBtn(prog.help.consecutiveErrors + 1 >= 2)
      setTimeout(() => setSpellResult(null), 500)
    }
  }, [spellState?.isCorrect])

  /* ── Level complete → next ── */
  const handleNextLevel = useCallback(() => {
    prog.nextLevel()
  }, [prog.nextLevel])

  /* ── Certificate restart ── */
  const handleRestart = useCallback(() => {
    prog.restartGame()
  }, [prog.restartGame])

  const handleClearCustom = useCallback(() => {
    clearVocab()
    prog.restartGame()
  }, [clearVocab, prog.restartGame])

  const totalStars = prog.levelResults.reduce((sum, r) => sum + r.stars, 0)

  return (
    <>
      <VersionBanner onConfirm={() => {}} />
      {showWordImport && (
        <WordImport
          hasCustomVocab={hasCustom}
          customCount={customCount}
          customVocab={customVocab}
          onImport={(vocab, levels) => { importVocab(vocab, levels); setShowWordImport(false) }}
          onClear={handleClearCustom}
          onClose={() => setShowWordImport(false)}
        />
      )}
      <div className="w-full max-w-sm sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto flex flex-col items-center relative min-h-[100dvh] px-3 sm:px-4 md:px-6 pt-2 pb-6">
      {/* Welcome */}
      {prog.phase === 'welcome' && (
        <WelcomeOverlay
          onStart={handleWelcomeStart}
          hasCustomVocab={hasCustom}
          onOpenImport={() => setShowWordImport(true)}
        />
      )}

      {/* Playing + LevelComplete */}
      {(prog.phase === 'playing' || prog.phase === 'levelComplete') && (
        <>
          <ScoreBoard
            score={prog.totalScore}
            combo={prog.combo}
            levelName={level?.name ?? ''}
            levelIndex={prog.levelIndex}
            totalLevels={prog.totalLevels}
            subsectionIndex={prog.subsectionIndex}
            subsectionLabel={currentSub?.label ?? ''}
            showHelp={showHelpBtn}
            helpLevel={prog.help.helpLevel}
            onUseHelp={prog.useHelp}
            onDebugActivate={() => setDebugOpen(v => !v)}
          />

          {subsectionType === 'match' ? (
            <GameCanvas canvasRef={canvasRef} onTap={handleTap} onResize={setupCanvas} />
          ) : (
            <div className="relative w-full bg-white rounded-[2rem] p-3 sm:p-4 md:p-6 shadow-[0_24px_48px_rgba(132,204,22,0.15)] border-4 border-white flex items-center justify-center" style={{ minHeight: 'clamp(280px, 55vh, 600px)' }}>
              <SpellCanvas
                state={spellState}
                helpLevel={prog.help.helpLevel}
                showHelp={showHelpBtn}
                onTapCandidate={tapCandidate}
                onTapSlot={tapSlot}
                onUseHelp={prog.useHelp}
              />
              {spellResult !== null && (
                <div className={`absolute inset-0 flex items-center justify-center rounded-[2rem] pointer-events-none ${spellResult ? 'bg-green-100/60' : 'bg-red-100/60'}`}>
                  <span className="text-5xl animate-bounce">
                    {spellResult ? '✅' : '❌'}
                  </span>
                </div>
              )}
            </div>
          )}

          <StatusBar
            accuracy={prog.accuracy}
            matchedCount={prog.subsectionCorrect}
          />

          {/* Level complete overlay */}
          {prog.phase === 'levelComplete' && (
            <LevelCompleteOverlay
              stars={prog.levelResults[prog.levelIndex]?.stars ?? 1}
              accuracy={prog.levelResults[prog.levelIndex]?.accuracy ?? prog.accuracy}
              onNext={handleNextLevel}
            />
          )}
        </>
      )}

      {/* Certificate */}
      {prog.phase === 'allComplete' && (
        <Certificate
          totalScore={prog.totalScore}
          totalStars={totalStars}
          onRestart={handleRestart}
        />
      )}

      {/* Debug Panel (三击"第X/Y关"徽章触发) */}
      {debugOpen && (
        <DebugPanel
          phase={prog.phase}
          levelIndex={prog.levelIndex}
          subsectionIndex={prog.subsectionIndex}
          totalScore={prog.totalScore}
          combo={prog.combo}
          accuracy={prog.accuracy}
          subsectionCorrect={prog.subsectionCorrect}
          subsectionAttempts={prog.subsectionAttempts}
          helpConsecutiveErrors={prog.help.consecutiveErrors}
          helpLevel={prog.help.helpLevel}
          stars={totalStars}
          onJumpLevel={prog.debug.jumpToLevel}
          onJumpSubsection={prog.debug.jumpToSubsection}
          onJumpPhase={prog.debug.jumpToPhase}
          onSetScore={prog.debug.setScore}
          onReset={prog.debug.resetAll}
          onClose={() => setDebugOpen(false)}
        />
      )}

      {/* Guide Page */}
      {showGuide && (
        <GuidePage onClose={() => setShowGuide(false)} />
      )}

      {/* Feedback Form */}
      {showFeedback && (
        <FeedbackForm onClose={() => setShowFeedback(false)} />
      )}
    </div>

    {/* Guide button */}
    {(prog.phase === 'welcome' || prog.phase === 'playing') && !showGuide && (
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="fixed top-2 right-2 sm:top-4 sm:right-4 z-30 w-9 h-9 sm:w-11 sm:h-11 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] flex items-center justify-center text-lg sm:text-xl font-bold text-gray-600 hover:text-emerald-600 transition-all active:scale-90"
        aria-label="使用说明"
      >
        ?
      </button>
    )}

    {/* Feedback button — bottom right */}
    {(prog.phase === 'welcome' || prog.phase === 'playing') && !showFeedback && (
      <button
        type="button"
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-6 right-4 z-30 bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] px-3 py-2 flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-amber-600 transition-all active:scale-90"
        aria-label="反馈"
      >
        💬 反馈
      </button>
    )}
    </>
  )
}

export default App
