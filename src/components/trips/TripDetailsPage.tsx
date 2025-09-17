import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, Route, Gauge, Download, Play, BarChart3, Navigation, Mountain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// import { Separator } from '@/components/ui/separator'
import { Trip } from '@/types'
import { useStorage } from '@/hooks/useStorage'
import { formatDistance, formatDuration, formatSpeed } from '@/lib/utils'
import LiveMap from '@/components/tracking/LiveMap'

const TripDetailsPage: React.FC = () => {
  const navigate = useNavigate()
  const { tripId } = useParams<{ tripId: string }>()
  const { getTrip } = useStorage()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load trip details
  useEffect(() => {
    const loadTrip = async () => {
      if (!tripId) {
        setError('No trip ID provided')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const tripData = await getTrip(tripId)
        if (tripData) {
          setTrip(tripData)
        } else {
          setError('Trip not found')
        }
      } catch (err) {
        setError('Failed to load trip details')
        console.error('Error loading trip:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTrip()
  }, [tripId, getTrip])

  const handleExportTrip = () => {
    if (!trip) return

    const exportData = {
      trip,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trip-${trip.name.replace(/[^a-zA-Z0-9]/g, '-')}-${trip.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleReplayTrip = () => {
    if (trip && trip.route.length > 1) {
      navigate(`/replay/${trip.id}`)
    }
  }

  const getTripDuration = () => {
    if (!trip || !trip.endTime) return 0
    return trip.endTime - trip.startTime
  }

  const getStatusBadge = (status: Trip['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600 text-white">Active</Badge>
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>
      case 'completed':
        return <Badge variant="outline">Completed</Badge>
      default:
        return <Badge variant="outline">Planning</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading trip details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/trips')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Trips
            </Button>
          </div>
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">Trip Not Found</h2>
            <p className="text-muted-foreground mb-8">{error}</p>
            <Button onClick={() => navigate('/trips')}>
              Back to Trips
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/trips')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Trips
          </Button>

          <div className="flex items-center gap-2">
            {trip.status === 'completed' && trip.route.length > 1 && (
              <Button
                variant="outline"
                onClick={handleReplayTrip}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Replay
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleExportTrip}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Trip Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{trip.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  {getStatusBadge(trip.status)}
                  <span>•</span>
                  <span>{new Date(trip.startTime).toLocaleDateString()}</span>
                  {trip.type === 'demo' && (
                    <>
                      <span>•</span>
                      <Badge variant="secondary">Demo Trip</Badge>
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
            {trip.notes && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-sm">{trip.notes}</p>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Address Information */}
        {(trip.startAddress || trip.endAddress) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Route Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trip.startAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Starting Point</p>
                    <p className="text-sm text-muted-foreground">{trip.startAddress}</p>
                    {trip.startLocation && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {trip.startLocation.latitude.toFixed(6)}, {trip.startLocation.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {trip.endAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Destination</p>
                    <p className="text-sm text-muted-foreground">{trip.endAddress}</p>
                    {trip.endLocation && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {trip.endLocation.latitude.toFixed(6)}, {trip.endLocation.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Trip Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-lg font-semibold">{formatDuration(getTripDuration())}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Route className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Distance</p>
                  <p className="text-lg font-semibold">{formatDistance(trip.totalDistance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Speed</p>
                  <p className="text-lg font-semibold">{formatSpeed(trip.averageSpeed, 'mph')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Points</p>
                  <p className="text-lg font-semibold">{trip.route.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location Metadata */}
        {trip.locationMetadata && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                Location Metadata
              </CardTitle>
              <CardDescription>
                Detailed geolocation information from GPS tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">GPS Accuracy</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Average: ±{trip.locationMetadata.averageAccuracy?.toFixed(1)}m</p>
                    <p>Best: ±{trip.locationMetadata.minAccuracy?.toFixed(1)}m</p>
                    <p>Worst: ±{trip.locationMetadata.maxAccuracy?.toFixed(1)}m</p>
                  </div>
                </div>

                {trip.locationMetadata.altitudeData && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Mountain className="w-4 h-4" />
                      Elevation
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Average: {trip.locationMetadata.altitudeData.average.toFixed(0)}m</p>
                      <p>Lowest: {trip.locationMetadata.altitudeData.min.toFixed(0)}m</p>
                      <p>Highest: {trip.locationMetadata.altitudeData.max.toFixed(0)}m</p>
                    </div>
                  </div>
                )}

                {trip.locationMetadata.headingData && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Navigation className="w-4 h-4" />
                      Heading
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Initial: {trip.locationMetadata.headingData.initialHeading.toFixed(0)}°</p>
                      <p>Final: {trip.locationMetadata.headingData.finalHeading.toFixed(0)}°</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map Visualization */}
        {trip.route.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Route Map</CardTitle>
              <CardDescription>
                Complete GPS route with {trip.route.length} recorded points
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <LiveMap
                center={trip.startLocation ? [trip.startLocation.latitude, trip.startLocation.longitude] : undefined}
                zoom={13}
                locations={trip.route}
                showRoute={true}
                interactive={true}
                isTracking={false}
                routePoints={trip.route}
                className="h-96"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default TripDetailsPage