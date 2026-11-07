/* ComingSoonPanel.tsx — 二期功能的说明占位
 * 跨设备同步 / 家长区 / 学习报告：一行代码未实现，但入口要在，
 * 让家长知道「这个功能在规划中」而不是完全不知道存在。
 * 二期实现时，把 onClose 换成真实页面即可，组件本身可复用。
 */

interface Props {
  /** 功能标识，决定标题与内容 */
  feature: 'sync' | 'parent' | 'report'
  onClose: () => void
}

const CONTENT: Record<Props['feature'], { emoji: string; title: string; lead: string; points: string[]; note: string }> = {
  sync: {
    emoji: '☁️',
    title: '跨设备同步',
    lead: '现在学习进度和词库只存在这台设备上。换手机、换平板要重新导入一遍 —— 这确实不方便，同步功能正在做。',
    points: [
      '家长用邮箱注册，验证码登录（不需要孩子记账号）',
      '进度、积分、词库、跟读记录多设备实时共享',
      '不上传孩子的录音：跟读录音只在设备内存里当场回放',
      '没登录也完全能用 —— 同步是增强，不是门槛',
    ],
    note: '预计随「对话练习」一起上线。',
  },
  parent: {
    emoji: '👨‍👩‍👧',
    title: '家长区',
    lead: '孩子用的功能，家长用的功能，分开放。这是给家长的一个独立入口。',
    points: [
      '跨设备同步的开关与登录',
      '导入课本单词、查看导入记录',
      '学习报告：练了多久、哪些词还不熟',
      '证书与称号的查看与分享',
    ],
    note: '与跨设备同步一起上线。',
  },
  report: {
    emoji: '📊',
    title: '学习报告',
    lead: '想看清孩子到底练得怎么样，这份报告会给出来。',
    points: [
      '每天 / 每周的练习时长与完成情况',
      '哪些词反复出错（需要重点复习的清单）',
      '跟读完成率：多少词已经能自信开口',
      '称号进度：离下一个称号还差多少分',
    ],
    note: '依赖同步（数据要在多设备间可比），所以排在其后。',
  },
}

export function ComingSoonPanel({ feature, onClose }: Props) {
  const c = CONTENT[feature]
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl border-4 border-lime-200 max-h-[88vh] overflow-y-auto">
        <div className="text-center mb-3">
          <div className="text-4xl mb-1">{c.emoji}</div>
          <h3 className="text-xl font-bold text-gray-700 bubbly-font">{c.title}</h3>
          <span className="inline-block mt-1.5 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            即将上线
          </span>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed mb-3">{c.lead}</p>

        <ul className="space-y-1.5 mb-3">
          {c.points.map((p, i) => (
            <li key={i} className="flex gap-2 text-xs text-gray-600">
              <span className="text-emerald-500 shrink-0">•</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>

        <p className="text-[11px] text-gray-400 text-center mb-4">{c.note}</p>

        <button
          type="button"
          onClick={onClose}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm py-2.5 rounded-xl transition-colors active:scale-95"
        >
          知道了
        </button>
      </div>
    </div>
  )
}
