import React, { useState } from 'react'

interface CardProps {
  title: string
  description: string
  icon?: string
  active?: boolean
  onClick?: () => void
}

export function Card({ title, description, icon, active, onClick }: CardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '20px 22px',
        borderRadius: 10,
        border: `1px solid ${active ? '#7aa2f7' : hovered ? '#414868' : '#292e42'}`,
        background: active
          ? 'rgba(122,162,247,0.07)'
          : hovered
            ? '#1e2030'
            : '#16161e',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s ease',
        boxShadow: active ? '0 0 0 1px rgba(122,162,247,0.2)' : 'none'
      }}
    >
      {icon && <div style={{ fontSize: 26, marginBottom: 12 }}>{icon}</div>}
      <h4
        style={{
          margin: '0 0 8px',
          fontSize: 15,
          fontWeight: 600,
          color: active ? '#7aa2f7' : '#c0caf5',
          transition: 'color 0.15s'
        }}
      >
        {title}
      </h4>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: '#565f89',
          lineHeight: 1.65
        }}
      >
        {description}
      </p>
    </div>
  )
}
