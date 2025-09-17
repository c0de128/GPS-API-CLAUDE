import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MapPin, Route, Clock, Zap, AlertCircle } from 'lucide-react'
import { GeocodeResult, DemoTripConfig } from '@/types'
import { openRouteService } from '@/services/openRouteService'
import { formatDistance, formatDuration } from '@/lib/utils'

interface DemoTripFormProps {
  isOpen: boolean
  onClose: () => void
  onStartDemo: (config: DemoTripConfig) => void
}

const DemoTripForm: React.FC<DemoTripFormProps> = ({
  isOpen,
  onClose,
  onStartDemo
}) => {
  const [startAddress, setStartAddress] = useState('1010 Taylor Drive, Allen Texas 75013')
  const [endAddress, setEndAddress] = useState('880 W Euless Blvd, Euless, TX 76040')
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [routePreview, setRoutePreview] = useState<DemoTripConfig | null>(null)

  const [startSuggestions, setStartSuggestions] = useState<GeocodeResult[]>([])
  const [endSuggestions, setEndSuggestions] = useState<GeocodeResult[]>([])
  const [showStartSuggestions, setShowStartSuggestions] = useState(false)
  const [showEndSuggestions, setShowEndSuggestions] = useState(false)

  // Speed multiplier options
  const speedOptions = [
    { value: 0.5, label: '0.5x (Slow)', description: 'Half speed for detailed observation' },
    { value: 1, label: '1x (Normal)', description: 'Real-time simulation' },
    { value: 2, label: '2x (Fast)', description: 'Double speed' },
    { value: 5, label: '5x (Very Fast)', description: 'Quick demo' },
    { value: 10, label: '10x (Ultra Fast)', description: 'Rapid preview' }
  ]

  // Demo address suggestions
  const demoAddresses = [
    "Dallas, TX",
    "Fort Worth, TX",
    "Arlington, TX",
    "Plano, TX",
    "McKinney, TX"
  ]

  // Debounced geocoding
  useEffect(() => {
    if (startAddress.length > 2) {
      const timer = setTimeout(async () => {
        try {
          const results = await openRouteService.geocodeAddress(startAddress)
          setStartSuggestions(results.slice(0, 5))
        } catch (err) {
          // Use demo suggestions
          setStartSuggestions(
            demoAddresses
              .filter(addr => addr.toLowerCase().includes(startAddress.toLowerCase()))
              .map(addr => ({
                address: addr,
                coordinates: [-96.7970, 32.7767] as [number, number],
                confidence: 0.8
              }))
          )
        }
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setStartSuggestions([])
    }
  }, [startAddress])

  useEffect(() => {
    if (endAddress.length > 2) {
      const timer = setTimeout(async () => {
        try {
          const results = await openRouteService.geocodeAddress(endAddress)
          setEndSuggestions(results.slice(0, 5))
        } catch (err) {
          // Use demo suggestions
          setEndSuggestions(
            demoAddresses
              .filter(addr => addr.toLowerCase().includes(endAddress.toLowerCase()))
              .map(addr => ({
                address: addr,
                coordinates: [-97.3201, 32.7555] as [number, number],
                confidence: 0.8
              }))
          )
        }
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setEndSuggestions([])
    }
  }, [endAddress])

  const handleCalculateRoute = async () => {
    if (!startAddress || !endAddress) {
      setError('Please enter both start and end addresses')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Geocode addresses
      console.log('🔍 DemoTripForm: Geocoding addresses:', { startAddress, endAddress })
      const startResults = await openRouteService.geocodeAddress(startAddress)
      const endResults = await openRouteService.geocodeAddress(endAddress)

      console.log('🔍 DemoTripForm: Geocoding results:', {
        startResults: startResults.length,
        endResults: endResults.length,
        startFirst: startResults[0],
        endFirst: endResults[0]
      })

      console.log('📍 DemoTripForm: COORDINATE FLOW - Extracted coordinates:', {
        startCoords: startResults[0]?.coordinates,
        endCoords: endResults[0]?.coordinates,
        startAddress: startResults[0]?.address,
        endAddress: endResults[0]?.address
      })

      if (startResults.length === 0 || endResults.length === 0) {
        throw new Error(`Could not find addresses - Start: ${startResults.length} results, End: ${endResults.length} results`)
      }

      const startCoords = startResults[0].coordinates
      const endCoords = endResults[0].coordinates

      console.log('🗺️ DemoTripForm: Getting route between coordinates:', { startCoords, endCoords })

      // Get route
      const route = await openRouteService.getRoute(startCoords, endCoords)

      console.log('🗺️ DemoTripForm: Route calculation result:', {
        routeSegments: route.length,
        firstSegment: route[0]
      })

      if (route.length === 0) {
        throw new Error('No route found between these locations')
      }

      // Calculate totals
      const totalDistance = route.reduce((sum, segment) => sum + segment.distance, 0)
      const estimatedDuration = route.reduce((sum, segment) => sum + segment.duration, 0)

      console.log('✅ DemoTripForm: Route calculation successful:', {
        totalDistance: `${totalDistance.toFixed(0)}m`,
        estimatedDuration: `${estimatedDuration.toFixed(0)}s`,
        speedMultiplier
      })

      const config: DemoTripConfig = {
        startAddress: startResults[0].address,
        endAddress: endResults[0].address,
        startCoordinates: startCoords,
        endCoordinates: endCoords,
        route,
        totalDistance,
        estimatedDuration,
        speedMultiplier
      }

      console.log('📍 DemoTripForm: COORDINATE FLOW - Final DemoTripConfig created:', {
        startAddress: config.startAddress,
        endAddress: config.endAddress,
        startCoordinates: config.startCoordinates,
        endCoordinates: config.endCoordinates,
        routeSegments: config.route.length,
        firstRouteSegmentCoords: config.route[0]?.coordinates?.slice(0, 2), // Show first 2 coords
        speedMultiplier: config.speedMultiplier
      })

      setRoutePreview(config)
      console.log('✅ DemoTripForm: Route preview set successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate route'
      console.error('❌ DemoTripForm: Route calculation failed:', err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartDemo = () => {
    console.log('🚀 DemoTripForm: handleStartDemo called', { routePreview: !!routePreview })
    if (routePreview) {
      console.log('🚀 DemoTripForm: Starting demo with config:', routePreview)
      console.log('📍 DemoTripForm: COORDINATE FLOW - Config being passed to onStartDemo:', {
        startCoordinates: routePreview.startCoordinates,
        endCoordinates: routePreview.endCoordinates,
        routeFirstSegment: routePreview.route[0]?.coordinates?.slice(0, 2),
        startAddress: routePreview.startAddress,
        endAddress: routePreview.endAddress
      })
      onStartDemo(routePreview)
      onClose()
    } else {
      console.error('❌ DemoTripForm: No route preview available for demo start')
    }
  }

  const handleClose = () => {
    setStartAddress('')
    setEndAddress('')
    setSpeedMultiplier(1)
    setRoutePreview(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="w-5 h-5" />
            Create Demo Trip
          </DialogTitle>
          <DialogDescription>
            Set up a simulated GPS trip between two addresses with realistic movement and speeds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Address Inputs */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Enter starting address..."
                  value={startAddress}
                  onChange={(e) => {
                    setStartAddress(e.target.value)
                    setShowStartSuggestions(true)
                  }}
                  onFocus={() => setShowStartSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowStartSuggestions(false), 200)}
                  className="pl-10"
                />
                {showStartSuggestions && startSuggestions.length > 0 && (
                  <div className="absolute z-[1002] w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {startSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => {
                          setStartAddress(suggestion.address)
                          setShowStartSuggestions(false)
                        }}
                      >
                        {suggestion.address}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Enter destination address..."
                  value={endAddress}
                  onChange={(e) => {
                    setEndAddress(e.target.value)
                    setShowEndSuggestions(true)
                  }}
                  onFocus={() => setShowEndSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowEndSuggestions(false), 200)}
                  className="pl-10"
                />
                {showEndSuggestions && endSuggestions.length > 0 && (
                  <div className="absolute z-[1002] w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {endSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => {
                          setEndAddress(suggestion.address)
                          setShowEndSuggestions(false)
                        }}
                      >
                        {suggestion.address}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Speed Multiplier */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Simulation Speed
            </label>
            <Select
              value={speedMultiplier.toString()}
              onValueChange={(value) => setSpeedMultiplier(parseFloat(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {speedOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calculate Route Button */}
          <Button
            onClick={handleCalculateRoute}
            disabled={!startAddress || !endAddress || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2" />
                Calculating Route...
              </>
            ) : (
              <>
                <Route className="w-4 h-4 mr-2" />
                Calculate Route
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}

          {/* Route Preview */}
          {routePreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Route Preview</CardTitle>
                <CardDescription>
                  Review your demo trip details before starting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Route className="w-4 h-4" />
                      Distance
                    </div>
                    <div className="font-medium">{formatDistance(routePreview.totalDistance)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Duration
                    </div>
                    <div className="font-medium">
                      {formatDuration(routePreview.estimatedDuration * 1000 / speedMultiplier)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm">
                    <strong>From:</strong> {routePreview.startAddress}
                  </div>
                  <div className="text-sm">
                    <strong>To:</strong> {routePreview.endAddress}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleStartDemo} className="flex-1">
                    Start Demo Trip
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setRoutePreview(null)}
                  >
                    Recalculate
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Note */}
          {!openRouteService.isConfigured() && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-700">
                <strong>Demo Mode:</strong> Using simulated routing data. For real routes,
                configure an OpenRouteService API token in your environment variables.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DemoTripForm