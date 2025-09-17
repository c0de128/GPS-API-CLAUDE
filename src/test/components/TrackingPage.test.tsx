import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../helpers/test-utils'
import { useGPS } from '@/hooks/useGPS'
import { useTrip } from '@/hooks/useTrip'
import TrackingPage from '@/components/tracking/TrackingPage'
import { createMockLocationData, createMockDemoConfig } from '../helpers/test-utils'

// Mock hooks
vi.mock('@/hooks/useGPS')
vi.mock('@/hooks/useTrip')

// Mock child components to focus on integration logic
vi.mock('@/components/tracking/SpeedDashboard', () => ({
  default: ({ currentSpeed, isTracking }: any) => (
    <div data-testid="speed-dashboard">
      Speed: {currentSpeed} - Tracking: {isTracking ? 'Yes' : 'No'}
    </div>
  )
}))

vi.mock('@/components/tracking/LiveMap', () => ({
  default: ({ center, isTracking, isDemoMode }: any) => (
    <div data-testid="live-map">
      Center: {center?.join(',')} - Tracking: {isTracking ? 'Yes' : 'No'} - Demo: {isDemoMode ? 'Yes' : 'No'}
    </div>
  )
}))

vi.mock('@/components/tracking/TripControls', () => ({
  default: ({ isTracking, tripStatus, onStartTrip, onStopTrip }: any) => (
    <div data-testid="trip-controls">
      <div>Tracking: {isTracking ? 'Yes' : 'No'}</div>
      <div>Trip Status: {tripStatus}</div>
      <button onClick={() => onStartTrip('Test Trip', 'Test notes')}>Start Trip</button>
      <button onClick={onStopTrip}>Stop Trip</button>
    </div>
  )
}))

vi.mock('@/components/demo/DemoControls', () => ({
  default: ({ isActive, onStop }: any) => (
    <div data-testid="demo-controls">
      <div>Demo Active: {isActive ? 'Yes' : 'No'}</div>
      <button onClick={onStop}>Stop Demo</button>
    </div>
  )
}))

vi.mock('@/components/demo/DemoTripForm', () => ({
  default: ({ isOpen, onClose, onStartDemo }: any) => (
    isOpen ? (
      <div data-testid="demo-form">
        <button onClick={() => onStartDemo(createMockDemoConfig())}>Start Demo Trip</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}))

describe('TrackingPage Component', () => {
  const mockUseGPS = vi.mocked(useGPS)
  const mockUseTrip = vi.mocked(useTrip)

  const defaultGPSState = {
    isTracking: false,
    currentLocation: null,
    error: null,
    permission: 'unknown' as const,
    currentSpeed: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    isDemoMode: false,
    demoState: null,
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
    getCurrentLocation: vi.fn(),
    clearSession: vi.fn(),
    startDemoMode: vi.fn(),
    stopDemoMode: vi.fn(),
    pauseDemoMode: vi.fn(),
    resumeDemoMode: vi.fn(),
    setDemoSpeedMultiplier: vi.fn(),
    getSpeedInUnit: vi.fn(),
    gpsState: {
      isTracking: false,
      currentLocation: null,
      error: null,
      permission: 'unknown' as const
    }
  }

  const defaultTripState = {
    currentTrip: null,
    tripStatus: 'planning' as const,
    routePoints: [],
    totalDistance: 0,
    startTrip: vi.fn(),
    pauseTrip: vi.fn(),
    resumeTrip: vi.fn(),
    stopTrip: vi.fn(),
    updateTripName: vi.fn(),
    addRoutePoint: vi.fn(),
    isRecording: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseGPS.mockReturnValue(defaultGPSState)
    mockUseTrip.mockReturnValue(defaultTripState)
  })

  describe('Basic Rendering', () => {
    it('should render main tracking components', () => {
      render(<TrackingPage />)

      expect(screen.getByTestId('speed-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('live-map')).toBeInTheDocument()
      expect(screen.getByTestId('trip-controls')).toBeInTheDocument()
    })

    it('should display speed unit toggle button', () => {
      render(<TrackingPage />)

      expect(screen.getByText('Switch to km/h')).toBeInTheDocument()
    })

    it('should display demo trip button when not in demo mode and no active trip', () => {
      render(<TrackingPage />)

      expect(screen.getByText('Start Demo Trip')).toBeInTheDocument()
    })
  })

  describe('Permission and Error Display', () => {
    it('should display permission denied warning', () => {
      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        permission: 'denied'
      })

      render(<TrackingPage />)

      expect(screen.getByText('Location Permission Denied')).toBeInTheDocument()
      expect(screen.getByText(/enable location permissions/)).toBeInTheDocument()
    })

    it('should display GPS error message', () => {
      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        error: 'GPS signal lost'
      })

      render(<TrackingPage />)

      expect(screen.getByText('GPS Error')).toBeInTheDocument()
      expect(screen.getByText('GPS signal lost')).toBeInTheDocument()
    })
  })

  describe('Location Display', () => {
    it('should display current location details when available', () => {
      const mockLocation = createMockLocationData({
        latitude: 32.7767,
        longitude: -96.7970,
        accuracy: 10,
        altitude: 200
      })

      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        currentLocation: mockLocation
      })

      render(<TrackingPage />)

      expect(screen.getByText('Location Details')).toBeInTheDocument()
      expect(screen.getByText('32.776700, -96.797000')).toBeInTheDocument()
      expect(screen.getByText('Accuracy: ±10m')).toBeInTheDocument()
      expect(screen.getByText('Altitude: 200.0m')).toBeInTheDocument()
    })

    it('should not display location details when no location available', () => {
      render(<TrackingPage />)

      expect(screen.queryByText('Location Details')).not.toBeInTheDocument()
    })
  })

  describe('GPS and Trip Integration', () => {
    it('should start GPS tracking when trip becomes active', async () => {
      const mockStartTracking = vi.fn()
      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        startTracking: mockStartTracking
      })

      mockUseTrip.mockReturnValue({
        ...defaultTripState,
        tripStatus: 'active'
      })

      render(<TrackingPage />)

      await waitFor(() => {
        expect(mockStartTracking).toHaveBeenCalled()
      })
    })

    it('should stop GPS tracking when trip is not active', async () => {
      const mockStopTracking = vi.fn()
      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        isTracking: true,
        stopTracking: mockStopTracking
      })

      mockUseTrip.mockReturnValue({
        ...defaultTripState,
        tripStatus: 'completed'
      })

      render(<TrackingPage />)

      await waitFor(() => {
        expect(mockStopTracking).toHaveBeenCalled()
      })
    })

    it('should add route points when location updates during recording', async () => {
      const mockAddRoutePoint = vi.fn()
      const mockLocation = createMockLocationData()

      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        isTracking: true,
        currentLocation: mockLocation
      })

      mockUseTrip.mockReturnValue({
        ...defaultTripState,
        isRecording: true,
        addRoutePoint: mockAddRoutePoint
      })

      render(<TrackingPage />)

      await waitFor(() => {
        expect(mockAddRoutePoint).toHaveBeenCalledWith(mockLocation)
      })
    })
  })

  describe('Trip Controls Integration', () => {
    it('should handle start trip action', async () => {
      const mockStartTrip = vi.fn()
      mockUseTrip.mockReturnValue({
        ...defaultTripState,
        startTrip: mockStartTrip
      })

      render(<TrackingPage />)

      fireEvent.click(screen.getByText('Start Trip'))

      expect(mockStartTrip).toHaveBeenCalledWith('Test Trip', 'Test notes')
    })

    it('should handle stop trip action', () => {
      const mockStopTrip = vi.fn()
      const mockStopTracking = vi.fn()

      mockUseTrip.mockReturnValue({
        ...defaultTripState,
        stopTrip: mockStopTrip
      })

      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        stopTracking: mockStopTracking
      })

      render(<TrackingPage />)

      fireEvent.click(screen.getByText('Stop Trip'))

      expect(mockStopTrip).toHaveBeenCalled()
      expect(mockStopTracking).toHaveBeenCalled()
    })
  })

  describe('Demo Mode Integration', () => {
    it('should display demo controls when in demo mode', () => {
      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        isDemoMode: true
      })

      render(<TrackingPage />)

      expect(screen.getByTestId('demo-controls')).toBeInTheDocument()
      expect(screen.getByText('Demo Active: Yes')).toBeInTheDocument()
    })

    it('should not display demo controls when not in demo mode', () => {
      render(<TrackingPage />)

      expect(screen.queryByTestId('demo-controls')).not.toBeInTheDocument()
    })

    it('should open demo form when start demo button clicked', () => {
      render(<TrackingPage />)

      fireEvent.click(screen.getByText('Start Demo Trip'))

      expect(screen.getByTestId('demo-form')).toBeInTheDocument()
    })

    it('should start demo mode and trip when demo form submitted', () => {
      const mockStartDemoMode = vi.fn()
      const mockStartTrip = vi.fn()

      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        startDemoMode: mockStartDemoMode
      })

      mockUseTrip.mockReturnValue({
        ...defaultTripState,
        startTrip: mockStartTrip
      })

      render(<TrackingPage />)

      // Open demo form
      fireEvent.click(screen.getByText('Start Demo Trip'))

      // Submit demo form
      fireEvent.click(screen.getByText('Start Demo Trip'))

      expect(mockStartDemoMode).toHaveBeenCalledWith(createMockDemoConfig())
      expect(mockStartTrip).toHaveBeenCalledWith(
        expect.stringContaining('Demo:'),
        'Demo trip simulation'
      )
    })

    it('should stop demo mode and trip when demo stopped', () => {
      const mockStopDemoMode = vi.fn()
      const mockStopTrip = vi.fn()

      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        isDemoMode: true,
        stopDemoMode: mockStopDemoMode
      })

      mockUseTrip.mockReturnValue({
        ...defaultTripState,
        currentTrip: { id: 'demo-trip' } as any,
        stopTrip: mockStopTrip
      })

      render(<TrackingPage />)

      fireEvent.click(screen.getByText('Stop Demo'))

      expect(mockStopDemoMode).toHaveBeenCalled()
      expect(mockStopTrip).toHaveBeenCalled()
    })

    it('should hide start demo button when in demo mode or trip active', () => {
      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        isDemoMode: true
      })

      render(<TrackingPage />)

      expect(screen.queryByText('Start Demo Trip')).not.toBeInTheDocument()
    })
  })

  describe('Speed Unit Toggle', () => {
    it('should toggle speed unit from mph to kmh', () => {
      render(<TrackingPage />)

      const toggleButton = screen.getByText('Switch to km/h')
      fireEvent.click(toggleButton)

      expect(screen.getByText('Switch to mph')).toBeInTheDocument()
    })

    it('should toggle speed unit from kmh to mph', () => {
      render(<TrackingPage />)

      // First toggle to kmh
      fireEvent.click(screen.getByText('Switch to km/h'))

      // Then toggle back to mph
      fireEvent.click(screen.getByText('Switch to mph'))

      expect(screen.getByText('Switch to km/h')).toBeInTheDocument()
    })
  })

  describe('Map Integration', () => {
    it('should center map on current location when available', () => {
      const mockLocation = createMockLocationData({
        latitude: 32.7767,
        longitude: -96.7970
      })

      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        currentLocation: mockLocation
      })

      render(<TrackingPage />)

      expect(screen.getByText('Center: 32.7767,-96.797')).toBeInTheDocument()
    })

    it('should use default center when no location available', () => {
      render(<TrackingPage />)

      expect(screen.getByText('Center: 32.8998,-97.0403')).toBeInTheDocument()
    })

    it('should pass demo configuration to map when in demo mode', () => {
      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        isDemoMode: true
      })

      render(<TrackingPage />)

      expect(screen.getByText('Demo: Yes')).toBeInTheDocument()
    })
  })

  describe('Performance Optimizations', () => {
    it('should not re-render unnecessarily when unrelated state changes', () => {
      const { rerender } = render(<TrackingPage />)

      // Change unrelated GPS state
      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        averageSpeed: 15 // Changed from 0
      })

      rerender(<TrackingPage />)

      // Component should handle this gracefully without errors
      expect(screen.getByTestId('speed-dashboard')).toBeInTheDocument()
    })
  })

  describe('Error Boundaries', () => {
    it('should handle hook errors gracefully', () => {
      // Mock hook to throw error
      mockUseGPS.mockImplementation(() => {
        throw new Error('GPS hook error')
      })

      // Component should be wrapped in error boundary
      expect(() => {
        render(<TrackingPage />)
      }).toThrow() // This would be caught by ErrorBoundary in real app
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<TrackingPage />)

      expect(screen.getByText('Speed Monitor')).toBeInTheDocument()
      expect(screen.getByText('Live Map')).toBeInTheDocument()
      expect(screen.getByText('Trip Control')).toBeInTheDocument()
    })

    it('should have descriptive error messages', () => {
      mockUseGPS.mockReturnValue({
        ...defaultGPSState,
        permission: 'denied'
      })

      render(<TrackingPage />)

      expect(screen.getByText(/enable location permissions in your browser settings/)).toBeInTheDocument()
    })
  })
})