# AI Video Generator - Development Epics

*This document organizes the PRD features into logical development epics for the AI Video Generator MVP.*

**Project:** AI Video Generator (Level 2)
**Repository:** https://github.com/AIfriendly/AIvideogen
**Last Updated:** 2025-11-01

---

## Epic 1: Conversational Topic Discovery

**Goal:** Enable users to brainstorm and finalize video topics through natural conversation with an AI agent.

**Features Included:**
- 1.1. Conversational AI Agent
- 2.6. LLM Configuration & System Prompts (MVP: Ollama + Gemini providers, Default persona; Post-MVP: UI configuration)

**User Value:** Creators can explore ideas naturally and receive AI guidance to refine their video topics before production begins. The AI assistant adapts its personality and behavior to match different content creation workflows. Users can choose between local Ollama (FOSS) or cloud-based Gemini (free tier) providers.

**Story Count Estimate:** 7 stories (MVP: Stories 1.1-1.7), +3 stories (Post-MVP UI)

**Dependencies:** None (foundational epic)

**Acceptance:**
- Users can have multi-turn conversations about video ideas
- Agent maintains context across conversation
- Agent behavior follows configured system prompt/persona
- Users can trigger video creation with explicit command
- Topic confirmation workflow works correctly
- (Post-MVP) Users can select or create custom personas via UI

### System Prompt/Persona Configuration (Epic 1)

**MVP Implementation:**

**Default Persona:**
- Hardcoded "Creative Assistant" system prompt in codebase
- Unrestricted, enthusiastic brainstorming assistant
- No topic restrictions or hedging behavior
- Focused on actionable, creative video ideas
- Maintains conversation context automatically

**Technical Implementation:**
- System prompt prepended to all LLM chat requests
- Stored as constant in `lib/llm/prompts/default-system-prompt.ts`
- Passed through LLM provider abstraction layer (supports Ollama and Gemini)
- Applied consistently across all conversations
- Provider selection via .env.local: LLM_PROVIDER=ollama|gemini

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

**Post-MVP Enhancement:**

**Preset Persona Library:**
1. **Creative Assistant (Default)** - Unrestricted general brainstorming
2. **Viral Content Strategist** - Focus on engagement, hooks, algorithmic performance
3. **Educational Content Designer** - TED-Ed style, learning-focused narratives
4. **Documentary Filmmaker** - Human stories, emotional arcs, interview angles

**Custom Persona Creation:**
- Settings UI for creating custom system prompts
- Full control over personality, tone, constraints, goals
- Save unlimited custom personas to database
- Preview current prompt before saving

**Per-Project Persona Override:**
- Select different persona for each project type
- Example: "Viral Strategist" for entertainment, "Educational Designer" for science videos
- Persona selection stored in project metadata
- Consistent behavior throughout project lifecycle

**Database Schema:**
```sql
CREATE TABLE system_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  is_preset BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TEXT,
  updated_at TEXT
);

ALTER TABLE projects ADD COLUMN system_prompt_id TEXT REFERENCES system_prompts(id);
```

**UI Components (Post-MVP):**
- Settings page: Select default persona, create custom prompts
- Project settings: Override persona per project
- Prompt preview: View active system prompt
- Audio preview equivalence: Quick persona switching like voice selection

**Benefits:**
- ✅ Full control over AI behavior (local Ollama = no restrictions)
- ✅ Adapt assistant to different video genres/workflows
- ✅ Transparent behavior (users see exact system prompt)
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
- Research and select FOSS TTS engine (kokproTTS)
- Install and configure TTS engine dependencies
- Create voice profile data structure (lib/tts/voice-profiles.ts)
- Generate preview audio samples for each voice profile
- Implement TTS provider abstraction layer (lib/tts/provider.ts)
- Create audio file storage structure and naming convention
- Add error handling for TTS service failures

**Acceptance Criteria:**
- TTS engine successfully installed and accessible via API
- At least 3-5 distinct voice profiles defined with metadata (name, gender, accent, tone)
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

#### Story 2.4: LLM-Based Script Generation (Professional Quality)
**Goal:** Generate professional, human-quality video scripts that are engaging, authentic, and indistinguishable from professional scriptwriter output

**Tasks:**
- Create advanced script generation prompt template (lib/llm/prompts/script-generation-prompt.ts) with professional scriptwriting principles
- **Design prompt with strict quality requirements:**
  - **Professional scriptwriting standards:** Compelling hooks, storytelling techniques, strong pacing
  - **Topic-adaptive tone:** Documentary style for serious topics, conversational for tutorials, engaging for entertainment
  - **Human authenticity:** Natural language, varied sentence structure, personality, avoid AI tells
  - **Narrative techniques:** Strong openings (no "In today's video..."), smooth transitions, emotional resonance
  - **Banned AI phrases:** Reject generic phrases like "Moving on", "It's important to note", "Let's explore", "In conclusion"
  - **Engagement elements:** Rhetorical questions, vivid descriptions, relatable examples, conversational tone
  - **Output format:** Structured JSON with scene breakdown
  - **Text cleanliness:** ONLY spoken narration text - no markdown, scene labels, titles, or formatting
- **Create quality validation function (lib/llm/validate-script-quality.ts):**
  - Check for AI detection markers (generic openings, robotic transitions, overly formal language)
  - Validate narrative flow and pacing
  - Ensure topic-appropriate tone
  - Reject scripts that sound robotic or bland
- **Implement topic-based tone mapping:** Analyze topic to determine appropriate style (educational, documentary, entertainment, tutorial)
- Implement POST /api/projects/[id]/generate-script endpoint
- Load confirmed topic from projects.topic field
- Call LLM provider with professionally-tuned script generation prompt
- Parse LLM response and validate JSON structure
- **Run quality validation before accepting script - retry if quality check fails**
- Validate each scene text is TTS-ready (no markdown characters, no meta-labels like "Scene:", "Title:")
- Save scenes to database (scenes table) with scene_number and text
- Update projects.script_generated = true and current_step = 'voiceover'
- Add retry logic for LLM failures, invalid responses, or quality check failures (max 3 attempts)
- Implement scene count optimization (aim for 3-5 scenes for MVP)

**Acceptance Criteria:**
- Script generation endpoint accepts projectId as input
- LLM generates structured script with 3-5 scenes minimum
- Each scene has scene_number (sequential) and text (50-200 words)
- Scene text contains ONLY spoken narration (no markdown *, #, **, no "Scene 1:", no meta-text)
- **Scripts sound professional and human-written, NOT AI-generated**
- **Scripts avoid generic AI phrases ("In today's video", "Moving on", "It's important to note", "Let's explore")**
- **Scripts use topic-appropriate tone (documentary, educational, conversational, etc.)**
- **Scripts have strong narrative hooks (no boring openings)**
- **Scripts use natural, varied language with personality**
- **Quality validation rejects robotic or bland scripts**
- Scenes saved to database in correct order
- Script generation handles various topic types (educational, entertainment, tutorials, documentary)
- Invalid or low-quality LLM responses trigger retry with improved prompt (max 3 attempts)
- Validation rejects scenes containing markdown or formatting characters
- Projects.script_generated flag updated on success

**Quality Examples:**

❌ **Bad (AI-sounding):**
"In today's video, we'll explore the fascinating world of Mars colonization. It's important to note that Mars is the fourth planet from the sun. Moving on to the next point, let's discuss the challenges of space travel."

✅ **Good (Professional):**
"Picture this: A million humans living on Mars by 2050. Sounds like science fiction, right? But SpaceX and NASA are betting everything on making it reality. The red planet, once just a distant dream, is now humanity's next home. Here's how we're actually going to pull it off."

**References:**
- PRD Feature 1.2 (Automated Script Generation) lines 78-102
- PRD Feature 1.2 AC1-AC2 lines 94-102
- Epic 1 Story 1.3 (LLM Provider pattern) lines 141-162

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

**Goal:** Intelligently source and suggest relevant B-roll footage for each script scene using YouTube as the primary content source.

**Features Included:**
- 1.4. AI-Powered Visual Sourcing (YouTube API Integration)

**User Value:** Creators save hours of manual footage searching by receiving AI-curated visual suggestions from YouTube's massive content library, including gaming footage, tutorials, nature content, and more.

**Technical Approach:**
- Primary Source: YouTube Data API v3
- Search queries generated from scene text analysis
- Filter for appropriate licensing (Creative Commons when possible)
- Support for niche content (gaming, tutorials, vlogs, etc.)
- Handle YouTube API quotas and rate limiting

**Story Count Estimate:** 4-5 stories

**Dependencies:**
- Epic 2 (needs script structure as input)

**Acceptance:**
- System analyzes scene text for visual themes
- Queries YouTube API successfully with relevant search terms
- Returns multiple relevant video clip options per scene
- Handles various content types (general footage, gaming, educational)
- Respects YouTube API quotas and implements appropriate error handling
- Suggestion quality meets user expectations

---

## Epic 4: Visual Curation Interface

**Goal:** Provide an intuitive UI for creators to review scripts, preview suggested clips, and finalize visual selections.

**Features Included:**
- 1.5. Visual Curation UI

**User Value:** Creators maintain creative control through an easy-to-use interface for selecting the perfect visuals.

**Story Count Estimate:** 5-6 stories

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

## Epic Summary

| Epic | Name | Story Est. | Dependencies | Phase |
|------|------|------------|--------------|-------|
| 1 | Conversational Topic Discovery | 7 | None | Foundation |
| 2 | Content Generation Pipeline + Voice Selection | 5-6 | Epic 1 | Core |
| 3 | Visual Content Sourcing (YouTube API) | 4-5 | Epic 2 | Core |
| 4 | Visual Curation Interface | 5-6 | Epic 2, 3 | Core |
| 5 | Video Assembly & Output | 4-5 | Epic 2, 4 | Delivery |

**Total Estimated Stories:** 26-29 stories

**Recommended Development Order:**
1. Epic 1 → Epic 2 → Epic 3 → Epic 4 → Epic 5

**Critical Path:** All epics are sequential and required for MVP functionality.

---

## Future Epics (Post-MVP)

Based on PRD Section 2 (Future Enhancements):

- **Epic 6:** Advanced Editing & Customization (script editing in UI, voiceover regeneration per scene, voice switching)
- **Epic 7:** Enhanced Visual Control (manual search within UI, text overlays)
- **Epic 8:** Stock Footage API Integration (Pexels, Pixabay as alternative/supplementary sources to YouTube)
- **Epic 9:** LLM Configuration & Flexibility (BYOK, local LLM support, provider selection)

**Note:** Voice selection was originally planned for Epic 6 but has been moved into MVP Epic 2.

### Epic 8 Details (Post-MVP)

**Goal:** Add professional stock footage sources as alternatives or supplements to YouTube content.

**Technical Approach:**
- Integrate Pexels API for high-quality stock video clips
- Integrate Pixabay API for additional royalty-free content
- Implement source selection/priority system (YouTube vs stock footage)
- Allow mixed sourcing (some scenes from YouTube, others from stock)

**User Value:** Access to professional, commercial-grade stock footage for creators who need more polished visuals or want to avoid YouTube-specific licensing concerns.

**Story Estimate:** 3-4 stories per API integration
