import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Server,
  Shield,
  Zap,
  Clock,
  Cpu,
  HardDrive,
  RefreshCw
} from 'lucide-react'

interface ServerHealth {
  status: string
  timestamp: string
  uptime: number
  version: string
  environment: string
  memory: {
    used: number
    total: number
  }
}

interface ServerMetrics {
  responseTime: {
    average: number
    p95: number
    p99: number
  }
  throughput: {
    requestsPerSecond: number
    requestsPerMinute: number
  }
  resources: {
    memoryUsage: number
    cpuUsage: number
    diskUsage: number
  }
  errors: {
    errorRate: number
    totalErrors: number
    last24Hours: number
  }
}

export function ServerConfig() {
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null)
  const [serverMetrics, setServerMetrics] = useState<ServerMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchServerHealth = async () => {
    try {
      const response = await fetch('http://localhost:3003/health')
      const data = await response.json()
      setServerHealth(data)
    } catch (error) {
      console.error('Failed to fetch server health:', error)
    }
  }

  const fetchServerMetrics = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/v1/stats/performance', {
        headers: {
          'X-API-Key': import.meta.env.VITE_ADMIN_API_KEY || ''
        }
      })
      const result = await response.json()
      if (result.success) {
        setServerMetrics(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch server metrics:', error)
    }
  }

  const refreshData = async () => {
    setIsLoading(true)
    await Promise.all([fetchServerHealth(), fetchServerMetrics()])
    setIsLoading(false)
  }

  useEffect(() => {
    refreshData()
    const interval = setInterval(refreshData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const formatUptime = (uptimeSeconds: number) => {
    const days = Math.floor(uptimeSeconds / 86400)
    const hours = Math.floor((uptimeSeconds % 86400) / 3600)
    const minutes = Math.floor((uptimeSeconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }


  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600'
    if (percentage < 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const configSettings = [
    { key: 'API Version', value: 'v1', category: 'API' },
    { key: 'Base Path', value: '/api', category: 'API' },
    { key: 'Port', value: '3003', category: 'Server' },
    { key: 'Host', value: '0.0.0.0', category: 'Server' },
    { key: 'Environment', value: serverHealth?.environment || 'Unknown', category: 'Server' },
    { key: 'CORS Origins', value: 'localhost:3000', category: 'Security' },
    { key: 'Rate Limit Window', value: '15 minutes', category: 'Security' },
    { key: 'Global Rate Limit', value: '1000 requests', category: 'Security' },
    { key: 'WebSocket Port', value: '3003/ws', category: 'WebSocket' },
    { key: 'Max Connections', value: '1000', category: 'WebSocket' },
    { key: 'Heartbeat Interval', value: '30 seconds', category: 'WebSocket' },
  ]

  const categories = [...new Set(configSettings.map(s => s.category))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Server Configuration
              </CardTitle>
              <CardDescription>
                Monitor server health, performance metrics, and configuration settings
              </CardDescription>
            </div>
            <Button onClick={refreshData} disabled={isLoading} className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Server Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              Server Status
            </CardDescription>
            <CardTitle className="text-2xl font-semibold">
              {serverHealth && (
                <Badge className={getStatusColor(serverHealth.status)}>
                  {serverHealth.status}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Uptime
            </CardDescription>
            <CardTitle className="text-lg font-semibold">
              {serverHealth ? formatUptime(serverHealth.uptime) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Memory Usage
            </CardDescription>
            <CardTitle className="text-lg font-semibold">
              {serverHealth ? (
                <span className={getUsageColor((serverHealth.memory.used / serverHealth.memory.total) * 100)}>
                  {serverHealth.memory.used}MB / {serverHealth.memory.total}MB
                </span>
              ) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Response Time
            </CardDescription>
            <CardTitle className="text-lg font-semibold">
              {serverMetrics ? `${serverMetrics.responseTime.average}ms` : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Performance Metrics */}
      {serverMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Average Response Time</label>
                    <p className="text-2xl font-semibold">{serverMetrics.responseTime.average}ms</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">95th Percentile</label>
                    <p className="text-2xl font-semibold">{serverMetrics.responseTime.p95}ms</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Requests/Second</label>
                    <p className="text-2xl font-semibold">{serverMetrics.throughput.requestsPerSecond}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Requests/Minute</label>
                    <p className="text-2xl font-semibold">{serverMetrics.throughput.requestsPerMinute}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Resource Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    CPU Usage
                  </span>
                  <Badge className={getUsageColor(serverMetrics.resources.cpuUsage)}>
                    {serverMetrics.resources.cpuUsage.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    Memory Usage
                  </span>
                  <Badge className={getUsageColor(serverMetrics.resources.memoryUsage)}>
                    {serverMetrics.resources.memoryUsage.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    Disk Usage
                  </span>
                  <Badge className={getUsageColor(serverMetrics.resources.diskUsage)}>
                    {serverMetrics.resources.diskUsage.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Error Rate
                  </span>
                  <Badge className={getUsageColor(serverMetrics.errors.errorRate)}>
                    {serverMetrics.errors.errorRate.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configuration Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Settings</CardTitle>
          <CardDescription>
            Current server configuration and runtime parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {categories.map(category => (
              <div key={category} className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  {category}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {configSettings
                    .filter(setting => setting.category === category)
                    .map((setting, index) => (
                      <div key={index} className="space-y-1">
                        <label className="text-sm font-medium">{setting.key}</label>
                        <div className="p-2 bg-muted rounded border">
                          <code className="text-sm">{setting.value}</code>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
          <CardDescription>
            Runtime environment and system information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">NODE_ENV</TableCell>
                <TableCell>
                  <Badge variant="outline">{serverHealth?.environment || 'development'}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  Current environment mode
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">API_VERSION</TableCell>
                <TableCell>
                  <Badge variant="outline">{serverHealth?.version || 'v1'}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  API version identifier
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">STARTUP_TIME</TableCell>
                <TableCell>
                  {serverHealth ? new Date(Date.now() - serverHealth.uptime * 1000).toLocaleString() : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  Server startup timestamp
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}