/**
 * Koyi WebSocket Server
 *
 * Attaches to the Vite dev server's HTTP server via the 'upgrade' event so we
 * don't need a separate port. The browser client connects to:
 *   ws://localhost:<vite-port>/__koyi_ws
 *
 * Responsibilities:
 *  1. Accept WebSocket connections from the browser overlay
 *  2. Parse DOM context (read source file snippets from disk)
 *  3. Stream responses from Claude back to the client
 */
import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage, Server } from 'http'
import path from 'path'
import fs from 'fs'
import type {
  ClientMessage,
  ServerMessage,
  DomContext
} from '../shared/types.js'
import { ClaudeBridge, type ClaudeBridgeOptions } from './claude-bridge.js'

export const WS_PATH = '/__koyi_ws'

/** Lines of source code to include above/below the target line */
const CONTEXT_RADIUS = 25

export interface KoyiServerOptions {
  projectRoot: string
  claudeMode: 'api' | 'cli'
  apiKey?: string
  model?: string
  autoApply?: boolean
}

export class KoyiServer {
  private wss: WebSocketServer
  private bridge: ClaudeBridge
  private projectRoot: string

  constructor(httpServer: Server, options: KoyiServerOptions) {
    this.projectRoot = options.projectRoot
    this.bridge = new ClaudeBridge({
      mode: options.claudeMode,
      apiKey: options.apiKey,
      projectRoot: options.projectRoot,
      model: options.model,
      autoApply: options.autoApply
    } satisfies ClaudeBridgeOptions)

    this.wss = new WebSocketServer({ noServer: true })

    // Intercept HTTP upgrade requests on the Vite dev server
    httpServer.on('upgrade', (req: IncomingMessage, socket: any, head: any) => {
      if (req.url === WS_PATH) {
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws, req)
          this.handleConnection(ws)
        })
      }
    })
  }

  private handleConnection(ws: WebSocket): void {
    const send = (msg: ServerMessage): void => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg))
      }
    }

    send({ type: 'ready' })

    ws.on('message', async (raw) => {
      let msg: ClientMessage
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage
      } catch {
        return
      }

      if (msg.type === 'send_message') {
        const { messageId, content, contexts, history, images } = msg

        const systemContext = await this.buildSystemContext(contexts)

        send({ type: 'stream_start', messageId })

        try {
          await this.bridge.stream(
            { userContent: content, systemContext, history, images },
            (text) => send({ type: 'stream_chunk', messageId, text }),
            () => send({ type: 'stream_end', messageId })
          )
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[koyi] Bridge error:', message)
          send({ type: 'stream_error', messageId, error: message })
        }
      } else if (msg.type === 'abort') {
        this.bridge.abort()
      }
    })

    ws.on('error', (err) => {
      console.error('[koyi] WebSocket error:', err.message)
    })
  }

  /**
   * Build a rich textual context block for Claude from selected DOM elements.
   * For each element, reads the relevant source snippet from disk.
   */
  private async buildSystemContext(contexts: DomContext[]): Promise<string> {
    if (contexts.length === 0) return ''

    const parts: string[] = []

    for (const ctx of contexts) {
      const lines: string[] = []

      // ── Element summary ──────────────────────────────────────────────────
      const elDesc = [
        `<${ctx.tagName}`,
        ctx.id ? ` id="${ctx.id}"` : '',
        ctx.className ? ` class="${ctx.className}"` : '',
        '>'
      ].join('')

      lines.push(`### Element: ${elDesc}`)

      if (ctx.filePath) {
        lines.push(`**Source:** \`${ctx.filePath}:${ctx.line}:${ctx.column}\``)

        // ── Read source file snippet ────────────────────────────────────
        const resolved = this.resolveFilePath(ctx.filePath)
        if (resolved) {
          try {
            const fileContent = fs.readFileSync(resolved, 'utf-8')
            const fileLines = fileContent.split('\n')
            const startIdx = Math.max(0, ctx.line - 1 - CONTEXT_RADIUS)
            const endIdx = Math.min(
              fileLines.length,
              ctx.line - 1 + CONTEXT_RADIUS
            )
            const snippet = fileLines.slice(startIdx, endIdx).join('\n')
            const ext = path.extname(resolved).slice(1) || 'tsx'

            lines.push(
              `\n\`\`\`${ext}\n// ${ctx.filePath} (lines ${startIdx + 1}–${endIdx})\n${snippet}\n\`\`\``
            )
          } catch {
            lines.push('_(Could not read source file)_')
          }
        }
      }

      // ── HTML snippet ──────────────────────────────────────────────────
      if (ctx.outerHTML) {
        const truncated =
          ctx.outerHTML.length > 600
            ? ctx.outerHTML.slice(0, 600) + '…'
            : ctx.outerHTML
        lines.push(`\n**HTML:**\n\`\`\`html\n${truncated}\n\`\`\``)
      }

      parts.push(lines.join('\n'))
    }

    return parts.join('\n\n---\n\n')
  }

  /** Resolve a (possibly relative) file path to an absolute path on disk */
  private resolveFilePath(filePath: string): string | null {
    if (path.isAbsolute(filePath) && fs.existsSync(filePath)) {
      return filePath
    }
    // Strip leading slash and try from project root
    const rel = filePath.startsWith('/') ? filePath.slice(1) : filePath
    const candidate = path.resolve(this.projectRoot, rel)
    return fs.existsSync(candidate) ? candidate : null
  }
}
