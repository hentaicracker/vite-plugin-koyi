import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { KoyiPlugin } from 'vite-plugin-koyi'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Koyi MUST come before react() — both use enforce:'pre', so array order
    // determines execution. Koyi's transform needs to see the original JSX
    // source (before Babel compiles it) to inject data-insp-path with correct
    // line/column positions.
    ...KoyiPlugin({
      // 'cli'  → uses local `claude` CLI (Claude Code)
      // 'api'  → uses Anthropic SDK (set ANTHROPIC_API_KEY env var)
      claudeMode: 'cli',
      hotkey: 'ctrl+shift+k',
      position: { x: 'right', y: 'bottom' }
    }),
    react()
  ],
  server: {
    port: 5173
  }
})
