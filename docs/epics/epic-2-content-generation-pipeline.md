# Epic 2: Content Generation Pipeline

**Goal:** Automatically generate complete video scripts with scene structure and corresponding voiceovers with user's choice of voice.

**Features Included:**
- 1.2. Automated Script Generation
- 1.3. Automated Voiceover
- 2.1. Voice Selection (moved to core features)

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
- Option to change voice later (future enhancement)

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
  - **Scene count:** 3-5 scenes
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
