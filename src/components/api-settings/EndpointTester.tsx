import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TestTube,
  Play,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  Code
} from 'lucide-react'

interface ApiEndpoint {
  id: string
  category: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  requiresAuth: boolean
  samplePayload?: any
}

interface TestResult {
  id: string
  endpoint: string
  method: string
  status: number
  responseTime: number
  response: any
  timestamp: string
  success: boolean
}

export function EndpointTester() {
  const [selectedCategory, setSelectedCategory] = useState<string>('gps')
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('')
  const [apiKey, setApiKey] = useState('')
  const [requestBody, setRequestBody] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])

  const endpoints: ApiEndpoint[] = [
    {
      id: 'gps-status',
      category: 'gps',
      method: 'GET',
      path: '/api/v1/gps/status',
      description: 'Get GPS tracking status',
      requiresAuth: true
    },
    {
      id: 'gps-location',
      category: 'gps',
      method: 'GET',
      path: '/api/v1/gps/location',
      description: 'Get current GPS location',
      requiresAuth: true
    },
    {
      id: 'gps-update',
      category: 'gps',
      method: 'POST',
      path: '/api/v1/gps/location',
      description: 'Update GPS location',
      requiresAuth: true,
      samplePayload: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        speed: 25
      }
    },
    {
      id: 'gps-history',
      category: 'gps',
      method: 'GET',
      path: '/api/v1/gps/location/history',
      description: 'Get GPS location history',
      requiresAuth: true
    },
    {
      id: 'trips-list',
      category: 'trips',
      method: 'GET',
      path: '/api/v1/trips',
      description: 'Get all trips',
      requiresAuth: true
    },
    {
      id: 'trips-create',
      category: 'trips',
      method: 'POST',
      path: '/api/v1/trips',
      description: 'Create new trip',
      requiresAuth: true,
      samplePayload: {
        name: 'Test Trip'
      }
    },
    {
      id: 'trips-start',
      category: 'trips',
      method: 'POST',
      path: '/api/v1/trips/{tripId}/start',
      description: 'Start a trip',
      requiresAuth: true
    },
    {
      id: 'stats-realtime',
      category: 'stats',
      method: 'GET',
      path: '/api/v1/stats/realtime',
      description: 'Get real-time statistics',
      requiresAuth: true
    },
    {
      id: 'stats-trips',
      category: 'stats',
      method: 'GET',
      path: '/api/v1/stats/trips',
      description: 'Get trip statistics',
      requiresAuth: true
    }
  ]

  const categories = [...new Set(endpoints.map(e => e.category))]
  const filteredEndpoints = endpoints.filter(e => e.category === selectedCategory)

  const handleEndpointChange = (endpointId: string) => {
    setSelectedEndpoint(endpointId)
    const endpoint = endpoints.find(e => e.id === endpointId)
    if (endpoint?.samplePayload) {
      setRequestBody(JSON.stringify(endpoint.samplePayload, null, 2))
    } else {
      setRequestBody('')
    }
  }

  const executeTest = async () => {
    const endpoint = endpoints.find(e => e.id === selectedEndpoint)
    if (!endpoint) return

    setIsLoading(true)
    const startTime = Date.now()

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (endpoint.requiresAuth && apiKey) {
        headers['X-API-Key'] = apiKey
      }

      const requestOptions: RequestInit = {
        method: endpoint.method,
        headers
      }

      if (endpoint.method !== 'GET' && requestBody) {
        requestOptions.body = requestBody
      }

      const response = await fetch(`http://localhost:3003${endpoint.path}`, requestOptions)
      const responseData = await response.json()
      const responseTime = Date.now() - startTime

      const result: TestResult = {
        id: Date.now().toString(),
        endpoint: endpoint.path,
        method: endpoint.method,
        status: response.status,
        responseTime,
        response: responseData,
        timestamp: new Date().toISOString(),
        success: response.ok
      }

      setTestResults(prev => [result, ...prev.slice(0, 9)]) // Keep last 10 results
    } catch (error) {
      const responseTime = Date.now() - startTime
      const result: TestResult = {
        id: Date.now().toString(),
        endpoint: endpoint.path,
        method: endpoint.method,
        status: 0,
        responseTime,
        response: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString(),
        success: false
      }

      setTestResults(prev => [result, ...prev.slice(0, 9)])
    } finally {
      setIsLoading(false)
    }
  }

  const copyResponse = (response: any) => {
    navigator.clipboard.writeText(JSON.stringify(response, null, 2))
  }

  const generateCurlCommand = () => {
    const endpoint = endpoints.find(e => e.id === selectedEndpoint)
    if (!endpoint) return ''

    let curl = `curl -X ${endpoint.method} \\\n`
    curl += `  http://localhost:3003${endpoint.path} \\\n`

    if (endpoint.requiresAuth && apiKey) {
      curl += `  -H "X-API-Key: ${apiKey}" \\\n`
    }

    if (endpoint.method !== 'GET' && requestBody) {
      curl += `  -H "Content-Type: application/json" \\\n`
      curl += `  -d '${requestBody}'`
    }

    return curl
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600'
    if (status >= 400 && status < 500) return 'text-orange-600'
    if (status >= 500) return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            API Endpoint Testing
          </CardTitle>
          <CardDescription>
            Test API endpoints interactively, view responses, and generate code examples
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Configuration */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                />
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Endpoint Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Endpoint</label>
                <Select value={selectedEndpoint} onValueChange={handleEndpointChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select endpoint" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEndpoints.map(endpoint => (
                      <SelectItem key={endpoint.id} value={endpoint.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {endpoint.method}
                          </Badge>
                          <span className="font-mono text-sm">{endpoint.path}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Request Body */}
              {selectedEndpoint && endpoints.find(e => e.id === selectedEndpoint)?.method !== 'GET' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Request Body (JSON)</label>
                  <Textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    className="font-mono text-sm"
                    rows={6}
                  />
                </div>
              )}

              {/* Execute Button */}
              <Button
                onClick={executeTest}
                disabled={!selectedEndpoint || isLoading}
                className="w-full flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {isLoading ? 'Executing...' : 'Execute Request'}
              </Button>
            </CardContent>
          </Card>

          {/* Code Generation */}
          {selectedEndpoint && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  cURL Command
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-sm overflow-x-auto">
                    <code>{generateCurlCommand()}</code>
                  </pre>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 flex items-center gap-2"
                  onClick={() => navigator.clipboard.writeText(generateCurlCommand())}
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Results</CardTitle>
              <CardDescription>
                Response data and execution details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No test results yet. Execute a request to see results here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testResults.map((result) => (
                    <div key={result.id} className="border rounded-lg p-4 space-y-3">
                      {/* Result Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <Badge variant="outline">{result.method}</Badge>
                          <span className="font-mono text-sm">{result.endpoint}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(result.status)}>
                            {result.status || 'ERR'}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {result.responseTime}ms
                          </div>
                        </div>
                      </div>

                      {/* Response */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Response</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyResponse(result.response)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="bg-muted p-3 rounded-md max-h-48 overflow-y-auto">
                          <pre className="text-sm">
                            <code>{JSON.stringify(result.response, null, 2)}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}