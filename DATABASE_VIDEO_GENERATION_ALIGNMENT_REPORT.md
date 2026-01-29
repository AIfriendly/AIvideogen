# Database vs. Video Generation Pipeline - Alignment Report

**Date:** 2026-01-28
**Session:** Party Mode Database Integration Analysis
**Status:** ⚠️ **CRITICAL DISCONNECT IDENTIFIED**

---

## 🔍 Executive Summary

### Finding
The **database schema** and **video generation pipeline** are **completely disconnected**. The Python `produce_video.py` script operates independently with no database integration, while the web application expects database records that never get created.

### Impact
- ✅ **Videos CAN be generated** (standalone Python script works)
- ❌ **Web app CANNOT track generated videos** (no database records)
- ❌ **No project-scene-video relationship** in database
- ❌ **Manual file management required** (no database-backed workflow)

---

## 📊 Current Architecture

### System 1: Web Application (TypeScript/Next.js)

**Purpose:** Interactive video project management
**Database:** SQLite (`ai-video-generator.db`)
**Tables:**
```
projects → scenes → visual_suggestions → clip_selections
                ↓
          rendered_videos
```

**Workflow:**
1. User creates project → `projects` table
2. AI generates script → `scenes` table
3. AI generates voiceover → `scenes.audio_file_path`
4. User selects clips → `visual_suggestions` + `clip_selections`
5. Assemble video → `rendered_videos` table

### System 2: Video Generation Pipeline (Python)

**Purpose:** Automated video generation
**Database:** NONE
**Workflow:**
```
Groq API → Script (JSON)
    ↓
Kokoro TTS → Audio files (MP3)
    ↓
DVIDS API → Video files (MP4)
    ↓
FFmpeg → Final video (MP4)
```

**Output:** `output/{TOPIC}_video.mp4`
**No database writes. No project tracking. No scene records.**

---

## ⚠️ Critical Gaps

### Gap 1: No Project Records

**What Database Expects:**
```sql
INSERT INTO projects (id, name, topic, video_path, total_duration, ...)
VALUES ('uuid', 'My Video', 'Topic', 'output/video.mp4', 120, ...)
```

**What `produce_video.py` Does:**
- ✅ Generates video file
- ❌ Creates NO project record
- ❌ No database entry at all

### Gap 2: No Scene Records

**What Database Expects:**
```sql
INSERT INTO scenes (id, project_id, scene_number, text, audio_file_path, duration)
VALUES ('uuid', 'project-id', 1, 'Scene text', 'output/audio/scene_1.mp3', 12.5)
```

**What `produce_video.py` Does:**
- ✅ Creates `output/audio/scene_1.mp3`
- ❌ Creates NO scene record
- ❌ No link to project

### Gap 3: No Rendered Video Records

**What Database Expects:**
```sql
INSERT INTO rendered_videos (id, project_id, file_path, thumbnail_path, duration, file_size_bytes)
VALUES ('uuid', 'project-id', 'output/video.mp4', 'output/thumb.jpg', 120.1, 60600000)
```

**What `produce_video.py` Does:**
- ✅ Creates `output/{TOPIC}_video.mp4`
- ❌ Creates NO `rendered_videos` record
- ❌ No database tracking

### Gap 4: Hardcoded Configuration

**Problem:** `produce_video.py` has hardcoded values (lines 53-54):
```python
TOPIC = "Russian invasion of Ukraine"
TARGET_DURATION = 300  # 5 minutes
```

**Impact:**
- ❌ Cannot pass custom topics via CLI
- ❌ Cannot specify target duration
- ❌ Command-line arguments are IGNORED

---

## 🔧 Integration Requirements

### Option A: Add Database Integration to Python (RECOMMENDED)

**Changes needed in `produce_video.py`:**

```python
import sqlite3
import uuid

# 1. Add project creation
def create_project_in_db(topic: str, target_duration: int) -> str:
    """Create project record in database"""
    project_id = str(uuid.uuid4())
    conn = sqlite3.connect('ai-video-generator.db')
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO projects (id, name, topic, current_step, target_duration, created_at, last_active)
        VALUES (?, ?, ?, 'topic', ?, datetime('now'), datetime('now'))
    """, (project_id, topic, topic, target_duration))

    conn.commit()
    conn.close()
    return project_id

# 2. Add scene creation
def create_scene_in_db(project_id: str, scene_number: int, text: str, audio_path: str, duration: float):
    """Create scene record in database"""
    scene_id = str(uuid.uuid4())
    conn = sqlite3.connect('ai-video-generator.db')
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO scenes (id, project_id, scene_number, text, audio_file_path, duration)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (scene_id, project_id, scene_number, text, audio_path, duration))

    conn.commit()
    conn.close()
    return scene_id

# 3. Add rendered video tracking
def create_rendered_video_in_db(project_id: str, video_path: str, duration: float, file_size: int):
    """Create rendered video record in database"""
    video_id = str(uuid.uuid4())
    conn = sqlite3.connect('ai-video-generator.db')
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO rendered_videos (id, project_id, file_path, duration_seconds, file_size_bytes)
        VALUES (?, ?, ?, ?, ?)
    """, (video_id, project_id, video_path, duration, file_size))

    # Update project with video_path
    cursor.execute("""
        UPDATE projects
        SET video_path = ?, total_duration = ?, current_step = 'export'
        WHERE id = ?
    """, (video_path, duration, project_id))

    conn.commit()
    conn.close()
    return video_id

# 4. Update main() to use database functions
async def main():
    # Parse command-line arguments
    import sys
    topic = sys.argv[1] if len(sys.argv) > 1 else TOPIC
    target_duration = int(sys.argv[2]) if len(sys.argv) > 2 else TARGET_DURATION

    # Create project in database
    project_id = create_project_in_db(topic, target_duration)

    # Generate script
    scenes = await generate_script(topic, target_duration)

    # Generate voiceover
    scenes = await generate_voiceover(scenes, OUTPUT_DIR)

    # Save scenes to database
    for scene in scenes:
        create_scene_in_db(
            project_id,
            scene['sceneNumber'],
            scene['text'],
            scene['audioFile'],
            scene.get('actualDuration', scene.get('estimatedDuration', 30))
        )

    # Source videos and assemble
    scene_videos, dvids_server = await source_videos(scenes, CACHE_DIR)
    output_file = await assemble_video(scenes, scene_videos, OUTPUT_DIR, dvids_server)

    # Get file info
    import os
    file_size = os.path.getsize(output_file)

    # Create rendered video record
    create_rendered_video_in_db(project_id, output_file, total_duration, file_size)
```

### Option B: Wrap Python Script with API Integration

Create a TypeScript wrapper that calls `produce_video.py` and updates the database:

```typescript
// src/lib/video/generator-wrapper.ts
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import db from '@/lib/db/client';
import path from 'path';

export async function generateVideoWithDatabase(
  projectId: string,
  topic: string,
  targetDuration: number
): Promise<string> {
  // Update project status
  db.prepare(`
    UPDATE projects SET current_step = 'visual-sourcing' WHERE id = ?
  `).run(projectId);

  // Run Python script
  const pythonProcess = spawn('uv', ['run', 'produce_video.py', topic, targetDuration.toString()], {
    cwd: path.join(process.cwd(), 'ai-video-generator')
  });

  await new Promise((resolve, reject) => {
    pythonProcess.on('close', (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`Python script exited with code ${code}`));
    });
  });

  // Find generated video file
  const videoPath = `output/${topic.replace(/\s+/g, '_')}_video.mp4`;

  // Create rendered video record
  const videoId = randomUUID();
  const stats = await stat(videoPath);

  db.prepare(`
    INSERT INTO rendered_videos (id, project_id, file_path, duration_seconds, file_size_bytes)
    VALUES (?, ?, ?, ?, ?)
  `).run(videoId, projectId, videoPath, targetDuration, stats.size);

  // Update project
  db.prepare(`
    UPDATE projects
    SET video_path = ?, total_duration = ?, current_step = 'export'
    WHERE id = ?
  `).run(videoPath, targetDuration, projectId);

  return videoPath;
}
```

### Option C: Migrate Pipeline to TypeScript (LONG-TERM)

**Complexity:** High
**Effort:** 2-3 weeks
**Benefit:** Full integration, single codebase

**Requirements:**
1. Port Groq API calls to TypeScript
2. Port Kokoro TTS integration to TypeScript
3. Port DVIDS MCP integration to TypeScript
4. Port FFmpeg assembly to TypeScript (fluent-ffmpeg)
5. Full database integration throughout

---

## 📋 Recommended Action Plan

### Phase 1: Quick Fix (1-2 hours)
**Option A - Add database integration to `produce_video.py`**

**Steps:**
1. Add `sqlite3` import to `produce_video.py`
2. Create `create_project_in_db()` function
3. Create `create_scene_in_db()` function
4. Create `create_rendered_video_in_db()` function
5. Update `main()` to parse command-line arguments
6. Call database functions at appropriate points
7. Test end-to-end

**Files to modify:**
- `produce_video.py` (add ~100 lines)

### Phase 2: Validation (30 minutes)
**Test the integration:**
1. Run `uv run produce_video.py "Test Video" 60`
2. Check database: `SELECT * FROM projects WHERE name = 'Test Video'`
3. Check scenes: `SELECT * FROM scenes WHERE project_id = ?`
4. Check rendered_videos: `SELECT * FROM rendered_videos WHERE project_id = ?`

### Phase 3: API Integration (1-2 hours)
**Create wrapper API endpoint:**
```typescript
// src/app/api/generate-video/route.ts
export async function POST(request: NextRequest) {
  const { topic, duration } = await request.json();
  const projectId = randomUUID();

  // Create project
  // Call Python script
  // Update database
  // Return result
}
```

---

## 🎯 Success Criteria

Integration is successful when:

1. ✅ Running `produce_video.py "My Topic" 180` creates:
   - Project record in `projects` table
   - Scene records in `scenes` table (one per scene)
   - Rendered video record in `rendered_videos` table

2. ✅ Web application can:
   - Query projects created by Python script
   - Display scenes with audio file paths
   - Show rendered video with correct metadata

3. ✅ Command-line arguments work:
   - Custom topics are respected
   - Target duration is respected
   - No more hardcoded values

---

## 📊 Current vs. Target State

| Aspect | Current | Target |
|--------|---------|--------|
| **Project Tracking** | ❌ None | ✅ Database records |
| **Scene Tracking** | ❌ None | ✅ Scene records with audio paths |
| **Video Tracking** | ❌ None | ✅ Rendered video records |
| **CLI Arguments** | ❌ Ignored | ✅ Parsed and used |
| **Web App Integration** | ❌ Disconnected | ✅ Fully connected |
| **Workflow** | Manual | Automated |

---

## 🔗 Related Files

### Database Schema
- `src/lib/db/schema.sql` - Database schema
- `docs/architecture/database-schema.md` - Schema documentation

### Video Generation
- `produce_video.py` - Main video generation script
- `VIDEO_GENERATION_HANDOFF.md` - Pipeline documentation
- `VIDEO_GENERATION_TEST_REPORT.md` - Test results

### Integration Points
- `src/app/api/projects/[id]/export/route.ts` - Export endpoint
- `src/app/api/projects/[id]/assemble/route.ts` - Assembly endpoint

---

## ✅ Conclusion

**The database and video generation pipeline are completely disconnected.**

**Root Cause:** `produce_video.py` was designed as a standalone script with no database integration.

**Solution:** Add database integration to `produce_video.py` (Option A - Recommended)

**Effort:** 1-2 hours for basic integration

**Impact:**
- ✅ Web app can track Python-generated videos
- ✅ Single source of truth for all videos
- ✅ Seamless workflow from generation to export

---

**Report Generated:** 2026-01-28
**Session Mode:** Party Mode (Multi-Agent Analysis)
**Status:** ⚠️ **REQUIRES INTEGRATION WORK**
