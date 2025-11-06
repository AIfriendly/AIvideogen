# Product Requirements Document (PRD): AI Video Generator

*This document outlines the requirements for the AI Video Generator MVP. It is a living document and will be updated as the project progresses.*

**Last Updated:** 2025-11-01
**Version:** 1.2
**Repository:** https://github.com/AIfriendly/AIvideogen

**Recent Changes:**
- Expanded Feature 2.6: LLM Configuration to include System Prompts & Persona Configuration
- Added preset personas (Creative Assistant, Viral Strategist, Educational Designer, Documentary Filmmaker)
- Added custom persona creation and per-project persona overrides
- Specified MVP implementation: default Creative Assistant persona hardcoded, UI configuration post-MVP
- Previous updates (v1.1): Added Voice Selection as Feature 1.3, specified YouTube Data API v3

---

## Non-Functional Requirements

### NFR 1: Technology Stack
*   **Requirement:** The entire system must be implemented using technologies that are free and open-source (FOSS).
*   **Rationale:** To ensure the project is accessible, modifiable, and has no licensing costs associated with its core components.
*   **Implication:** This constrains the choice of services for AI models (LLMs, TTS), stock media providers, and all underlying libraries. Any external service must have a free tier that is sufficient for the MVP's purposes without requiring payment.

---

## 1. Features

### 1.1. Conversational AI Agent

*   **Description:** A chat-based AI assistant that guides the user from initial idea to a concrete video topic, and initiates the video creation process. The system supports multiple concurrent projects, allowing users to manage and switch between different video conversations seamlessly.

*   **User Stories:**
    1.  **As a creator,** I want to discuss my video ideas with an AI agent in a natural conversation, **so that** I can explore different angles and refine my topic before committing to production.
    2.  **As a creator,** I want to give a simple, explicit command to the agent to start the video creation process, **so that** the transition from idea to production is seamless and efficient.
    3.  **As a creator,** I want to create multiple separate project conversations (e.g., one for cooking videos, another for gaming tutorials), **so that** different video ideas remain organized and don't get mixed together.
    4.  **As a creator,** I want to easily switch between my active projects, **so that** I can resume work on any video idea without losing context.
    5.  **As a creator,** I want my project list to automatically name conversations based on their content, **so that** I can quickly identify each project without manual labeling.

*   **Functional Requirements:**
    *   The system shall provide a chat interface for user-agent interaction.
    *   The agent must understand and respond to natural language queries related to brainstorming video topics.
    *   The agent must maintain conversational context to help refine ideas over multiple turns.
    *   The agent must recognize a specific command (e.g., "make a video about [topic]") to trigger the subsequent workflow steps.
    *   The agent must confirm the final topic with the user before proceeding to script generation.
    *   Upon confirmation, the agent must pass the confirmed topic string to be used as the "video title" in subsequent steps.
    *   **Project Management:**
        *   The system shall provide a "New Chat" button to create new projects/conversations.
        *   The system shall display a sidebar listing all projects ordered by most recently active.
        *   The system shall allow users to click any project to load its complete conversation history.
        *   The system shall visually highlight the currently active project.
        *   The system shall auto-generate project names from the first user message (e.g., "Cooking video ideas").
        *   The system shall persist the selected project across page reloads using localStorage.
        *   The system may optionally provide project deletion functionality with user confirmation.

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
    *   The system shall accept a video topic string as input.
    *   The system must generate a script that is factually relevant to the input topic.
    *   The generated script must be segmented into an ordered list of scenes.
    *   Each scene must contain a block of text for the voiceover.
    *   **The system must generate scripts that sound professional, human-written, and engaging (NOT robotic or AI-generic).**
    *   **The system must adapt script tone based on topic type (documentary, educational, entertainment, tutorial).**
    *   **The system must avoid AI detection markers (generic phrases like "In today's video", "Moving on", "It's important to note").**
    *   **The system must use professional scriptwriting techniques (strong hooks, storytelling, natural language, varied sentence structure).**
    *   **The system shall validate script quality and reject robotic or bland scripts.**
    *   The system shall pass the structured script to the visual curation and voiceover generation modules.

*   **Acceptance Criteria:**
    *   **AC1: Successful Script Generation**
        *   **Given** the script generation module receives the topic "The benefits of solar power".
        *   **When** the generation process completes.
        *   **Then** the system must produce a structured script containing multiple scenes with professional, engaging narration.
    *   **AC2: Correct Script Structure**
        *   **Given** a script has been generated.
        *   **When** the script is passed to the next module.
        *   **Then** it must be in a structured format, such as a JSON array of objects, with each object containing at least a `scene_number` and `text` key.
    *   **AC3: Professional Quality (Human-Like)**
        *   **Given** a generated script for any topic.
        *   **When** the script is reviewed.
        *   **Then** it must sound like a professional scriptwriter created it, not an AI.
        *   **And** it must NOT contain generic AI phrases ("In today's video", "Moving on", "Let's explore", "It's important to note").
        *   **And** it must have a strong, engaging opening (no boring "welcome" intros).
        *   **And** it must use topic-appropriate tone (conversational for tutorials, documentary-style for serious topics, etc.).
    *   **AC4: Quality Validation**
        *   **Given** the script generation process produces output.
        *   **When** the system validates script quality.
        *   **Then** robotic or bland scripts must be rejected and regeneration triggered (max 3 attempts).
        *   **And** only scripts meeting professional quality standards are accepted and saved.

### 1.3. Voice Selection

*   **Description:** Before script generation, users can choose from multiple AI-generated voices to narrate their video, allowing them to match the voice to their content's tone and style.

*   **User Stories:**
    1.  **As a creator,** I want to select from different AI voice options (male, female, different accents), **so that** I can choose a narrator that fits my video's topic and audience.
    2.  **As a creator,** I want to preview voice samples before selecting, **so that** I can hear how each voice sounds before committing to it for my entire video.

*   **Functional Requirements:**
    *   The system shall present a voice selection interface after topic confirmation and before script generation.
    *   The system must provide at least 3-5 distinct voice options with different characteristics (gender, accent, tone).
    *   Each voice option must have a short audio preview sample that users can play.
    *   The system must allow users to select exactly one voice for their video project.
    *   The selected voice must be used consistently for all scene voiceovers in that project.
    *   The system shall store the voice selection as part of the project metadata.
    *   All voice options must use FOSS (free and open-source) TTS engines to comply with NFR 1.

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
    *   The system shall take the structured script (containing text for each scene) as input.
    *   The system must use the user's selected voice (from Feature 1.3) for generating all voiceovers.
    *   For each scene, the system must generate a corresponding audio file of the spoken text.
    *   The generated audio must be in a standard format (e.g., MP3).
    *   The system must maintain the association between each scene and its generated audio file.

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

*   **Description:** The system analyzes the script for each scene and sources a list of relevant B-roll video clips from YouTube using the YouTube Data API v3.

*   **User Stories:**
    1.  **As a creator,** I want the AI to automatically find relevant video clips for each scene of my script, **so that** I don't have to spend time searching for stock footage myself.
    2.  **As a creator,** I want to be presented with several visual options for each scene, **so that** I can choose the clip that best fits my narrative.

*   **Functional Requirements:**
    *   The system shall take the structured script (with text per scene) as input.
    *   For each scene, the system must analyze the text to determine the visual theme or subject matter.
    *   The system must query the YouTube Data API v3 with relevant search terms based on the analysis.
    *   The system must retrieve a list of suggested YouTube video clips for each scene.
    *   The system shall implement appropriate filtering (e.g., Creative Commons licensing when possible, content type, duration).
    *   The system must handle YouTube API quotas and rate limits gracefully.
    *   The system must support diverse content types including educational, gaming, nature, tutorials, and general footage.
    *   The system must pass the scene data, along with the suggested clips (YouTube video IDs/URLs), to the Visual Curation UI.

*   **Acceptance Criteria:**
    *   **AC1: Successful Visual Suggestion**
        *   **Given** a scene with the text "A majestic lion roams the savanna at sunset."
        *   **When** the visual sourcing process runs for that scene.
        *   **Then** the system must retrieve a list of YouTube video clips featuring lions, savannas, or sunsets.
    *   **AC2: Data Structure for Curation UI**
        *   **Given** the visual sourcing is complete for a script.
        *   **When** the data is passed to the Curation UI.
        *   **Then** the data structure for each scene must include the scene text and an array of suggested YouTube video URLs/IDs.
    *   **AC3: API Error Handling**
        *   **Given** the YouTube API rate limit has been exceeded.
        *   **When** the system attempts to query for video clips.
        *   **Then** the system must display an appropriate error message and either retry with exponential backoff or provide fallback options.

### 1.6. Visual Curation UI
 
*   **Description:** A user interface that presents the generated script scene-by-scene, allowing the user to review the text and select one video clip for each scene from a list of AI-powered suggestions.
 
*   **User Stories:**
    1.  **As a creator,** I want to see the script text for each scene alongside the suggested video clips, **so that** I can make an informed choice about which visual best matches the narration.
    2.  **As a creator,** I want to preview the suggested video clips, **so that** I can see them in motion before making a selection.
    3.  **As a creator,** I want a simple way to confirm my selections for all scenes and trigger the final video assembly, **so that** I can complete the creation process quickly.
 
*   **Functional Requirements:**
    *   The UI must display a list of scenes from the script.
    *   For each scene, the UI must display the corresponding script text.
    *   For each scene, the UI must display a gallery of suggested video clips retrieved by the visual sourcing module.
    *   The UI must allow the user to play/preview each suggested video clip.
    *   The UI must allow the user to select exactly one video clip per scene.
    *   The UI must provide a "Finish" or "Assemble Video" button that becomes active only after a clip has been selected for every scene.
    *   Upon clicking the final button, the system shall send the complete scene data (scene text, selected clip URL, and corresponding voiceover audio file) to the Automated Video Assembly module.
 
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
    *   The system shall receive the final scene data from the Visual Curation UI (including voiceover audio file and selected video clip for each scene).
    *   For each scene, the system must trim the selected video clip to match the duration of the corresponding voiceover audio.
    *   The system must concatenate the trimmed video clips in the correct scene order.
    *   The system must overlay the voiceover audio for each scene onto its corresponding video clip.
    *   The system shall render the final combined video into a standard format (e.g., MP4).
    *   The system shall make the final video file available for the user to download.
 
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
    *   The system shall use the video's title as text for the thumbnail.
    *   The system shall select a compelling frame from one of the user-selected video clips to use as a background, or generate a new image using an AI model.
    *   The system must overlay the title text onto the background image in a legible and visually appealing way.
    *   The generated thumbnail must be a standard image file (e.g., JPG, PNG) with a 16:9 aspect ratio (e.g., 1920x1080).
    *   The system shall make the final thumbnail file available for the user to download.

*   **Acceptance Criteria:**
    *   **AC1: Successful Thumbnail Generation**
        *   **Given** a video has been generated with the title "The Secrets of Ancient Rome".
        *   **When** the thumbnail generation process runs.
        *   **Then** a 16:9 aspect ratio JPG image is created and made available for download.
    *   **AC2: Thumbnail Content Verification**
        *   **Given** the generated thumbnail from AC1.
        *   **When** the image is viewed.
        *   **Then** it must contain the text "The Secrets of Ancient Rome" and a background image relevant to the topic (e.g., the Colosseum, a Roman statue).

---

## 2. Future Enhancements

*This section lists features and improvements that are considered for future versions of the product beyond the MVP.*

**Note:** Voice Selection (originally 2.1) has been moved to MVP as Feature 1.3.

### 2.1. Stock Footage API Integration
*   **Description:** Add professional stock footage sources (Pexels, Pixabay) as alternatives or supplements to YouTube content. This provides access to high-quality, royalty-free stock video clips for creators who need more polished visuals or want commercial-grade footage.

### 2.2. Advanced Content Filtering
*   **Description:** Enhance the YouTube sourcing capabilities with advanced filtering techniques to identify visually clean footage. For gaming content, this includes filtering for 'no commentary', 'gameplay only' to avoid unwanted overlays, face cams, or watermarks. Implement content quality scoring and advanced licensing detection.

### 2.3. Manual Visual Search
*   **Description:** In the Visual Curation UI, if a user is not satisfied with the AI-suggested clips for a scene, provide an option for them to enter keywords and manually search YouTube or connected stock footage sources for alternative clips.

### 2.4. Text Overlays
*   **Description:** Allow users to add simple text overlays (e.g., for titles, subtitles, or key points) on top of video clips within the Visual Curation UI.

### 2.5. Editable Script & Voiceover Regeneration
*   **Description:** In the Visual Curation UI, allow users to edit the AI-generated script text for any scene and trigger a re-generation of the voiceover for that specific scene. Additionally, allow users to switch voices per scene or for the entire project after initial generation.

### 2.6. LLM Configuration & System Prompts
*   **Description:** Provide comprehensive control over LLM behavior and configuration:
    *   **LLM Provider Configuration:** UI options to select from supported providers (local Ollama, OpenAI, Anthropic, Hugging Face), enter API keys, or specify custom endpoints. Enables "bring your own key" model for cloud providers.
    *   **System Prompt/Persona Configuration:** Allow users to customize the AI assistant's personality, tone, and behavior through configurable system prompts:
        *   **Preset Personas:** Built-in personas optimized for different video types:
            *   Creative Assistant (unrestricted, general brainstorming)
            *   Viral Content Strategist (focus on engagement and shareability)
            *   Educational Content Designer (TED-Ed style, learning-focused)
            *   Documentary Filmmaker (human stories, narrative arcs)
        *   **Custom Personas:** UI for creating and saving custom system prompts with full control over the assistant's behavior, restrictions, and goals.
        *   **Per-Project Personas:** Ability to override default persona on a per-project basis (e.g., use "Educational Designer" for science videos, "Viral Strategist" for entertainment content).
    *   **Rationale:** Local Ollama deployment provides complete control over LLM behavior without external restrictions. System prompts ensure the assistant adapts to different creative workflows and content types.
    *   **MVP Implementation:** Default "Creative Assistant" persona hardcoded. UI configuration added post-MVP.

### 2.7. Topic Research & Web Search
*   **Description:** Enhance the conversational AI agent (Epic 1) with real-time web search capability to research topics, verify current trends, and incorporate up-to-date information into brainstorming sessions. When discussing video topics, the assistant can search for recent developments, trending content, current events, and factual information to provide more relevant and timely suggestions.
*   **Technical Approach:**
    *   Integrate FOSS web search API (DuckDuckGo, Brave Search, or SearXNG)
    *   LLM determines when web search would enhance topic suggestions
    *   Search results summarized and incorporated into conversation naturally
    *   Cache search results to respect API rate limits
*   **Use Cases:**
    *   User: "I want to make a video about AI developments in 2025" → Assistant searches for latest AI news and trends
    *   User: "What's trending in gaming right now?" → Assistant researches current gaming trends and popular titles
    *   User: "Help me find a unique angle on climate change" → Assistant searches for recent studies, viral content, or emerging narratives
*   **User Value:** Creators receive suggestions based on current, real-world data rather than static LLM knowledge. The assistant becomes more helpful for trending topics, current events, and time-sensitive content ideas.
*   **MVP Implementation:** Epic 1 uses only LLM's pre-trained knowledge (no web search). Web search added post-MVP as enhancement to conversational agent.
*   **FOSS Compliance:** Use DuckDuckGo HTML scraping (no API key required), Brave Search API (free tier), or self-hosted SearXNG instance.