import { useState } from 'react'
import { TITLES, getSubsections } from '../config/gameConfig'
import type { GamePhase } from '../hooks/useGameProgress'
import type { LevelConfig } from '../config/gameConfig'

interface Props {
  phase: GamePhase
  levelIndex: number
  subsectionIndex: number
  totalScore: number
  combo: number
  accuracy: number
  subsectionCorrect: number
  subsectionAttempts: number
  helpConsecutiveErrors: number
  helpLevel: number
  stars: number
  totalLevels: number
  activeLevels: LevelConfig[]
  onJumpLevel: (idx: number) => void
  onJumpSubsection: (idx: number) => void
  onJumpPhase: (p: GamePhase) => void
  onSetScore: (s: number) => void
  onReset: () => void
  onClose: () => void
}

const PHASES: { key: GamePhase; label: string }[] = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'playing', label: 'Playing' },
  { key: 'levelComplete', label: 'Level Complete' },
  { key: 'allComplete', label: 'Certificate' },
]

export function DebugPanel({
  phase, levelIndex, subsectionIndex, totalScore, combo, accuracy,
  subsectionCorrect, subsectionAttempts, helpConsecutiveErrors, helpLevel,
  stars, totalLevels, activeLevels,
  onJumpLevel, onJumpSubsection, onJumpPhase, onSetScore, onReset, onClose,
}: Props) {
  const [scoreInput, setScoreInput] = useState(String(totalScore))
  const subs = activeLevels[levelIndex] ? getSubsections(activeLevels[levelIndex].id) : []

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <div className="pointer-events-auto bg-gray-900 text-gray-100 rounded-2xl shadow-2xl w-[380px] max-h-[85vh] overflow-y-auto text-xs font-mono">
        {/* header */}
        <div className="sticky top-0 bg-gray-800 rounded-t-2xl px-4 py-3 flex items-center justify-between border-b border-gray-700">
          <span className="font-bold text-sm">🔧 Debug Panel</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          {/* state overview */}
          <section>
            <h3 className="text-gray-400 uppercase tracking-wide mb-2">State</h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <span>Phase: <b className="text-lime-400">{phase}</b></span>
              <span>Level: <b>{levelIndex + 1}/{totalLevels}</b></span>
              <span>Subsection: <b>{subsectionIndex + 1}/3</b></span>
              <span>Type: <b className="text-cyan-400">{subs[subsectionIndex]?.type ?? '-'}</b></span>
              <span>Score: <b className="text-yellow-400">{totalScore}</b></span>
              <span>Combo: <b className="text-amber-400">{combo}</b></span>
              <span>Accuracy: <b>{accuracy}%</b></span>
              <span>Stars: <b className="text-yellow-400">{'⭐'.repeat(stars)}</b></span>
              <span>Correct/Att: <b>{subsectionCorrect}/{subsectionAttempts}</b></span>
              <span>Help: <b>L{helpLevel}</b> / Errs: <b>{helpConsecutiveErrors}</b></span>
            </div>
          </section>

          {/* phase jump */}
          <section>
            <h3 className="text-gray-400 uppercase tracking-wide mb-2">Phase</h3>
            <div className="flex gap-1.5 flex-wrap">
              {PHASES.map(p => (
                <button
                  key={p.key}
                  onClick={() => onJumpPhase(p.key)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    phase === p.key
                      ? 'bg-lime-500 text-black'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          {/* level jump */}
          <section>
            <h3 className="text-gray-400 uppercase tracking-wide mb-2">Level</h3>
            <div className="flex gap-1 flex-wrap">
              {activeLevels.map((l, i) => (
                <button
                  key={l.id}
                  onClick={() => onJumpLevel(i)}
                  className={`px-2 py-1 rounded-lg font-bold transition-all ${
                    i === levelIndex
                      ? 'bg-lime-500 text-black'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {l.id}
                </button>
              ))}
            </div>
          </section>

          {/* subsection jump */}
          <section>
            <h3 className="text-gray-400 uppercase tracking-wide mb-2">Subsection</h3>
            <div className="flex gap-1.5">
              {subs.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onJumpSubsection(i)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    i === subsectionIndex
                      ? 'bg-lime-500 text-black'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {i + 1}: {s.label}
                </button>
              ))}
            </div>
          </section>

          {/* score setter */}
          <section>
            <h3 className="text-gray-400 uppercase tracking-wide mb-2">Score</h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={scoreInput}
                onChange={e => setScoreInput(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-white font-mono"
              />
              <button
                onClick={() => onSetScore(Number(scoreInput) || 0)}
                className="px-3 py-1 bg-lime-600 hover:bg-lime-500 text-black font-bold rounded-lg"
              >
                Set
              </button>
            </div>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {TITLES.map(t => (
                <button
                  key={t.minScore}
                  onClick={() => { onSetScore(t.minScore); setScoreInput(String(t.minScore)) }}
                  className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-[10px]"
                >
                  {t.emoji}{t.name}
                </button>
              ))}
            </div>
          </section>

          {/* reset */}
          <section>
            <button
              onClick={onReset}
              className="w-full py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl text-sm"
            >
              Reset All (Welcome)
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
