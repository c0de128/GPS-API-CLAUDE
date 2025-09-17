import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Activity,
  MapPin,
  Route,
  BarChart3,
  Clock,
  Users,
  Database,
  Settings,
  Play,
  Square,
  Copy,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface ApiResponse {
  success: boolean
  data?: any
  error?: string
  timestamp: string
}

interface EndpointConfig {
  id: string
  name: string
  description: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  endpoint: string
  icon: React.ReactNode
  category: string
  requiresAuth: boolean
  bodyData?: any
}

const API_BASE = 'http://localhost:3003/api/v1'
const API_KEY = 'gps_dev_1452bec4359a449aa8b35c97adcbb900'

export function ApiTestingPage() {
  const [responses, setResponses] = useState<Record<string, ApiResponse>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)

  const endpoints: EndpointConfig[] = [
    // GPS Endpoints
    {
      id: 'gps-current',
      name: 'Get Current Location',
      description: 'Get simulated GPS location (changes each time)',
      method: 'GET',
      endpoint: '/gps/location?simulate=true',
      icon: <MapPin className="w-4 h-4" />,
      category: 'GPS',
      requiresAuth: true
    },
    {
      id: 'gps-history',
      name: 'Get Location History',
      description: 'Get recent GPS location history (last 10)',
      method: 'GET',
      endpoint: '/gps/location/history?limit=10',
      icon: <Clock className="w-4 h-4" />,
      category: 'GPS',
      requiresAuth: true
    },
    {
      id: 'gps-status',
      name: 'Get GPS Status',
      description: 'Get current GPS tracking status',
      method: 'GET',
      endpoint: '/gps/status',
      icon: <Activity className="w-4 h-4" />,
      category: 'GPS',
      requiresAuth: true
    },
    {
      id: 'gps-start',
      name: 'Start GPS Tracking',
      description: 'Start GPS tracking session',
      method: 'POST',
      endpoint: '/gps/start',
      icon: <Play className="w-4 h-4" />,
      category: 'GPS',
      requiresAuth: true
    },
    {
      id: 'gps-stop',
      name: 'Stop GPS Tracking',
      description: 'Stop GPS tracking session',
      method: 'POST',
      endpoint: '/gps/stop',
      icon: <Square className="w-4 h-4" />,
      category: 'GPS',
      requiresAuth: true
    },

    // Trip Endpoints
    {
      id: 'trips-list',
      name: 'Get All Trips',
      description: 'List all recorded trips',
      method: 'GET',
      endpoint: '/trips',
      icon: <Route className="w-4 h-4" />,
      category: 'Trips',
      requiresAuth: true
    },
    {
      id: 'trips-create',
      name: 'Create New Trip',
      description: 'Create a new trip record',
      method: 'POST',
      endpoint: '/trips',
      icon: <Route className="w-4 h-4" />,
      category: 'Trips',
      requiresAuth: true,
      bodyData: { name: 'Test Trip from API Testing' }
    },

    // Statistics Endpoints
    {
      id: 'stats-realtime',
      name: 'Get Real-time Stats',
      description: 'Get current system statistics',
      method: 'GET',
      endpoint: '/stats/realtime',
      icon: <BarChart3 className="w-4 h-4" />,
      category: 'Statistics',
      requiresAuth: true
    },
    {
      id: 'stats-trips',
      name: 'Get Trip Statistics',
      description: 'Get aggregated trip statistics',
      method: 'GET',
      endpoint: '/stats/trips',
      icon: <BarChart3 className="w-4 h-4" />,
      category: 'Statistics',
      requiresAuth: true
    },
    {
      id: 'stats-performance',
      name: 'Get Performance Metrics',
      description: 'Get system performance data',
      method: 'GET',
      endpoint: '/stats/performance',
      icon: <Database className="w-4 h-4" />,
      category: 'Statistics',
      requiresAuth: true
    },

    // Admin Endpoints
    {
      id: 'admin-keys',
      name: 'List API Keys',
      description: 'Get all API keys (admin only)',
      method: 'GET',
      endpoint: '/admin/keys',
      icon: <Settings className="w-4 h-4" />,
      category: 'Admin',
      requiresAuth: true
    },
    {
      id: 'admin-stats',
      name: 'Get Admin Statistics',
      description: 'Get administrative statistics',
      method: 'GET',
      endpoint: '/admin/stats',
      icon: <Users className="w-4 h-4" />,
      category: 'Admin',
      requiresAuth: true
    },

    // System Endpoints
    {
      id: 'health',
      name: 'Health Check',
      description: 'Check API server health',
      method: 'GET',
      endpoint: '/health',
      icon: <CheckCircle className="w-4 h-4" />,
      category: 'System',
      requiresAuth: false
    }
  ]

  const makeApiRequest = async (config: EndpointConfig) => {
    const { id, method, endpoint, bodyData } = config

    setLoading(prev => ({ ...prev, [id]: true }))

    try {
      const url = endpoint === '/health' ?
        'http://localhost:3003/health' :
        `${API_BASE}${endpoint}`

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (config.requiresAuth) {
        headers['X-API-Key'] = API_KEY
      }

      const options: RequestInit = {
        method,
        headers
      }

      if (bodyData && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(bodyData)
      }

      const response = await fetch(url, options)
      const data = await response.json()

      setResponses(prev => ({
        ...prev,
        [id]: {
          success: response.ok,
          data: response.ok ? data : undefined,
          error: !response.ok ? data.error || `HTTP ${response.status}` : undefined,
          timestamp: new Date().toISOString()
        }
      }))
    } catch (error) {
      setResponses(prev => ({
        ...prev,
        [id]: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const generateCurlCommand = (config: EndpointConfig): string => {
    const { method, endpoint, bodyData, requiresAuth } = config

    const url = endpoint === '/health' ?
      'http://localhost:3003/health' :
      `${API_BASE}${endpoint}`

    let command = `curl -X ${method}`

    if (requiresAuth) {
      command += ` -H "X-API-Key: ${API_KEY}"`
    }

    if (bodyData && (method === 'POST' || method === 'PUT')) {
      command += ` -H "Content-Type: application/json"`
      command += ` -d '${JSON.stringify(bodyData)}'`
    }

    command += ` "${url}"`

    return command
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCommand(id)
      setTimeout(() => setCopiedCommand(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const formatResponseData = (response: ApiResponse) => {
    if (!response.success && response.error) {
      return `Error: ${response.error}`
    }

    if (response.data) {
      return JSON.stringify(response.data, null, 2)
    }

    return 'No data'
  }

  const getStatusIcon = (response: ApiResponse) => {
    if (response.success) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    return <XCircle className="w-4 h-4 text-red-500" />
  }

  const categories = [...new Set(endpoints.map(e => e.category))]

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              API Testing Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Test all GPS tracking API endpoints with real-time responses and curl commands
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {API_BASE.replace('http://localhost:', 'Port ')}
          </Badge>
        </div>

        {/* API Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              API Server Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-500">
                Connected
              </Badge>
              <span className="text-sm text-muted-foreground">
                Ready to test {endpoints.length} endpoints
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Endpoint Categories */}
        {categories.map(category => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {category === 'GPS' && <MapPin className="w-5 h-5" />}
                {category === 'Trips' && <Route className="w-5 h-5" />}
                {category === 'Statistics' && <BarChart3 className="w-5 h-5" />}
                {category === 'Admin' && <Settings className="w-5 h-5" />}
                {category === 'System' && <Database className="w-5 h-5" />}
                {category} Endpoints
              </CardTitle>
              <CardDescription>
                {category === 'GPS' && 'Real-time GPS location and tracking endpoints'}
                {category === 'Trips' && 'Trip management and route data endpoints'}
                {category === 'Statistics' && 'Analytics and performance metrics'}
                {category === 'Admin' && 'Administrative and configuration endpoints'}
                {category === 'System' && 'System health and status endpoints'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {endpoints.filter(e => e.category === category).map(config => {
                const response = responses[config.id]
                const isLoading = loading[config.id]
                const curlCommand = generateCurlCommand(config)

                return (
                  <div key={config.id} className="space-y-4">
                    {/* Button and Description Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Button
                          onClick={() => makeApiRequest(config)}
                          disabled={isLoading}
                          variant="default"
                          size="sm"
                          className="min-w-[140px]"
                        >
                          {config.icon}
                          {isLoading ? 'Loading...' : config.name}
                        </Button>
                        <Badge variant={config.method === 'GET' ? 'secondary' : 'default'}>
                          {config.method}
                        </Badge>
                        {config.requiresAuth && (
                          <Badge variant="outline" className="text-xs">
                            AUTH
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {config.description}
                      </p>
                    </div>

                    {/* Response Data Section - Full Width */}
                    {response && (
                      <div className="bg-muted p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-3">
                          {getStatusIcon(response)}
                          <span className="text-sm font-semibold">
                            {response.success ? 'Success' : 'Error'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(response.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="bg-background border rounded-md p-3">
                          <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-[50vh] min-h-[2rem]">
                            {formatResponseData(response)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Curl Command Section */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-300 text-sm font-medium">cURL Command:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(curlCommand, config.id)}
                          className="h-7 px-3 text-slate-400 hover:text-green-400 hover:bg-slate-800"
                        >
                          {copiedCommand === config.id ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              <span className="text-xs">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              <span className="text-xs">Copy</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="bg-slate-900 border border-slate-700 rounded p-3">
                        <code className="text-green-400 text-sm font-mono break-all leading-relaxed">
                          {curlCommand}
                        </code>
                      </div>
                    </div>

                    {/* Separator between endpoints in the same category */}
                    {endpoints.filter(e => e.category === category).indexOf(config) <
                     endpoints.filter(e => e.category === category).length - 1 && (
                      <Separator className="my-6" />
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}