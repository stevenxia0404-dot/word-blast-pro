import { useState } from 'react'

const BANNER_KEY = 'wordblast_banner_v2'
const BANNER_VERSION = 'v3.2'

const BANNER_MSG = `Word Blast v3.2

1. 对话练习上线
Emma 女声提问 + 示范，孩子录音回答，对比回放后自己评。
8 组情景对话全部取自 3A 教材 Unit 1-5 原句。

2. 三模块勋章 + 金色大满贯证书
闯关 / 跟读 / 对话各一枚勋章，首页能看进度；三枚全亮，毕业证书升级为金色大满贯证书。

3. 跟读练习与对话统一积分池
跟读首次 +60、对话首次 +100，称号五档门槛不变，老成绩不缩水。

4. 双音色发音
消消乐和跟读是童声 Ana，对话全程是女声 Emma，都提前录好、离线可听。

5. 跨设备同步仍在单独推进
入口和说明保留，本体需要云端账号资源，做完再给你过目。

6. 老成绩全部保留
原来的闯关进度、口语分、词库都会自动保留，不会丢。`

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
