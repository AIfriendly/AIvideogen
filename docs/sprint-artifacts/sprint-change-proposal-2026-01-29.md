# Sprint Change Proposal: Post-Generation Cache Cleanup

**Date:** 2026-01-29
**Status:** Draft
**Change Scope:** Minor
**Proposed By:** User Request
**Epics Affected:** Epic 5 (Video Assembly & Output)  

---

## 1. Issue Summary

### Problem Statement

After final video generation is complete, intermediate files (generated audio, cached videos, fetched videos) remain on disk without an automatic cleanup mechanism. This leads to unnecessary disk space usage as users create multiple videos.

### Discovery Context

- **Source:** User feedback during/after Epic 8 (DVIDS API Integration) implementation
- **Trigger:** User reported: "after the video is generated i have all these cached videos and audios, i want my app to be able to delete all the generated audio,cached videos and fetched videos once it generate the final output"
- **Impact:** Quality of life improvement affecting disk usage and system maintenance

### Evidence

The video generation process creates multiple intermediate file types:
1. **Generated audio:** `.cache/audio/{projectId}/scene-{n}.mp3` (one per scene)
2. **Cached video segments:** `.cache/videos/{projectId}/scene-{n}-*.mp4` (downloaded suggestions)
3. **Provider cache:** `assets/cache/{provider}/{video_id}.mp4` (DVIDS, NASA, YouTube)
4. **Assembly temp:** `.cache/assembly/{projectId}/` (temporary concatenation files)

These files accumulate with each video generated, consuming disk space without a cleanup mechanism.

---

## 2. Impact Analysis

### Epic Impact

| Epic | Status | Impact | Notes |
|------|--------|--------|-------|
| **Epic 5** | Done (5/5 stories) | **MODIFY** | Add Story 5.6 for cleanup functionality |
 
| Epic 8 | Done (5/5 stories) | None | DVIDS implementation complete |
| Future Epics | Planned | None | Any future video provider will benefit from cleanup pattern |

**Epic 5 Modification Required:**
- Add new story 5.6: "Post-Generation Cache Cleanup" (4 points)
- Update epic story count from 5 → 6 stories
- Update epic point total  20  

**Epic 9 Modification Required:**
- Add new story 9.6: "NASA Cache Cleanup Integration" (2 points) - Update epic story count from 5 → 6 stories
- Update epic point total from 19 → 21 points
- Reuses cleanup service from Epic 5 Story 5.6

### Story Impact

**New Stories Required:**
- **Story 5.6:** Post-Generation Cache Cleanup (4 points) - Implements core cleanup service
 
**Existing Stories:** No modifications required to existing stories.

### Artifact Conflicts

| Artifact | Conflict? | Action Required |
|----------|-----------|-----------------|
| **PRD** | Gap (not conflict) | Add FR-7.07, FR-7.08, FR-7.09 to Section 1.7 (Automated Video Assembly) |
| **Architecture** | No conflict | Add cleanup pattern documentation to `video-processing-pipeline.md` |
| **Database Schema** | No conflict | Add migration version 8 for cleanup tracking |
| **UI/UX** | No conflict | Optional: Could add cleanup button to settings (not required) |
| CI/CD | No conflict | None |
| Testing | No conflict | Add cleanup tests to Epic 5 test suite |

### Technical Impact

**Components Affected:**
- `src/lib/pipeline/video-assembler.ts` - Add cleanup trigger after assembly
- `src/lib/db/cleanup.ts` - New file for cleanup service
- `src/lib/db/queries.ts` - Add cleanup queries
- `src/lib/db/schema.sql` - Add cleanup tracking columns

**No Breaking Changes:** This is additive functionality only.

---

## 3. Recommended Approach

### Selection: **Option 1 - Direct Adjustment**

**Approach:** Add new Story 5.6 to Epic 5 (Video Assembly & Output) for post-generation cache cleanup.

### Rationale

1. **Natural Fit:** Cleanup happens after video assembly, making Epic 5 the logical home
2. **Minimal Disruption:** Epic 5 already handles final output; this extends the workflow naturally
3. **Reusable Pattern:** Cleanup service can be reused by Epic 9 (NASA) and future provider epics
4. **Low Risk:** Additive only, no modifications to existing completed work
5. **User Value:** Immediate disk space savings for all users

### Effort & Risk Assessment

| Metric | Assessment | Details |
|--------|------------|---------|
| **Effort** | Medium (4 points) | ~1-2 days implementation + testing |
| **Risk** | Low | Additive functionality, isolated to cleanup service |
| **Timeline Impact** | None | Can be implemented independently without blocking other work |

### Trade-offs Considered

| Option | Effort | Risk | Selected? | Reason |
|--------|--------|------|-----------|--------|
| **Option 1: Direct Adjustment** | Medium | Low | ✅ **YES** | Natural fit, minimal disruption |
| Option 2: Rollback | N/A | N/A | ❌ No | Nothing to rollback |
| Option 3: PRD MVP Review | N/A | N/A | ❌ No | Doesn't affect MVP scope |

---

## 4. Detailed Change Proposals

### 4.1 Add New Story 5.6 to Epic 5

**Epic:** 5 - Video Assembly & Output
**New Story:** 5.6 - Post-Generation Cache Cleanup
**Story Points:** 4

#### User Story

**As a creator,** I want the system to automatically delete intermediate files after my video is generated, **so that** I don't waste disk space on cached audio and video files I no longer need.

#### Tasks

1. Create cleanup service (`src/lib/db/cleanup.ts`)
2. Implement file deletion for all intermediate types
3. Add cleanup trigger after successful video assembly
4. Implement safety checks (verify final video exists)
5. Add cleanup logging for debugging
6. Handle cleanup failures gracefully
7. Update database schema for cleanup tracking
8. Add configuration option for disabling auto-cleanup

#### Acceptance Criteria

- ✅ After final video generation, all intermediate files are deleted
- ✅ Generated audio files (`.cache/audio/{projectId}/`) are removed
- ✅ Cached video segments (`.cache/videos/{projectId}/`) are removed
- ✅ Provider cache files (`assets/cache/{provider}/`) referenced by project are removed
- ✅ Assembly temp files (`.cache/assembly/{projectId}/`) are removed
- ✅ Final output video (`.cache/output/{projectId}/final.mp4`) is preserved
- ✅ Cleanup is logged: "Cleanup: Deleted {count} files, freed {space} MB"
- ✅ Cleanup failures don't fail video generation (errors logged only)
- ✅ Configuration option `AUTO_CLEANUP_ENABLED=true` (default)
- ✅ Database tracks cleanup status per project

#### Technical Notes

**Files to Clean:**
| Type | Location | Database Reference |
|------|----------|-------------------|
| Audio | `.cache/audio/{projectId}/scene-{n}.mp3` | `audio_files.file_path` |
| Segments | `.cache/videos/{projectId}/scene-{n}-*.mp4` | `visual_suggestions.default_segment_path` |
| Assembly | `.cache/assembly/{projectId}/` | None (temp directory) |
| Provider | `assets/cache/{provider}/{video_id}.mp4` | MCP server cache |

**Safety Guarantees:**
- Verify final video exists before cleanup
- Final video never in deletion list
- Individual file failures logged but don't stop cleanup
- Transaction-like approach (all or nothing where possible)

**Configuration:**
- Environment: `AUTO_CLEANUP_ENABLED=true` (default)
- Database: `user_preferences.auto_cleanup_enabled` (user override)

#### Test Cases

1. **Basic Cleanup:** Generate 10-scene video → Verify only final output remains
2. **Safety:** Verify final video exists before cleanup → Verify preserved after cleanup
3. **Failure Handling:** Simulate file lock/delete error → Verify final video still created
4. **Configuration:** Set `AUTO_CLEANUP_ENABLED=false` → Verify intermediate files remain

---

### 4.2 PRD Update - Add Cleanup Requirements

**Document:** `docs/prd/1-core-features-complete.md`
**Section:** 1.7 - Automated Video Assembly

#### NEW Functional Requirements (add after FR-7.06):

```
*   **FR-7.07:** After successful video generation, the system shall automatically delete all intermediate files (generated audio, cached video segments, fetched videos) while preserving the final output video.
*   **FR-7.08:** The system shall verify the final output video exists before cleanup and preserve it regardless of cleanup success.
*   **FR-7.09:** The system shall provide a configuration option to disable automatic cleanup for debugging purposes.
```

#### NEW Acceptance Criteria:

```
**AC4: Intermediate File Cleanup**
        **Given** a video has been successfully generated.
        **When** the cleanup process runs.
        **Then** all intermediate files (audio, cached videos, temp files) are deleted.
        **And** the final output video is preserved.
```

#### Impact Analysis:
- **MVP Scope:** No change - this is an enhancement, not a scope modification
- **Requirements:** Additive only - FR-7.01 through FR-7.06 unchanged
- **User Value:** Improved system maintenance and disk usage

---

### 4.3 Architecture Update - Cleanup Pattern Documentation

**Document:** `docs/architecture/video-processing-pipeline.md`
**Section:** Add new section after "FFmpeg Operations"

#### NEW Section: Post-Generation Cleanup

```markdown
### Post-Generation Cleanup

After final video assembly is complete, intermediate files should be cleaned up to free disk space:

**Service Implementation:**
```typescript
// lib/db/cleanup.ts
import { unlink, rm } from 'fs/promises';
import path from 'path';
import db from './client';

export interface CleanupResult {
  deletedFiles: number;
  freedSpace: number; // bytes
  errors: string[];
}

export async function cleanupProjectFiles(projectId: string): Promise<CleanupResult> {
  const result: CleanupResult = {
    deletedFiles: 0,
    freedSpace: 0,
    errors: []
  };

  try {
    // 1. Get all audio files for project
    const audioFiles = db.prepare(`
      SELECT file_path FROM audio_files WHERE project_id = ?
    `).all(projectId) as Array<{ file_path: string }>;

    // 2. Get all video segment paths
    const videoSegments = db.prepare(`
      SELECT default_segment_path FROM visual_suggestions vs
      JOIN scenes s ON vs.scene_id = s.id
      WHERE s.project_id = ? AND default_segment_path IS NOT NULL
    `).all(projectId) as Array<{ default_segment_path: string }>;

    // 3. Delete audio files
    for (const audio of audioFiles) {
      try {
        const stats = await stat(audio.file_path);
        await unlink(audio.file_path);
        result.deletedFiles++;
        result.freedSpace += stats.size;
      } catch (error) {
        result.errors.push(`Failed to delete audio: ${audio.file_path}`);
      }
    }

    // 4. Delete video segments
    for (const video of videoSegments) {
      try {
        const stats = await stat(video.default_segment_path);
        await unlink(video.default_segment_path);
        result.deletedFiles++;
        result.freedSpace += stats.size;
      } catch (error) {
        result.errors.push(`Failed to delete video: ${video.default_segment_path}`);
      }
    }

    // 5. Delete assembly temp directory
    const assemblyDir = path.join('.cache', 'assembly', projectId);
    try {
      await rm(assemblyDir, { recursive: true, force: true });
    } catch (error) {
      result.errors.push(`Failed to delete assembly dir: ${assemblyDir}`);
    }

    // 6. Log cleanup summary
    console.log(`Cleanup: Deleted ${result.deletedFiles} files, freed ${(result.freedSpace / 1024 / 1024).toFixed(2)} MB`);
    if (result.errors.length > 0) {
      console.warn(`Cleanup: ${result.errors.length} errors occurred`);
    }

  } catch (error) {
    result.errors.push(`Cleanup failed: ${error}`);
  }

  return result;
}
```

**Integration with Video Assembly:**
```typescript
// lib/video/assembler.ts (in assembleVideo function)
import { cleanupProjectFiles } from '@/lib/db/cleanup';

export async function assembleVideo(...): Promise<string> {
  // ... existing assembly logic ...

  const finalOutputPath = await concatenateVideos(processedScenes, /* ... */);

  // Verify final video exists before cleanup
  const finalExists = await fileExists(finalOutputPath);
  if (finalExists && process.env.AUTO_CLEANUP_ENABLED !== 'false') {
    await cleanupProjectFiles(projectId);
  }

  return finalOutputPath;
}
```

**Safety Guarantees:**
- ✅ Final output video is never deleted
- ✅ Cleanup failures don't fail video generation
- ✅ All deletions are logged for debugging
- ✅ Configuration option to disable cleanup
```

#### Impact:
- Documents the cleanup pattern for consistency
- Provides implementation reference
- Ensures all video providers follow same pattern

---

### 4.4 Database Schema Update - Cleanup Tracking

**Document:** `docs/architecture/database-schema.md`
**Sections:** Migration system and User preferences table

#### NEW Migration (add to migrations array):

```javascript
  {
    version: 8,
    name: 'add_cleanup_tracking',
    up: (db) => {
      // Epic 5 Story 5.6: Track cleanup status for projects
      db.exec(`
        ALTER TABLE projects ADD COLUMN cleanup_status TEXT DEFAULT 'pending';
        ALTER TABLE projects ADD COLUMN cleanup_completed_at TEXT;

        -- Index for cleanup job queries
        CREATE INDEX IF NOT EXISTS idx_projects_cleanup_status ON projects(cleanup_status);
      `);
    }
  }
```

#### MODIFY User Preferences Table:

```sql
-- User preferences table (Epic 6 Story 6.8a, Feature 1.9 v3.6)
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_voice_id TEXT,
  default_persona_id TEXT,
  default_llm_provider TEXT DEFAULT 'ollama',
  quick_production_enabled INTEGER DEFAULT 1,
  auto_cleanup_enabled INTEGER DEFAULT 1, -- Epic 5 Story 5.6: Auto cleanup intermediate files
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (default_persona_id) REFERENCES system_prompts(id) ON DELETE SET NULL,
  CHECK(default_llm_provider IN ('ollama', 'gemini', 'groq'))
);
```

#### Impact:
- Tracks cleanup status per project (pending, complete, failed)
- Allows users to disable auto-cleanup via preference
- Supports future batch cleanup jobs

---

## 5. Implementation Handoff

### Change Scope Classification

**Scope: MINOR**

**Definition:** Can be implemented directly by development team without requiring backlog reorganization or architectural replanning.

### Handoff Recipients

| Role | Responsibility | Deliverables |
|------|----------------|--------------|
| **Development Team** | Implement Story 5.6 cleanup functionality | Story 5.6 specification, implementation tasks |
| **QA Team** | Test cleanup behavior | Test cases from Story 5.6 acceptance criteria |
| **Documentation** | Update architecture docs | Updated architecture documents (proposals 4.2-4.4) |

### Implementation Tasks

1. **Backend Development** (Priority: High)
   - Create `src/lib/db/cleanup.ts` with cleanup service
   - Integrate cleanup into `src/lib/pipeline/video-assembler.ts`
   - Add cleanup queries to `src/lib/db/queries.ts`
   - Update database schema (migration v8)

2. **Testing** (Priority: High)
   - Unit tests for cleanup service
   - Integration tests for end-to-end cleanup
   - Failure scenario tests

3. **Documentation** (Priority: Medium)
   - Update PRD with FR-7.07-7.09
   - Update architecture with cleanup pattern
   - Add cleanup documentation to Epic 5 story file

### Success Criteria

- ✅ All intermediate files deleted after successful video generation
- ✅ Final output video preserved
- ✅ Cleanup failures logged but don't fail generation
- ✅ Configuration option working
- ✅ Epic 5 Story 5.6 marked as "done"
- ✅ All acceptance criteria passing

### Dependencies

**Required:**
- Epic 5 Stories 5.1-5.5 must be complete (they are)

**Optional:**
- Epic 9 (NASA) can reuse cleanup pattern when ready

### Timeline Estimate

- **Development:** 1-2 days
- **Testing:** 0.5 day
- **Documentation:** 0.5 day
- **Total:** 2-3 days

---

## 6. Approval Record

| Role | Name | Approval | Date | Notes |
|------|------|----------|------|-------|
| Product Owner | | ⬜ Pending | | |
| Development Lead | | ⬜ Pending | | |
| Architect | | ⬜ Pending | | |

---

## Appendix A: File Inventory

### Intermediate Files Created During Video Generation

| File Type | Location | Database Reference | Cleanup Action |
|-----------|----------|-------------------|----------------|
| Scene audio | `.cache/audio/{projectId}/scene-{n}.mp3` | `audio_files.file_path` | Delete |
| Video segments | `.cache/videos/{projectId}/scene-{n}-*.mp4` | `visual_suggestions.default_segment_path` | Delete |
| Assembly temp | `.cache/assembly/{projectId}/` | None | Delete directory |
| Provider cache | `assets/cache/{provider}/{video_id}.mp4` | MCP server | Delete if referenced |
| **Final output** | `.cache/output/{projectId}/final.mp4` | `rendered_videos.file_path` | **PRESERVE** |
| Thumbnail | `.cache/output/{projectId}/final-thumb.jpg` | `rendered_videos.thumbnail_path` | Preserve |

### Disk Usage Estimate

For a typical 10-scene video:
- Audio files: ~10 MB (1 MB per scene)
- Video segments: ~200 MB (20 MB per scene)
- Assembly temp: ~50 MB
- **Total cleanup savings:** ~260 MB per video

---

## Appendix B: Related Documentation

- Epic 5 Stories: `docs/stories/stories-epic-5/`
- Video Processing Pipeline: `docs/architecture/video-processing-pipeline.md`
- Database Schema: `docs/architecture/database-schema.md`
- Background Job Queue: `docs/architecture/background-job-queue-architecture.md`

---

**Document Version:** 1.0
**Last Updated:** 2026-01-29
**Status:** Awaiting Approval
