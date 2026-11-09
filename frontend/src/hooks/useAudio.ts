/* useAudio.ts — 语音中枢
 * 两级语音链：预生成神经语音（edge-tts）→ 系统 SpeechSynthesis 兜底
 * 双音色（Steven 2026-11-07 拍板）：
 *   Ana  童声 → 消消乐播报 + 跟读示范
 *   Emma 女声 → 对话模块全程（提问 + 示范回答）
 * manifest.json = { ana: {...}, emma: {...} }，由 tools/gen_audio.py 生成；key 统一小写
 * 兜底场景：自定义导入词（不在 manifest）、音频加载失败、极旧浏览器
 */

let audioCtx: AudioContext | null = null
let speakTimer: ReturnType<typeof setTimeout> | null = null

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
        // 老 manifest 只有 ana：emma 取空对象，对话会自动落到系统 TTS 兜底，不会报错
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

/** 停掉当前神经语音/回放（切题、兜底前调用，防两路声音重叠） */
export function stopNeural() {
  currentPlayToken++
  const el = getAudioEl()
  try {
    el.pause()
    el.onended = null
    el.removeAttribute('src')
    el.load()
  } catch { /* ignore */ }
}

/** 尝试播预生成 mp3。命中并成功启动返回 true；未命中/失败返回 false（调用方走系统 TTS 兜底） */
async function tryPlayNeural(
  text: string, slow = false, onEnd?: () => void, voice: VoiceId = 'ana',
): Promise<boolean> {
  const man = await loadManifest()
  if (!man) return false
  const entry = man[voice]?.[text.toLowerCase()]
  if (!entry) return false
  const token = ++currentPlayToken
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
    return true
  } catch {
    // play 被拒（iOS 未解锁）或加载失败：先清 src 再回退，
    // 防止预生成音频稍后加载成功与系统 TTS 撞在一起（公务英语踩过的坑）
    if (token === currentPlayToken) stopNeural()
    return false
  }
}

/** 播放录音 blob（对比回放）。与播报共用同一元素，天然互斥不重叠 */
export function playRecordingUrl(url: string, onEnd?: () => void) {
  const token = ++currentPlayToken
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

/** 神经语音播报：预生成优先，未命中/失败回退系统 TTS。默认 Ana，可指定 Emma */
export async function speakNeural(
  text: string,
  opts: { slow?: boolean; onEnd?: () => void; voice?: VoiceId } = {},
) {
  const played = await tryPlayNeural(text, opts.slow, opts.onEnd, opts.voice ?? 'ana')
  if (!played) speakWord(text)
}

/** 对话模块专用：Emma 女声（提问 + 示范回答同一人） */
export function speakDialogue(text: string, opts: { slow?: boolean; onEnd?: () => void } = {}) {
  return speakNeural(text, { ...opts, voice: 'emma' })
}

/* ── 系统 SpeechSynthesis（兜底） ── */

let voicesLoaded = false

function getVoices(): SpeechSynthesisVoice[] {
  const voices = window.speechSynthesis?.getVoices() ?? []
  if (voices.length > 0) voicesLoaded = true
  return voices
}

export function preloadVoices() {
  preloadNeuralManifest()
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    voicesLoaded = true
    window.speechSynthesis.getVoices()
  }
}

/** Wait for voices to be available (up to 3s, resolves when ready or timeout) */
async function ensureVoices(): Promise<void> {
  if (voicesLoaded || getVoices().length > 0) return
  return new Promise(resolve => {
    const start = Date.now()
    const check = () => {
      const v = getVoices()
      if (v.length > 0 || Date.now() - start > 3000) {
        voicesLoaded = v.length > 0
        resolve()
      } else {
        setTimeout(check, 200)
      }
    }
    check()
  })
}

export async function speakWord(wordText: string) {
  const clean = wordText
    .replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim()
    .toLowerCase()
  if (!clean) return

  // 1) 预生成神经语音（Ana 童声，任何设备同一音色）
  const played = await tryPlayNeural(clean)
  if (played) return

  // 2) 系统 TTS 兜底（自定义导入词 / 音频加载失败）
  if (!('speechSynthesis' in window)) return
  try {
    if (speakTimer) clearTimeout(speakTimer)
    speakTimer = setTimeout(async () => {
      try {
        window.speechSynthesis.cancel()
        await ensureVoices()
        const utterance = new SpeechSynthesisUtterance(clean)
        utterance.rate = 0.85
        utterance.volume = 1.0

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
      } catch (e) {
        console.warn('SpeechSynthesis speak failed:', e)
      }
    }, 60)
  } catch { /* SpeechSynthesis not available */ }
}

/* iOS 音频解锁：AudioContext + <audio> 元素 + speechSynthesis 三通道一次性解锁
 * <audio> 用真实静音 WAV、volume=0 播放（iOS 不认 muted=true 的解锁） */
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

export function unlockAudio(): boolean {
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    playSoftTone(440, 'sine', 0.15)

    const el = getAudioEl()
    el.volume = 0
    el.src = SILENT_WAV
    el.play()
      .then(() => {
        el.pause()
        el.removeAttribute('src')
        el.volume = 1
      })
      .catch(() => { el.volume = 1 })

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const wu = new SpeechSynthesisUtterance(' ')
      wu.volume = 0
      window.speechSynthesis.speak(wu)
    }
    return true
  } catch {
    return false
  }
}
