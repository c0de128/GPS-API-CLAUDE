import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Monitor,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Globe,
  Filter,
  RefreshCw,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react'

interface RequestLog {
  id: string
  timestamp: string
  method: string
  path: string
  statusCode: number
  responseTime: number
  ip: string
  userAgent: string
  apiKey?: string
}

interface RealTimeStats {
  activeConnections: number
  requestsPerMinute: number
  averageResponseTime: number
  errorRate: number
  topEndpoints: Array<{
    endpoint: string
    requests: number
  }>
  recentErrors: Array<{
    timestamp: string
    error: string
    endpoint: string
  }>
}

export function ApiMonitoring() {
  const [requestLogs, setRequestLogs] = useState<RequestLog[]>([])
  const [realTimeStats, setRealTimeStats] = useState<RealTimeStats>({
    activeConnections: 0,
    requestsPerMinute: 0,
    averageResponseTime: 0,
    errorRate: 0,
    topEndpoints: [],
    recentErrors: []
  })
  const [filter, setFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)

  // Mock real-time data generation
  useEffect(() => {
    const generateMockLog = (): RequestLog => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE']
      const paths = [
        '/api/v1/gps/status',
        '/api/v1/gps/location',
        '/api/v1/trips',
        '/api/v1/stats/realtime',
        '/api/v1/trips/123/start'
      ]
      const statusCodes = [200, 201, 400, 401, 404, 500]
      const ips = ['127.0.0.1', '192.168.1.100', '10.0.0.50']

      return {
        id: Date.now() + Math.random().toString(),
        timestamp: new Date().toISOString(),
        method: methods[Math.floor(Math.random() * methods.length)],
        path: paths[Math.floor(Math.random() * paths.length)],
        statusCode: statusCodes[Math.floor(Math.random() * statusCodes.length)],
        responseTime: Math.floor(Math.random() * 500) + 10,
        ip: ips[Math.floor(Math.random() * ips.length)],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        apiKey: Math.random() > 0.3 ? 'gps_****bb900' : undefined
      }
    }

    const updateStats = () => {
      setRealTimeStats({
        activeConnections: Math.floor(Math.random() * 50) + 10,
        requestsPerMinute: Math.floor(Math.random() * 100) + 20,
        averageResponseTime: Math.floor(Math.random() * 200) + 50,
        errorRate: Math.random() * 5,
        topEndpoints: [
          { endpoint: '/api/v1/gps/location', requests: Math.floor(Math.random() * 100) + 50 },
          { endpoint: '/api/v1/trips', requests: Math.floor(Math.random() * 80) + 30 },
          { endpoint: '/api/v1/stats/realtime', requests: Math.floor(Math.random() * 60) + 20 }
        ],
        recentErrors: [
          {
            timestamp: new Date().toISOString(),
            error: 'Invalid API key',
            endpoint: '/api/v1/gps/status'
          }
        ]
      })
    }

    if (isAutoRefresh) {
      const logInterval = setInterval(() => {
        const newLog = generateMockLog()
        setRequestLogs(prev => [newLog, ...prev.slice(0, 99)]) // Keep last 100 logs
      }, 2000) // New log every 2 seconds

      const statsInterval = setInterval(updateStats, 5000) // Update stats every 5 seconds
      updateStats() // Initial update

      return () => {
        clearInterval(logInterval)
        clearInterval(statsInterval)
      }
    }
  }, [isAutoRefresh])

  const filteredLogs = requestLogs.filter(log => {
    const matchesPath = log.path.toLowerCase().includes(filter.toLowerCase())
    const matchesMethod = methodFilter === 'all' || log.method === methodFilter
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === '2xx' && log.statusCode >= 200 && log.statusCode < 300) ||
      (statusFilter === '4xx' && log.statusCode >= 400 && log.statusCode < 500) ||
      (statusFilter === '5xx' && log.statusCode >= 500)

    return matchesPath && matchesMethod && matchesStatus
  })

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600'
    if (statusCode >= 400 && statusCode < 500) return 'text-orange-600'
    if (statusCode >= 500) return 'text-red-600'
    return 'text-gray-600'
  }

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 100) return 'text-green-600'
    if (responseTime < 500) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Real-time API Monitoring
              </CardTitle>
              <CardDescription>
                Monitor live API requests, performance metrics, and system health
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isAutoRefresh ? "default" : "outline"}
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className="flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                {isAutoRefresh ? 'Live' : 'Paused'}
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Connections
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {realTimeStats.activeConnections}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Requests/Min
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {realTimeStats.requestsPerMinute}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Avg Response Time
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              <span className={getResponseTimeColor(realTimeStats.averageResponseTime)}>
                {realTimeStats.averageResponseTime}ms
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Error Rate
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              <span className={realTimeStats.errorRate > 2 ? 'text-red-600' : 'text-green-600'}>
                {realTimeStats.errorRate.toFixed(1)}%
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Endpoints</CardTitle>
            <CardDescription>Most frequently accessed API endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {realTimeStats.topEndpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <code className="text-sm">{endpoint.endpoint}</code>
                  </div>
                  <Badge variant="outline">{endpoint.requests} req</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Recent Errors
            </CardTitle>
            <CardDescription>Latest error responses and issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {realTimeStats.recentErrors.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p>No recent errors</p>
                </div>
              ) : (
                realTimeStats.recentErrors.map((error, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 border rounded">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{error.error}</p>
                      <p className="text-xs text-muted-foreground">
                        {error.endpoint} • {formatTimestamp(error.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Live Request Logs</CardTitle>
              <CardDescription>
                Real-time stream of API requests and responses
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <Input
                  placeholder="Filter by path..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-48"
                />
              </div>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="2xx">2xx Success</SelectItem>
                  <SelectItem value="4xx">4xx Client Error</SelectItem>
                  <SelectItem value="5xx">5xx Server Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>API Key</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.slice(0, 20).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm">{log.path}</code>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${getStatusColor(log.statusCode)}`}>
                        {log.statusCode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm ${getResponseTimeColor(log.responseTime)}`}>
                        {log.responseTime}ms
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.ip}</TableCell>
                    <TableCell>
                      {log.apiKey ? (
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {log.apiKey}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No requests match the current filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}