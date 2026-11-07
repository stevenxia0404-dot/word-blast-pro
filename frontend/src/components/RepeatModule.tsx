/* RepeatModule.tsx — 跟读练习模块
 * 流程三步走：听（Ana 示范，正常/慢速）→ 读（点麦跟读，≤10s）→ 比（标准音 ↔ 我的录音，自评过关）
 * 激励：首次「我会了」+60、复习 +10（防刷：每词只给一次全额）；慢速不扣分
 * 录音只在内存，用完即释，不落盘不上传
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { VocabItem } from '../config/gameConfig'
import { getExampleSentence } from '../config/gameConfig'
import {
  speakNeural, stopNeural, playRecordingUrl, playSoftTone,
  preloadVoices, unlockAudio,
} from '../hooks/useAudio'
import { useRecorder, isRestrictedWebView } from '../hooks/useRecorder'
import { recordSpoken, loadSpoken } from '../hooks/useSpokenRecords'

const SESSION_SIZE = 10

interface Props {
  vocab: VocabItem[]
  onExit: () => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 一组跟读词条：优先没跟读过的，不足补复习的 */
function buildQueue(vocab: VocabItem[], size = SESSION_SIZE): VocabItem[] {
  const spoken = loadSpoken()
  const fresh = shuffle(vocab.filter(v => !spoken[v.en.trim().toLowerCase()]))
  const review = shuffle(vocab.filter(v => spoken[v.en.trim().toLowerCase()]))
  const picked = fresh.slice(0, size)
  if (picked.length < size) picked.push(...review.slice(0, size - picked.length))
  return picked
}

export function RepeatModule({ vocab, onExit }: Props) {
  const [queue, setQueue] = useState<VocabItem[]>(() => buildQueue(vocab))
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'card' | 'done'>('card')
  const [playing, setPlaying] = useState<'model' | 'slow' | 'mine' | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [session, setSession] = useState({ first: 0, review: 0, score: 0 })

  const { recState, recordingUrl, start, stop, cancel } = useRecorder()
  const restricted = useMemo(() => isRestrictedWebView(), [])

  const item = queue[idx]
  const sentence = item ? getExampleSentence(item) : ''

  /* 进入词条：停掉残留声音，300ms 后自动播标准音 */
  useEffect(() => {
    if (phase !== 'card' || !item) return
    stopNeural()
    setPlaying(null)
    const t = setTimeout(() => {
      setPlaying('model')
      speakNeural(item.en, { onEnd: () => setPlaying(null) })
    }, 300)
    return () => {
      clearTimeout(t)
      stopNeural()
    }
  }, [idx, phase, item])

  const playModel = useCallback(() => {
    if (!item) return
    setPlaying('model')
    speakNeural(item.en, { onEnd: () => setPlaying(null) })
  }, [item])

  const playSlow = useCallback(() => {
    if (!item) return
    setPlaying('slow')
    speakNeural(item.en, { slow: true, onEnd: () => setPlaying(null) })
  }, [item])

  const playMine = useCallback(() => {
    if (!recordingUrl) return
    setPlaying('mine')
    playRecordingUrl(recordingUrl, () => setPlaying(null))
  }, [recordingUrl])

  const onMic = useCallback(async () => {
    if (recState === 'recording') { stop(); return }
    if (recState === 'starting' || recState === 'processing') return
    preloadVoices()
    unlockAudio()
    setPlaying(null)
    stopNeural()
    await start()
  }, [recState, start, stop])

  const handleRetry = useCallback(() => {
    cancel() // 释放录音 + blob，回「未录」态重新来
  }, [cancel])

  const handleMastered = useCallback(() => {
    if (!item) return
    // 口语分独立记账：一次同步写入「首次记录 + 累计分」，不会因进闯关被清零
    const { isFirst, points } = recordSpoken(item.en)
    setSession(s => ({
      first: s.first + (isFirst ? 1 : 0),
      review: s.review + (isFirst ? 0 : 1),
      score: s.score + points,
    }))
    playSoftTone(1200, 'sine', 0.08)
    setCelebrate(true)
    setTimeout(() => {
      setCelebrate(false)
      cancel()
      if (idx + 1 >= queue.length) {
        setPhase('done')
      } else {
        setIdx(i => i + 1)
      }
    }, 700)
  }, [item, idx, queue.length, cancel])

  const handleNextSession = useCallback(() => {
    setQueue(buildQueue(vocab))
    setIdx(0)
    setSession({ first: 0, review: 0, score: 0 })
    setPhase('card')
  }, [vocab])

  const handleExit = useCallback(() => {
    cancel()
    stopNeural()
    onExit()
  }, [cancel, onExit])

  const micLabel = recState === 'recording' ? '⏹️'
    : recState === 'starting' ? '…'
    : recordingUrl ? '🎤 重录' : '🎤'

  const statusText = recState === 'recording' ? '录音中…再点一下结束'
    : recState === 'starting' ? '正在启动麦克风…'
    : recState === 'processing' ? '处理中…'
    : recordingUrl ? '已录音 ✓ 对比听听：先标准音，再你的'
    : '点击麦克风，跟读一遍'

  if (phase === 'done') {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[70vh] gap-4 py-6">
        <div className="bg-white/95 rounded-[2.5rem] p-8 max-w-md w-full text-center shadow-[0_32px_64px_rgba(0,0,0,0.12)] border-4 border-lime-100">
          <div className="text-6xl mb-3 animate-bounce">🌟</div>
          <h2 className="text-2xl font-bold text-emerald-800 bubbly-font mb-2">本组跟读完成！</h2>
          <div className="text-sm text-emerald-700 space-y-1 mb-5">
            <p>首次学会 <strong className="text-lg">{session.first}</strong> 个 · 复习 {session.review} 个</p>
            <p>跟读得分 <strong className="text-lg text-amber-600">+{session.score}</strong>（独立计入称号）</p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleNextSession}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg py-3.5 rounded-2xl shadow-[0_12px_24px_rgba(16,185,129,0.3)] transition-all active:scale-95 bubbly-font"
            >
              🔁 再来一组
            </button>
            <button
              type="button"
              onClick={handleExit}
              className="w-full bg-white hover:bg-lime-50 text-lime-700 font-bold text-sm py-2.5 rounded-2xl border-2 border-lime-200 transition-all active:scale-95"
            >
              ← 返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!item) return null

  return (
    <div className="w-full flex flex-col items-center gap-3 py-2 relative">
      {/* 顶栏 */}
      <div className="w-full flex items-center justify-between px-1">
        <button
          type="button"
          onClick={handleExit}
          className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-2xl shadow flex items-center justify-center text-lg font-bold text-gray-500 hover:text-emerald-600 transition-all active:scale-90"
          aria-label="退出跟读"
        >
          ←
        </button>
        <div className="bubbly-font text-lg sm:text-xl font-bold text-emerald-800">🗣️ 跟读练习</div>
        <div className="text-sm font-bold text-emerald-700 bg-white/80 rounded-xl px-3 py-1.5 shadow">{idx + 1}/{queue.length}</div>
      </div>

      {/* 微信/QQ 内置浏览器：录音不可用提示 */}
      {restricted && (
        <div className="w-full bg-amber-100 border-2 border-amber-300 text-amber-800 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-center">
          ⚠️ 微信 / QQ 内打开暂不能录音。点右上角 <strong>···</strong> 选「在浏览器打开」即可跟读录音
        </div>
      )}

      {/* 大词卡 */}
      <div className="w-full bg-white rounded-[2rem] p-5 sm:p-7 shadow-[0_24px_48px_rgba(132,204,22,0.15)] border-4 border-white text-center">
        <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-800 bubbly-font tracking-wide break-words leading-tight">
          {item.en}
        </div>
        <div className="text-xl sm:text-2xl text-orange-700 font-semibold mt-2">{item.zh}</div>
        {item.type !== 'phrase' && item.type !== 'sentence' && (
          <div className="text-sm sm:text-base text-gray-400 mt-3 italic">“{sentence}”</div>
        )}
      </div>

      {/* 播放按钮 */}
      <div className="flex gap-3 w-full">
        <button
          type="button"
          onClick={playModel}
          className={`flex-1 font-bold text-sm sm:text-base py-3 rounded-2xl border-2 transition-all active:scale-95 ${
            playing === 'model'
              ? 'bg-emerald-500 text-white border-emerald-500 animate-pulse'
              : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          🔊 标准音
        </button>
        <button
          type="button"
          onClick={playSlow}
          className={`flex-1 font-bold text-sm sm:text-base py-3 rounded-2xl border-2 transition-all active:scale-95 ${
            playing === 'slow'
              ? 'bg-amber-500 text-white border-amber-500 animate-pulse'
              : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
          }`}
        >
          🐢 慢速
        </button>
      </div>

      {/* 麦克风大按钮（儿童手指 ≥60px） */}
      <button
        type="button"
        onClick={onMic}
        disabled={recState === 'starting' || recState === 'processing'}
        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full text-3xl sm:text-4xl font-bold shadow-[0_12px_28px_rgba(132,204,22,0.35)] transition-all active:scale-90 mt-1 ${
          recState === 'recording'
            ? 'bg-red-500 text-white animate-pulse shadow-[0_12px_28px_rgba(239,68,68,0.4)]'
            : 'bg-lime-400 text-white hover:bg-lime-500'
        } disabled:opacity-50`}
        aria-label="录音"
      >
        {micLabel}
      </button>
      <p className="text-sm font-semibold text-emerald-700 text-center min-h-[1.5rem]">{statusText}</p>

      {/* 对比面板（录完出现） */}
      {recordingUrl && (
        <div className="w-full bg-white/95 rounded-[2rem] p-4 sm:p-5 shadow-[0_16px_36px_rgba(132,204,22,0.18)] border-4 border-lime-100 space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={playModel}
              className={`flex-1 text-sm sm:text-base font-bold py-2.5 rounded-xl border-2 transition-all active:scale-95 ${
                playing === 'model' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              🔊 标准音
            </button>
            <span className="text-xl text-gray-300">↔</span>
            <button
              type="button"
              onClick={playMine}
              className={`flex-1 text-sm sm:text-base font-bold py-2.5 rounded-xl border-2 transition-all active:scale-95 ${
                playing === 'mine' ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              👤 我的录音
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleMastered}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base py-3 rounded-2xl shadow transition-all active:scale-95"
            >
              👍 我会了
            </button>
            <button
              type="button"
              onClick={handleRetry}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm py-3 rounded-2xl transition-all active:scale-95"
            >
              🔄 再试一次
            </button>
          </div>
        </div>
      )}

      {/* 星星庆祝 */}
      {celebrate && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="text-7xl animate-bounce drop-shadow-lg">⭐</div>
        </div>
      )}
    </div>
  )
}
