/**
 * DomInspector — browser-side DOM element picker.
 *
 * When active, the user hovers over any element to see a blue highlight.
 * Clicking captures that element's data-insp-path attribute (injected by
 * @code-inspector/core at build time) and its HTML info.
 *
 * Multi-select: hold Alt+Shift while clicking to add multiple elements
 * without closing the picker. The highlight turns green and the tooltip
 * shows a ✚ add hint when the modifier is held.
 *
 * Renders:
 *  1. A full-screen transparent overlay that intercepts mouse events
 *  2. A styled highlight box that follows the cursor
 *  3. A tooltip showing the component path (+ multi-select hint)
 */
import React, { useEffect, useRef, useCallback } from 'react'
import type { DomContext } from '../../shared/types'

interface DomInspectorProps {
  active: boolean
  /** keepOpen is true when Alt+Shift was held — picker stays active for multi-select */
  onSelect: (ctx: DomContext, keepOpen?: boolean) => void
  onCancel: () => void
}

const PATH_ATTR = 'data-insp-path'

function parseInspPath(
  raw: string
): { filePath: string; line: number; column: number } | null {
  // @code-inspector/core injects: "filePath:line:column:tagName"
  // tagName is last, column is second-to-last, line is third-to-last.
  // filePath is rejoined with ':' to support Windows paths (e.g. C:\...)
  const parts = raw.split(':')
  if (parts.length < 4) return null

  const column = parseInt(parts[parts.length - 2], 10)
  const line = parseInt(parts[parts.length - 3], 10)
  const filePath = parts.slice(0, parts.length - 3).join(':')

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
  /** True while both Alt and Shift are held */
  const isMultiRef = useRef(false)

  const getTooltipLabel = useCallback(
    (el: Element, isMulti: boolean): string => {
      const pathRaw = el.getAttribute(PATH_ATTR) ?? ''
      const parsed = parseInspPath(pathRaw)
      const base = parsed
        ? `${parsed.filePath.split('/').pop()}:${parsed.line}`
        : el.tagName.toLowerCase()
      return isMulti ? `${base}  ✚ add` : base
    },
    []
  )

  const updateHighlight = useCallback(
    (el: Element | null, isMulti = false) => {
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
      // Green tint in multi-select mode, blue otherwise
      highlight.style.borderColor = isMulti ? '#9ece6a' : '#7aa2f7'
      highlight.style.background = isMulti
        ? 'rgba(158,206,106,0.12)'
        : 'rgba(122,162,247,0.12)'

      tooltip.textContent = getTooltipLabel(el, isMulti)
      tooltip.style.color = isMulti ? '#9ece6a' : '#7aa2f7'
      tooltip.style.display = 'block'
      // Position tooltip above the element or below if near the top
      const tipTop = rect.top + window.scrollY - 28
      tooltip.style.left = `${rect.left + window.scrollX}px`
      tooltip.style.top = `${Math.max(4, tipTop)}px`
    },
    [getTooltipLabel]
  )

  useEffect(() => {
    if (!active) {
      updateHighlight(null)
      return
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as Element
      const inspEl = findInspElement(target)
      currentElRef.current = inspEl
      updateHighlight(inspEl, isMultiRef.current)
    }

    const handleClick = (e: MouseEvent) => {
      // If the click is inside the Koyi overlay (shadow DOM), let it pass through
      // so the panel remains fully interactive while the picker is active.
      const isInsideKoyi = e
        .composedPath()
        .some(
          (node) =>
            node instanceof Element &&
            node.tagName.toLowerCase() === 'koyi-overlay'
        )
      if (isInsideKoyi) return

      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()

      const el = currentElRef.current
      if (!el) {
        // In multi-select mode don't cancel — user may have drifted over a
        // non-inspectable gap; just swallow the click and keep picking.
        if (!isMultiRef.current) onCancel()
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

      // Use isMultiRef.current rather than e.altKey&&e.shiftKey — on macOS the
      // browser may consume the Alt key before the click event fires, making
      // the modifier flags unreliable on the MouseEvent.
      const keepOpen = isMultiRef.current
      onSelect(ctx, keepOpen)
    }

    /** Sync modifier state and refresh highlight colour/tooltip when it changes */
    const syncModifier = (e: KeyboardEvent | MouseEvent) => {
      const next = e.altKey && e.shiftKey
      if (next !== isMultiRef.current) {
        isMultiRef.current = next
        updateHighlight(currentElRef.current, next)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
        return
      }
      syncModifier(e)
    }

    const handleKeyUp = (e: KeyboardEvent) => syncModifier(e)

    document.addEventListener('mouseover', handleMouseOver, true)
    document.addEventListener('click', handleClick, true)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true)
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
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
