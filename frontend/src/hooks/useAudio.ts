let audioCtx: AudioContext | null = null
let speakTimer: ReturnType<typeof setTimeout> | null = null

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

export function playSoftTone(freq: number, type: OscillatorType = 'sine', duration = 0.1) {
  try {
    const ctx = getAudioCtx()
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
  } catch { /* mute */ }
}

function getVoices(): SpeechSynthesisVoice[] {
  const voices = window.speechSynthesis?.getVoices() ?? []
  // Chrome Android / iOS 首次调用返回空，后续实时获取
  return voices
}

export function preloadVoices() {
  if (!('speechSynthesis' in window)) return
  // 触发 voice 加载（移动端关键）
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices()
  }
}

export function speakWord(wordText: string) {
  if (!('speechSynthesis' in window)) return
  try {
    // debounce：移动端 cancel 是异步的，留 60ms 让它完成
    if (speakTimer) clearTimeout(speakTimer)
    speakTimer = setTimeout(() => {
      window.speechSynthesis.cancel()
      const clean = wordText
        .replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .trim()
        .toLowerCase()
      const utterance = new SpeechSynthesisUtterance(clean)
      utterance.lang = 'en-US'
      utterance.rate = 0.85
      utterance.volume = 1.0

      const voices = getVoices()
      const best =
        voices.find(v =>
          v.lang.includes('en') &&
          (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))
        ) ||
        voices.find(v => v.lang.includes('en-US') && (v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Karen'))) ||
        voices.find(v => v.lang.includes('en-US')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0]

      if (best) utterance.voice = best
      window.speechSynthesis.speak(utterance)
    }, 60)
  } catch { /* mute */ }
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
