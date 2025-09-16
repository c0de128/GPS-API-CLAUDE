import React from 'react'
import { Play, Pause, Square, SkipBack, SkipForward, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UseReplayReturn } from '@/hooks/useReplay'
import { formatDuration } from '@/lib/utils'

interface ReplayControlsProps {
  replay: UseReplayReturn
  tripName: string
}

const ReplayControls: React.FC<ReplayControlsProps> = ({ replay, tripName }) => {
  const {
    replayState,
    play,
    pause,
    stop,
    setSpeed,
    seekTo,
    skipToPrevious,
    skipToNext,
    getTotalDuration,
    getRemainingTime,
    isAtEnd,
    isAtStart
  } = replay

  const speedOptions = [0.5, 1, 1.5, 2, 3, 5]

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = (clickX / rect.width) * 100
    seekTo(Math.max(0, Math.min(100, percentage)))
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {/* Trip Info */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">{tripName}</h3>
            <p className="text-sm text-muted-foreground">
              Point {replayState.currentIndex + 1} of {replay.replayState.currentLocation ? 'many' : 0}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              {replayState.speed}x
            </Badge>
            {replayState.isPlaying && (
              <Badge className="bg-green-600">Playing</Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{formatDuration(replayState.timeElapsed)}</span>
            <span>{formatDuration(getTotalDuration())}</span>
          </div>
          <div
            className="w-full h-2 bg-muted rounded-full cursor-pointer relative overflow-hidden"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-200"
              style={{ width: `${replayState.progress}%` }}
            />
            <div
              className="absolute top-0 w-4 h-4 bg-primary rounded-full -translate-y-1 -translate-x-2 shadow-lg cursor-grab transition-all duration-200 hover:scale-110"
              style={{ left: `${replayState.progress}%` }}
            />
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={skipToPrevious}
            disabled={isAtStart}
            className="h-10 w-10 p-0"
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          {replayState.isPlaying ? (
            <Button
              onClick={pause}
              className="h-12 w-12 p-0 rounded-full"
            >
              <Pause className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              onClick={play}
              disabled={!replay.replayState.currentLocation}
              className="h-12 w-12 p-0 rounded-full"
            >
              <Play className="w-5 h-5 ml-0.5" />
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={stop}
            disabled={isAtStart && !replayState.isPlaying}
            className="h-10 w-10 p-0"
          >
            <Square className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={skipToNext}
            disabled={isAtEnd}
            className="h-10 w-10 p-0"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">Speed:</span>
          {speedOptions.map((speed) => (
            <Button
              key={speed}
              variant={replayState.speed === speed ? "default" : "outline"}
              size="sm"
              onClick={() => setSpeed(speed)}
              className="h-8 px-3 text-xs"
            >
              {speed}x
            </Button>
          ))}
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <span>
            Remaining: {formatDuration(getRemainingTime())}
          </span>
          <span>
            Progress: {replayState.progress.toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default ReplayControls