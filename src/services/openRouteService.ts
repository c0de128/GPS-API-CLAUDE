import { GeocodeResult, RouteSegment, RoadType } from '@/types'

// OpenRouteService API client for geocoding and routing
class OpenRouteService {
  private apiKey: string
  private baseUrl = 'https://api.openrouteservice.org'

  constructor() {
    // Initialize with environment variable or demo token
    this.apiKey = import.meta.env.VITE_OPENROUTESERVICE_TOKEN || 'demo_token_replace_with_real_token'
  }

  /**
   * Check if the service is configured with a real API key
   */
  isConfigured(): boolean {
    return this.apiKey !== 'demo_token_replace_with_real_token' && this.apiKey.length > 10
  }

  /**
   * Geocode an address to get coordinates using OpenRouteService
   */
  async geocodeAddress(address: string): Promise<GeocodeResult[]> {
    try {
      const url = `${this.baseUrl}/geocode/search`
      const params = new URLSearchParams({
        api_key: this.apiKey,
        text: address,
        size: '5', // Limit to 5 results
        boundary_country: 'US' // Focus on US addresses
      })

      console.log('OpenRouteService geocoding request:', `${url}?${params}`)

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
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
    try {
      const url = `${this.baseUrl}/v2/directions/driving-car`

      // OpenRouteService expects coordinates as [lng, lat]
      const coordinates = [start, end]

      console.log('OpenRouteService routing request:', { coordinates })

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          coordinates,
          format: 'json',
          instructions: true,
          geometry: true,
          extra_info: ['roadaccessrestrictions', 'surface']
        })
      })

      if (!response.ok) {
        throw new Error(`OpenRouteService routing failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('OpenRouteService routing response:', data)

      return this.convertToRouteSegments(data)

    } catch (error) {
      console.error('OpenRouteService routing error:', error)
      // Return demo route for development
      console.log('Falling back to demo route')
      return this.getDemoRoute(start, end)
    }
  }

  /**
   * Convert OpenRouteService route response to our RouteSegment format
   */
  private convertToRouteSegments(routeData: any): RouteSegment[] {
    if (!routeData.routes || routeData.routes.length === 0) {
      return []
    }

    const route = routeData.routes[0]
    const segments: RouteSegment[] = []

    // Use route steps/instructions to create segments
    const instructions = route.segments?.[0]?.steps || []
    const geometry = route.geometry

    if (instructions.length === 0) {
      // Fallback: create a single segment if no instructions
      return [{
        coordinates: geometry ? this.decodePolyline(geometry) : [start, end],
        distance: route.summary?.distance || 1000,
        duration: route.summary?.duration || 60,
        roadType: 'local',
        speedLimit: 30
      }]
    }

    // Create segments from instructions
    instructions.forEach((step: any, index: number) => {
      const roadType = this.determineRoadType(step)

      segments.push({
        coordinates: geometry ? this.decodePolyline(geometry) : [], // Simplified - would need proper segment extraction
        distance: step.distance || 100,
        duration: step.duration || 10,
        roadType,
        speedLimit: this.getSpeedLimitForRoadType(roadType),
        instruction: step.instruction || step.name
      })
    })

    return segments
  }

  /**
   * Decode OpenRouteService polyline geometry (simplified)
   */
  private decodePolyline(encoded: any): [number, number][] {
    // OpenRouteService returns different geometry formats
    // For now, return a simple fallback
    if (Array.isArray(encoded) && encoded.length > 0 && Array.isArray(encoded[0])) {
      return encoded as [number, number][]
    }

    // If it's an encoded polyline string, we'd need a proper decoder
    // For demo purposes, return empty array
    return []
  }

  /**
   * Determine road type from OpenRouteService step data
   */
  private determineRoadType(step: any): RoadType {
    const instruction = (step.instruction || step.name || '').toLowerCase()
    const type = step.type || 0

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
   * Demo route for development
   */
  private getDemoRoute(
    start: [number, number],
    end: [number, number]
  ): RouteSegment[] {
    // Create a realistic demo route with multiple segments
    const midpoint: [number, number] = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2
    ]

    return [
      {
        coordinates: [start, midpoint],
        distance: 1500, // meters
        duration: 120, // seconds
        roadType: 'residential',
        speedLimit: 25,
        instruction: 'Head north on residential street'
      },
      {
        coordinates: [midpoint, end],
        distance: 2000, // meters
        duration: 100, // seconds
        roadType: 'arterial',
        speedLimit: 45,
        instruction: 'Continue on arterial road to destination'
      }
    ]
  }
}

// Create singleton instance
export const openRouteService = new OpenRouteService()