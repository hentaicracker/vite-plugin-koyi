import React, { useState } from 'react'
import { Button } from './Button'
import { Card } from './Card'
import { Badge } from './Badge'

interface Props {
  count: number
  onCountChange: (n: number) => void
}

export function ComponentShowcase({ count, onCountChange }: Props) {
  const [active, setActive] = useState<string | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Buttons */}
      <div>
        <SectionTitle>Buttons</SectionTitle>
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}
        >
          <Button variant="primary" onClick={() => onCountChange(count + 1)}>
            Clicked {count}×
          </Button>
          <Button variant="secondary" onClick={() => onCountChange(0)}>
            Reset
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </div>

      {/* Badges */}
      <div>
        <SectionTitle>Badges</SectionTitle>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}
        >
          <Badge color="blue">New</Badge>
          <Badge color="green">Active</Badge>
          <Badge color="yellow">Pending</Badge>
          <Badge color="red">Error</Badge>
          <Badge color="purple">Beta</Badge>
          <Badge color="orange">Pro</Badge>
        </div>
      </div>

      {/* Cards */}
      <div>
        <SectionTitle>Cards</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16
          }}
        >
          <Card
            title="Component Inspector"
            description="Click any element to capture its source file location, component tree, and HTML. The context is automatically sent to Claude."
            icon="🔍"
            active={active === 'inspector'}
            onClick={() =>
              setActive(active === 'inspector' ? null : 'inspector')
            }
          />
          <Card
            title="AI Chat Panel"
            description="Persistent chat with Claude. Ask about your UI, request refactors, debug layout issues — all with real component context."
            icon="💬"
            active={active === 'chat'}
            onClick={() => setActive(active === 'chat' ? null : 'chat')}
          />
          <Card
            title="Source Mapping"
            description="The Vite plugin injects data-insp-path attributes into every JSX element, mapping DOM nodes directly to source files."
            icon="🗺️"
            active={active === 'source'}
            onClick={() => setActive(active === 'source' ? null : 'source')}
          />
        </div>
      </div>

      {/* Form elements */}
      <div>
        <SectionTitle>Form Elements</SectionTitle>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxWidth: 400
          }}
        >
          <FormField label="Name" placeholder="Enter your name…" />
          <FormField label="Email" type="email" placeholder="you@example.com" />
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              defaultChecked
              style={{ accentColor: '#7aa2f7' }}
            />
            <span style={{ fontSize: 14, color: '#a9b1d6' }}>
              Enable notifications
            </span>
          </label>
          <Button variant="primary" style={{ alignSelf: 'flex-start' }}>
            Submit
          </Button>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 14,
        fontWeight: 600,
        color: '#565f89',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 14,
        marginTop: 0
      }}
    >
      {children}
    </h3>
  )
}

function FormField({
  label,
  placeholder,
  type = 'text'
}: {
  label: string
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          color: '#565f89',
          marginBottom: 5
        }}
      >
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '9px 12px',
          borderRadius: 7,
          border: '1px solid #292e42',
          background: '#1e2030',
          color: '#c0caf5',
          fontSize: 14,
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'border-color 0.15s'
        }}
        onFocus={(e) =>
          ((e.target as HTMLElement).style.borderColor = '#7aa2f7')
        }
        onBlur={(e) =>
          ((e.target as HTMLElement).style.borderColor = '#292e42')
        }
      />
    </div>
  )
}
