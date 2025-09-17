# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development (Frontend)
npm run dev              # Start Vite dev server (port 3000, strictPort: true)
npm run build           # TypeScript compile + Vite build
npm run preview         # Preview production build

# API Server (run in separate terminal)
cd api-server && npm run dev    # Start API server on port 3003

# Code Quality (ALWAYS run after making code changes)
npm run lint            # ESLint check with TypeScript rules
npm run type-check      # TypeScript type checking without emit

# API Server Commands
cd api-server && npm run build    # Build API server TypeScript
cd api-server && npm run start    # Start production API server on port 3003
cd api-server && npm run type-check  # API server type checking

# Testing
npm run test            # Run all tests with Vitest
npm run test:watch      # Run tests in watch mode
npm run test:ui         # Run tests with Vitest UI
npm run test:coverage   # Run tests with coverage report (80% threshold)
npm run test:security   # Run security-specific tests only
```

## Project Overview

### GPS Trip Tracker
A **mobile-first GPS tracking application** for recording trips, tracking speed, and managing travel history with complete privacy protection. All location data is processed locally.

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui components (New York style) + Tailwind CSS
- **Maps**: Leaflet with OpenStreetMap tiles via react-leaflet
- **Routing**: React Router DOM v6
- **Storage**: Local storage/IndexedDB via `StorageService`
- **API Integration**: OpenRouteService for route planning

## Architecture Patterns

### Service Layer (`src/services/`)
- **GPSService**: Singleton for GPS state management, location tracking, speed calculations
- **StorageService**: IndexedDB/localStorage wrapper for trip persistence
- **OpenRouteService**: Route planning and geocoding API client
- **GeocodingService**: Reverse geocoding for converting coordinates to addresses
- **DemoTripSimulator**: Simulates GPS trips for testing/demo purposes
- **APIClient**: REST API client for backend communication
- **ApiWebSocketService**: WebSocket connection for real-time data sync

### Custom Hooks (`src/hooks/`)
Reactive interfaces for component state management:
- `useGPS()`: GPS tracking, speed monitoring, demo mode control
- `useTrip()`: Trip recording, waypoint management, trip state
- `useStorage()`: Data persistence operations with IndexedDB/localStorage
- `useReplay()`: Route replay with speed controls and playback functionality
- `useApiIntegration()`: Backend API connectivity and WebSocket management

### Data Models (`src/types/index.ts`)
- `LocationData`: GPS coordinates with accuracy and metadata
- `Trip`: Complete trip record with route, speeds, waypoints
- `RouteSegment`: Road segments with type and speed limits
- `DemoTripConfig`: Configuration for demo simulations
- `GPSState`: Current tracking state and permissions

## Key Implementation Details

### GPS Tracking Flow
1. **Permission Check**: `GPSService.checkPermission()` verifies geolocation access
2. **Watch Position**: Uses browser's `watchPosition` for continuous updates
3. **Speed Calculation**: Computes speed from distance/time between points
4. **State Updates**: Observer pattern notifies all subscribed hooks/components

### Trip Recording Process
1. **Start Trip**: `useTrip.startTrip()` creates new trip record
2. **Add Points**: GPS updates automatically added to route array
3. **Waypoints**: Manual or auto waypoints mark significant locations
4. **Save Trip**: Persisted to IndexedDB on stop/pause

### Demo Mode System
Simulates realistic GPS trips for testing:
- Uses OpenRouteService to fetch real route segments
- Applies road-type specific speeds (highway/residential/etc)
- Supports speed multipliers (1x, 2x, 5x) for faster playback
- Interpolates between waypoints for smooth movement

## Port Configuration

**Standardized Port Allocation:**
- **Frontend (Vite)**: Port 3000 - `npm run dev` (configured in vite.config.ts with strictPort: true)
- **API Server**: Port 3003 - `cd api-server && npm run dev`
- **External API Access**: Available at `http://localhost:3003/api/v1`

**Starting the Application:**
```bash
# Terminal 1: Start Frontend
npm run dev

# Terminal 2: Start API Server
cd api-server && npm run dev
```

**Note**: Frontend port is set to 3000 in vite.config.ts with `strictPort: true` to ensure consistent port allocation. If port 3000 is busy, the application will fail to start instead of silently using a different port.

## Environment Configuration

### Required `.env` Variables
```bash
# API Keys (Required)
VITE_OPENROUTESERVICE_TOKEN=your_api_key  # Get from https://openrouteservice.org/dev/#/signup
VITE_ADMIN_API_KEY=your_admin_api_key     # Generate secure random string

# API Server Configuration
VITE_API_BASE_URL=http://localhost:3003   # Backend URL (standardized on port 3003)

# Optional Development Settings
NODE_ENV=development                      # development | production
# LOG_LEVEL=info                          # error | warn | info | debug
# DEFAULT_RATE_LIMIT=100                  # API requests per minute
```

### Environment Setup
- **Copy template**: `cp .env.example .env` and configure required variables
- **OpenRouteService**: Get free key at https://openrouteservice.org/dev/#/signup
- **Admin API Key**: Generate with `openssl rand -base64 32` or similar
- Required for demo trips, route planning, and API server features

## Development Guidelines

### Path Aliases
- `@/*` maps to `src/*` (configured in tsconfig.json and Vite)

### Mobile Considerations
- Touch-optimized UI components
- Responsive layouts with Tailwind breakpoints
- Battery-efficient GPS tracking intervals
- Offline-first data storage

### Testing Framework
- **Test Runner**: Vitest with jsdom environment (`vitest.config.ts`)
- **Testing Library**: React Testing Library + Jest DOM matchers
- **Setup File**: `src/test/setup.ts` - global mocks for geolocation, storage, fetch
- **Coverage**: V8 provider with 80% threshold for branches, functions, lines, statements
- **Security Tests**: Separate test suite in `src/test/security/`
- **Test Helpers**: Custom utilities in `src/test/helpers/test-utils.tsx`
- **Mocked APIs**: Geolocation, localStorage, permissions, performance observers

### Security Notes
- **HTTPS Required**: Geolocation API requires HTTPS in production
- **Privacy-First**: All location data stored locally, not transmitted to servers
- **CSP Headers**: Content Security Policy configured in `vite.config.ts`
- **Environment Variables**: Sensitive configuration via `.env` files
- **No Hardcoded Secrets**: API keys and tokens managed through environment
- **Input Validation**: Utility functions in `src/utils/inputValidation.ts`
- **Error Handling**: Centralized error management in `src/utils/errorHandler.ts`

## MCP Servers
- **shadcn**: Component installation and management (`npx shadcn@latest add`)
- **augments**: Framework documentation and examples

## Sub-Agents
- **Technical Consultant** (`.claude/agents/`): Architecture and technology recommendations

## Utilities and Monitoring
- **Performance**: `src/utils/performance.ts` - Web Vitals and performance tracking
- **Monitoring**: `src/utils/monitoring.ts` - Application health and diagnostics
- **Logging**: `src/utils/logger.ts` - Structured logging with different levels
- **Error Handling**: `src/utils/errorHandler.ts` - Centralized error management
- **Input Validation**: `src/utils/inputValidation.ts` - Data sanitization and validation