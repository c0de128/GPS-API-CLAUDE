import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useGPS } from '@/hooks/useGPS'
import { useTrip } from '@/hooks/useTrip'
import SpeedDashboard from './SpeedDashboard'
import TripControls from './TripControls'
import LiveMap from './LiveMap'
import DemoTripForm from '@/components/demo/DemoTripForm'
import DemoControls from '@/components/demo/DemoControls'
import { DemoTripConfig } from '@/types'

const TrackingPage: React.FC = () => {
  const [speedUnit, setSpeedUnit] = useState<'mph' | 'kmh'>('mph')
  const [showDemoForm, setShowDemoForm] = useState(false)
  const [demoConfig, setDemoConfig] = useState<DemoTripConfig | null>(null)

  // GPS and trip hooks
  const {
    isTracking,
    currentLocation,
    error,
    permission,
    currentSpeed,
    averageSpeed,
    maxSpeed,
    startTracking,
    stopTracking,
    // Demo mode
    isDemoMode,
    demoState,
    startDemoMode,
    stopDemoMode,
    pauseDemoMode,
    resumeDemoMode,
    setDemoSpeedMultiplier
  } = useGPS(speedUnit)

  const {
    currentTrip,
    tripStatus,
    routePoints,
    totalDistance,
    startTrip,
    pauseTrip,
    resumeTrip,
    stopTrip,
    updateTripName,
    addRoutePoint,
    isRecording
  } = useTrip()

  // Auto-start GPS when trip becomes active
  useEffect(() => {
    if (tripStatus === 'active' && !isTracking) {
      startTracking()
    } else if (tripStatus !== 'active' && isTracking) {
      stopTracking()
    }
  }, [tripStatus, isTracking, startTracking, stopTracking])

  // Add route points when location updates during active trip
  useEffect(() => {
    if (currentLocation && isRecording && isTracking) {
      addRoutePoint(currentLocation)
    }
  }, [currentLocation, isRecording, isTracking, addRoutePoint])

  // Handle trip actions
  const handleStartTrip = async (name: string, notes: string) => {
    startTrip(name, notes)
  }

  const handleStopTrip = () => {
    stopTrip()
    stopTracking()
  }

  const handlePauseTrip = () => {
    pauseTrip()
    stopTracking()
  }

  const handleResumeTrip = () => {
    resumeTrip()
    startTracking()
  }

  // Demo trip handlers
  const handleStartDemo = (config: DemoTripConfig) => {
    setDemoConfig(config)
    startDemoMode(config)
    setShowDemoForm(false)

    // Start a demo trip in the trip system
    startTrip(`Demo: ${config.startAddress} → ${config.endAddress}`, 'Demo trip simulation')
  }

  const handleStopDemo = () => {
    stopDemoMode()
    setDemoConfig(null)

    // Stop the current trip
    if (currentTrip) {
      stopTrip()
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Permission/Error Warnings */}
      {permission === 'denied' && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive font-medium">Location Permission Denied</p>
          <p className="text-destructive/80 text-sm mt-1">
            Please enable location permissions in your browser settings to use GPS tracking.
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive font-medium">GPS Error</p>
          <p className="text-destructive/80 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Speed Dashboard */}
      <section>
        <h2 className="text-lg font-medium mb-3 text-muted-foreground">Speed Monitor</h2>
        <SpeedDashboard
          currentSpeed={currentSpeed}
          averageSpeed={averageSpeed}
          maxSpeed={maxSpeed}
          unit={speedUnit}
          isTracking={isTracking}
          accuracy={currentLocation?.accuracy}
        />
      </section>

      {/* Demo Controls - Show when demo is active */}
      {isDemoMode && (
        <section>
          <DemoControls
            isActive={isDemoMode}
            demoState={demoState}
            currentAddress={demoConfig?.startAddress}
            destinationAddress={demoConfig?.endAddress}
            onPause={pauseDemoMode}
            onResume={resumeDemoMode}
            onStop={handleStopDemo}
            onSpeedChange={setDemoSpeedMultiplier}
          />
        </section>
      )}

      {/* Map and Trip Controls Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live Map */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-medium mb-3 text-muted-foreground">Live Map</h2>
          <LiveMap
            center={
              currentLocation
                ? [currentLocation.latitude, currentLocation.longitude]
                : [32.8998, -97.0403]
            }
            zoom={15}
            locations={currentLocation ? [currentLocation] : []}
            showRoute={true}
            interactive={true}
            isTracking={isTracking}
            routePoints={routePoints}
            // Demo trip props
            demoConfig={demoConfig}
            isDemoMode={isDemoMode}
          />
        </div>

        {/* Trip Controls */}
        <div>
          <h2 className="text-lg font-medium mb-3 text-muted-foreground">Trip Control</h2>
          <TripControls
            isTracking={isTracking}
            tripStatus={tripStatus}
            tripName={currentTrip?.name || ''}
            startTime={currentTrip?.startTime || null}
            currentTime={Date.now()}
            totalDistance={totalDistance}
            onStartTrip={handleStartTrip}
            onPauseTrip={handlePauseTrip}
            onResumeTrip={handleResumeTrip}
            onStopTrip={handleStopTrip}
            onTripNameChange={updateTripName}
          />
        </div>
      </div>

      {/* Current Location Info */}
      {currentLocation && (
        <section>
          <h2 className="text-lg font-medium mb-3 text-muted-foreground">Location Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-medium mb-2">Coordinates</h3>
              <p className="font-mono text-sm">
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Accuracy: ±{Math.round(currentLocation.accuracy)}m
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-medium mb-2">Timestamp</h3>
              <p className="text-sm">
                {new Date(currentLocation.timestamp).toLocaleString()}
              </p>
              {currentLocation.altitude && (
                <p className="text-xs text-muted-foreground mt-1">
                  Altitude: {currentLocation.altitude.toFixed(1)}m
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={() => setSpeedUnit(speedUnit === 'mph' ? 'kmh' : 'mph')}
        >
          Switch to {speedUnit === 'mph' ? 'km/h' : 'mph'}
        </Button>

        {!isDemoMode && !currentTrip && (
          <Button
            variant="default"
            onClick={() => setShowDemoForm(true)}
          >
            Start Demo Trip
          </Button>
        )}
      </section>

      {/* Demo Trip Form */}
      <DemoTripForm
        isOpen={showDemoForm}
        onClose={() => setShowDemoForm(false)}
        onStartDemo={handleStartDemo}
      />
    </div>
  )
}

export default TrackingPage