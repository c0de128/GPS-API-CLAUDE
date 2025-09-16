import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { createRateLimit } from '@/middleware/rateLimit.js'
import { authenticate, optionalAuth, validateOrigin } from '@/middleware/auth.js'
import { gpsRouter } from '@/routes/gps.js'
import { tripsRouter } from '@/routes/trips.js'
import { statsRouter } from '@/routes/stats.js'
import { adminRouter } from '@/routes/admin.js'
import type { ApiResponse, ServerConfig } from '@/types/api.js'
import type { Request, Response, NextFunction } from 'express'

const app = express()

// Server configuration
const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3001'),
  host: process.env.HOST || '0.0.0.0',
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // requests per window
  },
  websocket: {
    maxConnections: 1000,
    heartbeatInterval: 30000
  },
  api: {
    version: 'v1',
    basePath: '/api'
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow for API usage
  crossOriginEmbedderPolicy: false
}))

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true)

    // Check if origin is in allowed list
    if (config.cors.origins.includes('*') || config.cors.origins.includes(origin)) {
      return callback(null, true)
    }

    callback(new Error('Not allowed by CORS'))
  },
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With']
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Compression middleware
app.use(compression())

// Global rate limiting
app.use(createRateLimit({
  windowMs: config.rateLimit.windowMs,
  defaultLimit: config.rateLimit.max,
  skipSuccessfulRequests: false,
  skipFailedRequests: false
}))

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const timestamp = new Date().toISOString()
    const { method, url, ip } = req
    const { statusCode } = res
    const userAgent = req.get('User-Agent') || 'Unknown'

    console.log(`[${timestamp}] ${method} ${url} - ${statusCode} - ${duration}ms - ${ip} - ${userAgent}`)
  })

  next()
})

// Origin validation for authenticated requests
app.use(validateOrigin)

// Health check endpoint (no auth required)
app.get('/health', (req: Request, res: Response) => {
  const uptime = process.uptime()
  const timestamp = new Date().toISOString()

  const health = {
    status: 'healthy',
    timestamp,
    uptime: Math.floor(uptime),
    version: config.api.version,
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  }

  res.json(health)
})

// API documentation endpoint (no auth required)
app.get('/api', (req: Request, res: Response) => {
  const docs = {
    name: 'GPS Tracking API',
    version: config.api.version,
    description: 'Real-time GPS tracking and trip management API',
    baseUrl: `${req.protocol}://${req.get('host')}${config.api.basePath}/${config.api.version}`,
    authentication: {
      type: 'API Key',
      methods: [
        'Authorization: Bearer <api_key>',
        'X-API-Key: <api_key>',
        'Query parameter: ?apiKey=<api_key>'
      ]
    },
    endpoints: {
      gps: {
        'GET /gps/location': 'Get current GPS location',
        'GET /gps/location/history': 'Get GPS location history',
        'POST /gps/location': 'Update GPS location',
        'GET /gps/status': 'Get GPS tracking status',
        'POST /gps/start': 'Start GPS tracking',
        'POST /gps/stop': 'Stop GPS tracking'
      },
      trips: {
        'GET /trips': 'Get all trips',
        'GET /trips/:id': 'Get specific trip',
        'GET /trips/:id/route': 'Get trip route/path',
        'POST /trips': 'Create new trip',
        'POST /trips/:id/start': 'Start/activate trip',
        'POST /trips/:id/location': 'Update trip with GPS location',
        'POST /trips/:id/complete': 'Complete trip',
        'DELETE /trips/:id': 'Delete trip'
      },
      stats: {
        'GET /stats/realtime': 'Get real-time statistics',
        'GET /stats/trips': 'Get trip statistics summary',
        'GET /stats/performance': 'Get performance metrics',
        'GET /stats/usage': 'Get API usage statistics'
      },
      admin: {
        'GET /admin/keys': 'List all API keys (admin)',
        'POST /admin/keys': 'Create new API key (admin)',
        'GET /admin/keys/:keyId': 'Get specific API key info (admin)',
        'PUT /admin/keys/:keyId/enable': 'Enable API key (admin)',
        'PUT /admin/keys/:keyId/disable': 'Disable API key (admin)',
        'DELETE /admin/keys/:keyId': 'Delete API key (admin)',
        'GET /admin/stats': 'Get admin statistics (admin)',
        'GET /admin/config': 'Get server configuration (admin)'
      }
    },
    rateLimit: {
      global: `${config.rateLimit.max} requests per ${config.rateLimit.windowMs / 60000} minutes`,
      perEndpoint: 'Varies by endpoint'
    }
  }

  res.json(docs)
})

// API routes
const apiRouter = express.Router()

// Mount route modules
apiRouter.use('/gps', gpsRouter)
apiRouter.use('/trips', tripsRouter)
apiRouter.use('/stats', statsRouter)
apiRouter.use('/admin', adminRouter)

// Mount API router
app.use(`${config.api.basePath}/${config.api.version}`, apiRouter)

// 404 handler
app.use('*', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  }
  res.status(404).json(response)
})

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Don't log JSON parsing errors from invalid requests - they're expected
  if (!err.message.includes('JSON') && !err.message.includes('entity.parse.failed')) {
    console.error('Global error handler:', err)
  }

  // JSON parsing errors
  if (err.message.includes('JSON') || (err as any).type === 'entity.parse.failed') {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid JSON in request body',
      timestamp: new Date().toISOString()
    }
    return res.status(400).json(response)
  }

  // CORS errors
  if (err.message.includes('CORS')) {
    const response: ApiResponse = {
      success: false,
      error: 'CORS policy violation',
      timestamp: new Date().toISOString()
    }
    return res.status(403).json(response)
  }

  // Rate limit errors
  if (err.message.includes('rate')) {
    const response: ApiResponse = {
      success: false,
      error: 'Rate limit exceeded',
      timestamp: new Date().toISOString()
    }
    return res.status(429).json(response)
  }

  // Default error response
  const response: ApiResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString()
  }

  res.status(500).json(response)
})

export { app, config }