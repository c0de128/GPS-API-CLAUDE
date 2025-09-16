import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useApiIntegration } from '@/hooks/useApiIntegration'
import { Wifi, Gauge, MapPin, Play, Square, Plus } from 'lucide-react'

export function ApiTestDashboard() {
  const {
    isConnected,
    isLoading,
    error,
    realTimeStats,
    currentTrip,
    trips,
    connect,
    disconnect,
    createTrip,
    startTrip,
    completeTrip,
    updateGpsLocation,
    updateTripLocation
  } = useApiIntegration({
    enableRealTimeStats: true,
    statsInterval: 10000 // Update every 10 seconds for demo
  })

  const [newTripName, setNewTripName] = useState('')
  const [testLocation, setTestLocation] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 10,
    speed: 25
  })

  // Auto-generate test GPS locations
  useEffect(() => {
    if (isConnected && currentTrip?.status === 'active') {
      const interval = setInterval(() => {
        // Simulate movement by slightly adjusting coordinates
        const newLocation = {
          latitude: testLocation.latitude + (Math.random() - 0.5) * 0.001,
          longitude: testLocation.longitude + (Math.random() - 0.5) * 0.001,
          accuracy: Math.floor(Math.random() * 20) + 5,
          speed: Math.floor(Math.random() * 50) + 10,
          heading: Math.floor(Math.random() * 360),
          timestamp: Date.now()
        }

        setTestLocation(prev => ({
          ...prev,
          latitude: newLocation.latitude,
          longitude: newLocation.longitude
        }))

        // Update both general GPS and trip-specific location
        updateGpsLocation(newLocation)
        if (currentTrip) {
          updateTripLocation(currentTrip.tripId, newLocation)
        }
      }, 5000) // Update every 5 seconds

      return () => clearInterval(interval)
    }
  }, [isConnected, currentTrip, updateGpsLocation, updateTripLocation, testLocation.latitude, testLocation.longitude])

  const handleCreateTrip = async () => {
    if (newTripName.trim()) {
      const trip = await createTrip(newTripName.trim())
      if (trip) {
        setNewTripName('')
      }
    }
  }

  const handleStartTrip = async (tripId: string) => {
    await startTrip(tripId)
  }

  const handleCompleteTrip = async () => {
    if (currentTrip) {
      await completeTrip(currentTrip.tripId)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Test Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time GPS tracking and trip management API testing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Wifi className={`w-5 h-5 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          {!isConnected && (
            <Button onClick={connect} disabled={isLoading}>
              Connect
            </Button>
          )}
          {isConnected && (
            <Button variant="outline" onClick={disconnect}>
              Disconnect
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Trips</CardDescription>
            <CardTitle className="text-2xl font-semibold">
              {realTimeStats?.activeTrips ?? '—'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Distance Today</CardDescription>
            <CardTitle className="text-2xl font-semibold">
              {realTimeStats ? `${realTimeStats.totalDistanceToday.toFixed(1)} km` : '—'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Users</CardDescription>
            <CardTitle className="text-2xl font-semibold">
              {realTimeStats?.activeUsers ?? '—'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>System Health</CardDescription>
            <CardTitle className="text-2xl font-semibold">
              <Badge variant={realTimeStats?.systemHealth === 'healthy' ? 'default' : 'destructive'}>
                {realTimeStats?.systemHealth ?? 'Unknown'}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Current Trip */}
      {currentTrip && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              Current Trip: {currentTrip.name}
            </CardTitle>
            <CardDescription>
              Status: <Badge>{currentTrip.status}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Distance</p>
                <p className="font-semibold">{currentTrip.distance.toFixed(2)} km</p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-semibold">{Math.floor(currentTrip.duration / 60000)} min</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Speed</p>
                <p className="font-semibold">{currentTrip.averageSpeed.toFixed(1)} km/h</p>
              </div>
              <div>
                <p className="text-muted-foreground">Max Speed</p>
                <p className="font-semibold">{currentTrip.maxSpeed.toFixed(1)} km/h</p>
              </div>
            </div>

            {currentTrip.currentLocation && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Current Location
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Lat: {currentTrip.currentLocation.latitude.toFixed(6)}</div>
                  <div>Lng: {currentTrip.currentLocation.longitude.toFixed(6)}</div>
                  <div>Speed: {currentTrip.currentLocation.speed.toFixed(1)} km/h</div>
                  <div>Accuracy: {currentTrip.currentLocation.accuracy}m</div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              {currentTrip.status === 'active' && (
                <Button onClick={handleCompleteTrip} className="flex items-center gap-2">
                  <Square className="w-4 h-4" />
                  Complete Trip
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trip Management */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Management</CardTitle>
          <CardDescription>Create and manage GPS tracking trips</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Enter trip name"
              value={newTripName}
              onChange={(e) => setNewTripName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateTrip()}
            />
            <Button onClick={handleCreateTrip} disabled={!newTripName.trim()} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Trip
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Trips ({trips.length})</h4>
            {trips.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trips found. Create one to get started.</p>
            ) : (
              <div className="space-y-2">
                {trips.slice(0, 5).map((trip) => (
                  <div key={trip.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{trip.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {trip.distance.toFixed(2)} km • {Math.floor(trip.duration / 60000)} min • <Badge variant="outline">{trip.status}</Badge>
                      </p>
                    </div>
                    {trip.status === 'planning' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartTrip(trip.id)}
                        className="flex items-center gap-2"
                      >
                        <Play className="w-3 h-3" />
                        Start
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Location Display */}
      <Card>
        <CardHeader>
          <CardTitle>Test GPS Location</CardTitle>
          <CardDescription>
            Simulated GPS coordinates being sent to the API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Latitude</p>
              <p className="font-mono">{testLocation.latitude.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Longitude</p>
              <p className="font-mono">{testLocation.longitude.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Speed</p>
              <p className="font-mono">{testLocation.speed} km/h</p>
            </div>
            <div>
              <p className="text-muted-foreground">Accuracy</p>
              <p className="font-mono">{testLocation.accuracy}m</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Location updates automatically every 5 seconds when a trip is active
          </p>
        </CardContent>
      </Card>
    </div>
  )
}