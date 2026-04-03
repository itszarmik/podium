import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { WSMessage, RankUpdatePayload, ScoreSubmittedPayload, ViewerCountPayload } from '@podium/shared'
import api from './api'

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001/api/v1/ws'

type MessageHandler = (msg: WSMessage) => void

class MobileWSManager {
  private ws: WebSocket | null = null
  private handlers = new Set<MessageHandler>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private shouldConnect = false
  private subscribedBoards = new Set<string>()
  private token: string | null = null

  async connect() {
    this.shouldConnect = true
    this.token = await api.getToken()
    const url = this.token ? `${WS_URL}?token=${this.token}` : WS_URL
    this._connect(url)
  }

  private _connect(url: string) {
    try {
      this.ws = new WebSocket(url)
    } catch {
      this._scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.reconnectDelay = 1000
      for (const boardId of this.subscribedBoards) {
        this.send({ type: 'subscribe', boardId, timestamp: new Date().toISOString() })
      }
      this.notify({ type: 'connected' as WSMessage['type'], timestamp: new Date().toISOString() })
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
      this.notify({ type: 'disconnected' as WSMessage['type'], timestamp: new Date().toISOString() })
      if (this.shouldConnect) this._scheduleReconnect()
    }

    this.ws.onerror = () => this.ws?.close()
  }

  private _scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30_000)
      if (this.token) this._connect(`${WS_URL}?token=${this.token}`)
    }, this.reconnectDelay)
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
    for (const h of this.handlers) h(msg)
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const wsManager = new MobileWSManager()

// ─── App state handler — disconnect when backgrounded, reconnect on foreground ─
AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'active') wsManager.connect()
  else wsManager.disconnect()
})

// ─── React hook for board real-time subscription ──────────────────────────────
export function useBoardRealtime(
  boardId: string | null,
  handlers: {
    onRankUpdate?:      (p: RankUpdatePayload) => void
    onScoreSubmitted?:  (p: ScoreSubmittedPayload) => void
    onViewerCount?:     (p: ViewerCountPayload) => void
  }
) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!boardId) return
    wsManager.subscribe(boardId)

    const remove = wsManager.addHandler((msg) => {
      if (msg.boardId !== boardId) return
      const h = handlersRef.current
      if (msg.type === 'rank_update'     && h.onRankUpdate)     h.onRankUpdate(msg.payload as RankUpdatePayload)
      if (msg.type === 'score_submitted' && h.onScoreSubmitted) h.onScoreSubmitted(msg.payload as ScoreSubmittedPayload)
      if (msg.type === 'viewer_count'    && h.onViewerCount)    h.onViewerCount(msg.payload as ViewerCountPayload)
    })

    return () => {
      wsManager.unsubscribe(boardId)
      remove()
    }
  }, [boardId])
}
