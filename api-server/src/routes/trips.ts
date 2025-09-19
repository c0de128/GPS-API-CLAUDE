import { Router } from 'express'
import type { Request, Response } from 'express'
import { authenticate, requirePermission } from '@/middleware/auth.js'
import { createEndpointRateLimit } from '@/middleware/rateLimit.js'
import type { ApiResponse, TripProgressUpdate, TripSummary, TripRoute, GpsLocationUpdate } from '@/types/api.js'
import { v4 as uuidv4 } from 'uuid'
import { dataStore, recordApiUsage, addTrip, getTripsForApiKey } from '@/services/dataStore.js'

const router = Router()

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

// Get all trips for authenticated user
router.get('/',
  authenticate,
  createEndpointRateLimit(20, 60000),
  requirePermission('trips:read'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    recordApiUsage(apiKey)

    const userTrips = getTripsForApiKey(apiKey)

    const userTripData = userTrips.map(trip => {
      const summary: TripSummary = {
        id: trip.id,
        name: trip.name,
        status: trip.status,
        startTime: trip.startTime,
        endTime: trip.status === 'completed' ? trip.endTime : undefined,
        distance: trip.totalDistance || 0,
        duration: trip.endTime ? new Date(trip.endTime).getTime() - new Date(trip.startTime).getTime() : undefined,
        averageSpeed: trip.averageSpeed || 0,
        maxSpeed: trip.maxSpeed || 0,
        routePointsCount: trip.routePoints?.length || 0
      }

      return summary
    })

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
    recordApiUsage(apiKey)
    const tripId = req.params.tripId
    const userTrips = getTripsForApiKey(apiKey)

    const trip = userTrips.find(t => t.id === tripId)
    if (!trip) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found or access denied',
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
    recordApiUsage(apiKey)
    const tripId = req.params.tripId
    const userTrips = getTripsForApiKey(apiKey)

    const trip = userTrips.find(t => t.id === tripId)
    if (!trip) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found or access denied',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    const route = trip.routePoints || []
    const routeData: TripRoute = {
      tripId,
      points: route.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: point.timestamp,
        speed: point.speed || 0,
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
    recordApiUsage(apiKey)
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
    const now = new Date().toISOString()

    const newTrip: TripProgressUpdate = {
      id: tripId,
      status: 'planning',
      name: name.trim(),
      startTime: now,
      totalDistance: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      routePoints: []
    }

    addTrip(apiKey, newTrip)

    const response: ApiResponse<TripProgressUpdate> = {
      success: true,
      data: newTrip,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Start a trip (change status to in_progress)
router.post('/:tripId/start',
  authenticate,
  createEndpointRateLimit(10, 60000),
  requirePermission('trips:write'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    recordApiUsage(apiKey)
    const tripId = req.params.tripId
    const userTrips = getTripsForApiKey(apiKey)

    const trip = userTrips.find(t => t.id === tripId)
    if (!trip) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found or access denied',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    if (trip.status !== 'planning') {
      const response: ApiResponse = {
        success: false,
        error: 'Trip can only be started from planning status',
        timestamp: new Date().toISOString()
      }
      return res.status(400).json(response)
    }

    const updatedTrip: TripProgressUpdate = {
      ...trip,
      status: 'in_progress',
      startTime: new Date().toISOString()
    }

    addTrip(apiKey, updatedTrip)

    const response: ApiResponse<TripProgressUpdate> = {
      success: true,
      data: updatedTrip,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Add location to trip
router.post('/:tripId/location',
  authenticate,
  createEndpointRateLimit(60, 60000),
  requirePermission('trips:write'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    recordApiUsage(apiKey)
    const tripId = req.params.tripId
    const locationUpdate: GpsLocationUpdate = req.body

    if (!locationUpdate.latitude || !locationUpdate.longitude) {
      const response: ApiResponse = {
        success: false,
        error: 'Location latitude and longitude are required',
        timestamp: new Date().toISOString()
      }
      return res.status(400).json(response)
    }

    const userTrips = getTripsForApiKey(apiKey)
    const trip = userTrips.find(t => t.id === tripId)

    if (!trip) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found or access denied',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    if (trip.status !== 'in_progress') {
      const response: ApiResponse = {
        success: false,
        error: 'Can only add locations to trips in progress',
        timestamp: new Date().toISOString()
      }
      return res.status(400).json(response)
    }

    // Add location to route
    const routePoints = trip.routePoints || []
    routePoints.push(locationUpdate)

    // Calculate updated statistics
    let totalDistance = trip.totalDistance || 0
    let maxSpeed = trip.maxSpeed || 0

    if (routePoints.length > 1) {
      const prev = routePoints[routePoints.length - 2]
      const curr = locationUpdate
      const segmentDistance = calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      )
      totalDistance += segmentDistance
    }

    if (locationUpdate.speed && locationUpdate.speed > maxSpeed) {
      maxSpeed = locationUpdate.speed
    }

    const duration = routePoints.length > 1
      ? routePoints[routePoints.length - 1].timestamp - routePoints[0].timestamp
      : 0
    const averageSpeed = duration > 0 ? (totalDistance / (duration / 3600000)) : 0

    const updatedTrip: TripProgressUpdate = {
      ...trip,
      routePoints,
      totalDistance,
      maxSpeed,
      averageSpeed
    }

    addTrip(apiKey, updatedTrip)

    const response: ApiResponse<TripProgressUpdate> = {
      success: true,
      data: updatedTrip,
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
    recordApiUsage(apiKey)
    const tripId = req.params.tripId
    const userTrips = getTripsForApiKey(apiKey)

    const trip = userTrips.find(t => t.id === tripId)
    if (!trip) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found or access denied',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    if (trip.status !== 'in_progress') {
      const response: ApiResponse = {
        success: false,
        error: 'Trip must be in progress to complete',
        timestamp: new Date().toISOString()
      }
      return res.status(400).json(response)
    }

    const updatedTrip: TripProgressUpdate = {
      ...trip,
      status: 'completed',
      endTime: new Date().toISOString()
    }

    addTrip(apiKey, updatedTrip)

    const response: ApiResponse<TripProgressUpdate> = {
      success: true,
      data: updatedTrip,
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
    recordApiUsage(apiKey)
    const tripId = req.params.tripId
    const userTrips = getTripsForApiKey(apiKey)

    const tripIndex = userTrips.findIndex(t => t.id === tripId)
    if (tripIndex === -1) {
      const response: ApiResponse = {
        success: false,
        error: 'Trip not found or access denied',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    // Remove trip from data store
    const trips = dataStore.trips.get(apiKey) || []
    trips.splice(tripIndex, 1)
    dataStore.trips.set(apiKey, trips)

    const response: ApiResponse = {
      success: true,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

export { router as tripsRouter }
export default router