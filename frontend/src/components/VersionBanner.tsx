import { useState } from 'react'

const BANNER_KEY = 'wordblast_banner_v2'
const BANNER_VERSION = 'v3.3'

const BANNER_MSG = `Word Blast v3.3

1. 跨设备同步上线
进度、积分、词库、跟读与对话记录可以多设备共享。
两种登录：邮箱验证码，或一串同步码（没配邮件服务时用）。
没登录、断网、云端异常都照常能玩，数据先留本机，联网后自动补传。

2. 家长区与学习报告
家长区能看同步状态、管词库、导出学习数据；学习报告给三模块完成度、
近 7 天练习、薄弱关卡和称号进度，数据全部来自真实记录，不做估算。

3. 录音降级不挡人
微信 / QQ 内置浏览器或不支持录音的设备，可以直接「跳过录音」：
只听示范、自己开口说一遍、再自评，分数照常计入。

4. 隐私承诺不变
只同步学习记录，不上传孩子的录音；录音只在本机内存里当场回放。

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
