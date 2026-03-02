import React from 'react'

export function HeroSection() {
  return (
    <header
      style={{
        padding: '80px 24px 60px',
        textAlign: 'center',
        borderBottom: '1px solid #24283b',
        marginBottom: 60
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 14,
          background: 'linear-gradient(135deg, rgba(122,162,247,0.22) 0%, rgba(187,154,247,0.22) 100%)',
          border: '2px solid rgba(122,162,247,0.5)',
          borderRadius: 32,
          padding: '12px 28px',
          marginBottom: 24,
          fontSize: 17,
          color: '#7aa2f7',
          fontWeight: 600,
          boxShadow: '0 6px 28px rgba(122,162,247,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
      >
        <span style={{ fontSize: 26, filter: 'drop-shadow(0 0 10px rgba(122,162,247,0.7))' }}>⚡</span>
        <span style={{ letterSpacing: '0.02em' }}>Koyi Playground</span>
      </div>

      <h1
        style={{
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 800,
          margin: '0 0 16px',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          color: '#c0caf5'
        }}
      >
        AI-Powered
        <br />
        Frontend Dev
      </h1>

      <p
        style={{
          color: '#565f89',
          fontSize: 16,
          maxWidth: 480,
          margin: '0 auto 32px',
          lineHeight: 1.7
        }}
      >
        Select any DOM element → ask Claude to explain, fix, or refactor the
        component. Real-time visual context meets conversational AI.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}
      >
        <Tip icon="🎯">Click Pick Element in the panel</Tip>
        <Tip icon="👆">Hover and click any component</Tip>
        <Tip icon="💬">Ask Claude anything about it</Tip>
      </div>
    </header>
  )
}

function Tip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 8,
        background: '#1e2030',
        border: '1px solid #292e42',
        fontSize: 13,
        color: '#a9b1d6'
      }}
    >
      <span>{icon}</span>
      {children}
    </div>
  )
}
