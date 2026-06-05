import { useEffect, useState, useRef } from 'react'
import { getTitle } from '../config/gameConfig'

interface Props {
  totalScore: number
  totalStars: number
  onRestart: () => void
}

function CounterRoll({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0)
  const ref = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const p = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(eased * target))
      if (p < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(ref.current)
  }, [target, duration])

  return <span className="bubbly-font text-2xl sm:text-3xl text-amber-500">{val}</span>
}

export function Certificate({ totalScore, totalStars, onRestart }: Props) {
  const title = getTitle(totalScore)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 600)
    const t3 = setTimeout(() => setPhase(3), 900)
    const t4 = setTimeout(() => setPhase(4), 1500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* 装饰圆斑 */}
      <div className="absolute top-[-60px] left-[-40px] w-36 sm:w-48 h-36 sm:h-48 rounded-full bg-gradient-to-br from-lime-200 to-emerald-200 opacity-60" />
      <div className="absolute bottom-[-40px] right-[-30px] w-32 sm:w-40 h-32 sm:h-40 rounded-full bg-gradient-to-tl from-yellow-200 to-lime-200 opacity-60" />

      {/* 证书卡片 */}
      <div
        className="relative bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-[20rem] sm:max-w-sm md:max-w-xl w-full text-center border-4 border-emerald-300 shadow-[0_24px_64px_rgba(0,0,0,0.12)]"
        style={{
          transform: phase >= 0 ? 'translateY(0)' : 'translateY(100px)',
          opacity: phase >= 0 ? 1 : 0,
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease',
        }}
      >
        <h1 className="text-3xl sm:text-4xl bubbly-font text-emerald-700 mb-4 sm:mb-6">🏆 毕业证书</h1>

        {/* 星星 */}
        <div className="flex justify-center gap-2 mb-3 sm:mb-5">
          {[1, 2, 3].map((_, i) => (
            <span
              key={i}
              className="text-3xl sm:text-4xl transition-all duration-500"
              style={{
                transform: phase >= 1 ? 'scale(1)' : 'scale(0)',
                opacity: phase >= 1 ? 1 : 0,
                transitionDelay: `${i * 0.15}s`,
              }}
            >
              ⭐
            </span>
          ))}
        </div>
        <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4">总计 {totalStars} 颗星</p>

        {/* 称号 */}
        <div
          className="transition-all duration-500 mb-3 sm:mb-4"
          style={{
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(20px)',
            opacity: phase >= 2 ? 1 : 0,
          }}
        >
          <span className="text-4xl sm:text-5xl">{title.emoji}</span>
          <h2 className="text-xl sm:text-2xl bubbly-font text-emerald-600 mt-1">{title.name}</h2>
        </div>

        {/* 分数 */}
        <div className="bg-amber-50 rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 border border-amber-200">
          <span className="text-xs sm:text-sm text-amber-600 font-bold block mb-1">总积分</span>
          {phase >= 3 ? <CounterRoll target={totalScore} /> : <span className="bubbly-font text-2xl sm:text-3xl text-amber-500">0</span>}
        </div>

        <p className="text-gray-400 text-[10px] sm:text-xs mb-4 sm:mb-6">{today}</p>

        {/* 按钮 */}
        <div
          className="flex gap-2 sm:gap-3 transition-all duration-500"
          style={{ opacity: phase >= 4 ? 1 : 0 }}
        >
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 sm:py-3 px-3 sm:px-5 rounded-2xl text-base sm:text-lg bubbly-font transition-all active:scale-95 touch-target"
          >
            再玩一次
          </button>
          <button
            type="button"
            onClick={() => {
              const text = `我在 Word Blast 获得了 ${totalScore} 分和 ${totalStars} 颗星！🎉`
              if (navigator.share) {
                navigator.share({ title: 'Word Blast Pro', text })
              } else {
                navigator.clipboard?.writeText(text).then(() => alert('已复制分享文案！'))
              }
            }}
            className="flex-1 bg-amber-400 hover:bg-amber-500 text-white font-bold py-2.5 sm:py-3 px-3 sm:px-5 rounded-2xl text-base sm:text-lg bubbly-font transition-all active:scale-95 touch-target"
          >
            炫耀一下
          </button>
        </div>
      </div>
    </div>
  )
}
