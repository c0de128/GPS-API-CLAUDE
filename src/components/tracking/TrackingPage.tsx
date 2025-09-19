import React, { useEffect, useState, useRef } from 'react'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGPS } from '@/hooks/useGPS'
import { useTrip } from '@/hooks/useTrip'
import TrackingDashboard from './TrackingDashboard'
import SystemStatusLine from './SystemStatusLine'
import LiveMap from './LiveMap'
import DemoTripForm from '@/components/demo/DemoTripForm'
import { DemoTripConfig, LocationData } from '@/types'
import { geocodingService } from '@/services/geocodingService'
import { gpsService } from '@/services/GPSService'

const TrackingPage: React.FC = () => {
  const [speedUnit] = useState<'mph' | 'kmh'>('mph')
  const [showDemoForm, setShowDemoForm] = useState(false)
  const [demoConfig, setDemoConfig] = useState<DemoTripConfig | null>(null)
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([])
  const [currentAddress, setCurrentAddress] = useState<string | null>(null)
  const [isResolvingAddress, setIsResolvingAddress] = useState(false)
  const [followVehicle, setFollowVehicle] = useState(false) // Start with manual control

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
    stopTrip,
    addRoutePoint,
    isRecording
  } = useTrip()

  // Store addRoutePoint in a ref to avoid infinite loops
  const addRoutePointRef = useRef(addRoutePoint)
  useEffect(() => {
    addRoutePointRef.current = addRoutePoint
  }, [addRoutePoint])

  // Auto-start GPS when trip becomes active
  useEffect(() => {
    if (tripStatus === 'active' && !isTracking) {
      startTracking()
    } else if (tripStatus !== 'active' && isTracking) {
      stopTracking()
    }
  }, [tripStatus, isTracking, startTracking, stopTracking])

  // Update location history when location changes
  useEffect(() => {
    if (currentLocation) {
      console.log('🎮 TrackingPage LOCATION UPDATE: New location received', {
        location: { lat: currentLocation.latitude, lng: currentLocation.longitude },
        isDemoMode,
        isTracking,
        timestamp: currentLocation.timestamp
      })
      setLocationHistory(prev => {
        // Check if this location is already in history to prevent duplicates
        const lastLocation = prev[prev.length - 1]
        if (lastLocation &&
            lastLocation.latitude === currentLocation.latitude &&
            lastLocation.longitude === currentLocation.longitude &&
            lastLocation.timestamp === currentLocation.timestamp) {
          console.log('TrackingPage: Skipping duplicate location')
          return prev
        }

        const newHistory = [...prev, currentLocation]
        console.log('🎮 TrackingPage HISTORY: Added location to history, total count:', newHistory.length)
        // Keep only last 100 locations to prevent memory issues
        return newHistory.length > 100 ? newHistory.slice(-100) : newHistory
      })
    }
  }, [currentLocation, isDemoMode, isTracking])

  // Subscribe to trip recording (5-second throttled) when recording a trip
  useEffect(() => {
    if (!isRecording) {
      return
    }

    console.log('🎮 TrackingPage: Subscribing to 2-second trip recording', {
      isRecording,
      isTracking,
      isDemoMode
    })

    const unsubscribe = gpsService.subscribeToTripRecording((location) => {
      console.log('✅ TrackingPage: Adding throttled route point (2-second interval)', {
        location: { lat: location.latitude, lng: location.longitude },
        timestamp: location.timestamp,
        isRecording
      })
      // Use ref to avoid infinite loop
      addRoutePointRef.current(location)
    })

    return unsubscribe
  }, [isRecording]) // Removed addRoutePoint from dependencies to prevent infinite loop

  // Clear location history when tracking stops
  useEffect(() => {
    if (!isTracking && !isDemoMode) {
      console.log('TrackingPage: Clearing location history (tracking stopped)')
      setLocationHistory([])
    }
  }, [isTracking, isDemoMode])

  // Clear location history when demo mode starts fresh
  useEffect(() => {
    if (isDemoMode && demoState?.isActive && demoState?.currentSegmentIndex === 0 && demoState?.positionInSegment === 0) {
      console.log('TrackingPage: Clearing location history for fresh demo start')
      setLocationHistory([])
    }
  }, [isDemoMode, demoState])

  // Address resolution effect with debouncing
  useEffect(() => {
    if (!currentLocation || (!isTracking && !isDemoMode)) {
      setCurrentAddress(null)
      setIsResolvingAddress(false)
      return
    }

    let timeoutId: NodeJS.Timeout

    const resolveAddress = async () => {
      setIsResolvingAddress(true)
      try {
        const address = await geocodingService.reverseGeocode(currentLocation)
        setCurrentAddress(address)
      } catch (error) {
        console.warn('Failed to resolve address:', error)
        setCurrentAddress(null)
      } finally {
        setIsResolvingAddress(false)
      }
    }

    // Debounce address resolution to avoid excessive API calls
    timeoutId = setTimeout(resolveAddress, 2000)

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [currentLocation, isTracking, isDemoMode])

  // Handle trip actions
  const handleStartTrip = async (name: string, notes: string) => {
    startTrip(name, notes)
  }


  // Demo trip handlers
  const handleStartDemo = (config: DemoTripConfig) => {
    setDemoConfig(config)
    startDemoMode(config)
    setShowDemoForm(false)
    setFollowVehicle(true) // Auto-enable follow vehicle when demo starts

    // Start a demo trip in the trip system
    console.log('🎮 TrackingPage.handleStartDemo: Starting demo trip')
    startTrip(`Demo: ${config.startAddress} → ${config.endAddress}`, 'Demo trip simulation', 'demo')
  }

  // Map control functions
  const handleToggleFollowVehicle = () => {
    setFollowVehicle(!followVehicle)
    console.log('🗺️ TrackingPage: Toggle follow vehicle:', !followVehicle)
  }

  const handleRecenterMap = () => {
    if (currentLocation) {
      // We'll let the LiveMap component handle the actual recentering
      // by temporarily enabling follow vehicle for one update
      setFollowVehicle(true)
      console.log('🗺️ TrackingPage: Recenter map requested')
    }
  }

  const handleStopDemo = () => {
    stopDemoMode()
    setDemoConfig(null)
    setLocationHistory([]) // Clear location history when demo stops

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

      {/* Comprehensive Dashboard */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-muted-foreground">Real-Time Dashboard</h2>
          <div className="flex items-center gap-2">
            {tripStatus === 'planning' && (
              <Button
                onClick={() => {
                  const name = `Trip ${new Date().toLocaleDateString()}`
                  handleStartTrip(name, '')
                }}
                size="sm"
                variant="default"
              >
                <Play className="w-4 h-4 mr-2" />
                Start New Trip
              </Button>
            )}
            {!isDemoMode && !currentTrip && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDemoForm(true)}
              >
                Start Demo Trip
              </Button>
            )}
          </div>
        </div>
        <SystemStatusLine
          isTracking={isTracking}
          error={error}
          permission={permission}
          tripStatus={tripStatus}
          isDemoMode={isDemoMode}
          routePoints={routePoints}
        />
        <TrackingDashboard
          currentLocation={currentLocation}
          currentSpeed={currentSpeed}
          averageSpeed={averageSpeed}
          maxSpeed={maxSpeed}
          speedUnit={speedUnit}
          routePoints={routePoints}
          totalDistance={totalDistance}
          isTracking={isTracking}
          isDemoMode={isDemoMode}
          demoState={demoState}
          demoProgress={demoState && demoConfig ?
            ((demoState.currentSegmentIndex + demoState.positionInSegment) / demoConfig.route.length) * 100 : 0}
          currentAddress={currentAddress}
          isResolvingAddress={isResolvingAddress}
          onDemoPause={pauseDemoMode}
          onDemoResume={resumeDemoMode}
          onDemoStop={handleStopDemo}
          onDemoSpeedChange={setDemoSpeedMultiplier}
        />
      </section>

      {/* Demo Controls integrated into main dashboard - no separate section needed */}

      {/* Live Map */}
      <div>
        <h2 className="text-lg font-medium mb-3 text-muted-foreground">Live Map</h2>
        <LiveMap
          center={
            currentLocation
              ? [currentLocation.latitude, currentLocation.longitude]
              : [32.7767, -96.7970]
          }
          zoom={currentLocation ? 15 : 9}
          locations={locationHistory}
          showRoute={true}
          interactive={true}
          isTracking={isTracking}
          routePoints={routePoints}
          // Demo trip props
          demoConfig={demoConfig || undefined}
          isDemoMode={isDemoMode}
          // Map control props
          followVehicle={followVehicle}
          onToggleFollowVehicle={handleToggleFollowVehicle}
          onRecenterMap={handleRecenterMap}
          className="h-[600px]"
        />
      </div>



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