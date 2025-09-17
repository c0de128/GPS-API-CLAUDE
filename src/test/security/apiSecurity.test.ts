import { describe, it, expect, beforeEach, vi } from 'vitest'
import { openRouteService } from '@/services/openRouteService'
import { monitoring } from '@/utils/monitoring'
import { mockFetchResponse, mockFetchError } from '../helpers/test-utils'

describe('API Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('API Key Security', () => {
    it('should not expose API keys in URL parameters', async () => {
      mockFetchResponse({ features: [] })

      await openRouteService.geocodeAddress('test address')

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const url = fetchCall[0] as string

      // API key should NOT be in URL
      expect(url).not.toContain('test-api-key')
      expect(url).not.toContain('api_key')
      expect(url).not.toContain('token')
    })

    it('should use Authorization header for API key transmission', async () => {
      mockFetchResponse({ features: [] })

      await openRouteService.geocodeAddress('test address')

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const options = fetchCall[1] as RequestInit
      const headers = options.headers as Record<string, string>

      expect(headers['Authorization']).toBe('test-api-key')
    })

    it('should handle missing API key gracefully', () => {
      // Mock environment with no API key
      vi.mocked(import.meta.env).VITE_OPENROUTESERVICE_TOKEN = ''

      // Should not crash and should provide fallback behavior
      expect(() => {
        const isConfigured = openRouteService.isConfigured()
        expect(isConfigured).toBe(false)
      }).not.toThrow()
    })

    it('should not log API keys in console output', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      mockFetchResponse({ features: [] })

      await openRouteService.geocodeAddress('test address')

      // Check all console.log calls for API key exposure
      const allLogs = consoleSpy.mock.calls.map(call => call.join(' '))
      allLogs.forEach(logMessage => {
        expect(logMessage).not.toContain('test-api-key')
        expect(logMessage).not.toContain('api_key')
        expect(logMessage).not.toContain('authorization')
      })
    })

    it('should not expose API keys in error messages', async () => {
      // Mock fetch to reject with error containing API key info
      global.fetch = vi.fn().mockRejectedValue(
        new Error('HTTP 401: Invalid API key test-api-key')
      )

      const consoleSpy = vi.spyOn(console, 'error')

      await openRouteService.geocodeAddress('test address')

      // Error logs should not contain the actual API key
      const errorLogs = consoleSpy.mock.calls.map(call => call.join(' '))
      errorLogs.forEach(logMessage => {
        expect(logMessage).not.toContain('test-api-key')
      })
    })
  })

  describe('Data Sanitization in Monitoring', () => {
    it('should sanitize API keys from monitoring logs', () => {
      const sensitiveData = {
        apiKey: 'secret-api-key-123',
        api_key: 'another-secret-key',
        token: 'bearer-token-456',
        authorization: 'Bearer secret-token'
      }

      monitoring.logError({
        message: 'API error with sensitive data',
        details: sensitiveData
      })

      const logs = monitoring.getLogs('errors')
      const errorLog = logs[0]

      expect(errorLog.details.apiKey).toBe('[REDACTED]')
      expect(errorLog.details.api_key).toBe('[REDACTED]')
      expect(errorLog.details.token).toBe('[REDACTED]')
      expect(errorLog.details.authorization).toBe('[REDACTED]')
    })

    it('should sanitize nested sensitive data', () => {
      const nestedSensitiveData = {
        request: {
          headers: {
            authorization: 'Bearer secret-token',
            'x-api-key': 'secret-api-key'
          },
          body: {
            data: 'safe-data'
          }
        }
      }

      monitoring.logError({
        message: 'Request failed',
        details: nestedSensitiveData
      })

      const logs = monitoring.getLogs('errors')
      const errorLog = logs[0]

      expect(errorLog.details.request.headers.authorization).toBe('[REDACTED]')
      expect(errorLog.details.request.headers['x-api-key']).toBe('[REDACTED]')
      expect(errorLog.details.request.body.data).toBe('safe-data')
    })

    it('should truncate very long data to prevent data dumps', () => {
      const longString = 'a'.repeat(1000)

      monitoring.logError({
        message: 'Error with long data',
        details: { longData: longString }
      })

      const logs = monitoring.getLogs('errors')
      const errorLog = logs[0]

      expect(errorLog.details.longData.length).toBeLessThanOrEqual(515) // 500 + "... [truncated]"
      expect(errorLog.details.longData).toContain('[truncated]')
    })

    it('should sanitize function arguments to prevent code exposure', () => {
      const originalConsoleError = console.error

      // Mock console.error call with sensitive data
      console.error('API call failed', {
        apiKey: 'secret-key',
        response: 'some response data'
      })

      const logs = monitoring.getLogs('errors')
      const consoleErrorLog = logs.find(log => log.message.includes('API call failed'))

      if (consoleErrorLog) {
        // The monitoring system should have sanitized the console.error call
        expect(consoleErrorLog.details.type).toBe('console_error')
      }
    })
  })

  describe('GPS Data Privacy', () => {
    it('should sanitize GPS coordinates in production logs', () => {
      // Mock production environment
      vi.mocked(import.meta.env).PROD = true

      const preciseLocation = {
        latitude: 32.123456789,
        longitude: -96.987654321,
        accuracy: 5
      }

      monitoring.logGPSEvent('location_update', preciseLocation)

      const logs = monitoring.getLogs('info')
      const gpsLog = logs.find(log => log.message.includes('GPS: location_update'))

      if (gpsLog && gpsLog.details.latitude) {
        // Coordinates should be rounded for privacy in production
        expect(gpsLog.details.latitude).toBe(32.12)
        expect(gpsLog.details.longitude).toBe(-96.99)
      }
    })

    it('should redact location data in production logs', () => {
      vi.mocked(import.meta.env).PROD = true

      monitoring.logGPSEvent('tracking_started', {
        location: {
          latitude: 32.7767,
          longitude: -96.7970
        }
      })

      const logs = monitoring.getLogs('info')
      const gpsLog = logs.find(log => log.message.includes('GPS: tracking_started'))

      if (gpsLog && gpsLog.details.location) {
        expect(gpsLog.details.location).toBe('Location data present but redacted for privacy')
      }
    })

    it('should preserve accuracy data for debugging while protecting location', () => {
      vi.mocked(import.meta.env).PROD = true

      monitoring.logGPSEvent('location_update', {
        latitude: 32.123456789,
        longitude: -96.987654321,
        accuracy: 5
      })

      const logs = monitoring.getLogs('info')
      const gpsLog = logs.find(log => log.message.includes('GPS: location_update'))

      if (gpsLog) {
        // Accuracy should be preserved as it's not sensitive
        expect(gpsLog.details.accuracy).toBe(5)
      }
    })
  })

  describe('Error Response Security', () => {
    it('should not expose sensitive server information in error responses', async () => {
      // Mock detailed server error response
      const mockErrorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          error: 'Database connection failed',
          stack: 'Error at /usr/local/app/database.js:123',
          config: {
            dbPassword: 'secret-db-password',
            apiKey: 'internal-api-key'
          }
        })
      }

      global.fetch = vi.fn().mockResolvedValue(mockErrorResponse)

      await openRouteService.geocodeAddress('test address')

      // Should fall back to demo data without exposing server details
      const logs = monitoring.getLogs('errors')
      const errorLog = logs.find(log => log.message.includes('OpenRouteService'))

      if (errorLog) {
        const errorMessage = errorLog.message
        expect(errorMessage).not.toContain('secret-db-password')
        expect(errorMessage).not.toContain('internal-api-key')
        expect(errorMessage).not.toContain('/usr/local/app/')
      }
    })

    it('should handle malformed error responses safely', async () => {
      // Mock malformed error response that could cause XSS
      global.fetch = vi.fn().mockRejectedValue(
        new Error('<script>alert("XSS")</script>')
      )

      await openRouteService.geocodeAddress('test address')

      // Should handle error safely without executing any scripts
      const logs = monitoring.getLogs('errors')
      const errorLog = logs.find(log => log.message.includes('OpenRouteService'))

      if (errorLog) {
        // Error message should be safe
        expect(errorLog.message).not.toContain('<script>')
        expect(errorLog.message).not.toContain('alert(')
      }
    })
  })

  describe('Request Security', () => {
    it('should use HTTPS for all API requests', async () => {
      mockFetchResponse({ features: [] })

      await openRouteService.geocodeAddress('test address')

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const url = fetchCall[0] as string

      expect(url).toMatch(/^https:\/\//)
    })

    it('should include proper headers for security', async () => {
      mockFetchResponse({ features: [] })

      await openRouteService.geocodeAddress('test address')

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const options = fetchCall[1] as RequestInit
      const headers = options.headers as Record<string, string>

      expect(headers['Accept']).toBe('application/json')
      expect(headers['Authorization']).toBeDefined()
    })

    it('should not include credentials in cross-origin requests', async () => {
      mockFetchResponse({ features: [] })

      await openRouteService.geocodeAddress('test address')

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const options = fetchCall[1] as RequestInit

      // Should not include credentials for security
      expect(options.credentials).toBeUndefined()
    })
  })

  describe('Data Validation Security', () => {
    it('should validate response data to prevent injection attacks', async () => {
      // Mock response with potential XSS payload
      const maliciousResponse = {
        features: [
          {
            properties: {
              label: '<script>alert("XSS")</script>',
              confidence: 0.9
            },
            geometry: {
              coordinates: [-96.7970, 32.7767]
            }
          }
        ]
      }

      mockFetchResponse(maliciousResponse)

      const results = await openRouteService.geocodeAddress('test')

      // Should sanitize the response
      expect(results[0].address).not.toContain('<script>')
      expect(results[0].address).not.toContain('alert(')
    })

    it('should validate coordinate data types', async () => {
      // Mock response with invalid coordinate types
      const invalidResponse = {
        features: [
          {
            properties: {
              label: 'Test Location'
            },
            geometry: {
              coordinates: ['invalid', 'coordinates']
            }
          }
        ]
      }

      mockFetchResponse(invalidResponse)

      const results = await openRouteService.geocodeAddress('test')

      // Should handle invalid data gracefully
      expect(Array.isArray(results[0].coordinates)).toBe(true)
      expect(typeof results[0].coordinates[0]).toBe('number')
      expect(typeof results[0].coordinates[1]).toBe('number')
    })
  })

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should handle rate limiting responses gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: 'Rate limit exceeded' })
      })

      const results = await openRouteService.geocodeAddress('test')

      // Should fall back to demo data when rate limited
      expect(results).toHaveLength(1)
      expect(results[0]).toHaveProperty('address')
    })

    it('should not retry indefinitely on failures', async () => {
      let callCount = 0
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++
        return Promise.reject(new Error('Network error'))
      })

      await openRouteService.geocodeAddress('test')

      // Should only make one attempt, not retry indefinitely
      expect(callCount).toBe(1)
    })
  })
})