import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AlertCircle, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useStorage } from '@/hooks/useStorage'
import { useReplay } from '@/hooks/useReplay'
import { Trip } from '@/types'
import ReplayControls from './ReplayControls'
import ReplayMap from './ReplayMap'
import ReplayStats from './ReplayStats'

const ReplayPage: React.FC = () => {
  const navigate = useNavigate()
  const { tripId } = useParams<{ tripId: string }>()
  const { getTrip, isLoading, error } = useStorage()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const replay = useReplay(trip)

  // Load trip data
  useEffect(() => {
    const loadTrip = async () => {
      if (!tripId) {
        setLoadError('Trip ID not provided')
        return
      }

      try {
        const tripData = await getTrip(tripId)
        if (!tripData) {
          setLoadError('Trip not found')
          return
        }

        if (tripData.status !== 'completed') {
          setLoadError('Only completed trips can be replayed')
          return
        }

        if (!tripData.route || tripData.route.length < 2) {
          setLoadError('Trip has insufficient route data for replay')
          return
        }

        setTrip(tripData)
        setLoadError(null)
      } catch (err) {
        console.error('Failed to load trip:', err)
        setLoadError('Failed to load trip data')
      }
    }

    loadTrip()
  }, [tripId, getTrip])

  // Loading state
  if (isLoading) {
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
            <h1 className="text-2xl font-bold">Route Replay</h1>
            <div /> {/* Spacer */}
          </div>

          <div className="text-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading trip data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || loadError) {
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
            <h1 className="text-2xl font-bold">Route Replay</h1>
            <div /> {/* Spacer */}
          </div>

          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to Load Trip</h3>
              <p className="text-muted-foreground mb-6">
                {error || loadError}
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/trips')}
                >
                  Back to Trips
                </Button>
                {tripId && (
                  <Button
                    onClick={() => navigate(`/trips/${tripId}`)}
                  >
                    View Trip Details
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // No trip data
  if (!trip) {
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
            <h1 className="text-2xl font-bold">Route Replay</h1>
            <div /> {/* Spacer */}
          </div>

          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Trip Not Found</h3>
              <p className="text-muted-foreground mb-6">
                The requested trip could not be found or loaded.
              </p>
              <Button onClick={() => navigate('/trips')}>
                Back to Trips
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/trips')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Trips
            </Button>

            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Route Replay
              </h1>
              <p className="text-muted-foreground">
                {trip.name}
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate(`/trips/${tripId}`)}
              className="flex items-center gap-2"
            >
              Trip Details
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Replay Controls */}
        <ReplayControls
          replay={replay}
          tripName={trip.name}
        />

        {/* Map */}
        <ReplayMap
          trip={trip}
          currentLocation={replay.getCurrentLocation()}
          progress={replay.replayState.progress}
        />

        {/* Statistics */}
        <ReplayStats
          trip={trip}
          currentLocation={replay.getCurrentLocation()}
          progress={replay.replayState.progress}
          timeElapsed={replay.replayState.timeElapsed}
          playbackSpeed={replay.replayState.speed}
        />
      </div>
    </div>
  )
}

export default ReplayPage