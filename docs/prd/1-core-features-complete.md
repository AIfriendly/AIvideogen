# 1. Core Features (Complete)

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
    *   **Rationale:** Local Ollama deployment provides complete control over LLM behavior without content restrictions or censorship. Gemini offers cloud-based alternative with generous free tier (1,500 requests/day). Groq provides ultra-fast cloud inference with free tier (1,000 requests/day, 30 RPM) and excellent script quality via Llama 3.3 70B. Script personas ensure the system adapts to different ideological frameworks and content types without imposing editorial bias.
    *   **Core Implementation:**
        *   Ollama (primary, FOSS), Gemini (optional, cloud), and Groq (optional, cloud with ultra-fast inference) providers implemented ✅
        *   Provider selection via .env.local configuration ✅
        *   **UI-based provider switching** allows runtime selection between Ollama, Gemini, and Groq without configuration changes ✅
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
    4.  **As a creator,** I want to switch between Gemini and Groq via the web UI, **so that** I can use alternative providers when one hits quota limits without restarting the application.

*   **Functional Requirements:**
    *   **FR-1.9.01:** The system shall provide a persona selection interface in project settings.
    *   **FR-1.9.02:** The system must store 3-5 preset personas in the `system_prompts` database table.
    *   **FR-1.9.03:** Each persona must include: name, description, system_prompt (LLM instructions), and tone characteristics.
    *   **FR-1.9.04:** The Blackpill Realist persona must support content types: AI dystopia, western collapse, lookism/dating inequality, economic collapse, technological determinism.
    *   **FR-1.9.05:** The Blackpill Realist persona must deliver scripts with: brutal honesty, nihilistic framing, elimination of false hope, focus on systemic failures and power imbalances.
    *   **FR-1.9.06:** Selected persona must be linked to project via `projects.system_prompt_id` foreign key.
    *   **FR-1.9.07:** Script generation must use the selected persona's system prompt when generating content.
    *   **FR-1.9.08:** The system must support three LLM providers via configuration:
        *   **Ollama** (local, FOSS) - primary provider
        *   **Gemini** (cloud, Google) - with generous free tier (1,500 requests/day)
        *   **Groq** (cloud) - with ultra-fast inference and free tier (1,000 requests/day, 30 RPM for Llama 3.3 70B)
    *   **FR-1.9.09:** The system must implement configurable rate limiting for cloud LLM providers (Gemini, Groq) to proactively control API usage and prevent quota exhaustion.
        *   **Rate Limit Configuration:** Environment variables for enabling/disabling rate limits per provider and setting requests-per-minute limits:
            *   `GEMINI_RATE_LIMIT_ENABLED`: true/false (default: true)
            *   `GEMINI_RATE_LIMIT_REQUESTS_PER_MINUTE`: integer (default: 1)
            *   `GROQ_RATE_LIMIT_ENABLED`: true/false (default: true)
            *   `GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE`: integer (default: 2)
            *   `GROQ_RATE_LIMIT_SECONDS_PER_REQUEST`: integer (default: 30)
            *   `OLLAMA_RATE_LIMIT_ENABLED`: true/false (default: false - no limit for local)
        *   **Rate Limiting Behavior:** When rate limit is reached, the system queues requests and waits until the next available time slot before proceeding.
        *   **HTTP Header Monitoring:** For Groq, monitor `x-ratelimit-remaining-*`, `retry-after` headers for proactive rate limit management and graceful 429 handling.
        *   **User Feedback:** If rate limit wait time exceeds 60 seconds, provide user feedback about the delay.
        *   **Logging:** Log rate limit events (hit, wait, proceed) for monitoring and debugging.
    *   **FR-1.9.10:** The system must support Groq as a cloud LLM provider with models: Llama 3.3 70B Versatile (default), Llama 3.1 8B Instruct, Gemma 2 9B Instruct.
    *   **FR-1.9.11:** The system must provide a UI-based provider selector in Settings → AI Configuration allowing users to switch between Ollama, Gemini, and Groq at runtime without requiring configuration file changes or application restart.
    *   **FR-1.9.12:** Provider selection must persist per-user in the database and be applied to all script generation requests for that user.
    *   **FR-1.9.13:** The system must implement a pluggable LLM provider interface with consistent API signature across all providers (Ollama, Gemini, Groq), ensuring provider switching requires no code changes to script generation logic.
    *   **FR-1.9.14:** Each provider must implement a standardized `generate_script(prompt, system_prompt, model)` method with unified error handling and response format.

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
        *   **Given** the system is configured with `LLM_PROVIDER=ollama`, `LLM_PROVIDER=gemini`, or `LLM_PROVIDER=groq`.
        *   **When** script generation is triggered.
        *   **Then** the system must use the configured provider without errors.
    *   **AC5: Provider Switching via UI**
        *   **Given** a user is in Settings → AI Configuration.
        *   **When** they select "Groq" from the LLM Provider dropdown.
        *   **Then** the system must immediately use Groq for all subsequent script generation requests.
        *   **And** the selection must persist across page reloads.
    *   **AC6: Groq-Specific Configuration**
        *   **Given** the system is configured with Groq provider.
        *   **When** script generation is triggered.
        *   **Then** the system must use the Groq API with Llama 3.3 70B Versatile model by default.
        *   **And** the system must respect Groq rate limits (1 request per 30 seconds by default, configurable).
        *   **And** the system must monitor Groq HTTP response headers (`x-ratelimit-remaining-*`, `retry-after`) for proactive rate limit management.

---
