interface Props {
  onClose: () => void
}

function Section({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/95 rounded-[2rem] p-5 border-4 border-lime-100 shadow-[0_12px_24px_rgba(0,0,0,0.06)]">
      <h3 className="text-xl bubbly-font text-emerald-700 mb-3">{emoji} {title}</h3>
      <div className="text-emerald-800 text-sm leading-relaxed space-y-1">{children}</div>
    </div>
  )
}

export function GuidePage({ onClose }: Props) {
  return (
    <div className="absolute inset-0 z-50 overflow-auto bg-gradient-to-br from-lime-400 to-emerald-500">
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4">
        <h1 className="text-3xl bubbly-font text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]">📖 使用说明</h1>
        <button
          type="button"
          onClick={onClose}
          className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold backdrop-blur-sm"
        >
          ✕
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <Section emoji="🎯" title="游戏流程">
          <p>逐关挑战，每关包含<strong>不同玩法的小节</strong>，从左到右依次完成。</p>
          <p>全部通关后获得 <strong>🏆 毕业证书</strong>，可无限重玩。</p>
          <p className="text-emerald-600">导入自定义词库后，每 <strong>10 个单词</strong>自动生成一关。</p>
        </Section>

        <Section emoji="🎮" title="五种玩法">
          <p><strong>配对消消</strong> — 点击中英文卡片，配对消除。</p>
          <p><strong>字母拼写</strong> — 按顺序点击字母拼出单词。</p>
          <p><strong>完形填空</strong> — 从候选词中选出句子缺失的单词。</p>
          <p><strong>选词拼短语</strong> — 从词库中挑选正确单词组成短语。</p>
          <p><strong>连词成句</strong> — 将打乱的单词排成正确的句子。</p>
          <p className="text-emerald-600 text-xs mt-2">基础阶段使用前三种，短语/句子阶段使用后几种，每关小节组合不同。</p>
        </Section>

        <Section emoji="⭐" title="积分与 Combo">
          <p>每次答对 <strong>+100 分</strong>。</p>
          <p>连续答对触发 <strong>Combo</strong>，每次额外加分<strong>累加</strong>（第1次+50、第2次+100、第3次+150…）。</p>
          <p>答错 Combo <strong>中断归零</strong>。</p>
        </Section>

        <Section emoji="🆘" title="求助机制">
          <p>连续答错 <strong>2 次</strong>后，屏幕右上角出现求助按钮。</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="bg-amber-50 text-amber-700 rounded-full px-3 py-1 text-xs font-semibold border border-amber-200">💡 首字母 -300</span>
            <span className="bg-amber-50 text-amber-700 rounded-full px-3 py-1 text-xs font-semibold border border-amber-200">💡 揭露一半 -500</span>
            <span className="bg-amber-50 text-amber-700 rounded-full px-3 py-1 text-xs font-semibold border border-amber-200">💡 跳过 -800</span>
          </div>
        </Section>

        <Section emoji="📂" title="自定义词库">
          <p>孩子课本、练习册上的单词都能导进来！</p>
          <p>欢迎页点击「导入自定义词库」→ 把单词粘贴进去即可。</p>
          <p>格式很简单：<strong>每行一个，英文在前中文在后</strong>（电脑上操作更方便，支持上传文件）。</p>
          <p>系统会自动清洗排版，点「解析预览」确认就能用。每 10 个单词自动生成一关。</p>
        </Section>

        <Section emoji="💬" title="反馈">
          <p>游戏内右下角有 <strong>「💬 反馈」</strong>按钮，欢迎提交建议或遇到的问题。</p>
          <p>无需注册，提交失败时自动本地保存，不会丢失。</p>
        </Section>

        <Section emoji="🌟" title="星级与称号">
          <p>每关结束后按正确率评定 <strong>1-3 星</strong>（≥90% 三星，≥70% 两星）。</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { emoji: '🌱', name: '英语小芽', score: '0' },
              { emoji: '🌿', name: '英语小苗', score: '500' },
              { emoji: '🌳', name: '英语小树', score: '1500' },
              { emoji: '🔥', name: '英语学霸', score: '3000' },
              { emoji: '👑', name: '单词大王', score: '5000' },
            ].map(t => (
              <span key={t.name} className="bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 text-xs font-semibold border border-emerald-100">
                {t.emoji} {t.name} {t.score}分
              </span>
            ))}
          </div>
        </Section>

        <Section emoji="🔒" title="隐私说明">
          <p>本应用<strong>无需注册、不收集任何个人信息</strong>。</p>
          <p>游戏进度保存在设备本地，完全离线可用。</p>
          <p><strong>完全免费，无广告，无内购</strong>。</p>
        </Section>

        <Section emoji="💾" title="数据存储">
          <p>学习进度和词库保存在<strong>当前设备的浏览器</strong>中，不上传任何服务器。</p>
          <p className="text-amber-700">⚠️ 换用其他手机/平板/iPad，或同一设备换浏览器，都需要重新导入词库。</p>
        </Section>

        <Section emoji="🚀" title="怎么开始">
          <p>浏览器打开 <strong className="text-emerald-600">word.boluomate.com</strong></p>
          <p>推荐 iPad 横屏使用体验最佳。</p>
          <div className="mt-3 bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
            <button
              type="button"
              onClick={onClose}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg py-3 px-8 rounded-2xl shadow-[0_8px_16px_rgba(16,185,129,0.25)] transition-all active:scale-95 bubbly-font w-full"
            >
              PLAY (开始学习)
            </button>
          </div>
        </Section>

        <Section emoji="📲" title="添加到主屏幕">
          <p>添加到主屏幕后可像普通 App 一样使用，<strong>无需网络</strong>，一键打开。</p>
          <p><strong>🍎 iPhone / iPad：</strong>Safari 浏览器点击底部「分享」按钮（方框↑箭头图标）→ 往下滑找到<strong>「添加到主屏幕」</strong>→ 点右上角「添加」</p>
          <p><strong>🤖 安卓手机 / 平板：</strong>Chrome 浏览器点击右上角 ⋮ 菜单 →<strong>「添加到主屏幕」</strong>或「安装应用」</p>
          <p><strong>💻 电脑：</strong>Chrome / Edge 地址栏右侧点 ⊕ 图标即可安装</p>
        </Section>
      </div>

      <div className="h-8" />
    </div>
  )
}
