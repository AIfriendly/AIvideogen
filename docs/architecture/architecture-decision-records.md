# Architecture Decision Records

### ADR-001: Next.js 15.5 as Primary Framework

**Status:** Accepted
**Date:** 2025-11-01

**Context:**
Need a modern React framework for desktop-first web application with server-side capabilities for video processing.

**Decision:**
Use Next.js 15.5 with App Router, TypeScript, and Tailwind CSS.

**Consequences:**
- ✅ Server Components reduce client bundle size
- ✅ API Routes provide server-side processing
- ✅ Built-in optimizations (image, font, code splitting)
- ✅ Great TypeScript support
- ⚠️ Learning curve for App Router paradigm

**Alternatives Considered:**
- Vite + React: No built-in API routes
- Remix: Less mature ecosystem
- Create React App: Deprecated

---

### ADR-002: Local Ollama + Llama 3.2 for LLM

**Status:** Accepted
**Date:** 2025-11-01

**Context:**
Need LLM for conversational agent and script generation. Must be FOSS and work locally.

**Decision:**
Use Ollama runtime with Llama 3.2 (3B instruct model). Implement provider abstraction for future flexibility.

**Consequences:**
- ✅ FOSS compliant
- ✅ Local execution (privacy, no API costs)
- ✅ 128K context window (handles long conversations)
- ✅ Already installed by user
- ⚠️ Requires GPU for optimal performance
- ✅ Provider abstraction enables cloud migration

**Alternatives Considered:**
- Hugging Face API: Free tier rate limits
- OpenAI API: Not FOSS, requires API key
- Local Llama.cpp: More complex setup

---

### ADR-003: KokoroTTS for Voice Synthesis

**Status:** Accepted
**Date:** 2025-11-01

**Context:**
Need high-quality TTS with multiple voice options. Must be FOSS.

**Decision:**
Use KokoroTTS (82M parameter model) with 48+ voice options.

**Consequences:**
- ✅ FOSS compliant (Apache 2.0)
- ✅ 48+ voices (exceeds PRD requirement of 3-5)
- ✅ High quality (4.35 MOS score)
- ✅ Fast inference (3.2x faster than XTTS)
- ✅ Voice blending capability (bonus feature)
- ⚠️ Python dependency

**Alternatives Considered:**
- Piper TTS: Fewer voices, less natural
- Coqui TTS: Heavier, slower
- eSpeak NG: Robotic sound quality

---

### ADR-004: Direct FFmpeg via child_process

**Status:** Accepted
**Date:** 2025-11-01

**Context:**
Need video processing (trim, concatenate, overlay audio). fluent-ffmpeg was deprecated in May 2025.

**Decision:**
Use FFmpeg directly via Node.js `child_process.exec`, no wrapper library.

**Consequences:**
- ✅ Future-proof (no deprecated wrapper dependency)
- ✅ Full control over FFmpeg commands
- ✅ No abstraction layer to break
- ✅ Direct access to latest FFmpeg features
- ⚠️ Need to construct commands manually
- ⚠️ Less beginner-friendly

**Alternatives Considered:**
- fluent-ffmpeg: Deprecated/archived May 2025
- @mmomtchev/ffmpeg: Native bindings, more complex
- MoviePy: Python, different ecosystem

---

### ADR-005: Hybrid State Management (Zustand + SQLite)

**Status:** Accepted
**Date:** 2025-11-01

**Context:**
Need to manage complex workflow state across 5 epics. User wants to resume projects after days/weeks.

**Decision:**
Use Zustand for client state + SQLite for persistent storage. Hybrid approach.

**Consequences:**
- ✅ Fast UI updates (Zustand)
- ✅ Persistent projects (SQLite)
- ✅ Conversation memory across sessions
- ✅ Can save/resume multiple projects
- ✅ Lightweight (Zustand 3KB)
- ⚠️ Need to sync client/server state

**Alternatives Considered:**
- Redux: Heavier, more boilerplate
- Context API only: Lost on browser close
- Database only: Slower UI updates
- LocalStorage only: No conversation history, limited storage

---

### ADR-006: Local Single-User Deployment (MVP)

**Status:** Accepted
**Date:** 2025-11-01

**Context:**
Primary user is the developer. Need fast MVP with privacy guarantees. Cloud deployment adds complexity.

**Decision:**
Build for local single-user deployment initially. Document cloud migration path for future.

**Consequences:**
- ✅ Faster MVP (no auth, multi-tenancy)
- ✅ Complete privacy (all data local)
- ✅ No cloud costs
- ✅ Works offline (except YouTube API)
- ✅ Architecture designed for easy cloud migration
- ⚠️ Not immediately shareable with others
- ⚠️ Requires local setup (Ollama, FFmpeg)

**Alternatives Considered:**
- Cloud multi-tenant from day one: Slower MVP, higher complexity
- Electron app: Extra packaging complexity
- Pure Python app: User prefers web UI

---

### ADR-007: Unified Persona System for LLM Behavior Control (Feature 1.9)

**Status:** Accepted (Updated 2025-11-28)
**Date:** 2025-11-01 (Updated for PRD v1.8)

**Context:**
Different video projects require different LLM behavior and content tone. The original design had two separate prompts (chat system prompt and script generation system prompt), which caused:
- Inconsistency between brainstorming tone and generated script tone
- Maintenance burden of keeping two prompts in sync
- Confusion about which prompt affects which behavior

PRD v1.8 moved the persona system from post-MVP (Feature 2.6) to MVP (Feature 1.9), requiring:
- 4 preset personas: Scientific Analyst (default), Blackpill Realist, Documentary Filmmaker, Educational Designer
- Per-project persona selection stored in `projects.system_prompt_id`
- Blackpill Realist with specific use cases (AI dystopia, lookism, collapse scenarios)

**Decision:**
Implement a **unified persona system** where ONE system prompt defines the LLM's personality for BOTH chat AND script generation:

```
Persona (System Prompt) → Defines WHO the LLM is (tone, worldview, delivery style)
Task Prompt (User Message) → Defines WHAT to do (JSON format, word counts, etc.)
```

Preset personas (MVP):
1. **Scientific Analyst** (default) - Neutral, data-driven, factual
2. **Blackpill Realist** - Brutal honesty, nihilistic, no sugar-coating
3. **Documentary Filmmaker** - Human stories, narrative structure
4. **Educational Designer** - TED-Ed style, learning-focused

**Consequences:**
- ✅ Consistent tone across chat AND generated scripts
- ✅ Single prompt per persona (easier maintenance)
- ✅ Per-project persona selection (FR-1.9.06)
- ✅ Blackpill Realist produces nihilistic content throughout (FR-1.9.04, FR-1.9.05)
- ✅ Full control over LLM behavior (local Ollama)
- ✅ Personas stored locally in SQLite (privacy)
- ⚠️ Existing `SCRIPT_GENERATION_SYSTEM_PROMPT` becomes redundant (to be removed)
- ⚠️ Script generation needs projectId parameter to fetch persona

**Alternatives Considered:**
- Keep two separate prompts: Inconsistent, harder to maintain
- Persona affects only scripts: Chat would feel disconnected from output
- Single hardcoded prompt: No flexibility for different content types

**Implementation:**
- MVP: 4 preset personas seeded in database, persona selector UI in project settings
- Post-MVP: Custom persona creation UI, persona versioning

---

### ADR-008: Story 3.7b CV Pipeline Integration Patterns

**Status:** Accepted
**Date:** 2025-11-25

**Context:**
Story 3.7 implemented CV filtering as a manual API endpoint, but users were seeing low-quality B-roll because CV analysis never ran automatically. Story 3.7b addresses this gap by integrating CV analysis into the download pipeline and filtering results in the UI.

**Decision:**
Implement automatic CV pipeline integration with:
1. **Auto-trigger CV analysis** after each segment download (non-blocking)
2. **Stricter thresholds** (10% face area vs 15%, tighter caption detection)
3. **UI filtering** of low cv_score suggestions (< 0.5 hidden)
4. **Visual keywords flow** from scene analysis to CV label verification

**Consequences:**
- ✅ CV analysis runs automatically (no manual API calls needed)
- ✅ Low-quality suggestions hidden from user
- ✅ Graceful degradation if CV fails (download still succeeds)
- ✅ Better B-roll quality (stricter thresholds catch more talking heads)
- ✅ NULL cv_score suggestions remain visible (backwards compatible)
- ⚠️ Increased API usage (CV runs for every downloaded segment)
- ⚠️ Requires visual_keywords storage in scenes table

**Threshold Changes:**

| Parameter | Story 3.7 | Story 3.7b | Rationale |
|-----------|-----------|------------|-----------|
| Talking head face area | 15% | 10% | Catch face-in-corner gaming videos |
| Small face area | 5% | 3% | More sensitive detection |
| Caption text coverage | 5% | 3% | Catch smaller captions |
| Caption text blocks | 3 | 2 | Catch subtitle-style text |
| Major face penalty | -0.5 | -0.6 | Stronger talking head rejection |
| Minor face penalty | -0.2 | -0.3 | More penalty for small faces |
| Caption penalty | -0.3 | -0.4 | Stronger caption rejection |

**Implementation Pattern:**
- Error isolation: CV failure never blocks download success
- Non-blocking: Download status updated before CV runs
- Backwards compatible: NULL cv_score treated as "show"

---

### ADR-009: ChromaDB for Vector Database (Feature 2.7)

**Status:** Accepted
**Date:** 2025-11-29

**Context:**
Feature 2.7 (Channel Intelligence & RAG) requires a vector database for storing embeddings of YouTube transcripts, news articles, and trends. Need FOSS-compliant, local-first solution that integrates well with Python ML ecosystem.

**Decision:**
Use ChromaDB as the vector database with local persistence:
- Local SQLite + DuckDB backend (no external services)
- Python-native with good JavaScript interop
- Collections for different data types (channels, news, trends)
- HNSW indexing with cosine similarity

**Consequences:**
- ✅ FOSS compliant (Apache 2.0)
- ✅ Local-first (no cloud dependency)
- ✅ Easy Python integration (sentence-transformers ecosystem)
- ✅ Persistent storage in `.cache/chroma`
- ✅ Fast semantic search with HNSW indexing
- ⚠️ Requires Python runtime for embedding generation
- ⚠️ Limited to single-node deployment (fine for local app)

**Alternatives Considered:**
- **LanceDB:** Good alternative, Rust-based, but less Python ecosystem integration
- **Milvus:** Overkill for single-user app, requires separate server
- **Pinecone:** Cloud-based, violates local-first requirement
- **SQLite with pgvector extension:** Complex setup, less semantic search optimized

---

### ADR-010: all-MiniLM-L6-v2 for Local Embeddings (Feature 2.7)

**Status:** Accepted
**Date:** 2025-11-29

**Context:**
Need embedding model for RAG system. Must be local (FOSS requirement), fast, and produce quality embeddings for semantic search across video transcripts and news articles.

**Decision:**
Use `all-MiniLM-L6-v2` from sentence-transformers:
- 384-dimensional embeddings
- ~80MB model size
- Runs locally via Python
- Good balance of speed and quality

**Consequences:**
- ✅ FOSS compliant (Apache 2.0)
- ✅ Local execution (no API costs)
- ✅ Small model size (~80MB)
- ✅ Fast inference on CPU
- ✅ Good quality for semantic search tasks
- ⚠️ Python dependency
- ⚠️ Not as accurate as larger models (acceptable for use case)

**Alternatives Considered:**
- **OpenAI text-embedding-ada-002:** Cloud-based, API costs
- **Gemini embeddings:** Cloud-based, would break local-first
- **E5-large:** Better quality but 4x larger, slower
- **BGE-small:** Similar quality but less community adoption

---

### ADR-011: SQLite-Backed Job Queue (Feature 2.7)

**Status:** Accepted
**Date:** 2025-11-29

**Context:**
Feature 2.7 requires background job processing for:
- Daily channel sync (caption scraping, embedding generation)
- News fetching (RSS, web scraping)
- Batch embedding generation
- Cache cleanup

Need lightweight job queue without external dependencies (Redis, RabbitMQ).

**Decision:**
Implement SQLite-backed job queue with:
- `background_jobs` table for job storage
- `cron_schedules` table for recurring jobs
- node-cron for schedule management
- Custom processor with concurrency control

**Consequences:**
- ✅ No external dependencies (uses existing SQLite)
- ✅ Persistent queue (survives restarts)
- ✅ Simple implementation (~200 lines)
- ✅ Built-in retry with exponential backoff
- ✅ Progress tracking for long-running jobs
- ⚠️ Not suitable for high-throughput (fine for single-user)
- ⚠️ No distributed processing (acceptable for local app)

**Alternatives Considered:**
- **BullMQ + Redis:** Requires Redis server, overkill
- **Agenda + MongoDB:** Wrong database
- **node-cron only:** No persistence, no retry logic
- **AWS SQS/Lambda:** Cloud-based, violates local-first

**Job Types:**
| Job Type | Trigger | Frequency |
|----------|---------|-----------|
| rag_sync_channel | Cron | Daily 6 AM |
| rag_sync_news | Cron | Every 4 hours |
| embedding_generation | On-demand | Per video |
| cv_batch_analysis | On-demand | Per project |
| cache_cleanup | Cron | Weekly Sunday 3 AM |

---

### ADR-012: youtube-transcript-api for Caption Scraping (Feature 2.7)

**Status:** Accepted
**Date:** 2025-11-29

**Context:**
Need to extract video transcripts (auto-captions) from YouTube videos for RAG knowledge base. YouTube doesn't provide official transcript API.

**Decision:**
Use `youtube-transcript-api` Python library:
- Extracts auto-generated and manual captions
- Works with video IDs (no authentication required)
- Returns timestamped transcript segments
- FOSS (MIT license)

**Consequences:**
- ✅ FOSS compliant (MIT)
- ✅ No API key required
- ✅ Supports auto-generated captions
- ✅ Returns timestamps for potential future features
- ⚠️ Depends on YouTube's internal structures (may break)
- ⚠️ Some videos have no captions (graceful degradation)
- ⚠️ Rate limiting recommended (2 req/sec)

**Alternatives Considered:**
- **yt-dlp subtitle extraction:** Heavier, downloads whole metadata
- **Manual scraping:** Brittle, maintenance burden
- **Third-party APIs:** Cloud-based, costs money

**Integration Pattern:**
```python
# Called from Node.js via child_process.spawn
from youtube_transcript_api import YouTubeTranscriptApi
transcript = YouTubeTranscriptApi.get_transcript(video_id)
```

---

### ADR-013: MCP Protocol for Video Provider Servers (Feature 2.9 - Deferred)

**Status:** Proposed (Deferred to Future Epic)
**Date:** 2025-12-03

**Context:**
Feature 2.9 requires domain-specific video content from sources like DVIDS (military) and NASA (space). These sources lack official APIs, so web scraping is needed. The system needs an extensible architecture for adding new content providers without modifying core application code.

**Decision:**
Use the Model Context Protocol (MCP) as the communication layer between the video generator application and video provider servers. MCP servers will run as local stdio processes, exposing tools for video search, download, and metadata retrieval.

**Consequences:**
- ✅ **Language-agnostic:** Python MCP servers for web scraping, Node.js client for application
- ✅ **Extensibility:** New providers added via config changes, no code modifications required
- ✅ **Local-first:** All scraping happens locally, no cloud dependencies
- ✅ **Isolation:** Scraping logic isolated in separate processes, crashes don't affect main app
- ✅ **Standard protocol:** Open-source MCP protocol with existing SDK and tooling
- ✅ **Graceful degradation:** Provider failures don't block the entire pipeline
- ⚠️ **Process management:** Need to spawn and manage stdio processes for each provider
- ⚠️ **Complexity:** Additional layer vs direct HTTP calls
- ⚠️ **Deferred implementation:** Stories 6.9-6.11 deferred to future epic

**Alternatives Considered:**
- **Direct HTTP scraping in Node.js:** Simpler but couples scraping logic to app code, less extensible
- **gRPC/protobuf:** Overkill for local communication, more complex setup
- **REST API servers:** Requires HTTP stack, more overhead than stdio
- **Python subprocess with JSON:** Custom protocol, no standard tooling

**Architecture Pattern:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Video Provider Architecture              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  DVIDS MCP   │    │  NASA MCP    │    │ Future MCP   │       │
│  │  Server      │    │  Server      │    │  Providers   │       │
│  │  (Python)    │    │  (Python)    │    │  (Any Lang)  │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         └───────────────────┼───────────────────┘                │
│                             │ stdio transport                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────┐        │
│  │         VideoProviderClient (Node.js)                │        │
│  │  - MCP client library connection                     │        │
│  │  - Provider registry from config                     │        │
│  │  - Fallback logic across providers                   │        │
│  └──────────────────────┬──────────────────────────────┘        │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │         Quick Production Pipeline                    │        │
│  │  (Reuses Epic 6 QPF infrastructure)                  │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Provider Configuration (config/mcp_servers.json):**
```json
{
  "providers": [
    {
      "name": "dvids",
      "command": "python",
      "args": ["-m", "mcp_servers.dvids_scraping_server"],
      "priority": 1,
      "rateLimitMs": 30000,
      "enabled": true
    },
    {
      "name": "nasa",
      "command": "python",
      "args": ["-m", "mcp_servers.nasa_scraping_server"],
      "priority": 2,
      "rateLimitMs": 10000,
      "enabled": true
    }
  ]
}
```

**MCP Tool Interface:**
```python
# Each MCP server exposes these tools:
{
  "tools": [
    {
      "name": "search_videos",
      "description": "Search for videos by query and duration",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": {"type": "string"},
          "maxDuration": {"type": "integer"}
        }
      }
    },
    {
      "name": "download_video",
      "description": "Download video to local cache",
      "inputSchema": {
        "type": "object",
        "properties": {
          "video_id": {"type": "string"}
        }
      }
    },
    {
      "name": "get_video_details",
      "description": "Get video metadata",
      "inputSchema": {
        "type": "object",
        "properties": {
          "video_id": {"type": "string"}
        }
      }
    }
  ]
}
```

**Implementation Timeline:**
- **Epic 6 (Current):** RAG infrastructure, Quick Production Flow with YouTube API
- **Future Epic:** MCP Video Provider Architecture (Stories 6.9-6.11)
  - Story 6.9: VideoProviderClient architecture and configuration
  - Story 6.10: DVIDS scraping MCP server
  - Story 6.11: NASA scraping MCP server + pipeline integration

**References:**
- Stories 6.9-6.11 in `_bmad-output/planning-artifacts/epics.md`
- MCP Protocol: https://modelcontextprotocol.io/

---
