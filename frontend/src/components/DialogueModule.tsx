/* DialogueModule.tsx — 对话练习（二期第一批）
 * 流程：听 Emma 说（正常/慢速）→ 看中文情景，开口回答（≤20s）→ 对比「Emma 示范 ↔ 我的录音」→ 自评
 * 积分：首次「我会了」+100、复习 +15（与跟读共用口语分池，按 reply 独立防刷）
 * 内容：DIALOGUES 全部取自 3A 教材原句；录音只在内存，用完即释，不落盘不上传
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DIALOGUES } from '../config/dialogues'
import type { DialogueRound } from '../config/dialogues'
import {
  speakDialogue, stopNeural, playRecordingUrl, playSoftTone,
  preloadVoices, unlockAudio, prefetchNeural,
} from '../hooks/useAudio'
import { useRecorder, isRestrictedWebView, recordingSupport } from '../hooks/useRecorder'
import { recordDialogue, loadDialogue, loadModuleProgress } from '../hooks/useSpokenRecords'

/** 一组 4 轮：整句开口更累，别一次塞 8 组 */
const SESSION_SIZE = 4

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 优先没答过的，不足补复习的 */
function buildQueue(): DialogueRound[] {
  const done = loadDialogue()
  const isDone = (d: DialogueRound) => Boolean(done[d.reply.trim().toLowerCase()])
  const fresh = shuffle(DIALOGUES.filter(d => !isDone(d)))
  const review = shuffle(DIALOGUES.filter(isDone))
  return [...fresh, ...review].slice(0, SESSION_SIZE)
}

interface Props {
  onExit: () => void
}

export function DialogueModule({ onExit }: Props) {
  const [queue, setQueue] = useState<DialogueRound[]>(buildQueue)
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'card' | 'done'>('card')
  const [playing, setPlaying] = useState<'cue' | 'cueSlow' | 'reply' | 'mine' | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [session, setSession] = useState({ first: 0, review: 0, score: 0, badge: false })
  /* 录音不可用时允许跳过：听 Emma 示范 → 自己开口说 → 自评 */
  const [skipped, setSkipped] = useState(false)

  const { recState, recordingUrl, start, stop, cancel } = useRecorder()
  const restricted = useMemo(() => isRestrictedWebView(), [])
  const recSupport = useMemo(() => recordingSupport(), [])
  const badgeAtStart = useRef(loadModuleProgress(false).dialogueDone)

  /* 进入模块：把本轮 cue / reply 的 Emma 示范音提前拉进缓存 */
  useEffect(() => {
    prefetchNeural(queue.flatMap(r => [r.cue, r.reply]), 'emma')
  }, [queue])

  const round = queue[idx]

  /* 进入一轮：清掉残留声音与上一轮录音，300ms 后自动播 Emma 的提示 */
  useEffect(() => {
    if (phase !== 'card' || !round) return
    stopNeural()
    setPlaying(null)
    setShowAnswer(false)
    setSkipped(false)
    cancel()
    const t = setTimeout(() => {
      setPlaying('cue')
      speakDialogue(round.cue, { onEnd: () => setPlaying(null) })
    }, 300)
    return () => {
      clearTimeout(t)
      stopNeural()
    }
  }, [idx, phase, round, cancel])

  const playCue = useCallback(() => {
    if (!round) return
    setPlaying('cue')
    speakDialogue(round.cue, { onEnd: () => setPlaying(null) })
  }, [round])

  const playCueSlow = useCallback(() => {
    if (!round) return
    setPlaying('cueSlow')
    speakDialogue(round.cue, { slow: true, onEnd: () => setPlaying(null) })
  }, [round])

  const playReply = useCallback(() => {
    if (!round) return
    setPlaying('reply')
    speakDialogue(round.reply, { onEnd: () => setPlaying(null) })
  }, [round])

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
    await start(20) // 整句回答，给 20 秒
  }, [recState, start, stop])

  const handleRetry = useCallback(() => {
    cancel()
    setSkipped(false)
  }, [cancel])

  const handleMastered = useCallback(() => {
    if (!round) return
    const { isFirst, points } = recordDialogue(round.reply)
    const badgeNow = loadModuleProgress(false).dialogueDone
    const newBadge = badgeNow && !badgeAtStart.current
    if (newBadge) badgeAtStart.current = true

    setSession(s => ({
      first: s.first + (isFirst ? 1 : 0),
      review: s.review + (isFirst ? 0 : 1),
      score: s.score + points,
      badge: s.badge || newBadge,
    }))
    playSoftTone(1200, 'sine', 0.08)
    setCelebrate(true)
    setTimeout(() => {
      setCelebrate(false)
      cancel()
      if (idx + 1 >= queue.length) setPhase('done')
      else setIdx(i => i + 1)
    }, 700)
  }, [round, idx, queue.length, cancel])

  const handleNextSession = useCallback(() => {
    setQueue(buildQueue())
    setIdx(0)
    setSession({ first: 0, review: 0, score: 0, badge: false })
    setPhase('card')
  }, [])

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
    : recordingUrl ? '已录音 ✓ 对比听听：先听 Emma 示范，再听你的'
    : skipped ? '已跳过录音：听示范，自己开口说一遍也能自评'
    : recSupport.supported ? '轮到你了，点麦克风说出回答'
    : recSupport.reason

  if (phase === 'done') {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[70vh] gap-4 py-6">
        <div className="bg-white/95 rounded-[2.5rem] p-8 max-w-md w-full text-center shadow-[0_32px_64px_rgba(0,0,0,0.12)] border-4 border-sky-100">
          <div className="text-6xl mb-3 animate-bounce">🌟</div>
          <h2 className="text-2xl font-bold text-emerald-800 bubbly-font mb-2">本组对话完成！</h2>
          <div className="text-sm text-emerald-700 space-y-1 mb-4">
            <p>首次答对 <strong className="text-lg">{session.first}</strong> 组 · 复习 {session.review} 组</p>
            <p>对话得分 <strong className="text-lg text-amber-600">+{session.score}</strong>（计入口语分）</p>
          </div>
          {session.badge && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3 mb-4 text-sm font-bold text-amber-700">
              🏅 对话勋章点亮！三枚全亮就能换金色大满贯证书
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleNextSession}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-lg py-3.5 rounded-2xl shadow-[0_12px_24px_rgba(56,189,248,0.3)] transition-all active:scale-95 bubbly-font"
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

  if (!round) return null

  return (
    <div className="w-full flex flex-col items-center gap-3 py-2 relative">
      {/* 顶栏 */}
      <div className="w-full flex items-center justify-between px-1">
        <button
          type="button"
          onClick={handleExit}
          className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-2xl shadow flex items-center justify-center text-lg font-bold text-gray-500 hover:text-sky-600 transition-all active:scale-90"
          aria-label="退出对话"
        >
          ←
        </button>
        <div className="bubbly-font text-lg sm:text-xl font-bold text-emerald-800">💬 对话练习</div>
        <div className="text-sm font-bold text-emerald-700 bg-white/80 rounded-xl px-3 py-1.5 shadow">{idx + 1}/{queue.length}</div>
      </div>

      {restricted && (
        <div className="w-full bg-amber-100 border-2 border-amber-300 text-amber-800 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-center">
          ⚠️ 微信 / QQ 内打开暂不能录音。点右上角 <strong>···</strong> 选「在浏览器打开」即可对话录音
        </div>
      )}

      {/* 情景卡 */}
      <div className="w-full bg-white/95 rounded-[2rem] px-5 py-3 shadow border-2 border-sky-100 flex items-center gap-3">
        <span className="shrink-0 text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-1 rounded-full">Unit {round.unit}</span>
        <p className="text-sm sm:text-base font-semibold text-gray-600 leading-snug">{round.scene}</p>
      </div>

      {/* Emma 的回合 */}
      <div className="w-full bg-sky-50 rounded-[2rem] p-4 sm:p-5 border-2 border-sky-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">👩‍🏫</span>
          <span className="text-xs font-bold text-sky-700">Emma 说</span>
        </div>
        <p className="text-lg sm:text-xl font-bold text-blue-800 leading-snug break-words">{round.cue}</p>
        <p className="text-sm text-gray-500 mt-1">{round.cueZh}</p>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={playCue}
            className={`flex-1 font-bold text-sm py-2.5 rounded-xl border-2 transition-all active:scale-95 ${
              playing === 'cue' ? 'bg-sky-500 text-white border-sky-500 animate-pulse' : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50'
            }`}
          >
            🔊 听一遍
          </button>
          <button
            type="button"
            onClick={playCueSlow}
            className={`flex-1 font-bold text-sm py-2.5 rounded-xl border-2 transition-all active:scale-95 ${
              playing === 'cueSlow' ? 'bg-amber-500 text-white border-amber-500 animate-pulse' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
            }`}
          >
            🐢 慢速
          </button>
        </div>
      </div>

      {/* 我的回合 */}
      <div className="w-full bg-amber-50 rounded-[2rem] p-4 sm:p-5 border-2 border-amber-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🧒</span>
          <span className="text-xs font-bold text-amber-700">轮到我说</span>
        </div>
        <p className="text-base sm:text-lg font-semibold text-orange-800">{round.replyZh}</p>
        {showAnswer ? (
          <div className="mt-2 bg-white rounded-2xl px-3 py-2.5 border border-amber-200">
            <p className="text-base sm:text-lg font-bold text-blue-800 leading-snug break-words">{round.reply}</p>
            <button
              type="button"
              onClick={playReply}
              className={`mt-2 w-full font-bold text-sm py-2 rounded-xl border-2 transition-all active:scale-95 ${
                playing === 'reply' ? 'bg-sky-500 text-white border-sky-500' : 'bg-sky-50 text-sky-700 border-sky-200'
              }`}
            >
              🔊 听 Emma 示范
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAnswer(true)}
            className="mt-2 text-xs font-bold text-amber-700 bg-white/80 rounded-xl px-3 py-1.5 border border-amber-200 transition-all active:scale-95"
          >
            💡 想不起来？看参考答案
          </button>
        )}
      </div>

      {/* 麦克风；设备不支持则换成「跳过录音」 */}
      {!recSupport.supported ? (
        <button
          type="button"
          onClick={() => setSkipped(true)}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full text-base font-bold bg-amber-400 text-white shadow-[0_12px_28px_rgba(245,158,11,0.35)] transition-all active:scale-90 mt-1 px-2"
          aria-label="跳过录音"
        >
          🎧 跳过录音
        </button>
      ) : (
        <button
          type="button"
          onClick={onMic}
          disabled={recState === 'starting' || recState === 'processing'}
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full text-3xl sm:text-4xl font-bold shadow-[0_12px_28px_rgba(56,189,248,0.35)] transition-all active:scale-90 mt-1 ${
            recState === 'recording'
              ? 'bg-red-500 text-white animate-pulse shadow-[0_12px_28px_rgba(239,68,68,0.4)]'
              : 'bg-sky-400 text-white hover:bg-sky-500'
          } disabled:opacity-50`}
          aria-label="录音"
        >
          {micLabel}
        </button>
      )}
      <p className="text-sm font-semibold text-emerald-700 text-center min-h-[1.5rem]">{statusText}</p>
      {recSupport.supported && !recordingUrl && !skipped && (
        <button type="button" onClick={() => setSkipped(true)}
          className="text-[11px] font-bold text-gray-400 underline underline-offset-2 hover:text-amber-600">
          设备不支持录音？跳过，只听示范自评
        </button>
      )}

      {/* 对比面板（录完 / 跳过录音后出现） */}
      {(recordingUrl || skipped) && (
        <div className="w-full bg-white/95 rounded-[2rem] p-4 sm:p-5 shadow-[0_16px_36px_rgba(56,189,248,0.18)] border-4 border-sky-100 space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={playReply}
              className={`flex-1 text-sm sm:text-base font-bold py-2.5 rounded-xl border-2 transition-all active:scale-95 ${
                playing === 'reply' ? 'bg-sky-500 text-white border-sky-500' : 'bg-sky-50 text-sky-700 border-sky-200'
              }`}
            >
              🔊 Emma 示范
            </button>
            <span className="text-xl text-gray-300">↔</span>
            {recordingUrl ? (
              <button
                type="button"
                onClick={playMine}
                className={`flex-1 text-sm sm:text-base font-bold py-2.5 rounded-xl border-2 transition-all active:scale-95 ${
                  playing === 'mine' ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                👤 我的录音
              </button>
            ) : (
              <span className="flex-1 text-xs font-bold py-2.5 rounded-xl bg-gray-50 text-gray-400 border-2 border-gray-100 text-center">
                🎧 已跳过录音
              </span>
            )}
          </div>
          {skipped && !recordingUrl && (
            <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
              设备不支持录音也没关系：听 Emma 示范，自己开口回答一遍，再点「我会了」照样计分。
            </p>
          )}
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

      {celebrate && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="text-7xl animate-bounce drop-shadow-lg">⭐</div>
        </div>
      )}
    </div>
  )
}
