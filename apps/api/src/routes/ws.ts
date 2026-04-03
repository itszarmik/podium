import { FastifyInstance } from 'fastify'
import { realtimeManager } from '../realtime/manager'

export async function wsRoutes(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, (socket, req) => {
    // Try to extract userId from JWT query param (WS can't easily set headers)
    let userId: string | undefined
    try {
      const token = (req.query as Record<string, string>).token
      if (token) {
        const decoded = app.jwt.verify(token) as { userId: string }
        userId = decoded.userId
      }
    } catch { /* anonymous connection */ }

    const conn = realtimeManager.registerConnection(socket, userId)

    // Send welcome message
    socket.send(JSON.stringify({
      type: 'connected',
      payload: { connectionId: conn.id },
      timestamp: new Date().toISOString(),
    }))
  })
}
