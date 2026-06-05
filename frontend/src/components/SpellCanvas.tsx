import { useEffect, useRef } from 'react'
import type { SpellState } from '../hooks/useSpellEngine'

interface Props {
  state: SpellState | null
  helpLevel: number
  showHelp: boolean
  onTapCandidate: (c: string) => void
  onUseHelp: () => void
}

export function SpellCanvas({ state, helpLevel, showHelp, onTapCandidate, onUseHelp }: Props) {
  const prevCorrectRef = useRef<boolean | null>(null)

  useEffect(() => {
    prevCorrectRef.current = state?.isCorrect ?? null
  }, [state?.isCorrect])

  if (!state) {
    return <div className="flex-1 flex items-center justify-center text-gray-400">加载中...</div>
  }

  const { prompt, slots, candidates, isComplete, isCorrect, displaySentence } = state
  const showResult = isComplete && isCorrect !== null

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-5 md:gap-7 lg:gap-9 w-full px-1">
      {/* 中文提示 */}
      <div className="bg-white rounded-2xl px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 shadow-md border-2 border-amber-200">
        <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-amber-700">{prompt}</span>
      </div>

      {/* 句子展示（完形填空模式） */}
      {displaySentence && (
        <div className="bg-white/80 rounded-xl px-3 sm:px-5 md:px-6 py-2 text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-blue-800 border border-blue-200 max-w-full break-words text-center">
          {displaySentence}
        </div>
      )}

      {/* 槽位 */}
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-2.5">
        {slots.map((slot) => (
          <div
            key={slot.index}
            className={`
              w-9 h-11 sm:w-11 sm:h-14 md:w-14 md:h-16 lg:w-16 lg:h-20 rounded-xl md:rounded-2xl border-3 flex items-center justify-center
              text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold touch-target transition-all duration-200
              ${slot.char
                ? 'bg-blue-100 border-blue-400 text-blue-800 shadow-sm'
                : 'bg-white/80 border-dashed border-gray-300 text-gray-400'
              }
              ${showResult && isCorrect ? 'bg-green-100 border-green-400 text-green-700 scale-105' : ''}
              ${showResult && isCorrect === false ? 'bg-red-100 border-red-400 text-red-700 animate-pulse' : ''}
            `}
          >
            {slot.char ?? ''}
          </div>
        ))}
      </div>

      {/* 候选按钮 */}
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-3 max-w-full px-1">
        {candidates.map((c, i) => {
          const usedCount = slots.filter(s => s.char === c).length
          const availableCount = state.answerTokens.filter(t => t === c).length
          const used = availableCount > 0 && usedCount >= availableCount
          return (
            <button
              type="button"
              key={`${c}-${i}`}
              onClick={() => !used && !isComplete && onTapCandidate(c)}
              disabled={used || isComplete}
              className={`
                px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-xl md:rounded-2xl text-base sm:text-lg md:text-xl lg:text-2xl font-bold border-2 md:border-3
                touch-target transition-all duration-150
                ${used
                  ? 'opacity-30 scale-90 border-gray-200 bg-gray-100 text-gray-400'
                  : 'bg-white border-blue-300 text-blue-700 shadow-sm hover:bg-blue-50 active:scale-90'
                }
              `}
            >
              {c}
            </button>
          )
        })}
      </div>

      {/* 求助按钮 */}
      {showHelp && helpLevel < 3 && !isComplete && (
        <button
          type="button"
          onClick={onUseHelp}
          className="mt-1 sm:mt-2 md:mt-3 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3.5 bg-amber-100 border-2 border-amber-300 rounded-xl text-amber-700 font-bold text-xs sm:text-sm md:text-base hover:bg-amber-200 active:scale-95 touch-target transition-all"
        >
          {helpLevel === 0 ? '💡 首字母 (-300)' :
           helpLevel === 1 ? '💡 揭露一半 (-500)' :
           '💡 跳过 (-800)'}
        </button>
      )}
    </div>
  )
}
