import { useState } from 'react'
import { submitFeedback } from '../config/api'

const LOCAL_KEY = 'wordblast_feedback_v1'

interface Props {
  onClose: () => void
}

function saveLocal(name: string, message: string) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const list = raw ? JSON.parse(raw) : []
    list.push({ name: name || '匿名', message, time: new Date().toISOString() })
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
  } catch { /* quota exceeded */ }
}

export function FeedbackForm({ onClose }: Props) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok'>('idle')

  const handleSubmit = async () => {
    if (!message.trim()) return
    setStatus('sending')
    const ok = await submitFeedback(name, message)
    if (!ok) {
      // API unavailable — save to localStorage as fallback
      saveLocal(name, message)
    }
    setStatus('ok')
    setTimeout(() => { setStatus('idle'); onClose() }, 1500)
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl border-4 border-amber-200">
        <h2 className="text-xl font-bold text-gray-700 text-center mb-3 bubbly-font">反馈意见</h2>

        {status === 'ok' ? (
          <p className="text-center text-emerald-600 font-bold py-8">感谢反馈！</p>
        ) : (
          <>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="你的名字（选填）"
              maxLength={50}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm focus:outline-none focus:border-amber-300 transition-colors"
            />
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="请告诉我们你的想法或遇到的问题…"
              maxLength={2000}
              className="w-full border-2 border-gray-200 rounded-2xl p-3 text-sm resize-none min-h-[100px] focus:outline-none focus:border-amber-300 transition-colors"
            />
            {status === 'sending' && (
              <p className="text-gray-400 text-xs mb-2">提交中…</p>
            )}
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
                onClick={handleSubmit}
                disabled={!message.trim() || status === 'sending'}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold text-sm py-2.5 rounded-xl transition-colors active:scale-95"
              >
                {status === 'sending' ? '提交中…' : '提交反馈'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
