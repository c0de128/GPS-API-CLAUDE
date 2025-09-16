# Development Guide

## Getting Started

### Prerequisites

#### Required Software
- **Node.js** 16+ (recommended: 18+)
- **npm** 8+ or **pnpm** 7+
- **Git** for version control
- **VS Code** (recommended) with extensions:
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - ES7+ React/Redux/React-Native snippets

#### Required Browser Features
- **Geolocation API** support
- **HTTPS** context (for production)
- **IndexedDB** support (for data persistence)
- **Modern JavaScript** (ES2020+)

### Development Environment Setup

#### 1. Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd gps-tracking-app

# Install dependencies
npm install

# Or with pnpm
pnpm install
```

#### 2. Development Server
```bash
# Start development server
npm run dev

# Or with live reload
npm run dev:watch

# Open in browser
open http://localhost:3000
```

#### 3. HTTPS Setup (Required for GPS)
```bash
# Generate local SSL certificate
npm run setup:ssl

# Start with HTTPS
npm run dev:https
```

### Project Structure

```
gps-tracking-app/
├── src/                     # Source code (future)
│   ├── components/         # React components
│   ├── services/          # Business logic
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript definitions
│   ├── utils/             # Helper functions
│   └── styles/            # CSS and styling
├── public/                # Static assets
├── docs/                  # Documentation
├── .claude/               # Claude Code configuration
├── index.html             # Current main application
├── package.json           # Dependencies and scripts
├── .mcp.json             # MCP server configuration
├── tsconfig.json         # TypeScript configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── vite.config.ts        # Vite build configuration
```

## Development Workflow

### Current Development Pattern

Since the project currently uses a single `index.html` file with an embedded React component, development follows this pattern:

1. **Edit `index.html`** - Contains the main React component
2. **Test in Browser** - Open file directly or use live server
3. **Debug with DevTools** - Use browser console and React DevTools

### Recommended Migration to Modern Setup

For full development capabilities, migrate to a proper build system:

#### 1. Initialize Modern Setup
```bash
# Initialize Vite project
npm create vite@latest . -- --template react-ts

# Install additional dependencies
npm install @types/leaflet lucide-react
npm install -D tailwindcss postcss autoprefixer
```

#### 2. Configure Build Tools

**vite.config.ts**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    https: true, // Required for geolocation
    port: 3000,
  },
  define: {
    global: 'globalThis',
  },
})
```

**tailwind.config.js**
```javascript
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

#### 3. Component Migration

Extract components from `index.html` into separate files:

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── GPSTracker.tsx   # Main tracking component
│   ├── MapDisplay.tsx   # Map component
│   ├── TripManager.tsx  # Trip management
│   └── RouteReplay.tsx  # Route replay
├── services/
│   ├── gpsService.ts    # GPS functionality
│   ├── tripService.ts   # Trip management
│   └── storageService.ts # Data persistence
├── hooks/
│   ├── useGPS.ts        # GPS custom hook
│   ├── useTrips.ts      # Trip management hook
│   └── useLocalStorage.ts # Storage hook
└── types/
    ├── location.ts      # Location interfaces
    ├── trip.ts          # Trip interfaces
    └── index.ts         # Exports
```

## Code Standards

### TypeScript Configuration

**tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Code Style Guidelines

#### React Component Structure
```typescript
// Component template
interface ComponentNameProps {
  // Props interface
}

const ComponentName: React.FC<ComponentNameProps> = ({
  prop1,
  prop2
}) => {
  // State declarations
  const [state, setState] = useState<Type>(initialValue)

  // Custom hooks
  const { data, loading } = useCustomHook()

  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies])

  // Event handlers
  const handleEvent = useCallback(() => {
    // Handler logic
  }, [dependencies])

  // Render
  return (
    <div className="component-class">
      {/* JSX content */}
    </div>
  )
}

export default ComponentName
```

#### Service Pattern
```typescript
// Service template
interface ServiceInterface {
  method1(): Promise<ReturnType>
  method2(param: ParamType): ReturnType
}

class ServiceImplementation implements ServiceInterface {
  private property: Type

  constructor(config: ConfigType) {
    this.property = config.value
  }

  async method1(): Promise<ReturnType> {
    // Implementation
  }

  method2(param: ParamType): ReturnType {
    // Implementation
  }
}

export const serviceInstance = new ServiceImplementation(config)
```

### Testing Strategy

#### Unit Testing Setup
```bash
# Install testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event jsdom
```

**vitest.config.ts**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

#### Test Examples
```typescript
// Component test
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GPSTracker from '@/components/GPSTracker'

describe('GPSTracker', () => {
  it('should start tracking when button is clicked', async () => {
    // Mock geolocation
    const mockGeolocation = {
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    }

    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
    })

    render(<GPSTracker />)

    const startButton = screen.getByText('Start Tracking')
    fireEvent.click(startButton)

    expect(mockGeolocation.watchPosition).toHaveBeenCalled()
  })
})
```

#### Integration Testing
```typescript
// GPS service test
import { describe, it, expect, beforeEach } from 'vitest'
import { GPSService } from '@/services/gpsService'

describe('GPSService', () => {
  let gpsService: GPSService

  beforeEach(() => {
    gpsService = new GPSService()
  })

  it('should calculate speed correctly', () => {
    const location1 = { lat: 32.8998, lng: -97.0403, timestamp: 1000 }
    const location2 = { lat: 32.9000, lng: -97.0405, timestamp: 2000 }

    const speed = gpsService.calculateSpeed(location1, location2)

    expect(speed).toBeGreaterThan(0)
  })
})
```

## Debugging

### GPS Development

#### Testing GPS without Movement
```javascript
// Mock GPS data for testing
const mockLocations = [
  { lat: 32.8998, lng: -97.0403 }, // DFW Airport
  { lat: 32.9000, lng: -97.0405 }, // Slight movement
  { lat: 32.9002, lng: -97.0407 }, // More movement
]

// Simulate GPS updates
let index = 0
setInterval(() => {
  if (index < mockLocations.length) {
    const location = mockLocations[index]
    // Trigger location update
    index++
  }
}, 2000)
```

#### GPS Permission Issues
```javascript
// Check permission status
navigator.permissions.query({name: 'geolocation'})
  .then(result => {
    console.log('Geolocation permission:', result.state)
  })

// Handle different permission states
const handlePermissionDenied = () => {
  // Show instructions for enabling location
}
```

### Browser DevTools Setup

#### React DevTools
```bash
# Install React DevTools browser extension
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools
# Firefox: https://addons.mozilla.org/firefox/addon/react-devtools/
```

#### Location Spoofing (Chrome DevTools)
1. Open DevTools (F12)
2. Go to **Sensors** tab
3. Enable **Location** override
4. Set custom coordinates for testing

#### Network Debugging
```javascript
// Monitor map tile requests
fetch = new Proxy(fetch, {
  apply(target, thisArg, argumentsList) {
    console.log('Fetch:', argumentsList[0])
    return target.apply(thisArg, argumentsList)
  }
})
```

## Performance Optimization

### Bundle Size Optimization
```javascript
// Dynamic imports for large dependencies
const loadLeaflet = async () => {
  const L = await import('leaflet')
  return L.default
}

// Code splitting by route
const TripManager = lazy(() => import('@/components/TripManager'))
```

### GPS Performance
```typescript
// Optimized GPS options
const gpsOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000, // Cache for 5 seconds
}

// Debounced location updates
const debouncedLocationUpdate = useMemo(
  () => debounce(updateLocation, 1000),
  []
)
```

### Map Performance
```typescript
// Optimize marker updates
const updateMarker = useCallback((location: Location) => {
  if (!marker) return

  // Use setLatLng instead of removing/adding
  marker.setLatLng([location.latitude, location.longitude])
}, [marker])
```

## Deployment

### Development Build
```bash
# Build for development
npm run build:dev

# Preview build
npm run preview
```

### Production Build
```bash
# Build for production
npm run build

# Analyze bundle size
npm run analyze

# Deploy to static hosting
npm run deploy
```

### Environment Variables
```bash
# .env.local
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=false
```

## Troubleshooting

### Common Issues

#### GPS Not Working
- Ensure HTTPS in production
- Check browser permissions
- Verify device GPS settings
- Test with location spoofing

#### Map Not Loading
- Check network connectivity
- Verify tile server URLs
- Check console for CORS errors
- Ensure Leaflet scripts loaded

#### Build Errors
- Clear node_modules and reinstall
- Check TypeScript configuration
- Verify import paths
- Update dependencies

#### Performance Issues
- Profile with React DevTools
- Check bundle analyzer
- Monitor GPS update frequency
- Optimize re-renders with memo

### Getting Help

1. **Check Documentation** - Review all docs in `/docs`
2. **Search Issues** - Look for similar problems in repository
3. **Browser Console** - Check for JavaScript errors
4. **Network Tab** - Monitor API requests and failures
5. **Create Issue** - Provide detailed reproduction steps