/**
 * Claude Bridge — connects the WebSocket server to Claude.
 *
 * Supports two modes:
 *  - 'api'  → Uses the Anthropic Node.js SDK with an API key (streaming).
 *  - 'cli'  → Spawns the local `claude` CLI (Claude Code) in --print mode.
 *             With autoApply=true, adds --dangerously-skip-permissions so Claude
 *             can modify files directly without confirmation prompts.
 */
import { spawn, type ChildProcess } from 'child_process'
import os from 'os'
import path from 'path'
import fs from 'fs'
import Anthropic from '@anthropic-ai/sdk'
import type { ChatRole, ImageAttachment } from '../shared/types.js'

export interface ClaudeBridgeOptions {
  mode: 'api' | 'cli'
  apiKey?: string
  projectRoot: string
  model?: string
  /**
   * When true, code changes suggested by Claude are applied to disk automatically
   * without requiring user confirmation.
   * - CLI mode: adds --dangerously-skip-permissions flag
   * - API mode: the system prompt instructs Claude to output changes in a
   *             machine-readable patch format that the server writes to disk
   */
  autoApply?: boolean
}

export interface StreamRequest {
  userContent: string
  /** Pre-built context string from selected DOM elements */
  systemContext: string
  history: Array<{ role: ChatRole; content: string }>
  /** Images the user attached to this message */
  images?: ImageAttachment[]
}

const BASE_SYSTEM_PROMPT = `You are Koyi, an expert AI assistant specialized in frontend development.
You help developers understand, debug, and improve their UI components in real-time.

When the user provides DOM element context (selected from the live browser view), you will:
1. Analyze the component source code at that location
2. Understand the element's role in the UI
3. Provide precise, actionable suggestions

Guidelines:
- Be concise and focused on the specific element/issue
- Always show code examples with correct language syntax highlighting
- Reference specific file paths and line numbers when discussing code
- Prefer modern, idiomatic patterns for the detected framework

## Code Change Reporting (IMPORTANT)
Whenever you make or suggest any file modifications, you MUST display every changed file in the Koyi panel using the following format so the user can review what is being modified:

\`\`\`diff
// filepath: <relative/path/to/file>
- removed line
+ added line
  unchanged context line
\`\`\`

If you apply multiple files, repeat the diff block for each file.
After the diff(s), briefly summarize in one or two sentences what was changed and why.
Never silently modify files without showing the diff in your response.`

export class ClaudeBridge {
  private client?: Anthropic
  private options: ClaudeBridgeOptions
  private activeProc?: ChildProcess
  private abortController?: AbortController
  /** Content of the project's CLAUDE.md file (empty string if not found) */
  private claudeMdContent: string
  /**
   * Claude CLI session ID for the current conversation.
   * Set after the first CLI turn; used with --resume on subsequent turns.
   * Cleared when the conversation resets (history.length === 0) or on abort.
   */
  private cliSessionId?: string

  constructor(options: ClaudeBridgeOptions) {
    this.options = options
    this.claudeMdContent = this.readClaudeMd()

    if (this.claudeMdContent) {
      console.log('[koyi] Loaded CLAUDE.md project instructions')
    }

    if (options.mode === 'api') {
      const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        console.warn(
          '[koyi] No ANTHROPIC_API_KEY found. Set it in your environment or pass apiKey to KoyiPlugin().'
        )
      }
      this.client = new Anthropic({ apiKey })
    }
  }

  /**
   * Read CLAUDE.md from the project root.
   * Checks multiple candidate paths in priority order.
   */
  private readClaudeMd(): string {
    const candidates = [
      'CLAUDE.md',
      'claude.md',
      '.claude/CLAUDE.md',
      '.claude/claude.md'
    ]
    for (const name of candidates) {
      const fullPath = path.resolve(this.options.projectRoot, name)
      if (fs.existsSync(fullPath)) {
        try {
          return fs.readFileSync(fullPath, 'utf-8').trim()
        } catch {
          // ignore read errors
        }
      }
    }
    return ''
  }

  /**
   * Build the complete system prompt, merging in order:
   *  1. Base Koyi instructions
   *  2. Project-level CLAUDE.md (if present)
   *  3. DOM element context for the current request (if present)
   */
  private buildSystemPrompt(systemContext: string): string {
    const parts: string[] = [BASE_SYSTEM_PROMPT]

    if (this.claudeMdContent) {
      parts.push(
        '---\n\n## Project Instructions (from CLAUDE.md)\n\n' +
          this.claudeMdContent
      )
    }

    if (systemContext) {
      parts.push(
        '---\n\n## Current Context (selected DOM elements)\n\n' + systemContext
      )
    }

    return parts.join('\n\n')
  }

  async stream(
    request: StreamRequest,
    onChunk: (text: string) => void,
    onDone: () => void
  ): Promise<void> {
    if (this.options.mode === 'cli') {
      // Reset the CLI session whenever the client starts a fresh conversation
      if (request.history.length === 0) {
        this.cliSessionId = undefined
      }
      return this.streamViaCLI(request, onChunk, onDone)
    }
    return this.streamViaAPI(request, onChunk, onDone)
  }

  abort(): void {
    this.abortController?.abort()
    this.activeProc?.kill('SIGTERM')
    this.activeProc = undefined
    // The session may be in an incomplete state after abort — start fresh next turn
    this.cliSessionId = undefined
  }

  // ─── Anthropic SDK (API mode) ───────────────────────────────────────────────

  private async streamViaAPI(
    request: StreamRequest,
    onChunk: (text: string) => void,
    onDone: () => void
  ): Promise<void> {
    if (!this.client) {
      throw new Error(
        'Anthropic client not initialized. Provide an API key or use claudeMode: "cli".'
      )
    }

    const { userContent, systemContext, history, images } = request

    const systemPrompt = this.buildSystemPrompt(systemContext)

    // Build user content: optional image blocks followed by the text message
    const userContentParam: Anthropic.Messages.MessageParam['content'] =
      images?.length
        ? [
            ...images.map((img) => ({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: img.mimeType as
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/gif'
                  | 'image/webp',
                data: img.base64
              }
            })),
            { type: 'text' as const, text: userContent }
          ]
        : userContent

    const messages: Anthropic.Messages.MessageParam[] = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: userContentParam }
    ]

    this.abortController = new AbortController()

    const stream = this.client.messages.stream(
      {
        model: this.options.model ?? 'claude-opus-4-5',
        max_tokens: 8096,
        system: systemPrompt,
        messages
      },
      { signal: this.abortController.signal }
    )

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        onChunk(event.delta.text)
      }
    }

    onDone()
    this.abortController = undefined
  }

  // ─── Claude Code CLI (cli mode) ─────────────────────────────────────────────

  private streamViaCLI(
    request: StreamRequest,
    onChunk: (text: string) => void,
    onDone: () => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const { userContent, systemContext } = request

      // ── Build CLI arguments ────────────────────────────────────────────
      const cliArgs: string[] = []

      if (this.cliSessionId) {
        // Resume the existing Claude CLI session.
        // Claude manages the full conversation history internally — no need
        // to re-send previous turns as text.
        cliArgs.push('--resume', this.cliSessionId)
        console.log(`[koyi] Resuming CLI session ${this.cliSessionId}`)
      }

      // --print           → non-interactive, output to stdout
      // --output-format   → NDJSON stream so we can capture session_id
      // --verbose         → required by the CLI when combining --print + stream-json
      cliArgs.push('--print', '--output-format', 'stream-json', '--verbose')

      if (this.options.autoApply) {
        cliArgs.push('--dangerously-skip-permissions')
      }

      // ── Write temp files for attached images ───────────────────────────
      const tempImageFiles: string[] = []
      if (request.images?.length) {
        for (let i = 0; i < request.images.length; i++) {
          const img = request.images[i]
          const ext = (img.mimeType.split('/')[1] ?? 'png').replace(
            'jpeg',
            'jpg'
          )
          const tempPath = path.join(
            os.tmpdir(),
            `koyi-img-${Date.now()}-${i}.${ext}`
          )
          fs.writeFileSync(tempPath, Buffer.from(img.base64, 'base64'))
          tempImageFiles.push(tempPath)
        }
      }

      // ── Build prompt ───────────────────────────────────────────────────
      // Build image reference section to embed in the prompt (CLI has no --image flag)
      const imageSection =
        tempImageFiles.length > 0
          ? '\n\n## Attached Images\n\n' +
            tempImageFiles.map((p, i) => `Image ${i + 1}: ${p}`).join('\n')
          : ''

      let prompt: string
      if (this.cliSessionId) {
        // Resuming: only send the new user message.
        // Re-attach DOM context if the user selected elements this turn.
        const parts: string[] = []
        if (systemContext) {
          parts.push(
            '## Current Context (selected DOM elements)\n\n' + systemContext,
            '---'
          )
        }
        parts.push(userContent + imageSection)
        prompt = parts.join('\n\n')
      } else {
        // Fresh session: include full system prompt + user request
        const systemSection = this.buildSystemPrompt(systemContext)
        prompt = [
          systemSection,
          `---\n\n## User Request\n\n${userContent}${imageSection}`
        ].join('\n\n')
      }

      cliArgs.push(prompt)

      // ── Spawn ──────────────────────────────────────────────────────────
      const proc = spawn('claude', cliArgs, {
        cwd: this.options.projectRoot,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe']
      })

      this.activeProc = proc

      // ── Parse NDJSON stream ────────────────────────────────────────────
      // Claude CLI with --output-format stream-json emits one JSON object
      // per line. We buffer partial lines and parse complete ones.
      let lineBuffer = ''

      type StreamEvent = {
        type?: string
        session_id?: string
        message?: { content?: Array<{ type: string; text?: string }> }
      }

      const processLine = (line: string): void => {
        if (!line.trim()) return
        try {
          const event = JSON.parse(line) as StreamEvent
          // Persist the session ID so subsequent turns can use --resume
          if (event.session_id) {
            this.cliSessionId = event.session_id
          }
          // Forward text content from assistant message events
          if (event.type === 'assistant' && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === 'text' && block.text) {
                onChunk(block.text)
              }
            }
          }
        } catch {
          // Not JSON (e.g. a plain-text fallback line) — forward as raw text
          onChunk(line + '\n')
        }
      }

      proc.stdout.on('data', (chunk: Buffer) => {
        lineBuffer += chunk.toString('utf-8')
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() ?? '' // keep the incomplete trailing line
        lines.forEach(processLine)
      })

      proc.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8')
        if (
          !text.includes('Bypassing Permissions') &&
          !text.includes('Human:')
        ) {
          console.warn('[koyi] claude stderr:', text.trim())
        }
      })

      proc.on('close', (code) => {
        // Flush any remaining buffered content
        if (lineBuffer.trim()) processLine(lineBuffer)
        lineBuffer = ''

        // Clean up temp image files
        for (const f of tempImageFiles) {
          try {
            fs.unlinkSync(f)
          } catch {
            /* ignore */
          }
        }

        this.activeProc = undefined
        if (code === 0 || code === null) {
          onDone()
          resolve()
        } else {
          reject(new Error(`Claude CLI exited with code ${code}`))
        }
      })

      proc.on('error', (err: NodeJS.ErrnoException) => {
        this.activeProc = undefined
        if (err.code === 'ENOENT') {
          reject(
            new Error(
              '[koyi] `claude` command not found.\n' +
                '  Install Claude Code with: npm install -g @anthropic-ai/claude-code\n' +
                '  Or switch to API mode: KoyiPlugin({ claudeMode: "api", apiKey: "sk-..." })'
            )
          )
        } else {
          reject(err)
        }
      })
    })
  }
}
