import type { Request, Response, NextFunction } from 'express'
import { authService } from '@/services/authService.js'
import type { ApiResponse, RateLimitInfo } from '@/types/api.js'

interface RateLimitTracker {
  requests: number
  resetTime: number
}

class RateLimitManager {
  private trackers: Map<string, RateLimitTracker> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired trackers every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  // Get or create rate limit tracker for a key
  private getTracker(key: string, windowMs: number): RateLimitTracker {
    const now = Date.now()
    let tracker = this.trackers.get(key)

    if (!tracker || now > tracker.resetTime) {
      tracker = {
        requests: 0,
        resetTime: now + windowMs
      }
      this.trackers.set(key, tracker)
    }

    return tracker
  }

  // Check if request is within rate limit
  checkRateLimit(key: string, limit: number, windowMs: number): RateLimitInfo {
    const tracker = this.getTracker(key, windowMs)
    const now = Date.now()

    const rateLimitInfo: RateLimitInfo = {
      limit,
      remaining: Math.max(0, limit - tracker.requests),
      resetTime: tracker.resetTime
    }

    if (tracker.requests >= limit) {
      rateLimitInfo.retryAfter = Math.ceil((tracker.resetTime - now) / 1000)
      return rateLimitInfo
    }

    // Increment request count
    tracker.requests++
    rateLimitInfo.remaining = Math.max(0, limit - tracker.requests)

    return rateLimitInfo
  }

  // Clean up expired trackers
  private cleanup() {
    const now = Date.now()
    for (const [key, tracker] of this.trackers.entries()) {
      if (now > tracker.resetTime) {
        this.trackers.delete(key)
      }
    }
  }

  // Get current status for a key
  getStatus(key: string): RateLimitTracker | null {
    return this.trackers.get(key) || null
  }

  // Reset rate limit for a key
  reset(key: string): void {
    this.trackers.delete(key)
  }

  // Destroy the manager
  destroy() {
    clearInterval(this.cleanupInterval)
    this.trackers.clear()
  }
}

const rateLimitManager = new RateLimitManager()

// Rate limit middleware factory
export function createRateLimit(options: {
  windowMs: number
  defaultLimit: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Determine the identifier for rate limiting
    let identifier: string
    let limit: number

    if (req.apiKey) {
      // Use API key as identifier and get its specific rate limit
      identifier = req.apiKey
      limit = authService.getRateLimit(req.apiKey)
    } else {
      // Use IP address for non-authenticated requests
      identifier = req.ip || req.connection.remoteAddress || 'unknown'
      limit = options.defaultLimit
    }

    const rateLimitInfo = rateLimitManager.checkRateLimit(
      identifier,
      limit,
      options.windowMs
    )

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimitInfo.resetTime / 1000).toString()
    })

    // Check if rate limit exceeded
    if (rateLimitInfo.retryAfter) {
      res.set('Retry-After', rateLimitInfo.retryAfter.toString())

      const response: ApiResponse = {
        success: false,
        error: 'Rate limit exceeded',
        timestamp: new Date().toISOString()
      }

      return res.status(429).json(response)
    }

    next()
  }
}

// Per-endpoint rate limiting
export function createEndpointRateLimit(limit: number, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.apiKey || req.ip || 'unknown'
    const endpointKey = `${identifier}:${req.method}:${req.route?.path || req.path}`

    const rateLimitInfo = rateLimitManager.checkRateLimit(endpointKey, limit, windowMs)

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimitInfo.resetTime / 1000).toString()
    })

    if (rateLimitInfo.retryAfter) {
      res.set('Retry-After', rateLimitInfo.retryAfter.toString())

      const response: ApiResponse = {
        success: false,
        error: 'Endpoint rate limit exceeded',
        timestamp: new Date().toISOString()
      }

      return res.status(429).json(response)
    }

    next()
  }
}

// Export the manager for testing or manual operations
export { rateLimitManager }