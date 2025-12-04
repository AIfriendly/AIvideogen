# Product Requirements Document (PRD): AI Video Generator

*This document outlines the requirements for the AI Video Generator. It is a living document and will be updated as the project progresses.*

**Last Updated:** 2025-12-03
**Version:** 3.3
**Repository:** <https://github.com/AIfriendly/AIvideogen>

**Project Type:** Web Application
**Domain:** Content Creation
**Complexity:** Level 2 (BMad Method)
**Status:** Core Features Complete - Enhancement Phase

**Recent Changes (v3.3 - 2025-12-03):**
- Expanded Feature 1.11 from basic metadata generation to full SEO Toolkit
- Added 7 sub-components: Core Metadata, Keyword Research, Title Optimizer, Smart Tag Generation, Best Time to Post, Video Score/Audit, Thumbnail A/B Testing
- Added 25 new functional requirements (FR-11.09 through FR-11.33)
- Added 5 new acceptance criteria (AC4-AC8)
- VidIQ-style intelligence features for video discoverability
- Added Quick Production Flow to Feature 2.7 (RAG): one-click video creation from topic suggestions
- Added 8 new FRs (FR-2.7.QPF.01-08) and 4 new ACs (AC-QPF.1-4) for Quick Production Flow

**Previous Changes (v3.2 - 2025-12-01):**
- Added Feature 1.14: Unified API Usage Dashboard
- Dedicated page at `/settings/api-usage` for all API monitoring
- Tracks Gemini, YouTube Data API, and ElevenLabs usage
- Per-request logging with 7-day history retention
- Warning thresholds at 80% and 95% with global banner alerts
- Consolidates ElevenLabs tracking from Feature 1.13

**Previous Changes (v3.1 - 2025-12-01):**
- Added Feature 1.13: ElevenLabs TTS Integration
- Cloud-based TTS alternative to local Kokoro engine
- Per-project TTS provider selection (Kokoro vs ElevenLabs)
- Separate voice catalogs for each provider
- Usage tracking UI with quota warnings

**Previous Changes (v3.0 - 2025-12-01):**
- **MILESTONE:** Core features (1.1-1.9) complete - transitioned from MVP to Enhancement phase
- Restructured document: "Core Features" (complete) + "Enhancement Features" (in development)
- Removed MVP labels throughout document
- Features 1.10-1.12 now categorized as Enhancement Features

**Previous Changes (v2.3 - 2025-11-30):**
- Added Feature 1.12: Automate Mode - Full Automation Pipeline
- Project-level setting for fully automated video production (topic → export)
- Pre-automation configuration: voice selection + video source provider selection
- Automated visual selection based on relevance ranking (keyword match, cv_score, duration fit)
- Pipeline stages: Script → Voiceover → Visual Sourcing → Auto-Selection → Music → Assembly → Export

**Previous Changes (v2.2 - 2025-11-30):**
- Added Feature 1.11: AI-Generated Video Metadata
- Auto-generates optimized title, description (~150 chars with hashtags), and tags for completed videos
- Platform-specific variants for YouTube and TikTok

**Previous Changes (v2.1 - 2025-11-30):**
- Added Feature 1.10: Automated Background Music
- Multi-track music selection based on video topic and scene mood
- LLM-generated music search queries, YouTube audio download via yt-dlp

**Previous Changes (v2.0 - 2025-11-29):**
- Replaced Feature 2.7 (Topic Research & Web Search) with Channel Intelligence & Content Research (RAG-Powered)

*See version history in git for earlier changes.*

---

## Executive Summary

**Product Vision:** The AI Video Generator transforms video content creation from a multi-hour, multi-tool process into a streamlined 20-minute workflow. Content creators currently face a complex pipeline requiring scriptwriting skills, voiceover recording equipment, hours of B-roll footage searching, and professional video editing software. This system eliminates those barriers by providing an end-to-end AI-powered solution that takes a simple topic idea and produces a complete, share-ready video with professional narration, relevant visuals, and an eye-catching thumbnail.

**Target Users:** This product serves content creators across YouTube, educational platforms, and social media who need to produce high-quality informational videos efficiently. Our primary users include gaming analysts creating strategy guides, educators producing tutorial content, historical content creators, and technical explainers. These creators value production speed and quality but lack the time, budget, or technical skills for traditional video production workflows. The system is designed for solo creators who need to maintain consistent content output without hiring scriptwriters, voice actors, or video editors.

**Key Value Proposition:** The AI Video Generator delivers complete video production automation with a unique local-first, privacy-focused architecture. Unlike cloud-dependent solutions, our system runs primarily on the creator's own hardware using free and open-source (FOSS) technologies—Ollama for local LLM script generation, open-source TTS for voiceover, and YouTube's free API for visual sourcing. Creators who want enhanced quality can optionally leverage cloud services (Google Gemini, Google Cloud Vision API) with generous free tiers, maintaining a hybrid local+cloud approach with zero mandatory subscription costs. This "FOSS-first, cloud-enhanced" philosophy ensures creators maintain privacy, avoid vendor lock-in, and control their entire production pipeline while optionally accessing cutting-edge AI capabilities when needed.

---

## Non-Functional Requirements

### NFR 1: Technology Stack
*   **Requirement:** The system must be implemented using a hybrid local-first and cloud architecture, prioritizing free and open-source (FOSS) technologies for core components.
*   **Rationale:** To ensure the project is accessible, modifiable, and has minimal licensing costs while leveraging cloud services where they provide significant quality improvements.
*   **Implication:** This constrains the choice of services for AI models (LLMs, TTS), stock media providers, and all underlying libraries. Any external service must have a free tier that is sufficient for the project's purposes without requiring payment.
*   **Cloud API Exception:** Cloud APIs with free tiers (e.g., Google Cloud Vision API, Gemini API) are acceptable for non-core processing tasks such as content filtering and quality verification. Users may optionally upgrade to paid tiers for increased quotas and better results. This does not conflict with the FOSS philosophy as the system operates in a hybrid local+cloud model.

---

## Success Criteria

The following measurable criteria define product success:

### User Experience Metrics
- **SC-1:** Users can complete end-to-end video creation (idea → final video) in under 20 minutes
- **SC-2:** At least 70% of AI-suggested video clips are rated "relevant" by users
- **SC-3:** Generated scripts pass human quality review (no obvious AI markers) in 80%+ of cases
- **SC-4:** Voice selection and preview workflow completes in under 60 seconds

### Technical Performance Metrics
- **SC-5:** Script generation completes within 30 seconds
- **SC-6:** Voiceover generation completes within 2 minutes for a 5-scene script
- **SC-7:** Visual sourcing returns suggestions within 60 seconds per scene
- **SC-8:** Video assembly completes within 5 minutes for a 3-minute video

### Reliability Metrics
- **SC-9:** System handles YouTube API quota exhaustion gracefully with user notification
- **SC-10:** System recovers from partial failures (resume capability for incomplete operations)
- **SC-11:** All API integrations implement retry logic with exponential backoff

### Quality Metrics
- **SC-12:** Zero critical bugs in core workflow (topic → script → voice → visuals → assembly)
- **SC-13:** All acceptance criteria for core features pass automated and manual testing

---

## 1. Core Features (Complete)

*Features 1.1-1.9 comprise the core product functionality and are fully implemented.*

### 1.1. Conversational AI Agent

*   **Description:** A chat-based AI assistant that guides the user from initial idea to a concrete video topic, and initiates the video creation process. The system supports multiple concurrent projects, allowing users to manage and switch between different video conversations seamlessly.

*   **User Stories:**
    1.  **As a creator,** I want to discuss my video ideas with an AI agent in a natural conversation, **so that** I can explore different angles and refine my topic before committing to production.
    2.  **As a creator,** I want to give a simple, explicit command to the agent to start the video creation process, **so that** the transition from idea to production is seamless and efficient.
    3.  **As a creator,** I want to create multiple separate project conversations (e.g., one for cooking videos, another for gaming tutorials), **so that** different video ideas remain organized and don't get mixed together.
    4.  **As a creator,** I want to easily switch between my active projects, **so that** I can resume work on any video idea without losing context.
    5.  **As a creator,** I want my project list to automatically name conversations based on their content, **so that** I can quickly identify each project without manual labeling.

*   **Functional Requirements:**
    *   **FR-1.01:** The system shall provide a chat interface for user-agent interaction.
    *   **FR-1.02:** The agent must understand and respond to natural language queries related to brainstorming video topics.
    *   **FR-1.03:** The agent must maintain conversational context to help refine ideas over multiple turns.
    *   **FR-1.04:** The agent must recognize a specific command (e.g., "make a video about [topic]") to trigger the subsequent workflow steps.
    *   **FR-1.05:** The agent must confirm the final topic with the user before proceeding to script generation.
    *   **FR-1.06:** Upon confirmation, the agent must pass the confirmed topic string to be used as the "video title" in subsequent steps.
    *   **Project Management:**
        *   **FR-1.07:** The system shall provide a "New Chat" button to create new projects/conversations.
        *   **FR-1.08:** The system shall display a sidebar listing all projects ordered by most recently active.
        *   **FR-1.09:** The system shall allow users to click any project to load its complete conversation history.
        *   **FR-1.10:** The system shall visually highlight the currently active project.
        *   **FR-1.11:** The system shall auto-generate project names from the first user message (e.g., "Cooking video ideas").
        *   **FR-1.12:** The system shall persist the selected project across page reloads using localStorage.
        *   **FR-1.13:** The system may optionally provide project deletion functionality with user confirmation.

*   **Acceptance Criteria:**
    *   **AC1: Successful Brainstorming Interaction**
        *   **Given** a user initiates a conversation.
        *   **When** the user proposes a broad topic (e.g., "I want to make a video about space exploration").
        *   **Then** the agent should respond with clarifying questions or suggestions to narrow the focus (e.g., "Great! Should we focus on the Apollo missions, the future of Mars colonization, or recent discoveries by the James Webb telescope?").
    *   **AC2: Successful Command Trigger**
        *   **Given** the user has settled on a topic through conversation.
        *   **When** the user issues the command "Okay, make a video about Mars colonization."
        *   **Then** the agent must provide a confirmation message ("Confirming: I will start creating a video about Mars colonization. Is that correct?") and await user approval.
    *   **AC3: Context-Aware Command**
        *   **Given** the user has been discussing "the benefits of intermittent fasting".
        *   **When** the user issues a generic command like "Create the video now."
        *   **Then** the agent should use the conversation's context to confirm the topic ("Understood. Shall I proceed with the video on 'the benefits of intermittent fasting'?").
    *   **AC4: Multiple Project Management**
        *   **Given** a user has created 3 projects: "Cooking recipes", "Gaming tutorials", and "Travel vlogs".
        *   **When** the user clicks on "Gaming tutorials" in the sidebar.
        *   **Then** the chat interface must load only the conversation history for the "Gaming tutorials" project, without mixing messages from other projects.
    *   **AC5: Project Creation and Persistence**
        *   **Given** a user clicks "New Chat".
        *   **When** the user types their first message "Help me brainstorm fitness content".
        *   **Then** a new project is created, automatically named "Help me brainstorm fitness content" (or a truncated version), appears in the sidebar, and persists after page refresh.

### 1.2. Automated Script Generation

*   **Description:** Based on the user-confirmed topic, the system automatically researches and writes a professional-quality video script that sounds human-written, not AI-generated. The script is structured into distinct scenes to facilitate voiceover and visual pairing in later steps. Scripts must be engaging, authentic, and indistinguishable from professional scriptwriter output.

*   **User Stories:**
    1.  **As a creator,** I want the AI to generate a complete and coherent script for my video topic, **so that** I can save time on research and writing.
    2.  **As a creator,** I want the script to be divided into logical scenes, **so that** I can easily review the narrative flow and match visuals to each part of the story.
    3.  **As a creator,** I need scripts that sound professional and human-written, **so that** viewers engage with my content and don't dismiss it as AI-generated.
    4.  **As a creator,** I want scripts with strong narrative hooks and topic-appropriate tone, **so that** viewers are immediately engaged and continue watching.

*   **Functional Requirements:**
    *   **FR-2.01:** The system shall accept a video topic string as input.
    *   **FR-2.02:** The system must generate a script that is factually relevant to the input topic.
    *   **FR-2.03:** The generated script must be segmented into an ordered list of scenes.
    *   **FR-2.04:** Each scene must contain a block of text for the voiceover.
    *   **FR-2.05:** The system must generate scripts that sound professional and factual (NOT robotic, vague, or filler-heavy).
    *   **FR-2.06:** The system must adapt script tone based on topic type (gaming analysis, historical events, technical explanations).
    *   **FR-2.07:** The system must prioritize information density and avoid filler language (subjective adjectives without data, hedging words).
    *   **FR-2.08:** The system must use straightforward, scientific delivery techniques (factual focus, structured information, concrete details).
    *   **FR-2.09:** The system shall validate script quality and reject vague, unfocused, or filler-heavy scripts.
    *   **FR-2.09a:** The system must generate scripts in purely informational style by default (scientific/factual delivery).
    *   **FR-2.09b:** Scripts must prioritize information density over entertainment value.
    *   **FR-2.09c:** Scripts must focus on concrete facts, strategies, and structured information delivery.
    *   **FR-2.10:** The system shall pass the structured script to the visual curation and voiceover generation modules.
    *   **FR-2.11:** The system must support script persona configuration as defined in Feature 1.9 (LLM Configuration & Script Personas).

*   **Acceptance Criteria:**
    *   **AC1: Successful Script Generation**
        *   **Given** the script generation module receives the topic "The benefits of solar power".
        *   **When** the generation process completes.
        *   **Then** the system must produce a structured script containing multiple scenes with professional, engaging narration.
    *   **AC2: Correct Script Structure**
        *   **Given** a script has been generated.
        *   **When** the script is passed to the next module.
        *   **Then** it must be in a structured format, such as a JSON array of objects, with each object containing at least a `scene_number` and `text` key.
    *   **AC3: Purely Informational Quality**
        *   **Given** a generated script for any topic.
        *   **When** the script is reviewed.
        *   **Then** it must deliver purely informational content with factual focus.
        *   **And** it must NOT contain filler language (subjective adjectives without data, hedging words like "obviously", "incredibly", "basically").
        *   **And** it must focus on concrete facts, data, strategies, and structured information.
        *   **And** it must use topic-appropriate style (gaming: mechanics/stats/strategies, historical: dates/causes/timelines, technical: step-by-step explanations).
    *   **AC4: Quality Validation**
        *   **Given** the script generation process produces output.
        *   **When** the system validates script quality.
        *   **Then** vague, unfocused, or filler-heavy scripts must be rejected and regeneration triggered (max 6 attempts).
        *   **And** only scripts meeting informational quality standards (high information density, factual content) are accepted and saved.
    *   **AC5: Preset Persona Selection**
        *   **Given** a user creates or configures a project.
        *   **When** they access project settings.
        *   **Then** they must be able to select from 3-5 preset personas (Scientific Analyst, Blackpill Realist, Documentary Filmmaker, Educational Designer).
        *   **And** the selected persona is saved to `projects.system_prompt_id`.
    *   **AC6: Persona-Based Script Generation**
        *   **Given** a project has a selected persona.
        *   **When** script generation is triggered.
        *   **Then** the system must use the selected persona's system prompt for LLM script generation.
        *   **And** the generated script must reflect the persona's tone and style (e.g., Blackpill Realist produces brutal/pessimistic analysis).

### 1.3. Voice Selection

*   **Description:** Before script generation, users can choose from multiple AI-generated voices to narrate their video, allowing them to match the voice to their content's tone and style.

*   **User Stories:**
    1.  **As a creator,** I want to select from different AI voice options (male, female, different accents), **so that** I can choose a narrator that fits my video's topic and audience.
    2.  **As a creator,** I want to preview voice samples before selecting, **so that** I can hear how each voice sounds before committing to it for my entire video.

*   **Functional Requirements:**
    *   **FR-3.01:** The system shall present a voice selection interface after topic confirmation and before script generation.
    *   **FR-3.02:** The system must provide at least 20 distinct voice options with diverse characteristics (gender, accent, tone).
        *   Gender diversity: 10 female, 10 male voices
        *   Accent diversity: 15 American, 5 British
        *   Tone diversity: Warm, professional, authoritative, friendly, calm, energetic, articulate, gentle, enthusiastic, sophisticated, clear, and more
    *   **FR-3.03:** Each voice option must have a short audio preview sample that users can play.
    *   **FR-3.04:** The system must allow users to select exactly one voice for their video project.
    *   **FR-3.05:** The selected voice must be used consistently for all scene voiceovers in that project.
    *   **FR-3.06:** The system shall store the voice selection as part of the project metadata.
    *   **FR-3.07:** All voice options must use FOSS (free and open-source) TTS engines to comply with NFR 1.

*   **Acceptance Criteria:**
    *   **AC1: Voice Selection UI Display**
        *   **Given** a user has confirmed their video topic.
        *   **When** the system transitions to voice selection.
        *   **Then** the UI must display at least 3 voice options with metadata (name, gender, accent/style).
    *   **AC2: Voice Preview**
        *   **Given** the voice selection UI is displayed.
        *   **When** the user clicks the preview button for a voice option.
        *   **Then** a short audio sample of that voice must play immediately.
    *   **AC3: Voice Selection Persistence**
        *   **Given** a user selects "Voice Option 2" for their project.
        *   **When** the voiceover generation completes for all scenes.
        *   **Then** all scene audio files must use "Voice Option 2" consistently.

### 1.4. Automated Voiceover

*   **Description:** The system uses text-to-speech technology to generate a voiceover for each scene from the automated script using the user's selected voice.

*   **User Stories:**
    1.  **As a creator,** I want the script to be automatically narrated with a clear, natural-sounding voice, **so that** I don't have to record my own voice or hire a voice actor.
    2.  **As a creator,** I want each scene's narration to be a separate audio clip, **so that** it can be synchronized with the visuals for that scene.

*   **Functional Requirements:**
    *   **FR-4.01:** The system shall take the structured script (containing text for each scene) as input.
    *   **FR-4.02:** The system must use the user's selected voice (from Feature 1.3) for generating all voiceovers.
    *   **FR-4.03:** For each scene, the system must generate a corresponding audio file of the spoken text.
    *   **FR-4.04:** The generated audio must be in a standard format (e.g., MP3).
    *   **FR-4.05:** The system must maintain the association between each scene and its generated audio file.

*   **Acceptance Criteria:**
    *   **AC1: Successful Audio Generation**
        *   **Given** a scene with the text "This is a test sentence."
        *   **When** the voiceover generation process runs for that scene.
        *   **Then** an MP3 audio file is created that contains the spoken words "This is a test sentence."
    *   **AC2: Complete Voiceover for Script**
        *   **Given** a script with 3 scenes.
        *   **When** the voiceover process is complete.
        *   **Then** there must be 3 distinct audio files, each corresponding to the text of one of the scenes.

### 1.5. AI-Powered Visual Sourcing

*   **Description:** The system analyzes the script for each scene and sources a list of relevant **pure B-roll** video clips from YouTube using the YouTube Data API v3. Videos are intelligently filtered by duration, content quality, and visual analysis to ensure they're appropriate for the scene length and free of commentary, captions, or reaction content. Default video segments are automatically downloaded (with audio stripped) to enable instant preview without manual segment selection. Google Cloud Vision API provides advanced filtering through face detection, OCR, and content label verification.

*   **User Stories:**
    1.  **As a creator,** I want the AI to automatically find relevant video clips for each scene of my script, **so that** I don't have to spend time searching for stock footage myself.
    2.  **As a creator,** I want to be presented with several visual options for each scene, **so that** I can choose the clip that best fits my narrative.
    3.  **As a creator,** I want videos filtered by duration so they're appropriate for my scene length, **so that** I only see videos that can realistically be used without excessive trimming.
    4.  **As a creator,** I want to instantly preview suggested videos without waiting for downloads, **so that** I can quickly review options and make selections efficiently.
    5.  **As a creator,** I want only pure B-roll footage without commentary, captions, or reaction content, **so that** my videos look professional and cinematic.
    6.  **As a creator,** I want the AI to verify that video content actually matches my script's subject matter, **so that** I get relevant footage, not just keyword matches.

*   **Functional Requirements:**
    *   **FR-5.01:** The system shall take the structured script (with text per scene) as input.
    *   **FR-5.02:** For each scene, the system must analyze the text to determine the visual theme or subject matter.
    *   **FR-5.03:** The system must query the YouTube Data API v3 with relevant search terms based on the analysis.
    *   **FR-5.04:** The system must retrieve a list of suggested YouTube video clips for each scene.
    *   **Enhanced Query Generation:**
        *   **FR-5.05:** The system must detect content type (gaming, historical, conceptual, nature, tutorial) from scene text.
        *   **FR-5.06:** The system must extract specific entities (boss names, historical events, concepts) for targeted searches.
        *   **FR-5.07:** The system must generate platform-optimized YouTube search queries with B-roll quality terms (e.g., "cinematic", "4K", "no commentary", "gameplay only").
        *   **FR-5.08:** The system must automatically inject negative search terms to exclude low-quality content (-reaction, -review, -commentary, -tier list, -vlog).
    *   **Duration Filtering:**
        *   **FR-5.09:** The system must filter video results based on a 1x-3x duration ratio relative to the scene's voiceover duration.
        *   **FR-5.10:** The system must enforce a 5-minute (300 second) maximum duration cap regardless of scene length.
        *   Examples: 10s scene accepts 10s-30s videos; 90s scene accepts 90s-270s videos; 120s scene accepts 120s-300s videos (capped at 5 min).
        *   **FR-5.11:** The system must relax duration thresholds as a fallback if insufficient results are found with strict filtering.
    *   **Pure B-Roll Content Filtering:**
        *   **FR-5.12:** The system must filter out videos with commentary, reaction content, or vlogs based on title/description keywords.
        *   **FR-5.13:** The system must filter titles containing: "reaction", "reacts", "commentary", "my thoughts", "review", "tier list", "ranking", "explained", "vlog".
        *   **FR-5.14:** The system must prioritize videos with B-roll indicators: "stock footage", "cinematic", "4K", "no text", "gameplay only".
    *   **Google Cloud Vision API Integration:**
        *   **FR-5.15:** The system should first analyze YouTube video thumbnails using Vision API to pre-filter candidates before downloading video segments (reduces bandwidth usage and API calls).
        *   **FR-5.16:** The system must extract 3 sample frames from downloaded video segments (at 10%, 50%, 90% duration) for detailed analysis.
        *   **FR-5.17:** The system must use FACE_DETECTION to identify and filter videos with prominent talking heads (face bounding box area >10% of total frame area).
        *   **FR-5.18:** The system must use TEXT_DETECTION (OCR) to identify and filter videos with burned-in captions or text overlays.
        *   **FR-5.19:** The system must use LABEL_DETECTION to verify video content matches scene theme (at least 1 of the top 3 expected labels must be present).
        *   **FR-5.20:** The system must implement graceful fallback to keyword-only filtering when API quota is exceeded.
        *   **FR-5.21:** The system must respect Google Cloud Vision API free tier limits (1,000 units/month). Users may upgrade to paid tier for increased quota.
    *   **Default Segment Download:**
        *   **FR-5.22:** The system must automatically download the first N seconds of each suggested video (where N = scene voiceover duration + 5 second buffer).
        *   **FR-5.23:** Downloads must use appropriate video download tooling with 720p resolution and segment range selection.
        *   **FR-5.24:** The system must strip audio from all downloaded segments.
        *   **FR-5.25:** The system must store downloaded segments in organized cache structure with project and scene identification.
        *   **FR-5.26:** The system must track download status (pending, queued, downloading, complete, error) in the database.
        *   **FR-5.27:** Downloaded segments must be immediately available for preview in the Visual Curation UI without requiring user-triggered downloads.
        *   **FR-5.27a:** CV analysis must automatically trigger after each segment download completes (no manual API call required).
        *   **FR-5.27b:** CV analysis failure must not block download success (graceful degradation - cv_score remains NULL).
        *   **FR-5.27c:** The Visual Curation UI must hide suggestions with cv_score < 0.5 by default.
        *   **FR-5.27d:** Suggestions with cv_score = NULL (not yet analyzed) must remain visible in the UI.
        *   **FR-5.27e:** The UI must display a count of filtered low-quality videos (e.g., "3 low-quality videos filtered").
    *   **FR-5.28:** The system shall implement appropriate filtering (e.g., Creative Commons licensing when possible, content type, duration).
    *   **FR-5.29:** The system must handle YouTube API quotas and rate limits gracefully.
    *   **FR-5.30:** The system must support diverse content types including educational, gaming, nature, tutorials, and general footage.
    *   **FR-5.31:** The system must pass the scene data, along with the suggested clips (YouTube video IDs/URLs, durations, and default segment paths), to the Visual Curation UI.

*   **Acceptance Criteria:**
    *   **AC1: Successful Visual Suggestion**
        *   **Given** a scene with the text "A majestic lion roams the savanna at sunset."
        *   **When** the visual sourcing process runs for that scene.
        *   **Then** the system must retrieve a list of YouTube video clips featuring lions, savannas, or sunsets.
    *   **AC2: Data Structure for Curation UI**
        *   **Given** the visual sourcing is complete for a script.
        *   **When** the data is passed to the Curation UI.
        *   **Then** the data structure for each scene must include the scene text, an array of suggested YouTube video URLs/IDs, video durations, and default segment file paths.
    *   **AC3: API Error Handling**
        *   **Given** the YouTube API rate limit has been exceeded.
        *   **When** the system attempts to query for video clips.
        *   **Then** the system must display an appropriate error message and either retry with exponential backoff or provide fallback options.
    *   **AC4: Duration Filtering**
        *   **Given** a scene with a 30-second voiceover.
        *   **When** the visual sourcing retrieves YouTube videos.
        *   **Then** only videos between 30 seconds (1x) and 90 seconds (3x) must be included in the suggestions.
    *   **AC5: Duration Cap Enforcement**
        *   **Given** a scene with a 180-second (3-minute) voiceover.
        *   **When** duration filtering is applied.
        *   **Then** the maximum accepted video duration must be 300 seconds (5 minutes), NOT 540 seconds (3x ratio).
    *   **AC6: Default Segment Download**
        *   **Given** a scene with an 8-second voiceover and a selected 60-second YouTube video.
        *   **When** the default segment download completes.
        *   **Then** a 13-second video segment (8s + 5s buffer) must be downloaded and available at `.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`.
    *   **AC7: Instant Preview Availability**
        *   **Given** default segments have been downloaded for all suggested videos.
        *   **When** the user opens the Visual Curation UI.
        *   **Then** all video previews must play immediately without requiring additional downloads.
    *   **AC8: Enhanced Query Generation**
        *   **Given** a scene with text "The epic battle against Ornstein and Smough tests every player's skill."
        *   **When** the query generation process runs.
        *   **Then** the search query must include specific entity names ("ornstein smough"), content type terms ("dark souls", "boss fight"), and quality terms ("no commentary", "gameplay only").
    *   **AC9: Pure B-Roll Keyword Filtering**
        *   **Given** YouTube search results for a scene.
        *   **When** content filtering is applied.
        *   **Then** videos with titles containing "reaction", "reacts", "commentary", "review", "tier list", "vlog", or "my thoughts" must be filtered out.
    *   **AC10: Face Detection Filtering**
        *   **Given** a downloaded video segment with a talking head (face bounding box area >10% of total frame area).
        *   **When** Google Cloud Vision API FACE_DETECTION analyzes the frames.
        *   **Then** the video must be filtered out as non-B-roll content.
        *   **Note:** Face area is calculated as (bounding box width × height) / (frame width × height). Multiple faces are summed. The 10% threshold catches "face-in-corner" gaming videos and PIP layouts.
    *   **AC11: Caption/Text Detection**
        *   **Given** a downloaded video segment with burned-in captions or text overlays.
        *   **When** Google Cloud Vision API TEXT_DETECTION analyzes the frames.
        *   **Then** the video must be filtered out or ranked lower than clean B-roll.
    *   **AC12: Content Label Verification**
        *   **Given** a scene about "Russian Revolution" and a video segment.
        *   **When** Google Cloud Vision API LABEL_DETECTION analyzes the frames.
        *   **Then** the video must contain at least 1 of the top 3 expected labels (e.g., "crowd", "military", "historical") to pass verification.
        *   **Note:** Expected labels are generated by the LLM during query generation based on scene content. Videos with 0 matching labels are filtered out or ranked significantly lower.
    *   **AC13: Audio Stripping**
        *   **Given** a video segment is downloaded for preview.
        *   **When** the download process completes.
        *   **Then** the saved .mp4 file must contain no audio track (stripped using FFmpeg -an).
    *   **AC14: API Quota Fallback**
        *   **Given** Google Cloud Vision API quota has been exceeded.
        *   **When** the system attempts CV filtering.
        *   **Then** the system must gracefully fall back to keyword-only filtering without failing the visual sourcing process.

### 1.6. Visual Curation UI
 
*   **Description:** A user interface that presents the generated script scene-by-scene, allowing the user to review the text and select one video clip for each scene from a list of AI-powered suggestions.
 
*   **User Stories:**
    1.  **As a creator,** I want to see the script text for each scene alongside the suggested video clips, **so that** I can make an informed choice about which visual best matches the narration.
    2.  **As a creator,** I want to preview the suggested video clips, **so that** I can see them in motion before making a selection.
    3.  **As a creator,** I want a simple way to confirm my selections for all scenes and trigger the final video assembly, **so that** I can complete the creation process quickly.
 
*   **Functional Requirements:**
    *   **FR-6.01:** The UI must display a list of scenes from the script.
    *   **FR-6.02:** For each scene, the UI must display the corresponding script text.
    *   **FR-6.03:** For each scene, the UI must display a gallery of suggested video clips retrieved by the visual sourcing module.
    *   **FR-6.04:** The UI must allow the user to play/preview each suggested video clip.
    *   **FR-6.05:** The UI must allow the user to select exactly one video clip per scene.
    *   **FR-6.06:** The UI must provide a "Finish" or "Assemble Video" button that becomes active only after a clip has been selected for every scene.
    *   **FR-6.07:** Upon clicking the final button, the system shall send the complete scene data (scene text, selected clip URL, and corresponding voiceover audio file) to the Automated Video Assembly module.
 
*   **Acceptance Criteria:**
    *   **AC1: Scene and Clip Display**
        *   **Given** the system has generated a 3-scene script with 4 suggested clips per scene.
        *   **When** the user opens the Visual Curation UI.
        *   **Then** the UI must display 3 distinct sections, one for each scene, with each section showing the scene's text and its 4 suggested video clips.
    *   **AC2: Clip Selection**
        *   **Given** the user is viewing the suggestions for Scene 1.
        *   **When** the user clicks on the second suggested video clip.
        *   **Then** that clip must be visually marked as "selected" for Scene 1.
    *   **AC3: Finalization Trigger**
        *   **Given** the user has selected one clip for every scene in the script.
        *   **When** the user clicks the "Assemble Video" button.
        *   **Then** the system must trigger the video assembly process with the user's selections.
    *   **AC4: Incomplete Selection Prevention**
        *   **Given** a script has 3 scenes and the user has only selected clips for 2 of them.
        *   **Then** the "Assemble Video" button must be disabled or inactive.
 
### 1.7. Automated Video Assembly
 
*   **Description:** The system takes the user's final selections from the curation UI and assembles them into a single, cohesive video file. It synchronizes the voiceover audio with the corresponding video clips for each scene.
 
*   **User Stories:**
    1.  **As a creator,** I want the system to automatically combine my selected visuals and the generated voiceover, **so that** a final video is created without me needing to use video editing software.
    2.  **As a creator,** I want the final output to be a single, standard video file (e.g., MP4), **so that** I can easily download and share it.
 
*   **Functional Requirements:**
    *   **FR-7.01:** The system shall receive the final scene data from the Visual Curation UI (including voiceover audio file and selected video clip for each scene).
    *   **FR-7.02:** For each scene, the system must trim the selected video clip to match the duration of the corresponding voiceover audio.
    *   **FR-7.03:** The system must concatenate the trimmed video clips in the correct scene order.
    *   **FR-7.04:** The system must overlay the voiceover audio for each scene onto its corresponding video clip.
    *   **FR-7.05:** The system shall render the final combined video into a standard format (e.g., MP4).
    *   **FR-7.06:** The system shall make the final video file available for the user to download.
 
*   **Acceptance Criteria:**
    *   **AC1: Successful Video Assembly**
        *   **Given** a 2-scene project where Scene 1 has a 5-second audio file and Scene 2 has a 7-second audio file.
        *   **When** the assembly process is complete.
        *   **Then** a single MP4 video file is created with a total duration of 12 seconds.
    *   **AC2: Correct Content and Order**
        *   **Given** the assembled video from AC1.
        *   **When** the video is played.
        *   **Then** the first 5 seconds must show the video clip for Scene 1 with the voiceover for Scene 1, immediately followed by the next 7 seconds showing the video clip for Scene 2 with the voiceover for Scene 2.
    *   **AC3: Video Trimming**
        *   **Given** a scene with a 4-second voiceover and a selected 15-second video clip.
        *   **When** the video is assembled.
        *   **Then** only the first 4 seconds of the selected video clip are used for that scene in the final video.

### 1.8. Automated Thumbnail Generation

*   **Description:** The system automatically generates a compelling thumbnail image for the final video, including a relevant background and the video's title.

*   **User Stories:**
    1.  **As a creator,** I want an attractive thumbnail to be automatically generated for my video, **so that** I don't have to spend time creating one myself in a separate tool.
    2.  **As a creator,** I want the thumbnail to include a compelling image and the video's title, **so that** it grabs the attention of potential viewers on platforms like YouTube.

*   **Functional Requirements:**
    *   **FR-8.01:** The system shall use the video's title as text for the thumbnail.
    *   **FR-8.02:** The system shall select a compelling frame from one of the user-selected video clips to use as a background, or generate a new image using an AI model.
    *   **FR-8.03:** The system must overlay the title text onto the background image in a legible and visually appealing way.
    *   **FR-8.04:** The generated thumbnail must be a standard image file (e.g., JPG, PNG) with a 16:9 aspect ratio (e.g., 1920x1080).
    *   **FR-8.05:** The system shall make the final thumbnail file available for the user to download.

*   **Acceptance Criteria:**
    *   **AC1: Successful Thumbnail Generation**
        *   **Given** a video has been generated with the title "The Secrets of Ancient Rome".
        *   **When** the thumbnail generation process runs.
        *   **Then** a 16:9 aspect ratio JPG image is created and made available for download.
    *   **AC2: Thumbnail Content Verification**
        *   **Given** the generated thumbnail from AC1.
        *   **When** the image is viewed.
        *   **Then** it must contain the text "The Secrets of Ancient Rome" and a background image relevant to the topic (e.g., the Colosseum, a Roman statue).

### 1.9. LLM Configuration & Script Personas

*   **Description:** Provide comprehensive control over LLM behavior and configuration:
    *   **System Prompt/Persona Configuration:** Allow users to customize the script generation tone, style, and delivery through configurable personas:
        *   **Preset Personas:** Built-in personas optimized for different content types and ideological frameworks:
            *   **Scientific Analyst** (neutral informational, data-driven, factual delivery)
            *   **Blackpill Realist** (brutal/harsh truths, nihilistic, pessimistic analysis)
                *   **Use Cases:** AI dystopia scenarios, western civilization decline, lookism and dating disadvantages for short/ugly men, blackpill economics (coming economic collapse, mass unemployment, resource scarcity), technological determinism, inevitable societal failures
                *   **Delivery Style:** Unflinching brutality, no sugar-coating or optimistic spin, emphasis on harsh realities and systemic failures, stark language ("collapse", "dystopia", "doomed", "irreversible"), focus on power imbalances and biological/economic determinism
                *   **Tone Characteristics:** Nihilistic framing, elimination of false hope and platitudes, direct confrontation with uncomfortable truths, fatalistic outlook on human agency
            *   **Documentary Filmmaker** (balanced narrative, human stories, investigative journalism)
            *   **Educational Designer** (TED-Ed style, learning-focused, accessible explanations)
        *   **Custom Personas (Future):** UI for creating and saving custom system prompts with full control over tone, restrictions, and delivery style.
        *   **Per-Project Personas:** Ability to select persona on a per-project basis via project settings (e.g., use "Scientific Analyst" for gaming analysis, "Blackpill Realist" for societal critique content).
    *   **Rationale:** Local Ollama deployment provides complete control over LLM behavior without content restrictions or censorship. Gemini offers cloud-based alternative with generous free tier (1,500 requests/day). Script personas ensure the system adapts to different ideological frameworks and content types without imposing editorial bias.
    *   **Core Implementation:**
        *   Ollama (primary, FOSS) and Gemini (optional, cloud) providers implemented ✅
        *   Provider selection via .env.local configuration ✅
        *   **Preset Personas:** 3-5 built-in personas optimized for script generation:
            *   Scientific Analyst (neutral informational, data-driven) ✅
            *   Blackpill Realist (brutal/harsh truths, nihilistic analysis) - **Enhanced with dystopian, lookism, economic collapse use cases**
            *   Documentary Filmmaker (balanced narrative, human stories)
            *   Educational Designer (TED-Ed style, learning-focused)
        *   **Persona Selection UI:** Dropdown in project settings to select persona for script generation
        *   **Per-Project Personas:** Selected persona stored in `projects.system_prompt_id` and used for script generation
        *   Personas stored in `system_prompts` table (database infrastructure already exists)
    *   **Future Enhancements:**
        *   Custom persona creation UI (user-defined system prompts with full editorial control)
        *   Persona editing and deletion interface
        *   Advanced provider configuration UI (API keys, custom endpoints)
        *   Additional preset personas (Optimistic Futurist, Libertarian Analyst, Marxist Critic, etc.)

*   **User Stories:**
    1.  **As a creator,** I want to select different script personas for different content types, **so that** my videos match the appropriate ideological framework and delivery style.
    2.  **As a blackpill content creator,** I want scripts that deliver harsh truths about societal collapse, lookism, and economic dystopia without sugar-coating, **so that** my content authentically represents the blackpill worldview.
    3.  **As a creator,** I want to configure my LLM provider (local Ollama or cloud Gemini), **so that** I have control over privacy, cost, and content restrictions.

*   **Functional Requirements:**
    *   **FR-1.9.01:** The system shall provide a persona selection interface in project settings.
    *   **FR-1.9.02:** The system must store 3-5 preset personas in the `system_prompts` database table.
    *   **FR-1.9.03:** Each persona must include: name, description, system_prompt (LLM instructions), and tone characteristics.
    *   **FR-1.9.04:** The Blackpill Realist persona must support content types: AI dystopia, western collapse, lookism/dating inequality, economic collapse, technological determinism.
    *   **FR-1.9.05:** The Blackpill Realist persona must deliver scripts with: brutal honesty, nihilistic framing, elimination of false hope, focus on systemic failures and power imbalances.
    *   **FR-1.9.06:** Selected persona must be linked to project via `projects.system_prompt_id` foreign key.
    *   **FR-1.9.07:** Script generation must use the selected persona's system prompt when generating content.
    *   **FR-1.9.08:** The system must support both local (Ollama) and cloud (Gemini) LLM providers via configuration.

*   **Acceptance Criteria:**
    *   **AC1: Persona Selection**
        *   **Given** a user creates or edits a project.
        *   **When** they navigate to project settings.
        *   **Then** they must see a dropdown with all available personas (Scientific Analyst, Blackpill Realist, Documentary Filmmaker, Educational Designer).
    *   **AC2: Blackpill Realist Script Generation**
        *   **Given** a user selects "Blackpill Realist" persona and generates a script about "AI will cause mass unemployment".
        *   **When** the script is generated.
        *   **Then** it must use brutal, nihilistic framing with no optimistic spin, emphasize inevitable collapse and systemic failure, and avoid platitudes about retraining or economic resilience.
    *   **AC3: Persona Persistence**
        *   **Given** a user selects "Blackpill Realist" for Project A and "Scientific Analyst" for Project B.
        *   **When** scripts are generated for both projects.
        *   **Then** Project A scripts must use blackpill tone and Project B scripts must use neutral scientific tone.
    *   **AC4: LLM Provider Configuration**
        *   **Given** the system is configured with `LLM_PROVIDER=ollama` or `LLM_PROVIDER=gemini`.
        *   **When** script generation is triggered.
        *   **Then** the system must use the configured provider without errors.

---

## 1b. Enhancement Features (In Development)

*Features 1.10-1.12 are enhancement features currently in development, building on top of the core product.*

### 1.10. Automated Background Music

*   **Description:** The system automatically selects and applies background music that matches the video's topic and mood. Music is sourced via YouTube (yt-dlp) and mixed at reduced volume beneath the voiceover. For longer videos, multiple tracks are selected and transitioned at scene boundaries to maintain variety and engagement.

*   **User Stories:**
    1.  **As a creator,** I want background music automatically added to my video based on its topic, **so that** my videos feel professional without me manually searching for music.
    2.  **As a creator,** I want the music volume balanced beneath my voiceover, **so that** the narration remains clear and the music enhances rather than distracts.
    3.  **As a creator,** I want longer videos to have multiple music tracks, **so that** the audio doesn't feel repetitive over 10+ minute videos.

*   **Functional Requirements:**
    *   **Music Analysis & Search:**
        *   **FR-10.01:** The system shall analyze the confirmed video topic and scene content to determine appropriate music keywords.
        *   **FR-10.02:** The system shall use the LLM to generate music search queries based on topic, mood, and content type (e.g., "military" → "epic military orchestral no copyright", "Dark Souls" → "dark souls ambient soundtrack royalty free").
        *   **FR-10.03:** The system shall append "no copyright", "royalty free", "background music" to all music search queries.
    *   **Multi-Track Selection:**
        *   **FR-10.04:** The system shall determine the number of music tracks based on video duration:
            *   < 2 minutes: 1 track
            *   2-5 minutes: 2 tracks
            *   5-10 minutes: 3-4 tracks
            *   10+ minutes: 4-5 tracks
        *   **FR-10.05:** The system shall use the LLM to generate per-segment music search queries based on scene content and mood progression.
        *   **FR-10.06:** The system shall assign music tracks to scene groups (e.g., scenes 1-2 use track A, scenes 3-4 use track B).
    *   **Music Download:**
        *   **FR-10.07:** The system shall search YouTube for background music using generated keywords.
        *   **FR-10.08:** The system shall download audio-only from search results using yt-dlp.
        *   **FR-10.09:** The system shall store downloaded music in `.cache/audio/music/{projectId}/`.
    *   **Audio Mixing:**
        *   **FR-10.10:** The system shall mix background music at -15dB to -20dB below voiceover level (configurable).
        *   **FR-10.11:** The system shall apply fade-in (2 seconds) at video start and fade-out (3 seconds) at video end.
        *   **FR-10.12:** The system shall crossfade between tracks (1-2 second overlap) at scene transitions.
        *   **FR-10.13:** The system shall loop individual tracks if scene group duration exceeds track length.
        *   **FR-10.14:** The system shall use FFmpeg audio mixing to combine voiceover and background music tracks.
    *   **Error Handling:**
        *   **FR-10.15:** The system shall handle music download failures gracefully (video assembles without music rather than failing).
        *   **FR-10.16:** The system shall log warnings when music tracks fail to download or mix.

*   **Acceptance Criteria:**
    *   **AC1: Topic-Based Music Selection**
        *   **Given** a video about "Russian military operations".
        *   **When** assembly completes.
        *   **Then** the final video contains background music with military/epic orchestral characteristics.
    *   **AC2: Content-Specific Music**
        *   **Given** a video about "Dark Souls boss strategies".
        *   **When** assembly completes.
        *   **Then** the final video contains dark/atmospheric background music matching the game's tone.
    *   **AC3: Volume Balance**
        *   **Given** voiceover audio at 0dB.
        *   **When** music is mixed.
        *   **Then** music volume is between -15dB and -20dB (voiceover clearly audible over music).
    *   **AC4: Multi-Track for Long Videos**
        *   **Given** a 10-minute video with 8 scenes.
        *   **When** assembly completes.
        *   **Then** at least 3-4 different music tracks are used across the video.
    *   **AC5: Track Transitions**
        *   **Given** track A ends and track B begins at scene 4.
        *   **When** played back.
        *   **Then** there is a smooth 1-2 second crossfade between tracks.
    *   **AC6: Track Looping**
        *   **Given** a 3-minute scene group and 90-second music track.
        *   **When** assembly completes.
        *   **Then** the music loops seamlessly to cover full scene group duration.
    *   **AC7: Graceful Failure**
        *   **Given** 1 of 3 music downloads fails.
        *   **When** assembly runs.
        *   **Then** video completes with 2 working tracks and logs warning.
    *   **AC8: Complete Failure Fallback**
        *   **Given** all music downloads fail.
        *   **When** assembly runs.
        *   **Then** video completes successfully without background music.

### 1.11. AI-Generated Video Metadata & SEO Toolkit

*   **Description:** A comprehensive SEO optimization system that generates metadata and provides VidIQ-style intelligence for video discoverability. The system automatically generates optimized titles, descriptions, and tags, while also providing keyword research, title scoring, best posting times, and pre-upload SEO audits. This transforms the Export page into a full SEO command center, helping creators maximize their video's reach on YouTube and TikTok.

*   **User Stories:**
    1.  **As a creator,** I want AI-generated video titles, descriptions, and tags ready when my video is done, **so that** I can upload to YouTube/TikTok immediately without writing metadata manually.
    2.  **As a creator,** I want platform-specific metadata formats (YouTube vs TikTok), **so that** I can optimize for each platform's requirements.
    3.  **As a creator,** I want keyword suggestions with search volume and competition data, **so that** I can target high-opportunity topics.
    4.  **As a creator,** I want my titles scored and optimized, **so that** I can improve click-through rates.
    5.  **As a creator,** I want to know the best time to post my video, **so that** I can maximize initial engagement.
    6.  **As a creator,** I want an SEO audit before uploading, **so that** I can fix any issues that might hurt discoverability.

*   **Feature Components:**
    *   **1.11.1 - Core Metadata Generation:** Auto-generate title, description, tags after video assembly (baseline functionality)
    *   **1.11.2 - Keyword Research:** Suggest high-volume, low-competition keywords based on RAG data + trend analysis
    *   **1.11.3 - Title Optimizer:** Score titles (0-100), suggest improvements based on keyword placement, length, CTR patterns
    *   **1.11.4 - Smart Tag Generation:** Rank tags by relevance + search volume, competitor tag gap analysis
    *   **1.11.5 - Best Time to Post:** Analyze channel audience patterns or provide niche-based defaults for optimal upload timing
    *   **1.11.6 - Video Score/Audit:** Pre-upload SEO checklist with overall score and actionable improvement suggestions
    *   **1.11.7 - Thumbnail A/B Testing (Future):** Generate multiple thumbnail variants, track performance after upload

*   **Functional Requirements:**
    *   **Core Metadata (1.11.1):**
        *   **FR-11.01:** The system shall generate metadata automatically after video assembly completes.
        *   **FR-11.02:** The system shall use the video topic, script content, and scene themes as inputs for metadata generation.
        *   **FR-11.03:** The system shall generate an optimized video title (max 100 characters, engaging, keyword-rich).
        *   **FR-11.04:** The system shall generate a short description (~150 characters) with relevant hashtags.
        *   **FR-11.05:** The system shall generate 10-15 comma-separated tags optimized for discoverability.
        *   **FR-11.06:** The system shall provide YouTube-optimized and TikTok-optimized variants.
        *   **FR-11.07:** The system shall display metadata on the Export page with copy-to-clipboard functionality.
        *   **FR-11.08:** The system shall store generated metadata in the project record.
    *   **Keyword Research (1.11.2):**
        *   **FR-11.09:** The system shall analyze RAG data (news articles, competitor videos) to identify trending keywords in the user's niche.
        *   **FR-11.10:** The system shall display search volume indicators (High/Medium/Low) for suggested keywords.
        *   **FR-11.11:** The system shall display competition level for each keyword based on competitor content analysis.
        *   **FR-11.12:** The system shall suggest 10-20 keywords ranked by opportunity score (high volume + low competition).
    *   **Title Optimizer (1.11.3):**
        *   **FR-11.13:** The system shall score generated titles from 0-100 based on SEO best practices.
        *   **FR-11.14:** The system shall analyze keyword placement (front-loaded keywords score higher).
        *   **FR-11.15:** The system shall analyze title length (optimal: 50-70 characters for YouTube).
        *   **FR-11.16:** The system shall suggest 2-3 alternative title variants with scores.
        *   **FR-11.17:** The system shall provide specific improvement suggestions (e.g., "Move keyword 'drone warfare' to beginning").
    *   **Smart Tag Generation (1.11.4):**
        *   **FR-11.18:** The system shall generate 15-20 tags ranked by relevance + estimated search volume.
        *   **FR-11.19:** The system shall categorize tags: primary (topic), secondary (niche), trending (current events).
        *   **FR-11.20:** The system shall analyze competitor tags to identify gaps (tags competitors use that you're missing).
        *   **FR-11.21:** The system shall highlight high-opportunity tags (used by successful competitors, moderate competition).
    *   **Best Time to Post (1.11.5):**
        *   **FR-11.22:** For synced channels, the system shall analyze YouTube Analytics data to determine audience activity patterns.
        *   **FR-11.23:** For new channels, the system shall provide niche-based default recommendations (e.g., military content peaks on weekday evenings).
        *   **FR-11.24:** The system shall display recommended day(s) of week and hour range for posting.
        *   **FR-11.25:** The system shall show timezone-aware recommendations based on user's locale.
    *   **Video Score/Audit (1.11.6):**
        *   **FR-11.26:** The system shall provide a pre-upload SEO checklist with pass/fail indicators.
        *   **FR-11.27:** Checklist items shall include: title strength, description completeness, tag count, keyword coverage, thumbnail presence.
        *   **FR-11.28:** The system shall calculate an overall SEO score (0-100) based on weighted checklist items.
        *   **FR-11.29:** The system shall provide actionable suggestions for items scoring below threshold.
        *   **FR-11.30:** The system shall compare video's SEO score to average scores in the user's niche.
    *   **Thumbnail A/B Testing (1.11.7 - Future):**
        *   **FR-11.31:** The system shall generate 2-3 thumbnail variants using different frame selections and text treatments.
        *   **FR-11.32:** The system shall integrate with YouTube Analytics API to track thumbnail CTR after upload.
        *   **FR-11.33:** The system shall recommend the best-performing thumbnail variant after 48 hours of data.

*   **Data Sources:**
    | Feature | Data Source |
    |---------|-------------|
    | Keyword Research | RAG news articles + competitor videos + YouTube Search API trends |
    | Title Optimizer | Competitor title analysis + CTR patterns from successful videos |
    | Tag Suggestions | Competitor tags + RAG context + LLM generation |
    | Best Time to Post | YouTube Analytics API (if authorized) OR niche defaults |
    | Video Score | All above combined into weighted score |
    | Thumbnail A/B | YouTube Analytics API (requires OAuth + delayed metrics) |

*   **Acceptance Criteria:**
    *   **AC1: Metadata Generation**
        *   **Given** a video has been assembled with topic "Russian military operations in Ukraine".
        *   **When** the Export page loads.
        *   **Then** AI-generated title, description (with hashtags), and tags are displayed.
    *   **AC2: Platform Variants**
        *   **Given** generated metadata is displayed.
        *   **When** user switches between YouTube and TikTok tabs.
        *   **Then** description format and hashtag placement adjust for each platform.
    *   **AC3: Copy Functionality**
        *   **Given** metadata is displayed on Export page.
        *   **When** user clicks copy button for title, description, or tags.
        *   **Then** the text is copied to clipboard with success feedback.
    *   **AC4: Keyword Research Display**
        *   **Given** the Export/SEO page is displayed.
        *   **When** user views keyword suggestions.
        *   **Then** keywords are shown with volume indicators (High/Med/Low) and competition levels.
    *   **AC5: Title Scoring**
        *   **Given** a generated title "Why Drone Warfare Changes Everything".
        *   **When** title optimizer analyzes it.
        *   **Then** a score (e.g., 78/100) is displayed with specific improvement suggestions.
    *   **AC6: Tag Gap Analysis**
        *   **Given** competitor videos use tags the user's video doesn't have.
        *   **When** tag suggestions are displayed.
        *   **Then** "competitor gap" tags are highlighted as opportunities.
    *   **AC7: Best Time Recommendation**
        *   **Given** user is in the military niche.
        *   **When** best time to post is displayed.
        *   **Then** recommendation shows optimal days/hours (e.g., "Tuesday-Thursday, 6-8 PM EST").
    *   **AC8: SEO Audit Score**
        *   **Given** a video is ready for export.
        *   **When** user views SEO audit.
        *   **Then** overall score (0-100) is displayed with checklist of pass/fail items and improvement suggestions.

### 1.12. Automate Mode (Full Automation Pipeline)

*   **Description:** A project-level setting that enables fully automated video production from topic confirmation to final export. When enabled, the system automatically generates the script, creates voiceovers, sources and selects the most relevant B-roll footage, applies background music, assembles the video, and navigates directly to the export page. Users select their preferred voice and video source provider before automation begins.

*   **User Stories:**
    1.  **As a creator,** I want to enable "Automate Mode" for a project, **so that** I can generate complete videos with minimal manual intervention.
    2.  **As a creator,** I want to select my preferred voice before automation begins, **so that** the narration matches my content's style.
    3.  **As a creator,** I want to choose my video source provider (YouTube, DVIDS, Pexels/Pixabay) before automation begins, **so that** I get footage from my preferred source.
    4.  **As a creator,** I want the system to automatically select the most relevant B-roll for each scene, **so that** I don't have to manually curate visuals.
    5.  **As a creator,** I want to skip directly to the export page when automation completes, **so that** I can download my video immediately.

*   **Functional Requirements:**
    *   **Project Configuration:**
        *   **FR-12.01:** The system shall provide an "Automate Mode" toggle in project settings (default: OFF).
        *   **FR-12.02:** When Automate Mode is enabled, the system shall display voice selection UI before proceeding.
        *   **FR-12.03:** When Automate Mode is enabled, the system shall display video source selection UI (YouTube, DVIDS, Pexels/Pixabay) before proceeding.
        *   **FR-12.04:** The system shall store automation preferences (`automate_mode`, `video_source`) in project metadata.
        *   **FR-12.05:** Video source options shall include: YouTube (available), DVIDS (when implemented), Pexels/Pixabay (when implemented), with unavailable sources visually disabled.
    *   **Automated Pipeline Execution:**
        *   **FR-12.06:** Upon topic confirmation with Automate Mode enabled, the system shall execute the full pipeline without user intervention.
        *   **FR-12.07:** The pipeline shall execute in sequence: Script Generation → Voiceover Generation → Visual Sourcing → Auto-Selection → Music Selection → Video Assembly → Export.
        *   **FR-12.08:** The system shall display a progress indicator showing current pipeline stage and overall progress.
    *   **Automated Visual Selection:**
        *   **FR-12.09:** The system shall auto-select one video clip per scene based on relevance ranking.
        *   **FR-12.10:** Relevance ranking shall prioritize: (1) keyword match score, (2) cv_score (if available), (3) duration match, (4) B-roll quality indicators.
        *   **FR-12.11:** The system shall skip suggestions with cv_score < 0.5 during auto-selection.
        *   **FR-12.12:** If no suitable clips are found for a scene, the system shall retry with relaxed filters (remove duration cap, reduce keyword strictness).
    *   **Automated Music Selection:**
        *   **FR-12.13:** The system shall auto-select background music based on video topic and scene mood (per Feature 1.10).
    *   **Navigation & Completion:**
        *   **FR-12.14:** Upon successful assembly, the system shall automatically navigate to the Export page.
        *   **FR-12.15:** The Export page shall display the completed video with download options.
    *   **Error Handling:**
        *   **FR-12.16:** If visual sourcing fails after retry, the system shall halt and notify the user with option to: (a) retry, (b) switch to manual curation, (c) skip scene.
        *   **FR-12.17:** The system shall log all automation decisions for user review (which clips were selected, why).

*   **Acceptance Criteria:**
    *   **AC1: Automate Mode Toggle**
        *   **Given** a user creates or edits a project.
        *   **When** they access project settings.
        *   **Then** they must see an "Automate Mode" toggle (default OFF).
    *   **AC2: Pre-Automation Configuration**
        *   **Given** a user enables Automate Mode and confirms their topic.
        *   **When** the automation flow begins.
        *   **Then** the user must first select a voice AND video source before the pipeline executes.
    *   **AC3: Video Source Selection**
        *   **Given** the pre-automation configuration screen.
        *   **When** the user views video source options.
        *   **Then** they must see YouTube (enabled), DVIDS (disabled/coming soon), Pexels/Pixabay (disabled/coming soon).
    *   **AC4: Full Pipeline Execution**
        *   **Given** a project with Automate Mode enabled, voice selected, and video source selected.
        *   **When** the user confirms the topic "Benefits of solar energy".
        *   **Then** the system must automatically: generate script → generate voiceovers → source visuals → auto-select clips → select music → assemble video → navigate to export.
    *   **AC5: Auto-Selection Quality**
        *   **Given** a scene about "solar panels on rooftops".
        *   **When** auto-selection runs with 5 candidate clips.
        *   **Then** the selected clip must have the highest combined relevance score (keyword match + cv_score + duration fit).
    *   **AC6: Progress Indication**
        *   **Given** automation is in progress.
        *   **When** the user views the screen.
        *   **Then** they must see: current stage name, stage progress (e.g., "Scene 3/5"), overall pipeline progress percentage.
    *   **AC7: Retry on Failure**
        *   **Given** visual sourcing returns 0 results for a scene.
        *   **When** the system retries with relaxed filters.
        *   **Then** it must remove duration cap and reduce keyword strictness before failing.
    *   **AC8: Export Navigation**
        *   **Given** video assembly completes successfully.
        *   **When** the automation pipeline finishes.
        *   **Then** the user must be automatically redirected to the Export page with the video ready for download.

### 1.13. ElevenLabs TTS Integration

*   **Description:** The system provides ElevenLabs as an alternative cloud-based TTS provider alongside the local Kokoro TTS engine. Users can select their preferred TTS provider per project, choosing between free local generation (Kokoro) or premium cloud voices (ElevenLabs). The system tracks ElevenLabs API usage and displays remaining quota in the UI.

*   **User Stories:**
    1.  **As a creator,** I want to choose between Kokoro (local/free) and ElevenLabs (cloud/premium) for voiceover generation, **so that** I can balance cost vs. voice quality based on my needs.
    2.  **As a creator,** I want access to ElevenLabs' voice catalog separately from Kokoro voices, **so that** I can explore premium voice options.
    3.  **As a creator,** I want to see my ElevenLabs API usage in the UI, **so that** I can track my quota and avoid unexpected limits.

*   **Functional Requirements:**
    *   **Provider Configuration:**
        *   **FR-13.01:** The system shall support TTS provider selection: Kokoro (local, default) or ElevenLabs (cloud).
        *   **FR-13.02:** The system shall store TTS provider preference per project in project metadata.
        *   **FR-13.03:** The system shall allow global default TTS provider configuration via environment variables.
    *   **ElevenLabs Integration:**
        *   **FR-13.04:** The system shall integrate with ElevenLabs Text-to-Speech API v1.
        *   **FR-13.05:** The system shall retrieve and display available ElevenLabs voices (separate catalog from Kokoro).
        *   **FR-13.06:** The system shall generate voiceover audio using ElevenLabs API when selected as provider.
        *   **FR-13.07:** The system shall store ElevenLabs API key securely via environment variables.
    *   **Voice Selection:**
        *   **FR-13.08:** The Voice Selection UI shall display provider toggle (Kokoro / ElevenLabs).
        *   **FR-13.09:** The system shall show provider-specific voice options based on selection.
        *   **FR-13.10:** The system shall provide voice preview samples for ElevenLabs voices.
    *   **Usage Tracking:**
        *   **FR-13.11:** The system shall track ElevenLabs API character usage per request.
        *   **FR-13.12:** The system shall store cumulative usage in the database (daily/monthly totals).
        *   **FR-13.13:** The system shall display current usage and remaining quota in the UI.
        *   **FR-13.14:** The system shall warn users when approaching quota limits (80%, 95%).
        *   **FR-13.15:** The system shall block generation and notify user when quota is exhausted.
    *   **Error Handling:**
        *   **FR-13.16:** The system shall handle ElevenLabs API errors gracefully with user-friendly messages.
        *   **FR-13.17:** The system shall offer fallback to Kokoro when ElevenLabs fails or quota exceeded.

*   **Acceptance Criteria:**
    *   **AC1: Provider Selection**
        *   **Given** a user creates or edits a project.
        *   **When** they access voice selection.
        *   **Then** they must see a provider toggle (Kokoro / ElevenLabs) before voice options.
    *   **AC2: Separate Voice Catalogs**
        *   **Given** user selects Kokoro provider.
        *   **When** voice options load.
        *   **Then** only Kokoro voices are displayed.
        *   **Given** user selects ElevenLabs provider.
        *   **When** voice options load.
        *   **Then** only ElevenLabs voices are displayed (fetched from API).
    *   **AC3: ElevenLabs Voice Generation**
        *   **Given** a project configured with ElevenLabs provider and a selected ElevenLabs voice.
        *   **When** voiceover generation runs.
        *   **Then** audio files are generated using ElevenLabs API.
    *   **AC4: Usage Tracking Display**
        *   **Given** ElevenLabs is configured.
        *   **When** user views the settings or voice selection screen.
        *   **Then** current character usage and remaining quota are displayed.
    *   **AC5: Quota Warning**
        *   **Given** ElevenLabs usage reaches 80% of monthly quota.
        *   **When** user attempts voiceover generation.
        *   **Then** a warning is displayed before proceeding.
    *   **AC6: Quota Exhausted**
        *   **Given** ElevenLabs quota is exhausted.
        *   **When** user attempts voiceover generation with ElevenLabs.
        *   **Then** generation is blocked with message offering Kokoro fallback.
    *   **AC7: Graceful Fallback**
        *   **Given** ElevenLabs API returns an error.
        *   **When** voiceover generation fails.
        *   **Then** user is offered option to retry or switch to Kokoro.

### 1.14. Unified API Usage Dashboard

*   **Description:** A dedicated dashboard page (`/settings/api-usage`) that provides unified monitoring of all external API usage across the application. The system tracks per-request usage for Gemini API, YouTube Data API, and ElevenLabs API, displaying current usage against free tier limits with warning thresholds. This consolidates API tracking into a single view for cost management and quota monitoring.

*   **User Stories:**
    1.  **As a creator,** I want to see all my API usage in one dashboard, **so that** I can monitor my consumption across all services without checking multiple places.
    2.  **As a creator,** I want to see how close I am to each API's free tier limit, **so that** I can plan my video production to avoid hitting quotas.
    3.  **As a creator,** I want warnings when I'm approaching API limits, **so that** I'm not surprised by service interruptions.
    4.  **As a creator,** I want to see my usage history over the past 7 days, **so that** I can understand my consumption patterns.

*   **Functional Requirements:**
    *   **Dashboard Page:**
        *   **FR-14.01:** The system shall provide a dedicated API usage page at `/settings/api-usage`.
        *   **FR-14.02:** The dashboard shall display usage cards for each tracked API (Gemini, YouTube Data API, ElevenLabs).
        *   **FR-14.03:** Each usage card shall show: current usage, free tier limit, percentage used, and visual progress bar.
    *   **Per-Request Logging:**
        *   **FR-14.04:** The system shall log each API request with: timestamp, API name, endpoint, usage units consumed, project ID (if applicable).
        *   **FR-14.05:** The system shall store API usage logs in a dedicated database table.
        *   **FR-14.06:** The system shall retain usage logs for 7 days, with automatic cleanup of older records.
    *   **API-Specific Tracking:**
        *   **FR-14.07:** Gemini API tracking shall count requests per day against the 1,500 requests/day free tier.
        *   **FR-14.08:** YouTube Data API tracking shall count quota units per day against the 10,000 units/day free tier.
        *   **FR-14.09:** ElevenLabs API tracking shall count characters per month against the monthly character quota.
    *   **Warning System:**
        *   **FR-14.10:** The system shall display a warning indicator when any API reaches 80% of its quota.
        *   **FR-14.11:** The system shall display a critical warning when any API reaches 95% of its quota.
        *   **FR-14.12:** The system shall display a global warning banner in the main UI when any API is at critical level.
    *   **Usage History:**
        *   **FR-14.13:** The dashboard shall display a 7-day usage history chart for each API.
        *   **FR-14.14:** The system shall show daily breakdown of usage for daily-quota APIs (Gemini, YouTube).
        *   **FR-14.15:** The system shall show cumulative monthly usage for monthly-quota APIs (ElevenLabs).
    *   **Quota Reset Information:**
        *   **FR-14.16:** The dashboard shall display when each API's quota resets (daily at midnight UTC, monthly on billing date).
        *   **FR-14.17:** The system shall automatically reset daily counters at midnight UTC.

*   **Acceptance Criteria:**
    *   **AC1: Dashboard Access**
        *   **Given** a user is logged into the application.
        *   **When** they navigate to `/settings/api-usage`.
        *   **Then** they see a dashboard with usage cards for Gemini, YouTube Data API, and ElevenLabs.
    *   **AC2: Usage Display**
        *   **Given** user has made 500 Gemini requests today.
        *   **When** they view the Gemini usage card.
        *   **Then** it shows "500 / 1,500 requests (33%)" with a progress bar at 33%.
    *   **AC3: Per-Request Logging**
        *   **Given** a script generation request uses Gemini API.
        *   **When** the request completes.
        *   **Then** a log entry is created with timestamp, API name, endpoint, and usage units.
    *   **AC4: Warning at 80%**
        *   **Given** YouTube API usage reaches 8,000 units (80%).
        *   **When** user views the dashboard.
        *   **Then** the YouTube card shows a yellow warning indicator.
    *   **AC5: Critical Warning at 95%**
        *   **Given** Gemini API usage reaches 1,425 requests (95%).
        *   **When** user views any page in the application.
        *   **Then** a global warning banner appears indicating Gemini quota is nearly exhausted.
    *   **AC6: 7-Day History**
        *   **Given** user has been using the application for 7+ days.
        *   **When** they view the usage history chart.
        *   **Then** they see daily usage bars for the past 7 days for each API.
    *   **AC7: Quota Reset Display**
        *   **Given** it is 3pm UTC.
        *   **When** user views Gemini usage card.
        *   **Then** it shows "Resets in 9 hours" (midnight UTC).

---

## 2. Future Enhancements

*This section lists features and improvements planned for future versions of the product.*

**Note:** Voice Selection (originally 2.1) has been moved to Core Features as Feature 1.3.

### 2.0. Domain-Specific Video Sources (DVIDS Military Footage)
*   **Description:** Add DVIDS (Defense Visual Information Distribution Service) as a domain-specific alternative video source alongside YouTube. When creating military-themed content, users can toggle "Military Mode" to search the official U.S. Department of Defense media repository instead of YouTube. This provides access to 1.8M+ public domain military assets including combat operations, training exercises, equipment demonstrations, and historical footage.
*   **Rationale:** Military content creators need authentic, high-quality B-roll footage that YouTube cannot reliably provide. DVIDS offers curated, public domain content from all U.S. military branches with no copyright concerns or content filtering needed. This establishes the pattern for adding additional domain-specific sources (NASA for space, Europeana for historical European content, etc.).
*   **Technical Components:**
    *   **DVIDS API Integration:**
        *   REST/JSON API at `https://api.dvidshub.net/`
        *   Search endpoint: `GET /search` with parameters for keywords, content type, duration, HD filtering
        *   Asset endpoint: `GET /asset` returns multiple quality MP4 download URLs (300kbps → 9Mbps)
        *   Free API key registration required
        *   Categories: Combat Operations, Training, Equipment, Humanitarian, Ceremonies, Historical
    *   **VideoSourceProvider Abstraction:**
        *   Create unified interface for video sources (`searchVideos`, `getVideoDetails`, `downloadSegment`)
        *   YouTube and DVIDS implement the same interface
        *   Easy to add future sources (NASA, Pexels, Europeana)
    *   **Source Selection UI:**
        *   Project-level setting: "Video Source" dropdown (YouTube, DVIDS Military)
        *   Or per-scene override in Visual Curation UI
        *   Visual indicator showing which source is active
*   **API Comparison:**
    | Feature | YouTube | DVIDS |
    |---------|---------|-------|
    | Content | General, mixed quality | Military-specific, curated |
    | Licensing | Varies, often restricted | **Public Domain** |
    | CV Filtering Needed | Heavy (faces, captions) | Minimal |
    | Quality | Up to 720p | Up to HD (1280x720, 9Mbps) |
    | Cost | Free (quota limited) | **Free** |
*   **Implementation Approach:**
    *   Create `lib/video-sources/dvids-client.ts` implementing `VideoSourceProvider` interface
    *   Add `video_source` column to `projects` table (default: 'youtube')
    *   Update Visual Sourcing service to use selected provider
    *   Reuse existing download, caching, and preview infrastructure
*   **User Value:** Military content creators get direct access to authentic DoD footage without copyright concerns. The abstraction layer enables future domain-specific sources, making the platform more versatile for niche content creation.
*   **FOSS Compliance:** DVIDS API is free to use. All content is U.S. Government public domain.

### 2.1. Stock Footage API Integration
*   **Description:** Add professional stock footage sources (Pexels, Pixabay) as alternatives or supplements to YouTube content. This provides access to high-quality, royalty-free stock video clips for creators who need more polished visuals or want commercial-grade footage.

### 2.2. Advanced Content Filtering
*   **Status:** ✅ **MOVED TO CORE** - See Feature 1.5 (AI-Powered Visual Sourcing)
*   **Description:** ~~Enhance the YouTube sourcing capabilities with advanced filtering techniques to identify visually clean footage. For gaming content, this includes filtering for 'no commentary', 'gameplay only' to avoid unwanted overlays, face cams, or watermarks. Implement content quality scoring and advanced licensing detection.~~
*   **Note:** This feature has been incorporated into Core Feature 1.5 with the following enhancements:
    *   Pure B-roll keyword filtering (no commentary, reaction, vlog content)
    *   Google Cloud Vision API integration (face detection, OCR, label verification)
    *   Content-type aware query generation (gaming, historical, conceptual)
    *   Audio stripping from downloaded segments

### 2.3. Manual Visual Search
*   **Description:** In the Visual Curation UI, if a user is not satisfied with the AI-suggested clips for a scene, provide an option for them to enter keywords and manually search YouTube or connected stock footage sources for alternative clips.

### 2.4. Text Overlays
*   **Description:** Allow users to add simple text overlays (e.g., for titles, subtitles, or key points) on top of video clips within the Visual Curation UI.

### 2.5. Editable Script & Voiceover Regeneration
*   **Description:** In the Visual Curation UI, allow users to edit the AI-generated script text for any scene and trigger a re-generation of the voiceover for that specific scene. Additionally, allow users to switch voices per scene or for the entire project after initial generation.

### 2.6. Local Computer Vision (MediaPipe + Tesseract.js)
*   **Description:** Implement a fully local, free alternative to Google Cloud Vision API for B-roll content filtering. This enhancement replaces cloud-based CV analysis with on-device processing using MediaPipe for face detection and Tesseract.js for OCR/text detection, enabling unlimited video analysis with zero API costs.
*   **Rationale:** Aligns with the "FOSS-first, cloud-enhanced" philosophy by providing a completely free, offline-capable CV solution. Users with adequate hardware can process unlimited videos without API quotas or costs, while those preferring cloud accuracy can continue using Google Vision API.
*   **Technical Components:**
    *   **MediaPipe Face Detection:**
        *   Google's open-source, production-ready face detection
        *   Runs locally using TensorFlow.js or native bindings
        *   GPU-accelerated (WebGL/CUDA) for fast processing
        *   ~20-50ms per frame on modern hardware
        *   Replaces Google Vision FACE_DETECTION
    *   **Tesseract.js (OCR):**
        *   Open-source OCR engine (JavaScript port of Tesseract)
        *   Detects burned-in captions, watermarks, text overlays
        *   ~100-300ms per frame
        *   Replaces Google Vision TEXT_DETECTION
    *   **Label Detection Alternative:**
        *   Option A: TensorFlow.js with MobileNet/ImageNet models for scene classification
        *   Option B: Skip label verification (rely on keyword matching)
        *   Option C: Use CLIP model for semantic image-text matching
*   **Hardware Requirements:**
    *   Minimum: 8GB RAM, integrated GPU
    *   Recommended: 16GB+ RAM, 4GB+ VRAM (dedicated GPU)
    *   Optimal: 32GB RAM, 8GB+ VRAM (enables batch processing)
*   **Implementation Approach:**
    *   Create `lib/vision/local-cv-client.ts` as drop-in replacement for Vision API client
    *   Configuration option: `CV_PROVIDER=local|google` in environment
    *   Hybrid mode: Use local CV by default, fallback to Google Vision for edge cases
    *   Same interface (`analyzeVideoFrames`, `calculateCVScore`) for seamless switching
*   **Performance Comparison:**
    | Metric | Google Vision | Local (MediaPipe + Tesseract) |
    |--------|---------------|-------------------------------|
    | Cost | ~€0.01-0.02/video | **Free** |
    | Speed | ~500ms/video | ~1-2s/video |
    | Accuracy | 95%+ | 85-90% |
    | Offline | No | **Yes** |
    | Quota | 1,000 units/month free | **Unlimited** |
*   **User Value:** Creators can analyze unlimited B-roll footage with zero cloud costs. The slight accuracy trade-off (85-90% vs 95%+) is acceptable for filtering obvious faces/text overlays, which is the primary use case.
*   **FOSS Compliance:** All components (MediaPipe, Tesseract.js, TensorFlow.js) are open-source and free to use commercially.

### 2.7. Channel Intelligence & Content Research (RAG-Powered)
*   **Description:** A VidIQ-style intelligence system that syncs with your YouTube channel, analyzes competitors, monitors trends, and generates scripts informed by your niche and style. Uses RAG (Retrieval-Augmented Generation) to give the LLM full context of your channel, competitor content, and trending topics when generating scripts.
*   **Operating Modes:**
    *   **Established Channel Mode:** Sync your existing YouTube channel, analyze your content style and what performs well, generate new scripts matching YOUR voice plus current trends
    *   **Cold Start Mode (New Channel):** User declares their niche (e.g., "military videos"), system indexes top channels in that niche, learns successful patterns, generates scripts based on proven formulas + trending topics
*   **Data Sources:**
    | Source | Method | Refresh |
    |--------|--------|---------|
    | Your YouTube Channel | Auto-caption scraping via `youtube-transcript-api` + YouTube Data API (titles, descriptions, tags, metrics) | Daily |
    | Competitor Channels | Same scraping approach, up to 5 channels | Daily |
    | YouTube Trends | YouTube Search API + Google Trends (unofficial) for niche-specific trending videos | Daily |
    | News Discovery | Automated via Google News / news aggregators filtered by niche keywords | Daily |
*   **Technical Architecture:**
    | Component | Technology |
    |-----------|------------|
    | Caption Scraping | `youtube-transcript-api` (Python, FOSS) |
    | Vector Database | ChromaDB or LanceDB (local, FOSS) |
    | Embeddings | `all-MiniLM-L6-v2` (local) or Gemini |
    | YouTube Data | YouTube Data API v3 |
    | Trend Detection | YouTube Search API + Google Trends |
    | News Discovery | Google News API / web scraping |
*   **Military Niche Pre-configured Sources:**
    When user selects military niche, system prioritizes these authoritative sources:
    | Source | Focus | URL |
    |--------|-------|-----|
    | The War Zone | Investigative reports, satellite imagery, advanced systems | https://www.thedrive.com/the-war-zone |
    | Military.com | Daily news, benefits, careers | https://www.military.com/daily-news |
    | Defense News | Policy, contractors, strategic analysis | https://www.defensenews.com/ |
    | Breaking Defense | Industry news, analysis | https://breakingdefense.com/ |
    | Defense One | Future of national security | https://www.defenseone.com/ |
    | Military Times | Independent service member news | https://www.militarytimes.com/ |
    | Janes | Technical data, capability assessments | https://www.janes.com/osint-insights/defence-news |
*   **User Flow Example:**
    ```
    1. User: "I want to start a military channel"

    2. System indexes:
       - Top 5 military YouTube channels (user picks or auto-suggested)
       - Trending military videos on YouTube
       - Military news (The War Zone, Defense News, etc.)

    3. User: "What video should I make?"

    4. LLM (with RAG context):
       - "Based on trending: Navy just unveiled new destroyer class..."
       - "Competitor X got 2M views covering similar topic last week..."
       - "Here's a script matching successful patterns in your niche..."
    ```
*   **Use Cases:**
    *   New creator: "I want to make military videos" → System learns from top military channels, generates scripts based on what works
    *   Established creator: "What's trending in my niche?" → System analyzes competitor uploads, news, YouTube trends
    *   Content planning: "Give me 5 video ideas for this week" → System cross-references your style + gaps in your content + trending topics
    *   Script generation: Full awareness of your channel voice, competitor positioning, and current events
*   **Quick Production Flow (One-Click Video Creation):**
    *   **Description:** Enable one-click video creation directly from RAG-generated topic suggestions. Users click a topic suggestion and the system automatically creates a project, applies saved defaults (voice + persona), and triggers the full video production pipeline.
    *   **User Value:** Creators who trust the RAG system can go from "interesting topic idea" to "video in production" with a single click, eliminating the conversational brainstorming step entirely.
    *   **Workflow:**
        ```
        1. User views Topic Suggestions (RAG-generated)
        2. User clicks "Create Video" on a topic
        3. System automatically:
           - Creates new project with topic pre-filled
           - Sets topic_confirmed = true
           - Applies default voice (from user preferences)
           - Applies default persona (from user preferences)
           - Triggers script generation with RAG context
           - Triggers voiceover generation
           - Triggers visual sourcing + auto-selection
           - Assembles video
        4. User redirected to progress page, then export page when complete
        ```
    *   **Functional Requirements:**
        *   **FR-2.7.QPF.01:** The system shall display a "Create Video" button on each topic suggestion card.
        *   **FR-2.7.QPF.02:** The system shall store user default preferences (default_voice_id, default_persona_id) in user settings.
        *   **FR-2.7.QPF.03:** When "Create Video" is clicked, the system shall create a new project with the topic pre-filled and confirmed.
        *   **FR-2.7.QPF.04:** The system shall automatically apply the user's default voice and persona to the new project.
        *   **FR-2.7.QPF.05:** The system shall trigger the full video production pipeline (script → voice → visuals → assembly) without user intervention.
        *   **FR-2.7.QPF.06:** The system shall redirect the user to a progress page showing pipeline status.
        *   **FR-2.7.QPF.07:** Upon completion, the system shall redirect to the export page with the finished video.
        *   **FR-2.7.QPF.08:** If no defaults are configured, the system shall prompt the user to set defaults before proceeding.
    *   **Acceptance Criteria:**
        *   **AC-QPF.1:** Given a user has configured default voice and persona, when they click "Create Video" on a topic suggestion, then a new project is created and the pipeline starts automatically.
        *   **AC-QPF.2:** Given the pipeline is running, when the user views the progress page, then they see real-time status updates for each stage.
        *   **AC-QPF.3:** Given the pipeline completes successfully, when assembly finishes, then the user is automatically redirected to the export page.
        *   **AC-QPF.4:** Given a user has NOT configured defaults, when they click "Create Video", then they are prompted to select voice and persona before proceeding.
    *   **Technical Implementation:**
        *   Add `POST /api/projects/quick-create` endpoint
        *   Add `user_preferences` table or extend settings for default_voice_id, default_persona_id
        *   Add "Create Video" button to TopicSuggestions component
        *   Reuse existing pipeline from Automate Mode (Feature 1.12)
*   **User Value:** Creators get data-driven content recommendations based on real channel performance, competitor analysis, and trend data—not just generic LLM suggestions. The system learns YOUR niche and style.
*   **Note:** Core features use only LLM's pre-trained knowledge. This RAG-powered intelligence system is planned for future enhancement.
*   **FOSS Compliance:** All core components are open-source: `youtube-transcript-api` (MIT), ChromaDB (Apache 2.0), LanceDB (Apache 2.0), `sentence-transformers` (Apache 2.0).

### 2.8. Pixabay Music Provider

*   **Description:** Replace YouTube/yt-dlp music sourcing with Pixabay Music API for fully legal, royalty-free background music. This provider swap enables commercial distribution of the application without YouTube Terms of Service concerns.
*   **Rationale:** YouTube's Terms of Service prohibit separating audio from video content. While yt-dlp works for personal use, commercial release requires a legally compliant music source. Pixabay offers royalty-free music with a REST API (500 requests/hour free tier).
*   **Technical Approach:**
    *   Create MusicSourceProvider interface (mirrors VideoSourceProvider pattern)
    *   Implement PixabayMusicProvider as drop-in replacement for YouTubeMusicProvider
    *   Configuration option: `MUSIC_PROVIDER=youtube|pixabay` in environment
    *   Same search/download/cache interface for seamless switching
*   **API Details:**
    *   Endpoint: `https://pixabay.com/api/`
    *   Free tier: 500 requests/hour
    *   No attribution required
    *   Categories: ambient, electronic, cinematic, classical, etc.
*   **User Value:** Enables legal commercial distribution of the AI Video Generator application.
*   **FOSS Compliance:** Pixabay API is free to use. All content is royalty-free.

---

## Security Considerations

### API Key Management
- All API keys (YouTube, Google Cloud Vision, Gemini) must be stored in environment variables
- API keys must never be committed to source control or exposed in client-side code
- Environment variable validation at startup with clear error messages for missing keys

### Data Storage
- User project data stored locally in SQLite database
- No user authentication required (single-user local application)
- Downloaded video segments stored in cache directory with configurable retention period
- Cache cleanup process to prevent unbounded disk usage

### External API Security
- All external API calls use HTTPS
- Rate limiting implemented to prevent accidental abuse and quota exhaustion
- Graceful degradation when APIs are unavailable

### Future Security Considerations
- User authentication if multi-user support added
- Encrypted storage for API keys
- Audit logging for API usage
 

---

## Out of Scope

The following items are explicitly excluded from the current scope:

### Features
- User authentication and multi-user support
- Cloud storage or sync between devices
- Real-time collaboration
- Video editing capabilities (trimming, effects, transitions beyond basic assembly)
- Multiple language support for TTS
- Mobile application

### Technical
- Horizontal scaling or high availability
- Automated deployment pipelines
- Performance optimization beyond basic responsiveness
- Comprehensive monitoring and alerting
- Database migrations for schema changes

### Content
- Copyright verification for selected clips
- Monetization or licensing compliance

---

## References

### Source Documents
- Architecture Document: `docs/architecture.md`
- UX Design Specification: `docs/ux-design-specification.md`
- Epic Breakdown: `docs/epics.md`

### Appendices
- FR Index: `docs/appendix-fr-index.md`
- Coverage Matrix: `docs/appendix-coverage-matrix.md`

### External Resources
- YouTube Data API v3 Documentation
- Google Cloud Vision API Documentation
- Ollama Documentation
- Google Gemini API Documentation
- [DVIDS API Documentation](https://api.dvidshub.net/) (Feature 2.0)
- [NASA Image and Video Library API](https://api.nasa.gov/) (Future consideration)
- [Pexels API Documentation](https://www.pexels.com/api/documentation/) (Feature 2.1) 