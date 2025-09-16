import type { Request, Response, NextFunction } from 'express'
import { authService } from '@/services/authService.js'
import type { ApiPermission, ApiResponse } from '@/types/api.js'

// Extend Express Request to include API key info
declare global {
  namespace Express {
    interface Request {
      apiKey?: string
      apiKeyInfo?: {
        name: string
        permissions: ApiPermission[]
        rateLimit: number
      }
    }
  }
}

// Extract API key from request
function extractApiKey(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key']
  if (apiKeyHeader && typeof apiKeyHeader === 'string') {
    return apiKeyHeader
  }

  // Check query parameter
  const apiKeyQuery = req.query.apiKey
  if (apiKeyQuery && typeof apiKeyQuery === 'string') {
    return apiKeyQuery
  }

  return null
}

// Authentication middleware
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const apiKey = extractApiKey(req)

  if (!apiKey) {
    const response: ApiResponse = {
      success: false,
      error: 'API key required. Provide it via Authorization header, X-API-Key header, or apiKey query parameter.',
      timestamp: new Date().toISOString()
    }
    return res.status(401).json(response)
  }

  const authResult = authService.validateApiKey(apiKey)

  if (!authResult.valid) {
    const response: ApiResponse = {
      success: false,
      error: authResult.error || 'Invalid API key',
      timestamp: new Date().toISOString()
    }
    return res.status(401).json(response)
  }

  // Attach API key info to request
  req.apiKey = apiKey
  req.apiKeyInfo = authResult.keyInfo

  next()
}

// Permission check middleware factory
export function requirePermission(permission: ApiPermission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      }
      return res.status(401).json(response)
    }

    if (!authService.hasPermission(req.apiKey, permission)) {
      const response: ApiResponse = {
        success: false,
        error: `Permission '${permission}' required`,
        timestamp: new Date().toISOString()
      }
      return res.status(403).json(response)
    }

    next()
  }
}

// Optional authentication middleware (for public endpoints with enhanced features for authenticated users)
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = extractApiKey(req)

  if (apiKey) {
    const authResult = authService.validateApiKey(apiKey)
    if (authResult.valid) {
      req.apiKey = apiKey
      req.apiKeyInfo = authResult.keyInfo
    }
  }

  next()
}

// CORS origin validation middleware
export function validateOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin

  // Skip origin check for non-browser requests
  if (!origin) {
    return next()
  }

  // If no API key, use default CORS policy
  if (!req.apiKey) {
    return next()
  }

  // Check if origin is allowed for this API key
  if (!authService.isOriginAllowed(req.apiKey, origin)) {
    const response: ApiResponse = {
      success: false,
      error: 'Origin not allowed for this API key',
      timestamp: new Date().toISOString()
    }
    return res.status(403).json(response)
  }

  next()
}