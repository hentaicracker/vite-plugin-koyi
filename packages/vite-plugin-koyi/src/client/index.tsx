/**
 * Client entry point.
 *
 * Registers a <koyi-overlay> custom element that mounts the React overlay
 * inside a Shadow DOM for complete style isolation from the host page.
 *
 * The plugin's transformIndexHtml injects this bundle and appends the element:
 *   <koyi-overlay></koyi-overlay>
 */
import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { App } from './App'

// ─── Config (injected by the Vite plugin) ────────────────────────────────────

interface KoyiConfig {
  hotkey: string
  position: { x?: 'left' | 'right'; y?: 'top' | 'bottom' }
  wsPath: string
}

function getConfig(): KoyiConfig {
  const defaults: KoyiConfig = {
    hotkey: 'ctrl+shift+k',
    position: { x: 'right', y: 'bottom' },
    wsPath: '/__koyi_ws',
  }
  try {
    const cfg = (window as any).__KOYI_CONFIG__
    return cfg ? { ...defaults, ...cfg } : defaults
  } catch {
    return defaults
  }
}

// ─── Web Component ────────────────────────────────────────────────────────────

class KoyiOverlay extends HTMLElement {
  private root: Root | null = null

  connectedCallback() {
    if (this.root) return

    // Create a shadow root for style isolation
    const shadow = this.attachShadow({ mode: 'open' })

    // React 18 needs a real DOM container inside the shadow root
    const container = document.createElement('div')
    container.id = 'koyi-root'
    shadow.appendChild(container)

    const config = getConfig()
    this.root = createRoot(container)
    this.root.render(<App config={config} />)
  }

  disconnectedCallback() {
    // Defer unmount so React can clean up event listeners
    setTimeout(() => {
      this.root?.unmount()
      this.root = null
    }, 0)
  }
}

// Register only once (guard against HMR double-registration)
if (!customElements.get('koyi-overlay')) {
  customElements.define('koyi-overlay', KoyiOverlay)
}
