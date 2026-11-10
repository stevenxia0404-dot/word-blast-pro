/* useRecorder.ts — 录音引擎（MediaRecorder）
 * 防御逻辑移植自「公务英语 AI 陪练」生产版，逐条对应真机踩坑：
 *  - 浏览器格式差异：Chrome=webm、iPhone=mp4，动态探测按实际格式标记
 *  - 麦克风泄漏：stream 全局持有 + 统一释放（修过「几题后麦克风被占死」的生产 bug）
 *  - 授权永久 pending：getUserMedia 加 10s 超时
 *  - iOS 停录失灵：onstop 偶发不触发，1.5s 兜底定时器强制复位
 *  - 防重复点击：启动期间点击不算操作
 *  - 录音只存内存 blob，不落盘不上传
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export type RecState = 'idle' | 'starting' | 'recording' | 'processing'

/** 微信/QQ 等内置浏览器会拦截 getUserMedia —— 用于入口提示 */
export function isRestrictedWebView(): boolean {
  const ua = navigator.userAgent || ''
  return /MicroMessenger|WeChat|QQ\/|wxwork|DingTalk|Feishu|Lark/i.test(ua)
}

/**
 * 录音能力探测（iOS Safari / 微信内置浏览器降级用）。
 * 不支持时前端直接给「跳过录音，只听示范自评」，绝不把人卡在录音这一步。
 */
export function recordingSupport(): { supported: boolean; reason: string } {
  if (typeof window === 'undefined') return { supported: false, reason: '当前环境不支持录音' }
  if (!window.isSecureContext) return { supported: false, reason: '需要 HTTPS 安全连接才能录音，请用正式网址打开' }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    return { supported: false, reason: '此浏览器不支持录音，建议用 Safari 或 Chrome 打开' }
  }
  if (isRestrictedWebView()) {
    return { supported: false, reason: '微信 / QQ 内置浏览器不支持录音，请点右上角「···」用系统浏览器打开' }
  }
  return { supported: true, reason: '' }
}

/** 各浏览器录音格式不同，必须按实际格式标记，否则 Safari 拒绝回放 */
function pickMime(): string {
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return ''
  const list = [
    'audio/webm;codecs=opus', 'audio/webm',
    'audio/mp4;codecs=mp4a.40.2', 'audio/mp4',
    'audio/aac', 'audio/mpeg', 'audio/ogg;codecs=opus',
  ]
  for (const m of list) {
    try { if (MediaRecorder.isTypeSupported(m)) return m } catch { /* keep trying */ }
  }
  return ''
}

/** 给 Promise 加超时：权限弹窗挂着或设备被占时 getUserMedia 可能永久 pending */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ])
}

/** 获取麦克风最长等待 */
const MIC_TIMEOUT_MS = 10_000
/** 停录兜底：iOS 上 MediaRecorder.stop() 偶发不触发 onstop */
const STOP_FALLBACK_MS = 1_500
/** 单次录音上限（儿童场景：防录一堆环境音） */
export const MAX_REC_SECONDS = 10
/** 句子跟读的上限：整句朗读更慢，给更多时间 */
export const MAX_REC_SECONDS_SENTENCE = 20

export function useRecorder(onError?: (msg: string) => void) {
  const [recState, setRecState] = useState<RecState>('idle')
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)

  const mediaRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startingRef = useRef(false)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const urlRef = useRef<string | null>(null)

  /** 彻底释放麦克风：停 recorder + stop 所有轨道。地址栏红点只有轨道全 stop 才消失 */
  const releaseMic = useCallback(() => {
    if (mediaRef.current) {
      try {
        if (mediaRef.current.state === 'recording') mediaRef.current.stop()
      } catch { /* already stopped */ }
      if (mediaRef.current.stream) {
        try { mediaRef.current.stream.getTracks().forEach(t => t.stop()) } catch { /* ignore */ }
      }
    }
    if (streamRef.current) {
      try { streamRef.current.getTracks().forEach(t => t.stop()) } catch { /* ignore */ }
      streamRef.current = null
    }
  }, [])

  const clearTimers = useCallback(() => {
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null }
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null }
  }, [])

  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      try { URL.revokeObjectURL(urlRef.current) } catch { /* ignore */ }
      urlRef.current = null
      setRecordingUrl(null)
    }
  }, [])

  /** 切题/离场时无条件清理：录音占麦，不停干净下一题就抢不到麦 */
  const cancel = useCallback(() => {
    clearTimers()
    releaseMic()
    revokeUrl()
    setRecState('idle')
  }, [clearTimers, releaseMic, revokeUrl])

  /** 开始录音。返回 true = 已在录（UI 转为「再点结束」态）
   *  maxSeconds：本次录音上限（句子用 20s，单词用 10s） */
  const start = useCallback(async (maxSeconds: number = MAX_REC_SECONDS): Promise<boolean> => {
    if (startingRef.current) return false
    const support = recordingSupport()
    if (!support.supported) {
      onError?.(support.reason)
      return false
    }
    startingRef.current = true
    setRecState('starting')

    // 防御：先释放上一轮残留，再开新的
    releaseMic()
    revokeUrl()

    try {
      const stream = await withTimeout(navigator.mediaDevices.getUserMedia({ audio: true }), MIC_TIMEOUT_MS)
      streamRef.current = stream

      // 拿到权限后立刻创建并启动 recorder，中间不做任何等待
      chunksRef.current = []
      const mime = pickMime()
      try {
        mediaRef.current = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      } catch {
        mediaRef.current = new MediaRecorder(stream)
      }
      const actualMime = mediaRef.current.mimeType || 'audio/mp4'

      mediaRef.current.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      mediaRef.current.onstop = () => {
        clearTimers()
        releaseMic()
        try {
          const url = URL.createObjectURL(new Blob(chunksRef.current, { type: actualMime }))
          urlRef.current = url
          setRecordingUrl(url)
        } catch {
          setRecordingUrl(null)
        }
        setRecState('idle')
      }

      try {
        mediaRef.current.start()
      } catch {
        // start 抛错 = 授权实际已被浏览器撤回
        releaseMic()
        setRecState('idle')
        onError?.('录音启动失败，请刷新页面后重试，并在弹框选「允许」')
        return false
      }

      // 最长录制限时自动停
      maxTimerRef.current = setTimeout(() => {
        if (mediaRef.current?.state === 'recording') stop()
      }, maxSeconds * 1000)

      setRecState('recording')
      return true
    } catch (e) {
      releaseMic()
      setRecState('idle')
      const err = e as { message?: string; name?: string }
      if (err?.message === 'timeout') {
        onError?.('麦克风启动超时：可能正被其他功能占用，稍等两秒再点')
      } else {
        const denied = /PermissionDenied|NotAllowed/i.test(err?.name || err?.message || '')
        onError?.(denied
          ? '麦克风权限被拒绝：请到手机设置里允许浏览器使用麦克风，然后刷新页面'
          : '麦克风未授权或不可用，请点击「允许」后再试')
      }
      return false
    } finally {
      startingRef.current = false
    }
  }, [onError, releaseMic, revokeUrl])

  /** 停止录音（onstop 异步产出 blob URL） */
  const stop = useCallback(() => {
    clearTimers()
    const rec = mediaRef.current
    if (rec) {
      const hasLive = rec.stream && rec.stream.getAudioTracks().some(t => t.readyState === 'live')
      if (hasLive || rec.state === 'recording') {
        try { rec.stop() } catch { try { rec.stream.getTracks().forEach(t => t.stop()) } catch { /* ignore */ } }
      } else {
        try { rec.stream?.getTracks().forEach(t => t.stop()) } catch { /* ignore */ }
      }
    }
    setRecState('processing')

    // iOS 兜底：1.5s 内 onstop 未触发就强制复位，保证录音一定能结束
    stopTimerRef.current = setTimeout(() => {
      releaseMic()
      setRecState('idle')
    }, STOP_FALLBACK_MS)
  }, [releaseMic])

  useEffect(() => () => {
    // 组件卸载 = 离开跟读模块：无条件归还麦克风 + 释放 blob
    clearTimers()
    releaseMic()
    if (urlRef.current) { try { URL.revokeObjectURL(urlRef.current) } catch { /* ignore */ } }
  }, [clearTimers, releaseMic])

  return { recState, recordingUrl, start, stop, cancel }
}
