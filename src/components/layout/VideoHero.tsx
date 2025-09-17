import React from 'react'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Play } from 'lucide-react'

interface VideoHeroProps {
  onStartTracking: () => void
  onViewTrips: () => void
}

export const VideoHero: React.FC<VideoHeroProps> = ({ onStartTracking, onViewTrips }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        poster="/videos/hero-backround.jpg" // Optional: add a poster image
      >
        <source src="/videos/hero-backround.mp4" type="video/mp4" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-purple-900" />
      </video>

      {/* Dark Overlay for Better Text Readability */}
      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Content */}
      <div className="relative z-20 text-center px-6 max-w-4xl mx-auto">
        <div className="space-y-8">
          {/* Hero Title */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
              GPS Tracking
              <span className="block text-blue-400">Made Simple</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto leading-relaxed">
              Track your journeys with precision. Record trips, monitor speed,
              and explore your travel history with complete privacy.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={onStartTracking}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <MapPin className="w-6 h-6 mr-2" />
              Start Tracking
            </Button>
            <Button
              onClick={onViewTrips}
              variant="outline"
              size="lg"
              className="border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-8 py-4 text-lg font-semibold shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <Navigation className="w-6 h-6 mr-2" />
              View Trips
            </Button>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            <div className="rounded-lg p-6 text-center">
              <div className="flex justify-center mb-3">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Real-Time Tracking</h3>
              <p className="text-gray-300 text-sm">
                Monitor your location and speed with high precision GPS technology
              </p>
            </div>
            <div className="rounded-lg p-6 text-center">
              <div className="flex justify-center mb-3">
                <Navigation className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Trip History</h3>
              <p className="text-gray-300 text-sm">
                Save and replay your journeys with detailed route information
              </p>
            </div>
            <div className="rounded-lg p-6 text-center">
              <div className="flex justify-center mb-3">
                <Play className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Privacy First</h3>
              <p className="text-gray-300 text-sm">
                All data is stored locally - your location stays on your device
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <div className="animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  )
}