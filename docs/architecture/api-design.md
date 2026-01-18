# API Design

### REST API Conventions

**Response Format:**
```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: {
    message: string,
    code: string
  }
}
```

### Key API Endpoints

**1. Project Management:**
```typescript
// GET /api/projects
// List all projects ordered by last_active (most recent first)
Response: {
  success: true,
  data: {
    projects: Array<{
      id: string,
      name: string,
      topic: string | null,
      currentStep: string,
      lastActive: string,  // ISO 8601 timestamp
      createdAt: string
    }>
  }
}

// POST /api/projects
// Create new project
Request: {
  name?: string  // Optional, defaults to "New Project"
}

Response: {
  success: true,
  data: {
    project: {
      id: string,
      name: string,
      currentStep: 'topic',
      createdAt: string,
      lastActive: string
    }
  }
}

// GET /api/projects/:id
// Get single project details
Response: {
  success: true,
  data: {
    project: {
      id: string,
      name: string,
      topic: string | null,
      currentStep: string,
      createdAt: string,
      lastActive: string
    }
  }
}

// PUT /api/projects/:id
// Update project metadata (name, last_active)
Request: {
  name?: string,
  topic?: string,
  currentStep?: string
}

Response: {
  success: true,
  data: {
    project: { /* updated project */ }
  }
}

// DELETE /api/projects/:id (Optional for MVP)
// Delete project and all associated messages
Response: {
  success: true,
  data: {
    deleted: true,
    projectId: string
  }
}
```

**2. Chat/Conversation:**
```typescript
// POST /api/chat
Request: {
  projectId: string,
  message: string
}

Response: {
  success: true,
  data: {
    messageId: string,
    response: string,
    timestamp: string
  }
}
```

**3. Script Generation:**
```typescript
// POST /api/script
Request: {
  projectId: string,
  topic: string
}

Response: {
  success: true,
  data: {
    scenes: Array<{
      sceneNumber: number,
      text: string
    }>
  }
}
```

**3. Voice Operations:**
```typescript
// GET /api/voice/list
Response: {
  success: true,
  data: {
    voices: Array<{
      id: string,
      name: string,
      gender: 'male' | 'female',
      language: string,
      previewUrl: string
    }>
  }
}

// POST /api/voice/generate
Request: {
  projectId: string,
  sceneNumber: number,
  text: string,
  voiceId: string
}

Response: {
  success: true,
  data: {
    audioPath: string,
    duration: number
  }
}
```

**4. Visual Sourcing Operations (Epic 3):**
```typescript
// POST /api/projects/[id]/generate-visuals
// Trigger YouTube API sourcing for all scenes
Request: {
  // projectId from URL parameter [id]
}

Response: {
  success: true,
  data: {
    projectId: string,
    scenesProcessed: number,
    totalSuggestions: number,
    status: 'completed' | 'partial',
    failedScenes?: Array<{
      sceneId: string,
      sceneNumber: number,
      error: string
    }>
  }
}

// Error Responses:
{
  success: false,
  error: {
    message: "YouTube API quota exceeded. Try again tomorrow.",
    code: "YOUTUBE_QUOTA_EXCEEDED"
  }
}

{
  success: false,
  error: {
    message: "YouTube API key not configured. Add YOUTUBE_API_KEY to .env.local",
    code: "YOUTUBE_API_KEY_MISSING"
  }
}

// GET /api/projects/[id]/visual-suggestions
// Retrieve all visual suggestions for project
Response: {
  success: true,
  data: {
    suggestions: Array<{
      sceneId: string,
      sceneNumber: number,
      sceneText: string,
      videos: Array<{
        id: string,
        videoId: string,
        title: string,
        thumbnailUrl: string,
        channelTitle: string,
        embedUrl: string,
        rank: number
      }>
    }>
  }
}

// GET /api/projects/[id]/visual-suggestions?sceneId={sceneId}
// Retrieve suggestions for specific scene
Response: {
  success: true,
  data: {
    sceneId: string,
    sceneNumber: number,
    videos: Array<{
      id: string,
      videoId: string,
      title: string,
      thumbnailUrl: string,
      channelTitle: string,
      embedUrl: string,
      rank: number
    }>
  }
}
```

**5. Video Assembly:**
```typescript
// POST /api/assembly
Request: {
  projectId: string
}

Response: {
  success: true,
  data: {
    videoPath: string,
    thumbnailPath: string,
    duration: number,
    fileSize: number
  }
}
```

**6. Provider Configuration (Epic 6 - Interim Implementation):**
```typescript
// GET /api/providers
// Returns configured video providers from mcp_servers.json
// This endpoint allows the UI to dynamically load provider configuration

Response: {
  providers: Array<{
    id: string,           // Provider identifier (dvids, nasa, youtube)
    name: string,         // Display name
    priority: number,     // Priority for fallback (1 = highest)
    enabled: boolean,     // Whether provider is active
    command?: string,     // MCP server command (for MCP providers)
    args?: string[]       // MCP server arguments
  }>
}

// Success Example:
{
  "providers": [
    {
      "id": "dvids",
      "name": "DVIDS Military Videos",
      "priority": 1,
      "enabled": true,
      "command": "python",
      "args": ["-m", "mcp_servers.dvids_scraping_server"]
    },
    {
      "id": "nasa",
      "name": "NASA Space Videos",
      "priority": 2,
      "enabled": true,
      "command": "python",
      "args": ["-m", "mcp_servers.nasa_scraping_server"]
    },
    {
      "id": "youtube",
      "name": "YouTube Videos",
      "priority": 3,
      "enabled": true
    }
  ]
}

// Error Responses:
// 404 - Configuration file not found
{
  "error": "CONFIG_NOT_FOUND",
  "message": "Provider configuration file not found. Ensure config/mcp_servers.json exists."
}

// 500 - Invalid JSON or other errors
{
  "error": "INVALID_CONFIG",
  "message": "Invalid JSON in configuration file: ..."
}
```

**Usage Example:**
```typescript
// Fetch providers dynamically in React component
useEffect(() => {
  fetch('/api/providers')
    .then(res => res.json())
    .then(data => {
      const providers = data.providers.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || `${p.name} video content`,
        priority: p.priority,
        enabled: p.enabled,
        status: p.enabled ? 'checking' : 'offline'
      }));
      setProviders(providers);
    })
    .catch(err => {
      // Fallback to hardcoded defaults
      setProviders(DEFAULT_PROVIDERS);
    });
}, [isOpen]);
```

---
