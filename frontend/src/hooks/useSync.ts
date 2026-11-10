/* useSync.ts — 同步状态机
 * 登录：只用邮箱验证码（v3.4 起同步码已下线，失败无旁路）
 * 同步：登录后先推一次，之后每 15s 比对本地指纹，变化防抖 2s 再推；
 *       切后台立即推。断网静默失败，本地数据一丝不动。
 * 冲突：服务端 version 乐观锁返回 409 → 拿新版本再合并一次，用户无感。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { collectLocalData, applyRemoteData, fingerprint } from '../config/syncSchema'

/** dev 走 vite proxy；生产优先同源 Pages Functions，接口不存在时自动回退独立 Worker。
 * 两条通道跑的是同一份 _core.js + 同一个 D1，任一生效同步都能用。 */
const API_BASES: string[] = import.meta.env.DEV
  ? ['/sync-api']
  : ['/api/sync', 'https://word-blast-api.boluomate.com/api/sync']
const TOKEN_KEY = 'wordblast_sync_token_v1'
const META_KEY = 'wordblast_sync_meta_v1'

export interface SyncMeta {
  email?: string | null
  version: number
  lastSyncAt: number
  userId?: string
}

interface ApiResult { status: number; body: any }

function readMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return { version: 0, lastSyncAt: 0 }
    const m = JSON.parse(raw)
    return {
      version: Number(m.version) || 0,
      lastSyncAt: Number(m.lastSyncAt) || 0,
      email: m.email ?? null,
      userId: m.userId,
    }
  } catch { return { version: 0, lastSyncAt: 0 } }
}

function saveMeta(m: SyncMeta) {
  try { localStorage.setItem(META_KEY, JSON.stringify(m)) } catch { /* ignore */ }
}

export interface SyncApi {
  signed: boolean
  email: string | null
  busy: boolean
  message: string
  dirty: boolean
  lastSyncAt: number
  mailEnabled: boolean
  devMode: boolean
  /** 打开同步面板时探测服务端能力（首页不做无谓请求） */
  refreshConfig: () => void
  sendCode: (email: string) => Promise<{ ok: boolean; devCode?: string; error?: string }>
  verifyCode: (email: string, code: string) => Promise<boolean>
  syncNow: (manual?: boolean) => Promise<boolean>
  signOut: () => void
  clearCloud: () => Promise<boolean>
}

export function useSync(): SyncApi {
  const [token, setToken] = useState<string>(() => {
    try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
  })
  const [meta, setMeta] = useState<SyncMeta>(readMeta)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [dirty, setDirty] = useState(false)
  const [cfg, setCfg] = useState<{ mailEnabled: boolean; devMode: boolean }>({ mailEnabled: false, devMode: false })

  const tokenRef = useRef(token); tokenRef.current = token
  const metaRef = useRef(meta); metaRef.current = meta
  const lastFp = useRef('')
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const call = useCallback(async (
    action: string, method = 'GET', body: unknown = {}, withAuth = false,
  ): Promise<ApiResult> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (withAuth && tokenRef.current) headers.Authorization = 'Bearer ' + tokenRef.current
    let last: ApiResult = { status: 0, body: { error: '网络不可用' } }

    for (const base of API_BASES) {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      try {
        const r = await fetch(`${base}/${action}`, {
          method,
          headers,
          body: method === 'GET' ? undefined : JSON.stringify(body),
          signal: ctrl.signal,
        })
        last = { status: r.status, body: await r.json().catch(() => ({ error: '返回格式异常' })) }
      } catch {
        last = { status: 0, body: { error: '网络不可用' } }
      } finally {
        clearTimeout(timer)
      }
      // 只有「拿到的是 API 应答」才收工；HTML 首页 / 404 / 断网才换下一条通道，
      // 400/401/409 等业务错误不重发，避免重复创建空间或重复提交。
      const b = last.body
      if (b && typeof b === 'object' && ('ok' in b || 'error' in b)) return last
    }
    return last
  }, [])

  /** 探测服务端能力：只在打开同步面板时调，首页不做无谓请求 */
  const refreshConfig = useCallback(() => {
    void call('config').then(r => {
      if (r.status === 200) {
        setCfg({ mailEnabled: !!r.body.mailEnabled, devMode: !!r.body.devMode })
      }
    })
  }, [call])

  const persistLogin = useCallback((r: any, extra: Partial<SyncMeta> = {}) => {
    try { localStorage.setItem(TOKEN_KEY, r.token) } catch { /* ignore */ }
    const next: SyncMeta = {
      ...metaRef.current,
      ...extra,
      email: r.email ?? null,
      userId: r.userId,
    }
    saveMeta(next)
    setMeta(next)
    setToken(r.token)
    setMessage('登录成功，正在同步…')
  }, [])

  const sendCode = useCallback(async (email: string) => {
    setBusy(true)
    const r = await call('code', 'POST', { email })
    setBusy(false)
    if (r.status === 200) {
      if (r.body.devCode) setMessage('本地开发模式：验证码已自动填好')
      else setMessage('验证码已发送，5 分钟内有效')
      return { ok: true, devCode: r.body.devCode as string | undefined }
    }
    const msg = r.body?.error || '发送失败，请稍后再试'
    setMessage(msg)
    return { ok: false, error: msg as string }
  }, [call])

  const verifyCode = useCallback(async (email: string, code: string) => {
    setBusy(true)
    const r = await call('verify', 'POST', { email, code })
    setBusy(false)
    if (r.status === 200 && r.body.token) { persistLogin(r.body); return true }
    setMessage(r.body?.error || '验证码不正确')
    return false
  }, [call, persistLogin])

  const syncNow = useCallback(async (manual = false): Promise<boolean> => {
    if (!tokenRef.current) { setMessage('请先登录'); return false }
    setBusy(true)
    try {
      const local = collectLocalData()
      const base = metaRef.current.version
      let r = await call('data', 'POST', { data: local, baseVersion: base }, true)
      if (r.status === 409 && r.body.remote) {
        // 云端比本机新：以云端版本为基准再提交一次，服务端负责合并两边
        r = await call('data', 'POST', { data: local, baseVersion: r.body.remote.version }, true)
      }
      if (r.status === 401) {
        setMessage('登录已过期，请重新登录')
        try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
        setToken('')
        return false
      }
      if (r.status !== 200 || !r.body.data) {
        setMessage(r.body?.error || '同步失败，本机数据已保留')
        setDirty(true)
        return false
      }
      applyRemoteData(r.body.data)
      const next: SyncMeta = { ...metaRef.current, version: Number(r.body.version) || 0, lastSyncAt: Date.now() }
      saveMeta(next)
      setMeta(next)
      lastFp.current = fingerprint(collectLocalData())
      setDirty(false)
      setMessage(manual ? '已同步 ✅ 刷新页面即可看到其它设备的进度' : '已同步')
      window.dispatchEvent(new Event('wordblast:sync-applied'))
      return true
    } catch {
      setMessage('网络不可用，数据已留在本机，联网后自动重试')
      setDirty(true)
      return false
    } finally {
      setBusy(false)
    }
  }, [call])

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(META_KEY)
    } catch { /* ignore */ }
    setToken('')
    setMeta({ version: 0, lastSyncAt: 0 })
    setMessage('已退出同步，本机数据保留')
    setDirty(false)
  }, [])

  const clearCloud = useCallback(async () => {
    setBusy(true)
    const r = await call('data', 'DELETE', {}, true)
    setBusy(false)
    if (r.status === 200) {
      const next: SyncMeta = { ...metaRef.current, version: 0, lastSyncAt: Date.now() }
      saveMeta(next); setMeta(next)
      setMessage('云端存档已清空，本机数据不受影响')
      return true
    }
    setMessage(r.body?.error || '清空失败')
    return false
  }, [call])

  /* 自动同步：登录后立刻一次 + 本地指纹变化防抖 2s + 切后台立即推 */
  useEffect(() => {
    if (!token) return
    lastFp.current = fingerprint(collectLocalData())
    void syncNow(false)

    const schedule = () => {
      if (debounce.current) clearTimeout(debounce.current)
      debounce.current = setTimeout(() => { void syncNow(false) }, 2000)
    }
    const tick = () => {
      const fp = fingerprint(collectLocalData())
      if (fp !== lastFp.current) { setDirty(true); schedule() }
    }
    const iv = setInterval(tick, 15000)
    const onVis = () => { if (document.visibilityState === 'hidden') tick() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(iv)
      if (debounce.current) clearTimeout(debounce.current)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [token, syncNow])

  return {
    signed: !!token,
    email: meta.email ?? null,
    busy, message, dirty,
    lastSyncAt: meta.lastSyncAt,
    mailEnabled: cfg.mailEnabled,
    devMode: cfg.devMode,
    refreshConfig,
    sendCode, verifyCode, syncNow, signOut, clearCloud,
  }
}
