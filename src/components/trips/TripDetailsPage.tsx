import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TripDetailsPage: React.FC = () => {
  const navigate = useNavigate()
  const { tripId } = useParams<{ tripId: string }>()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/trips')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Trips
          </Button>
          <h1 className="text-2xl font-bold">Trip Details</h1>
          <div /> {/* Spacer */}
        </div>

        <div className="text-center py-20">
          <h2 className="text-3xl font-bold mb-4">Trip Details Coming Soon</h2>
          <p className="text-muted-foreground mb-8">
            Detailed trip information and statistics for Trip ID: {tripId}
          </p>
          <Button onClick={() => navigate('/trips')}>
            Back to Trips
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TripDetailsPage