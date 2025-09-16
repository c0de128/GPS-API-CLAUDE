import { useState, useEffect, useCallback, useRef } from 'react'
import { createApiClient, getApiClient, DEFAULT_API_CONFIG } from '../services/apiClient'
import { createApiWebSocketService, getApiWebSocketService } from '../services/apiWebSocketService'
import type {
  ApiConfig,
  GpsLocationUpdate,
  TripProgressUpdate,
  RealTimeStats,
  WebSocketMessage,
  TripSummary
} from '../types/api'

interface ApiIntegrationState {
  isConnected: boolean
  isLoading: boolean
  error: string | null
  realTimeStats: RealTimeStats | null
  currentTrip: TripProgressUpdate | null
  trips: TripSummary[]
}

interface UseApiIntegrationOptions {
  config?: Partial<ApiConfig>
  autoConnect?: boolean
  enableRealTimeStats?: boolean
  statsInterval?: number
}

export function useApiIntegration(options: UseApiIntegrationOptions = {}) {
  const {
    config = {},
    autoConnect = true,
    enableRealTimeStats = true,
    statsInterval = 30000
  } = options

  const [state, setState] = useState<ApiIntegrationState>({
    isConnected: false,
    isLoading: true,
    error: null,
    realTimeStats: null,
    currentTrip: null,
    trips: []
  })

  const apiConfigRef = useRef<ApiConfig>({ ...DEFAULT_API_CONFIG, ...config })
  const statsIntervalRef = useRef<number | null>(null)

  // Initialize API services
  useEffect(() => {
    const apiConfig = apiConfigRef.current

    // Create HTTP API client
    createApiClient(apiConfig)

    // Create WebSocket service
    const wsService = createApiWebSocketService({
      url: apiConfig.websocketUrl,
      apiKey: apiConfig.apiKey
    })

    // Set up WebSocket event handlers
    wsService.onConnection((connected) => {
      setState(prev => ({
        ...prev,
        isConnected: connected,
        isLoading: false,
        error: connected ? null : 'Connection lost'
      }))
    })

    wsService.onError((_error) => {
      setState(prev => ({
        ...prev,
        error: 'WebSocket connection error',
        isLoading: false
      }))
    })

    // Handle incoming messages
    wsService.on('gps:location', (message: WebSocketMessage) => {
      console.log('📍 Received GPS location update:', message.data)
    })

    wsService.on('trip:progress', (message: WebSocketMessage) => {
      const tripUpdate = message.data as TripProgressUpdate
      setState(prev => ({
        ...prev,
        currentTrip: tripUpdate
      }))
    })

    wsService.on('system:health', (message: WebSocketMessage) => {
      const stats = message.data as RealTimeStats
      setState(prev => ({
        ...prev,
        realTimeStats: stats
      }))
    })

    // Auto-connect if enabled
    if (autoConnect) {
      wsService.connect().catch(error => {
        console.error('Failed to connect to API:', error)
        setState(prev => ({
          ...prev,
          error: 'Failed to connect to API server',
          isLoading: false
        }))
      })

      // Start heartbeat
      wsService.startHeartbeat()
    }

    // Subscribe to relevant channels
    wsService.subscribe(['gps', 'trips', 'system'])

    return () => {
      wsService.disconnect()
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current)
      }
    }
  }, [autoConnect])

  // Fetch real-time stats periodically
  useEffect(() => {
    if (!enableRealTimeStats || !state.isConnected) return

    const fetchStats = async () => {
      try {
        const apiClient = getApiClient()
        if (apiClient) {
          const response = await apiClient.getRealTimeStats()
          if (response.success && response.data) {
            setState(prev => ({
              ...prev,
              realTimeStats: response.data!
            }))
          }
        }
      } catch (error) {
        console.error('Failed to fetch real-time stats:', error)
      }
    }

    // Initial fetch
    fetchStats()

    // Set up interval
    statsIntervalRef.current = setInterval(fetchStats, statsInterval) as unknown as number

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current)
        statsIntervalRef.current = null
      }
    }
  }, [state.isConnected, enableRealTimeStats, statsInterval])

  // Load initial trips data
  useEffect(() => {
    if (state.isConnected) {
      loadTrips()
    }
  }, [state.isConnected])

  // API methods
  const loadTrips = useCallback(async () => {
    try {
      const apiClient = getApiClient()
      if (apiClient) {
        const response = await apiClient.getTrips()
        if (response.success && response.data) {
          setState(prev => ({
            ...prev,
            trips: response.data!
          }))
        }
      }
    } catch (error) {
      console.error('Failed to load trips:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to load trips'
      }))
    }
  }, [])

  const createTrip = useCallback(async (name: string) => {
    try {
      const apiClient = getApiClient()
      if (apiClient) {
        const response = await apiClient.createTrip(name)
        if (response.success && response.data) {
          setState(prev => ({
            ...prev,
            currentTrip: response.data!,
            trips: [...prev.trips, {
              id: response.data!.tripId,
              name: response.data!.name,
              status: response.data!.status,
              startTime: response.data!.startTime,
              distance: response.data!.distance,
              duration: response.data!.duration,
              averageSpeed: response.data!.averageSpeed,
              maxSpeed: response.data!.maxSpeed,
              routePointsCount: response.data!.routePointsCount
            }]
          }))
          return response.data
        }
      }
    } catch (error) {
      console.error('Failed to create trip:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to create trip'
      }))
    }
  }, [])

  const startTrip = useCallback(async (tripId: string) => {
    try {
      const apiClient = getApiClient()
      if (apiClient) {
        const response = await apiClient.startTrip(tripId)
        if (response.success && response.data) {
          setState(prev => ({
            ...prev,
            currentTrip: response.data!
          }))
          return response.data
        }
      }
    } catch (error) {
      console.error('Failed to start trip:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to start trip'
      }))
    }
  }, [])

  const updateTripLocation = useCallback(async (tripId: string, location: GpsLocationUpdate) => {
    try {
      const apiClient = getApiClient()
      if (apiClient) {
        const response = await apiClient.updateTripLocation(tripId, location)
        if (response.success && response.data) {
          setState(prev => ({
            ...prev,
            currentTrip: response.data!
          }))

          // Also send via WebSocket for real-time updates
          const wsService = getApiWebSocketService()
          if (wsService && wsService.connected) {
            wsService.sendTripProgress(response.data!)
          }

          return response.data
        }
      }
    } catch (error) {
      console.error('Failed to update trip location:', error)
    }
  }, [])

  const completeTrip = useCallback(async (tripId: string) => {
    try {
      const apiClient = getApiClient()
      if (apiClient) {
        const response = await apiClient.completeTrip(tripId)
        if (response.success && response.data) {
          setState(prev => ({
            ...prev,
            currentTrip: null
          }))
          await loadTrips() // Refresh trips list
          return response.data
        }
      }
    } catch (error) {
      console.error('Failed to complete trip:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to complete trip'
      }))
    }
  }, [loadTrips])

  const updateGpsLocation = useCallback(async (location: GpsLocationUpdate) => {
    try {
      const apiClient = getApiClient()
      if (apiClient) {
        const response = await apiClient.updateLocation(location)

        // Send via WebSocket for real-time updates
        const wsService = getApiWebSocketService()
        if (wsService && wsService.connected) {
          wsService.sendGpsLocation(location)
        }

        return response
      }
    } catch (error) {
      console.error('Failed to update GPS location:', error)
    }
  }, [])

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const wsService = getApiWebSocketService()
      if (wsService) {
        await wsService.connect()
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to connect to API server',
        isLoading: false
      }))
    }
  }, [])

  const disconnect = useCallback(() => {
    const wsService = getApiWebSocketService()
    if (wsService) {
      wsService.disconnect()
    }
  }, [])

  return {
    // State
    ...state,

    // Methods
    connect,
    disconnect,
    loadTrips,
    createTrip,
    startTrip,
    updateTripLocation,
    completeTrip,
    updateGpsLocation,

    // Utilities
    apiClient: getApiClient(),
    wsService: getApiWebSocketService(),
  }
}