# Functional Requirements Index

**Project:** AI Video Generator
**Total FRs:** 84
**Last Updated:** 2025-11-23

---

## Feature 1.1: Conversational AI Agent (13 FRs)

| FR ID | Description |
|-------|-------------|
| FR-1.01 | The system shall provide a chat interface for user-agent interaction |
| FR-1.02 | The agent must understand and respond to natural language queries related to brainstorming video topics |
| FR-1.03 | The agent must maintain conversational context to help refine ideas over multiple turns |
| FR-1.04 | The agent must recognize a specific command to trigger subsequent workflow steps |
| FR-1.05 | The agent must confirm the final topic with the user before proceeding to script generation |
| FR-1.06 | Upon confirmation, the agent must pass the confirmed topic string to subsequent steps |
| FR-1.07 | The system shall provide a "New Chat" button to create new projects/conversations |
| FR-1.08 | The system shall display a sidebar listing all projects ordered by most recently active |
| FR-1.09 | The system shall allow users to click any project to load its complete conversation history |
| FR-1.10 | The system shall visually highlight the currently active project |
| FR-1.11 | The system shall auto-generate project names from the first user message |
| FR-1.12 | The system shall persist the selected project across page reloads using localStorage |
| FR-1.13 | The system may optionally provide project deletion functionality with user confirmation |

---

## Feature 1.2: Automated Script Generation (10 FRs)

| FR ID | Description |
|-------|-------------|
| FR-2.01 | The system shall accept a video topic string as input |
| FR-2.02 | The system must generate a script that is factually relevant to the input topic |
| FR-2.03 | The generated script must be segmented into an ordered list of scenes |
| FR-2.04 | Each scene must contain a block of text for the voiceover |
| FR-2.05 | The system must generate scripts that sound professional, human-written, and engaging |
| FR-2.06 | The system must adapt script tone based on topic type |
| FR-2.07 | The system must avoid AI detection markers |
| FR-2.08 | The system must use professional scriptwriting techniques |
| FR-2.09 | The system shall validate script quality and reject robotic or bland scripts |
| FR-2.10 | The system shall pass the structured script to visual curation and voiceover modules |

---

## Feature 1.3: Voice Selection (7 FRs)

| FR ID | Description |
|-------|-------------|
| FR-3.01 | The system shall present a voice selection interface after topic confirmation |
| FR-3.02 | The system must provide at least 3-5 distinct voice options with different characteristics |
| FR-3.03 | Each voice option must have a short audio preview sample |
| FR-3.04 | The system must allow users to select exactly one voice for their project |
| FR-3.05 | The selected voice must be used consistently for all scene voiceovers |
| FR-3.06 | The system shall store the voice selection as part of the project metadata |
| FR-3.07 | All voice options must use FOSS TTS engines to comply with NFR 1 |

---

## Feature 1.4: Automated Voiceover (5 FRs)

| FR ID | Description |
|-------|-------------|
| FR-4.01 | The system shall take the structured script as input |
| FR-4.02 | The system must use the user's selected voice for generating all voiceovers |
| FR-4.03 | For each scene, the system must generate a corresponding audio file |
| FR-4.04 | The generated audio must be in a standard format (e.g., MP3) |
| FR-4.05 | The system must maintain the association between each scene and its audio file |

---

## Feature 1.5: AI-Powered Visual Sourcing (31 FRs)

| FR ID | Description |
|-------|-------------|
| FR-5.01 | The system shall take the structured script as input |
| FR-5.02 | For each scene, the system must analyze text to determine visual theme |
| FR-5.03 | The system must query the YouTube Data API v3 with relevant search terms |
| FR-5.04 | The system must retrieve a list of suggested YouTube video clips per scene |
| FR-5.05 | The system must detect content type from scene text |
| FR-5.06 | The system must extract specific entities for targeted searches |
| FR-5.07 | The system must generate platform-optimized YouTube search queries |
| FR-5.08 | The system must automatically inject negative search terms |
| FR-5.09 | The system must filter video results based on 1x-3x duration ratio |
| FR-5.10 | The system must enforce a 5-minute maximum duration cap |
| FR-5.11 | The system must relax duration thresholds as fallback if insufficient results |
| FR-5.12 | The system must filter out videos with commentary, reaction content, or vlogs |
| FR-5.13 | The system must filter titles containing reaction/commentary keywords |
| FR-5.14 | The system must prioritize videos with B-roll indicators |
| FR-5.15 | The system should analyze thumbnails using Vision API for pre-filtering |
| FR-5.16 | The system must extract 3 sample frames from downloaded segments |
| FR-5.17 | The system must use FACE_DETECTION to filter talking heads |
| FR-5.18 | The system must use TEXT_DETECTION to filter burned-in captions |
| FR-5.19 | The system must use LABEL_DETECTION to verify content matches scene theme |
| FR-5.20 | The system must implement graceful fallback when API quota exceeded |
| FR-5.21 | The system must respect Google Cloud Vision API free tier limits |
| FR-5.22 | The system must automatically download first N seconds of each suggested video |
| FR-5.23 | Downloads must use appropriate tooling with 720p resolution |
| FR-5.24 | The system must strip audio from all downloaded segments |
| FR-5.25 | The system must store downloaded segments in organized cache structure |
| FR-5.26 | The system must track download status in the database |
| FR-5.27 | Downloaded segments must be immediately available for preview |
| FR-5.28 | The system shall implement appropriate filtering (licensing, content type) |
| FR-5.29 | The system must handle YouTube API quotas and rate limits gracefully |
| FR-5.30 | The system must support diverse content types |
| FR-5.31 | The system must pass scene data with suggested clips to Visual Curation UI |

---

## Feature 1.6: Visual Curation UI (7 FRs)

| FR ID | Description |
|-------|-------------|
| FR-6.01 | The UI must display a list of scenes from the script |
| FR-6.02 | For each scene, the UI must display the corresponding script text |
| FR-6.03 | For each scene, the UI must display a gallery of suggested video clips |
| FR-6.04 | The UI must allow the user to play/preview each suggested video clip |
| FR-6.05 | The UI must allow the user to select exactly one video clip per scene |
| FR-6.06 | The UI must provide an "Assemble Video" button active only when all scenes selected |
| FR-6.07 | Upon clicking final button, system shall send complete scene data to assembly module |

---

## Feature 1.7: Automated Video Assembly (6 FRs)

| FR ID | Description |
|-------|-------------|
| FR-7.01 | The system shall receive final scene data from Visual Curation UI |
| FR-7.02 | For each scene, the system must trim video clip to match voiceover duration |
| FR-7.03 | The system must concatenate trimmed video clips in correct scene order |
| FR-7.04 | The system must overlay voiceover audio onto corresponding video clip |
| FR-7.05 | The system shall render final combined video into standard format (MP4) |
| FR-7.06 | The system shall make final video file available for download |

---

## Feature 1.8: Automated Thumbnail Generation (5 FRs)

| FR ID | Description |
|-------|-------------|
| FR-8.01 | The system shall use the video's title as text for the thumbnail |
| FR-8.02 | The system shall select a compelling frame or generate image for background |
| FR-8.03 | The system must overlay title text in legible and visually appealing way |
| FR-8.04 | The generated thumbnail must be 16:9 aspect ratio (1920x1080) |
| FR-8.05 | The system shall make final thumbnail file available for download |

---

## Summary by Feature

| Feature | FR Range | Count |
|---------|----------|-------|
| 1.1 Conversational AI Agent | FR-1.01 - FR-1.13 | 13 |
| 1.2 Automated Script Generation | FR-2.01 - FR-2.10 | 10 |
| 1.3 Voice Selection | FR-3.01 - FR-3.07 | 7 |
| 1.4 Automated Voiceover | FR-4.01 - FR-4.05 | 5 |
| 1.5 AI-Powered Visual Sourcing | FR-5.01 - FR-5.31 | 31 |
| 1.6 Visual Curation UI | FR-6.01 - FR-6.07 | 7 |
| 1.7 Automated Video Assembly | FR-7.01 - FR-7.06 | 6 |
| 1.8 Automated Thumbnail Generation | FR-8.01 - FR-8.05 | 5 |
| **Total** | | **84** |
