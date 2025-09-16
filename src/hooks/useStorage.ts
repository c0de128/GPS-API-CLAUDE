import { useState, useEffect, useCallback } from 'react'
import { Trip, UserSettings, TripStatistics } from '@/types'
import { storageService } from '@/services/storageService'

export interface UseStorageReturn {
  // Trip operations
  saveTrip: (trip: Trip) => Promise<void>
  getTrip: (id: string) => Promise<Trip | null>
  getAllTrips: () => Promise<Trip[]>
  deleteTrip: (id: string) => Promise<void>
  searchTrips: (query: string) => Promise<Trip[]>

  // Settings operations
  settings: UserSettings | null
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>
  loadSettings: () => Promise<void>

  // Statistics
  getStatistics: () => Promise<TripStatistics>

  // Data management
  exportAllData: () => Promise<string>
  clearAllData: () => Promise<void>
  getStorageInfo: () => Promise<{ used: number; available: number }>

  // State
  isLoading: boolean
  error: string | null
}

export function useStorage(): UseStorageReturn {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load settings on initialization
  useEffect(() => {
    loadSettings()
  }, [])

  // Trip operations
  const saveTrip = useCallback(async (trip: Trip): Promise<void> => {
    try {
      setError(null)
      await storageService.saveTrip(trip)

      // Auto-backup to localStorage
      await storageService.backupToLocalStorage()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save trip'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  const getTrip = useCallback(async (id: string): Promise<Trip | null> => {
    try {
      setError(null)
      return await storageService.getTrip(id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get trip'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  const getAllTrips = useCallback(async (): Promise<Trip[]> => {
    try {
      setError(null)
      setIsLoading(true)
      return await storageService.getTripsOrderedBy('startTime', 'desc')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load trips'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteTrip = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null)
      await storageService.deleteTrip(id)

      // Auto-backup to localStorage after deletion
      await storageService.backupToLocalStorage()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete trip'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  const searchTrips = useCallback(async (query: string): Promise<Trip[]> => {
    try {
      setError(null)
      setIsLoading(true)
      return await storageService.searchTrips(query)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search trips'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Settings operations
  const loadSettings = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      setIsLoading(true)
      const userSettings = await storageService.getUserSettings()
      setSettings(userSettings)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings'
      setError(errorMessage)

      // Use default settings if loading fails
      const defaultSettings: UserSettings = {
        speedUnit: 'mph',
        distanceUnit: 'km',
        theme: 'system',
        autoSaveInterval: 30,
        gpsAccuracy: 'high',
        mapStyle: 'default'
      }
      setSettings(defaultSettings)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>): Promise<void> => {
    try {
      setError(null)
      await storageService.saveUserSettings(newSettings)

      // Update local state
      setSettings(prev => prev ? { ...prev, ...newSettings } : null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  // Statistics
  const getStatistics = useCallback(async (): Promise<TripStatistics> => {
    try {
      setError(null)
      return await storageService.getTripStatistics()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get statistics'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  // Data management
  const exportAllData = useCallback(async (): Promise<string> => {
    try {
      setError(null)
      setIsLoading(true)
      return await storageService.exportAllData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearAllData = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      setIsLoading(true)
      await storageService.clearAllData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear data'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getStorageInfo = useCallback(async (): Promise<{ used: number; available: number }> => {
    try {
      setError(null)
      return await storageService.getStorageInfo()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get storage info'
      setError(errorMessage)
      return { used: 0, available: 0 }
    }
  }, [])

  return {
    // Trip operations
    saveTrip,
    getTrip,
    getAllTrips,
    deleteTrip,
    searchTrips,

    // Settings operations
    settings,
    updateSettings,
    loadSettings,

    // Statistics
    getStatistics,

    // Data management
    exportAllData,
    clearAllData,
    getStorageInfo,

    // State
    isLoading,
    error
  }
}