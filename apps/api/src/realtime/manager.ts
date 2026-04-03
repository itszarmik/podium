import { WebSocket } from '@fastify/websocket'
import { redisSub, pubsub, viewers } from '../redis/client'
import { WSMessage, WSMessageType } from '@podium/shared'
import { randomUUID } from 'crypto'

interface Connection {
  id: string
  ws: WebSocket
  userId?: string
  subscribedBoards: Set<string>
}

class RealtimeManager {
  private connections = new Map<string, Connection>()
  private boardConnections = new Map<string, Set<string>>() // boardId -> Set<connId>
  private initialized = false

  async initialize() {
    if (this.initialized) return
    this.initialized = true

    // Listen to all Redis pub/sub messages globally
    redisSub.on('message', (channel, message) => {
      const boardId = channel.replace('board:', '')
      this.broadcastToBoard(boardId, message)
    })

    console.log('✅ Realtime manager initialized')
  }

  registerConnection(ws: WebSocket, userId?: string): Connection {
    const conn: Connection = {
      id: randomUUID(),
      ws,
      userId,
      subscribedBoards: new Set(),
    }
    this.connections.set(conn.id, conn)

    ws.on('close', () => this.removeConnection(conn.id))
    ws.on('error', () => this.removeConnection(conn.id))
    ws.on('message', (raw) => this.handleMessage(conn.id, raw.toString()))

    // Send ping every 30s to keep alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        this.send(conn.id, { type: 'ping', timestamp: new Date().toISOString() })
      } else {
        clearInterval(pingInterval)
      }
    }, 30_000)

    return conn
  }

  private async removeConnection(connId: string) {
    const conn = this.connections.get(connId)
    if (!conn) return

    // Unsubscribe from all boards
    for (const boardId of conn.subscribedBoards) {
      await this.unsubscribeFromBoard(connId, boardId)
    }

    this.connections.delete(connId)
  }

  private async handleMessage(connId: string, raw: string) {
    try {
      const msg: WSMessage = JSON.parse(raw)
      const conn = this.connections.get(connId)
      if (!conn) return

      switch (msg.type) {
        case 'subscribe':
          if (msg.boardId) await this.subscribeToBoard(connId, msg.boardId)
          break
        case 'unsubscribe':
          if (msg.boardId) await this.unsubscribeFromBoard(connId, msg.boardId)
          break
        case 'pong':
          // Connection is alive, nothing to do
          break
      }
    } catch {
      // Invalid JSON — ignore
    }
  }

  private async subscribeToBoard(connId: string, boardId: string) {
    const conn = this.connections.get(connId)
    if (!conn) return

    conn.subscribedBoards.add(boardId)

    if (!this.boardConnections.has(boardId)) {
      this.boardConnections.set(boardId, new Set())
      // Subscribe Redis channel only on first connection to this board
      await redisSub.subscribe(`board:${boardId}`)
    }
    this.boardConnections.get(boardId)!.add(connId)

    // Track viewer count
    if (conn.userId) {
      await viewers.add(boardId, connId)
      const count = await viewers.count(boardId)
      // Broadcast updated viewer count to all watchers
      await pubsub.publish(boardId, {
        type: 'viewer_count',
        boardId,
        payload: { boardId, count },
        timestamp: new Date().toISOString(),
      })
    }
  }

  private async unsubscribeFromBoard(connId: string, boardId: string) {
    const conn = this.connections.get(connId)
    if (conn) conn.subscribedBoards.delete(boardId)

    const boardConns = this.boardConnections.get(boardId)
    if (boardConns) {
      boardConns.delete(connId)
      if (boardConns.size === 0) {
        this.boardConnections.delete(boardId)
        await redisSub.unsubscribe(`board:${boardId}`)
      }
    }

    await viewers.remove(boardId, connId)
  }

  private broadcastToBoard(boardId: string, message: string) {
    const boardConns = this.boardConnections.get(boardId)
    if (!boardConns) return

    for (const connId of boardConns) {
      const conn = this.connections.get(connId)
      if (conn && conn.ws.readyState === conn.ws.OPEN) {
        conn.ws.send(message)
      }
    }
  }

  send(connId: string, message: object) {
    const conn = this.connections.get(connId)
    if (conn && conn.ws.readyState === conn.ws.OPEN) {
      conn.ws.send(JSON.stringify(message))
    }
  }

  get connectionCount() {
    return this.connections.size
  }
}

// Singleton
export const realtimeManager = new RealtimeManager()
