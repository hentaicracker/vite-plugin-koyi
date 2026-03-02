/**
 * DomInspector — browser-side DOM element picker.
 *
 * When active, the user hovers over any element to see a blue highlight.
 * Clicking captures that element's data-insp-path attribute (injected by
 * @code-inspector/core at build time) and its HTML info.
 *
 * Renders:
 *  1. A full-screen transparent overlay that intercepts mouse events
 *  2. A styled highlight box that follows the cursor
 *  3. A tooltip showing the component path
 */
import React, { useEffect, useRef, useCallback } from 'react'
import type { DomContext } from '../../shared/types'

interface DomInspectorProps {
  active: boolean
  onSelect: (ctx: DomContext) => void
  onCancel: () => void
}

const PATH_ATTR = 'data-insp-path'

function parseInspPath(
  raw: string
): { filePath: string; line: number; column: number } | null {
  // Format from @code-inspector/core: "/abs/path/to/file.tsx:12:5"
  const lastColon = raw.lastIndexOf(':')
  const secondLastColon = raw.lastIndexOf(':', lastColon - 1)
  if (secondLastColon === -1) return null

  const filePath = raw.slice(0, secondLastColon)
  const line = parseInt(raw.slice(secondLastColon + 1, lastColon), 10)
  const column = parseInt(raw.slice(lastColon + 1), 10)

  if (!filePath || isNaN(line) || isNaN(column)) return null
  return { filePath, line, column }
}

/** Walk up the DOM tree to find the closest element with data-insp-path */
function findInspElement(target: Element | null): Element | null {
  let el: Element | null = target
  while (el && el !== document.documentElement) {
    if (el.hasAttribute(PATH_ATTR)) return el
    el = el.parentElement
  }
  return null
}

export function DomInspector({
  active,
  onSelect,
  onCancel
}: DomInspectorProps) {
  const highlightRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const currentElRef = useRef<Element | null>(null)

  const updateHighlight = useCallback((el: Element | null) => {
    const highlight = highlightRef.current
    const tooltip = tooltipRef.current
    if (!highlight || !tooltip) return

    if (!el) {
      highlight.style.display = 'none'
      tooltip.style.display = 'none'
      return
    }

    const rect = el.getBoundingClientRect()
    highlight.style.display = 'block'
    highlight.style.left = `${rect.left + window.scrollX}px`
    highlight.style.top = `${rect.top + window.scrollY}px`
    highlight.style.width = `${rect.width}px`
    highlight.style.height = `${rect.height}px`

    const pathRaw = el.getAttribute(PATH_ATTR) ?? ''
    const parsed = parseInspPath(pathRaw)
    const label = parsed
      ? `${parsed.filePath.split('/').pop()}:${parsed.line}`
      : el.tagName.toLowerCase()

    tooltip.textContent = label
    tooltip.style.display = 'block'
    // Position tooltip above the element or below if near the top
    const tipTop = rect.top + window.scrollY - 28
    tooltip.style.left = `${rect.left + window.scrollX}px`
    tooltip.style.top = `${Math.max(4, tipTop)}px`
  }, [])

  useEffect(() => {
    if (!active) {
      updateHighlight(null)
      return
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as Element
      const inspEl = findInspElement(target)
      currentElRef.current = inspEl
      updateHighlight(inspEl)
    }

    const handleClick = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()

      const el = currentElRef.current
      if (!el) {
        onCancel()
        return
      }

      const pathRaw = el.getAttribute(PATH_ATTR) ?? ''
      const parsed = parseInspPath(pathRaw)

      // Build outerHTML snippet (truncated)
      let outerHTML = el.outerHTML
      if (outerHTML.length > 600) outerHTML = outerHTML.slice(0, 600) + '…'

      const ctx: DomContext = {
        filePath: parsed?.filePath ?? '',
        line: parsed?.line ?? 0,
        column: parsed?.column ?? 0,
        tagName: el.tagName.toLowerCase(),
        id: (el as HTMLElement).id || undefined,
        className: (el as HTMLElement).className || undefined,
        outerHTML
      }

      onSelect(ctx)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }

    document.addEventListener('mouseover', handleMouseOver, true)
    document.addEventListener('click', handleClick, true)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true)
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener('keydown', handleKeyDown)
      updateHighlight(null)
    }
  }, [active, onSelect, onCancel, updateHighlight])

  if (!active) return null

  return (
    <>
      {/* Full-screen cursor style indicator */}
      <style>{`* { cursor: crosshair !important; }`}</style>

      {/* Highlight box rendered in document flow (not shadow DOM) */}
      <div
        ref={highlightRef}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 2147483645,
          border: '2px solid #7aa2f7',
          background: 'rgba(122,162,247,0.12)',
          borderRadius: 3,
          boxSizing: 'border-box',
          transition: 'all 60ms ease',
          display: 'none'
        }}
      />

      {/* File:line tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 2147483646,
          background: '#1a1b26',
          color: '#7aa2f7',
          border: '1px solid #414868',
          borderRadius: 4,
          fontSize: 11,
          fontFamily: 'ui-monospace, monospace',
          padding: '2px 6px',
          whiteSpace: 'nowrap',
          display: 'none'
        }}
      />
    </>
  )
}
