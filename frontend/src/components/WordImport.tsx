import { useState, useRef } from 'react'
import type { VocabItem, LevelConfig } from '../config/gameConfig'
import { previewParse, finalizeImport, generateCsvTemplate } from '../config/wordParser'
import type { PreviewItem } from '../config/wordParser'

interface Props {
  hasCustomVocab: boolean
  customCount: number
  customVocab: VocabItem[] | null
  onImport: (vocab: VocabItem[], levels: LevelConfig[]) => void
  onClear: () => void
  onClose: () => void
}

export function WordImport({ hasCustomVocab, customCount, customVocab, onImport, onClear, onClose }: Props) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<{ items: PreviewItem[]; errors: string[]; dupCount: number } | null>(null)
  const [filterProblems, setFilterProblems] = useState(false)
  const [showVocabList, setShowVocabList] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleParse = () => {
    if (!text.trim()) return
    const result = previewParse(text)
    setPreview(result)
  }

  const handleConfirm = () => {
    if (!preview) return
    const final = finalizeImport(preview)
    if (final.vocab.length > 0) {
      onImport(final.vocab, final.levels)
      onClose()
    }
  }

  const handleBackToEdit = () => {
    if (!preview) return
    const firstError = preview.errors.length > 0
    setPreview(null)

    // Focus textarea and scroll cursor near first issue
    setTimeout(() => {
      const ta = textareaRef.current
      if (!ta) return
      ta.focus()
      if (firstError && preview.errors.length > 0) {
        // Put cursor at beginning for user to scan
        ta.setSelectionRange(0, 0)
        ta.scrollTop = 0
      }
    }, 100)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setText(reader.result as string)
      setPreview(null)
    }
    reader.readAsText(file)
  }

  const handleDownloadTemplate = () => {
    const csv = generateCsvTemplate()
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'word_template.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const scrollToLine = (item: PreviewItem) => {
    setPreview(null)
    setTimeout(() => {
      const ta = textareaRef.current
      if (!ta) return
      ta.focus()
      // Estimate character position from item index
      const lines = text.split('\n')
      let pos = 0
      // item.original gives a clue; search for matching line
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(item.original.slice(0, 20))) {
          ta.setSelectionRange(pos, pos + lines[i].length)
          ta.scrollTop = Math.max(0, (i - 3) * 20)
          return
        }
        pos += lines[i].length + 1
      }
      ta.setSelectionRange(0, 0)
      ta.scrollTop = 0
    }, 100)
  }

  const filteredItems = preview
    ? (filterProblems ? preview.items.filter(i => i.confidence === 'low') : preview.items)
    : []

  const problemCount = preview ? preview.items.filter(i => i.confidence === 'low').length : 0

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] p-6 max-w-3xl w-full mx-4 shadow-2xl border-4 border-lime-200 max-h-[92vh] flex flex-col">
        <h2 className="text-xl font-bold text-gray-700 text-center mb-1 bubbly-font">
          {preview ? '预览解析结果' : '导入自定义词库'}
        </h2>
        <p className="text-xs text-gray-400 text-center mb-3">
          {preview
            ? `${preview.items.length} 条成功 · ${preview.errors.length} 条未识别 · ${preview.dupCount} 条重复`
            : '格式很简单：英文+中文，一行一个。从课本、PDF、网页复制过来就能自动识别~'}
        </p>

        {preview ? (
          <>
            {/* Preview table */}
            <div className="flex-1 overflow-auto min-h-[200px] border-2 border-gray-200 rounded-2xl mb-3">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-left text-xs text-gray-500">
                    <th className="p-2 w-12">#</th>
                    <th className="p-2 w-12">状态</th>
                    <th className="p-2">英文</th>
                    <th className="p-2">中文</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => (
                    <tr
                      key={idx}
                      onClick={() => item.confidence === 'low' && scrollToLine(item)}
                      className={`border-t border-gray-100 ${item.confidence === 'low' ? 'bg-amber-50 cursor-pointer hover:bg-amber-100' : ''}`}
                    >
                      <td className="p-2 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="p-2">{item.confidence === 'low' ? '⚠️' : '✅'}</td>
                      <td className="p-2 font-medium">{item.en}</td>
                      <td className="p-2 text-gray-600">{item.zh}</td>
                    </tr>
                  ))}
                  {preview.errors.map((err, i) => (
                    <tr key={`err-${i}`} className="border-t border-gray-100 bg-red-50">
                      <td className="p-2 text-gray-400 text-xs">-</td>
                      <td className="p-2">❌</td>
                      <td className="p-2 text-red-600 text-xs" colSpan={2} title={err}>{err}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleBackToEdit}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold text-sm py-2.5 rounded-xl transition-colors"
              >
                返回修改
              </button>
              {problemCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterProblems(!filterProblems)}
                  className={`flex-1 font-bold text-sm py-2.5 rounded-xl transition-colors ${filterProblems ? 'bg-amber-200 text-amber-800' : 'bg-amber-100 hover:bg-amber-200 text-amber-700'}`}
                >
                  {filterProblems ? '显示全部' : `仅看有问题 (${problemCount})`}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm py-2.5 rounded-xl transition-colors active:scale-95"
              >
                确认导入
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Editor */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => { setText(e.target.value); setPreview(null) }}
              placeholder={`apple 苹果\ncat 猫\ndog 狗\nkeep tidy 保持整洁\nsports field 运动场\nclassroom 教室\n…`}
              className="flex-1 min-h-[280px] sm:min-h-[360px] border-2 border-gray-200 rounded-2xl p-3 text-sm resize-none focus:outline-none focus:border-lime-400 transition-colors font-mono"
              spellCheck={false}
            />

            {/* Current status */}
            {hasCustomVocab && (
              <div className="mt-2 text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-1.5">
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setShowVocabList(!showVocabList)}
                    className="font-bold hover:underline text-left"
                  >
                    已导入 {customCount} 个词条 {showVocabList ? '▲' : '▼'}
                  </button>
                  <button type="button" onClick={onClear} className="text-red-500 font-bold hover:underline">
                    删除词库
                  </button>
                </div>
                {showVocabList && customVocab && (
                  <div className="mt-2 max-h-40 overflow-auto bg-white rounded-xl p-2 text-gray-700">
                    {customVocab.map((v, i) => (
                      <div key={v.id} className="py-0.5 border-b border-gray-100 last:border-0 flex gap-2">
                        <span className="text-gray-400 w-6 text-right shrink-0">{i + 1}.</span>
                        <span className="font-medium">{v.en}</span>
                        <span className="text-gray-500">{v.zh}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <input ref={fileRef} type="file" accept=".txt,.csv" onChange={handleFileChange} className="hidden" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm py-2.5 rounded-xl transition-colors"
              >
                上传模板
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm py-2.5 rounded-xl transition-colors"
              >
                下载模板
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-500 font-bold text-sm py-2.5 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleParse}
                disabled={!text.trim()}
                className="flex-1 bg-lime-500 hover:bg-lime-600 disabled:bg-lime-300 text-white font-bold text-sm py-2.5 rounded-xl transition-colors active:scale-95"
              >
                解析预览
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
