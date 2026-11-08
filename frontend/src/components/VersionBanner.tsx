import { useState } from 'react'

const BANNER_KEY = 'wordblast_banner_v2'
const BANNER_VERSION = 'v3.1'

const BANNER_MSG = `Word Blast v3.1

1. 内置 3A 教材内容
Unit 1-5 的 66 个词汇 + 50 个教材句子，全部内置，打开就能学。

2. 关卡重新编排
单词关 ×5（消消乐 + 字母拼写）、短语关 ×2、句子关 ×5（挖教材原句）。

3. 跟读练习支持整句
听示范 → 跟读录音 → 对比回放 → 自评。
单词首次 +60 分，整句首次 +100 分（整句开口更难）。

4. 发音全面升级
所有词汇和句子提前录好，任何设备都是同一个童声（Ana）。

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
