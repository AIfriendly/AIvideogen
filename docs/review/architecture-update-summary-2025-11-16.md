# Architecture Document Update Summary

**Date:** 2025-11-16
**Updated By:** Winston (Architect) - BMAD Agent
**Document:** D:\BMAD video generator\docs\architecture.md
**Version:** 1.2 → 1.3

---

## Overview

The architecture document has been updated to include Epic 3 enhancements (duration filtering and default segment downloads) and low-priority documentation improvements. All updates are based on the validation report recommendations.

**Status:** ✅ **COMPLETE** - All Epic 3 updates and low-priority items implemented

---

## What Was Updated

### 1. Epic 3 Story 3.4: Duration Filtering Logic ✅

**Location:** Lines 520-570

**Added:**
- **Duration filtering criteria** as first filter in the list
- **Complete filterByDuration() function** with TypeScript implementation
- **Duration calculation examples** showing 1x-3x ratio and 5-minute max
- **Fallback logic update** to include duration threshold relaxation

**Implementation:**
```typescript
function filterByDuration(
  results: YouTubeVideo[],
  sceneDuration: number
): YouTubeVideo[] {
  const minDuration = sceneDuration; // 1x ratio
  const maxDuration = Math.min(sceneDuration * 3, 300); // 3x or 5 min max

  return results.filter(video => {
    const duration = video.durationSeconds;
    return duration >= minDuration && duration <= maxDuration;
  });
}
```

**Examples Added:**
- 10s scene → accepts 10s-30s videos (max 30s)
- 90s scene → accepts 90s-270s videos (max 270s = 4.5 min)
- 120s scene → accepts 120s-300s videos (max 300s = 5 min, NOT 360s)

---

### 2. Epic 3 Story 3.6: Default Segment Download Service ✅

**Location:** Lines 610-685 (NEW SECTION)

**Added:**
- **Complete Story 3.6 documentation** with goal, components, and database extensions
- **yt-dlp implementation** for downloading first N seconds of videos
- **File naming convention** for default vs custom segments
- **Complete key flow** from filtering through download to preview availability
- **Benefits documentation** explaining why default segments improve UX
- **Download parameters** (720p, segment range, 5s buffer)
- **Error recovery** strategy with retry logic and permanent failure handling

**yt-dlp Command:**
```bash
yt-dlp "https://youtube.com/watch?v=${videoId}" \
  --download-sections "*0-${segmentDuration}" \
  -f "best[height<=720]" \
  -o "${outputPath}"
```

**File Naming:**
```
Default segments:  .cache/videos/{projectId}/scene-{sceneNumber}-default.mp4
Custom segments:   .cache/videos/{projectId}/scene-{sceneNumber}-custom-{startTimestamp}s.mp4
```

**Database Extensions Documented:**
- `duration INTEGER` (video duration in seconds)
- `default_segment_path TEXT` (path to downloaded segment)
- `download_status TEXT` (pending, downloading, complete, error)

---

### 3. UI Consistency Patterns: Duration Badge Color-Coding ✅

**Location:** Lines 2516-2614 (NEW SECTION)

**Added:**
- **Complete getBadgeColor() function** with TypeScript implementation
- **Usage examples** for all 4 color scenarios (green/yellow/red/gray)
- **Ratio thresholds explained** (1x-2x green, 2x-3x yellow, >3x red, <1x gray)
- **Component integration example** with DurationBadge.tsx
- **Consistency requirements** checklist
- **Where applied** documentation (Epic 3 Story 3.6, Epic 4)

**Color Logic:**
```typescript
function getBadgeColor(
  videoDuration: number,
  sceneDuration: number
): { background: string; text: string; tooltip: string } {
  const ratio = videoDuration / sceneDuration;

  if (ratio >= 1 && ratio <= 2) {
    return {
      background: '#10b981', // Green (Emerald 500)
      text: '#ffffff',
      tooltip: 'Ideal length for this scene'
    };
  } else if (ratio > 2 && ratio <= 3) {
    return {
      background: '#f59e0b', // Yellow (Amber 500)
      text: '#000000',
      tooltip: 'Acceptable length - some trimming needed'
    };
  } else if (ratio > 3) {
    return {
      background: '#ef4444', // Red (Red 500)
      text: '#ffffff',
      tooltip: 'Long video - consider shorter alternatives'
    };
  } else { // ratio < 1
    return {
      background: '#6b7280', // Gray (Gray 500)
      text: '#ffffff',
      tooltip: 'Video shorter than needed'
    };
  }
}
```

**Examples:**
- 10s scene, 15s video → Green "Ideal length"
- 10s scene, 25s video → Yellow "Acceptable length"
- 10s scene, 90s video → Red "Long video"
- 10s scene, 8s video → Gray "Video shorter"

---

### 4. Database Schema: Scenes Table Documentation ✅

**Location:** Lines 1850-1863 (NEW TABLE)

**Added:**
- **Complete scenes table schema** with all columns
- **Index on project_id** for performance
- **Clear column comments** explaining Epic 2 usage
- **Foreign key constraint** to projects table
- **Unique constraint** on (project_id, scene_number)

**Schema:**
```sql
CREATE TABLE scenes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_number INTEGER NOT NULL,
  text TEXT NOT NULL, -- Narration text for voiceover
  audio_file_path TEXT, -- Generated voiceover MP3 (Epic 2)
  duration INTEGER, -- Audio duration in seconds (Epic 2)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, scene_number)
);

CREATE INDEX idx_scenes_project ON scenes(project_id);
```

---

### 5. Database Schema: visual_suggestions Table Extensions ✅

**Location:** Lines 1865-1882 (UPDATED TABLE)

**Added:**
- **duration INTEGER column** with comment (Epic 3 Story 3.4)
- **default_segment_path TEXT column** with comment (Epic 3 Story 3.6)
- **download_status TEXT column** with default 'pending' (Epic 3 Story 3.6)
- **Index on scene_id** for performance
- **Enhanced comments** on existing columns

**Updated Schema:**
```sql
CREATE TABLE visual_suggestions (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL,
  video_id TEXT NOT NULL, -- YouTube video ID
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  channel_title TEXT,
  embed_url TEXT NOT NULL,
  rank INTEGER NOT NULL, -- Ranking from 1-8 (top suggestions)
  duration INTEGER, -- Video duration in seconds (Epic 3 Story 3.4)
  default_segment_path TEXT, -- Path to downloaded default segment (Epic 3 Story 3.6)
  download_status TEXT DEFAULT 'pending', -- pending, downloading, complete, error (Epic 3 Story 3.6)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

CREATE INDEX idx_visual_suggestions_scene ON visual_suggestions(scene_id);
```

---

### 6. Database Migration Strategy ✅

**Location:** Lines 2048-2291 (NEW SECTION)

**Added:**
- **Complete migration system** with TypeScript implementation
- **6 initial migrations** covering all epics
- **Schema version tracking table**
- **Migration runner** with transaction support
- **Usage examples** for application startup
- **Best practices** checklist
- **Adding new migration** example
- **Migration status check** function

**Migration System Features:**
- ✅ Version tracking in `schema_version` table
- ✅ Idempotent migrations (IF NOT EXISTS)
- ✅ Transactional execution
- ✅ Automatic on startup
- ✅ Sequential versioning (1-6 documented, extensible)

**Migrations Documented:**
1. **initial_schema** - Base tables (projects, messages, system_prompts)
2. **add_scenes_table** - Epic 2 scenes table
3. **add_visual_suggestions** - Epic 3 visual suggestions table
4. **add_segment_downloads** - Epic 3 Story 3.4 & 3.6 columns
5. **add_clip_selections** - Epic 4 clip selections table
6. **add_audio_and_rendered_videos** - Epic 2 & 5 tables

**Usage:**
```typescript
// app/layout.tsx or server initialization
import { runMigrations } from '@/lib/db/migrations';

if (typeof window === 'undefined') {
  runMigrations();
}
```

---

## Files Modified

### 1. `architecture.md`

**Total Changes:**
- **Version:** 1.2 → 1.3
- **Lines Added:** ~500 lines
- **New Sections:** 3 (Story 3.6, Duration Badge Color-Coding, Database Migration Strategy)
- **Updated Sections:** 3 (Story 3.4, scenes table, visual_suggestions table)

**Section Breakdown:**
- Epic 3 Story 3.4: +50 lines (duration filtering logic)
- Epic 3 Story 3.6: +75 lines (default segment download)
- UI Consistency Patterns: +98 lines (duration badge color-coding)
- Database Schema - scenes table: +13 lines
- Database Schema - visual_suggestions: +4 lines (column additions)
- Database Migration Strategy: +243 lines

---

## What Developers Can Now Do

With these architecture updates, developers can implement Epic 3 with complete guidance:

✅ **Story 3.4 (Content Filtering):** Duration filtering implementation with exact function signature and examples
✅ **Story 3.6 (Default Segment Downloads):** Complete yt-dlp command, file naming convention, error handling
✅ **Duration Badge UI:** Consistent color-coding across all components with exact hex values
✅ **Database Schema:** Full scenes table schema and visual_suggestions extensions
✅ **Database Migrations:** Automated schema updates with version tracking

---

## Validation Against Recommendations

**Original Recommendations from architecture-validation-report-2025-11-16.md:**

1. ✅ **Add default segment download to Epic 3 architecture** (Recommendation 7, HIGH PRIORITY)
   - Status: COMPLETE
   - Location: Lines 610-685

2. ✅ **Add duration filtering logic to Epic 3 architecture** (Recommendation 6, MEDIUM PRIORITY)
   - Status: COMPLETE
   - Location: Lines 532-570

3. ✅ **Duration badge color-coding pattern** (Recommendation 3, LOW PRIORITY)
   - Status: COMPLETE
   - Location: Lines 2516-2614

4. ✅ **Scene schema documentation** (Recommendation 8, LOW PRIORITY)
   - Status: COMPLETE
   - Location: Lines 1850-1863

5. ✅ **Database migration strategy** (Recommendation 9, LOW PRIORITY)
   - Status: COMPLETE
   - Location: Lines 2048-2291

**Skipped (As Requested):**
- Recommendation 1: Add Epic 4 UX component specifications (skipped per user request)
- Recommendation 2: Document yt-dlp segment download for Epic 4 custom segments (skipped, Epic 4 focused)
- Recommendation 4: Document segment selection workflow (skipped, Epic 4 focused)
- Recommendation 5: Add download error handling for Epic 4 (skipped, Epic 4 focused)

---

## Next Steps

### For Winston (Architect):
- ✅ Epic 3 architecture updates complete
- ✅ Low priority documentation complete
- ⏳ **Optional:** Update architecture for Epic 4 when ready (Recommendations 1, 2, 4, 5)

### For Dev Team:
- ✅ **Epic 1 (Conversational Agent):** Ready to implement
- ✅ **Epic 2 (Script & Voiceover):** Ready to implement
- ✅ **Epic 3 (Visual Sourcing):** Ready to implement - ALL stories documented
  - Story 3.1: YouTube API Client ✅
  - Story 3.2: Scene Text Analysis ✅
  - Story 3.3: YouTube Video Search ✅
  - Story 3.4: Content Filtering (with duration) ✅
  - Story 3.5: Visual Suggestions Database ✅
  - Story 3.6: Default Segment Download ✅ (NEW)
- ⏳ **Epic 4 (Visual Curation):** Basic architecture ready, segment selection workflow pending
- ✅ **Epic 5 (Video Assembly):** Ready to implement

### For QA Team:
- Use duration filtering examples for test scenarios (10s, 90s, 120s scenes)
- Test duration badge color-coding with all 4 scenarios
- Verify database migrations run idempotently
- Test default segment downloads with various video lengths

---

## Summary

The architecture document (v1.3) now provides complete implementation guidance for all Epic 3 stories, including the newly added Story 3.6 for default segment downloads. Duration filtering logic, duration badge color-coding patterns, complete database schemas, and a robust migration strategy are all documented with code examples.

**Epic 3 Implementation Readiness:** 100% ✅

**No blockers for Epic 3 development.**

---

**Approved By:** Winston (Architect) - BMAD Agent
**Date:** 2025-11-16
