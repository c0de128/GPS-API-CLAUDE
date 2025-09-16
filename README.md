# GPS Trip Tracker

A mobile-first web application for real-time GPS tracking, trip logging, and route management. Track your location, record trips with speed data, replay routes, and manage your travel history - all with complete privacy protection.

![GPS Trip Tracker](https://img.shields.io/badge/Status-In%20Development-yellow)
![License](https://img.shields.io/badge/License-MIT-blue)
![React](https://img.shields.io/badge/React-18+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)

## 🚀 Features

### ✅ Currently Implemented
- **Real-time GPS Tracking** - Live location monitoring with high accuracy
- **Interactive Maps** - Leaflet-based mapping with OpenStreetMap tiles
- **Mobile-First Design** - Responsive UI optimized for mobile devices
- **Privacy Protection** - All location data processed locally
- **Modern UI** - Built with shadcn/ui components and Tailwind CSS

### 🚧 In Development (Per PRD)
- **Speed Tracking** - Current, average, and maximum speed monitoring
- **Trip Management** - Create, name, and organize trips
- **Route Recording** - Automatic waypoint logging and route tracking
- **Data Persistence** - Local storage with IndexedDB/localStorage
- **Trip History** - View and manage past trips
- **Route Replay** - Playback trips with speed controls
- **Data Export** - Export trip data as JSON
- **Trip Analytics** - Distance, duration, and speed statistics

## 🏗️ Project Structure

```
gps-tracking-app/
├── .claude/                    # Claude Code configuration
│   └── GPS Trip Tracker - PRD.md
├── index.html                  # Main application (React component)
├── package.json               # Dependencies
├── .mcp.json                  # MCP server configuration
├── docs/                      # Documentation (this folder)
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── FEATURES.md
│   └── API.md
└── augments-mcp-server/       # MCP server for framework docs
```

## 🛠️ Technology Stack

- **Frontend**: React 18+ with TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS
- **Maps**: Leaflet with OpenStreetMap
- **Storage**: IndexedDB/localStorage (planned)
- **Build**: Vite (recommended)
- **Deployment**: Static hosting (Vercel, Netlify)

## 📱 Supported Devices

- **Mobile**: iOS Safari, Android Chrome
- **Desktop**: Chrome, Firefox, Safari, Edge
- **Requirements**: GPS/Location services enabled

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Modern browser with geolocation support
- Internet connection for map tiles

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gps-tracking-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Using the App

1. **Grant Location Permissions** - Allow browser access to your location
2. **Start Tracking** - Click "Start Tracking" to begin GPS monitoring
3. **View Live Map** - Watch your location update in real-time
4. **Stop Tracking** - Click "Stop Tracking" when finished

## 📋 Current vs Target Features

| Feature | Current Status | Target (PRD) | Priority |
|---------|---------------|--------------|----------|
| GPS Tracking | ✅ Implemented | ✅ Required | High |
| Interactive Maps | ✅ Implemented | ✅ Required | High |
| Speed Tracking | ❌ Missing | ✅ Required | High |
| Trip Management | ❌ Missing | ✅ Required | High |
| Data Persistence | ❌ Missing | ✅ Required | High |
| Route Replay | ❌ Missing | ✅ Required | Medium |
| Data Export | ❌ Missing | ✅ Required | Medium |
| Trip History | ❌ Missing | ✅ Required | Medium |

## 🎯 Implementation Roadmap

### Phase 1: Core Trip Features
- [ ] Speed tracking (current/avg/max)
- [ ] Trip data models and state management
- [ ] Local storage implementation
- [ ] Basic trip creation and management

### Phase 2: Advanced Features
- [ ] Route recording with waypoints
- [ ] Trip history and list view
- [ ] Route replay functionality
- [ ] Distance and duration calculations

### Phase 3: Enhanced UX
- [ ] Data export/import
- [ ] Trip search and filtering
- [ ] Performance optimizations
- [ ] Offline support improvements

## 🔧 Development

### MCP Servers Configured
- **Augments MCP** - Framework documentation and examples
- **shadcn MCP** - UI component management and installation

### Code Quality
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format
```

### Testing
```bash
# Run tests
npm test

# Coverage report
npm run test:coverage
```

## 🌐 Browser Compatibility

| Browser | GPS Support | Maps Support | Status |
|---------|-------------|--------------|--------|
| Chrome Mobile | ✅ | ✅ | Full Support |
| Safari Mobile | ✅ | ✅ | Full Support |
| Firefox Mobile | ✅ | ✅ | Full Support |
| Chrome Desktop | ✅ | ✅ | Full Support |
| Safari Desktop | ✅ | ✅ | Full Support |
| Firefox Desktop | ✅ | ✅ | Full Support |

## 🔒 Privacy & Security

- **No Server Storage** - All data processed locally
- **No Third-Party Tracking** - Location data never leaves your device
- **Secure HTTPS** - Required for geolocation API access
- **User Consent** - Explicit permission requests for location access

## 📖 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Feature Specifications](docs/FEATURES.md)
- [API Documentation](docs/API.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For questions and support:
- Create an issue in the repository
- Check the documentation in `/docs`
- Review the PRD in `.claude/GPS Trip Tracker - PRD.md`

---

**Built with ❤️ by Kevin McKay, DFW WEB GUY**