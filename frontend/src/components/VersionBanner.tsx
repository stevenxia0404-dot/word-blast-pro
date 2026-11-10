import { useState } from 'react'

const BANNER_KEY = 'wordblast_banner_v2'
const BANNER_VERSION = 'v3.4'

const BANNER_MSG = `Word Blast v3.4

1. 同步更简单了
去掉又长又难记的同步码，只用家长邮箱收验证码登录。
另一台设备输同一个邮箱，就能自动看到同一份进度。

2. 首页更干净
首页只留「跨设备同步」和「家长区」两个按钮；
导入课本单词、下载模板、学习报告都收进家长区。

3. 语音播报更跟手
闯关配对、拼写完成的发音提前预热，不再慢半拍；
跟读练习与对话练习快速连点时不会串音、不会突然变成系统机械音。

4. 隐私承诺不变
只同步学习记录，不上传孩子的录音；录音只在本机内存里当场回放。
没登录、断网都照常能玩，数据先留本机，联网后自动补传。

5. 老成绩全部保留
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
