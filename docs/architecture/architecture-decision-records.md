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

### ADR-013: Playwright Headless Browser for MCP Video Provider Servers

**Status:** Accepted (Revised 2026-01-24)
**Date:** 2025-12-03 (Updated 2026-01-24)

**Context:**
Feature 2.9 requires domain-specific video content from sources like DVIDS (military) and NASA (space). These sources lack official APIs, so web scraping is needed. The system needs an extensible architecture for adding new content providers without modifying core application code.

After a week of development effort (Story 6.10), the HTTP scraping approach using `httpx` + `BeautifulSoup` failed on DVIDS because the website uses JavaScript rendering to load video download codes. Static HTML scraping cannot access the dynamically loaded content.

**Decision:**
Use Playwright headless browser automation for MCP Video Provider servers. The MCP protocol (decided in ADR-013 v1) remains the communication layer, but servers use Playwright instead of HTTP scraping for content extraction.

**Technical Stack:**
- **Playwright (Python):** Headless browser automation for JavaScript rendering
- **playwright-stealth:** Anti-detection plugin to avoid bot blocking
- **MCP Protocol:** Communication layer (unchanged from v1)
- **Chromium:** Browser binary (installed via `playwright install chromium`)

**Consequences:**
- ✅ **JavaScript rendering:** Can access dynamically loaded content that HTTP scraping misses
- ✅ **Network interception:** Can capture API calls and extract download URLs directly
- ✅ **Form interaction:** Can handle complex navigation flows and form submissions
- ✅ **Anti-detection:** playwright-stealth reduces bot detection risk
- ✅ **Language-agnostic:** Python MCP servers, Node.js client (unchanged)
- ✅ **Extensibility:** New providers via config (unchanged)
- ✅ **Isolation:** Browser logic isolated in separate processes (unchanged)
- ⚠️ **Higher resource usage:** ~200MB RAM per browser instance vs ~20MB for HTTP scraping
- ⚠️ **Slower startup:** Browser launch adds ~2-3 seconds per request
- ⚠️ **Browser installation:** Requires `playwright install chromium` (~300MB download)
- ⚠️ **Complexity:** Browser automation is more complex than HTTP scraping
- ⚠️ **Maintenance:** Browser updates may break selectors/scripts

**Alternatives Considered:**
- **HTTP scraping (httpx + BeautifulSoup):** Failed on DVIDS - cannot access JavaScript-rendered content
- **Selenium:** Older API, less reliable than Playwright, slower
- **Puppeteer:** Node.js-first, less Python integration than Playwright
- **Custom API reverse-engineering:** Brittle, breaks when website changes

**Architecture Pattern (Updated for Playwright):**
```
┌─────────────────────────────────────────────────────────────────┐
│            MCP Video Provider Architecture (Playwright)         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  DVIDS MCP   │    │  NASA MCP    │    │  Future MCP   │       │
│  │  Server      │    │  Server      │    │  Providers   │       │
│  │  (Python)    │    │  (Python)    │    │  (Any Lang)  │       │
│  │              │    │              │    │              │       │
│  │  ┌────────┐  │    │  ┌────────┐  │    │  ┌────────┐  │       │
│  │  │Playwright│ │    │  │Playwright│ │    │  │Playwright│ │       │
│  │  │Chromium │  │    │  │Chromium │  │    │  │Chromium │  │       │
│  │  │Headless │  │    │  │Headless │  │    │  │Headless │  │       │
│  │  └────────┘  │    │  └────────┘  │    │  └────────┘  │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         └───────────────────┼───────────────────┘                │
│                             │ stdio transport                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────┐        │
│  │         VideoProviderClient (Node.js)                │        │
│  │  - MCP client library connection                     │        │
│  │  - Provider registry from config                     │        │
│  │  - Rate limiting (30s for DVIDS)                     │        │
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

**Playwright Architecture for DVIDS Provider:**
```
┌─────────────────────────────────────────────────────────────────┐
│              DVIDS MCP Server (Playwright Implementation)       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. MCP Tool: search_videos(query, duration)                   │
│     │                                                            │
│     ├─► Launch Playwright headless browser                     │
│     ├─► Navigate to DVIDS search page                          │
│     ├─► Fill search form with query                            │
│     ├─► Wait for JavaScript-rendered results                   │
│     ├─► Extract video metadata (title, duration, thumbnail)    │
│     └─► Return results via MCP protocol                       │
│                                                                  │
│  2. MCP Tool: download_video(video_id)                         │
│     │                                                            │
│     ├─► Launch Playwright headless browser                     │
│     ├─► Navigate to video page                                 │
│     ├─► Wait for JavaScript to load download button/code       │
│     ├─► Interact with download button (if needed)              │
│     ├─► Intercept network response to get actual video URL     │
│     ├─► Download video to local cache                          │
│     └─► Return file path via MCP protocol                     │
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
      "args": ["-m", "mcp_servers.dvids_playwright_server"],
      "priority": 1,
      "rateLimitMs": 30000,
      "enabled": true,
      "browser": {
        "headless": true,
        "stealth": true,
        "userAgent": "Mozilla/5.0 ...",
        "viewport": { "width": 1920, "height": 1080 }
      }
    },
    {
      "name": "nasa",
      "command": "python",
      "args": ["-m", "mcp_servers.nasa_playwright_server"],
      "priority": 2,
      "rateLimitMs": 10000,
      "enabled": true,
      "browser": {
        "headless": true,
        "stealth": true
      }
    }
  ]
}
```

**Technical Considerations:**

**Browser Installation:**
```bash
# Required one-time setup
playwright install chromium
# Downloads ~300MB browser binary to:
# ~/.cache/ms-playwright/ (Linux/Mac)
# C:\Users\<user>\AppData\Local\ms-playwright\ (Windows)
```

**Resource Requirements:**
- **Memory:** ~200MB per browser instance
- **Disk:** ~300MB for Chromium binary
- **Startup time:** ~2-3 seconds per browser launch
- **Concurrency:** One browser per request (sequential processing recommended)

**Rate Limiting:**
- DVIDS: 30 seconds between requests (unchanged)
- NASA: 10 seconds between requests
- Rate limiting enforced at MCP client layer

**Anti-Detection:**
```python
from playwright_stealth import stealth_sync

async with playwright.chromium.launch(headless=True) as browser:
    page = await browser.new_page()
    await stealth_sync(page)  # Apply anti-detection
    # Proceed with scraping
```

**Error Handling:**
- Browser crashes: Restart browser, retry request once
- Timeout: Increase wait timeout, fail gracefully
- Blocked access: Log error, return structured error via MCP
- Network issues: Retry with exponential backoff

**MCP Tool Interface:**
```python
# Each MCP server exposes these tools (unchanged):
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
- **Story 6.10 (Pivot):** DVIDS Playwright MCP server (replacing HTTP scraping)
- **Future Epic:** MCP Video Provider Architecture (Stories 6.9, 6.11)
  - Story 6.9: VideoProviderClient architecture and configuration
  - Story 6.11: NASA Playwright MCP server + pipeline integration

**References:**
- Stories 6.9-6.11 in `_bmad-output/planning-artifacts/epics.md`
- MCP Protocol: https://modelcontextprotocol.io/
- Playwright Python: https://playwright.dev/python/
- playwright-stealth: https://github.com/AtuboD/playwright_stealth_python

---

### ADR-009: Pluggable LLM Provider Interface (Feature 1.9 v3.6)

**Status:** Accepted
**Date:** 2026-01-22

**Context:**
PRD v3.6 requires adding Groq as a third LLM provider alongside Ollama and Gemini, with:
- Runtime provider switching via UI (Settings → AI Configuration)
- No code changes required when switching providers
- Unified error handling and response format across all providers
- Configurable rate limiting per provider

The existing v1 architecture had basic provider abstraction but lacked:
- Standardized `generate_script()` method signature (FR-1.9.14)
- Per-user provider preferences stored in database
- HTTP header monitoring for proactive rate limit management
- Groq provider implementation

**Decision:**
Implement **Strategy Pattern + Factory Pattern** with strict interface compliance:

1. **LLMProvider Interface:** All providers implement `chat(messages, systemPrompt)` method
2. **Provider Factory:** `createLLMProvider(userPreference)` instantiates correct provider
3. **Database Persistence:** `user_preferences.default_llm_provider` stores user's selection
4. **Rate Limiting:** Per-provider sliding window rate limiter with HTTP header monitoring
5. **Zero-Code Switching:** UI changes provider preference, factory respects it

**Architecture:**
```
UI (Settings → AI Configuration)
  ↓
user_preferences.default_llm_provider
  ↓
createLLMProvider(userPreference)
  ↓
LLMProvider.chat() ← Unified interface
  ↓
OllamaProvider | GeminiProvider | GroqProvider
```

**Consequences:**
- ✅ Runtime provider switching without restart (FR-1.9.11)
- ✅ Zero code changes when switching providers (FR-1.9.13)
- ✅ Standardized `chat()` method across all providers (FR-1.9.14)
- ✅ Configurable rate limiting per provider (FR-1.9.09)
- ✅ HTTP header monitoring for Groq (x-ratelimit-remaining-*, retry-after)
- ✅ Easy to add new providers (implement interface, add to factory)
- ✅ Testable (mock LLMProvider interface)
- ⚠️ Abstraction layer adds slight complexity
- ⚠️ Must maintain interface consistency across providers

**Alternatives Considered:**
- Direct provider calls in each feature: Code duplication, hard to switch
- Base class inheritance: Less flexible than interface
- Configuration-based code generation: Over-engineering for 3 providers

**Implementation:**
- **Ollama:** No rate limit (local), llama3.2 model
- **Gemini:** 1 RPM (conservative), 15 RPM actual limit, gemini-2.5-flash
- **Groq:** 2 RPM (1 req/30s), 30 RPM actual limit, llama-3.3-70b-versatile

**References:**
- PRD v3.6: Feature 1.9 Enhancement (Groq integration)
- FR-1.9.09: Configurable rate limiting
- FR-1.9.11: UI-based provider switching
- FR-1.9.13: Pluggable provider interface
- FR-1.9.14: Standardized `generate_script()` method
- Architecture Document: `llm-provider-abstraction-v2.md`

---

### ADR-010: Proactive Rate Limiting for Cloud LLM Providers

**Status:** Accepted
**Date:** 2026-01-22

**Context:**
Cloud providers (Gemini, Groq) have strict rate limits:
- **Gemini:** 15 requests/minute, 1,500 requests/day (free tier)
- **Groq:** 30 requests/minute, 1,000 requests/day (free tier)

Exceeding these limits causes:
- HTTP 429 errors (rate limit exceeded)
- Service disruption for users
- Poor UX (surprise failures)

**Reactive-only approach** (handle 429s when they occur) is insufficient:
- Unpredictable behavior
- User sees errors after waiting
- Difficult to recover without refresh

**Decision:**
Implement **proactive rate limiting** using sliding window algorithm:

1. **Local Enforcement:** Enforce conservative local limits (2 RPM for Groq, 1 RPM for Gemini)
2. **Sliding Window:** Track request timestamps in 60-second rolling window
3. **Wait Strategy:** If limit hit, wait until oldest timestamp expires
4. **HTTP Header Monitoring:** Parse `x-ratelimit-remaining-*`, `retry-after` headers for reactive adjustments
5. **Configurable:** Environment variables for enabling/disabling and setting limits

**Algorithm:**
```typescript
// Sliding window rate limiting
const timestamps = [t1, t2, t3, ...]; // Request times in last 60s
if (timestamps.length >= limit) {
  const waitMs = timestamps[0] + 60000 - now;
  await sleep(waitMs);
}
```

**Configuration:**
```bash
# Gemini: Conservative 1 RPM (actual limit 15 RPM)
GEMINI_RATE_LIMIT_ENABLED=true
GEMINI_RATE_LIMIT_REQUESTS_PER_MINUTE=1

# Groq: Conservative 2 RPM (actual limit 30 RPM)
GROQ_RATE_LIMIT_ENABLED=true
GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE=2
GROQ_RATE_LIMIT_SECONDS_PER_REQUEST=30
```

**Consequences:**
- ✅ Prevents API quota exhaustion
- ✅ Predictable behavior (no surprise 429s)
- ✅ Graceful degradation (automatic wait)
- ✅ Configurable per provider
- ✅ User feedback for long waits (>60s)
- ⚠️ Conservative limits may underutilize free tier
- ⚠️ Adds ~30s delay between Groq requests

**Alternatives Considered:**
- Reactive only (handle 429s): Unpredictable, poor UX
- No rate limiting: Risk of quota exhaustion, service disruption
- External service (Redis): Over-engineering for single-user app
- Token bucket algorithm: More complex, sliding window sufficient

**Monitoring & Logging:**
```typescript
console.log(`[RateLimiter] groq rate limit check passed (1/2 used)`);
console.log(`[RateLimiter] gemini rate limit hit, waiting 45.2s`);
console.log(`[GroqProvider] Rate limit: 998/1000 requests remaining`);
```

**References:**
- FR-1.9.09: Configurable rate limiting for cloud providers
- Rate Limiter Implementation: `src/lib/llm/rate-limiter.ts`
- Provider Implementations: `*-provider.ts`

---

### ADR-015: NASA Image and Video Library API Integration (Epic 9)

**Status:** Accepted
**Date:** 2026-01-25

**Context:**
Story 6.11 implemented NASA video provider using Playwright web scraping, following the same pattern as Story 6.10 (DVIDS). However, Epic 8 successfully migrated DVIDS from web scraping to the official DVIDS Search API, providing:
- More reliable video metadata retrieval
- Better error handling with proper HTTP status codes
- Rate limiting based on API documentation
- Cleaner implementation without browser automation overhead

NASA provides an official Image and Video Library API (`https://images-api.nasa.gov/search`) that can replace the Playwright web scraping approach with similar benefits.

**Decision:**
Migrate NASA video provider from Playwright web scraping to official NASA Image and Video Library API, following the Epic 8 (DVIDS) pattern:

1. **API Integration:** Use `https://images-api.nasa.gov/search` endpoint
2. **Authentication:** API key via `NASA_API_KEY` environment variable (optional for public content)
3. **Video Download:** Direct MP4 URLs via httpx (no FFmpeg required - simpler than DVIDS)
4. **Infrastructure Reuse:** Maximize reuse of Epic 8 infrastructure:
   - Connection pooling (Story 8.4)
   - Diversity tracking (Story 8.3)
   - Filename sanitization (Story 8.5)

**Consequences:**
- ✅ More reliable than web scraping (no JavaScript rendering issues)
- ✅ Better error handling (HTTP status codes vs browser detection)
- ✅ Simpler implementation than DVIDS (direct MP4 URLs, no HLS/FFmpeg)
- ✅ Faster performance (no browser overhead)
- ✅ Reuses Epic 8 infrastructure (reduces development effort)
- ✅ Consistent architecture across DVIDS and NASA providers
- ⚠️ API doesn't provide duration in search results (requires additional fetch)
- ⚠️ Rate limiting is self-imposed (NASA doesn't enforce strict limits)
- ✅ Optional API key (public content accessible without authentication)

**Key Differences from DVIDS (Epic 8):**

| Aspect | DVIDS (Epic 8) | NASA (Epic 9) |
|--------|---------------|---------------|
| **Video Download** | HLS manifests require FFmpeg | Direct MP4 URLs (simpler) |
| **Story 9.2 Points** | 5 points | 3 points |
| **Authentication** | Required API key | Optional API key (public content) |
| **Duration in Results** | Yes (in API response) | No (requires additional fetch) |
| **Infrastructure** | New implementation | Reuse Epic 8 (3 stories) |
| **Total Points** | 19 points | 16 points |

**Technical Implementation:**

**API Endpoint:** `https://images-api.nasa.gov/search`

**Search Parameters:**
- `q`: search terms (query)
- `media_type`: "video" (filter for videos only)
- `center`: NASA center (GSFC, JSC, KSC, etc.)
- `year_start`: start year filter
- `year_end`: end year filter
- `keywords`: comma-separated keywords

**Response Fields (NASA API format):**
```json
{
  "collection": {
    "items": [
      {
        "data": [{
          "nasa_id": "12345",           // Use as video_id
          "title": "Space Shuttle Launch",
          "description": "HD footage of...",
          "date_created": "2020-01-01",
          "center": "KSC"
        }],
        "links": [{
          "href": "https://images-assets.nasa.gov/video/xxx/xxx.mp4"  // Direct MP4 URL
        }]
      }
    ]
  }
}
```

**Video Download:**
- Direct MP4 URLs via httpx (no FFmpeg required)
- Simpler than DVIDS (no HLS manifest parsing)
- Progress tracking for download percentage
- Error handling for network failures

**Infrastructure Reuse from Epic 8:**

1. **Connection Pooling** (Story 9.4 - 2 points):
   - Reuses `Map<string, MCPClient> connections`
   - Reuses `ensureConnection(providerId)` function
   - Reuses `disconnectAll()` function
   - Only verification testing required

2. **Diversity Tracking** (Story 9.3 - 4 points):
   - Reuses `Set<string> selectedVideoIds`
   - Reuses selection algorithm (prioritize unused videos)
   - Only verification testing required

3. **Filename Sanitization** (Story 9.5 - 2 points):
   - Reuses `sanitize_video_id()` function
   - Handles NASA `nasa_id` format
   - Only verification testing required

**Stories:**
- Story 9.1: NASA API Integration (5 points)
- Story 9.2: Direct MP4 Video Download (3 points) - Simpler than Epic 8
- Story 9.3: Video Selection Diversity (4 points) - Reuse Epic 8
- Story 9.4: Connection Pooling (2 points) - Reuse Epic 8
- Story 9.5: Filename Compatibility (2 points) - Reuse Epic 8

**Total Points:** 16 points (vs 19 for Epic 8)

**Alternatives Considered:**
- **Keep Playwright scraping:** More complex, browser overhead, less reliable
- **Use NASA APOD API:** Limited to one image per day, not suitable for video sourcing
- **Use NASA RSS feeds:** No video metadata, limited search capabilities

**References:**
- Epic 8: DVIDS API Integration (pattern to follow)
- Story 6.11: Original NASA web scraping implementation (being replaced)
- NASA API Documentation: https://api.nasa.gov/
- NASA Image and Video Library API: https://images-api.nasa.gov/
- Epic 9 Documentation: `docs/epics/epic-9-nasa-api-integration.md`

---
