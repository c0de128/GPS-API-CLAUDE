import { Router } from 'express'
import type { Request, Response } from 'express'
import { authenticate, requirePermission, optionalAuth } from '@/middleware/auth.js'
import { createEndpointRateLimit } from '@/middleware/rateLimit.js'
import type { ApiResponse, GpsLocationUpdate, GpsStatus } from '@/types/api.js'

const router = Router()

// In-memory storage for demo purposes (use Redis/database in production)
const gpsData = new Map<string, GpsLocationUpdate[]>()
const gpsStatus = new Map<string, GpsStatus>()

// Get current GPS location
router.get('/location',
  optionalAuth,
  createEndpointRateLimit(30, 60000), // 30 requests per minute
  requirePermission('gps:read'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    const currentLocation = gpsData.get(apiKey)?.slice(-1)[0]

    if (!currentLocation) {
      const response: ApiResponse = {
        success: false,
        error: 'No GPS location data available',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    const response: ApiResponse<GpsLocationUpdate> = {
      success: true,
      data: currentLocation,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Get GPS location history
router.get('/location/history',
  authenticate,
  createEndpointRateLimit(10, 60000), // 10 requests per minute
  requirePermission('gps:read'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000)
    const offset = parseInt(req.query.offset as string) || 0

    const locations = gpsData.get(apiKey) || []
    const paginatedLocations = locations.slice(offset, offset + limit)

    const response: ApiResponse<{
      locations: GpsLocationUpdate[]
      total: number
      limit: number
      offset: number
    }> = {
      success: true,
      data: {
        locations: paginatedLocations,
        total: locations.length,
        limit,
        offset
      },
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Update GPS location
router.post('/location',
  authenticate,
  createEndpointRateLimit(60, 60000), // 60 updates per minute
  requirePermission('gps:read'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    const locationUpdate: GpsLocationUpdate = req.body

    // Validate required fields
    if (!locationUpdate.latitude || !locationUpdate.longitude || !locationUpdate.accuracy) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: latitude, longitude, accuracy',
        timestamp: new Date().toISOString()
      }
      return res.status(400).json(response)
    }

    // Add timestamp if not provided
    if (!locationUpdate.timestamp) {
      locationUpdate.timestamp = Date.now()
    }

    // Store location data
    if (!gpsData.has(apiKey)) {
      gpsData.set(apiKey, [])
    }

    const locations = gpsData.get(apiKey)!
    locations.push(locationUpdate)

    // Keep only last 1000 locations per API key
    if (locations.length > 1000) {
      locations.splice(0, locations.length - 1000)
    }

    // Update GPS status
    gpsStatus.set(apiKey, {
      isTracking: true,
      permission: 'granted',
      lastUpdate: locationUpdate.timestamp,
      accuracy: locationUpdate.accuracy
    })

    const response: ApiResponse<GpsLocationUpdate> = {
      success: true,
      data: locationUpdate,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Get GPS status
router.get('/status',
  authenticate,
  createEndpointRateLimit(30, 60000),
  requirePermission('gps:read'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    const status = gpsStatus.get(apiKey) || {
      isTracking: false,
      permission: 'unknown' as const,
      error: 'No GPS data available'
    }

    const response: ApiResponse<GpsStatus> = {
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Start GPS tracking
router.post('/start',
  authenticate,
  createEndpointRateLimit(10, 60000),
  requirePermission('gps:read'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!

    gpsStatus.set(apiKey, {
      isTracking: true,
      permission: 'granted',
      lastUpdate: Date.now()
    })

    const response: ApiResponse = {
      success: true,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Stop GPS tracking
router.post('/stop',
  authenticate,
  createEndpointRateLimit(10, 60000),
  requirePermission('gps:read'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!

    const currentStatus = gpsStatus.get(apiKey)
    if (currentStatus) {
      currentStatus.isTracking = false
    }

    const response: ApiResponse = {
      success: true,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

export { router as gpsRouter }