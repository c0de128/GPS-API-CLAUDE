import React from 'react'
import { Badge } from '@/components/ui/badge'
import { LocationData, TripStatus } from '@/types'

interface SystemStatusLineProps {
  // GPS Status
  isTracking: boolean
  error: string | null
  permission: 'granted' | 'denied' | 'prompt' | 'unknown'

  // Trip Status
  tripStatus: TripStatus

  // Demo Mode
  isDemoMode: boolean

  // Route Points
  routePoints: LocationData[]
}

const SystemStatusLine: React.FC<SystemStatusLineProps> = ({
  isTracking,
  error,
  permission,
  tripStatus,
  isDemoMode,
  routePoints
}) => {
  const getGPSStatusBadge = () => {
    if (isDemoMode) {
      return <Badge className="bg-purple-600 text-white">Demo Mode</Badge>
    }

    if (error) {
      return <Badge variant="destructive">GPS Error</Badge>
    }

    if (permission === 'denied') {
      return <Badge variant="destructive">Permission Denied</Badge>
    }

    if (isTracking) {
      return <Badge className="bg-green-600 text-white">GPS Active</Badge>
    }

    return <Badge variant="secondary">GPS Inactive</Badge>
  }

  const getTripStatusBadge = () => {
    switch (tripStatus) {
      case 'active':
        return <Badge className="bg-green-600 text-white">Recording</Badge>
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>
      default:
        return <Badge variant="outline">No Trip</Badge>
    }
  }

  return (
    <div className="flex items-center gap-4 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">GPS:</span>
        {getGPSStatusBadge()}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Trip:</span>
        {getTripStatusBadge()}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Points:</span>
        <span className="font-semibold text-primary">{routePoints.length}</span>
      </div>
    </div>
  )
}

export default SystemStatusLine