// Centralized error handling utilities
import { monitoring } from './monitoring'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorCategory = 'gps' | 'storage' | 'network' | 'validation' | 'permission' | 'unknown'

export interface AppError extends Error {
  severity: ErrorSeverity
  category: ErrorCategory
  code?: string
  details?: any
  recoverable: boolean
  userMessage: string
  timestamp: number
}

/**
 * Create a structured application error
 */
export function createAppError(
  message: string,
  options: Partial<AppError> = {}
): AppError {
  const error = new Error(message) as AppError

  error.severity = options.severity || 'medium'
  error.category = options.category || 'unknown'
  error.code = options.code
  error.details = options.details
  error.recoverable = options.recoverable !== false
  error.userMessage = options.userMessage || getUserFriendlyMessage(message, options.category)
  error.timestamp = Date.now()

  return error
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(message: string, category?: ErrorCategory): string {
  const messages: Record<ErrorCategory, Record<string, string>> = {
    gps: {
      'permission_denied': 'Location access is required for GPS tracking. Please enable location permissions in your browser settings.',
      'position_unavailable': 'Unable to determine your location. Please check your GPS/location settings.',
      'timeout': 'Location request timed out. Please try again.',
      'default': 'GPS error occurred. Please check your location settings.'
    },
    storage: {
      'quota_exceeded': 'Storage quota exceeded. Please clear some old trips to continue.',
      'unavailable': 'Local storage is not available. Some features may be limited.',
      'corruption': 'Data corruption detected. Please refresh the page.',
      'default': 'Storage error occurred. Your data may not be saved.'
    },
    network: {
      'offline': 'You appear to be offline. Some features may be limited.',
      'timeout': 'Request timed out. Please check your internet connection.',
      'api_error': 'Service temporarily unavailable. Please try again later.',
      'default': 'Network error occurred. Please check your connection.'
    },
    validation: {
      'invalid_input': 'Please check your input and try again.',
      'missing_required': 'Required information is missing.',
      'invalid_format': 'Invalid format. Please check and try again.',
      'default': 'Validation error. Please check your input.'
    },
    permission: {
      'denied': 'Permission denied. Please check your settings.',
      'unavailable': 'This feature is not available on your device.',
      'default': 'Permission error. Some features may be limited.'
    },
    unknown: {
      'default': 'An unexpected error occurred. Please try again.'
    }
  }

  const categoryMessages = messages[category || 'unknown']

  // Try to find a specific message based on error content
  for (const [key, msg] of Object.entries(categoryMessages)) {
    if (key !== 'default' && message.toLowerCase().includes(key.replace('_', ' '))) {
      return msg
    }
  }

  return categoryMessages.default || messages.unknown.default
}

/**
 * Global error handler
 */
export function handleError(error: Error | AppError, context?: string): void {
  const appError = isAppError(error) ? error : wrapError(error)

  // Log to monitoring
  monitoring.logError({
    message: appError.message,
    stack: appError.stack,
    details: {
      severity: appError.severity,
      category: appError.category,
      code: appError.code,
      context,
      ...appError.details
    }
  })

  // Handle based on severity
  switch (appError.severity) {
    case 'critical':
      // Show user notification and possibly reload
      showErrorNotification(appError)
      if (!appError.recoverable) {
        setTimeout(() => window.location.reload(), 3000)
      }
      break

    case 'high':
      // Show user notification
      showErrorNotification(appError)
      break

    case 'medium':
      // Show toast or inline error
      if (context) {
        console.warn(`Error in ${context}:`, appError.userMessage)
      }
      break

    case 'low':
      // Just log, don't notify user
      console.debug('Low severity error:', appError)
      break
  }
}

/**
 * Check if error is an AppError
 */
function isAppError(error: any): error is AppError {
  return error &&
    typeof error === 'object' &&
    'severity' in error &&
    'category' in error &&
    'userMessage' in error
}

/**
 * Wrap a regular error as AppError
 */
function wrapError(error: Error): AppError {
  // Try to determine category from error message
  let category: ErrorCategory = 'unknown'
  let severity: ErrorSeverity = 'medium'

  const message = error.message.toLowerCase()

  if (message.includes('permission') || message.includes('denied')) {
    category = 'permission'
    severity = 'high'
  } else if (message.includes('gps') || message.includes('location') || message.includes('geolocation')) {
    category = 'gps'
    severity = 'high'
  } else if (message.includes('storage') || message.includes('indexeddb') || message.includes('localstorage')) {
    category = 'storage'
    severity = 'medium'
  } else if (message.includes('network') || message.includes('fetch') || message.includes('api')) {
    category = 'network'
    severity = 'medium'
  } else if (message.includes('invalid') || message.includes('required') || message.includes('must')) {
    category = 'validation'
    severity = 'low'
  }

  return createAppError(error.message, {
    category,
    severity,
    stack: error.stack,
    recoverable: true
  })
}

/**
 * Show error notification to user
 */
function showErrorNotification(error: AppError): void {
  // This would integrate with your notification system
  // For now, we'll use console and potentially a toast library
  console.error(`[${error.severity.toUpperCase()}] ${error.userMessage}`)

  // You could dispatch to a global notification store here
  // or use a toast library
}

/**
 * Error boundary helper for React components
 */
export function errorBoundaryHandler(_error: Error, errorInfo: any): void {
  handleError(createAppError('Component error', {
    severity: 'high',
    category: 'unknown',
    details: { errorInfo },
    recoverable: true
  }), 'React Error Boundary')
}

/**
 * Async error wrapper
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string,
  fallback?: T
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    handleError(error as Error, context)

    if (fallback !== undefined) {
      return fallback
    }

    throw error
  }
}

/**
 * Retry logic for recoverable errors
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err as Error

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Max retries exceeded')
}