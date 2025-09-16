import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, Square, Zap, MapPin, Clock, Route } from 'lucide-react'
import { DemoSimulationState } from '@/types'

interface DemoControlsProps {
  isActive: boolean
  demoState: DemoSimulationState | null
  currentAddress?: string
  destinationAddress?: string
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onSpeedChange: (multiplier: number) => void
}

const DemoControls: React.FC<DemoControlsProps> = ({
  isActive,
  demoState,
  currentAddress,
  destinationAddress,
  onPause,
  onResume,
  onStop,
  onSpeedChange
}) => {
  if (!isActive || !demoState) {
    return null
  }

  const speedOptions = [
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 5, label: '5x' },
    { value: 10, label: '10x' }
  ]

  // Calculate progress percentage
  const totalSegments = 100 // Approximate total for progress calculation
  const currentProgress = (demoState.currentSegmentIndex / totalSegments) * 100 +
                         (demoState.positionInSegment / totalSegments)
  const progress = Math.min(100, Math.max(0, currentProgress))

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            <CardTitle className="text-lg">Demo Trip</CardTitle>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              SIMULATION
            </Badge>
          </div>
          <div className="flex gap-1">
            {demoState.isPaused ? (
              <Button size="sm" onClick={onResume} variant="outline">
                <Play className="w-3 h-3 mr-1" />
                Resume
              </Button>
            ) : (
              <Button size="sm" onClick={onPause} variant="outline">
                <Pause className="w-3 h-3 mr-1" />
                Pause
              </Button>
            )}
            <Button size="sm" onClick={onStop} variant="destructive">
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
          </div>
        </div>
        <CardDescription>
          Real-time GPS simulation with realistic movement and speeds
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Route Information */}
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">From</div>
              <div className="text-muted-foreground text-xs">
                {currentAddress || 'Demo Start Location'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">To</div>
              <div className="text-muted-foreground text-xs">
                {destinationAddress || 'Demo End Location'}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Trip Progress</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Zap className="w-3 h-3" />
              Current Speed
            </div>
            <div className="font-medium text-lg">
              {demoState.currentSpeed.toFixed(1)} mph
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Route className="w-3 h-3" />
              Segment
            </div>
            <div className="font-medium text-lg">
              {demoState.currentSegmentIndex + 1}
            </div>
          </div>
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Simulation Speed
          </label>
          <Select
            value={demoState.speedMultiplier.toString()}
            onValueChange={(value) => onSpeedChange(parseFloat(value))}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {speedOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            {demoState.speedMultiplier < 1
              ? 'Slower than real-time for detailed observation'
              : demoState.speedMultiplier === 1
              ? 'Real-time simulation'
              : `${demoState.speedMultiplier}x faster than real-time`
            }
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex gap-2 text-xs">
          <Badge variant={demoState.isPaused ? "secondary" : "default"}>
            {demoState.isPaused ? 'Paused' : 'Running'}
          </Badge>
          <Badge variant="outline">
            Segment {(demoState.positionInSegment * 100).toFixed(0)}% complete
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export default DemoControls