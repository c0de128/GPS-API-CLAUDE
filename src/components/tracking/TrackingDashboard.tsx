import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Gauge,
  MapPin,
  Navigation,
  Satellite,
  Mountain,
  Zap,
  Play,
  Pause,
  Square
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LocationData, DemoSimulationState } from '@/types'

interface TrackingDashboardProps {
  // GPS Data
  currentLocation: LocationData | null
  currentSpeed: number
  averageSpeed: number
  maxSpeed: number
  speedUnit: 'mph' | 'kmh'

  // Trip Data
  routePoints: LocationData[]
  totalDistance: number

  // GPS Status
  isTracking: boolean

  // Demo Mode
  isDemoMode: boolean
  demoState: DemoSimulationState | null
  demoProgress?: number

  // Address Resolution
  currentAddress?: string | null
  isResolvingAddress?: boolean

  // Demo Controls (when in demo mode)
  onDemoPause?: () => void
  onDemoResume?: () => void
  onDemoStop?: () => void
  onDemoSpeedChange?: (multiplier: number) => void
}

const TrackingDashboard: React.FC<TrackingDashboardProps> = ({
  currentLocation,
  currentSpeed,
  averageSpeed,
  maxSpeed,
  speedUnit,
  routePoints,
  totalDistance,
  isTracking,
  isDemoMode,
  demoState,
  demoProgress = 0,
  currentAddress,
  isResolvingAddress = false,
  onDemoPause,
  onDemoResume,
  onDemoStop,
  onDemoSpeedChange
}) => {


  const getCurrentAltitude = () => {
    return currentLocation?.altitude || 0
  }

  const getAccuracy = () => {
    return currentLocation?.accuracy || 0
  }

  const getHeading = () => {
    return currentLocation?.heading
  }

  return (
    <div className="space-y-6">

      {/* Trip Monitor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Trip Monitor
          </CardTitle>
          <CardDescription>
            Real-time trip tracking and statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Main Trip Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
            {/* Current Speed */}
            <div className="text-center">
              <div className="relative">
                <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-4 border-primary/20">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary tabular-nums">
                      {currentSpeed.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground uppercase">
                      {speedUnit}
                    </div>
                  </div>
                </div>
                {isTracking && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <div className="mt-2 text-sm font-medium">Current Speed</div>
            </div>

            {/* Average Speed */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-4 border-primary/20">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary tabular-nums">
                    {averageSpeed.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground uppercase">
                    {speedUnit}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm font-medium">Average Speed</div>
            </div>

            {/* Maximum Speed */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-4 border-primary/20">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary tabular-nums">
                    {maxSpeed.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground uppercase">
                    {speedUnit}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm font-medium">Maximum Speed</div>
            </div>

            {/* GPS Points */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-4 border-primary/20">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary tabular-nums">
                    {routePoints.length}
                  </div>
                  <div className="text-sm text-muted-foreground uppercase">
                    Points
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm font-medium">GPS Points</div>
            </div>

            {/* Distance */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-4 border-primary/20">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary tabular-nums">
                    {totalDistance < 1000 ? totalDistance.toFixed(0) : (totalDistance / 1000).toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground uppercase">
                    {totalDistance < 1000 ? 'M' : 'KM'}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm font-medium">Distance</div>
            </div>
          </div>

          {/* Demo Mode Controls and Progress */}
          {isDemoMode && demoState && (
            <div className="border-t border-border/30 pt-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Trip Progress</span>
                    <span>{demoProgress.toFixed(1)}%</span>
                  </div>
                  <Progress value={demoProgress} className="h-2" />
                </div>

                {/* Demo Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {demoState.isPaused ? (
                      <Button size="sm" onClick={onDemoResume} variant="outline" className="h-8 px-3">
                        <Play className="w-3 h-3 mr-1" />
                        Resume
                      </Button>
                    ) : (
                      <Button size="sm" onClick={onDemoPause} variant="outline" className="h-8 px-3">
                        <Pause className="w-3 h-3 mr-1" />
                        Pause
                      </Button>
                    )}
                    <Button size="sm" onClick={onDemoStop} variant="destructive" className="h-8 px-3">
                      <Square className="w-3 h-3 mr-1" />
                      Stop
                    </Button>
                  </div>

                  {/* Speed Control */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Speed:</label>
                    <Select
                      value={demoState.speedMultiplier.toString()}
                      onValueChange={(value) => onDemoSpeedChange?.(parseFloat(value))}
                    >
                      <SelectTrigger className="h-8 w-16 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                        <SelectItem value="5">5x</SelectItem>
                        <SelectItem value="10">10x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  Segment {demoState.currentSegmentIndex + 1} • {(demoState.positionInSegment * 100).toFixed(0)}% complete
                  {demoState.isPaused ? ' (Paused)' : ''}
                </div>

                {/* Demo Target Speed */}
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span className="text-muted-foreground">Target Speed:</span>
                  <span className="font-semibold tabular-nums">
                    {demoState.targetSpeed.toFixed(1)} {speedUnit}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Details */}
      {currentLocation && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Current Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Address Display */}
                <div className="min-h-[40px]">
                  {isResolvingAddress ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                      <span className="text-sm text-muted-foreground">Resolving address...</span>
                    </div>
                  ) : currentAddress ? (
                    <div>
                      <div className="text-sm font-medium leading-tight">{currentAddress}</div>
                      <div className="text-xs text-muted-foreground mt-1">Current address</div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Address unavailable</div>
                  )}
                </div>

                {/* GPS Coordinates */}
                <div className="pt-2 border-t border-border/30">
                  <div className="space-y-1">
                    <div className="font-mono text-xs text-muted-foreground">
                      {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Satellite className="w-4 h-4" />
                GPS Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Accuracy</span>
                  <span className="font-semibold">±{Math.round(getAccuracy())}m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Signal</span>
                  <div className="flex items-center gap-1">
                    {getAccuracy() <= 5 && <div className="w-2 h-4 bg-green-500 rounded-sm"></div>}
                    {getAccuracy() <= 10 && <div className="w-2 h-3 bg-green-400 rounded-sm"></div>}
                    {getAccuracy() <= 20 && <div className="w-2 h-2 bg-yellow-400 rounded-sm"></div>}
                    <div className="w-2 h-1 bg-gray-300 rounded-sm"></div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {getAccuracy() <= 5 ? 'Excellent' :
                   getAccuracy() <= 10 ? 'Good' :
                   getAccuracy() <= 20 ? 'Fair' : 'Poor'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Navigation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getHeading() !== undefined ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Heading</span>
                      <span className="font-semibold">{getHeading()?.toFixed(0)}°</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getHeading() && getHeading()! >= 337.5 || getHeading()! < 22.5 ? 'North' :
                       getHeading()! >= 22.5 && getHeading()! < 67.5 ? 'Northeast' :
                       getHeading()! >= 67.5 && getHeading()! < 112.5 ? 'East' :
                       getHeading()! >= 112.5 && getHeading()! < 157.5 ? 'Southeast' :
                       getHeading()! >= 157.5 && getHeading()! < 202.5 ? 'South' :
                       getHeading()! >= 202.5 && getHeading()! < 247.5 ? 'Southwest' :
                       getHeading()! >= 247.5 && getHeading()! < 292.5 ? 'West' :
                       'Northwest'}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No heading data</div>
                )}
                {getCurrentAltitude() > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-1">
                      <Mountain className="w-3 h-3" />
                      Altitude
                    </span>
                    <span className="font-semibold">{getCurrentAltitude().toFixed(0)}m</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default TrackingDashboard