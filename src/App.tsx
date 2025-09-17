import { Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/error/ErrorBoundary'
import { NavigationHeader } from './components/layout/NavigationHeader'
import HomePage from './components/layout/HomePage'
import TrackingPage from './components/tracking/TrackingPage'
import TripsPage from './components/trips/TripsPage'
import TripDetailsPage from './components/trips/TripDetailsPage'
import ReplayPage from './components/replay/ReplayPage'
import SettingsPage from './components/layout/SettingsPage'
import DiagnosticsPage from './components/debug/DiagnosticsPage'
import { ApiTestDashboard } from './components/testing/ApiTestDashboard'
import { ApiSettingsPage } from './components/api-settings/ApiSettingsPage'
import { ApiTestingPage } from './components/api-testing/ApiTestingPage'
import { useMonitoring } from './utils/monitoring'
import { useEffect } from 'react'

function App() {
  const { logInfo } = useMonitoring()

  useEffect(() => {
    logInfo('App initialized', { version: '1.0.0' })
  }, [logInfo])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={
              <ErrorBoundary><HomePage /></ErrorBoundary>
            } />
            <Route path="/tracking" element={
              <ErrorBoundary><TrackingPage /></ErrorBoundary>
            } />
            <Route path="/trips" element={
              <ErrorBoundary><TripsPage /></ErrorBoundary>
            } />
            <Route path="/trips/:tripId" element={
              <ErrorBoundary><TripDetailsPage /></ErrorBoundary>
            } />
            <Route path="/replay/:tripId" element={
              <ErrorBoundary><ReplayPage /></ErrorBoundary>
            } />
            <Route path="/settings" element={
              <ErrorBoundary><SettingsPage /></ErrorBoundary>
            } />
            <Route path="/diagnostics" element={
              <ErrorBoundary><DiagnosticsPage /></ErrorBoundary>
            } />
            <Route path="/api-test" element={
              <ErrorBoundary><ApiTestDashboard /></ErrorBoundary>
            } />
            <Route path="/api-settings" element={
              <ErrorBoundary><ApiSettingsPage /></ErrorBoundary>
            } />
            <Route path="/api-testing" element={
              <ErrorBoundary><ApiTestingPage /></ErrorBoundary>
            } />
          </Routes>
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App