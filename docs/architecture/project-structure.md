# Project Structure

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
