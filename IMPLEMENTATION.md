# Word Blast Pro - 实施记录

## 2026-06-05 第一轮实施

### 新增文件

| 文件 | 用途 |
|------|------|
| `frontend/src/hooks/useGameProgress.ts` | 关卡进度/积分/Combo/星级/求助状态管理 |
| `frontend/src/hooks/useSpellEngine.ts` | 拼写/选词/连词/完形填空四种模式引擎 |
| `frontend/src/components/SpellCanvas.tsx` | 拼写模式 UI（提示→槽位→候选按钮） |
| `frontend/src/components/Certificate.tsx` | 通关证书（弹入动画+星星+称号+分数滚动+分享） |

### 修改文件

| 文件 | 变更 |
|------|------|
| `frontend/src/config/gameConfig.ts` | 填入108条词库、12关配置、积分/称号/星级规则 |
| `frontend/src/hooks/useGameEngine.ts` | 移除硬编码 VOCABULARY_POOL，新增 `initGame(vocab, cols, rows, callbacks)` |
| `frontend/src/hooks/useAudio.ts` | 修复移动端 TTS 三大 bug（见下方） |
| `frontend/src/App.tsx` | 完整通关链路：welcome → 12关×3小节 → 证书 |
| `frontend/src/components/ScoreBoard.tsx` | 新增关卡名称、小节进度条、求助按钮 |
| `frontend/src/components/StatusBar.tsx` | 响应式字号 |
| `frontend/src/components/WelcomeOverlay.tsx` | 更新文案，响应式布局 |
| `frontend/src/components/GameCanvas.tsx` | 响应式Canvas高度 `clamp(260px, 55vh, 480px)` |
| `frontend/src/index.css` | 动态视口、安全区、触控目标 |

### 游戏结构

```
12关线性通关：
  基础关 1-9（3×4网格）
    ├─ 小节1: 配对消消
    ├─ 小节2: 字母拼写
    └─ 小节3: 完形填空
  短语关 10-11（2×3网格）
    ├─ 小节1: 短语配对
    ├─ 小节2: 选词拼短语
    └─ 小节3: 单词拼写
  句子关 12（2×2网格）
    ├─ 小节1: 句子配对
    ├─ 小节2: 完形填空
    └─ 小节3: 连词成句
  → 毕业证书
```

### 积分体系

- 配对/拼写/填空正确: +100
- Combo 额外: +50 × 连击数
- L1 求助(首字母): -300分, 正确只得+30
- L2 求助(揭露一半): -500分, 正确只得+10
- L3 求助(跳过): -800分, 正确得0

### 称号

🌱 英语小芽 0 → 🌿 英语小苗 500 → 🌳 英语小树 1500 → 🔥 英语学霸 3000 → 👑 单词大王 5000

---

## Bug 修复 2026-06-05

### 1. L3 求助后卡住不跳题
**根因**: `useSpellEngine.revealHelp()` 在 L3 时填满所有槽位并设 `isComplete: true`，但未设 `isCorrect: true`，App.tsx effect 永远等不到触发。
**修复**: `revealHelp` 中 L3 时同步设 `isCorrect: true`。

### 2. 拼写/填空正确后无语音
**根因**: App.tsx 拼写结果处理中未调用 `speakWord()`。
**修复**: 从 `spellState.answerTokens` 拼接英文单词，调用 `speakWord()`。

### 3. 移动端 TTS 语音失效
**根因**: 三个子问题 —
- `getVoices()` 依赖静态缓存，移动端首次同步调用返回空，`onvoiceschanged` 可能已错过
- iOS voice name 不含 Google/Natural/Premium 关键字
- 移动端 `cancel()` 异步，快速连答时第二个 `speak()` 被忽略

**修复**:
- `getVoices()` 改为每次实时获取
- 第二层 fallback 加入 Samantha/Daniel/Karen（iOS 英文语音）
- `speak()` 前加 60ms debounce 等 cancel 完成

### 4. PWA 全设备自适应
**覆盖**: iPhone 全系 / iPad / iPad mini / Android 手机+平板 / 折叠屏 / 桌面
**策略**:
- 容器: `max-w-sm → sm:max-w-md → md:max-w-lg`
- Canvas 高度: `clamp(260px, 55vh, 480px)`
- 动态视口 `100dvh`，安全区 `safe-area-inset-*`
- 触控目标最小 44px
- 全部文字/间距使用响应式 Tailwind class
