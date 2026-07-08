interface Props {
  stars: number
  accuracy: number
  onNext: () => void
}

export function LevelCompleteOverlay({ stars, accuracy, onNext }: Props) {
  return (
    <div className="absolute inset-0 bg-white/80 z-40 flex items-center justify-center">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border-4 border-lime-300 text-center max-w-xs w-full">
        <h2 className="text-3xl bubbly-font text-emerald-600 mb-3">关卡通过！</h2>
        <div className="flex justify-center gap-2 mb-4 text-4xl">
          {[0, 1, 2].map(i => (
            <span key={i} className={i < stars ? '' : 'opacity-30 grayscale'}>
              ⭐
            </span>
          ))}
        </div>
        <p className="text-gray-500 mb-6">准确率: {accuracy}%</p>
        <button
          type="button"
          onClick={onNext}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xl py-4 rounded-2xl bubbly-font transition-all active:scale-95"
        >
          下一关
        </button>
      </div>
    </div>
  )
}
