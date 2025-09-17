import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LocationData, MapComponentProps } from '@/types'
import { Navigation, Target } from 'lucide-react'

// Extend the Window interface to include Leaflet
declare global {
  interface Window {
    L: any
  }
}

interface LiveMapProps extends MapComponentProps {
  isTracking: boolean
  routePoints: LocationData[]
  onMapClick?: (latlng: { lat: number; lng: number }) => void
  followVehicle?: boolean
  onToggleFollowVehicle?: () => void
  onRecenterMap?: () => void
}

const LiveMap: React.FC<LiveMapProps> = ({
  center = [32.8998, -97.0403], // DFW coordinates as default
  zoom = 10,
  locations = [],
  showRoute = true,
  interactive = true,
  isTracking = false,
  routePoints = [],
  onLocationUpdate,
  onMapClick,
  className,
  // Demo trip props
  demoConfig,
  isDemoMode = false,
  // Map control props
  followVehicle = true, // Default to following vehicle
  onToggleFollowVehicle,
  onRecenterMap
}) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [marker, setMarker] = useState<any>(null)
  const [routePolyline, setRoutePolyline] = useState<any>(null)
  const [demoRoutePolyline, setDemoRoutePolyline] = useState<any>(null)
  const [startMarker, setStartMarker] = useState<any>(null)
  const [endMarker, setEndMarker] = useState<any>(null)
  const [isMapReady, setIsMapReady] = useState(false)

  // Initialize map
  useEffect(() => {
    let mapInstance: any = null
    let checkLeafletInterval: any = null
    let isCleaningUp = false

    const initializeMap = () => {
      // Don't initialize if we're already cleaning up
      if (isCleaningUp) return

      // Check if container already has a map
      if (mapRef.current && window.L && !map) {
        console.log('LiveMap: Initializing Leaflet map...')

        // Check if the container already has a map instance
        const container = mapRef.current as any
        if (container._leaflet_id) {
          console.log('LiveMap: Container already has a map, skipping initialization')
          return
        }

        try {
          mapInstance = window.L.map(mapRef.current, {
            zoomControl: interactive,
            dragging: interactive,
            touchZoom: interactive,
            doubleClickZoom: interactive,
            scrollWheelZoom: interactive,
            boxZoom: interactive,
            keyboard: interactive,
            preferCanvas: true // Better performance for many markers
          }).setView(center, zoom)

          // Add tile layer with better error handling
          const tileLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            minZoom: 3,
            errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            crossOrigin: 'anonymous'
          })

          tileLayer.on('tileerror', (e: any) => {
            console.warn('Tile loading error:', e)
          })

          tileLayer.addTo(mapInstance)

          // Handle map clicks if interactive
          if (interactive && onMapClick) {
            mapInstance.on('click', (e: any) => {
              onMapClick(e.latlng)
            })
          }

          // Wait a bit before setting map ready to ensure tiles start loading
          setTimeout(() => {
            if (!isCleaningUp) {
              setMap(mapInstance)
              setIsMapReady(true)
              console.log('LiveMap: Map initialization complete')
            }
          }, 100)

        } catch (error) {
          console.error('LiveMap: Failed to initialize map:', error)
        }
      }
    }

    // Check if Leaflet is already loaded
    if (window.L) {
      console.log('LiveMap: Leaflet already loaded, initializing map')
      initializeMap()
    } else {
      console.log('LiveMap: Waiting for Leaflet to load...')
      // Wait for Leaflet to load with timeout
      let attempts = 0
      const maxAttempts = 50 // 5 seconds max wait

      checkLeafletInterval = setInterval(() => {
        attempts++
        if (window.L) {
          console.log('LiveMap: Leaflet loaded after', attempts * 100, 'ms')
          clearInterval(checkLeafletInterval)
          initializeMap()
        } else if (attempts >= maxAttempts) {
          console.error('LiveMap: Timeout waiting for Leaflet to load')
          clearInterval(checkLeafletInterval)
        }
      }, 100)
    }

    // Cleanup function
    return () => {
      isCleaningUp = true

      if (checkLeafletInterval) {
        clearInterval(checkLeafletInterval)
      }

      // Properly clean up the map instance
      if (mapInstance) {
        console.log('LiveMap: Cleaning up map instance')
        try {
          mapInstance.remove()
        } catch (error) {
          console.warn('LiveMap: Error during map cleanup:', error)
        }
        mapInstance = null
      }

      // Reset the container's leaflet ID
      if (mapRef.current) {
        const container = mapRef.current as any
        if (container._leaflet_id) {
          delete container._leaflet_id
        }
      }

      setMap(null)
      setIsMapReady(false)
    }
  }, []) // Remove dependencies to prevent re-initialization

  // Helper function to create marker icons (memoized to prevent re-render loops)
  const createCustomIcon = useCallback((markerType: 'demo' | 'live' | 'static', type: 'start' | 'end' | 'vehicle') => {
    console.log('🎨 createCustomIcon called:', { markerType, type, isTracking, windowL: !!window.L })

    if (!window.L) {
      console.error('❌ createCustomIcon: window.L not available')
      return null
    }

    if (type === 'vehicle') {
      const trackingClass = isTracking ? 'tracking' : ''
      const html = `<div class="vehicle-marker ${markerType} ${trackingClass}"></div>`
      console.log('🚗 createCustomIcon: Creating vehicle icon with HTML:', html)

      const icon = window.L.divIcon({
        className: 'custom-marker',
        html,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })

      console.log('✅ createCustomIcon: Vehicle icon created successfully')
      return icon
    }

    const symbol = type === 'start' ? '🟢' : '🔴'
    const bgColor = type === 'start' ? '#22c55e' : '#ef4444'
    const html = `<div class="start-end-marker" style="background-color: ${bgColor};">${symbol}</div>`
    console.log('🏁 createCustomIcon: Creating start/end icon with HTML:', html)

    const icon = window.L.divIcon({
      className: 'custom-marker',
      html,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })

    console.log('✅ createCustomIcon: Start/end icon created successfully')
    return icon
  }, [isTracking])

  // Update current location marker
  useEffect(() => {
    console.log('🗺️ LiveMap marker update effect triggered:', {
      locationsCount: locations.length,
      isMapReady,
      isDemoMode,
      isTracking,
      mapExists: !!map,
      windowL: !!window.L
    })

    if (!map || !isMapReady || locations.length === 0) {
      console.log('🚫 LiveMap: Skipping marker update - conditions not met:', {
        map: !!map,
        isMapReady,
        locationsCount: locations.length
      })
      return
    }

    const currentLocation = locations[locations.length - 1]
    console.log('📍 LiveMap: Processing location for marker:', {
      lat: currentLocation.latitude,
      lng: currentLocation.longitude,
      accuracy: currentLocation.accuracy,
      timestamp: new Date(currentLocation.timestamp).toISOString(),
      isDemoMode,
      isTracking
    })

    const latLng = [currentLocation.latitude, currentLocation.longitude]

    // Validate coordinates
    if (isNaN(currentLocation.latitude) || isNaN(currentLocation.longitude)) {
      console.error('❌ LiveMap: Invalid coordinates received:', currentLocation)
      return
    }

    // Update map view if tracking and follow vehicle is enabled
    if (isTracking && followVehicle) {
      const currentZoom = map.getZoom()
      const targetZoom = Math.max(currentZoom, 15)
      console.log('🎯 LiveMap: Updating map view for tracking (follow vehicle enabled):', {
        currentZoom,
        targetZoom,
        latLng,
        followVehicle
      })
      map.setView(latLng, targetZoom)
    } else if (isTracking) {
      console.log('🎯 LiveMap: Vehicle position updated but not following (manual control enabled)')
    }

    // Remove existing marker
    if (marker) {
      console.log('🗑️ LiveMap: Removing existing marker')
      map.removeLayer(marker)
    }

    // Determine marker type
    const markerType = isDemoMode ? 'demo' : (isTracking ? 'live' : 'static')
    console.log('🎨 LiveMap: Creating marker with type:', markerType)

    const markerIcon = createCustomIcon(markerType, 'vehicle')

    if (!markerIcon) {
      console.error('❌ LiveMap: Failed to create marker icon for type:', markerType)
      return
    }

    console.log('✅ LiveMap: Marker icon created successfully, adding to map')

    try {
      const newMarker = window.L.marker(latLng, {
        icon: markerIcon,
        zIndexOffset: 1000 // Ensure marker appears above other elements
      })

      console.log('🔧 LiveMap: Marker object created, adding to map...')
      newMarker.addTo(map)

      console.log('💬 LiveMap: Adding popup to marker...')
      newMarker.bindPopup(`
          <div>
            <strong>${isDemoMode ? 'Demo Vehicle' : 'Current Location'}</strong><br>
            Lat: ${currentLocation.latitude.toFixed(6)}<br>
            Lng: ${currentLocation.longitude.toFixed(6)}<br>
            Accuracy: ±${Math.round(currentLocation.accuracy)}m<br>
            <small>Updated: ${new Date(currentLocation.timestamp).toLocaleTimeString()}</small><br>
            ${isDemoMode ? '<span style="color: #9333ea;">● Demo Mode</span>' : ''}
            ${isTracking && !isDemoMode ? '<span style="color: #ef4444;">● Live Tracking</span>' : ''}
          </div>
        `)

      setMarker(newMarker)
      console.log('🎉 LiveMap: Successfully created and added marker at', latLng)

      // Notify parent of location update
      if (onLocationUpdate) {
        console.log('📤 LiveMap: Notifying parent of location update')
        onLocationUpdate(currentLocation)
      }
    } catch (error) {
      console.error('💥 LiveMap: Error creating/adding marker:', error)
      if (error instanceof Error) {
        console.error('Error stack:', error.stack)
      }
    }
  }, [map, isMapReady, locations, isTracking, isDemoMode, createCustomIcon, followVehicle])

  // Handle recenter functionality
  const handleRecenter = useCallback(() => {
    if (map && locations.length > 0) {
      const currentLocation = locations[locations.length - 1]
      const currentZoom = map.getZoom()
      const targetZoom = Math.max(currentZoom, 15)

      console.log('🎯 LiveMap: Recentering map on vehicle', {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        zoom: targetZoom
      })

      map.setView([currentLocation.latitude, currentLocation.longitude], targetZoom)
    }
  }, [map, locations])

  // Combine parent callback with our implementation
  const handleRecenterClick = useCallback(() => {
    handleRecenter()
    if (onRecenterMap) {
      onRecenterMap()
    }
  }, [handleRecenter, onRecenterMap])

  // Update route polyline
  useEffect(() => {
    if (!map || !isMapReady || !showRoute) return

    // Remove existing route
    if (routePolyline) {
      map.removeLayer(routePolyline)
    }

    // Create new route if we have points
    if (routePoints.length > 1) {
      const latlngs = routePoints.map(point => [point.latitude, point.longitude])

      const newPolyline = window.L.polyline(latlngs, {
        color: isTracking ? '#ef4444' : '#3b82f6',
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1
      }).addTo(map)

      setRoutePolyline(newPolyline)

      // Fit bounds to show entire route if not actively tracking
      if (!isTracking && routePoints.length > 1) {
        map.fitBounds(newPolyline.getBounds(), { padding: [20, 20] })
      }
    }
  }, [map, isMapReady, routePoints, showRoute, isTracking])

  // Fit bounds to show all locations
  useEffect(() => {
    if (!map || !isMapReady || locations.length === 0 || isTracking) return

    if (locations.length === 1) {
      const location = locations[0]
      map.setView([location.latitude, location.longitude], 15)
    } else {
      const bounds = window.L.latLngBounds(
        locations.map(loc => [loc.latitude, loc.longitude])
      )
      map.fitBounds(bounds, { padding: [20, 20] })
    }
  }, [map, isMapReady, locations, isTracking])

  // Display demo route from OpenRouteService data
  useEffect(() => {
    if (!map || !isMapReady || !isDemoMode || !demoConfig) return

    // Remove existing demo route
    if (demoRoutePolyline) {
      map.removeLayer(demoRoutePolyline)
    }

    // Convert RouteSegments to polyline coordinates
    const allCoordinates: [number, number][] = []
    demoConfig.route.forEach(segment => {
      segment.coordinates.forEach(coord => {
        // Convert from [lng, lat] to [lat, lng] for Leaflet
        allCoordinates.push([coord[1], coord[0]])
      })
    })

    if (allCoordinates.length > 1) {
      const newPolyline = window.L.polyline(allCoordinates, {
        color: '#3b82f6', // Blue for demo route
        weight: 4,
        opacity: 0.6,
        smoothFactor: 1,
        dashArray: '10, 5' // Dashed line to distinguish from live tracking
      }).addTo(map)

      setDemoRoutePolyline(newPolyline)

      // Fit bounds to show entire route initially
      map.fitBounds(newPolyline.getBounds(), { padding: [20, 20] })
    }
  }, [map, isMapReady, isDemoMode, demoConfig])

  // Display start and end markers for demo trips
  useEffect(() => {
    if (!map || !isMapReady || !isDemoMode) return

    // Remove existing markers
    if (startMarker) {
      map.removeLayer(startMarker)
    }
    if (endMarker) {
      map.removeLayer(endMarker)
    }

    // Add start marker
    if (demoConfig && demoConfig.startCoordinates) {
      const startLatLng = [demoConfig.startCoordinates[1], demoConfig.startCoordinates[0]]
      const startIcon = createCustomIcon('static', 'start') // Green for start

      if (startIcon) {
        const newStartMarker = window.L.marker(startLatLng, {
          icon: startIcon,
          zIndexOffset: 500
        })
          .addTo(map)
          .bindPopup(`
            <div>
              <strong>Trip Start</strong><br>
              ${demoConfig.startAddress}
            </div>
          `)
        setStartMarker(newStartMarker)
      }
    }

    // Add end marker
    if (demoConfig && demoConfig.endCoordinates) {
      const endLatLng = [demoConfig.endCoordinates[1], demoConfig.endCoordinates[0]]
      const endIcon = createCustomIcon('static', 'end') // Red for end

      if (endIcon) {
        const newEndMarker = window.L.marker(endLatLng, {
          icon: endIcon,
          zIndexOffset: 500
        })
          .addTo(map)
          .bindPopup(`
            <div>
              <strong>Destination</strong><br>
              ${demoConfig.endAddress}
            </div>
          `)
        setEndMarker(newEndMarker)
      }
    }
  }, [map, isMapReady, isDemoMode, demoConfig, createCustomIcon])

  // Clean up demo elements when demo mode ends
  useEffect(() => {
    if (!isDemoMode && map) {
      if (demoRoutePolyline) {
        map.removeLayer(demoRoutePolyline)
        setDemoRoutePolyline(null)
      }
      if (startMarker) {
        map.removeLayer(startMarker)
        setStartMarker(null)
      }
      if (endMarker) {
        map.removeLayer(endMarker)
        setEndMarker(null)
      }
    }
  }, [isDemoMode, map, demoRoutePolyline, startMarker, endMarker])

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-0">
        <div
          ref={mapRef}
          className="w-full h-96 md:h-[500px] relative"
          style={{ minHeight: '400px' }}
        >
          {!isMapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}

          {/* Map Control Buttons - Show only when tracking/demo mode is active */}
          {(isTracking || isDemoMode) && isMapReady && (
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
              {/* Follow Vehicle Toggle */}
              <Button
                size="sm"
                variant={followVehicle ? "default" : "outline"}
                onClick={onToggleFollowVehicle}
                className={`shadow-lg ${followVehicle ? 'bg-primary text-primary-foreground' : 'bg-white'}`}
                title={followVehicle ? "Disable vehicle following" : "Enable vehicle following"}
              >
                <Navigation className="w-4 h-4" />
              </Button>

              {/* Recenter Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleRecenterClick}
                className="shadow-lg bg-white"
                title="Recenter map on vehicle"
              >
                <Target className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default LiveMap