/* useAudio.ts — 语音中枢（v3.4：统一抢占 + 预热，修播报延迟 / 降级 / 串音）
 * 两级语音链：预生成神经语音（edge-tts）→ 系统 SpeechSynthesis 兜底
 * 双音色（Steven 2026-11-07 拍板）：Ana 童声 = 消消乐 + 跟读；Emma 女声 = 对话全程
 *
 * v3.4 修的三个真实问题：
 *  1) 延迟：mp3 首次加载要等网络 → 进入关卡/跟读/对话时预热本轮音频进 HTTP 缓存；
 *     系统 TTS 兜底不再 await 最长 3 秒的 voices 列表。
 *  2) 突然变机械音：旧版被新播报打断的 play() 会 reject 后仍回退系统 TTS；
 *     现在「被抢占」与「真未命中」分开，抢占时绝不兜底。
 *  3) 多人声音重叠：所有播放共用一个抢占令牌，播放前统一 cancel 系统 TTS，
 *     切题 stopNeural() 也会掐掉系统音尾巴；unlockAudio() 不再抢播报用的 audio 元素。
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
    el.removeAttribute('src')
    el.load()
  } catch { /* ignore */ }
}

type NeuralResult = 'played' | 'miss' | 'aborted'

/** 命中并播起来 = 'played'；确实没音频 = 'miss'；被新播报抢占 = 'aborted'（绝不兜底） */
async function tryPlayNeural(
  text: string, slow: boolean, onEnd: (() => void) | undefined,
  voice: VoiceId, token: number,
): Promise<NeuralResult> {
  const man = await loadManifest()
  if (token !== currentPlayToken) return 'aborted'
  if (!man) return 'miss'
  const entry = man[voice]?.[text.toLowerCase()]
  if (!entry) return 'miss'
  const el = getAudioEl()
  try { el.pause() } catch { /* ignore */ }
  el.muted = false
  el.volume = 1
  el.src = `${import.meta.env.BASE_URL}audio/${slow ? entry.s : entry.n}`
  el.onended = () => {
    el.onended = null
    if (token === currentPlayToken) onEnd?.()
  }
  try {
    await el.play()
    if (token !== currentPlayToken) {
      try { el.pause() } catch { /* ignore */ }
      return 'aborted'
    }
    return 'played'
  } catch {
    // play 被拒：若原因是被新播报抢占，绝不回退系统 TTS，否则两路声音会叠在一起
    if (token !== currentPlayToken) return 'aborted'
    try { el.pause(); el.removeAttribute('src') } catch { /* ignore */ }
    return 'miss'
  }
}

/** 音频预热：把本轮会播的 mp3 提前拉进 HTTP 缓存，点击时不再等首次加载。
 *  用独立元素 + 去重集合，不碰播放用的那个 audio 元素。 */
const prefetched = new Set<string>()
const prefetchEls: HTMLAudioElement[] = []

export function prefetchNeural(texts: string[], voice: VoiceId = 'ana') {
  void loadManifest().then(man => {
    if (!man) return
    for (const t of texts) {
      const entry = man[voice]?.[String(t).toLowerCase()]
      if (!entry) continue
      for (const file of [entry.n, entry.s]) {
        const src = `${import.meta.env.BASE_URL}audio/${file}`
        if (prefetched.has(src)) continue
        prefetched.add(src)
        const a = new Audio()
        a.preload = 'auto'
        a.src = src
        a.load()
        prefetchEls.push(a)
      }
    }
    while (prefetchEls.length > 80) {
      const old = prefetchEls.shift()
      try { old?.pause(); old?.removeAttribute('src') } catch { /* ignore */ }
    }
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
  if (r === 'miss' && token === currentPlayToken) speakSystem(text, opts.onEnd, token)
  // 'aborted'：新播报已经接管，这里什么都不做，杜绝系统 TTS 乱入
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
