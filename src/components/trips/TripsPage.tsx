import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, BarChart3, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trip, TripStatistics } from '@/types'
import { useStorage } from '@/hooks/useStorage'
import TripCard from './TripCard'
import { formatDistance, formatDuration } from '@/lib/utils'

const TripsPage: React.FC = () => {
  const navigate = useNavigate()
  const { getAllTrips, deleteTrip, getStatistics, exportAllData, isLoading, error } = useStorage()

  const [trips, setTrips] = useState<Trip[]>([])
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statistics, setStatistics] = useState<TripStatistics | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Load trips and statistics on mount
  useEffect(() => {
    loadTrips()
    loadStatistics()
  }, [])

  // Filter trips when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filtered = trips.filter(trip =>
        trip.name.toLowerCase().includes(query) ||
        trip.notes.toLowerCase().includes(query) ||
        trip.startAddress?.toLowerCase().includes(query) ||
        trip.endAddress?.toLowerCase().includes(query)
      )
      setFilteredTrips(filtered)
    } else {
      setFilteredTrips(trips)
    }
  }, [searchQuery, trips])

  const loadTrips = async () => {
    try {
      const allTrips = await getAllTrips()
      setTrips(allTrips)
    } catch (err) {
      console.error('Failed to load trips:', err)
    }
  }

  const loadStatistics = async () => {
    try {
      const stats = await getStatistics()
      setStatistics(stats)
    } catch (err) {
      console.error('Failed to load statistics:', err)
    }
  }

  const handleTripSelect = (trip: Trip) => {
    if (trip.status === 'completed' && trip.route.length > 1) {
      navigate(`/replay/${trip.id}`)
    } else {
      navigate(`/trips/${trip.id}`)
    }
  }

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await deleteTrip(tripId)
      await loadTrips()
      await loadStatistics()
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete trip:', err)
    }
  }

  const handleExportData = async () => {
    try {
      const data = await exportAllData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gps-trips-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export data:', err)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Trip History
          </h1>
          <p className="text-muted-foreground">
            {trips.length === 0
              ? 'No trips recorded yet'
              : `${trips.length} trip${trips.length === 1 ? '' : 's'} recorded`
            }
          </p>
        </div>

        <Button
          onClick={() => navigate('/tracking')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Trip
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive font-medium">Error</p>
          <p className="text-destructive/80 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && statistics.totalTrips > 0 && (
        <section>
          <h2 className="text-lg font-medium mb-3 text-muted-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Trip Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
              <CardHeader className="pb-3">
                <CardDescription>Total Trips</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums text-primary @[200px]/card:text-3xl">
                  {statistics.totalTrips}
                </CardTitle>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1 text-sm pt-0">
                <div className="text-muted-foreground text-xs">
                  Recorded journeys
                </div>
              </CardFooter>
            </Card>

            <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
              <CardHeader className="pb-3">
                <CardDescription>Total Distance</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums text-green-600 @[200px]/card:text-3xl">
                  {formatDistance(statistics.totalDistance)}
                </CardTitle>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1 text-sm pt-0">
                <div className="text-muted-foreground text-xs">
                  Combined traveled
                </div>
              </CardFooter>
            </Card>

            <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
              <CardHeader className="pb-3">
                <CardDescription>Total Time</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums text-blue-600 @[200px]/card:text-3xl">
                  {formatDuration(statistics.totalTime)}
                </CardTitle>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1 text-sm pt-0">
                <div className="text-muted-foreground text-xs">
                  Time on the road
                </div>
              </CardFooter>
            </Card>

            <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs">
              <CardHeader className="pb-3">
                <CardDescription>Max Speed</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums text-purple-600 @[200px]/card:text-3xl">
                  {statistics.maxSpeed.toFixed(1)} mph
                </CardTitle>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1 text-sm pt-0">
                <div className="text-muted-foreground text-xs">
                  Peak velocity
                </div>
              </CardFooter>
            </Card>
          </div>
        </section>
      )}

      {/* Search and Filters */}
      <section className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search trips by name, notes, or addresses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportData}
            disabled={trips.length === 0 || isLoading}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </section>

      {/* Trip List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-muted-foreground">
            {searchQuery ? `Search Results (${filteredTrips.length})` : 'All Trips'}
          </h2>
          {filteredTrips.length > 0 && (
            <Badge variant="secondary">
              {filteredTrips.length} trip{filteredTrips.length === 1 ? '' : 's'}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading trips...</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'No trips found' : 'No trips yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? `No trips match "${searchQuery}". Try a different search term.`
                  : 'Start your first GPS tracking adventure!'
                }
              </p>
              <Button onClick={() => navigate('/tracking')}>
                <Plus className="w-4 h-4 mr-2" />
                Start Your First Trip
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onSelect={handleTripSelect}
                onDelete={(id) => setDeleteConfirm(id)}
                showActions={true}
              />
            ))}
          </div>
        )}
      </section>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Trip</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this trip? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDeleteTrip(deleteConfirm)}
            >
              Delete Trip
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TripsPage