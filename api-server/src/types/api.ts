// API-specific types for the GPS Tracker API server

// Base response structure
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
  requestId?: string
}

// API Key information
export interface ApiKey {
  id: string
  key: string
  name: string
  permissions: ApiPermission[]
  createdAt: string
  lastUsed?: string
  isActive: boolean
  rateLimit: number // requests per minute
  origins: string[] // allowed CORS origins
}

export type ApiPermission = 'gps:read' | 'trips:read' | 'trips:write' | 'stats:read' | 'admin'

// WebSocket message types
export interface WebSocketMessage {
  type: WebSocketMessageType
  data: any
  timestamp: string
  channel?: string
}

export type WebSocketMessageType =
  | 'gps:location'
  | 'trip:progress'
  | 'trip:status'
  | 'system:health'
  | 'auth:required'
  | 'error'

// GPS API types
export interface GpsLocationUpdate {
  latitude: number
  longitude: number
  accuracy: number
  speed: number
  heading?: number
  altitude?: number
  timestamp: number
  tripId?: string
}

export interface GpsStatus {
  isTracking: boolean
  permission: 'granted' | 'denied' | 'prompt' | 'unknown'
  lastUpdate?: number
  accuracy?: number
  error?: string
}

// Trip API types
export interface TripProgressUpdate {
  tripId: string
  status: 'planning' | 'active' | 'paused' | 'completed'
  name: string
  distance: number
  duration: number
  averageSpeed: number
  maxSpeed: number
  currentLocation?: GpsLocationUpdate
  routePointsCount: number
  waypointsCount: number
  startTime: number
  lastUpdate: number
}

export interface TripSummary {
  id: string
  name: string
  status: 'planning' | 'active' | 'paused' | 'completed'
  startTime: number
  endTime?: number
  distance: number
  duration: number
  averageSpeed: number
  maxSpeed: number
  routePointsCount: number
}

export interface TripRoute {
  tripId: string
  points: Array<{
    latitude: number
    longitude: number
    timestamp: number
    speed?: number
    accuracy?: number
  }>
  totalPoints: number
}

// Statistics API types
export interface RealTimeStats {
  activeTrips: number
  totalTripsToday: number
  totalDistanceToday: number
  activeUsers: number
  systemHealth: 'healthy' | 'warning' | 'error'
  uptime: number
  lastUpdate: number
}

export interface TripStatsSummary {
  totalTrips: number
  totalDistance: number
  totalDuration: number
  averageSpeed: number
  maxSpeed: number
  longestTrip: number
  shortestTrip: number
  tripsThisWeek: number
  tripsThisMonth: number
}

// Request/Response interfaces
export interface CreateWebhookRequest {
  url: string
  events: WebSocketMessageType[]
  secret?: string
}

export interface WebhookInfo {
  id: string
  url: string
  events: WebSocketMessageType[]
  isActive: boolean
  createdAt: string
  lastTriggered?: string
  failureCount: number
}

// Rate limiting
export interface RateLimitInfo {
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

// Authentication
export interface AuthRequest {
  apiKey: string
}

export interface AuthResponse {
  valid: boolean
  keyInfo?: {
    name: string
    permissions: ApiPermission[]
    rateLimit: number
  }
  error?: string
}

// Server configuration
export interface ServerConfig {
  port: number
  host: string
  cors: {
    origins: string[]
    credentials: boolean
  }
  rateLimit: {
    windowMs: number
    max: number
  }
  websocket: {
    maxConnections: number
    heartbeatInterval: number
  }
  api: {
    version: string
    basePath: string
  }
}

// Error types
export interface ApiError {
  code: string
  message: string
  details?: any
  statusCode: number
}

export const API_ERRORS = {
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'Invalid API key', statusCode: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', message: 'Insufficient permissions', statusCode: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', message: 'Resource not found', statusCode: 404 },
  RATE_LIMITED: { code: 'RATE_LIMITED', message: 'Rate limit exceeded', statusCode: 429 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: 'Invalid request data', statusCode: 400 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: 'Internal server error', statusCode: 500 },
  GPS_UNAVAILABLE: { code: 'GPS_UNAVAILABLE', message: 'GPS data not available', statusCode: 503 },
  TRIP_NOT_ACTIVE: { code: 'TRIP_NOT_ACTIVE', message: 'No active trip found', statusCode: 404 }
} as const