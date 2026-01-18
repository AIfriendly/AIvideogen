# Epic 6 Architecture Documentation

### Feature 2.9: Automated Video Production Pipeline Architecture

**PRD Reference:** Feature 2.9 - Automated Video Production Pipeline

#### Overview

A one-click video creation system that transforms RAG-generated topic suggestions into complete, ready-to-export videos through fully automated script generation, TTS, visual sourcing, and assembly. This feature enables the Quick Production Flow (QPF) for creators who want to go from "topic idea" to "finished video" with minimal interaction.

#### Operating Modes

**Quick Production Flow (QPF)**
One-click video creation directly from RAG topic suggestions. Users click a topic suggestion and the system automatically creates a project, applies saved defaults (voice + persona), and triggers the full video production pipeline.

**Domain-Specific Automation**
Support for domain-specific content APIs accessed via MCP (Model Context Protocol) servers:
- **DVIDS:** U.S. military footage (public domain)
- **NASA:** Space footage (public domain, future)
- **Future:** Stock footage APIs (Pexels, Pixabay, Shutterstock)

#### Quick Production Flow Architecture Diagram

```
Quick Production Flow Pipeline
├── De 1. Topic Suggestions UI (Channel Intelligence Page)           │
│     - Display RAG-generated topics                              │
│     - "Create Video" button on each topic card                  │
│     ↓ Click "Create Video"                                      │
│  faults Resolution                                         │
│  ───────────────────────────────────────────────────────────────┤
│ 2.   - Load user_preferences (default_voice_id,                  │
│       default_persona_id, default_duration)                     │
│     - If no defaults: redirect to settings                      │
│     ↓                                                            │
│  3. Project Creation (POST /api/projects/quick-create)         │
│     - Create project with topic pre-filled                      │
│     - Set topic_confirmed = true                                │
│     - Apply default voice + persona                             │
│     - Attach RAG context (if provided)                          │
│     ↓                                                            │
│  4. Pipeline Orchestration                                      │
│     - Trigger script generation with RAG context                │
│     - Trigger voiceover generation                              │
│     - Trigger visual sourcing + auto-selection                  │
│     - Trigger video assembly                                    │
│     ↓                                                            │
│  5. Progress Tracking & Navigation                              │
│     - Redirect to /projects/[id]/progress                       │
│     - Real-time status updates via polling                      │
│     - Auto-redirect to /projects/[id]/export on complete        │
└─────────────────────────────────────────────────────────────────┘
```

#### Database Schema Extension

**user_preferences Table**

```sql
-- Migration 015: User Preferences for Quick Production Flow
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_voice_id TEXT,           -- No FK: voices defined in TypeScript
  default_persona_id TEXT,
  quick_production_enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (default_persona_id) REFERENCES system_prompts(id) ON DELETE SET NULL
);

-- Migration 016: Add default_duration column
ALTER TABLE user_preferences ADD COLUMN default_duration INTEGER DEFAULT 2;
```

**Note:** `default_voice_id` is stored as TEXT without foreign key since voices are defined in TypeScript code (`voice-profiles.ts`), not in the database.

#### API Endpoints

**User Preferences API**

- **GET /api/user-preferences** - Retrieve user's Quick Production defaults with joined voice and persona names
- **PUT /api/user-preferences** - Update user's Quick Production defaults (partial update supported)

**Quick Create API**

- **POST /api/projects/quick-create** - Create a project with pre-configured defaults and trigger the video pipeline

**Request Body:**
```typescript
{
  topic: string;                       // Video topic from suggestion
  ragContext?: {                       // Pre-assembled RAG context (optional)
    channelContent?: any[];
    competitorContent?: any[];
    newsArticles?: any[];
    trendingTopics?: any[];
  };
}
```

**Pipeline Status API**

- **GET /api/projects/{id}/pipeline-status** - Track pipeline progress

**Response:**
```typescript
{
  success: true,
  data: {
    currentStage: 'script' | 'voiceover' | 'visuals' | 'assembly' | 'complete',
    completedStages: string[],
    overallProgress: number,            // 0-100
    stageProgress: number,              // 0-100 for current stage
    currentMessage: string              // User-friendly status
  }
}
```

#### Pipeline Stages

The Quick Production Flow executes the following stages sequentially:

1. **Stage 1: Script Generation**
   - Endpoint: `POST /api/projects/{id}/generate-script`
   - Input: Topic + RAG context (if available)
   - Output: Generated scenes with narration text

2. **Stage 2: Voiceover Generation**
   - Endpoint: `POST /api/projects/{id}/generate-voiceovers`
   - Input: Generated scenes
   - Output: Audio files for each scene

3. **Stage 3: Visual Sourcing**
   - Endpoint: `POST /api/projects/{id}/generate-visuals`
   - Input: Scene text for keyword extraction
   - Output: Video suggestions from source provider

4. **Stage 4: Auto-Select Visuals**
   - Endpoint: `POST /api/projects/{id}/auto-select-visuals`
   - Input: Video suggestions
   - Output: Selected clips for each scene

5. **Stage 5: Video Assembly**
   - Endpoint: `POST /api/projects/{id}/assemble`
   - Input: Selected clips + audio files
   - Output: Final rendered video

#### Visual Source Providers (Domain-Specific MCP Architecture)

**Provider Interface Pattern**

```
VideoSourceProvider interface
├── DVIDS_MCP_Provider (via MCP server)
├── NASA_MCP_Provider (via MCP server)
├── Pexels_MCP_Provider (stock footage, via MCP server)
├── Pixabay_MCP_Provider (stock footage, via MCP server)
└── MockVideoProvider (testing only)
```

**Note:** Quick Production Flow uses ONLY domain-specific content APIs via MCP servers. Unlike the manual pipeline, QPF does NOT use YouTube API as a fallback or primary source.

**Provider Responsibilities**

Each provider implements:
- `search(query, options)` - Search for videos
- `autoSelect(results, options)` - Automatically select best match
- `download(videoId, options)` - Download to local cache
- `isAvailable()` - Check if provider is configured
- `getHealthStatus()` - Get quota/rate limit status

**Auto-Selection Algorithm**

**Ranking Formula:**
```
combinedScore = (durationFit × 0.6) + (relevanceScore × 0.4)

Where:
- durationFit = 1 - (|actualDuration - targetDuration| / tolerance)
- relevanceScore = From search position (1.0 for #1, decreasing)
```

**Fallback Behavior:**
- If no videos within tolerance: Return closest duration match
- If all scores below threshold: Return highest scoring anyway
- **Critical:** QPF has NO fallback to other providers if domain-specific API fails

#### MCP Server Architecture (Primary Design for QPF)

**Purpose**

Act as API gateway between application and content sources with:
- Rate limiting enforcement (30-second default per request)
- Request queuing and caching
- **API authentication (MCP servers act as "unofficial API keys")**
- Error handling and retry logic
- Usage monitoring and logging

**Key Design Principle:** MCP servers handle all API authentication internally. The application does NOT store or manage API keys for external services (DVIDS, NASA, etc.). The MCP server presents itself as the authentication layer — applications communicate with the MCP server using the Model Context Protocol, and the MCP server handles communication with external APIs using its own credentials. This keeps API keys completely separate from the application codebase.

**Domain-Specific Providers**

| Provider | Content | Rate Limit | Licensing | Implementation Priority |
|----------|---------|------------|-----------|------------------------|
| DVIDS | U.S. military footage | 30s/request | Public domain | Phase 1 (Primary) |
| NASA | Space/astronomy footage | 30s/request | Public domain | Phase 2 |
| Pexels | Stock footage | TBD | Free tier | Phase 3 |
| Pixabay | Stock footage | 500/hour | Royalty-free | Phase 3 |

#### Security Considerations

**MCP Server Authentication**
- **MCP servers act as "unofficial API keys"** — they handle all external API authentication
- Application does NOT store or manage any external API keys
- Application communicates only with MCP servers via Model Context Protocol
- MCP servers handle communication with external APIs using their own credentials
- API keys are completely isolated from the application codebase

**Architecture Benefit:** This separation means the application never needs to handle, store, or manage sensitive API credentials. The MCP server layer abstracts away all authentication complexity.

#### Functional Requirements

- **FR-2.9.QPF.01:** The system shall display a "Create Video" button on each topic suggestion card.
- **FR-2.9.QPF.02:** The system shall store user default preferences (default_voice_id, default_persona_id, default_duration) in user_preferences table.
- **FR-2.9.QPF.03:** When "Create Video" is clicked, the system shall create a new project with the topic pre-filled and confirmed.
- **FR-2.9.QPF.04:** The system shall automatically apply the user's default voice and persona to the new project.
- **FR-2.9.QPF.05:** The system shall trigger the full video production pipeline (script → voice → visuals → assembly) without user intervention.
- **FR-2.9.QPF.06:** The system shall redirect the user to a progress page showing pipeline status.
- **FR-2.9.QPF.07:** Upon completion, the system shall redirect to the export page with the finished video.
- **FR-2.9.QPF.08:** If no defaults are configured, the system shall prompt the user to set defaults before proceeding.

#### Acceptance Criteria

- **AC-QPF.1:** Given a user has configured default voice and persona, when they click "Create Video" on a topic suggestion, then a new project is created and the pipeline starts automatically.
- **AC-QPF.2:** Given the pipeline is running, when the user views the progress page, then they see real-time status updates for each stage.
- **AC-QPF.3:** Given the pipeline completes successfully, when assembly finishes, then the user is automatically redirected to the export page.
- **AC-QPF.4:** Given a user has NOT configured defaults, when they click "Create Video", then they are prompted to select voice and persona before proceeding.

#### Differentiation from Manual Pipeline

| Aspect | Manual Pipeline | Automated Pipeline (QPF) |
|--------|----------------|--------------------------|
| Entry Point | Chat → Topic Confirmation | Topic Suggestion → One Click |
| Visual Source | YouTube API (manual curation) | Domain APIs via MCP (DVIDS, NASA, etc.) |
| API Authentication | Application manages API keys | MCP servers handle authentication ("unofficial API keys") |
| Clip Selection | User selects from options | System auto-selects best match |
| Workflow | Manual curation at each step | Fully automated |
| Use Case | General creators want control | Niche channels want automation |

#### Project Structure

```
src/
├── lib/
│   ├── db/
│   │   ├── queries-user-preferences.ts    # User preferences queries
│   │   └── migrations/
│   │       ├── 015_user_preferences.ts    # Create user_preferences table
│   │       └── 016_user_preferences_duration.ts  # Add default_duration
│   └── video-sources/ (MCP provider implementations)
│       ├── provider.ts                     # VideoSourceProvider interface
│       ├── mcp-provider.ts                 # MCP base class
│       ├── dvids-mcp-provider.ts           # DVIDS implementation
│       ├── nasa-mcp-provider.ts            # NASA implementation
│       └── mock-provider.ts                # Testing provider
└── app/
    └── api/
        ├── user-preferences/
        │   └── route.ts                    # GET/PUT user preferences
        └── projects/
            ├── quick-create/
            │   └── route.ts                # POST quick-create endpoint
            └── [id]/
                ├── pipeline-status/
                │   └── route.ts            # GET pipeline progress
                └── auto-select-visuals/
                    └── route.ts            # POST auto-select clips
```

**Note:** Stories 6.8a/6.8b implemented the QPF infrastructure (user preferences, quick-create API, pipeline-status API, progress UI). The MCP provider implementations are the next phase of Epic 6 development.

#### Integration with Existing Features

**Feature 2.7: Channel Intelligence (RAG)**
- RAG provides topic suggestions with context
- QPF consumes these suggestions for one-click video creation
- RAG context attached to project for informed script generation

**Feature 1.12: Automate Mode**
- QPF reuses Automate Mode pipeline orchestration
- Same pipeline stages, different entry point
- Shared progress tracking and status APIs

#### Implementation Phases

**Phase 1: Core QPF Infrastructure** ✅ (Stories 6.8a, 6.8b - Complete)
- User preferences system (default_voice_id, default_persona_id, default_duration)
- Quick-create API endpoint
- Pipeline-status API
- Progress page UI
- Topic suggestion cards with "Create Video" button

**Phase 2: DVIDS MCP Provider** (Next)
- DVIDS_MCP_Provider implementation
- Military footage search and download
- 30-second rate limiting enforcement
- Auto-selection algorithm integration

**Phase 3: Additional Domain Providers**
- NASA_MCP_Provider for space content
- Pexels_MCP_Provider for stock footage
- Pixabay_MCP_Provider for stock footage
- Provider selection based on content niche

**Phase 4: Advanced Features**
- Semantic similarity scoring for auto-selection
- 
---
