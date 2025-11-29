# AI Video Generator - Development Epics

*This document organizes the PRD features into logical development epics for the AI Video Generator MVP.*

**Project:** AI Video Generator (Level 2)
**Repository:** <https://github.com/AIfriendly/AIvideogen>
**Last Updated:** 2025-11-25

---

## Epic 1: Conversational Topic Discovery

**Goal:** Enable users to brainstorm and finalize video topics through natural conversation with an AI agent.

**Features Included:**
- 1.1. Conversational AI Agent
- 1.9. LLM Configuration & Script Personas (MVP: Ollama + Gemini providers, 4 preset personas with selector UI)

**User Value:** Creators can explore ideas naturally and receive AI guidance to refine their video topics before production begins. The AI assistant adapts its personality and behavior to match different content creation workflows. Users can choose between local Ollama (FOSS) or cloud-based Gemini (free tier) providers.

**Story Count Estimate:** 8 stories (MVP: Stories 1.1-1.8)

**Dependencies:** None (foundational epic)

**Acceptance:**
- Users can have multi-turn conversations about video ideas
- Agent maintains context across conversation
- Agent behavior follows configured system prompt/persona
- Users can select from 4 preset personas (Scientific Analyst, Blackpill Realist, Documentary Filmmaker, Educational Designer)
- Users can trigger video creation with explicit command
- Topic confirmation workflow works correctly

### System Prompt/Persona Configuration (Epic 1)

**MVP Implementation (Feature 1.9):**

**Unified Persona System:**
The persona defines the LLM's personality, tone, and delivery style for BOTH chat brainstorming AND script generation. This unified approach ensures consistent behavior throughout the content creation workflow.

- **Persona = WHO:** Defines tone, worldview, delivery style
- **Task Prompts = WHAT:** Defines output format (JSON for scripts, conversational for chat)

**MVP Preset Personas:**
1. **Scientific Analyst (Default)** - Neutral, data-driven, factual delivery. Best for technical explanations, research summaries, and objective analysis.
2. **Blackpill Realist** - Brutal honesty about harsh realities. Nihilistic framing, no sugar-coating. Best for societal critique, collapse scenarios, and uncomfortable truths.
3. **Documentary Filmmaker** - Balanced narrative with focus on human stories and emotional authenticity. Best for historical content, profiles, and investigative pieces.
4. **Educational Designer** - TED-Ed/Kurzgesagt style educational content. Learning-focused with accessible explanations and engaging delivery.

**Technical Implementation:**
- Personas stored in `system_prompts` table with `is_preset = true`
- Project-level persona selection via `projects.system_prompt_id` foreign key
- Persona system prompt prepended to ALL LLM requests (chat AND script generation)
- Task-specific instructions (JSON format, word counts) added as user message context
- Provider selection via .env.local: LLM_PROVIDER=ollama|gemini
- Persona selection UI appears after project creation, before first chat message

**LLM Provider Support (MVP):**
- **Ollama (Primary, FOSS):** Local deployment with Llama 3.2 or other open models
  - Fully complies with NFR 1 (FOSS requirement)
  - Complete privacy and control
  - No API costs or rate limits
- **Google Gemini (Optional, Cloud):** Gemini 2.5 Flash/Pro with free tier
  - 1,500 requests/day free tier
  - 15 requests/minute rate limit
  - No local setup required
  - Models: gemini-2.5-flash, gemini-2.5-pro
  - Note: Gemini 1.5 models deprecated (use 2.5 or 2.0 only)

**Database Schema:**
```sql
CREATE TABLE system_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'preset',
  is_preset BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TEXT,
  updated_at TEXT
);

ALTER TABLE projects ADD COLUMN system_prompt_id TEXT REFERENCES system_prompts(id);
```

**UI Components (MVP):**
- PersonaSelector.tsx: Card-based selector with persona name, description, and selection state
- Appears after "New Chat" before first message (or optionally in project settings)
- Selected persona shown in chat header

**Post-MVP Enhancement:**
- Custom persona creation UI
- Per-project persona switching mid-workflow
- Persona import/export

**Benefits:**
- ✅ Unified behavior across chat AND script generation
- ✅ Clear content differentiation (Scientific vs Documentary vs Blackpill)
- ✅ Full control over AI behavior (local Ollama = no restrictions)
- ✅ Privacy-first (prompts stored locally)

---

### Epic 1 Stories

#### Story 1.1: Project Setup & Dependencies
**Goal:** Initialize Next.js project with required dependencies and project structure

**Tasks:**
- Initialize Next.js 15.5 with TypeScript, Tailwind CSS, ESLint, App Router
- Install core dependencies: zustand@5.0.8, better-sqlite3@12.4.1, ollama@0.6.2, @google/generative-ai
- Set up project structure (app/, components/, lib/, stores/, types/)
- Configure environment variables (.env.local)
- Verify Ollama is running at localhost:11434 (primary) OR configure Gemini API key (optional)

**Acceptance Criteria:**
- Next.js development server runs successfully
- All dependencies installed without errors
- Project structure follows architecture.md patterns
- Either Ollama connection verified OR Gemini API key configured

---

#### Story 1.2: Database Schema & Infrastructure
**Goal:** Create SQLite database schema and client for conversation persistence

**Tasks:**
- Create database schema (projects and messages tables with indexes)
- Implement database client (lib/db/client.ts)
- Create database initialization script
- Write database query functions (lib/db/queries.ts)
- Add foreign key constraints and indexes for performance

**Acceptance Criteria:**
- Projects table created with required fields
- Messages table created with project_id foreign key
- Indexes created on messages(project_id) and messages(timestamp)
- Database client initializes successfully
- Query functions handle CRUD operations for projects and messages

**References:**
- Tech Spec lines 100-125 (Database Schema)
- Architecture lines 1024-1105 (Database Schema)

---

#### Story 1.3: LLM Provider Abstraction
**Goal:** Implement LLM provider abstraction layer with Ollama and Gemini integrations

**Tasks:**
- Create LLMProvider interface (lib/llm/provider.ts)
- Implement OllamaProvider class (lib/llm/ollama-provider.ts)
- Implement GeminiProvider class (lib/llm/gemini-provider.ts)
- Create provider factory function (lib/llm/factory.ts)
- Implement DEFAULT_SYSTEM_PROMPT (lib/llm/prompts/default-system-prompt.ts)
- Add error handling for connection failures (both providers)
- Add Gemini-specific error handling (API key, quota, model not found, safety filters)

**Acceptance Criteria:**
- LLMProvider interface defines chat() method
- OllamaProvider successfully calls Ollama API at localhost:11434
- GeminiProvider successfully calls Gemini API with valid API key and model (gemini-2.5-flash)
- System prompt prepended to all chat requests (both providers)
- Factory returns correct provider based on LLM_PROVIDER environment variable
- Error messages provide actionable guidance for troubleshooting
- Model not found errors display correct available models (Gemini 2.5/2.0)
- Connection errors handled gracefully with user-friendly messages

**References:**
- Tech Spec lines 129-140 (LLMProvider Interface)
- Architecture lines 384-504 (LLM Provider Abstraction)

---

#### Story 1.4: Chat API Endpoint
**Goal:** Create POST /api/chat endpoint with conversation logic and persistence

**Tasks:**
- Create app/api/chat/route.ts API endpoint
- Implement request validation (projectId, message)
- Load conversation history from database (last 20 messages)
- Call LLM provider with system prompt and conversation history
- Save user message and assistant response to database
- Return response with messageId and timestamp
- Implement error handling and standard response format

**Acceptance Criteria:**
- POST /api/chat accepts { projectId, message } and returns { messageId, response, timestamp }
- Conversation history loaded from database before LLM call
- Both user and assistant messages persisted to database
- Error responses follow standard format with error codes
- Ollama connection failures return OLLAMA_CONNECTION_ERROR code

**References:**
- Tech Spec lines 142-179 (API Endpoint specification)
- Tech Spec lines 198-206 (Backend Processes Request)

---

#### Story 1.5: Frontend Chat Components
**Goal:** Build chat UI components with message display and conversation state management

**Tasks:**
- Create ChatInterface.tsx component
- Create MessageList.tsx component for message history display
- Implement conversation-store.ts (Zustand state management)
- Add message input field with validation
- Implement loading states and error display
- Add auto-scroll to latest message
- Integrate with /api/chat endpoint

**Acceptance Criteria:**
- ChatInterface renders with input field and message list
- MessageList displays conversation history with role indicators (user/assistant)
- Messages persist and reload on page refresh
- Loading indicator shows while waiting for LLM response
- Input field disabled during message processing
- Error messages display when API calls fail
- Auto-scroll to bottom when new messages arrive

**References:**
- Tech Spec lines 63-74 (Services and Modules table)
- Architecture lines 258-277 (Epic 1 Components)

---

#### Story 1.6: Project Management UI
**Goal:** Enable users to create, list, and switch between multiple projects/conversations

**Tasks:**
- Create ProjectSidebar.tsx component with project list display
- Add "New Chat" button functionality to create new projects
- Implement project switching (load conversation history for selected projectId)
- Display project metadata (auto-generated name, last_active timestamp)
- Auto-generate project names from first user message in conversation
- Persist selected projectId in localStorage across page reloads
- Add project deletion functionality (optional for MVP)

**Acceptance Criteria:**
- Users can click "New Chat" button to start a fresh conversation in a new project
- Sidebar displays list of all projects ordered by last_active (most recent first)
- Clicking a project loads its complete conversation history
- Currently active project is visually highlighted in the sidebar
- Project names are auto-generated from the first message (e.g., "Cooking video ideas", "Gaming tutorial brainstorm")
- Selected project persists on page refresh via localStorage
- (Optional) Users can delete projects with confirmation dialog

**Database Support:**
- Projects table already exists with required fields (id, name, last_active)
- getAllProjects() query already implemented (Story 1.2)
- No schema changes required

**References:**
- Database Schema: epics.md lines 120-139 (Story 1.2)
- Component Architecture: To be updated by architect based on this story

---

#### Story 1.7: Topic Confirmation Workflow
**Goal:** Implement topic detection, confirmation dialog, and project initialization

**Tasks:**
- Create TopicConfirmation.tsx dialog component
- Implement topic extraction from conversation context
- Add confirmation/edit workflow
- Update projects table (topic, name, current_step fields)
- Implement navigation to voice selection step (Epic 2 placeholder)
- Add last_active timestamp updates

**Acceptance Criteria:**
- TopicConfirmation dialog appears when user issues video creation command
- Topic extracted from conversation context and displayed for confirmation
- User can confirm or edit the topic
- On confirmation, project.topic and project.name updated in database
- project.current_step advances to 'voice'
- User navigated to next step (placeholder until Epic 2 implemented)

**References:**
- Tech Spec lines 215-225 (Topic Detection & Confirmation flow)
- Tech Spec AC4 lines 390-396 (Topic Confirmation Workflow)

---

#### Story 1.8: Persona System & Selector UI
**Goal:** Implement the unified persona system with 4 preset personas and selector UI for project-level persona selection

**pdate script generation to use same persona system prompt (unified behavior)
- Show selected persona indicator in chat header
- Add persona selection step after project creation (before first message)

**AcTasks:**
- Create system_prompts table migration with schema from Feature 1.9
- Seed 4 preset personas: Scientific Analyst (default), Blackpill Realist, Documentary Filmmaker, Educational Designer
- Create preset persona definitions in lib/llm/prompts/preset-personas.ts
- Add system_prompt_id column to projects table (nullable, defaults to Scientific Analyst)
- Create PersonaSelector.tsx component with card-based UI
- Display persona cards with name, description, and selection state
- Implement POST /api/projects/[id]/select-persona endpoint
- Update chat API to load persona from project.system_prompt_id
- 
- acceptance Criteria:**
- system_prompts table created with 4 preset personas seeded
- Scientific Analyst marked as is_default = true
- PersonaSelector displays all 4 personas with name and description
- Clicking a persona card selects it (visual highlight)
- "Continue" or "Start Chat" button saves selection to projects.system_prompt_id
- Chat API prepends selected persona's system prompt to all LLM requests
- Script generation uses the SAME persona prompt (not a separate script-specific prompt)
- Chat header shows selected persona name (e.g., "Blackpill Realist")
- Default persona (Scientific Analyst) used if no selection made
- Persona definitions stored as TypeScript constants for easy maintenance

**Database Changes:**
```sql
-- New table
CREATE TABLE system_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'preset',
  is_preset BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Projects table modification
ALTER TABLE projects ADD COLUMN system_prompt_id TEXT REFERENCES system_prompts(id);
```

**References:**
- PRD Feature 1.9 (LLM Configuration & Script Personas)
- Architecture Section: System Prompts & LLM Persona Configuration
- Epic 1 System Prompt/Persona Configuration section

---

## Epic 2: Content Generation Pipeline

**Goal:** Automatically generate complete video scripts with scene structure and corresponding voiceovers with user's choice of voice.

**Features Included:**
- 1.2. Automated Script Generation
- 1.3. Automated Voiceover
- 2.1. Voice Selection (moved from post-MVP to MVP)

**User Value:** Creators receive production-ready scripts and narration without manual writing or recording, with the ability to choose a voice that matches their content's tone.

**Technical Approach:**
- Present voice selection UI after topic confirmation, before script generation
- Offer multiple TTS voice options (male, female, different accents/styles)
- Use selected voice for all scene voiceovers
- Store voice selection with project metadata

**Story Count Estimate:** 5-6 stories

**Dependencies:**
- Epic 1 (needs confirmed topic as input)

**Acceptance:**
- System generates structured scripts from topics
- Scripts are divided into logical scenes
- User can select from multiple voice options via UI
- Each scene has corresponding MP3 voiceover using selected voice
- Audio quality is clear and natural-sounding
- Voice selection persists with project

### Voice Selection Implementation (Epic 2)

**Workflow Integration:**
1. User confirms topic with conversational agent (Epic 1)
2. **NEW:** System presents voice selection UI with preview samples
3. User chooses preferred voice (male/female, accent, tone)
4. System generates script using selected voice profile
5. All scene voiceovers use consistent selected voice

**Voice Options (FOSS TTS):**
- Multiple voice profiles from open-source TTS engines
- Preview capability (hear short sample before selection)
- Voice metadata: gender, accent, tone/style
- Fallback to default voice if service unavailable

**UI Considerations:**
- Simple, quick selection (don't slow down workflow)
- Audio preview for each voice option
- Option to change voice later (post-MVP: Epic 6)

---

### Epic 2 Stories

#### Story 2.1: TTS Engine Integration & Voice Profile Setup
**Goal:** Integrate FOSS TTS engine and create voice profile infrastructure

**Tasks:**
- Research and select FOSS TTS engine (kokoroTTS)
- Install and configure TTS engine dependencies
- Create voice profile data structure (lib/tts/voice-profiles.ts)
- Generate preview audio samples for each voice profile
- Implement TTS provider abstraction layer (lib/tts/provider.ts)
- Create audio file storage structure and naming convention
- Add error handling for TTS service failures

**Acceptance Criteria:**
- TTS engine successfully installed and accessible via API
- 20 distinct voice profiles defined with metadata (name, gender, accent, tone)
  - Gender diversity: 10 female, 10 male voices
  - Accent diversity: 15 American, 5 British
  - Tone diversity: 12+ unique tone characteristics
- Preview audio samples generated and stored for each voice profile
- TTSProvider interface defined with generateAudio() method
- Audio files stored in organized directory structure (e.g., /public/audio/previews/, /public/audio/scenes/)
- TTS connection errors handled gracefully with user-friendly messages

**References:**
- PRD Feature 1.3 (Voice Selection) lines 103-133
- PRD NFR 1 (FOSS requirement) lines 20-24

---

#### Story 2.2: Database Schema Updates for Content Generation
**Goal:** Extend database schema to support voice selection, scripts, and audio file tracking

**Tasks:**
- Add voice_id column to projects table (stores selected voice)
- Create scenes table (id, project_id, scene_number, text, audio_file_path, duration, timestamps)
- Add script_generated and voice_selected columns to projects table
- Create database migration script
- Implement query functions for scenes (lib/db/queries.ts)
- Add indexes on scenes(project_id) and scenes(scene_number)
- Update TypeScript types for new schema (types/database.ts)

**Acceptance Criteria:**
- Projects table includes voice_id, script_generated, voice_selected fields
- Scenes table created with all required fields and foreign key to projects
- Indexes created for performance on scene queries
- Database migration runs successfully without data loss
- Query functions handle CRUD operations for scenes
- TypeScript types accurately reflect schema changes

**References:**
- PRD Feature 1.2 (Automated Script Generation) lines 78-102
- PRD Feature 1.4 (Automated Voiceover) lines 134-158
- Epic 1 Story 1.2 (Database Schema pattern) lines 119-139

---

#### Story 2.3: Voice Selection UI & Workflow Integration
**Goal:** Build voice selection interface that appears after topic confirmation

**Tasks:**
- Create VoiceSelection.tsx component with voice option cards
- Display voice metadata (name, gender, accent, tone) for each option
- Implement audio preview playback for each voice option
- Add voice selection confirmation button
- Update project workflow state management (after topic confirmation, before script generation)
- Create POST /api/projects/[id]/select-voice endpoint
- Save selected voice_id to projects table
- Navigate to script generation step after voice selection
- Add loading states and error handling

**Acceptance Criteria:**
- VoiceSelection UI displays after user confirms topic (Epic 1 Story 1.7)
- All voice profiles shown with metadata and preview button
- Clicking preview button plays audio sample for that voice
- User can select exactly one voice option
- On confirmation, voice_id saved to database and voice_selected = true
- User navigated to script generation loading screen
- Error messages display if voice selection API fails

**References:**
- PRD Feature 1.3 AC1-AC3 (Voice Selection) lines 120-133
- Epic 2 Workflow Integration lines 306-311

---

#### Story 2.4: LLM-Based Script Generation (Persona-Driven)
**Goal:** Generate video scripts using the project's selected persona for consistent tone and delivery style

**Tasks:**
- Create script generation task prompt template (lib/llm/prompts/script-generation-task.ts) that defines OUTPUT FORMAT only
- **Task prompt specifies WHAT to generate (not HOW to deliver):**
  - **Output format:** Structured JSON with scene breakdown
  - **Scene structure:** scene_number, text (50-200 words per scene)
  - **Scene count:** 3-5 scenes for MVP
  - **Text cleanliness:** ONLY spoken narration text - no markdown, scene labels, titles, or formatting
- **Persona provides delivery style (loaded from project.system_prompt_id via Story 1.8):**
  - Scientific Analyst: Data-driven, factual, objective analysis
  - Blackpill Realist: Nihilistic, no sugar-coating, uncomfortable truths
  - Documentary Filmmaker: Human stories, narrative arcs, emotional authenticity
  - Educational Designer: Accessible, learning-focused, TED-Ed style
- **Create quality validation function (lib/llm/validate-script-quality.ts):**
  - Check for appropriate length (50-200 words per scene)
  - Validate JSON structure
  - Ensure no markdown or formatting characters
  - Reject empty or malformed scenes
- Implement POST /api/projects/[id]/generate-script endpoint
- Load confirmed topic from projects.topic field
- **Load project persona from projects.system_prompt_id (via getProjectPersona() helper)**
- Call LLM with persona as system prompt + task instructions as user message
- Parse LLM response and validate JSON structure
- Validate each scene text is TTS-ready (no markdown characters, no meta-labels)
- Save scenes to database (scenes table) with scene_number and text
- Update projects.script_generated = true and current_step = 'voiceover'
- Add retry logic for LLM failures or invalid responses (max 6 attempts)

**Acceptance Criteria:**
- Script generation endpoint accepts projectId as input
- **Persona loaded from project.system_prompt_id (defaults to Scientific Analyst)**
- **LLM receives: persona prompt as system message, task prompt as user message**
- LLM generates structured script with 3-5 scenes
- Each scene has scene_number (sequential) and text (50-200 words)
- Scene text contains ONLY spoken narration (no markdown, no meta-text)
- **Script delivery style matches selected persona:**
  - Scientific Analyst: Facts, data, objective analysis
  - Blackpill Realist: Stark language, harsh truths, no optimism
  - Documentary Filmmaker: Story arcs, human angle, emotional beats
  - Educational Designer: Accessible analogies, learning hooks
- Scenes saved to database in correct order
- Invalid LLM responses trigger retry (max 6 attempts)
- Projects.script_generated flag updated on success

**Example - Same Topic, Different Personas:**

**Topic:** "Why AI will replace most jobs by 2035"

**Scientific Analyst:**
"Current AI capabilities include language processing, image recognition, and autonomous decision-making. Studies from MIT and Oxford estimate 47% of US jobs face high automation risk. Industries most affected include transportation, manufacturing, and customer service..."

**Blackpill Realist:**
"Mass unemployment is coming and there's nothing you can do about it. By 2035, over half of all jobs will be automated away. This isn't speculation - it's a mathematical certainty. The elites know this and are preparing for a world where most humans are economically useless..."

**References:**
- PRD Feature 1.2 (Automated Script Generation) lines 78-102
- PRD Feature 1.9 (LLM Configuration & Script Personas)
- Epic 1 Story 1.8 (Persona System)
- Architecture Section: Unified Persona Architecture

---

#### Story 2.5: Voiceover Generation for Scenes
**Goal:** Generate TTS audio files for each script scene using selected voice with text sanitization

**Tasks:**
- Create POST /api/projects/[id]/generate-voiceovers endpoint
- Load all scenes for project from database (ordered by scene_number)
- Load selected voice_id from projects table
- **Implement text sanitization function (lib/tts/sanitize-text.ts) to clean text before TTS:**
  - Remove markdown characters (*, #, _, `, **)
  - Remove scene labels ("Scene 1:", "Title:", etc.)
  - Remove stage directions [in brackets]
  - Collapse multiple newlines/whitespace
  - Trim leading/trailing whitespace
- For each scene, sanitize scene.text then call TTS provider with cleaned text and voice_id
- Save generated MP3 files to /public/audio/scenes/{projectId}/scene-{number}.mp3
- Update scenes table with audio_file_path and duration for each scene
- Calculate total video duration (sum of all scene durations)
- Update projects.current_step = 'visual-sourcing' (placeholder for Epic 3)
- Implement progress tracking for multi-scene generation
- Add error handling and partial completion recovery

**Acceptance Criteria:**
- Voiceover generation endpoint accepts projectId as input
- **Text sanitization removes all non-speakable characters before TTS (markdown, labels, formatting)**
- TTS generates MP3 file for each scene using selected voice consistently
- **Generated audio contains ONLY clean narration (no spoken asterisks, scene numbers, or artifacts)**
- Audio files saved with organized naming convention
- Each scene record updated with audio_file_path and duration (seconds)
- All scenes for a project use the same voice_id
- Progress indicator shows current scene being processed
- Partial failures allow resume (don't regenerate completed scenes)
- Total project duration calculated and stored

**References:**
- PRD Feature 1.4 (Automated Voiceover) lines 134-158
- PRD Feature 1.4 AC1-AC2 lines 150-158
- Story 2.1 (TTS Provider abstraction)

---

#### Story 2.6: Script & Voiceover UI Display (Preview)
**Goal:** Display generated script and allow users to preview voiceover before proceeding to visual sourcing

**Tasks:**
- Create ScriptPreview.tsx component
- Display all scenes with scene_number, text, and duration
- Add audio player for each scene to preview voiceover
- Show total video duration
- Add "Continue to Visual Sourcing" button (placeholder for Epic 3)
- Implement loading states during script and voiceover generation
- Add error display for generation failures
- Allow users to view script while voiceovers are generating (async UI updates)

**Acceptance Criteria:**
- ScriptPreview displays all scenes in order with text
- Each scene has playable audio preview
- Audio players use audio_file_path from database
- Total video duration displayed (sum of scene durations)
- Loading states show progress during script generation and voiceover processing
- "Continue" button enabled only after all voiceovers generated successfully
- Error messages display if script or voiceover generation fails
- UI updates dynamically as voiceovers complete (no full page refresh required)

**References:**
- PRD Feature 1.2 (Script structure) lines 78-102
- PRD Feature 1.4 (Voiceover per scene) lines 134-158
- Epic 1 Story 1.5 (Frontend component pattern) lines 189-215

---

## Epic 3: Visual Content Sourcing (YouTube API)

**Goal:** Intelligently source and suggest relevant B-roll footage for each script scene using YouTube as the primary content source, with duration filtering and automatic default segment downloads for instant preview.

**Features Included:**
- 1.5. AI-Powered Visual Sourcing (YouTube API Integration with Duration Filtering and Default Segment Downloads)

**User Value:** Creators save hours of manual footage searching by receiving AI-curated visual suggestions from YouTube's massive content library, including gaming footage, tutorials, nature content, and more. Duration filtering ensures videos are appropriate for scene length, and automatic segment downloads enable instant preview without waiting.

**Technical Approach:**
- Primary Source: YouTube Data API v3
- Search queries generated from scene text analysis
- Duration filtering: 1x-3x ratio with 5-minute max cap
- Automatic default segment download using yt-dlp
- Filter for appropriate licensing (Creative Commons when possible)
- Support for niche content (gaming, tutorials, vlogs, etc.)
- Handle YouTube API quotas and rate limiting

**Story Count Estimate:** 9 stories (6 original + 3 enhancement stories for advanced filtering and pipeline integration)

**Dependencies:**
- Epic 2 (needs script structure as input)

**Acceptance:**
- System analyzes scene text for visual themes
- Queries YouTube API successfully with relevant search terms
- Returns multiple relevant video clip options per scene
- Handles various content types (general footage, gaming, educational)
- Respects YouTube API quotas and implements appropriate error handling
- Suggestion quality meets user expectations
- **Pure B-roll results with no commentary, captions, or reaction content**
- **Google Cloud Vision API validates content relevance and quality**
- **Audio stripped from all downloaded segments**

---

### Epic 3 Stories

#### Story 3.1: YouTube API Client Setup & Configuration
**Goal:** Set up YouTube Data API v3 client with authentication and quota management infrastructure

**Tasks:**
- Obtain YouTube Data API v3 credentials (API key)
- Install googleapis library (@google/googleapis or similar)
- Create YouTubeAPIClient class (lib/youtube/client.ts)
- Implement API key configuration via environment variables
- Add quota tracking and rate limiting logic
- Implement exponential backoff for rate limit handling
- Create error handling for API failures (quota exceeded, invalid key, network errors)
- Add logging for API requests and quota usage

**Acceptance Criteria:**
- YouTubeAPIClient successfully initializes with valid API key from environment variable
- API client can make authenticated requests to YouTube Data API v3
- Quota tracking counts requests against daily limit (10,000 units default)
- Rate limiter prevents exceeding 100 requests per 100 seconds
- Exponential backoff retries failed requests (max 3 attempts)
- Error messages provide actionable guidance (e.g., "API key invalid - check YOUTUBE_API_KEY in .env.local")
- Logging captures request count, quota usage, and errors for debugging
- **Test Case:** When YOUTUBE_API_KEY is missing or empty in environment variables, system displays actionable error message: "YouTube API key not configured. Add YOUTUBE_API_KEY to .env.local" and prevents API calls

**References:**
- PRD Feature 1.5 (AI-Powered Visual Sourcing) lines 179-209
- PRD Feature 1.5 AC3 (API Error Handling) lines 206-209
- Epic 3 Technical Approach lines 571-575

---

#### Story 3.2: Scene Text Analysis & Search Query Generation
**Goal:** Analyze script scene text using LLM to extract visual themes and generate optimized YouTube search queries

**Tasks:**
- Create scene analysis prompt template (lib/llm/prompts/visual-search-prompt.ts)
- Design prompt to extract: main subject, setting, mood, action, keywords
- Implement query generation strategy:
  - Primary search query (most relevant)
  - Alternative search queries (2-3 variations for diversity)
  - Content type hints (gameplay, tutorial, nature, b-roll, etc.)
- Create analyzeSceneForVisuals() function (lib/youtube/analyze-scene.ts)
- Call LLM provider with scene text and analysis prompt
- Parse LLM response and extract search queries
- Validate search queries (non-empty, relevant keywords)
- Add fallback logic for LLM failures (use simple keyword extraction)

**Acceptance Criteria:**
- Given scene text "A majestic lion roams the savanna at sunset", system generates:
  - Primary query: "lion savanna sunset wildlife"
  - Alternative queries: ["african lion sunset", "lion walking grassland golden hour"]
  - Content type: "nature documentary"
- Search queries are relevant to scene content and optimized for YouTube search
- LLM analysis completes within 5 seconds per scene
- System handles various scene types: nature, gaming, tutorials, urban, abstract concepts
- Fallback keyword extraction works when LLM unavailable (extracts nouns/verbs from scene text)
- Invalid or empty LLM responses trigger fallback or retry

**References:**
- PRD Feature 1.5 (Visual Sourcing) lines 186-189
- PRD Feature 1.5 AC1 (Visual Suggestion) lines 197-201
- Epic 1 Story 1.3 (LLM Provider pattern) lines 155-180

---

#### Story 3.3: YouTube Video Search & Result Retrieval
**Goal:** Query YouTube API with generated search terms and retrieve relevant video clip suggestions

**Tasks:**
- Implement searchVideos() function in YouTubeAPIClient (lib/youtube/client.ts)
- Build YouTube Data API search.list request with parameters:
  - q (search query)
  - part: snippet
  - type: video
  - videoEmbeddable: true
  - maxResults: 10-15 per query
  - relevanceLanguage: en (configurable)
- Execute search for primary query and alternative queries
- Retrieve video metadata: videoId, title, thumbnail, channelTitle, duration (if available)
- Aggregate results from multiple queries (deduplicate by videoId)
- Sort results by relevance score
- Create POST /api/projects/[id]/generate-visuals endpoint
- Load all scenes for project from database
- For each scene: analyze text → generate queries → search YouTube → store suggestions
- Save video suggestions to database (new visual_suggestions table)
- Handle API errors gracefully (quota exceeded, invalid query, no results)

**Acceptance Criteria:**
- searchVideos() accepts search query and returns array of video results with metadata
- Each result includes: videoId, title, thumbnailUrl, channelTitle, embedUrl
- Search returns 10-15 relevant videos per query
- Results are embeddable (videoEmbeddable=true filter applied)
- Duplicate videos removed when aggregating multiple query results
- POST /api/projects/[id]/generate-visuals endpoint processes all scenes successfully
- Video suggestions saved to database with scene_id association
- API quota errors display user-friendly message and don't crash endpoint
- No results for query returns empty array (not error)
- **Test Case:** When YouTube returns 0 results for a search query, system passes empty array to Story 3.4 filter (which triggers fallback or empty state in Story 3.5 AC6)

**References:**
- PRD Feature 1.5 (Visual Sourcing) lines 179-209
- PRD Feature 1.5 AC1 (Visual Suggestion) lines 197-201
- PRD Feature 1.5 AC2 (Data Structure) lines 202-205
- YouTube Data API v3 documentation (search.list method)

---

#### Story 3.4: Content Filtering & Quality Ranking
**Goal:** Filter and rank YouTube search results to prioritize high-quality, appropriate content with duration filtering to ensure videos are suitable for scene length

**Tasks:**
- Implement content filtering logic (lib/youtube/filter-results.ts)
- **Duration Filtering (PRIMARY FILTER):**
  - Implement filterByDuration() function
  - Filter videos based on 1x-3x duration ratio relative to scene voiceover duration
  - Apply 5-minute (300 second) maximum duration cap regardless of scene length
  - Examples: 10s scene accepts 10s-30s videos; 90s scene accepts 90s-270s videos; 120s scene accepts 120s-300s (NOT 360s)
  - Fetch video duration via YouTube API videos.list (contentDetails.duration ISO 8601 format)
  - Parse ISO 8601 duration to seconds for comparison
- Filter by licensing preference:
  - Priority 1: Creative Commons licensed videos
  - Priority 2: Standard YouTube license (embeddable)
- Filter by content quality indicators:
  - Minimum view count threshold (configurable, default 1000)
  - Exclude videos with excessive title spam (ALL CAPS, excessive emojis)
  - Exclude explicit content (use YouTube API contentDetails.contentRating if available)
- Implement ranking algorithm:
  - Relevance score (from YouTube API)
  - View count (normalized)
  - Recency (newer videos score higher)
  - Channel authority (subscriber count if available)
- Support content-type specific filtering:
  - Gaming: filter for "gameplay", "no commentary" keywords
  - Tutorials: prioritize educational channels
  - Nature: prioritize documentary-style content
- Limit final suggestions to 5-8 videos per scene (top-ranked)
- Add configuration options for filtering preferences (lib/youtube/filter-config.ts)
- Implement fallback logic: If insufficient results after duration filtering, relax duration threshold (1x-5x ratio, then remove cap)

**Acceptance Criteria:**
- **Duration filtering applied FIRST before other filters**
- **Given scene with 30s voiceover, only videos 30s-90s (1x-3x) pass duration filter**
- **Given scene with 180s voiceover, max duration capped at 300s (5 min), NOT 540s (3x)**
- **ISO 8601 duration parsing correctly converts "PT1M30S" to 90 seconds**
- Creative Commons videos ranked higher than standard license (when available)
- Videos with <1000 views filtered out (spam prevention)
- Title spam detection removes videos with >5 emojis or >50% ALL CAPS
- Ranking algorithm produces diverse, high-quality suggestions
- Gaming content filtering successfully identifies "gameplay only" videos
- Final suggestions limited to 5-8 top-ranked videos per scene
- Filtering preferences configurable via filter-config.ts
- **Fallback 1:** If <3 videos pass strict duration filter (1x-3x), relax to 1x-5x ratio
- **Fallback 2:** If still <3 videos, remove 5-minute cap and accept any video ≥1x scene duration
- **Fallback 3:** If no videos pass filters, relax criteria incrementally (remove view count threshold, then title filters)
- **Test Case:** When all results fail initial filters (e.g., all videos <1000 views), system relaxes view count threshold first, then title spam filters, ensuring at least 1-3 suggestions returned if any results exist from Story 3.3

**References:**
- PRD Feature 1.5 (Visual Sourcing) lines 191-192
- PRD Feature 2.2 (Advanced Content Filtering) lines 312-313
- Epic 3 Technical Approach lines 573-575

---

#### Story 3.5: Visual Suggestions Database & Workflow Integration
**Goal:** Store visual suggestions in database with duration and segment download tracking, and integrate visual sourcing step into project workflow

**Tasks:**
- Create visual_suggestions table in database:
  - id (primary key)
  - scene_id (foreign key to scenes table)
  - video_id (YouTube video ID)
  - title, thumbnail_url, channel_title, embed_url
  - rank (suggestion ranking 1-8)
  - **duration INTEGER (video duration in seconds from Story 3.4)**
  - **default_segment_path TEXT (path to downloaded default segment from Story 3.6)**
  - **download_status TEXT DEFAULT 'pending' (pending, downloading, complete, error from Story 3.6)**
  - created_at timestamp
- Add index on visual_suggestions(scene_id)
- Implement database query functions (lib/db/queries.ts):
  - saveVisualSuggestions(sceneId, suggestions[])
  - getVisualSuggestions(sceneId)
  - getVisualSuggestionsByProject(projectId)
  - **updateSegmentDownloadStatus(suggestionId, status, filePath)**
- Update projects table: Add visuals_generated boolean flag
- Update POST /api/projects/[id]/generate-visuals to save suggestions to database
- Implement GET /api/projects/[id]/visual-suggestions endpoint to retrieve suggestions
- Create VisualSourcing.tsx loading screen component
- Trigger visual sourcing automatically after voiceover generation completes (Epic 2 Story 2.5)
- Update projects.current_step = 'visual-curation' after visual sourcing completes
- Display progress indicator during visual sourcing (X/Y scenes analyzed)
- Add error recovery for partial completion

**Acceptance Criteria:**
- visual_suggestions table created with all required fields and foreign key constraints
- **duration column stores video duration in seconds (INTEGER, nullable for backward compatibility)**
- **default_segment_path column stores file path to downloaded segment (TEXT, NULL until download completes)**
- **download_status column defaults to 'pending' and updates to 'downloading', 'complete', or 'error'**
- Index on scene_id improves query performance
- saveVisualSuggestions() stores 5-8 suggestions per scene with ranking and duration
- getVisualSuggestions(sceneId) retrieves suggestions ordered by rank with duration and download status
- **updateSegmentDownloadStatus() successfully updates status and file path for a suggestion**
- projects.visuals_generated flag updated on completion
- VisualSourcing loading screen displays during visual generation process
- Progress indicator shows "Analyzing scene 2/5..." dynamically
- After Epic 2 Story 2.5 completion, visual sourcing triggers automatically
- projects.current_step advances to 'visual-curation' enabling Epic 4 UI
- Partial failures allow resume (don't regenerate completed scenes)
- **AC6:** If YouTube returns 0 results for a scene, UI displays empty state with guidance message (e.g., "No clips found for this scene. Try editing the script or searching manually.")
- **AC7:** If API fails during visual sourcing, UI provides 'Retry' button to re-attempt visual sourcing for failed scenes without regenerating completed scenes

**References:**
- PRD Feature 1.5 AC2 (Data Structure) lines 202-205
- Story 3.4 (visual_suggestions table schema) lines 760-769
- Epic 2 Story 2.6 (UI workflow integration) lines 530-558

---

#### Story 3.6: Default Segment Download Service
**Goal:** Automatically download default video segments (first N seconds) for instant preview capability in Visual Curation UI

**Tasks:**
- Install yt-dlp dependency (Python-based YouTube downloader)
- Create downloadDefaultSegment() service function (lib/youtube/download-segment.ts)
- Implement yt-dlp command execution:
  - Command: `yt-dlp "https://youtube.com/watch?v=${videoId}" --download-sections "*0-${segmentDuration}" -f "best[height<=720]" -o "${outputPath}"`
  - segmentDuration = scene voiceover duration + 5 second buffer
  - outputPath = `.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`
  - Resolution: 720p max for performance
- Create POST /api/projects/[id]/download-segments endpoint
- For each visual suggestion after Story 3.5 saves to database:
  - Calculate segment duration (scene.duration + 5 seconds)
  - Queue download job for each suggestion (max 5-8 per scene)
  - Update visual_suggestions.download_status = 'downloading'
  - Execute yt-dlp download
  - Save file to .cache/videos/{projectId}/ directory
  - Update visual_suggestions.default_segment_path and download_status = 'complete'
- Implement error handling:
  - Retry logic: Max 3 attempts with exponential backoff (1s, 2s, 4s delays)
  - Permanent failure: Update download_status = 'error' after max retries
  - Quota/rate limit handling: Pause downloads and resume later
- Create background job queue for parallel downloads (limit 3 concurrent downloads)
- Add progress tracking: Track X/Y segments downloaded per project
- Clean up old cached segments (retention policy: 7 days)

**Acceptance Criteria:**
- yt-dlp installed and accessible via system PATH or bundled
- downloadDefaultSegment() successfully downloads first N seconds of YouTube video
- **Given scene with 8s voiceover, download captures first 13 seconds (8s + 5s buffer)**
- **Given scene with 120s voiceover, download captures first 125 seconds (120s + 5s buffer)**
- Downloaded segments saved to `.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`
- File naming convention prevents conflicts (scene number unique per project)
- **Resolution capped at 720p** (format: "best[height<=720]")
- POST /api/projects/[id]/download-segments processes all suggestions for all scenes
- download_status updates correctly: pending → downloading → complete (or error)
- default_segment_path populated with file path on successful download
- **Retry logic:** Failed downloads retry max 3 times with exponential backoff
- **Permanent failures:** After 3 retries, download_status = 'error' and download stops
- **Parallel downloads:** Max 3 concurrent downloads to avoid overwhelming network/CPU
- Progress tracking: API returns "Downloaded 12/40 segments" status
- **Cached files:** Segments remain available for 7 days, then auto-deleted to save disk space
- **Error scenarios handled:**
  - Video unavailable/deleted: Mark as error immediately (no retry)
  - Network timeout: Retry with backoff
  - Disk space full: Pause downloads, alert user
  - Invalid YouTube URL: Mark as error immediately (no retry)

**References:**
- PRD Feature 1.5 (Default Segment Download) lines 203-208
- PRD Feature 1.5 AC6 (Default Segment Download) lines 235-238
- PRD Feature 1.5 AC7 (Instant Preview) lines 239-242
- Story 3.5 (database schema extensions) lines 767-768
- Architecture lines 610-685 (yt-dlp implementation details)

---

#### Story 3.2b: Enhanced Search Query Generation
**Goal:** Improve query relevance with content-type awareness, entity extraction, and platform-optimized search patterns for pure B-roll results

**Tasks:**
- Update visual search prompt (lib/llm/prompts/visual-search-prompt.ts) for content-type detection
- Implement content-type classification: gaming, historical, conceptual, nature, tutorial
- Add entity extraction logic for specific subjects (boss names, historical events, concepts)
- Generate platform-optimized YouTube search queries with B-roll quality terms
- Implement automatic negative term injection (-reaction, -review, -commentary, -tier list, -vlog)
- Add B-roll quality terms (+cinematic, +4K, +no commentary, +gameplay only, +stock footage)
- Create content-type specific query templates (gaming: "no commentary gameplay only", historical: "documentary footage")
- Update tests for diverse content types (gaming, historical, conceptual)

**Acceptance Criteria:**
- Given scene "The epic battle against Ornstein and Smough tests every player's skill":
  - Content type detected: gaming
  - Entities extracted: "Ornstein and Smough", "Dark Souls"
  - Query includes: "dark souls ornstein smough boss fight no commentary gameplay only"
  - Negative terms applied: -reaction -review -tier list
- Given scene "The storming of the Winter Palace marked the beginning of Soviet rule":
  - Content type detected: historical
  - Entities extracted: "Winter Palace", "Russian Revolution"
  - Query includes: "russian revolution winter palace historical footage documentary"
- Given scene "Towering skyscrapers loom over empty streets as autonomous drones patrol":
  - Content type detected: conceptual
  - Query includes: "dystopian city AI robots cinematic 4K"
- All queries include appropriate negative terms for content type
- Manual review of 10 sample scenes shows relevant search results
- Query generation completes within 5 seconds per scene

**References:**
- PRD Feature 1.5 (Enhanced Query Generation) lines 200-204
- PRD Feature 1.5 AC8 (Enhanced Query Generation) lines 262-265

---

#### Story 3.7: Computer Vision Content Filtering
**Goal:** Filter low-quality B-roll using Google Cloud Vision API (face detection, OCR, label verification) and local processing (keyword filtering, audio stripping)

**Tasks:**
- **Tier 1 - Local Filtering:**
  - Implement keyword filtering for titles/descriptions (lib/youtube/filter-results.ts)
  - Filter patterns: "reaction", "reacts", "commentary", "my thoughts", "review", "tier list", "ranking", "explained", "vlog"
  - Prioritize B-roll indicators: "stock footage", "cinematic", "4K", "no text", "gameplay only"
  - Add audio stripping to segment download using FFmpeg (-an flag)
  - Update yt-dlp download command or add post-processing step
- **Tier 2 - Google Cloud Vision API:**
  - Set up Google Cloud Vision API credentials and client library (@google-cloud/vision)
  - Create vision API client (lib/vision/client.ts) with quota management
  - **Implement thumbnail pre-filtering: analyze YouTube thumbnails first to pre-filter candidates before downloading (reduces bandwidth and API calls)**
  - Implement frame extraction from downloaded video segments using FFmpeg (3 frames: 10%, 50%, 90% duration)
  - Implement FACE_DETECTION to identify talking heads (filter if face bounding box area >15% of total frame area)
  - Implement TEXT_DETECTION (OCR) to identify burned-in captions/overlays
  - Implement LABEL_DETECTION to verify content matches scene theme (at least 1 of top 3 expected labels)
  - Create label matching logic (scene keywords → expected Vision API labels generated by LLM)
  - Implement quality ranking based on CV results (fewer faces, less text, better label match = higher rank)
- **Error Handling & Fallback:**
  - Implement API quota tracking (1,000 units/month free tier)
  - Add graceful fallback to Tier 1 filtering when API quota exceeded
  - Implement retry logic with exponential backoff for API failures
  - Add logging for CV analysis results
- **Database & Integration:**
  - Add cv_score column to visual_suggestions table for ranking
  - Update filtering pipeline to run CV analysis after initial keyword filtering
  - Create POST /api/projects/[id]/cv-filter endpoint for manual re-filtering
- **Testing:**
  - Create mocked Vision API responses for unit tests
  - Add benchmark tests for face detection accuracy (20 talking head vs 20 B-roll videos)
  - Add benchmark tests for OCR accuracy (20 captioned vs 20 clean videos)
  - Verify filtering adds <5 seconds per video suggestion
- **Frontend - Silent Video Indicator (VideoPreviewPlayer):**
  - Remove volume control from VideoPreviewPlayer component
  - Add static mute icon (🔇) with tooltip "Audio removed for preview"
  - Position icon bottom-left of controls bar, before time display
  - Style icon with muted color (Slate 400, not alarming)
  - Remove keyboard shortcuts for volume (M, Up/Down arrows)
  - Update accessibility labels per UX spec v3.4

**Acceptance Criteria:**
- **Keyword Filtering:**
  - Videos with "reaction", "commentary", "vlog" in titles filtered out
  - Videos with "cinematic", "4K", "stock footage" prioritized in ranking
- **Audio Stripping:**
  - All downloaded segments have no audio track (verify with ffprobe)
  - Audio stripping adds <1 second to download time
- **Thumbnail Pre-Filtering:**
  - YouTube thumbnails analyzed before downloading video segments
  - Videos with faces in thumbnails pre-filtered (reduces downloads by ~30-50%)
  - Thumbnail analysis uses same FACE_DETECTION and TEXT_DETECTION features
- **Face Detection:**
  - Videos with face bounding box area >15% of total frame area filtered out
  - Face detection correctly identifies >80% of talking head videos (benchmark test)
  - Pure B-roll videos (no faces) pass filter
  - Multiple faces summed for total area calculation
- **Text/Caption Detection:**
  - Videos with burned-in captions detected and filtered/ranked lower
  - OCR correctly identifies >80% of captioned videos (benchmark test)
  - Clean B-roll videos pass filter
- **Label Verification:**
  - Scene "mountain landscape" → video must have labels like "mountain", "landscape", "nature"
  - Scene "Dark Souls boss fight" → video must have labels like "video game", "combat", "fantasy", "dark souls boss"
  - Mismatched content filtered out or ranked significantly lower
- **API Quota & Fallback:**
  - System tracks API usage against 1,000 units/month limit
  - When quota exceeded, system falls back to keyword-only filtering
  - Fallback does not cause visual sourcing to fail
- **Performance:**
  - CV filtering completes in <5 seconds per video suggestion
  - Frame extraction uses FFmpeg efficiently (3 frames only)
- **Manual Validation:**
  - Manual review of 10 sample scenes shows 80%+ pure B-roll results
  - Significant improvement over pre-enhancement filtering
- **Silent Video Indicator (Frontend):**
  - VideoPreviewPlayer displays 🔇 icon in bottom-left of controls
  - Hovering icon shows tooltip: "Audio removed for preview"
  - No volume slider or unmute option available
  - Icon uses muted color (Slate 400, not red/alarming)
  - Keyboard shortcuts M, Up/Down arrows do not trigger any action

**References:**
- PRD Feature 1.5 (Pure B-Roll Content Filtering) lines 210-213
- PRD Feature 1.5 (Google Cloud Vision API Integration) lines 214-220
- PRD Feature 1.5 AC9-AC14 lines 266-289
- UX Design Specification v3.4, Section 8.13 (VideoPreviewPlayer Silent Video Indicator)

---

#### Story 3.7b: CV Pipeline Integration
**Goal:** Integrate CV filtering into the automatic download pipeline and enforce quality thresholds in the UI to ensure users only see pure B-roll footage

**Problem Statement:** Story 3.7 implemented CV filtering as a standalone service with a manual API endpoint, but this was never integrated into the visual sourcing workflow. Users see low-quality B-roll because:
1. CV analysis never runs automatically - requires manual POST call
2. Low cv_score suggestions aren't filtered from UI
3. Detection thresholds (15% face area) are too lenient

**Tasks:**
- **Auto-Trigger CV Analysis:**
  - Modify download-segments route to call analyzeVideoSuggestion() after each segment download
  - Import cv-filter-service functions into download pipeline
  - Wrap CV analysis in try-catch to not block download success (graceful degradation)
  - Pass scene.visual_keywords as expectedLabels for label matching
- **Tighten CV Detection Thresholds:**
  - Create CV_THRESHOLDS constant object in lib/vision/client.ts
  - Update TALKING_HEAD_AREA from 0.15 to 0.10 (10% face area)
  - Update CAPTION_COVERAGE from 0.05 to 0.03 (3% text coverage)
  - Update CAPTION_BLOCKS from 3 to 2 text blocks
  - Increase FACE_PENALTY_MAJOR from -0.5 to -0.6
  - Increase FACE_PENALTY_MINOR from -0.2 to -0.3
  - Increase CAPTION_PENALTY from -0.3 to -0.4
- **UI Filtering for Low CV Scores:**
  - Add getFilteredSuggestions() function to visual curation component
  - Filter suggestions where cv_score < 0.5 (hide from view)
  - Keep suggestions with cv_score = NULL visible (not yet analyzed)
  - Display "X low-quality video(s) filtered" message

**Acceptance Criteria:**
- **Auto CV Trigger:** CV analysis automatically runs after each segment download completes (no manual API call)
- **Graceful Degradation:** CV analysis failure does not block download success (cv_score remains NULL)
- **Stricter Face Detection:** Videos with face area >10% flagged as talking heads (was 15%)
- **Stricter Caption Detection:** Videos with text coverage >3% OR >2 text blocks flagged (was 5% or 3 blocks)
- **Increased Penalties:** Face penalty -0.6 (was -0.5), caption penalty -0.4 (was -0.3)
- **UI Filtering:** Suggestions with cv_score < 0.5 hidden from visual curation view
- **NULL Handling:** Suggestions with cv_score = NULL (not yet analyzed) remain visible
- **Filtered Count:** UI displays "X low-quality video(s) filtered" message
- **Label Passing:** visual_keywords from scene passed to CV analysis as expectedLabels
- **Manual Validation:** >90% pure B-roll in visible results across 10 test scenes

**Threshold Changes Summary:**

| Threshold | Before (3.7) | After (3.7b) |
|-----------|--------------|--------------|
| Talking head face area | 15% | 10% |
| Small face area | 5% | 3% |
| Caption text coverage | 5% | 3% |
| Caption text blocks | 3 | 2 |
| Major face penalty | -0.5 | -0.6 |
| Minor face penalty | -0.2 | -0.3 |
| Caption penalty | -0.3 | -0.4 |

**References:**
- Story 3.7 (Parent implementation - CV filtering service)
- Tech Spec Epic 3 v3.1, Story 3.7b section
- PRD Feature 1.5 (Pure B-Roll Content Filtering)

---

## Epic 4: Visual Curation Interface

**Goal:** Provide an intuitive UI for creators to review scripts, preview suggested clips, and finalize visual selections.

**Features Included:**
- 1.6. Visual Curation UI

**User Value:** Creators maintain creative control through an easy-to-use interface for selecting the perfect visuals.

**Story Count:** 6 stories

**Dependencies:**
- Epic 2 (displays script)
- Epic 3 (displays suggested clips)

**Acceptance:**
- All scenes display with text and clip suggestions
- Video clips can be previewed in-browser
- Users can select one clip per scene
- Assembly trigger only activates when all scenes have selections
- Data passes correctly to assembly module

---

### Epic 4 Stories

#### Story 4.1: Scene-by-Scene UI Layout & Script Display
**Goal:** Create the foundational UI structure for the visual curation page with scene-by-scene layout

**Tasks:**
- Create VisualCuration.tsx page component at /projects/[id]/visual-curation
- Implement scene-by-scene layout with numbered sections (Scene 1, Scene 2, etc.)
- Display script text for each scene from database (scenes table)
- Add navigation to visual curation page after Epic 3 visual sourcing completes
- Implement loading states for fetching scenes and suggestions
- Add responsive design for desktop and tablet viewing
- Create GET /api/projects/[id]/scenes endpoint to retrieve all scenes with text and audio
- Implement error handling for missing scenes or failed data retrieval

**Acceptance Criteria:**
- VisualCuration page displays after visual sourcing completes (projects.current_step = 'visual-curation')
- All scenes displayed in sequential order (Scene 1, Scene 2, Scene 3...)
- Each scene section shows scene number and complete script text
- Scene data loads from database via GET /api/projects/[id]/scenes endpoint
- Loading indicator displays while fetching scene data
- Error messages display if scenes cannot be loaded
- Layout is responsive and readable on desktop (1920px) and tablet (768px) screens
- Empty state displays if no scenes exist for project

**References:**
- PRD Feature 1.6 AC1 (Scene and Clip Display) lines 263-266
- Epic 3 Story 3.5 (visual_suggestions database) lines 758-809

---

#### Story 4.2: Visual Suggestions Display & Gallery
**Goal:** Display AI-generated video clip suggestions for each scene with thumbnails and metadata

**Tasks:**
- Create VisualSuggestionGallery.tsx component
- Fetch visual suggestions per scene from GET /api/projects/[id]/visual-suggestions endpoint
- Display 5-8 suggested video clips per scene in grid layout
- Show YouTube thumbnail for each suggestion
- Display video metadata: title, channel, duration
- Add visual indicator for download status (pending, downloading, complete, error)
- Implement empty state for scenes with no suggestions (YouTube returned 0 results)
- Add retry functionality for failed visual sourcing
- Handle loading states for suggestions still being processed

**Acceptance Criteria:**
- Each scene section displays its suggested video clips in a gallery grid (2-3 columns)
- Each suggestion card shows: YouTube thumbnail, video title, channel name, duration
- Suggestions ordered by rank (1-8) from Story 3.4 filtering
- Download status indicator visible per suggestion (pending/downloading/complete/error icon)
- **Empty State (Epic 3 Story 3.5 AC6):** If scene has 0 suggestions, display message: "No clips found for this scene. The script may be too abstract or specific. Try editing the script text."
- **Retry Functionality (Epic 3 Story 3.5 AC7):** If visual sourcing failed, "Retry Visual Sourcing" button appears
- Loading skeleton displays while suggestions are being fetched
- Graceful degradation if thumbnails fail to load (show placeholder image)

**References:**
- PRD Feature 1.6 AC1 (Scene and Clip Display) lines 263-266
- Epic 3 Story 3.5 (visual_suggestions table) lines 760-809
- Epic 3 Story 3.4 (ranking and filtering) lines 703-756

---

#### Story 4.3: Video Preview & Playback Functionality
**Goal:** Enable users to preview suggested video clips directly in the browser using downloaded segments

**Tasks:**
- Implement VideoPreviewPlayer.tsx component with HTML5 video player
- Load default video segment from default_segment_path (downloaded in Epic 3 Story 3.6)
- Add play/pause controls, progress bar, and volume controls
- Implement click-to-preview: clicking a suggestion opens preview modal/inline player
- Display video title and channel in preview mode
- Add "Close Preview" functionality to return to gallery view
- Implement fallback to YouTube embed iframe if segment download failed (download_status = 'error')
- Add keyboard shortcuts (Space = play/pause, Esc = close preview)
- Optimize video loading (lazy load segments, preload on hover)

**Acceptance Criteria:**
- Clicking a suggestion card opens video preview player
- **Default Segment Playback (Epic 3 Story 3.6):** Video plays downloaded segment from `.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`
- **Instant Playback (PRD Feature 1.5 AC7):** Video starts immediately without additional downloads
- Play/pause, progress bar, and volume controls functional
- **Fallback for Failed Downloads:** If default_segment_path is NULL or download_status = 'error', player embeds YouTube iframe instead
- Keyboard shortcuts work (Space = play/pause, Esc = close)
- Multiple previews can be watched sequentially (no need to reload page)
- Video player responsive and works on desktop and tablet

**References:**
- PRD Feature 1.6 AC1 (Scene and Clip Display) lines 263-266
- PRD Feature 1.5 AC7 (Instant Preview) lines 239-242
- Epic 3 Story 3.6 (default segment download) lines 812-867

---

#### Story 4.4: Clip Selection Mechanism & State Management
**Goal:** Allow users to select exactly one video clip per scene and persist selections

**Tasks:**
- Implement clip selection logic in curation-store.ts (Zustand state management)
- Add visual selection indicator (checkmark, border highlight, or "Selected" badge) to chosen clip
- Enforce one selection per scene (selecting new clip deselects previous)
- Persist selections in state during session
- Create POST /api/projects/[id]/select-clip endpoint to save selections to database
- Add selected_clip_id column to scenes table (foreign key to visual_suggestions)
- Update selection state immediately on user click (optimistic UI update)
- Save selection to database asynchronously
- Display selection count progress (e.g., "3/5 scenes selected")

**Acceptance Criteria:**
- Clicking a suggestion card marks it as "Selected" with visual indicator (checkmark icon, blue border)
- Selecting a different clip for the same scene deselects the previous one automatically
- Selection state persists during page session (stored in Zustand store)
- POST /api/projects/[id]/select-clip saves selection to database (scenes.selected_clip_id)
- Selection count indicator displays: "Scenes Selected: 3/5" at top of page
- Optimistic UI update (selection appears immediately, saved in background)
- Error handling: if save fails, show toast notification and revert UI state
- All scenes default to "No selection" state initially

**References:**
- PRD Feature 1.6 AC2 (Clip Selection) lines 267-270
- Epic 2 Story 2.2 (scenes table schema) lines 372-396

---

#### Story 4.5: Assembly Trigger & Validation Workflow
**Goal:** Provide "Assemble Video" button that validates all selections and triggers video assembly

**Tasks:**
- Create AssemblyTrigger.tsx component with "Assemble Video" button
- Implement selection validation (check all scenes have selected_clip_id)
- Disable button if incomplete selections (show tooltip: "Select clips for all X scenes")
- Enable button only when all scenes have selections
- Add confirmation modal: "Ready to assemble? This will create your final video with the selected clips."
- Create POST /api/projects/[id]/assemble endpoint to trigger Epic 5 assembly process
- Update projects.current_step = 'editing' (or 'export') when assembly starts
- Display assembly progress indicator (placeholder for Epic 5 implementation)
- Navigate to assembly status page after trigger
- Implement error handling for assembly trigger failures

**Acceptance Criteria:**
- "Assemble Video" button displays at bottom of page (sticky footer)
- **Incomplete Selection (PRD Feature 1.6 AC4):** Button disabled if any scene missing selection, tooltip shows: "Select clips for all 5 scenes to continue"
- **Complete Selection (PRD Feature 1.6 AC3):** Button enabled when all scenes have selections
- Clicking enabled button shows confirmation modal with scene count and selections summary
- **Assembly Trigger (PRD Feature 1.6 AC3):** Confirming modal calls POST /api/projects/[id]/assemble with complete scene data:
  - scene_number, script text, selected clip video_id, voiceover audio_file_path, clip duration
- Assembly endpoint updates projects.current_step and returns assembly job ID
- User navigated to assembly status/progress page (placeholder until Epic 5)
- Error toast displays if assembly trigger fails
- Button shows loading spinner while assembly request processes

**References:**
- PRD Feature 1.6 AC3 (Finalization Trigger) lines 271-274
- PRD Feature 1.6 AC4 (Incomplete Selection Prevention) lines 275-277
- Epic 5 (Video Assembly & Output) lines 893-917

---

#### Story 4.6: Visual Curation Workflow Integration & Error Recovery
**Goal:** Integrate visual curation page into project workflow with error recovery and edge case handling

**Tasks:**
- Update project navigation flow: Voiceover Preview (Epic 2) → Visual Sourcing (Epic 3) → Visual Curation
- Implement "Continue to Visual Curation" button in Epic 2 Story 2.6 script preview
- Add direct navigation to visual curation from project page if projects.current_step = 'visual-curation'
- Implement "Back to Script Preview" navigation for users to review script again
- Add "Regenerate Visuals" option to re-run Epic 3 visual sourcing if unsatisfied with suggestions
- Implement session persistence: save scroll position and preview state in localStorage
- Add project save reminder if user navigates away with incomplete selections
- Handle edge cases: script modified after visual sourcing, deleted suggestions, missing audio files
- Implement progress tracking in projects table (current_step workflow validation)

**Acceptance Criteria:**
- After Epic 2 voiceover generation, "Continue to Visual Curation" button appears and navigates to /projects/[id]/visual-curation
- Direct URL access to /projects/[id]/visual-curation works if projects.current_step = 'visual-curation'
- If user accesses page with wrong workflow step (e.g., current_step = 'voice'), redirect to correct step with warning
- "Back to Script Preview" link navigates to Epic 2 Story 2.6 preview page
- "Regenerate Visuals" button triggers POST /api/projects/[id]/generate-visuals (Epic 3 Story 3.5)
- Scroll position and open preview state persist across page reloads (localStorage)
- Warning modal appears if user navigates away with incomplete selections: "You haven't selected clips for all scenes. Progress will be saved."
- Edge case handling: if scene has no audio_file_path, display error message with option to regenerate voiceovers
- Breadcrumb navigation shows: Project → Script → Voiceover → Visual Curation

**References:**
- PRD Feature 1.6 (Visual Curation UI) lines 244-277
- Epic 2 Story 2.6 (Script Preview) lines 530-558
- Epic 3 Story 3.5 (Workflow Integration) lines 758-809

---

## Epic 5: Video Assembly & Output

**Goal:** Automatically combine user selections into a final, downloadable video file with synchronized audio and visuals.

**Features Included:**
- 1.6. Automated Video Assembly
- 1.7. Automated Thumbnail Generation

**User Value:** Creators receive a complete, share-ready video package without needing video editing skills or software.

**Story Count Estimate:** 4-5 stories

**Dependencies:**
- Epic 2 (voiceover files)
- Epic 4 (user's clip selections)

**Acceptance:**
- Videos assemble in correct scene order
- Audio syncs perfectly with visuals
- Clips trim to match voiceover duration
- Output is standard MP4 format
- Thumbnail generates with title and relevant imagery
- Both video and thumbnail are downloadable

---

### Epic 5 Stories

#### Story 5.1: Video Processing Infrastructure Setup
**Implements:** FR-7.01, FR-7.05

**Goal:** Set up FFmpeg-based video processing infrastructure for video assembly operations

**Tasks:**
- Install and configure FFmpeg as system dependency
- Create VideoProcessor service class (lib/video/processor.ts)
- Implement FFmpeg command builder utility for common operations
- Create video processing queue for managing assembly jobs
- Implement job status tracking (pending, processing, complete, error)
- Add database schema for assembly jobs (assembly_jobs table)
- Create POST /api/projects/[id]/assemble endpoint to initiate assembly
- Implement error handling for FFmpeg failures (codec issues, file not found, etc.)
- Add logging for video processing operations
- Create temporary file management for intermediate outputs

**Acceptance Criteria:**
- FFmpeg installed and accessible via system PATH
- VideoProcessor service successfully initializes
- Assembly job created in database when POST /api/projects/[id]/assemble called
- Job status updates correctly: pending → processing → complete (or error)
- FFmpeg commands execute successfully for basic operations (probe, trim, concat)
- Error messages provide actionable guidance (e.g., "FFmpeg not found - install FFmpeg and add to PATH")
- Temporary files cleaned up after processing completes
- Assembly endpoint validates all scenes have selected clips before starting

**References:**
- PRD Feature 1.7 (Automated Video Assembly) lines 346-369
- PRD FR-7.01 (Receive scene data)
- PRD FR-7.05 (Render to MP4)
- Epic 4 Story 4.5 (Assembly trigger)

---

#### Story 5.2: Scene Video Trimming & Preparation
**Implements:** FR-7.02

**Goal:** Trim selected video clips to match voiceover duration for each scene

**Tasks:**
- Create trimVideo() function in VideoProcessor service
- Load scene data from database (selected_clip_id, audio duration)
- For each scene, retrieve the selected video segment from cache
- Calculate trim points based on voiceover audio duration
- Execute FFmpeg trim command: `ffmpeg -i input.mp4 -t {duration} -c copy output.mp4`
- Handle edge cases: video shorter than audio (loop or extend), video much longer (trim from start)
- Save trimmed clips to temporary directory with scene identification
- Update assembly job progress (e.g., "Trimming scene 2/5...")
- Implement parallel trimming for performance (max 3 concurrent)
- Add validation that trimmed clip duration matches audio duration (±0.5s tolerance)

**Acceptance Criteria:**
- Given scene with 10s voiceover and 30s video clip, system trims video to exactly 10 seconds
- Trimmed clips saved to temp directory: `.cache/assembly/{jobId}/scene-{n}-trimmed.mp4`
- All scenes trimmed before proceeding to concatenation
- Progress indicator shows current scene being trimmed
- **Edge case - short video:** If video is shorter than audio, system either loops video or extends final frame
- **Edge case - missing video:** If selected clip file missing, assembly fails with clear error message
- Trimming completes within 30 seconds per scene for typical clip lengths
- Video quality preserved (no re-encoding unless necessary)

**References:**
- PRD Feature 1.7 AC1 (Successful Video Assembly) lines 355-369
- PRD FR-7.02 (Trim clips to voiceover duration)
- Epic 3 Story 3.6 (Downloaded segments in cache)

---

#### Story 5.3: Video Concatenation & Audio Overlay
**Implements:** FR-7.03, FR-7.04, FR-7.06

**Goal:** Concatenate trimmed scenes and overlay voiceover audio to create final video

**Tasks:**
- Create concatenateScenes() function in VideoProcessor service
- Generate FFmpeg concat demuxer file listing all trimmed clips in order
- Execute FFmpeg concat command to join all scenes into single video
- Create overlayAudio() function for voiceover integration
- For each scene, overlay corresponding voiceover audio onto video track
- Ensure audio/video synchronization (voiceover starts at scene start)
- Handle audio format conversion if needed (MP3 → AAC for MP4 container)
- Render final output as H.264 MP4 with AAC audio
- Save final video to output directory: `public/videos/{projectId}/final.mp4`
- Update project record with final video path and duration
- Update assembly job status to 'complete'

**Acceptance Criteria:**
- Given 3 trimmed scenes (5s, 7s, 8s), final video is exactly 20 seconds
- Scenes appear in correct order (Scene 1 → Scene 2 → Scene 3)
- Voiceover audio plays in sync with corresponding scene visuals
- **Audio sync test:** Voiceover words align with scene timing (no drift)
- Final video format: H.264 video codec, AAC audio codec, MP4 container
- Final video saved to `public/videos/{projectId}/final.mp4`
- Project record updated with video_path and total_duration
- Assembly job marked as 'complete' with completion timestamp
- Final video playable in standard video players (VLC, browser)
- Video file size reasonable for duration (approximately 5-10 MB per minute at 720p)

**References:**
- PRD Feature 1.7 (Automated Video Assembly) lines 346-369
- PRD FR-7.03 (Concatenate clips in order)
- PRD FR-7.04 (Overlay voiceover audio)
- PRD FR-7.06 (Make video available for download)

---

#### Story 5.4: Automated Thumbnail Generation
**Implements:** FR-8.01, FR-8.02, FR-8.03, FR-8.04, FR-8.05

**Goal:** Generate eye-catching thumbnail with title text overlay

**Tasks:**
- Create ThumbnailGenerator service class (lib/video/thumbnail.ts)
- Implement frame extraction from video using FFmpeg
- Select compelling frame: analyze multiple candidates (10%, 30%, 50%, 70% duration)
- Score frames based on visual interest (contrast, color variance, face detection optional)
- Create title text overlay using Canvas API or ImageMagick
- Design text styling: large readable font, contrasting outline/shadow, positioned for visibility
- Ensure text doesn't obscure key visual elements (position in upper or lower third)
- Render final thumbnail at 1920x1080 (16:9 aspect ratio)
- Save as high-quality JPEG: `public/videos/{projectId}/thumbnail.jpg`
- Update project record with thumbnail_path
- Add POST /api/projects/[id]/generate-thumbnail endpoint (auto-triggered after video assembly)

**Acceptance Criteria:**
- Thumbnail generated automatically after video assembly completes
- Frame selected from assembled video (not arbitrary scene)
- **Title text:** Video title displayed prominently and legibly
- **Text styling:** High contrast (white text with black outline or similar)
- **Positioning:** Text in upper or lower third, not covering center of frame
- Thumbnail dimensions: exactly 1920x1080 pixels (16:9)
- File format: JPEG with quality 85+
- Thumbnail saved to `public/videos/{projectId}/thumbnail.jpg`
- Project record updated with thumbnail_path
- Thumbnail visually appealing and suitable for YouTube/social media
- Generation completes within 10 seconds

**References:**
- PRD Feature 1.8 (Automated Thumbnail Generation) lines 370-393
- PRD FR-8.01 to FR-8.05 (Thumbnail requirements)

---

#### Story 5.5: Export UI & Download Workflow
**Implements:** FR-7.06, FR-8.05

**Goal:** Display completed video and thumbnail with download options

**Tasks:**
- Create ExportPage.tsx component at /projects/[id]/export
- Display video player with final assembled video
- Display generated thumbnail preview
- Add "Download Video" button that saves to user's Downloads folder
  - Filename format: `{video-title}.mp4` (sanitized for filesystem)
- Add "Download Thumbnail" button linking to thumbnail file
- Show video metadata: duration, file size, resolution
- Show project summary: topic, scene count, voice used
- Add "Create New Video" button to start fresh project
- Add "Back to Visual Curation" for re-selection if needed
- Implement loading state during assembly (show progress from job status)
- Update project workflow: current_step = 'complete' after export page viewed
- Add share-ready copy for social media (title, description suggestion)

**Acceptance Criteria:**
- Export page displays after assembly completes (projects.current_step = 'export')
- Video player shows final assembled video with playback controls
- Thumbnail preview displays at appropriate size
- "Download Video" button saves MP4 to user's Downloads folder with sanitized filename (e.g., "mars-colonization.mp4")
- "Download Thumbnail" button downloads JPEG file
- Video metadata displayed: "Duration: 2:34 | Size: 45 MB | Resolution: 1280x720"
- Loading state shows assembly progress: "Assembling video... Trimming scenes (2/5)"
- Error state shows if assembly failed with retry option
- "Create New Video" navigates to home/new project
- Project marked as 'complete' in database
- Page is shareable (direct URL access works if assembly complete)

**References:**
- PRD Feature 1.7 AC2 (Download Availability) lines 366-369
- PRD Feature 1.8 AC1 (Thumbnail Generation) lines 384-393
- Epic 4 Story 4.5 (Assembly trigger flow)

---

## Epic Summary

| Epic | Name | Stories | Dependencies | Phase |
|------|------|---------|--------------|-------|
| 1 | Conversational Topic Discovery + Persona System | 8 | None | Foundation |
| 2 | Content Generation Pipeline + Voice Selection | 6 | Epic 1 | Core |
| 3 | Visual Content Sourcing (YouTube API + Duration Filtering + Segment Downloads + Advanced CV Filtering) | 9 | Epic 2 | Core |
| 4 | Visual Curation Interface | 6 | Epic 2, 3 | Core |
| 5 | Video Assembly & Output | 5 | Epic 2, 4 | Delivery |

**Total Stories:** 34 stories

**Notes:**
- Epic 1 includes Story 1.8 for the unified persona system (Feature 1.9) with 4 preset personas
- Epic 3 includes Stories 3.2b, 3.7, and 3.7b for advanced CV content filtering
- Story 2.4 uses the project's selected persona for script generation style

**Recommended Development Order:**
1. Epic 1 → Epic 2 → Epic 3 → Epic 4 → Epic 5

**Critical Path:** All epics are sequential and required for MVP functionality.

---

## Future Epics (Post-MVP)

Based on PRD Section 2 (Future Enhancements):

- **Epic 6:** Advanced Editing & Customization (script editing in UI, voiceover regeneration per scene, voice switching)
- **Epic 7:** Enhanced Visual Control (manual search within UI, text overlays)
- **Epic 8:** Stock Footage API Integration (Pexels, Pixabay as alternative/supplementary sources to YouTube)
- **Epic 9:** Custom Persona Creation (user-defined personas, persona import/export, advanced LLM settings)

**Notes:**
- Voice selection moved from Epic 6 to MVP Epic 2
- Preset persona system moved from Epic 9 to MVP Epic 1 (Story 1.8)

### Epic 8 Details (Post-MVP)

**Goal:** Add professional stock footage sources as alternatives or supplements to YouTube content.

**Technical Approach:**
- Integrate Pexels API for high-quality stock video clips
- Integrate Pixabay API for additional royalty-free content
- Implement source selection/priority system (YouTube vs stock footage)
- Allow mixed sourcing (some scenes from YouTube, others from stock)

**User Value:** Access to professional, commercial-grade stock footage for creators who need more polished visuals or want to avoid YouTube-specific licensing concerns.

**Story Estimate:** 3-4 stories per API integration
