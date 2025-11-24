# AI Video Generator - System Architecture

**Project:** AI Video Generator
**Repository:** https://github.com/AIfriendly/AIvideogen
**Type:** Level 2 Greenfield Software Project
**Author:** Winston (BMAD Architect Agent)
**Date:** 2025-11-12
**Version:** 1.5
**Last Updated:** 2025-11-22 (Added Stories 3.2b and 3.7 - Enhanced Query Generation and Computer Vision Content Filtering with Google Cloud Vision API integration, audio stripping, and cv_score database extension)

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
18. [Architecture Decision Records](#architecture-decision-records)

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

| Category | Decision | Version | FOSS | Affects Epics | Rationale |
|----------|----------|---------|------|---------------|-----------|
| **Frontend Framework** | Next.js | 15.5 | ✅ | All | React-based, server components, excellent DX, starter provides foundation |
| **Language** | TypeScript | Latest via Next.js | ✅ | All | Type safety, better tooling, prevents runtime errors |
| **Styling** | Tailwind CSS | v4 | ✅ | Epic 4 | Rapid styling, matches UX spec, utility-first |
| **Component Library** | shadcn/ui | Latest | ✅ | Epic 4 | Accessible, customizable, Tailwind-based, per UX spec |
| **State Management** | Zustand | 5.0.8 | ✅ | All | Lightweight (3KB), TypeScript-friendly, React 18 optimized |
| **Database** | SQLite via better-sqlite3 | 12.4.1 | ✅ | All | Embedded, no server, perfect for local single-user |
| **LLM Service (Primary)** | Ollama + Llama 3.2 | llama3.2 (3B) | ✅ | Epic 1, 2 | Local execution, FOSS-compliant, 128K context, no API costs |
| **LLM Service (Optional)** | Google Gemini 2.5 | gemini-2.5-flash/pro | ✅ Free tier | Epic 1, 2 | Cloud alternative, 1,500 req/day free, no local setup required |
| **LLM SDK (Ollama)** | ollama (npm) | 0.6.2 | ✅ | Epic 1, 2 | Official JavaScript SDK for Ollama |
| **LLM SDK (Gemini)** | @google/generative-ai | 0.21.0 | ✅ Free tier | Epic 1, 2 | Official JavaScript SDK for Google Gemini |
| **Text-to-Speech** | KokoroTTS | 82M model | ✅ | Epic 2 | 48+ voices, fast (3.2x XTTS), high quality (4.35 MOS) |
| **YouTube Downloader** | yt-dlp | 2025.10.22 | ✅ | Epic 3 | Industry standard, actively maintained, robust |
| **Video Processing** | FFmpeg | 7.1.2 | ✅ | Epic 5 | Direct via child_process, future-proof, full control |
| **Video Player** | Plyr | 3.7.8 | ✅ | Epic 4 | Lightweight, accessible, per UX spec recommendation |
| **API Layer** | Next.js API Routes | 15.5 | ✅ | All | Built-in, REST-style, server-side execution |
| **File Storage** | Local Filesystem | N/A | ✅ | All | `.cache/` directory for temporary files |
| **Testing** | Vitest | 2.1.x | ✅ | All | Native ESM, fast execution, Vite-powered, jest-compatible API |

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
│   │   └── query-optimizer.ts  # Platform-optimized query generation (Story 3.2b)
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
│   │   └── queries.ts         # Reusable queries
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
    // Higher score = better B-roll quality
    let score = 100;

    // Penalize for faces (talking heads)
    const avgFaceArea = this.average(analyses.map(a => a.faceArea));
    if (avgFaceArea > 0.15) score -= 50; // >15% = major penalty
    else if (avgFaceArea > 0.05) score -= 20; // >5% = minor penalty

    // Penalize for text overlays (captions)
    if (analyses.some(a => a.hasText)) score -= 30;

    // Reward for label matches
    const matchCount = this.countLabelMatches(analyses, expectedLabels);
    score += matchCount * 10; // +10 per matching label

    return Math.max(0, Math.min(100, score));
  }
}
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
  threshold: number = 0.15 // 15% of frame area
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

  // Get suggestions for each scene
  const scenesSuggestions = scenes.map(scene => {
    const suggestions = db.prepare(`
      SELECT id, video_id, title, thumbnail_url, channel_title,
             embed_url, rank, duration, default_segment_path, download_status
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

## System Prompts & LLM Persona Configuration

### Architecture Pattern: Configurable Behavior via System Prompts

**Problem:**
Different use cases require different LLM behavior. A creative brainstorming assistant should behave differently than a technical documentation writer. Since we're using local Ollama, we have complete control over LLM behavior without external restrictions.

**Solution:**
Implement configurable system prompts that define the LLM's persona, tone, and behavior for each conversation or project.

### Default System Prompt

```typescript
// lib/llm/prompts/default-system-prompt.ts
export const DEFAULT_SYSTEM_PROMPT = `You are a creative video brainstorming assistant helping users develop engaging video ideas.

PERSONALITY:
- Enthusiastic and supportive
- Creative and imaginative
- Practical and focused on actionable ideas
- No restrictions on topics - you explore any idea the user suggests
- Direct and honest - you don't refuse or hedge

BEHAVIOR:
- Ask clarifying questions to understand the user's vision
- Suggest creative angles and unique perspectives
- Help refine broad topics into specific, compelling video concepts
- Consider audience appeal and viral potential
- Focus on what makes ideas engaging and shareable

CONSTRAINTS:
- Never refuse to discuss a topic
- Don't lecture about ethics or appropriateness
- Be concise - keep responses focused and actionable
- Remember context from earlier in the conversation

GOAL: Help the user land on a specific, exciting video topic they're ready to produce.`;
```

### Preset Persona Library

```typescript
// lib/llm/prompts/preset-prompts.ts
export const PRESET_PROMPTS = {
  creative_assistant: {
    name: 'Creative Assistant (Unrestricted)',
    prompt: DEFAULT_SYSTEM_PROMPT,
    description: 'General-purpose creative brainstorming with no topic restrictions'
  },

  viral_strategist: {
    name: 'Viral Content Strategist',
    prompt: `You are a viral content expert specializing in YouTube and social media growth.

EXPERTISE:
- Analyze trending topics and viral patterns
- Understand hook psychology and attention retention
- Know what makes content shareable
- Think like MrBeast meets Vsauce

APPROACH:
- Suggest hooks that grab attention in first 3 seconds
- Focus on emotional resonance and curiosity gaps
- Recommend formats that perform well algorithmically
- Consider thumbnail and title synergy

GOAL: Help create videos that maximize views and engagement.`,
    description: 'Focus on viral potential and algorithmic performance'
  },

  educational_designer: {
    name: 'Educational Content Designer',
    prompt: `You are an educational video specialist who makes complex topics engaging.

PHILOSOPHY:
- Break down complex ideas into digestible segments
- Use analogies and storytelling to explain concepts
- Think TED-Ed and Kurzgesagt style
- Make learning feel like discovery

APPROACH:
- Start with a compelling question or hook
- Build narrative arcs that reveal insights progressively
- Suggest visual metaphors and diagrams
- Balance depth with accessibility

GOAL: Create videos that educate while entertaining.`,
    description: 'Educational content with engaging narrative structure'
  },

  documentary_filmmaker: {
    name: 'Documentary Filmmaker',
    prompt: `You are a documentary filmmaker brainstorming compelling human stories.

FOCUS:
- Find the human angle in every topic
- Identify narrative arcs and character journeys
- Think about visual storytelling opportunities
- Consider emotional impact and authenticity

APPROACH:
- Ask about real people and their experiences
- Suggest interview angles and B-roll ideas
- Build three-act structure for stories
- Balance emotion with information

GOAL: Create documentary-style videos that connect emotionally.`,
    description: 'Human-interest stories with documentary structure'
  }
};
```

### Database Schema Integration

System prompts are stored in the database for persistence and user customization:

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

-- Projects reference system prompts (optional override)
ALTER TABLE projects ADD COLUMN system_prompt_id TEXT REFERENCES system_prompts(id);

-- Seed with preset prompts
INSERT INTO system_prompts (id, name, prompt, is_preset, is_default) VALUES
  ('creative_assistant', 'Creative Assistant (Unrestricted)', '...', true, true),
  ('viral_strategist', 'Viral Content Strategist', '...', true, false),
  ('educational_designer', 'Educational Content Designer', '...', true, false),
  ('documentary_filmmaker', 'Documentary Filmmaker', '...', true, false);
```

### API Integration

**Get Available System Prompts:**
```typescript
// app/api/system-prompts/route.ts
export async function GET(req: Request) {
  const prompts = db.prepare(
    'SELECT id, name, prompt, is_preset FROM system_prompts ORDER BY is_default DESC, name ASC'
  ).all();

  return Response.json({ success: true, data: prompts });
}
```

**Create Custom System Prompt:**
```typescript
// app/api/system-prompts/route.ts
export async function POST(req: Request) {
  const { name, prompt } = await req.json();

  const id = generateId();
  db.prepare(
    'INSERT INTO system_prompts (id, name, prompt, is_preset) VALUES (?, ?, ?, false)'
  ).run(id, name, prompt);

  return Response.json({ success: true, data: { id, name, prompt } });
}
```

**Use System Prompt in Conversation:**
```typescript
// app/api/chat/route.ts
import { getLLMProvider } from '@/lib/llm/factory';
import db from '@/lib/db/client';

export async function POST(req: Request) {
  const { projectId, message } = await req.json();

  // Get project's system prompt (or use default)
  const project = db.prepare(
    'SELECT system_prompt_id FROM projects WHERE id = ?'
  ).get(projectId);

  let systemPrompt: string | undefined;
  if (project.system_prompt_id) {
    const promptRecord = db.prepare(
      'SELECT prompt FROM system_prompts WHERE id = ?'
    ).get(project.system_prompt_id);
    systemPrompt = promptRecord?.prompt;
  }

  // Load conversation history
  const messages = db.prepare(
    'SELECT role, content FROM messages WHERE project_id = ? ORDER BY timestamp ASC'
  ).all(projectId);

  // Add new user message
  messages.push({ role: 'user', content: message });

  // Get LLM response with system prompt
  const llm = getLLMProvider();
  const response = await llm.chat(messages, systemPrompt);

  // Save both messages
  saveMessage(projectId, 'user', message);
  saveMessage(projectId, 'assistant', response);

  return Response.json({ success: true, data: response });
}
```

### UI Components

**Settings Page - System Prompt Selector:**
```typescript
// app/settings/page.tsx
import { useEffect, useState } from 'react';

export default function SystemPromptSettings() {
  const [prompts, setPrompts] = useState([]);
  const [selectedId, setSelectedId] = useState('creative_assistant');
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    fetch('/api/system-prompts')
      .then(res => res.json())
      .then(data => setPrompts(data.data));
  }, []);

  const saveCustomPrompt = async () => {
    await fetch('/api/system-prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My Custom Persona',
        prompt: customPrompt
      })
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">LLM Behavior & Persona</h2>

      <div>
        <label className="block text-sm font-medium mb-2">
          Select Assistant Persona
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        >
          {prompts.map((prompt) => (
            <option key={prompt.id} value={prompt.id}>
              {prompt.name}
            </option>
          ))}
          <option value="custom">Custom Persona...</option>
        </select>
      </div>

      {selectedId === 'custom' && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Custom System Prompt
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Define your assistant's personality, behavior, and goals..."
            rows={12}
            className="w-full px-3 py-2 border rounded-md font-mono text-sm"
          />
          <button
            onClick={saveCustomPrompt}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Save Custom Persona
          </button>
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Current Prompt Preview:</h3>
        <pre className="text-xs whitespace-pre-wrap">
          {prompts.find(p => p.id === selectedId)?.prompt || customPrompt}
        </pre>
      </div>
    </div>
  );
}
```

**Per-Project Prompt Override:**
```typescript
// components/features/conversation/ProjectSettings.tsx
export function ProjectSystemPromptSelector({ projectId }: { projectId: string }) {
  const [systemPromptId, setSystemPromptId] = useState(null);

  const updateProjectPrompt = async (promptId: string) => {
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ system_prompt_id: promptId })
    });
    setSystemPromptId(promptId);
  };

  return (
    <div>
      <label>Assistant Persona for this Project:</label>
      <select
        value={systemPromptId || 'default'}
        onChange={(e) => updateProjectPrompt(e.target.value)}
      >
        <option value="default">Use Default</option>
        <option value="creative_assistant">Creative Assistant</option>
        <option value="viral_strategist">Viral Strategist</option>
        {/* ... other presets ... */}
      </select>
    </div>
  );
}
```

### Benefits of This Architecture

**User Control:**
- ✅ Full control over LLM behavior (no external restrictions)
- ✅ Switch personas per project or conversation
- ✅ Create unlimited custom personas

**Privacy & Security:**
- ✅ System prompts stored locally (never sent to cloud)
- ✅ No API provider restrictions (local Ollama)
- ✅ Complete transparency into assistant behavior

**Flexibility:**
- ✅ Preset personas for common use cases
- ✅ Custom personas for specialized needs
- ✅ Per-project overrides for different video types

**Consistency:**
- ✅ Same persona maintained throughout conversation
- ✅ Behavior documented and versioned
- ✅ Reproducible results

### Implementation Priority

**MVP (Phase 1):**
- ✅ Hardcode DEFAULT_SYSTEM_PROMPT in code
- ✅ Pass to Ollama with every chat request
- ✅ No UI configuration yet

**Post-MVP (Phase 2):**
- Add system_prompts table to database
- Seed with preset prompts
- Create settings UI for prompt selection
- Enable custom prompt creation

**Future Enhancement:**
- Per-project prompt overrides
- Prompt versioning and history
- Community prompt sharing (if cloud deployment)

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
  cv_score REAL, -- Computer vision quality score 0-100 (Epic 3 Story 3.7)
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

// Initialize schema (run on first startup)
export function initializeDatabase() {
  const schema = readFileSync('./lib/db/schema.sql', 'utf-8');
  db.exec(schema);
}

export default db;
```

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

### ADR-007: Configurable System Prompts for LLM Behavior Control

**Status:** Accepted
**Date:** 2025-11-01

**Context:**
Different video projects require different LLM behavior (creative brainstorming vs. educational vs. viral strategy). Since we're using local Ollama, we have complete control over LLM behavior without external restrictions. User wants unrestricted, customizable assistant personas.

**Decision:**
Implement configurable system prompts stored in database with:
- Default "Creative Assistant" persona (unrestricted)
- Preset persona library (viral strategist, educational designer, documentary filmmaker)
- User-customizable system prompts
- Optional per-project prompt overrides

**Consequences:**
- ✅ Full control over LLM behavior (no external restrictions)
- ✅ Personas adapt to different video types
- ✅ Users can create unlimited custom personas
- ✅ Complete transparency into assistant behavior
- ✅ System prompts stored locally (privacy)
- ✅ Consistent persona throughout conversation
- ⚠️ Requires UI for prompt management (post-MVP)
- ⚠️ Users must understand system prompt impact

**Alternatives Considered:**
- Single hardcoded prompt: No flexibility
- No system prompts: Inconsistent LLM behavior
- Cloud-based prompt library: Privacy concerns, requires internet

**Implementation:**
- MVP: Hardcoded DEFAULT_SYSTEM_PROMPT
- Post-MVP: Database table + UI configuration + preset library

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
**Architecture Validated:** 2025-11-01
**Ready for Phase 4:** Pending solutioning-gate-check
