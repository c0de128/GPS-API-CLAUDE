import { LocationData, SpeedData, GPSState } from '@/types'
import { calculateSpeed, convertSpeed } from '@/lib/utils'
import { monitoring } from '@/utils/monitoring'

export class GPSService {
  private watchId: number | null = null
  private previousLocation: LocationData | null = null
  private listeners: Set<(state: GPSState) => void> = new Set()
  private speedHistory: SpeedData[] = []
  private currentState: GPSState = {
    isTracking: false,
    currentLocation: null,
    error: null,
    permission: 'unknown'
  }

  constructor() {
    this.checkPermission()
    monitoring.logGPSEvent('GPS service initialized')
  }

  // Check current geolocation permission status
  private async checkPermission(): Promise<void> {
    if (!navigator.permissions) {
      this.updateState({ permission: 'unknown' })
      return
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' })
      this.updateState({ permission: result.state as any })

      result.addEventListener('change', () => {
        this.updateState({ permission: result.state as any })
      })
    } catch (error) {
      this.updateState({ permission: 'unknown' })
    }
  }

  // Subscribe to GPS state changes
  subscribe(listener: (state: GPSState) => void): () => void {
    this.listeners.add(listener)
    listener(this.currentState) // Send current state immediately

    return () => {
      this.listeners.delete(listener)
    }
  }

  // Update state and notify all listeners
  private updateState(updates: Partial<GPSState>): void {
    this.currentState = { ...this.currentState, ...updates }
    this.listeners.forEach(listener => listener(this.currentState))
  }

  // Start GPS tracking
  async startTracking(): Promise<void> {
    monitoring.logGPSEvent('Starting GPS tracking')

    if (!navigator.geolocation) {
      const error = 'Geolocation is not supported by this browser.'
      monitoring.logError({ message: error, details: { category: 'gps' } })
      this.updateState({
        error,
        isTracking: false
      })
      return
    }

    if (this.watchId !== null) {
      this.stopTracking()
    }

    this.updateState({
      isTracking: true,
      error: null,
      currentLocation: null
    })

    monitoring.logGPSEvent('GPS tracking started successfully')

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000 // Accept locations up to 1 second old
    }

    this.watchId = navigator.geolocation.watchPosition(
      this.handleLocationUpdate.bind(this),
      this.handleLocationError.bind(this),
      options
    )
  }

  // Stop GPS tracking
  stopTracking(): void {
    monitoring.logGPSEvent('Stopping GPS tracking')

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }

    this.updateState({
      isTracking: false,
      error: null
    })

    // Reset tracking data
    this.previousLocation = null
    this.speedHistory = []

    monitoring.logGPSEvent('GPS tracking stopped')
  }

  // Handle successful location update
  private handleLocationUpdate(position: GeolocationPosition): void {
    monitoring.logGPSEvent('Location update received', { accuracy: position.coords.accuracy })

    const newLocation: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      altitude: position.coords.altitude || undefined,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed || undefined
    }

    // Calculate speed if we have a previous location
    let calculatedSpeed = 0
    if (this.previousLocation) {
      calculatedSpeed = calculateSpeed(
        this.previousLocation.latitude,
        this.previousLocation.longitude,
        this.previousLocation.timestamp,
        newLocation.latitude,
        newLocation.longitude,
        newLocation.timestamp
      )

      // Store speed data
      const speedData: SpeedData = {
        speed: calculatedSpeed,
        timestamp: newLocation.timestamp,
        location: newLocation,
        accuracy: newLocation.accuracy
      }

      this.speedHistory.push(speedData)

      // Keep only recent speed data (last 100 readings)
      if (this.speedHistory.length > 100) {
        this.speedHistory = this.speedHistory.slice(-100)
      }
    }

    this.previousLocation = newLocation
    this.updateState({
      currentLocation: newLocation,
      error: null
    })
  }

  // Handle geolocation errors
  private handleLocationError(error: GeolocationPositionError): void {
    monitoring.logError({
      message: `GPS error code ${error.code}: ${error.message}`,
      details: { code: error.code, category: 'gps' }
    })

    let errorMessage: string

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied. Please enable location permissions.'
        this.updateState({ permission: 'denied' })
        break
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'GPS unavailable. Check device settings and try again.'
        break
      case error.TIMEOUT:
        errorMessage = 'Location request timed out. Trying again...'
        break
      default:
        errorMessage = 'An unknown GPS error occurred.'
        break
    }

    this.updateState({
      error: errorMessage,
      isTracking: error.code !== error.PERMISSION_DENIED // Stop tracking on permission denied
    })
  }

  // Get current speed in specified units
  getCurrentSpeed(unit: 'mph' | 'kmh' = 'mph'): number {
    if (this.speedHistory.length === 0) return 0

    const latestSpeed = this.speedHistory[this.speedHistory.length - 1]
    return convertSpeed(latestSpeed.speed, unit)
  }

  // Get average speed for current session
  getAverageSpeed(unit: 'mph' | 'kmh' = 'mph'): number {
    if (this.speedHistory.length === 0) return 0

    const totalSpeed = this.speedHistory.reduce((sum, data) => sum + data.speed, 0)
    const averageSpeed = totalSpeed / this.speedHistory.length
    return convertSpeed(averageSpeed, unit)
  }

  // Get maximum speed for current session
  getMaxSpeed(unit: 'mph' | 'kmh' = 'mph'): number {
    if (this.speedHistory.length === 0) return 0

    const maxSpeed = Math.max(...this.speedHistory.map(data => data.speed))
    return convertSpeed(maxSpeed, unit)
  }

  // Get all speed data for current session
  getSpeedHistory(): SpeedData[] {
    return [...this.speedHistory]
  }

  // Get current GPS state
  getCurrentState(): GPSState {
    return { ...this.currentState }
  }

  // Request a single location update
  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            altitude: position.coords.altitude || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined
          }
          resolve(location)
        },
        (error) => {
          reject(new Error(this.getErrorMessage(error)))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      )
    })
  }

  // Get user-friendly error message
  private getErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied'
      case error.POSITION_UNAVAILABLE:
        return 'GPS unavailable'
      case error.TIMEOUT:
        return 'Location request timed out'
      default:
        return 'Unknown GPS error'
    }
  }

  // Clear all tracking data
  clearSession(): void {
    this.previousLocation = null
    this.speedHistory = []
  }

  // Add location data manually (for demo mode)
  addLocationData(location: LocationData): void {
    // Calculate speed if we have a previous location
    let calculatedSpeed = 0
    if (this.previousLocation) {
      calculatedSpeed = calculateSpeed(
        this.previousLocation.latitude,
        this.previousLocation.longitude,
        this.previousLocation.timestamp,
        location.latitude,
        location.longitude,
        location.timestamp
      )

      // Store speed data
      const speedData: SpeedData = {
        speed: calculatedSpeed,
        timestamp: location.timestamp,
        location: location,
        accuracy: location.accuracy
      }

      this.speedHistory.push(speedData)

      // Keep only recent speed data (last 100 readings)
      if (this.speedHistory.length > 100) {
        this.speedHistory = this.speedHistory.slice(-100)
      }
    }

    this.previousLocation = location
  }
}

// Create singleton instance
export const gpsService = new GPSService()