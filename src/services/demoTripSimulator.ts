import { LocationData, RouteSegment, RoadType, DemoSimulationState } from '@/types'

export class DemoTripSimulator {
  private state: DemoSimulationState
  private route: RouteSegment[]
  private onLocationUpdate: (location: LocationData) => void
  private animationFrame?: number
  private lastPosition?: LocationData
  private actualStartCoordinates?: [number, number]
  private actualEndCoordinates?: [number, number]
  private lastLocationSentTime: number = 0
  private locationUpdateInterval: number = 2000 // Send location updates every 2 seconds

  constructor(
    route: RouteSegment[],
    onLocationUpdate: (location: LocationData) => void,
    speedMultiplier: number = 1,
    startCoordinates?: [number, number],
    endCoordinates?: [number, number]
  ) {
    console.log('🚗 DemoTripSimulator: Constructor called', {
      routeSegments: route.length,
      speedMultiplier,
      startCoordinates,
      endCoordinates
    })

    // Store actual coordinates to preserve them during validation
    this.actualStartCoordinates = startCoordinates
    this.actualEndCoordinates = endCoordinates

    console.log('📍 DemoTripSimulator: COORDINATE FLOW - Received coordinates:', {
      actualStartCoordinates: this.actualStartCoordinates,
      actualEndCoordinates: this.actualEndCoordinates
    })

    // Validate route data
    this.validateRoute(route)

    this.route = route
    this.onLocationUpdate = onLocationUpdate
    this.state = {
      isActive: false,
      currentSegmentIndex: 0,
      positionInSegment: 0,
      currentSpeed: 0,
      targetSpeed: this.getSpeedForRoadType(route[0]?.roadType || 'residential', route[0]),
      lastUpdateTime: Date.now(),
      speedMultiplier,
      isPaused: false
    }

    console.log('🚗 DemoTripSimulator: Constructor completed', {
      initialTargetSpeed: this.state.targetSpeed,
      firstSegmentCoords: route[0]?.coordinates?.length || 0
    })
  }

  /**
   * Validate route segments have proper coordinate data
   */
  private validateRoute(route: RouteSegment[]): void {
    console.log('🔍 DemoTripSimulator: Validating route with', route.length, 'segments')

    if (!route || route.length === 0) {
      throw new Error('DemoTripSimulator: Route is empty or undefined')
    }

    const invalidSegments: number[] = []
    const allSegmentDetails: any[] = []
    let fixedSegments = 0

    route.forEach((segment, index) => {
      const details = {
        index,
        hasCoordinates: !!segment.coordinates,
        coordinateCount: segment.coordinates?.length || 0,
        coordinateType: typeof segment.coordinates,
        isArray: Array.isArray(segment.coordinates),
        roadType: segment.roadType,
        distance: segment.distance,
        sampleCoordinate: segment.coordinates?.[0]
      }

      allSegmentDetails.push(details)

      // Try to fix invalid segments by creating minimal coordinate data
      if (!segment.coordinates || segment.coordinates.length < 2) {
        console.warn(`🔧 DemoTripSimulator: Fixing invalid segment ${index} with minimal coordinates`)

        // Try to preserve route continuity by connecting to adjacent segments
        let startCoord: [number, number]
        let endCoord: [number, number]

        if (index === 0) {
          // First segment - PRESERVE ACTUAL START COORDINATES
          if (this.actualStartCoordinates) {
            startCoord = this.actualStartCoordinates
            endCoord = [this.actualStartCoordinates[0] + 0.001, this.actualStartCoordinates[1] + 0.001]
            console.log('📍 DemoTripSimulator: COORDINATE FLOW - Using ACTUAL start coordinates for first segment:', {
              actualStartCoordinates: this.actualStartCoordinates,
              fixedStartCoord: startCoord,
              fixedEndCoord: endCoord
            })
          } else {
            // Fallback to Dallas only if no actual coordinates
            startCoord = [-96.7970, 32.7767]  // Dallas
            endCoord = [-96.7960, 32.7777]    // Slightly northeast
            console.warn('📍 DemoTripSimulator: COORDINATE FLOW - No actual start coordinates, using Dallas fallback')
          }
        } else if (index === route.length - 1) {
          // Last segment - try to use actual end coordinates if available
          if (this.actualEndCoordinates) {
            const prevSegment = route[index - 1]
            if (prevSegment?.coordinates?.length > 0) {
              const lastCoord = prevSegment.coordinates[prevSegment.coordinates.length - 1]
              startCoord = lastCoord
              endCoord = this.actualEndCoordinates
              console.log('📍 DemoTripSimulator: COORDINATE FLOW - Using ACTUAL end coordinates for last segment:', {
                actualEndCoordinates: this.actualEndCoordinates,
                connectedFromPrevious: startCoord,
                fixedEndCoord: endCoord
              })
            } else {
              startCoord = [this.actualEndCoordinates[0] - 0.001, this.actualEndCoordinates[1] - 0.001]
              endCoord = this.actualEndCoordinates
            }
          } else {
            // Connect from previous segment or use fallback
            const prevSegment = route[index - 1]
            if (prevSegment?.coordinates?.length > 0) {
              const lastCoord = prevSegment.coordinates[prevSegment.coordinates.length - 1]
              startCoord = lastCoord
              endCoord = [lastCoord[0] + 0.001, lastCoord[1] + 0.001]
            } else {
              startCoord = [-96.7960, 32.7777]
              endCoord = [-96.7950, 32.7787]
            }
          }
        } else {
          // Middle segment - try to connect from previous segment
          const prevSegment = route[index - 1]
          if (prevSegment?.coordinates?.length > 0) {
            const lastCoord = prevSegment.coordinates[prevSegment.coordinates.length - 1]
            startCoord = lastCoord
            endCoord = [lastCoord[0] + 0.001, lastCoord[1] + 0.001]
          } else {
            // Fallback to interpolated coordinates between actual start/end if available
            if (this.actualStartCoordinates && this.actualEndCoordinates) {
              const progress = index / route.length
              const lngDiff = this.actualEndCoordinates[0] - this.actualStartCoordinates[0]
              const latDiff = this.actualEndCoordinates[1] - this.actualStartCoordinates[1]

              startCoord = [
                this.actualStartCoordinates[0] + (lngDiff * progress),
                this.actualStartCoordinates[1] + (latDiff * progress)
              ]
              endCoord = [
                this.actualStartCoordinates[0] + (lngDiff * (progress + 0.1)),
                this.actualStartCoordinates[1] + (latDiff * (progress + 0.1))
              ]
              console.log('📍 DemoTripSimulator: COORDINATE FLOW - Interpolated coordinates for middle segment:', {
                progress,
                startCoord,
                endCoord
              })
            } else {
              // Last resort: Dallas area progression
              const progress = index / route.length
              const baseLng = -96.7970
              const baseLat = 32.7767
              const offset = progress * 0.01

              startCoord = [baseLng + offset, baseLat + offset]
              endCoord = [baseLng + offset + 0.001, baseLat + offset + 0.001]
            }
          }
        }

        segment.coordinates = [startCoord, endCoord]
        fixedSegments++
      }

      // Double-check after potential fix
      if (!segment.coordinates || segment.coordinates.length < 2) {
        invalidSegments.push(index)
      }
    })

    console.log('🔍 DemoTripSimulator: Validation summary:', {
      totalSegments: route.length,
      fixedSegments,
      invalidSegments: invalidSegments.length,
      sampleDetails: allSegmentDetails.slice(0, 2)
    })

    if (invalidSegments.length > 0) {
      console.error('❌ DemoTripSimulator: Still invalid after fixes:', {
        invalidSegments,
        segmentDetails: invalidSegments.slice(0, 3).map(i => allSegmentDetails[i])
      })
      throw new Error(`DemoTripSimulator: Route segments ${invalidSegments.join(', ')} have insufficient coordinate data after fix attempts`)
    }

    console.log('✅ DemoTripSimulator: Route validation passed', {
      totalSegments: route.length,
      totalCoordinates: route.reduce((sum, seg) => sum + (seg.coordinates?.length || 0), 0)
    })
  }

  /**
   * Start the simulation
   */
  start(): void {
    if (this.route.length === 0) {
      throw new Error('No route available for simulation')
    }

    this.state.isActive = true
    this.state.isPaused = false
    this.state.lastUpdateTime = Date.now()

    // Log the initial starting position
    const initialLocation = this.getCurrentLocation()
    console.log('🏁 DemoTripSimulator.start: Initial vehicle position:', {
      location: initialLocation,
      firstSegment: this.route[0],
      firstCoordinate: this.route[0]?.coordinates?.[0]
    })

    this.animate()
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    this.state.isPaused = true
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
  }

  /**
   * Resume the simulation
   */
  resume(): void {
    if (this.state.isActive && this.state.isPaused) {
      this.state.isPaused = false
      this.state.lastUpdateTime = Date.now()
      this.animate()
    }
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    this.state.isActive = false
    this.state.isPaused = false
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
  }

  /**
   * Set simulation speed multiplier
   */
  setSpeedMultiplier(multiplier: number): void {
    this.state.speedMultiplier = Math.max(0.1, Math.min(10, multiplier))
  }

  /**
   * Get current simulation progress (0-100%)
   */
  getProgress(): number {
    if (this.route.length === 0) return 0

    const totalSegments = this.route.length
    const completedSegments = this.state.currentSegmentIndex
    const currentSegmentProgress = this.state.positionInSegment

    return ((completedSegments + currentSegmentProgress) / totalSegments) * 100
  }

  /**
   * Get current state
   */
  getState(): DemoSimulationState {
    return { ...this.state }
  }

  /**
   * Main animation loop
   */
  private animate(): void {
    console.log('animate() called - isActive:', this.state.isActive, 'isPaused:', this.state.isPaused)
    if (!this.state.isActive || this.state.isPaused) return

    const now = Date.now()
    const deltaTime = (now - this.state.lastUpdateTime) / 1000 // Convert to seconds
    this.state.lastUpdateTime = now

    console.log('animate() - deltaTime:', deltaTime, 'currentSegmentIndex:', this.state.currentSegmentIndex)

    // Update position
    this.updatePosition(deltaTime)

    // Only send location updates every 2 seconds
    const now_ms = Date.now()
    if (now_ms - this.lastLocationSentTime >= this.locationUpdateInterval) {
      // Generate new location data
      const location = this.getCurrentLocation()
      console.log('animate() - generated location:', location)
      if (location) {
        this.onLocationUpdate(location)
        this.lastPosition = location
        this.lastLocationSentTime = now_ms
      }
    }

    // Check if simulation is complete
    if (this.state.currentSegmentIndex >= this.route.length) {
      console.log('Simulation complete - stopping')
      this.stop()
      return
    }

    // Schedule next frame
    this.animationFrame = requestAnimationFrame(() => this.animate())
  }

  /**
   * Update position along the route
   */
  private updatePosition(deltaTime: number): void {
    const currentSegment = this.route[this.state.currentSegmentIndex]
    if (!currentSegment) return

    // Update speed gradually toward target
    this.updateSpeed(deltaTime, currentSegment.roadType)

    // Calculate distance traveled this frame
    const speedInMps = (this.state.currentSpeed * 0.44704) * this.state.speedMultiplier // mph to m/s
    const distanceTraveled = speedInMps * deltaTime

    // Calculate how much of the current segment we traverse
    const segmentProgress = distanceTraveled / currentSegment.distance
    this.state.positionInSegment += segmentProgress

    // Check if we've completed the current segment
    if (this.state.positionInSegment >= 1) {
      this.state.positionInSegment = 0
      this.state.currentSegmentIndex++

      // Update target speed for new segment
      const nextSegment = this.route[this.state.currentSegmentIndex]
      if (nextSegment) {
        this.state.targetSpeed = this.getSpeedForRoadType(nextSegment.roadType, nextSegment)
      }
    }
  }

  /**
   * Update current speed with realistic acceleration/deceleration
   */
  private updateSpeed(deltaTime: number, roadType: RoadType): void {
    const speedDifference = this.state.targetSpeed - this.state.currentSpeed
    const maxAcceleration = this.getMaxAcceleration(roadType) // mph per second

    if (Math.abs(speedDifference) < 1) {
      // Close to target, set to exact target speed
      this.state.currentSpeed = this.state.targetSpeed
    } else {
      // Gradual acceleration/deceleration toward target
      const acceleration = Math.sign(speedDifference) * Math.min(
        Math.abs(speedDifference),
        maxAcceleration * deltaTime
      )
      this.state.currentSpeed += acceleration
    }

    // Ensure speed doesn't go negative and enforce maximum speed limits
    const maxSpeed = this.getMaxSpeedForRoadType(roadType)
    this.state.currentSpeed = Math.max(0, Math.min(this.state.currentSpeed, maxSpeed))
  }

  /**
   * Get current GPS location
   */
  private getCurrentLocation(): LocationData | null {
    const currentSegment = this.route[this.state.currentSegmentIndex]
    console.log('getCurrentLocation() - currentSegmentIndex:', this.state.currentSegmentIndex, 'segment:', currentSegment)

    console.log('📍 DemoTripSimulator: COORDINATE FLOW - getCurrentLocation called with state:', {
      currentSegmentIndex: this.state.currentSegmentIndex,
      positionInSegment: this.state.positionInSegment,
      actualStartCoordinates: this.actualStartCoordinates,
      actualEndCoordinates: this.actualEndCoordinates,
      totalSegments: this.route.length
    })

    if (!currentSegment) {
      console.error('❌ DemoSimulator.getCurrentLocation: No current segment found', {
        currentIndex: this.state.currentSegmentIndex,
        totalSegments: this.route.length,
        routeEmpty: this.route.length === 0
      })
      return null
    }

    if (!currentSegment.coordinates || currentSegment.coordinates.length < 2) {
      console.error('❌ DemoSimulator.getCurrentLocation: Segment has insufficient coordinates', {
        segmentIndex: this.state.currentSegmentIndex,
        coordinateCount: currentSegment.coordinates?.length || 0,
        coordinates: currentSegment.coordinates,
        roadType: currentSegment.roadType,
        distance: currentSegment.distance
      })
      return null
    }

    // Interpolate position along the segment
    const coordinates = currentSegment.coordinates
    const position = this.state.positionInSegment
    console.log('getCurrentLocation() - position in segment:', position, 'coordinates length:', coordinates.length)

    // Find the two points to interpolate between
    const segmentIndex = Math.floor(position * (coordinates.length - 1))
    const nextIndex = Math.min(segmentIndex + 1, coordinates.length - 1)
    const localProgress = (position * (coordinates.length - 1)) - segmentIndex

    const start = coordinates[segmentIndex]
    const end = coordinates[nextIndex]

    // Special handling for first position - ensure we start EXACTLY at actual coordinates
    let longitude: number
    let latitude: number

    if (this.state.currentSegmentIndex === 0 && this.state.positionInSegment === 0 && this.actualStartCoordinates) {
      // First position should be exactly the geocoded start coordinates
      longitude = this.actualStartCoordinates[0]
      latitude = this.actualStartCoordinates[1]
      console.log('📍 DemoTripSimulator: COORDINATE FLOW - Using EXACT start coordinates for first position:', {
        actualStartCoordinates: this.actualStartCoordinates,
        exactLat: latitude,
        exactLng: longitude
      })
    } else {
      // Regular interpolation for all other positions
      longitude = start[0] + (end[0] - start[0]) * localProgress
      latitude = start[1] + (end[1] - start[1]) * localProgress
    }

    console.log('getCurrentLocation() - final lat/lng:', latitude, longitude)

    console.log('📍 DemoTripSimulator: COORDINATE FLOW - Final position result:', {
      segmentIndex: this.state.currentSegmentIndex,
      positionInSegment: this.state.positionInSegment,
      localProgress,
      startCoord: start,
      endCoord: end,
      finalLat: latitude,
      finalLng: longitude,
      usedExactStart: this.state.currentSegmentIndex === 0 && this.state.positionInSegment === 0 && this.actualStartCoordinates,
      actualStartCoordinates: this.actualStartCoordinates
    })

    // Calculate heading if we have a previous position
    let heading: number | undefined
    if (this.lastPosition) {
      heading = this.calculateHeading(
        this.lastPosition.latitude,
        this.lastPosition.longitude,
        latitude,
        longitude
      )
    }

    const locationData = {
      latitude,
      longitude,
      accuracy: 5 + Math.random() * 5, // 5-10m accuracy simulation
      timestamp: Date.now(),
      altitude: 200 + Math.random() * 100, // Simulated altitude
      heading,
      speed: this.state.currentSpeed * 0.44704 // Convert mph to m/s
    }

    console.log('🚗 DEMO SIMULATOR: Generated location data:', {
      lat: locationData.latitude.toFixed(6),
      lng: locationData.longitude.toFixed(6),
      speed: this.state.currentSpeed.toFixed(1),
      segment: this.state.currentSegmentIndex,
      position: (this.state.positionInSegment * 100).toFixed(1) + '%'
    })

    return locationData
  }

  /**
   * Calculate heading between two points
   */
  private calculateHeading(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = (lon2 - lon1) * Math.PI / 180
    const lat1Rad = lat1 * Math.PI / 180
    const lat2Rad = lat2 * Math.PI / 180

    const y = Math.sin(dLon) * Math.cos(lat2Rad)
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)

    const heading = Math.atan2(y, x) * 180 / Math.PI
    return (heading + 360) % 360 // Normalize to 0-360
  }

  /**
   * Get realistic speed for road type with variation
   */
  private getSpeedForRoadType(roadType: RoadType, segment?: RouteSegment): number {
    // Use speed limit from route segment if available, otherwise use base speeds
    const baseSpeeds = {
      highway: 65,
      arterial: 45, // Updated to match OpenRouteService
      residential: 25,
      local: 30,
      parking: 5
    }

    const targetSpeed = segment?.speedLimit || baseSpeeds[roadType]

    // Add small, realistic variation based on traffic, conditions, etc.
    const variationRange = {
      highway: 5,  // 60-70 mph (reduced from ±10)
      arterial: 3, // 42-48 mph (reduced from ±8)
      residential: 3, // 22-28 mph (reduced from ±5)
      local: 3,    // 27-33 mph (reduced from ±5)
      parking: 1   // 4-6 mph (reduced from ±2)
    }

    const variation = (Math.random() - 0.5) * variationRange[roadType]
    return Math.max(5, targetSpeed + variation)
  }

  /**
   * Get maximum acceleration for road type
   */
  private getMaxAcceleration(roadType: RoadType): number {
    // mph per second
    const accelerations = {
      highway: 15, // Gradual highway acceleration
      arterial: 10, // Moderate acceleration
      residential: 8, // Slower acceleration
      local: 8,
      parking: 3 // Very slow acceleration
    }
    return accelerations[roadType]
  }

  /**
   * Get maximum speed limit for road type to prevent unrealistic speeds
   */
  private getMaxSpeedForRoadType(roadType: RoadType): number {
    const maxSpeeds = {
      highway: 75,   // Absolute maximum for highways
      arterial: 50,  // Absolute maximum for arterials
      residential: 30, // Absolute maximum for residential
      local: 35,     // Absolute maximum for local roads
      parking: 10    // Absolute maximum for parking areas
    }
    return maxSpeeds[roadType]
  }
}