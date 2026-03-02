import React, { useState } from 'react'
import { HeroSection } from './components/HeroSection'
import { ComponentShowcase } from './components/ComponentShowcase'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f14 0%, #1a1b26 100%)'
      }}
    >
      <HeroSection />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>
        <section style={{ marginBottom: 60 }}>
          <h2
            style={{
              fontSize: 20,
              color: '#7aa2f7',
              marginBottom: 24,
              fontWeight: 600,
              letterSpacing: '-0.01em'
            }}
          >
            Component Showcase
          </h2>
          <p
            style={{
              color: '#565f89',
              fontSize: 14,
              marginBottom: 32,
              lineHeight: 1.7
            }}
          >
            Use the{' '}
            <kbd
              style={{
                background: '#24283b',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 12,
                border: '1px solid #414868',
                color: '#7aa2f7'
              }}
            >
              ⚡ Pick Element
            </kbd>{' '}
            button in the Koyi panel to select any component below, then ask
            Claude to explain or modify it.
          </p>
          <ComponentShowcase count={count} onCountChange={setCount} />
        </section>
      </main>
    </div>
  )
}
