import { useState, useRef } from 'react'
import type { VocabItem, LevelConfig } from '../config/gameConfig'
import { previewParse, finalizeImport, downloadCsvTemplate } from '../config/wordParser'
import type { PreviewItem, PreviewResult } from '../config/wordParser'

interface VocabGroup {
  id: string
  name: string
  vocab: VocabItem[]
  importedAt: number
  source?: 'paste' | 'file'
  sourceName?: string
}

interface Props {
  groups: VocabGroup[]
  onImport: (vocab: VocabItem[], levels: LevelConfig[], meta?: { source?: 'paste' | 'file'; sourceName?: string }) => void
  onDeleteGroup: (id: string) => void
  onClearAll: () => void
  onRenameGroup: (id: string, name: string) => void
  onUpdateGroup: (id: string, vocab: VocabItem[]) => void
  onAddWord: (id: string, item: Omit<VocabItem, 'id'>) => void
  onRemoveWord: (id: string, wordId: number) => void
  onClose: () => void
}

type Tab = 'import' | 'records'

export function WordImport({
  groups,
  onImport, onDeleteGroup, onClearAll,
  onRenameGroup, onUpdateGroup, onAddWord, onRemoveWord,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>('import')
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [filterProblems, setFilterProblems] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editingWordId, setEditingWordId] = useState<number | null>(null)
  const [draft, setDraft] = useState<{ en: string; zh: string; sentence: string }>({ en: '', zh: '', sentence: '' })
  const [newWord, setNewWord] = useState<{ en: string; zh: string }>({ en: '', zh: '' })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [sourceName, setSourceName] = useState<string | undefined>(undefined)
  const [source, setSource] = useState<'paste' | 'file'>('paste')
  const [confirmHint, setConfirmHint] = useState<string | null>(null)

  const handleParse = () => {
    if (!text.trim()) return
    setPreview(previewParse(text))
  }

  const handleConfirm = () => {
    if (!preview) return
    const final = finalizeImport(preview)
    if (final.vocab.length === 0) {
      // 至少要 2 个词条才能生成关卡 —— 明确提示，别让用户对着没反应的按钮发呆
      setConfirmHint(final.errors[0] ?? '至少需要 2 个词条才能生成关卡')
      return
    }
    setConfirmHint(null)
    onImport(final.vocab, final.levels, { source, sourceName })
    setText('')
    setPreview(null)
    setSourceName(undefined)
    setSource('paste')
    setTab('records')
  }

  const handleBackToEdit = () => {
    if (!preview) return
    const firstError = preview.errors.length > 0
    setPreview(null)
    setTimeout(() => {
      const ta = textareaRef.current
      if (!ta) return
      ta.focus()
      if (firstError) {
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
      setSource('file')
      setSourceName(file.name)
    }
    reader.readAsText(file)
  }

  const scrollToLine = (item: PreviewItem) => {
    setPreview(null)
    setTimeout(() => {
      const ta = textareaRef.current
      if (!ta) return
      ta.focus()
      const lines = text.split('\n')
      let pos = 0
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

  /* ── 词条编辑 ── */

  const startEdit = (g: VocabGroup, v: VocabItem) => {
    setEditingGroup(g.id)
    setEditingWordId(v.id)
    setDraft({ en: v.en, zh: v.zh, sentence: v.sentence ?? '' })
  }

  const saveEdit = (g: VocabGroup) => {
    if (!draft.en.trim() || !draft.zh.trim()) return
    onUpdateGroup(g.id, g.vocab.map(v => (v.id === editingWordId
      ? { ...v, en: draft.en.trim(), zh: draft.zh.trim(), sentence: draft.sentence.trim() || undefined }
      : v)))
    setEditingWordId(null)
    setEditingGroup(null)
  }

  const submitNewWord = (g: VocabGroup) => {
    if (!newWord.en.trim() || !newWord.zh.trim()) return
    onAddWord(g.id, { en: newWord.en.trim(), zh: newWord.zh.trim() })
    setNewWord({ en: '', zh: '' })
  }

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] p-4 sm:p-6 max-w-3xl w-full mx-2 sm:mx-4 shadow-2xl border-4 border-lime-200 max-h-[92vh] flex flex-col">
        {/* 标题栏 */}
        <div className="w-full flex items-start justify-between gap-2 mb-2">
          <h2 className="text-lg sm:text-xl font-bold text-gray-700 bubbly-font flex-1 text-center">
            自定义词库
          </h2>
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="shrink-0 bg-lime-50 hover:bg-lime-100 text-lime-700 font-bold text-[11px] sm:text-xs px-2.5 py-1.5 rounded-xl border-2 border-lime-200 transition-all active:scale-95"
          >
            ⬇️ 下载模板
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1.5 mb-3 bg-gray-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`flex-1 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              tab === 'import' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📥 导入
          </button>
          <button
            type="button"
            onClick={() => setTab('records')}
            className={`flex-1 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              tab === 'records' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📚 导入记录{groups.length > 0 ? `（${groups.length}）` : ''}
          </button>
        </div>

        {tab === 'import' ? (
          preview ? (
            <>
              {confirmHint && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2 mb-2 font-bold">
                  ⚠️ {confirmHint}
                </div>
              )}

              {/* 统计条 */}
              <div className="bg-gray-50 rounded-xl p-2.5 mb-2 text-xs text-gray-600 border border-gray-100">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-bold text-emerald-700">共 {preview.items.length} 条</span>
                  <span>单词 {preview.typeCounts.word}</span>
                  <span>短语 {preview.typeCounts.phrase}</span>
                  <span>句子 {preview.typeCounts.sentence}</span>
                  {preview.dupCount > 0 && <span className="text-amber-600">重复 {preview.dupCount}</span>}
                  {preview.errors.length > 0 && <span className="text-red-500">未识别 {preview.errors.length}</span>}
                </div>
                {preview.seqRange && (
                  <div className="mt-1 pt-1 border-t border-gray-200 text-[11px] text-gray-500">
                    序号 {preview.seqRange.from} – {preview.seqRange.to}
                    {preview.seqGaps.length > 0 && (
                      <span className="text-red-500 font-bold"> · 缺号 {preview.seqGaps.join('、')}</span>
                    )}
                  </div>
                )}
              </div>

              {/* 预览表 */}
              <div className="flex-1 overflow-auto min-h-[180px] border-2 border-gray-200 rounded-2xl mb-3">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-left text-xs text-gray-500">
                      <th className="p-2 w-8">序</th>
                      <th className="p-2 w-8">状态</th>
                      <th className="p-2 w-14">类型</th>
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
                        <td className="p-2 text-gray-400 text-xs">{item.seq ?? idx + 1}</td>
                        <td className="p-2">{item.confidence === 'low' ? '⚠️' : '✅'}</td>
                        <td className="p-2">
                          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            item.type === 'word' ? 'bg-blue-100 text-blue-700'
                              : item.type === 'phrase' ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {item.type === 'word' ? '单词' : item.type === 'phrase' ? '短语' : '句子'}
                          </span>
                        </td>
                        <td className="p-2 font-medium" title={item.sentence}>{item.en}</td>
                        <td className="p-2 text-gray-600">{item.zh}</td>
                      </tr>
                    ))}
                    {preview.errors.map((err, i) => (
                      <tr key={`err-${i}`} className="border-t border-gray-100 bg-red-50">
                        <td className="p-2 text-gray-400 text-xs">-</td>
                        <td className="p-2">❌</td>
                        <td className="p-2 text-red-600 text-xs" colSpan={3} title={err}>{err}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {problemCount > 0 && (
                <p className="text-[11px] text-amber-700 mb-2">
                  ⚠️ 有 {problemCount} 条需要留意（点行可跳回原文修改）
                </p>
              )}

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
                    {filterProblems ? '显示全部' : `仅看问题 (${problemCount})`}
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
              {/* 格式说明 */}
              <div className="bg-lime-50 rounded-xl p-2.5 mb-2 text-[11px] sm:text-xs text-lime-800 border border-lime-200 leading-relaxed">
                <strong>怎么填：</strong>每行一条，4 列 —— <strong>序号 / 英文单词 / 短语例句 / 中文翻译</strong>。
                例句列可以留空。<br />
                也支持直接从课本复制（英文+中文，空格或逗号分隔都行）。
              </div>

              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => { setText(e.target.value); setPreview(null); setConfirmHint(null); if (source === 'file') { setSource('paste'); setSourceName(undefined) } }}
                placeholder={`序号,英文单词,短语例句,中文翻译\n1,apple,I eat an apple every day.,苹果\n2,dog,,狗\n3,feed the cows,,喂奶牛\n\n或直接粘贴：\napple 苹果\ncat 猫`}
                className="flex-1 min-h-[200px] sm:min-h-[280px] border-2 border-gray-200 rounded-2xl p-3 text-sm resize-none focus:outline-none focus:border-lime-400 transition-colors font-mono"
                spellCheck={false}
              />

              {sourceName && (
                <p className="text-[11px] text-gray-500 mt-1.5">
                  📎 来源文件：{sourceName}
                </p>
              )}

              <div className="flex gap-2 mt-3">
                <input ref={fileRef} type="file" accept=".txt,.csv" onChange={handleFileChange} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm py-2.5 rounded-xl transition-colors"
                >
                  📎 上传文件
                </button>
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
          )
        ) : (
          /* ── 导入记录 ── */
          <div className="flex-1 overflow-auto min-h-[200px]">
            {groups.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                <div className="text-4xl mb-3">📭</div>
                还没有导入记录
                <div className="text-xs mt-1">切到「导入」标签，粘贴课本单词就能开始</div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-gray-500 font-bold">
                  共 {groups.length} 组 · {groups.reduce((s, g) => s + g.vocab.length, 0)} 个词条
                  <span className="text-gray-400 font-normal">（每次导入都会新增一组，不覆盖之前的）</span>
                </div>

                {groups.map(g => {
                  const expanded = expandedGroups.has(g.id)
                  const isEditing = editingGroup === g.id && editingWordId !== null
                  return (
                    <div key={g.id} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                      {/* 组头 */}
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleGroup(g.id)}
                          className="flex items-center gap-1.5 font-medium text-gray-700 hover:text-emerald-600 text-left min-w-0 flex-1"
                        >
                          <span className="text-emerald-600 shrink-0">📂</span>
                          <span className="truncate">{g.name}</span>
                          <span className="text-gray-400 text-xs shrink-0">({g.vocab.length} 词)</span>
                          <span className="text-gray-400 text-[10px] shrink-0">{expanded ? '▲' : '▼'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteGroup(g.id)}
                          className="text-red-400 hover:text-red-600 font-bold text-[10px] shrink-0"
                        >
                          删除
                        </button>
                      </div>

                      {/* 组元信息 */}
                      <div className="px-3 pb-1.5 text-[10px] text-gray-400 flex flex-wrap gap-x-2">
                        <span>🕐 {formatDate(g.importedAt)}</span>
                        <span>{g.source === 'file' ? `📎 ${g.sourceName ?? '文件'}` : '✏️ 粘贴'}</span>
                      </div>

                      {expanded && (
                        <div className="px-3 pb-2">
                          {/* 组名编辑 */}
                          <div className="flex gap-1.5 mb-2">
                            <input
                              defaultValue={g.name}
                              key={`name-${g.id}`}
                              onBlur={(e) => {
                                const v = e.target.value.trim()
                                if (v && v !== g.name) onRenameGroup(g.id, v)
                              }}
                              placeholder="给这组起个名字，如：三年级上册 Unit1"
                              className="flex-1 text-[11px] px-2 py-1 rounded-lg border border-gray-200 focus:border-emerald-300 focus:outline-none"
                            />
                          </div>

                          {/* 词条列表 */}
                          <div className="space-y-0.5 max-h-52 overflow-auto">
                            {g.vocab.map(v => (
                              <div key={v.id} className="border-t border-gray-100 pt-0.5">
                                {isEditing && editingWordId === v.id ? (
                                  <div className="py-1 space-y-1">
                                    <input
                                      value={draft.en}
                                      onChange={e => setDraft(d => ({ ...d, en: e.target.value }))}
                                      placeholder="英文"
                                      className="w-full text-[11px] px-2 py-1 rounded-lg border border-emerald-200 focus:border-emerald-400 focus:outline-none font-medium"
                                    />
                                    <input
                                      value={draft.zh}
                                      onChange={e => setDraft(d => ({ ...d, zh: e.target.value }))}
                                      placeholder="中文"
                                      className="w-full text-[11px] px-2 py-1 rounded-lg border border-emerald-200 focus:border-emerald-400 focus:outline-none"
                                    />
                                    <input
                                      value={draft.sentence}
                                      onChange={e => setDraft(d => ({ ...d, sentence: e.target.value }))}
                                      placeholder="例句（选填）"
                                      className="w-full text-[11px] px-2 py-1 rounded-lg border border-gray-200 focus:border-emerald-400 focus:outline-none"
                                    />
                                    <div className="flex gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => saveEdit(g)}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg"
                                      >
                                        保存
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { setEditingWordId(null); setEditingGroup(null) }}
                                        className="bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold text-[10px] px-2.5 py-1 rounded-lg"
                                      >
                                        取消
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 py-0.5">
                                    <span className="text-gray-300 text-[10px] w-5 shrink-0">{v.seq ?? v.id}</span>
                                    <span className="font-medium text-gray-700 truncate flex-1 min-w-0">{v.en}</span>
                                    <span className="text-gray-400 truncate flex-1 min-w-0">{v.zh}</span>
                                    <button
                                      type="button"
                                      onClick={() => startEdit(g, v)}
                                      className="text-emerald-600 hover:text-emerald-700 font-bold text-[10px] shrink-0"
                                    >
                                      编辑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onRemoveWord(g.id, v.id)}
                                      className="text-red-400 hover:text-red-600 font-bold text-[10px] shrink-0"
                                    >
                                      删
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* 补词 */}
                          <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-200">
                            <input
                              value={newWord.en}
                              onChange={e => setNewWord(w => ({ ...w, en: e.target.value }))}
                              placeholder="补一个词：英文"
                              className="flex-1 text-[11px] px-2 py-1 rounded-lg border border-gray-200 focus:border-emerald-300 focus:outline-none"
                            />
                            <input
                              value={newWord.zh}
                              onChange={e => setNewWord(w => ({ ...w, zh: e.target.value }))}
                              placeholder="中文"
                              className="flex-1 text-[11px] px-2 py-1 rounded-lg border border-gray-200 focus:border-emerald-300 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => submitNewWord(g)}
                              disabled={!newWord.en.trim() || !newWord.zh.trim()}
                              className="bg-lime-500 hover:bg-lime-600 disabled:bg-lime-300 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shrink-0"
                            >
                              添加
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                <button
                  type="button"
                  onClick={onClearAll}
                  className="w-full mt-1 text-red-400 hover:text-red-600 font-bold text-[10px] py-1.5"
                >
                  删除全部词库
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
