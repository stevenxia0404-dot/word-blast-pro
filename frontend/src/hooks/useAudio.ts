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

let voicesLoaded = false

function getVoices(): SpeechSynthesisVoice[] {
  const voices = window.speechSynthesis?.getVoices() ?? []
  if (voices.length > 0) voicesLoaded = true
  return voices
}

export function preloadVoices() {
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
  if (!('speechSynthesis' in window)) return
  try {
    if (speakTimer) clearTimeout(speakTimer)
    speakTimer = setTimeout(async () => {
      try {
        window.speechSynthesis.cancel()
        await ensureVoices()
        const clean = wordText
          .replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
          .trim()
          .toLowerCase()
        if (!clean) return
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
        // If no voice found at all, leave utterance defaults — system will use whatever is available
        // lang is not set when no voices, so the system voice (e.g. Chinese) will pronounce the English word

        window.speechSynthesis.speak(utterance)
      } catch (e) {
        console.warn('SpeechSynthesis speak failed:', e)
      }
    }, 60)
  } catch { /* SpeechSynthesis not available */ }
}

export function unlockAudio(): boolean {
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    playSoftTone(440, 'sine', 0.15)
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
