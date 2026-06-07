import { useState } from 'react'

type Variant = 'playful' | 'clean'

interface Props {
  onClose: () => void
}

function SectionPlayful({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/95 rounded-[2rem] p-5 border-4 border-lime-100 shadow-[0_12px_24px_rgba(0,0,0,0.06)]">
      <h3 className="text-xl bubbly-font text-emerald-700 mb-3">{emoji} {title}</h3>
      <div className="text-emerald-800 text-sm leading-relaxed space-y-1">{children}</div>
    </div>
  )
}

function SectionClean({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-200 pb-5 last:border-0">
      <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
        <span className="text-2xl">{icon}</span> {title}
      </h3>
      <div className="text-gray-600 text-sm leading-relaxed space-y-1">{children}</div>
    </div>
  )
}

export function GuidePage({ onClose }: Props) {
  const [variant, setVariant] = useState<Variant>('playful')

  const isPlayful = variant === 'playful'
  const Section = isPlayful ? SectionPlayful : SectionClean

  const bg = isPlayful
    ? 'bg-gradient-to-br from-lime-400 to-emerald-500'
    : 'bg-white'
  const headerBg = isPlayful
    ? ''
    : 'bg-gray-50 border-b border-gray-200'
  const titleClass = isPlayful
    ? 'text-3xl bubbly-font text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]'
    : 'text-2xl font-bold text-gray-900'
  const closeBtn = isPlayful
    ? 'bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold backdrop-blur-sm'
    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-semibold'
  const contentBg = isPlayful ? '' : 'bg-white'
  const toggleBg = isPlayful
    ? 'bg-white/15 backdrop-blur-sm rounded-full p-0.5 flex gap-0.5 text-xs'
    : 'bg-gray-100 rounded-full p-0.5 flex gap-0.5 text-xs'

  const inner = (
    <>
      <Section emoji="🎯" icon="🎯" title="游戏流程">
        <p>一共 <strong>12 关</strong>，每关包含 <strong>3 个小节</strong>，从左到右依次通关。</p>
        <p>全部通关后获得 <strong>🏆 毕业证书</strong>，可无限重玩。</p>
      </Section>

      <Section emoji="🎮" icon="🎮" title="五种玩法">
        <p><strong>配对消消</strong> — 点击中英文卡片，配对消除。</p>
        <p><strong>字母拼写</strong> — 按顺序点击字母拼出单词。</p>
        <p><strong>完形填空</strong> — 从候选字母中选出正确拼写。</p>
        <p><strong>选词拼短语</strong> — 从词库中选择正确单词组成短语。</p>
        <p><strong>连词成句</strong> — 将打乱的单词排成正确的句子。</p>
      </Section>

      <Section emoji="⭐" icon="⭐" title="积分与 Combo">
        <p>每次答对 <strong>+100 分</strong>。</p>
        <p>连续答对触发 <strong>Combo</strong>，每次额外 <strong>+50 分</strong>。答错 Combo 中断。</p>
      </Section>

      <Section emoji="🆘" icon="🆘" title="求助机制">
        <p>连续答错 <strong>2 次</strong> 后，屏幕右上角出现求助按钮。</p>
        <p>求助分 3 级，级别越高提示越多，但 <strong>扣分也越多</strong>。首次求助免费。</p>
      </Section>

      <Section emoji="🌟" icon="🌟" title="星级与称号">
        <p>每关结束后按正确率评定 <strong>1-3 星</strong>（≥90% 三星，≥70% 两星）。</p>
        <div className={isPlayful ? 'mt-2 flex flex-wrap gap-2' : 'mt-2 space-y-1'}>
          {[
            { emoji: '🌱', name: '英语小芽', score: '0' },
            { emoji: '🌿', name: '英语小苗', score: '500' },
            { emoji: '🌳', name: '英语小树', score: '1500' },
            { emoji: '🔥', name: '英语学霸', score: '3000' },
            { emoji: '👑', name: '单词大王', score: '5000' },
          ].map(t => (
            <span key={t.name} className={isPlayful
              ? 'bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 text-xs font-semibold border border-emerald-100'
              : 'inline-block text-gray-600 text-sm mr-4'
            }>
              {t.emoji} {t.name} {isPlayful ? t.score + '分' : '（' + t.score + '分）'}
            </span>
          ))}
        </div>
      </Section>

      <Section emoji="🔒" icon="🔒" title="隐私说明">
        <p>本应用<strong>无需注册、不收集任何个人信息</strong>。</p>
        <p>游戏进度保存在设备本地，完全离线可用。</p>
        <p><strong>完全免费，无广告，无内购</strong>。</p>
      </Section>

      <Section emoji="📱" icon="📱" title="设备兼容">
        <p>支持 <strong>手机 / 平板 / 电脑</strong>，推荐 iPad 横屏使用体验最佳。</p>
        <p>添加到主屏幕后可像普通 App 一样使用，<strong>无需网络</strong>。</p>
      </Section>

      <Section emoji="🚀" icon="🚀" title="怎么开始">
        <p>浏览器打开 <strong className={isPlayful ? 'text-emerald-600' : 'text-blue-600'}>word.boluomate.com</strong></p>
        <p>iPad / iPhone 建议：分享按钮 → <strong>添加到主屏幕</strong>，之后一键打开。</p>
        <div className={isPlayful
          ? 'mt-3 bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100'
          : 'mt-3 bg-blue-50 rounded-lg p-3 text-center'
        }>
          <button
            type="button"
            onClick={onClose}
            className={isPlayful
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg py-3 px-8 rounded-2xl shadow-[0_8px_16px_rgba(16,185,129,0.25)] transition-all active:scale-95 bubbly-font w-full'
              : 'bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-3 px-8 rounded-xl transition-all active:scale-95 w-full'
            }
          >
            PLAY (开始学习)
          </button>
        </div>
      </Section>
    </>
  )

  return (
    <div className={`absolute inset-0 z-50 overflow-auto ${bg}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 flex items-center justify-between px-5 py-4 ${headerBg}`}>
        <h1 className={titleClass}>📖 使用说明</h1>
        <div className="flex items-center gap-3">
          {/* Style toggle */}
          <div className={toggleBg}>
            <button
              type="button"
              onClick={() => setVariant('playful')}
              className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
                isPlayful ? 'bg-white text-emerald-700 shadow-sm' : 'text-white/60'
              }`}
            >
              🎨 活泼
            </button>
            <button
              type="button"
              onClick={() => setVariant('clean')}
              className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
                !isPlayful ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'
              }`}
            >
              📋 简约
            </button>
          </div>
          <button type="button" onClick={onClose} className={closeBtn}>
            {isPlayful ? '✕' : '关闭'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`max-w-2xl mx-auto px-4 py-5 space-y-5 ${contentBg}`}>
        {inner}
      </div>

      {/* Bottom spacing */}
      <div className="h-8" />
    </div>
  )
}
