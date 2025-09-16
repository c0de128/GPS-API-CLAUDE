import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'
import { LatLngExpression, Icon, divIcon } from 'leaflet'
import { LocationData, Trip } from '@/types'
import { Card } from '@/components/ui/card'
import { MapPin, Navigation } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface ReplayMapProps {
  trip: Trip
  currentLocation: LocationData | null
  progress: number
}

// Custom icons
const startIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10,8 16,12 10,16"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  className: 'text-green-600'
})

const endIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <rect x="9" y="9" width="6" height="6"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  className: 'text-red-600'
})

const currentIcon = divIcon({
  html: `
    <div class="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/>
      </svg>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  className: 'current-position-marker'
})

// Component to handle map updates
const MapUpdater: React.FC<{
  route: LocationData[]
  currentLocation: LocationData | null
}> = ({ route, currentLocation }) => {
  const map = useMap()

  useEffect(() => {
    if (route.length > 0) {
      if (route.length === 1) {
        map.setView([route[0].latitude, route[0].longitude], 15)
      } else if (route.length > 1) {
        const bounds = route.map(point => [point.latitude, point.longitude] as LatLngExpression)
        map.fitBounds(bounds as any, { padding: [20, 20] })
      }
    }
  }, [map, route])

  useEffect(() => {
    if (currentLocation) {
      map.setView([currentLocation.latitude, currentLocation.longitude], map.getZoom(), {
        animate: true,
        duration: 0.5
      })
    }
  }, [map, currentLocation])

  return null
}

const ReplayMap: React.FC<ReplayMapProps> = ({ trip, currentLocation, progress }) => {
  const route = trip.route || []

  if (route.length === 0) {
    return (
      <Card className="h-96 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Route Data</h3>
          <p className="text-muted-foreground">This trip doesn't have any recorded route points.</p>
        </div>
      </Card>
    )
  }

  // Create the route line with different colors for completed vs remaining
  const currentIndex = Math.floor((progress / 100) * (route.length - 1))
  const completedRoute = route.slice(0, currentIndex + 1)
  const remainingRoute = route.slice(currentIndex)

  const completedPath: LatLngExpression[] = completedRoute.map(point => [point.latitude, point.longitude])
  const remainingPath: LatLngExpression[] = remainingRoute.map(point => [point.latitude, point.longitude])

  const startPoint = route[0]
  const endPoint = route[route.length - 1]

  return (
    <Card className="overflow-hidden">
      <div className="h-96 relative">
        <MapContainer
          center={[startPoint.latitude, startPoint.longitude]}
          zoom={13}
          className="h-full w-full"
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Map updater */}
          <MapUpdater route={route} currentLocation={currentLocation} />

          {/* Completed route (traveled) */}
          {completedPath.length > 1 && (
            <Polyline
              positions={completedPath}
              color="#22c55e"
              weight={4}
              opacity={0.8}
            />
          )}

          {/* Remaining route (not yet traveled) */}
          {remainingPath.length > 1 && (
            <Polyline
              positions={remainingPath}
              color="#94a3b8"
              weight={3}
              opacity={0.6}
              dashArray="5, 5"
            />
          )}

          {/* Start marker */}
          <Marker
            position={[startPoint.latitude, startPoint.longitude]}
            icon={startIcon}
          />

          {/* End marker */}
          <Marker
            position={[endPoint.latitude, endPoint.longitude]}
            icon={endIcon}
          />

          {/* Current position marker */}
          {currentLocation && (
            <Marker
              position={[currentLocation.latitude, currentLocation.longitude]}
              icon={currentIcon}
            />
          )}

          {/* Waypoints */}
          {trip.waypoints?.map((waypoint) => (
            <Marker
              key={waypoint.id}
              position={[waypoint.latitude, waypoint.longitude]}
              icon={divIcon({
                html: `
                  <div class="w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow-md"></div>
                `,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
                className: 'waypoint-marker'
              })}
            />
          ))}
        </MapContainer>

        {/* Overlay with trip info */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 text-sm">
            <Navigation className="w-4 h-4 text-blue-600" />
            <span className="font-medium">Route Replay</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {route.length} points • {progress.toFixed(1)}% complete
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-green-500 rounded"></div>
              <span>Traveled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-gray-400 rounded" style={{ backgroundImage: 'repeating-linear-gradient(to right, #94a3b8 0, #94a3b8 3px, transparent 3px, transparent 6px)' }}></div>
              <span>Remaining</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              <span>Start</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
              <span>End</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span>Current</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default ReplayMap