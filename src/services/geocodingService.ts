import { LocationData, GeocodeResult } from '@/types'
import { openRouteService } from './openRouteService'

export interface AddressCache {
  [key: string]: string
}

export class GeocodingService {
  private addressCache: AddressCache = {}
  private reverseCache: AddressCache = {}

  /**
   * Convert coordinates to human-readable address
   */
  async reverseGeocode(location: LocationData): Promise<string> {
    const cacheKey = `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`

    // Check cache first
    if (this.reverseCache[cacheKey]) {
      return this.reverseCache[cacheKey]
    }

    try {
      // Try to use OpenRouteService if configured
      if (openRouteService.isConfigured()) {
        const address = await openRouteService.reverseGeocode([location.longitude, location.latitude])
        if (address) {
          this.reverseCache[cacheKey] = address
          return address
        }
      }

      // Fallback to approximate address based on coordinates
      const approximateAddress = this.generateApproximateAddress(location)
      this.reverseCache[cacheKey] = approximateAddress
      return approximateAddress

    } catch (error) {
      console.warn('Reverse geocoding failed:', error)
      const approximateAddress = this.generateApproximateAddress(location)
      this.reverseCache[cacheKey] = approximateAddress
      return approximateAddress
    }
  }

  /**
   * Convert address to coordinates
   */
  async geocodeAddress(address: string): Promise<GeocodeResult[]> {
    // const cacheKey = address.toLowerCase().trim() // TODO: Implement caching

    try {
      // Use OpenRouteService if configured
      if (openRouteService.isConfigured()) {
        return await openRouteService.geocodeAddress(address)
      }

      // Fallback to demo data
      return this.generateDemoGeocode(address)

    } catch (error) {
      console.warn('Geocoding failed:', error)
      return this.generateDemoGeocode(address)
    }
  }

  /**
   * Get default start address from demo configuration
   */
  getDefaultStartAddress(): string {
    return '1010 Taylor Drive, Allen Texas 75013'
  }

  /**
   * Get default end address from demo configuration
   */
  getDefaultEndAddress(): string {
    return '880 W Euless Blvd, Euless, TX 76040'
  }

  /**
   * Resolve trip addresses with fallbacks
   */
  async resolveTripAddresses(startLocation?: LocationData, endLocation?: LocationData): Promise<{
    startAddress: string
    endAddress: string
  }> {
    let startAddress = ''
    let endAddress = ''

    try {
      // Resolve start address
      if (startLocation) {
        startAddress = await this.reverseGeocode(startLocation)
      } else {
        startAddress = this.getDefaultStartAddress()
      }

      // Resolve end address
      if (endLocation) {
        endAddress = await this.reverseGeocode(endLocation)
      } else {
        endAddress = this.getDefaultEndAddress()
      }

    } catch (error) {
      console.warn('Address resolution failed, using defaults:', error)
      startAddress = startLocation ? this.generateApproximateAddress(startLocation) : this.getDefaultStartAddress()
      endAddress = endLocation ? this.generateApproximateAddress(endLocation) : this.getDefaultEndAddress()
    }

    return { startAddress, endAddress }
  }

  /**
   * Calculate location metadata from route points
   */
  calculateLocationMetadata(route: LocationData[]) {
    if (route.length === 0) {
      return undefined
    }

    const accuracies = route.map(point => point.accuracy).filter(acc => acc !== undefined)
    const altitudes = route.map(point => point.altitude).filter(alt => alt !== undefined)
    const headings = route.map(point => point.heading).filter(heading => heading !== undefined)

    const metadata: any = {}

    // Accuracy data
    if (accuracies.length > 0) {
      metadata.averageAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length
      metadata.minAccuracy = Math.min(...accuracies)
      metadata.maxAccuracy = Math.max(...accuracies)
    }

    // Altitude data
    if (altitudes.length > 0) {
      metadata.altitudeData = {
        min: Math.min(...altitudes),
        max: Math.max(...altitudes),
        average: altitudes.reduce((sum, alt) => sum + alt, 0) / altitudes.length
      }
    }

    // Heading data
    if (headings.length > 0) {
      metadata.headingData = {
        initialHeading: headings[0],
        finalHeading: headings[headings.length - 1]
      }
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined
  }

  /**
   * Generate approximate address from coordinates
   */
  private generateApproximateAddress(location: LocationData): string {
    const lat = location.latitude.toFixed(4)
    const lng = location.longitude.toFixed(4)

    // Determine general region based on coordinates
    let region = 'Unknown Location'

    // Texas coordinates (rough boundaries)
    if (location.latitude >= 25.8 && location.latitude <= 36.5 &&
        location.longitude >= -106.6 && location.longitude <= -93.5) {

      // Dallas-Fort Worth area
      if (location.latitude >= 32.3 && location.latitude <= 33.3 &&
          location.longitude >= -97.9 && location.longitude <= -96.3) {
        region = 'Dallas-Fort Worth Area, TX'
      } else {
        region = 'Texas'
      }
    }

    return `${lat}, ${lng} (${region})`
  }

  /**
   * Generate demo geocoding results for fallback
   */
  private generateDemoGeocode(address: string): GeocodeResult[] {
    const lowerAddress = address.toLowerCase()

    // Demo locations in DFW area
    const demoLocations: GeocodeResult[] = [
      {
        address: 'Allen, TX',
        coordinates: [-96.6705, 33.1031],
        confidence: 0.8
      },
      {
        address: 'Euless, TX',
        coordinates: [-97.0819, 32.8371],
        confidence: 0.8
      },
      {
        address: 'Dallas, TX',
        coordinates: [-96.7970, 32.7767],
        confidence: 0.9
      },
      {
        address: 'Fort Worth, TX',
        coordinates: [-97.3201, 32.7555],
        confidence: 0.9
      },
      {
        address: 'Plano, TX',
        coordinates: [-96.6989, 33.0198],
        confidence: 0.8
      }
    ]

    // Return matching demo locations
    const matches = demoLocations.filter(location =>
      location.address.toLowerCase().includes(lowerAddress) ||
      lowerAddress.includes(location.address.toLowerCase().split(',')[0])
    )

    if (matches.length > 0) {
      return matches
    }

    // Default to Allen, TX if no matches
    return [demoLocations[0]]
  }

  /**
   * Clear address cache
   */
  clearCache(): void {
    this.addressCache = {}
    this.reverseCache = {}
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { addresses: number; reverseAddresses: number } {
    return {
      addresses: Object.keys(this.addressCache).length,
      reverseAddresses: Object.keys(this.reverseCache).length
    }
  }
}

// Create singleton instance
export const geocodingService = new GeocodingService()