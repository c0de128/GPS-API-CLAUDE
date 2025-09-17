import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables
vi.mock('import.meta.env', () => ({
  VITE_OPENROUTESERVICE_TOKEN: 'test-api-key',
  PROD: false,
  DEV: true
}))

// Global mocks for browser APIs
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

global.sessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(() => 1),
  clearWatch: vi.fn(),
}

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
})

// Mock permissions API
const mockPermissions = {
  query: vi.fn().mockResolvedValue({
    state: 'granted',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })
}

Object.defineProperty(global.navigator, 'permissions', {
  value: mockPermissions,
  writable: true,
})

// Mock URL.createObjectURL for file exports
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock performance APIs
global.PerformanceObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock console methods to reduce test noise
global.console.warn = vi.fn()
global.console.error = vi.fn()
global.console.log = vi.fn()

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 0)
  return 1
})

global.cancelAnimationFrame = vi.fn()

// Mock setInterval/setTimeout for more reliable testing
vi.stubGlobal('setInterval', vi.fn())
vi.stubGlobal('clearInterval', vi.fn())
vi.stubGlobal('setTimeout', vi.fn())
vi.stubGlobal('clearTimeout', vi.fn())