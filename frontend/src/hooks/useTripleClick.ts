import { useState, useRef, useCallback } from 'react'

export function useTripleClick(timeoutMs = 2000) {
  const [isOpen, setIsOpen] = useState(false)
  const countRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = useCallback(() => {
    countRef.current += 1
    if (timerRef.current) clearTimeout(timerRef.current)
    if (countRef.current >= 3) {
      setIsOpen(true)
      countRef.current = 0
    } else {
      timerRef.current = setTimeout(() => { countRef.current = 0 }, timeoutMs)
    }
  }, [timeoutMs])

  return [isOpen, handleClick, () => setIsOpen(false)] as const
}
