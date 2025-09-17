// Core location data interface
export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
  altitude?: number
  heading?: number
  speed?: number // From GPS if available
}

// Speed data for tracking
export interface SpeedData {
  speed: number // In m/s
  timestamp: number
  location: LocationData
  accuracy: number
}

// Waypoint interface
export interface Waypoint extends LocationData {
  id: string
  tripId: string
  speed?: number
  note?: string
  type: 'auto' | 'manual'
}

// Trip status
export type TripStatus = 'planning' | 'active' | 'paused' | 'completed'

// Trip type - distinguishes between real GPS trips and demo simulations
export type TripType = 'real' | 'demo'

// Road types for speed calculations
export type RoadType = 'highway' | 'arterial' | 'residential' | 'local' | 'parking'

// Route segment with road information
export interface RouteSegment {
  coordinates: [number, number][] // [longitude, latitude] pairs
  distance: number // in meters
  duration: number // in seconds
  roadType: RoadType
  speedLimit: number // in mph
  name?: string
  instruction?: string
}

// Demo trip configuration
export interface DemoTripConfig {
  startAddress: string
  endAddress: string
  startCoordinates: [number, number] // [longitude, latitude]
  endCoordinates: [number, number]
  route: RouteSegment[]
  totalDistance: number
  estimatedDuration: number
  speedMultiplier: number // 1x, 2x, 5x for simulation speed
}

// Main trip interface
export interface Trip {
  id: string
  name: string
  type: TripType
  status: TripStatus
  startTime: number
  endTime?: number
  startLocation?: LocationData
  endLocation?: LocationData
  startAddress?: string // Human-readable start address
  endAddress?: string   // Human-readable end address
  route: LocationData[]
  waypoints: Waypoint[]
  speeds: SpeedData[]
  totalDistance: number
  averageSpeed: number
  maxSpeed: number
  notes: string
  createdAt: number
  updatedAt: number
  demoConfig?: DemoTripConfig // Only present for demo trips
  // Enhanced geolocation metadata
  routeSegments?: RouteSegment[] // Detailed route information for demo trips
  locationMetadata?: {
    averageAccuracy: number
    minAccuracy: number
    maxAccuracy: number
    altitudeData?: {
      min: number
      max: number
      average: number
    }
    headingData?: {
      initialHeading: number
      finalHeading: number
    }
  }
}

// Trip statistics
export interface TripStatistics {
  totalTrips: number
  totalDistance: number
  totalTime: number
  averageSpeed: number
  maxSpeed: number
  longestTrip: number
  shortestTrip: number
}

// User settings
export interface UserSettings {
  speedUnit: 'mph' | 'kmh'
  distanceUnit: 'km' | 'mi'
  theme: 'light' | 'dark' | 'system'
  autoSaveInterval: number // in seconds
  gpsAccuracy: 'high' | 'medium' | 'low'
  mapStyle: 'default' | 'satellite'
}

// GPS tracking state
export interface GPSState {
  isTracking: boolean
  currentLocation: LocationData | null
  error: string | null
  permission: 'granted' | 'denied' | 'prompt' | 'unknown'
}

// Route replay state
export interface ReplayState {
  isPlaying: boolean
  currentIndex: number
  speed: number // Playback speed multiplier
  route: LocationData[]
  progress: number // 0-100%
}

// Demo simulation state
export interface DemoSimulationState {
  isActive: boolean
  currentSegmentIndex: number
  positionInSegment: number // 0-1 progress through current segment
  currentSpeed: number // in mph
  targetSpeed: number // target speed for current road type
  lastUpdateTime: number
  speedMultiplier: number
  isPaused: boolean
}

// Geocoding result
export interface GeocodeResult {
  address: string
  coordinates: [number, number] // [longitude, latitude]
  confidence: number
}

// Export format types
export type ExportFormat = 'json' | 'gpx' | 'kml' | 'csv'

// Export options
export interface ExportOptions {
  format: ExportFormat
  includeSpeed: boolean
  includeWaypoints: boolean
  includeNotes: boolean
  tripIds: string[]
  dateRange?: {
    start: Date
    end: Date
  }
}

// FAQ item interface
export interface FAQItem {
  question: string
  answer: string
}

// Navigation routes
export type Route = 'home' | 'tracking' | 'trips' | 'trip-details' | 'replay' | 'settings'

// Component props types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

// Map component props
export interface MapComponentProps extends BaseComponentProps {
  center?: [number, number]
  zoom?: number
  locations?: LocationData[]
  showRoute?: boolean
  interactive?: boolean
  onLocationUpdate?: (location: LocationData) => void
  // Demo trip support
  demoConfig?: DemoTripConfig
  startLocation?: LocationData
  endLocation?: LocationData
  isDemoMode?: boolean
}

// Speed indicator props
export interface SpeedIndicatorProps extends BaseComponentProps {
  currentSpeed: number
  averageSpeed: number
  maxSpeed: number
  unit: 'mph' | 'kmh'
}

// Trip card props
export interface TripCardProps extends BaseComponentProps {
  trip: Trip
  onSelect?: (trip: Trip) => void
  onDelete?: (tripId: string) => void
  onReplay?: (trip: Trip) => void
  showActions?: boolean
}