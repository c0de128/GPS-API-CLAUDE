import React from 'react'
import { Gauge, Activity, TrendingUp } from 'lucide-react'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SpeedIndicatorProps } from '@/types'
import { formatSpeed } from '@/lib/utils'

interface SpeedDashboardProps extends SpeedIndicatorProps {
  isTracking: boolean
  accuracy?: number
}

const SpeedDashboard: React.FC<SpeedDashboardProps> = ({
  currentSpeed,
  averageSpeed,
  maxSpeed,
  unit,
  isTracking,
  accuracy,
  className
}) => {
  const getSpeedColor = (speed: number) => {
    if (speed < 10) return 'text-green-600'
    if (speed < 30) return 'text-yellow-600'
    if (speed < 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getSpeedBadgeVariant = (speed: number) => {
    if (speed < 10) return 'outline'
    if (speed < 30) return 'secondary'
    return 'destructive'
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${className}`}>
      {/* Current Speed */}
      <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Current Speed
          </CardDescription>
          <CardTitle className={`text-2xl font-semibold tabular-nums @[200px]/card:text-3xl ${getSpeedColor(currentSpeed)}`}>
            {formatSpeed(currentSpeed, unit)}
          </CardTitle>
          {isTracking && (
            <div className="flex justify-end">
              <Badge variant={getSpeedBadgeVariant(currentSpeed)} className="text-xs">
                Live
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm pt-0">
          {accuracy && (
            <div className="text-muted-foreground text-xs">
              Accuracy: ±{Math.round(accuracy)}m
            </div>
          )}
          {!isTracking && (
            <div className="text-muted-foreground text-xs">
              Start tracking to see live speed
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Average Speed */}
      <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Average Speed
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums text-blue-600 @[200px]/card:text-3xl">
            {formatSpeed(averageSpeed, unit)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm pt-0">
          <div className="text-muted-foreground text-xs">
            Session average
          </div>
        </CardFooter>
      </Card>

      {/* Max Speed */}
      <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Max Speed
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums text-purple-600 @[200px]/card:text-3xl">
            {formatSpeed(maxSpeed, unit)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm pt-0">
          <div className="text-muted-foreground text-xs">
            Session maximum
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default SpeedDashboard