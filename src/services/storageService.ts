import { Trip, Waypoint, UserSettings, TripStatistics } from '@/types'
import { monitoring } from '@/utils/monitoring'

// Database configuration
const DB_NAME = 'GPSTripTracker'
const DB_VERSION = 1

// Store names
const STORES = {
  TRIPS: 'trips',
  WAYPOINTS: 'waypoints',
  SETTINGS: 'settings'
}

export class StorageService {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  constructor() {
    this.initPromise = this.initialize()
    monitoring.logStorageEvent('Storage service initialized', true)
  }

  // Initialize IndexedDB
  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not supported'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open database'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create trips store
        if (!db.objectStoreNames.contains(STORES.TRIPS)) {
          const tripStore = db.createObjectStore(STORES.TRIPS, { keyPath: 'id' })
          tripStore.createIndex('name', 'name', { unique: false })
          tripStore.createIndex('startTime', 'startTime', { unique: false })
          tripStore.createIndex('status', 'status', { unique: false })
          tripStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // Create waypoints store
        if (!db.objectStoreNames.contains(STORES.WAYPOINTS)) {
          const waypointStore = db.createObjectStore(STORES.WAYPOINTS, { keyPath: 'id' })
          waypointStore.createIndex('tripId', 'tripId', { unique: false })
          waypointStore.createIndex('timestamp', 'timestamp', { unique: false })
          waypointStore.createIndex('type', 'type', { unique: false })
        }

        // Create settings store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' })
        }
      }
    })
  }

  // Ensure database is initialized
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise
    }
    if (!this.db) {
      throw new Error('Database not initialized')
    }
  }

  // Generic transaction helper
  private async transaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    operation: (transaction: IDBTransaction, stores: { [key: string]: IDBObjectStore }) => Promise<T>
  ): Promise<T> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeNames, mode)

      tx.onerror = () => reject(tx.error)

      const storeArray = Array.isArray(storeNames) ? storeNames : [storeNames]
      const stores: { [key: string]: IDBObjectStore } = {}

      storeArray.forEach(storeName => {
        stores[storeName] = tx.objectStore(storeName)
      })

      operation(tx, stores).then(resolve).catch(reject)
    })
  }

  // Trip operations
  async saveTrip(trip: Trip): Promise<void> {
    await this.transaction(STORES.TRIPS, 'readwrite', async (_, stores) => {
      const request = stores[STORES.TRIPS].put(trip)
      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    })
  }

  async getTrip(id: string): Promise<Trip | null> {
    return this.transaction(STORES.TRIPS, 'readonly', async (_, stores) => {
      const request = stores[STORES.TRIPS].get(id)
      return new Promise<Trip | null>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
    })
  }

  async getAllTrips(): Promise<Trip[]> {
    return this.transaction(STORES.TRIPS, 'readonly', async (_, stores) => {
      const request = stores[STORES.TRIPS].getAll()
      return new Promise<Trip[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    })
  }

  async getTripsOrderedBy(field: 'startTime' | 'name' | 'createdAt', direction: 'asc' | 'desc' = 'desc'): Promise<Trip[]> {
    return this.transaction(STORES.TRIPS, 'readonly', async (_, stores) => {
      const index = stores[STORES.TRIPS].index(field)
      const request = direction === 'desc'
        ? index.openCursor(null, 'prev')
        : index.openCursor(null, 'next')

      const trips: Trip[] = []

      return new Promise<Trip[]>((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            trips.push(cursor.value)
            cursor.continue()
          } else {
            resolve(trips)
          }
        }
        request.onerror = () => reject(request.error)
      })
    })
  }

  async deleteTrip(id: string): Promise<void> {
    await this.transaction([STORES.TRIPS, STORES.WAYPOINTS], 'readwrite', async (_, stores) => {
      // Delete trip
      const deleteTripRequest = stores[STORES.TRIPS].delete(id)

      // Delete associated waypoints
      const waypointIndex = stores[STORES.WAYPOINTS].index('tripId')
      const waypointRequest = waypointIndex.openCursor(IDBKeyRange.only(id))

      return new Promise<void>((resolve, reject) => {
        let operations = 0
        let completed = 0

        const checkComplete = () => {
          completed++
          if (completed === operations) resolve()
        }

        deleteTripRequest.onsuccess = () => {
          operations++
          checkComplete()
        }
        deleteTripRequest.onerror = () => reject(deleteTripRequest.error)

        waypointRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            operations++
            const deleteRequest = cursor.delete()
            deleteRequest.onsuccess = () => checkComplete()
            deleteRequest.onerror = () => reject(deleteRequest.error)
            cursor.continue()
          } else if (operations === 0) {
            // No waypoints to delete
            operations = 1
            checkComplete()
          }
        }
        waypointRequest.onerror = () => reject(waypointRequest.error)
      })
    })
  }

  async searchTrips(query: string): Promise<Trip[]> {
    const allTrips = await this.getAllTrips()
    const searchQuery = query.toLowerCase().trim()

    if (!searchQuery) return allTrips

    return allTrips.filter(trip =>
      trip.name.toLowerCase().includes(searchQuery) ||
      trip.notes.toLowerCase().includes(searchQuery) ||
      trip.startAddress?.toLowerCase().includes(searchQuery) ||
      trip.endAddress?.toLowerCase().includes(searchQuery)
    )
  }

  // Waypoint operations
  async saveWaypoint(waypoint: Waypoint): Promise<void> {
    await this.transaction(STORES.WAYPOINTS, 'readwrite', async (_, stores) => {
      const request = stores[STORES.WAYPOINTS].put(waypoint)
      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    })
  }

  async getWaypointsForTrip(tripId: string): Promise<Waypoint[]> {
    return this.transaction(STORES.WAYPOINTS, 'readonly', async (_, stores) => {
      const index = stores[STORES.WAYPOINTS].index('tripId')
      const request = index.getAll(tripId)
      return new Promise<Waypoint[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    })
  }

  // Settings operations
  async saveSetting<T>(key: string, value: T): Promise<void> {
    await this.transaction(STORES.SETTINGS, 'readwrite', async (_, stores) => {
      const request = stores[STORES.SETTINGS].put({ key, value })
      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    })
  }

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    return this.transaction(STORES.SETTINGS, 'readonly', async (_, stores) => {
      const request = stores[STORES.SETTINGS].get(key)
      return new Promise<T>((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result
          resolve(result ? result.value : defaultValue)
        }
        request.onerror = () => reject(request.error)
      })
    })
  }

  async getUserSettings(): Promise<UserSettings> {
    const defaults: UserSettings = {
      speedUnit: 'mph',
      distanceUnit: 'mi',
      theme: 'system',
      autoSaveInterval: 30,
      gpsAccuracy: 'high',
      mapStyle: 'default'
    }

    try {
      const settings = await this.transaction(STORES.SETTINGS, 'readonly', async (_, stores) => {
        const request = stores[STORES.SETTINGS].getAll()
        return new Promise<{ key: string; value: any }[]>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result || [])
          request.onerror = () => reject(request.error)
        })
      })

      const userSettings = { ...defaults }
      settings.forEach(setting => {
        if (setting.key in userSettings) {
          (userSettings as any)[setting.key] = setting.value
        }
      })

      return userSettings
    } catch {
      return defaults
    }
  }

  async saveUserSettings(settings: Partial<UserSettings>): Promise<void> {
    await this.transaction(STORES.SETTINGS, 'readwrite', async (_, stores) => {
      const promises = Object.entries(settings).map(([key, value]) => {
        const request = stores[STORES.SETTINGS].put({ key, value })
        return new Promise<void>((resolve, reject) => {
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
      })

      await Promise.all(promises)
    })
  }

  // Statistics
  async getTripStatistics(): Promise<TripStatistics> {
    const trips = await this.getAllTrips()
    const completedTrips = trips.filter(trip => trip.status === 'completed')

    if (completedTrips.length === 0) {
      return {
        totalTrips: 0,
        totalDistance: 0,
        totalTime: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        longestTrip: 0,
        shortestTrip: 0
      }
    }

    const totalDistance = completedTrips.reduce((sum, trip) => sum + trip.totalDistance, 0)
    const totalTime = completedTrips.reduce((sum, trip) => {
      const duration = trip.endTime ? trip.endTime - trip.startTime : 0
      return sum + duration
    }, 0)
    const maxSpeed = Math.max(...completedTrips.map(trip => trip.maxSpeed))
    const averageSpeed = completedTrips.reduce((sum, trip) => sum + trip.averageSpeed, 0) / completedTrips.length
    const distances = completedTrips.map(trip => trip.totalDistance)
    const longestTrip = Math.max(...distances)
    const shortestTrip = Math.min(...distances)

    return {
      totalTrips: completedTrips.length,
      totalDistance,
      totalTime,
      averageSpeed,
      maxSpeed,
      longestTrip,
      shortestTrip
    }
  }

  // Data management
  async exportAllData(): Promise<string> {
    const trips = await this.getAllTrips()
    const waypoints = await this.transaction(STORES.WAYPOINTS, 'readonly', async (_, stores) => {
      const request = stores[STORES.WAYPOINTS].getAll()
      return new Promise<Waypoint[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    })
    const settings = await this.getUserSettings()

    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      trips,
      waypoints,
      settings
    }

    return JSON.stringify(exportData, null, 2)
  }

  async clearAllData(): Promise<void> {
    await this.transaction([STORES.TRIPS, STORES.WAYPOINTS], 'readwrite', async (_, stores) => {
      const clearTrips = stores[STORES.TRIPS].clear()
      const clearWaypoints = stores[STORES.WAYPOINTS].clear()

      return Promise.all([
        new Promise<void>((resolve, reject) => {
          clearTrips.onsuccess = () => resolve()
          clearTrips.onerror = () => reject(clearTrips.error)
        }),
        new Promise<void>((resolve, reject) => {
          clearWaypoints.onsuccess = () => resolve()
          clearWaypoints.onerror = () => reject(clearWaypoints.error)
        })
      ]).then(() => {})
    })
  }

  // Backup to localStorage as fallback
  async backupToLocalStorage(): Promise<void> {
    try {
      const data = await this.exportAllData()

      // Check if data is too large for localStorage (limit to ~4MB)
      const dataSize = new Blob([data]).size
      const maxSize = 4 * 1024 * 1024 // 4MB

      if (dataSize > maxSize) {
        console.warn(`Backup data too large (${Math.round(dataSize / 1024)}KB), skipping localStorage backup`)
        return
      }

      // Try to store, but handle quota errors gracefully
      localStorage.setItem(`${DB_NAME}_backup`, data)
      console.log(`Backup stored successfully (${Math.round(dataSize / 1024)}KB)`)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old backup and retrying...')
        try {
          // Clear the existing backup and try again
          localStorage.removeItem(`${DB_NAME}_backup`)
          // Don't retry to avoid infinite loop - just log the issue
          console.warn('Backup disabled due to storage constraints')
        } catch (clearError) {
          console.warn('Failed to clear localStorage:', clearError)
        }
      } else {
        console.warn('Failed to backup to localStorage:', error)
      }
    }
  }

  // Get storage usage information
  async getStorageInfo(): Promise<{ used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        return {
          used: estimate.usage || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0)
        }
      } catch {
        return { used: 0, available: 0 }
      }
    }
    return { used: 0, available: 0 }
  }
}

// Create singleton instance
export const storageService = new StorageService()