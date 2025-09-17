import { GeocodeResult, RouteSegment, RoadType } from '@/types'
import * as polyline from '@mapbox/polyline'

// OpenRouteService API client for geocoding and routing
class OpenRouteService {
  private apiKey: string
  private baseUrl = 'https://api.openrouteservice.org'

  constructor() {
    // Initialize with environment variable only - no hardcoded fallback
    this.apiKey = import.meta.env.VITE_OPENROUTESERVICE_TOKEN || ''

    if (!this.apiKey) {
      console.warn('OpenRouteService API key not configured. Some features will be limited.')
    }
  }

  /**
   * Check if the service is configured with a real API key
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10)
  }

  /**
   * Reverse geocode coordinates to get address using OpenRouteService
   */
  async reverseGeocode(coordinates: [number, number]): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/geocode/reverse`
      const params = new URLSearchParams({
        'point.lon': coordinates[0].toString(),
        'point.lat': coordinates[1].toString(),
        size: '1'
      })

      const headers: HeadersInit = {
        'Accept': 'application/json'
      }

      if (this.apiKey) {
        headers['Authorization'] = this.apiKey
      }

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        throw new Error(`OpenRouteService reverse geocoding failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Return the first result's address
      const feature = data.features?.[0]
      if (feature && feature.properties) {
        return feature.properties.label || feature.properties.name || null
      }

      return null

    } catch (error) {
      console.warn('OpenRouteService reverse geocoding error:', error)
      return null
    }
  }

  /**
   * Geocode an address to get coordinates using OpenRouteService
   */
  async geocodeAddress(address: string): Promise<GeocodeResult[]> {
    try {
      const url = `${this.baseUrl}/geocode/search`
      // Use Authorization header instead of URL parameter for API key
      const params = new URLSearchParams({
        text: address,
        size: '5', // Limit to 5 results
        boundary_country: 'US' // Focus on US addresses
      })

      // Don't log sensitive API keys
      const safeUrl = `${url}?text=${encodeURIComponent(address)}&size=5&boundary_country=US`
      console.log('OpenRouteService geocoding request:', safeUrl)

      const headers: HeadersInit = {
        'Accept': 'application/json'
      }

      if (this.apiKey) {
        headers['Authorization'] = this.apiKey
      }

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        throw new Error(`OpenRouteService geocoding failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('OpenRouteService geocoding response:', data)

      // Transform OpenRouteService format to our GeocodeResult format
      return data.features?.map((feature: any) => ({
        address: feature.properties.label || feature.properties.name,
        coordinates: feature.geometry.coordinates as [number, number], // ORS returns [lng, lat]
        confidence: feature.properties.confidence || 0.5
      })) || []

    } catch (error) {
      console.error('OpenRouteService geocoding error:', error)
      // Return demo data for development
      console.log(`Falling back to demo geocoding for address: "${address}"`)
      const demoResults = this.getDemoGeocodeResults(address)
      console.log('Demo geocoding results:', demoResults)
      return demoResults
    }
  }

  /**
   * Get route between two points using OpenRouteService Directions API
   */
  async getRoute(
    start: [number, number],
    end: [number, number]
  ): Promise<RouteSegment[]> {
    console.log('🛣️ OpenRouteService.getRoute: Starting route calculation', {
      start,
      end,
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length,
      isConfigured: this.isConfigured()
    })

    if (!this.isConfigured()) {
      console.warn('🛣️ OpenRouteService: API key not configured, using demo route')
      return this.getDemoRoute(start, end)
    }

    try {
      const url = `${this.baseUrl}/v2/directions/driving-car`

      // OpenRouteService expects coordinates as [lng, lat]
      const coordinates = [start, end]

      const requestBody = {
        coordinates,
        format: 'json',
        instructions: true,
        geometry: true,
        extra_info: ['roadaccessrestrictions', 'surface']
      }

      console.log('🛣️ OpenRouteService: Making API request', {
        url,
        coordinates,
        hasApiKey: !!this.apiKey,
        requestBodyKeys: Object.keys(requestBody)
      })

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('🛣️ OpenRouteService: API response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🛣️ OpenRouteService: API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        })
        throw new Error(`OpenRouteService routing failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log('🛣️ OpenRouteService: Successfully received route data', {
        hasRoutes: !!data.routes,
        routeCount: data.routes?.length || 0,
        firstRouteKeys: data.routes?.[0] ? Object.keys(data.routes[0]) : [],
        geometryType: typeof data.routes?.[0]?.geometry,
        segmentsCount: data.routes?.[0]?.segments?.length || 0
      })

      const segments = this.convertToRouteSegments(data, start, end)
      console.log('🛣️ OpenRouteService: Route conversion completed', {
        segmentCount: segments.length,
        totalCoordinates: segments.reduce((sum, seg) => sum + (seg.coordinates?.length || 0), 0)
      })

      return segments

    } catch (error) {
      console.error('🛣️ OpenRouteService routing error:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      // Return demo route for development
      console.log('🛣️ OpenRouteService: Falling back to demo route due to API error')
      return this.getDemoRoute(start, end)
    }
  }

  /**
   * Convert OpenRouteService route response to our RouteSegment format
   */
  private convertToRouteSegments(routeData: any, start: [number, number], end: [number, number]): RouteSegment[] {
    console.log('🛠️ OpenRouteService.convertToRouteSegments: Converting route data', {
      hasRoutes: !!routeData.routes,
      routeCount: routeData.routes?.length || 0
    })

    if (!routeData.routes || routeData.routes.length === 0) {
      console.warn('🛠️ OpenRouteService.convertToRouteSegments: No routes in response')
      return []
    }

    const route = routeData.routes[0]
    console.log('🛠️ OpenRouteService.convertToRouteSegments: Processing route', {
      routeKeys: Object.keys(route),
      hasGeometry: !!route.geometry,
      hasSegments: !!route.segments,
      segmentCount: route.segments?.length || 0
    })

    // Decode the full route geometry first
    const fullGeometry = route.geometry ? this.decodePolyline(route.geometry) : null
    console.log('🛠️ OpenRouteService.convertToRouteSegments: Full geometry decoded', {
      hasGeometry: !!fullGeometry,
      totalPoints: fullGeometry?.length || 0,
      firstPoint: fullGeometry?.[0],
      lastPoint: fullGeometry?.[fullGeometry?.length - 1]
    })

    // Use route steps/instructions to create segments
    const instructions = route.segments?.[0]?.steps || []
    console.log('🛠️ OpenRouteService.convertToRouteSegments: Processing instructions', {
      instructionCount: instructions.length,
      sampleInstruction: instructions[0]
    })

    if (instructions.length === 0) {
      // Fallback: create a single segment if no instructions
      console.log('🛠️ OpenRouteService.convertToRouteSegments: No instructions, creating single segment')
      return [{
        coordinates: fullGeometry || [start, end],
        distance: route.summary?.distance || 1000,
        duration: route.summary?.duration || 60,
        roadType: 'local',
        speedLimit: 30
      }]
    }

    const segments: RouteSegment[] = []
    let currentCoordinateIndex = 0

    // Create segments from instructions with proper coordinate mapping
    instructions.forEach((step: any, stepIndex: number) => {
      const roadType = this.determineRoadType(step)

      // Calculate coordinate range for this step based on waypoints
      let stepCoordinates: [number, number][] = []

      if (fullGeometry && fullGeometry.length > 0) {
        // Use step waypoints to determine coordinate range
        const stepStartWaypoint = step.way_points?.[0] || currentCoordinateIndex
        const stepEndWaypoint = step.way_points?.[1] || (currentCoordinateIndex + Math.max(1, Math.floor(fullGeometry.length / instructions.length)))

        // Extract coordinates for this specific step
        stepCoordinates = fullGeometry.slice(stepStartWaypoint, stepEndWaypoint + 1)
        currentCoordinateIndex = stepEndWaypoint

        console.log(`🛠️ OpenRouteService.convertToRouteSegments: Step ${stepIndex + 1} coordinates`, {
          stepIndex,
          wayPointRange: [stepStartWaypoint, stepEndWaypoint],
          coordinateCount: stepCoordinates.length,
          instruction: step.instruction || step.name,
          distance: step.distance,
          roadType
        })
      }

      // Fallback if no coordinates extracted
      if (stepCoordinates.length === 0) {
        // Create interpolated coordinates between start and end
        const progress = stepIndex / instructions.length
        const nextProgress = (stepIndex + 1) / instructions.length

        const stepStart: [number, number] = [
          start[0] + (end[0] - start[0]) * progress,
          start[1] + (end[1] - start[1]) * progress
        ]
        const stepEnd: [number, number] = [
          start[0] + (end[0] - start[0]) * nextProgress,
          start[1] + (end[1] - start[1]) * nextProgress
        ]

        stepCoordinates = [stepStart, stepEnd]
        console.log(`🛠️ OpenRouteService.convertToRouteSegments: Step ${stepIndex + 1} using fallback interpolation`)
      }

      segments.push({
        coordinates: stepCoordinates,
        distance: step.distance || 100,
        duration: step.duration || 10,
        roadType,
        speedLimit: this.getSpeedLimitForRoadType(roadType),
        instruction: step.instruction || step.name
      })
    })

    console.log('🛠️ OpenRouteService.convertToRouteSegments: Conversion completed', {
      segmentCount: segments.length,
      totalCoordinates: segments.reduce((sum, seg) => sum + (seg.coordinates?.length || 0), 0),
      firstSegmentCoords: segments[0]?.coordinates?.length || 0,
      lastSegmentCoords: segments[segments.length - 1]?.coordinates?.length || 0
    })

    return segments
  }

  /**
   * Decode OpenRouteService polyline geometry
   */
  private decodePolyline(encoded: any): [number, number][] {
    console.log('🗺️ OpenRouteService.decodePolyline: Processing geometry', {
      type: typeof encoded,
      isArray: Array.isArray(encoded),
      isString: typeof encoded === 'string',
      length: encoded?.length,
      sample: Array.isArray(encoded) ? encoded.slice(0, 2) : encoded?.slice?.(0, 50)
    })

    try {
      // Case 1: Already an array of coordinates [lng, lat]
      if (Array.isArray(encoded) && encoded.length > 0 && Array.isArray(encoded[0])) {
        console.log('🗺️ OpenRouteService.decodePolyline: Using coordinate array format')
        return encoded as [number, number][]
      }

      // Case 2: Encoded polyline string
      if (typeof encoded === 'string' && encoded.length > 0) {
        console.log('🗺️ OpenRouteService.decodePolyline: Decoding polyline string')
        const decoded = polyline.decode(encoded)
        // Polyline decoder returns [lat, lng], but we need [lng, lat]
        const coordinates = decoded.map(([lat, lng]) => [lng, lat] as [number, number])
        console.log('🗺️ OpenRouteService.decodePolyline: Successfully decoded polyline', {
          originalLength: encoded.length,
          decodedPoints: coordinates.length,
          firstPoint: coordinates[0],
          lastPoint: coordinates[coordinates.length - 1]
        })
        return coordinates
      }

      // Case 3: GeoJSON-style coordinates
      if (encoded?.coordinates && Array.isArray(encoded.coordinates)) {
        console.log('🗺️ OpenRouteService.decodePolyline: Using GeoJSON coordinates')
        return encoded.coordinates as [number, number][]
      }

      console.warn('🗺️ OpenRouteService.decodePolyline: Unknown geometry format, returning empty array')
      return []

    } catch (error) {
      console.error('🗺️ OpenRouteService.decodePolyline: Error decoding geometry:', error)
      return []
    }
  }

  /**
   * Determine road type from OpenRouteService step data
   */
  private determineRoadType(step: any): RoadType {
    const instruction = (step.instruction || step.name || '').toLowerCase()

    // OpenRouteService instruction types (simplified mapping)
    if (instruction.includes('highway') ||
        instruction.includes('freeway') ||
        instruction.includes('interstate')) {
      return 'highway'
    }

    if (instruction.includes('boulevard') ||
        instruction.includes('avenue') ||
        instruction.includes('main')) {
      return 'arterial'
    }

    if (instruction.includes('street') ||
        instruction.includes('drive') ||
        instruction.includes('lane') ||
        instruction.includes('court')) {
      return 'residential'
    }

    if (instruction.includes('parking')) {
      return 'parking'
    }

    return 'local'
  }

  /**
   * Get typical speed limit for road type
   */
  private getSpeedLimitForRoadType(roadType: RoadType): number {
    const speedLimits = {
      highway: 65,
      arterial: 45,
      residential: 25,
      local: 30,
      parking: 5
    }
    return speedLimits[roadType]
  }

  /**
   * Demo geocoding results for development
   */
  private getDemoGeocodeResults(address: string): GeocodeResult[] {
    const demos = [
      {
        address: "1010 Taylor Drive, Allen, TX 75013",
        coordinates: [-96.6706, 33.1031] as [number, number],
        confidence: 0.95
      },
      {
        address: "880 W Euless Blvd, Euless, TX 76040",
        coordinates: [-97.0864, 32.8370] as [number, number],
        confidence: 0.95
      },
      {
        address: "123 Main St, Dallas, TX 75201",
        coordinates: [-96.7970, 32.7767] as [number, number],
        confidence: 0.9
      },
      {
        address: "456 Oak Ave, Fort Worth, TX 76102",
        coordinates: [-97.3201, 32.7555] as [number, number],
        confidence: 0.9
      },
      {
        address: "789 Elm St, Arlington, TX 76010",
        coordinates: [-97.1081, 32.7357] as [number, number],
        confidence: 0.85
      },
      {
        address: "321 Cedar Ln, Plano, TX 75023",
        coordinates: [-96.6989, 33.0198] as [number, number],
        confidence: 0.85
      }
    ]

    // Enhanced matching logic
    const lowerAddress = address.toLowerCase()
    let results = demos.filter(demo => {
      const demoLower = demo.address.toLowerCase()
      return demoLower.includes(lowerAddress) ||
             lowerAddress.includes(demoLower.split(',')[1]?.trim() || '') ||
             this.addressSimilarity(lowerAddress, demoLower) > 0.3
    })

    // If no matches found, return a fallback result
    if (results.length === 0) {
      results = [
        {
          address: address,
          coordinates: [-96.7970 + Math.random() * 0.1 - 0.05, 32.7767 + Math.random() * 0.1 - 0.05] as [number, number],
          confidence: 0.7
        }
      ]
    }

    return results.slice(0, 3)
  }

  /**
   * Calculate similarity between two addresses
   */
  private addressSimilarity(addr1: string, addr2: string): number {
    const words1 = addr1.split(/\s+/)
    const words2 = addr2.split(/\s+/)
    let matches = 0

    words1.forEach(word1 => {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        matches++
      }
    })

    return matches / Math.max(words1.length, words2.length)
  }

  /**
   * Demo route for development - creates realistic route with multiple coordinate points
   */
  private getDemoRoute(
    start: [number, number],
    end: [number, number]
  ): RouteSegment[] {
    console.log('🗺️ OpenRouteService.getDemoRoute: Creating demo route', {
      start: `${start[1].toFixed(6)}, ${start[0].toFixed(6)}`,
      end: `${end[1].toFixed(6)}, ${end[0].toFixed(6)}`
    })

    // Calculate distance and direction
    const latDiff = end[1] - start[1]
    const lngDiff = end[0] - start[0]
    const totalDistance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff)

    // Create multiple intermediate points for smooth animation
    const numSegments = Math.max(3, Math.floor(totalDistance * 100)) // More points for longer routes
    const segments: RouteSegment[] = []

    for (let i = 0; i < numSegments; i++) {
      const segmentStart = i / numSegments
      const segmentEnd = (i + 1) / numSegments

      // Create multiple coordinate points within each segment for smooth interpolation
      const coordinatesPerSegment = 10
      const coordinates: [number, number][] = []

      for (let j = 0; j <= coordinatesPerSegment; j++) {
        const progress = segmentStart + (segmentEnd - segmentStart) * (j / coordinatesPerSegment)

        // Add some realistic curve variation (but not for start/end points)
        const variance = (j === 0 || j === coordinatesPerSegment) ? 0 :
          0.0001 * Math.sin(progress * Math.PI * 4) * (Math.random() - 0.5)

        coordinates.push([
          start[0] + (lngDiff * progress) + variance,
          start[1] + (latDiff * progress) + variance
        ])
      }

      // Ensure first coordinate of first segment is exactly the start point
      if (i === 0 && coordinates.length > 0) {
        coordinates[0] = [start[0], start[1]]
      }

      // Ensure last coordinate of last segment is exactly the end point
      if (i === numSegments - 1 && coordinates.length > 0) {
        coordinates[coordinates.length - 1] = [end[0], end[1]]
      }

      // Determine road type based on segment position
      let roadType: RoadType
      if (i === 0) {
        roadType = 'residential' // Start residential
      } else if (i === numSegments - 1) {
        roadType = 'residential' // End residential
      } else if (i === 1 || i === numSegments - 2) {
        roadType = 'arterial' // Connecting roads
      } else {
        roadType = 'highway' // Main route
      }

      const segmentDistance = (totalDistance * 111320) / numSegments // Convert to approximate meters
      const speedLimit = this.getSpeedLimitForRoadType(roadType)
      const segmentDuration = (segmentDistance / (speedLimit * 0.44704)) // Convert mph to m/s

      const segment = {
        coordinates,
        distance: segmentDistance,
        duration: segmentDuration,
        roadType,
        speedLimit,
        instruction: this.getInstructionForSegment(i, numSegments, roadType)
      }

      segments.push(segment)

      console.log(`🗺️ OpenRouteService.getDemoRoute: Segment ${i + 1}/${numSegments}`, {
        coordinateCount: coordinates.length,
        roadType,
        distance: `${segmentDistance.toFixed(0)}m`,
        speedLimit: `${speedLimit}mph`,
        firstCoord: `${coordinates[0][1].toFixed(6)}, ${coordinates[0][0].toFixed(6)}`,
        lastCoord: `${coordinates[coordinates.length - 1][1].toFixed(6)}, ${coordinates[coordinates.length - 1][0].toFixed(6)}`,
        segmentCoordinatesType: typeof segment.coordinates,
        segmentCoordinatesLength: segment.coordinates?.length
      })
    }

    console.log('🗺️ OpenRouteService.getDemoRoute: Demo route created', {
      totalSegments: segments.length,
      totalCoordinates: segments.reduce((sum, seg) => sum + seg.coordinates.length, 0),
      estimatedDuration: `${Math.round(segments.reduce((sum, seg) => sum + seg.duration, 0))}s`,
      firstSegmentSample: segments[0] ? {
        coordinateCount: segments[0].coordinates.length,
        firstCoord: segments[0].coordinates[0],
        lastCoord: segments[0].coordinates[segments[0].coordinates.length - 1],
        roadType: segments[0].roadType
      } : 'No segments'
    })

    return segments
  }

  /**
   * Generate instruction text for route segment
   */
  private getInstructionForSegment(index: number, total: number, roadType: RoadType): string {
    if (index === 0) {
      return `Start journey on ${roadType} road`
    } else if (index === total - 1) {
      return `Arrive at destination via ${roadType} road`
    } else if (roadType === 'highway') {
      return `Continue on highway`
    } else if (roadType === 'arterial') {
      return `Turn onto arterial road`
    } else {
      return `Continue on ${roadType} road`
    }
  }
}

// Create singleton instance
export const openRouteService = new OpenRouteService()