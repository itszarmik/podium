'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import { WSMessage, RankUpdatePayload, ScoreSubmittedPayload, ViewerCountPayload } from '@podium/shared'
import api from './api'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/api/v1/ws'

type MessageHandler = (msg: WSMessage) => void

class WebSocketManager {
  private ws: WebSocket | null = null
  private handlers = new Set<MessageHandler>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private shouldConnect = false
  private subscribedBoards = new Set<string>()

  connect(token?: string | null) {
    this.shouldConnect = true
    const url = token ? `${WS_URL}?token=${token}` : WS_URL
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('[WS] Connected')
      this.reconnectDelay = 1000
      // Re-subscribe to all boards after reconnect
      for (const boardId of this.subscribedBoards) {
        this.send({ type: 'subscribe', boardId, timestamp: new Date().toISOString() })
      }
      this.notify({ type: 'connected', timestamp: new Date().toISOString() } as WSMessage)
    }

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        if (msg.type === 'ping') {
          this.send({ type: 'pong', timestamp: new Date().toISOString() })
          return
        }
        this.notify(msg)
      } catch { /* bad JSON */ }
    }

    this.ws.onclose = () => {
      console.log('[WS] Disconnected')
      this.notify({ type: 'disconnected', timestamp: new Date().toISOString() } as unknown as WSMessage)
      if (this.shouldConnect) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30_000)
          this.connect(token)
        }, this.reconnectDelay)
      }
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  disconnect() {
    this.shouldConnect = false
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }

  send(msg: WSMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  subscribe(boardId: string) {
    this.subscribedBoards.add(boardId)
    this.send({ type: 'subscribe', boardId, timestamp: new Date().toISOString() })
  }

  unsubscribe(boardId: string) {
    this.subscribedBoards.delete(boardId)
    this.send({ type: 'unsubscribe', boardId, timestamp: new Date().toISOString() })
  }

  addHandler(handler: MessageHandler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  private notify(msg: WSMessage) {
    for (const handler of this.handlers) handler(msg)
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Singleton — one WS connection for the whole app
export const wsManager = new WebSocketManager()

// ─── React hooks ──────────────────────────────────────────────────────────────

export function useWebSocket() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const token = api.getToken()
    wsManager.connect(token)

    const remove = wsManager.addHandler((msg) => {
      if ((msg as unknown as { type: string }).type === 'connected') setConnected(true)
      if ((msg as unknown as { type: string }).type === 'disconnected') setConnected(false)
    })

    return () => {
      remove()
      wsManager.disconnect()
    }
  }, [])

  return { connected }
}

export function useBoardRealtime(
  boardId: string | null,
  onRankUpdate?: (payload: RankUpdatePayload) => void,
  onScoreSubmitted?: (payload: ScoreSubmittedPayload) => void,
  onViewerCount?: (payload: ViewerCountPayload) => void,
) {
  const handlersRef = useRef({ onRankUpdate, onScoreSubmitted, onViewerCount })
  handlersRef.current = { onRankUpdate, onScoreSubmitted, onViewerCount }

  useEffect(() => {
    if (!boardId) return

    wsManager.subscribe(boardId)

    const remove = wsManager.addHandler((msg) => {
      if (msg.boardId !== boardId) return
      const h = handlersRef.current
      if (msg.type === 'rank_update' && h.onRankUpdate) h.onRankUpdate(msg.payload as RankUpdatePayload)
      if (msg.type === 'score_submitted' && h.onScoreSubmitted) h.onScoreSubmitted(msg.payload as ScoreSubmittedPayload)
      if (msg.type === 'viewer_count' && h.onViewerCount) h.onViewerCount(msg.payload as ViewerCountPayload)
    })

    return () => {
      wsManager.unsubscribe(boardId)
      remove()
    }
  }, [boardId])
}

export function useGlobalFeed(onFeedEvent?: (msg: WSMessage) => void) {
  const handlerRef = useRef(onFeedEvent)
  handlerRef.current = onFeedEvent

  useEffect(() => {
    const remove = wsManager.addHandler((msg) => {
      if (msg.type === 'feed_event' && handlerRef.current) handlerRef.current(msg)
    })
    return remove
  }, [])
}
