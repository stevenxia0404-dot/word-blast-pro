import { useEffect, useState, useRef } from 'react'
import { getTitle } from '../config/gameConfig'
import type { ModuleProgress } from '../hooks/useSpokenRecords'

interface Props {
  totalScore: number
  totalStars: number
  onRestart: () => void
  onHome: () => void
  /** 口语分（跟读 + 对话共用积分池）：与闯关分并列展示，总分 = 两者之和 */
  spokenScore?: number
  /** 三模块进度：决定三颗星点不点亮、证书是否升级为金色大满贯 */
  progress: ModuleProgress
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

export function Certificate({ totalScore, totalStars, onRestart, onHome, spokenScore = 0, progress }: Props) {
  // 称号按「闯关分 + 口语分」判定（旧版漏了口语分，这里补齐）
  const title = getTitle(totalScore, spokenScore)
  const [phase, setPhase] = useState(0)
  const grand = progress.grandSlam

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 600)
    const t3 = setTimeout(() => setPhase(3), 900)
    const t4 = setTimeout(() => setPhase(4), 1500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })

  const badges = [
    { key: 'blast', label: '闯关', done: progress.blastDone },
    { key: 'repeat', label: '跟读', done: progress.repeatDone },
    { key: 'dialogue', label: '对话', done: progress.dialogueDone },
  ]
  const summary = [
    { label: '闯关', value: `${totalScore} 分 · ${totalStars} ⭐` },
    { label: '跟读', value: `${progress.repeatCount}/${progress.repeatTotal} 词` },
    { label: '对话', value: `${progress.dialogueCount}/${progress.dialogueTotal} 组` },
  ]

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute top-[-60px] left-[-40px] w-36 sm:w-48 h-36 sm:h-48 rounded-full bg-gradient-to-br from-lime-200 to-emerald-200 opacity-60" />
      <div className="absolute bottom-[-40px] right-[-30px] w-32 sm:w-40 h-32 sm:h-40 rounded-full bg-gradient-to-tl from-yellow-200 to-lime-200 opacity-60" />

      <div
        className={`relative rounded-[2.5rem] p-6 sm:p-8 max-w-[20rem] sm:max-w-sm md:max-w-xl w-full text-center border-4 ${
          grand
            ? 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-amber-50 shadow-[0_24px_64px_rgba(245,158,11,0.28)]'
            : 'border-emerald-300 bg-white shadow-[0_24px_64px_rgba(0,0,0,0.12)]'
        }`}
        style={{
          transform: phase >= 0 ? 'translateY(0)' : 'translateY(100px)',
          opacity: phase >= 0 ? 1 : 0,
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease',
        }}
      >
        <h1 className={`text-3xl sm:text-4xl bubbly-font mb-2 sm:mb-4 ${grand ? 'text-amber-600' : 'text-emerald-700'}`}>
          {grand ? '🏆 大满贯证书' : '🏆 毕业证书'}
        </h1>
        {grand && (
          <p className="text-amber-600 font-bold text-sm mb-3">✨ 闯关 · 跟读 · 对话 三模块全达成 ✨</p>
        )}

        {/* 三颗大星：分别代表闯关 / 跟读 / 对话 */}
        <div className="flex justify-center gap-4 sm:gap-6 mb-2">
          {badges.map((b, i) => (
            <div key={b.key} className="flex flex-col items-center gap-0.5">
              <span
                className="text-3xl sm:text-4xl transition-all duration-500"
                style={{
                  transform: phase >= 1 ? 'scale(1)' : 'scale(0)',
                  opacity: phase >= 1 ? 1 : 0,
                  transitionDelay: `${i * 0.15}s`,
                }}
              >
                {b.done ? '⭐' : '☆'}
              </span>
              <span className={`text-[10px] font-bold ${b.done ? 'text-amber-600' : 'text-gray-400'}`}>
                {b.label}{b.done ? ' ✓' : ''}
              </span>
            </div>
          ))}
        </div>
        <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4">闯关总计 {totalStars} 颗星</p>

        <div
          className="transition-all duration-500 mb-3 sm:mb-4"
          style={{ transform: phase >= 2 ? 'translateY(0)' : 'translateY(20px)', opacity: phase >= 2 ? 1 : 0 }}
        >
          <span className="text-4xl sm:text-5xl">{title.emoji}</span>
          <h2 className="text-xl sm:text-2xl bubbly-font text-emerald-600 mt-1">{title.name}</h2>
        </div>

        {/* 分数 + 三模块摘要 */}
        <div className="bg-amber-50 rounded-2xl p-3 sm:p-4 mb-3 border border-amber-200">
          <span className="text-xs sm:text-sm text-amber-600 font-bold block mb-1">总积分</span>
          {phase >= 3
            ? <CounterRoll target={totalScore + spokenScore} />
            : <span className="bubbly-font text-2xl sm:text-3xl text-amber-500">0</span>}
          <div className="text-[11px] sm:text-xs text-amber-500/90 mt-1.5 flex justify-center gap-3 flex-wrap">
            <span>闯关 {totalScore}</span>
            <span>口语 {spokenScore}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            {summary.map(s => (
              <div key={s.label} className="bg-white/80 rounded-xl py-1.5 border border-amber-100">
                <div className="text-[10px] text-amber-600 font-bold">{s.label}</div>
                <div className="text-[11px] text-gray-600 font-semibold">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {!grand && (
          <p className="text-[11px] text-gray-400 mb-3">
            三枚勋章全点亮 → 升级为金色大满贯证书
          </p>
        )}
        <p className="text-gray-400 text-[10px] sm:text-xs mb-4 sm:mb-6">{today}</p>

        <div className="flex gap-2 sm:gap-3 transition-all duration-500" style={{ opacity: phase >= 4 ? 1 : 0 }}>
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
              const text = `我在 Word Blast 获得了 ${totalScore + spokenScore} 分和 ${totalStars} 颗星${grand ? '，还拿下了三模块大满贯' : ''}！🎉`
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
        <button
          type="button"
          onClick={onHome}
          className="mt-4 text-xs sm:text-sm font-bold text-gray-400 hover:text-emerald-600 underline underline-offset-2 transition-colors"
        >
          🏠 回首页
        </button>
      </div>
    </div>
  )
}
