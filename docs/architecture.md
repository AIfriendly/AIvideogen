# AI Video Generator - System Architecture

**Project:** AI Video Generator
**Repository:** https://github.com/AIfriendly/AIvideogen
**Type:** Level 2 Greenfield Software Project
**Author:** Winston (BMAD Architect Agent)
**Date:** 2025-11-12
**Version:** 1.2
**Last Updated:** 2025-11-15 (Updated Story 3.2: Scene Text Analysis with detailed implementation and fallback mechanism)

---

## Executive Summary

The AI Video Generator is a desktop-first web application built with Next.js 15.5 that automates end-to-end video creation from conversational brainstorming to final rendered output. The architecture leverages flexible LLM provider support (local Ollama + Llama 3.2 or cloud Google Gemini 2.5 with free tier), KokoroTTS for local voice synthesis, and integrates YouTube Data API for B-roll sourcing. The system is designed as a single-user local application with a hybrid state management approach (Zustand + SQLite), providing fast performance and complete privacy while maintaining a clear migration path to cloud multi-tenant deployment.

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
| **Video Player** | Plyr | Latest | ✅ | Epic 4 | Lightweight, accessible, per UX spec recommendation |
| **API Layer** | Next.js API Routes | 15.5 | ✅ | All | Built-in, REST-style, server-side execution |
| **File Storage** | Local Filesystem | N/A | ✅ | All | `.cache/` directory for temporary files |

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

### Development Tools
- **Linting:** ESLint (Next.js config)
- **Formatting:** Prettier (recommended)
- **Testing:** To be determined (Vitest or Jest recommended)
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
│       ├── curation/          # Epic 4: Visual curation
│       │   ├── SceneCard.tsx
│       │   ├── VideoPreviewThumbnail.tsx
│       │   ├── ProgressTracker.tsx
│       │   └── ClipGrid.tsx
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
│   │   └── filter-config.ts   # Filtering preferences config
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
- **Licensing:** Creative Commons preferred, Standard embeddable accepted
- **Quality:** Minimum 1000 views (spam prevention)
- **Title Spam:** Remove videos with >5 emojis or >50% ALL CAPS
- **Content Type:** Gaming = "gameplay no commentary", Nature = documentary-style

**Ranking Algorithm:**
- Relevance score (from YouTube API)
- View count (normalized)
- Recency (newer videos score higher)
- Channel authority (subscriber count if available)

**Output:** Top 5-8 ranked suggestions per scene

**Fallback Logic:**
- If all results filtered out:
  1. Relax view count threshold
  2. Relax title spam filters
  3. Return at least 1-3 suggestions if any results exist

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
3. Filter and rank results (Creative Commons preferred, quality checks)
4. Store top 5-8 clip suggestions per scene in database
5. Handle edge cases: zero results (empty state), API failures (retry), quota exceeded (error message)

---

### Epic 4: Visual Curation Interface
**Components:**
- `components/features/curation/SceneCard.tsx` - Scene container
- `components/features/curation/VideoPreviewThumbnail.tsx` - Clip preview
- `components/features/curation/ProgressTracker.tsx` - Completion tracker
- `components/features/curation/ClipGrid.tsx` - Clip display grid

**State:**
- `stores/curation-store.ts` - Clip selections, progress

**Key Flow:**
1. Display all scenes with script text
2. Show 4-6 video clip options per scene (Plyr player)
3. User selects one clip per scene
4. Track progress (N/M scenes complete)
5. "Assemble Video" button enables when all scenes selected

**Matches UX Spec:**
- Scene-Focused Timeline Dashboard design (lines 137-160)
- 3-column clip grid on desktop
- Plyr video player for previews
- Dark mode theme (Slate colors)

---

### Epic 5: Video Assembly & Output
**Backend:**
- `app/api/assembly/route.ts` - Video assembly orchestration
- `lib/video/ffmpeg.ts` - FFmpeg command utilities
- `lib/video/assembler.ts` - Assembly pipeline logic

**Components:**
- `components/features/assembly/AssemblyProgress.tsx` - Progress UI
- `components/features/assembly/VideoDownload.tsx` - Download link

**Key Flow:**
1. Receive all scene selections (clip + voiceover audio)
2. For each scene:
   - Trim video clip to match voiceover duration (FFmpeg)
3. Concatenate all trimmed clips in scene order (FFmpeg)
4. Overlay voiceover audio on corresponding clips (FFmpeg)
5. Render final MP4 to `.cache/output/`
6. Generate thumbnail (extract frame + add title text)
7. Provide download link to user

**FFmpeg Commands:**
```bash
# Trim clip to audio duration
ffmpeg -i clip.mp4 -i audio.mp3 -t $(duration audio.mp3) trimmed.mp4

# Overlay audio on video
ffmpeg -i trimmed.mp4 -i audio.mp3 -c:v copy -map 0:v:0 -map 1:a:0 scene.mp4

# Concatenate scenes
ffmpeg -f concat -i filelist.txt -c copy final.mp4
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

-- Visual suggestions from AI sourcing (Epic 3)
CREATE TABLE visual_suggestions (
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
