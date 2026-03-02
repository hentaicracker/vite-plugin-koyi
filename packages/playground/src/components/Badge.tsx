import React from 'react'

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple'

const COLOR_MAP: Record<
  BadgeColor,
  { bg: string; text: string; border: string }
> = {
  blue: {
    bg: 'rgba(122,162,247,0.12)',
    text: '#7aa2f7',
    border: 'rgba(122,162,247,0.3)'
  },
  green: {
    bg: 'rgba(158,206,106,0.12)',
    text: '#9ece6a',
    border: 'rgba(158,206,106,0.3)'
  },
  yellow: {
    bg: 'rgba(224,175,104,0.12)',
    text: '#e0af68',
    border: 'rgba(224,175,104,0.3)'
  },
  red: {
    bg: 'rgba(247,118,142,0.12)',
    text: '#f7768e',
    border: 'rgba(247,118,142,0.3)'
  },
  purple: {
    bg: 'rgba(187,154,247,0.12)',
    text: '#bb9af7',
    border: 'rgba(187,154,247,0.3)'
  }
}

interface BadgeProps {
  color?: BadgeColor
  children: React.ReactNode
}

export function Badge({ color = 'blue', children }: BadgeProps) {
  const { bg, text, border } = COLOR_MAP[color]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        background: bg,
        color: text,
        border: `1px solid ${border}`,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        userSelect: 'none'
      }}
    >
      {children}
    </span>
  )
}
