import { Router } from 'express'
import type { Request, Response } from 'express'
import { authenticate, requirePermission } from '@/middleware/auth.js'
import { createEndpointRateLimit } from '@/middleware/rateLimit.js'
import type { ApiResponse, RealTimeStats, TripStatsSummary } from '@/types/api.js'

const router = Router()

// Mock data for demo purposes (use real database queries in production)
const serverStartTime = Date.now()

// Get real-time system statistics
router.get('/realtime',
  authenticate,
  createEndpointRateLimit(30, 60000),
  requirePermission('stats:read'),
  (req: Request, res: Response) => {
    const now = Date.now()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()

    // Mock statistics (replace with real data from your storage)
    const stats: RealTimeStats = {
      activeTrips: Math.floor(Math.random() * 10) + 1,
      totalTripsToday: Math.floor(Math.random() * 50) + 10,
      totalDistanceToday: Math.round((Math.random() * 500 + 100) * 100) / 100, // km
      activeUsers: Math.floor(Math.random() * 25) + 5,
      systemHealth: 'healthy',
      uptime: now - serverStartTime,
      lastUpdate: now
    }

    const response: ApiResponse<RealTimeStats> = {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Get trip statistics summary
router.get('/trips',
  authenticate,
  createEndpointRateLimit(20, 60000),
  requirePermission('stats:read'),
  (req: Request, res: Response) => {
    const period = req.query.period as string || 'all' // all, week, month

    // Mock trip statistics (replace with real aggregated data)
    const baseStats = {
      totalTrips: Math.floor(Math.random() * 200) + 50,
      totalDistance: Math.round((Math.random() * 2000 + 500) * 100) / 100,
      totalDuration: Math.floor(Math.random() * 100000) + 50000, // milliseconds
      averageSpeed: Math.round((Math.random() * 20 + 15) * 100) / 100,
      maxSpeed: Math.round((Math.random() * 30 + 40) * 100) / 100,
      longestTrip: Math.round((Math.random() * 100 + 50) * 100) / 100,
      shortestTrip: Math.round((Math.random() * 5 + 1) * 100) / 100
    }

    let stats: TripStatsSummary

    switch (period) {
      case 'week':
        stats = {
          ...baseStats,
          totalTrips: Math.floor(baseStats.totalTrips * 0.1),
          totalDistance: Math.round(baseStats.totalDistance * 0.1 * 100) / 100,
          tripsThisWeek: Math.floor(baseStats.totalTrips * 0.05),
          tripsThisMonth: Math.floor(baseStats.totalTrips * 0.2)
        }
        break
      case 'month':
        stats = {
          ...baseStats,
          totalTrips: Math.floor(baseStats.totalTrips * 0.3),
          totalDistance: Math.round(baseStats.totalDistance * 0.3 * 100) / 100,
          tripsThisWeek: Math.floor(baseStats.totalTrips * 0.05),
          tripsThisMonth: Math.floor(baseStats.totalTrips * 0.1)
        }
        break
      default: // all
        stats = {
          ...baseStats,
          tripsThisWeek: Math.floor(baseStats.totalTrips * 0.02),
          tripsThisMonth: Math.floor(baseStats.totalTrips * 0.08)
        }
    }

    const response: ApiResponse<TripStatsSummary> = {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Get performance metrics
router.get('/performance',
  authenticate,
  createEndpointRateLimit(20, 60000),
  requirePermission('stats:read'),
  (req: Request, res: Response) => {
    const metrics = {
      responseTime: {
        average: Math.round((Math.random() * 100 + 50) * 100) / 100, // ms
        p95: Math.round((Math.random() * 200 + 100) * 100) / 100,
        p99: Math.round((Math.random() * 500 + 200) * 100) / 100
      },
      throughput: {
        requestsPerSecond: Math.round((Math.random() * 50 + 10) * 100) / 100,
        requestsPerMinute: Math.round((Math.random() * 3000 + 600) * 100) / 100
      },
      resources: {
        memoryUsage: Math.round((Math.random() * 60 + 20) * 100) / 100, // percentage
        cpuUsage: Math.round((Math.random() * 40 + 10) * 100) / 100, // percentage
        diskUsage: Math.round((Math.random() * 70 + 20) * 100) / 100 // percentage
      },
      errors: {
        errorRate: Math.round((Math.random() * 2) * 100) / 100, // percentage
        totalErrors: Math.floor(Math.random() * 10),
        last24Hours: Math.floor(Math.random() * 50)
      }
    }

    const response: ApiResponse<typeof metrics> = {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

// Get API usage statistics
router.get('/usage',
  authenticate,
  createEndpointRateLimit(20, 60000),
  requirePermission('stats:read'),
  (req: Request, res: Response) => {
    const apiKey = req.apiKey!
    const period = req.query.period as string || 'today' // today, week, month

    // Mock usage statistics for the authenticated API key
    const baseUsage = {
      totalRequests: Math.floor(Math.random() * 1000) + 100,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: Math.round((Math.random() * 200 + 50) * 100) / 100,
      dataTransferred: Math.round((Math.random() * 10 + 1) * 100) / 100, // MB
      rateLimitHits: Math.floor(Math.random() * 5),
      topEndpoints: [
        { endpoint: '/api/v1/gps/location', requests: Math.floor(Math.random() * 200) + 50 },
        { endpoint: '/api/v1/trips', requests: Math.floor(Math.random() * 100) + 20 },
        { endpoint: '/api/v1/stats/realtime', requests: Math.floor(Math.random() * 50) + 10 }
      ]
    }

    baseUsage.successfulRequests = Math.floor(baseUsage.totalRequests * 0.95)
    baseUsage.failedRequests = baseUsage.totalRequests - baseUsage.successfulRequests

    let periodMultiplier = 1
    switch (period) {
      case 'week':
        periodMultiplier = 7
        break
      case 'month':
        periodMultiplier = 30
        break
    }

    const usage = {
      period,
      totalRequests: Math.floor(baseUsage.totalRequests * periodMultiplier),
      successfulRequests: Math.floor(baseUsage.successfulRequests * periodMultiplier),
      failedRequests: Math.floor(baseUsage.failedRequests * periodMultiplier),
      averageResponseTime: baseUsage.averageResponseTime,
      dataTransferred: Math.round(baseUsage.dataTransferred * periodMultiplier * 100) / 100,
      rateLimitHits: Math.floor(baseUsage.rateLimitHits * periodMultiplier),
      topEndpoints: baseUsage.topEndpoints.map(endpoint => ({
        ...endpoint,
        requests: Math.floor(endpoint.requests * periodMultiplier)
      })),
      dailyBreakdown: Array.from({ length: Math.min(periodMultiplier, 30) }, (_, i) => ({
        date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        requests: Math.floor(Math.random() * 100) + 20,
        errors: Math.floor(Math.random() * 5)
      })).reverse()
    }

    const response: ApiResponse<typeof usage> = {
      success: true,
      data: usage,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  }
)

export { router as statsRouter }