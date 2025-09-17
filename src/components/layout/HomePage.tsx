import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation, Shield, Zap, ChevronDown, ChevronUp, Route, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { VideoHero } from './VideoHero'
import { FAQItem } from '@/types'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)

  const faqData: FAQItem[] = [
    {
      question: "How accurate is the GPS tracking?",
      answer: "GPS accuracy typically ranges from 3-5 meters under optimal conditions. Accuracy may vary based on device capabilities, weather conditions, and surrounding environment."
    },
    {
      question: "Is my location data stored or shared?",
      answer: "No, your location data is processed locally in your browser and is not stored on our servers or shared with third parties. Your privacy is our top priority."
    },
    {
      question: "Does this work on mobile devices?",
      answer: "Yes! Our GPS tracking works on all modern mobile devices and desktop browsers that support geolocation services."
    },
    {
      question: "Why do I need to grant location permissions?",
      answer: "Location permissions are required to access your device's GPS data. Without these permissions, we cannot provide real-time location tracking."
    },
    {
      question: "Can I use this offline?",
      answer: "The GPS tracking functionality works offline, but map tiles require an internet connection to load. Previously loaded map areas may be cached by your browser."
    },
    {
      question: "How do I manage my trip history?",
      answer: "All your trips are saved locally in your browser. You can view, replay, and export your trip data anytime. Your data persists between browser sessions."
    }
  ]

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index)
  }

  const handleStartTracking = () => {
    navigate('/tracking')
  }

  const handleViewTrips = () => {
    navigate('/trips')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Video Hero Section */}
      <VideoHero
        onStartTracking={handleStartTracking}
        onViewTrips={handleViewTrips}
      />

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powerful Trip Tracking Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need for comprehensive GPS trip tracking and management
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs hover:shadow-md transition-all text-center">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Real-time Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Live GPS tracking with speed monitoring, route recording, and automatic waypoint logging for accurate trip documentation.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs hover:shadow-md transition-all text-center">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Route className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Trip Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Create, name, and organize your trips. View detailed statistics including distance, duration, and speed analytics.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs hover:shadow-md transition-all text-center">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Route Replay</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Replay your recorded routes with adjustable speed controls. Analyze your trip patterns and share your adventures.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs hover:shadow-md transition-all text-center">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">High Precision</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Advanced GPS algorithms provide meter-level accuracy for precise location tracking and detailed route recording.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs hover:shadow-md transition-all text-center">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Privacy First</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Your location data stays on your device. No cloud storage, no tracking, no sharing - complete privacy guaranteed.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs hover:shadow-md transition-all text-center">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Navigation className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Export & Share</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Export your trip data in multiple formats including JSON, GPX, and KML for backup or sharing with other apps.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick Stats Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Start Tracking?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of users who trust our GPS tracker for their adventures
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">100%</div>
              <div className="text-sm text-muted-foreground">Privacy Protected</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">3-5m</div>
              <div className="text-sm text-muted-foreground">GPS Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">∞</div>
              <div className="text-sm text-muted-foreground">Trip Storage</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">📱</div>
              <div className="text-sm text-muted-foreground">Mobile Optimized</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get answers to common questions about our GPS trip tracking service
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqData.map((faq, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleFAQ(index)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                    {expandedFAQ === index ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {expandedFAQ === index && (
                  <CardContent>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Start Your First Trip Today
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Experience the most accurate and private GPS trip tracking available. No signup required.
            </p>
            <Button onClick={handleStartTracking} size="lg" className="text-lg px-8">
              <MapPin className="w-5 h-5 mr-2" />
              Begin Tracking Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Navigation className="w-8 h-8 text-primary mr-2" />
              <span className="text-2xl font-bold text-foreground">GPS Trip Tracker</span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Reliable, accurate, and privacy-focused GPS trip tracking for everyone.
            </p>
            <div className="flex justify-center space-x-6 text-sm text-muted-foreground mb-4">
              <span>© 2024 GPS Trip Tracker. All rights reserved.</span>
            </div>
            <div className="flex justify-center space-x-4">
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate('/diagnostics')}
                className="text-xs text-muted-foreground"
              >
                App Diagnostics
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate('/api-test')}
                className="text-xs text-muted-foreground"
              >
                API Testing
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate('/api-settings')}
                className="text-xs text-muted-foreground"
              >
                API Settings
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage