/**
 * App — root component for the Koyi overlay panel.
 *
 * Renders a draggable, resizable floating panel that contains:
 *  - A draggable header bar
 *  - The ChatPanel
 *  - An invisible DomInspector overlay (when picker mode is active)
 *
 * The panel can be:
 *  - Toggled with the configured hotkey (default: Ctrl+Shift+K)
 *  - Minimized via the header button
 *  - Closed (hidden) — reopen with hotkey
 */
import React, { useState, useEffect, useCallback } from 'react'
import { ChatPanel } from './components/ChatPanel'
import { DomInspector } from './components/DomInspector'
import { useDrag } from './hooks/useDrag'
import type { DomContext } from '../shared/types'

interface KoyiConfig {
  hotkey: string
  position: { x?: 'left' | 'right'; y?: 'top' | 'bottom' }
  wsPath: string
}

interface AppProps {
  config: KoyiConfig
}

const PANEL_WIDTH = 380
const PANEL_HEIGHT = 560
const EDGE_GAP = 16

function getInitialPos(position: KoyiConfig['position']): {
  x: number
  y: number
} {
  const vw = window.innerWidth
  const vh = window.innerHeight
  return {
    x: position.x === 'left' ? EDGE_GAP : vw - PANEL_WIDTH - EDGE_GAP,
    y: position.y === 'top' ? EDGE_GAP : vh - PANEL_HEIGHT - EDGE_GAP
  }
}

/** Parse a hotkey string like "ctrl+shift+k" into a matcher function */
function parseHotkey(hotkey: string): (e: KeyboardEvent) => boolean {
  const parts = hotkey.toLowerCase().split('+')
  const key = parts[parts.length - 1]
  const ctrl = parts.includes('ctrl')
  const shift = parts.includes('shift')
  const alt = parts.includes('alt')
  const meta = parts.includes('meta')
  return (e) =>
    e.key.toLowerCase() === key &&
    e.ctrlKey === ctrl &&
    e.shiftKey === shift &&
    e.altKey === alt &&
    e.metaKey === meta
}

export function App({ config }: AppProps) {
  const [visible, setVisible] = useState(true)
  const [minimized, setMinimized] = useState(false)
  const [pickerActive, setPickerActive] = useState(false)
  const [pendingContext, setPendingContext] = useState<{
    ctx: DomContext
    append: boolean
  } | null>(null)

  const { panelRef, handleRef } = useDrag(getInitialPos(config.position))

  // ── Hotkey listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const matches = parseHotkey(config.hotkey)
    const onKeyDown = (e: KeyboardEvent) => {
      if (matches(e)) {
        e.preventDefault()
        setVisible((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [config.hotkey])

  const handlePickerToggle = useCallback((active: boolean) => {
    setPickerActive(active)
  }, [])

  const handleDomSelect = useCallback((ctx: DomContext, keepOpen?: boolean) => {
    if (!keepOpen) setPickerActive(false)
    setPendingContext({ ctx, append: !!keepOpen })
  }, [])

  const handleContextConsumed = useCallback(() => {
    setPendingContext(null)
  }, [])

  if (!visible) return null

  return (
    <>
      {/* Global keyframe for streaming cursor */}
      <style>{`
        @keyframes koyi-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      {/* DOM Inspector (transparent full-page overlay) */}
      <DomInspector
        active={pickerActive}
        onSelect={handleDomSelect}
        onCancel={() => setPickerActive(false)}
      />

      {/* Floating panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          width: PANEL_WIDTH,
          height: minimized ? 44 : PANEL_HEIGHT,
          zIndex: 2147483647,
          borderRadius: 10,
          boxShadow:
            '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(65,70,104,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'height 0.2s cubic-bezier(0.4,0,0.2,1)',
          // Initial position is set by useDrag via style.left/top
          right: 16,
          bottom: 16
        }}
      >
        {/* ── Header (drag handle) ── */}
        <div
          ref={handleRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 10px 0 14px',
            height: 44,
            background: '#16161e',
            borderBottom: minimized ? 'none' : '1px solid #24283b',
            cursor: 'grab',
            userSelect: 'none',
            flexShrink: 0
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              color: '#7aa2f7',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              letterSpacing: '0.02em'
            }}
          >
            <span style={{ fontSize: 15 }}>⚡</span>
            Koyi
          </span>

          <div style={{ display: 'flex', gap: 4 }}>
            {/* Minimize */}
            <HeaderButton
              title={minimized ? 'Expand' : 'Minimize'}
              onClick={() => setMinimized((m) => !m)}
            >
              {minimized ? '▢' : '—'}
            </HeaderButton>
            {/* Close (hide) */}
            <HeaderButton
              title={`Hide panel (${config.hotkey} to reopen)`}
              onClick={() => setVisible(false)}
              hoverColor="#f7768e"
            >
              ✕
            </HeaderButton>
          </div>
        </div>

        {/* ── Chat panel (collapsed when minimized) ── */}
        {!minimized && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatPanel
              wsPath={config.wsPath}
              onPickerToggle={handlePickerToggle}
              pickerActive={pickerActive}
              pendingContext={pendingContext}
              onContextConsumed={handleContextConsumed}
            />
          </div>
        )}
      </div>
    </>
  )
}

// ─── Header Button ────────────────────────────────────────────────────────────

function HeaderButton({
  children,
  onClick,
  title,
  hoverColor = '#c0caf5'
}: {
  children: React.ReactNode
  onClick: () => void
  title?: string
  hoverColor?: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.07)' : 'none',
        border: 'none',
        color: hovered ? hoverColor : '#565f89',
        cursor: 'pointer',
        width: 26,
        height: 26,
        borderRadius: 5,
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.1s',
        fontFamily: 'inherit'
      }}
    >
      {children}
    </button>
  )
}
