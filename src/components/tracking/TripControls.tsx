import React, { useState } from 'react'
import { Play, Pause, Square, MapPin, Clock, Route } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TripStatus } from '@/types'
import { formatDuration, formatDistance } from '@/lib/utils'

interface TripControlsProps {
  isTracking: boolean
  tripStatus: TripStatus
  tripName: string
  startTime: number | null
  currentTime: number
  totalDistance: number
  onStartTrip: (name: string, notes: string) => void
  onPauseTrip: () => void
  onResumeTrip: () => void
  onStopTrip: () => void
  onTripNameChange: (name: string) => void
  className?: string
}

const TripControls: React.FC<TripControlsProps> = ({
  isTracking,
  tripStatus,
  tripName,
  startTime,
  currentTime,
  totalDistance,
  onStartTrip,
  onPauseTrip,
  onResumeTrip,
  onStopTrip,
  onTripNameChange,
  className
}) => {
  const [newTripName, setNewTripName] = useState('')
  const [tripNotes, setTripNotes] = useState('')
  const [showTripForm, setShowTripForm] = useState(false)

  const handleStartTrip = () => {
    if (tripStatus === 'planning') {
      setShowTripForm(true)
    } else {
      const name = newTripName.trim() || `Trip ${new Date().toLocaleDateString()}`
      onStartTrip(name, tripNotes.trim())
      setNewTripName('')
      setTripNotes('')
      setShowTripForm(false)
    }
  }

  const handleConfirmStart = () => {
    const name = newTripName.trim() || `Trip ${new Date().toLocaleDateString()}`
    onStartTrip(name, tripNotes.trim())
    setNewTripName('')
    setTripNotes('')
    setShowTripForm(false)
  }

  const getStatusBadge = () => {
    switch (tripStatus) {
      case 'active':
        return <Badge className="bg-green-600 text-white"><div className="w-2 h-2 bg-white rounded-full mr-1.5"></div>Recording</Badge>
      case 'paused':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Paused</Badge>
      case 'completed':
        return <Badge variant="outline"><Route className="w-3 h-3 mr-1" />Completed</Badge>
      default:
        return <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />Ready</Badge>
    }
  }

  const getElapsedTime = () => {
    if (!startTime) return 0
    return currentTime - startTime
  }

  return (
    <Card className={`@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardDescription className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Trip Control
          </CardDescription>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Trip Name Display/Input */}
        {tripStatus !== 'planning' && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Trip Name</label>
            <Input
              value={tripName}
              onChange={(e) => onTripNameChange(e.target.value)}
              placeholder="Enter trip name..."
              className="mt-1"
            />
          </div>
        )}

        {/* Trip Form for New Trips */}
        {showTripForm && (
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Trip Name</label>
              <Input
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                placeholder={`Trip ${new Date().toLocaleDateString()}`}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Notes (Optional)</label>
              <Textarea
                value={tripNotes}
                onChange={(e) => setTripNotes(e.target.value)}
                placeholder="Add notes about this trip..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleConfirmStart} className="flex-1" size="sm">
                <Play className="w-4 h-4 mr-2" />
                Start Recording
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowTripForm(false)}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Trip Statistics */}
        {tripStatus !== 'planning' && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="from-blue-50 to-card bg-gradient-to-t shadow-xs">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1 text-xs">
                  <Clock className="w-3 h-3" />
                  Duration
                </CardDescription>
                <CardTitle className="text-lg font-semibold tabular-nums text-blue-600">
                  {formatDuration(getElapsedTime())}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="from-green-50 to-card bg-gradient-to-t shadow-xs">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1 text-xs">
                  <Route className="w-3 h-3" />
                  Distance
                </CardDescription>
                <CardTitle className="text-lg font-semibold tabular-nums text-green-600">
                  {formatDistance(totalDistance)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2">
          {tripStatus === 'planning' && (
            <Button
              onClick={handleStartTrip}
              size="lg"
              className="flex-1"
              disabled={false}
            >
              <Play className="w-4 h-4 mr-2" />
              Start New Trip
            </Button>
          )}

          {tripStatus === 'active' && (
            <>
              <Button
                onClick={onPauseTrip}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button
                onClick={onStopTrip}
                variant="destructive"
                size="lg"
                className="flex-1"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          )}

          {tripStatus === 'paused' && (
            <>
              <Button
                onClick={onResumeTrip}
                size="lg"
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
              <Button
                onClick={onStopTrip}
                variant="destructive"
                size="lg"
                className="flex-1"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>
      </CardContent>

      {/* Permission Warning */}
      {!isTracking && tripStatus === 'active' && (
        <CardFooter className="pt-0">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg w-full">
            <p className="text-sm text-yellow-800">
              GPS tracking is not active. Please enable location permissions to record your trip.
            </p>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

export default TripControls