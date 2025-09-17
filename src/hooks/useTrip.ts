import { useState, useCallback, useEffect } from 'react'
import { Trip, TripStatus, LocationData, Waypoint } from '@/types'
import { calculateDistance } from '@/lib/utils'
import { useStorage } from './useStorage'
import { geocodingService } from '@/services/geocodingService'

export interface UseTripReturn {
  // Current trip state
  currentTrip: Trip | null
  tripStatus: TripStatus
  routePoints: LocationData[]
  totalDistance: number

  // Actions
  startTrip: (name: string, notes: string, type?: 'real' | 'demo') => void
  pauseTrip: () => void
  resumeTrip: () => void
  stopTrip: () => void
  updateTripName: (name: string) => void
  addRoutePoint: (location: LocationData) => void
  addWaypoint: (location: LocationData, note?: string) => void

  // Getters
  getTripDuration: () => number
  isRecording: boolean
}

export function useTrip(): UseTripReturn {
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null)
  const [routePoints, setRoutePoints] = useState<LocationData[]>([])
  const [totalDistance, setTotalDistance] = useState(0)

  const { saveTrip } = useStorage()

  const tripStatus: TripStatus = currentTrip?.status || 'planning'
  const isRecording = tripStatus === 'active'

  // Generate unique ID
  const generateId = () => `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Start a new trip
  const startTrip = useCallback((name: string, notes: string, type: 'real' | 'demo' = 'real') => {
    console.log('🎯 useTrip.startTrip called:', { name, notes, type })
    const now = Date.now()
    const newTrip: Trip = {
      id: generateId(),
      name: name.trim() || `Trip ${new Date().toLocaleDateString()}`,
      type,
      status: 'active',
      startTime: now,
      route: [],
      waypoints: [],
      speeds: [],
      totalDistance: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      notes: notes.trim(),
      createdAt: now,
      updatedAt: now
    }

    setCurrentTrip(newTrip)
    setRoutePoints([])
    setTotalDistance(0)
    console.log('🎯 useTrip.startTrip: Trip created', { tripId: newTrip.id, type: newTrip.type, status: newTrip.status })
  }, [])

  // Pause current trip
  const pauseTrip = useCallback(() => {
    if (!currentTrip || currentTrip.status !== 'active') return

    setCurrentTrip(prev => prev ? {
      ...prev,
      status: 'paused',
      updatedAt: Date.now()
    } : null)
  }, [currentTrip])

  // Resume paused trip
  const resumeTrip = useCallback(() => {
    if (!currentTrip || currentTrip.status !== 'paused') return

    setCurrentTrip(prev => prev ? {
      ...prev,
      status: 'active',
      updatedAt: Date.now()
    } : null)
  }, [currentTrip])

  // Stop and complete trip
  const stopTrip = useCallback(async () => {
    if (!currentTrip) return

    const endLocation = routePoints.length > 0 ? routePoints[routePoints.length - 1] : undefined

    // Resolve addresses and calculate metadata
    console.log('Resolving trip addresses and calculating metadata...')

    let addresses = { startAddress: '', endAddress: '' }
    let locationMetadata = undefined

    try {
      // Resolve addresses
      addresses = await geocodingService.resolveTripAddresses(
        currentTrip.startLocation,
        endLocation
      )
      console.log('Resolved addresses:', addresses)

      // Calculate location metadata
      locationMetadata = geocodingService.calculateLocationMetadata(routePoints)
      console.log('Location metadata:', locationMetadata)
    } catch (error) {
      console.warn('Failed to resolve addresses or calculate metadata:', error)
      // Use defaults if resolution fails
      addresses = {
        startAddress: geocodingService.getDefaultStartAddress(),
        endAddress: geocodingService.getDefaultEndAddress()
      }
    }

    const completedTrip: Trip = {
      ...currentTrip,
      status: 'completed',
      endTime: Date.now(),
      endLocation,
      startAddress: addresses.startAddress,
      endAddress: addresses.endAddress,
      route: [...routePoints],
      totalDistance,
      locationMetadata,
      // Include route segments for demo trips
      routeSegments: currentTrip.demoConfig?.route,
      updatedAt: Date.now()
    }

    setCurrentTrip(completedTrip)

    // Save to storage
    try {
      await saveTrip(completedTrip)
      console.log('Trip saved successfully with enhanced data')
    } catch (error) {
      console.error('Failed to save completed trip:', error)
    }
  }, [currentTrip, routePoints, totalDistance, saveTrip])

  // Update trip name
  const updateTripName = useCallback((name: string) => {
    if (!currentTrip) return

    setCurrentTrip(prev => prev ? {
      ...prev,
      name: name.trim() || prev.name,
      updatedAt: Date.now()
    } : null)
  }, [currentTrip])

  // Add a route point (automatic tracking)
  const addRoutePoint = useCallback((location: LocationData) => {
    console.log('🎯 useTrip.addRoutePoint called:', { location, tripStatus: currentTrip?.status, tripId: currentTrip?.id })

    if (!currentTrip || currentTrip.status !== 'active') {
      console.log('❌ useTrip.addRoutePoint: No active trip or trip not active', {
        hasTrip: !!currentTrip,
        status: currentTrip?.status
      })
      return
    }

    setRoutePoints(prev => {
      const newPoints = [...prev, location]
      console.log('📍 useTrip.addRoutePoint: Adding point', {
        previousCount: prev.length,
        newCount: newPoints.length,
        location: { lat: location.latitude, lng: location.longitude }
      })

      // Calculate new total distance
      if (prev.length > 0) {
        const lastPoint = prev[prev.length - 1]
        const distance = calculateDistance(
          lastPoint.latitude,
          lastPoint.longitude,
          location.latitude,
          location.longitude
        )
        console.log('📏 useTrip.addRoutePoint: Distance calculation', {
          from: { lat: lastPoint.latitude, lng: lastPoint.longitude },
          to: { lat: location.latitude, lng: location.longitude },
          distanceMeters: distance,
          distanceFeet: distance * 3.28084
        })

        setTotalDistance(prevDistance => {
          const newTotal = prevDistance + distance
          console.log('📊 useTrip.addRoutePoint: Total distance updated', {
            previousTotal: prevDistance,
            addedDistance: distance,
            newTotal
          })
          return newTotal
        })
      } else {
        console.log('📏 useTrip.addRoutePoint: First point, no distance calculation')
      }

      return newPoints
    })

    // Update trip with new location data
    setCurrentTrip(prev => prev ? {
      ...prev,
      endLocation: location,
      startLocation: prev.startLocation || location,
      updatedAt: Date.now()
    } : null)
  }, [currentTrip])

  // Add a manual waypoint
  const addWaypoint = useCallback((location: LocationData, note?: string) => {
    if (!currentTrip) return

    const waypoint: Waypoint = {
      ...location,
      id: generateId(),
      tripId: currentTrip.id,
      type: 'manual',
      note
    }

    setCurrentTrip(prev => prev ? {
      ...prev,
      waypoints: [...prev.waypoints, waypoint],
      updatedAt: Date.now()
    } : null)
  }, [currentTrip])

  // Get trip duration
  const getTripDuration = useCallback(() => {
    if (!currentTrip || !currentTrip.startTime) return 0

    const endTime = currentTrip.endTime || Date.now()
    return endTime - currentTrip.startTime
  }, [currentTrip])

  // Auto-save trip data during recording
  useEffect(() => {
    if (currentTrip && (currentTrip.status === 'active' || currentTrip.status === 'paused')) {
      const autoSave = async () => {
        try {
          const updatedTrip = {
            ...currentTrip,
            route: [...routePoints],
            totalDistance,
            updatedAt: Date.now()
          }
          await saveTrip(updatedTrip)
        } catch (error) {
          console.error('Auto-save failed:', error)
        }
      }

      // Auto-save every 30 seconds during active recording
      const interval = setInterval(autoSave, 30000)
      return () => clearInterval(interval)
    }
  }, [currentTrip, routePoints, totalDistance, saveTrip])

  return {
    // State
    currentTrip,
    tripStatus,
    routePoints,
    totalDistance,

    // Actions
    startTrip,
    pauseTrip,
    resumeTrip,
    stopTrip,
    updateTripName,
    addRoutePoint,
    addWaypoint,

    // Getters
    getTripDuration,
    isRecording
  }
}