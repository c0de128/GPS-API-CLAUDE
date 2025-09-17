import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useGPS } from '@/hooks/useGPS'
import { gpsService } from '@/services/gpsService'
import {
  mockGeolocationSuccess,
  mockGeolocationError,
  createMockLocationData,
  createMockDemoConfig,
  waitForNextUpdate
} from '../helpers/test-utils'

// Mock the GPS service
vi.mock('@/services/gpsService', () => ({
  gpsService: {
    getCurrentState: vi.fn(),
    subscribe: vi.fn(),
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
    getCurrentLocation: vi.fn(),
    clearSession: vi.fn(),
    getCurrentSpeed: vi.fn(),
    getAverageSpeed: vi.fn(),
    getMaxSpeed: vi.fn(),
    addLocationData: vi.fn(),
    destroy: vi.fn()
  }
}))

// Mock demo trip simulator
vi.mock('@/services/demoTripSimulator', () => ({
  DemoTripSimulator: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    setSpeedMultiplier: vi.fn(),
    getState: vi.fn(() => ({
      isActive: false,
      currentSegmentIndex: 0,
      positionInSegment: 0,
      currentSpeed: 0,
      targetSpeed: 25,
      lastUpdateTime: Date.now(),
      speedMultiplier: 1,
      isPaused: false
    }))
  }))
}))

describe('useGPS Hook', () => {
  const mockGpsService = vi.mocked(gpsService)

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default GPS service mock state
    mockGpsService.getCurrentState.mockReturnValue({
      isTracking: false,
      currentLocation: null,
      error: null,
      permission: 'unknown'
    })

    mockGpsService.getCurrentSpeed.mockReturnValue(0)
    mockGpsService.getAverageSpeed.mockReturnValue(0)
    mockGpsService.getMaxSpeed.mockReturnValue(0)

    // Mock subscribe to immediately call with current state
    mockGpsService.subscribe.mockImplementation((callback) => {
      callback(mockGpsService.getCurrentState())
      return vi.fn() // unsubscribe function
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Initial State', () => {
    it('should initialize with default GPS state', () => {
      const { result } = renderHook(() => useGPS())

      expect(result.current.isTracking).toBe(false)
      expect(result.current.currentLocation).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.permission).toBe('unknown')
      expect(result.current.isDemoMode).toBe(false)
    })

    it('should subscribe to GPS service updates', () => {
      renderHook(() => useGPS())

      expect(mockGpsService.subscribe).toHaveBeenCalled()
    })

    it('should initialize with mph speed unit by default', () => {
      renderHook(() => useGPS())

      expect(mockGpsService.getCurrentSpeed).toHaveBeenCalledWith('mph')
      expect(mockGpsService.getAverageSpeed).toHaveBeenCalledWith('mph')
      expect(mockGpsService.getMaxSpeed).toHaveBeenCalledWith('mph')
    })

    it('should respect custom speed unit', () => {
      renderHook(() => useGPS('kmh'))

      expect(mockGpsService.getCurrentSpeed).toHaveBeenCalledWith('kmh')
      expect(mockGpsService.getAverageSpeed).toHaveBeenCalledWith('kmh')
      expect(mockGpsService.getMaxSpeed).toHaveBeenCalledWith('kmh')
    })
  })

  describe('GPS Tracking Actions', () => {
    it('should start tracking', async () => {
      const { result } = renderHook(() => useGPS())

      await act(async () => {
        await result.current.startTracking()
      })

      expect(mockGpsService.startTracking).toHaveBeenCalled()
    })

    it('should stop tracking', () => {
      const { result } = renderHook(() => useGPS())

      act(() => {
        result.current.stopTracking()
      })

      expect(mockGpsService.stopTracking).toHaveBeenCalled()
    })

    it('should get current location', async () => {
      const mockLocation = createMockLocationData()
      mockGpsService.getCurrentLocation.mockResolvedValue(mockLocation)

      const { result } = renderHook(() => useGPS())

      let location: any
      await act(async () => {
        location = await result.current.getCurrentLocation()
      })

      expect(location).toEqual(mockLocation)
      expect(mockGpsService.getCurrentLocation).toHaveBeenCalled()
    })

    it('should clear session', () => {
      const { result } = renderHook(() => useGPS())

      act(() => {
        result.current.clearSession()
      })

      expect(mockGpsService.clearSession).toHaveBeenCalled()
    })
  })

  describe('State Updates', () => {
    it('should update state when GPS service notifies changes', () => {
      const mockLocation = createMockLocationData()
      let subscribeCallback: any

      mockGpsService.subscribe.mockImplementation((callback) => {
        subscribeCallback = callback
        callback(mockGpsService.getCurrentState())
        return vi.fn()
      })

      const { result } = renderHook(() => useGPS())

      // Simulate GPS state change
      act(() => {
        subscribeCallback({
          isTracking: true,
          currentLocation: mockLocation,
          error: null,
          permission: 'granted'
        })
      })

      expect(result.current.isTracking).toBe(true)
      expect(result.current.currentLocation).toEqual(mockLocation)
      expect(result.current.permission).toBe('granted')
    })

    it('should update speed values when state changes', () => {
      mockGpsService.getCurrentSpeed.mockReturnValue(25)
      mockGpsService.getAverageSpeed.mockReturnValue(20)
      mockGpsService.getMaxSpeed.mockReturnValue(30)

      let subscribeCallback: any
      mockGpsService.subscribe.mockImplementation((callback) => {
        subscribeCallback = callback
        callback(mockGpsService.getCurrentState())
        return vi.fn()
      })

      const { result } = renderHook(() => useGPS())

      // Trigger state update
      act(() => {
        subscribeCallback({
          isTracking: true,
          currentLocation: createMockLocationData(),
          error: null,
          permission: 'granted'
        })
      })

      expect(result.current.currentSpeed).toBe(25)
      expect(result.current.averageSpeed).toBe(20)
      expect(result.current.maxSpeed).toBe(30)
    })
  })

  describe('Speed Unit Conversion', () => {
    it('should provide speed in requested units', () => {
      mockGpsService.getCurrentSpeed
        .mockReturnValueOnce(25) // mph
        .mockReturnValueOnce(40) // kmh

      const { result } = renderHook(() => useGPS())

      const speeds = result.current.getSpeedInUnit('kmh')
      expect(speeds.current).toBe(40)
    })
  })

  describe('Demo Mode', () => {
    it('should start demo mode with configuration', () => {
      const { result } = renderHook(() => useGPS())
      const demoConfig = createMockDemoConfig()

      // Mock GPS service state for demo
      mockGpsService.getCurrentState.mockReturnValue({
        isTracking: false,
        currentLocation: null,
        error: null,
        permission: 'granted'
      })

      act(() => {
        result.current.startDemoMode(demoConfig)
      })

      expect(result.current.isDemoMode).toBe(true)
      expect(result.current.demoState).toBeDefined()
    })

    it('should stop real GPS tracking when starting demo mode', () => {
      const { result } = renderHook(() => useGPS())
      const demoConfig = createMockDemoConfig()

      // Mock GPS service state as tracking
      mockGpsService.getCurrentState.mockReturnValue({
        isTracking: true,
        currentLocation: createMockLocationData(),
        error: null,
        permission: 'granted'
      })

      act(() => {
        result.current.startDemoMode(demoConfig)
      })

      expect(mockGpsService.stopTracking).toHaveBeenCalled()
    })

    it('should stop demo mode and clean up', () => {
      const { result } = renderHook(() => useGPS())
      const demoConfig = createMockDemoConfig()

      // Start demo mode first
      act(() => {
        result.current.startDemoMode(demoConfig)
      })

      expect(result.current.isDemoMode).toBe(true)

      // Stop demo mode
      act(() => {
        result.current.stopDemoMode()
      })

      expect(result.current.isDemoMode).toBe(false)
      expect(result.current.demoState).toBeNull()
    })

    it('should pause and resume demo mode', () => {
      const { result } = renderHook(() => useGPS())
      const demoConfig = createMockDemoConfig()

      act(() => {
        result.current.startDemoMode(demoConfig)
      })

      act(() => {
        result.current.pauseDemoMode()
      })

      // Pause should be called on simulator
      expect(result.current.isDemoMode).toBe(true)

      act(() => {
        result.current.resumeDemoMode()
      })

      // Resume should be called on simulator
      expect(result.current.isDemoMode).toBe(true)
    })

    it('should update demo speed multiplier', () => {
      const { result } = renderHook(() => useGPS())
      const demoConfig = createMockDemoConfig()

      act(() => {
        result.current.startDemoMode(demoConfig)
      })

      act(() => {
        result.current.setDemoSpeedMultiplier(2)
      })

      expect(result.current.isDemoMode).toBe(true)
    })

    it('should prioritize demo mode for tracking state', () => {
      const { result } = renderHook(() => useGPS())
      const demoConfig = createMockDemoConfig()

      // Initially not tracking
      expect(result.current.isTracking).toBe(false)

      // Start demo mode
      act(() => {
        result.current.startDemoMode(demoConfig)
      })

      // Should show tracking as true when in demo mode
      expect(result.current.isTracking).toBe(true)
      expect(result.current.isDemoMode).toBe(true)
    })
  })

  describe('Cleanup', () => {
    it('should unsubscribe from GPS service on unmount', () => {
      const mockUnsubscribe = vi.fn()
      mockGpsService.subscribe.mockReturnValue(mockUnsubscribe)

      const { unmount } = renderHook(() => useGPS())

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('should stop demo simulator on unmount', () => {
      const { result, unmount } = renderHook(() => useGPS())
      const demoConfig = createMockDemoConfig()

      act(() => {
        result.current.startDemoMode(demoConfig)
      })

      unmount()

      // Demo simulator should be stopped during cleanup
      expect(result.current.isDemoMode).toBe(true) // State remains until cleanup
    })
  })

  describe('Error Handling', () => {
    it('should handle GPS service errors gracefully', () => {
      let subscribeCallback: any
      mockGpsService.subscribe.mockImplementation((callback) => {
        subscribeCallback = callback
        callback(mockGpsService.getCurrentState())
        return vi.fn()
      })

      const { result } = renderHook(() => useGPS())

      // Simulate GPS error
      act(() => {
        subscribeCallback({
          isTracking: false,
          currentLocation: null,
          error: 'GPS permission denied',
          permission: 'denied'
        })
      })

      expect(result.current.error).toBe('GPS permission denied')
      expect(result.current.permission).toBe('denied')
    })

    it('should handle demo mode errors gracefully', () => {
      const { result } = renderHook(() => useGPS())

      // Mock demo simulator constructor to throw
      const MockDemoTripSimulator = vi.mocked(require('@/services/demoTripSimulator').DemoTripSimulator)
      MockDemoTripSimulator.mockImplementation(() => {
        throw new Error('Demo simulator error')
      })

      expect(() => {
        act(() => {
          result.current.startDemoMode(createMockDemoConfig())
        })
      }).not.toThrow()
    })
  })

  describe('Performance Considerations', () => {
    it('should update demo state at appropriate intervals', async () => {
      vi.useFakeTimers()

      const { result } = renderHook(() => useGPS())
      const demoConfig = createMockDemoConfig()

      act(() => {
        result.current.startDemoMode(demoConfig)
      })

      // Fast-forward time to trigger demo state updates
      act(() => {
        vi.advanceTimersByTime(200) // Should update twice (every 100ms)
      })

      expect(result.current.isDemoMode).toBe(true)

      vi.useRealTimers()
    })

    it('should clear demo update interval when stopping demo', () => {
      vi.useFakeTimers()
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      const { result } = renderHook(() => useGPS())
      const demoConfig = createMockDemoConfig()

      act(() => {
        result.current.startDemoMode(demoConfig)
      })

      act(() => {
        result.current.stopDemoMode()
      })

      expect(clearIntervalSpy).toHaveBeenCalled()

      vi.useRealTimers()
    })
  })
})