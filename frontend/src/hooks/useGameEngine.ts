import { useRef, useCallback, useState, useEffect } from 'react'
import { Particle } from '../components/Particle'
import { playSoftTone, speakWord } from './useAudio'
import { COLOR_THEMES } from '../config/gameConfig'
import type { VocabItem } from '../config/gameConfig'

export interface Cell {
  pairId: number
  text: string
  type: 'en' | 'zh'
  x: number
  y: number
  targetX: number
  targetY: number
  isEliminated: boolean
  shakeOffset: number
}

interface Pos { r: number; c: number }

export function useGameEngine() {
  const gridRef = useRef<Cell[][]>([])
  const selectedRef = useRef<Pos | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const tileSizeRef = useRef({ w: 0, h: 0 })
  const sizeRef = useRef({ w: 0, h: 420 })
  const animFrameRef = useRef<number>(0)
  const colsRef = useRef(3)
  const rowsRef = useRef(4)
  const vocabRef = useRef<VocabItem[]>([])
  const matchedPairsRef = useRef<Set<number>>(new Set())
  const onCorrectRef = useRef<(() => void) | null>(null)
  const onWrongRef = useRef<(() => void) | null>(null)
  const onAllMatchedRef = useRef<(() => void) | null>(null)
  const shakeTimersRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set())

  const [allMatched, setAllMatched] = useState(false)

  const clearShakeTimers = useCallback(() => {
    shakeTimersRef.current.forEach(id => clearInterval(id))
    shakeTimersRef.current.clear()
  }, [])

  useEffect(() => {
    return () => clearShakeTimers()
  }, [clearShakeTimers])

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const crect = canvas.getBoundingClientRect()
    const oldW = sizeRef.current.w
    const oldH = sizeRef.current.h
    sizeRef.current.w = crect.width
    sizeRef.current.h = crect.height
    canvas.width = crect.width * dpr
    canvas.height = crect.height * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)

    if ((oldW !== crect.width || oldH !== crect.height)) {
      const pad = 12
      const cols = colsRef.current
      const rows = rowsRef.current
      const tw = (crect.width - (cols + 1) * pad) / cols
      const th = (crect.height - (rows + 1) * pad) / rows
      tileSizeRef.current = { w: tw, h: th }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const t = gridRef.current[r]?.[c]
          if (!t || t.isEliminated) continue
          t.x = pad + c * (tw + pad)
          t.targetX = t.x
          t.y = pad + r * (th + pad)
          t.targetY = t.y
        }
      }
    }
  }, [])

  const initGame = useCallback((
    vocab: VocabItem[],
    cols: number,
    rows: number,
    onCorrect?: () => void,
    onWrong?: () => void,
    onAllMatched?: () => void,
  ) => {
    colsRef.current = cols
    rowsRef.current = rows
    vocabRef.current = vocab
    onCorrectRef.current = onCorrect ?? null
    onWrongRef.current = onWrong ?? null
    onAllMatchedRef.current = onAllMatched ?? null
    matchedPairsRef.current = new Set()
    setAllMatched(false)
    selectedRef.current = null
    particlesRef.current = []

    const pad = 12
    const tw = (sizeRef.current.w - (cols + 1) * pad) / cols
    const th = (sizeRef.current.h - (rows + 1) * pad) / rows
    tileSizeRef.current = { w: tw, h: th }

    const pairCount = cols * rows / 2
    const shuffled = [...vocab].sort(() => Math.random() - 0.5).slice(0, pairCount)
    const cards: { pairId: number; text: string; type: 'en' | 'zh' }[] = []
    shuffled.forEach(item => {
      cards.push({ pairId: item.id, text: item.en, type: 'en' })
      cards.push({ pairId: item.id, text: item.zh, type: 'zh' })
    })
    cards.sort(() => Math.random() - 0.5)

    const grid: Cell[][] = []
    for (let r = 0; r < rows; r++) {
      grid[r] = []
      for (let c = 0; c < cols; c++) {
        const card = cards[r * cols + c]
        const tx = pad + c * (tw + pad)
        const ty = pad + r * (th + pad)
        grid[r][c] = {
          pairId: card.pairId,
          text: card.text,
          type: card.type,
          x: tx,
          y: -150 - r * 80,
          targetX: tx,
          targetY: ty,
          isEliminated: false,
          shakeOffset: 0,
        }
      }
    }
    gridRef.current = grid
  }, [])

  const createExplosion = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      particlesRef.current.push(new Particle(x, y, color))
    }
  }, [])

  const handleTap = useCallback((cx: number, cy: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = cx - rect.left
    const my = cy - rect.top

    const cols = colsRef.current
    const rows = rowsRef.current

    let clicked: Pos | null = null
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = gridRef.current[r]?.[c]
        if (!t || t.isEliminated) continue
        if (mx >= t.x && mx <= t.x + tileSizeRef.current.w && my >= t.y && my <= t.y + tileSizeRef.current.h) {
          clicked = { r, c }; break
        }
      }
    }
    if (!clicked) return

    const cur = gridRef.current[clicked.r][clicked.c]
    const prevSel = selectedRef.current

    if (!prevSel) {
      selectedRef.current = clicked
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = requestAnimationFrame(renderLoop)
      playSoftTone(261.63, 'triangle', 0.08)
      return
    }
    if (prevSel.r === clicked.r && prevSel.c === clicked.c) { selectedRef.current = null; return }

    const prev = gridRef.current[prevSel.r][prevSel.c]
    if (prev.pairId === cur.pairId && prev.type !== cur.type) {
      prev.isEliminated = true
      cur.isEliminated = true
      matchedPairsRef.current.add(prev.pairId)
      onCorrectRef.current?.()

      playSoftTone(523.25, 'sine', 0.15)
      playSoftTone(659.25, 'sine', 0.15)
      createExplosion(prev.x + tileSizeRef.current.w / 2, prev.y + tileSizeRef.current.h / 2, COLOR_THEMES.matchedBg)
      createExplosion(cur.x + tileSizeRef.current.w / 2, cur.y + tileSizeRef.current.h / 2, COLOR_THEMES.matchedBg)
      const word = prev.type === 'en' ? prev.text : cur.text
      speakWord(word)
      selectedRef.current = null

      const totalPairs = (colsRef.current * rowsRef.current) / 2
      if (matchedPairsRef.current.size >= totalPairs) {
        setAllMatched(true)
        onAllMatchedRef.current?.()
      }
    } else {
      onWrongRef.current?.()
      playSoftTone(150, 'sawtooth', 0.2)
      ;[prevSel, clicked].forEach(pos => {
        const t = gridRef.current[pos.r][pos.c]
        if (!t) return
        const start = Date.now()
        const timer = setInterval(() => {
          if (Date.now() - start > 250) { t.shakeOffset = 0; clearInterval(timer); shakeTimersRef.current.delete(timer) }
          else t.shakeOffset = Math.sin((Date.now() - start) / 15) * 5
        }, 16)
        shakeTimersRef.current.add(timer)
      })
      selectedRef.current = null
    }
  }, [createExplosion])

  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const sw = sizeRef.current.w; const sh = sizeRef.current.h
    const tw = tileSizeRef.current.w; const th = tileSizeRef.current.h
    const cols = colsRef.current
    const rows = rowsRef.current

    ctx.clearRect(0, 0, sw, sh)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = gridRef.current[r]?.[c]
        if (!t || t.isEliminated) continue
        if (Math.abs(t.y - t.targetY) > 0.5) t.y += (t.targetY - t.y) * 0.16
        else t.y = t.targetY
        const sel = selectedRef.current
        const isSel = sel?.r === r && sel?.c === c

        ctx.save()
        ctx.shadowColor = 'rgba(0,0,0,0.04)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4
        const isEn = t.type === 'en'
        ctx.fillStyle = isSel ? '#84cc16' : (isEn ? '#eff6ff' : '#fff7ed')
        ctx.strokeStyle = isSel ? '#a3e635' : (isEn ? '#bfdbfe' : '#fed7aa')
        ctx.lineWidth = 3
        ctx.beginPath()
        if ('roundRect' in ctx && typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(t.x + t.shakeOffset, t.y, tw, th, 14)
        } else {
          ctx.rect(t.x + t.shakeOffset, t.y, tw, th)
        }
        ctx.fill(); ctx.stroke(); ctx.restore()

        ctx.save()
        ctx.fillStyle = isSel ? '#ffffff' : (isEn ? '#1e40af' : '#9a3412')
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        const padX = 10
        const maxW = tw - padX * 2
        let fs = 18
        ctx.font = `bold ${fs}px Quicksand, "PingFang SC", sans-serif`
        while (ctx.measureText(t.text).width > maxW && fs > 10) { fs--; ctx.font = `bold ${fs}px Quicksand, "PingFang SC", sans-serif` }

        if (ctx.measureText(t.text).width <= maxW) {
          ctx.fillText(t.text, t.x + tw / 2 + t.shakeOffset, t.y + th / 2)
        } else {
          // Multi-line wrap for long text
          const words = t.text.split(' ')
          const lines: string[] = []
          let line = ''
          for (const w of words) {
            const test = line ? line + ' ' + w : w
            if (ctx.measureText(test).width > maxW) {
              if (line) lines.push(line)
              line = w
            } else {
              line = test
            }
          }
          if (line) lines.push(line)
          const maxLines = 3
          if (lines.length > maxLines) {
            lines.splice(maxLines)
            lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…'
          }
          const lh = fs * 1.35
          const totalH = lines.length * lh
          const startY = t.y + (th - totalH) / 2 + lh / 2
          lines.forEach((ln, i) => {
            ctx.fillText(ln, t.x + tw / 2 + t.shakeOffset, startY + i * lh)
          })
        }
        ctx.restore()
      }
    }

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i]; p.update(); p.draw(ctx)
      if (p.alpha <= 0) particlesRef.current.splice(i, 1)
    }
    animFrameRef.current = requestAnimationFrame(renderLoop)
  }, [])

  const startRender = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(renderLoop)
  }, [renderLoop])

  const stopRender = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    clearShakeTimers()
  }, [clearShakeTimers])

  return { canvasRef, allMatched, setupCanvas, initGame, startRender, stopRender, handleTap }
}
