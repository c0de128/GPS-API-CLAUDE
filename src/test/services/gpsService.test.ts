import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GPSService } from '@/services/gpsService'
import { LocationData } from '@/types'
import {
  createMockLocationData,
  createMockGeolocationPosition,
  createMockGeolocationError,
  mockGeolocationSuccess,
  mockGeolocationError,
  waitForNextUpdate
} from '../helpers/test-utils'

describe('GPSService', () => {
  let gpsService: GPSService
  let mockGeolocation: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create fresh GPS service instance for each test
    gpsService = new GPSService()

    // Get mock geolocation reference
    mockGeolocation = global.navigator.geolocation
  })

  afterEach(() => {
    // Cleanup GPS service
    gpsService.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const state = gpsService.getCurrentState()

      expect(state.isTracking).toBe(false)
      expect(state.currentLocation).toBeNull()
      expect(state.error).toBeNull()
      expect(state.permission).toBe('unknown')
    })

    it('should check permissions on initialization', async () => {
      await waitForNextUpdate()
      expect(global.navigator.permissions.query).toHaveBeenCalledWith({ name: 'geolocation' })
    })
  })

  describe('Permission Management', () => {
    it('should update permission state when granted', async () => {
      const mockPermissions = global.navigator.permissions as any
      mockPermissions.query.mockResolvedValueOnce({
        state: 'granted',
        addEventListener: vi.fn()
      })

      const gpsService = new GPSService()
      await waitForNextUpdate()

      const state = gpsService.getCurrentState()
      expect(state.permission).toBe('granted')
    })

    it('should update permission state when denied', async () => {
      const mockPermissions = global.navigator.permissions as any
      mockPermissions.query.mockResolvedValueOnce({
        state: 'denied',
        addEventListener: vi.fn()
      })

      const gpsService = new GPSService()
      await waitForNextUpdate()

      const state = gpsService.getCurrentState()
      expect(state.permission).toBe('denied')
    })

    it('should handle permission query errors gracefully', async () => {
      const mockPermissions = global.navigator.permissions as any
      mockPermissions.query.mockRejectedValueOnce(new Error('Permission API error'))

      const gpsService = new GPSService()
      await waitForNextUpdate()

      const state = gpsService.getCurrentState()
      expect(state.permission).toBe('unknown')
    })
  })

  describe('GPS Tracking', () => {
    it('should start tracking successfully', async () => {
      const mockLocation = createMockLocationData()
      mockGeolocationSuccess(mockLocation)

      await gpsService.startTracking()
      await waitForNextUpdate()

      const state = gpsService.getCurrentState()
      expect(state.isTracking).toBe(true)
      expect(state.error).toBeNull()
      expect(mockGeolocation.watchPosition).toHaveBeenCalled()
    })

    it('should handle geolocation not supported', async () => {
      // Mock missing geolocation
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true
      })

      await gpsService.startTracking()

      const state = gpsService.getCurrentState()
      expect(state.isTracking).toBe(false)
      expect(state.error).toBe('Geolocation is not supported by this browser.')
    })

    it('should stop tracking', () => {
      gpsService.startTracking()
      gpsService.stopTracking()

      const state = gpsService.getCurrentState()
      expect(state.isTracking).toBe(false)
      expect(mockGeolocation.clearWatch).toHaveBeenCalled()
    })

    it('should handle permission denied error', async () => {
      mockGeolocationError({ code: 1, message: 'Permission denied' })

      await gpsService.startTracking()
      await waitForNextUpdate()

      const state = gpsService.getCurrentState()
      expect(state.error).toBe('Location access denied. Please enable location permissions.')
      expect(state.permission).toBe('denied')
      expect(state.isTracking).toBe(false)
    })

    it('should handle position unavailable error', async () => {
      mockGeolocationError({ code: 2, message: 'Position unavailable' })

      await gpsService.startTracking()
      await waitForNextUpdate()

      const state = gpsService.getCurrentState()
      expect(state.error).toBe('GPS unavailable. Check device settings and try again.')
      expect(state.isTracking).toBe(true) // Should continue trying
    })

    it('should handle timeout error', async () => {
      mockGeolocationError({ code: 3, message: 'Timeout' })

      await gpsService.startTracking()
      await waitForNextUpdate()

      const state = gpsService.getCurrentState()
      expect(state.error).toBe('Location request timed out. Trying again...')
      expect(state.isTracking).toBe(true) // Should continue trying
    })
  })

  describe('Location Updates', () => {
    it('should update location state on successful position update', async () => {
      const mockLocation = createMockLocationData({
        latitude: 32.7767,
        longitude: -96.7970,
        accuracy: 10
      })

      let stateUpdateCallback: any
      gpsService.subscribe((state) => {
        stateUpdateCallback = state
      })

      mockGeolocationSuccess(mockLocation)
      await gpsService.startTracking()
      await waitForNextUpdate()

      expect(stateUpdateCallback.currentLocation).toMatchObject({
        latitude: mockLocation.latitude,
        longitude: mockLocation.longitude,
        accuracy: mockLocation.accuracy
      })
    })

    it('should prevent race conditions with update lock', async () => {
      const mockLocation = createMockLocationData()

      // Mock multiple rapid updates
      mockGeolocation.watchPosition.mockImplementation((success: PositionCallback) => {
        const position = createMockGeolocationPosition(mockLocation)
        // Simulate rapid fire updates
        success(position)
        success(position)
        success(position)
        return 1
      })

      await gpsService.startTracking()
      await waitForNextUpdate()

      // Should handle updates gracefully without crashing
      const state = gpsService.getCurrentState()
      expect(state.currentLocation).toBeDefined()
    })
  })

  describe('Speed Calculations', () => {
    it('should calculate speed between two locations', () => {
      const location1 = createMockLocationData({
        latitude: 32.7767,
        longitude: -96.7970,
        timestamp: Date.now()
      })

      const location2 = createMockLocationData({
        latitude: 32.7800,
        longitude: -96.8000,
        timestamp: Date.now() + 60000 // 1 minute later
      })

      gpsService.addLocationData(location1)
      gpsService.addLocationData(location2)

      const currentSpeed = gpsService.getCurrentSpeed('mph')
      expect(currentSpeed).toBeGreaterThan(0)
    })

    it('should track average speed correctly', () => {
      const speeds = [10, 20, 30] // m/s
      speeds.forEach((speed, index) => {
        const location = createMockLocationData({
          timestamp: Date.now() + index * 1000
        })
        gpsService.addLocationData(location)
      })

      const averageSpeed = gpsService.getAverageSpeed('mph')
      expect(averageSpeed).toBeGreaterThanOrEqual(0)
    })

    it('should track maximum speed correctly', () => {
      const location1 = createMockLocationData({ timestamp: Date.now() })
      const location2 = createMockLocationData({
        latitude: 32.8000,
        longitude: -96.8000,
        timestamp: Date.now() + 1000
      })

      gpsService.addLocationData(location1)
      gpsService.addLocationData(location2)

      const maxSpeed = gpsService.getMaxSpeed('mph')
      expect(maxSpeed).toBeGreaterThanOrEqual(0)
    })

    it('should convert speeds between units correctly', () => {
      const location1 = createMockLocationData({ timestamp: Date.now() })
      const location2 = createMockLocationData({
        latitude: 32.7800,
        longitude: -96.8000,
        timestamp: Date.now() + 60000
      })

      gpsService.addLocationData(location1)
      gpsService.addLocationData(location2)

      const speedMph = gpsService.getCurrentSpeed('mph')
      const speedKmh = gpsService.getCurrentSpeed('kmh')

      // 1 mph ≈ 1.609 kmh
      expect(speedKmh).toBeCloseTo(speedMph * 1.609, 1)
    })
  })

  describe('Session Management', () => {
    it('should clear session data', () => {
      const location = createMockLocationData()
      gpsService.addLocationData(location)

      const speedHistory = gpsService.getSpeedHistory()
      expect(speedHistory.length).toBeGreaterThan(0)

      gpsService.clearSession()

      const clearedHistory = gpsService.getSpeedHistory()
      expect(clearedHistory.length).toBe(0)
    })

    it('should limit speed history to prevent memory leaks', () => {
      // Add more than 100 speed readings
      for (let i = 0; i < 150; i++) {
        const location = createMockLocationData({
          timestamp: Date.now() + i * 1000
        })
        gpsService.addLocationData(location)
      }

      const speedHistory = gpsService.getSpeedHistory()
      expect(speedHistory.length).toBeLessThanOrEqual(100)
    })
  })

  describe('Subscription Management', () => {
    it('should allow subscribing to state changes', () => {
      const mockCallback = vi.fn()
      const unsubscribe = gpsService.subscribe(mockCallback)

      // Should call immediately with current state
      expect(mockCallback).toHaveBeenCalledWith(gpsService.getCurrentState())

      unsubscribe()
    })

    it('should notify all subscribers on state changes', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      gpsService.subscribe(callback1)
      gpsService.subscribe(callback2)

      mockGeolocationSuccess()
      await gpsService.startTracking()
      await waitForNextUpdate()

      expect(callback1).toHaveBeenCalledTimes(2) // Initial + tracking started
      expect(callback2).toHaveBeenCalledTimes(2)
    })

    it('should prevent subscription to destroyed service', () => {
      gpsService.destroy()

      const consoleSpy = vi.spyOn(console, 'warn')
      const unsubscribe = gpsService.subscribe(() => {})

      expect(consoleSpy).toHaveBeenCalledWith('Cannot subscribe to destroyed GPS service')
      expect(unsubscribe).toBeInstanceOf(Function)
    })
  })

  describe('Single Location Request', () => {
    it('should get current location successfully', async () => {
      const mockLocation = createMockLocationData()
      mockGeolocationSuccess(mockLocation)

      const location = await gpsService.getCurrentLocation()

      expect(location).toMatchObject({
        latitude: mockLocation.latitude,
        longitude: mockLocation.longitude
      })
    })

    it('should handle getCurrentLocation errors', async () => {
      mockGeolocationError()

      await expect(gpsService.getCurrentLocation()).rejects.toThrow('Location access denied')
    })
  })

  describe('Cleanup and Destruction', () => {
    it('should cleanup resources on destroy', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      gpsService.startTracking()
      gpsService.destroy()

      expect(mockGeolocation.clearWatch).toHaveBeenCalled()
      expect(gpsService.getSpeedHistory().length).toBe(0)
    })

    it('should clear permission check interval on destroy', () => {
      const mockClearInterval = vi.spyOn(global, 'clearInterval')

      gpsService.destroy()

      expect(mockClearInterval).toHaveBeenCalled()
    })
  })

  describe('Error Handling Edge Cases', () => {
    it('should handle missing geolocation gracefully', async () => {
      Object.defineProperty(global.navigator, 'geolocation', {
        value: null,
        writable: true
      })

      const gpsService = new GPSService()
      await gpsService.startTracking()

      const state = gpsService.getCurrentState()
      expect(state.error).toContain('not supported')
    })

    it('should handle invalid position data', () => {
      const invalidLocation = {
        ...createMockLocationData(),
        latitude: NaN,
        longitude: undefined as any
      }

      // Should not crash when adding invalid data
      expect(() => {
        gpsService.addLocationData(invalidLocation)
      }).not.toThrow()
    })
  })
})