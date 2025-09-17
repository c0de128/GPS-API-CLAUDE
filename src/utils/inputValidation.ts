// Comprehensive input validation and sanitization utilities

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitized?: string
}

export interface ValidationOptions {
  allowHtml?: boolean
  maxLength?: number
  minLength?: number
  required?: boolean
  pattern?: RegExp
}

/**
 * Sanitize input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove javascript: links
    .replace(/javascript:/gi, '')
    // Remove on* event handlers
    .replace(/\s*on\w+\s*=\s*["']?[^"']*["']?/gi, '')
    // Remove data: URLs
    .replace(/data:(?!image\/[a-z]+;base64,)[^;]*;/gi, '')
    // Remove potentially dangerous tags
    .replace(/<(iframe|object|embed|form|input|textarea|button|select|option|script|style|link|meta|title|head|html|body)[^>]*>/gi, '')
    // Escape remaining HTML entities
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate and sanitize text input
 */
export function validateText(input: string, options: ValidationOptions = {}): ValidationResult {
  const errors: string[] = []

  // Check if required
  if (options.required && (!input || input.trim().length === 0)) {
    errors.push('This field is required')
    return { isValid: false, errors }
  }

  // If empty and not required, return valid
  if (!input || input.trim().length === 0) {
    return { isValid: true, errors: [], sanitized: '' }
  }

  // Check length constraints
  if (options.minLength && input.length < options.minLength) {
    errors.push(`Must be at least ${options.minLength} characters`)
  }

  if (options.maxLength && input.length > options.maxLength) {
    errors.push(`Must be no more than ${options.maxLength} characters`)
  }

  // Check pattern if provided
  if (options.pattern && !options.pattern.test(input)) {
    errors.push('Invalid format')
  }

  // Sanitize input
  const sanitized = options.allowHtml ? input : sanitizeInput(input)

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  }
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  return validateText(email, {
    required: true,
    pattern: emailPattern,
    maxLength: 254
  })
}

/**
 * Validate GPS coordinates
 */
export function validateCoordinates(lat: number, lng: number): ValidationResult {
  const errors: string[] = []

  if (typeof lat !== 'number' || isNaN(lat)) {
    errors.push('Latitude must be a valid number')
  } else if (lat < -90 || lat > 90) {
    errors.push('Latitude must be between -90 and 90')
  }

  if (typeof lng !== 'number' || isNaN(lng)) {
    errors.push('Longitude must be a valid number')
  } else if (lng < -180 || lng > 180) {
    errors.push('Longitude must be between -180 and 180')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate trip name
 */
export function validateTripName(name: string): ValidationResult {
  return validateText(name, {
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_()[\]{}.,!?]+$/
  })
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): ValidationResult {
  const errors: string[] = []

  if (!apiKey || apiKey.trim().length === 0) {
    errors.push('API key is required')
    return { isValid: false, errors }
  }

  // Check for basic API key patterns
  const validPatterns = [
    /^[a-zA-Z0-9_-]{20,}$/, // Alphanumeric with underscores/hyphens
    /^[a-f0-9]{32,}$/i,     // Hexadecimal
    /^gps_[a-z]+_[a-f0-9]+$/i // GPS-specific pattern
  ]

  const isValidFormat = validPatterns.some(pattern => pattern.test(apiKey))

  if (!isValidFormat) {
    errors.push('Invalid API key format')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitizeInput(apiKey)
  }
}

/**
 * Validate URL
 */
export function validateUrl(url: string, options: { allowedProtocols?: string[] } = {}): ValidationResult {
  const errors: string[] = []
  const allowedProtocols = options.allowedProtocols || ['http:', 'https:']

  if (!url || url.trim().length === 0) {
    errors.push('URL is required')
    return { isValid: false, errors }
  }

  try {
    const parsedUrl = new URL(url)

    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      errors.push(`Protocol must be one of: ${allowedProtocols.join(', ')}`)
    }

    // Check for suspicious patterns
    if (parsedUrl.hostname.includes('localhost') && parsedUrl.protocol === 'https:') {
      errors.push('HTTPS not typically used with localhost')
    }

  } catch (error) {
    errors.push('Invalid URL format')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitizeInput(url)
  }
}

/**
 * Validate JSON input
 */
export function validateJson(jsonString: string): ValidationResult {
  const errors: string[] = []

  if (!jsonString || jsonString.trim().length === 0) {
    return { isValid: true, errors: [], sanitized: '' }
  }

  try {
    const parsed = JSON.parse(jsonString)

    // Check for dangerous properties
    const dangerousKeys = ['__proto__', 'constructor', 'prototype']
    const hasDangerousKeys = (obj: any): boolean => {
      if (typeof obj !== 'object' || obj === null) return false

      for (const key of Object.keys(obj)) {
        if (dangerousKeys.includes(key)) return true
        if (typeof obj[key] === 'object' && hasDangerousKeys(obj[key])) return true
      }
      return false
    }

    if (hasDangerousKeys(parsed)) {
      errors.push('JSON contains potentially dangerous properties')
    }

  } catch (error) {
    errors.push('Invalid JSON format')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitizeInput(jsonString)
  }
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any, maxDepth: number = 10): any {
  if (maxDepth <= 0) return '[Max depth exceeded]'

  if (obj === null || obj === undefined) return obj

  if (typeof obj === 'string') {
    return sanitizeInput(obj)
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth - 1))
  }

  if (typeof obj === 'object') {
    const sanitized: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Sanitize key name too
        const safeKey = sanitizeInput(key)
        sanitized[safeKey] = sanitizeObject(obj[key], maxDepth - 1)
      }
    }
    return sanitized
  }

  return String(obj)
}

/**
 * Rate limiting for validation requests
 */
const validationRateLimit = new Map<string, { count: number; timestamp: number }>()

export function checkValidationRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now()
  const key = identifier

  const existing = validationRateLimit.get(key)

  if (!existing) {
    validationRateLimit.set(key, { count: 1, timestamp: now })
    return true
  }

  if (now - existing.timestamp > windowMs) {
    validationRateLimit.set(key, { count: 1, timestamp: now })
    return true
  }

  if (existing.count >= maxRequests) {
    return false
  }

  existing.count++
  return true
}

/**
 * Content Security Policy helpers
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function getCSPHeader(nonce?: string): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'" + (nonce ? ` 'nonce-${nonce}'` : ''),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.openrouteservice.org https://*.tile.openstreetmap.org",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ]

  return directives.join('; ')
}