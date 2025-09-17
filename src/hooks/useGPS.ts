import { useState, useEffect, useCallback, useRef } from 'react'
import { LocationData, GPSState, DemoTripConfig, DemoSimulationState } from '@/types'
import { gpsService } from '@/services/gpsService'
import { DemoTripSimulator } from '@/services/demoTripSimulator'

export interface UseGPSReturn {
  // State
  gpsState: GPSState
  isTracking: boolean
  currentLocation: LocationData | null
  error: string | null
  permission: 'granted' | 'denied' | 'prompt' | 'unknown'

  // Speed data
  currentSpeed: number
  averageSpeed: number
  maxSpeed: number

  // Demo mode
  isDemoMode: boolean
  demoState: DemoSimulationState | null

  // Actions
  startTracking: () => Promise<void>
  stopTracking: () => void
  getCurrentLocation: () => Promise<LocationData>
  clearSession: () => void

  // Demo actions
  startDemoMode: (config: DemoTripConfig) => void
  stopDemoMode: () => void
  pauseDemoMode: () => void
  resumeDemoMode: () => void
  setDemoSpeedMultiplier: (multiplier: number) => void

  // Getters
  getSpeedInUnit: (unit: 'mph' | 'kmh') => {
    current: number
    average: number
    max: number
  }
}

export function useGPS(speedUnit: 'mph' | 'kmh' = 'mph'): UseGPSReturn {
  const [gpsState, setGpsState] = useState<GPSState>(gpsService.getCurrentState())
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [averageSpeed, setAverageSpeed] = useState(0)
  const [maxSpeed, setMaxSpeed] = useState(0)

  // Demo mode state
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [demoState, setDemoState] = useState<DemoSimulationState | null>(null)
  const demoSimulatorRef = useRef<DemoTripSimulator | null>(null)

  // Update speed values when GPS state changes
  const updateSpeedValues = useCallback(() => {
    setCurrentSpeed(gpsService.getCurrentSpeed(speedUnit))
    setAverageSpeed(gpsService.getAverageSpeed(speedUnit))
    setMaxSpeed(gpsService.getMaxSpeed(speedUnit))
  }, [speedUnit])

  // Subscribe to GPS service updates
  useEffect(() => {
    const unsubscribe = gpsService.subscribe((state) => {
      setGpsState(state)
      updateSpeedValues()
    })

    return unsubscribe
  }, [updateSpeedValues])

  // Update speed values when unit changes
  useEffect(() => {
    updateSpeedValues()
  }, [updateSpeedValues])

  // Actions
  const startTracking = useCallback(async () => {
    await gpsService.startTracking()
  }, [])

  const stopTracking = useCallback(() => {
    gpsService.stopTracking()
  }, [])

  const getCurrentLocation = useCallback(async () => {
    return await gpsService.getCurrentLocation()
  }, [])

  const clearSession = useCallback(() => {
    gpsService.clearSession()
    updateSpeedValues()
  }, [updateSpeedValues])

  const getSpeedInUnit = useCallback((unit: 'mph' | 'kmh') => ({
    current: gpsService.getCurrentSpeed(unit),
    average: gpsService.getAverageSpeed(unit),
    max: gpsService.getMaxSpeed(unit)
  }), [])

  // Demo mode functions
  const startDemoMode = useCallback((config: DemoTripConfig) => {
    console.log('Starting demo mode with config:', config)
    console.log('Route segments:', config.route.length)

    // Stop real GPS tracking if active
    if (gpsState.isTracking) {
      gpsService.stopTracking()
    }

    // Debug route before creating simulator
    console.log('🔍 useGPS: Route data being passed to DemoTripSimulator:', {
      routeSegments: config.route.length,
      firstSegmentCoords: config.route[0]?.coordinates?.length,
      lastSegmentCoords: config.route[config.route.length - 1]?.coordinates?.length,
      sampleSegment: config.route[0]
    })

    // Create demo simulator with actual coordinates
    console.log('📍 useGPS: COORDINATE FLOW - Passing coordinates to DemoTripSimulator:', {
      startCoordinates: config.startCoordinates,
      endCoordinates: config.endCoordinates,
      startAddress: config.startAddress,
      endAddress: config.endAddress
    })

    const simulator = new DemoTripSimulator(
      config.route,
      (location: LocationData) => {
        console.log('🚗 useGPS: Demo location update received:', {
          lat: location.latitude,
          lng: location.longitude,
          speed: location.speed,
          timestamp: location.timestamp
        })

        // Update GPS state with simulated location
        setGpsState(prev => ({
          ...prev,
          currentLocation: location,
          isTracking: true
        }))

        // Add to GPS service for speed calculations
        console.log('🚗 useGPS: Adding location to GPS service for speed calculations')
        gpsService.addLocationData(location)
        updateSpeedValues()
      },
      config.speedMultiplier,
      config.startCoordinates,  // Pass actual start coordinates
      config.endCoordinates     // Pass actual end coordinates
    )

    demoSimulatorRef.current = simulator
    setIsDemoMode(true)
    setDemoState(simulator.getState())

    // Start simulation
    console.log('Starting demo simulator...')
    simulator.start()
  }, [gpsState.isTracking, updateSpeedValues])

  const stopDemoMode = useCallback(() => {
    if (demoSimulatorRef.current) {
      demoSimulatorRef.current.stop()
      demoSimulatorRef.current = null
    }
    setIsDemoMode(false)
    setDemoState(null)
    setGpsState(prev => ({
      ...prev,
      isTracking: false,
      currentLocation: null
    }))
  }, [])

  const pauseDemoMode = useCallback(() => {
    if (demoSimulatorRef.current) {
      demoSimulatorRef.current.pause()
      setDemoState(demoSimulatorRef.current.getState())
    }
  }, [])

  const resumeDemoMode = useCallback(() => {
    if (demoSimulatorRef.current) {
      demoSimulatorRef.current.resume()
      setDemoState(demoSimulatorRef.current.getState())
    }
  }, [])

  const setDemoSpeedMultiplier = useCallback((multiplier: number) => {
    if (demoSimulatorRef.current) {
      demoSimulatorRef.current.setSpeedMultiplier(multiplier)
      setDemoState(demoSimulatorRef.current.getState())
    }
  }, [])

  // Update demo state periodically
  useEffect(() => {
    if (!isDemoMode || !demoSimulatorRef.current) return

    const interval = setInterval(() => {
      if (demoSimulatorRef.current) {
        setDemoState(demoSimulatorRef.current.getState())
      }
    }, 2000) // Update every 2 seconds to match GPS throttling

    return () => clearInterval(interval)
  }, [isDemoMode])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (demoSimulatorRef.current) {
        demoSimulatorRef.current.stop()
      }
    }
  }, [])

  console.log('🌍 useGPS HOOK: Returning state to components:', {
    isDemoMode,
    isTracking: isDemoMode ? true : gpsState.isTracking,
    hasCurrentLocation: !!gpsState.currentLocation,
    currentLocationCoords: gpsState.currentLocation ?
      `${gpsState.currentLocation.latitude.toFixed(6)}, ${gpsState.currentLocation.longitude.toFixed(6)}` : 'none',
    error: gpsState.error,
    permission: gpsState.permission
  })

  return {
    // State
    gpsState,
    isTracking: isDemoMode ? true : gpsState.isTracking,
    currentLocation: gpsState.currentLocation,
    error: gpsState.error,
    permission: gpsState.permission,

    // Speed data
    currentSpeed,
    averageSpeed,
    maxSpeed,

    // Demo mode
    isDemoMode,
    demoState,

    // Actions
    startTracking,
    stopTracking,
    getCurrentLocation,
    clearSession,

    // Demo actions
    startDemoMode,
    stopDemoMode,
    pauseDemoMode,
    resumeDemoMode,
    setDemoSpeedMultiplier,

    // Getters
    getSpeedInUnit
  }
}