import React from 'react'
import { Route, Gauge, MapPin, Navigation } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trip, LocationData } from '@/types'
import { formatDistance, formatDuration, formatSpeed } from '@/lib/utils'

interface ReplayStatsProps {
  trip: Trip
  currentLocation: LocationData | null
  progress: number
  timeElapsed: number
  playbackSpeed: number
}

const ReplayStats: React.FC<ReplayStatsProps> = ({
  trip,
  currentLocation,
  progress,
  playbackSpeed
}) => {
  const getTripDuration = () => {
    if (!trip.endTime) return 0
    return trip.endTime - trip.startTime
  }

  const getCurrentSpeed = () => {
    if (!currentLocation || !trip.route || trip.route.length < 2) return 0

    // Find current position in route and calculate speed based on nearby points
    const currentIndex = Math.floor((progress / 100) * (trip.route.length - 1))

    if (currentIndex > 0 && currentIndex < trip.route.length) {
      const prevPoint = trip.route[currentIndex - 1]
      const currentPoint = trip.route[currentIndex]

      const timeDiff = currentPoint.timestamp - prevPoint.timestamp
      if (timeDiff > 0) {
        // Calculate distance between points
        const distance = calculateDistance(
          prevPoint.latitude,
          prevPoint.longitude,
          currentPoint.latitude,
          currentPoint.longitude
        )

        // Convert to speed (m/s to mph)
        const speedMs = distance / (timeDiff / 1000)
        return speedMs * 2.237 // Convert m/s to mph
      }
    }

    return 0
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000 // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const distanceTraveled = (trip.totalDistance * progress) / 100
  const distanceRemaining = trip.totalDistance - distanceTraveled

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Trip Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            Trip Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="outline">{trip.status}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Date</span>
            <span className="text-sm font-medium">
              {new Date(trip.startTime).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Duration</span>
            <span className="text-sm font-medium">
              {formatDuration(getTripDuration())}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Route Points</span>
            <span className="text-sm font-medium">
              {trip.route?.length || 0}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Current Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Route className="w-4 h-4" />
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm font-medium">
              {progress.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Distance Traveled</span>
            <span className="text-sm font-medium">
              {formatDistance(distanceTraveled)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Distance Remaining</span>
            <span className="text-sm font-medium">
              {formatDistance(distanceRemaining)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Playback Speed</span>
            <Badge className="bg-blue-600">
              {playbackSpeed}x
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Current Location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Current Position
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentLocation ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Latitude</span>
                <span className="text-sm font-medium font-mono">
                  {currentLocation.latitude.toFixed(6)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Longitude</span>
                <span className="text-sm font-medium font-mono">
                  {currentLocation.longitude.toFixed(6)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Speed</span>
                <span className="text-sm font-medium">
                  {formatSpeed(getCurrentSpeed(), 'mph')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Timestamp</span>
                <span className="text-sm font-medium">
                  {new Date(currentLocation.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No position data</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trip Statistics */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Trip Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {formatDistance(trip.totalDistance)}
              </div>
              <div className="text-xs text-muted-foreground">Total Distance</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {formatSpeed(trip.averageSpeed, 'mph')}
              </div>
              <div className="text-xs text-muted-foreground">Average Speed</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 mb-1">
                {formatSpeed(trip.maxSpeed, 'mph')}
              </div>
              <div className="text-xs text-muted-foreground">Max Speed</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {trip.waypoints?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Waypoints</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ReplayStats