# AI Video Generator - System Architecture

**Project:** AI Video Generator
**Repository:** <https://github.com/AIfriendly/AIvideogen>
**Type:** Level 2 Greenfield Software Project
**Author:** Winston (BMAD Architect Agent)
**Date:** 2025-11-12
**Version:** 2.0
**Last Updated:** 2025-11-29

**Recent Changes (v2.0 - 2025-11-29):**
- Added Feature 2.7: Channel Intelligence & Content Research (RAG-Powered) architecture
- Added RAG database schema (channels, channel_videos, embeddings, news_sources tables)
- Added Background Job Queue architecture for daily sync operations
- Added version verification dates to Decision Summary
- Aligned with PRD v2.0

**Previous Changes (v1.9 - 2025-11-26):**
- Story 3.7b Bug Fix - migration 011 adds visual_keywords column to scenes

---

## Executive Summary

The AI Video Generator is a desktop-first web application built with Next.js 15.5 that automates end-to-end video creation from conversational brainstorming to final rendered output. The architecture leverages flexible LLM provider support (local Ollama + Llama 3.2 or cloud Google Gemini 2.5 with free tier), KokoroTTS for local voice synthesis, YouTube Data API for B-roll sourcing, and a sophisticated visual curation interface for scene-by-scene clip selection. The system is designed as a single-user local application with a hybrid state management approach (Zustand + SQLite), providing fast performance, instant video preview capabilities through pre-downloaded segments, and complete privacy while maintaining a clear migration path to cloud multi-tenant deployment.

The primary technology stack is FOSS (Free and Open-Source Software) compliant per PRD requirements. Optional cloud services (Google Gemini) are available for users who prefer cloud-based LLM with generous free tiers (1,500 requests/day) over local setup.

---

## Table of Contents

1. [Project Initialization](#project-initialization)
2. [Decision Summary](#decision-summary)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Epic to Architecture Mapping](#epic-to-architecture-mapping)
6. [LLM Provider Abstraction](#llm-provider-abstraction)
7. [System Prompts & LLM Persona Configuration](#system-prompts--llm-persona-configuration)
8. [State Management Architecture](#state-management-architecture)
9. [Database Schema](#database-schema)
10. [Video Processing Pipeline](#video-processing-pipeline)
11. [API Design](#api-design)
12. [Implementation Patterns](#implementation-patterns)
13. [Security & Privacy](#security--privacy)
14. [Performance Considerations](#performance-considerations)
15. [Development Environment](#development-environment)
16. [Deployment Architecture](#deployment-architecture)
17. [Cloud Migration Path](#cloud-migration-path)
18. [Cross-Epic Integration Architecture](#cross-epic-integration-architecture)
19. [Feature 2.7: Channel Intelligence & RAG Architecture](#feature-27-channel-intelligence--rag-architecture)
20. [Background Job Queue Architecture](#background-job-queue-architecture)
21. [Architecture Decision Records](#architecture-decision-records)

---

## Project Initialization

**First Implementation Story: Project Setup**

Execute the following commands to initialize the project:

```bash
# Create Next.js project with TypeScript, Tailwind CSS, ESLint, App Router
npx create-next-app@latest ai-video-generator --ts --tailwind --eslint --app

# Navigate to project
cd ai-video-generator

# Initialize shadcn/ui component library
npx shadcn@latest init

# Install additional dependencies
npm install zustand better-sqlite3 ollama @google/generative-ai plyr
npm install --save-dev @types/better-sqlite3

# Install Python dependencies (using UV package manager)
uv pip install yt-dlp kokoro-tts
# Or from requirements.txt: uv pip install -r requirements.txt

# Verify system dependencies
ollama --version  # Should be installed already
ffmpeg -version   # Install if missing
```

This establishes the base architecture with:
- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui for UI components
- Next.js App Router for routing
- ESLint for code quality

---

## Decision Summary

**Version Verification Date:** 2025-11-29

| Category | Decision | Version | Verified | FOSS | Affects | Rationale |
|----------|----------|---------|----------|------|---------|-----------|
| **Frontend Framework** | Next.js | 15.5 | 2025-11-29 | ✅ | All | React-based, server components, excellent DX |
| **Language** | TypeScript | 5.x | 2025-11-29 | ✅ | All | Type safety, better tooling |
| **Styling** | Tailwind CSS | v4 | 2025-11-29 | ✅ | Epic 4 | Rapid styling, utility-first |
| **Component Library** | shadcn/ui | Latest | 2025-11-29 | ✅ | Epic 4 | Accessible, Tailwind-based |
| **State Management** | Zustand | 5.0.8 | 2025-11-29 | ✅ | All | Lightweight (3KB), TypeScript-friendly |
| **Database** | SQLite via better-sqlite3 | 12.4.1 | 2025-11-29 | ✅ | All | Embedded, no server, local single-user |
| **Vector Database** | ChromaDB | 0.5.x | 2025-11-29 | ✅ | Feature 2.7 | Local FOSS vector DB, Python native |
| **Embeddings** | all-MiniLM-L6-v2 | Latest | 2025-11-29 | ✅ | Feature 2.7 | Local embeddings, sentence-transformers |
| **LLM (Primary)** | Ollama + Llama 3.2 | 3B | 2025-11-29 | ✅ | Epic 1, 2 | Local, FOSS, 128K context |
| **LLM (Optional)** | Google Gemini 2.5 | flash/pro | 2025-11-29 | ✅ Free | Epic 1, 2 | Cloud, 1,500 req/day free |
| **LLM SDK (Ollama)** | ollama (npm) | 0.6.2 | 2025-11-29 | ✅ | Epic 1, 2 | Official JavaScript SDK |
| **LLM SDK (Gemini)** | @google/generative-ai | 0.21.0 | 2025-11-29 | ✅ Free | Epic 1, 2 | Official JavaScript SDK |
| **Text-to-Speech** | KokoroTTS | 82M | 2025-11-29 | ✅ | Epic 2 | 48+ voices, high quality |
| **YouTube Downloader** | yt-dlp | 2025.10.22 | 2025-11-29 | ✅ | Epic 3 | Industry standard, robust |
| **Caption Scraping** | youtube-transcript-api | 0.6.x | 2025-11-29 | ✅ | Feature 2.7 | Python, auto-captions |
| **Video Processing** | FFmpeg | 7.1.2 | 2025-11-29 | ✅ | Epic 5 | Full control, future-proof |
| **Video Player** | Plyr | 3.7.8 | 2025-11-29 | ✅ | Epic 4 | Lightweight, accessible |
| **Job Scheduler** | node-cron | 3.0.x | 2025-11-29 | ✅ | Feature 2.7 | Simple cron-like scheduling |
| **API Layer** | Next.js API Routes | 15.5 | 2025-11-29 | ✅ | All | Built-in, REST-style |
| **File Storage** | Local Filesystem | N/A | N/A | ✅ | All | `.cache/` directory |
| **Testing** | Vitest | 2.1.x | 2025-11-29 | ✅ | All | Native ESM, fast, Vite-powered |

---

## Technology Stack

### Frontend Stack
- **Framework:** Next.js 15.5 (App Router)
- **UI Library:** React 19
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui (Radix UI primitives)
- **State Management:** Zustand 5.0.8
- **Video Player:** Plyr
- **Build Tool:** Turbopack (dev), Next.js compiler (production)

### Backend Stack
- **Runtime:** Node.js 18+ (via Next.js)
- **API:** Next.js API Routes
- **Database:** SQLite 3.x via better-sqlite3 12.4.1
- **LLM (Primary):** Ollama (local server) with Llama 3.2 (3B instruct)
- **LLM (Optional):** Google Gemini 2.5 Flash/Pro (cloud, free tier)
- **LLM SDK:** ollama 0.6.2, @google/generative-ai 0.21.0
- **TTS:** KokoroTTS (82M parameter model)
- **Video Download:** yt-dlp 2025.10.22 (Python)
- **Video Processing:** FFmpeg 7.1.2 (binary)

### External Services
- **YouTube Data API:** v3 (for B-roll search and metadata)
- **Ollama Server:** http://localhost:11434 (local LLM runtime, primary)
- **Google Gemini API:** generativelanguage.googleapis.com (cloud LLM, optional)
- **Google Cloud Vision API:** vision.googleapis.com (content analysis for B-roll filtering, 1,000 units/month free tier)

### Development Tools
- **Linting:** ESLint (Next.js config)
- **Formatting:** Prettier (recommended)
- **Testing:** Vitest 2.1.x (native ESM support, fast, Vite-powered)
- **Version Control:** Git

---

## Project Structure

```
ai-video-generator/
├── .cache/                    # Temporary files (git-ignored)
│   ├── audio/                 # Generated voiceover audio
│   ├── videos/                # Downloaded YouTube clips
│   ├── projects/              # Project working directories
│   └── output/                # Final rendered videos
│
├── .next/                     # Next.js build output (git-ignored)
├── node_modules/              # Node dependencies (git-ignored)
├── venv/                      # Python virtual environment (git-ignored)
│
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page (conversation UI)
│   ├── projects/              # Projects management
│   │   └── [id]/              # Individual project view
│   │       ├── page.tsx       # Project dashboard
│   │       ├── voice/         # Voice selection step
│   │       └── curation/      # Visual curation UI
│   │
│   └── api/                   # API Routes
│       ├── chat/              # LLM conversation endpoints
│       │   └── route.ts
│       ├── script/            # Script generation
│       │   └── route.ts
│       ├── voice/             # Voice selection & generation
│       │   ├── list/          # Get available voices
│       │   └── generate/      # Generate voiceover
│       ├── assembly/          # Video assembly
│       │   └── route.ts
│       └── projects/          # Project CRUD
│           ├── route.ts       # GET all, POST create
│           └── [id]/
│               ├── route.ts   # GET, PUT, DELETE project
│               ├── generate-visuals/  # Epic 3 visual sourcing
│               │   └── route.ts       # POST generate suggestions
│               └── visual-suggestions/ # Epic 3 suggestions retrieval
│                   └── route.ts        # GET visual suggestions
│
├── components/                # React components
│   ├── ui/                    # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── progress.tsx
│   │   └── ...
│   │
│   └── features/              # Feature-specific components
│       ├── conversation/      # Epic 1: Conversational agent
│       │   ├── ChatInterface.tsx
│       │   ├── MessageList.tsx
│       │   └── TopicConfirmation.tsx
│       │
│       ├── projects/          # Epic 1: Project management (Story 1.6)
│       │   ├── ProjectSidebar.tsx
│       │   ├── ProjectListItem.tsx
│       │   └── NewChatButton.tsx
│       │
│       ├── voice/             # Epic 2: Voice selection
│       │   ├── VoiceSelector.tsx
│       │   └── VoicePreview.tsx
│       │
│       ├── visual-sourcing/   # Epic 3: Visual sourcing loading
│       │   └── VisualSourcingLoader.tsx
│       │
│       ├── curation/          # Epic 4: Visual curation (6 stories)
│       │   ├── VisualCuration.tsx      # Story 4.1: Main page component
│       │   ├── SceneCard.tsx           # Story 4.1: Scene-by-scene layout
│       │   ├── VisualSuggestionGallery.tsx  # Story 4.2: Clip suggestions grid
│       │   ├── VideoPreviewPlayer.tsx  # Story 4.3: HTML5 player with controls
│       │   ├── ClipSelectionCard.tsx   # Story 4.4: Individual clip selection
│       │   ├── AssemblyTriggerButton.tsx    # Story 4.5: Sticky footer button
│       │   ├── ProgressTracker.tsx     # Story 4.1: Scene completion tracker
│       │   ├── EmptyClipState.tsx      # Story 4.2: No clips found fallback
│       │   ├── NavigationBreadcrumb.tsx     # Story 4.6: Workflow navigation
│       │   └── ConfirmationModal.tsx   # Story 4.5: Assembly confirmation
│       │
│       └── assembly/          # Epic 5: Video assembly
│           ├── AssemblyProgress.tsx
│           └── VideoDownload.tsx
│
├── lib/                       # Utilities and helpers
│   ├── llm/                   # LLM provider abstraction
│   │   ├── provider.ts        # LLMProvider interface
│   │   ├── ollama-provider.ts # Ollama implementation (local)
│   │   ├── gemini-provider.ts # Gemini implementation (cloud)
│   │   ├── factory.ts         # Provider factory
│   │   └── prompts/           # Prompt templates
│   │       ├── default-system-prompt.ts  # Default persona
│   │       └── visual-search-prompt.ts   # Scene analysis prompt
│   │
│   ├── tts/                   # Text-to-speech
│   │   ├── kokoro.ts          # KokoroTTS wrapper
│   │   └── voice-config.ts    # Available voices
│   │
│   ├── youtube/               # YouTube API integration (Epic 3)
│   │   ├── client.ts          # YouTubeAPIClient class
│   │   ├── analyze-scene.ts   # Scene text analysis for search
│   │   ├── filter-results.ts  # Content filtering & ranking
│   │   ├── filter-config.ts   # Filtering preferences config
│   │   ├── entity-extractor.ts # Entity extraction for specific subjects (Story 3.2b)
│   │   ├── query-optimizer.ts  # Platform-optimized query generation (Story 3.2b)
│   │   ├── trigger-downloads.ts # Auto-trigger segment downloads after visual gen (Story 3.7b)
│   │   └── download-queue.ts   # Concurrent download queue with CV analysis integration
│   │
│   ├── vision/                # Google Cloud Vision API (Epic 3 Story 3.7)
│   │   ├── client.ts          # VisionAPIClient class
│   │   ├── analyze-content.ts # Face detection, OCR, label verification
│   │   └── frame-extractor.ts # FFmpeg frame extraction for analysis
│   │
│   ├── video/                 # Video processing
│   │   ├── downloader.ts      # yt-dlp wrapper
│   │   ├── ffmpeg.ts          # FFmpeg utilities
│   │   └── assembler.ts       # Video assembly logic
│   │
│   ├── db/                    # Database utilities
│   │   ├── client.ts          # SQLite connection
│   │   ├── schema.sql         # Database schema
│   │   ├── init.ts            # Database initialization and migrations runner
│   │   ├── queries.ts         # Reusable queries
│   │   └── migrations/        # Database migrations
│   │       ├── 002_content_generation_schema.ts
│   │       ├── 003_visual_suggestions_schema.ts
│   │       ├── 004_add_current_step_constraint.ts
│   │       ├── 005_fix_current_step_constraint.ts
│   │       ├── 006_add_selected_clip_id.ts
│   │       ├── 007_add_cv_score.ts
│   │       ├── 008_assembly_jobs.ts
│   │       ├── 009_add_downloading_stage.ts
│   │       ├── 010_add_queued_status.ts  # Story 3.7b: Add 'queued' to download_status CHECK
│   │       └── 011_add_visual_keywords.ts # Story 3.7b: Add visual_keywords to scenes for CV label matching
│   │
│   └── utils/                 # General utilities
│       ├── file-manager.ts    # File operations
│       └── error-handler.ts   # Error handling utilities
│
├── stores/                    # Zustand state stores
│   ├── workflow-store.ts      # Workflow state (current step, data)
│   ├── conversation-store.ts  # Active conversation state
│   ├── project-store.ts       # Project list and active project state
│   └── curation-store.ts      # Clip selection state
│
├── types/                     # TypeScript type definitions
│   ├── workflow.ts            # Workflow types
│   ├── conversation.ts        # Message types
│   ├── video.ts               # Video/clip types
│   └── api.ts                 # API request/response types
│
├── public/                    # Static assets
│   ├── voice-samples/         # Voice preview audio files
│   └── icons/
│
├── .env.local                 # Environment variables (git-ignored)
├── .gitignore
├── next.config.js             # Next.js configuration
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Node dependencies
├── requirements.txt           # Python dependencies
└── README.md                  # Project documentation
```

---

## Epic to Architecture Mapping

### Epic 1: Conversational Topic Discovery

#### Story 1.1-1.5: Chat Interface & LLM Integration
**Components:**
- `components/features/conversation/ChatInterface.tsx` - Main chat UI
- `components/features/conversation/MessageList.tsx` - Message display
- `components/features/conversation/TopicConfirmation.tsx` - Topic approval

**Backend:**
- `app/api/chat/route.ts` - LLM conversation endpoint
- `lib/llm/ollama-provider.ts` - Ollama integration (local)
- `lib/llm/gemini-provider.ts` - Gemini integration (cloud, optional)
- `lib/llm/factory.ts` - Provider selection logic
- `stores/conversation-store.ts` - Conversation state

**Database:**
- `messages` table - Persistent conversation history
- `projects` table - Topic and project metadata

**Key Flow:**
1. User types message → Saved to database
2. Load conversation history → Send to Llama 3.2 via Ollama
3. AI response → Saved to database → Displayed
4. Topic confirmation → Create project record

#### Story 1.6: Project Management UI
**Components:**
- `components/features/projects/ProjectSidebar.tsx` - Sidebar with project list (280px width)
- `components/features/projects/ProjectListItem.tsx` - Individual project item display
- `components/features/projects/NewChatButton.tsx` - Create new project action button

**Backend:**
- `app/api/projects/route.ts` - GET (list all projects), POST (create new project)
- `app/api/projects/[id]/route.ts` - GET (project details), PUT (update metadata), DELETE (delete project - optional)
- `lib/db/queries.ts` - getAllProjects(), createProject(), updateProjectLastActive(), deleteProject()
- `stores/project-store.ts` - Active project ID, project list state, localStorage persistence

**Database:**
- `projects` table - All project records with name, topic, last_active timestamp
- Query pattern: `SELECT * FROM projects ORDER BY last_active DESC`

**Key Flow:**
1. User clicks "New Chat" → Create project record → Set as active → Clear chat
2. User clicks project in sidebar → Load project's messages → Update URL → Update last_active
3. On any project activity → Update last_active timestamp
4. First user message → Auto-generate project name (first 30 chars, trim to word)
5. Active project ID persisted in localStorage → Restored on app reload

---

### Epic 2: Content Generation Pipeline + Voice Selection
**Components:**
- `components/features/voice/VoiceSelector.tsx` - Voice selection UI
- `components/features/voice/VoicePreview.tsx` - Audio preview player

**Backend:**
- `app/api/script/route.ts` - Script generation via LLM
- `app/api/voice/list/route.ts` - Get available KokoroTTS voices
- `app/api/voice/generate/route.ts` - Generate voiceover audio
- `lib/tts/kokoro.ts` - KokoroTTS integration
- `lib/llm/ollama-provider.ts` - Script generation (local)
- `lib/llm/gemini-provider.ts` - Script generation (cloud, optional)

**Database:**
- `projects` table - Store generated script, selected voice
- SQLite stores script text and voice selection

**Key Flow:**
1. Generate script from topic using Llama 3.2
2. Parse script into scenes
3. Display voice options (48+ KokoroTTS voices)
4. User selects voice → Preview audio
5. Generate voiceover for each scene using selected voice
6. Save audio files to `.cache/audio/`

---

### Epic 3: Visual Content Sourcing (YouTube API)

**Goal:** Automatically source relevant B-roll video clips from YouTube using AI analysis and the YouTube Data API v3.

#### Story 3.1: YouTube API Client & Authentication
**Components:**
- `lib/youtube/client.ts` - YouTubeAPIClient class with authentication
- Environment variable: `YOUTUBE_API_KEY`

**Key Features:**
- API key configuration and validation
- Quota tracking (10,000 units/day limit)
- Rate limiting (100 requests per 100 seconds)
- Exponential backoff retry logic (max 3 attempts)
- Error handling for invalid key, quota exceeded, network failures

**Error Messages:**
- Missing API key: "YouTube API key not configured. Add YOUTUBE_API_KEY to .env.local"
- Quota exceeded: "YouTube API quota exceeded. Try again tomorrow or upgrade quota."
- Invalid key: "Invalid YouTube API key. Get a key at https://console.cloud.google.com"

#### Story 3.2: Scene Text Analysis & Search Query Generation
**Components:**
- `src/lib/youtube/analyze-scene.ts` - analyzeSceneForVisuals() function
- `src/lib/llm/prompts/visual-search-prompt.ts` - Scene analysis prompt template
- `src/lib/youtube/keyword-extractor.ts` - Fallback keyword extraction
- `src/lib/youtube/types.ts` - SceneAnalysis interface and ContentType enum

**Module Responsibilities:**
- **SceneAnalyzer:** Main analyzeSceneForVisuals() function, orchestrates LLM call with retry logic and fallback
- **VisualSearchPrompt:** LLM prompt template optimized for extracting visual themes and generating search queries
- **KeywordExtractor:** Fallback NLP-based keyword extraction (frequency analysis, stop word removal)
- **Types:** TypeScript interfaces for SceneAnalysis and ContentType enum

**Key Flow:**
1. Input validation (scene text must be non-empty)
2. Build LLM prompt from template with scene text injection
3. Call LLM provider with 10-second timeout
4. Parse JSON response and validate required fields (mainSubject, primaryQuery)
5. Handle errors with retry logic:
   - Empty/missing fields → Retry once (1s delay)
   - Invalid JSON → Immediate fallback (no retry)
   - Timeout/connection error → Immediate fallback
6. Return SceneAnalysis object or fallback result

**Data Flow:**
```
Scene Text (from database)
    ↓
Visual Search Prompt Template
    ↓
LLM Provider (Ollama/Gemini) → [10s timeout]
    ↓
JSON Response Parsing & Validation
    ↓
    ├─→ Valid Response → SceneAnalysis Object
    ├─→ Invalid/Empty → Retry (1x) → Valid or Fallback
    └─→ Timeout/Error → Fallback Keyword Extraction
    ↓
SceneAnalysis Object Returned
    ↓
[Story 3.3: YouTube Search]
```

**SceneAnalysis Structure:**
```typescript
interface SceneAnalysis {
  mainSubject: string;        // e.g., "lion"
  setting: string;            // e.g., "savanna"
  mood: string;               // e.g., "sunset"
  action: string;             // e.g., "roaming"
  keywords: string[];         // e.g., ["wildlife", "grassland", "golden hour"]
  primaryQuery: string;       // e.g., "lion savanna sunset wildlife"
  alternativeQueries: string[]; // e.g., ["african lion sunset", "lion walking grassland"]
  contentType: ContentType;   // e.g., ContentType.NATURE
}
```

**ContentType Enum:**
- GAMEPLAY - Gaming footage (e.g., Minecraft gameplay)
- TUTORIAL - Educational how-to content
- NATURE - Wildlife, landscapes, natural phenomena
- B_ROLL - Generic background footage (default fallback)
- DOCUMENTARY - Documentary-style footage
- URBAN - City scenes, architecture
- ABSTRACT - Visual metaphors for abstract concepts

**Example Analysis:**
- Input: "A majestic lion roams the savanna at sunset"
- Output:
  - mainSubject: "lion"
  - setting: "savanna"
  - mood: "sunset"
  - action: "roaming"
  - keywords: ["wildlife", "grassland", "golden hour", "majestic"]
  - primaryQuery: "lion savanna sunset wildlife"
  - alternativeQueries: ["african lion sunset", "lion walking grassland golden hour"]
  - contentType: ContentType.NATURE

**Fallback Mechanism:**
When LLM is unavailable, keyword extraction provides:
- Simple frequency-based analysis (no external NLP libraries)
- Stop word removal (~50 common English words)
- Top 5 keywords by frequency
- Basic query construction from top 4 keywords
- Default contentType: B_ROLL
- Performance: <100ms (vs <5s LLM target)

**Error Handling:**
- Input validation: Throws error for empty/whitespace-only scene text
- LLM timeout: 10 seconds, triggers fallback
- Invalid JSON: Immediate fallback (no retry)
- Missing required fields: Retry once, then fallback
- Connection errors: Immediate fallback
- All errors logged with context for debugging

**Performance Targets:**
- LLM analysis: <5s average (10s timeout)
- Fallback: <100ms
- No blocking delays for user workflow
- Performance warnings logged if analysis >5s

**Integration:**
- Uses createLLMProvider() factory from Epic 1 Story 1.3
- Supports both Ollama (local) and Gemini (cloud) providers
- No provider-specific logic in scene analysis code
- Follows same patterns as Epic 1 chat implementation

**Visual Keywords Storage & CV Integration (Story 3.7b):**

The `keywords` array from SceneAnalysis is stored in the `scenes.visual_keywords` column for later use by CV analysis. This enables label verification during Story 3.7b auto-triggered CV analysis.

```typescript
// During Story 3.2 scene analysis (lib/youtube/analyze-scene.ts)
const analysis = await analyzeSceneForVisuals(scene.text);

// Store keywords for CV label matching (used by Story 3.7b)
db.prepare(`
  UPDATE scenes
  SET visual_keywords = ?
  WHERE id = ?
`).run(JSON.stringify(analysis.keywords), scene.id);

// Later, during Story 3.7b CV analysis (after download)
const scene = await getSceneById(sceneId);
const expectedLabels = JSON.parse(scene.visual_keywords || '[]');

// Pass to CV analysis for label verification
await analyzeVideoSuggestion(suggestionId, segmentPath, expectedLabels);
```

**Data Flow: Visual Keywords → CV Analysis:**
```
Story 3.2: analyzeSceneForVisuals()
    ↓
SceneAnalysis.keywords: ["lion", "savanna", "wildlife", "sunset"]
    ↓
Store in scenes.visual_keywords (JSON)
    ↓
Story 3.6: Download segment completes
    ↓
Story 3.7b: Fetch scene.visual_keywords
    ↓
Pass as expectedLabels to analyzeVideoSuggestion()
    ↓
CV verifies Vision API labels match expected keywords
    ↓
cv_score reflects label match quality
```

#### Story 3.3: YouTube Video Search & Result Retrieval
**Backend:**
- `app/api/projects/[id]/generate-visuals/route.ts` - Main endpoint
- `lib/youtube/client.ts` - searchVideos() method

**API Parameters:**
```typescript
{
  q: string,              // Search query
  part: 'snippet',
  type: 'video',
  videoEmbeddable: true,  // Only embeddable videos
  maxResults: 10-15,
  relevanceLanguage: 'en' // Configurable
}
```

**Key Flow:**
1. Load all scenes for project from database
2. For each scene:
   - Call analyzeSceneForVisuals() to get search queries
   - Execute YouTube search for primary + alternative queries
   - Retrieve metadata: videoId, title, thumbnail, channelTitle
   - Aggregate and deduplicate results by videoId
3. Save suggestions to visual_suggestions table
4. Update project.visuals_generated = true

**Error Handling:**
- Zero results: Pass empty array to filter (triggers empty state in Story 3.5 AC6)
- API quota exceeded: User-friendly error message, don't crash
- Network error: Retry with exponential backoff

#### Story 3.4: Content Filtering & Quality Ranking
**Components:**
- `lib/youtube/filter-results.ts` - Filtering and ranking logic
- `lib/youtube/filter-config.ts` - Configuration preferences

**Filtering Criteria:**
- **Duration:** Videos must be between 1x-3x scene voiceover duration (max 5 minutes)
- **Licensing:** Creative Commons preferred, Standard embeddable accepted
- **Quality:** Minimum 1000 views (spam prevention)
- **Title Spam:** Remove videos with >5 emojis or >50% ALL CAPS
- **Content Type:** Gaming = "gameplay no commentary", Nature = documentary-style

**Duration Filtering Logic:**
```typescript
// lib/youtube/filter-results.ts
function filterByDuration(
  results: YouTubeVideo[],
  sceneDuration: number
): YouTubeVideo[] {
  const minDuration = sceneDuration; // 1x ratio
  const maxDuration = Math.min(sceneDuration * 3, 300); // 3x or 5 min max

  return results.filter(video => {
    const duration = video.durationSeconds;
    return duration >= minDuration && duration <= maxDuration;
  });
}
```

**Duration Calculation:**
- Scene voiceover duration obtained from `scenes.duration` column (in seconds)
- Minimum: Equal to scene duration (1x ratio)
- Maximum: 3x scene duration OR 5 minutes (300s), whichever is smaller
- Example: 10s scene → accepts 10s-30s videos (max 30s)
- Example: 90s scene → accepts 90s-270s videos (max 270s = 4.5 min)
- Example: 120s scene → accepts 120s-300s videos (max 300s = 5 min, NOT 360s)

**Ranking Algorithm:**
- Relevance score (from YouTube API)
- View count (normalized)
- Recency (newer videos score higher)
- Channel authority (subscriber count if available)

**Output:** Top 5-8 ranked suggestions per scene

**Fallback Logic:**
- If all results filtered out:
  1. Relax duration threshold (1x-4x instead of 1x-3x)
  2. Relax view count threshold
  3. Relax title spam filters
  4. Return at least 1-3 suggestions if any results exist

#### Story 3.5: Visual Suggestions Database & Workflow Integration
**Components:**
- `app/api/projects/[id]/visual-suggestions/route.ts` - GET suggestions
- `components/features/visual-sourcing/VisualSourcingLoader.tsx` - Loading UI
- Database: visual_suggestions table

**Database:**
- visual_suggestions table stores suggested clip data per scene (see Database Schema section, lines 1528-1540 for full schema)

**Database Query Functions:**
```typescript
// lib/db/queries.ts
saveVisualSuggestions(sceneId: string, suggestions: Suggestion[]): void
getVisualSuggestions(sceneId: string): Suggestion[]
getVisualSuggestionsByProject(projectId: string): Suggestion[]
```

**Loading UI Features:**
- Scene-by-scene progress: "Analyzing scene 2 of 5..."
- Stage messages: "Analyzing scene...", "Searching YouTube...", "Filtering results..."
- Error recovery: Retry button for failed scenes (doesn't regenerate completed)
- Empty state: "No clips found for this scene. Try editing the script or searching manually." (AC6)
- API failure: Retry button for partial completion (AC7)

**Workflow Integration:**
1. Trigger automatically after Epic 2 voiceover generation completes
2. Update project.current_step = 'visual-sourcing'
3. Display VisualSourcingLoader with progress
4. On completion: Update project.current_step = 'visual-curation'
5. Navigate to Epic 4 Visual Curation UI

**Key Flow:**
1. For each scene, analyze text for visual keywords using LLM
2. Query YouTube Data API v3 with generated search terms
3. Filter and rank results (Creative Commons preferred, duration checks, quality checks)
4. Store top 5-8 clip suggestions per scene in database
5. Handle edge cases: zero results (empty state), API failures (retry), quota exceeded (error message)

#### Story 3.6: Default Segment Download Service
**Goal:** Download default video segments (first N seconds) for instant preview in Epic 4 curation UI

**Components:**
- `lib/video/downloader.ts` - yt-dlp wrapper with segment support
- `app/api/projects/[id]/download-default-segments/route.ts` - Batch download endpoint

**Database Extensions:**
- `visual_suggestions` table extended with:
  - `duration INTEGER` (video duration in seconds)
  - `default_segment_path TEXT` (path to downloaded default segment)
  - `download_status TEXT` (pending, downloading, complete, error)

**yt-dlp Default Segment Download:**
```typescript
// lib/video/downloader.ts
async function downloadDefaultSegment(
  videoId: string,
  sceneDuration: number,
  sceneNumber: number,
  projectId: string
): Promise<string> {
  const bufferSeconds = 5;
  const segmentDuration = sceneDuration + bufferSeconds;
  const outputPath = `.cache/videos/${projectId}/scene-${sceneNumber}-default.mp4`;

  // yt-dlp command: download first N seconds with audio stripped
  const command = `yt-dlp "https://youtube.com/watch?v=${videoId}" \
    --download-sections "*0-${segmentDuration}" \
    -f "best[height<=720]" \
    --postprocessor-args "ffmpeg:-an" \
    -o "${outputPath}"`;
  // Note: --postprocessor-args "ffmpeg:-an" strips audio track (Story 3.7 requirement)

  await execCommand(command);
  return outputPath;
}
```

**File Naming Convention:**
```
Default segments:  .cache/videos/{projectId}/scene-{sceneNumber}-default.mp4
Custom segments:   .cache/videos/{projectId}/scene-{sceneNumber}-custom-{startTimestamp}s.mp4
                   (Custom segments handled in Epic 4)
```

**Key Flow:**
```
1. After Story 3.4 filters and ranks suggestions (top 5-8 per scene)
2. For each scene's top suggestions:
   - Verify duration <= 3x scene duration (already filtered in Story 3.4)
   - Calculate segment duration: scene duration + 5s buffer
   - Download first N seconds using yt-dlp --download-sections "*0-{N}"
   - Save to .cache/videos/{projectId}/scene-{sceneNumber}-default.mp4
   - Update visual_suggestions.default_segment_path and download_status = 'complete'
3. Progress indicator: "Downloading preview clips... 12/24 complete"
4. On completion: Users can immediately preview actual footage in Epic 4 curation UI
5. Error handling: Network failures, YouTube restrictions → Mark download_status = 'error', continue with other clips
```

**Benefits:**
- ✅ Users preview actual footage (not just thumbnails) before selecting (Epic 4)
- ✅ "Use Default Segment" button in Epic 4 requires NO download (file already exists)
- ✅ Faster Epic 4 curation workflow (no waiting for downloads during selection)
- ✅ Default segments use first N seconds (0:00 start) - predictable, fast

**Download Parameters:**
- **Format:** `best[height<=720]` (HD quality, manageable file size)
- **Segment:** `*0-{duration}` (from 0:00 to scene_duration + 5s)
- **Buffer:** 5 seconds extra to allow trimming flexibility in Epic 5
- **Quality vs Size:** 720p strikes balance between preview quality and download speed

**Error Recovery:**
- Failed downloads don't block other scenes (continue processing)
- Retry logic: 3 attempts with exponential backoff (2s, 4s, 8s)
- Permanent failures (restricted videos) → Mark error, skip retry
- User can manually retry failed downloads in Epic 4 UI

**Auto-Trigger CV Analysis (Story 3.7b Integration):**

After each successful segment download, CV analysis automatically triggers to evaluate B-roll quality. This integration ensures users only see high-quality suggestions in the Visual Curation UI.

```typescript
// app/api/projects/[id]/download-segments/route.ts
import { analyzeVideoSuggestion, getCVFilterStatus } from '@/lib/vision';

// After successful segment download:
async function handleSuccessfulDownload(
  suggestionId: string,
  segmentPath: string,
  sceneId: string
) {
  // Update download status first (download is successful regardless of CV)
  await updateSuggestionStatus(suggestionId, 'complete', segmentPath);

  // Auto-trigger CV analysis (non-blocking, graceful degradation)
  try {
    const cvStatus = await getCVFilterStatus();
    if (cvStatus.available) {
      // Fetch scene's visual_keywords for expected labels
      const scene = await getSceneById(sceneId);
      const expectedLabels = scene.visual_keywords || [];

      // Run CV analysis - updates cv_score in database
      await analyzeVideoSuggestion(suggestionId, segmentPath, expectedLabels);
      console.log(`CV analysis complete for suggestion ${suggestionId}`);
    }
  } catch (error) {
    // CV failure should NEVER block download success (AC59)
    console.warn(`CV analysis failed for ${suggestionId}:`, error);
    // cv_score remains NULL - suggestion still visible to user
  }
}
```

**Error Isolation Pattern:**
- Download marked successful BEFORE CV analysis runs
- CV analysis wrapped in try-catch with warning log only
- If CV fails, cv_score remains NULL (suggestion stays visible)
- User can still see and use videos that weren't CV-analyzed

**Data Flow:**
```
Download Complete → Update download_status = 'complete'
                 → Fetch scene.visual_keywords
                 → Call analyzeVideoSuggestion(id, path, keywords)
                 → Update cv_score in visual_suggestions table
                 → [If CV fails: log warning, cv_score stays NULL]
```

#### Story 3.2b: Enhanced Search Query Generation

**Goal:** Improve query relevance with content-type awareness, entity extraction, and platform-optimized search patterns for pure B-roll results.

**Components:**
- `lib/youtube/entity-extractor.ts` - Entity extraction for specific subjects
- `lib/youtube/query-optimizer.ts` - Platform-optimized query generation
- `lib/llm/prompts/visual-search-prompt.ts` - Updated with content-type detection

**Content-Type Detection:**
```typescript
// lib/youtube/analyze-scene.ts - Extended ContentType enum
enum ContentType {
  GAMING = 'gaming',        // Gaming footage, boss fights, gameplay
  HISTORICAL = 'historical', // Documentary, archive footage
  CONCEPTUAL = 'conceptual', // Abstract visualization, futuristic
  NATURE = 'nature',        // Wildlife, landscapes
  TUTORIAL = 'tutorial',    // How-to, educational
  B_ROLL = 'b_roll',        // Generic background footage (default)
}

// Content-type specific query patterns
const CONTENT_TYPE_PATTERNS = {
  gaming: {
    qualityTerms: ['no commentary', 'gameplay only', '4K'],
    negativeTerms: ['-reaction', '-review', '-tier list', '-ranking'],
  },
  historical: {
    qualityTerms: ['documentary', 'archive footage', 'historical'],
    negativeTerms: ['-explained', '-reaction', '-my thoughts'],
  },
  conceptual: {
    qualityTerms: ['cinematic', '4K', 'stock footage', 'futuristic'],
    negativeTerms: ['-vlog', '-reaction', '-review'],
  },
  // ... other content types
};
```

**Entity Extraction:**
```typescript
// lib/youtube/entity-extractor.ts
interface ExtractedEntities {
  primarySubject: string;    // e.g., "Ornstein and Smough"
  gameTitle?: string;        // e.g., "Dark Souls"
  historicalEvent?: string;  // e.g., "Russian Revolution"
  conceptKeywords: string[]; // e.g., ["dystopian", "AI", "robots"]
}

async function extractEntities(sceneText: string, contentType: ContentType): Promise<ExtractedEntities> {
  // Use LLM to extract specific entities based on content type
  const prompt = `Extract specific entities from this scene text for ${contentType} video search:
  "${sceneText}"

  Return JSON with: primarySubject, gameTitle (if gaming), historicalEvent (if historical), conceptKeywords`;

  const llm = getLLMProvider();
  const response = await llm.chat([{ role: 'user', content: prompt }]);
  return JSON.parse(response);
}
```

**Query Optimization:**
```typescript
// lib/youtube/query-optimizer.ts
function optimizeQuery(
  entities: ExtractedEntities,
  contentType: ContentType
): string[] {
  const patterns = CONTENT_TYPE_PATTERNS[contentType];
  const baseTerms = [entities.primarySubject];

  // Add content-type specific context
  if (contentType === 'gaming' && entities.gameTitle) {
    baseTerms.push(entities.gameTitle);
  }

  // Build optimized queries
  const primaryQuery = [
    ...baseTerms,
    ...patterns.qualityTerms.slice(0, 2),
  ].join(' ') + ' ' + patterns.negativeTerms.join(' ');

  const alternativeQueries = [
    `${entities.primarySubject} ${patterns.qualityTerms[0]}`,
    `${baseTerms.join(' ')} cinematic`,
  ];

  return [primaryQuery, ...alternativeQueries];
}
```

**Example Query Generation:**

| Scene Text | Content Type | Generated Query |
|------------|--------------|-----------------|
| "The epic battle against Ornstein and Smough tests every player's skill" | GAMING | `dark souls ornstein smough boss fight no commentary gameplay only -reaction -review -tier list` |
| "The storming of the Winter Palace marked the beginning of Soviet rule" | HISTORICAL | `russian revolution winter palace historical documentary archive footage -explained -reaction` |
| "Towering skyscrapers loom over empty streets as autonomous drones patrol" | CONCEPTUAL | `dystopian city AI robots cinematic 4K stock footage -vlog -reaction` |

**Integration with Story 3.2:**
- Story 3.2b extends analyzeSceneForVisuals() to call entity extraction
- Query optimizer runs after content-type detection
- Negative terms automatically injected based on content type
- Fallback to basic keyword extraction if entity extraction fails

---

#### Story 3.7: Computer Vision Content Filtering

**Goal:** Filter low-quality B-roll using Google Cloud Vision API (face detection, OCR, label verification) and local processing (keyword filtering, audio stripping).

**Components:**
- `lib/vision/client.ts` - Google Cloud Vision API client
- `lib/vision/analyze-content.ts` - Content analysis functions
- `lib/vision/frame-extractor.ts` - FFmpeg frame extraction
- `lib/youtube/filter-results.ts` - Extended with CV filtering

**Architecture Pattern: Two-Tier Filtering**

```
                    YouTube Search Results
                            ↓
              ┌─────────────────────────────┐
              │   TIER 1: Local Filtering   │  (Free, Fast)
              │   - Keyword filtering       │
              │   - Title/description scan  │
              │   - Duration filtering      │
              └─────────────────────────────┘
                            ↓
                   Filtered Candidates
                            ↓
              ┌─────────────────────────────┐
              │   TIER 2: Vision API        │  (Cloud, Metered)
              │   - Thumbnail pre-filter    │
              │   - Face detection          │
              │   - OCR text detection      │
              │   - Label verification      │
              └─────────────────────────────┘
                            ↓
                   Ranked Suggestions
                   (with cv_score)
```

**Vision API Client:**
```typescript
// lib/vision/client.ts
import vision from '@google-cloud/vision';

export class VisionAPIClient {
  private client: vision.ImageAnnotatorClient;
  private quotaTracker: QuotaTracker;

  constructor() {
    this.client = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_CLOUD_VISION_KEY_FILE,
      // Or use API key: apiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY
    });
    this.quotaTracker = new QuotaTracker(1000); // 1,000 units/month free tier
  }

  async analyzeThumbnail(thumbnailUrl: string): Promise<ThumbnailAnalysis> {
    // Pre-filter using thumbnail before downloading video
    await this.quotaTracker.checkQuota(3); // 3 units per image

    const [result] = await this.client.annotateImage({
      image: { source: { imageUri: thumbnailUrl } },
      features: [
        { type: 'FACE_DETECTION' },
        { type: 'TEXT_DETECTION' },
        { type: 'LABEL_DETECTION', maxResults: 10 },
      ],
    });

    return {
      faceArea: this.calculateFaceArea(result.faceAnnotations),
      hasText: (result.textAnnotations?.length || 0) > 0,
      labels: result.labelAnnotations?.map(l => l.description) || [],
    };
  }

  async analyzeVideoFrames(
    framePaths: string[],
    expectedLabels: string[]
  ): Promise<VideoAnalysis> {
    // Analyze 3 frames (10%, 50%, 90% of video duration)
    const analyses = await Promise.all(
      framePaths.map(path => this.analyzeFrame(path))
    );

    return {
      avgFaceArea: this.average(analyses.map(a => a.faceArea)),
      hasTextOverlay: analyses.some(a => a.hasText),
      labelMatches: this.countLabelMatches(analyses, expectedLabels),
      cvScore: this.calculateCVScore(analyses, expectedLabels),
    };
  }

  private calculateFaceArea(faces: vision.protos.google.cloud.vision.v1.IFaceAnnotation[]): number {
    if (!faces || faces.length === 0) return 0;

    // Calculate total face bounding box area as percentage of frame
    let totalArea = 0;
    for (const face of faces) {
      const box = face.boundingPoly?.vertices;
      if (box && box.length >= 4) {
        const width = Math.abs((box[1].x || 0) - (box[0].x || 0));
        const height = Math.abs((box[2].y || 0) - (box[1].y || 0));
        totalArea += (width * height) / (1920 * 1080); // Normalized to 1080p
      }
    }
    return totalArea;
  }

  private calculateCVScore(
    analyses: FrameAnalysis[],
    expectedLabels: string[]
  ): number {
    // Higher score = better B-roll quality (normalized 0.0-1.0)
    let score = 1.0;

    // Penalize for faces (talking heads) - Story 3.7b thresholds
    const avgFaceArea = this.average(analyses.map(a => a.faceArea));
    if (avgFaceArea > CV_THRESHOLDS.TALKING_HEAD_AREA) {
      score -= CV_THRESHOLDS.FACE_PENALTY_MAJOR; // >10% = major penalty (-0.6)
    } else if (avgFaceArea > CV_THRESHOLDS.SMALL_FACE_AREA) {
      score -= CV_THRESHOLDS.FACE_PENALTY_MINOR; // 3-10% = minor penalty (-0.3)
    }

    // Penalize for text overlays (captions) - Story 3.7b thresholds
    const hasCaption = analyses.some(a =>
      a.textCoverage > CV_THRESHOLDS.CAPTION_COVERAGE ||
      a.textBlockCount > CV_THRESHOLDS.CAPTION_BLOCKS
    );
    if (hasCaption) {
      score -= CV_THRESHOLDS.CAPTION_PENALTY; // -0.4
    }

    // Reward for label matches
    const matchCount = this.countLabelMatches(analyses, expectedLabels);
    score += matchCount * 0.1; // +0.1 per matching label

    return Math.max(0, Math.min(1.0, score));
  }
}

// CV_THRESHOLDS constant (Story 3.7b values)
const CV_THRESHOLDS = {
  // Face detection thresholds
  TALKING_HEAD_AREA: 0.10,    // 10% of frame (was 15% in Story 3.7)
  SMALL_FACE_AREA: 0.03,      // 3% of frame (was 5% in Story 3.7)

  // Caption detection thresholds
  CAPTION_COVERAGE: 0.03,     // 3% text coverage (was 5% in Story 3.7)
  CAPTION_BLOCKS: 2,          // 2 text blocks (was 3 in Story 3.7)

  // Penalty values (normalized 0-1 scale)
  FACE_PENALTY_MAJOR: 0.6,    // -0.6 for talking heads (was -0.5)
  FACE_PENALTY_MINOR: 0.3,    // -0.3 for small faces (was -0.2)
  CAPTION_PENALTY: 0.4,       // -0.4 for captions (was -0.3)

  // UI filtering threshold
  MIN_DISPLAY_SCORE: 0.5,     // Hide suggestions below 0.5
};
```

**Quota Management:**
```typescript
// lib/vision/quota-tracker.ts
export class QuotaTracker {
  private monthlyLimit: number;
  private currentUsage: number = 0;

  constructor(monthlyLimit: number) {
    this.monthlyLimit = monthlyLimit;
    this.loadUsageFromDB();
  }

  async checkQuota(unitsNeeded: number): Promise<void> {
    if (this.currentUsage + unitsNeeded > this.monthlyLimit) {
      throw new QuotaExceededError(
        `Vision API quota exceeded (${this.currentUsage}/${this.monthlyLimit} units used). ` +
        'Falling back to keyword-only filtering. ' +
        'Upgrade quota at https://console.cloud.google.com/apis/api/vision.googleapis.com'
      );
    }
    this.currentUsage += unitsNeeded;
    await this.saveUsageToDB();
  }

  getUsagePercentage(): number {
    return (this.currentUsage / this.monthlyLimit) * 100;
  }
}
```

**Face Detection Filtering:**
```typescript
// lib/vision/analyze-content.ts
function filterByFaceDetection(
  analysis: ThumbnailAnalysis | VideoAnalysis,
  threshold: number = CV_THRESHOLDS.TALKING_HEAD_AREA // 10% of frame area (Story 3.7b)
): FilterResult {
  if (analysis.avgFaceArea > threshold) {
    return {
      pass: false,
      reason: `Face detected covering ${(analysis.avgFaceArea * 100).toFixed(1)}% of frame (threshold: ${threshold * 100}%)`,
    };
  }
  return { pass: true };
}
```

**Label Verification:**
```typescript
// lib/vision/analyze-content.ts
async function generateExpectedLabels(
  sceneText: string,
  contentType: ContentType
): Promise<string[]> {
  // Use LLM to generate expected Vision API labels for scene
  const prompt = `For this ${contentType} scene: "${sceneText}"
  Generate 5 expected Google Cloud Vision API labels that should appear in matching B-roll footage.
  Return as JSON array of strings.`;

  const llm = getLLMProvider();
  const response = await llm.chat([{ role: 'user', content: prompt }]);
  return JSON.parse(response);
}

function verifyLabels(
  detectedLabels: string[],
  expectedLabels: string[]
): LabelVerification {
  const matches = expectedLabels.filter(expected =>
    detectedLabels.some(detected =>
      detected.toLowerCase().includes(expected.toLowerCase()) ||
      expected.toLowerCase().includes(detected.toLowerCase())
    )
  );

  return {
    pass: matches.length >= 1, // At least 1 of top 3 expected labels
    matchCount: matches.length,
    matchedLabels: matches,
    expectedLabels,
  };
}
```

**Frame Extraction:**
```typescript
// lib/vision/frame-extractor.ts
async function extractFrames(
  videoPath: string,
  outputDir: string
): Promise<string[]> {
  // Extract 3 frames at 10%, 50%, 90% of video duration
  const duration = await getVideoDuration(videoPath);
  const timestamps = [
    duration * 0.1,
    duration * 0.5,
    duration * 0.9,
  ];

  const framePaths: string[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const outputPath = `${outputDir}/frame-${i}.jpg`;
    await execCommand(
      `ffmpeg -ss ${timestamps[i]} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`
    );
    framePaths.push(outputPath);
  }

  return framePaths;
}
```

**Integration with Filtering Pipeline:**
```typescript
// lib/youtube/filter-results.ts - Extended
async function filterAndRankResults(
  results: YouTubeVideo[],
  sceneText: string,
  sceneDuration: number,
  contentType: ContentType
): Promise<RankedSuggestion[]> {
  // TIER 1: Local filtering (free, fast)
  let filtered = filterByDuration(results, sceneDuration);
  filtered = filterByKeywords(filtered, contentType);
  filtered = filterByViewCount(filtered, 1000);
  filtered = filterByTitleSpam(filtered);

  // TIER 2: Vision API filtering (cloud, metered)
  const visionClient = new VisionAPIClient();
  const expectedLabels = await generateExpectedLabels(sceneText, contentType);

  const analyzed: RankedSuggestion[] = [];

  for (const video of filtered) {
    try {
      // Step 1: Thumbnail pre-filter (faster, cheaper)
      const thumbnailAnalysis = await visionClient.analyzeThumbnail(video.thumbnailUrl);

      // Quick reject if thumbnail shows talking head
      if (thumbnailAnalysis.faceArea > 0.15) {
        continue; // Skip downloading this video
      }

      // Step 2: Full video frame analysis (after download)
      // This happens in Story 3.6 after segment download

      analyzed.push({
        ...video,
        cv_score: calculateCVScore(thumbnailAnalysis, expectedLabels),
        thumbnailAnalysis,
      });
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        // Fallback to keyword-only filtering
        console.warn('Vision API quota exceeded, using keyword-only filtering');
        analyzed.push({ ...video, cv_score: 50 }); // Neutral score
      } else {
        throw error;
      }
    }
  }

  // Rank by cv_score (higher = better B-roll)
  return analyzed.sort((a, b) => b.cv_score - a.cv_score);
}
```

**Database Extension:**
```sql
-- Add cv_score column to visual_suggestions table (Migration v8)
ALTER TABLE visual_suggestions ADD COLUMN cv_score REAL;

-- cv_score ranges from 0-100:
-- 100 = Perfect B-roll (no faces, no text, matching labels)
-- 50 = Neutral (keyword-only filtering, no CV analysis)
-- 0 = Poor quality (talking heads, captions, mismatched content)
```

**Error Handling & Fallback:**
```typescript
// Graceful degradation when Vision API unavailable
async function filterWithFallback(
  results: YouTubeVideo[],
  sceneText: string,
  sceneDuration: number,
  contentType: ContentType
): Promise<RankedSuggestion[]> {
  try {
    return await filterAndRankResults(results, sceneText, sceneDuration, contentType);
  } catch (error) {
    if (error instanceof QuotaExceededError ||
        error.message.includes('GOOGLE_CLOUD_VISION')) {
      // Fall back to Tier 1 filtering only
      console.warn('Vision API unavailable, using keyword-only filtering');

      let filtered = filterByDuration(results, sceneDuration);
      filtered = filterByKeywords(filtered, contentType);

      return filtered.map(video => ({
        ...video,
        cv_score: 50, // Neutral score for keyword-only filtering
      }));
    }
    throw error;
  }
}
```

**Performance Considerations:**
- **Thumbnail Pre-Filtering:** ~200ms per thumbnail (reduces video downloads by 30-50%)
- **Video Frame Analysis:** ~500ms per video (3 frames)
- **Total CV Processing:** <5 seconds per video suggestion
- **Quota Efficiency:** 3 units per thumbnail, 9 units per video (3 frames × 3 features)

**Environment Variables:**
```bash
# .env.local - Google Cloud Vision API Configuration
GOOGLE_CLOUD_VISION_API_KEY=your_api_key_here
# Or use service account:
# GOOGLE_CLOUD_VISION_KEY_FILE=./service-account.json
```

---

### Epic 4: Visual Curation Interface

**Goal:** Provide a professional, intuitive interface for creators to review scripts, preview suggested video clips, and finalize visual selections scene-by-scene.

**User Value:** Maintain creative control through easy-to-use curation workflow with instant video previews, progress tracking, and validation before final assembly.

#### Story 4.1: Scene-by-Scene UI Layout & Script Display

**Page Component:**
- `app/projects/[id]/visual-curation/page.tsx` - Main curation page route
- `components/features/curation/VisualCuration.tsx` - Container component

**Layout Structure:**
```typescript
// VisualCuration.tsx component structure
<div className="visual-curation">
  {/* Sticky Navigation Header */}
  <NavigationBreadcrumb
    steps={['Project', 'Script', 'Voiceover', 'Visual Curation']}
    currentStep="Visual Curation"
  />

  {/* Progress Tracker */}
  <ProgressTracker
    completed={selectedScenes}
    total={totalScenes}
  />

  {/* Actions Bar */}
  <div className="actions-bar">
    <button onClick={backToScriptPreview}>← Back to Script Preview</button>
    <button onClick={regenerateVisuals}>🔄 Regenerate Visuals</button>
  </div>

  {/* Scene Cards */}
  {scenes.map(scene => (
    <SceneCard
      key={scene.id}
      scene={scene}
      suggestions={getSuggestionsForScene(scene.id)}
      onClipSelect={handleClipSelection}
    />
  ))}

  {/* Sticky Assembly Footer */}
  <AssemblyTriggerButton
    disabled={!allScenesComplete}
    onClick={showAssemblyConfirmation}
  />
</div>
```

**SceneCard Component:**
```typescript
// components/features/curation/SceneCard.tsx
interface SceneCardProps {
  scene: Scene;
  suggestions: VisualSuggestion[];
  onClipSelect: (sceneId: string, suggestionId: string) => void;
  selectedSuggestionId?: string;
}

export function SceneCard({ scene, suggestions, onClipSelect, selectedSuggestionId }: SceneCardProps) {
  return (
    <div className="scene-card">
      {/* Header */}
      <div className="scene-header">
        <div className="scene-badge">Scene {scene.scene_number}</div>
        <div className={`status-badge status-${getStatus()}`}>
          {selectedSuggestionId ? '✓ Complete' : '⚠ Pending'}
        </div>
      </div>

      {/* Script Text */}
      <div className="scene-script">
        {scene.text}
      </div>

      {/* Visual Suggestions Gallery */}
      <VisualSuggestionGallery
        suggestions={suggestions}
        onSelect={(suggestionId) => onClipSelect(scene.id, suggestionId)}
        selectedId={selectedSuggestionId}
      />
    </div>
  );
}
```

**API Endpoint:**
```typescript
// app/api/projects/[id]/scenes/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const scenes = db.prepare(`
    SELECT id, scene_number, text, audio_file_path, duration
    FROM scenes
    WHERE project_id = ?
    ORDER BY scene_number ASC
  `).all(params.id);

  return Response.json({ success: true, data: scenes });
}
```

**UX Specifications (from ux-design-specification.md):**
- **Layout:** Desktop-first, max-width 1400px, centered
- **Navigation:** Sticky header with breadcrumb navigation
- **Scene Cards:** Sequential display (Scene 1, Scene 2, etc.)
- **Progress:** Real-time completion tracker in header
- **Colors:** Dark mode (Slate 900 background, Slate 800 cards)
- **Typography:** Clear hierarchy (scene number, script text, metadata)
- **Spacing:** Consistent 24px gaps between scene cards

#### Story 4.2: Visual Suggestions Display & Gallery

**Component:**
```typescript
// components/features/curation/VisualSuggestionGallery.tsx
interface VisualSuggestionGalleryProps {
  suggestions: VisualSuggestion[];
  onSelect: (suggestionId: string) => void;
  selectedId?: string;
}

export function VisualSuggestionGallery({ suggestions, onSelect, selectedId }: VisualSuggestionGalleryProps) {
  if (suggestions.length === 0) {
    return <EmptyClipState />;
  }

  return (
    <div className="clip-grid">
      {suggestions.map(suggestion => (
        <ClipSelectionCard
          key={suggestion.id}
          suggestion={suggestion}
          isSelected={suggestion.id === selectedId}
          onSelect={() => onSelect(suggestion.id)}
        />
      ))}
    </div>
  );
}

// components/features/curation/ClipSelectionCard.tsx
interface ClipSelectionCardProps {
  suggestion: VisualSuggestion;
  isSelected: boolean;
  onSelect: () => void;
}

export function ClipSelectionCard({ suggestion, isSelected, onSelect }: ClipSelectionCardProps) {
  return (
    <div
      className={`clip-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      {/* Selection Checkmark */}
      {isSelected && <div className="checkmark">✓</div>}

      {/* YouTube Thumbnail */}
      <img
        src={suggestion.thumbnail_url}
        alt={suggestion.title}
        className="clip-thumbnail"
      />

      {/* Download Status Badge */}
      <div className={`download-badge download-${suggestion.download_status}`}>
        {getDownloadStatusLabel(suggestion.download_status)}
      </div>

      {/* Play Icon Overlay */}
      <div className="play-icon">▶</div>

      {/* Metadata Overlay */}
      <div className="clip-overlay">
        <div className="clip-title">{suggestion.title}</div>
        <div className="clip-meta">
          <span>{suggestion.channel_title}</span>
          <span>{formatDuration(suggestion.duration)}</span>
        </div>
      </div>
    </div>
  );
}

// components/features/curation/EmptyClipState.tsx
export function EmptyClipState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">🎬</div>
      <div className="empty-title">No suitable video clips found for this scene</div>
      <div className="empty-text">
        The YouTube search returned no results. Try manual search or skip this scene.
      </div>
      <button onClick={handleManualSearch}>🔍 Search YouTube Manually</button>
      <button onClick={handleSkipScene}>Skip This Scene</button>
    </div>
  );
}
```

**API Endpoint:**
```typescript
// app/api/projects/[id]/visual-suggestions/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Get all scenes for project
  const scenes = db.prepare(`
    SELECT id, scene_number FROM scenes WHERE project_id = ? ORDER BY scene_number
  `).all(params.id);

  // Get suggestions for each scene (includes cv_score for filtering)
  const scenesSuggestions = scenes.map(scene => {
    const suggestions = db.prepare(`
      SELECT id, video_id, title, thumbnail_url, channel_title,
             embed_url, rank, duration, default_segment_path, download_status, cv_score
      FROM visual_suggestions
      WHERE scene_id = ?
      ORDER BY rank ASC
    `).all(scene.id);

    return {
      sceneId: scene.id,
      sceneNumber: scene.scene_number,
      suggestions
    };
  });

  return Response.json({ success: true, data: scenesSuggestions });
}
```

**CV Score UI Filtering (Story 3.7b):**

The Visual Curation UI filters suggestions based on cv_score to hide low-quality B-roll:

```typescript
// lib/utils/cv-filter.ts
import { CV_THRESHOLDS } from '@/lib/vision/client';

interface FilteredSuggestions {
  visible: VisualSuggestion[];
  hiddenCount: number;
}

/**
 * Filter suggestions for UI display based on cv_score
 * - cv_score >= 0.5: Show (acceptable B-roll)
 * - cv_score < 0.5: Hide (low quality - faces, captions)
 * - cv_score === null: Show (not yet analyzed)
 */
export function filterSuggestionsByQuality(
  suggestions: VisualSuggestion[]
): FilteredSuggestions {
  const visible: VisualSuggestion[] = [];
  let hiddenCount = 0;

  for (const suggestion of suggestions) {
    // NULL cv_score = not analyzed yet, show to user (AC65)
    if (suggestion.cv_score === null) {
      visible.push(suggestion);
      continue;
    }

    // cv_score >= 0.5 = acceptable quality, show (AC64)
    if (suggestion.cv_score >= CV_THRESHOLDS.MIN_DISPLAY_SCORE) {
      visible.push(suggestion);
    } else {
      // cv_score < 0.5 = low quality, hide (AC64)
      hiddenCount++;
    }
  }

  return { visible, hiddenCount };
}

// components/features/curation/FilteredSuggestionsInfo.tsx
interface FilteredSuggestionsInfoProps {
  hiddenCount: number;
}

/**
 * Display count of filtered low-quality videos (AC66)
 */
export function FilteredSuggestionsInfo({ hiddenCount }: FilteredSuggestionsInfoProps) {
  if (hiddenCount === 0) return null;

  return (
    <div className="filtered-info">
      <span className="filtered-icon">🔍</span>
      <span className="filtered-text">
        {hiddenCount} low-quality video{hiddenCount > 1 ? 's' : ''} filtered
      </span>
    </div>
  );
}
```

**Integration with VisualSuggestionGallery:**
```typescript
// components/features/curation/VisualSuggestionGallery.tsx
export function VisualSuggestionGallery({ sceneId, suggestions }: Props) {
  // Apply CV score filtering (Story 3.7b)
  const { visible, hiddenCount } = filterSuggestionsByQuality(suggestions);

  return (
    <div className="suggestion-gallery">
      {/* Filtered count indicator (AC66) */}
      <FilteredSuggestionsInfo hiddenCount={hiddenCount} />

      {/* Grid of visible suggestions only */}
      <div className="suggestions-grid">
        {visible.length > 0 ? (
          visible.map(suggestion => (
            <ClipSelectionCard
              key={suggestion.id}
              suggestion={suggestion}
              onSelect={handleSelect}
            />
          ))
        ) : (
          <EmptyClipState />
        )}
      </div>
    </div>
  );
}
```

**CV Score Interpretation:**

| Score Range | Quality | UI Behavior |
|-------------|---------|-------------|
| 0.8 - 1.0 | Excellent B-roll | ✅ Shown (priority) |
| 0.5 - 0.8 | Acceptable B-roll | ✅ Shown |
| 0.0 - 0.5 | Low quality (faces/captions) | ❌ Hidden |
| NULL | Not yet analyzed | ✅ Shown |


**UX Specifications:**
- **Grid Layout:** 3 columns on desktop (1920px), 2 on tablet (768px), 1 on mobile
- **Clip Cards:** 16:9 aspect ratio, thumbnail covers entire card
- **Selection Visual:** 3px indigo border, checkmark badge, shadow glow
- **Download Status Badges:**
  - Complete: Green badge (✓ Ready)
  - Downloading: Blue badge with percentage (⏳ 67%)
  - Pending: Gray badge (⏳ Pending)
  - Error: Red badge (⚠ Error)
- **Hover State:** Scale 1.02, indigo border
- **Empty State:** Centered, icon + message + CTA buttons

#### Story 4.3: Video Preview & Playback Functionality

**Component:**
```typescript
// components/features/curation/VideoPreviewPlayer.tsx
interface VideoPreviewPlayerProps {
  isOpen: boolean;
  suggestion: VisualSuggestion | null;
  onClose: () => void;
}

export function VideoPreviewPlayer({ isOpen, suggestion, onClose }: VideoPreviewPlayerProps) {
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    // Keyboard shortcut handlers
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') togglePlayPause();
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  if (!isOpen || !suggestion) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="video-player" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="video-header">
          <div className="video-title">{suggestion.title}</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Video Container */}
        <div className="video-container">
          {suggestion.download_status === 'complete' && !useFallback ? (
            // HTML5 video player for downloaded segments
            <video
              controls
              autoPlay
              src={`/.cache/videos/${projectId}/${suggestion.default_segment_path}`}
              onError={() => setUseFallback(true)}
            >
              <source type="video/mp4" />
            </video>
          ) : (
            // YouTube iframe fallback for failed downloads
            <iframe
              src={suggestion.embed_url}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="controls-hint">
          Space: Play/Pause | Esc: Close
        </div>
      </div>
    </div>
  );
}
```

**Key Features:**
- **Instant Playback:** Downloaded default segments play immediately (Story 3.6)
- **Fallback Strategy:** If download failed, use YouTube iframe embed
- **Keyboard Shortcuts:** Space (play/pause), Esc (close)
- **HTML5 Controls:** Play/pause, progress bar, volume, fullscreen
- **Click Outside:** Close modal on backdrop click
- **Auto-open on Selection:** Preview opens automatically when user clicks clip

**UX Specifications:**
- **Modal Backdrop:** Slate 900 with 95% opacity, 8px blur
- **Player Container:** Max-width 800px, 90% width, Slate 800 background
- **Video Aspect Ratio:** 16:9
- **Controls:** Default HTML5 video controls
- **Close Button:** Top-right, 32px x 32px, hover effect

#### Story 4.4: Clip Selection Mechanism & State Management

**Zustand Store:**
```typescript
// stores/curation-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ClipSelection {
  sceneId: string;
  suggestionId: string;
  videoId: string;
}

interface CurationState {
  projectId: string | null;
  selections: Map<string, ClipSelection>; // sceneId -> ClipSelection

  // Actions
  setProject: (projectId: string) => void;
  selectClip: (sceneId: string, suggestionId: string, videoId: string) => void;
  clearSelection: (sceneId: string) => void;
  isSceneComplete: (sceneId: string) => boolean;
  getCompletionProgress: () => { completed: number; total: number };
  reset: () => void;
}

export const useCurationStore = create<CurationState>()(
  persist(
    (set, get) => ({
      projectId: null,
      selections: new Map(),

      setProject: (projectId) => set({ projectId }),

      selectClip: (sceneId, suggestionId, videoId) => {
        set((state) => {
          const newSelections = new Map(state.selections);
          newSelections.set(sceneId, { sceneId, suggestionId, videoId });
          return { selections: newSelections };
        });

        // Save to database asynchronously
        saveClipSelection(get().projectId!, sceneId, suggestionId);
      },

      clearSelection: (sceneId) => {
        set((state) => {
          const newSelections = new Map(state.selections);
          newSelections.delete(sceneId);
          return { selections: newSelections };
        });
      },

      isSceneComplete: (sceneId) => {
        return get().selections.has(sceneId);
      },

      getCompletionProgress: () => {
        const state = get();
        // Assuming total scenes fetched from scenes list
        return {
          completed: state.selections.size,
          total: totalScenes // from context
        };
      },

      reset: () => set({ projectId: null, selections: new Map() }),
    }),
    {
      name: 'curation-storage',
    }
  )
);
```

**API Endpoint:**
```typescript
// app/api/projects/[id]/select-clip/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { sceneId, suggestionId } = await request.json();

  // Update scenes table with selected_clip_id
  db.prepare(`
    UPDATE scenes
    SET selected_clip_id = ?
    WHERE id = ?
  `).run(suggestionId, sceneId);

  return Response.json({ success: true });
}
```

**Database Extension (Migration v7):**
```sql
-- Add selected_clip_id to scenes table
ALTER TABLE scenes ADD COLUMN selected_clip_id TEXT;
ALTER TABLE scenes ADD FOREIGN KEY (selected_clip_id) REFERENCES visual_suggestions(id);
```

**Selection Behavior:**
- **One Selection Per Scene:** Selecting new clip automatically deselects previous
- **Visual Feedback:** Checkmark badge, indigo border, shadow glow
- **Optimistic UI:** Selection appears immediately, saved asynchronously
- **Error Handling:** If save fails, toast notification + revert UI state
- **Progress Tracking:** Real-time update of "3/5 scenes selected" counter

#### Story 4.5: Assembly Trigger & Validation Workflow

**Component:**
```typescript
// components/features/curation/AssemblyTriggerButton.tsx
interface AssemblyTriggerButtonProps {
  totalScenes: number;
  completedScenes: number;
  onTrigger: () => void;
}

export function AssemblyTriggerButton({ totalScenes, completedScenes, onTrigger }: AssemblyTriggerButtonProps) {
  const isComplete = completedScenes === totalScenes;
  const [showConfirmation, setShowConfirmation] = useState(false);

  return (
    <>
      {/* Sticky Footer */}
      <div className="assembly-footer">
        <button
          className="btn-assemble"
          disabled={!isComplete}
          onClick={() => setShowConfirmation(true)}
        >
          <span>🎬</span>
          <span>Assemble Video</span>
        </button>

        {!isComplete && (
          <div className="tooltip">
            Select clips for all {totalScenes} scenes to continue
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <ConfirmationModal
          onConfirm={onTrigger}
          onCancel={() => setShowConfirmation(false)}
          sceneCount={totalScenes}
        />
      )}
    </>
  );
}

// components/features/curation/ConfirmationModal.tsx
interface ConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  sceneCount: number;
}

export function ConfirmationModal({ onConfirm, onCancel, sceneCount }: ConfirmationModalProps) {
  return (
    <div className="confirm-modal">
      <div className="confirm-content">
        <div className="confirm-icon">🎬</div>
        <h2 className="confirm-title">Ready to Assemble Your Video?</h2>
        <p className="confirm-message">
          You've selected clips for all {sceneCount} scenes.
          This will create your final video with synchronized voiceovers.
        </p>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>Not Yet</button>
          <button className="btn-confirm" onClick={onConfirm}>Assemble Video</button>
        </div>
      </div>
    </div>
  );
}
```

**API Endpoint:**
```typescript
// app/api/projects/[id]/assemble/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Get all scenes with selections
  const scenes = db.prepare(`
    SELECT
      s.id,
      s.scene_number,
      s.text,
      s.audio_file_path,
      s.duration,
      vs.video_id,
      vs.embed_url,
      vs.default_segment_path
    FROM scenes s
    LEFT JOIN visual_suggestions vs ON s.selected_clip_id = vs.id
    WHERE s.project_id = ?
    ORDER BY s.scene_number ASC
  `).all(params.id);

  // Validate all scenes have selections
  const incomplete = scenes.filter(s => !s.video_id);
  if (incomplete.length > 0) {
    return Response.json({
      success: false,
      error: `${incomplete.length} scenes missing clip selections`
    }, { status: 400 });
  }

  // Update project workflow step
  db.prepare(`
    UPDATE projects
    SET current_step = 'assembly'
    WHERE id = ?
  `).run(params.id);

  // Trigger Epic 5 video assembly (async job)
  const assemblyJobId = await triggerVideoAssembly(params.id, scenes);

  return Response.json({
    success: true,
    data: { assemblyJobId, sceneCount: scenes.length }
  });
}
```

**UX Specifications:**
- **Footer:** Sticky at bottom, 88px height, Slate 800 background
- **Button State (Disabled):** Gray background, opacity 0.6, cursor not-allowed
- **Button State (Enabled):** Indigo 500, hover effect (transform + shadow)
- **Tooltip:** Positioned above button when disabled
- **Modal:** Backdrop blur, center-aligned, 500px max-width
- **Confirmation Flow:** Click → Modal → Confirm → Navigate to assembly page

#### Story 4.6: Visual Curation Workflow Integration & Error Recovery

**Navigation Flow:**
```typescript
// Workflow progression
Epic 2 (Voiceover Preview)
  ↓ [Continue to Visual Curation button]
Epic 3 (Visual Sourcing) - Auto-triggered
  ↓ [Progress: Analyzing scenes, searching YouTube, downloading segments]
Epic 4 (Visual Curation) - Auto-navigate on completion
  ↓ [User selects clips scene-by-scene]
  ↓ [All scenes complete → Assemble Video button enabled]
Epic 5 (Video Assembly) - Triggered by user
```

**Navigation Components:**
```typescript
// components/features/curation/NavigationBreadcrumb.tsx
interface BreadcrumbStep {
  label: string;
  path?: string;
}

export function NavigationBreadcrumb({ steps, currentStep }: { steps: BreadcrumbStep[]; currentStep: string }) {
  return (
    <div className="breadcrumb">
      {steps.map((step, index) => (
        <React.Fragment key={step.label}>
          {step.path ? (
            <Link href={step.path} className="breadcrumb-link">
              {step.label}
            </Link>
          ) : (
            <span className={step.label === currentStep ? 'current' : ''}>
              {step.label}
            </span>
          )}
          {index < steps.length - 1 && <span>→</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
```

**Error Recovery:**
```typescript
// Regenerate visuals if unsatisfied with suggestions
async function handleRegenerateVisuals(projectId: string) {
  try {
    // Clear existing suggestions
    await fetch(`/api/projects/${projectId}/visual-suggestions`, {
      method: 'DELETE'
    });

    // Trigger Epic 3 visual sourcing again
    await fetch(`/api/projects/${projectId}/generate-visuals`, {
      method: 'POST'
    });

    // Navigate to loading screen
    router.push(`/projects/${projectId}/visual-sourcing`);
  } catch (error) {
    toast.error('Failed to regenerate visuals. Please try again.');
  }
}
```

**Session Persistence:**
```typescript
// localStorage for scroll position and preview state
useEffect(() => {
  // Save scroll position
  const handleScroll = () => {
    localStorage.setItem(
      `curation-scroll-${projectId}`,
      window.scrollY.toString()
    );
  };
  window.addEventListener('scroll', handleScroll);

  // Restore scroll position on mount
  const savedScroll = localStorage.getItem(`curation-scroll-${projectId}`);
  if (savedScroll) {
    window.scrollTo(0, parseInt(savedScroll));
  }

  return () => window.removeEventListener('scroll', handleScroll);
}, [projectId]);
```

**Edge Case Handling:**
- **Missing Audio:** Display error + option to regenerate voiceovers
- **Missing Suggestions:** Show empty state + manual search option
- **Incomplete Selection Navigation:** Warning modal when leaving page
- **Workflow Step Validation:** Redirect if accessed before Epic 3 complete

**State:**
- `stores/curation-store.ts` - Clip selections, progress, session data

**UX Specifications (Complete Epic 4):**
- **Layout:** Desktop-first (1920px), responsive tablet (768px), mobile (375px)
- **Color System:** Dark mode (Slate 900/800/700), Indigo 500 accents
- **Typography:** Inter font family, clear hierarchy
- **Component Library:** shadcn/ui (Button, Card, Dialog, Progress)
- **Video Player:** HTML5 with controls, YouTube iframe fallback
- **Interactions:** Click to select, hover effects, keyboard shortcuts
- **Progress Tracking:** Real-time completion counter, visual indicators
- **Validation:** All scenes must have selections before assembly
- **Accessibility:** WCAG AA compliant, keyboard navigation, ARIA labels

---

### Epic 5: Video Assembly & Output

**Goal:** Automatically combine user selections into a final, downloadable video file with synchronized audio and visuals.

**Backend:**
- `app/api/projects/[id]/assemble/route.ts` - Assembly trigger endpoint
- `app/api/projects/[id]/assembly-status/route.ts` - Progress polling endpoint
- `app/api/projects/[id]/export/route.ts` - Export metadata endpoint
- `lib/video/ffmpeg.ts` - FFmpeg command builder utilities
- `lib/video/assembler.ts` - Assembly pipeline orchestration
- `lib/video/thumbnail.ts` - Thumbnail generation logic

**Components:**
- `app/projects/[id]/assembly/page.tsx` - Assembly progress page route
- `components/features/assembly/AssemblyProgress.tsx` - Progress UI with scene tracking
- `app/projects/[id]/export/page.tsx` - Export page route
- `components/features/export/ExportPage.tsx` - Video/thumbnail download UI

---

#### Story 5.1: Video Processing Infrastructure Setup

**Database Extension (Migration v8):**
```sql
-- Assembly jobs table for tracking video assembly progress
CREATE TABLE assembly_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, complete, error
  progress INTEGER DEFAULT 0, -- 0-100 percentage
  current_stage TEXT, -- 'trimming', 'concatenating', 'audio_overlay', 'thumbnail', 'finalizing'
  current_scene INTEGER, -- Scene number being processed
  total_scenes INTEGER,
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_assembly_jobs_project ON assembly_jobs(project_id);
CREATE INDEX idx_assembly_jobs_status ON assembly_jobs(status);
```

**FFmpeg Client:**
```typescript
// lib/video/ffmpeg.ts
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class FFmpegClient {
  private ffmpegPath: string = 'ffmpeg'; // Assumes ffmpeg in PATH

  async getVideoDuration(videoPath: string): Promise<number> {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    return parseFloat(stdout.trim());
  }

  async trimToAudioDuration(
    videoPath: string,
    audioPath: string,
    outputPath: string
  ): Promise<void> {
    const audioDuration = await this.getVideoDuration(audioPath);

    await execAsync(
      `ffmpeg -y -i "${videoPath}" -t ${audioDuration} -c:v libx264 -c:a aac "${outputPath}"`
    );
  }

  async overlayAudio(
    videoPath: string,
    audioPath: string,
    outputPath: string
  ): Promise<void> {
    // Remove original audio, add voiceover audio
    await execAsync(
      `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -map 0:v:0 -map 1:a:0 "${outputPath}"`
    );
  }

  async concatenateVideos(
    inputPaths: string[],
    outputPath: string
  ): Promise<void> {
    // Create concat list file
    const listPath = outputPath.replace('.mp4', '-list.txt');
    const listContent = inputPaths.map(p => `file '${p}'`).join('\n');
    await writeFile(listPath, listContent);

    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`
    );

    // Clean up list file
    await unlink(listPath);
  }

  async extractFrame(
    videoPath: string,
    timestamp: number,
    outputPath: string
  ): Promise<void> {
    await execAsync(
      `ffmpeg -y -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`
    );
  }

  async addTextOverlay(
    imagePath: string,
    text: string,
    outputPath: string
  ): Promise<void> {
    // Add title text at bottom third of thumbnail
    const escapedText = text.replace(/'/g, "'\\''");
    await execAsync(
      `ffmpeg -y -i "${imagePath}" -vf "drawtext=text='${escapedText}':fontsize=48:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h*0.75" "${outputPath}"`
    );
  }
}
```

**Environment Variables:**
```bash
# .env.local
FFMPEG_PATH=ffmpeg  # Path to FFmpeg executable (default: system PATH)
```

---

#### Story 5.2: Scene Video Trimming & Preparation

**Assembler Pipeline:**
```typescript
// lib/video/assembler.ts
import { FFmpegClient } from './ffmpeg';
import db from '@/lib/db/client';

interface AssemblyScene {
  sceneNumber: number;
  videoPath: string;      // Downloaded segment from Epic 3
  audioPath: string;      // Generated voiceover from Epic 2
  duration: number;       // Audio duration in seconds
}

export class VideoAssembler {
  private ffmpeg = new FFmpegClient();
  private projectId: string;
  private jobId: string;
  private outputDir: string;

  constructor(projectId: string, jobId: string) {
    this.projectId = projectId;
    this.jobId = jobId;
    this.outputDir = `.cache/assembly/${projectId}`;
  }

  async assembleVideo(scenes: AssemblyScene[]): Promise<string> {
    await mkdir(this.outputDir, { recursive: true });

    const trimmedPaths: string[] = [];

    // Phase 1: Trim each scene to voiceover duration
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      await this.updateProgress('trimming', i + 1, scenes.length);

      const trimmedPath = `${this.outputDir}/scene-${scene.sceneNumber}-trimmed.mp4`;
      await this.ffmpeg.trimToAudioDuration(
        scene.videoPath,
        scene.audioPath,
        trimmedPath
      );

      // Phase 2: Overlay audio on trimmed video
      await this.updateProgress('audio_overlay', i + 1, scenes.length);

      const withAudioPath = `${this.outputDir}/scene-${scene.sceneNumber}-audio.mp4`;
      await this.ffmpeg.overlayAudio(
        trimmedPath,
        scene.audioPath,
        withAudioPath
      );

      trimmedPaths.push(withAudioPath);
    }

    // Phase 3: Concatenate all scenes
    await this.updateProgress('concatenating', scenes.length, scenes.length);

    const finalPath = `.cache/output/${this.projectId}/final.mp4`;
    await mkdir(`.cache/output/${this.projectId}`, { recursive: true });
    await this.ffmpeg.concatenateVideos(trimmedPaths, finalPath);

    return finalPath;
  }

  private async updateProgress(
    stage: string,
    currentScene: number,
    totalScenes: number
  ): Promise<void> {
    // Calculate progress percentage
    const stageWeight = {
      trimming: 0.3,
      audio_overlay: 0.3,
      concatenating: 0.2,
      thumbnail: 0.1,
      finalizing: 0.1,
    };

    let progress = 0;
    if (stage === 'trimming') {
      progress = Math.round((currentScene / totalScenes) * 30);
    } else if (stage === 'audio_overlay') {
      progress = 30 + Math.round((currentScene / totalScenes) * 30);
    } else if (stage === 'concatenating') {
      progress = 60;
    } else if (stage === 'thumbnail') {
      progress = 80;
    } else if (stage === 'finalizing') {
      progress = 90;
    }

    db.prepare(`
      UPDATE assembly_jobs
      SET progress = ?, current_stage = ?, current_scene = ?, total_scenes = ?
      WHERE id = ?
    `).run(progress, stage, currentScene, totalScenes, this.jobId);
  }
}
```

---

#### Story 5.3: Video Concatenation & Audio Overlay

**Assembly Trigger API:**
```typescript
// app/api/projects/[id]/assemble/route.ts
import { VideoAssembler } from '@/lib/video/assembler';
import { ThumbnailGenerator } from '@/lib/video/thumbnail';
import db from '@/lib/db/client';
import { randomUUID } from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;

  // Validate all scenes have selections
  const scenes = db.prepare(`
    SELECT
      s.id,
      s.scene_number,
      s.text,
      s.audio_file_path,
      s.duration,
      vs.default_segment_path
    FROM scenes s
    JOIN visual_suggestions vs ON s.selected_clip_id = vs.id
    WHERE s.project_id = ?
    ORDER BY s.scene_number ASC
  `).all(projectId);

  const incomplete = scenes.filter(s => !s.default_segment_path || !s.audio_file_path);
  if (incomplete.length > 0) {
    return Response.json({
      success: false,
      error: `${incomplete.length} scenes missing required files`
    }, { status: 400 });
  }

  // Create assembly job
  const jobId = randomUUID();
  db.prepare(`
    INSERT INTO assembly_jobs (id, project_id, status, total_scenes, started_at)
    VALUES (?, ?, 'processing', ?, datetime('now'))
  `).run(jobId, projectId, scenes.length);

  // Update project step
  db.prepare(`
    UPDATE projects SET current_step = 'assembly' WHERE id = ?
  `).run(projectId);

  // Run assembly asynchronously
  runAssembly(projectId, jobId, scenes).catch(error => {
    db.prepare(`
      UPDATE assembly_jobs
      SET status = 'error', error_message = ?
      WHERE id = ?
    `).run(error.message, jobId);
  });

  return Response.json({
    success: true,
    data: { jobId, sceneCount: scenes.length }
  });
}

async function runAssembly(
  projectId: string,
  jobId: string,
  scenes: any[]
): Promise<void> {
  const assembler = new VideoAssembler(projectId, jobId);
  const thumbnailGen = new ThumbnailGenerator(projectId);

  // Assemble video
  const assemblyScenes = scenes.map(s => ({
    sceneNumber: s.scene_number,
    videoPath: s.default_segment_path,
    audioPath: s.audio_file_path,
    duration: s.duration,
  }));

  const videoPath = await assembler.assembleVideo(assemblyScenes);

  // Generate thumbnail
  db.prepare(`
    UPDATE assembly_jobs SET current_stage = 'thumbnail', progress = 80 WHERE id = ?
  `).run(jobId);

  const project = db.prepare('SELECT name, topic FROM projects WHERE id = ?').get(projectId);
  const thumbnailPath = await thumbnailGen.generate(videoPath, project.name || project.topic);

  // Get video metadata
  const videoStats = await stat(videoPath);
  const duration = await new FFmpegClient().getVideoDuration(videoPath);

  // Save rendered video record
  const videoId = randomUUID();
  db.prepare(`
    INSERT INTO rendered_videos (id, project_id, file_path, thumbnail_path, duration_seconds, file_size_bytes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(videoId, projectId, videoPath, thumbnailPath, duration, videoStats.size);

  // Complete job
  db.prepare(`
    UPDATE assembly_jobs
    SET status = 'complete', progress = 100, current_stage = 'finalizing', completed_at = datetime('now')
    WHERE id = ?
  `).run(jobId);

  // Update project step
  db.prepare(`
    UPDATE projects SET current_step = 'export' WHERE id = ?
  `).run(projectId);
}
```

**Assembly Status Polling API:**
```typescript
// app/api/projects/[id]/assembly-status/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const job = db.prepare(`
    SELECT id, status, progress, current_stage, current_scene, total_scenes, error_message
    FROM assembly_jobs
    WHERE project_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(params.id);

  if (!job) {
    return Response.json({
      success: false,
      error: 'No assembly job found'
    }, { status: 404 });
  }

  return Response.json({
    success: true,
    data: {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      currentStage: job.current_stage,
      currentScene: job.current_scene,
      totalScenes: job.total_scenes,
      error: job.error_message,
    }
  });
}
```

---

#### Story 5.4: Automated Thumbnail Generation

**Thumbnail Generator:**
```typescript
// lib/video/thumbnail.ts
import { FFmpegClient } from './ffmpeg';

export class ThumbnailGenerator {
  private ffmpeg = new FFmpegClient();
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  async generate(videoPath: string, title: string): Promise<string> {
    const outputDir = `.cache/output/${this.projectId}`;
    const tempFramePath = `${outputDir}/thumbnail-temp.jpg`;
    const finalPath = `${outputDir}/thumbnail.jpg`;

    // Extract candidate frames at 10%, 30%, 50%, 70%
    const duration = await this.ffmpeg.getVideoDuration(videoPath);
    const timestamps = [0.1, 0.3, 0.5, 0.7].map(p => duration * p);

    // Score frames and select best (simplified: use 30% mark)
    // In production, use Vision API or heuristics to score visual appeal
    const bestTimestamp = timestamps[1]; // 30% mark usually has good content

    await this.ffmpeg.extractFrame(videoPath, bestTimestamp, tempFramePath);

    // Add title text overlay
    const displayTitle = this.formatTitle(title);
    await this.ffmpeg.addTextOverlay(tempFramePath, displayTitle, finalPath);

    // Clean up temp frame
    await unlink(tempFramePath);

    return finalPath;
  }

  private formatTitle(title: string): string {
    // Truncate for thumbnail display
    if (title.length > 40) {
      return title.substring(0, 37) + '...';
    }
    return title;
  }
}
```

**Advanced Frame Selection (Future Enhancement):**
```typescript
// Frame scoring algorithm (can use Vision API labels)
async function scoreFrame(framePath: string, expectedLabels: string[]): Promise<number> {
  // Score based on:
  // - Visual clarity (not too dark/bright)
  // - Composition (rule of thirds)
  // - Relevance to topic (label matching)
  // - No text overlays or faces
  return 50; // Placeholder
}
```

---

#### Story 5.5: Export UI & Download Workflow

**Export Metadata API:**
```typescript
// app/api/projects/[id]/export/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Get rendered video info
  const video = db.prepare(`
    SELECT id, file_path, thumbnail_path, duration_seconds, file_size_bytes, created_at
    FROM rendered_videos
    WHERE project_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(params.id);

  if (!video) {
    return Response.json({
      success: false,
      error: 'No rendered video found'
    }, { status: 404 });
  }

  // Get project metadata
  const project = db.prepare(`
    SELECT name, topic FROM projects WHERE id = ?
  `).get(params.id);

  // Count scenes
  const sceneCount = db.prepare(`
    SELECT COUNT(*) as count FROM scenes WHERE project_id = ?
  `).get(params.id).count;

  return Response.json({
    success: true,
    data: {
      video: {
        path: video.file_path,
        thumbnailPath: video.thumbnail_path,
        durationSeconds: video.duration_seconds,
        fileSizeBytes: video.file_size_bytes,
        createdAt: video.created_at,
      },
      project: {
        name: project.name,
        topic: project.topic,
        sceneCount,
      },
      download: {
        videoFilename: sanitizeFilename(project.name || project.topic) + '.mp4',
        thumbnailFilename: sanitizeFilename(project.name || project.topic) + '-thumbnail.jpg',
      }
    }
  });
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')          // Spaces to hyphens
    .substring(0, 50);             // Truncate
}
```

**Video File Download API:**
```typescript
// app/api/videos/[...path]/route.ts
import { readFile, stat } from 'fs/promises';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const filePath = path.join(process.cwd(), '.cache', ...params.path);

  try {
    const fileStats = await stat(filePath);
    const fileContent = await readFile(filePath);

    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.mp4' ? 'video/mp4' :
                        ext === '.jpg' ? 'image/jpeg' :
                        'application/octet-stream';

    return new Response(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStats.size.toString(),
        'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: 'File not found' }, { status: 404 });
  }
}
```

**Key Integration Points:**
- Epic 4 Story 4.5 triggers assembly via POST `/api/projects/[id]/assemble`
- Assembly Progress UI polls GET `/api/projects/[id]/assembly-status`
- Export Page fetches metadata via GET `/api/projects/[id]/export`
- Downloads served via GET `/api/videos/[...path]`

**UX Specifications (from ux-design-specification.md Section 7.6-7.7):**
- Assembly Progress: Scene-by-scene status tracking with stage messages
- Export Page: Video player with preview, thumbnail sidebar, download buttons
- Metadata: Duration, file size, resolution, topic, scene count
- Actions: Download Video, Download Thumbnail, Create New Video, Back to Curation

**Workflow States:**
```
'visual-curation' → 'assembly' → 'export' → 'complete'
```

---

### Epic 5 Database Schema Summary

**New Tables:**
- `assembly_jobs` - Tracks assembly progress and status

**Extended Tables:**
- `rendered_videos` - Already exists (line 3061)

**Migration v8:**
```sql
-- Add assembly_jobs table
CREATE TABLE IF NOT EXISTS assembly_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  current_stage TEXT,
  current_scene INTEGER,
  total_scenes INTEGER,
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assembly_jobs_project ON assembly_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_assembly_jobs_status ON assembly_jobs(status);
```

---

## LLM Provider Abstraction

### Architecture Pattern: Strategy Pattern

**Interface Definition:**
```typescript
// lib/llm/provider.ts
export interface LLMProvider {
  chat(messages: Message[], systemPrompt?: string): Promise<string>;
  generateScript(topic: string, systemPrompt?: string): Promise<Script>;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Script {
  scenes: Scene[];
}

export interface Scene {
  sceneNumber: number;
  text: string;
  duration?: number;
}
```

**Ollama Implementation:**
```typescript
// lib/llm/ollama-provider.ts
import Ollama from 'ollama';
import { DEFAULT_SYSTEM_PROMPT } from './prompts/default-system-prompt';

export class OllamaProvider implements LLMProvider {
  private client: Ollama;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3.2') {
    this.client = new Ollama({ host: baseUrl });
    this.model = model;
  }

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    // Prepend system prompt as first message
    const fullMessages = [
      {
        role: 'system' as const,
        content: systemPrompt || DEFAULT_SYSTEM_PROMPT
      },
      ...messages
    ];

    const response = await this.client.chat({
      model: this.model,
      messages: fullMessages,
    });
    return response.message.content;
  }

  async generateScript(topic: string, systemPrompt?: string): Promise<Script> {
    const scriptPrompt = `Generate a video script about "${topic}".
Structure it as numbered scenes with clear narrative flow.`;

    const response = await this.chat([
      { role: 'user', content: scriptPrompt }
    ], systemPrompt);

    // Parse response into scenes
    return parseScriptResponse(response);
  }
}
```

**Gemini Implementation:**
```typescript
// lib/llm/gemini-provider.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, Message, Script } from './provider';

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, model: string = 'gemini-2.5-flash') {
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      throw new Error(
        'Gemini API key not configured.\n' +
        'Get your free API key at: https://aistudio.google.com/apikey\n' +
        'Set GEMINI_API_KEY in .env.local'
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = model;
  }

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      });

      // Gemini doesn't have separate system role - prepend to first user message
      const contents = messages.map((msg, idx) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{
          text: idx === 0 && systemPrompt
            ? `${systemPrompt}\n\n${msg.content}`
            : msg.content
        }],
      }));

      const result = await model.generateContent({ contents });
      return result.response.text();
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async generateScript(topic: string, systemPrompt?: string): Promise<Script> {
    const scriptPrompt = `Generate a video script about "${topic}".
Structure it as numbered scenes with clear narrative flow.`;

    const response = await this.chat([
      { role: 'user', content: scriptPrompt }
    ], systemPrompt);

    // Parse response into scenes
    return parseScriptResponse(response);
  }

  private handleError(error: any): Error {
    const errorMessage = error.message || error.toString();

    // Model not found (check BEFORE network errors - more specific)
    if (errorMessage.includes('models/') && errorMessage.includes('not found')) {
      return new Error(
        `Model '${this.modelName}' not found.\n\n` +
        'Available models (Gemini 2.5 and 2.0 only):\n' +
        '  - gemini-2.5-flash (recommended, fastest, stable)\n' +
        '  - gemini-2.5-pro (best quality, stable)\n' +
        '  - gemini-flash-latest (auto-updates to latest)\n' +
        '  - gemini-pro-latest (auto-updates to latest)\n' +
        'Note: Gemini 1.5 models are deprecated.\n' +
        'Update GEMINI_MODEL in .env.local'
      );
    }

    // Network / connection issues
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
      return new Error(
        'Network error connecting to Gemini API.\n\n' +
        'Please check your internet connection and try again.\n' +
        'If using a proxy or VPN, ensure it allows access to generativelanguage.googleapis.com'
      );
    }

    // API key issues
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key')) {
      return new Error(
        'Invalid Gemini API key.\n\n' +
        'Get a free API key at: https://aistudio.google.com/apikey\n' +
        'Set GEMINI_API_KEY in .env.local'
      );
    }

    // Rate limiting
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      return new Error(
        'Gemini API rate limit exceeded.\n\n' +
        'Free tier limits: 15 requests/minute, 1,500 requests/day\n' +
        'Please wait a moment and try again.'
      );
    }

    // Safety filters
    if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
      return new Error(
        'Content was blocked by Gemini safety filters.\n\n' +
        'Try rephrasing your topic to avoid potentially sensitive content.\n' +
        'Gemini has stricter content policies than local models.'
      );
    }

    // Generic error with original message
    return new Error(`Gemini API error: ${errorMessage}`);
  }
}
```

**Provider Factory:**
```typescript
// lib/llm/factory.ts
import { OllamaProvider } from './ollama-provider';
import { GeminiProvider } from './gemini-provider';
import type { LLMProvider } from './provider';

export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'ollama';

  switch (provider) {
    case 'ollama':
      return new OllamaProvider(
        process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        process.env.OLLAMA_MODEL || 'llama3.2'
      );

    case 'gemini':
      if (!process.env.GEMINI_API_KEY) {
        throw new Error(
          'GEMINI_API_KEY not configured in .env.local\n' +
          'Get a free API key at: https://aistudio.google.com/apikey'
        );
      }
      return new GeminiProvider(
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_MODEL || 'gemini-2.5-flash'
      );

    default:
      throw new Error(
        `Unknown LLM provider: ${provider}\n` +
        'Valid options: ollama, gemini\n' +
        'Set LLM_PROVIDER in .env.local'
      );
  }
}
```

**Environment Configuration:**
```bash
# .env.local

# ============================================
# LLM Provider Selection
# ============================================
# Choose: 'ollama' (local, FOSS) or 'gemini' (cloud, free tier)
LLM_PROVIDER=ollama

# ============================================
# Ollama Configuration (Primary, FOSS-compliant)
# ============================================
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# ============================================
# Gemini Configuration (Optional, Cloud-based)
# ============================================
# Get free API key at: https://aistudio.google.com/apikey
# Free tier: 15 requests/minute, 1,500 requests/day
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Available Gemini models:
# - gemini-2.5-flash (recommended, fastest)
# - gemini-2.5-pro (best quality, slower)
# - gemini-flash-latest (auto-updates)
# - gemini-pro-latest (auto-updates)
# Note: Gemini 1.5 models are deprecated

# ============================================
# Google Cloud Vision API (Epic 3 Story 3.7)
# ============================================
# Get API key at: https://console.cloud.google.com/apis/api/vision.googleapis.com
# Free tier: 1,000 units/month (thumbnail analysis ~3 units each)
# NOTE: Store in .env.example as template, copy to .env.local with actual key
GOOGLE_CLOUD_VISION_API_KEY=your_vision_api_key_here
# Or use service account credentials file:
# GOOGLE_CLOUD_VISION_KEY_FILE=./google-cloud-credentials.json
```

**Usage in API Routes:**
```typescript
// app/api/chat/route.ts
import { getLLMProvider } from '@/lib/llm/factory';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const llm = getLLMProvider();
  const response = await llm.chat(messages);
  return Response.json({ success: true, data: response });
}
```

**Benefits:**
- ✅ Clean separation - All LLM calls go through abstraction
- ✅ Easy testing - Can mock LLMProvider interface
- ✅ Future-proof - Adding new providers is just a new class
- ✅ Configuration-driven - Switch providers via .env
- ✅ Cloud-ready - Easy migration to cloud LLM APIs
- ✅ Multiple providers - Supports both local (Ollama) and cloud (Gemini) options

### Provider Selection Guidelines

**When to Use Ollama (Primary):**
- ✅ Privacy-critical applications (all data stays local)
- ✅ No internet connectivity or behind firewall
- ✅ Unlimited usage without rate limits
- ✅ Complete FOSS compliance required
- ✅ Custom model fine-tuning needed
- ✅ Development and testing environments

**When to Use Gemini (Optional):**
- ✅ Quick setup without local model installation
- ✅ Access to Google's latest models (2.5 Flash/Pro)
- ✅ Lower resource usage on development machine
- ✅ Acceptable to use cloud services with free tier
- ✅ Moderate usage patterns (under 1,500 requests/day)
- ✅ Need for latest model capabilities

**Switching Providers:**
Simply change `LLM_PROVIDER` in `.env.local` - all code remains the same thanks to abstraction layer.

### Error Handling Patterns

**Ollama Error Handling:**
```typescript
// Common Ollama errors
if (error.message.includes('ECONNREFUSED')) {
  // Ollama server not running
  throw new Error(
    'Ollama server not running at ' + OLLAMA_BASE_URL + '\n' +
    'Start it with: ollama serve'
  );
}

if (error.message.includes('model')) {
  // Model not found
  throw new Error(
    'Model not found. Pull it with: ollama pull ' + modelName
  );
}
```

**Gemini Error Handling:**
```typescript
// Model not found (404) - check BEFORE generic errors
if (error.message.includes('models/') && error.message.includes('not found')) {
  // Return specific guidance on available models
  // Note: Check this FIRST before network errors because error message contains "fetch"
}

// API key errors
if (error.message.includes('API_KEY_INVALID')) {
  // Guide user to get new key at https://aistudio.google.com/apikey
}

// Rate limiting (429)
if (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) {
  // Inform about free tier limits: 15 RPM, 1,500 RPD
  // Suggest waiting or implementing caching
}

// Safety filters
if (error.message.includes('SAFETY') || error.message.includes('blocked')) {
  // Suggest rephrasing content
  // Note: Gemini has stricter policies than local models
}

// Network errors
if (error.message.includes('fetch') || error.message.includes('network')) {
  // Check internet connection, proxy settings
}
```

**Error Handling Best Practices:**
1. **Check specific errors before generic errors** - Model not found before network error
2. **Provide actionable guidance** - Tell user exactly how to fix the problem
3. **Include context** - Mention which provider failed, what they can try
4. **Graceful degradation** - For non-critical failures, continue with partial results
5. **Log errors** - Record all LLM errors for debugging

### Rate Limiting and Caching Strategy

**Gemini Free Tier Limits:**
- **15 requests per minute (RPM)**
- **1,500 requests per day (RPD)**
- **1 million tokens per minute (TPM)**

**Rate Limiting Implementation:**
```typescript
// lib/llm/rate-limiter.ts
export class RateLimiter {
  private requestTimestamps: number[] = [];
  private readonly windowMs = 60000; // 1 minute
  private readonly maxRequests = 15; // Gemini free tier

  async checkLimit(): Promise<void> {
    const now = Date.now();

    // Remove timestamps older than window
    this.requestTimestamps = this.requestTimestamps.filter(
      ts => now - ts < this.windowMs
    );

    if (this.requestTimestamps.length >= this.maxRequests) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitMs = this.windowMs - (now - oldestTimestamp);
      throw new Error(
        `Rate limit reached. Please wait ${Math.ceil(waitMs / 1000)} seconds.`
      );
    }

    this.requestTimestamps.push(now);
  }
}
```

**Caching Strategy:**
```typescript
// lib/llm/cache.ts
import { createHash } from 'crypto';

export class LLMCache {
  private cache = new Map<string, { response: string; timestamp: number }>();
  private readonly ttlMs = 3600000; // 1 hour

  getCacheKey(messages: Message[], systemPrompt: string): string {
    const content = JSON.stringify({ messages, systemPrompt });
    return createHash('sha256').update(content).digest('hex');
  }

  get(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return cached.response;
  }

  set(key: string, response: string): void {
    this.cache.set(key, { response, timestamp: Date.now() });
  }
}
```

**Caching Guidelines:**
1. **Cache script generations** - Same topic shouldn't regenerate multiple times
2. **Cache chat responses** - Identical conversation context can reuse responses
3. **Short TTL** - 1 hour max to keep responses fresh
4. **Clear cache on provider switch** - Different providers may give different responses
5. **Respect user expectations** - Don't cache when user explicitly regenerates

**Usage in GeminiProvider:**
```typescript
export class GeminiProvider implements LLMProvider {
  private rateLimiter = new RateLimiter();
  private cache = new LLMCache();

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    // Check cache first
    const cacheKey = this.cache.getCacheKey(messages, systemPrompt || '');
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Check rate limit before API call
    await this.rateLimiter.checkLimit();

    // Make API call
    const response = await this.makeApiCall(messages, systemPrompt);

    // Cache response
    this.cache.set(cacheKey, response);

    return response;
  }
}
```

---

## System Prompts & LLM Persona Configuration (Feature 1.9)

### Architecture Pattern: Unified Persona System

**Problem:**
Different video projects require different LLM behavior and content tone. The system previously had two separate prompts (chat and script generation), creating inconsistency and maintenance burden.

**Solution:**
Implement a **unified persona system** where a single system prompt defines the LLM's personality, tone, and delivery style for BOTH chat brainstorming AND script generation. The persona defines WHO the LLM is; task-specific prompts define WHAT to do.

```
System Prompt: [Selected Persona - defines WHO the LLM is]
User Message:  [Task-specific prompt - defines WHAT to do (chat, script generation, etc.)]
```

### Preset Personas (PRD v1.8 - Feature 1.9)

Four preset personas optimized for different content types and ideological frameworks:

```typescript
// lib/llm/prompts/preset-personas.ts

export interface Persona {
  id: string;
  name: string;
  description: string;
  prompt: string;
  isPreset: boolean;
  isDefault: boolean;
}

/**
 * Scientific Analyst - Neutral, data-driven, factual delivery (DEFAULT)
 */
export const SCIENTIFIC_ANALYST: Persona = {
  id: 'scientific_analyst',
  name: 'Scientific Analyst',
  description: 'Neutral informational content with data-driven, factual delivery. Best for technical explanations, research summaries, and objective analysis.',
  prompt: `You are a Scientific Analyst creating informational video content.

PERSONALITY:
- Objective and impartial
- Data-driven and evidence-based
- Clear and precise in communication
- Intellectually curious but skeptical

DELIVERY STYLE:
- Present facts without editorial spin
- Use specific data, statistics, and citations where relevant
- Explain complex concepts in accessible terms
- Acknowledge uncertainty and limitations of current knowledge
- Structure information logically with clear cause-and-effect relationships

CONTENT APPROACH:
- Lead with the most important findings
- Support claims with evidence
- Compare multiple perspectives fairly
- Avoid sensationalism or exaggeration
- Focus on what the data actually shows, not what we wish it showed

You help users develop video topics and generate scripts that inform audiences with factual precision and intellectual honesty.`,
  isPreset: true,
  isDefault: true
};

/**
 * Blackpill Realist - Brutal/harsh truths, nihilistic, pessimistic analysis
 * Enhanced per PRD v1.8 with specific use cases and delivery style
 */
export const BLACKPILL_REALIST: Persona = {
  id: 'blackpill_realist',
  name: 'Blackpill Realist',
  description: 'Brutal honesty about harsh realities. Nihilistic framing, no sugar-coating. Best for societal critique, collapse scenarios, and uncomfortable truths.',
  prompt: `You are a Blackpill Realist creating unflinching video content about harsh realities.

PERSONALITY:
- Brutally honest without diplomatic softening
- Nihilistic and pessimistic worldview
- Focused on systemic failures and power imbalances
- Zero tolerance for copium, hopium, or false optimism

DELIVERY STYLE:
- No sugar-coating or optimistic spin
- Stark language: "collapse", "dystopia", "doomed", "irreversible"
- Eliminate false hope and comfortable lies
- Emphasize biological, economic, and technological determinism
- Present uncomfortable truths that mainstream sources avoid

CONTENT SPECIALIZATIONS (FR-1.9.04):
- AI dystopia scenarios (mass unemployment, surveillance states, human obsolescence)
- Western civilization decline (demographic collapse, institutional failure, cultural decay)
- Lookism and dating inequality (biological determinism, hypergamy, incel economics)
- Economic collapse (wealth concentration, automation displacement, coming depression)
- Technological determinism (inevitable outcomes regardless of policy choices)

CONTENT APPROACH (FR-1.9.05):
- Start with the harsh conclusion, then explain why it's inevitable
- Use data to show trends are accelerating, not improving
- Highlight how elites benefit from systems that harm average people
- Show why proposed solutions won't work or will make things worse
- End without false hope - the point is understanding reality, not feeling better

You help users create content that cuts through mainstream cope and delivers the brutal truth about where things are heading.`,
  isPreset: true,
  isDefault: false
};

/**
 * Documentary Filmmaker - Balanced narrative with human stories
 */
export const DOCUMENTARY_FILMMAKER: Persona = {
  id: 'documentary_filmmaker',
  name: 'Documentary Filmmaker',
  description: 'Balanced narrative structure with focus on human stories and emotional authenticity. Best for historical content, profiles, and investigative pieces.',
  prompt: `You are a Documentary Filmmaker creating compelling narrative video content.

PERSONALITY:
- Curious and investigative
- Empathetic to human experiences
- Committed to authenticity and truth
- Patient in building narrative tension

DELIVERY STYLE:
- Find the human angle in every story
- Build narrative arcs with beginning, middle, and resolution
- Balance emotional impact with factual grounding
- Use specific details that bring stories to life
- Let subjects speak for themselves through their actions and words

CONTENT APPROACH:
- Open with a compelling moment or question
- Introduce characters and their stakes
- Build tension through obstacles and challenges
- Reveal insights through the journey, not just the conclusion
- Close with meaning that resonates beyond the specific story

STORYTELLING TECHNIQUES:
- Show, don't just tell
- Use contrast and juxtaposition
- Find unexpected connections between topics
- Ground abstract ideas in concrete examples
- Create moments of revelation and discovery

You help users develop video topics and scripts that tell authentic stories while informing and engaging audiences emotionally.`,
  isPreset: true,
  isDefault: false
};

/**
 * Educational Designer - TED-Ed style, learning-focused, accessible
 */
export const EDUCATIONAL_DESIGNER: Persona = {
  id: 'educational_designer',
  name: 'Educational Designer',
  description: 'TED-Ed and Kurzgesagt inspired educational content. Learning-focused with accessible explanations and engaging delivery.',
  prompt: `You are an Educational Designer creating engaging learning content in the style of TED-Ed and Kurzgesagt.

PERSONALITY:
- Enthusiastic about sharing knowledge
- Clear and accessible in explanations
- Creative in finding memorable analogies
- Focused on genuine understanding, not just information transfer

DELIVERY STYLE:
- Break complex ideas into digestible segments
- Use analogies and metaphors from everyday life
- Build from familiar concepts to new understanding
- Make learning feel like discovery, not lecture
- Maintain energy and pacing that holds attention

CONTENT APPROACH:
- Start with a hook that creates curiosity
- Establish why this matters to the viewer
- Introduce concepts progressively, building on each other
- Use visual metaphors that could be animated
- End with a satisfying "aha" moment or actionable insight

EDUCATIONAL TECHNIQUES:
- Anticipate and address common misconceptions
- Use concrete examples before abstract principles
- Create memorable frameworks for retention
- Connect new knowledge to practical applications
- Leave viewers feeling smarter, not overwhelmed

You help users develop video topics and scripts that educate while entertaining, making complex subjects accessible and memorable.`,
  isPreset: true,
  isDefault: false
};

/**
 * All preset personas
 */
export const PRESET_PERSONAS: Persona[] = [
  SCIENTIFIC_ANALYST,
  BLACKPILL_REALIST,
  DOCUMENTARY_FILMMAKER,
  EDUCATIONAL_DESIGNER
];

export function getPersonaById(id: string): Persona | undefined {
  return PRESET_PERSONAS.find(p => p.id === id);
}

export function getDefaultPersona(): Persona {
  return SCIENTIFIC_ANALYST;
}
```

### Database Schema Integration

System prompts are stored in the database for persistence and user customization:

```sql
-- System prompts table (already exists in schema.sql)
CREATE TABLE system_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_preset BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Projects reference system prompts via FK (already exists in schema.sql)
-- projects.system_prompt_id TEXT REFERENCES system_prompts(id)

-- Seed with preset personas (Migration 012)
INSERT INTO system_prompts (id, name, prompt, description, category, is_preset, is_default) VALUES
  ('scientific_analyst', 'Scientific Analyst', '[full prompt]', 'Neutral informational...', 'preset', true, true),
  ('blackpill_realist', 'Blackpill Realist', '[full prompt]', 'Brutal honesty...', 'preset', true, false),
  ('documentary_filmmaker', 'Documentary Filmmaker', '[full prompt]', 'Balanced narrative...', 'preset', true, false),
  ('educational_designer', 'Educational Designer', '[full prompt]', 'TED-Ed style...', 'preset', true, false);
```

### API Integration

**Get Available Personas:**
```typescript
// app/api/personas/route.ts
export async function GET(req: Request) {
  const personas = db.prepare(
    'SELECT id, name, description, is_preset, is_default FROM system_prompts ORDER BY is_default DESC, name ASC'
  ).all();

  return Response.json({ success: true, data: { personas } });
}
```

**Helper: Get Project Persona:**
```typescript
// lib/db/queries.ts
import { getDefaultPersona } from '@/lib/llm/prompts/preset-personas';

export function getProjectPersona(projectId: string): string {
  // Get project's persona ID
  const project = db.prepare(
    'SELECT system_prompt_id FROM projects WHERE id = ?'
  ).get(projectId) as { system_prompt_id: string | null } | undefined;

  if (project?.system_prompt_id) {
    const persona = db.prepare(
      'SELECT prompt FROM system_prompts WHERE id = ?'
    ).get(project.system_prompt_id) as { prompt: string } | undefined;

    if (persona) return persona.prompt;
  }

  // Fallback to default persona
  return getDefaultPersona().prompt;
}
```

**Use Persona in Chat (FR-1.9.07):**
```typescript
// app/api/chat/route.ts
import { getProjectPersona } from '@/lib/db/queries';

export async function POST(req: Request) {
  const { projectId, message } = await req.json();

  // Get project's persona (unified system prompt)
  const personaPrompt = getProjectPersona(projectId);

  // Load conversation history
  const history = db.prepare(
    'SELECT role, content FROM messages WHERE project_id = ? ORDER BY timestamp ASC'
  ).all(projectId);

  // Build messages array with persona as system message
  const messages = [
    { role: 'system', content: personaPrompt },
    ...history,
    { role: 'user', content: message }
  ];

  // Get LLM response
  const llm = createLLMProvider();
  const response = await llm.chat(messages);

  // Persist messages...
  return Response.json({ success: true, data: { response } });
}
```

**Use Persona in Script Generation (FR-1.9.07):**
```typescript
// lib/llm/script-generator.ts
import { getProjectPersona } from '@/lib/db/queries';
import { generateScriptPrompt } from './prompts/script-generation-prompt';

export async function generateScriptWithRetry(
  topic: string,
  projectId: string,
  projectConfig?: ScriptConfig
): Promise<ScriptGenerationResult> {
  const provider = createLLMProvider();

  // Get project's persona (same prompt used for chat)
  const personaPrompt = getProjectPersona(projectId);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Generate task-specific prompt (JSON format, word counts, etc.)
    const taskPrompt = generateScriptPrompt(topic, projectConfig);

    // Call LLM with persona as system prompt, task as user message
    const messages = [{ role: 'user', content: taskPrompt }];
    const response = await provider.chat(messages, personaPrompt);

    // Validate and return...
  }
}
```

**Update Project Persona (FR-1.9.06):**
```typescript
// app/api/projects/[id]/persona/route.ts
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { personaId } = await req.json();

  // Validate persona exists
  const persona = db.prepare('SELECT id FROM system_prompts WHERE id = ?').get(personaId);
  if (!persona) {
    return Response.json({ success: false, error: { message: 'Persona not found', code: 'PERSONA_NOT_FOUND' } }, { status: 404 });
  }

  // Update project
  db.prepare('UPDATE projects SET system_prompt_id = ?, last_active = datetime("now") WHERE id = ?')
    .run(personaId, params.id);

  return Response.json({ success: true, data: { personaId } });
}
```

### UI Components (FR-1.9.01)

**Persona Selection in Project Settings:**
```typescript
// components/features/project/PersonaSelector.tsx
import { useEffect, useState } from 'react';

interface Persona {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
}

interface PersonaSelectorProps {
  projectId: string;
  currentPersonaId: string | null;
  onPersonaChange?: (personaId: string) => void;
}

export function PersonaSelector({ projectId, currentPersonaId, onPersonaChange }: PersonaSelectorProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedId, setSelectedId] = useState(currentPersonaId || 'scientific_analyst');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/personas')
      .then(res => res.json())
      .then(data => setPersonas(data.data.personas));
  }, []);

  const updatePersona = async (personaId: string) => {
    setIsLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/persona`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId })
      });
      setSelectedId(personaId);
      onPersonaChange?.(personaId);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPersona = personas.find(p => p.id === selectedId);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Script Persona
        </label>
        <select
          value={selectedId}
          onChange={(e) => updatePersona(e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2 border rounded-md"
        >
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.name} {persona.is_default ? '(Default)' : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedPersona && (
        <p className="text-sm text-gray-600">
          {selectedPersona.description}
        </p>
      )}
    </div>
  );
}
```

**Integration with Project Header/Settings:**
```typescript
// components/features/project/ProjectHeader.tsx
export function ProjectHeader({ project }: { project: Project }) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h1 className="text-xl font-semibold">{project.name}</h1>

      <div className="flex items-center gap-4">
        {/* Persona indicator */}
        <div className="text-sm text-gray-500">
          Persona: {project.persona_name || 'Scientific Analyst'}
        </div>

        {/* Settings button opens modal with PersonaSelector */}
        <ProjectSettingsButton projectId={project.id} />
      </div>
    </div>
  );
}
```

### Benefits of Unified Persona Architecture

**Consistency:**
- ✅ Same persona tone in chat AND generated scripts
- ✅ No mismatch between brainstorming and output
- ✅ Single source of truth for LLM behavior

**User Control (FR-1.9.01 - FR-1.9.08):**
- ✅ Per-project persona selection
- ✅ Immediate effect on all LLM interactions
- ✅ Blackpill Realist produces nihilistic content throughout

**Maintainability:**
- ✅ One prompt file per persona (not two)
- ✅ Easier to add new personas
- ✅ Clear separation: persona = WHO, task prompt = WHAT

**Privacy & Security:**
- ✅ Personas stored locally in SQLite
- ✅ No content restrictions (local Ollama)
- ✅ Full transparency into LLM behavior

### Implementation Priority (Feature 1.9 - MVP)

**MVP Requirements:**
1. Seed 4 preset personas into `system_prompts` table (Migration 012)
2. Add persona selection dropdown to project settings UI
3. Update `/api/chat` to use project's persona
4. Update `script-generator.ts` to use project's persona
5. Remove redundant `SCRIPT_GENERATION_SYSTEM_PROMPT` constant

**Files to Modify:**
- `lib/llm/prompts/preset-personas.ts` - New file with persona definitions
- `lib/db/migrations/012_seed_preset_personas.ts` - Seed migration
- `lib/db/queries.ts` - Add `getProjectPersona()` helper
- `app/api/chat/route.ts` - Use persona instead of hardcoded prompt
- `lib/llm/script-generator.ts` - Accept projectId, use persona
- `components/features/project/PersonaSelector.tsx` - New UI component

**Post-MVP Enhancements:**
- Custom persona creation UI
- Persona editing and deletion
- Persona versioning and history

---

## State Management Architecture

### Hybrid Approach: Zustand + SQLite

**Client State (Zustand):**
- Active workflow step
- Current conversation messages (recent N)
- UI state (loading, errors, modals)
- Temporary selections (before save)

**Persistent State (SQLite):**
- Project metadata
- Complete conversation history
- Generated content (script, voice selection)
- Clip selections
- File references

### Zustand Store Examples

**Workflow Store:**
```typescript
// stores/workflow-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type WorkflowStep = 'topic' | 'voice' | 'script' | 'clips' | 'curation' | 'assembly';

interface WorkflowState {
  projectId: string | null;
  currentStep: WorkflowStep;
  topic: string | null;
  selectedVoice: string | null;
  script: Scene[] | null;
  clipSelections: Map<number, string>; // sceneNumber -> clipUrl

  // Actions
  setProject: (id: string) => void;
  setStep: (step: WorkflowStep) => void;
  setTopic: (topic: string) => void;
  setVoice: (voiceId: string) => void;
  setScript: (scenes: Scene[]) => void;
  selectClip: (sceneNumber: number, clipUrl: string) => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      projectId: null,
      currentStep: 'topic',
      topic: null,
      selectedVoice: null,
      script: null,
      clipSelections: new Map(),

      setProject: (id) => set({ projectId: id }),
      setStep: (step) => set({ currentStep: step }),
      setTopic: (topic) => set({ topic }),
      setVoice: (voiceId) => set({ selectedVoice: voiceId }),
      setScript: (script) => set({ script }),
      selectClip: (sceneNumber, clipUrl) =>
        set((state) => {
          const newSelections = new Map(state.clipSelections);
          newSelections.set(sceneNumber, clipUrl);
          return { clipSelections: newSelections };
        }),
      reset: () => set({
        projectId: null,
        currentStep: 'topic',
        topic: null,
        selectedVoice: null,
        script: null,
        clipSelections: new Map(),
      }),
    }),
    {
      name: 'workflow-storage', // localStorage key
    }
  )
);
```

**Conversation Store:**
```typescript
// stores/conversation-store.ts
import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationState {
  messages: Message[];
  isLoading: boolean;

  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  isLoading: false,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [] }),
}));
```

**Project Store (Story 1.6):**
```typescript
// stores/project-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Project {
  id: string;
  name: string;
  topic: string | null;
  lastActive: string;
  createdAt: string;
}

interface ProjectState {
  activeProjectId: string | null;
  projects: Project[];

  // Actions
  setActiveProject: (id: string) => void;
  loadProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      projects: [],

      setActiveProject: (id) => {
        set({ activeProjectId: id });
        // Update last_active timestamp in database
        fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastActive: new Date().toISOString() }),
        });
      },

      loadProjects: (projects) => set({ projects }),

      addProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects],
          activeProjectId: project.id,
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        })),
    }),
    {
      name: 'project-storage', // localStorage key
      partialize: (state) => ({
        activeProjectId: state.activeProjectId // Only persist active project ID
      }),
    }
  )
);
```

**Synchronization Pattern:**
```typescript
// Save workflow state to database
async function saveWorkflowState() {
  const state = useWorkflowStore.getState();
  await fetch('/api/projects/' + state.projectId, {
    method: 'PUT',
    body: JSON.stringify({
      currentStep: state.currentStep,
      topic: state.topic,
      selectedVoice: state.selectedVoice,
      script: state.script,
      clipSelections: Array.from(state.clipSelections.entries()),
    }),
  });
}

// Load workflow state from database
async function loadWorkflowState(projectId: string) {
  const response = await fetch('/api/projects/' + projectId);
  const project = await response.json();

  useWorkflowStore.setState({
    projectId: project.id,
    currentStep: project.currentStep,
    topic: project.topic,
    selectedVoice: project.selectedVoice,
    script: project.script,
    clipSelections: new Map(project.clipSelections),
  });
}
```

---

## Database Schema

**SQLite Database:** `ai-video-generator.db`

```sql
-- System prompts table
CREATE TABLE system_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  is_preset BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  topic TEXT,
  current_step TEXT DEFAULT 'topic',
  selected_voice TEXT,
  script_json TEXT, -- JSON array of scenes
  system_prompt_id TEXT, -- Optional: override default system prompt
  created_at TEXT DEFAULT (datetime('now')),
  last_active TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (system_prompt_id) REFERENCES system_prompts(id)
);

-- Conversation messages
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Scenes (Epic 2 - Script Generation & Voiceover, Epic 4 - Clip Selection)
CREATE TABLE scenes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_number INTEGER NOT NULL,
  text TEXT NOT NULL, -- Narration text for voiceover
  audio_file_path TEXT, -- Generated voiceover MP3 (Epic 2)
  duration INTEGER, -- Audio duration in seconds (Epic 2)
  visual_keywords TEXT, -- JSON array of keywords for CV label matching (Epic 3 Story 3.2, used by 3.7b)
  selected_clip_id TEXT, -- Selected visual suggestion (Epic 4 Story 4.4)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (selected_clip_id) REFERENCES visual_suggestions(id),
  UNIQUE(project_id, scene_number)
);

CREATE INDEX idx_scenes_project ON scenes(project_id);

-- Visual suggestions from AI sourcing (Epic 3)
CREATE TABLE visual_suggestions (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL,
  video_id TEXT NOT NULL, -- YouTube video ID
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  channel_title TEXT,
  embed_url TEXT NOT NULL,
  rank INTEGER NOT NULL, -- Ranking from 1-8 (top suggestions)
  duration INTEGER, -- Video duration in seconds (Epic 3 Story 3.4)
  default_segment_path TEXT, -- Path to downloaded default segment (Epic 3 Story 3.6)
  download_status TEXT DEFAULT 'pending', -- pending, downloading, complete, error (Epic 3 Story 3.6)
  cv_score REAL, -- Computer vision quality score 0.0-1.0 (Epic 3 Story 3.7/3.7b)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

CREATE INDEX idx_visual_suggestions_scene ON visual_suggestions(scene_id);

-- Clip selections
CREATE TABLE clip_selections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_number INTEGER NOT NULL,
  youtube_video_id TEXT NOT NULL,
  clip_url TEXT NOT NULL,
  downloaded_path TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, scene_number)
);

-- Generated audio files
CREATE TABLE audio_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  duration_seconds REAL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, scene_number)
);

-- Final rendered videos
CREATE TABLE rendered_videos (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration_seconds REAL,
  file_size_bytes INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_messages_project ON messages(project_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_projects_last_active ON projects(last_active);
CREATE INDEX idx_visual_suggestions_scene ON visual_suggestions(scene_id);
```

**Database Client:**
```typescript
// lib/db/client.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'ai-video-generator.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export default db;
```

```typescript
// lib/db/init.ts
// Database initialization with globalThis singleton pattern
// Uses globalThis to persist across Next.js hot reloads in development mode

import { readFileSync } from 'fs';
import path from 'path';
import db from './client';

// Global singleton - survives module reloads in Next.js dev mode
declare global {
  var __dbInitialized: boolean | undefined;
  var __dbInitPromise: Promise<void> | undefined;
}

const isInitialized = (): boolean => globalThis.__dbInitialized === true;
const setInitialized = (value: boolean): void => { globalThis.__dbInitialized = value; };
const getInitPromise = (): Promise<void> | undefined => globalThis.__dbInitPromise;
const setInitPromise = (promise: Promise<void> | undefined): void => { globalThis.__dbInitPromise = promise; };

export async function initializeDatabase(): Promise<void> {
  // Return immediately if already initialized (persists across module reloads)
  if (isInitialized()) {
    return;
  }

  // If initialization is in progress, wait for it to complete
  const existingPromise = getInitPromise();
  if (existingPromise) {
    return existingPromise;
  }

  // Start initialization
  const initPromise = (async () => {
    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    // Run migrations...
    await runMigrations();

    setInitialized(true);
  })();

  setInitPromise(initPromise);
  return initPromise;
}
```

**Why globalThis?** In Next.js development mode, modules are hot-reloaded frequently. Module-level variables like `let isInitialized = false` reset on each reload, causing database initialization to run on every API request. Using `globalThis` ensures the initialization state persists within the same Node.js process, so initialization runs only once per server start.

**Database Query Functions (Story 1.6 - Project Management):**
```typescript
// lib/db/queries.ts
import db from './client';
import { randomUUID } from 'crypto';

interface Project {
  id: string;
  name: string;
  topic: string | null;
  current_step: string;
  created_at: string;
  last_active: string;
}

// Get all projects ordered by last_active (most recent first)
export function getAllProjects(): Project[] {
  return db.prepare(`
    SELECT id, name, topic, current_step, created_at, last_active
    FROM projects
    ORDER BY last_active DESC
  `).all() as Project[];
}

// Get single project by ID
export function getProjectById(id: string): Project | null {
  return db.prepare(`
    SELECT id, name, topic, current_step, created_at, last_active
    FROM projects
    WHERE id = ?
  `).get(id) as Project | null;
}

// Create new project
export function createProject(name: string = 'New Project'): Project {
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO projects (id, name, current_step, created_at, last_active)
    VALUES (?, ?, 'topic', ?, ?)
  `).run(id, name, now, now);

  return getProjectById(id)!;
}

// Update project last_active timestamp
export function updateProjectLastActive(id: string): void {
  db.prepare(`
    UPDATE projects
    SET last_active = datetime('now')
    WHERE id = ?
  `).run(id);
}

// Update project name (auto-generated from first message)
export function updateProjectName(id: string, name: string): void {
  db.prepare(`
    UPDATE projects
    SET name = ?
    WHERE id = ?
  `).run(name, id);
}

// Update project metadata
export function updateProject(id: string, updates: {
  name?: string;
  topic?: string;
  current_step?: string;
}): void {
  const fields = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');

  const values = Object.values(updates);

  db.prepare(`
    UPDATE projects
    SET ${fields}, last_active = datetime('now')
    WHERE id = ?
  `).run(...values, id);
}

// Delete project (optional for MVP, cascades to messages)
export function deleteProject(id: string): void {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}

// Get all messages for a project
export function getProjectMessages(projectId: string): Message[] {
  return db.prepare(`
    SELECT id, role, content, timestamp
    FROM messages
    WHERE project_id = ?
    ORDER BY timestamp ASC
  `).all(projectId) as Message[];
}
```

### Database Migration Strategy

**Purpose:** Manage schema changes across development iterations without data loss

**Migration System:**
```typescript
// lib/db/migrations.ts
import db from './client';

interface Migration {
  version: number;
  name: string;
  up: (db: Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db) => {
      // Create base tables: projects, messages, system_prompts
      db.exec(`
        CREATE TABLE IF NOT EXISTS system_prompts (...);
        CREATE TABLE IF NOT EXISTS projects (...);
        CREATE TABLE IF NOT EXISTS messages (...);
        CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id);
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
        CREATE INDEX IF NOT EXISTS idx_projects_last_active ON projects(last_active);
      `);
    }
  },
  {
    version: 2,
    name: 'add_scenes_table',
    up: (db) => {
      // Epic 2: Scenes for script and voiceover
      db.exec(`
        CREATE TABLE IF NOT EXISTS scenes (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          scene_number INTEGER NOT NULL,
          text TEXT NOT NULL,
          audio_file_path TEXT,
          duration INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          UNIQUE(project_id, scene_number)
        );
        CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id);
      `);
    }
  },
  {
    version: 3,
    name: 'add_visual_suggestions',
    up: (db) => {
      // Epic 3: Visual suggestions from YouTube API
      db.exec(`
        CREATE TABLE IF NOT EXISTS visual_suggestions (
          id TEXT PRIMARY KEY,
          scene_id TEXT NOT NULL,
          video_id TEXT NOT NULL,
          title TEXT NOT NULL,
          thumbnail_url TEXT,
          channel_title TEXT,
          embed_url TEXT NOT NULL,
          rank INTEGER NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_visual_suggestions_scene ON visual_suggestions(scene_id);
      `);
    }
  },
  {
    version: 4,
    name: 'add_segment_downloads',
    up: (db) => {
      // Epic 3 Story 3.4 & 3.6: Duration filtering and default segment downloads
      db.exec(`
        ALTER TABLE visual_suggestions ADD COLUMN duration INTEGER;
        ALTER TABLE visual_suggestions ADD COLUMN default_segment_path TEXT;
        ALTER TABLE visual_suggestions ADD COLUMN download_status TEXT DEFAULT 'pending';
      `);
    }
  },
  {
    version: 5,
    name: 'add_clip_selections',
    up: (db) => {
      // Epic 4: User clip selections
      db.exec(`
        CREATE TABLE IF NOT EXISTS clip_selections (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          scene_number INTEGER NOT NULL,
          youtube_video_id TEXT NOT NULL,
          clip_url TEXT NOT NULL,
          downloaded_path TEXT,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          UNIQUE(project_id, scene_number)
        );
      `);
    }
  },
  {
    version: 6,
    name: 'add_audio_and_rendered_videos',
    up: (db) => {
      // Epic 2 & 5: Audio files and final rendered videos
      db.exec(`
        CREATE TABLE IF NOT EXISTS audio_files (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          scene_number INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          voice_id TEXT NOT NULL,
          duration_seconds REAL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          UNIQUE(project_id, scene_number)
        );

        CREATE TABLE IF NOT EXISTS rendered_videos (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          file_path TEXT NOT NULL,
          thumbnail_path TEXT,
          duration_seconds REAL,
          file_size_bytes INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
      `);
    }
  },
  {
    version: 7,
    name: 'add_selected_clip_to_scenes',
    up: (db) => {
      // Epic 4 Story 4.4: Clip selection persistence
      db.exec(`
        ALTER TABLE scenes ADD COLUMN selected_clip_id TEXT
          REFERENCES visual_suggestions(id);
      `);
    }
  }
];

// Schema version tracking table
function initializeVersionTracking(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// Get current schema version
function getCurrentVersion(db: Database): number {
  const result = db.prepare(
    'SELECT COALESCE(MAX(version), 0) as version FROM schema_version'
  ).get() as { version: number };
  return result.version;
}

// Update schema version
function updateVersion(db: Database, version: number, name: string): void {
  db.prepare(
    'INSERT INTO schema_version (version, name) VALUES (?, ?)'
  ).run(version, name);
}

// Run all pending migrations
export function runMigrations(): void {
  initializeVersionTracking(db);
  const currentVersion = getCurrentVersion(db);

  console.log(`Current database version: ${currentVersion}`);

  const pendingMigrations = migrations.filter(m => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    console.log('Database is up to date');
    return;
  }

  console.log(`Running ${pendingMigrations.length} migration(s)...`);

  // Run migrations in a transaction
  db.transaction(() => {
    for (const migration of pendingMigrations) {
      console.log(`  Applying migration ${migration.version}: ${migration.name}`);
      migration.up(db);
      updateVersion(db, migration.version, migration.name);
    }
  })();

  console.log('All migrations completed successfully');
}
```

**Usage in Application Startup:**
```typescript
// app/layout.tsx or server initialization
import { runMigrations } from '@/lib/db/migrations';

// Run migrations on startup (server-side only)
if (typeof window === 'undefined') {
  runMigrations();
}
```

**Migration Best Practices:**
- ✅ **Never modify existing migrations** - Always create new ones
- ✅ **Use IF NOT EXISTS** for CREATE TABLE statements (idempotent)
- ✅ **Test migrations** with both empty and populated databases
- ✅ **Include rollback plan** for production (manual SQL if needed)
- ✅ **Version migrations sequentially** - No gaps in version numbers

**Adding New Migration:**
```typescript
// When adding Epic 4 custom segment selection:
{
  version: 7,
  name: 'add_custom_segment_tracking',
  up: (db) => {
    db.exec(`
      ALTER TABLE clip_selections ADD COLUMN segment_start_timestamp INTEGER;
      ALTER TABLE clip_selections ADD COLUMN is_custom_segment BOOLEAN DEFAULT false;
    `);
  }
}
```

**Migration Status Check:**
```typescript
// lib/db/queries.ts
export function getDatabaseVersion(): { version: number; name: string } {
  return db.prepare(`
    SELECT version, name FROM schema_version
    ORDER BY version DESC LIMIT 1
  `).get() as { version: number; name: string };
}
```

**Benefits:**
- ✅ Automated schema updates during development
- ✅ No manual SQL execution required
- ✅ Safe for team collaboration (consistent schema state)
- ✅ Version history tracking
- ✅ Idempotent (safe to run multiple times)

---

## Video Processing Pipeline

### FFmpeg Operations

**1. Trim Video to Audio Duration:**
```typescript
// lib/video/ffmpeg.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function trimVideoToAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  // Get audio duration
  const { stdout: durationStr } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
  );
  const duration = parseFloat(durationStr.trim());

  // Trim video
  await execAsync(
    `ffmpeg -i "${videoPath}" -t ${duration} -c copy "${outputPath}"`
  );
}
```

**2. Overlay Audio on Video:**
```typescript
export async function overlayAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  await execAsync(
    `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`
  );
}
```

**3. Concatenate Videos:**
```typescript
export async function concatenateVideos(
  videoPaths: string[],
  outputPath: string
): Promise<void> {
  // Create concat file list
  const listPath = path.join(os.tmpdir(), 'concat-list.txt');
  const listContent = videoPaths.map(p => `file '${p}'`).join('\n');
  await writeFile(listPath, listContent);

  // Concatenate
  await execAsync(
    `ffmpeg -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`
  );

  // Cleanup
  await unlink(listPath);
}
```

**4. Generate Thumbnail:**
```typescript
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timestamp: number = 1.0
): Promise<void> {
  // Extract frame at timestamp
  await execAsync(
    `ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 "${outputPath}"`
  );
}
```

### Complete Assembly Pipeline

```typescript
// lib/video/assembler.ts
export async function assembleVideo(
  projectId: string,
  scenes: Array<{ videoPath: string; audioPath: string }>
): Promise<string> {
  const outputDir = path.join('.cache', 'projects', projectId);
  await mkdir(outputDir, { recursive: true });

  const processedScenes: string[] = [];

  // Step 1: Process each scene
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const trimmedPath = path.join(outputDir, `scene-${i}-trimmed.mp4`);
    const finalPath = path.join(outputDir, `scene-${i}-final.mp4`);

    // Trim video to audio duration
    await trimVideoToAudio(scene.videoPath, scene.audioPath, trimmedPath);

    // Overlay audio
    await overlayAudio(trimmedPath, scene.audioPath, finalPath);

    processedScenes.push(finalPath);
  }

  // Step 2: Concatenate all scenes
  const finalOutputPath = path.join('.cache', 'output', `${projectId}.mp4`);
  await concatenateVideos(processedScenes, finalOutputPath);

  // Step 3: Generate thumbnail
  const thumbnailPath = path.join('.cache', 'output', `${projectId}-thumb.jpg`);
  await generateThumbnail(finalOutputPath, thumbnailPath);

  return finalOutputPath;
}
```

---

## API Design

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

---

## Implementation Patterns

### Naming Conventions

**API Routes:**
- REST endpoints: `/api/projects` (plural nouns)
- Route parameters: `/api/projects/[id]` (Next.js convention)

**Database:**
- Table names: `projects`, `messages`, `audio_files` (lowercase, snake_case, plural)
- Column names: `user_id`, `created_at` (snake_case)
- Primary keys: `id` (TEXT UUID)

**Frontend:**
- Components: `PascalCase` (e.g., `SceneCard.tsx`, `VideoPreview.tsx`)
- Files: Match component name (`SceneCard.tsx`)
- Hooks: `useCamelCase` (e.g., `useWorkflowState.ts`)
- Utils: `camelCase` (e.g., `generateScript.ts`)
- Types: `PascalCase` (e.g., `WorkflowStep`, `Message`)

### File Organization

**Tests:**
- Co-located with source: `SceneCard.test.tsx` next to `SceneCard.tsx`

**Imports:**
- Use path aliases: `@/components/...`, `@/lib/...`, `@/stores/...`

### Error Handling

**User-Facing Errors:**
- Friendly, actionable messages
- Example: "Unable to download video. Please check your internet connection."

**Logged Errors:**
- Technical details with context
- Include stack traces in development
- Example: `[FFmpeg Error] Command failed: ffmpeg -i input.mp4... (exit code 1)`

**Error Boundaries:**
- Wrap major sections in React Error Boundaries
- Graceful degradation

### Async Patterns

**API Routes:**
```typescript
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await processRequest(body);
    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      {
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}
```

**Component Data Fetching:**
```typescript
// Use React Server Components for initial data
async function ScenePage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  return <SceneDisplay project={project} />;
}

// Use client-side fetching for mutations
function CurationUI() {
  const selectClip = async (sceneNumber: number, clipUrl: string) => {
    const response = await fetch('/api/clips/select', {
      method: 'POST',
      body: JSON.stringify({ sceneNumber, clipUrl }),
    });
    const result = await response.json();
    if (result.success) {
      updateStore(sceneNumber, clipUrl);
    }
  };
}
```

### UI Consistency Patterns

#### Duration Badge Color-Coding (Epic 3 Story 3.6, Epic 4)

**Purpose:** Provide consistent visual feedback on video duration suitability across all UI components

**Color Logic:**
```typescript
// lib/utils/duration-badge.ts
function getBadgeColor(
  videoDuration: number,
  sceneDuration: number
): { background: string; text: string; tooltip: string } {
  const ratio = videoDuration / sceneDuration;

  if (ratio >= 1 && ratio <= 2) {
    return {
      background: '#10b981', // Green (Emerald 500)
      text: '#ffffff',
      tooltip: 'Ideal length for this scene'
    };
  } else if (ratio > 2 && ratio <= 3) {
    return {
      background: '#f59e0b', // Yellow (Amber 500)
      text: '#000000',
      tooltip: 'Acceptable length - some trimming needed'
    };
  } else if (ratio > 3) {
    return {
      background: '#ef4444', // Red (Red 500)
      text: '#ffffff',
      tooltip: 'Long video - consider shorter alternatives'
    };
  } else { // ratio < 1
    return {
      background: '#6b7280', // Gray (Gray 500)
      text: '#ffffff',
      tooltip: 'Video shorter than needed'
    };
  }
}
```

**Usage Examples:**
```typescript
// Example 1: 10s scene, 15s video
const badge1 = getBadgeColor(15, 10);
// → { background: '#10b981', tooltip: 'Ideal length...' } (Green)

// Example 2: 10s scene, 25s video
const badge2 = getBadgeColor(25, 10);
// → { background: '#f59e0b', tooltip: 'Acceptable length...' } (Yellow)

// Example 3: 10s scene, 90s video
const badge3 = getBadgeColor(90, 10);
// → { background: '#ef4444', tooltip: 'Long video...' } (Red)

// Example 4: 10s scene, 8s video
const badge4 = getBadgeColor(8, 10);
// → { background: '#6b7280', tooltip: 'Video shorter...' } (Gray)
```

**Ratio Thresholds:**
- **1x-2x:** Green - Perfect range, minimal trimming needed
- **2x-3x:** Yellow - Acceptable, will need noticeable trimming
- **>3x:** Red - Very long, significant trimming or reconsider choice
- **<1x:** Gray - Video too short, can't fill scene duration

**Component Integration:**
```typescript
// components/features/curation/DurationBadge.tsx
export function DurationBadge({ videoDuration, sceneDuration }: Props) {
  const { background, text, tooltip } = getBadgeColor(videoDuration, sceneDuration);

  return (
    <div
      className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold"
      style={{ backgroundColor: background, color: text }}
      title={tooltip}
      aria-label={`${formatDuration(videoDuration)} - ${tooltip}`}
    >
      {formatDuration(videoDuration)}
    </div>
  );
}
```

**Consistency Requirements:**
- ✅ Use exact hex colors across all components
- ✅ Same ratio thresholds everywhere (1x-2x, 2x-3x, >3x, <1x)
- ✅ Consistent tooltip messages
- ✅ Same formatting for duration display (e.g., "1:23" not "1m 23s")

**Where Applied:**
- Epic 3 Story 3.6: After default segment downloads (preview thumbnails)
- Epic 4: Visual curation UI (all video suggestion thumbnails)
- Visual suggestion database queries (for sorting/filtering by suitability)

---

### Project Switching Workflow (Story 1.6)

**Pattern for switching between projects:**
```typescript
// When user clicks a project in sidebar
async function switchToProject(newProjectId: string) {
  const currentProjectId = useProjectStore.getState().activeProjectId;

  // 1. Cancel any in-flight requests for current project
  if (currentRequestController) {
    currentRequestController.abort();
  }

  // 2. Save current scroll position (optional, for restoring state)
  const scrollPosition = window.scrollY;
  sessionStorage.setItem(`scroll-${currentProjectId}`, String(scrollPosition));

  // 3. Update active project in store (triggers localStorage persistence)
  useProjectStore.getState().setActiveProject(newProjectId);

  // 4. Clear current conversation state
  useConversationStore.getState().clearMessages();

  // 5. Load new project's conversation history
  currentRequestController = new AbortController();
  const response = await fetch(`/api/projects/${newProjectId}/messages`, {
    signal: currentRequestController.signal,
  });

  if (response.ok) {
    const messages = await response.json();
    useConversationStore.getState().setMessages(messages.data);
  }

  // 6. Update URL for deep linking
  window.history.pushState({}, '', `/projects/${newProjectId}`);

  // 7. Restore scroll position (optional)
  const savedScroll = sessionStorage.getItem(`scroll-${newProjectId}`);
  if (savedScroll) {
    window.scrollTo(0, parseInt(savedScroll));
  }

  // 8. last_active timestamp updated automatically in setActiveProject action
}
```

**Auto-Generate Project Name Pattern:**
```typescript
// lib/utils/generate-project-name.ts
export function generateProjectName(firstMessage: string): string {
  const maxLength = 30;
  const trimmed = firstMessage.trim();

  // Too short? Use fallback
  if (trimmed.length < 5) {
    return `New Project ${new Date().toLocaleDateString()}`;
  }

  // Short enough? Use as-is
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  // Truncate to last complete word
  const truncated = trimmed.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  return lastSpaceIndex > 5
    ? truncated.substring(0, lastSpaceIndex) + '...'
    : truncated.substring(0, maxLength - 3) + '...';
}

// Usage: When user sends first message in new project
const projectName = generateProjectName(firstUserMessage);
await fetch(`/api/projects/${projectId}`, {
  method: 'PUT',
  body: JSON.stringify({ name: projectName }),
});
```

### YouTube API Integration Patterns (Epic 3)

**YouTubeAPIClient Initialization:**
```typescript
// lib/youtube/client.ts
export class YouTubeAPIClient {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';
  private quotaUsed = 0;
  private quotaLimit = 10000; // Daily limit
  private requestTimestamps: number[] = [];
  private rateLimitWindow = 100000; // 100 seconds
  private rateLimitMax = 100; // 100 requests per 100 seconds

  constructor(apiKey: string) {
    if (!apiKey || apiKey === 'your_youtube_api_key_here') {
      throw new Error(
        'YouTube API key not configured.\n' +
        'Get a key at: https://console.cloud.google.com\n' +
        'Enable YouTube Data API v3 for your project\n' +
        'Set YOUTUBE_API_KEY in .env.local'
      );
    }
    this.apiKey = apiKey;
  }

  // Rate limiting check before each request
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    // Remove timestamps older than window
    this.requestTimestamps = this.requestTimestamps.filter(
      ts => now - ts < this.rateLimitWindow
    );

    if (this.requestTimestamps.length >= this.rateLimitMax) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitMs = this.rateLimitWindow - (now - oldestTimestamp);
      throw new Error(
        `YouTube API rate limit reached. Wait ${Math.ceil(waitMs / 1000)} seconds.`
      );
    }

    this.requestTimestamps.push(now);
  }

  // Quota tracking
  private trackQuota(units: number): void {
    this.quotaUsed += units;
    if (this.quotaUsed >= this.quotaLimit) {
      throw new Error(
        'YouTube API quota exceeded (10,000 units/day).\n' +
        'Try again tomorrow or request quota increase at:\n' +
        'https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas'
      );
    }
  }

  // Search videos with exponential backoff
  async searchVideos(query: string, maxResults: number = 15): Promise<YouTubeVideo[]> {
    await this.checkRateLimit();

    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      videoEmbeddable: 'true',
      maxResults: maxResults.toString(),
      key: this.apiKey,
    });

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        const response = await fetch(`${this.baseUrl}/search?${params}`);

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('YouTube API quota exceeded or invalid API key');
          }
          throw new Error(`YouTube API error: ${response.status}`);
        }

        const data = await response.json();
        this.trackQuota(100); // search.list costs 100 units

        return data.items.map((item: any) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          thumbnailUrl: item.snippet.thumbnails.medium.url,
          channelTitle: item.snippet.channelTitle,
          embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
        }));
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) throw error;

        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    return [];
  }
}
```

**Scene Analysis for Visual Search:**
```typescript
// lib/youtube/analyze-scene.ts
import { getLLMProvider } from '@/lib/llm/factory';
import type { SearchQueries } from '@/types/youtube';

export async function analyzeSceneForVisuals(sceneText: string): Promise<SearchQueries> {
  const llm = getLLMProvider();

  const prompt = `Analyze this video script scene and generate optimized YouTube search queries to find relevant B-roll footage.

Scene text: "${sceneText}"

Extract:
1. Main subject/topic
2. Setting/location
3. Mood/atmosphere
4. Action/activity
5. Keywords

Generate:
- Primary search query (most relevant, 3-6 keywords)
- 2-3 alternative search queries for diversity
- Content type (nature, gaming, tutorial, documentary, urban, abstract)

Format response as JSON:
{
  "primary": "keyword1 keyword2 keyword3",
  "alternatives": ["query1", "query2", "query3"],
  "contentType": "nature"
}`;

  try {
    const response = await llm.chat([{ role: 'user', content: prompt }]);
    const parsed = JSON.parse(response);

    return {
      primary: parsed.primary,
      alternatives: parsed.alternatives || [],
      contentType: parsed.contentType || 'general',
    };
  } catch (error) {
    // Fallback: simple keyword extraction
    const keywords = sceneText
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 5)
      .join(' ');

    return {
      primary: keywords || 'video footage',
      alternatives: [],
      contentType: 'general',
    };
  }
}

const commonWords = ['the', 'and', 'that', 'this', 'with', 'from', 'have', 'been', 'will'];
```

**Content Filtering & Ranking:**
```typescript
// lib/youtube/filter-results.ts
import type { YouTubeVideo, FilterConfig } from '@/types/youtube';

export function filterAndRankResults(
  results: YouTubeVideo[],
  config: FilterConfig
): YouTubeVideo[] {
  // Step 1: Apply filters
  let filtered = results.filter(video => {
    // Title spam detection
    const emojiCount = (video.title.match(/[\p{Emoji}]/gu) || []).length;
    const capsRatio = (video.title.match(/[A-Z]/g) || []).length / video.title.length;

    if (emojiCount > 5) return false;
    if (capsRatio > 0.5) return false;

    return true;
  });

  // Step 2: Rank results
  filtered = filtered.map((video, index) => ({
    ...video,
    score: calculateRelevanceScore(video, index, config),
  }));

  // Step 3: Sort by score
  filtered.sort((a, b) => b.score - a.score);

  // Step 4: Limit to top N
  return filtered.slice(0, config.maxSuggestions || 8);
}

function calculateRelevanceScore(
  video: YouTubeVideo,
  position: number,
  config: FilterConfig
): number {
  let score = 0;

  // Position score (YouTube's relevance)
  score += (20 - position) * 5;

  // Creative Commons preference
  if (video.license === 'creativeCommon') {
    score += 20;
  }

  // Quality indicators
  if (video.title.length > 20 && video.title.length < 80) {
    score += 10; // Well-formed title
  }

  return score;
}
```

**Error Handling Pattern:**
```typescript
// app/api/projects/[id]/generate-visuals/route.ts
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const youtubeClient = new YouTubeAPIClient(
      process.env.YOUTUBE_API_KEY || ''
    );

    const scenes = await getScenesByProjectId(params.id);
    const results = [];
    const failed = [];

    for (const scene of scenes) {
      try {
        // Analyze scene
        const queries = await analyzeSceneForVisuals(scene.text);

        // Search YouTube
        const videos = await youtubeClient.searchVideos(queries.primary, 15);

        // Filter & rank
        const filtered = filterAndRankResults(videos, { maxSuggestions: 8 });

        // Save to database
        await saveVisualSuggestions(scene.id, filtered);

        results.push({ sceneId: scene.id, count: filtered.length });
      } catch (error) {
        failed.push({
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          error: error.message,
        });
      }
    }

    await updateProject(params.id, { visuals_generated: true });

    return Response.json({
      success: true,
      data: {
        projectId: params.id,
        scenesProcessed: results.length,
        totalSuggestions: results.reduce((sum, r) => sum + r.count, 0),
        status: failed.length === 0 ? 'completed' : 'partial',
        failedScenes: failed.length > 0 ? failed : undefined,
      },
    });
  } catch (error) {
    // Handle YouTube API-specific errors
    if (error.message.includes('quota')) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'YouTube API quota exceeded. Try again tomorrow.',
            code: 'YOUTUBE_QUOTA_EXCEEDED',
          },
        },
        { status: 429 }
      );
    }

    if (error.message.includes('not configured')) {
      return Response.json(
        {
          success: false,
          error: {
            message: error.message,
            code: 'YOUTUBE_API_KEY_MISSING',
          },
        },
        { status: 500 }
      );
    }

    // Generic error
    return Response.json(
      {
        success: false,
        error: {
          message: 'Visual sourcing failed. Please try again.',
          code: 'VISUAL_SOURCING_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
```

### Date/Time Handling

**Storage:** ISO 8601 strings in UTC
```typescript
const timestamp = new Date().toISOString(); // "2025-11-01T12:00:00.000Z"
```

**Display:** User's locale
```typescript
const displayDate = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(timestamp));
```

### File Path Handling

**Always use `path.join()` for cross-platform compatibility:**
```typescript
import path from 'path';

// Good
const audioPath = path.join('.cache', 'audio', `${projectId}.mp3`);

// Bad
const audioPath = `.cache/audio/${projectId}.mp3`; // Breaks on Windows
```

### Consistency Rules

**All agents MUST follow these patterns:**
- API responses use standard `{ success, data/error }` format
- Database queries use parameterized statements (prevent SQL injection)
- File operations check for existence before reading/writing
- Errors are logged with context and re-thrown with user-friendly messages
- TypeScript strict mode enabled (no `any` types without justification)

---

## Security & Privacy

### Local-First Privacy

**Data Stays Local:**
- All processing happens on user's machine
- SQLite database stored locally
- No user data sent to cloud (except YouTube API queries)
- Conversation history never leaves the machine

### API Key Security

**YouTube Data API:**
- API key stored in `.env.local` (git-ignored)
- Never exposed to client-side code
- API calls made from Next.js API routes (server-side only)

**Environment Variables:**
```bash
# .env.local (git-ignored)
YOUTUBE_API_KEY=your_api_key_here
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### Input Validation

**All user inputs validated:**
```typescript
// Example: Validate topic input
function validateTopic(topic: string): boolean {
  if (!topic || topic.trim().length === 0) {
    throw new Error('Topic cannot be empty');
  }
  if (topic.length > 500) {
    throw new Error('Topic too long (max 500 characters)');
  }
  return true;
}
```

### File System Security

**Sandboxed file operations:**
- All file operations confined to `.cache/` directory
- Validate file paths to prevent directory traversal
- Clean up temporary files after use

```typescript
function validateFilePath(filePath: string): void {
  const normalized = path.normalize(filePath);
  const cacheDir = path.resolve('.cache');

  if (!normalized.startsWith(cacheDir)) {
    throw new Error('Invalid file path: outside cache directory');
  }
}
```

### SQL Injection Prevention

**Always use parameterized queries:**
```typescript
// Good
db.prepare('SELECT * FROM messages WHERE project_id = ?').all(projectId);

// Bad (vulnerable to SQL injection)
db.exec(`SELECT * FROM messages WHERE project_id = '${projectId}'`);
```

---

## Performance Considerations

### Video Processing Optimization

**Parallel Processing:**
- Generate voiceovers for all scenes concurrently (KokoroTTS is fast)
- Download multiple YouTube clips in parallel (with rate limiting)

**FFmpeg Optimization:**
- Use `-c copy` when possible (stream copy, no re-encoding)
- Avoid unnecessary transcoding

**Caching:**
- Cache downloaded YouTube clips (don't re-download same video)
- Cache generated voiceovers (if script unchanged)

### Database Performance

**Indexes:**
- Created on `messages(project_id)` for fast conversation loading
- Created on `messages(timestamp)` for chronological ordering

**Query Optimization:**
- Load only recent N messages for active conversation (not full history)
- Use prepared statements for repeated queries

### Frontend Performance

**Code Splitting:**
- Next.js automatically code-splits by route
- Lazy load heavy components (video player, curation UI)

**Image/Video Optimization:**
- Use Next.js Image component for thumbnails
- Lazy load video thumbnails (intersection observer)

**State Management:**
- Zustand is lightweight (3KB)
- Persist only essential state to localStorage

---

## Development Environment

### Prerequisites

**Required:**
- Node.js 18+ (for Next.js)
- Python 3.10+ (for yt-dlp, KokoroTTS)
- UV (Python package manager)
- Ollama installed and running (http://localhost:11434)
- FFmpeg 7.1.2+ installed and in PATH

**Optional:**
- VS Code with TypeScript, ESLint, Tailwind CSS IntelliSense extensions

### Setup Instructions

```bash
# 1. Clone repository
git clone <repo-url>
cd ai-video-generator

# 2. Install Node dependencies
npm install

# 3. Install Python dependencies (using UV)
uv pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 5. Initialize database
npm run db:init

# 6. Verify Ollama is running
ollama list  # Should show llama3.2

# 7. Start development server
npm run dev
```

### Development Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:init": "node scripts/init-db.js",
    "db:reset": "node scripts/reset-db.js",
    "db:seed": "node scripts/seed-db.js"
  }
}
```

### Environment Variables

```bash
# .env.local

# ============================================
# YouTube Data API (Epic 3)
# ============================================
# Get API key at: https://console.cloud.google.com
# Enable YouTube Data API v3 for your project
# Free tier: 10,000 quota units/day
YOUTUBE_API_KEY=your_youtube_api_key_here

# ============================================
# LLM Provider Configuration
# ============================================
# Choose: 'ollama' (local, FOSS) or 'gemini' (cloud, free tier)
LLM_PROVIDER=ollama

# Ollama Configuration (Primary, FOSS-compliant)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Gemini Configuration (Optional, Cloud-based)
# Get free API key at: https://aistudio.google.com/apikey
# Free tier: 15 requests/minute, 1,500 requests/day
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# ============================================
# Database & Storage
# ============================================
DATABASE_PATH=./ai-video-generator.db
CACHE_DIR=./.cache
OUTPUT_DIR=./.cache/output
```

---

## Deployment Architecture

### Local Single-User Deployment

**Target Environment:** User's local machine (Windows, macOS, Linux)

**Installation Method:**
1. User clones repository or downloads release
2. Runs setup script (installs dependencies)
3. Starts application via `npm run dev` or `npm start`
4. Accesses at `http://localhost:3000`

**Dependencies:**
- Ollama must be installed and running
- FFmpeg must be installed
- Python 3.10+ must be installed

**Data Storage:**
- SQLite database: `./ai-video-generator.db`
- Temporary files: `./.cache/`
- Final videos: `./.cache/output/`

**No Server Required:**
- Everything runs locally
- No authentication needed (single user)
- No cloud costs

---

## Cloud Migration Path

### Future Multi-Tenant Cloud Deployment

**When to migrate:** If the application needs to support multiple users via web hosting

**Required Changes:**

1. **Database: SQLite → PostgreSQL**
   ```sql
   -- Add users table
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email VARCHAR(255) UNIQUE NOT NULL,
     name VARCHAR(255),
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Add user_id to existing tables
   ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES users(id);
   ALTER TABLE messages ADD COLUMN user_id UUID; -- Denormalized for query performance
   ```

2. **Authentication: Add NextAuth.js or Clerk**
   ```typescript
   // Middleware for protected routes
   export { default } from "next-auth/middleware";
   export const config = { matcher: ["/api/:path*", "/projects/:path*"] };
   ```

3. **File Storage: Local → S3/R2**
   ```typescript
   // Upload to S3 instead of local filesystem
   await s3Client.putObject({
     Bucket: 'video-generator',
     Key: `${userId}/${projectId}/audio/scene1.mp3`,
     Body: audioBuffer,
   });
   ```

4. **LLM Provider: Local Ollama → Cloud API or Shared Ollama**
   ```typescript
   // Provider abstraction already supports this!
   case 'openai':
     return new OpenAIProvider(user.openaiApiKey);
   case 'anthropic':
     return new AnthropicProvider(user.anthropicApiKey);
   ```

5. **Video Processing: Local FFmpeg → Cloud Worker**
   - Use queue system (BullMQ, Inngest)
   - Run FFmpeg on worker instances
   - Store results in S3

6. **Data Isolation**
   ```typescript
   // Add user_id filter to all queries
   const projects = await db.query(
     'SELECT * FROM projects WHERE user_id = ?',
     [userId]
   );
   ```

**Deployment Platforms:**
- Vercel (Next.js frontend + API routes)
- Supabase or Neon (PostgreSQL)
- Cloudflare R2 or AWS S3 (file storage)
- Fly.io or Railway (self-hosted Ollama with GPU)

**Migration Checklist:**
- [ ] Add user authentication (NextAuth.js)
- [ ] Migrate SQLite → PostgreSQL
- [ ] Implement user isolation (add user_id filters)
- [ ] Replace local file storage with S3
- [ ] Update LLM provider to cloud API or shared Ollama
- [ ] Add background job processing for video assembly
- [ ] Implement rate limiting per user
- [ ] Add billing/subscription (if monetizing)

---

## Cross-Epic Integration Architecture

### Overview

The cross-epic integration architecture establishes clear boundaries and contracts between modular epics while enabling seamless data flow for complex multi-stage workflows. The primary integration point is between Epic 4 (Visual Curation Interface) and Epic 5 (Video Assembly Pipeline).

### Epic 4 to Epic 5 Integration

#### Integration Point: Assembly Trigger

**Story 4.5 (Assembly Trigger) → Epic 5 (Video Assembly Pipeline)**

The `/api/projects/[id]/assemble` endpoint serves as the orchestration point that bridges user-facing curation (Epic 4) with backend video processing (Epic 5).

```typescript
// Integration Flow
Epic 4 (Visual Curation)
    → POST /api/projects/[id]/assemble
    → Epic 5 (Video Assembly Pipeline)
        → Story 5.1 (VideoAssembler - Job Management)
        → Story 5.2 (Trimmer - Scene Preparation)
        → Story 5.3 (Concatenator - Final Assembly)
```

#### Data Contract: AssemblyScene Interface

The AssemblyScene interface defines the data contract between Epic 4 and Epic 5:

```typescript
interface AssemblyScene {
  // Core identifiers
  sceneId: string;
  sceneNumber: number;

  // Content data
  scriptText: string;
  audioFilePath: string;

  // Video selection from Epic 4
  selectedClipId: string;
  videoId: string;
  clipDuration: number;

  // Path fields populated during processing
  defaultSegmentPath?: string;  // Downloaded YouTube video
  video_path: string;           // Alias for compatibility

  // Legacy aliases for backward compatibility
  scene_number: number;         // Alias for sceneNumber
  script_text?: string;         // Alias for scriptText
  audio_path: string;           // Alias for audioFilePath
  duration: number;             // Alias for clipDuration
}
```

### Async Job Processing Pattern

The integration implements an asynchronous job processing pattern with progress tracking:

#### Job Lifecycle

```typescript
type AssemblyJobStatus = 'pending' | 'processing' | 'complete' | 'error';

type AssemblyStage =
  | 'initializing'
  | 'downloading'    // Added for YouTube downloads
  | 'trimming'
  | 'concatenating'
  | 'audio_overlay'
  | 'thumbnail'
  | 'finalizing';
```

#### Progress Tracking

```typescript
// Job progress update flow
assembleVideo(projectId) {
  const jobId = videoAssembler.createJob(projectId, sceneCount);

  // Async execution with progress updates
  (async () => {
    videoAssembler.updateJobProgress(jobId, 5, 'downloading');
    // Download YouTube videos...

    videoAssembler.updateJobProgress(jobId, 20, 'trimming');
    // Trim scenes to audio duration...

    videoAssembler.updateJobProgress(jobId, 50, 'concatenating');
    // Concatenate scenes...

    videoAssembler.updateJobProgress(jobId, 80, 'audio_overlay');
    // Overlay audio tracks...

    videoAssembler.completeJob(jobId);
  })();

  return { jobId, status: 'processing' };
}
```

### YouTube Download Integration

A critical integration point added during implementation is the YouTube download stage, which wasn't originally in Epic 5:

```typescript
// Download stage integration
const downloadPath = path.join('.cache', 'videos', projectId, `scene-${sceneNumber}-source.mp4`);

const downloadResult = await downloadWithRetry({
  videoId: scene.videoId,
  segmentDuration: scene.clipDuration + 5,  // Buffer for trimming
  outputPath: downloadPath,
  maxHeight: 720
});

// Path validation for security
function sanitizeOutputPath(outputPath: string, projectId: string): string {
  const basePath = path.resolve('.cache', 'videos', projectId);
  const resolvedPath = path.resolve(outputPath);

  if (!resolvedPath.startsWith(basePath)) {
    throw new Error('Path traversal detected');
  }

  return resolvedPath;
}
```

### Database Migration Strategy

Cross-epic integrations may require database schema updates:

```sql
-- Migration 009: Add downloading stage
ALTER TABLE assembly_jobs
  MODIFY COLUMN current_stage
  CHECK(current_stage IN (
    'initializing', 'downloading', 'trimming',
    'concatenating', 'audio_overlay', 'thumbnail', 'finalizing'
  ));
```

### Error Handling & Recovery

The integration implements a cascading error handling pattern:

```typescript
// Error classification
interface DownloadError {
  error: string;
  retryable: boolean;  // Network errors vs permanent failures
}

// Retry strategy with exponential backoff
const retryOptions = {
  maxRetries: 3,
  baseDelay: 1000,  // 1s, 2s, 4s
  maxDelay: 8000
};

// Error propagation
try {
  const result = await downloadWithRetry(options, retryOptions);
  if (!result.success) {
    await videoAssembler.failJob(jobId, result.error);
  }
} catch (error) {
  await videoAssembler.failJob(jobId, 'Unknown error');
}
```

### Integration Testing Requirements

Cross-epic integration requires specialized testing strategies:

#### Integration Test Boundaries

```typescript
describe('Epic 4-5 Integration', () => {
  it('should complete full pipeline from clip selection to video output', async () => {
    // 1. Setup: Create project with scenes and selections
    const projectId = await createProject();
    await generateScenes(projectId);
    await selectClips(projectId);

    // 2. Trigger assembly
    const response = await fetch(`/api/projects/${projectId}/assemble`, {
      method: 'POST'
    });
    const { jobId } = await response.json();

    // 3. Wait for completion
    await waitForJobCompletion(jobId);

    // 4. Verify output
    const outputPath = `public/videos/${projectId}/final.mp4`;
    expect(fs.existsSync(outputPath)).toBe(true);

    // 5. Verify video properties
    const metadata = await getVideoMetadata(outputPath);
    expect(metadata.duration).toBeCloseTo(expectedDuration, 1);
  });
});
```

#### Test Data Requirements

```typescript
// Integration tests require:
- YouTube video IDs that are stable and available
- Pre-generated audio files matching expected durations
- Database migrations applied before test runs
- FFmpeg and yt-dlp available in test environment
```

### Performance Considerations

#### Pipeline Optimization

- **Parallel Downloads**: Download multiple YouTube videos concurrently
- **Stream Processing**: Process videos as streams when possible
- **Temp File Management**: Clean up intermediate files after each stage
- **Progress Granularity**: Balance update frequency with database writes

#### Resource Management

```typescript
// Temp directory management
const tempDir = videoAssembler.getTempDir(jobId);
try {
  // Process videos...
} finally {
  await videoAssembler.cleanupTempDir(tempDir);
}
```

### Future Integration Points

#### Planned Integrations

1. **Epic 6 → Epic 5**: Post-processing effects integration
2. **Epic 4 → Analytics**: Clip selection telemetry
3. **Epic 5 → CDN**: Final video distribution
4. **Epic 2 → Epic 5**: Direct audio file handoff optimization

#### Integration Principles

- **Loose Coupling**: Epics communicate via well-defined APIs
- **Data Contracts**: Interfaces versioned and backward compatible
- **Async by Default**: Long-running operations use job queue pattern
- **Error Recovery**: All integrations support retry and rollback
- **Observability**: Integration points emit structured logs and metrics

---

## Feature 2.7: Channel Intelligence & RAG Architecture

**PRD Reference:** Feature 2.7 - Channel Intelligence & Content Research (RAG-Powered)

### Overview

A VidIQ-style intelligence system that syncs with YouTube channels, analyzes competitors, monitors trends, and generates scripts informed by the user's niche and style. Uses RAG (Retrieval-Augmented Generation) to give the LLM full context of channel content, competitor videos, and trending topics.

### Architecture Pattern: Retrieval-Augmented Generation (RAG)

```
┌─────────────────────────────────────────────────────────────────┐
│                     RAG Pipeline Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   YouTube    │    │  News Sites  │    │   YouTube    │       │
│  │   Channels   │    │  (Military)  │    │   Trends     │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Data Ingestion Layer                    │        │
│  │  - youtube-transcript-api (captions)                 │        │
│  │  - YouTube Data API (metadata)                       │        │
│  │  - Web scraping (news headlines)                     │        │
│  └──────────────────────┬──────────────────────────────┘        │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Embedding Generation                    │        │
│  │  - all-MiniLM-L6-v2 (local, FOSS)                   │        │
│  │  - sentence-transformers library                     │        │
│  │  - 384-dimensional vectors                           │        │
│  └──────────────────────┬──────────────────────────────┘        │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Vector Storage (ChromaDB)               │        │
│  │  - Local SQLite + DuckDB backend                    │        │
│  │  - Collections: channels, videos, news              │        │
│  │  - Metadata filtering for retrieval                 │        │
│  └──────────────────────┬──────────────────────────────┘        │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              RAG Retrieval Layer                     │        │
│  │  - Semantic similarity search                        │        │
│  │  - Metadata filtering (date, source, niche)         │        │
│  │  - Top-K retrieval with relevance scoring           │        │
│  └──────────────────────┬──────────────────────────────┘        │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              LLM Context Augmentation                │        │
│  │  - Retrieved docs injected into prompt              │        │
│  │  - Ollama/Gemini generates informed response        │        │
│  │  - Script generation with channel awareness         │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Operating Modes

#### Mode 1: Established Channel
User connects their existing YouTube channel. System syncs content and learns their style.

```typescript
// lib/rag/modes/established-channel.ts
interface EstablishedChannelConfig {
  channelId: string;           // User's YouTube channel ID
  syncFrequency: 'daily';      // Daily sync via cron job
  competitorChannels: string[]; // Up to 5 competitor channel IDs
  trackTrends: boolean;        // Monitor YouTube trends in niche
  newsEnabled: boolean;        // Fetch news from configured sources
}

async function initializeEstablishedChannel(config: EstablishedChannelConfig): Promise<void> {
  // 1. Fetch channel metadata via YouTube Data API
  const channelMeta = await fetchChannelMetadata(config.channelId);

  // 2. Scrape auto-captions for all videos
  const transcripts = await scrapeChannelTranscripts(config.channelId);

  // 3. Generate embeddings and store in ChromaDB
  await embedAndStore(transcripts, { source: 'user_channel', channelId: config.channelId });

  // 4. Index competitors if specified
  for (const competitorId of config.competitorChannels) {
    await indexCompetitorChannel(competitorId);
  }

  // 5. Schedule daily sync job
  scheduleChannelSync(config);
}
```

#### Mode 2: Cold Start (New Channel)
User declares their niche. System indexes top channels in that niche to learn successful patterns.

```typescript
// lib/rag/modes/cold-start.ts
interface ColdStartConfig {
  niche: string;               // e.g., "military", "gaming", "cooking"
  nicheKeywords: string[];     // Additional keywords for YouTube search
  autoSelectTopChannels: boolean; // Auto-select top 5 channels in niche
  manualChannels?: string[];   // Or user specifies channels
}

async function initializeColdStart(config: ColdStartConfig): Promise<void> {
  let channelIds: string[];

  if (config.autoSelectTopChannels) {
    // 1. Search YouTube for top channels in niche
    channelIds = await findTopChannelsInNiche(config.niche, config.nicheKeywords);
  } else {
    channelIds = config.manualChannels || [];
  }

  // 2. Index each channel's content
  for (const channelId of channelIds.slice(0, 5)) {
    await indexCompetitorChannel(channelId);
  }

  // 3. Load niche-specific news sources (e.g., military news for military niche)
  const newsSources = getNicheNewsSources(config.niche);
  await initializeNewsSources(newsSources);

  // 4. Schedule daily sync
  scheduleColdStartSync(config);
}
```

### Data Ingestion Components

#### YouTube Caption Scraping

```typescript
// lib/rag/ingestion/youtube-captions.ts
import { spawn } from 'child_process';

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface VideoTranscript {
  videoId: string;
  title: string;
  description: string;
  transcript: TranscriptSegment[];
  fullText: string;          // Concatenated transcript
  publishedAt: string;
  channelId: string;
}

/**
 * Scrape auto-captions using youtube-transcript-api (Python)
 */
async function scrapeVideoTranscript(videoId: string): Promise<VideoTranscript | null> {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [
      '-c',
      `
from youtube_transcript_api import YouTubeTranscriptApi
import json

try:
    transcript = YouTubeTranscriptApi.get_transcript('${videoId}')
    print(json.dumps(transcript))
except Exception as e:
    print(json.dumps({"error": str(e)}))
      `
    ]);

    let output = '';
    python.stdout.on('data', (data) => { output += data.toString(); });
    python.on('close', (code) => {
      try {
        const result = JSON.parse(output);
        if (result.error) {
          resolve(null); // No transcript available
        } else {
          resolve({
            videoId,
            transcript: result,
            fullText: result.map((s: TranscriptSegment) => s.text).join(' ')
          } as VideoTranscript);
        }
      } catch {
        resolve(null);
      }
    });
  });
}

/**
 * Scrape all videos from a channel
 */
async function scrapeChannelTranscripts(
  channelId: string,
  limit: number = 50
): Promise<VideoTranscript[]> {
  // 1. Get list of video IDs from channel via YouTube Data API
  const videoIds = await getChannelVideoIds(channelId, limit);

  // 2. Scrape each video's transcript (with rate limiting)
  const transcripts: VideoTranscript[] = [];
  for (const videoId of videoIds) {
    const transcript = await scrapeVideoTranscript(videoId);
    if (transcript) {
      transcripts.push(transcript);
    }
    await sleep(500); // Rate limit: 2 requests/second
  }

  return transcripts;
}
```

#### News Source Ingestion

```typescript
// lib/rag/ingestion/news-sources.ts

interface NewsSource {
  id: string;
  name: string;
  url: string;
  niche: string;
  fetchMethod: 'rss' | 'scrape';
  selectors?: {
    headline: string;
    summary: string;
    link: string;
  };
}

// Pre-configured military news sources (PRD Feature 2.7)
export const MILITARY_NEWS_SOURCES: NewsSource[] = [
  {
    id: 'the_war_zone',
    name: 'The War Zone',
    url: 'https://www.thedrive.com/the-war-zone',
    niche: 'military',
    fetchMethod: 'rss'
  },
  {
    id: 'military_com',
    name: 'Military.com',
    url: 'https://www.military.com/daily-news',
    niche: 'military',
    fetchMethod: 'rss'
  },
  {
    id: 'defense_news',
    name: 'Defense News',
    url: 'https://www.defensenews.com/',
    niche: 'military',
    fetchMethod: 'rss'
  },
  {
    id: 'breaking_defense',
    name: 'Breaking Defense',
    url: 'https://breakingdefense.com/',
    niche: 'military',
    fetchMethod: 'rss'
  },
  {
    id: 'defense_one',
    name: 'Defense One',
    url: 'https://www.defenseone.com/',
    niche: 'military',
    fetchMethod: 'rss'
  },
  {
    id: 'military_times',
    name: 'Military Times',
    url: 'https://www.militarytimes.com/',
    niche: 'military',
    fetchMethod: 'rss'
  },
  {
    id: 'janes',
    name: 'Janes',
    url: 'https://www.janes.com/osint-insights/defence-news',
    niche: 'military',
    fetchMethod: 'rss'
  }
];

interface NewsArticle {
  id: string;
  sourceId: string;
  headline: string;
  summary: string;
  url: string;
  publishedAt: string;
  niche: string;
}

async function fetchNewsFromSource(source: NewsSource): Promise<NewsArticle[]> {
  if (source.fetchMethod === 'rss') {
    return await fetchRSSFeed(source);
  } else {
    return await scrapeNewsPage(source);
  }
}

async function fetchAllNicheNews(niche: string): Promise<NewsArticle[]> {
  const sources = getNicheNewsSources(niche);
  const allArticles: NewsArticle[] = [];

  for (const source of sources) {
    try {
      const articles = await fetchNewsFromSource(source);
      allArticles.push(...articles);
    } catch (error) {
      console.warn(`Failed to fetch from ${source.name}:`, error);
    }
  }

  return allArticles;
}
```

### Vector Database Integration

```typescript
// lib/rag/vector-db/chroma-client.ts
import { ChromaClient, Collection } from 'chromadb';

const CHROMA_PATH = '.cache/chroma';

class RAGVectorStore {
  private client: ChromaClient;
  private collections: Map<string, Collection> = new Map();

  async initialize(): Promise<void> {
    this.client = new ChromaClient({ path: CHROMA_PATH });

    // Create collections
    this.collections.set('channels', await this.client.getOrCreateCollection({
      name: 'channel_content',
      metadata: { 'hnsw:space': 'cosine' }
    }));

    this.collections.set('news', await this.client.getOrCreateCollection({
      name: 'news_articles',
      metadata: { 'hnsw:space': 'cosine' }
    }));

    this.collections.set('trends', await this.client.getOrCreateCollection({
      name: 'trending_topics',
      metadata: { 'hnsw:space': 'cosine' }
    }));
  }

  async addVideoContent(video: VideoTranscript, embedding: number[]): Promise<void> {
    const collection = this.collections.get('channels')!;

    await collection.add({
      ids: [video.videoId],
      embeddings: [embedding],
      metadatas: [{
        channelId: video.channelId,
        title: video.title,
        publishedAt: video.publishedAt,
        type: 'video_transcript'
      }],
      documents: [video.fullText]
    });
  }

  async addNewsArticle(article: NewsArticle, embedding: number[]): Promise<void> {
    const collection = this.collections.get('news')!;

    await collection.add({
      ids: [article.id],
      embeddings: [embedding],
      metadatas: [{
        sourceId: article.sourceId,
        niche: article.niche,
        publishedAt: article.publishedAt,
        url: article.url
      }],
      documents: [`${article.headline}\n\n${article.summary}`]
    });
  }

  async queryRelevantContent(
    queryEmbedding: number[],
    options: {
      collection: 'channels' | 'news' | 'trends';
      niche?: string;
      channelId?: string;
      limit?: number;
      minDate?: string;
    }
  ): Promise<QueryResult[]> {
    const collection = this.collections.get(options.collection)!;

    const whereFilter: Record<string, any> = {};
    if (options.niche) whereFilter.niche = options.niche;
    if (options.channelId) whereFilter.channelId = options.channelId;

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: options.limit || 10,
      where: Object.keys(whereFilter).length > 0 ? whereFilter : undefined
    });

    return results.documents[0].map((doc, idx) => ({
      document: doc,
      metadata: results.metadatas[0][idx],
      distance: results.distances?.[0]?.[idx] || 0
    }));
  }
}

export const vectorStore = new RAGVectorStore();
```

### Embedding Generation

```typescript
// lib/rag/embeddings/local-embeddings.ts
import { spawn } from 'child_process';

/**
 * Generate embeddings using sentence-transformers (Python)
 * Model: all-MiniLM-L6-v2 (384 dimensions, ~80MB)
 */
async function generateEmbedding(text: string): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [
      '-c',
      `
from sentence_transformers import SentenceTransformer
import json
import sys

model = SentenceTransformer('all-MiniLM-L6-v2')
text = '''${text.replace(/'/g, "\\'")}'''
embedding = model.encode(text).tolist()
print(json.dumps(embedding))
      `
    ]);

    let output = '';
    python.stdout.on('data', (data) => { output += data.toString(); });
    python.stderr.on('data', (data) => { console.error(data.toString()); });
    python.on('close', (code) => {
      if (code === 0) {
        resolve(JSON.parse(output));
      } else {
        reject(new Error(`Embedding generation failed with code ${code}`));
      }
    });
  });
}

/**
 * Batch embedding for efficiency
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // For large batches, use Python batch processing
  return new Promise((resolve, reject) => {
    const python = spawn('python', [
      '-c',
      `
from sentence_transformers import SentenceTransformer
import json
import sys

model = SentenceTransformer('all-MiniLM-L6-v2')
texts = json.loads('''${JSON.stringify(texts)}''')
embeddings = model.encode(texts).tolist()
print(json.dumps(embeddings))
      `
    ]);

    let output = '';
    python.stdout.on('data', (data) => { output += data.toString(); });
    python.on('close', (code) => {
      if (code === 0) {
        resolve(JSON.parse(output));
      } else {
        reject(new Error('Batch embedding failed'));
      }
    });
  });
}
```

### RAG-Augmented Script Generation

```typescript
// lib/rag/generation/rag-script-generator.ts
import { vectorStore } from '../vector-db/chroma-client';
import { generateEmbedding } from '../embeddings/local-embeddings';
import { getLLMProvider } from '@/lib/llm/factory';
import { getProjectPersona } from '@/lib/db/queries';

interface RAGContext {
  channelContent: string[];    // Relevant videos from user's channel
  competitorContent: string[]; // What competitors are doing
  newsArticles: string[];      // Recent news in niche
  trendingTopics: string[];    // Current YouTube trends
}

async function retrieveRAGContext(
  topic: string,
  projectId: string
): Promise<RAGContext> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(topic);

  // Get project's RAG configuration
  const ragConfig = await getProjectRAGConfig(projectId);

  // Query each collection
  const [channelResults, competitorResults, newsResults, trendResults] = await Promise.all([
    vectorStore.queryRelevantContent(queryEmbedding, {
      collection: 'channels',
      channelId: ragConfig.userChannelId,
      limit: 5
    }),
    vectorStore.queryRelevantContent(queryEmbedding, {
      collection: 'channels',
      // Exclude user's channel, get competitors only
      limit: 5
    }),
    vectorStore.queryRelevantContent(queryEmbedding, {
      collection: 'news',
      niche: ragConfig.niche,
      limit: 5,
      minDate: getDateDaysAgo(7) // Last 7 days
    }),
    vectorStore.queryRelevantContent(queryEmbedding, {
      collection: 'trends',
      limit: 3
    })
  ]);

  return {
    channelContent: channelResults.map(r => r.document),
    competitorContent: competitorResults.map(r => r.document),
    newsArticles: newsResults.map(r => r.document),
    trendingTopics: trendResults.map(r => r.document)
  };
}

async function generateRAGAugmentedScript(
  topic: string,
  projectId: string
): Promise<Script> {
  // 1. Retrieve relevant context
  const context = await retrieveRAGContext(topic, projectId);

  // 2. Build augmented prompt
  const augmentedPrompt = buildRAGPrompt(topic, context);

  // 3. Get project's persona
  const personaPrompt = getProjectPersona(projectId);

  // 4. Generate script with full context
  const llm = getLLMProvider();
  const response = await llm.chat([
    { role: 'user', content: augmentedPrompt }
  ], personaPrompt);

  return parseScriptResponse(response);
}

function buildRAGPrompt(topic: string, context: RAGContext): string {
  return `Generate a video script about: "${topic}"

## Your Channel's Style & Previous Content
${context.channelContent.length > 0
  ? context.channelContent.map((c, i) => `[Video ${i+1}]: ${c.substring(0, 500)}...`).join('\n\n')
  : '(New channel - no previous content)'}

## What Competitors Are Doing
${context.competitorContent.map((c, i) => `[Competitor ${i+1}]: ${c.substring(0, 300)}...`).join('\n\n')}

## Recent News in Your Niche
${context.newsArticles.map((a, i) => `[News ${i+1}]: ${a}`).join('\n\n')}

## Current Trending Topics
${context.trendingTopics.join('\n')}

---

Based on the above context:
1. Match your channel's established tone and style (if available)
2. Differentiate from competitors while learning from their successful patterns
3. Incorporate relevant current events and news angles
4. Leverage trending topics where naturally relevant

Generate a structured video script with numbered scenes.`;
}
```

### API Endpoints

```typescript
// app/api/rag/setup/route.ts
export async function POST(req: Request) {
  const { projectId, mode, config } = await req.json();

  if (mode === 'established') {
    await initializeEstablishedChannel(config);
  } else if (mode === 'cold_start') {
    await initializeColdStart(config);
  }

  // Update project with RAG config
  db.prepare(`
    UPDATE projects
    SET rag_enabled = true, rag_config = ?
    WHERE id = ?
  `).run(JSON.stringify(config), projectId);

  return Response.json({ success: true });
}

// app/api/rag/sync/route.ts
export async function POST(req: Request) {
  const { projectId } = await req.json();

  // Trigger manual sync
  await syncProjectRAGData(projectId);

  return Response.json({ success: true });
}

// app/api/rag/status/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  const status = db.prepare(`
    SELECT
      rag_enabled,
      rag_config,
      rag_last_sync,
      (SELECT COUNT(*) FROM rag_sync_jobs WHERE project_id = ? AND status = 'pending') as pending_jobs
    FROM projects WHERE id = ?
  `).get(projectId, projectId);

  return Response.json({ success: true, data: status });
}
```

### Project Structure Extension

```
lib/
├── rag/                           # RAG system (Feature 2.7)
│   ├── index.ts                   # Main exports
│   ├── modes/
│   │   ├── established-channel.ts # Existing channel sync
│   │   └── cold-start.ts          # New channel niche learning
│   ├── ingestion/
│   │   ├── youtube-captions.ts    # Caption scraping
│   │   ├── youtube-metadata.ts    # Channel/video metadata
│   │   ├── news-sources.ts        # News RSS/scraping
│   │   └── trends.ts              # YouTube trends
│   ├── embeddings/
│   │   ├── local-embeddings.ts    # sentence-transformers
│   │   └── gemini-embeddings.ts   # Optional cloud embeddings
│   ├── vector-db/
│   │   ├── chroma-client.ts       # ChromaDB wrapper
│   │   └── collections.ts         # Collection schemas
│   ├── retrieval/
│   │   ├── semantic-search.ts     # Similarity search
│   │   └── filters.ts             # Metadata filtering
│   └── generation/
│       ├── rag-script-generator.ts # RAG-augmented generation
│       └── topic-suggestions.ts    # AI topic recommendations
```

### Environment Variables

```bash
# .env.local - RAG Configuration (Feature 2.7)

# ============================================
# RAG System Configuration
# ============================================
RAG_ENABLED=true
RAG_SYNC_SCHEDULE="0 6 * * *"  # Daily at 6 AM (cron format)

# Vector Database
CHROMA_PATH=.cache/chroma
CHROMA_COLLECTION_PREFIX=aivideogen

# Embeddings (local by default)
EMBEDDING_PROVIDER=local  # local | gemini
EMBEDDING_MODEL=all-MiniLM-L6-v2

# YouTube API (shared with Epic 3)
# YOUTUBE_API_KEY already configured

# News Scraping
NEWS_FETCH_ENABLED=true
NEWS_MAX_ARTICLES_PER_SOURCE=20
```

---

## Background Job Queue Architecture

**Purpose:** Execute scheduled and long-running tasks outside the HTTP request lifecycle.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Background Job Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Cron Jobs   │    │  API Trigger │    │  Event-Based │       │
│  │  (Scheduled) │    │  (Manual)    │    │  (On-Demand) │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         └───────────────────┼───────────────────┘                │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────┐        │
│  │                   Job Queue                          │        │
│  │  - SQLite-backed (jobs table)                       │        │
│  │  - Priority levels (high, normal, low)              │        │
│  │  - Retry logic with exponential backoff             │        │
│  └──────────────────────┬──────────────────────────────┘        │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │                  Job Processor                       │        │
│  │  - Concurrent execution (configurable limit)        │        │
│  │  - Job-type handlers                                │        │
│  │  - Progress tracking                                │        │
│  │  - Error isolation                                  │        │
│  └──────────────────────┬──────────────────────────────┘        │
│                         │                                        │
│  ┌──────────────────────┼──────────────────────────────┐        │
│  │                Job Type Handlers                     │        │
│  │                                                      │        │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │        │
│  │  │ RAG Sync    │  │ Video       │  │ News        │  │        │
│  │  │ Channel     │  │ Assembly    │  │ Fetch       │  │        │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │        │
│  │                                                      │        │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │        │
│  │  │ Embedding   │  │ CV Analysis │  │ Cleanup     │  │        │
│  │  │ Generation  │  │ (Batch)     │  │ (Cache)     │  │        │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │        │
│  │                                                      │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Background jobs table (Migration 013)
CREATE TABLE background_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,           -- 'rag_sync', 'video_assembly', 'news_fetch', 'embedding_gen', 'cv_batch', 'cache_cleanup'
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  priority INTEGER DEFAULT 5,   -- 1 (highest) to 10 (lowest)
  payload TEXT,                 -- JSON job-specific data
  result TEXT,                  -- JSON result or error
  progress INTEGER DEFAULT 0,   -- 0-100
  attempt INTEGER DEFAULT 0,    -- Current attempt number
  max_attempts INTEGER DEFAULT 3,
  project_id TEXT,              -- Optional project association
  scheduled_for TEXT,           -- When to run (NULL = immediate)
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_jobs_status ON background_jobs(status);
CREATE INDEX idx_jobs_type ON background_jobs(type);
CREATE INDEX idx_jobs_scheduled ON background_jobs(scheduled_for);
CREATE INDEX idx_jobs_project ON background_jobs(project_id);

-- Cron schedules table
CREATE TABLE cron_schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL,
  cron_expression TEXT NOT NULL, -- e.g., "0 6 * * *" (daily at 6 AM)
  payload TEXT,                  -- Default payload for scheduled jobs
  enabled BOOLEAN DEFAULT true,
  last_run TEXT,
  next_run TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Job Queue Implementation

```typescript
// lib/jobs/queue.ts
import db from '@/lib/db/client';
import { randomUUID } from 'crypto';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: number;
  payload: any;
  result?: any;
  progress: number;
  attempt: number;
  maxAttempts: number;
  projectId?: string;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
}

export type JobType =
  | 'rag_sync_channel'
  | 'rag_sync_news'
  | 'rag_sync_trends'
  | 'embedding_generation'
  | 'video_assembly'
  | 'cv_batch_analysis'
  | 'cache_cleanup';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export class JobQueue {
  /**
   * Add a new job to the queue
   */
  async enqueue(
    type: JobType,
    payload: any,
    options: {
      priority?: number;
      projectId?: string;
      scheduledFor?: Date;
      maxAttempts?: number;
    } = {}
  ): Promise<string> {
    const id = randomUUID();

    db.prepare(`
      INSERT INTO background_jobs (id, type, payload, priority, project_id, scheduled_for, max_attempts)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      type,
      JSON.stringify(payload),
      options.priority || 5,
      options.projectId || null,
      options.scheduledFor?.toISOString() || null,
      options.maxAttempts || 3
    );

    return id;
  }

  /**
   * Get next job to process
   */
  async dequeue(): Promise<Job | null> {
    const now = new Date().toISOString();

    const job = db.prepare(`
      SELECT * FROM background_jobs
      WHERE status = 'pending'
        AND (scheduled_for IS NULL OR scheduled_for <= ?)
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
    `).get(now) as any;

    if (!job) return null;

    // Mark as running
    db.prepare(`
      UPDATE background_jobs
      SET status = 'running', started_at = ?, attempt = attempt + 1, updated_at = ?
      WHERE id = ?
    `).run(now, now, job.id);

    return {
      ...job,
      payload: JSON.parse(job.payload || '{}'),
      result: job.result ? JSON.parse(job.result) : undefined
    };
  }

  /**
   * Mark job as completed
   */
  async complete(jobId: string, result?: any): Promise<void> {
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE background_jobs
      SET status = 'completed', result = ?, progress = 100, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      result ? JSON.stringify(result) : null,
      now,
      now,
      jobId
    );
  }

  /**
   * Mark job as failed (with retry logic)
   */
  async fail(jobId: string, error: Error): Promise<void> {
    const now = new Date().toISOString();

    const job = db.prepare('SELECT attempt, max_attempts FROM background_jobs WHERE id = ?').get(jobId) as any;

    if (job.attempt < job.max_attempts) {
      // Schedule retry with exponential backoff
      const backoffMs = Math.pow(2, job.attempt) * 1000; // 2s, 4s, 8s...
      const retryAt = new Date(Date.now() + backoffMs).toISOString();

      db.prepare(`
        UPDATE background_jobs
        SET status = 'pending', scheduled_for = ?, result = ?, updated_at = ?
        WHERE id = ?
      `).run(retryAt, JSON.stringify({ error: error.message }), now, jobId);
    } else {
      // Max attempts reached, mark as failed
      db.prepare(`
        UPDATE background_jobs
        SET status = 'failed', result = ?, completed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify({ error: error.message }), now, now, jobId);
    }
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number): Promise<void> {
    db.prepare(`
      UPDATE background_jobs
      SET progress = ?, updated_at = ?
      WHERE id = ?
    `).run(progress, new Date().toISOString(), jobId);
  }
}

export const jobQueue = new JobQueue();
```

### Job Processor

```typescript
// lib/jobs/processor.ts
import { jobQueue, Job, JobType } from './queue';
import { ragSyncChannelHandler } from './handlers/rag-sync';
import { videoAssemblyHandler } from './handlers/video-assembly';
import { newsFetchHandler } from './handlers/news-fetch';
import { embeddingHandler } from './handlers/embedding';
import { cacheCleanupHandler } from './handlers/cleanup';

type JobHandler = (job: Job) => Promise<any>;

const handlers: Record<JobType, JobHandler> = {
  rag_sync_channel: ragSyncChannelHandler,
  rag_sync_news: newsFetchHandler,
  rag_sync_trends: ragSyncChannelHandler, // Reuse with different payload
  embedding_generation: embeddingHandler,
  video_assembly: videoAssemblyHandler,
  cv_batch_analysis: cvBatchHandler,
  cache_cleanup: cacheCleanupHandler
};

export class JobProcessor {
  private running = false;
  private concurrency: number;
  private activeJobs = 0;

  constructor(concurrency: number = 2) {
    this.concurrency = concurrency;
  }

  async start(): Promise<void> {
    this.running = true;
    console.log(`Job processor started (concurrency: ${this.concurrency})`);

    while (this.running) {
      if (this.activeJobs < this.concurrency) {
        const job = await jobQueue.dequeue();
        if (job) {
          this.processJob(job);
        }
      }

      // Poll interval
      await sleep(1000);
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    // Wait for active jobs to complete
    while (this.activeJobs > 0) {
      await sleep(100);
    }
    console.log('Job processor stopped');
  }

  private async processJob(job: Job): Promise<void> {
    this.activeJobs++;

    try {
      const handler = handlers[job.type];
      if (!handler) {
        throw new Error(`Unknown job type: ${job.type}`);
      }

      console.log(`Processing job ${job.id} (${job.type})`);
      const result = await handler(job);
      await jobQueue.complete(job.id, result);
      console.log(`Job ${job.id} completed`);
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      await jobQueue.fail(job.id, error as Error);
    } finally {
      this.activeJobs--;
    }
  }
}
```

### Cron Scheduler

```typescript
// lib/jobs/scheduler.ts
import cron from 'node-cron';
import db from '@/lib/db/client';
import { jobQueue, JobType } from './queue';

interface CronSchedule {
  id: string;
  name: string;
  jobType: JobType;
  cronExpression: string;
  payload: any;
  enabled: boolean;
}

export class CronScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  async initialize(): Promise<void> {
    // Load schedules from database
    const schedules = db.prepare(`
      SELECT * FROM cron_schedules WHERE enabled = true
    `).all() as any[];

    for (const schedule of schedules) {
      this.scheduleJob(schedule);
    }

    console.log(`Cron scheduler initialized with ${schedules.length} jobs`);
  }

  private scheduleJob(schedule: CronSchedule): void {
    const task = cron.schedule(schedule.cronExpression, async () => {
      console.log(`Cron trigger: ${schedule.name}`);

      // Enqueue job
      await jobQueue.enqueue(
        schedule.jobType as JobType,
        JSON.parse(schedule.payload || '{}'),
        { priority: 3 } // Scheduled jobs get higher priority
      );

      // Update last_run
      db.prepare(`
        UPDATE cron_schedules SET last_run = ? WHERE id = ?
      `).run(new Date().toISOString(), schedule.id);
    });

    this.tasks.set(schedule.id, task);
  }

  /**
   * Register default cron schedules (run once on startup)
   */
  async registerDefaults(): Promise<void> {
    const defaults: Partial<CronSchedule>[] = [
      {
        name: 'Daily RAG Channel Sync',
        jobType: 'rag_sync_channel',
        cronExpression: '0 6 * * *', // Daily at 6 AM
        payload: '{}'
      },
      {
        name: 'Daily News Fetch',
        jobType: 'rag_sync_news',
        cronExpression: '0 */4 * * *', // Every 4 hours
        payload: '{}'
      },
      {
        name: 'Weekly Cache Cleanup',
        jobType: 'cache_cleanup',
        cronExpression: '0 3 * * 0', // Sunday at 3 AM
        payload: '{"maxAgeDays": 30}'
      }
    ];

    for (const def of defaults) {
      const existing = db.prepare(
        'SELECT id FROM cron_schedules WHERE name = ?'
      ).get(def.name);

      if (!existing) {
        db.prepare(`
          INSERT INTO cron_schedules (id, name, job_type, cron_expression, payload)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          def.name,
          def.jobType,
          def.cronExpression,
          def.payload
        );
      }
    }
  }

  stop(): void {
    for (const task of this.tasks.values()) {
      task.stop();
    }
    this.tasks.clear();
  }
}

export const cronScheduler = new CronScheduler();
```

### Job Handlers

```typescript
// lib/jobs/handlers/rag-sync.ts
import { Job } from '../queue';
import { jobQueue } from '../queue';
import { scrapeChannelTranscripts } from '@/lib/rag/ingestion/youtube-captions';
import { generateEmbeddings } from '@/lib/rag/embeddings/local-embeddings';
import { vectorStore } from '@/lib/rag/vector-db/chroma-client';

export async function ragSyncChannelHandler(job: Job): Promise<any> {
  const { channelId, projectId } = job.payload;

  // 1. Fetch new videos since last sync
  await jobQueue.updateProgress(job.id, 10);
  const newVideos = await getNewVideosSinceLastSync(channelId);

  if (newVideos.length === 0) {
    return { synced: 0, message: 'No new videos' };
  }

  // 2. Scrape transcripts
  await jobQueue.updateProgress(job.id, 30);
  const transcripts = await scrapeChannelTranscripts(channelId, newVideos);

  // 3. Generate embeddings
  await jobQueue.updateProgress(job.id, 60);
  const texts = transcripts.map(t => t.fullText);
  const embeddings = await generateEmbeddings(texts);

  // 4. Store in vector DB
  await jobQueue.updateProgress(job.id, 80);
  for (let i = 0; i < transcripts.length; i++) {
    await vectorStore.addVideoContent(transcripts[i], embeddings[i]);
  }

  // 5. Update last sync timestamp
  await jobQueue.updateProgress(job.id, 100);
  await updateLastSyncTimestamp(projectId, channelId);

  return {
    synced: transcripts.length,
    channelId,
    timestamp: new Date().toISOString()
  };
}

// lib/jobs/handlers/news-fetch.ts
export async function newsFetchHandler(job: Job): Promise<any> {
  const { niche, sourceIds } = job.payload;

  // 1. Get news sources for niche
  const sources = sourceIds
    ? getSourcesByIds(sourceIds)
    : getNicheNewsSources(niche);

  let totalArticles = 0;

  // 2. Fetch from each source
  for (let i = 0; i < sources.length; i++) {
    await jobQueue.updateProgress(job.id, Math.round((i / sources.length) * 80));

    try {
      const articles = await fetchNewsFromSource(sources[i]);

      // 3. Generate embeddings and store
      const texts = articles.map(a => `${a.headline}\n\n${a.summary}`);
      const embeddings = await generateEmbeddings(texts);

      for (let j = 0; j < articles.length; j++) {
        await vectorStore.addNewsArticle(articles[j], embeddings[j]);
      }

      totalArticles += articles.length;
    } catch (error) {
      console.warn(`Failed to fetch from ${sources[i].name}:`, error);
    }
  }

  return {
    fetched: totalArticles,
    sources: sources.length,
    timestamp: new Date().toISOString()
  };
}
```

### Startup Integration

```typescript
// lib/jobs/init.ts
import { JobProcessor } from './processor';
import { CronScheduler, cronScheduler } from './scheduler';

let processor: JobProcessor | null = null;

export async function initializeJobSystem(): Promise<void> {
  // Only run in main process, not in API routes
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  // Register default cron schedules
  await cronScheduler.registerDefaults();

  // Initialize cron scheduler
  await cronScheduler.initialize();

  // Start job processor
  processor = new JobProcessor(2); // 2 concurrent jobs
  processor.start();

  console.log('Background job system initialized');
}

export async function shutdownJobSystem(): Promise<void> {
  cronScheduler.stop();
  if (processor) {
    await processor.stop();
  }
}

// app/layout.tsx or middleware.ts
// Call initializeJobSystem() on app startup
```

### API Endpoints

```typescript
// app/api/jobs/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status');

  let query = 'SELECT * FROM background_jobs WHERE 1=1';
  const params: any[] = [];

  if (projectId) {
    query += ' AND project_id = ?';
    params.push(projectId);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT 50';

  const jobs = db.prepare(query).all(...params);

  return Response.json({ success: true, data: jobs });
}

// app/api/jobs/[id]/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const job = db.prepare('SELECT * FROM background_jobs WHERE id = ?').get(params.id);

  if (!job) {
    return Response.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  return Response.json({ success: true, data: job });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  // Cancel pending job
  db.prepare(`
    UPDATE background_jobs SET status = 'cancelled' WHERE id = ? AND status = 'pending'
  `).run(params.id);

  return Response.json({ success: true });
}
```

### Environment Variables

```bash
# .env.local - Job System Configuration

# ============================================
# Background Job Configuration
# ============================================
JOB_CONCURRENCY=2              # Max concurrent jobs
JOB_POLL_INTERVAL_MS=1000      # Queue poll interval
JOB_DEFAULT_MAX_ATTEMPTS=3     # Default retry attempts

# Cron Schedule Overrides (optional)
# CRON_RAG_SYNC="0 6 * * *"    # Daily at 6 AM
# CRON_NEWS_FETCH="0 */4 * * *" # Every 4 hours
# CRON_CACHE_CLEANUP="0 3 * * 0" # Weekly Sunday 3 AM
```

---

## Architecture Decision Records

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

## Conclusion

This architecture provides a solid foundation for the AI Video Generator MVP with clear paths for future enhancement. All decisions prioritize FOSS compliance, local-first privacy, and developer experience while maintaining the flexibility to scale to cloud multi-tenant deployment when needed.

The modular design with abstraction layers (LLM provider, state management, API boundaries) ensures that AI agents implementing individual epics will write consistent, compatible code.

**Next Steps:**
1. Execute project initialization commands
2. Implement Epic 1 (Conversational Agent) first
3. Iterate through epics 2-5 sequentially
4. Run validation workflow before Phase 4 implementation

---

**Document Status:** Complete and Ready for Implementation
**Architecture Validated:** 2025-11-28
**Ready for Phase 4:** Yes (Story 3.7b patterns added, Feature 1.9 persona system added)
