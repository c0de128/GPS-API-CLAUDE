import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// GPS utilities
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

export function calculateSpeed(
  lat1: number,
  lon1: number,
  timestamp1: number,
  lat2: number,
  lon2: number,
  timestamp2: number
): number {
  const distance = calculateDistance(lat1, lon1, lat2, lon2)
  const timeDiff = (timestamp2 - timestamp1) / 1000 // Convert to seconds

  if (timeDiff === 0) return 0

  return distance / timeDiff // Speed in m/s
}

export function convertSpeed(mps: number, unit: 'mph' | 'kmh'): number {
  return unit === 'mph' ? mps * 2.237 : mps * 3.6
}

export function formatDistance(meters: number): string {
  if (meters < 1609.34) { // Less than 1 mile
    const feet = Math.round(meters * 3.28084)
    return `${feet}ft`
  }
  const miles = (meters / 1609.34).toFixed(2)
  return `${miles}mi`
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

export function formatSpeed(speed: number, unit: 'mph' | 'kmh'): string {
  return `${speed.toFixed(1)} ${unit}`
}