#!/usr/bin/env node

// Simulate a moving GPS device for testing API
const API_BASE = 'http://localhost:3003/api/v1';
const API_KEY = 'gps_dev_1452bec4359a449aa8b35c97adcbb900';

// Starting position (Dallas, TX area)
let lat = 32.7767;
let lng = -96.7970;
let heading = 45; // Northeast direction
let speed = 25; // m/s (about 56 mph)

console.log('🚗 Starting GPS simulation...');
console.log('📍 Starting at:', lat.toFixed(6), lng.toFixed(6));
console.log('🎯 Test page: http://127.0.0.1:5500/test-api-access.html');
console.log('⏰ Sending location updates every 2 seconds');
console.log('🛑 Press Ctrl+C to stop\n');

async function sendLocation() {
    // Calculate movement (very simple)
    const deltaLat = (speed * Math.cos(heading * Math.PI / 180)) / 111111; // rough conversion
    const deltaLng = (speed * Math.sin(heading * Math.PI / 180)) / (111111 * Math.cos(lat * Math.PI / 180));

    lat += deltaLat;
    lng += deltaLng;

    // Add some variation
    speed += (Math.random() - 0.5) * 2; // Vary speed slightly
    heading += (Math.random() - 0.5) * 10; // Vary direction slightly

    // Keep speed reasonable
    speed = Math.max(5, Math.min(35, speed));

    const locationData = {
        latitude: lat,
        longitude: lng,
        speed: speed,
        heading: heading,
        accuracy: 5 + Math.random() * 10, // 5-15m accuracy
        altitude: 200 + Math.random() * 50,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch(`${API_BASE}/gps/location`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify(locationData)
        });

        const result = await response.json();

        if (result.success) {
            console.log(`📍 ${lat.toFixed(6)}, ${lng.toFixed(6)} | ${speed.toFixed(1)} m/s | ${heading.toFixed(0)}°`);
        } else {
            console.error('❌ API Error:', result.error);
        }
    } catch (error) {
        console.error('💥 Network Error:', error.message);
    }
}

// Send initial location
sendLocation();

// Send location updates every 2 seconds
const interval = setInterval(sendLocation, 2000);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping GPS simulation...');
    clearInterval(interval);
    process.exit(0);
});