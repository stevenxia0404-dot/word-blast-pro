import { useEffect, useRef, memo } from 'react'

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onTap: (cx: number, cy: number) => void
  onResize: () => void
}

export const GameCanvas = memo(function GameCanvas({ canvasRef, onTap, onResize }: Props) {
  const handlerRef = useRef(onTap)
  handlerRef.current = onTap
  const resizeRef = useRef(onResize)
  resizeRef.current = onResize

  useEffect(() => {
    const onResizeEvt = () => resizeRef.current()
    window.addEventListener('resize', onResizeEvt)
    window.addEventListener('orientationchange', onResizeEvt)
    return () => {
      window.removeEventListener('resize', onResizeEvt)
      window.removeEventListener('orientationchange', onResizeEvt)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onClick = (e: MouseEvent) => {
      handlerRef.current(e.clientX, e.clientY)
    }

    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [])

  return (
    <div className="relative w-full bg-white rounded-[2rem] p-3 shadow-[0_24px_48px_rgba(132,204,22,0.15)] border-4 border-white">
      <canvas
        ref={canvasRef}
        className="w-full block rounded-2xl" style={{ touchAction: 'manipulation', height: 'clamp(260px, 55vh, 600px)' }}
      />
    </div>
  )
})
