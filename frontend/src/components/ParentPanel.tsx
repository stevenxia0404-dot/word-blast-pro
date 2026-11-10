/* ParentPanel.tsx — 家长区（真实实现）
 * v3.4：导入课本单词、下载模板、学习报告三个工具统一收进这里，首页只留两个按钮。
 * 所有操作都只碰本机数据，删除前二次确认。
 */
import { useState } from 'react'
import type { SyncApi } from '../hooks/useSync'
import { SYNC_KEYS, collectLocalData, exportStudyJson, downloadText } from '../config/syncSchema'
import { downloadCsvTemplate } from '../config/wordParser'

interface Props {
  sync: SyncApi
  onOpenSync: () => void
  onOpenImport: () => void
  onOpenReport: () => void
  onClose: () => void
}

const CARD = 'w-full bg-white/90 backdrop-blur-sm rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.98]'

export function ParentPanel({ sync, onOpenSync, onOpenImport, onOpenReport, onClose }: Props) {
  const [confirmReset, setConfirmReset] = useState(false)
  const d = collectLocalData()
  const groupCount = d.customVocab?.groups?.length ?? 0
  const wordCount = d.customVocab?.groups?.reduce((n, g) => n + (g.vocab?.length ?? 0), 0) ?? 0

  const doReset = () => {
    for (const key of Object.values(SYNC_KEYS)) {
      try { localStorage.removeItem(key) } catch { /* ignore */ }
    }
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm px-3">
      <div className="bg-white/95 backdrop-blur-md rounded-[2rem] p-5 sm:p-6 max-w-md w-full shadow-2xl border-4 border-violet-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-700 bubbly-font">👨‍👩‍👧 家长区</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">孩子练，家长管</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭"
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 active:scale-90">✕</button>
        </div>

        <div className="bg-violet-50 rounded-2xl border border-violet-100 p-3 mb-3 text-xs text-violet-800">
          <p className="font-bold text-sm mb-1">本机数据概览</p>
          <p>闯关分 {d.save?.totalScore ?? 0} · 口语分 {d.spokenScore?.score ?? 0} · 已完成 {d.save?.levelResults?.length ?? 0} 关</p>
          <p>自定义词库 {groupCount} 组 / {wordCount} 条 · 跟读记录 {Object.keys(d.spoken ?? {}).length} 条</p>
        </div>

        <div className="space-y-2">
          <button type="button" onClick={onOpenSync} className={CARD + ' border-sky-100 hover:bg-sky-50'}>
            <p className="font-bold text-sm text-sky-700">☁️ 跨设备同步</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {sync.signed ? `已开启 · ${sync.email || '家长邮箱'} · ${sync.dirty ? '有改动待同步' : '已同步'}` : '未开启 · 用家长邮箱收验证码登录'}
            </p>
          </button>
          <button type="button" onClick={onOpenImport} className={CARD + ' border-lime-100 hover:bg-lime-50'}>
            <p className="font-bold text-sm text-lime-700">📂 导入课本单词 / 导入记录</p>
            <p className="text-[11px] text-gray-500 mt-0.5">上传资料，查看和编辑历史导入内容</p>
          </button>
          <button type="button" onClick={() => downloadCsvTemplate()} className={CARD + ' border-emerald-100 hover:bg-emerald-50'}>
            <p className="font-bold text-sm text-emerald-700">⬇️ 下载模板</p>
            <p className="text-[11px] text-gray-500 mt-0.5">按「序号 / 英文单词 / 短语例句 / 中文翻译」整理资料</p>
          </button>
          <button type="button" onClick={onOpenReport} className={CARD + ' border-amber-100 hover:bg-amber-50'}>
            <p className="font-bold text-sm text-amber-700">📊 学习报告</p>
            <p className="text-[11px] text-gray-500 mt-0.5">三模块完成度、近 7 天活跃、薄弱关卡、称号进度</p>
          </button>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-3 grid grid-cols-2 gap-2">
          <button type="button"
            onClick={() => downloadText(`word-blast-学习数据-${new Date().toISOString().slice(0, 10)}.json`, exportStudyJson())}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs py-2.5 rounded-xl active:scale-95">
            ⬇️ 导出学习数据
          </button>
          <button type="button"
            onClick={() => { if (!confirmReset) { setConfirmReset(true); return } doReset() }}
            className={`font-bold text-xs py-2.5 rounded-xl active:scale-95 ${confirmReset ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 border border-red-200'}`}>
            {confirmReset ? '再点一次确认清空' : '清空本机学习数据'}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-3">
          导出的是本机学习数据（不含录音）；清空只影响这台设备，云端存档需在同步面板单独清空。
        </p>
      </div>
    </div>
  )
}
