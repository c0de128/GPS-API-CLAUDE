import { useState, useCallback, useEffect, useRef } from 'react'
import { LocationData, Trip } from '@/types'

export interface ReplayState {
  isPlaying: boolean
  currentIndex: number
  currentLocation: LocationData | null
  speed: number // Playback speed multiplier (0.5x, 1x, 2x, etc.)
  progress: number // Percentage of route completed (0-100)
  timeElapsed: number // Time elapsed in replay (milliseconds)
}

export interface UseReplayReturn {
  // State
  replayState: ReplayState

  // Actions
  play: () => void
  pause: () => void
  stop: () => void
  setSpeed: (speed: number) => void
  seekTo: (percentage: number) => void
  skipToNext: () => void
  skipToPrevious: () => void

  // Getters
  getCurrentLocation: () => LocationData | null
  getTotalDuration: () => number
  getRemainingTime: () => number
  isAtEnd: boolean
  isAtStart: boolean
}

export function useReplay(trip: Trip | null): UseReplayReturn {
  const [replayState, setReplayState] = useState<ReplayState>({
    isPlaying: false,
    currentIndex: 0,
    currentLocation: null,
    speed: 1,
    progress: 0,
    timeElapsed: 0
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)

  const routePoints = trip?.route || []
  const totalPoints = routePoints.length
  const isAtEnd = replayState.currentIndex >= totalPoints - 1
  const isAtStart = replayState.currentIndex === 0

  // Calculate replay interval based on trip duration and speed
  const getReplayInterval = useCallback(() => {
    if (!trip || totalPoints < 2) return 1000

    const tripDuration = (trip.endTime || trip.startTime) - trip.startTime
    const baseInterval = tripDuration / totalPoints

    // Adjust for playback speed (slower speed = longer interval)
    return Math.max(50, baseInterval / replayState.speed)
  }, [trip, totalPoints, replayState.speed])

  // Update current location when index changes
  useEffect(() => {
    if (totalPoints > 0 && replayState.currentIndex < totalPoints) {
      const currentLocation = routePoints[replayState.currentIndex]
      const progress = totalPoints > 1 ? (replayState.currentIndex / (totalPoints - 1)) * 100 : 0

      setReplayState(prev => ({
        ...prev,
        currentLocation,
        progress
      }))
    }
  }, [replayState.currentIndex, routePoints, totalPoints])

  // Playback logic
  useEffect(() => {
    if (replayState.isPlaying && !isAtEnd) {
      const interval = getReplayInterval()

      intervalRef.current = setInterval(() => {
        setReplayState(prev => {
          const nextIndex = Math.min(prev.currentIndex + 1, totalPoints - 1)
          const timeElapsed = Date.now() - startTimeRef.current + pausedTimeRef.current

          return {
            ...prev,
            currentIndex: nextIndex,
            timeElapsed
          }
        })
      }, interval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [replayState.isPlaying, replayState.speed, isAtEnd, getReplayInterval, totalPoints])

  // Auto-pause at end
  useEffect(() => {
    if (isAtEnd && replayState.isPlaying) {
      setReplayState(prev => ({ ...prev, isPlaying: false }))
    }
  }, [isAtEnd, replayState.isPlaying])

  const play = useCallback(() => {
    if (isAtEnd) {
      // Reset to beginning if at end
      setReplayState(prev => ({
        ...prev,
        currentIndex: 0,
        progress: 0,
        timeElapsed: 0,
        isPlaying: true
      }))
      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0
    } else {
      setReplayState(prev => ({ ...prev, isPlaying: true }))
      if (startTimeRef.current === 0) {
        startTimeRef.current = Date.now()
      }
    }
  }, [isAtEnd])

  const pause = useCallback(() => {
    setReplayState(prev => ({ ...prev, isPlaying: false }))
    if (startTimeRef.current > 0) {
      pausedTimeRef.current += Date.now() - startTimeRef.current
    }
  }, [])

  const stop = useCallback(() => {
    setReplayState(prev => ({
      ...prev,
      isPlaying: false,
      currentIndex: 0,
      progress: 0,
      timeElapsed: 0
    }))
    startTimeRef.current = 0
    pausedTimeRef.current = 0
  }, [])

  const setSpeed = useCallback((speed: number) => {
    setReplayState(prev => ({ ...prev, speed: Math.max(0.1, Math.min(5, speed)) }))
  }, [])

  const seekTo = useCallback((percentage: number) => {
    const targetIndex = Math.floor((percentage / 100) * (totalPoints - 1))
    const clampedIndex = Math.max(0, Math.min(targetIndex, totalPoints - 1))

    setReplayState(prev => ({
      ...prev,
      currentIndex: clampedIndex,
      progress: percentage
    }))
  }, [totalPoints])

  const skipToNext = useCallback(() => {
    setReplayState(prev => ({
      ...prev,
      currentIndex: Math.min(prev.currentIndex + 10, totalPoints - 1)
    }))
  }, [totalPoints])

  const skipToPrevious = useCallback(() => {
    setReplayState(prev => ({
      ...prev,
      currentIndex: Math.max(prev.currentIndex - 10, 0)
    }))
  }, [])

  const getCurrentLocation = useCallback((): LocationData | null => {
    return replayState.currentLocation
  }, [replayState.currentLocation])

  const getTotalDuration = useCallback((): number => {
    if (!trip || !trip.endTime) return 0
    return trip.endTime - trip.startTime
  }, [trip])

  const getRemainingTime = useCallback((): number => {
    const totalDuration = getTotalDuration()
    const elapsed = replayState.timeElapsed
    return Math.max(0, totalDuration - elapsed)
  }, [getTotalDuration, replayState.timeElapsed])

  return {
    // State
    replayState,

    // Actions
    play,
    pause,
    stop,
    setSpeed,
    seekTo,
    skipToNext,
    skipToPrevious,

    // Getters
    getCurrentLocation,
    getTotalDuration,
    getRemainingTime,
    isAtEnd,
    isAtStart
  }
}