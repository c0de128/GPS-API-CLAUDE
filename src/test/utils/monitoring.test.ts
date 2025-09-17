import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { monitoring } from '@/utils/monitoring'
import { mockLocalStorage } from '../helpers/test-utils'

describe('Monitoring Service', () => {
  let mockStorage: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockStorage = mockLocalStorage()
    monitoring.setEnabled(true)
  })

  afterEach(() => {
    mockStorage.clear()
  })

  describe('Error Logging', () => {
    it('should log errors to localStorage', () => {
      const errorMessage = 'Test error message'
      const errorDetails = { component: 'TestComponent' }

      monitoring.logError({
        message: errorMessage,
        details: errorDetails
      })

      expect(mockStorage.setItem).toHaveBeenCalled()
      const storedData = mockStorage.setItem.mock.calls[0][1]
      const parsedData = JSON.parse(storedData)

      expect(parsedData).toHaveLength(1)
      expect(parsedData[0]).toMatchObject({
        level: 'error',
        message: errorMessage,
        details: errorDetails
      })
    })

    it('should include stack trace when provided', () => {
      const error = new Error('Test error')
      monitoring.logError({
        message: error.message,
        stack: error.stack
      })

      const logs = monitoring.getLogs('errors')
      expect(logs[0].stack).toBeDefined()
    })

    it('should limit stored logs to prevent memory issues', () => {
      // Add more than maxLogsStored (100) logs
      for (let i = 0; i < 150; i++) {
        monitoring.logError({ message: `Error ${i}` })
      }

      const logs = monitoring.getLogs('errors')
      expect(logs.length).toBeLessThanOrEqual(100)
    })
  })

  describe('Warning Logging', () => {
    it('should log warnings with correct level', () => {
      monitoring.logWarning('Test warning', { component: 'TestComponent' })

      const logs = monitoring.getLogs('warnings')
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('warn')
      expect(logs[0].message).toBe('Test warning')
    })
  })

  describe('Info Logging', () => {
    it('should log info messages', () => {
      monitoring.logInfo('Test info message', { action: 'test' })

      const logs = monitoring.getLogs('info')
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('info')
    })
  })

  describe('Performance Logging', () => {
    it('should log performance metrics', () => {
      monitoring.logPerformance({
        name: 'test-metric',
        value: 123.45,
        unit: 'ms',
        details: { component: 'TestComponent' }
      })

      const logs = monitoring.getLogs('performance')
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        name: 'test-metric',
        value: 123.45,
        unit: 'ms'
      })
    })
  })

  describe('User Action Logging', () => {
    it('should log user actions', () => {
      monitoring.logUserAction('click', 'button', { buttonId: 'start-tracking' })

      const logs = monitoring.getLogs('user_actions')
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        action: 'click',
        component: 'button',
        details: { buttonId: 'start-tracking' }
      })
    })
  })

  describe('GPS Event Logging', () => {
    it('should log GPS events with sanitized data', () => {
      monitoring.logGPSEvent('location_update', {
        latitude: 32.7767,
        longitude: -96.7970,
        accuracy: 10
      })

      const logs = monitoring.getLogs('info')
      const gpsLog = logs.find(log => log.message.includes('GPS: location_update'))

      expect(gpsLog).toBeDefined()
      expect(gpsLog.details.category).toBe('gps')
    })

    it('should sanitize sensitive GPS data in production', () => {
      // Mock production environment
      vi.mocked(import.meta.env).PROD = true

      monitoring.logGPSEvent('location_update', {
        latitude: 32.123456789,
        longitude: -96.987654321,
        accuracy: 5
      })

      const logs = monitoring.getLogs('info')
      const gpsLog = logs.find(log => log.message.includes('GPS: location_update'))

      // In production, coordinates should be rounded for privacy
      if (gpsLog?.details?.latitude) {
        expect(gpsLog.details.latitude).toBe(32.12) // Rounded to 2 decimals
      }
    })
  })

  describe('Trip Event Logging', () => {
    it('should log trip events', () => {
      monitoring.logTripEvent('trip_started', 'trip-123', {
        startLocation: 'Dallas, TX'
      })

      const logs = monitoring.getLogs('info')
      const tripLog = logs.find(log => log.message.includes('Trip: trip_started'))

      expect(tripLog).toBeDefined()
      expect(tripLog.details.tripId).toBe('trip-123')
      expect(tripLog.details.category).toBe('trip')
    })
  })

  describe('Storage Event Logging', () => {
    it('should log successful storage operations', () => {
      monitoring.logStorageEvent('save_trip', true, { tripId: 'trip-123' })

      const logs = monitoring.getLogs('info')
      const storageLog = logs.find(log => log.message.includes('Storage save_trip: Success'))

      expect(storageLog).toBeDefined()
      expect(storageLog.details.category).toBe('storage')
    })

    it('should log failed storage operations as errors', () => {
      monitoring.logStorageEvent('save_trip', false, {
        error: 'Quota exceeded',
        tripId: 'trip-123'
      })

      const logs = monitoring.getLogs('errors')
      const errorLog = logs.find(log => log.message.includes('Storage save_trip: Failed'))

      expect(errorLog).toBeDefined()
      expect(errorLog.details.category).toBe('storage')
    })
  })

  describe('Data Sanitization', () => {
    it('should sanitize sensitive data from logs', () => {
      const sensitiveData = {
        apiKey: 'secret-api-key-123',
        token: 'bearer-token-456',
        password: 'user-password',
        authorization: 'Basic xyz123'
      }

      monitoring.logError({
        message: 'Test error with sensitive data',
        details: sensitiveData
      })

      const logs = monitoring.getLogs('errors')
      const errorLog = logs[0]

      expect(errorLog.details.apiKey).toBe('[REDACTED]')
      expect(errorLog.details.token).toBe('[REDACTED]')
      expect(errorLog.details.password).toBe('[REDACTED]')
      expect(errorLog.details.authorization).toBe('[REDACTED]')
    })

    it('should truncate very long strings', () => {
      const longString = 'a'.repeat(1000)

      monitoring.logError({
        message: 'Test with long data',
        details: { longData: longString }
      })

      const logs = monitoring.getLogs('errors')
      const errorLog = logs[0]

      expect(errorLog.details.longData.length).toBeLessThanOrEqual(515) // 500 + "... [truncated]"
      expect(errorLog.details.longData).toContain('[truncated]')
    })

    it('should handle recursive object sanitization', () => {
      const nestedData = {
        level1: {
          level2: {
            apiKey: 'secret-key',
            normalData: 'safe-data'
          }
        }
      }

      monitoring.logError({
        message: 'Test nested sanitization',
        details: nestedData
      })

      const logs = monitoring.getLogs('errors')
      const errorLog = logs[0]

      expect(errorLog.details.level1.level2.apiKey).toBe('[REDACTED]')
      expect(errorLog.details.level1.level2.normalData).toBe('safe-data')
    })
  })

  describe('Health Status', () => {
    it('should report healthy status with no recent errors', () => {
      const health = monitoring.getHealthStatus()

      expect(health.status).toBe('healthy')
      expect(health.recentErrors).toBe(0)
      expect(health.sessionId).toBeDefined()
    })

    it('should report warning status with few recent errors', () => {
      // Add a few recent errors
      for (let i = 0; i < 3; i++) {
        monitoring.logError({ message: `Recent error ${i}` })
      }

      const health = monitoring.getHealthStatus()
      expect(health.status).toBe('warning')
      expect(health.recentErrors).toBe(3)
    })

    it('should report critical status with many recent errors', () => {
      // Add many recent errors
      for (let i = 0; i < 10; i++) {
        monitoring.logError({ message: `Critical error ${i}` })
      }

      const health = monitoring.getHealthStatus()
      expect(health.status).toBe('critical')
      expect(health.recentErrors).toBe(10)
    })
  })

  describe('Log Management', () => {
    it('should clear old logs beyond retention period', () => {
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
      const recentDate = new Date()

      // Mock old log
      const oldLog = {
        id: 'old-log',
        timestamp: oldDate.toISOString(),
        level: 'error' as const,
        message: 'Old error',
        url: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: 'old-session'
      }

      // Mock recent log
      monitoring.logError({ message: 'Recent error' })

      // Manually add old log to storage
      const existingLogs = monitoring.getLogs('errors')
      existingLogs.unshift(oldLog)
      mockStorage.setItem('app_errors', JSON.stringify(existingLogs))

      // Clear old logs (7 days retention)
      monitoring.clearOldLogs(7)

      const remainingLogs = monitoring.getLogs('errors')
      expect(remainingLogs.every(log => !log.message.includes('Old error'))).toBe(true)
      expect(remainingLogs.some(log => log.message.includes('Recent error'))).toBe(true)
    })

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage setItem to throw error
      mockStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      // Should not crash when storage fails
      expect(() => {
        monitoring.logError({ message: 'Test error' })
      }).not.toThrow()
    })
  })

  describe('Monitoring Control', () => {
    it('should respect enabled/disabled state', () => {
      monitoring.setEnabled(false)

      monitoring.logError({ message: 'Test error when disabled' })

      // Should not store anything when disabled
      expect(mockStorage.setItem).not.toHaveBeenCalled()
    })

    it('should report monitoring enabled state', () => {
      expect(monitoring.isMonitoringEnabled()).toBe(true)

      monitoring.setEnabled(false)
      expect(monitoring.isMonitoringEnabled()).toBe(false)
    })
  })

  describe('Global Error Handlers', () => {
    it('should capture global JavaScript errors', () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Global error test',
        filename: 'test.js',
        lineno: 123,
        colno: 45,
        error: new Error('Global error test')
      })

      window.dispatchEvent(errorEvent)

      const logs = monitoring.getLogs('errors')
      const globalError = logs.find(log => log.message.includes('Global error test'))

      expect(globalError).toBeDefined()
      expect(globalError.details.type).toBe('javascript_error')
    })

    it('should capture unhandled promise rejections', () => {
      const rejectionEvent = new CustomEvent('unhandledrejection') as any
      rejectionEvent.reason = 'Promise rejection test'

      window.dispatchEvent(rejectionEvent)

      const logs = monitoring.getLogs('errors')
      const rejectionError = logs.find(log => log.message.includes('Promise rejection test'))

      expect(rejectionError).toBeDefined()
      expect(rejectionError.details.type).toBe('promise_rejection')
    })
  })

  describe('Log Export', () => {
    it('should create downloadable log export', () => {
      // Add some test data
      monitoring.logError({ message: 'Test error for export' })
      monitoring.logWarning('Test warning for export')

      // Mock document and URL APIs
      const mockClick = vi.fn()
      const mockAppendChild = vi.fn()
      const mockRemoveChild = vi.fn()
      const mockCreateElement = vi.fn(() => ({
        click: mockClick,
        href: '',
        download: ''
      }))

      Object.defineProperty(document, 'createElement', {
        value: mockCreateElement,
        writable: true
      })

      Object.defineProperty(document.body, 'appendChild', {
        value: mockAppendChild,
        writable: true
      })

      Object.defineProperty(document.body, 'removeChild', {
        value: mockRemoveChild,
        writable: true
      })

      monitoring.exportLogs()

      expect(mockCreateElement).toHaveBeenCalledWith('a')
      expect(mockClick).toHaveBeenCalled()
      expect(global.URL.createObjectURL).toHaveBeenCalled()
    })
  })
})