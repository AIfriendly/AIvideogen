# Story 6.9: MCP Video Provider Client Architecture

**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
**Status:** done
**Priority:** P2 (Medium - Deferred Feature)
**Points:** 5
**Dependencies:** None (standalone infrastructure)
**Created:** 2026-01-17
**Developer:** TBD

---

## Story Description

Build an MCP (Model Context Protocol) client architecture for connecting to local video provider MCP servers. This architecture will enable the application to use custom web scraping MCP servers (DVIDS, NASA) without implementing web scraping directly in the main application.

**User Value:** Enables automated video production with domain-specific content sources (military footage from DVIDS, space footage from NASA) through extensible MCP server architecture. Future videos can auto-select visuals from these specialized sources.

**Note:** This story is part of **Feature 2.9 (Domain-Specific Content APIs)** and provides the MCP client layer. The actual MCP servers (DVIDS, NASA) will be implemented in separate stories (6.10, 6.11).

---

## User Story

**As a** developer building the video production pipeline,
**I want** an MCP client architecture for connecting to local video provider MCP servers,
**So that** the app can use our custom scraping MCP servers without implementing web scraping directly.

---

## Acceptance Criteria

### AC-6.9.1: VideoProviderClient Class

**Given** the project has the MCP client library installed
**When** the VideoProviderClient architecture is implemented
**Then** the system shall provide:
- `VideoProviderClient` class for connecting to local MCP servers via stdio transport
- Constructor accepts server configuration (command, args, env)
- Methods: `search_videos(query, duration)`, `download_video(video_id)`, `get_video_details(video_id)`
- Error handling for MCP-specific failures (connection errors, timeout, server unavailable)

### AC-6.9.2: Configuration Schema

**Given** the MCP client architecture exists
**When** video provider servers are configured
**Then** the system shall:
- Store configuration in `config/mcp_servers.json`
- Define provider commands (e.g., `python -m mcp_servers.dvids`)
- Define provider priorities for fallback logic
- Support environment variables for each provider

### AC-6.9.3: Provider Registry Pattern

**Given** multiple video providers are configured
**When** the application needs video content
**Then** the provider registry shall:
- Manage multiple video sources (DVIDS, NASA, future providers)
- Execute provider commands in priority order
- Handle provider failures gracefully and try next provider
- Return video results from first successful provider

### AC-6.9.4: MCP Client Integration

**Given** an MCP video provider server is running
**When** the VideoProviderClient calls a provider method
**Then** the client shall:
- Spawn the MCP server process via stdio transport
- Send JSON-RPC requests using MCP protocol
- Parse responses and return structured video data
- Clean up server process after request completes

### AC-6.9.5: Unit Tests

**Given** the VideoProviderClient architecture is implemented
**When** unit tests are executed
**Then** the tests shall validate:
- Client interface with mock MCP servers
- Error handling for connection failures
- Provider registry fallback logic
- Configuration parsing and validation

---

## Technical Design

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                  MCP Video Provider Architecture                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Video Sourcing (Epic 5 - Quick Production Flow)         │   │
│  │     - Calls VideoProviderClient.search_videos()          │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ProviderRegistry                                         │   │
│  │     - Loads config/mcp_servers.json                       │   │
│  │     - Manages provider instances                          │   │
│  │     - Executes fallback logic                             │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │                                          │
│         ┌─────────────┼─────────────┐                           │
│         ▼             ▼             ▼                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ DVIDS    │  │ NASA     │  │ Future   │  (MCP Servers)        │
│  │ Provider │  │ Provider │  │ Provider │  - stdio transport    │
│  │ Client   │  │ Client   │  │ Client   │  - JSON-RPC protocol  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                      │
│       │             │             │                             │
│       ▼             ▼             ▼                             │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  Local MCP Servers (Python)                          │      │
│  │  - python -m mcp_servers.dvids                       │      │
│  │  - python -m mcp_servers.nasa                        │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
lib/
├── mcp/
│   ├── index.ts                          # Main exports
│   ├── video-provider-client.ts          # VideoProviderClient class
│   ├── provider-registry.ts              # Provider management
│   └── types.ts                          # MCP interface types
config/
└── mcp_servers.json                      # Provider configuration
tests/
└── mcp/
    ├── video-provider-client.test.ts     # Client tests
    └── provider-registry.test.ts         # Registry tests
```

### Configuration Schema: config/mcp_servers.json

```json
{
  "providers": [
    {
      "id": "dvids",
      "name": "DVIDS Military Videos",
      "priority": 1,
      "enabled": false,
      "command": "python",
      "args": ["-m", "mcp_servers.dvids"],
      "env": {
        "DVIDS_CACHE_DIR": "./assets/cache/dvids",
        "DVIDS_RATE_LIMIT": "30"
      }
    },
    {
      "id": "nasa",
      "name": "NASA Space Videos",
      "priority": 2,
      "enabled": false,
      "command": "python",
      "args": ["-m", "mcp_servers.nasa"],
      "env": {
        "NASA_CACHE_DIR": "./assets/cache/nasa",
        "NASA_RATE_LIMIT": "10"
      }
    }
  ]
}
```

### VideoProviderClient Interface

```typescript
// lib/mcp/video-provider-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface VideoSearchResult {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  publishedAt: string;
}

export interface VideoDetails {
  videoId: string;
  title: string;
  description: string;
  duration: number;
  downloadUrl: string;
  format: string;
}

export class VideoProviderClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private serverConfig: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.serverConfig = config;
  }

  async connect(): Promise<void> {
    // Initialize MCP client and stdio transport
  }

  async searchVideos(query: string, maxDuration?: number): Promise<VideoSearchResult[]> {
    // Call MCP tool: search_videos
  }

  async downloadVideo(videoId: string): Promise<string> {
    // Call MCP tool: download_video
    // Returns local file path
  }

  async getVideoDetails(videoId: string): Promise<VideoDetails> {
    // Call MCP tool: get_video_details
  }

  async disconnect(): Promise<void> {
    // Cleanup transport and client
  }
}
```

### ProviderRegistry Pattern

```typescript
// lib/mcp/provider-registry.ts
export class ProviderRegistry {
  private providers: Map<string, VideoProviderClient> = new Map();
  private config: MCPServersConfig;

  constructor(configPath: string) {
    // Load config/mcp_servers.json
  }

  async getProvider(id: string): Promise<VideoProviderClient> {
    // Get specific provider by ID
  }

  async searchAllProviders(query: string, maxDuration?: number): Promise<VideoSearchResult[]> {
    // Try each provider in priority order
    // Return results from first successful provider
  }

  async downloadFromAnyProvider(videoId: string, providerId?: string): Promise<string> {
    // Download from specific provider or try all
  }
}
```

### MCP Protocol (JSON-RPC)

The client communicates with MCP servers using JSON-RPC 2.0 over stdio:

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_videos",
    "arguments": {
      "query": "military aircraft",
      "max_duration": 120
    }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"videoId\": \"dvids123\", \"title\": \"F-35 Combat\", ...}]"
      }
    ]
  }
}
```

---

## Tasks

### Task 1: Install MCP Client Dependencies → AC-6.9.1, AC-6.9.2
- [ ] Install `@modelcontextprotocol/sdk` package
- [ ] Verify Python environment for MCP servers
- [ ] Create `config/mcp_servers.json` configuration file

### Task 2: Create VideoProviderClient Class → AC-6.9.1
- [ ] Create `lib/mcp/video-provider-client.ts`
- [ ] Implement `connect()` method with stdio transport
- [ ] Implement `searchVideos(query, maxDuration)` method
- [ ] Implement `downloadVideo(videoId)` method
- [ ] Implement `getVideoDetails(videoId)` method
- [ ] Implement `disconnect()` cleanup method
- [ ] Add error handling for connection failures

### Task 3: Create ProviderRegistry → AC-6.9.2, AC-6.9.3
- [ ] Create `lib/mcp/provider-registry.ts`
- [ ] Implement config loading from `mcp_servers.json`
- [ ] Implement `getProvider(id)` method
- [ ] Implement `searchAllProviders()` with fallback logic
- [ ] Implement `downloadFromAnyProvider()` method

### Task 4: Define MCP Types → AC-6.9.1
- [ ] Create `lib/mcp/types.ts`
- [ ] Define `ProviderConfig` interface
- [ ] Define `VideoSearchResult` interface
- [ ] Define `VideoDetails` interface
- [ ] Define `MCPServersConfig` interface

### Task 5: Create Main Exports → AC-6.9.1
- [ ] Create `lib/mcp/index.ts`
- [ ] Export `VideoProviderClient`
- [ ] Export `ProviderRegistry`
- [ ] Export all types

### Task 6: Unit Tests → AC-6.9.5
- [ ] Create `tests/mcp/video-provider-client.test.ts`
- [ ] Test client initialization with mock MCP server
- [ ] Test `searchVideos()` method
- [ ] Test `downloadVideo()` method
- [ ] Test error handling for connection failures
- [ ] Create `tests/mcp/provider-registry.test.ts`
- [ ] Test provider loading from config
- [ ] Test fallback logic across providers

### Task 7: Integration with Quick Production Flow → AC-6.9.4
- [ ] Update `lib/pipeline/visual-generation.ts` to use VideoProviderClient
- [ ] Add provider selection based on project preferences
- [ ] Implement fallback to YouTube if MCP providers fail
- [ ] Add progress reporting for MCP searches

---

## Dev Notes

### Architecture References
- **Tech Spec:** Epic 6 - Story 6.9 Acceptance Criteria
- **PRD:** Feature 2.9 - Domain-Specific Content APIs (FR-2.9.03)
- **Architecture:** docs/architecture/feature-27-channel-intelligence-rag-architecture.md - MCP Server Architecture section

### Dependencies
- **MCP SDK:** `@modelcontextprotocol/sdk` - Official MCP client library
- **Python Environment:** MCP servers run as Python stdio processes
- **Quick Production Flow (Story 6.8b):** Will use VideoProviderClient for domain-specific sourcing

### MCP Server Implementation Note
This story implements the **client architecture** only. The actual MCP servers (DVIDS, NASA) are implemented in:
- **Story 6.10:** DVIDS Web Scraping MCP Server
- **Story 6.11:** NASA Web Scraping MCP Server

### Rate Limiting
- DVIDS: 30 seconds per request (enforced by server)
- NASA: 10 seconds per request (enforced by server)
- Client should implement exponential backoff on HTTP 429/503

### Error Handling Strategy
```typescript
// Provider fallback logic
for (const provider of providersByPriority) {
  try {
    const results = await provider.searchVideos(query);
    if (results.length > 0) return results;  // Success
  } catch (error) {
    console.warn(`Provider ${provider.id} failed:`, error);
    continue;  // Try next provider
  }
}
// All providers failed - return empty or fallback to YouTube
```

### Testing Approach
- Use `jest.mock()` to mock MCP server responses
- Test error scenarios: connection timeout, server crash, invalid response
- Test fallback logic with multiple providers
- Integration tests with actual MCP servers (optional)

### Future Enhancements
- Add caching layer for search results
- Implement concurrent provider searches (race mode)
- Add provider health monitoring
- Support for custom MCP server configurations

---

## Definition of Done

- [ ] All Acceptance Criteria verified and passing
- [ ] VideoProviderClient class implemented and tested
- [ ] ProviderRegistry implemented with fallback logic
- [ ] Configuration schema created in `config/mcp_servers.json`
- [ ] Unit tests written and passing (80%+ coverage)
- [ ] No TypeScript errors
- [ ] Code reviewed and approved
- [ ] Documentation updated

---

## Story Points

**Estimate:** 5 points (Medium)

**Justification:**
- New architecture pattern (MCP protocol integration)
- Client-server communication via stdio transport
- Provider registry with fallback logic
- Unit tests with mock MCP servers
- Configuration management

---

## References

- PRD: Feature 2.9 - Domain-Specific Content APIs
- Epic File: _bmad-output/planning-artifacts/epics.md - Story 6.9
- Architecture: docs/architecture/feature-27-channel-intelligence-rag-architecture.md
- MCP Protocol: https://modelcontextprotocol.io/
- Story 6.10: DVIDS Web Scraping MCP Server (future)
- Story 6.11: NASA Web Scraping MCP Server (future)
