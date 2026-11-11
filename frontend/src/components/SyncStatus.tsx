/* SyncStatus.tsx — 首页白框左下角的同步指示器
 * 视觉照菠萝日程：一个状态点 + 一个刷新箭头，点开出黑色说明浮层。
 * 色值、三态语义、黑底浮层文案都照搬，只做两处手机适配：
 *   · 桌面 hover 看详情 → 改成点一下展开、再点收起；
 *   · 同步太快箭头一闪而过 → 「同步中」至少显示 600ms。
 * 纯展示组件：状态全部来自 useSync 已有的 signed/busy/dirty/email，不碰同步逻辑。
 */
import { useEffect, useRef, useState } from 'react'

interface Props {
  signed: boolean
  busy: boolean
  dirty: boolean
  email: string | null
  onSyncNow: () => void
}

export type SyncViewState = 'unsigned' | 'syncing' | 'synced' | 'offline'

/** 纯函数：便于回归测试，也避免 JSX 里堆条件 */
export function resolveSyncState(
  signed: boolean, busy: boolean, dirty: boolean, online: boolean,
): SyncViewState {
  if (!signed) return 'unsigned'
  if (busy) return 'syncing'
  if (!online || dirty) return 'offline'
  return 'synced'
}

const DOT: Record<SyncViewState, string> = {
  unsigned: 'bg-[#D9D4CF]',
  syncing: 'bg-[#ED6A3B] animate-pulse',
  synced: 'bg-[#059669] shadow-[0_0_6px_rgba(5,150,105,0.4)]',
  offline: 'bg-[#D9D4CF]',
}

const TEXT: Record<SyncViewState, string> = {
  unsigned: '未开启 · 记下的进度只在这台设备上',
  syncing: '正在同步…',
  synced: '已同步 · 多设备自动同步',
  offline: '离线待同步 · 数据留在本机，联网后自动补传',
}

export function SyncStatus({ signed, busy, dirty, email, onSyncNow }: Props) {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [open, setOpen] = useState(false)
  const [holdBusy, setHoldBusy] = useState(false)
  const busySince = useRef(0)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  /* 同步常常几百毫秒就结束，箭头一闪而过；至少转满 600ms 才看得见 */
  useEffect(() => {
    if (busy) {
      if (busySince.current === 0) busySince.current = Date.now()
      if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null }
      setHoldBusy(true)
      return
    }
    if (busySince.current === 0) return
    const rest = Math.max(0, 600 - (Date.now() - busySince.current))
    holdTimer.current = setTimeout(() => {
      busySince.current = 0
      holdTimer.current = null
      setHoldBusy(false)
    }, rest)
    return () => {
      if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null }
    }
  }, [busy])

  const state = resolveSyncState(signed, holdBusy, dirty, online)
  const spinning = state === 'syncing'
  const tip = state === 'offline' && online
    ? '有改动待同步 · 即将自动上传'
    : TEXT[state]

  return (
    <div className="relative flex items-center gap-1.5" data-testid="sync-status">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={`同步状态：${tip}`}
        data-testid="sync-dot-btn"
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/5 active:scale-90 transition-transform"
      >
        <span className={`w-3 h-3 rounded-full block ${DOT[state]}`} data-testid="sync-dot" />
      </button>

      {signed && (
        <button
          type="button"
          onClick={onSyncNow}
          disabled={spinning}
          aria-label="手动同步"
          data-testid="sync-refresh"
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/5 active:scale-90 disabled:opacity-50 transition-transform"
        >
          <svg
            className={`w-3.5 h-3.5 text-[#5C5C5C] ${spinning ? 'animate-spin' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
        </button>
      )}

      {open && (
        <div
          data-testid="sync-tip"
          className="absolute bottom-full left-0 mb-2 bg-[#1C1C1C] text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-[60] shadow-lg text-left"
        >
          {signed ? (
            <>
              <span className="text-[#34d399]">●</span> {email || '家长邮箱'}<br />
              <span className="text-[#A0A0A0]">{tip}</span>
            </>
          ) : (
            <span className="text-[#A0A0A0]">{TEXT.unsigned}</span>
          )}
        </div>
      )}
    </div>
  )
}
