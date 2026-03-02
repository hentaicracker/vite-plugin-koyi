import React, { useState } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: '#7aa2f7',
    color: '#1a1b26',
    border: '1px solid #7aa2f7'
  },
  secondary: {
    background: 'transparent',
    color: '#7aa2f7',
    border: '1px solid #7aa2f7'
  },
  danger: {
    background: 'transparent',
    color: '#f7768e',
    border: '1px solid #f7768e'
  },
  ghost: {
    background: 'transparent',
    color: '#565f89',
    border: '1px solid transparent'
  }
}

const HOVER_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: '#89b4fb', borderColor: '#89b4fb' },
  secondary: { background: 'rgba(122,162,247,0.1)' },
  danger: { background: 'rgba(247,118,142,0.1)' },
  ghost: { color: '#c0caf5', borderColor: '#414868' }
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const [hovered, setHovered] = useState(false)

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s ease',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    ...VARIANT_STYLES[variant],
    ...(hovered && !disabled ? HOVER_STYLES[variant] : {}),
    ...style
  }

  return (
    <button
      disabled={disabled}
      style={baseStyles}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...props}
    >
      {children}
    </button>
  )
}
