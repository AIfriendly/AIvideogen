# Story 2.6: Script & Voiceover Preview Integration

**Epic:** Epic 2 - Content Generation Pipeline
**Story ID:** 2.6
**Status:** Ready
**Created:** 2025-11-09
**Last Updated:** 2025-11-09
**Date Ready:** 2025-11-09
**Assigned To:** Dev Agent
**Sprint:** Epic 2 Sprint 2

**Ready for Implementation**

---

## Story Overview

**Goal:** Enhance script review page to integrate voiceover generation workflow and display audio previews for completed scenes

**Description:**
Enhance the existing script-review-client.tsx component to enable the voiceover generation workflow button (currently disabled on line 222), provide navigation to the voiceover generation page (Story 2.5), and display audio players for scenes that have completed voiceover generation. This story creates a seamless integration between script review and voiceover generation by enabling users to trigger voiceover generation from the script review page, navigate to the dedicated voiceover page for generation monitoring, and return to script review to preview the generated audio alongside the script text. The enhancement adds conditional audio player rendering for scenes with audio_file_path, implements a secure audio serving API endpoint, and creates a reusable AudioPlayer component that streams audio files from the .cache directory through a validated API route.

**Business Value:**
- Completes Epic 2's content generation pipeline with unified review interface
- Enables users to trigger and monitor voiceover generation workflow
- Provides audio preview capability for quality validation
- Establishes secure audio serving architecture for future features
- Reduces workflow friction with intuitive button navigation
- Supports incremental scene preview (show audio as scenes complete)
- Validates voice quality before proceeding to visual sourcing

---

## Story

As a **video creator**,
I want **to generate voiceovers from the script review page and preview the audio alongside the script**,
so that **I can validate content quality and make informed decisions before proceeding to visual sourcing**.

---

## Acceptance Criteria

1. **"Generate Voiceover" button enabled on script review page**
   - Given: User is on script-review page with generated script
   - When: Page loads
   - Then: "Generate Voiceover" button is displayed and enabled (not disabled)
   - And: Button label is "Generate Voiceover" (not "Coming Soon")
   - And: Button click navigates to /projects/{projectId}/voiceover page

2. **Navigation to voiceover generation page**
   - Given: User clicks "Generate Voiceover" button
   - When: Button is clicked
   - Then: User is navigated to /projects/{projectId}/voiceover page
   - And: Voiceover generation page displays (Story 2.5 component)
   - And: User can start voiceover generation from that page

3. **Return to script review shows audio players for completed scenes**
   - Given: User has completed voiceover generation (all scenes have audio)
   - When: User navigates back to script-review page
   - Then: Each scene card displays an audio player
   - And: Audio players are positioned below scene text
   - And: Players show play/pause controls and progress bar

4. **Audio player renders conditionally based on audio_file_path**
   - Given: Scene has audio_file_path in database
   - When: Scene card is rendered
   - Then: Audio player component is displayed for that scene
   - And: Audio player shows loading state initially
   - And: Audio loads from API endpoint

5. **Audio served securely through API endpoint**
   - Given: Scene has audio_file_path
   - When: Audio player requests audio
   - Then: Request goes to GET /api/projects/[id]/scenes/[sceneNumber]/audio
   - And: API endpoint validates path security (no directory traversal)
   - And: API streams audio file from .cache directory
   - And: Response includes correct Content-Type: audio/mpeg header

6. **Audio player displays error state if audio not available**
   - Given: Scene card renders audio player
   - When: Audio file cannot be loaded (404, network error)
   - Then: Error message displays: "Audio not available"
   - And: Error state is visually distinct from loading state
   - And: Scene text remains visible and readable

7. **Partial voiceover completion supported**
   - Given: Some scenes have audio_file_path, others do not
   - When: User views script-review page
   - Then: Scenes with audio show audio players
   - And: Scenes without audio show no audio player
   - And: User can play completed audio while generation continues

8. **Continue button logic respects voiceover completion**
   - Given: User is on script-review page
   - When: All scenes have audio_file_path
   - Then: "Continue to Visual Sourcing" button becomes enabled
   - And: Button remains disabled if any scenes lack audio
   - And: Clicking enabled button advances workflow to 'visual-sourcing'

9. **Audio player component is reusable**
   - Given: AudioPlayer component is created
   - When: Component is used in scene card
   - Then: Component accepts projectId and sceneNumber as props
   - And: Component handles loading, playing, error states internally
   - And: Component can be reused in other parts of application

10. **API endpoint validates security requirements**
    - Given: Audio API endpoint receives request
    - When: Endpoint validates request parameters
    - Then: projectId is validated as UUID format
    - And: sceneNumber is validated as positive integer
    - And: audio_file_path is verified to start with .cache/audio/projects/
    - And: Path traversal attempts (..) are rejected with 400 error

---

## Tasks / Subtasks

### Task 1: Enhance ScriptReviewClient Component to Enable Voiceover Button (AC: #1, #2, #7)

**File:** `ai-video-generator/src/app/projects/[id]/script-review/script-review-client.tsx`

- [ ] **1.1** Update "Generate Voiceover" button (line 222)
  - Remove `disabled` prop from button
  - Change label from "Generate Voiceover (Coming Soon)" to "Generate Voiceover"
  - Add `onClick` handler to navigate to voiceover page
  - Keep icon: `<Volume2 className="w-4 h-4 mr-2" />`

- [ ] **1.2** Implement navigation handler
  - Use `router.push()` from `useRouter()` hook (already imported)
  - Navigate to: `/projects/${projectId}/voiceover`
  - No need to pass scene data (voiceover page loads from database)

- [ ] **1.3** Update help text below button
  - Change from: "Voiceover generation will be available in a future update."
  - Change to: "Click to generate professional audio narration for all scenes."
  - Keep styling consistent with existing text

- [ ] **1.4** Add conditional rendering for scenes with audio
  - Import AudioPlayer component (from Task 4)
  - In scene card map loop (line 174), check if `scene.audio_file_path` exists
  - If exists, render AudioPlayer component below scene text
  - Position audio player after scene text paragraph (line 208-210)

- [ ] **1.5** Implement "Continue to Visual Sourcing" button logic
  - Add state to track if all scenes have audio
  - Calculate: `const allScenesHaveAudio = scenes.every(s => s.audio_file_path !== null)`
  - Add new button: "Continue to Visual Sourcing" below existing actions
  - Button enabled only if `allScenesHaveAudio === true`
  - Button navigates to placeholder page (e.g., `/projects/${projectId}/visual-sourcing`)
  - Button should be primary style (not outlined)

### Task 2: Create Audio Serving API Endpoint (AC: #5, #10)

**File:** `ai-video-generator/src/app/api/projects/[id]/scenes/[sceneNumber]/audio/route.ts`

- [ ] **2.1** Create directory structure
  - Create directory: `src/app/api/projects/[id]/scenes/[sceneNumber]/audio/`
  - Create file: `route.ts` in that directory

- [ ] **2.2** Import required dependencies
  ```typescript
  import { NextResponse } from 'next/server';
  import { getSceneByProjectAndSceneNumber } from '@/lib/db/queries';
  import fs from 'fs';
  import path from 'path';
  ```

- [ ] **2.3** Create GET endpoint handler
  ```typescript
  export async function GET(
    req: Request,
    { params }: { params: { id: string, sceneNumber: string } }
  ): Promise<Response>
  ```

- [ ] **2.4** Validate request parameters
  - Validate `params.id` is UUID format (regex: `/^[0-9a-f-]{36}$/i`)
  - Validate `params.sceneNumber` is positive integer
  - Return 400 if validation fails with error: INVALID_PARAMETERS

- [ ] **2.5** Load scene from database
  - Call `getSceneByProjectAndSceneNumber(projectId, sceneNumber)`
  - Return 404 if scene not found
  - Return 404 if scene.audio_file_path is null
  - Log: "Audio requested for scene without audio_file_path"

- [ ] **2.6** Validate audio file path security
  - Verify `audio_file_path` starts with `.cache/audio/projects/`
  - Reject if path contains `..` (directory traversal attempt)
  - Reject if path does not end with `.mp3`
  - Return 400 with error: INVALID_AUDIO_PATH if validation fails

- [ ] **2.7** Construct absolute file path
  - Use `path.join(process.cwd(), scene.audio_file_path)`
  - Resolve path to absolute: `path.resolve(absolutePath)`
  - Verify resolved path is within project root (security check)

- [ ] **2.8** Verify file exists on disk
  - Use `fs.existsSync(absolutePath)`
  - Return 404 with error: AUDIO_FILE_NOT_FOUND if file missing
  - Log: "Audio file not found at path: {absolutePath}"

- [ ] **2.9** Stream audio file to response
  - Read file as buffer: `fs.readFileSync(absolutePath)`
  - Return NextResponse with audio buffer
  - Set Content-Type header: `audio/mpeg`
  - Set Content-Length header: file size in bytes
  - Set Cache-Control header: `public, max-age=31536000` (1 year)

- [ ] **2.10** Handle errors
  - Catch file read errors: return 500 with FILE_READ_ERROR
  - Catch validation errors: return 400 with specific error code
  - Catch database errors: return 500 with DATABASE_ERROR
  - Log all errors with context

### Task 3: Add Database Query Function for Scene Lookup (AC: #5)

**File:** `ai-video-generator/src/lib/db/queries.ts`

- [ ] **3.1** Add query function if not already present
  ```typescript
  export function getSceneByProjectAndSceneNumber(
    projectId: string,
    sceneNumber: number
  ): Scene | null {
    const db = getDatabase();
    const query = `
      SELECT * FROM scenes
      WHERE project_id = ? AND scene_number = ?
      LIMIT 1
    `;
    const row = db.prepare(query).get(projectId, sceneNumber);
    return row as Scene | null;
  }
  ```

- [ ] **3.2** Export function in module exports
  - Verify function is exported from queries.ts
  - Add TypeScript type annotation for return value
  - Add JSDoc comment explaining function purpose

### Task 4: Create Reusable AudioPlayer Component (AC: #3, #4, #6, #9)

**File:** `ai-video-generator/src/components/ui/audio-player.tsx`

- [ ] **4.1** Create AudioPlayer component file
  - Create directory: `src/components/ui/` (if not exists)
  - Create file: `audio-player.tsx`
  - Add `'use client'` directive (Client Component)

- [ ] **4.2** Define component interface
  ```typescript
  interface AudioPlayerProps {
    projectId: string;
    sceneNumber: number;
    className?: string;
  }
  ```

- [ ] **4.3** Implement AudioPlayer component
  - Use HTML5 `<audio>` element with controls
  - Set src to API endpoint: `/api/projects/${projectId}/scenes/${sceneNumber}/audio`
  - Add `preload="metadata"` for performance
  - Add `className` for custom styling

- [ ] **4.4** Add loading state
  - Use `useState` to track loading: `const [loading, setLoading] = useState(true)`
  - Show skeleton loader while audio loads
  - Use `onLoadedMetadata` event to clear loading state

- [ ] **4.5** Add error state
  - Use `useState` to track error: `const [error, setError] = useState<string | null>(null)`
  - Use `onError` event to set error state
  - Display error message: "Audio not available" when error occurs
  - Style error message distinctly (red text, alert icon)

- [ ] **4.6** Implement component JSX
  ```typescript
  return (
    <div className={className}>
      {loading && <div className="animate-pulse h-12 bg-slate-200 rounded" />}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          Audio not available
        </div>
      )}
      {!error && (
        <audio
          controls
          preload="metadata"
          src={`/api/projects/${projectId}/scenes/${sceneNumber}/audio`}
          onLoadedMetadata={() => setLoading(false)}
          onError={() => { setLoading(false); setError('Failed to load audio'); }}
          className="w-full"
        />
      )}
    </div>
  );
  ```

- [ ] **4.7** Style audio controls
  - Use Tailwind classes for consistent styling
  - Ensure controls are accessible (keyboard navigation)
  - Match application's design system colors
  - Add hover states for interactive elements

### Task 5: Update Scene Type Definition (AC: #4)

**File:** `ai-video-generator/src/app/projects/[id]/script-review/script-review-client.tsx`

- [ ] **5.1** Verify Scene interface includes audio_file_path
  - Scene interface already defined on lines 16-26
  - Confirm `audio_file_path: string | null` field exists (line 22)
  - Confirm `duration: number | null` field exists (line 23)
  - No changes needed if fields already present

### Task 6: Add Integration Tests (AC: All)

**File:** `ai-video-generator/tests/integration/script-voiceover-integration.test.ts`

- [ ] **6.1** Test audio serving API endpoint
  - Create project with scenes and audio files
  - Call GET /api/projects/[id]/scenes/[sceneNumber]/audio
  - Verify 200 response with audio/mpeg content type
  - Verify audio buffer is returned
  - Verify file content matches saved audio

- [ ] **6.2** Test API security validation
  - Test invalid projectId format: should return 400
  - Test invalid sceneNumber: should return 400
  - Test directory traversal attempt: should return 400
  - Test scene without audio_file_path: should return 404
  - Test non-existent audio file: should return 404

- [ ] **6.3** Test AudioPlayer component rendering
  - Mount AudioPlayer component with valid props
  - Verify <audio> element renders with correct src
  - Verify loading state displays initially
  - Simulate successful load: verify loading state clears
  - Simulate error: verify error message displays

- [ ] **6.4** Test script review button integration
  - Navigate to script-review page
  - Verify "Generate Voiceover" button is enabled
  - Click button
  - Verify navigation to /voiceover page

- [ ] **6.5** Test audio player conditional rendering
  - Create project with partial voiceover completion
  - Navigate to script-review page
  - Verify scenes with audio show audio player
  - Verify scenes without audio show no audio player

- [ ] **6.6** Test "Continue to Visual Sourcing" button
  - Test button disabled when not all scenes have audio
  - Complete all scene voiceovers
  - Verify button becomes enabled
  - Click button
  - Verify navigation to visual-sourcing placeholder

### Task 7: Add Unit Tests (AC: #9, #10)

**File:** `ai-video-generator/tests/unit/components/audio-player.test.tsx`

- [ ] **7.1** Test AudioPlayer component props
  - Test: Component renders with projectId and sceneNumber
  - Test: Correct API endpoint URL constructed
  - Test: className prop applied to container

- [ ] **7.2** Test loading state
  - Test: Loading skeleton displays on mount
  - Test: Loading clears after onLoadedMetadata event
  - Test: Audio element remains hidden during loading

- [ ] **7.3** Test error state
  - Test: Error message displays after onError event
  - Test: Error message text is "Audio not available"
  - Test: Audio element hidden when error occurs

- [ ] **7.4** Test audio element attributes
  - Test: controls attribute present
  - Test: preload="metadata" attribute present
  - Test: src attribute matches expected API endpoint

### Task 8: Update Documentation (AC: All)

**File:** `ai-video-generator/docs/components/audio-player.md` (new)

- [ ] **8.1** Create component documentation
  - Document AudioPlayer component purpose
  - Document props: projectId, sceneNumber, className
  - Document usage example in code blocks
  - Document error states and handling

- [ ] **8.2** Document API endpoint
  - Document GET /api/projects/[id]/scenes/[sceneNumber]/audio
  - Document request parameters and validation
  - Document response format (audio/mpeg stream)
  - Document error codes and status codes

- [ ] **8.3** Update workflow documentation
  - Document integration between script-review and voiceover pages
  - Document navigation flow: script-review → voiceover → script-review
  - Document partial completion support
  - Document "Continue to Visual Sourcing" workflow

---

## Dev Notes

### Architecture Patterns

**Enhancement vs Creation:**
- This story ENHANCES existing script-review-client.tsx (NOT create new file)
- Existing file: `ai-video-generator/src/app/projects/[id]/script-review/script-review-client.tsx`
- Existing page: `ai-video-generator/src/app/projects/[id]/script-review/page.tsx`
- Changes: Enable button (line 222), add audio player rendering, add continue button

**Integration with Story 2.5:**
- Story 2.5 created VoiceoverGenerator component at `/projects/[id]/voiceover` page
- This story adds navigation FROM script-review TO voiceover page
- After voiceover generation, user returns to script-review to see audio players
- No need to embed VoiceoverGenerator in script-review page (separate pages)

**Audio Serving Architecture:**
- **Chosen Strategy:** API endpoint (most secure)
- Audio files stored in: `.cache/audio/projects/{projectId}/scene-{number}.mp3`
- .cache directory is NOT publicly accessible (good for security)
- API endpoint streams files with validation and security checks
- Alternative rejected: Serving .cache as static (exposes cache structure)

**Workflow State Transitions:**
- Script generation completes → `current_step = 'voiceover'` (Story 2.4)
- User navigates to script-review page (can still access)
- User clicks "Generate Voiceover" → navigates to /voiceover page
- Voiceover generation completes → `current_step = 'visual-sourcing'` (Story 2.5)
- User returns to script-review → sees audio players
- User clicks "Continue to Visual Sourcing" → workflow advances (if not already)

**Workflow Step Corrections:**
- INCORRECT (from original story): 'script' → 'voiceover' → 'visual-sourcing'
- CORRECT: 'voice' → 'script-generation' → 'voiceover' → 'visual-sourcing'
- Script-review page accessible when: current_step is 'voiceover' or 'visual-sourcing'
- No workflow guards for 'script' step (does not exist)

**Component Reusability:**
- AudioPlayer component is standalone, reusable component
- Can be used anywhere in application (not coupled to script-review)
- Handles all internal state (loading, error, playback)
- Props-driven: only needs projectId and sceneNumber

### File Structure

**Enhanced Files:**
- `ai-video-generator/src/app/projects/[id]/script-review/script-review-client.tsx` - Enable button, add audio players
- `ai-video-generator/src/app/projects/[id]/script-review/page.tsx` - No changes needed (already exists)

**New Files:**
- `ai-video-generator/src/components/ui/audio-player.tsx` - Reusable audio player component
- `ai-video-generator/src/app/api/projects/[id]/scenes/[sceneNumber]/audio/route.ts` - Audio serving endpoint

**Modified Files:**
- `ai-video-generator/src/lib/db/queries.ts` - Add getSceneByProjectAndSceneNumber() if missing

**Test Files:**
- `ai-video-generator/tests/integration/script-voiceover-integration.test.ts` - Integration tests
- `ai-video-generator/tests/unit/components/audio-player.test.tsx` - Component unit tests

**Documentation Files:**
- `ai-video-generator/docs/components/audio-player.md` - Component documentation

### API Endpoint Design

**Endpoint:** `GET /api/projects/[id]/scenes/[sceneNumber]/audio`

**Route Parameters:**
- `id` - Project UUID (validated)
- `sceneNumber` - Scene number (1-based integer, validated)

**Response:**
- Success (200): Audio file stream with Content-Type: audio/mpeg
- Not Found (404): Scene or audio file not found
- Bad Request (400): Invalid parameters or security violation
- Internal Error (500): File read error or database error

**Security Validations:**
- UUID format validation (prevent SQL injection)
- Positive integer validation for sceneNumber
- Path must start with `.cache/audio/projects/`
- Path cannot contain `..` (directory traversal)
- Path must end with `.mp3`
- Resolved path must be within project root

**Performance Optimizations:**
- Set Cache-Control header (1 year cache)
- Use preload="metadata" in audio player
- Stream file directly (no buffering in memory for large files)
- Consider future enhancement: Range requests for seeking

### Testing Strategy

**Unit Tests:**
- AudioPlayer component rendering (loading, error, success states)
- Component props handling (projectId, sceneNumber, className)
- Event handlers (onLoadedMetadata, onError)
- Error message display

**Integration Tests:**
- Audio serving API endpoint (success, 404, 400, 500)
- Security validation (directory traversal, invalid parameters)
- Script review button navigation
- Audio player conditional rendering (partial completion)
- "Continue to Visual Sourcing" button logic

**Manual Testing:**
- Navigate through complete workflow: script-review → voiceover → script-review
- Generate voiceovers for all scenes
- Verify audio players display and play correctly
- Test error scenarios (delete audio file, invalid path)
- Test partial completion (some scenes with audio, some without)
- Test button states (disabled when audio missing, enabled when complete)

### Security Considerations

**Path Traversal Prevention:**
- Validate path starts with `.cache/audio/projects/`
- Reject paths containing `..`
- Use path.resolve() and verify final path is within project root
- Use path.join() instead of string concatenation

**Parameter Validation:**
- UUID format validation prevents SQL injection
- Integer validation prevents type coercion attacks
- Null checks prevent null pointer errors

**File Access Control:**
- Only serve files from .cache/audio/projects/ directory
- Verify file exists before streaming
- Use read-only file operations (no write access)
- Future: Add user authentication and authorization checks

**Content Security:**
- Set correct Content-Type header (prevent MIME type confusion)
- Set Cache-Control header (reduce server load)
- Log all access attempts for security auditing
- Future: Add signed URLs or tokens for time-limited access

### Performance Considerations

**Audio Loading Optimization:**
- Use preload="metadata" (load metadata only, not full file)
- Set Cache-Control header (browser caches audio files)
- Future: Implement Range requests for streaming large files
- Future: Use CDN for audio delivery

**Component Rendering:**
- AudioPlayer is small, lightweight component
- Uses native HTML5 audio element (no heavy libraries)
- Loading skeleton prevents layout shift
- Conditional rendering avoids mounting players for scenes without audio

**API Endpoint Performance:**
- Use fs.readFileSync() for small files (most audio files <1MB)
- Future: Use fs.createReadStream() for large files
- Set appropriate Cache-Control headers
- Future: Implement response compression (gzip)

### Dependencies

**Requires:**
- **Story 2.1:** TTS Engine Integration (audio file generation)
- **Story 2.2:** Database Schema Updates (scenes.audio_file_path field)
- **Story 2.3:** Voice Selection UI (workflow prerequisite)
- **Story 2.4:** Script Generation (script-review page exists)
- **Story 2.5:** Voiceover Generation (audio files, VoiceoverGenerator component)

**Blocks:**
- **Epic 3:** Visual Sourcing (workflow transition point)

**Integration Points:**
- Enhances script-review-client.tsx from Story 2.4
- Links to VoiceoverGenerator page from Story 2.5
- Uses audio files generated by Story 2.5
- Provides navigation to Epic 3 placeholder (visual-sourcing)

### References

**Source Documents:**
- [Source: docs/epics.md lines 513-540] Story 2.6 definition: Goal, tasks, acceptance criteria
- [Source: docs/prd.md Feature 1.4] Automated Voiceover requirements
- [Source: Story 2.4] Script generation workflow, script-review page structure
- [Source: Story 2.5] Voiceover generation workflow, audio file paths, VoiceoverGenerator component
- [Architect Feedback 2025-11-09] Critical issues and recommendations

**Design Patterns:**
- Follow Epic 1 component patterns for consistency
- Use Server Component + Client Component pattern
- Implement loading states per Epic 1 standards
- Use workflow guards for step sequencing

### Open Questions

1. **Visual Sourcing Placeholder:** Should "Continue to Visual Sourcing" button link to functional page or show "Coming Soon" message? (Recommend: Placeholder page with message)
2. **Audio Player Styling:** Should audio player match existing component styles or have custom design? (Recommend: Match existing styles from Epic 1)
3. **Error Recovery:** Should error state include retry button or just display message? (Recommend: Just message for MVP, retry for future)
4. **Workflow Advancement:** Should "Continue" button advance workflow or just navigate? (Recommend: Navigate only, workflow already advanced by Story 2.5)

---

## Definition of Done

- [ ] ScriptReviewClient component enhanced with enabled voiceover button
- [ ] "Generate Voiceover" button navigates to /voiceover page
- [ ] Audio players render conditionally for scenes with audio_file_path
- [ ] AudioPlayer component created as reusable component
- [ ] Audio serving API endpoint created at /api/projects/[id]/scenes/[sceneNumber]/audio
- [ ] API endpoint validates security requirements (path traversal, UUID format)
- [ ] Database query function getSceneByProjectAndSceneNumber() added (if missing)
- [ ] "Continue to Visual Sourcing" button added with enable logic
- [ ] Button enabled only when all scenes have audio_file_path
- [ ] Integration tests pass (6+ test scenarios)
- [ ] Unit tests pass (4+ test cases for AudioPlayer)
- [ ] Manual testing confirms audio playback works
- [ ] Error states display correctly (404, network errors)
- [ ] Partial completion supported (some scenes with audio, some without)
- [ ] API endpoint streams audio files correctly
- [ ] Cache-Control headers set for performance
- [ ] Documentation updated with component usage and API endpoint
- [ ] Code review completed by Architect
- [ ] All acceptance criteria validated
- [ ] Epic 2 complete and ready for Epic 3

---

## Dev Agent Record

### Context Reference

- **Story Context XML:** `docs/stories/story-context-2.6.xml` (to be generated)
- **Workflow:** BMAD Story Context Assembly (v6.0.0)

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Dependencies Verified

- Story 2.1: TTS Engine Integration (required)
- Story 2.2: Database Schema Updates (required)
- Story 2.3: Voice Selection UI (required)
- Story 2.4: Script Generation (required)
- Story 2.5: Voiceover Generation (required)

### Architect Feedback Addressed

**Critical Issues Resolved:**
1. ✅ File Path Collision: Changed from "Create" to "ENHANCE" existing script-review-client.tsx
2. ✅ Component Duplication: Removed ScriptPreview component, enhanced existing ScriptReviewClient
3. ✅ Audio Path Architecture: API endpoint strategy selected (GET /api/projects/[id]/scenes/[sceneNumber]/audio)
4. ✅ Workflow State Misalignment: Corrected workflow steps (voice → script-generation → voiceover → visual-sourcing)
5. ✅ Voiceover Triggering Logic: Button redirects to separate /voiceover page (Story 2.5)
6. ✅ Integration with Story 2.5: Delegates to VoiceoverGenerator component, shows audio players on return

**Recommendations Implemented:**
1. ✅ Scope changed from "Create" to "ENHANCE" existing script-review-client.tsx
2. ✅ Audio serving strategy: API endpoint (most secure and recommended)
3. ✅ Workflow fixed: current_step goes from 'voice' → 'script-generation' → 'voiceover' → 'visual-sourcing'
4. ✅ Clarified: Button enables → redirects to /voiceover page → return shows audio players
5. ✅ No duplicate polling logic: Delegates to Story 2.5's VoiceoverGenerator
6. ✅ Created reusable audio-player.tsx component

### Completion Notes

(To be filled during implementation)

---

## Post-Implementation Updates

(Section reserved for updates after initial implementation)
