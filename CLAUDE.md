# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev              # Start Vite dev server on port 3000
npm run build           # TypeScript compile + Vite build
npm run preview         # Preview production build

# Code Quality
npm run lint            # ESLint check with TypeScript rules
npm run type-check      # TypeScript type checking without emit
```

## Project Architecture

### Core Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components with Tailwind CSS (New York style)
- **Maps**: Leaflet with OpenStreetMap tiles via react-leaflet
- **Routing**: React Router DOM v6
- **Storage**: Local storage/IndexedDB (partially implemented)

### Application Structure
This is a **mobile-first GPS tracking application** with the following core features:
- Real-time GPS tracking with speed monitoring
- Interactive map visualization
- Trip recording and management
- Route replay functionality

### Key Architectural Patterns

**Service Layer Pattern**: GPS functionality is centralized in `GPSService` class (`src/services/gpsService.ts`) with:
- Singleton pattern for state management
- Observer pattern for state updates
- Speed calculation and session management

**Hook-based State Management**: Custom hooks provide reactive interfaces:
- `useGPS()` - GPS tracking state and operations
- `useTrip()` - Trip management and recording
- `useStorage()` - Data persistence layer

**Component Architecture**:
```
src/components/
├── layout/        # App-level layout components (HomePage, SettingsPage)
├── tracking/      # Real-time tracking UI (TrackingPage, LiveMap, SpeedDashboard)
├── trips/         # Trip management (TripsPage, TripCard, TripDetailsPage)
├── replay/        # Route replay functionality
└── ui/           # shadcn/ui base components
```

### Data Models
Core interfaces in `src/types/index.ts`:
- `LocationData` - GPS coordinates with metadata
- `Trip` - Complete trip with route, speeds, waypoints
- `SpeedData` - Speed measurements with location
- `GPSState` - Current tracking state

### Path Aliases
- `@/*` maps to `src/*` (configured in both tsconfig.json and Vite)

### Development Notes
- **HTTPS Required**: Geolocation API requires HTTPS in production
- **Mobile-First**: UI optimized for mobile devices and touch interfaces
- **Privacy-Focused**: All location data processed locally, no server storage
- **Real-time Updates**: GPS service uses `watchPosition` for continuous tracking

### MCP Servers Available
- **augments-mcp-server**: Framework documentation and examples
- **shadcn**: UI component management and installation