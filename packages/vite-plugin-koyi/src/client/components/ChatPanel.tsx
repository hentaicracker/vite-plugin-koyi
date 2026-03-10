/**
 * ChatPanel — the main AI chat interface.
 *
 * Features:
 *  - Message history with streaming support
 *  - Attached DOM context chips
 *  - DOM element picker toggle
 *  - Auto-scroll to latest message
 *  - Session persistence via sessionStorage
 */
import React, { useState, useRef, useEffect, useCallback, useId } from 'react'
import type {
  ChatMessage,
  DomContext,
  ServerMessage,
  ClientMessage,
  ImageAttachment
} from '../../shared/types'
import { MessageItem } from './MessageItem'
import { ContextTag } from './ContextTag'
import { useWebSocket } from '../hooks/useWebSocket'

interface ChatPanelProps {
  wsPath: string
  onPickerToggle: (active: boolean) => void
  pickerActive: boolean
  pendingContext: { ctx: DomContext; append: boolean } | null
  onContextConsumed: () => void
  locatorActive: boolean
  onLocatorToggle: (active: boolean) => void
}

const SESSION_KEY = '__koyi_messages'
const MAX_HISTORY = 20

function loadMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as ChatMessage[]) : []
  } catch {
    return []
  }
}

function saveMessages(msgs: ChatMessage[]): void {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify(msgs.slice(-MAX_HISTORY))
    )
  } catch {
    // ignore quota errors
  }
}

export function ChatPanel({
  wsPath,
  onPickerToggle,
  pickerActive,
  pendingContext,
  onContextConsumed,
  locatorActive,
  onLocatorToggle
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages)
  const [inputText, setInputText] = useState('')
  const [contexts, setContexts] = useState<DomContext[]>([])
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [images, setImages] = useState<ImageAttachment[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamingIdRef = useRef<string | null>(null)
  const uid = useId()

  // Keep streaming ref in sync
  useEffect(() => {
    streamingIdRef.current = streamingId
  }, [streamingId])

  // Persist messages to sessionStorage on change
  useEffect(() => {
    saveMessages(messages)
  }, [messages])

  // Accept pending DOM context from inspector
  useEffect(() => {
    if (pendingContext) {
      const { ctx, append } = pendingContext
      setContexts((prev) => {
        const key = `${ctx.filePath}:${ctx.line}:${ctx.column}`
        if (append) {
          // Ctrl+Shift multi-select: deduplicate and add
          if (prev.some((c) => `${c.filePath}:${c.line}:${c.column}` === key))
            return prev
          return [...prev, ctx]
        } else {
          // Normal click: replace all previous contexts with the new one
          return [ctx]
        }
      })
      onContextConsumed()
      textareaRef.current?.focus()
    }
  }, [pendingContext, onContextConsumed])

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // ── WebSocket message handler ────────────────────────────────────────────
  const handleWsMessage = useCallback((msg: ServerMessage) => {
    if (msg.type === 'stream_start') {
      setStreamingId(msg.messageId)
    } else if (msg.type === 'stream_chunk') {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.messageId ? { ...m, content: m.content + msg.text } : m
        )
      )
    } else if (msg.type === 'stream_end') {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.messageId ? { ...m, isStreaming: false } : m
        )
      )
      setStreamingId(null)
    } else if (msg.type === 'stream_error') {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.messageId
            ? { ...m, content: `❌ Error: ${msg.error}`, isStreaming: false }
            : m
        )
      )
      setStreamingId(null)
    }
  }, [])

  const { status, send } = useWebSocket(wsPath, handleWsMessage)

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (!files.length) return
      Promise.all(
        files.map(
          (file) =>
            new Promise<ImageAttachment>((resolve) => {
              const reader = new FileReader()
              reader.onload = () => {
                const dataUrl = reader.result as string
                resolve({
                  name: file.name,
                  mimeType: file.type || 'image/png',
                  base64: dataUrl.split(',')[1]
                })
              }
              reader.readAsDataURL(file)
            })
        )
      ).then((next) => setImages((prev) => [...prev, ...next]))
      e.target.value = '' // allow re-selecting same file
    },
    []
  )

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    const content = inputText.trim()
    if (!content || streamingId) return

    const messageId = `${uid}-${Date.now()}`

    const userMsg: ChatMessage = {
      id: `${messageId}-user`,
      role: 'user',
      content,
      contexts: contexts.length > 0 ? [...contexts] : undefined,
      images: images.length > 0 ? [...images] : undefined,
      timestamp: Date.now()
    }

    const assistantMsg: ChatMessage = {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInputText('')
    setContexts([])
    setImages([])

    const history = messages
      .filter((m) => !m.isStreaming)
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content }))

    const wsMsg: ClientMessage = {
      type: 'send_message',
      messageId,
      content,
      contexts: userMsg.contexts ?? [],
      images: userMsg.images,
      history
    }

    send(wsMsg)
  }, [inputText, contexts, images, messages, streamingId, send, uid])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const removeContext = useCallback((ctx: DomContext) => {
    setContexts((prev) =>
      prev.filter(
        (c) =>
          !(
            c.filePath === ctx.filePath &&
            c.line === ctx.line &&
            c.column === ctx.column
          )
      )
    )
  }, [])

  const removeImage = useCallback((name: string) => {
    setImages((prev) => prev.filter((img) => img.name !== name))
  }, [])

  const handleStop = useCallback(() => {
    if (!streamingId) return
    send({ type: 'abort', messageId: streamingId })
    setMessages((prev) =>
      prev.map((m) => (m.id === streamingId ? { ...m, isStreaming: false } : m))
    )
    setStreamingId(null)
  }, [streamingId, send])

  const clearHistory = () => {
    setMessages([])
    sessionStorage.removeItem(SESSION_KEY)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const statusColor =
    status === 'connected'
      ? '#9ece6a'
      : status === 'connecting'
        ? '#e0af68'
        : '#f7768e'
  const isDisabled = status !== 'connected' || !!streamingId

  return (
    <div
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#1a1b26',
        overflow: 'hidden',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif'
      }}
    >
      {/* ── Sub-header: connection status + clear ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 12px',
          background: '#16161e',
          borderBottom: '1px solid #24283b',
          fontSize: 11,
          color: '#565f89'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: statusColor,
              display: 'inline-block'
            }}
          />
          {status}
        </span>
        <button
          onClick={clearHistory}
          title="Clear conversation"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#414868',
            fontSize: 11,
            padding: '2px 4px'
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color = '#c0caf5')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color = '#414868')
          }
        >
          clear
        </button>
      </div>

      {/* ── Messages area ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 12px 4px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#414868 transparent'
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#414868',
              fontSize: 12,
              marginTop: 40,
              lineHeight: 1.8
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
            <strong style={{ color: '#565f89' }}>Koyi AI</strong>
            <br />
            Click <strong style={{ color: '#7aa2f7' }}>
              🎯 Pick Element
            </strong>{' '}
            to select
            <br />a DOM element as context, then ask away.
          </div>
        )}
        {messages.map((msg) => (
          <MessageItem key={msg.id + msg.role} message={msg} />
        ))}
      </div>

      {/* ── Context + image attachment chips ── */}
      {(contexts.length > 0 || images.length > 0) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 5,
            padding: '6px 10px',
            borderTop: '1px solid #24283b',
            background: '#16161e'
          }}
        >
          {contexts.map((ctx, i) => (
            <ContextTag key={i} ctx={ctx} onRemove={removeContext} />
          ))}
          {images.map((img) => (
            <span
              key={img.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                color: '#bb9af7',
                background: 'rgba(187,154,247,0.1)',
                border: '1px solid rgba(187,154,247,0.3)',
                borderRadius: 3,
                padding: '1px 4px 1px 2px',
                fontFamily: 'ui-monospace, monospace',
                maxWidth: 160,
                overflow: 'hidden'
              }}
            >
              <img
                src={`data:${img.mimeType};base64,${img.base64}`}
                alt={img.name}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 2,
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {img.name}
              </span>
              <button
                onClick={() => removeImage(img.name)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#565f89',
                  padding: 0,
                  lineHeight: 1,
                  flexShrink: 0
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Input area ── */}
      <div
        style={{
          borderTop: '1px solid #24283b',
          background: '#16161e',
          padding: '8px 10px'
        }}
      >
        {/* Toolbar row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6
          }}
        >
          <button
            onClick={() => onPickerToggle(!pickerActive)}
            title={
              pickerActive
                ? 'Cancel element selection (Esc)'
                : 'Pick a DOM element as context'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 9px',
              borderRadius: 5,
              border: `1px solid ${pickerActive ? '#7aa2f7' : '#414868'}`,
              background: pickerActive
                ? 'rgba(122,162,247,0.15)'
                : 'transparent',
              color: pickerActive ? '#7aa2f7' : '#565f89',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit'
            }}
          >
            🎯 {pickerActive ? 'Picking…' : 'Pick Element'}
          </button>

          {/* Locate to code button */}
          <button
            onClick={() => onLocatorToggle(!locatorActive)}
            title={
              locatorActive
                ? '取消定位 (Esc)'
                : '悬停高亮元素，点击跳转到 VS Code 对应源码'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 9px',
              borderRadius: 5,
              border: `1px solid ${locatorActive ? '#e0af68' : '#414868'}`,
              background: locatorActive
                ? 'rgba(224,175,104,0.15)'
                : 'transparent',
              color: locatorActive ? '#e0af68' : '#565f89',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit'
            }}
          >
            📍 {locatorActive ? '定位中…' : '定位到代码'}
          </button>

          {/* Image upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            title="Attach image(s)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 9px',
              borderRadius: 5,
              border: '1px solid #414868',
              background: 'transparent',
              color: '#565f89',
              fontSize: 11,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.borderColor = '#bb9af7'
                e.currentTarget.style.color = '#bb9af7'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#414868'
              e.currentTarget.style.color = '#565f89'
            }}
          >
            🖼️ 图片
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <span style={{ color: '#414868', fontSize: 10, marginLeft: 'auto' }}>
            Shift+Enter = newline
          </span>
        </div>

        {/* Textarea + Send */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            placeholder={
              status !== 'connected'
                ? 'Connecting to Koyi server…'
                : streamingId
                  ? 'Generating…'
                  : 'Ask Koyi something… (Enter to send)'
            }
            rows={2}
            style={{
              flex: 1,
              resize: 'none',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #414868',
              background: '#1e2030',
              color: '#c0caf5',
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
              lineHeight: 1.5,
              transition: 'border-color 0.15s'
            }}
            onFocus={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor = '#7aa2f7')
            }
            onBlur={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor = '#414868')
            }
          />
          <button
            onClick={streamingId ? handleStop : sendMessage}
            disabled={
              !streamingId && (status !== 'connected' || !inputText.trim())
            }
            title={streamingId ? 'Stop generation' : 'Send (Enter)'}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: 'none',
              background: streamingId
                ? '#f7768e'
                : status !== 'connected' || !inputText.trim()
                  ? '#292e42'
                  : '#7aa2f7',
              color: streamingId
                ? '#1a1b26'
                : status !== 'connected' || !inputText.trim()
                  ? '#414868'
                  : '#1a1b26',
              fontSize: streamingId ? 11 : 13,
              fontWeight: 600,
              cursor:
                !streamingId && (status !== 'connected' || !inputText.trim())
                  ? 'not-allowed'
                  : 'pointer',
              transition: 'all 0.15s',
              alignSelf: 'stretch',
              minWidth: 52
            }}
          >
            {streamingId ? '■' : '↑'}
          </button>
        </div>
      </div>
    </div>
  )
}
