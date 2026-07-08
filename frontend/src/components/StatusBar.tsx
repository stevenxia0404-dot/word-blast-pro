import { memo } from 'react'

interface Props {
  accuracy: number
  matchedCount: number
}

export const StatusBar = memo(function StatusBar({ accuracy, matchedCount }: Props) {
  return (
    <div className="w-full bg-lime-100/60 border border-lime-200 rounded-2xl p-2.5 sm:p-3 md:p-4 mt-3 sm:mt-4 text-center text-xs sm:text-sm md:text-base text-lime-800 font-semibold shadow-inner">
      🎯 准确率: <span className="bubbly-font text-lime-700">{accuracy}%</span> | 已通过: <span className="bubbly-font text-lime-700">{matchedCount}</span> 题
    </div>
  )
})
