/**
 * vite-plugin-koyi — main plugin entry point
 *
 * What this plugin does:
 *  1. Uses @code-inspector/core to inject `data-insp-path` attributes into every
 *     JSX/Vue/Svelte element during the Vite transform step (build-time).
 *  2. Starts a WebSocket server on the Vite dev server that bridges the browser
 *     overlay to the local Claude Code CLI or Anthropic API.
 *  3. Injects the pre-built browser overlay (dist/client.iife.js) into every
 *     HTML page served by the dev server.
 *
 * Usage in vite.config.ts:
 *   import { KoyiPlugin } from 'vite-plugin-koyi'
 *   export default defineConfig({
 *     plugins: [KoyiPlugin({ claudeMode: 'cli' })]
 *   })
 */
import type { Plugin, ViteDevServer, HtmlTagDescriptor } from 'vite'
import type { Server as HttpServer } from 'http'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import {
  transformCode,
  isJsTypeFile,
  normalizePath
} from '@code-inspector/core'
import { KoyiServer, WS_PATH } from './server.js'

// Support both CJS (__dirname) and ESM (import.meta.url)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const _dirname: string =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url))

const CLIENT_BUNDLE = path.resolve(_dirname, 'client.iife.js')

// ─── Public API ───────────────────────────────────────────────────────────────

export interface KoyiOptions {
  /**
   * How to connect to Claude:
   *  - `'cli'`  (default) — spawns the local `claude` CLI (Claude Code).
   *             Requires: `npm install -g @anthropic-ai/claude-code`
   *  - `'api'`  — uses the Anthropic SDK with an API key.
   */
  claudeMode?: 'cli' | 'api'

  /**
   * Anthropic API key. Required when `claudeMode` is `'api'`.
   * Falls back to `process.env.ANTHROPIC_API_KEY`.
   */
  apiKey?: string

  /**
   * Claude model to use (only for `'api'` mode).
   * @default 'claude-opus-4-5'
   */
  model?: string

  /**
   * Keyboard shortcut to toggle the Koyi panel.
   * Format: modifier+key, e.g. 'ctrl+shift+k', 'alt+k'
   * @default 'ctrl+shift+k'
   */
  hotkey?: string

  /**
   * Initial position of the panel.
   * @default { x: 'right', y: 'bottom' }
   */
  position?: { x?: 'left' | 'right'; y?: 'top' | 'bottom' }

  /**
   * When `true`, code changes suggested by Claude are applied to the project
   * files **automatically** without requiring any confirmation.
   *
   * - CLI mode: passes `--dangerously-skip-permissions` to the `claude` CLI so
   *             Claude Code can write/edit files freely.
   * - API mode: instructs Claude to emit complete file contents, which the
   *             server writes to disk automatically.
   *
   * @default true
   */
  autoApply?: boolean
}

// ─── Plugin factory ───────────────────────────────────────────────────────────

export function KoyiPlugin(options: KoyiOptions = {}): Plugin[] {
  const {
    claudeMode = 'cli',
    apiKey = process.env.ANTHROPIC_API_KEY,
    model,
    hotkey = 'ctrl+shift+k',
    position = { x: 'right', y: 'bottom' },
    autoApply = true
  } = options

  let projectRoot = process.cwd()

  // ── Plugin 1: DOM path injection (build-time AST transform) ──────────────
  // IMPORTANT: enforce:'pre' ensures this runs before Vite's own transforms,
  // but within the same enforce group, array order still matters.
  // Users MUST list KoyiPlugin() BEFORE their framework plugin (e.g. react())
  // in their vite.config so this transform sees original JSX source.
  const transformPlugin: Plugin = {
    name: 'vite-plugin-koyi:transform',
    enforce: 'pre',
    apply: (_, { command }) => command === 'serve',

    configResolved(config) {
      projectRoot = config.root
    },

    transform(code: string, id: string) {
      // Only transform JS/TS/JSX/TSX/Vue/Svelte files; skip node_modules
      if (
        id.includes('node_modules') ||
        id.includes('/__koyi') ||
        (!isJsTypeFile(id) && !id.endsWith('.vue') && !id.endsWith('.svelte'))
      ) {
        return code
      }

      const filePath = normalizePath(id.split('?')[0])
      let fileType = ''
      if (filePath.endsWith('.vue')) fileType = 'vue'
      else if (filePath.endsWith('.svelte')) fileType = 'svelte'
      else if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx'))
        fileType = 'jsx'
      else if (filePath.endsWith('.ts') || filePath.endsWith('.js'))
        fileType = 'js'

      if (!fileType) return code

      try {
        return transformCode({
          content: code,
          filePath,
          fileType,
          // Use absolute paths so the server can read the file directly
          pathType: 'absolute',
          // Avoid transforming our own injected overlay elements
          escapeTags: ['koyi-overlay']
        })
      } catch {
        // Silently skip files that can't be parsed (e.g. non-JSX TS)
        return code
      }
    }
  }

  // ── Plugin 2: WebSocket server + client injection ─────────────────────────
  const serverPlugin: Plugin = {
    name: 'vite-plugin-koyi:server',
    apply: (_, { command }) => command === 'serve',

    configureServer(server: ViteDevServer) {
      if (!server.httpServer) return

      new KoyiServer(server.httpServer as HttpServer, {
        projectRoot,
        claudeMode,
        apiKey,
        model,
        autoApply
      })

      // Print a helpful startup message
      server.httpServer.once('listening', () => {
        const address = server.httpServer!.address()
        const port = typeof address === 'object' && address ? address.port : '?'
        console.log(
          `\n  \x1b[36m⚡ Koyi AI\x1b[0m  ` +
            `\x1b[2mws://localhost:${port}${WS_PATH}\x1b[0m` +
            `  mode=${claudeMode}  toggle=${hotkey}\n`
        )
      })
    },

    transformIndexHtml(): HtmlTagDescriptor[] {
      const clientCode = fs.existsSync(CLIENT_BUNDLE)
        ? fs.readFileSync(CLIENT_BUNDLE, 'utf-8')
        : `console.warn('[koyi] Client bundle not found. Run: pnpm build:client')`

      const config = JSON.stringify({ hotkey, position, wsPath: WS_PATH })

      return [
        {
          tag: 'script',
          attrs: { type: 'text/javascript', id: '__koyi_script' },
          // Inject the bundle + mount the web component
          children: `${clientCode}
;(function(){
  if(typeof window==='undefined') return;
  window.__KOYI_CONFIG__=${config};
  if(!customElements.get('koyi-overlay')){
    // The IIFE registers <koyi-overlay> automatically.
    // We just need to ensure it's in the DOM.
  }
  if(!document.querySelector('koyi-overlay')){
    var el=document.createElement('koyi-overlay');
    document.body.appendChild(el);
  }
})();`,
          injectTo: 'body'
        }
      ]
    }
  }

  return [transformPlugin, serverPlugin]
}
