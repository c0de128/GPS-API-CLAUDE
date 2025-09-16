import type {
  ApiResponse,
  ApiConfig,
  GpsLocationUpdate,
  GpsStatus,
  TripProgressUpdate,
  TripSummary,
  TripRoute,
  RealTimeStats,
  TripStatsSummary
} from '../types/api'

export class ApiClient {
  private config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = {
      timeout: 10000,
      ...config
    }
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    // Add timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      return data
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  // GPS API methods
  async getCurrentLocation(): Promise<ApiResponse<GpsLocationUpdate>> {
    return this.request<GpsLocationUpdate>('/api/v1/gps/location')
  }

  async getLocationHistory(limit = 100, offset = 0): Promise<ApiResponse<{
    locations: GpsLocationUpdate[]
    total: number
    limit: number
    offset: number
  }>> {
    return this.request(`/api/v1/gps/location/history?limit=${limit}&offset=${offset}`)
  }

  async updateLocation(location: GpsLocationUpdate): Promise<ApiResponse<GpsLocationUpdate>> {
    return this.request<GpsLocationUpdate>('/api/v1/gps/location', {
      method: 'POST',
      body: JSON.stringify(location),
    })
  }

  async getGpsStatus(): Promise<ApiResponse<GpsStatus>> {
    return this.request<GpsStatus>('/api/v1/gps/status')
  }

  async startGpsTracking(): Promise<ApiResponse> {
    return this.request('/api/v1/gps/start', {
      method: 'POST',
    })
  }

  async stopGpsTracking(): Promise<ApiResponse> {
    return this.request('/api/v1/gps/stop', {
      method: 'POST',
    })
  }

  // Trip API methods
  async getTrips(): Promise<ApiResponse<TripSummary[]>> {
    return this.request<TripSummary[]>('/api/v1/trips')
  }

  async getTrip(tripId: string): Promise<ApiResponse<TripProgressUpdate>> {
    return this.request<TripProgressUpdate>(`/api/v1/trips/${tripId}`)
  }

  async getTripRoute(tripId: string): Promise<ApiResponse<TripRoute>> {
    return this.request<TripRoute>(`/api/v1/trips/${tripId}/route`)
  }

  async createTrip(name: string): Promise<ApiResponse<TripProgressUpdate>> {
    return this.request<TripProgressUpdate>('/api/v1/trips', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  }

  async startTrip(tripId: string): Promise<ApiResponse<TripProgressUpdate>> {
    return this.request<TripProgressUpdate>(`/api/v1/trips/${tripId}/start`, {
      method: 'POST',
    })
  }

  async updateTripLocation(
    tripId: string,
    location: GpsLocationUpdate
  ): Promise<ApiResponse<TripProgressUpdate>> {
    return this.request<TripProgressUpdate>(`/api/v1/trips/${tripId}/location`, {
      method: 'POST',
      body: JSON.stringify(location),
    })
  }

  async completeTrip(tripId: string): Promise<ApiResponse<TripProgressUpdate>> {
    return this.request<TripProgressUpdate>(`/api/v1/trips/${tripId}/complete`, {
      method: 'POST',
    })
  }

  async deleteTrip(tripId: string): Promise<ApiResponse> {
    return this.request(`/api/v1/trips/${tripId}`, {
      method: 'DELETE',
    })
  }

  // Statistics API methods
  async getRealTimeStats(): Promise<ApiResponse<RealTimeStats>> {
    return this.request<RealTimeStats>('/api/v1/stats/realtime')
  }

  async getTripStats(period: 'all' | 'week' | 'month' = 'all'): Promise<ApiResponse<TripStatsSummary>> {
    return this.request<TripStatsSummary>(`/api/v1/stats/trips?period=${period}`)
  }

  async getPerformanceMetrics(): Promise<ApiResponse<any>> {
    return this.request('/api/v1/stats/performance')
  }

  async getUsageStats(period: 'today' | 'week' | 'month' = 'today'): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/stats/usage?period=${period}`)
  }

  // Health check
  async getHealth(): Promise<any> {
    const url = `${this.config.baseUrl}/health`
    const response = await fetch(url)
    return response.json()
  }

  // Get API documentation
  async getApiDocs(): Promise<any> {
    const url = `${this.config.baseUrl}/api`
    const response = await fetch(url)
    return response.json()
  }
}

// Singleton service instance
let apiClient: ApiClient | null = null

export function createApiClient(config: ApiConfig): ApiClient {
  apiClient = new ApiClient(config)
  return apiClient
}

export function getApiClient(): ApiClient | null {
  return apiClient
}

// Default configuration for development
export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: 'http://localhost:3001',
  websocketUrl: 'ws://localhost:3001/ws',
  apiKey: 'gps_dev_1452bec4359a449aa8b35c97adcbb900', // Fixed development API key
  timeout: 10000
}