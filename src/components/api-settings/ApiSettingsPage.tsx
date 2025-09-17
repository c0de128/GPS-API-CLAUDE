import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Settings,
  Key,
  TestTube,
  Server,
  Monitor,
  FileText,
  Download,
  Wifi,
  Activity
} from 'lucide-react'
import { ApiKeyManager } from './ApiKeyManager'
import { EndpointTester } from './EndpointTester'
import { ServerConfig } from './ServerConfig'
import { ApiMonitoring } from './ApiMonitoring'
import { ApiDocumentation } from './ApiDocumentation'
import { useApiIntegration } from '@/hooks/useApiIntegration'

export function ApiSettingsPage() {
  const [activeTab, setActiveTab] = useState('keys')
  const { isConnected, error } = useApiIntegration({
    autoConnect: true,
    enableRealTimeStats: true
  })

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary" />
              API Settings & Configuration
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage API keys, test endpoints, configure server settings, and monitor real-time performance
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Wifi className={`w-5 h-5 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {isConnected ? 'API Connected' : 'API Disconnected'}
              </Badge>
            </div>

            <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Config
            </Button>
          </div>
        </div>

        {/* Connection Error */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
            <CardHeader className="pb-3">
              <CardDescription>API Server</CardDescription>
              <CardTitle className="text-2xl font-semibold">
                <Badge variant={isConnected ? 'default' : 'destructive'}>
                  {isConnected ? 'Online' : 'Offline'}
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
            <CardHeader className="pb-3">
              <CardDescription>Base URL</CardDescription>
              <CardTitle className="text-lg font-mono">
                localhost:3003
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
            <CardHeader className="pb-3">
              <CardDescription>WebSocket</CardDescription>
              <CardTitle className="text-lg font-mono">
                ws://localhost:3003/ws
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
            <CardHeader className="pb-3">
              <CardDescription>API Version</CardDescription>
              <CardTitle className="text-2xl font-semibold">
                v1
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="keys" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Testing
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              Server
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documentation
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="keys">
            <ApiKeyManager />
          </TabsContent>

          <TabsContent value="testing">
            <EndpointTester />
          </TabsContent>

          <TabsContent value="config">
            <ServerConfig />
          </TabsContent>

          <TabsContent value="monitoring">
            <ApiMonitoring />
          </TabsContent>

          <TabsContent value="docs">
            <ApiDocumentation />
          </TabsContent>

          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Configuration Export</CardTitle>
                <CardDescription>
                  Export and import API configuration settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export API Keys
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export Server Config
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Export configuration files for backup or deployment to other environments.
                    API keys will be exported in a secure format.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}