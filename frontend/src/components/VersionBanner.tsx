import { useState } from 'react'

const BANNER_KEY = 'wordblast_banner_v1'
const BANNER_VERSION = 'v1.1'

const BANNER_MSG = `🎉 单词大爆炸 v1.1

· 词库扩容至 125 条 (U1-U10)
· 游戏进度自动保存，不怕丢分
· 填空格子支持点击清空，允许纠错
· iOS 音频修复，告别无声游戏
· 新增使用说明页面
· 界面优化，触控体验提升`

interface Props {
  onConfirm: () => void
}

export function VersionBanner({ onConfirm }: Props) {
  const [visible, setVisible] = useState(() => {
    return localStorage.getItem(BANNER_KEY) !== BANNER_VERSION
  })

  if (!visible) return null

  const handleConfirm = () => {
    localStorage.setItem(BANNER_KEY, BANNER_VERSION)
    setVisible(false)
    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white border-4 border-lime-300 rounded-[2.5rem] p-8 max-w-sm w-full shadow-[0_0_60px_rgba(132,204,22,0.3)] text-center">
        <div className="text-gray-700 text-sm leading-relaxed mb-6 whitespace-pre-line">{BANNER_MSG}</div>
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg py-3.5 rounded-2xl bubbly-font transition-all active:scale-95"
        >
          知道了
        </button>
      </div>
    </div>
  )
}
