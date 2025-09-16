import { v4 as uuidv4 } from 'uuid'
import type { ApiKey, ApiPermission, AuthResponse } from '@/types/api.js'

class AuthService {
  private apiKeys: Map<string, ApiKey> = new Map()

  constructor() {
    this.initializeDefaultKeys()
  }

  // Initialize with default API keys for development
  private initializeDefaultKeys() {
    // Use fixed keys for development to avoid frontend synchronization issues
    const DEV_API_KEY = 'gps_dev_1452bec4359a449aa8b35c97adcbb900'
    const ADMIN_API_KEY = 'gps_admin_28f24742193a4b3eb45612c3248fb6ee'

    // Remove existing keys with these IDs if they exist
    for (const [key, apiKey] of this.apiKeys) {
      if (apiKey.name === 'Development Key' || apiKey.name === 'Admin Key') {
        this.apiKeys.delete(key)
      }
    }

    // Create fixed development key
    const defaultKey: ApiKey = {
      id: 'dev-key-fixed',
      key: DEV_API_KEY,
      name: 'Development Key',
      permissions: ['gps:read', 'trips:read', 'trips:write', 'stats:read'],
      createdAt: new Date().toISOString(),
      isActive: true,
      rateLimit: 1000,
      origins: ['http://localhost:3000', 'http://localhost:5173']
    }

    // Create fixed admin key
    const adminKey: ApiKey = {
      id: 'admin-key-fixed',
      key: ADMIN_API_KEY,
      name: 'Admin Key',
      permissions: ['gps:read', 'trips:read', 'trips:write', 'stats:read', 'admin'],
      createdAt: new Date().toISOString(),
      isActive: true,
      rateLimit: 2000,
      origins: ['http://localhost:3000', 'http://localhost:5173']
    }

    this.apiKeys.set(DEV_API_KEY, defaultKey)
    this.apiKeys.set(ADMIN_API_KEY, adminKey)

    console.log(`🔑 Fixed Development API Key: ${DEV_API_KEY}`)
    console.log(`📋 Development Permissions: ${defaultKey.permissions.join(', ')}`)
    console.log(`🔐 Fixed Admin API Key: ${ADMIN_API_KEY}`)
    console.log(`👑 Admin Permissions: ${adminKey.permissions.join(', ')}`)
  }

  // Generate a new API key
  generateApiKey(
    name: string,
    permissions: ApiPermission[],
    rateLimit: number = 100,
    origins: string[] = ['*']
  ): ApiKey {
    const key = `gps_${uuidv4().replace(/-/g, '')}`
    const apiKey: ApiKey = {
      id: uuidv4(),
      key,
      name,
      permissions,
      createdAt: new Date().toISOString(),
      isActive: true,
      rateLimit,
      origins
    }

    this.apiKeys.set(key, apiKey)
    return apiKey
  }

  // Validate an API key
  validateApiKey(key: string): AuthResponse {
    const apiKey = this.apiKeys.get(key)

    if (!apiKey) {
      return {
        valid: false,
        error: 'Invalid API key'
      }
    }

    if (!apiKey.isActive) {
      return {
        valid: false,
        error: 'API key is disabled'
      }
    }

    // Update last used timestamp
    apiKey.lastUsed = new Date().toISOString()

    return {
      valid: true,
      keyInfo: {
        name: apiKey.name,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit
      }
    }
  }

  // Check if API key has specific permission
  hasPermission(key: string, permission: ApiPermission): boolean {
    const apiKey = this.apiKeys.get(key)
    if (!apiKey || !apiKey.isActive) return false

    return apiKey.permissions.includes(permission) || apiKey.permissions.includes('admin')
  }

  // Get API key info
  getApiKeyInfo(key: string): ApiKey | null {
    return this.apiKeys.get(key) || null
  }

  // List all API keys (admin only)
  listApiKeys(maskKeys: boolean = true): ApiKey[] {
    return Array.from(this.apiKeys.values()).map(key => ({
      ...key,
      key: maskKeys ? this.maskApiKey(key.key) : key.key
    }))
  }

  // Get API keys for internal use (no masking)
  getAllApiKeys(): ApiKey[] {
    return Array.from(this.apiKeys.values())
  }

  // Disable an API key
  disableApiKey(key: string): boolean {
    const apiKey = this.apiKeys.get(key)
    if (apiKey) {
      apiKey.isActive = false
      return true
    }
    return false
  }

  // Enable an API key
  enableApiKey(key: string): boolean {
    const apiKey = this.apiKeys.get(key)
    if (apiKey) {
      apiKey.isActive = true
      return true
    }
    return false
  }

  // Delete an API key
  deleteApiKey(key: string): boolean {
    return this.apiKeys.delete(key)
  }

  // Mask API key for display
  maskApiKey(key: string): string {
    if (key.length <= 8) return '****'
    return key.substring(0, 4) + '****' + key.substring(key.length - 4)
  }

  // Get rate limit for API key
  getRateLimit(key: string): number {
    const apiKey = this.apiKeys.get(key)
    return apiKey?.rateLimit || 60 // Default 60 requests per minute
  }

  // Check if origin is allowed for API key
  isOriginAllowed(key: string, origin: string): boolean {
    const apiKey = this.apiKeys.get(key)
    if (!apiKey) return false

    // Allow all origins if '*' is in the list
    if (apiKey.origins.includes('*')) return true

    // Check exact match or wildcard patterns
    return apiKey.origins.some(allowedOrigin => {
      if (allowedOrigin === origin) return true

      // Simple wildcard support (*.domain.com)
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.substring(2)
        return origin.endsWith(domain)
      }

      return false
    })
  }
}

export const authService = new AuthService()