/**
 * useWebSocket — manages the connection to the Koyi WebSocket server.
 *
 * Handles:
 *  - Auto-connect on mount
 *  - Reconnect with exponential back-off on unexpected close
 *  - Typed message send/receive
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import type { ClientMessage, ServerMessage } from '../../shared/types'

type MessageHandler = (msg: ServerMessage) => void

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketReturn {
  status: WsStatus
  send: (msg: ClientMessage) => void
}

const RECONNECT_BASE_DELAY = 1500
const MAX_RECONNECT_ATTEMPTS = 10

export function useWebSocket(
  wsPath: string,
  onMessage: MessageHandler
): UseWebSocketReturn {
  const [status, setStatus] = useState<WsStatus>('connecting')
  const wsRef = useRef<WebSocket | null>(null)
  const attemptRef = useRef(0)
  const onMessageRef = useRef(onMessage)
  const unmountedRef = useRef(false)

  // Keep handler ref fresh without re-running effect
  useEffect(() => {
    onMessageRef.current = onMessage
  })

  const connect = useCallback(() => {
    if (unmountedRef.current) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}${wsPath}`
    setStatus('connecting')

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.addEventListener('open', () => {
      if (unmountedRef.current) {
        ws.close()
        return
      }
      attemptRef.current = 0
      setStatus('connected')
    })

    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data) as ServerMessage
        onMessageRef.current(msg)
      } catch {
        // ignore malformed messages
      }
    })

    ws.addEventListener('close', () => {
      if (unmountedRef.current) return
      setStatus('disconnected')
      const attempt = ++attemptRef.current
      if (attempt <= MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          RECONNECT_BASE_DELAY * 2 ** (attempt - 1),
          30_000
        )
        setTimeout(connect, delay)
      } else {
        setStatus('error')
      }
    })

    ws.addEventListener('error', () => {
      setStatus('error')
    })
  }, [wsPath])

  useEffect(() => {
    unmountedRef.current = false
    connect()
    return () => {
      unmountedRef.current = true
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { status, send }
}
