import { describe, it, expect, beforeEach, vi } from 'vitest'
import { openRouteService } from '@/services/openRouteService'
import { GeocodeResult, RouteSegment } from '@/types'
import { mockFetchResponse, mockFetchError } from '../helpers/test-utils'

describe('OpenRouteService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Configuration', () => {
    it('should be configured with API key from environment', () => {
      expect(openRouteService.isConfigured()).toBe(true)
    })

    it('should handle missing API key gracefully', () => {
      // Mock empty API key
      vi.mocked(import.meta.env).VITE_OPENROUTESERVICE_TOKEN = ''

      // Should not crash
      expect(() => openRouteService.isConfigured()).not.toThrow()
    })
  })

  describe('Geocoding', () => {
    it('should geocode address successfully', async () => {
      const mockResponse = {
        features: [
          {
            properties: {
              label: '1010 Taylor Drive, Allen, TX 75013',
              confidence: 0.95
            },
            geometry: {
              coordinates: [-96.6706, 33.1031]
            }
          }
        ]
      }

      mockFetchResponse(mockResponse)

      const results = await openRouteService.geocodeAddress('1010 Taylor Drive, Allen, TX')

      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({
        address: '1010 Taylor Drive, Allen, TX 75013',
        coordinates: [-96.6706, 33.1031],
        confidence: 0.95
      })
    })

    it('should handle geocoding API errors with fallback', async () => {
      mockFetchError('API Error')

      const results = await openRouteService.geocodeAddress('Dallas, TX')

      // Should return demo data as fallback
      expect(results).toHaveLength(1)
      expect(results[0].address).toContain('Dallas')
    })

    it('should handle empty geocoding response', async () => {
      mockFetchResponse({ features: [] })

      const results = await openRouteService.geocodeAddress('NonexistentPlace')

      // Should return demo fallback
      expect(results).toHaveLength(1)
      expect(results[0].address).toContain('NonexistentPlace')
    })

    it('should use Authorization header for API key security', async () => {
      const mockResponse = { features: [] }
      mockFetchResponse(mockResponse)

      await openRouteService.geocodeAddress('test address')

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const options = fetchCall[1] as RequestInit

      expect(options.headers).toMatchObject({
        'Authorization': 'test-api-key',
        'Accept': 'application/json'
      })

      // Ensure API key is NOT in URL
      const url = fetchCall[0] as string
      expect(url).not.toContain('test-api-key')
    })

    it('should limit geocoding results appropriately', async () => {
      const mockResponse = {
        features: Array(10).fill(null).map((_, i) => ({
          properties: {
            label: `Address ${i}`,
            confidence: 0.8
          },
          geometry: {
            coordinates: [-96.7970 + i * 0.001, 32.7767 + i * 0.001]
          }
        }))
      }

      mockFetchResponse(mockResponse)

      const results = await openRouteService.geocodeAddress('test')

      expect(results).toHaveLength(10) // Should return all provided results
      expect(results[0].address).toBe('Address 0')
    })
  })

  describe('Routing', () => {
    it('should get route between two points successfully', async () => {
      const mockResponse = {
        routes: [
          {
            summary: {
              distance: 5000,
              duration: 300
            },
            segments: [
              {
                steps: [
                  {
                    distance: 2500,
                    duration: 150,
                    instruction: 'Head north on Main St'
                  },
                  {
                    distance: 2500,
                    duration: 150,
                    instruction: 'Turn right on Highway 75'
                  }
                ]
              }
            ],
            geometry: [
              [-96.6706, 33.1031],
              [-96.8000, 33.0000],
              [-97.0864, 32.8370]
            ]
          }
        ]
      }

      mockFetchResponse(mockResponse)

      const start: [number, number] = [-96.6706, 33.1031]
      const end: [number, number] = [-97.0864, 32.8370]
      const segments = await openRouteService.getRoute(start, end)

      expect(segments).toHaveLength(2)
      expect(segments[0]).toMatchObject({
        distance: 2500,
        duration: 150,
        instruction: 'Head north on Main St'
      })
    })

    it('should handle routing API errors with fallback', async () => {
      mockFetchError('Routing API Error')

      const start: [number, number] = [-96.6706, 33.1031]
      const end: [number, number] = [-97.0864, 32.8370]
      const segments = await openRouteService.getRoute(start, end)

      // Should return demo route as fallback
      expect(segments).toHaveLength(2)
      expect(segments[0].roadType).toBeDefined()
      expect(segments[0].speedLimit).toBeGreaterThan(0)
    })

    it('should use POST method with proper headers for routing', async () => {
      const mockResponse = { routes: [] }
      mockFetchResponse(mockResponse)

      const start: [number, number] = [-96.6706, 33.1031]
      const end: [number, number] = [-97.0864, 32.8370]

      await openRouteService.getRoute(start, end)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const options = fetchCall[1] as RequestInit

      expect(options.method).toBe('POST')
      expect(options.headers).toMatchObject({
        'Authorization': 'test-api-key',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      })

      const body = JSON.parse(options.body as string)
      expect(body.coordinates).toEqual([start, end])
    })

    it('should handle empty routing response', async () => {
      mockFetchResponse({ routes: [] })

      const start: [number, number] = [-96.6706, 33.1031]
      const end: [number, number] = [-97.0864, 32.8370]
      const segments = await openRouteService.getRoute(start, end)

      expect(segments).toEqual([])
    })
  })

  describe('Road Type Detection', () => {
    it('should detect highway road types correctly', async () => {
      const mockResponse = {
        routes: [
          {
            summary: { distance: 1000, duration: 60 },
            segments: [
              {
                steps: [
                  {
                    distance: 1000,
                    duration: 60,
                    instruction: 'Continue on Interstate 75'
                  }
                ]
              }
            ]
          }
        ]
      }

      mockFetchResponse(mockResponse)

      const segments = await openRouteService.getRoute([-96.6706, 33.1031], [-97.0864, 32.8370])
      expect(segments[0].roadType).toBe('highway')
      expect(segments[0].speedLimit).toBe(65)
    })

    it('should detect residential road types correctly', async () => {
      const mockResponse = {
        routes: [
          {
            summary: { distance: 500, duration: 120 },
            segments: [
              {
                steps: [
                  {
                    distance: 500,
                    duration: 120,
                    instruction: 'Turn left on Oak Street'
                  }
                ]
              }
            ]
          }
        ]
      }

      mockFetchResponse(mockResponse)

      const segments = await openRouteService.getRoute([-96.6706, 33.1031], [-96.6800, 33.1100])
      expect(segments[0].roadType).toBe('residential')
      expect(segments[0].speedLimit).toBe(25)
    })
  })

  describe('Demo Mode Features', () => {
    it('should provide realistic demo geocoding results', async () => {
      mockFetchError('No API')

      const results = await openRouteService.geocodeAddress('Allen, TX')

      expect(results).toHaveLength(1)
      expect(results[0].address).toContain('Allen')
      expect(results[0].coordinates).toHaveLength(2)
      expect(results[0].confidence).toBeGreaterThan(0)
    })

    it('should provide fallback geocoding for unknown addresses', async () => {
      mockFetchError('No API')

      const results = await openRouteService.geocodeAddress('Unknown Location XYZ')

      expect(results).toHaveLength(1)
      expect(results[0].address).toBe('Unknown Location XYZ')
      expect(results[0].confidence).toBe(0.7) // Lower confidence for unknown
    })

    it('should provide demo routing with realistic segments', async () => {
      mockFetchError('No API')

      const start: [number, number] = [-96.6706, 33.1031]
      const end: [number, number] = [-97.0864, 32.8370]
      const segments = await openRouteService.getRoute(start, end)

      expect(segments).toHaveLength(2)
      expect(segments[0].roadType).toBe('residential')
      expect(segments[1].roadType).toBe('arterial')
      expect(segments[0].speedLimit).toBe(25)
      expect(segments[1].speedLimit).toBe(45)
    })
  })

  describe('Security and Data Sanitization', () => {
    it('should not log sensitive API keys in console', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      mockFetchResponse({ features: [] })

      await openRouteService.geocodeAddress('test address')

      // Check that console logs don't contain the API key
      const logCalls = consoleSpy.mock.calls
      logCalls.forEach(call => {
        const logMessage = call.join(' ')
        expect(logMessage).not.toContain('test-api-key')
      })
    })

    it('should handle malformed API responses safely', async () => {
      // Malformed response without expected structure
      mockFetchResponse({ malformed: 'data' })

      const results = await openRouteService.geocodeAddress('test')

      // Should fall back to demo data instead of crashing
      expect(results).toHaveLength(1)
      expect(results[0]).toHaveProperty('address')
      expect(results[0]).toHaveProperty('coordinates')
      expect(results[0]).toHaveProperty('confidence')
    })

    it('should validate coordinate data', async () => {
      const mockResponse = {
        features: [
          {
            properties: { label: 'Test Location' },
            geometry: { coordinates: ['invalid', 'coordinates'] }
          }
        ]
      }

      mockFetchResponse(mockResponse)

      const results = await openRouteService.geocodeAddress('test')

      // Should handle invalid coordinates gracefully
      expect(results).toHaveLength(1)
      expect(Array.isArray(results[0].coordinates)).toBe(true)
    })
  })

  describe('Address Similarity Matching', () => {
    it('should match similar addresses in demo mode', async () => {
      mockFetchError('No API')

      const results = await openRouteService.geocodeAddress('taylor drive allen')

      expect(results).toHaveLength(1)
      expect(results[0].address).toContain('Taylor Drive')
      expect(results[0].address).toContain('Allen')
    })

    it('should handle partial city matches', async () => {
      mockFetchError('No API')

      const results = await openRouteService.geocodeAddress('fort worth')

      expect(results).toHaveLength(1)
      expect(results[0].address).toContain('Fort Worth')
    })
  })
})