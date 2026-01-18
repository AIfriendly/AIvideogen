# Epic 5: Video Assembly & Output

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

### Epic 5 Stories

#### Story 5.1: Video Processing Infrastructure Setup
**Implements:** FR-7.01, FR-7.05

**Goal:** Set up FFmpeg-based video processing infrastructure for video assembly operations

**Tasks:**
- Install and configure FFmpeg as system dependency
- Create VideoProcessor service class (lib/video/processor.ts)
- Implement FFmpeg command builder utility for common operations
- Create video processing queue for managing assembly jobs
- Implement job status tracking (pending, processing, complete, error)
- Add database schema for assembly jobs (assembly_jobs table)
- Create POST /api/projects/[id]/assemble endpoint to initiate assembly
- Implement error handling for FFmpeg failures (codec issues, file not found, etc.)
- Add logging for video processing operations
- Create temporary file management for intermediate outputs

**Acceptance Criteria:**
- FFmpeg installed and accessible via system PATH
- VideoProcessor service successfully initializes
- Assembly job created in database when POST /api/projects/[id]/assemble called
- Job status updates correctly: pending → processing → complete (or error)
- FFmpeg commands execute successfully for basic operations (probe, trim, concat)
- Error messages provide actionable guidance (e.g., "FFmpeg not found - install FFmpeg and add to PATH")
- Temporary files cleaned up after processing completes
- Assembly endpoint validates all scenes have selected clips before starting

**References:**
- PRD Feature 1.7 (Automated Video Assembly) lines 346-369
- PRD FR-7.01 (Receive scene data)
- PRD FR-7.05 (Render to MP4)
- Epic 4 Story 4.5 (Assembly trigger)

---

#### Story 5.2: Scene Video Trimming & Preparation
**Implements:** FR-7.02

**Goal:** Trim selected video clips to match voiceover duration for each scene

**Tasks:**
- Create trimVideo() function in VideoProcessor service
- Load scene data from database (selected_clip_id, audio duration)
- For each scene, retrieve the selected video segment from cache
- Calculate trim points based on voiceover audio duration
- Execute FFmpeg trim command: `ffmpeg -i input.mp4 -t {duration} -c copy output.mp4`
- Handle edge cases: video shorter than audio (loop or extend), video much longer (trim from start)
- Save trimmed clips to temporary directory with scene identification
- Update assembly job progress (e.g., "Trimming scene 2/5...")
- Implement parallel trimming for performance (max 3 concurrent)
- Add validation that trimmed clip duration matches audio duration (±0.5s tolerance)

**Acceptance Criteria:**
- Given scene with 10s voiceover and 30s video clip, system trims video to exactly 10 seconds
- Trimmed clips saved to temp directory: `.cache/assembly/{jobId}/scene-{n}-trimmed.mp4`
- All scenes trimmed before proceeding to concatenation
- Progress indicator shows current scene being trimmed
- **Edge case - short video:** If video is shorter than audio, system either loops video or extends final frame
- **Edge case - missing video:** If selected clip file missing, assembly fails with clear error message
- Trimming completes within 30 seconds per scene for typical clip lengths
- Video quality preserved (no re-encoding unless necessary)

**References:**
- PRD Feature 1.7 AC1 (Successful Video Assembly) lines 355-369
- PRD FR-7.02 (Trim clips to voiceover duration)
- Epic 3 Story 3.6 (Downloaded segments in cache)

---

#### Story 5.3: Video Concatenation & Audio Overlay
**Implements:** FR-7.03, FR-7.04, FR-7.06

**Goal:** Concatenate trimmed scenes and overlay voiceover audio to create final video

**Tasks:**
- Create concatenateScenes() function in VideoProcessor service
- Generate FFmpeg concat demuxer file listing all trimmed clips in order
- Execute FFmpeg concat command to join all scenes into single video
- Create overlayAudio() function for voiceover integration
- For each scene, overlay corresponding voiceover audio onto video track
- Ensure audio/video synchronization (voiceover starts at scene start)
- Handle audio format conversion if needed (MP3 → AAC for MP4 container)
- Render final output as H.264 MP4 with AAC audio
- Save final video to output directory: `public/videos/{projectId}/final.mp4`
- Update project record with final video path and duration
- Update assembly job status to 'complete'

**Acceptance Criteria:**
- Given 3 trimmed scenes (5s, 7s, 8s), final video is exactly 20 seconds
- Scenes appear in correct order (Scene 1 → Scene 2 → Scene 3)
- Voiceover audio plays in sync with corresponding scene visuals
- **Audio sync test:** Voiceover words align with scene timing (no drift)
- Final video format: H.264 video codec, AAC audio codec, MP4 container
- Final video saved to `public/videos/{projectId}/final.mp4`
- Project record updated with video_path and total_duration
- Assembly job marked as 'complete' with completion timestamp
- Final video playable in standard video players (VLC, browser)
- Video file size reasonable for duration (approximately 5-10 MB per minute at 720p)

**References:**
- PRD Feature 1.7 (Automated Video Assembly) lines 346-369
- PRD FR-7.03 (Concatenate clips in order)
- PRD FR-7.04 (Overlay voiceover audio)
- PRD FR-7.06 (Make video available for download)

---

#### Story 5.4: Automated Thumbnail Generation
**Implements:** FR-8.01, FR-8.02, FR-8.03, FR-8.04, FR-8.05

**Goal:** Generate eye-catching thumbnail with title text overlay

**Tasks:**
- Create ThumbnailGenerator service class (lib/video/thumbnail.ts)
- Implement frame extraction from video using FFmpeg
- Select compelling frame: analyze multiple candidates (10%, 30%, 50%, 70% duration)
- Score frames based on visual interest (contrast, color variance, face detection optional)
- Create title text overlay using Canvas API or ImageMagick
- Design text styling: large readable font, contrasting outline/shadow, positioned for visibility
- Ensure text doesn't obscure key visual elements (position in upper or lower third)
- Render final thumbnail at 1920x1080 (16:9 aspect ratio)
- Save as high-quality JPEG: `public/videos/{projectId}/thumbnail.jpg`
- Update project record with thumbnail_path
- Add POST /api/projects/[id]/generate-thumbnail endpoint (auto-triggered after video assembly)

**Acceptance Criteria:**
- Thumbnail generated automatically after video assembly completes
- Frame selected from assembled video (not arbitrary scene)
- **Title text:** Video title displayed prominently and legibly
- **Text styling:** High contrast (white text with black outline or similar)
- **Positioning:** Text in upper or lower third, not covering center of frame
- Thumbnail dimensions: exactly 1920x1080 pixels (16:9)
- File format: JPEG with quality 85+
- Thumbnail saved to `public/videos/{projectId}/thumbnail.jpg`
- Project record updated with thumbnail_path
- Thumbnail visually appealing and suitable for YouTube/social media
- Generation completes within 10 seconds

**References:**
- PRD Feature 1.8 (Automated Thumbnail Generation) lines 370-393
- PRD FR-8.01 to FR-8.05 (Thumbnail requirements)

---

#### Story 5.5: Export UI & Download Workflow
**Implements:** FR-7.06, FR-8.05

**Goal:** Display completed video and thumbnail with download options

**Tasks:**
- Create ExportPage.tsx component at /projects/[id]/export
- Display video player with final assembled video
- Display generated thumbnail preview
- Add "Download Video" button that saves to user's Downloads folder
  - Filename format: `{video-title}.mp4` (sanitized for filesystem)
- Add "Download Thumbnail" button linking to thumbnail file
- Show video metadata: duration, file size, resolution
- Show project summary: topic, scene count, voice used
- Add "Create New Video" button to start fresh project
- Add "Back to Visual Curation" for re-selection if needed
- Implement loading state during assembly (show progress from job status)
- Update project workflow: current_step = 'complete' after export page viewed
- Add share-ready copy for social media (title, description suggestion)

**Acceptance Criteria:**
- Export page displays after assembly completes (projects.current_step = 'export')
- Video player shows final assembled video with playback controls
- Thumbnail preview displays at appropriate size
- "Download Video" button saves MP4 to user's Downloads folder with sanitized filename (e.g., "mars-colonization.mp4")
- "Download Thumbnail" button downloads JPEG file
- Video metadata displayed: "Duration: 2:34 | Size: 45 MB | Resolution: 1280x720"
- Loading state shows assembly progress: "Assembling video... Trimming scenes (2/5)"
- Error state shows if assembly failed with retry option
- "Create New Video" navigates to home/new project
- Project marked as 'complete' in database
- Page is shareable (direct URL access works if assembly complete)

**References:**
- PRD Feature 1.7 AC2 (Download Availability) lines 366-369
- PRD Feature 1.8 AC1 (Thumbnail Generation) lines 384-393
- Epic 4 Story 4.5 (Assembly trigger flow)

---
