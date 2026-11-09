/* HomeScreen.tsx — 模块首页
 * 三入口：闯关练习 / 跟读练习 / 对话练习（二期已点亮）
 * 底部：成绩行（闯关分 + 口语分 + 称号）+ 三枚模块勋章 + 导入行 + 功能区
 * 恒为第一屏 —— 与闯关进度解耦，老用户刷新也不会找不到入口
 */
import type { TitleDef } from '../config/gameConfig'
import type { ModuleProgress } from '../hooks/useSpokenRecords'

interface Props {
  blastAction: 'start' | 'resume' | 'certificate'
  blastLevel?: number
  blastScore: number
  spokenScore: number
  title: TitleDef
  hasCustomVocab: boolean
  progress: ModuleProgress
  /** dev 演示：?grand 强制点亮三枚勋章，可一键预览金色大满贯证书 */
  demo?: boolean
  onStartBlast: () => void
  onStartRepeat: () => void
  onStartDialogue: () => void
  onPreviewCertificate?: () => void
  onOpenImport: () => void
  onDownloadTemplate: () => void
  onOpenSync: () => void
  onOpenParent: () => void
  onOpenReport: () => void
}

const BLAST_SUBTITLE = {
  start: '开始闯关',
  resume: '继续闯关',
  certificate: '查看证书',
} as const

export function HomeScreen({
  blastAction, blastLevel, blastScore, spokenScore, title,
  hasCustomVocab, progress, demo,
  onStartBlast, onStartRepeat, onStartDialogue, onPreviewCertificate,
  onOpenImport, onDownloadTemplate, onOpenSync, onOpenParent, onOpenReport,
}: Props) {
  const badges = [
    { label: '闯关', done: progress.blastDone },
    { label: '跟读', done: progress.repeatDone },
    { label: '对话', done: progress.dialogueDone },
  ]

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto overscroll-contain bg-gradient-to-br from-lime-400 to-emerald-500">
      <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="bg-white/95 rounded-[2.5rem] p-5 sm:p-7 max-w-md w-full text-center shadow-[0_32px_64px_rgba(0,0,0,0.15)] border-4 border-lime-100 flex flex-col items-center">
          <div className="text-4xl sm:text-5xl animate-bounce mb-2">✨🎮✨</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-emerald-800 bubbly-font tracking-wide">Word Blast</h1>
          <p className="text-emerald-600 font-semibold mt-1 mb-4 text-sm sm:text-base">中英单词学习大冒险</p>

          {/* ── 三张模块卡片 ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full mb-4">
            <button
              type="button"
              onClick={onStartBlast}
              className="relative flex flex-col items-center justify-center gap-1 min-h-[104px] px-2 py-4 rounded-2xl bg-emerald-500 text-white shadow-[0_10px_22px_rgba(16,185,129,0.32)] transition-all active:scale-95 hover:bg-emerald-600"
            >
              <span className="text-3xl">🎮</span>
              <span className="font-bold text-base bubbly-font">闯关练习</span>
              <span className="text-[11px] opacity-90">
                {BLAST_SUBTITLE[blastAction]}{blastAction === 'resume' && blastLevel ? ` · 第 ${blastLevel} 关` : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={onStartRepeat}
              className="relative flex flex-col items-center justify-center gap-1 min-h-[104px] px-2 py-4 rounded-2xl bg-amber-400 text-white shadow-[0_10px_22px_rgba(245,158,11,0.3)] transition-all active:scale-95 hover:bg-amber-500"
            >
              <span className="text-3xl">🗣️</span>
              <span className="font-bold text-base bubbly-font">跟读练习</span>
              <span className="text-[11px] opacity-90">听 · 读 · 比</span>
            </button>

            <button
              type="button"
              onClick={onStartDialogue}
              className="relative flex flex-col items-center justify-center gap-1 min-h-[104px] px-2 py-4 rounded-2xl bg-sky-400 text-white shadow-[0_10px_22px_rgba(56,189,248,0.3)] transition-all active:scale-95 hover:bg-sky-500"
            >
              <span className="text-3xl">💬</span>
              <span className="font-bold text-base bubbly-font">对话练习</span>
              <span className="text-[11px] opacity-90">一问一答</span>
            </button>
          </div>

          {/* ── 成绩行 ── */}
          <div className="w-full bg-emerald-50/70 rounded-2xl border border-emerald-100 px-3 py-2 mb-2 flex items-center justify-center gap-3 flex-wrap text-xs sm:text-sm">
            <span className="font-bold text-gray-600">闯关分 <span className="text-emerald-700">{blastScore}</span></span>
            <span className="text-emerald-200">·</span>
            <span className="font-bold text-gray-600">口语分 <span className="text-amber-600">{spokenScore}</span></span>
            <span className="text-emerald-200">·</span>
            <span className="font-bold text-gray-600">{title.emoji} {title.name}</span>
          </div>

          {/* ── 三枚模块勋章 ── */}
          <div className="w-full grid grid-cols-3 gap-2 mb-2">
            {badges.map(b => (
              <div
                key={b.label}
                className={`flex items-center justify-center gap-1 rounded-xl py-1.5 border text-[11px] font-bold ${
                  b.done ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                <span className={b.done ? '' : 'grayscale opacity-50'}>{b.done ? '🏅' : '🔒'}</span>
                <span>{b.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mb-2">
            {progress.grandSlam
              ? '✨ 三枚全亮 · 已解锁金色大满贯证书'
              : '三枚勋章全亮 → 升级为金色大满贯证书（口语分含跟读 + 对话）'}
          </p>

          {demo && import.meta.env.DEV && (
            <button
              type="button"
              onClick={onPreviewCertificate}
              className="w-full mb-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs py-2 rounded-xl border border-amber-300 transition-all active:scale-95"
            >
              🏆 演示：查看大满贯证书
            </button>
          )}

          {/* ── 导入行 ── */}
          <div className="w-full flex gap-2 mb-2">
            <button
              type="button"
              onClick={onOpenImport}
              className="flex-1 bg-white hover:bg-lime-50 text-lime-700 font-bold text-xs sm:text-sm py-2.5 rounded-2xl border-2 border-lime-200 transition-all active:scale-95"
            >
              📂 {hasCustomVocab ? '管理课本单词' : '导入课本单词'}
            </button>
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="flex-1 bg-white hover:bg-lime-50 text-lime-700 font-bold text-xs sm:text-sm py-2.5 rounded-2xl border-2 border-lime-200 transition-all active:scale-95"
            >
              ⬇️ 下载模板
            </button>
          </div>
          {/* ── 功能区：同步 / 家长区 / 学习报告 ── */}
          <div className="w-full grid grid-cols-3 gap-2 mb-2">
            <button
              type="button"
              onClick={onOpenSync}
              className="flex flex-col items-center justify-center gap-0.5 bg-white hover:bg-sky-50 text-sky-700 font-bold text-[11px] py-2 rounded-2xl border-2 border-sky-100 transition-all active:scale-95"
            >
              <span className="text-base leading-none">☁️</span>
              <span>跨设备同步</span>
            </button>
            <button
              type="button"
              onClick={onOpenParent}
              className="flex flex-col items-center justify-center gap-0.5 bg-white hover:bg-violet-50 text-violet-700 font-bold text-[11px] py-2 rounded-2xl border-2 border-violet-100 transition-all active:scale-95"
            >
              <span className="text-base leading-none">👨‍👩‍👧</span>
              <span>家长区</span>
            </button>
            <button
              type="button"
              onClick={onOpenReport}
              className="flex flex-col items-center justify-center gap-0.5 bg-white hover:bg-amber-50 text-amber-700 font-bold text-[11px] py-2 rounded-2xl border-2 border-amber-100 transition-all active:scale-95"
            >
              <span className="text-base leading-none">📊</span>
              <span>学习报告</span>
            </button>
          </div>
          <p className="text-[11px] text-lime-600 mb-1">（词库保存在当前设备上 · 跨设备同步即将上线）</p>

          <p className="text-[11px] text-emerald-400 mt-1">v3.2</p>
        </div>
      </div>
    </div>
  )
}
