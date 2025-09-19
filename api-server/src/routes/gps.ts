import { Router } from 'express'
import type { Request, Response } from 'express'
import { authenticate, requirePermission, optionalAuth } from '@/middleware/auth.js'
import { createEndpointRateLimit } from '@/middleware/rateLimit.js'
import type { ApiResponse, GpsLocationUpdate, GpsStatus } from '@/types/api.js'
import { dataStore, recordApiUsage, addGpsLocation } from '@/services/dataStore.js'

const router = Router()

// Helper function to generate simulated GPS coordinates for testing
function generateSimulatedLocation(): GpsLocationUpdate {
  // Start from a base location (NYC area) and add some random variation
  const baseLatitude = 40.7128
  const baseLongitude = -74.0060

  // Add random movement within ~1km radius
  const latVariation = (Math.random() - 0.5) * 0.01 // ~1.1km variation
  const lngVariation = (Math.random() - 0.5) * 0.01 // ~1.1km variation

  return {
    latitude: baseLatitude + latVariation,
    longitude: baseLongitude + lngVariation,
    accuracy: Math.floor(Math.random() * 10) + 5, // 5-15 meters
    speed: Math.floor(Math.random() * 30), // 0-30 km/h
    heading: Math.floor(Math.random() * 360), // 0-360 degrees
    altitude: Math.floor(Math.random() * 100) + 10, // 10-110 meters
    timestamp: Date.now()
  }
}

// Get current GPS location
router.get('/location',
  optionalAuth,
  createEndpointRateLimit(30, 60000), // 30 requests per minute
  requirePermission('gps:read'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    recordApiUsage(apiKey)
    const simulate = req.query.simulate === 'true' || req.query.sim === 'true'
    let currentLocation = dataStore.gpsLocations.get(apiKey)?.slice(-1)[0]

    // Generate fresh simulated data if requested, or if no real data exists
    if (simulate || !currentLocation) {
      currentLocation = generateSimulatedLocation()
      addGpsLocation(apiKey, currentLocation)
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
    recordApiUsage(apiKey)
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000)
    const offset = parseInt(req.query.offset as string) || 0

    const locations = dataStore.gpsLocations.get(apiKey) || []
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
    recordApiUsage(apiKey)
    const locationUpdate: GpsLocationUpdate = req.body

    // Validate required fields
    if (!locationUpdate.latitude || !locationUpdate.longitude || !locationUpdate.accuracy) {
      recordApiUsage(apiKey, true)
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

    // Store location data using data store
    addGpsLocation(apiKey, locationUpdate)

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
    recordApiUsage(apiKey)
    const status = dataStore.gpsStatus.get(apiKey) || {
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
    recordApiUsage(apiKey)

    dataStore.gpsStatus.set(apiKey, {
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