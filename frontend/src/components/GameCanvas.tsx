import { useEffect, useRef, useCallback } from 'react'

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onTap: (cx: number, cy: number) => void
  onResize: () => void
}

export function GameCanvas({ canvasRef, onTap, onResize }: Props) {
  const clickHandlerRef = useRef(onTap)
  clickHandlerRef.current = onTap
  const resizeHandlerRef = useRef(onResize)
  resizeHandlerRef.current = onResize

  const handleClick = useCallback((e: React.MouseEvent) => {
    clickHandlerRef.current(e.clientX, e.clientY)
  }, [])

  useEffect(() => {
    const onResizeEvt = () => resizeHandlerRef.current()
    window.addEventListener('resize', onResizeEvt)
    window.addEventListener('orientationchange', onResizeEvt)
    return () => {
      window.removeEventListener('resize', onResizeEvt)
      window.removeEventListener('orientationchange', onResizeEvt)
    }
  }, [])

  return (
    <div className="relative w-full bg-white rounded-[2rem] p-3 shadow-[0_24px_48px_rgba(132,204,22,0.15)] border-4 border-white">
      <canvas
        ref={canvasRef}
        className="w-full block rounded-2xl touch-none"
        style={{ height: 'clamp(260px, 55vh, 600px)' }}
        onClick={handleClick}
      />
    </div>
  )
}
