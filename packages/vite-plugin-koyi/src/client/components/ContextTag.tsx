/**
 * ContextTag — a removable chip showing a selected DOM element.
 */
import React from 'react'
import type { DomContext } from '../../shared/types'

interface ContextTagProps {
  ctx: DomContext
  onRemove: (ctx: DomContext) => void
}

export function ContextTag({ ctx, onRemove }: ContextTagProps) {
  const label = ctx.filePath
    ? `${ctx.filePath.split('/').pop()}:${ctx.line}`
    : `<${ctx.tagName}>`

  return (
    <span
      title={`${ctx.filePath}:${ctx.line}:${ctx.column}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px 2px 8px',
        borderRadius: 4,
        background: 'rgba(122,162,247,0.15)',
        border: '1px solid rgba(122,162,247,0.4)',
        color: '#7aa2f7',
        fontSize: 11,
        fontFamily: 'ui-monospace, monospace',
        cursor: 'default',
        userSelect: 'none',
        maxWidth: 160,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis'
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
      <button
        onClick={() => onRemove(ctx)}
        title="Remove context"
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'rgba(122,162,247,0.6)',
          fontSize: 13,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.color = '#f7768e')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.color =
            'rgba(122,162,247,0.6)')
        }
      >
        ×
      </button>
    </span>
  )
}
