# AI Video Generator - Development Epics

*This document organizes the PRD features into logical development epics for the AI Video Generator MVP.*

**Project:** AI Video Generator (Level 2)
**Last Updated:** 2025-11-01

---

## Epic 1: Conversational Topic Discovery

**Goal:** Enable users to brainstorm and finalize video topics through natural conversation with an AI agent.

**Features Included:**
- 1.1. Conversational AI Agent
- 2.6. LLM Configuration & System Prompts (MVP: Default persona only; Post-MVP: UI configuration)

**User Value:** Creators can explore ideas naturally and receive AI guidance to refine their video topics before production begins. The AI assistant adapts its personality and behavior to match different content creation workflows.

**Story Count Estimate:** 4-5 stories (MVP), +3 stories (Post-MVP UI)

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
- Passed through LLM provider abstraction layer
- Applied consistently across all conversations

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
- Install core dependencies: zustand@5.0.8, better-sqlite3@12.4.1, ollama@0.6.2
- Set up project structure (app/, components/, lib/, stores/, types/)
- Configure environment variables (.env.local)
- Verify Ollama is running at localhost:11434

**Acceptance Criteria:**
- Next.js development server runs successfully
- All dependencies installed without errors
- Project structure follows architecture.md patterns
- Ollama connection can be verified

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
**Goal:** Implement LLM provider abstraction layer with Ollama integration

**Tasks:**
- Create LLMProvider interface (lib/llm/provider.ts)
- Implement OllamaProvider class (lib/llm/ollama-provider.ts)
- Create provider factory function (lib/llm/factory.ts)
- Implement DEFAULT_SYSTEM_PROMPT (lib/llm/prompts/default-system-prompt.ts)
- Add error handling for Ollama connection failures

**Acceptance Criteria:**
- LLMProvider interface defines chat() method
- OllamaProvider successfully calls Ollama API at localhost:11434
- System prompt prepended to all chat requests
- Factory returns OllamaProvider based on environment configuration
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

#### Story 1.6: Topic Confirmation Workflow
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
| 1 | Conversational Topic Discovery | 3-4 | None | Foundation |
| 2 | Content Generation Pipeline + Voice Selection | 5-6 | Epic 1 | Core |
| 3 | Visual Content Sourcing (YouTube API) | 4-5 | Epic 2 | Core |
| 4 | Visual Curation Interface | 5-6 | Epic 2, 3 | Core |
| 5 | Video Assembly & Output | 4-5 | Epic 2, 4 | Delivery |

**Total Estimated Stories:** 21-27 stories

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
