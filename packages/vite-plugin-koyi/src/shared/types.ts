/**
 * Shared types between the Node.js plugin server and the browser client overlay.
 * Keep this file free of any Node.js or browser-specific imports.
 */

// ─── DOM Context ─────────────────────────────────────────────────────────────

/** Info about a DOM element selected by the user for context */
export interface DomContext {
  /** Source file path (absolute or relative to project root) */
  filePath: string
  /** Line number (1-based) */
  line: number
  /** Column number (1-based) */
  column: number
  /** HTML tag name, e.g. "div", "button" */
  tagName: string
  /** element.id */
  id?: string
  /** element.className */
  className?: string
  /** Truncated outerHTML (max 500 chars) */
  outerHTML: string
}

// ─── Image Attachments ───────────────────────────────────────────────────────

/** An image the user attached to a message */
export interface ImageAttachment {
  /** Original filename, e.g. "screenshot.png" */
  name: string
  /** MIME type, e.g. "image/png" */
  mimeType: string
  /** Pure base64-encoded image data (no data-URL prefix) */
  base64: string
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  /** Full text content (may be built up incrementally during streaming) */
  content: string
  /** DOM elements attached as context for this message */
  contexts?: DomContext[]
  /** Images attached to this message */
  images?: ImageAttachment[]
  timestamp: number
  /** True while the assistant is still streaming a response */
  isStreaming?: boolean
}

// ─── WebSocket Protocol ───────────────────────────────────────────────────────

/** Messages sent from the browser Client → Node.js Server */
export type ClientMessage =
  | {
      type: 'send_message'
      messageId: string
      content: string
      /** DOM contexts the user attached to this message */
      contexts: DomContext[]
      /** Trimmed conversation history for multi-turn context */
      history: Array<{ role: ChatRole; content: string }>
      /** Images attached to this message */
      images?: ImageAttachment[]
    }
  | {
      type: 'abort'
      messageId: string
    }

/** Messages sent from the Node.js Server → browser Client */
export type ServerMessage =
  | { type: 'ready' }
  | { type: 'stream_start'; messageId: string }
  | { type: 'stream_chunk'; messageId: string; text: string }
  | { type: 'stream_end'; messageId: string }
  | { type: 'stream_error'; messageId: string; error: string }
