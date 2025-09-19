import type { GpsLocationUpdate, TripProgressUpdate, ApiKey } from '@/types/api.js'

// Shared data store for the API server
// This provides a centralized place to store and access application state

interface DataStore {
  // GPS tracking data
  gpsLocations: Map<string, GpsLocationUpdate[]> // API key -> location history
  gpsStatus: Map<string, {
    isTracking: boolean
    permission: 'granted' | 'denied' | 'prompt' | 'unknown'
    lastUpdate?: number
    accuracy?: number
    error?: string
  }>

  // Trip data
  trips: Map<string, TripProgressUpdate[]> // API key -> trips
  activeTrips: Map<string, string> // API key -> active trip ID

  // System metrics
  metrics: {
    serverStartTime: number
    totalRequests: number
    totalErrors: number
    activeConnections: Set<string> // WebSocket client IDs
    apiUsage: Map<string, {
      requests: number
      lastRequest: number
      errors: number
    }>
  }

  // API keys (for admin endpoints)
  apiKeys: Map<string, ApiKey>
}

// Initialize the data store
export const dataStore: DataStore = {
  gpsLocations: new Map(),
  gpsStatus: new Map(),
  trips: new Map(),
  activeTrips: new Map(),
  metrics: {
    serverStartTime: Date.now(),
    totalRequests: 0,
    totalErrors: 0,
    activeConnections: new Set(),
    apiUsage: new Map()
  },
  apiKeys: new Map([
    ['gps_dev_1452bec4359a449aa8b35c97adcbb900', {
      key: 'gps_dev_1452bec4359a449aa8b35c97adcbb900',
      name: 'Development Key',
      permissions: ['gps:read', 'trips:read', 'trips:write', 'stats:read'],
      createdAt: new Date('2024-01-01').toISOString(),
      lastUsed: new Date().toISOString(),
      rateLimit: 100,
      active: true
    }],
    ['gps_admin_28f24742193a4b3eb45612c3248fb6ee', {
      key: 'gps_admin_28f24742193a4b3eb45612c3248fb6ee',
      name: 'Admin Key',
      permissions: ['gps:read', 'trips:read', 'trips:write', 'stats:read', 'admin'],
      createdAt: new Date('2024-01-01').toISOString(),
      lastUsed: new Date().toISOString(),
      rateLimit: 1000,
      active: true
    }]
  ])
}

// Helper functions for managing data

export function recordApiUsage(apiKey: string, error: boolean = false): void {
  dataStore.metrics.totalRequests++
  if (error) dataStore.metrics.totalErrors++

  const usage = dataStore.metrics.apiUsage.get(apiKey) || {
    requests: 0,
    lastRequest: 0,
    errors: 0
  }

  usage.requests++
  usage.lastRequest = Date.now()
  if (error) usage.errors++

  dataStore.metrics.apiUsage.set(apiKey, usage)

  // Update last used time for API key
  const key = dataStore.apiKeys.get(apiKey)
  if (key) {
    key.lastUsed = new Date().toISOString()
    dataStore.apiKeys.set(apiKey, key)
  }
}

export function addGpsLocation(apiKey: string, location: GpsLocationUpdate): void {
  if (!dataStore.gpsLocations.has(apiKey)) {
    dataStore.gpsLocations.set(apiKey, [])
  }

  const locations = dataStore.gpsLocations.get(apiKey)!
  locations.push(location)

  // Keep only last 1000 locations per API key
  if (locations.length > 1000) {
    locations.splice(0, locations.length - 1000)
  }

  // Update GPS status
  dataStore.gpsStatus.set(apiKey, {
    isTracking: true,
    permission: 'granted',
    lastUpdate: location.timestamp,
    accuracy: location.accuracy
  })
}

export function getTripsForApiKey(apiKey: string): TripProgressUpdate[] {
  return dataStore.trips.get(apiKey) || []
}

export function addTrip(apiKey: string, trip: TripProgressUpdate): void {
  if (!dataStore.trips.has(apiKey)) {
    dataStore.trips.set(apiKey, [])
  }

  const trips = dataStore.trips.get(apiKey)!

  // Check if trip already exists and update it
  const existingIndex = trips.findIndex(t => t.id === trip.id)
  if (existingIndex >= 0) {
    trips[existingIndex] = trip
  } else {
    trips.push(trip)
  }

  // Track active trip
  if (trip.status === 'in_progress') {
    dataStore.activeTrips.set(apiKey, trip.id)
  } else if (trip.status === 'completed' && dataStore.activeTrips.get(apiKey) === trip.id) {
    dataStore.activeTrips.delete(apiKey)
  }
}

export function getActiveTripsCount(): number {
  return dataStore.activeTrips.size
}

export function getTodayTripsCount(): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTime = today.getTime()

  let count = 0
  dataStore.trips.forEach(trips => {
    trips.forEach(trip => {
      if (new Date(trip.startTime).getTime() >= todayTime) {
        count++
      }
    })
  })

  return count
}

export function getTodayTotalDistance(): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTime = today.getTime()

  let totalDistance = 0
  dataStore.trips.forEach(trips => {
    trips.forEach(trip => {
      if (new Date(trip.startTime).getTime() >= todayTime) {
        totalDistance += trip.totalDistance || 0
      }
    })
  })

  return totalDistance
}

export function getAllTripsStats() {
  let totalTrips = 0
  let totalDistance = 0
  let totalDuration = 0
  let maxSpeed = 0
  let speedSum = 0
  let speedCount = 0
  let longestTrip = 0
  let shortestTrip = Infinity

  dataStore.trips.forEach(trips => {
    trips.forEach(trip => {
      totalTrips++
      totalDistance += trip.totalDistance || 0

      if (trip.endTime && trip.startTime) {
        const duration = new Date(trip.endTime).getTime() - new Date(trip.startTime).getTime()
        totalDuration += duration
      }

      if (trip.maxSpeed) {
        maxSpeed = Math.max(maxSpeed, trip.maxSpeed)
        speedSum += trip.averageSpeed || 0
        speedCount++
      }

      if (trip.totalDistance) {
        longestTrip = Math.max(longestTrip, trip.totalDistance)
        shortestTrip = Math.min(shortestTrip, trip.totalDistance)
      }
    })
  })

  return {
    totalTrips,
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalDuration,
    averageSpeed: speedCount > 0 ? Math.round((speedSum / speedCount) * 100) / 100 : 0,
    maxSpeed: Math.round(maxSpeed * 100) / 100,
    longestTrip: Math.round(longestTrip * 100) / 100,
    shortestTrip: shortestTrip === Infinity ? 0 : Math.round(shortestTrip * 100) / 100
  }
}

export function getSystemHealth() {
  const memUsage = process.memoryUsage()
  const uptime = Date.now() - dataStore.metrics.serverStartTime
  const errorRate = dataStore.metrics.totalRequests > 0
    ? (dataStore.metrics.totalErrors / dataStore.metrics.totalRequests) * 100
    : 0

  return {
    healthy: errorRate < 5,
    uptime,
    memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
    activeConnections: dataStore.metrics.activeConnections.size,
    errorRate: Math.round(errorRate * 100) / 100
  }
}