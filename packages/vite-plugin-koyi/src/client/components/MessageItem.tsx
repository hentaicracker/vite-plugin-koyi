/**
 * MessageItem — renders a single chat message.
 *
 * Supports:
 *  - User messages with attached DOM context chips
 *  - Assistant messages rendered with react-markdown + syntax highlighting
 *  - Streaming indicator (blinking cursor)
 */
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { ChatMessage } from '../../shared/types'

interface MessageItemProps {
  message: ChatMessage
}

// ─── Markdown component overrides (Tokyo Night palette) ───────────────────────

const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  // ── Code blocks & inline code ──────────────────────────────────────────────
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? '')
    const isBlock = !!match
    const codeString = String(children).replace(/\n$/, '')

    if (isBlock) {
      return (
        <div
          style={{
            margin: '8px 0',
            borderRadius: 6,
            overflowX: 'auto',
            overflowY: 'hidden',
            fontSize: 12
          }}
        >
          <div
            style={{
              background: '#16161e',
              color: '#565f89',
              fontSize: 10,
              padding: '3px 10px',
              fontFamily: 'ui-monospace, monospace',
              borderBottom: '1px solid #292e42'
            }}
          >
            {match![1]}
          </div>
          <SyntaxHighlighter
            style={oneDark}
            language={match![1]}
            PreTag="div"
            customStyle={{
              margin: 0,
              borderRadius: 0,
              background: '#16161e',
              fontSize: 12,
              lineHeight: 1.6
            }}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      )
    }

    return (
      <code
        style={{
          background: '#292e42',
          color: '#7dcfff',
          borderRadius: 3,
          padding: '1px 5px',
          fontSize: '0.88em',
          fontFamily: 'ui-monospace, monospace'
        }}
        {...props}
      >
        {children}
      </code>
    )
  },

  // ── Headings ──────────────────────────────────────────────────────────────
  h1: ({ children }) => (
    <h1
      style={{
        color: '#c0caf5',
        fontSize: 16,
        fontWeight: 700,
        margin: '12px 0 6px',
        borderBottom: '1px solid #24283b',
        paddingBottom: 4
      }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      style={{
        color: '#c0caf5',
        fontSize: 14,
        fontWeight: 700,
        margin: '10px 0 5px'
      }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      style={{
        color: '#c0caf5',
        fontSize: 13,
        fontWeight: 600,
        margin: '8px 0 4px'
      }}
    >
      {children}
    </h3>
  ),

  // ── Paragraphs ─────────────────────────────────────────────────────────────
  p: ({ children }) => (
    <p
      style={{
        margin: '4px 0',
        lineHeight: 1.65,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}
    >
      {children}
    </p>
  ),

  // ── Lists ──────────────────────────────────────────────────────────────────
  ul: ({ children }) => (
    <ul style={{ margin: '4px 0', paddingLeft: 18, lineHeight: 1.7 }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: '4px 0', paddingLeft: 18, lineHeight: 1.7 }}>
      {children}
    </ol>
  ),
  li: ({ children }) => <li style={{ margin: '2px 0' }}>{children}</li>,

  // ── Blockquote ────────────────────────────────────────────────────────────
  blockquote: ({ children }) => (
    <blockquote
      style={{
        margin: '6px 0',
        paddingLeft: 10,
        borderLeft: '3px solid #414868',
        color: '#7982a9',
        fontStyle: 'italic'
      }}
    >
      {children}
    </blockquote>
  ),

  // ── Horizontal rule ───────────────────────────────────────────────────────
  hr: () => (
    <hr
      style={{
        border: 'none',
        borderTop: '1px solid #24283b',
        margin: '8px 0'
      }}
    />
  ),

  // ── Links ─────────────────────────────────────────────────────────────────
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        color: '#7aa2f7',
        textDecoration: 'underline',
        textUnderlineOffset: 2
      }}
    >
      {children}
    </a>
  ),

  // ── Inline emphasis ───────────────────────────────────────────────────────
  strong: ({ children }) => (
    <strong style={{ color: '#e0af68', fontWeight: 600 }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: '#9ece6a', fontStyle: 'italic' }}>{children}</em>
  ),

  // ── Table (GFM) ───────────────────────────────────────────────────────────
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '8px 0' }}>
      <table
        style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th
      style={{
        padding: '5px 10px',
        background: '#16161e',
        color: '#7aa2f7',
        borderBottom: '2px solid #414868',
        textAlign: 'left',
        fontWeight: 600
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      style={{
        padding: '4px 10px',
        borderBottom: '1px solid #24283b',
        color: '#c0caf5'
      }}
    >
      {children}
    </td>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12
      }}
    >
      {/* Role label */}
      <span
        style={{
          fontSize: 10,
          color: '#565f89',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          marginBottom: 2,
          padding: '0 2px'
        }}
      >
        {isUser ? 'You' : '⚡ Koyi'}
      </span>

      {/* Message bubble */}
      <div
        style={{
          maxWidth: '90%',
          minWidth: 0,
          padding: '9px 12px',
          borderRadius: isUser ? '12px 12px 3px 12px' : '3px 12px 12px 12px',
          background: isUser ? '#292e42' : '#1e2030',
          border: `1px solid ${isUser ? '#414868' : '#24283b'}`,
          color: '#c0caf5',
          fontSize: 13,
          lineHeight: 1.55,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          overflow: 'hidden',
          overflowX: 'auto'
        }}
      >
        {isUser ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Image thumbnails */}
            {message.images && message.images.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {message.images.map((img, i) => (
                  <img
                    key={i}
                    src={`data:${img.mimeType};base64,${img.base64}`}
                    alt={img.name}
                    title={img.name}
                    style={{
                      maxWidth: 160,
                      maxHeight: 120,
                      borderRadius: 5,
                      objectFit: 'cover',
                      border: '1px solid #414868'
                    }}
                  />
                ))}
              </div>
            )}
            {message.content && (
              <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {message.content}
              </span>
            )}
          </div>
        ) : (
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={mdComponents}
            >
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && (
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 14,
                  background: '#7aa2f7',
                  borderRadius: 1,
                  marginLeft: 2,
                  animation: 'koyi-blink 1s step-end infinite',
                  verticalAlign: 'text-bottom'
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Attached DOM context chips (user messages only) */}
      {isUser && message.contexts && message.contexts.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 4,
            flexWrap: 'wrap',
            justifyContent: 'flex-end'
          }}
        >
          {message.contexts.map((ctx, i) => {
            const label = ctx.filePath
              ? `${ctx.filePath.split('/').pop()}:${ctx.line}`
              : `<${ctx.tagName}>`
            return (
              <span
                key={i}
                title={`${ctx.filePath}:${ctx.line}:${ctx.column}`}
                style={{
                  fontSize: 10,
                  color: '#7aa2f7',
                  background: 'rgba(122,162,247,0.1)',
                  border: '1px solid rgba(122,162,247,0.3)',
                  borderRadius: 3,
                  padding: '1px 6px',
                  fontFamily: 'ui-monospace, monospace'
                }}
              >
                📍 {label}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
