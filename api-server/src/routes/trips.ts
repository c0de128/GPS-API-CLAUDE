import { Router } from 'express'
import type { Request, Response } from 'express'
import { authenticate, requirePermission } from '@/middleware/auth.js'
import { createEndpointRateLimit } from '@/middleware/rateLimit.js'
import type { ApiResponse, TripProgressUpdate, TripSummary, TripRoute, GpsLocationUpdate } from '@/types/api.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// In-memory storage for demo purposes (use database in production)
const trips = new Map<string, TripProgressUpdate>()
const tripRoutes = new Map<string, GpsLocationUpdate[]>()
const userTrips = new Map<string, string[]>() // apiKey -> tripIds

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Helper function to calculate trip statistics
function calculateTripStats(tripId: string): Partial<TripProgressUpdate> {
  const route = tripRoutes.get(tripId) || []
  if (route.length < 2) {
    return {
      distance: 0,
      duration: 0,
      averageSpeed: 0,
      maxSpeed: 0
    }
  }

  let totalDistance = 0
  let maxSpeed = 0

  for (let i = 1; i < route.length; i++) {
    const prev = route[i - 1]
    const curr = route[i]

    // Calculate distance between points
    const segmentDistance = calculateDistance(
      prev.latitude, prev.longitude,
      curr.latitude, curr.longitude
    )
    totalDistance += segmentDistance

    // Track max speed
    if (curr.speed && curr.speed > maxSpeed) {
      maxSpeed = curr.speed
    }
  }

  const duration = route[route.length - 1].timestamp - route[0].timestamp
  const averageSpeed = duration > 0 ? (totalDistance / (duration / 3600000)) : 0 // km/h

  return {
    distance: totalDistance,
    duration,
    averageSpeed,
    maxSpeed,
    routePointsCount: route.length
  }
}

// Get all trips for authenticated user
router.get('/',
  authenticate,
  createEndpointRateLimit(20, 60000),
  requirePermission('trips:read'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    const userTripIds = userTrips.get(apiKey) || []

    const userTripData = userTripIds.map(tripId => {
      const trip = trips.get(tripId)
      if (!trip) return null

      const summary: TripSummary = {
        id: trip.tripId,
        name: trip.name,
        status: trip.status,
        startTime: trip.startTime,
        endTime: trip.status === 'completed' ? trip.lastUpdate : undefined,
        distance: trip.distance,
        duration: trip.duration,
        averageSpeed: trip.averageSpeed,
        maxSpeed: trip.maxSpeed,
        routePointsCount: trip.routePointsCount
      }

      return summary
    }).filter(Boolean) as TripSummary[]

    const response: ApiResponse<TripSummary[]> = {
      success: true,
      data: userTripData,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Get specific trip details
router.get('/:tripId',
  authenticate,
  createEndpointRateLimit(30, 60000),
  requirePermission('trips:read'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    const tripId = req.params.tripId
    const userTripIds = userTrips.get(apiKey) || []

    if (!userTripIds.includes(tripId)) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found or access denied',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    const trip = trips.get(tripId)
    if (!trip) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    const response: ApiResponse<TripProgressUpdate> = {
      success: true,
      data: trip,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Get trip route/path
router.get('/:tripId/route',
  authenticate,
  createEndpointRateLimit(20, 60000),
  requirePermission('trips:read'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    const tripId = req.params.tripId
    const userTripIds = userTrips.get(apiKey) || []

    if (!userTripIds.includes(tripId)) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found or access denied',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    const route = tripRoutes.get(tripId) || []
    const routeData: TripRoute = {
      tripId,
      points: route.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: point.timestamp,
        speed: point.speed,
        accuracy: point.accuracy
      })),
      totalPoints: route.length
    }

    const response: ApiResponse<TripRoute> = {
      success: true,
      data: routeData,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Create a new trip
router.post('/',
  authenticate,
  createEndpointRateLimit(10, 60000),
  requirePermission('trips:write'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    const { name } = req.body

    if (!name || typeof name !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'Trip name is required',
        timestamp: new Date().toISOString()
      }
      return res.status(400).json(response)
    }

    const tripId = uuidv4()
    const now = Date.now()

    const newTrip: TripProgressUpdate = {
      tripId,
      status: 'planning',
      name,
      distance: 0,
      duration: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      routePointsCount: 0,
      waypointsCount: 0,
      startTime: now,
      lastUpdate: now
    }

    trips.set(tripId, newTrip)
    tripRoutes.set(tripId, [])

    // Add to user's trips
    if (!userTrips.has(apiKey)) {
      userTrips.set(apiKey, [])
    }
    userTrips.get(apiKey)!.push(tripId)

    const response: ApiResponse<TripProgressUpdate> = {
      success: true,
      data: newTrip,
      timestamp: new Date().toISOString()
    }

    res.status(201).json(response)
  }
)

// Start/activate a trip
router.post('/:tripId/start',
  authenticate,
  createEndpointRateLimit(10, 60000),
  requirePermission('trips:write'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    const tripId = req.params.tripId
    const userTripIds = userTrips.get(apiKey) || []

    if (!userTripIds.includes(tripId)) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found or access denied',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    const trip = trips.get(tripId)
    if (!trip) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    trip.status = 'active'
    trip.startTime = Date.now()
    trip.lastUpdate = trip.startTime

    const response: ApiResponse<TripProgressUpdate> = {
      success: true,
      data: trip,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Update trip with GPS location
router.post('/:tripId/location',
  authenticate,
  createEndpointRateLimit(60, 60000),
  requirePermission('trips:write'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    const tripId = req.params.tripId
    const locationUpdate: GpsLocationUpdate = req.body
    const userTripIds = userTrips.get(apiKey) || []

    if (!userTripIds.includes(tripId)) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found or access denied',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    const trip = trips.get(tripId)
    if (!trip) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    if (trip.status !== 'active') {
      const response: ApiResponse = {
        success: false,
        error: 'Trip is not active',
        timestamp: new Date().toISOString()
      }
      return res.status(400).json(response)
    }

    // Add location to route
    if (!tripRoutes.has(tripId)) {
      tripRoutes.set(tripId, [])
    }

    locationUpdate.tripId = tripId
    locationUpdate.timestamp = locationUpdate.timestamp || Date.now()

    tripRoutes.get(tripId)!.push(locationUpdate)

    // Update trip statistics
    const stats = calculateTripStats(tripId)
    Object.assign(trip, stats)

    trip.currentLocation = locationUpdate
    trip.lastUpdate = locationUpdate.timestamp

    const response: ApiResponse<TripProgressUpdate> = {
      success: true,
      data: trip,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Complete a trip
router.post('/:tripId/complete',
  authenticate,
  createEndpointRateLimit(10, 60000),
  requirePermission('trips:write'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    const tripId = req.params.tripId
    const userTripIds = userTrips.get(apiKey) || []

    if (!userTripIds.includes(tripId)) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found or access denied',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    const trip = trips.get(tripId)
    if (!trip) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    trip.status = 'completed'
    trip.lastUpdate = Date.now()

    // Calculate final statistics
    const stats = calculateTripStats(tripId)
    Object.assign(trip, stats)

    const response: ApiResponse<TripProgressUpdate> = {
      success: true,
      data: trip,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Delete a trip
router.delete('/:tripId',
  authenticate,
  createEndpointRateLimit(10, 60000),
  requirePermission('trips:write'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    const tripId = req.params.tripId
    const userTripIds = userTrips.get(apiKey) || []

    if (!userTripIds.includes(tripId)) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found or access denied',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    // Remove from storage
    trips.delete(tripId)
    tripRoutes.delete(tripId)

    // Remove from user's trips
    const index = userTripIds.indexOf(tripId)
    if (index > -1) {
      userTripIds.splice(index, 1)
    }

    const response: ApiResponse = {
      success: true,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

export { router as tripsRouter }