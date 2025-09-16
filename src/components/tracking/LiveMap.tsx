import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { LocationData, MapComponentProps, DemoTripConfig } from '@/types'

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
  startLocation,
  endLocation,
  isDemoMode = false
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

    const initializeMap = () => {
      // Check if container already has a map
      if (mapRef.current && window.L && !map) {
        // Check if the container already has a map instance
        const container = mapRef.current as any
        if (container._leaflet_id) {
          // Map already exists, clean it up first
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
            keyboard: interactive
          }).setView(center, zoom)

          // Add tile layer
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(mapInstance)

          // Handle map clicks if interactive
          if (interactive && onMapClick) {
            mapInstance.on('click', (e: any) => {
              onMapClick(e.latlng)
            })
          }

          setMap(mapInstance)
          setIsMapReady(true)
        } catch (error) {
          console.error('Failed to initialize map:', error)
        }
      }
    }

    // Check if Leaflet is already loaded
    if (window.L) {
      initializeMap()
    } else {
      // Wait for Leaflet to load
      checkLeafletInterval = setInterval(() => {
        if (window.L) {
          clearInterval(checkLeafletInterval)
          initializeMap()
        }
      }, 100)
    }

    // Cleanup function
    return () => {
      if (checkLeafletInterval) {
        clearInterval(checkLeafletInterval)
      }

      // Properly clean up the map instance
      if (mapInstance) {
        mapInstance.remove()
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
  const createCustomIcon = useCallback((color: string, type: 'start' | 'end' | 'vehicle') => {
    if (!window.L) return null

    if (type === 'vehicle') {
      return window.L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ${isTracking ? 'animation: pulse 2s infinite;' : ''}
          "></div>
          <style>
            @keyframes pulse {
              0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
              70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
              100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
          </style>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }

    const symbol = type === 'start' ? '🟢' : '🔴'
    return window.L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 30px;
          height: 30px;
          background-color: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        ">${symbol}</div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })
  }, [isTracking])

  // Update current location marker
  useEffect(() => {
    console.log('LiveMap useEffect - locations:', locations.length, 'isMapReady:', isMapReady, 'isDemoMode:', isDemoMode)
    if (!map || !isMapReady || locations.length === 0) return

    const currentLocation = locations[locations.length - 1]
    console.log('Creating vehicle marker for location:', currentLocation)
    const latLng = [currentLocation.latitude, currentLocation.longitude]

    // Update map view if tracking
    if (isTracking) {
      map.setView(latLng, Math.max(map.getZoom(), 15))
    }

    // Remove existing marker
    if (marker) {
      map.removeLayer(marker)
    }

    // Create new marker with custom icon for tracking
    const markerColor = isDemoMode ? '#9333ea' : (isTracking ? '#ef4444' : '#3b82f6') // Purple for demo, red for live tracking, blue for static
    const markerIcon = createCustomIcon(markerColor, 'vehicle')

    if (!markerIcon) return

    const newMarker = window.L.marker(latLng, { icon: markerIcon })
      .addTo(map)
      .bindPopup(`
        <div>
          <strong>${isDemoMode ? 'Demo Vehicle' : 'Current Location'}</strong><br>
          Lat: ${currentLocation.latitude.toFixed(6)}<br>
          Lng: ${currentLocation.longitude.toFixed(6)}<br>
          Accuracy: ±${Math.round(currentLocation.accuracy)}m<br>
          ${isDemoMode ? '<span style="color: #9333ea;">● Demo Mode</span>' : ''}
          ${isTracking && !isDemoMode ? '<span style="color: #ef4444;">● Live Tracking</span>' : ''}
        </div>
      `)

    setMarker(newMarker)

    // Notify parent of location update
    if (onLocationUpdate) {
      onLocationUpdate(currentLocation)
    }
  }, [map, isMapReady, locations, isTracking, isDemoMode, createCustomIcon])

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
      const startIcon = createCustomIcon('#22c55e', 'start') // Green for start

      if (startIcon) {
        const newStartMarker = window.L.marker(startLatLng, { icon: startIcon })
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
      const endIcon = createCustomIcon('#ef4444', 'end') // Red for end

      if (endIcon) {
        const newEndMarker = window.L.marker(endLatLng, { icon: endIcon })
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
        </div>
      </CardContent>
    </Card>
  )
}

export default LiveMap