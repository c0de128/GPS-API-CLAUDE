import { Router } from 'express'
import { authService } from '@/services/authService.js'
import { authenticate } from '@/middleware/auth.js'
import type { ApiResponse, ApiKey, ApiPermission } from '@/types/api.js'
import type { Request, Response } from 'express'
import { dataStore, recordApiUsage } from '@/services/dataStore.js'

const router = Router()

// Middleware to check admin permissions
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const apiKey = req.headers['x-api-key'] as string

  if (!apiKey || !authService.hasPermission(apiKey, 'admin')) {
    const response: ApiResponse = {
      success: false,
      error: 'Admin permissions required',
      timestamp: new Date().toISOString()
    }
    return res.status(403).json(response)
  }

  next()
}

// Apply authentication and admin check to all routes
router.use(authenticate, requireAdmin)

// GET /admin/keys - List all API keys
router.get('/keys', (req: Request, res: Response) => {
  const apiKey = req.apiKey!
  recordApiUsage(apiKey)

  try {
    // Get API keys from data store with usage information
    const keys = Array.from(dataStore.apiKeys.values()).map(key => {
      const usage = dataStore.metrics.apiUsage.get(key.key)
      return {
        ...key,
        usage: usage ? {
          totalRequests: usage.requests,
          lastRequest: usage.lastRequest ? new Date(usage.lastRequest).toISOString() : null,
          errorCount: usage.errors
        } : {
          totalRequests: 0,
          lastRequest: null,
          errorCount: 0
        }
      }
    })

    const response: ApiResponse = {
      success: true,
      data: keys,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    recordApiUsage(apiKey, true)
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve API keys',
      timestamp: new Date().toISOString()
    }
    res.status(500).json(response)
  }
})

// POST /admin/keys - Create new API key
router.post('/keys', (req: Request, res: Response) => {
  const apiKey = req.apiKey!
  recordApiUsage(apiKey)

  try {
    const { name, permissions, rateLimit, origins } = req.body

    // Validation
    if (!name || typeof name !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'Name is required and must be a string',
        timestamp: new Date().toISOString()
      }
      return res.status(400).json(response)
    }

    if (!permissions || !Array.isArray(permissions)) {
      const response: ApiResponse = {
        success: false,
        error: 'Permissions are required and must be an array',
        timestamp: new Date().toISOString()
      }
      return res.status(400).json(response)
    }

    // Validate permissions
    const validPermissions: ApiPermission[] = ['gps:read', 'trips:read', 'trips:write', 'stats:read', 'admin']
    const invalidPermissions = permissions.filter((p: string) => !validPermissions.includes(p as ApiPermission))

    if (invalidPermissions.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: `Invalid permissions: ${invalidPermissions.join(', ')}`,
        timestamp: new Date().toISOString()
      }
      return res.status(400).json(response)
    }

    const newKey = authService.generateApiKey(
      name,
      permissions as ApiPermission[],
      rateLimit || 100,
      origins || ['*']
    )

    const response: ApiResponse = {
      success: true,
      data: newKey,
      message: 'API key created successfully',
      timestamp: new Date().toISOString()
    }

    res.status(201).json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create API key',
      timestamp: new Date().toISOString()
    }
    res.status(500).json(response)
  }
})

// GET /admin/keys/:keyId - Get specific API key info
router.get('/keys/:keyId', (req: Request, res: Response) => {
  try {
    const { keyId } = req.params
    const keyInfo = authService.getApiKeyInfo(keyId)

    if (!keyInfo) {
      const response: ApiResponse = {
        success: false,
        error: 'API key not found',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    const response: ApiResponse = {
      success: true,
      data: {
        ...keyInfo,
        key: authService.maskApiKey(keyInfo.key) // Mask the key for security
      },
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve API key',
      timestamp: new Date().toISOString()
    }
    res.status(500).json(response)
  }
})

// PUT /admin/keys/:keyId/enable - Enable API key
router.put('/keys/:keyId/enable', (req: Request, res: Response) => {
  try {
    const { keyId } = req.params
    const success = authService.enableApiKey(keyId)

    if (!success) {
      const response: ApiResponse = {
        success: false,
        error: 'API key not found',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    const response: ApiResponse = {
      success: true,
      message: 'API key enabled successfully',
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to enable API key',
      timestamp: new Date().toISOString()
    }
    res.status(500).json(response)
  }
})

// PUT /admin/keys/:keyId/disable - Disable API key
router.put('/keys/:keyId/disable', (req: Request, res: Response) => {
  try {
    const { keyId } = req.params
    const success = authService.disableApiKey(keyId)

    if (!success) {
      const response: ApiResponse = {
        success: false,
        error: 'API key not found',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    const response: ApiResponse = {
      success: true,
      message: 'API key disabled successfully',
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to disable API key',
      timestamp: new Date().toISOString()
    }
    res.status(500).json(response)
  }
})

// DELETE /admin/keys/:keyId - Delete API key
router.delete('/keys/:keyId', (req: Request, res: Response) => {
  try {
    const { keyId } = req.params
    const success = authService.deleteApiKey(keyId)

    if (!success) {
      const response: ApiResponse = {
        success: false,
        error: 'API key not found',
        timestamp: new Date().toISOString()
      }
      return res.status(404).json(response)
    }

    const response: ApiResponse = {
      success: true,
      message: 'API key deleted successfully',
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete API key',
      timestamp: new Date().toISOString()
    }
    res.status(500).json(response)
  }
})

// GET /admin/stats - Get admin statistics
router.get('/stats', (req: Request, res: Response) => {
  const apiKey = req.apiKey!
  recordApiUsage(apiKey)

  try {
    const allKeys = Array.from(dataStore.apiKeys.values())

    const stats = {
      totalKeys: allKeys.length,
      activeKeys: allKeys.filter(key => key.active).length,
      adminKeys: allKeys.filter(key => key.permissions.includes('admin')).length,
      recentlyUsed: allKeys.filter(key => {
        if (!key.lastUsed) return false
        const lastUsed = new Date(key.lastUsed)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        return lastUsed > yesterday
      }).length,
      permissionDistribution: {
        'gps:read': allKeys.filter(key => key.permissions.includes('gps:read')).length,
        'trips:read': allKeys.filter(key => key.permissions.includes('trips:read')).length,
        'trips:write': allKeys.filter(key => key.permissions.includes('trips:write')).length,
        'stats:read': allKeys.filter(key => key.permissions.includes('stats:read')).length,
        'admin': allKeys.filter(key => key.permissions.includes('admin')).length
      }
    }

    const response: ApiResponse = {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve admin statistics',
      timestamp: new Date().toISOString()
    }
    res.status(500).json(response)
  }
})

// GET /admin/config - Get server configuration
router.get('/config', (req: Request, res: Response) => {
  try {
    const config = {
      environment: process.env.NODE_ENV || 'development',
      version: 'v1',
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 1000
      },
      cors: {
        origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173']
      }
    }

    const response: ApiResponse = {
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve server configuration',
      timestamp: new Date().toISOString()
    }
    res.status(500).json(response)
  }
})

export const adminRouter = router