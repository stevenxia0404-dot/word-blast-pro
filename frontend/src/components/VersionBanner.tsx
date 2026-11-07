import { useState } from 'react'

const BANNER_KEY = 'wordblast_banner_v2'
const BANNER_VERSION = 'v3.0'

const BANNER_MSG = `Word Blast v3.0

1. 全新首页
三个入口：闯关练习 / 跟读练习 / 对话练习（即将上线）。

2. 12 关新编排
单词关只放单词，短语和句子统一放到后面的「运用关」。

3. 新增跟读练习
听示范（可慢速）→ 跟读录音 → 和标准音对比回放 → 自己评「我会了」。
首次学会 +60 分，复习 +10 分，口语分独立计入称号。

4. 发音全面升级
单词和句子全部提前录好，任何设备都是同一个童声。

5. 词库可下载模板
首页「导入课本单词」→ 「下载模板」拿到三列格式：英文,中文,例句。

6. 老成绩全部保留
原来的闯关进度会自动迁移，关卡成绩不丢。`

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
