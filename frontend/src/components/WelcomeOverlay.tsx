import { preloadVoices, unlockAudio } from '../hooks/useAudio'

interface Props {
  onStart: () => void
}

export function WelcomeOverlay({ onStart }: Props) {
  const handleStart = () => {
    preloadVoices()
    unlockAudio()
    onStart()
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-lime-400 to-emerald-500 z-50 flex flex-col items-center justify-center p-4 sm:p-6 transition-all duration-500">
      <div className="bg-white/95 rounded-[2.5rem] p-6 sm:p-8 max-w-[22rem] sm:max-w-sm md:max-w-xl w-full text-center shadow-[0_32px_64px_rgba(0,0,0,0.15)] border-4 border-lime-100 flex flex-col items-center">
        <div className="text-5xl sm:text-6xl md:text-7xl animate-bounce mb-3 sm:mb-4">✨🎮✨</div>
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-emerald-800 bubbly-font tracking-wide">Word Blast</h1>
        <p className="text-emerald-600 font-semibold mt-1 mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">中英单词学习大冒险</p>
        <div className="bg-emerald-50 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm md:text-base text-emerald-800 text-left mb-4 sm:mb-6 leading-relaxed border border-emerald-100">
          💡 <strong>玩法提示：</strong><br />
          每关3个小节：配对消消 → 字母拼写 → 完形填空。<br />
          通关12关即可获得毕业证书！
        </div>
        <button
          type="button"
          onClick={handleStart}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg sm:text-xl md:text-2xl py-3.5 sm:py-4 md:py-5 px-6 sm:px-8 rounded-2xl shadow-[0_12px_24px_rgba(16,185,129,0.3)] transition-all active:scale-95 active:shadow-md bubbly-font touch-target"
        >
          PLAY (开启声音)
        </button>
      </div>
    </div>
  )
}
