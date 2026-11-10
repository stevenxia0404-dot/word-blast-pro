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
          <p>首页选「🎮 闯关练习」，逐关挑战，每关包含<strong>不同玩法的小节</strong>，从左到右依次完成。</p>
          <p>内置<strong>3A 教材 Unit 1-5</strong> 的 66 个词汇和 50 个句子，分三类关卡：</p>
          <p>· <strong>单词关 ×5</strong>（50 个单词）—— 配对消消 + 字母拼写</p>
          <p>· <strong>短语关 ×2</strong>（16 个短语）—— 短语填空 + 选词拼短语</p>
          <p>· <strong>句子关 ×5</strong>（50 个教材句子）—— 句子填空</p>
          <p>全部通关后获得 <strong>🏆 毕业证书</strong>；闯关、跟读练习、对话练习三枚勋章全点亮，升级为<strong>金色大满贯证书</strong>，可无限重玩。</p>
          <p className="text-emerald-600">导入自定义词库后，会按词条类型自动生成对应关卡。</p>
        </Section>

        <Section emoji="🎮" title="四种玩法">
          <p><strong>配对消消</strong> — 点击中英文卡片，配对消除。</p>
          <p><strong>字母拼写</strong> — 按顺序点击字母拼出单词。</p>
          <p><strong>完形填空</strong> — 从候选词中选出句子缺失的单词。</p>
          <p><strong>选词拼短语</strong> — 从词库中挑选正确单词组成短语。</p>
          <p className="text-emerald-600 text-xs mt-2">单词关用前两种；短语关用完形 + 选词拼短语；句子关全部用完形填空，挖的是<strong>教材原句</strong>里的词。</p>
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

        <Section emoji="📂" title="导入课本单词与模板">
          <p>孩子课本、练习册上的单词都能导进来！</p>
          <p>首页「📂 导入课本单词」→ 粘贴进去即可（也支持上传 .txt / .csv 文件）。</p>
          <p>点「⬇️ 下载模板」拿到标准格式，<strong>四列</strong>：</p>
          <p className="font-mono text-xs bg-gray-50 rounded-lg px-2 py-1.5 text-gray-700">
            序号 | 英文单词 | 短语例句 | 中文翻译
          </p>
          <p><strong>序号</strong>列可选，填了就能一眼核对条数、查漏（漏号会提示）。<strong>短语例句</strong>列可选，留空也行。</p>
          <p>第一行的表头不用填，解析时会自动跳过。</p>
          <p>也支持直接从课本复制粘贴（英文+中文，空格或逗号分隔都行），系统会自动清洗排版、识别单词/短语/句子。</p>
          <p>点「解析预览」确认就能用。每 10 个单词自动生成一关。</p>
          <p className="text-amber-700">例句里的目标词会被挖空，做成填空题。</p>
          <p><strong>⚠️ 例句里如果有逗号，请用英文双引号包住</strong>（Excel 另存 CSV 会自动加，手写粘贴不会）。</p>
        </Section>

        <Section emoji="📚" title="导入记录">
          <p>每次导入都会<strong>新增一组，不覆盖之前的</strong>，可以导入多套课本。</p>
          <p>在导入弹窗切到「📚 导入记录」标签：</p>
          <p>· 给每组<strong>起个名字</strong>（如「三年级上册 Unit1」）</p>
          <p>· 展开可以<strong>查看和修改</strong>当时上传的每个词条，也能补词、删词</p>
          <p>· 单组删除或全部删除都可以</p>
          <p className="text-gray-500">改了词条后，关卡会自动重新计算。</p>
        </Section>

        <Section emoji="☁️" title="跨设备同步（已上线）">
          <p>首页点「☁️ 跨设备同步」，用<strong>同步码</strong>或<strong>邮箱验证码</strong>登录，多台设备就能共享进度、积分、词库和跟读记录。</p>
          <p>· 第一台设备点「创建同步空间」，抄下 20 位同步码</p>
          <p>· 另一台设备选「已有同步码？加入」，粘贴即可</p>
          <p>· 登录后每 15 秒自动检查改动，切到后台也会补传一次</p>
          <p>· <strong>不上传孩子的录音</strong>，录音只在设备内存里当场回放</p>
          <p className="text-gray-400">没登录、断网也完全能用 —— 同步是增强，不是门槛。</p>
        </Section>

        <Section emoji="🗣️" title="跟读练习">
          <p>首页选「🗣️ 跟读练习」，三步走：</p>
          <p><strong>① 听</strong> — 听标准发音（可切「🐢 慢速」逐词模仿）</p>
          <p><strong>② 读</strong> — 点大麦克风跟读一遍（最长 10 秒自动停）</p>
          <p><strong>③ 比</strong> — 「标准音 ↔ 我的录音」来回对比，自己评「我会了」或「再试一次」</p>
          <p>单词首次学会 <strong>+60 分</strong>、复习 <strong>+10 分</strong>；教材整句首次 <strong>+100 分</strong>、复习 <strong>+15 分</strong>。</p>
          <p><strong>口语分独立记账</strong>，与闯关分相加决定称号，进闯关不会被清零。</p>
          <p className="text-emerald-700">🔒 录音只在手机内存里当场回放，用完即释放，<strong>不保存、不上传</strong>。</p>
          <p className="text-amber-700">⚠️ 微信/QQ 内置浏览器不支持录音，请用 Safari 或 Chrome 打开。</p>
        </Section>

        <Section emoji="💬" title="对话练习">
          <p>首页选「💬 对话练习」，一问一答地开口练：</p>
          <p><strong>① 听</strong> — Emma 女声说出情景里的那句话（可切慢速）</p>
          <p><strong>② 答</strong> — 看中文情景提示，点麦克风说出你的回答（最长 20 秒）</p>
          <p><strong>③ 比</strong> — 「Emma 示范 ↔ 我的录音」对比，自己评「我会了」或「再试一次」</p>
          <p>想不起来可以点「💡 看参考答案」展开教材原句，不影响得分。</p>
          <p>首次答对 <strong>+100 分</strong>，复习 <strong>+15 分</strong>，与跟读练习共用口语分积分池。</p>
          <p className="text-emerald-700">📚 8 组情景对话的提问和回答，<strong>全部取自 3A 教材 Unit 1-5 原句</strong>，不编造句子。</p>
          <p className="text-emerald-700">🔒 录音同样只在内存里当场回放，<strong>不保存、不上传</strong>。</p>
        </Section>

        <Section emoji="🔊" title="发音说明">
          <p><strong>童声 Ana</strong>：消消乐播报、跟读练习示范。<strong>女声 Emma</strong>：对话练习全程（提问 + 示范回答都是她）。</p>
          <p>所有单词、句子都提前录制好（正常速 + 慢速两版），任何设备播出来都是一样的。</p>
          <p className="text-gray-400">自己导入的单词不在录音库里时，会自动改用系统语音朗读。</p>
        </Section>

        <Section emoji="💬" title="反馈">
          <p>游戏内右下角有 <strong>「💬 反馈」</strong>按钮，欢迎提交建议或遇到的问题。</p>
          <p>无需注册，提交失败时自动本地保存，不会丢失。</p>
        </Section>

        <Section emoji="🌟" title="星级与称号">
          <p>每关结束后按正确率评定 <strong>1-3 星</strong>（≥90% 三星，≥70% 两星）。</p>
          <p className="text-emerald-700">称号按<strong>闯关分 + 口语分</strong>总和判定，口语练习也能挣称号。</p>
          <p className="text-emerald-700">🏅 闯关 / 跟读练习 / 对话练习各有一枚模块勋章，三枚全亮 → <strong>金色大满贯证书</strong>。</p>
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
          <p>学习进度、口语分、跟读记录、对话记录和词库都保存在<strong>当前设备的浏览器</strong>中；开启同步后才会上传这 5 类学习记录。</p>
          <p className="text-gray-500">在首页「☁️ 跨设备同步」或家长区开启同步，多台设备共享进度。</p>
          <p className="text-amber-700">⚠️ 不开同步时，换设备或换浏览器需要重新导入词库；开同步后自动带过去。</p>
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
          <p className="text-emerald-600 text-xs mt-2">💡 桌面版和浏览器共享同一份数据，在浏览器导入词库后桌面版自动同步（同一设备）。</p>
        </Section>
      </div>

      <div className="h-8" />
      <p className="text-center text-white/60 text-xs pb-6">v3.3</p>
    </div>
  )
}
