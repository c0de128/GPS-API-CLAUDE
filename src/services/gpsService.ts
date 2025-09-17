import { LocationData, SpeedData, GPSState } from '@/types'
import { calculateSpeed, convertSpeed } from '@/lib/utils'
import { monitoring } from '@/utils/monitoring'
import { ApiClient } from './apiClient'

// Initialize API client for sharing GPS data
const apiClient = new ApiClient({
  baseUrl: 'http://localhost:3003',
  websocketUrl: 'ws://localhost:3003/ws',
  apiKey: 'gps_dev_1452bec4359a449aa8b35c97adcbb900' // Development key
})

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
  private permissionCheckInterval: NodeJS.Timeout | null = null
  private isDestroyed = false
  private updateLock = false

  // GPS update throttling - only process location updates every 2 seconds
  private lastProcessedTime: number = 0
  private processingInterval: number = 2000 // 2 seconds in milliseconds

  // API update throttling - only send to API every 2 seconds
  private lastApiSentTime: number = 0
  private apiSendInterval: number = 2000 // 2 seconds in milliseconds

  // Trip recording throttling - only record location data every 2 seconds for trips
  private lastRecordedLocation: LocationData | null = null
  private lastRecordTime: number = 0
  private recordingInterval: number = 2000 // 2 seconds in milliseconds
  private tripRecordingListeners: Set<(location: LocationData) => void> = new Set()

  constructor() {
    this.checkPermission()
    monitoring.logGPSEvent('GPS service initialized')

    // Set up periodic permission check
    this.permissionCheckInterval = setInterval(() => {
      if (!this.isDestroyed) {
        this.checkPermission()
      }
    }, 30000) // Check every 30 seconds
  }

  // Check current geolocation permission status
  private async checkPermission(): Promise<void> {
    if (!navigator.permissions) {
      this.updateState({ permission: 'unknown' })
      return
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })

      // Properly type-check permission state
      const permissionState = this.mapPermissionState(result.state)
      this.updateState({ permission: permissionState })

      result.addEventListener('change', () => {
        const updatedState = this.mapPermissionState(result.state)
        this.updateState({ permission: updatedState })
      })
    } catch (error) {
      this.updateState({ permission: 'unknown' })
    }
  }

  // Map PermissionState to our GPSState permission type safely
  private mapPermissionState(state: PermissionState): 'granted' | 'denied' | 'prompt' | 'unknown' {
    switch (state) {
      case 'granted':
        return 'granted'
      case 'denied':
        return 'denied'
      case 'prompt':
        return 'prompt'
      default:
        return 'unknown'
    }
  }

  // Subscribe to GPS state changes
  subscribe(listener: (state: GPSState) => void): () => void {
    if (this.isDestroyed) {
      console.warn('Cannot subscribe to destroyed GPS service')
      return () => {}
    }

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
      maximumAge: 2000 // Accept locations up to 2 seconds old - ensures 2-second minimum update interval
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
    // Prevent race conditions with update lock
    if (this.updateLock || this.isDestroyed) {
      return
    }

    // Throttle GPS updates to every 2 seconds
    const now = Date.now()
    if (now - this.lastProcessedTime < this.processingInterval) {
      return
    }

    this.updateLock = true
    this.lastProcessedTime = now

    try {
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

      // Keep only recent speed data (last 100 readings) to prevent memory leak
      if (this.speedHistory.length > 100) {
        this.speedHistory = this.speedHistory.slice(-100)
      }
    }

    this.previousLocation = newLocation
    this.updateState({
      currentLocation: newLocation,
      error: null
    })

    // Check if we should record this location for trip recording (5-second interval)
    this.checkTripRecording(newLocation)
    } finally {
      this.updateLock = false
    }
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
    this.lastRecordedLocation = null
    this.lastRecordTime = 0
  }

  // Check if we should record this location for trip recording (2-second throttling)
  private checkTripRecording(location: LocationData): void {
    const now = Date.now()

    // Record if this is the first location or if 2 seconds have passed
    if (this.lastRecordTime === 0 || (now - this.lastRecordTime) >= this.recordingInterval) {
      this.lastRecordedLocation = location
      this.lastRecordTime = now

      // Notify all trip recording listeners
      this.tripRecordingListeners.forEach(listener => listener(location))

      monitoring.logGPSEvent('Location recorded for trip', {
        interval: now - this.lastRecordTime,
        accuracy: location.accuracy
      })
    }
  }

  // Subscribe to trip recording updates (5-second throttled)
  subscribeToTripRecording(listener: (location: LocationData) => void): () => void {
    if (this.isDestroyed) {
      console.warn('Cannot subscribe to destroyed GPS service')
      return () => {}
    }

    this.tripRecordingListeners.add(listener)

    // Send last recorded location immediately if available
    if (this.lastRecordedLocation) {
      listener(this.lastRecordedLocation)
    }

    return () => {
      this.tripRecordingListeners.delete(listener)
    }
  }

  // Get the last recorded location for trips
  getLastRecordedLocation(): LocationData | null {
    return this.lastRecordedLocation
  }

  // Set custom recording interval (for testing or different requirements)
  setRecordingInterval(intervalMs: number): void {
    this.recordingInterval = Math.max(1000, intervalMs) // Minimum 1 second
    monitoring.logGPSEvent('Recording interval changed', { intervalMs })
  }

  // Cleanup method to prevent memory leaks
  destroy(): void {
    this.isDestroyed = true

    // Stop tracking if active
    if (this.watchId !== null) {
      this.stopTracking()
    }

    // Clear permission check interval
    if (this.permissionCheckInterval) {
      clearInterval(this.permissionCheckInterval)
      this.permissionCheckInterval = null
    }

    // Clear all listeners
    this.listeners.clear()
    this.tripRecordingListeners.clear()

    // Clear speed history and trip recording data to free memory
    this.speedHistory = []
    this.previousLocation = null
    this.lastRecordedLocation = null
    this.lastRecordTime = 0

    monitoring.logGPSEvent('GPS service destroyed')
  }

  // Add location data manually (for demo mode)
  addLocationData(location: LocationData): void {
    // Throttle demo mode updates to every 2 seconds
    const now = Date.now()
    if (now - this.lastProcessedTime < this.processingInterval) {
      return
    }
    this.lastProcessedTime = now

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

      // Keep only recent speed data (last 100 readings) to prevent memory leak
      if (this.speedHistory.length > 100) {
        this.speedHistory = this.speedHistory.slice(-100)
      }
    }

    this.previousLocation = location

    // Send location data to API server (async, non-blocking) - throttled to every 2 seconds
    const apiNow = Date.now()
    if (apiNow - this.lastApiSentTime >= this.apiSendInterval) {
      this.lastApiSentTime = apiNow
      this.sendLocationToAPI(location).catch(error => {
        // Log API errors but don't interrupt the GPS service
        console.warn('🔌 Failed to send location to API:', error.message)
      })
    }

    // Also check trip recording for demo mode
    this.checkTripRecording(location)
  }

  // Send location data to API server for external access
  private async sendLocationToAPI(location: LocationData): Promise<void> {
    try {
      // Transform our LocationData to API format
      const apiLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        altitude: location.altitude,
        heading: location.heading,
        speed: location.speed || 0
      }

      console.log('🔌 Sending location to API:', {
        lat: apiLocation.latitude.toFixed(6),
        lng: apiLocation.longitude.toFixed(6),
        speed: apiLocation.speed
      })

      await apiClient.updateLocation(apiLocation)
      console.log('✅ Location sent to API successfully')
    } catch (error) {
      // Re-throw for error handling in caller
      throw new Error(`API communication failed: ${error}`)
    }
  }
}

// Create singleton instance
export const gpsService = new GPSService()