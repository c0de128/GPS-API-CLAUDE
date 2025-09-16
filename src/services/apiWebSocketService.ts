import type {
  WebSocketMessage,
  WebSocketMessageType,
  GpsLocationUpdate,
  TripProgressUpdate
} from '../types/api'

interface WebSocketServiceConfig {
  url: string
  apiKey: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

type MessageHandler = (message: WebSocketMessage) => void
type ConnectionHandler = (connected: boolean) => void
type ErrorHandler = (error: Event) => void

export class ApiWebSocketService {
  private ws: WebSocket | null = null
  private config: WebSocketServiceConfig
  private reconnectAttempts = 0
  private reconnectTimer: number | null = null
  private isConnected = false
  private subscriptions = new Set<string>()

  private messageHandlers = new Map<WebSocketMessageType, MessageHandler[]>()
  private connectionHandlers: ConnectionHandler[] = []
  private errorHandlers: ErrorHandler[] = []

  constructor(config: WebSocketServiceConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      ...config
    }
  }

  // Connect to WebSocket server
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url)

        this.ws.onopen = () => {
          console.log('🔌 Connected to GPS API WebSocket')
          this.isConnected = true
          this.reconnectAttempts = 0

          // Authenticate
          this.send({
            type: 'auth',
            data: { apiKey: this.config.apiKey },
            timestamp: new Date().toISOString()
          })

          this.notifyConnectionHandlers(true)
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log(`❌ WebSocket disconnected: ${event.code} ${event.reason}`)
          this.isConnected = false
          this.notifyConnectionHandlers(false)

          // Attempt to reconnect
          this.attemptReconnect()
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.notifyErrorHandlers(error)
          reject(error)
        }

      } catch (error) {
        reject(error)
      }
    })
  }

  // Disconnect from WebSocket server
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.isConnected = false
    this.notifyConnectionHandlers(false)
  }

  // Send message to server
  private send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  // Subscribe to specific channels
  subscribe(channels: string[]) {
    channels.forEach(channel => this.subscriptions.add(channel))

    if (this.isConnected) {
      this.send({
        type: 'subscribe',
        data: { channels },
        timestamp: new Date().toISOString()
      })
    }
  }

  // Unsubscribe from channels
  unsubscribe(channels: string[]) {
    channels.forEach(channel => this.subscriptions.delete(channel))

    if (this.isConnected) {
      this.send({
        type: 'unsubscribe',
        data: { channels },
        timestamp: new Date().toISOString()
      })
    }
  }

  // Send GPS location update
  sendGpsLocation(location: GpsLocationUpdate) {
    this.send({
      type: 'gps:location',
      data: location,
      timestamp: new Date().toISOString()
    })
  }

  // Send trip progress update
  sendTripProgress(tripUpdate: TripProgressUpdate) {
    this.send({
      type: 'trip:progress',
      data: tripUpdate,
      timestamp: new Date().toISOString()
    })
  }

  // Event handlers
  on(type: WebSocketMessageType, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, [])
    }
    this.messageHandlers.get(type)!.push(handler)
  }

  off(type: WebSocketMessageType, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  onConnection(handler: ConnectionHandler) {
    this.connectionHandlers.push(handler)
  }

  onError(handler: ErrorHandler) {
    this.errorHandlers.push(handler)
  }

  // Handle incoming messages
  private handleMessage(message: WebSocketMessage) {
    const handlers = this.messageHandlers.get(message.type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message)
        } catch (error) {
          console.error(`Error in message handler for ${message.type}:`, error)
        }
      })
    }

    // Handle specific message types
    switch (message.type) {
      case 'auth:success':
        console.log('✅ WebSocket authenticated successfully')
        // Re-subscribe to channels after authentication
        if (this.subscriptions.size > 0) {
          this.subscribe(Array.from(this.subscriptions))
        }
        break

      case 'auth:required':
        console.error('❌ WebSocket authentication required')
        break

      case 'error':
        console.error('❌ WebSocket server error:', message.data)
        break

      case 'pong':
        // Handle ping/pong for connection health
        break
    }
  }

  // Notify connection handlers
  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected)
      } catch (error) {
        console.error('Error in connection handler:', error)
      }
    })
  }

  // Notify error handlers
  private notifyErrorHandlers(error: Event) {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error)
      } catch (error) {
        console.error('Error in error handler:', error)
      }
    })
  }

  // Attempt to reconnect
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      console.error('❌ Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`)

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error)
      })
    }, this.config.reconnectInterval!) as unknown as number
  }

  // Send periodic ping to maintain connection
  startHeartbeat(interval = 30000) {
    setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'ping',
          data: { timestamp: Date.now() },
          timestamp: new Date().toISOString()
        })
      }
    }, interval)
  }

  // Get connection status
  get connected(): boolean {
    return this.isConnected
  }

  // Get subscribed channels
  get channels(): string[] {
    return Array.from(this.subscriptions)
  }
}

// Singleton service instance
let apiWebSocketService: ApiWebSocketService | null = null

export function createApiWebSocketService(config: WebSocketServiceConfig): ApiWebSocketService {
  if (apiWebSocketService) {
    apiWebSocketService.disconnect()
  }

  apiWebSocketService = new ApiWebSocketService(config)
  return apiWebSocketService
}

export function getApiWebSocketService(): ApiWebSocketService | null {
  return apiWebSocketService
}