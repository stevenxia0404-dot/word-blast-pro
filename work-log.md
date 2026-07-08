# 工作日志

## 2026-07-08 — 全栈优化 Phase 1-2 + 自定义词库 + 后端搭建 + TTS 修复

### Phase 1 — Bug 修复 + 代码质量（P0/P1）

**P0 Bug 修复**
- #1 `useSpellEngine` 竞态条件：答错 500ms 重置期间用户快速点击 → 新答案被覆盖。增加 `wrongRoundRef` + `resetTimerRef`，timeout 回调检查 round 是否匹配
- #2 `useGameEngine` setInterval 泄漏：抖动动画 interval 未清理。增加 `shakeTimersRef: Set` 追踪，`stopRender` + useEffect cleanup 中清除
- #3 ErrorBoundary：新增 `ErrorBoundary.tsx`，包裹 `<App />`，崩溃时显示友好提示+重置按钮

**P1 性能与代码质量**
- #5 localStorage 优化：`useGameProgress` 初始化 `getDefault(loadState())` 调用一次缓存，5 个 useState 共享一个解析结果，不再重复 JSON.parse ×5
- #6 React.memo：`ScoreBoard`、`StatusBar`、`GameCanvas`、`SpellCanvas` 全部 `React.memo`，避免 App 状态变更导致全树重渲染
- #7 死代码清理：删除 `SCORE.cloze`（从未使用），`useGameEngine` 改为导入 `COLOR_THEMES` 替代内联重复定义
- #8 重置逻辑去重：提取 `resetProgress()` 辅助函数，`startGame`/`jumpToLevel`/`jumpToSubsection`/`resetAll` 均复用
- #9 App.tsx 瘦身：提取 `LevelCompleteOverlay.tsx`，移除隐藏 div hack，移除 `handleTapCandidate`/`handleTapSlot` 无意义包装函数
- #10 favicon：新增 `public/favicon.svg`

**P3 新功能**
- #14 `VersionBanner.tsx`：首次启动/更新后弹窗，localStorage 记录已读版本号
- #15 信号灯 → 撤销回退：初版照搬 academy 项目信号灯风格，用户反馈风格冲突，恢复「第X/Y关」徽章三击触发 DebugPanel
- #16 自定义词库导入：
  - `wordParser.ts`：文本框/文件导入解析器，支持 5 级分隔符检测 + 中英文自动翻转 + 编号/注释行清洗 + 括号注解去除 + 按英文单词去重
  - `WordImport.tsx`：导入弹窗 UI，textarea 粘贴 + 文件上传 + 模板下载
  - `useCustomVocab.ts`：localStorage 持久化自定义词库，导入/切换/删除

### Phase 2 — 后端搭建 + 反馈系统

**Cloudflare Worker + D1**（`backend/`）
- `worker/index.js`：两路由 → `POST /api/feedback`（公开提交）+ `GET /api/feedback` + `/export`（API Key 鉴权查询）
- `schema.sql`：`feedback` 表（id/name/message/created_at）
- `wrangler.toml`：Worder name `word-blast-api`，D1 binding `DB`

**前端集成**
- `api.ts`：API_BASE + `submitFeedback`/`fetchFeedback`/`downloadFeedbackCsv` 封装
- `FeedbackForm.tsx`：右下角「💬 反馈」按钮 → 弹窗表单（选填姓名+反馈内容）→ POST Worker
- `DebugPanel.tsx` 升级：新增 Feedback Data 区块（VIEW / DOWNLOAD CSV）
- `.env`：`VITE_API_BASE` + `VITE_API_KEY`

### 词库解析器鲁棒性（wordParser.ts 重写）
- 预处理：去注释行（`//` `#` `--`）、去行首编号（`1.` `1)` `1、`）、全角空格归一化
- 5 级分隔符：Tab → 全角冒号/分号/逗号 → 半角逗号 → 多空格 → CJK 字符边界
- 中英文自动识别翻转（`苹果 apple` → `{en: "apple", zh: "苹果"}`）
- 字段清洗：去括号注解、去残留标点
- 去重：按 `en.toLowerCase()` 去重，提示跳过数量
- 错误提示：按原因分类提示，大数据量折叠显示

### TTS 人声播报修复
- `ensureVoices()`：SpeechSynthesis voice 池未加载时轮询等待（最长 3s）
- voice 兜底：无英文语音时 `utterance.voice` 和 `utterance.lang` 均不设值 → 系统默认语音兜底
- catch 块改为 `console.warn` 替代静默吞错
- Windows 无英文 TTS 语音包时仍无法播报（需系统设置安装英文语音），待跨设备验证

### 部署
- 手动 `wrangler pages deploy frontend/dist` → `d85db7ed.word-blast-pro.pages.dev`（预览）
- 生产域名 `word-blast-pro.pages.dev` + `word.boluomate.com`
- 后端 Worker 未部署：需先在 Cloudflare 创建 D1 数据库 + 跑 schema + 设 `API_KEY` secret

### 待验证
- TTS 人声播报在各设备（Windows/Mac/iPad/iPhone）表现
- 词库导入解析器实际用户场景测试
- 后端 Worker + D1 部署并测试 feedback API

## 2026-06-10 — U10词库更新 + 进度持久化 + 部署同步

### U10词库全量替换
- 词库从108条扩至125条：基础单词102 + 核心短语15 + 完整句子8
- 关卡从12关扩至13关（基础①-⑩ + 短语①-② + 句子）
- `getSubsections` 阈值调整：`<=10` 基础 / `<=12` 短语 / `13` 句子
- 旧词库全部移除（sheep/cat/rabbit等不会再出现）
- 改动文件：`gameConfig.ts`

### 进度持久化（localStorage）
- 问题：锁屏/刷新/退出重开后分数和关卡进度全部丢失
- 实现：`useGameProgress` 新增 `localStorage` 自动存档（key: `wordblast_save_v1`）
- 保存：`phase`/`levelIndex`/`totalScore`/`levelResults` 每次变更时写入
- 恢复：页面加载时从 `localStorage` 读取懒初始化
- 清除：仅显式"重新开始"时清除存档
- combo 和当前小节进度不恢复（刷新后小节从头开始但关卡总分保留）
- 改动文件：`useGameProgress.ts`

### 部署
- 手动 `wrangler pages deploy` 推到 `word-blast-pro.pages.dev`（生产域名已生效）
- `word.boluomate.com` 同源，强刷缓存后生效
- Cloudflare Pages 自动构建仍未配置（需 Dashboard 设 build command），暂时继续手动部署

## 2026-06-07 — 填空格子清空 + 部署 404 排查

### 填空格子点击清空
- 需求：拼写填空填错的格子无法退回，只能乱点等结束重新来
- 实现：`useSpellEngine` 新增 `tapSlot(index)` 方法，已填充格子点击后清空字符，`filledCount` 减1，重置 `isComplete`/`isCorrect`
- `SpellCanvas` 已填格子加 `onClick` + `active:scale-90` 反馈，仅在非 `isComplete` 状态可清空
- 改动文件：`useSpellEngine.ts`、`SpellCanvas.tsx`、`App.tsx`

### 部署 404 排查（重要）
- 现象：push 后 `169d8b0e.word-blast-pro.pages.dev` 返回 404，`word-blast-pro.pages.dev` 返回缓存旧版
- 排查过程：
  1. 第一次 commit `c453ddc` 提交了 App.tsx（含 GuidePage import）但 GuidePage.tsx 未提交 → 构建失败
  2. 第二次 commit `5751574` 补交 GuidePage 等 9 个文件，部署状态显示 Active 但仍 404
  3. 对比旧部署 `2c285e4c`（ad_hoc 手动部署）和新部署 `169d8b0e`（github:push 自动部署）的文件列表 → 旧部署有构建产物 `/index.html`，新部署只有源码 `/frontend/src/App.tsx`
  4. 查 Cloudflare API 确认项目 `build_command` 和 `destination_dir` 均为空
- **根因**：项目从未配置构建命令，之前"能用"全是本地 `wrangler pages deploy` 手动上传 dist 产物。git push 触发的自动部署跳过构建直接部署源码，根目录无 index.html
- **临时修复**：手动 `wrangler pages deploy frontend/dist` → 部署 `89ca50ee` 恢复服务
- **永久修复（待做）**：Cloudflare Dashboard → Pages → word-blast-pro → Settings → Build configuration 填入：
  - Build command: `cd frontend && npm install && npm run build`
  - Build output directory: `frontend/dist`

## 2026-06-06（晚间）— 使用说明页 + Cloudflare Web Analytics + iOS 音效排查

### iOS 首次点击延迟
- Gemini 给出的方案分析：大部分（TTS 预热/setTimeout 解耦/overlay 移除/手势抑制）已实现，仅 `-webkit-touch-callout: none` 缺失，补充后未验证
- 注入诊断代码（5种事件 + 时间戳 overlay）部署后，iPad Safari 浏览器内**未复现**问题，PWA 独立窗口也正常
- **结论**：之前累积的修复（canvas resize 坐标校准、原生 click、rAF 刷新）可能已解决该问题

### 消除音效缺失
- 根因：`audioCtx.resume()` 在 iOS 上是异步的，`playSoftTone` 未 await 导致 context 仍为 suspended 状态时 oscillator 已启动
- 修复：`playSoftTone` 改为 async，每次发音前检查 `ctx.state`，suspended 时 `await ctx.resume()`
- iPad 实测仍无音效，暂且搁置

### Cloudflare Web Analytics
- 通过 Cloudflare Dashboard 创建两个分析站点，分别追踪 `word-blast-pro.pages.dev` 和 `word.boluomate.com`
- `index.html` 嵌入 beacon script（最终 token: `96d4a251c8024a1aa7eeed6fa83c616a` 对应 boluomate.com）
- 确认 `word.boluomate.com` 自定义域名已在 Pages 项目中绑定生效（work-log 之前记录"待验证"已过期）

### 使用说明页 GuidePage
- 新增 `GuidePage.tsx`，包含 8 个板块：游戏流程/五种玩法/积分与Combo/求助机制/星级与称号/隐私说明/设备兼容/怎么开始（最后）
- 两种视觉风格：活泼（绿黄渐变+圆角卡片）和简约（白底+线条分隔），顶部一键切换
- 入口：右上角 **?** 按钮，白色圆角方块，`fixed` 定位在绿色背景上，欢迎页和游戏中可见

### 诊断代码清理
- 移除 `GameCanvas.tsx` 中所有诊断事件监听和 DOM overlay，恢复原始干净版本

### 下一步
- 音效问题考虑使用 `<audio>` 元素替代 Web Audio API（iOS 对 AudioContext 限制太多）
- 说明页可加入实际截图/插画
- 可考虑添加多账号（兄弟姐妹共用同一设备）

### iOS 消消乐点击问题（未解决）
- **现象**：iPhone/iPad mini 上消消乐环节，点第一个卡片需长按约3秒才显示选中，点第二个卡片正常即时消除
- **附加发现**：iPad 上消除时有语音播报(TTS)但无消除音效(AudioContext)；桌面端有音效无语音

### 事件层尝试（均无效）
1. `onClick` + `onTouchStart` → `onPointerDown`：双事件替换为单事件，消除重复触发
2. `onPointerDown` → `onClick` + `touch-manipulation`：绕过 pointerdown 在 iOS 的兼容性问题
3. `onClick` + `touch-manipulation` → 原生 `pointerdown` + `touch-none`：绕过 React 合成事件
4. 原生 `pointerdown` → 原生 `click`：click 是 iOS 认可的"用户手势"，可正常 resume AudioContext

### 根因修复（有效）
- **canvas resize 瓷砖坐标校准**：`setupCanvas` 检测到尺寸变化时同步重算所有未消除瓷砖的 `x/y` 和 `tileSize`，修复移动端地址栏收起/展开导致的点击命中错位

### game engine 优化
- `handleTap` 中 `playSoftTone` 从选中逻辑之前移到之后，避免音频初始化阻塞视觉反馈
- 选中卡片后强制 `cancelAnimationFrame` + `requestAnimationFrame` 刷新一帧
- 游戏初始化从 `requestAnimationFrame` 改为 `setTimeout(50ms)`，绕过 iOS 首次交互前 rAF 节流

### App 图标
- 5个尺寸图标已放入 `frontend/public/`（icon-192/512/180/152/1024.png）
- 更新 `vite.config.ts` manifest 和 `index.html` apple-touch-icon 引用对应文件

### 下一步
- iOS 首次点击延迟根因仍未知，下步需连接 Safari Web Inspector 抓事件时间线（需 Mac）或用其他方式注入诊断代码

## 2026-06-05 — Bug 修复 + iPad 适配 + Cloudflare 部署

### Bug 修复
- **重复字母按钮禁用**：`SpellCanvas.tsx` 中 `used` 检查从 `slots.some()`（布尔）改为计数比对 `usedCount >= availableCount`，解决 rabbit/apple 等含重复字母单词的第二个字母无法点击的问题
- **干扰字母误禁用**：补充 `availableCount > 0` 前置条件，确保不在答案中的干扰字母不会被标记为已用
- **TTS 朗读字母而非单词**：`SpellState` 新增 `enWord` 字段，朗读时用原始单词代替 `answerTokens.join(' ')`
- **关卡衔接空白页**：将 subsection init effect 拆为三个独立 effect，match 模式的 Canvas 初始化在 `subsectionType` 变更（GameCanvas 已挂载）之后执行，配合 `requestAnimationFrame` 确保 DOM 就绪

### Debug 后台面板
- 新增 `DebugPanel.tsx`，三击 ScoreBoard 关卡徽章（800ms 内）触发
- 功能：查看当前 state、跳转任意 Phase/Level/Subsection、直接设分数含称号快捷按钮、Reset All
- 面板定位屏幕右下角

### iPad / 平板适配
- 容器宽度：`max-w-sm` → `sm:max-w-xl` → `md:max-w-3xl` → `lg:max-w-4xl`（384→576→768→896px）
- 游戏区高度上限：480px → 600px
- SpellCanvas 槽位、候选按钮、中文提示全组件 `md:`/`lg:` 断点放大
- ScoreBoard、StatusBar、WelcomeOverlay、Certificate 同步缩放
- PWA manifest 补充 152×152、180×180 图标声明
- index.html 添加 `viewport-fit=cover`、`apple-mobile-web-app-title`、多档 apple-touch-icon

### Cloudflare 部署
- 通过 `wrangler pages deploy` 推送至 Cloudflare Pages
- 项目地址：`https://word-blast-pro.pages.dev`
- 绑定自定义域名 `word.boluomate.com`（待完成 CNAME 验证）
- GitHub 仓库：`https://github.com/stevenxia0404-dot/word-blast-pro`

## 2026-05-31 — 项目初始化

**完成内容：**

- 使用 Vite 8 + React 19 + TypeScript 6 搭建前端脚手架
- 集成 Tailwind CSS v4.3.0（使用 `@tailwindcss/vite` 插件，CSS-first 配置，无需 `tailwind.config.js`）
- 建立项目骨架目录结构：
  - `frontend/src/assets/` — 静态资源
  - `frontend/src/config/gameConfig.ts` — 词汇表与色彩主题配置
  - `frontend/src/components/GameCanvas.tsx` — 核心 Canvas 渲染组件
  - `frontend/src/components/ScoreBoard.tsx` — 顶部计分牌组件
  - `backend/` — 预留后端子目录
- 清理 Vite 模板样板文件，App.tsx 置为零状态骨架
- 根目录添加 `.gitignore`
- `npm run build` 编译通过

**下一步：** 填充 `gameConfig.ts` 配置数据，实现 `GameCanvas.tsx` 和 `ScoreBoard.tsx` 组件。
