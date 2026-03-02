/**
 * useDrag — makes a panel element draggable by its handle.
 *
 * Returns a ref to attach to the draggable container and a ref for the handle.
 * The panel is kept within the viewport bounds during dragging.
 */
import { useRef, useEffect, useCallback } from 'react'

interface Position {
  x: number
  y: number
}

export function useDrag(initialPos: Position) {
  const panelRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const posRef = useRef<Position>(initialPos)
  const dragging = useRef(false)
  const startOffset = useRef<Position>({ x: 0, y: 0 })

  const applyPos = useCallback((x: number, y: number) => {
    if (!panelRef.current) return
    const { innerWidth: vw, innerHeight: vh } = window
    const { offsetWidth: pw, offsetHeight: ph } = panelRef.current
    const cx = Math.max(0, Math.min(x, vw - pw))
    const cy = Math.max(0, Math.min(y, vh - ph))
    posRef.current = { x: cx, y: cy }
    panelRef.current.style.left = `${cx}px`
    panelRef.current.style.top = `${cy}px`
    panelRef.current.style.right = 'auto'
    panelRef.current.style.bottom = 'auto'
  }, [])

  useEffect(() => {
    const handle = handleRef.current
    if (!handle) return

    const onMouseDown = (e: MouseEvent) => {
      if (!panelRef.current) return
      e.preventDefault()
      dragging.current = true
      const rect = panelRef.current.getBoundingClientRect()
      startOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      document.body.style.userSelect = 'none'
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      applyPos(
        e.clientX - startOffset.current.x,
        e.clientY - startOffset.current.y
      )
    }

    const onMouseUp = () => {
      dragging.current = false
      document.body.style.userSelect = ''
    }

    handle.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      handle.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [applyPos])

  return { panelRef, handleRef }
}
