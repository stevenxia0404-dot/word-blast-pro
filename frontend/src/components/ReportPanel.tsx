/* ReportPanel.tsx — 学习报告（真实统计，离线可用）
 * 数据全部来自本机 localStorage，没有就显示 0 /「暂无数据」，不编造。
 * 登录同步后，云端会把多设备记录合并回本机，报告自动覆盖全部设备。
 */
import { LEVELS, VOCABULARY, TITLES, getTitle } from '../config/gameConfig'
import { DIALOGUES } from '../config/dialogues'
import { collectLocalData, downloadText } from '../config/syncSchema'

interface Props { onClose: () => void }

function dayLabel(ts: number) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function ReportPanel({ onClose }: Props) {
  const d = collectLocalData()
  const save = d.save
  const score = d.spokenScore
  const spoken = d.spoken ?? {}
  const dialogue = d.dialogue ?? {}

  const vocabKeys = new Set(VOCABULARY.map(v => v.en.trim().toLowerCase()))
  const replyKeys = new Set(DIALOGUES.map(x => x.reply.trim().toLowerCase()))
  const repeatCount = Object.keys(spoken).filter(k => vocabKeys.has(k)).length
  const dialogueCount = Object.keys(dialogue).filter(k => replyKeys.has(k)).length
  const blastCount = save?.levelResults?.length ?? 0
  const stars = (save?.levelResults ?? []).reduce((n, r) => n + (r.stars || 0), 0)

  const total = (save?.totalScore ?? 0) + (score?.score ?? 0)
  const title = getTitle(save?.totalScore ?? 0, score?.score ?? 0)
  const next = TITLES.find(t => t.minScore > total)
  const prevMin = [...TITLES].reverse().find(t => t.minScore <= total)?.minScore ?? 0
  const pct = next ? Math.min(100, Math.round(((total - prevMin) / (next.minScore - prevMin)) * 100)) : 100

  /* 近 7 天：只统计真实带时间戳的跟读 / 对话完成记录 */
  const days: { label: string; count: number }[] = []
  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (let i = 6; i >= 0; i--) {
    const start = today.getTime() - i * 86400000
    const end = start + 86400000
    const count = [...Object.values(spoken), ...Object.values(dialogue)]
      .filter(t => typeof t === 'number' && t >= start && t < end).length
    days.push({ label: dayLabel(start), count })
  }
  const maxDay = Math.max(1, ...days.map(x => x.count))

  const weak = (save?.levelResults ?? [])
    .map((r, i) => ({ r, i }))
    .filter(x => x.r.accuracy < 80)
    .slice(0, 5)

  const exportCsv = () => {
    const rows = [
      ['模块', '项目', '数值'],
      ['闯关', '已完成关卡', `${blastCount}/${LEVELS.length}`],
      ['闯关', '累计星星', String(stars)],
      ['闯关', '闯关分', String(save?.totalScore ?? 0)],
      ['跟读', '已开口词条', `${repeatCount}/${VOCABULARY.length}`],
      ['对话', '已回答组数', `${dialogueCount}/${DIALOGUES.length}`],
      ['口语', '口语分', String(score?.score ?? 0)],
      ['口语', '首次掌握', String(score?.mastered ?? 0)],
      ['口语', '复习次数', String(score?.reviewed ?? 0)],
      ['总评', '称号', title.name],
      ...days.map(x => ['近 7 天', x.label, String(x.count)]),
    ]
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadText(`word-blast-学习报告-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8')
  }

  const cards = [
    { emoji: '🎮', label: '闯关练习', value: `${blastCount}/${LEVELS.length}`, sub: `⭐ ${stars} 颗星 · ${save?.totalScore ?? 0} 分`, color: 'emerald' },
    { emoji: '🗣️', label: '跟读练习', value: `${repeatCount}/${VOCABULARY.length}`, sub: `首次 ${score?.mastered ?? 0} · 复习 ${score?.reviewed ?? 0}`, color: 'amber' },
    { emoji: '💬', label: '对话练习', value: `${dialogueCount}/${DIALOGUES.length}`, sub: '已完成的情景组数', color: 'sky' },
  ]
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    amber: 'bg-amber-50 border-amber-100 text-amber-800',
    sky: 'bg-sky-50 border-sky-100 text-sky-800',
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm px-3">
      <div className="bg-white/95 backdrop-blur-md rounded-[2rem] p-5 sm:p-6 max-w-md w-full shadow-2xl border-4 border-amber-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-xl font-bold text-gray-700 bubbly-font">📊 学习报告</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">数据来自本机 · 同步后覆盖全部设备</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭"
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 active:scale-90">✕</button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {cards.map(c => (
            <div key={c.label} className={`rounded-2xl border p-2 text-center ${colorMap[c.color]}`}>
              <div className="text-xl">{c.emoji}</div>
              <div className="text-[10px] font-bold opacity-80">{c.label}</div>
              <div className="text-lg font-bold">{c.value}</div>
              <div className="text-[9px] leading-tight opacity-75 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-3">
          <p className="text-xs font-bold text-gray-600 mb-1.5">{title.emoji} 当前称号：{title.name} · 总分 {total}</p>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {next ? `离「${next.name}」还差 ${next.minScore - total} 分` : '已达成最高称号 🏆'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-3">
          <p className="text-xs font-bold text-gray-600 mb-2">近 7 天练习（跟读 + 对话完成条数）</p>
          <div className="flex items-end justify-between gap-1 h-16">
            {days.map((x, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-lime-300 rounded-t-md" style={{ height: `${Math.max(3, (x.count / maxDay) * 42)}px` }} />
                <span className="text-[9px] text-gray-400">{x.label}</span>
              </div>
            ))}
          </div>
          {days.every(x => x.count === 0) && <p className="text-[10px] text-gray-400 text-center mt-1">暂无带时间记录，练一次跟读或对话后这里会有数据</p>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-3">
          <p className="text-xs font-bold text-gray-600 mb-1.5">需要重点复习的关卡（正确率 &lt; 80%）</p>
          {weak.length ? (
            <ul className="space-y-1">
              {weak.map(({ r, i }) => (
                <li key={i} className="flex justify-between text-[11px] text-gray-600">
                  <span>第 {i + 1} 关 · {LEVELS[i]?.name ?? '关卡'}</span>
                  <span className="font-bold text-amber-600">{Math.round(r.accuracy)}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-gray-400">暂无低正确率关卡 —— 还没有关卡成绩，或都练得不错 👍</p>
          )}
        </div>

        <button type="button" onClick={exportCsv}
          className="w-full bg-amber-400 hover:bg-amber-500 text-white font-bold text-sm py-2.5 rounded-xl active:scale-95">
          ⬇️ 导出报告 CSV
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-3">
          录音不参与统计、不上传；清空浏览器数据后本机报告会归零，云端存档不受影响。
        </p>
      </div>
    </div>
  )
}
