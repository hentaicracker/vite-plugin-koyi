import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { KoyiPlugin } from 'vite-plugin-koyi'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Koyi must come after the framework plugin
    ...KoyiPlugin({
      // 'cli'  → uses local `claude` CLI (Claude Code)
      // 'api'  → uses Anthropic SDK (set ANTHROPIC_API_KEY env var)
      claudeMode: 'cli',
      hotkey: 'ctrl+shift+k',
      position: { x: 'right', y: 'bottom' }
    })
  ],
  server: {
    port: 5173
  }
})
