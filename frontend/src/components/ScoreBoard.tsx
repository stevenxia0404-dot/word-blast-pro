import { useRef } from 'react'

interface Props {
  score: number
  combo: number
  levelName: string
  levelIndex: number
  totalLevels: number
  subsectionIndex: number
  subsectionLabel: string
  showHelp: boolean
  helpLevel: number
  onUseHelp: () => void
  onDebugActivate: () => void
}

const HELP_LABELS = ['', '💡 首字母 -300', '💡 揭露一半 -500', '💡 跳过 -800']

export function ScoreBoard({
  score, combo, levelName, levelIndex, totalLevels,
  subsectionIndex, subsectionLabel, showHelp, helpLevel, onUseHelp,
  onDebugActivate,
}: Props) {
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDebugTap = () => {
    clickCountRef.current += 1
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0
      onDebugActivate()
      return
    }
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0
    }, 800)
  }

  return (
    <div className="w-full bg-white rounded-3xl p-2.5 sm:p-3 md:p-4 mb-2 sm:mb-3 shadow-[0_16px_32px_rgba(0,0,0,0.06)] border-4 border-lime-200">
      {/* 关卡信息 */}
      <div className="flex items-center justify-between mb-1.5 sm:mb-2 flex-wrap gap-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleDebugTap}
            className="bg-lime-300 text-lime-800 text-[10px] sm:text-xs md:text-sm font-bold px-2 sm:px-3 md:px-4 py-0.5 sm:py-1 rounded-full bubbly-font whitespace-nowrap hover:bg-lime-400 transition-colors select-none"
          >
            第{levelIndex + 1}/{totalLevels}关
          </button>
          <span className="text-xs sm:text-sm md:text-base font-bold text-gray-700">{levelName}</span>
        </div>
        <span className="text-[10px] sm:text-xs md:text-sm font-bold text-emerald-600 bg-emerald-50 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
          {subsectionLabel}
        </span>
      </div>

      {/* 小节进度 */}
      <div className="flex gap-1 mb-1.5 sm:mb-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`h-1.5 sm:h-2 flex-1 rounded-full transition-all ${
              i < subsectionIndex ? 'bg-emerald-400' :
              i === subsectionIndex ? 'bg-lime-400 animate-pulse' :
              'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* 分数 & Combo */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-lg sm:text-xl md:text-2xl">🏆</span>
          <span className="text-lg sm:text-xl md:text-2xl font-bold text-gray-700 bubbly-font">{score}</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {combo >= 3 && (
            <span className="text-[10px] sm:text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
              🔥 x{combo}
            </span>
          )}

          {showHelp && helpLevel < 3 && (
            <button
              type="button"
              onClick={onUseHelp}
              className="text-[10px] sm:text-xs font-bold text-amber-600 bg-amber-100 hover:bg-amber-200 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full touch-target transition-all active:scale-90 whitespace-nowrap"
            >
              {HELP_LABELS[helpLevel + 1]}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
