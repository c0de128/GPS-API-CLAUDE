import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Download,
  Trash2,
  RefreshCw,
  Activity,
  Database,
  MapPin,
  Bug
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { monitoring, useMonitoring } from '@/utils/monitoring'
import { storageService } from '@/services/storageService'
import { gpsService } from '@/services/gpsService'

const DiagnosticsPage: React.FC = () => {
  const navigate = useNavigate()
  const { getHealthStatus, exportLogs } = useMonitoring()

  const [healthStatus, setHealthStatus] = useState<any>(null)
  const [systemInfo, setSystemInfo] = useState<any>(null)
  const [errors, setErrors] = useState<any[]>([])
  const [warnings, setWarnings] = useState<any[]>([])
  const [gpsStatus, setGpsStatus] = useState<any>(null)
  const [storageInfo, setStorageInfo] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadDiagnosticData()
  }, [])

  const loadDiagnosticData = async () => {
    setRefreshing(true)

    try {
      // Get health status
      const health = getHealthStatus()
      setHealthStatus(health)

      // Get system information
      const sysInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screenResolution: `${screen.width}x${screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        colorDepth: screen.colorDepth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        localStorage: !!window.localStorage,
        sessionStorage: !!window.sessionStorage,
        indexedDB: !!window.indexedDB,
        geolocation: !!navigator.geolocation,
        serviceWorker: 'serviceWorker' in navigator,
        pushNotifications: 'Notification' in window,
        timestamp: new Date().toISOString()
      }
      setSystemInfo(sysInfo)

      // Get recent errors and warnings
      const recentErrors = monitoring.getLogs('errors').slice(-10)
      const recentWarnings = monitoring.getLogs('warnings').slice(-10)
      setErrors(recentErrors)
      setWarnings(recentWarnings)

      // Get GPS status
      const gpsState = gpsService.getCurrentState()
      setGpsStatus(gpsState)

      // Get storage information
      try {
        const storageUsage = await storageService.getStorageInfo()
        const trips = await storageService.getAllTrips()
        setStorageInfo({
          ...storageUsage,
          totalTrips: trips.length,
          dbInitialized: true
        })
      } catch (error) {
        setStorageInfo({
          used: 0,
          available: 0,
          totalTrips: 0,
          dbInitialized: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

    } catch (error) {
      console.error('Failed to load diagnostic data:', error)
      monitoring.logError({
        message: 'Failed to load diagnostic data',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
    } finally {
      setRefreshing(false)
    }
  }

  const clearLogs = () => {
    if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      const logTypes = ['errors', 'warnings', 'info', 'performance', 'user_actions']
      logTypes.forEach(type => {
        localStorage.removeItem(`app_${type}`)
      })
      loadDiagnosticData()
      monitoring.logInfo('Diagnostic logs cleared')
    }
  }

  const testGPS = async () => {
    try {
      monitoring.logInfo('GPS test started')
      await gpsService.getCurrentLocation()
      monitoring.logInfo('GPS test successful')
      loadDiagnosticData()
    } catch (error) {
      monitoring.logError({
        message: 'GPS test failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
      loadDiagnosticData()
    }
  }

  const testStorage = async () => {
    try {
      monitoring.logInfo('Storage test started')
      const testTrip = {
        id: `test_${Date.now()}`,
        name: 'Storage Test Trip',
        type: 'real' as const,
        status: 'completed' as const,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        route: [],
        waypoints: [],
        speeds: [],
        totalDistance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        notes: 'This is a test trip for diagnostics',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      await storageService.saveTrip(testTrip)
      await storageService.deleteTrip(testTrip.id)
      monitoring.logInfo('Storage test successful')
      loadDiagnosticData()
    } catch (error) {
      monitoring.logError({
        message: 'Storage test failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
      loadDiagnosticData()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />
      default: return <Activity className="w-5 h-5 text-gray-600" />
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>

            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                App Diagnostics
              </h1>
              <p className="text-muted-foreground">
                System health and monitoring dashboard
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadDiagnosticData}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Health Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {healthStatus && getStatusIcon(healthStatus.status)}
                <span className="font-medium">App Health</span>
              </div>
              <div className={`text-lg font-bold ${healthStatus ? getStatusColor(healthStatus.status) : ''}`}>
                {healthStatus?.status?.toUpperCase() || 'Loading...'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Bug className="w-5 h-5" />
                <span className="font-medium">Errors</span>
              </div>
              <div className="text-lg font-bold text-red-600">
                {healthStatus?.totalErrors || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Database className="w-5 h-5" />
                <span className="font-medium">Storage</span>
              </div>
              <div className="text-lg font-bold text-blue-600">
                {storageInfo?.dbInitialized ? 'OK' : 'Error'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <MapPin className="w-5 h-5" />
                <span className="font-medium">GPS</span>
              </div>
              <div className="text-lg font-bold text-green-600">
                {gpsStatus?.permission === 'granted' ? 'OK' : 'Error'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={testGPS} variant="outline" size="sm">
                Test GPS
              </Button>
              <Button onClick={testStorage} variant="outline" size="sm">
                Test Storage
              </Button>
              <Button onClick={exportLogs} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Logs
              </Button>
              <Button onClick={clearLogs} variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Logs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            {systemInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div><strong>Platform:</strong> {systemInfo.platform}</div>
                  <div><strong>Language:</strong> {systemInfo.language}</div>
                  <div><strong>Online:</strong> {systemInfo.onLine ? 'Yes' : 'No'}</div>
                  <div><strong>Screen:</strong> {systemInfo.screenResolution}</div>
                  <div><strong>Viewport:</strong> {systemInfo.viewportSize}</div>
                  <div><strong>Timezone:</strong> {systemInfo.timezone}</div>
                </div>
                <div className="space-y-2">
                  <div><strong>LocalStorage:</strong> {systemInfo.localStorage ? 'Available' : 'Not Available'}</div>
                  <div><strong>IndexedDB:</strong> {systemInfo.indexedDB ? 'Available' : 'Not Available'}</div>
                  <div><strong>Geolocation:</strong> {systemInfo.geolocation ? 'Available' : 'Not Available'}</div>
                  <div><strong>Service Worker:</strong> {systemInfo.serviceWorker ? 'Supported' : 'Not Supported'}</div>
                  <div><strong>Push Notifications:</strong> {systemInfo.pushNotifications ? 'Supported' : 'Not Supported'}</div>
                  <div><strong>Cookies:</strong> {systemInfo.cookieEnabled ? 'Enabled' : 'Disabled'}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage Information */}
        {storageInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Storage Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Used Storage</div>
                  <div className="text-lg font-bold">{formatBytes(storageInfo.used)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Available Storage</div>
                  <div className="text-lg font-bold">{formatBytes(storageInfo.available)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Trips</div>
                  <div className="text-lg font-bold">{storageInfo.totalTrips}</div>
                </div>
              </div>
              {storageInfo.error && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">Storage Error: {storageInfo.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Errors */}
        {errors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Recent Errors ({errors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {errors.map((error, index) => (
                  <div key={error.id || index} className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-destructive">{error.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(error.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant="destructive" className="ml-2">Error</Badge>
                    </div>
                    {error.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs">Details</summary>
                        <pre className="text-xs bg-background p-2 rounded border mt-1 overflow-auto">
                          {JSON.stringify(error.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Warnings */}
        {warnings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Recent Warnings ({warnings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {warnings.map((warning, index) => (
                  <div key={warning.id || index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-yellow-800">{warning.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(warning.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant="secondary" className="ml-2">Warning</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Agent */}
        <Card>
          <CardHeader>
            <CardTitle>Browser Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={systemInfo?.userAgent || 'Loading...'}
              readOnly
              className="font-mono text-xs"
              rows={3}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DiagnosticsPage