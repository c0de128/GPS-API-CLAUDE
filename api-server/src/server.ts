import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { app, config } from '@/app.js'
import { authService } from '@/services/authService.js'
import type { WebSocketMessage, WebSocketMessageType } from '@/types/api.js'
import { WebSocket } from 'ws'

// Create HTTP server
const server = createServer(app)

// WebSocket server for real-time communication
const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: 1024 * 1024 // 1MB max payload
})

// WebSocket client management
interface AuthenticatedWebSocket extends WebSocket {
  apiKey?: string
  subscriptions?: Set<string>
  lastPing?: number
}

const clients = new Map<string, AuthenticatedWebSocket>()

// Broadcast message to subscribed clients
function broadcast(message: WebSocketMessage, channel?: string) {
  const messageStr = JSON.stringify(message)

  for (const [apiKey, client] of clients) {
    if (client.readyState === WebSocket.OPEN) {
      // Check if client is subscribed to this channel
      if (channel && client.subscriptions && !client.subscriptions.has(channel)) {
        continue
      }

      try {
        client.send(messageStr)
      } catch (error) {
        console.error(`Failed to send message to client ${apiKey}:`, error)
        // Remove failed client
        clients.delete(apiKey)
      }
    } else {
      // Remove disconnected client
      clients.delete(apiKey)
    }
  }
}

// Handle WebSocket connections
wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
  console.log(`🔌 New WebSocket connection from ${req.socket.remoteAddress}`)

  // Set up ping/pong for connection health
  ws.lastPing = Date.now()

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as any

      // Handle authentication
      if (message.type === 'auth') {
        const { apiKey } = message.data

        if (!apiKey) {
          ws.send(JSON.stringify({
            type: 'auth:required',
            data: { error: 'API key required' },
            timestamp: new Date().toISOString()
          }))
          return
        }

        const authResult = authService.validateApiKey(apiKey)

        if (!authResult.valid) {
          ws.send(JSON.stringify({
            type: 'error',
            data: { error: authResult.error || 'Invalid API key' },
            timestamp: new Date().toISOString()
          }))
          ws.close(1008, 'Invalid API key')
          return
        }

        // Store authenticated client
        ws.apiKey = apiKey
        ws.subscriptions = new Set()
        clients.set(apiKey, ws)

        // Send authentication success
        ws.send(JSON.stringify({
          type: 'auth:success',
          data: {
            message: 'Authenticated successfully',
            keyInfo: authResult.keyInfo
          },
          timestamp: new Date().toISOString()
        }))

        console.log(`✅ WebSocket client authenticated: ${authResult.keyInfo?.name}`)
        return
      }

      // Require authentication for other messages
      if (!ws.apiKey) {
        ws.send(JSON.stringify({
          type: 'auth:required',
          data: { error: 'Authentication required' },
          timestamp: new Date().toISOString()
        }))
        return
      }

      // Handle subscription management
      if (message.type === 'subscribe') {
        const { channels } = message.data
        if (Array.isArray(channels)) {
          channels.forEach(channel => ws.subscriptions?.add(channel))
          ws.send(JSON.stringify({
            type: 'subscription:success',
            data: { channels: Array.from(ws.subscriptions || []) },
            timestamp: new Date().toISOString()
          }))
        }
        return
      }

      if (message.type === 'unsubscribe') {
        const { channels } = message.data
        if (Array.isArray(channels)) {
          channels.forEach(channel => ws.subscriptions?.delete(channel))
          ws.send(JSON.stringify({
            type: 'subscription:success',
            data: { channels: Array.from(ws.subscriptions || []) },
            timestamp: new Date().toISOString()
          }))
        }
        return
      }

      // Handle ping/pong
      if (message.type === 'ping') {
        ws.lastPing = Date.now()
        ws.send(JSON.stringify({
          type: 'pong',
          data: { timestamp: ws.lastPing },
          timestamp: new Date().toISOString()
        }))
        return
      }

    } catch (error) {
      console.error('WebSocket message parsing error:', error)
      ws.send(JSON.stringify({
        type: 'error',
        data: { error: 'Invalid message format' },
        timestamp: new Date().toISOString()
      }))
    }
  })

  ws.on('close', (code, reason) => {
    console.log(`❌ WebSocket disconnected: ${code} ${reason}`)
    if (ws.apiKey) {
      clients.delete(ws.apiKey)
    }
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
    if (ws.apiKey) {
      clients.delete(ws.apiKey)
    }
  })

  // Send connection established message
  ws.send(JSON.stringify({
    type: 'connection:established',
    data: {
      message: 'WebSocket connection established',
      timestamp: Date.now()
    },
    timestamp: new Date().toISOString()
  }))
})

// Heartbeat to check client connections
setInterval(() => {
  const now = Date.now()
  const timeout = config.websocket.heartbeatInterval * 2 // 2x heartbeat interval

  for (const [apiKey, client] of clients) {
    if (client.lastPing && (now - client.lastPing) > timeout) {
      console.log(`💔 Client ${apiKey} timed out, removing connection`)
      client.terminate()
      clients.delete(apiKey)
    }
  }
}, config.websocket.heartbeatInterval)

// Export broadcast function for use in other modules
export { broadcast }

// Start server
server.listen(config.port, config.host, () => {
  console.log(`🚀 GPS Tracking API Server running on http://${config.host}:${config.port}`)
  console.log(`📡 WebSocket server running on ws://${config.host}:${config.port}/ws`)
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`📋 API Documentation: http://${config.host}:${config.port}/api`)
  console.log(`💓 Health Check: http://${config.host}:${config.port}/health`)

  // Log available API keys for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n🔑 Available API endpoints:')
    console.log(`   GPS: http://${config.host}:${config.port}/api/v1/gps/*`)
    console.log(`   Trips: http://${config.host}:${config.port}/api/v1/trips/*`)
    console.log(`   Stats: http://${config.host}:${config.port}/api/v1/stats/*`)
    console.log(`   Admin: http://${config.host}:${config.port}/api/v1/admin/* (requires admin permissions)`)
  }
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})