import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Copy,
  Download,
  Code,
  Globe,
  Book,
  ExternalLink,
  Terminal
} from 'lucide-react'

interface ApiDocumentation {
  name: string
  version: string
  description: string
  baseUrl: string
  authentication: {
    type: string
    methods: string[]
  }
  endpoints: Record<string, Record<string, string>>
  rateLimit: {
    global: string
    perEndpoint: string
  }
}

export function ApiDocumentation() {
  const [apiDocs, setApiDocs] = useState<ApiDocumentation | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript')
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('gps-status')

  useEffect(() => {
    const fetchApiDocs = async () => {
      try {
        const response = await fetch('http://localhost:3003/api')
        const data = await response.json()
        setApiDocs(data)
      } catch (error) {
        console.error('Failed to fetch API documentation:', error)
      }
    }

    fetchApiDocs()
  }, [])

  const codeExamples = {
    javascript: {
      'gps-status': `// Get GPS Status
const response = await fetch('http://localhost:3003/api/v1/gps/status', {
  headers: {
    'X-API-Key': 'your-api-key-here'
  }
});

const data = await response.json();
console.log(data);`,

      'gps-update': `// Update GPS Location
const locationData = {
  latitude: 40.7128,
  longitude: -74.0060,
  accuracy: 10,
  speed: 25
};

const response = await fetch('http://localhost:3003/api/v1/gps/location', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
  },
  body: JSON.stringify(locationData)
});

const result = await response.json();`,

      'trips-create': `// Create a New Trip
const tripData = {
  name: 'My Adventure Trip'
};

const response = await fetch('http://localhost:3003/api/v1/trips', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
  },
  body: JSON.stringify(tripData)
});

const trip = await response.json();`
    },

    python: {
      'gps-status': `import requests

# Get GPS Status
response = requests.get(
    'http://localhost:3003/api/v1/gps/status',
    headers={'X-API-Key': 'your-api-key-here'}
)

data = response.json()
print(data)`,

      'gps-update': `import requests

# Update GPS Location
location_data = {
    'latitude': 40.7128,
    'longitude': -74.0060,
    'accuracy': 10,
    'speed': 25
}

response = requests.post(
    'http://localhost:3003/api/v1/gps/location',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your-api-key-here'
    },
    json=location_data
)

result = response.json()`,

      'trips-create': `import requests

# Create a New Trip
trip_data = {
    'name': 'My Adventure Trip'
}

response = requests.post(
    'http://localhost:3003/api/v1/trips',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your-api-key-here'
    },
    json=trip_data
)

trip = response.json()`
    },

    curl: {
      'gps-status': `# Get GPS Status
curl -X GET \\
  http://localhost:3003/api/v1/gps/status \\
  -H "X-API-Key: your-api-key-here"`,

      'gps-update': `# Update GPS Location
curl -X POST \\
  http://localhost:3003/api/v1/gps/location \\
  -H "X-API-Key: your-api-key-here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 10,
    "speed": 25
  }'`,

      'trips-create': `# Create a New Trip
curl -X POST \\
  http://localhost:3003/api/v1/trips \\
  -H "X-API-Key: your-api-key-here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Adventure Trip"
  }'`
    }
  }

  const endpointExamples = [
    { id: 'gps-status', name: 'Get GPS Status', category: 'GPS' },
    { id: 'gps-update', name: 'Update GPS Location', category: 'GPS' },
    { id: 'trips-create', name: 'Create Trip', category: 'Trips' }
  ]

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const downloadDocumentation = () => {
    if (!apiDocs) return

    const docContent = JSON.stringify(apiDocs, null, 2)
    const blob = new Blob([docContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gps-api-documentation.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getCurrentExample = () => {
    const languageExamples = codeExamples[selectedLanguage as keyof typeof codeExamples]
    if (languageExamples && typeof languageExamples === 'object') {
      return languageExamples[selectedEndpoint as keyof typeof languageExamples] || ''
    }
    return ''
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                API Documentation
              </CardTitle>
              <CardDescription>
                Complete API reference with examples and integration guides
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={downloadDocumentation} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                View Online
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* API Overview */}
      {apiDocs && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                API Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">API Name</label>
                <p className="text-lg font-semibold">{apiDocs.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Version</label>
                <p><Badge variant="outline">{apiDocs.version}</Badge></p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Base URL</label>
                <p className="font-mono text-sm bg-muted p-2 rounded">{apiDocs.baseUrl}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm">{apiDocs.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="w-5 h-5" />
                Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <p><Badge>{apiDocs.authentication.type}</Badge></p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Methods</label>
                <div className="space-y-2">
                  {apiDocs.authentication.methods.map((method, index) => (
                    <code key={index} className="block text-sm bg-muted p-2 rounded">
                      {method}
                    </code>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Rate Limiting</label>
                <p className="text-sm">{apiDocs.rateLimit.global}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Code Examples
              </CardTitle>
              <CardDescription>
                Ready-to-use code snippets for popular programming languages
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {endpointExamples.map(example => (
                    <SelectItem key={example.id} value={example.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {example.category}
                        </Badge>
                        {example.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="curl">cURL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto">
                <code>{getCurrentExample()}</code>
              </pre>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(getCurrentExample())}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      {apiDocs && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              API Endpoints
            </CardTitle>
            <CardDescription>
              Complete list of available endpoints and their descriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(apiDocs.endpoints).map(([category, endpoints]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-lg font-semibold capitalize">
                    {category} Endpoints
                  </h3>
                  <div className="grid gap-3">
                    {Object.entries(endpoints).map(([endpoint, description]) => (
                      <div key={endpoint} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {endpoint.split(' ')[0]}
                          </Badge>
                          <code className="text-sm font-mono">{endpoint.split(' ')[1]}</code>
                        </div>
                        <span className="text-sm text-muted-foreground">{description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* WebSocket Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>WebSocket API</CardTitle>
          <CardDescription>
            Real-time communication using WebSocket connections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Connection URL</label>
            <code className="block text-sm bg-muted p-2 rounded mt-1">
              ws://localhost:3003/ws
            </code>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Authentication Message</label>
            <div className="bg-muted p-3 rounded-lg mt-1">
              <pre className="text-sm">
                <code>{`{
  "type": "auth",
  "data": {
    "apiKey": "your-api-key-here"
  }
}`}</code>
              </pre>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Subscribe to Updates</label>
            <div className="bg-muted p-3 rounded-lg mt-1">
              <pre className="text-sm">
                <code>{`{
  "type": "subscribe",
  "data": {
    "channels": ["gps", "trips", "system"]
  }
}`}</code>
              </pre>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Example JavaScript Client</label>
            <div className="bg-muted p-3 rounded-lg mt-1">
              <pre className="text-sm overflow-x-auto">
                <code>{`const ws = new WebSocket('ws://localhost:3003/ws');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    data: { apiKey: 'your-api-key-here' }
  }));

  // Subscribe to updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    data: { channels: ['gps', 'trips'] }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};`}</code>
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}