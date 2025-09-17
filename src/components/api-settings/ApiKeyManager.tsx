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
  Key,
  Plus,
  Copy,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Clock,
  Activity
} from 'lucide-react'
import type { ApiKey, ApiPermission } from '@/types/api'

interface ApiKeyManagerProps {}

export function ApiKeyManager({}: ApiKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyPermissions, setNewKeyPermissions] = useState<ApiPermission[]>(['gps:read'])
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(100)
  const [isCreating, setIsCreating] = useState(false)

  const allPermissions: ApiPermission[] = ['gps:read', 'trips:read', 'trips:write', 'stats:read', 'admin']
  const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || ''

  // Fetch API keys from the server
  const fetchApiKeys = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/v1/admin/keys', {
        headers: {
          'X-API-Key': ADMIN_API_KEY
        }
      })
      const result = await response.json()
      if (result.success) {
        setApiKeys(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    }
  }

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Could add toast notification here
  }

  const maskApiKey = (key: string): string => {
    if (key.length <= 8) return '****'
    return key.substring(0, 8) + '****' + key.substring(key.length - 8)
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return

    try {
      const response = await fetch('http://localhost:3003/api/v1/admin/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': ADMIN_API_KEY
        },
        body: JSON.stringify({
          name: newKeyName,
          permissions: newKeyPermissions,
          rateLimit: newKeyRateLimit,
          origins: ['http://localhost:3000']
        })
      })

      const result = await response.json()
      if (result.success) {
        // Refresh the keys list
        await fetchApiKeys()
        setNewKeyName('')
        setNewKeyPermissions(['gps:read'])
        setNewKeyRateLimit(100)
        setIsCreating(false)
      } else {
        console.error('Failed to create API key:', result.error)
      }
    } catch (error) {
      console.error('Failed to create API key:', error)
    }
  }

  const deleteKey = (keyId: string) => {
    setApiKeys(prev => prev.filter(key => key.id !== keyId))
  }

  const toggleKeyStatus = (keyId: string) => {
    setApiKeys(prev => prev.map(key =>
      key.id === keyId ? { ...key, isActive: !key.isActive } : key
    ))
  }

  const getPermissionColor = (permission: ApiPermission) => {
    const colors = {
      'gps:read': 'bg-blue-100 text-blue-800',
      'trips:read': 'bg-green-100 text-green-800',
      'trips:write': 'bg-yellow-100 text-yellow-800',
      'stats:read': 'bg-purple-100 text-purple-800',
      'admin': 'bg-red-100 text-red-800'
    }
    return colors[permission] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Key Management
              </CardTitle>
              <CardDescription>
                Create, manage, and monitor API keys for accessing the GPS Tracking API
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create API Key
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Total Keys
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {apiKeys.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Active Keys
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums text-green-600">
              {apiKeys.filter(key => key.isActive).length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recently Used
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {apiKeys.filter(key => key.lastUsed &&
                new Date(key.lastUsed) > new Date(Date.now() - 24 * 60 * 60 * 1000)
              ).length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Admin Keys
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums text-red-600">
              {apiKeys.filter(key => key.permissions.includes('admin')).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Create New Key Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New API Key</CardTitle>
            <CardDescription>
              Generate a new API key with specific permissions and rate limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Key Name</label>
                <Input
                  placeholder="e.g., Production Frontend"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rate Limit (req/min)</label>
                <Input
                  type="number"
                  placeholder="100"
                  value={newKeyRateLimit}
                  onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value) || 100)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Permissions</label>
              <div className="flex flex-wrap gap-2">
                {allPermissions.map(permission => (
                  <Button
                    key={permission}
                    variant={newKeyPermissions.includes(permission) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (newKeyPermissions.includes(permission)) {
                        setNewKeyPermissions(prev => prev.filter(p => p !== permission))
                      } else {
                        setNewKeyPermissions(prev => [...prev, permission])
                      }
                    }}
                  >
                    {permission}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateKey} disabled={!newKeyName.trim()}>
                Create Key
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage existing API keys, view usage statistics, and control permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Rate Limit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{apiKey.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                        {showKeys[apiKey.id] ? apiKey.key : maskApiKey(apiKey.key)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                      >
                        {showKeys[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(apiKey.key)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {apiKey.permissions.map(permission => (
                        <Badge
                          key={permission}
                          variant="secondary"
                          className={`text-xs ${getPermissionColor(permission)}`}
                        >
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {apiKey.rateLimit}/min
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                      {apiKey.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {apiKey.lastUsed ? formatDate(apiKey.lastUsed) : 'Never'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleKeyStatus(apiKey.id)}
                      >
                        <Activity className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteKey(apiKey.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}