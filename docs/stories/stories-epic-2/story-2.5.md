# Story 2.5: Voiceover Generation for Scenes

**Epic:** Epic 2 - Content Generation Pipeline
**Story ID:** 2.5
**Status:** Implemented
**Created:** 2025-11-07
**Last Updated:** 2025-11-09
**Implemented:** 2025-11-09
**Assigned To:** Dev Agent
**Sprint:** Epic 2 Sprint 2

---

## Story Overview

**Goal:** Generate TTS audio files for each script scene using selected voice with comprehensive text sanitization and progress tracking

**Description:**
Implement the voiceover generation workflow that converts script scenes into audio files using the voice profile selected in Story 2.3. The system loads all scenes from the database, sanitizes the text to remove non-speakable content (markdown, scene labels, stage directions), and generates MP3 audio files using KokoroTTS from Story 2.1. Each scene is processed sequentially with progress tracking via polling endpoint, audio files are saved to organized directories, and scene records are updated with file paths and durations. The system implements partial completion recovery to allow resuming generation if interrupted, and calculates total project duration for workflow planning.

**Business Value:**
- Converts written scripts into professional narration audio automatically
- Ensures voice consistency across all scenes using single voice profile
- Produces clean audio without TTS artifacts or spoken formatting
- Enables progress monitoring during multi-scene generation
- Provides resume capability for long-running generation jobs
- Calculates accurate video duration for production planning
- Establishes audio foundation for video assembly in Epic 3

---

## Story

As a **video creator**,
I want **the system to generate professional audio narration for each script scene using my selected voice**,
so that **I have complete voiceover audio ready for video production without manual recording**.

---

## Acceptance Criteria

1. **Voiceover generation endpoint accepts projectId as input**
   - Given: Project has completed script generation (Story 2.4)
   - When: POST /api/projects/[id]/generate-voiceovers is called
   - Then: The endpoint validates project exists and has scenes
   - And: Endpoint validates voice has been selected
   - And: Endpoint returns 400 if prerequisites not met with error codes

2. **Text sanitization removes all non-speakable characters before TTS**
   - Given: Scene text may contain markdown, labels, or formatting
   - When: Text is prepared for TTS generation
   - Then: Markdown characters (*, #, _, `, **) are removed
   - And: Scene labels ("Scene 1:", "Title:", "Narrator:") are removed
   - And: Stage directions [in brackets] are removed
   - And: Multiple newlines/whitespace collapsed to single space
   - And: Leading/trailing whitespace trimmed
   - And: Only speakable punctuation (.,!?;:) is preserved

3. **Generated audio contains ONLY clean narration**
   - Given: Scene text has been sanitized
   - When: TTS audio is generated
   - Then: Audio contains NO spoken asterisks, hashtags, or formatting
   - And: Audio contains NO spoken scene numbers or labels
   - And: Audio contains NO artifacts from markdown syntax
   - And: Audio sounds natural and professionally narrated

4. **TTS generates MP3 file for each scene using selected voice consistently**
   - Given: Project has selected voice_id (Story 2.3)
   - When: Each scene is processed for voiceover generation
   - Then: KokoroTTS generates audio using the project's voice_id
   - And: All scenes use the SAME voice_id for consistency
   - And: Audio format is MP3, 128kbps, 44.1kHz, Mono (Story 2.1 standard)
   - And: Each scene generates exactly one audio file

5. **Audio files saved with organized naming convention**
   - Given: Audio generation succeeds for a scene
   - When: Audio file is saved to disk
   - Then: File is saved to `.cache/audio/projects/{projectId}/scene-{number}.mp3`
   - And: Directory structure is created automatically if missing
   - And: Scene number matches scene.scene_number field
   - And: File naming is consistent and predictable

6. **Each scene record updated with audio_file_path and duration**
   - Given: Audio file has been saved successfully
   - When: Database update is performed
   - Then: scenes.audio_file_path is updated with relative path
   - And: scenes.duration is updated with audio duration in seconds
   - And: Path format is `.cache/audio/projects/{projectId}/scene-{number}.mp3`
   - And: Duration is accurate (measured from generated audio file)

7. **Progress indicator shows current scene being processed**
   - Given: Multiple scenes are being processed
   - When: Generation is in progress
   - Then: API returns current scene number being processed via polling endpoint
   - And: Progress percentage calculated as (completed / total) * 100
   - And: UI displays "Processing Scene X of Y..."
   - And: Progress updates through polling mechanism

8. **Partial failures allow resume (don't regenerate completed scenes)**
   - Given: Generation fails partway through (e.g., scene 3 of 5)
   - When: User retries voiceover generation
   - Then: System detects scenes 1-2 already have audio files
   - And: System SKIPS regeneration for completed scenes
   - And: System resumes from first incomplete scene (scene 3)
   - And: Total generation time reduced by skipping completed work

9. **Total project duration calculated and stored**
   - Given: All scenes have generated audio with durations
   - When: Final scene completes generation
   - Then: System calculates sum of all scene durations
   - And: projects.total_duration is updated with sum (in seconds)
   - And: Total duration is available for video planning

10. **Project workflow advances to visual-sourcing step**
    - Given: All scenes have generated audio successfully
    - When: Voiceover generation completes
    - Then: projects.current_step is updated to 'visual-sourcing'
    - And: projects.last_active timestamp is updated
    - And: User can proceed to Epic 3 (visual sourcing - placeholder)

---

## Tasks / Subtasks

### Task 1: Create Text Sanitization Module (AC: #2, #3)

**File:** `lib/tts/sanitize-text.ts`

- [ ] **1.1** Define sanitization interface
  ```typescript
  export interface SanitizationResult {
    sanitized: string;
    originalLength: number;
    sanitizedLength: number;
    removedElements: string[];
  }
  ```

- [ ] **1.2** Implement `sanitizeForTTS(text: string): SanitizationResult`
  - Remove markdown characters: `*`, `#`, `_`, `` ` ``, `**`, `__`, `~~`
  - Use regex: `/[*#_`~]/g` for basic markdown removal
  - Remove markdown headings: `### Title` → `Title`
  - Remove emphasis patterns: `**bold**` → `bold`, `*italic*` → `italic`

- [ ] **1.3** Implement scene label removal
  - Remove patterns: `"Scene X:"`, `"Title:"`, `"Narrator:"`, `"[Audio]:"`, `"[VO]:"`, `"[Voiceover]:"`
  - Use regex: `/^(Scene \d+|Title|Narrator|\[.*?\]):\s*/gim`
  - Remove from start of lines only (not mid-sentence)

- [ ] **1.4** Implement stage direction removal
  - Remove content in square brackets: `[pause]`, `[laughs]`, `[music fades]`
  - Use regex: `/\[.*?\]/g`
  - Preserve brackets in actual dialogue (context-aware parsing)

- [ ] **1.5** Implement whitespace normalization
  - Collapse multiple newlines to single space: `\n\n\n` → ` `
  - Collapse multiple spaces to single space: `   ` → ` `
  - Trim leading and trailing whitespace
  - Preserve intentional punctuation spacing

- [ ] **1.6** Add validation function `validateSanitized(text: string): boolean`
  - Check for remaining markdown characters
  - Check for remaining scene labels
  - Check for remaining stage directions
  - Return false if any non-speakable content detected

- [ ] **1.7** Add unit tests for sanitization
  - Test markdown removal (all variants)
  - Test scene label removal (all patterns)
  - Test stage direction removal
  - Test whitespace normalization
  - Test edge cases (empty string, only formatting, nested patterns)

### Task 2: Create Voiceover Generation API Endpoint (AC: #1, #4, #5, #6, #7, #8, #9, #10)

**File:** `app/api/projects/[id]/generate-voiceovers/route.ts`

- [ ] **2.1** Create POST endpoint handler
  - [ ] **2.1.1** Import and await `initializeDatabase()` at module level before route handler
    ```typescript
    import { initializeDatabase } from '@/lib/db/init';
    await initializeDatabase();

    export async function POST(
      req: Request,
      { params }: { params: { id: string } }
    ): Promise<Response>
    ```

- [ ] **2.2** Validate prerequisites
  - Validate projectId is valid UUID format
  - Load project using `getProjectById(projectId)` from Story 2.2
  - Return 404 if project not found
  - Validate `projects.script_generated === true`
  - Return 400 with SCRIPT_NOT_GENERATED if script not generated
  - Validate `projects.voice_id` is not null
  - Return 400 with VOICE_NOT_SELECTED if voice not selected

- [ ] **2.3** Load all scenes from database
  - Use `getScenesByProjectId(projectId)` query from Story 2.2
  - Order by `scene_number` ASC for sequential processing
  - Validate at least 1 scene exists
  - Return 400 with NO_SCENES_FOUND if no scenes found

- [ ] **2.4** Delegate to business logic layer
  - Call `generateVoiceoversWithProgress()` from Task 3
  - Pass projectId, scenes, and voice_id
  - Let business logic handle all generation and progress tracking
  - Catch errors from business logic layer

- [ ] **2.5** Handle progress updates via polling
  - Store progress state in database or in-memory cache
  - Progress tracked through separate polling endpoint (see Task 5)
  - Main endpoint returns immediately after starting generation
  - Progress percentage calculated as (completed / total) * 100

- [ ] **2.6** Update project status after completion
  - Set `projects.current_step = 'visual-sourcing'` using `updateProjectStep()`
  - Update `projects.last_active` timestamp
  - Return success response with summary

- [ ] **2.7** Return success response
  ```typescript
  return NextResponse.json({
    success: true,
    data: {
      projectId: project.id,
      sceneCount: scenes.length,
      totalDuration: project.total_duration,
      audioFiles: scenes.map(s => ({
        sceneNumber: s.scene_number,
        audioPath: s.audio_file_path,
        duration: s.duration
      }))
    }
  });
  ```

- [ ] **2.8** Handle errors with proper codes
  - SCRIPT_NOT_GENERATED (400): Script must be generated before voiceovers
  - VOICE_NOT_SELECTED (400): Voice must be selected before voiceovers
  - NO_SCENES_FOUND (400): No scenes exist for this project
  - TTS_SERVICE_ERROR (500): TTS generation failed
  - DATABASE_ERROR (500): Database operation failed
  - PROJECT_NOT_FOUND (404): Project not found

### Task 3: Implement Voiceover Generation Business Logic (AC: #4, #5, #6, #7, #8, #9)

**File:** `lib/tts/voiceover-generator.ts`

- [ ] **3.1** Create business logic function
  ```typescript
  export async function generateVoiceoversWithProgress(
    projectId: string,
    scenes: Scene[],
    voiceId: string,
    onProgress?: (scene: number, total: number) => void
  ): Promise<VoiceoverResult>
  ```

- [ ] **3.2** Implement partial completion detection
  - For each scene, check if `audio_file_path` is not null
  - If audio file exists, verify file exists on disk
  - Skip generation if both database record and file exist
  - Log skipped scenes: "Skipping scene X - audio already exists"

- [ ] **3.3** Implement sequential scene processing loop
  - Process scenes in order (scene_number ASC)
  - For each incomplete scene:
    - Sanitize scene.text using `sanitizeForTTS()` from Task 1
    - Generate audio using TTS provider
    - Save audio file to disk
    - Update database with file path and duration
    - Call progress callback if provided
    - Add delay between scenes to avoid TTS rate limits (100ms)

- [ ] **3.4** Generate audio for each scene
  - Import TTS provider: `import { getTTSProvider } from '@/lib/tts/provider';`
  - Get provider instance: `const tts = getTTSProvider();`
  - Call TTS: `const audio = await tts.generateAudio(sanitizedText, voiceId);`
  - Result includes: audioBuffer, duration, tempFilePath

- [ ] **3.5** Save audio files with organized naming
  - Create directory structure: `.cache/audio/projects/{projectId}/`
  - Use `fs.mkdirSync(dirPath, { recursive: true })`
  - Construct filename: `scene-${sceneNumber}.mp3`
  - Save audio buffer to file
  - Construct relative path: `.cache/audio/projects/{projectId}/scene-${sceneNumber}.mp3`

- [ ] **3.6** Update scene database records
  - Call `updateSceneAudio(sceneId, audioPath, duration)` from Story 2.2
  - Pass relative path (not absolute)
  - Pass duration in seconds (from TTS provider)
  - Update scenes.sanitized_text with cleaned text (optional)

- [ ] **3.7** Calculate and store total duration
  - Sum all scene durations after generation completes
  - Call `updateProjectDuration(projectId, totalDuration)` from Story 2.2
  - Round to 2 decimal places for precision

- [ ] **3.8** Handle TTS provider errors
  - Catch TTS_SERVICE_ERROR: Retry once with 2-second delay
  - Catch TTS_TIMEOUT: Skip scene and continue (log error)
  - Catch TTS_MODEL_NOT_FOUND: Abort with actionable error
  - Log all errors with scene context

- [ ] **3.9** Return generation result
  ```typescript
  interface VoiceoverResult {
    completed: number;
    skipped: number;
    failed: number;
    totalDuration: number;
    errors?: Array<{ sceneNumber: number, error: string }>;
  }
  ```

### Task 4: Verify Dependency Query Functions (AC: #6, #9)

**File:** Verification Task (Story 2.2 Dependencies)

- [ ] **4.1** Verify Story 2.2 provides required query functions
  - Confirm `getScenesByProjectId(projectId: string): Scene[]` exists in `lib/db/queries.ts`
  - Confirm `updateSceneAudio(sceneId: string, audioPath: string, duration: number): Scene` exists
  - Confirm `updateProjectDuration(projectId: string, totalDuration: number): Project` exists
  - Document any missing functions that need to be added to Story 2.2

- [ ] **4.2** Add missing query functions to Story 2.2 if needed
  - If `getScenesByProjectId` missing: Add to `lib/db/queries.ts`
    ```typescript
    export function getScenesByProjectId(db: Database, projectId: string): Scene[] {
      const query = `SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_number ASC`;
      return db.prepare(query).all(projectId) as Scene[];
    }
    ```
  - If `updateSceneAudio` missing: Add to `lib/db/queries.ts`
    ```typescript
    export function updateSceneAudio(
      db: Database,
      id: string,
      audioPath: string,
      duration: number
    ): Scene {
      const query = `
        UPDATE scenes
        SET audio_file_path = ?, duration = ?, updated_at = datetime('now')
        WHERE id = ?
        RETURNING *
      `;
      return db.prepare(query).get(audioPath, duration, id) as Scene;
    }
    ```
  - If `updateProjectDuration` missing: Add to `lib/db/queries.ts`
    ```typescript
    export function updateProjectDuration(
      db: Database,
      projectId: string,
      totalDuration: number
    ): Project {
      const query = `
        UPDATE projects
        SET total_duration = ?, updated_at = datetime('now')
        WHERE id = ?
        RETURNING *
      `;
      return db.prepare(query).get(totalDuration, projectId) as Project;
    }
    ```

### Task 5: Create Progress Polling Endpoint (AC: #7)

**File:** `app/api/projects/[id]/voiceover-progress/route.ts`

- [ ] **5.1** Create GET endpoint for progress polling
  ```typescript
  export async function GET(
    req: Request,
    { params }: { params: { id: string } }
  ): Promise<Response>
  ```

- [ ] **5.2** Store progress state during generation
  - Use in-memory cache or database table for progress tracking
  - Store: projectId, currentScene, totalScenes, status (generating, complete, error)
  - Update state in business logic layer (Task 3)

- [ ] **5.3** Return progress data via polling endpoint
  - Return: `{ status, currentScene, totalScenes, progress }`
  - Progress calculated: `(currentScene / totalScenes) * 100`
  - Status values: 'idle', 'generating', 'complete', 'error'
  - Include error message if status is 'error'

- [ ] **5.4** Clean up progress state after completion
  - Remove progress data from cache after generation completes
  - Set expiration time for progress data (e.g., 1 hour)

### Task 6: Create Voiceover Generation UI Component (AC: #7)

**File:** `components/features/voiceover/VoiceoverGenerator.tsx`

- [ ] **6.1** Create Client Component for voiceover generation
  - Add `'use client'` directive
  - Accept props: `{ projectId: string, sceneCount: number }`
  - Manage generation state: idle, generating, complete, error

- [ ] **6.2** Implement generation trigger
  - Add "Generate Voiceover" button
  - On click, call POST /api/projects/[id]/generate-voiceovers
  - Disable button during generation
  - Show loading state with spinner

- [ ] **6.3** Implement progress tracking UI
  - Display progress bar (0-100%)
  - Display "Processing Scene X of Y..."
  - Display current scene text preview (optional)
  - Update progress in real-time during generation

- [ ] **6.4** Poll for progress updates
  - Poll endpoint: GET /api/projects/[id]/voiceover-progress
  - Poll interval: 1 second
  - Stop polling when complete or error
  - Handle polling errors gracefully

- [ ] **6.5** Display completion summary
  - Show success message: "Voiceover generation complete!"
  - Display total duration: "Total video duration: 2:34"
  - Display scene count: "Generated audio for 5 scenes"
  - Add "Continue to Visual Sourcing" button (placeholder)

- [ ] **6.6** Handle errors gracefully
  - Display error message if generation fails
  - Show retry button
  - Display partial completion status if applicable
  - Link to troubleshooting documentation

- [ ] **6.7** Implement workflow state guards
  - Check project.current_step === 'voiceover' or 'script'
  - Redirect to appropriate step if accessing out of sequence
  - If current_step === 'visual-sourcing', show completion state

### Task 7: Create Voiceover Page Component (AC: #1, #10)

**File:** `app/projects/[id]/voiceover/page.tsx`

- [ ] **7.1** Create Server Component page
  - Keep as Server Component (no 'use client' directive)
  - Load project data using `getProjectById(projectId)`
  - Verify project exists (return notFound() if not)
  - Verify script generated (check `script_generated === true`)
  - Verify voice selected (check `voice_id !== null`)

- [ ] **7.2** Load scene data
  - Use `getScenesByProjectId(projectId)` to load scenes
  - Count total scenes for progress tracking
  - Pass scene data to Client Component

- [ ] **7.3** Render VoiceoverGenerator component
  - Pass projectId and sceneCount as props
  - Add page metadata and layout
  - Follow Epic 1 page component patterns

- [ ] **7.4** Implement workflow state guards
  - Check project.current_step === 'voiceover' or 'script'
  - Redirect to appropriate step if accessing out of sequence
  - If current_step === 'visual-sourcing', show completion state
  - Use Next.js redirect() for out-of-sequence navigation

### Task 8: Create Voiceover Store for State Management (AC: #7)

**File:** `lib/stores/voiceover-store.ts`

- [ ] **8.1** Create `lib/stores/voiceover-store.ts` using Zustand
  - Define store interface with TypeScript types
  - State: generationStatus ('idle' | 'generating' | 'complete' | 'error')
  - State: currentScene (number | null)
  - State: totalScenes (number)
  - State: progress (number, 0-100)
  - State: errorMessage (string | null)
  - Action: startGeneration(totalScenes: number)
  - Action: updateProgress(currentScene: number, totalScenes: number)
  - Action: completeGeneration()
  - Action: setError(message: string)
  - Action: resetState()

- [ ] **8.2** Integrate voiceover store with VoiceoverGenerator component
  - Import voiceover store hook
  - Use store for generation state tracking
  - Update store during polling
  - Reset state on component unmount

### Task 9: Add Integration Tests (AC: All)

**File:** `tests/integration/voiceover-generation.test.ts`

- [ ] **9.1** Test successful voiceover generation
  - Create test project with script and voice
  - Call generate-voiceovers endpoint
  - Verify audio files created for all scenes
  - Verify database updated with paths and durations
  - Verify total duration calculated
  - Verify current_step updated to 'visual-sourcing'

- [ ] **9.2** Test text sanitization integration
  - Create scene with markdown: `**Bold** text with *emphasis*`
  - Generate voiceover
  - Verify audio does not contain spoken asterisks
  - Verify sanitized text saved to database

- [ ] **9.3** Test partial completion resume
  - Create project with 3 scenes
  - Generate audio for scenes 1-2 manually
  - Call generate-voiceovers endpoint
  - Verify scenes 1-2 skipped (not regenerated)
  - Verify only scene 3 generated
  - Verify total duration includes all scenes

- [ ] **9.4** Test progress tracking
  - Mock progress callback
  - Generate voiceovers for 5 scenes
  - Poll progress endpoint during generation
  - Verify progress values: 0/5, 1/5, 2/5, 3/5, 4/5, 5/5

- [ ] **9.5** Test error handling
  - Test missing script: should return 400 with SCRIPT_NOT_GENERATED
  - Test missing voice: should return 400 with VOICE_NOT_SELECTED
  - Test no scenes: should return 400 with NO_SCENES_FOUND
  - Test TTS provider failure: should return 500 with TTS_SERVICE_ERROR
  - Test database error: should return 500 with DATABASE_ERROR

- [ ] **9.6** Test edge cases
  - Test project with 1 scene (minimum)
  - Test project with 7 scenes (maximum typical)
  - Test scene with empty text (should skip or error)
  - Test scene with very long text (>500 words)

### Task 10: Add Unit Tests (AC: #2, #3)

**File:** `tests/unit/tts/sanitize-text.test.ts`

- [ ] **10.1** Test markdown removal
  - Test: `"**Bold** text"` → `"Bold text"`
  - Test: `"*Italic* text"` → `"Italic text"`
  - Test: `"### Heading"` → `"Heading"`
  - Test: `` "`code`" `` → `"code"`
  - Test: `"~~strikethrough~~"` → `"strikethrough"`

- [ ] **10.2** Test scene label removal
  - Test: `"Scene 1: The opening"` → `"The opening"`
  - Test: `"Title: Introduction"` → `"Introduction"`
  - Test: `"Narrator: Once upon a time"` → `"Once upon a time"`
  - Test: `"[VO]: Welcome"` → `"Welcome"`

- [ ] **10.3** Test stage direction removal
  - Test: `"Hello [pause] world"` → `"Hello world"`
  - Test: `"[music fades] The story begins"` → `"The story begins"`
  - Test: `"Welcome [laughs] everyone"` → `"Welcome everyone"`

- [ ] **10.4** Test whitespace normalization
  - Test: `"Text\n\n\nMore text"` → `"Text More text"`
  - Test: `"Text   with   spaces"` → `"Text with spaces"`
  - Test: `"  Trimmed  "` → `"Trimmed"`

- [ ] **10.5** Test complex combinations
  - Test: `"**Scene 1:** [music] Welcome\n\nto the *show*"` → `"Welcome to the show"`
  - Test: Multiple patterns in single string
  - Test: Nested patterns

- [ ] **10.6** Test edge cases
  - Test: Empty string → Empty string
  - Test: Only formatting (no content) → Empty string
  - Test: Already clean text → Unchanged

### Task 11: Add Performance Optimization (AC: #4)

**File:** `lib/tts/voiceover-generator.ts` (extend)

- [ ] **11.1** Implement audio file caching
  - Check if audio file exists before regeneration
  - Verify file size > 0 bytes
  - Verify file is valid MP3 (check header)

- [ ] **11.2** Implement batch processing hints
  - Add delay between TTS calls to respect rate limits
  - Log TTS provider response times
  - Monitor for rate limit errors (429 status)

- [ ] **11.3** Implement progress persistence
  - Save generation state to database periodically
  - Allow resume from any point if interrupted
  - Clear state on successful completion

- [ ] **11.4** Optimize database updates
  - Batch scene updates if possible
  - Use transactions for atomic updates
  - Update total duration only once at end

### Task 12: Add Error Recovery (AC: #8)

**File:** `lib/tts/voiceover-generator.ts` (extend)

- [ ] **12.1** Implement retry logic for transient failures
  - Retry TTS_TIMEOUT errors once
  - Retry TTS_SERVICE_ERROR once with backoff
  - Do not retry TTS_MODEL_NOT_FOUND (permanent error)

- [ ] **12.2** Implement partial failure handling
  - Continue processing remaining scenes if one fails
  - Collect all errors for final report
  - Mark failed scenes for manual retry

- [ ] **12.3** Implement cleanup on failure
  - Delete incomplete audio files
  - Do not update database for failed scenes
  - Preserve completed scenes for resume

---

## Dev Notes

### Architecture Patterns

**Layered Architecture:**
- **API Layer (Task 2):** Validates input, delegates to business logic, returns response
- **Business Logic Layer (Task 3):** Handles scene processing, TTS calls, file management, progress tracking
- **Data Layer (Task 4):** Database queries for scenes and project updates
- **Presentation Layer (Task 6):** UI components for generation trigger and progress display

**Business Logic Separation:**
- API route handler (Task 2.4) calls `generateVoiceoversWithProgress()` from business logic layer (Task 3)
- Business logic function receives: projectId, scenes array, voice_id
- Business logic handles: sanitization, TTS calls, file I/O, database updates, progress callbacks
- API route only validates input and delegates to business logic

**TTS Provider Integration:**
- Use `getTTSProvider()` factory from Story 2.1
- Provider returns `{ audioBuffer, duration, tempFilePath }`
- Audio format: MP3, 128kbps, 44.1kHz, Mono (standardized)
- Provider handles KokoroTTS service communication

**Text Sanitization Pattern:**
- Sanitize text BEFORE TTS call (not after)
- Validate sanitized text has no artifacts
- Store both original and sanitized text (optional)
- Log removed elements for debugging

**Progress Tracking Pattern (Polling Approach for MVP):**
- **Primary Approach:** Polling endpoint (simpler for MVP)
- Store progress state in database or in-memory cache
- UI polls GET /api/projects/[id]/voiceover-progress every 1 second
- Progress calculated: (completed / total) * 100
- Future enhancement: Server-Sent Events (SSE) for real-time updates

**Partial Completion Pattern:**
- Check database for existing audio_file_path
- Verify file exists on disk (fs.existsSync)
- Skip generation if both conditions true
- Resume from first incomplete scene

**Error Handling Strategy:**
- Transient errors: Retry with exponential backoff
- Permanent errors: Abort with actionable message
- Partial failures: Continue processing, collect errors
- File system errors: Cleanup and log

**Error Codes (Task 2.8):**
- SCRIPT_NOT_GENERATED (400): Script must be generated before voiceovers
- VOICE_NOT_SELECTED (400): Voice must be selected before voiceovers
- NO_SCENES_FOUND (400): No scenes exist for this project
- TTS_SERVICE_ERROR (500): TTS generation failed
- DATABASE_ERROR (500): Database operation failed
- PROJECT_NOT_FOUND (404): Project not found

### File Structure

**New Files:**
- `lib/tts/sanitize-text.ts` - Text sanitization utilities
- `lib/tts/voiceover-generator.ts` - Business logic layer
- `app/api/projects/[id]/generate-voiceovers/route.ts` - API endpoint
- `app/api/projects/[id]/voiceover-progress/route.ts` - Progress polling endpoint
- `components/features/voiceover/VoiceoverGenerator.tsx` - Client Component
- `app/projects/[id]/voiceover/page.tsx` - Server Component page
- `lib/stores/voiceover-store.ts` - Voiceover state management (NOT `stores/`)

**Modified Files:**
- `lib/db/queries.ts` - Add scene and duration query functions (if missing from Story 2.2)
- `types/database.ts` - Add VoiceoverResult interface

**Test Files:**
- `tests/integration/voiceover-generation.test.ts` - Integration tests
- `tests/unit/tts/sanitize-text.test.ts` - Unit tests for sanitization
- `tests/unit/tts/voiceover-generator.test.ts` - Unit tests for business logic

**Audio Storage Structure:**
```
.cache/
  audio/
    previews/           # Voice preview files (Story 2.1)
      {voiceId}.mp3
    projects/           # Project voiceover files
      {projectId}/
        scene-1.mp3
        scene-2.mp3
        scene-3.mp3
        ...
```

### Testing Strategy

**Unit Tests:**
- Text sanitization edge cases (all patterns)
- Whitespace normalization variants
- Validation function accuracy
- Error detection and reporting

**Integration Tests:**
- Full voiceover generation workflow
- Partial completion resume behavior
- Progress tracking accuracy
- Database update verification
- File system interaction

**Manual Testing:**
- Generate voiceovers for project with 5 scenes
- Listen to generated audio for quality
- Verify no spoken artifacts (asterisks, labels)
- Test resume after interruption (kill process mid-generation)
- Verify total duration accuracy

### Security Considerations

**Path Traversal Prevention:**
- Validate projectId is UUID format (no directory traversal)
- Construct audio paths using path.join (not string concatenation)
- Verify final path is within .cache/audio/projects/ directory

**Resource Management:**
- Limit concurrent TTS requests (1 at a time per project)
- Implement timeout for TTS calls (30 seconds max)
- Clean up temporary files after generation
- Monitor disk space usage

**Input Validation:**
- Sanitize scene text before TTS (prevent injection attacks)
- Validate scene count reasonable (<100 scenes)
- Validate text length reasonable (<10,000 characters per scene)

### Performance Considerations

**TTS Call Optimization:**
- Use persistent KokoroTTS service (model stays in memory)
- Add small delay between calls to respect rate limits (100ms)
- Monitor TTS response times for performance degradation
- Log slow generation (>5 seconds per scene)

**File System Optimization:**
- Create directory structure once (not per scene)
- Use buffered file writes
- Verify disk space before generation
- Implement file cleanup policy

**Database Optimization:**
- Update scenes individually (allows partial completion)
- Update total duration only once at end
- Use transactions for related updates
- Add index on audio_file_path for resume detection

### Dependencies

**Requires:**
- **Story 2.1:** TTS Engine Integration (getTTSProvider, KokoroTTS, voice profiles)
- **Story 2.2:** Database Schema Updates (scenes table, query functions)
  - Required query functions: `getScenesByProjectId()`, `updateSceneAudio()`, `updateProjectDuration()`
  - If any query functions missing from Story 2.2, Task 4.2 adds them
- **Story 2.3:** Voice Selection UI (voice_id selection)
- **Story 2.4:** Script Generation (script scenes in database)

**Blocks:**
- Story 2.6: Script & Voiceover Preview UI
- Epic 3: Visual Sourcing (needs total duration for planning)

### References

**Source Documents:**
- [Source: docs/epics.md lines 473-510] Story 2.5 definition: Goal, tasks, acceptance criteria
- [Source: docs/prd.md Feature 1.4] Automated Voiceover requirements
- [Source: Story 2.1] TTS provider abstraction, audio format standards
- [Source: Story 2.2] Database schema for scenes table, query functions
- [Source: Story 2.3] Voice selection workflow, component patterns
- [Source: Story 2.4] Script generation workflow

**Architect Feedback Incorporated:**
1. Component Path: Added Task 7 for Server Component page at `app/projects/[id]/voiceover/page.tsx`
2. Database Initialization: Added Task 2.1.1 for `initializeDatabase()` at module level
3. Store Path: Task 8.1 explicitly states `lib/stores/voiceover-store.ts` (NOT `stores/`)
4. Query Functions: Added Task 4 to verify Story 2.2 provides required query functions
5. Error Codes: Task 2.8 defines all error codes with HTTP status codes
6. Business Logic: Task 2.4 clarifies delegation to `generateVoiceoversWithProgress()`
7. Workflow Guards: Task 6.7 and Task 7.4 implement workflow state guards with redirects
8. Progress Tracking: Tasks 2.5, 5.3, 6.4 specify polling approach for MVP simplicity

---

## Definition of Done

- [ ] Text sanitization module implemented with all removal patterns
- [ ] Sanitization unit tests pass (20+ test cases)
- [ ] Voiceover generation API endpoint created and tested
- [ ] Database initialization pattern followed (await initializeDatabase())
- [ ] Business logic layer handles sequential processing
- [ ] Partial completion resume works correctly
- [ ] Progress tracking implemented via polling endpoint
- [ ] Database query functions verified from Story 2.2
- [ ] Audio files saved with correct naming convention
- [ ] Scene records updated with paths and durations
- [ ] Total duration calculated and stored
- [ ] Workflow advances to 'visual-sourcing' step
- [ ] Workflow state guards redirect out-of-sequence access
- [ ] Server Component page created at app/projects/[id]/voiceover/page.tsx
- [ ] UI component displays progress accurately
- [ ] Voiceover store created at lib/stores/voiceover-store.ts
- [ ] Error codes defined and implemented
- [ ] Integration tests pass (6+ test scenarios)
- [ ] Manual testing confirms clean audio output (no artifacts)
- [ ] Error handling covers all failure modes
- [ ] Documentation updated with workflow changes
- [ ] Code review completed by Architect
- [ ] All acceptance criteria validated

---

## Dev Agent Record

### Context Reference

- **Story Context XML:** `docs/stories/story-context-2.5.xml` (to be generated)
- **Workflow:** BMAD Story Context Assembly (v6.0.0)

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Dependencies Verified

- Story 2.1: TTS Engine Integration (required)
- Story 2.2: Database Schema Updates (required)
- Story 2.3: Voice Selection UI (required)
- Story 2.4: Script Generation (required)

### Completion Notes

(To be filled during implementation)

---

## Post-Implementation Updates

### Bug Fix: TTS File Timing Race Condition & Timeout Issues (2025-11-18)

**Issue:**
Production logs showed TTS voiceover generation failures for scenes 2-4:
```
Error [TTSError]: Voice generation timed out. Please try again. (Scene 1)
Error [TTSError]: Failed to parse service response: ENOENT: no such file or directory (Scenes 2-4)
```

**Root Causes:**
1. **File Timing Race Condition**: Python TTS service returned JSON success response before MP3 file was written to disk
   - Service writes: `[TTS] File written to: ...mp3` (after delay)
   - Application reads: `[DEBUG TTS] File exists check: false` (immediate)
   - Result: ENOENT error when trying to read file

2. **Timeout Too Aggressive**:
   - WARM_TIMEOUT set to 45 seconds
   - Observed generation times: 45-53 seconds for typical scenes
   - First scene timed out at 45s, completed at 53s

**Fix Applied (Commit: eff6f91):**

**Part 1: Added Retry Logic for File Reads**
```typescript
// src/lib/tts/kokoro-provider.ts:428-461
const waitForFile = async (path: string, maxRetries = 10, delayMs = 100): Promise<void> => {
  for (let i = 0; i < maxRetries; i++) {
    if (existsSync(path)) {
      // File exists, give it 50ms to finish writing
      await new Promise(resolve => setTimeout(resolve, 50));
      return;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  throw new Error(`File not found after ${maxRetries} retries: ${path}`);
};
```
- Polls for file existence up to 1 second (10 × 100ms)
- Additional 50ms settling time after file appears
- Graceful error if file never appears

**Part 2: Increased Timeouts**
```typescript
// src/lib/tts/kokoro-provider.ts:96-100
private readonly COLD_START_TIMEOUT = parseInt(
  process.env.TTS_TIMEOUT_MS_COLD || '120000'  // 120s (was 60s)
);
private readonly WARM_TIMEOUT = parseInt(
  process.env.TTS_TIMEOUT_MS_WARM || '90000'  // 90s (was 45s)
);
```
- COLD_START_TIMEOUT: 60s → 120s (2x increase)
- WARM_TIMEOUT: 45s → 90s (2x increase)
- Accommodates longer scenes and file I/O delays

**Impact:**
- Asynchronous file I/O handled gracefully with retry mechanism
- Timeout buffer allows for 50s+ generation times
- Reduced intermittent TTS failures from race conditions
- Better error messages when files truly unavailable

**Testing:**
- Manual verification: All 4 scenes should now generate successfully
- No more "File not available" errors
- No more premature timeouts

**Files Modified:**
- `src/lib/tts/kokoro-provider.ts` - Retry logic and increased timeouts

**Environment Variables (Optional Override):**
```bash
TTS_TIMEOUT_MS_COLD=120000  # Default: 120 seconds
TTS_TIMEOUT_MS_WARM=90000   # Default: 90 seconds
```
