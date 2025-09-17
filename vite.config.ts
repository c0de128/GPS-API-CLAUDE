import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000, // Frontend port - standardized and permanent
    strictPort: true, // Fail if port is busy instead of using next available
    // HTTPS required for geolocation API in production
    // https: true, // Uncomment for production testing
    headers: {
      // Security headers that should be set via HTTP, not meta tags
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:; font-src 'self'; connect-src 'self' http://localhost:3003 ws://localhost:3003 https://api.openrouteservice.org https://*.tile.openstreetmap.org https://unpkg.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
      'X-Frame-Options': 'DENY',
    },
  },
  define: {
    global: 'globalThis',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
})