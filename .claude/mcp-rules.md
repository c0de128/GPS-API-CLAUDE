# MCP Server Usage Rules

## Overview

This document defines when and how to use each configured MCP server for the GPS Trip Tracker project development. The goal is to maximize efficiency and ensure the right tools are used for specific development tasks.

## Configured MCP Servers

### 1. **`augments`** (Hosted Framework Documentation)
- **URL**: https://mcp.augments.dev/mcp
- **Type**: HTTP MCP Server
- **Purpose**: Framework documentation and examples
- **Coverage**: 85+ frameworks across 8 categories

### 2. **`augments-local`** (Local Framework Documentation)
- **Command**: `uv run augments-mcp-server`
- **Type**: Local MCP Server
- **Purpose**: Same as hosted but runs locally
- **Use Case**: Offline development or customization

### 3. **`shadcn`** (UI Component Management)
- **Command**: `npx shadcn@latest mcp`
- **Type**: Local MCP Server
- **Purpose**: shadcn/ui component installation and management

---

## Task-Based Usage Rules

### 🗺️ **GPS & Location Features**

#### When to Use Augments Servers:
```bash
@augments get documentation for browser geolocation API implementation
@augments search for "GPS tracking best practices" in web frameworks
@augments get context for geolocation API, performance optimization, and error handling
@augments analyze this GPS tracking code for browser compatibility
```

**Use Cases**:
- Implementing GPS watchPosition functionality
- Calculating speed from location data
- Battery optimization for mobile GPS tracking
- Error handling for permission denied scenarios
- Background location tracking research

**Example Prompts**:
- "Get geolocation API documentation with error handling examples"
- "How to calculate speed from GPS coordinates accurately"
- "Best practices for mobile GPS battery optimization"

#### When NOT to Use:
- Basic GPS API syntax (use standard documentation)
- Simple coordinate display (straightforward implementation)

---

### 🗺️ **Map Integration (Leaflet)**

#### When to Use Augments Servers:
```bash
@augments get documentation for leaflet map integration with react
@augments get context for leaflet, react, and performance optimization
@augments search leaflet documentation for "polyline route tracking"
@augments get examples for leaflet marker clustering and route replay
```

**Use Cases**:
- Leaflet + React integration patterns
- Route polyline implementation
- Map performance optimization
- Custom marker and popup creation
- Route replay animation techniques

**Example Prompts**:
- "Show Leaflet React integration with TypeScript"
- "How to draw animated routes on Leaflet maps"
- "Leaflet performance optimization for mobile devices"

#### When NOT to Use:
- Basic map initialization (well-documented in Leaflet docs)
- Simple marker placement

---

### 🎨 **UI Components & Design**

#### When to Use shadcn Server:
```bash
@shadcn show me all available components in the shadcn registry
@shadcn add the dialog, sheet, and form components for trip management
@shadcn install components for data tables and charts
@shadcn search for navigation and mobile-friendly components
```

**Use Cases**:
- Installing new UI components for features
- Discovering components for trip management UI
- Mobile navigation components
- Form components for trip details
- Data visualization components for trip statistics

**Component Needs by Feature**:
- **Trip Management**: Dialog, Sheet, Form, Input, Textarea
- **Trip List**: Table, Card, Badge, Button
- **Route Replay**: Slider, Progress, Play/Pause buttons
- **Settings**: Switch, Select, Tabs
- **Data Export**: Download button, File input

#### When to Use Augments for UI:
```bash
@augments get tailwind css responsive design patterns
@augments get context for react, tailwindcss, and mobile-first design
@augments search for "mobile-first responsive layout patterns"
```

**Use Cases**:
- Mobile-first responsive design patterns
- Tailwind CSS best practices
- Performance optimization for mobile UI
- Accessibility guidelines

#### Priority Order:
1. **shadcn server** - For component installation and discovery
2. **Augments servers** - For design patterns and responsive layout

---

### ⚡ **Performance & Optimization**

#### When to Use Augments Servers:
```bash
@augments get context for react, performance optimization, and mobile development
@augments search for "react performance patterns for large datasets"
@augments get documentation for indexeddb performance optimization
@augments analyze this GPS tracking component for performance issues
```

**Use Cases**:
- React performance optimization
- Mobile battery usage optimization
- Large dataset handling (many trip waypoints)
- IndexedDB performance tuning
- Bundle size optimization

**Example Prompts**:
- "React performance patterns for real-time GPS tracking"
- "IndexedDB best practices for storing large route data"
- "Mobile web app performance optimization techniques"

---

### 💾 **Data Storage & Management**

#### When to Use Augments Servers:
```bash
@augments get documentation for indexeddb with typescript
@augments get context for indexeddb, data persistence, and performance
@augments search for "browser storage patterns for offline-first apps"
@augments get examples for data export formats (JSON, GPX, KML)
```

**Use Cases**:
- IndexedDB schema design
- Data migration strategies
- Export/import functionality
- Offline data synchronization
- Storage quota management

**Example Prompts**:
- "IndexedDB schema design for GPS trip data"
- "Implementing GPX export from GPS coordinates"
- "Browser storage best practices for offline apps"

---

### 📱 **Mobile Development**

#### When to Use Augments Servers:
```bash
@augments get context for react, mobile development, and progressive web apps
@augments search for "mobile web app best practices"
@augments get documentation for service workers and offline functionality
@augments analyze this component for mobile performance issues
```

**Use Cases**:
- Progressive Web App implementation
- Mobile touch interactions
- Offline functionality
- Service Worker integration
- Mobile-specific performance issues

**Example Prompts**:
- "PWA implementation for GPS tracking apps"
- "Mobile web app offline capabilities with service workers"
- "Touch-friendly UI patterns for mobile web"

---

## Development Workflow Integration

### 🔄 **Feature Development Workflow**

#### Phase 1: Research & Planning
```bash
# 1. Get framework context
@augments get context for [relevant frameworks] for [specific feature]

# 2. Check component availability
@shadcn show me components related to [feature area]

# 3. Get implementation examples
@augments get examples for [specific implementation pattern]
```

#### Phase 2: Implementation
```bash
# 1. Install required components
@shadcn add [component names] to my project

# 2. Get specific documentation
@augments get documentation for [specific API or pattern]

# 3. Analyze code for improvements
@augments analyze this [component/code] for [performance/compatibility/best practices]
```

#### Phase 3: Optimization
```bash
# 1. Performance analysis
@augments analyze this code for performance optimization opportunities

# 2. Mobile optimization
@augments get mobile optimization patterns for [specific feature]

# 3. Best practices review
@augments check this implementation against [framework] best practices
```

### 🐛 **Error Resolution Workflow**

#### GPS/Location Issues:
```bash
@augments search for "geolocation permission denied solutions"
@augments get error handling patterns for GPS tracking
```

#### UI/Component Issues:
```bash
@shadcn troubleshoot [component] installation or usage
@augments get tailwind css responsive design debugging
```

#### Performance Issues:
```bash
@augments analyze this component for React performance issues
@augments get optimization patterns for [specific performance problem]
```

---

## Priority and Fallback Rules

### 🎯 **Server Selection Priority**

#### For Framework Documentation:
1. **`augments`** (hosted) - Primary choice for speed and reliability
2. **`augments-local`** - Fallback for offline development or custom configs

#### For UI Components:
1. **`shadcn`** - Always use for component management
2. **`augments`** - Use for design patterns and styling guidance

#### For Multi-Framework Context:
1. **`augments`** - Best for combining multiple frameworks (React + Leaflet + Tailwind)

### 🚫 **When NOT to Use MCP Servers**

#### Skip MCP for:
- Basic syntax questions (use IDE autocomplete)
- Simple API calls with clear documentation
- Trivial component usage already implemented
- Quick debugging of obvious issues

#### Use Standard Documentation for:
- Official API references for well-documented APIs
- Basic TypeScript syntax
- Standard HTML/CSS questions

---

## Project-Specific Examples

### 🚀 **Common Development Scenarios**

#### Implementing Speed Tracking:
```bash
# Research phase
@augments get context for geolocation API, speed calculation, and performance optimization

# Implementation phase
@augments get examples for calculating speed from GPS coordinates
@shadcn add progress and badge components for speed display

# Optimization phase
@augments analyze this speed calculation code for accuracy and performance
```

#### Building Trip Management UI:
```bash
# Component discovery
@shadcn show me components for data management and forms

# Installation
@shadcn add dialog, form, input, textarea, button, card components

# Layout patterns
@augments get tailwindcss patterns for mobile-first data management UI
```

#### Implementing Route Replay:
```bash
# Research animation patterns
@augments get context for leaflet, react, and animation patterns

# Component needs
@shadcn add slider, progress, and playback control components

# Performance optimization
@augments get performance patterns for animating large datasets
```

### 📊 **Complex Feature Implementation**

#### Trip Statistics Dashboard:
```bash
# Multi-framework context
@augments get context for react, data visualization, and mobile design

# Component discovery
@shadcn search for chart, graph, and statistics display components

# Performance considerations
@augments analyze dashboard performance for large trip datasets
```

---

## Quality Assurance Rules

### ✅ **Code Review with MCP**

#### Before Implementing Major Features:
```bash
@augments get best practices for [feature type] in react applications
@augments analyze architectural patterns for [specific feature]
```

#### After Implementation:
```bash
@augments analyze this [component/feature] for:
- Performance optimization opportunities
- Mobile compatibility issues
- Accessibility concerns
- Security considerations
```

### 🔍 **Regular Health Checks**

#### Weekly MCP Server Health:
```bash
# Check server connectivity
claude mcp list

# Verify server functionality
@augments get framework info for react
@shadcn list available components
```

---

## Emergency Procedures

### 🚨 **MCP Server Issues**

#### If Hosted Augments Server is Down:
1. Switch to `augments-local` server
2. Use offline documentation as fallback
3. Report issue if persistent

#### If shadcn Server Fails:
1. Use manual shadcn CLI: `npx shadcn@latest add [component]`
2. Check component documentation directly
3. Verify npm/node setup

#### If All MCP Servers Fail:
1. Continue development with standard documentation
2. Queue MCP-dependent tasks for later
3. Check network connectivity and MCP configuration

---

## Success Metrics

### 📈 **Measuring MCP Effectiveness**

#### Track Usage Patterns:
- Which servers are used most frequently
- Success rate of MCP queries
- Time saved vs manual documentation lookup
- Quality of suggestions and examples

#### Development Velocity Indicators:
- Reduced time for framework research
- Fewer implementation iterations
- Improved code quality through best practices
- Faster component integration

---

*This rules file should be reviewed and updated as the project evolves and new MCP servers are added or requirements change.*