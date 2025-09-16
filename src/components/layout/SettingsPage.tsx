import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const SettingsPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">Settings</h1>
        <p className="text-muted-foreground mb-8">
          App preferences, units, and export options will be available here.
        </p>
        <Button onClick={() => navigate('/')}>
          Return to Home
        </Button>
      </div>
    </div>
  )
}

export default SettingsPage