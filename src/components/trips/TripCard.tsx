import React from 'react'
import { CalendarDays, Clock, Route, Gauge, MapPin, Play, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trip, TripCardProps } from '@/types'
import { formatDistance, formatDuration, formatSpeed } from '@/lib/utils'

const TripCard: React.FC<TripCardProps> = ({
  trip,
  onSelect,
  onDelete,
  showActions = true,
  className
}) => {
  const handleCardClick = () => {
    if (onSelect) {
      onSelect(trip)
    }
  }

  const handleReplayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSelect) {
      onSelect(trip)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(trip.id)
    }
  }

  const getStatusBadge = (status: Trip['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600 text-white"><div className="w-2 h-2 bg-white rounded-full mr-1.5"></div>Recording</Badge>
      case 'paused':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Paused</Badge>
      case 'completed':
        return <Badge variant="outline"><Route className="w-3 h-3 mr-1" />Completed</Badge>
      default:
        return <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />Planning</Badge>
    }
  }

  const getTripDuration = () => {
    if (!trip.endTime) return 0
    return trip.endTime - trip.startTime
  }

  return (
    <Card
      className={`@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group ${className}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg group-hover:text-primary transition-colors @[400px]/card:text-xl">
              {trip.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              {getStatusBadge(trip.status)}
              <div className="flex items-center text-xs text-muted-foreground">
                <CalendarDays className="w-3 h-3 mr-1" />
                {new Date(trip.startTime).toLocaleDateString()}
              </div>
            </CardDescription>
          </div>

          {showActions && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {trip.status === 'completed' && trip.route.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReplayClick}
                  className="h-8 w-8 p-0"
                  title="Replay route"
                >
                  <Play className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteClick}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                title="Delete trip"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Duration */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-100 rounded-md flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-sm font-medium">
                {formatDuration(getTripDuration())}
              </p>
            </div>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-100 rounded-md flex items-center justify-center">
              <Route className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Distance</p>
              <p className="text-sm font-medium">
                {formatDistance(trip.totalDistance)}
              </p>
            </div>
          </div>

          {/* Average Speed */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-purple-100 rounded-md flex items-center justify-center">
              <Gauge className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Speed</p>
              <p className="text-sm font-medium">
                {formatSpeed(trip.averageSpeed, 'mph')}
              </p>
            </div>
          </div>

          {/* Route Points */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-100 rounded-md flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Points</p>
              <p className="text-sm font-medium">
                {trip.route.length}
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Trip Notes */}
      {trip.notes && (
        <CardFooter className="flex-col items-start gap-1 text-sm pt-0">
          <div className="p-3 bg-muted/30 rounded-lg w-full">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm line-clamp-2">{trip.notes}</p>
          </div>
        </CardFooter>
      )}

      {/* Address Info */}
      {(trip.startAddress || trip.endAddress) && (
        <CardFooter className="flex-col items-start gap-2 text-sm pt-0">
          <div className="w-full space-y-1">
            {trip.startAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="w-3 h-3 text-green-600 mt-1 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="text-xs truncate" title={trip.startAddress}>
                    {trip.startAddress}
                  </p>
                </div>
              </div>
            )}
            {trip.endAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="w-3 h-3 text-red-600 mt-1 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">To</p>
                  <p className="text-xs truncate" title={trip.endAddress}>
                    {trip.endAddress}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardFooter>
      )}

      {/* Location Metadata */}
      {trip.locationMetadata && (
        <CardFooter className="flex-col items-start gap-1 text-xs text-muted-foreground pt-0">
          <div className="grid grid-cols-2 gap-2 w-full">
            <div>
              <span className="font-medium">Accuracy:</span> ±{trip.locationMetadata.averageAccuracy?.toFixed(0)}m avg
            </div>
            {trip.locationMetadata.altitudeData && (
              <div>
                <span className="font-medium">Elevation:</span> {trip.locationMetadata.altitudeData.average.toFixed(0)}m avg
              </div>
            )}
          </div>
        </CardFooter>
      )}

      {/* System Info */}
      <CardFooter className="flex-col items-start gap-1 text-xs text-muted-foreground pt-0">
        <div className="flex items-center justify-between w-full">
          <div>
            {trip.startLocation && !trip.startAddress && (
              <span>
                Start: {trip.startLocation.latitude.toFixed(4)}, {trip.startLocation.longitude.toFixed(4)}
              </span>
            )}
          </div>
          <div>
            Updated: {new Date(trip.updatedAt).toLocaleTimeString()}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

export default TripCard