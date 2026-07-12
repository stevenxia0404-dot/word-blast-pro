import { useState } from 'react'

const BANNER_KEY = 'wordblast_banner_v1'
const BANNER_VERSION = 'v2.0'

const BANNER_MSG = `Word Blast 更新

1. 使用说明页改版
点击右下角「?」查看。新增了自定义词库、数据存储、添加到主屏幕等实用章节。

2. 添加到主屏幕
说明页提供了 iPhone / 安卓 / 电脑的操作步骤。添加后可像普通 App 一样使用，离线也能打开。

3. 自定义词库
支持粘贴文本或上传文件导入单词，从课本、PDF、网页复制的内容会自动清洗解析。

4. 数据存储
学习进度和词库保存在当前设备上，不上传服务器。更换设备需重新导入词库。

5. 反馈通道
右下角「💬 反馈」按钮，欢迎提交建议和问题。

访问 word.boluomate.com 即可使用。`

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
