# API Documentation

## Overview

The GPS Trip Tracker uses browser-based APIs and services for location tracking, data storage, and mapping functionality. This document covers both the current implementation and planned API integrations.

## Browser APIs

### Geolocation API

#### Current Implementation

The app uses the browser's native Geolocation API for real-time location tracking.

**Basic Usage**:
```typescript
interface GeolocationOptions {
  enableHighAccuracy: boolean
  timeout: number
  maximumAge: number
}

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

// Start location tracking
const watchId = navigator.geolocation.watchPosition(
  (position: GeolocationPosition) => {
    const location: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    }
    handleLocationUpdate(location)
  },
  (error: GeolocationPositionError) => {
    handleLocationError(error)
  },
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 1000
  }
)

// Stop location tracking
navigator.geolocation.clearWatch(watchId)
```

**Geolocation Options Explained**:

| Option | Current Value | Description | Impact |
|--------|---------------|-------------|--------|
| `enableHighAccuracy` | `true` | Use GPS instead of network/WiFi | Higher accuracy, more battery usage |
| `timeout` | `10000` | Max time to wait for location (ms) | Prevents hanging, may miss slow GPS |
| `maximumAge` | `1000` | Accept cached locations up to 1s old | Reduces API calls, may use stale data |

**Error Handling**:
```typescript
enum GeolocationError {
  PERMISSION_DENIED = 1,    // User denied location access
  POSITION_UNAVAILABLE = 2, // GPS unavailable
  TIMEOUT = 3               // Request timed out
}

const handleLocationError = (error: GeolocationPositionError) => {
  switch (error.code) {
    case GeolocationError.PERMISSION_DENIED:
      showError("Location access denied. Please enable location permissions.")
      break
    case GeolocationError.POSITION_UNAVAILABLE:
      showError("GPS unavailable. Check device settings.")
      break
    case GeolocationError.TIMEOUT:
      showError("Location request timed out. Trying again...")
      break
    default:
      showError("Unknown location error occurred.")
  }
}
```

#### Advanced Geolocation Features (Planned)

**Speed Calculation**:
```typescript
interface ExtendedLocationData extends LocationData {
  speed?: number      // m/s (if available from GPS)
  heading?: number    // Degrees from north
  altitude?: number   // Meters above sea level
}

class GPSService {
  private previousLocation: LocationData | null = null

  calculateSpeed(current: LocationData, previous: LocationData): number {
    // Haversine formula for distance calculation
    const R = 6371e3 // Earth's radius in meters
    const φ1 = previous.latitude * Math.PI/180
    const φ2 = current.latitude * Math.PI/180
    const Δφ = (current.latitude - previous.latitude) * Math.PI/180
    const Δλ = (current.longitude - previous.longitude) * Math.PI/180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c // Distance in meters

    const timeDiff = (current.timestamp - previous.timestamp) / 1000 // seconds
    return distance / timeDiff // m/s
  }

  convertSpeed(mps: number, unit: 'mph' | 'kmh'): number {
    return unit === 'mph' ? mps * 2.237 : mps * 3.6
  }
}
```

**Background Tracking** (Service Worker):
```typescript
// Service Worker for background location tracking
self.addEventListener('message', event => {
  if (event.data.type === 'START_BACKGROUND_TRACKING') {
    startBackgroundLocationTracking()
  }
})

const startBackgroundLocationTracking = () => {
  navigator.geolocation.watchPosition(
    position => {
      // Store location in IndexedDB
      storeLocationInBackground(position)
    },
    error => {
      console.error('Background location error:', error)
    },
    { enableHighAccuracy: true }
  )
}
```

### Storage APIs

#### IndexedDB (Planned Implementation)

**Database Schema**:
```typescript
interface TripDB {
  version: 1
  stores: {
    trips: Trip[]
    waypoints: Waypoint[]
    settings: UserSettings[]
    exports: ExportRecord[]
  }
}

class StorageService {
  private db: IDBDatabase | null = null

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('GPSTripTracker', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create trips store
        const tripStore = db.createObjectStore('trips', { keyPath: 'id' })
        tripStore.createIndex('name', 'name', { unique: false })
        tripStore.createIndex('startTime', 'startTime', { unique: false })
        tripStore.createIndex('distance', 'distance', { unique: false })

        // Create waypoints store
        const waypointStore = db.createObjectStore('waypoints', { keyPath: 'id' })
        waypointStore.createIndex('tripId', 'tripId', { unique: false })
        waypointStore.createIndex('timestamp', 'timestamp', { unique: false })

        // Create settings store
        db.createObjectStore('settings', { keyPath: 'key' })

        // Create exports store
        const exportStore = db.createObjectStore('exports', { keyPath: 'id' })
        exportStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    })
  }

  async saveTrip(trip: Trip): Promise<void> {
    const transaction = this.db!.transaction(['trips'], 'readwrite')
    const store = transaction.objectStore('trips')
    await store.put(trip)
  }

  async loadTrips(): Promise<Trip[]> {
    const transaction = this.db!.transaction(['trips'], 'readonly')
    const store = transaction.objectStore('trips')
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async searchTrips(query: string): Promise<Trip[]> {
    const trips = await this.loadTrips()
    return trips.filter(trip =>
      trip.name.toLowerCase().includes(query.toLowerCase()) ||
      trip.notes.toLowerCase().includes(query.toLowerCase())
    )
  }

  async getStatistics(): Promise<TripStatistics> {
    const trips = await this.loadTrips()
    return {
      totalTrips: trips.length,
      totalDistance: trips.reduce((sum, trip) => sum + trip.distance, 0),
      totalTime: trips.reduce((sum, trip) => sum + (trip.endTime - trip.startTime), 0),
      averageSpeed: trips.reduce((sum, trip) => sum + trip.averageSpeed, 0) / trips.length,
      maxSpeed: Math.max(...trips.map(trip => trip.maxSpeed))
    }
  }
}
```

#### localStorage (Current Fallback)

```typescript
class LocalStorageService {
  private readonly STORAGE_KEY = 'gps-trip-tracker'

  saveData<T>(key: string, data: T): void {
    try {
      const storage = this.getStorage()
      storage[key] = data
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storage))
    } catch (error) {
      console.error('localStorage save failed:', error)
    }
  }

  loadData<T>(key: string, defaultValue: T): T {
    try {
      const storage = this.getStorage()
      return storage[key] ?? defaultValue
    } catch (error) {
      console.error('localStorage load failed:', error)
      return defaultValue
    }
  }

  private getStorage(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  }

  clearData(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  getStorageSize(): number {
    const data = localStorage.getItem(this.STORAGE_KEY)
    return data ? new Blob([data]).size : 0
  }
}
```

## External APIs

### Mapping Services

#### Leaflet + OpenStreetMap (Current)

**Map Initialization**:
```typescript
interface MapConfig {
  center: [number, number]
  zoom: number
  maxZoom: number
  attribution: string
}

class MapService {
  private map: L.Map | null = null
  private marker: L.Marker | null = null
  private route: L.Polyline | null = null

  initialize(elementId: string, config: MapConfig): Promise<void> {
    return new Promise((resolve) => {
      this.map = L.map(elementId).setView(config.center, config.zoom)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: config.maxZoom,
        attribution: config.attribution
      }).addTo(this.map)

      this.map.whenReady(() => resolve())
    })
  }

  updateLocation(location: LocationData): void {
    if (!this.map) return

    const latLng: L.LatLngExpression = [location.latitude, location.longitude]

    // Update map center
    this.map.setView(latLng, 15)

    // Update or create marker
    if (this.marker) {
      this.marker.setLatLng(latLng)
    } else {
      this.marker = L.marker(latLng)
        .addTo(this.map)
        .bindPopup(`Accuracy: ±${Math.round(location.accuracy)}m`)
    }
  }

  addRoutePoint(location: LocationData): void {
    if (!this.map) return

    const latLng: L.LatLngExpression = [location.latitude, location.longitude]

    if (this.route) {
      const latLngs = this.route.getLatLngs() as L.LatLng[]
      latLngs.push(L.latLng(latLng))
      this.route.setLatLngs(latLngs)
    } else {
      this.route = L.polyline([latLng], { color: 'red', weight: 3 })
        .addTo(this.map)
    }
  }

  clearRoute(): void {
    if (this.route) {
      this.map?.removeLayer(this.route)
      this.route = null
    }
  }

  fitBounds(locations: LocationData[]): void {
    if (!this.map || locations.length === 0) return

    const latLngs = locations.map(loc => [loc.latitude, loc.longitude] as L.LatLngExpression)
    const bounds = L.latLngBounds(latLngs)
    this.map.fitBounds(bounds, { padding: [20, 20] })
  }
}
```

#### Mapbox Integration (Future Alternative)

```typescript
interface MapboxConfig {
  accessToken: string
  style: string
  center: [number, number]
  zoom: number
}

class MapboxService {
  private map: mapboxgl.Map | null = null

  async initialize(elementId: string, config: MapboxConfig): Promise<void> {
    mapboxgl.accessToken = config.accessToken

    this.map = new mapboxgl.Map({
      container: elementId,
      style: config.style,
      center: config.center,
      zoom: config.zoom
    })

    return new Promise((resolve) => {
      this.map!.on('load', () => resolve())
    })
  }

  updateLocation(location: LocationData): void {
    if (!this.map) return

    this.map.setCenter([location.longitude, location.latitude])

    // Add or update marker
    const marker = new mapboxgl.Marker()
      .setLngLat([location.longitude, location.latitude])
      .addTo(this.map)
  }

  addRoute(coordinates: number[][]): void {
    if (!this.map) return

    this.map.addSource('route', {
      'type': 'geojson',
      'data': {
        'type': 'Feature',
        'properties': {},
        'geometry': {
          'type': 'LineString',
          'coordinates': coordinates
        }
      }
    })

    this.map.addLayer({
      'id': 'route',
      'type': 'line',
      'source': 'route',
      'layout': {
        'line-join': 'round',
        'line-cap': 'round'
      },
      'paint': {
        'line-color': '#888',
        'line-width': 8
      }
    })
  }
}
```

## Data Export APIs

### Export Formats

#### JSON Export
```typescript
interface JSONExport {
  version: string
  exportDate: string
  trips: Trip[]
  statistics: TripStatistics
}

class JSONExportService {
  export(trips: Trip[]): string {
    const exportData: JSONExport = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      trips: trips,
      statistics: this.calculateStatistics(trips)
    }

    return JSON.stringify(exportData, null, 2)
  }

  import(jsonData: string): Trip[] {
    try {
      const data: JSONExport = JSON.parse(jsonData)
      return data.trips
    } catch (error) {
      throw new Error('Invalid JSON format')
    }
  }
}
```

#### GPX Export
```typescript
class GPXExportService {
  export(trips: Trip[]): string {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPS Trip Tracker">
${trips.map(trip => this.tripToGPX(trip)).join('\n')}
</gpx>`
    return gpx
  }

  private tripToGPX(trip: Trip): string {
    const trackPoints = trip.route.map(point => `
    <trkpt lat="${point.latitude}" lon="${point.longitude}">
      <time>${new Date(point.timestamp).toISOString()}</time>
    </trkpt>`).join('')

    return `
  <trk>
    <name>${trip.name}</name>
    <trkseg>
      ${trackPoints}
    </trkseg>
  </trk>`
  }
}
```

## Error Handling

### API Error Types
```typescript
enum APIErrorType {
  GEOLOCATION_ERROR = 'GEOLOCATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  MAP_ERROR = 'MAP_ERROR',
  EXPORT_ERROR = 'EXPORT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

interface APIError {
  type: APIErrorType
  message: string
  code?: number
  details?: any
}

class ErrorHandler {
  static handle(error: APIError): void {
    console.error(`[${error.type}] ${error.message}`, error.details)

    switch (error.type) {
      case APIErrorType.GEOLOCATION_ERROR:
        this.handleGeolocationError(error)
        break
      case APIErrorType.STORAGE_ERROR:
        this.handleStorageError(error)
        break
      case APIErrorType.MAP_ERROR:
        this.handleMapError(error)
        break
      default:
        this.showGenericError(error.message)
    }
  }

  private static handleGeolocationError(error: APIError): void {
    // Show user-friendly GPS error messages
  }

  private static handleStorageError(error: APIError): void {
    // Handle storage quota or corruption issues
  }

  private static handleMapError(error: APIError): void {
    // Handle map loading or tile server issues
  }
}
```

## Performance Considerations

### Rate Limiting
```typescript
class RateLimiter {
  private lastCall: number = 0
  private minInterval: number

  constructor(minIntervalMs: number) {
    this.minInterval = minIntervalMs
  }

  shouldProceed(): boolean {
    const now = Date.now()
    if (now - this.lastCall >= this.minInterval) {
      this.lastCall = now
      return true
    }
    return false
  }
}

// Usage for GPS updates
const gpsRateLimiter = new RateLimiter(1000) // Max 1 update per second

const handleLocationUpdate = (location: LocationData) => {
  if (gpsRateLimiter.shouldProceed()) {
    updateUI(location)
  }
}
```

### Memory Management
```typescript
class MemoryManager {
  private readonly MAX_ROUTE_POINTS = 10000
  private readonly COMPRESSION_THRESHOLD = 5000

  compressRoute(route: LocationData[]): LocationData[] {
    if (route.length <= this.COMPRESSION_THRESHOLD) {
      return route
    }

    // Douglas-Peucker algorithm for route simplification
    return this.simplifyRoute(route, 0.0001) // 11m tolerance
  }

  private simplifyRoute(points: LocationData[], tolerance: number): LocationData[] {
    // Implementation of Douglas-Peucker algorithm
    // Reduces number of points while maintaining route accuracy
  }
}
```

## Future API Integrations

### Planned Integrations

1. **Google Maps API** - Alternative mapping service
2. **Weather APIs** - Weather conditions during trips
3. **Elevation APIs** - Elevation profiles for routes
4. **Fitness APIs** - Integration with health/fitness platforms
5. **Social APIs** - Trip sharing capabilities

### API Security

```typescript
// API key management
class APIKeyManager {
  private keys: Map<string, string> = new Map()

  setKey(service: string, key: string): void {
    this.keys.set(service, key)
  }

  getKey(service: string): string | null {
    return this.keys.get(service) || null
  }

  // Never log or expose API keys
  private sanitizeForLogging(data: any): any {
    return { ...data, apiKey: '[REDACTED]' }
  }
}
```