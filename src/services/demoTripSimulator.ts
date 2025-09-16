import { LocationData, RouteSegment, RoadType, DemoSimulationState } from '@/types'

export class DemoTripSimulator {
  private state: DemoSimulationState
  private route: RouteSegment[]
  private onLocationUpdate: (location: LocationData) => void
  private animationFrame?: number
  private lastPosition?: LocationData

  constructor(
    route: RouteSegment[],
    onLocationUpdate: (location: LocationData) => void,
    speedMultiplier: number = 1
  ) {
    this.route = route
    this.onLocationUpdate = onLocationUpdate
    this.state = {
      isActive: false,
      currentSegmentIndex: 0,
      positionInSegment: 0,
      currentSpeed: 0,
      targetSpeed: this.getSpeedForRoadType(route[0]?.roadType || 'residential'),
      lastUpdateTime: Date.now(),
      speedMultiplier,
      isPaused: false
    }
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

    // Generate new location data
    const location = this.getCurrentLocation()
    console.log('animate() - generated location:', location)
    if (location) {
      this.onLocationUpdate(location)
      this.lastPosition = location
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
        this.state.targetSpeed = this.getSpeedForRoadType(nextSegment.roadType)
      }
    }
  }

  /**
   * Update current speed with realistic acceleration/deceleration
   */
  private updateSpeed(deltaTime: number, roadType: RoadType): void {
    const speedDifference = this.state.targetSpeed - this.state.currentSpeed
    const maxAcceleration = this.getMaxAcceleration(roadType) // mph per second

    // Add some randomness for realistic variation
    const randomFactor = 0.9 + Math.random() * 0.2 // ±10% variation
    const targetWithVariation = this.state.targetSpeed * randomFactor

    if (Math.abs(speedDifference) < 1) {
      // Close to target, small adjustments
      this.state.currentSpeed = targetWithVariation
    } else {
      // Gradual acceleration/deceleration
      const acceleration = Math.sign(speedDifference) * Math.min(
        Math.abs(speedDifference),
        maxAcceleration * deltaTime
      )
      this.state.currentSpeed += acceleration
    }

    // Ensure speed doesn't go negative
    this.state.currentSpeed = Math.max(0, this.state.currentSpeed)
  }

  /**
   * Get current GPS location
   */
  private getCurrentLocation(): LocationData | null {
    const currentSegment = this.route[this.state.currentSegmentIndex]
    console.log('getCurrentLocation() - currentSegmentIndex:', this.state.currentSegmentIndex, 'segment:', currentSegment)

    if (!currentSegment || currentSegment.coordinates.length < 2) {
      console.log('getCurrentLocation() - no valid segment or coordinates')
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

    // Interpolate coordinates
    const longitude = start[0] + (end[0] - start[0]) * localProgress
    const latitude = start[1] + (end[1] - start[1]) * localProgress

    console.log('getCurrentLocation() - interpolated lat/lng:', latitude, longitude)

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

    return {
      latitude,
      longitude,
      accuracy: 5 + Math.random() * 5, // 5-10m accuracy simulation
      timestamp: Date.now(),
      altitude: 200 + Math.random() * 100, // Simulated altitude
      heading,
      speed: this.state.currentSpeed * 0.44704 // Convert mph to m/s
    }
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

    let heading = Math.atan2(y, x) * 180 / Math.PI
    return (heading + 360) % 360 // Normalize to 0-360
  }

  /**
   * Get realistic speed for road type with variation
   */
  private getSpeedForRoadType(roadType: RoadType): number {
    const baseSpeeds = {
      highway: 65,
      arterial: 40,
      residential: 25,
      local: 30,
      parking: 5
    }

    const baseSpeed = baseSpeeds[roadType]

    // Add realistic variation based on traffic, conditions, etc.
    const variationRange = {
      highway: 10, // 55-75 mph
      arterial: 8,  // 32-48 mph
      residential: 5, // 20-30 mph
      local: 5,     // 25-35 mph
      parking: 2    // 3-7 mph
    }

    const variation = (Math.random() - 0.5) * variationRange[roadType]
    return Math.max(5, baseSpeed + variation)
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
}