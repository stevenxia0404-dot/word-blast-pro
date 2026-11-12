/* useAudio.ts — 语音中枢（v3.4.5：缓存真生效 + 失败不降级 + 同 URL 复用）
 * 两级语音链：预生成神经语音（edge-tts）→ 系统 SpeechSynthesis 兜底
 * 双音色（Steven 2026-11-07 拍板）：Ana 童声 = 消消乐 + 跟读；Emma 女声 = 对话全程
 *
 * v3.4：统一抢占令牌、预热、区分「被抢占」与「真未命中」、独立元素做 iOS 解锁。
 * v3.4.5（2026-11-12 线上滞后/降级/重叠复现后修复）：
 *  1) 预热原来用 <audio>.load() 发 Range 请求 → 服务端 206，而 SW 缓存白名单只收 200，
 *     预热 100 个文件一个都没存下来，每次播报都重新走网络 = 滞后的主因。
 *     改为 fetch 全量（200 进 SW 缓存）+ 并发限流 3 + 每轮上限，白名单补 206，
 *     cacheName 升 v2 清掉旧的脏缓存。
 *  2) 拆分 missing（manifest 确实没这条音频）/ failed（mp3 404、解码失败、play 超时）：
 *     只有 missing 才降级系统 TTS；failed 静默并清 UI，不再突然冒机械音叠在神经音上。
 *  3) 同一 URL 不重新赋值 src（原来每次强制 load/解码）；stopNeural 不再 removeAttribute
 *     + load() 制造 AbortError 风暴；play() 加超时，慢网下 UI 不一直挂「播放中」。
 *  4) 降级发生在 beginPlay 几百毫秒之后，讲系统 TTS 前再 cancel 一次（iOS 队列不保证清干净）。
 */

let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioCtx
}

export async function playSoftTone(freq: number, type: OscillatorType = 'sine', duration = 0.1) {
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') await ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch { /* AudioContext may not be available */ }
}

/* ── 神经语音层：单 audio 元素 + manifest 查询 ── */

export type VoiceId = 'ana' | 'emma'
type VoiceEntry = { n: string; s: string }
type Manifest = Record<VoiceId, Record<string, VoiceEntry>>

let audioEl: HTMLAudioElement | null = null
let neuralManifest: Manifest | null = null
let manifestPromise: Promise<Manifest | null> | null = null
/** 全局抢占令牌：任何新播放 ++，旧播放的回调/兜底必须校验令牌一致才生效 */
let currentPlayToken = 0
/** 播放元素当前 src（相对路径）：同 URL 复用缓冲，不再每次强制 load */
let lastSrc = ''
/** play() 超时：慢网下不允许 UI 一直挂在「播放中」 */
const PLAY_TIMEOUT_MS = 1800

function getAudioEl(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio()
    audioEl.preload = 'auto'
  }
  return audioEl
}

function loadManifest(): Promise<Manifest | null> {
  if (neuralManifest) return Promise.resolve(neuralManifest)
  if (!manifestPromise) {
    manifestPromise = fetch(`${import.meta.env.BASE_URL}audio/manifest.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { ana?: Record<string, VoiceEntry>; emma?: Record<string, VoiceEntry> }) => {
        neuralManifest = { ana: d?.ana ?? {}, emma: d?.emma ?? {} }
        return neuralManifest
      })
      .catch(() => {
        manifestPromise = null // 允许下次重试
        return null
      })
  }
  return manifestPromise
}

/** 启动时预取 manifest（首次播报零延迟）。挂载即调，不阻塞渲染 */
export function preloadNeuralManifest() {
  void loadManifest()
}

function cancelSystem() {
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel() } catch { /* ignore */ }
  }
}

/** 开始一次播放：抢占令牌 + 掐掉所有其它可能正在响的通道 */
function beginPlay(): number {
  cancelSystem()
  return ++currentPlayToken
}

/** 停掉当前神经语音/回放（切题、退出模块、兜底前调用） */
export function stopNeural() {
  currentPlayToken++
  cancelSystem()
  const el = getAudioEl()
  try {
    el.pause()
    el.onended = null
    // 只归零、保留 src：removeAttribute + load() 会掐掉正在 pending 的 play()，
    // 制造一串 AbortError，还会让下次同 URL 必须重新走网络解码。
    if (el.src) el.currentTime = 0
  } catch { /* ignore */ }
}

type NeuralResult = 'played' | 'missing' | 'failed' | 'aborted'

/** played=播起来了；missing=确实没这条音频（唯一允许降级）；
 *  failed=网络/解码/超时失败（绝不降级）；aborted=被新播报抢占（什么都不做） */
async function tryPlayNeural(
  text: string, slow: boolean, onEnd: (() => void) | undefined,
  voice: VoiceId, token: number,
): Promise<NeuralResult> {
  const man = await loadManifest()
  if (token !== currentPlayToken) return 'aborted'
  if (!man) return 'missing' // 清单都拿不到：本地系统 TTS 是唯一还能出声的通道
  const entry = man[voice]?.[text.toLowerCase()]
  if (!entry) return 'missing'
  const el = getAudioEl()
  const src = `${import.meta.env.BASE_URL}audio/${slow ? entry.s : entry.n}`
  try { el.pause() } catch { /* ignore */ }
  el.muted = false
  el.volume = 1
  // 关键：同一个 URL 不重新赋值 src。旧版每次重设强制 load + 重新解码，
  // 是「点一下要等半秒」的主要开销，也让预热好的缓冲白费。
  if (lastSrc !== src) {
    el.src = src
    lastSrc = src
  } else {
    try { el.currentTime = 0 } catch { /* ignore */ }
  }
  el.onended = () => {
    el.onended = null
    if (token === currentPlayToken) onEnd?.()
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('play timeout')), PLAY_TIMEOUT_MS)
  })
  try {
    await Promise.race([el.play(), timeout])
    if (token !== currentPlayToken) {
      try { el.pause() } catch { /* ignore */ }
      return 'aborted'
    }
    return 'played'
  } catch {
    // 被抢占：绝不回退系统 TTS，否则两路声音叠在一起。
    // 网络抖动/404/超时：也绝不降级，静默收场，用户再点一次即可（此时多半已进缓存）。
    if (token !== currentPlayToken) return 'aborted'
    try { el.pause() } catch { /* ignore */ }
    return 'failed'
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** 音频预热：把本轮会播的 mp3 以「全量 200」拉进 SW Cache Storage，点击时零网络等待。
 *  v3.4.5：旧版用 <audio>.load() 发 Range 得 206，被缓存白名单挡掉，预热等于白做；
 *  而且一次并发 100 个请求会抢带宽，反而让正在点的那条播报更慢。 */
const prefetched = new Set<string>()
const PREFETCH_CONCURRENCY = 3
const MAX_PREFETCH_PER_ROUND = 30

export function prefetchNeural(texts: string[], voice: VoiceId = 'ana') {
  void loadManifest().then(man => {
    if (!man) return
    const urls: string[] = []
    for (const t of texts) {
      const entry = man[voice]?.[String(t).toLowerCase()]
      if (!entry) continue
      for (const file of [entry.n, entry.s]) {
        const src = `${import.meta.env.BASE_URL}audio/${file}`
        if (prefetched.has(src)) continue
        prefetched.add(src)
        urls.push(src)
      }
      if (urls.length >= MAX_PREFETCH_PER_ROUND) break
    }
    // fetch 不带 Range → 服务端 200 全量 → CacheFirst 能真正写进缓存。
    // 读完 body 才算一次完整响应，SW 才会落盘；失败静默，播放时仍会按需缓存。
    let cursor = 0
    const worker = async () => {
      while (cursor < urls.length) {
        const src = urls[cursor++]
        try {
          const r = await fetch(src)
          if (r.ok) await r.arrayBuffer()
        } catch { /* 单个失败不影响其余预热 */ }
      }
    }
    void Promise.all(
      Array.from({ length: Math.min(PREFETCH_CONCURRENCY, urls.length) }, () => worker()),
    )
  })
}

/** 播放录音 blob（对比回放）。与播报共用同一元素，天然互斥不重叠 */
export function playRecordingUrl(url: string, onEnd?: () => void) {
  const token = beginPlay()
  const el = getAudioEl()
  try { el.pause() } catch { /* ignore */ }
  el.muted = false
  el.volume = 1
  el.src = url
  lastSrc = url // 录音回放换掉了 src，下次播报必须重新赋值
  el.onended = () => {
    el.onended = null
    if (token === currentPlayToken) onEnd?.()
  }
  el.play().catch(() => { /* 用户手势限制：静默，用户再点一次即可 */ })
}

/** 系统 TTS 兜底。不等 voices 列表（旧版最长 3 秒等待是明显的播报延迟源） */
function speakSystem(text: string, onEnd?: () => void, token = currentPlayToken) {
  const clean = text
    .replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim()
    .toLowerCase()
  if (!clean) { onEnd?.(); return }
  if (!('speechSynthesis' in window)) { onEnd?.(); return }
  if (token !== currentPlayToken) return
  // 降级发生在 beginPlay 几百毫秒之后；iOS 的 cancel() 不保证清干净队列，
  // 讲之前再掐一次，避免机械音和还没停的神经音尾巴叠在一起。
  cancelSystem()
  try {
    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.rate = 0.85
    utterance.volume = 1.0
    utterance.onend = () => { if (token === currentPlayToken) onEnd?.() }

    const voices = getVoices()
    if (voices.length > 0) {
      const best =
        voices.find(v =>
          v.lang.includes('en') &&
          (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))
        ) ||
        voices.find(v => v.lang.includes('en-US') && (v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Karen'))) ||
        voices.find(v => v.lang.includes('en-US')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        null
      if (best) {
        utterance.voice = best
        utterance.lang = best.lang
      }
    }
    window.speechSynthesis.speak(utterance)
  } catch {
    onEnd?.()
  }
}

/** 神经语音播报：预生成优先，只有「确实没音频」才回退系统 TTS。默认 Ana，可指定 Emma */
export async function speakNeural(
  text: string,
  opts: { slow?: boolean; onEnd?: () => void; voice?: VoiceId } = {},
) {
  const token = beginPlay()
  const r = await tryPlayNeural(text, !!opts.slow, opts.onEnd, opts.voice ?? 'ana', token)
  if (r === 'aborted' || token !== currentPlayToken) return // 新播报已接管
  if (r === 'missing') speakSystem(text, opts.onEnd, token)
  else if (r === 'failed') opts.onEnd?.() // 静默失败：清掉 playing 状态，绝不降级、绝不重叠
}

/** 对话模块专用：Emma 女声（提问 + 示范回答同一人） */
export function speakDialogue(text: string, opts: { slow?: boolean; onEnd?: () => void } = {}) {
  return speakNeural(text, { ...opts, voice: 'emma' })
}

/** 兼容旧调用（消消乐配对 / 拼写完成）：只查一次 manifest，不再二次请求、不再多层兜底 */
export function speakWord(wordText: string) {
  return speakNeural(wordText)
}

/* ── 系统 SpeechSynthesis（兜底） ── */

function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? []
}

export function preloadVoices() {
  preloadNeuralManifest()
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices()
  }
}

/* iOS 音频解锁：AudioContext + <audio> 元素 + speechSynthesis 三通道一次性解锁
 * <audio> 用真实静音 WAV、volume=0 播放（iOS 不认 muted=true 的解锁）。
 * v3.4：必须用独立 Audio 元素 —— 共用播报元素会把正在播的示范音掐掉，造成偶发降级。 */
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

export function unlockAudio(): boolean {
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    playSoftTone(440, 'sine', 0.15)

    const el = new Audio()
    el.volume = 0
    el.src = SILENT_WAV
    el.play()
      .then(() => { el.pause(); el.removeAttribute('src') })
      .catch(() => { /* 未解锁就等下一次用户手势 */ })

    if ('speechSynthesis' in window) {
      const wu = new SpeechSynthesisUtterance(' ')
      wu.volume = 0
      window.speechSynthesis.speak(wu)
    }
    return true
  } catch {
    return false
  }
}
