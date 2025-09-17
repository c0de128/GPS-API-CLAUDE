# 🛰️ GPS API Access Guide - Beginner Friendly

This guide will help you access vehicle coordinates from another window using the GPS Tracking API.

## 📊 **What You Have Available**

✅ **Frontend App**: Running at `http://localhost:3000` (GPS tracking interface)
✅ **API Server**: Running at `http://localhost:3003` (REST API endpoints)
✅ **Demo Trip**: Vehicle moving between Allen, TX and Euless, TX

## 🔑 **API Authentication**

The API server provides these development keys (already configured):

- **Development Key**: `gps_dev_1452bec4359a449aa8b35c97adcbb900`
- **Admin Key**: `gps_admin_28f24742193a4b3eb45612c3248fb6ee`

## 🌐 **Available GPS API Endpoints**

### 1. **Get Current Vehicle Location**
```
GET http://localhost:3003/api/v1/gps/location
Headers: X-API-Key: gps_dev_1452bec4359a449aa8b35c97adcbb900
```

### 2. **Get Location History**
```
GET http://localhost:3003/api/v1/gps/location/history?limit=10
Headers: X-API-Key: gps_dev_1452bec4359a449aa8b35c97adcbb900
```

### 3. **Get GPS Status**
```
GET http://localhost:3003/api/v1/gps/status
Headers: X-API-Key: gps_dev_1452bec4359a449aa8b35c97adcbb900
```

## 🛠️ **Method 1: Using curl (Command Line)**

Open a new command prompt window and run:

```bash
# Get current vehicle coordinates
curl -H "X-API-Key: gps_dev_1452bec4359a449aa8b35c97adcbb900" http://localhost:3003/api/v1/gps/location

# Get last 5 locations
curl -H "X-API-Key: gps_dev_1452bec4359a449aa8b35c97adcbb900" "http://localhost:3003/api/v1/gps/location/history?limit=5"
```

## 🌐 **Method 2: Using a Web Browser**

Since the `/location` endpoint supports optional authentication, you can access it directly:

```
http://localhost:3003/api/v1/gps/location
```

**Note**: Open this URL in a new browser window/tab while your demo trip is running.

## 📱 **Method 3: Using JavaScript (Browser Console)**

Open browser console (F12) on any web page and run:

```javascript
// Get current vehicle location
fetch('http://localhost:3003/api/v1/gps/location', {
  headers: {
    'X-API-Key': 'gps_dev_1452bec4359a449aa8b35c97adcbb900'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Current Location:', data);
  if (data.success) {
    const location = data.data;
    console.log(`Vehicle is at: ${location.latitude}, ${location.longitude}`);
    console.log(`Speed: ${location.speed} m/s`);
    console.log(`Accuracy: ±${location.accuracy}m`);
  }
});

// Poll for updates every 2 seconds
setInterval(() => {
  fetch('http://localhost:3003/api/v1/gps/location', {
    headers: {
      'X-API-Key': 'gps_dev_1452bec4359a449aa8b35c97adcbb900'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      const location = data.data;
      console.log(`[${new Date().toLocaleTimeString()}] Vehicle: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} | Speed: ${(location.speed * 2.237).toFixed(1)} mph`);
    }
  });
}, 2000);
```

## 🔧 **Method 4: Using Postman or Insomnia**

1. **Install Postman** (free): https://www.postman.com/downloads/
2. **Create a new GET request**:
   - URL: `http://localhost:3003/api/v1/gps/location`
   - Headers: `X-API-Key: gps_dev_1452bec4359a449aa8b35c97adcbb900`
3. **Click Send** to get current coordinates

## 📋 **Response Format**

You'll receive JSON responses like this:

```json
{
  "success": true,
  "data": {
    "latitude": 33.103100,
    "longitude": -96.670600,
    "accuracy": 7.2,
    "timestamp": 1734543210000,
    "altitude": 245.6,
    "heading": 125.4,
    "speed": 15.65
  },
  "timestamp": "2024-12-18T15:30:10.123Z"
}
```

**Coordinate Fields**:
- `latitude`: North/South position (decimal degrees)
- `longitude`: East/West position (decimal degrees)
- `speed`: Vehicle speed in meters per second
- `heading`: Direction in degrees (0-360)
- `accuracy`: GPS accuracy in meters
- `timestamp`: When location was recorded

## 🎯 **Testing Steps**

1. **Start the demo trip** at `http://localhost:3000`
2. **Open a new window/tab** and try any of the methods above
3. **You should see real coordinates** updating as the vehicle moves
4. **Try refreshing** or polling to see the coordinates change

## 🔍 **Troubleshooting**

- **"No GPS location data available"**: Make sure the demo trip is actively running
- **"Authentication required"**: Check that you're using the correct API key
- **Connection refused**: Ensure the API server is running on port 3003

## 🚀 **Next Steps**

Once you can access the coordinates, you can:
- Build your own tracking dashboard
- Create mobile apps that consume the API
- Set up alerts based on location
- Integrate with mapping services
- Store data in your own database

The API supports real-time updates, so you can poll it or use WebSocket connections for live tracking!