import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  MapPin,
  Navigation,
  Route,
  Settings,
  Home,
  Menu,
  X,
  TestTube,
  Server,
  Bug
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface NavigationItem {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

interface NavigationHeaderProps {
  className?: string
}

export function NavigationHeader({ className }: NavigationHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const primaryNavItems: NavigationItem[] = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/tracking', label: 'Tracking', icon: Navigation },
    { path: '/trips', label: 'Trips', icon: Route },
    { path: '/settings', label: 'Settings', icon: Settings }
  ]

  const secondaryNavItems: NavigationItem[] = [
    { path: '/api-settings', label: 'API Settings', icon: Server },
    { path: '/api-test', label: 'API Test', icon: TestTube },
    { path: '/diagnostics', label: 'Diagnostics', icon: Bug }
  ]

  const isActiveRoute = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    setIsMobileMenuOpen(false)
  }

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-2">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">GPS Tracker</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon
              const isActive = isActiveRoute(item.path)

              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleNavigation(item.path)}
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              )
            })}
          </nav>

          {/* Desktop Secondary Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <Server className="h-4 w-4" />
                  <span>Developer</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = isActiveRoute(item.path)

                  return (
                    <DropdownMenuItem
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={cn(
                        "flex items-center space-x-2 cursor-pointer",
                        isActive && "bg-accent"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center space-x-2"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="py-4 space-y-2">
              {/* Primary Navigation */}
              <div className="space-y-1">
                {primaryNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = isActiveRoute(item.path)

                  return (
                    <Button
                      key={item.path}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleNavigation(item.path)}
                      className="w-full justify-start flex items-center space-x-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  )
                })}
              </div>

              {/* Secondary Navigation */}
              <div className="pt-2 border-t">
                <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                  Developer Tools
                </div>
                <div className="space-y-1">
                  {secondaryNavItems.map((item) => {
                    const Icon = item.icon
                    const isActive = isActiveRoute(item.path)

                    return (
                      <Button
                        key={item.path}
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleNavigation(item.path)}
                        className="w-full justify-start flex items-center space-x-2"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}