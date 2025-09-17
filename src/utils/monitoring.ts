// App Monitoring and Error Logging Utilities

export interface ErrorLog {
  id: string
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  details?: any
  stack?: string
  url: string
  userAgent: string
  userId?: string
  sessionId: string
}

export interface PerformanceMetric {
  id: string
  timestamp: string
  name: string
  value: number
  unit: string
  details?: any
}

export interface UserAction {
  id: string
  timestamp: string
  action: string
  component: string
  details?: any
  sessionId: string
}

class AppMonitoring {
  private sessionId: string
  private isEnabled: boolean = true
  private maxLogsStored: number = 100

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeErrorHandlers()
    this.initializePerformanceObserver()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.logError({
        message: event.message,
        stack: event.error?.stack,
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          type: 'javascript_error'
        }
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        details: {
          reason: event.reason,
          type: 'promise_rejection'
        }
      })
    })

    // Console error override with sanitization
    const originalConsoleError = console.error
    console.error = (...args) => {
      // Sanitize arguments to prevent sensitive data leakage
      const sanitizedArgs = args.map(arg => this.sanitizeLogData(arg))

      this.logError({
        message: sanitizedArgs.join(' '),
        details: { type: 'console_error', argsCount: args.length }
        // Don't store raw args to prevent sensitive data exposure
      })
      originalConsoleError.apply(console, args)
    }
  }

  private initializePerformanceObserver() {
    try {
      // Observe navigation timing
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.logPerformance({
              name: entry.name,
              value: entry.duration,
              unit: 'ms',
              details: {
                entryType: entry.entryType,
                startTime: entry.startTime
              }
            })
          })
        })

        observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] })
      }
    } catch (error) {
      console.warn('Performance observer not supported:', error)
    }
  }

  // Error logging
  logError(error: {
    message: string
    stack?: string
    details?: any
  }) {
    if (!this.isEnabled) return

    const errorLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      details: error.details,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId
    }

    this.storeLog('errors', errorLog)
    this.sendToAnalytics('error', errorLog)
  }

  // Warning logging
  logWarning(message: string, details?: any) {
    if (!this.isEnabled) return

    const warningLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      details,
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId
    }

    this.storeLog('warnings', warningLog)
    this.sendToAnalytics('warning', warningLog)
  }

  // Info logging
  logInfo(message: string, details?: any) {
    if (!this.isEnabled) return

    const infoLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      details,
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId
    }

    this.storeLog('info', infoLog)
  }

  // Performance logging
  logPerformance(metric: {
    name: string
    value: number
    unit: string
    details?: any
  }) {
    if (!this.isEnabled) return

    const performanceMetric: PerformanceMetric = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      name: metric.name,
      value: metric.value,
      unit: metric.unit,
      details: metric.details
    }

    this.storeLog('performance', performanceMetric)
    this.sendToAnalytics('performance', performanceMetric)
  }

  // User action logging
  logUserAction(action: string, component: string, details?: any) {
    if (!this.isEnabled) return

    const userAction: UserAction = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      action,
      component,
      details,
      sessionId: this.sessionId
    }

    this.storeLog('user_actions', userAction)
    this.sendToAnalytics('user_action', userAction)
  }

  // GPS-specific logging with sanitization
  logGPSEvent(event: string, details?: any) {
    // Sanitize GPS data to prevent location leakage in logs
    const sanitizedDetails = this.sanitizeGPSData(details)

    this.logInfo(`GPS: ${event}`, {
      ...sanitizedDetails,
      category: 'gps'
    })
  }

  // Trip-specific logging
  logTripEvent(event: string, tripId?: string, details?: any) {
    this.logInfo(`Trip: ${event}`, {
      tripId,
      ...details,
      category: 'trip'
    })
  }

  // Storage operations logging
  logStorageEvent(operation: string, success: boolean, details?: any) {
    const level = success ? 'info' : 'error'
    const message = `Storage ${operation}: ${success ? 'Success' : 'Failed'}`

    if (level === 'error') {
      this.logError({ message, details: { ...details, category: 'storage' } })
    } else {
      this.logInfo(message, { ...details, category: 'storage' })
    }
  }

  // Get stored logs
  getLogs(type: 'errors' | 'warnings' | 'info' | 'performance' | 'user_actions'): any[] {
    try {
      const logs = localStorage.getItem(`app_${type}`)
      return logs ? JSON.parse(logs) : []
    } catch {
      return []
    }
  }

  // Get app health status
  getHealthStatus() {
    const errors = this.getLogs('errors')
    const warnings = this.getLogs('warnings')
    const recentErrors = errors.filter(
      (error: ErrorLog) => Date.now() - new Date(error.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
    )

    return {
      status: recentErrors.length === 0 ? 'healthy' : recentErrors.length < 5 ? 'warning' : 'critical',
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      recentErrors: recentErrors.length,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    }
  }

  // Clear old logs
  clearOldLogs(olderThanDays: number = 7) {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
    const logTypes = ['errors', 'warnings', 'info', 'performance', 'user_actions']

    logTypes.forEach(type => {
      const logs = this.getLogs(type as any)
      const filteredLogs = logs.filter(
        (log: any) => new Date(log.timestamp).getTime() > cutoffTime
      )
      this.storeLogsArray(type, filteredLogs)
    })
  }

  // Export logs for debugging
  exportLogs() {
    const allLogs = {
      errors: this.getLogs('errors'),
      warnings: this.getLogs('warnings'),
      info: this.getLogs('info'),
      performance: this.getLogs('performance'),
      user_actions: this.getLogs('user_actions'),
      health: this.getHealthStatus(),
      exportTime: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(allLogs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `app-logs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Private utility methods
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Sanitize sensitive data from logs
  private sanitizeLogData(data: any): any {
    if (data === null || data === undefined) return data

    // Convert to string and check for sensitive patterns
    const str = String(data)

    // Patterns for sensitive data
    const sensitivePatterns = [
      /api[_-]?key/i,
      /token/i,
      /password/i,
      /secret/i,
      /authorization/i,
      /bearer/i,
      /x-api-key/i,
      /gps_[a-z]+_[a-f0-9]+/i, // GPS API key pattern
      /[a-f0-9]{32,}/i, // Long hex strings (likely keys)
      /\b[A-Za-z0-9]{20,}\b/i // Long alphanumeric strings
    ]

    // Check if string contains sensitive patterns
    for (const pattern of sensitivePatterns) {
      if (pattern.test(str)) {
        return '[REDACTED]'
      }
    }

    // Truncate very long strings to prevent data dumps
    if (typeof data === 'string' && data.length > 500) {
      return data.substring(0, 500) + '... [truncated]'
    }

    // Recursively sanitize objects
    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        return data.map(item => this.sanitizeLogData(item))
      }

      const sanitized: any = {}
      for (const key in data) {
        // Skip sensitive keys
        if (sensitivePatterns.some(pattern => pattern.test(key))) {
          sanitized[key] = '[REDACTED]'
        } else {
          sanitized[key] = this.sanitizeLogData(data[key])
        }
      }
      return sanitized
    }

    return data
  }

  // Sanitize GPS-specific data
  private sanitizeGPSData(details: any): any {
    if (!details) return details

    const sanitized = { ...details }

    // Always obfuscate exact coordinates to protect privacy
    if (sanitized.latitude !== undefined) {
      // Round to ~100m precision (3 decimal places)
      sanitized.latitude = Math.round(sanitized.latitude * 1000) / 1000
    }
    if (sanitized.longitude !== undefined) {
      sanitized.longitude = Math.round(sanitized.longitude * 1000) / 1000
    }

    // Remove or obfuscate detailed location data
    if (sanitized.location && typeof sanitized.location === 'object') {
      sanitized.location = {
        hasLocation: true,
        accuracy: sanitized.location.accuracy ? Math.round(sanitized.location.accuracy) : undefined
      }
    } else if (sanitized.location) {
      sanitized.location = '[Location data redacted for privacy]'
    }

    // Remove detailed route information
    if (sanitized.route && Array.isArray(sanitized.route)) {
      sanitized.route = `[Route with ${sanitized.route.length} points]`
    }

    // Remove waypoint details
    if (sanitized.waypoints && Array.isArray(sanitized.waypoints)) {
      sanitized.waypoints = `[${sanitized.waypoints.length} waypoints]`
    }

    return this.sanitizeLogData(sanitized)
  }

  private storeLog(type: string, log: any) {
    try {
      const existing = this.getLogs(type as any)
      existing.push(log)

      // Keep only recent logs
      if (existing.length > this.maxLogsStored) {
        existing.splice(0, existing.length - this.maxLogsStored)
      }

      localStorage.setItem(`app_${type}`, JSON.stringify(existing))
    } catch (error) {
      console.warn(`Failed to store ${type} log:`, error)
    }
  }

  private storeLogsArray(type: string, logs: any[]) {
    try {
      localStorage.setItem(`app_${type}`, JSON.stringify(logs))
    } catch (error) {
      console.warn(`Failed to store ${type} logs:`, error)
    }
  }

  private sendToAnalytics(eventType: string, data: any) {
    // Sanitize data before sending to analytics
    const sanitizedData = this.sanitizeLogData(data)

    // This is where you would send to your analytics service
    // For now, we'll just log it in development
    if (!import.meta.env.PROD) {
      console.log(`[Analytics] ${eventType}:`, sanitizedData)
    }

    // Example: Send to Google Analytics, Mixpanel, etc.
    // gtag('event', eventType, data)
    // mixpanel.track(eventType, data)
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  isMonitoringEnabled(): boolean {
    return this.isEnabled
  }
}

// Create singleton instance
export const monitoring = new AppMonitoring()

// React hook for easy use in components
export const useMonitoring = () => {
  return {
    logError: monitoring.logError.bind(monitoring),
    logWarning: monitoring.logWarning.bind(monitoring),
    logInfo: monitoring.logInfo.bind(monitoring),
    logPerformance: monitoring.logPerformance.bind(monitoring),
    logUserAction: monitoring.logUserAction.bind(monitoring),
    logGPSEvent: monitoring.logGPSEvent.bind(monitoring),
    logTripEvent: monitoring.logTripEvent.bind(monitoring),
    logStorageEvent: monitoring.logStorageEvent.bind(monitoring),
    getHealthStatus: monitoring.getHealthStatus.bind(monitoring),
    exportLogs: monitoring.exportLogs.bind(monitoring)
  }
}

export default monitoring