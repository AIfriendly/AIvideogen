# Technical Specification: Content Generation Pipeline

Date: 2025-11-05
Author: lichking
Epic ID: 2
Status: Draft

---

## Overview

Epic 2 implements the complete content generation pipeline for the AI Video Generator, encompassing voice selection, professional-quality script generation, and text-to-speech synthesis. Building on Epic 1's topic confirmation workflow, this epic transforms confirmed topics into production-ready audio-scripted content. The implementation leverages KokoroTTS for high-quality voice synthesis with 48+ voice options, flexible LLM provider support (Ollama/Llama 3.2 or Google Gemini 2.5) for intelligent script generation with professional scriptwriting standards, and a comprehensive text sanitization pipeline to ensure clean TTS output. The architecture follows a progressive enhancement pattern where users first select their preferred voice, then receive AI-generated scripts divided into scenes, and finally get MP3 voiceovers for each scene using their selected voice.

**LLM Provider Options:**
- **Primary (FOSS):** Ollama with Llama 3.2 (3B) - Local deployment, no API costs, complete privacy
- **Optional (Cloud):** Google Gemini 2.5 Flash/Pro - Free tier (1,500 requests/day), no local setup
- **Configuration:** Set via .env.local `LLM_PROVIDER=ollama|gemini`
- **Compatibility:** Both providers implement same LLMProvider interface for seamless switching

This epic represents a critical transformation point in the video creation workflow, where abstract ideas become concrete, narrated content ready for visual pairing. The system emphasizes professional quality output that sounds human-written and naturally spoken, avoiding robotic or AI-generated tells that would diminish viewer engagement.

## Objectives and Scope

**In Scope:**
- Voice selection interface with 3-5+ distinct voice options and audio preview capability
- LLM-based script generation producing professional, human-quality scripts with scene segmentation
- Topic-adaptive tone mapping (documentary, educational, conversational, entertainment styles)
- Quality validation to reject robotic or bland scripts with retry logic
- Text-to-speech synthesis generating MP3 files for each scene using selected voice
- Text sanitization pipeline removing markdown, formatting, and non-speakable characters before TTS
- Database schema extensions for voice selection, scenes, and audio tracking
- Progress tracking and error recovery for multi-scene generation
- Script preview interface with per-scene audio playback capability

**Out of Scope:**
- Manual script editing (Feature 2.5 - Post-MVP enhancement)
- Voice switching after initial selection (Feature 2.5 - Post-MVP)
- Custom voice creation or voice cloning capabilities
- Real-time voice preview during script generation
- Video synchronization (Epic 5 responsibility)
- Visual content sourcing (Epic 3 responsibility)
- Multi-language support or translation
- Background music or sound effects generation

## System Architecture Alignment

This epic aligns with the architecture's modular design and FOSS-compliant technology stack. The implementation leverages the established LLM provider abstraction (architecture.md lines 416-536) for script generation through Ollama/Llama 3.2, introduces KokoroTTS integration for voice synthesis (architecture.md lines 92-93, 2250-2273), and extends the SQLite database schema with scenes and audio_files tables (architecture.md lines 354-376). The system maintains the hybrid state management approach using Zustand for UI state and SQLite for persistent storage. All components follow the established naming conventions, error handling patterns, and API design principles defined in the architecture. The implementation respects the local-first deployment model while maintaining clear migration paths for future cloud deployment through the provider abstraction pattern.

## Detailed Design

### Services and Modules

| Module | Responsibility | Input | Output | Owner |
|--------|---------------|-------|---------|-------|
| **VoiceSelection.tsx** | Display voice options with preview capability | Voice profiles from API | Selected voice_id | Frontend |
| **VoicePreview.tsx** | Audio playback for voice samples | Voice preview URL | Audio playback control | Frontend |
| **ScriptPreview.tsx** | Display generated script with audio players | Scenes with audio paths | User interaction events | Frontend |
| **POST /api/voice/list** | Retrieve available TTS voices | Request | Voice profiles array | Backend |
| **POST /api/projects/[id]/select-voice** | Save voice selection to database | project_id, voice_id | Success/failure status | Backend |
| **POST /api/projects/[id]/generate-script** | Generate professional script via LLM | project_id, topic | Scene array with text | Backend |
| **POST /api/projects/[id]/generate-voiceovers** | Generate TTS audio for all scenes | project_id | Audio file paths array | Backend |
| **lib/llm/prompts/script-generation-prompt.ts** | Professional script generation prompt | Topic, tone requirements | Formatted prompt string | LLM Module |
| **lib/llm/validate-script-quality.ts** | Validate script meets quality standards | Generated script | Pass/fail with reasons | LLM Module |
| **lib/tts/kokoro.ts** | KokoroTTS integration wrapper | Text, voice_id | MP3 audio buffer | TTS Module |
| **lib/tts/sanitize-text.ts** | Remove non-speakable characters | Raw scene text | Clean TTS-ready text | TTS Module |
| **lib/tts/voice-profiles.ts** | Voice profile configuration | None | Voice metadata array | TTS Module |
| **stores/voice-store.ts** | Voice selection state management | Voice selection | State updates | State |
| **lib/db/queries.ts** | Scene and audio CRUD operations | Query parameters | Database records | Database |

### Data Models and Contracts

**Voice Profile Model:**
```typescript
interface VoiceProfile {
  id: string;                    // Unique voice identifier
  name: string;                   // Display name (e.g., "Sarah - American Female")
  gender: 'male' | 'female';     // Voice gender
  accent: string;                 // Accent/region (e.g., "american", "british")
  tone: string;                   // Tone description (e.g., "warm", "professional")
  previewUrl: string;             // Path to preview audio sample
  modelId?: string;               // KokoroTTS model identifier
}
```

**Scene Model (Database Schema):**
```sql
CREATE TABLE scenes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_number INTEGER NOT NULL,
  text TEXT NOT NULL,              -- Original script text
  sanitized_text TEXT,             -- Cleaned text for TTS
  audio_file_path TEXT,            -- Path to generated MP3
  duration REAL,                   -- Duration in seconds
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, scene_number)
);
CREATE INDEX idx_scenes_project ON scenes(project_id);
CREATE INDEX idx_scenes_number ON scenes(scene_number);
```

**Script Generation Response:**
```typescript
interface ScriptGenerationResponse {
  success: boolean;
  data: {
    scenes: Array<{
      sceneNumber: number;        // Sequential scene number (1, 2, 3...)
      text: string;                // Clean narration text (no formatting)
      estimatedDuration?: number;  // Estimated speaking duration
    }>;
    totalScenes: number;
    scriptQuality: {
      passed: boolean;
      score: number;               // 0-100 quality score
      issues?: string[];           // Quality issues if any
    };
  };
}
```

**Audio Generation Request/Response:**
```typescript
interface AudioGenerationRequest {
  projectId: string;
  sceneNumber: number;
  text: string;
  voiceId: string;
}

interface AudioGenerationResponse {
  success: boolean;
  data: {
    audioPath: string;             // Path to generated MP3
    duration: number;              // Duration in seconds
    fileSize: number;              // File size in bytes
  };
}
```

**Project Schema Updates:**
```sql
ALTER TABLE projects ADD COLUMN voice_id TEXT;
ALTER TABLE projects ADD COLUMN script_generated BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN voice_selected BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN total_duration REAL;
```

### APIs and Interfaces

**Voice Selection APIs:**
```typescript
// GET /api/voice/list
Response: {
  success: true,
  data: {
    voices: VoiceProfile[],
    defaultVoice: string          // Default voice ID
  }
}

// POST /api/projects/[id]/select-voice
Request: {
  voiceId: string
}
Response: {
  success: true,
  data: {
    projectId: string,
    voiceId: string,
    voiceSelected: true
  }
}
```

**Script Generation API:**
```typescript
// POST /api/projects/[id]/generate-script
Request: {
  regenerate?: boolean            // Force regeneration if script exists
}
Response: ScriptGenerationResponse
```

**Voiceover Generation API:**
```typescript
// POST /api/projects/[id]/generate-voiceovers
Request: {
  regenerate?: boolean            // Regenerate existing audio files
}
Response: {
  success: true,
  data: {
    scenes: Array<{
      sceneNumber: number,
      audioPath: string,
      duration: number
    }>,
    totalDuration: number,
    filesGenerated: number
  }
}
```

**Script Quality Validation Interface:**
```typescript
interface ScriptQualityValidator {
  validate(script: Scene[]): ValidationResult;
}

interface ValidationResult {
  passed: boolean;
  score: number;                   // 0-100
  issues: QualityIssue[];
}

interface QualityIssue {
  type: 'generic_phrase' | 'robotic_tone' | 'poor_hook' | 'inconsistent_tone';
  severity: 'critical' | 'warning';
  description: string;
  affectedScene?: number;
}
```

### Workflows and Sequencing

**Complete Content Generation Workflow:**

1. **Voice Selection Phase:**
   - User confirms topic (Epic 1) → Navigate to voice selection
   - Load available voices from `GET /api/voice/list`
   - Display VoiceSelection.tsx with preview buttons
   - User previews voices via VoicePreview.tsx audio player
   - User selects voice → `POST /api/projects/[id]/select-voice`
   - Update project.voice_id and voice_selected = true
   - Navigate to script generation loading state

2. **Script Generation Phase:**
   - Display loading indicator with progress message
   - `POST /api/projects/[id]/generate-script` triggered
   - Load topic from projects.topic field
   - Analyze topic for appropriate tone (documentary/educational/entertainment)
   - Generate prompt using script-generation-prompt.ts template
   - Call LLM (Ollama/Llama 3.2 or Gemini 2.5) via provider abstraction
   - Parse JSON response into scene array
   - Run quality validation (validate-script-quality.ts)
   - If validation fails: Retry with improved prompt (max 3 attempts)
   - If validation passes: Save scenes to database
   - Update project.script_generated = true
   - Display ScriptPreview.tsx with scene text

3. **Voiceover Generation Phase:**
   - Auto-trigger `POST /api/projects/[id]/generate-voiceovers`
   - For each scene (process in parallel for performance):
     - Load scene text from database
     - Run text through sanitize-text.ts pipeline
     - Call KokoroTTS with sanitized text and voice_id
     - Save MP3 to `.cache/audio/projects/{projectId}/scene-{number}.mp3`
     - Update scene record with audio_file_path and duration
   - Calculate total_duration (sum of all scene durations)
   - Update project.total_duration and current_step = 'visual-sourcing'
   - Enable audio playback in ScriptPreview.tsx
   - Show "Continue to Visual Sourcing" button

**Error Recovery Sequences:**
- **LLM Connection Failure:** Display error, offer retry button, maintain state
- **Script Quality Failure:** Auto-retry with adjusted prompt (max 3 attempts)
- **TTS Generation Failure:** Skip failed scene, continue others, mark for retry
- **Partial Completion:** Save progress, allow resume from last successful step

## Non-Functional Requirements

### Performance

- **Script Generation:** Complete within 5-10 seconds for typical topics (3-5 scenes)
- **Voice Preview:** Audio samples load and play within 500ms of button click
- **TTS Generation:** Process each scene in < 3 seconds (KokoroTTS 3.2x faster than XTTS)
- **Parallel Processing:** Generate voiceovers for multiple scenes concurrently (target: 5 parallel)
- **Response Times:** API endpoints respond within 200ms for synchronous operations
- **Memory Usage:** TTS model loaded once and reused across requests (82M model size)
- **Cache Strategy:** Voice preview samples cached in browser for instant replay
- **Database Queries:** Scene retrieval queries execute in < 50ms with proper indexing
- **File I/O:** Audio files written directly to disk without intermediate memory buffering

### Security

- **Input Validation:** All text inputs sanitized to prevent script injection
- **File Path Validation:** Audio file paths confined to `.cache/audio/` directory
- **Topic Length Limit:** Maximum 12000 characters to prevent prompt injection attacks
- **Script Length Limit:** Maximum 1200 words per scene to prevent resource exhaustion
- **Voice ID Validation:** Only accept voice IDs from predefined whitelist
- **SQL Injection Prevention:** Use parameterized queries for all database operations
- **Local Processing:** TTS processing happens locally. LLM processing either local (Ollama) or cloud (Gemini with API key)
- **No PII Storage:** Scripts and audio files contain no personally identifiable information
- **CORS Configuration:** API endpoints restricted to same-origin requests only

### Reliability/Availability

- **Retry Logic:** Automatic retry for LLM failures (max 3 attempts with exponential backoff)
- **Partial Failure Handling:** Continue processing other scenes if one fails
- **State Persistence:** All progress saved to SQLite database for crash recovery
- **Graceful Degradation:** If TTS fails, still display script for manual review
- **Connection Monitoring:** Check LLM provider availability before script generation (Ollama or Gemini)
- **Resource Cleanup:** Automatic cleanup of temporary files after 24 hours
- **Transaction Safety:** Database operations wrapped in transactions for consistency
- **Idempotent Operations:** Regeneration requests safely overwrite existing content
- **Error Recovery:** Clear error messages with actionable recovery steps

### Observability

- **Progress Tracking:** Real-time progress indicators for multi-scene generation
- **Generation Metrics:** Log script generation time, quality score, retry count
- **TTS Metrics:** Track voice usage, generation time per scene, file sizes
- **Error Logging:** Detailed error logs with context for debugging
- **Quality Monitoring:** Track script quality scores and validation failures
- **Performance Monitoring:** Log API response times and database query durations
- **User Behavior:** Track voice selection preferences and script regeneration patterns
- **Resource Usage:** Monitor disk space usage for audio files
- **Success Rates:** Track completion rates for each workflow phase

## Dependencies and Integrations

**External Dependencies:**
- **LLM Provider (Choose One):**
  - **Ollama Server (Primary, FOSS):** v0.4.7+ running at localhost:11434 with Llama 3.2 (3B) model loaded
  - **Google Gemini (Optional, Cloud):** API key from Google AI Studio, supports Gemini 2.5 Flash/Pro
- **KokoroTTS:** Python package v0.3.0+ with 82M parameter model downloaded (~320MB)
- **FFmpeg:** v7.1.2+ for audio format conversion if needed
- **Python Runtime:** 3.10+ for KokoroTTS execution via child_process

**Internal Dependencies:**
- **Epic 1 Completion:** Requires topic confirmation workflow and project infrastructure
- **Database Schema:** Extends existing projects table from Epic 1
- **LLM Provider Abstraction:** Uses established pattern from Epic 1 (lib/llm/provider.ts)
- **API Route Pattern:** Follows conventions established in Epic 1
- **State Management:** Extends existing Zustand stores pattern

**NPM Package Dependencies:**
```json
{
  "ollama": "^0.6.2",                      // Ollama LLM client SDK (local)
  "@google/generative-ai": "^0.21.0",     // Gemini LLM client SDK (cloud)
  "uuid": "^11.0.4",                       // Scene ID generation
  "zod": "^3.24.1"                         // API request/response validation
}
```

**Python Dependencies (requirements.txt):**
```
kokoro-tts==0.3.0               # TTS engine
numpy==1.24.3                   # Audio processing
scipy==1.11.1                   # Audio utilities
```

**File System Dependencies:**
- `.cache/audio/` directory must exist with write permissions
- `.cache/audio/previews/` for voice sample storage
- `.cache/audio/projects/{projectId}/` for scene audio files

## Acceptance Criteria (Authoritative)

**AC1: Voice Selection Interface Display**
- Given: User has confirmed a topic and advances to voice selection
- When: The voice selection UI loads
- Then: At least 3-5 distinct voice options are displayed with metadata (name, gender, accent)
- And: Each voice has a preview button that plays a sample audio clip

**AC2: Voice Selection Persistence**
- Given: User selects a voice for their project
- When: Voiceover generation completes
- Then: All scenes use the selected voice consistently
- And: The voice selection is saved to the database for future reference

**AC3: Professional Script Generation**
- Given: Script generation is triggered for a topic
- When: The LLM generates the script
- Then: The script must sound professional and human-written
- And: Must NOT contain generic AI phrases ("In today's video", "Moving on", "It's important to note")
- And: Must have strong narrative hooks and topic-appropriate tone
- And: Must be structured into 3-5 logical scenes minimum

**AC4: Script Quality Validation**
- Given: A script is generated by the LLM
- When: Quality validation runs
- Then: Robotic or bland scripts must be rejected
- And: System retries with improved prompts (max 3 attempts)
- And: Only scripts meeting professional quality standards proceed to TTS

**AC5: Text Sanitization for TTS**
- Given: Scene text contains markdown or formatting characters
- When: Text is prepared for TTS generation
- Then: All non-speakable characters are removed (*, #, _, scene labels)
- And: The resulting audio contains only clean narration

**AC6: Voiceover Generation Completeness**
- Given: A script with N scenes
- When: Voiceover generation completes
- Then: N distinct MP3 files are created
- And: Each file corresponds to one scene's text
- And: Total duration is calculated and stored

**AC7: Script Preview with Audio Playback**
- Given: Script and voiceovers have been generated
- When: User views the script preview
- Then: Each scene displays its text and duration
- And: Each scene has a playable audio preview
- And: User can listen to any scene's voiceover

**AC8: Error Recovery and Progress Persistence**
- Given: A failure occurs during script or voiceover generation
- When: User retries the operation
- Then: System resumes from the last successful step
- And: Previously generated content is not regenerated unnecessarily

## Traceability Mapping

| Acceptance Criteria | Spec Section | Component/API | Test Approach |
|-------------------|--------------|---------------|---------------|
| AC1: Voice Selection Display | Services: VoiceSelection.tsx | GET /api/voice/list | Component test: Verify voice cards render |
| AC2: Voice Persistence | Data Models: Project Schema | POST /api/projects/[id]/select-voice | Integration test: Verify voice_id saved |
| AC3: Professional Scripts | Workflows: Script Generation Phase | lib/llm/prompts/script-generation-prompt.ts | Unit test: Validate prompt quality rules |
| AC4: Quality Validation | APIs: ScriptQualityValidator | lib/llm/validate-script-quality.ts | Unit test: Test rejection of bad scripts |
| AC5: Text Sanitization | Services: sanitize-text.ts | lib/tts/sanitize-text.ts | Unit test: Verify markdown removal |
| AC6: Voiceover Completeness | Workflows: Voiceover Generation | POST /api/projects/[id]/generate-voiceovers | Integration test: Verify file creation |
| AC7: Script Preview | Services: ScriptPreview.tsx | components/features/voice/ScriptPreview.tsx | E2E test: Audio playback functionality |
| AC8: Error Recovery | NFR: Reliability | All generation endpoints | Integration test: Simulate failures |

## Risks, Assumptions, Open Questions

**Risks:**
- **Risk:** KokoroTTS model download size (320MB) may slow initial setup
  - *Mitigation:* Provide pre-download instructions and progress indicator
- **Risk:** LLM provider connection may timeout for long script generation
  - *Mitigation:* Implement connection health checks and retry logic for both Ollama and Gemini
- **Risk:** Gemini free tier rate limits (15 RPM, 1,500 RPD) may be exceeded during testing
  - *Mitigation:* Implement rate limiting, caching, and fallback to Ollama
- **Risk:** Parallel TTS generation may exhaust system resources
  - *Mitigation:* Limit concurrent generations to 5, queue remainder
- **Risk:** Script quality validation may be too strict, rejecting good scripts
  - *Mitigation:* Tune validation thresholds based on testing feedback

**Assumptions:**
- **Assumption:** Users have either Ollama running with Llama 3.2 OR valid Gemini API key
  - Ollama is primary (FOSS-compliant), Gemini is optional cloud alternative
- **Assumption:** System has sufficient disk space for audio files (~10MB per project)
- **Assumption:** Python 3.10+ is installed for KokoroTTS execution
- **Assumption:** Users prefer voice selection before script generation (not after)
- **Assumption:** 3-5 scenes is optimal for MVP videos (not 10+)
- **Assumption:** Gemini 2.5 models provide quality comparable to Llama 3.2 for script generation

**Open Questions:**
- **Question:** Should voice preview samples be pre-generated or generated on-demand?
  - *Recommendation:* Pre-generate for instant playback
- **Question:** Should failed scene audio generation block the entire workflow?
  - *Recommendation:* Allow partial completion with retry option
- **Question:** What is the maximum script length we should support?
  - *Recommendation:* 500 words per scene, 2500 words total
- **Question:** Should we support voice blending (KokoroTTS feature)?
  - *Recommendation:* Post-MVP enhancement

## Test Strategy Summary

**Unit Testing:**
- Text sanitization functions (100% coverage for edge cases)
- Script quality validation logic (test all rejection criteria)
- Voice profile configuration (verify all voices have required metadata)
- Database query functions for scenes and audio records

**Integration Testing:**
- Voice selection → Database persistence flow
- Script generation → Quality validation → Database save flow
- Scene text → Sanitization → TTS → File save flow
- Error recovery and retry mechanisms

**E2E Testing:**
- Complete workflow: Topic confirmation → Voice selection → Script generation → Voiceover playback
- Multi-scene script generation and audio file creation
- Voice preview playback functionality
- Progress indicators and error message display

**Performance Testing:**
- Script generation response time (< 10 seconds)
- Parallel TTS generation for 5 scenes
- Voice preview loading time (< 500ms)
- Database query performance with indexes

**Manual Testing:**
- Audio quality verification for each voice option
- Script readability and narrative flow
- UI responsiveness during long operations
- Error message clarity and recovery options