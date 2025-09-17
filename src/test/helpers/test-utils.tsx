import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LocationData, SpeedData, DemoTripConfig } from '@/types'

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Mock data factories for consistent testing
export const createMockLocationData = (overrides?: Partial<LocationData>): LocationData => ({
  latitude: 32.7767,
  longitude: -96.7970,
  accuracy: 10,
  timestamp: Date.now(),
  altitude: 200,
  heading: 90,
  speed: 15,
  ...overrides
})

export const createMockSpeedData = (overrides?: Partial<SpeedData>): SpeedData => ({
  speed: 15,
  timestamp: Date.now(),
  location: createMockLocationData(),
  accuracy: 10,
  ...overrides
})

export const createMockDemoConfig = (overrides?: Partial<DemoTripConfig>): DemoTripConfig => ({
  startAddress: '1010 Taylor Drive, Allen, TX 75013',
  endAddress: '880 W Euless Blvd, Euless, TX 76040',
  startCoordinates: [-96.6706, 33.1031],
  endCoordinates: [-97.0864, 32.8370],
  route: [
    {
      coordinates: [[-96.6706, 33.1031], [-96.8000, 33.0000]],
      distance: 1000,
      duration: 60,
      roadType: 'residential',
      speedLimit: 25,
      instruction: 'Head west'
    },
    {
      coordinates: [[-96.8000, 33.0000], [-97.0864, 32.8370]],
      distance: 2000,
      duration: 120,
      roadType: 'highway',
      speedLimit: 65,
      instruction: 'Continue on highway'
    }
  ],
  totalDistance: 3000,
  estimatedDuration: 180,
  speedMultiplier: 1,
  ...overrides
})

// Mock geolocation position
export const createMockGeolocationPosition = (location?: Partial<LocationData>): GeolocationPosition => {
  const mockLocation = createMockLocationData(location)
  return {
    coords: {
      latitude: mockLocation.latitude,
      longitude: mockLocation.longitude,
      accuracy: mockLocation.accuracy,
      altitude: mockLocation.altitude || null,
      altitudeAccuracy: null,
      heading: mockLocation.heading || null,
      speed: mockLocation.speed || null,
    },
    timestamp: mockLocation.timestamp,
  }
}

// Mock error factory
export const createMockGeolocationError = (code: number = 1, message: string = 'Permission denied'): GeolocationPositionError => ({
  code,
  message,
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
})

// Helper to wait for async state updates
export const waitForNextUpdate = () => new Promise(resolve => setTimeout(resolve, 0))

// Helper to mock successful geolocation
export const mockGeolocationSuccess = (location?: Partial<LocationData>) => {
  const position = createMockGeolocationPosition(location)
  const mockGeolocation = global.navigator.geolocation as any

  mockGeolocation.getCurrentPosition.mockImplementation((success: PositionCallback) => {
    setTimeout(() => success(position), 0)
  })

  mockGeolocation.watchPosition.mockImplementation((success: PositionCallback) => {
    setTimeout(() => success(position), 0)
    return 1
  })
}

// Helper to mock geolocation error
export const mockGeolocationError = (error?: Partial<GeolocationPositionError>) => {
  const mockError = createMockGeolocationError(error?.code, error?.message)
  const mockGeolocation = global.navigator.geolocation as any

  mockGeolocation.getCurrentPosition.mockImplementation((_: PositionCallback, errorCallback?: PositionErrorCallback) => {
    setTimeout(() => errorCallback?.(mockError), 0)
  })

  mockGeolocation.watchPosition.mockImplementation((_: PositionCallback, errorCallback?: PositionErrorCallback) => {
    setTimeout(() => errorCallback?.(mockError), 0)
    return 1
  })
}

// Helper to mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}

  const mockStorage = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    length: 0,
    key: vi.fn()
  }

  Object.defineProperty(global, 'localStorage', {
    value: mockStorage,
    writable: true
  })

  return mockStorage
}

// Helper to mock fetch responses
export const mockFetchResponse = (data: any, status: number = 200) => {
  const mockFetch = global.fetch as any
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
  })
}

// Helper to mock fetch error
export const mockFetchError = (error: string = 'Network error') => {
  const mockFetch = global.fetch as any
  mockFetch.mockRejectedValueOnce(new Error(error))
}