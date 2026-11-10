/* SyncPanel.tsx — 跨设备同步（真实实现）
 * 有邮件服务：邮箱 + 验证码登录；没有：创建同步空间 / 用同步码加入。
 * 退出、清空云端都在面板内完成，本机数据始终保留。
 */
import { useEffect, useState } from 'react'
import type { SyncApi } from '../hooks/useSync'

interface Props { sync: SyncApi; onClose: () => void }

const INPUT = 'w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 outline-none focus:border-sky-400 bg-white'
const BTN = 'w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-xl transition-all active:scale-95'

function fmt(ts: number) {
  if (!ts) return '尚未同步'
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function SyncPanel({ sync, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [tab, setTab] = useState<'mail' | 'key'>(sync.mailEnabled ? 'mail' : 'key')
  const [countdown, setCountdown] = useState(0)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => { sync.refreshConfig() }, [sync.refreshConfig])
  useEffect(() => { if (!sync.mailEnabled) setTab('key') }, [sync.mailEnabled])
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const doSendCode = async () => {
    const r = await sync.sendCode(email.trim())
    if (r.ok) {
      setCountdown(60)
      if (r.devCode) setCode(r.devCode)
    }
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm px-3">
      <div className="bg-white/95 backdrop-blur-md rounded-[2rem] p-5 sm:p-6 max-w-md w-full shadow-2xl border-4 border-sky-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-xl font-bold text-gray-700 bubbly-font">☁️ 跨设备同步</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">进度 · 积分 · 词库 · 跟读记录</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭"
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 active:scale-90">✕</button>
        </div>

        {sync.signed ? (
          <>
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-3 mb-3 text-xs text-sky-800 leading-relaxed">
              <p className="font-bold text-sm mb-1">{sync.email ? `已登录：${sync.email}` : '已加入同步空间'}</p>
              <p>状态：{sync.dirty ? '🟡 有改动待同步' : sync.busy ? '🔄 同步中…' : '🟢 已同步'} · 上次 {fmt(sync.lastSyncAt)}</p>
              {sync.recoveryCode && (
                <div className="mt-2 bg-white rounded-xl border border-sky-200 p-2">
                  <p className="text-[10px] text-gray-500 mb-1">同步码（另一台设备加入时用，请抄下来保存）</p>
                  <p data-testid="sync-code" className="font-mono font-bold tracking-wider text-sm break-all select-all">{sync.recoveryCode}</p>
                  <button type="button" onClick={() => { void navigator.clipboard?.writeText(sync.recoveryCode) }}
                    className="mt-1 text-[11px] font-bold text-sky-600">📋 复制同步码</button>
                </div>
              )}
            </div>

            {sync.message && <p className="text-xs text-center text-gray-500 mb-2">{sync.message}</p>}

            <button type="button" disabled={sync.busy} onClick={() => { void sync.syncNow(true) }} className={BTN + ' mb-2'}>
              🔄 立即同步
            </button>
            <p className="text-[10px] text-gray-400 text-center mb-3">自动同步每 15 秒检查一次改动；手动同步后可刷新页面查看另一台设备的数据。</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={sync.signOut}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs py-2.5 rounded-xl active:scale-95">退出同步</button>
              <button type="button" onClick={() => {
                if (!confirmClear) { setConfirmClear(true); return }
                setConfirmClear(false); void sync.clearCloud()
              }}
                className={`font-bold text-xs py-2.5 rounded-xl active:scale-95 ${confirmClear ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                {confirmClear ? '再点一次确认清空' : '清空云端存档'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1 bg-gray-100 rounded-xl p-1 mb-3">
              <button type="button" onClick={() => setTab('key')}
                className={`text-xs font-bold py-2 rounded-lg transition-all ${tab === 'key' ? 'bg-white text-sky-700 shadow' : 'text-gray-500'}`}>🔑 同步码</button>
              <button type="button" onClick={() => setTab('mail')}
                className={`text-xs font-bold py-2 rounded-lg transition-all ${tab === 'mail' ? 'bg-white text-sky-700 shadow' : 'text-gray-500'}`}>✉️ 邮箱验证码</button>
            </div>

            {tab === 'key' ? (
              <>
                <p className="text-xs text-gray-600 leading-relaxed mb-2">
                  创建同步空间后会给你一串同步码，在手机 / 平板 / 另一台电脑输入它，就能共享同一份进度。
                  {!sync.mailEnabled && <span className="text-amber-600">当前未配置邮件服务，用同步码即可，不需要邮箱。</span>}
                </p>
                <button type="button" disabled={sync.busy} onClick={() => { void sync.createSpace() }} className={BTN + ' mb-3'}>
                  ✨ 创建同步空间
                </button>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-[11px] font-bold text-gray-500 mb-1.5">已有同步码？在这台设备上加入</p>
                  <input className={INPUT + ' mb-2'} value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="粘贴 20 位同步码" aria-label="同步码" />
                  <button type="button" disabled={sync.busy || joinCode.trim().length < 12}
                    onClick={() => { void sync.claim(joinCode.trim()) }}
                    className="w-full bg-white border-2 border-sky-200 text-sky-700 font-bold text-sm py-2.5 rounded-xl active:scale-95 disabled:opacity-50">
                    ➡️ 加入同步空间
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-600 leading-relaxed mb-2">家长用邮箱收验证码，孩子不用记账号。</p>
                <input className={INPUT + ' mb-2'} value={email} onChange={e => setEmail(e.target.value)}
                  type="email" placeholder="家长邮箱" aria-label="邮箱" />
                <button type="button" disabled={sync.busy || countdown > 0 || !email.includes('@')}
                  onClick={() => { void doSendCode() }} className={BTN + ' mb-2'}>
                  {countdown > 0 ? `${countdown}s 后可重发` : '发送验证码'}
                </button>
                <input className={INPUT + ' mb-2'} value={code} onChange={e => setCode(e.target.value)}
                  inputMode="numeric" maxLength={6} placeholder="6 位验证码" aria-label="验证码" />
                <button type="button" disabled={sync.busy || code.trim().length < 6}
                  onClick={() => { void sync.verifyCode(email.trim(), code.trim()) }} className={BTN}>
                  ✅ 登录并开启同步
                </button>
              </>
            )}
            {sync.message && <p className="text-xs text-center text-amber-700 mt-2">{sync.message}</p>}
          </>
        )}

        <div className="mt-4 bg-emerald-50/80 rounded-2xl border border-emerald-100 p-3 text-[11px] text-emerald-800 leading-relaxed">
          <p className="font-bold mb-1">🔒 隐私与降级</p>
          <p>· 只同步进度、积分、词库和跟读/对话完成记录</p>
          <p>· <strong>不上传孩子的录音</strong>，录音只在本机内存里当场回放</p>
          <p>· 没登录、断网、云端异常都完全能玩，数据先留本机，联网后自动补传</p>
        </div>
      </div>
    </div>
  )
}
