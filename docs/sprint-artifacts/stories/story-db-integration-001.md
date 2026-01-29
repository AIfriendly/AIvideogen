# Story 10.1: Add Database Integration to produce_video.py

Status: **ready_for_development**
**Architecture Review:** ✅ COMPLETE - See docs/architecture/database-integration-architecture.md
**Validation:** ✅ COMPLETE - See docs/architecture/database-integration-validation.md
**Critical Corrections Applied:** 2026-01-28
**Next Step:** Execute ATDD workflow (TEA agent)

## Story

As a **video pipeline developer**,
I want **produce_video.py to create database records during video generation**,
so that **generated videos are tracked in the system and can be managed through the web interface**.

## Context

**Root Cause Analysis:**
The `produce_video.py` script in `ai-video-generator/` currently generates complete videos with:
- Script generation via Groq API
- Text-to-speech via Kokoro TTS
- Video sourcing via DVIDS MCP server
- FFmpeg assembly and output

However, it creates **NO database records**. The video generation happens entirely outside the database tracking system.

**Impact:**
- Videos generated via `produce_video.py` are invisible to the web application
- No project, scene, or rendered_video records are created
- Cannot manage or view these videos through the UI
- Inconsistent data: videos exist on disk but not in database

**Database Schema (ACTUAL - verified via sqlite3):**
- `projects` (23 fields including id TEXT, name, topic, current_step, target_duration, video_path, video_total_duration, video_file_size, created_at, last_active)
- `scenes` (11 fields including id TEXT, project_id, scene_number, text, audio_file_path, duration, created_at, updated_at)
- **NOTE:** No `rendered_videos` table exists - video output data is stored in the `projects` table

**Architecture Review Findings:**
- Database path is `ai-video-generator.db` at project root (NOT `ai-video-generator/database.db`)
- Primary keys use TEXT UUID format (NOT INTEGER AUTOINCREMENT)
- Projects table has extensive fields beyond the basic ones initially documented
- target_duration field EXISTS (no migration needed)
- video_file_size field EXISTS (must be populated)
- File paths should be stored relative to project root

## Acceptance Criteria

### AC1: Command-Line Argument Parsing
**Given** the produce_video.py script
**When** executed from command line
**Then** it should accept arguments for `--topic` and `--duration` instead of hardcoded values
**And** default values should match current behavior (topic="Russian invasion of Ukraine", duration=300)

### AC2: Project Record Creation
**Given** the produce_video.py script starts execution
**When** video generation begins
**Then** a new `projects` record should be created with:
- `name` derived from topic (e.g., "Russian invasion of Ukraine")
- `topic` set to the provided topic
- `current_step` set to "script_generation"
- `target_duration` set to the provided duration
- `created_at` and `last_active` timestamps
- `video_path` initially NULL (updated after completion)

### AC3: Scene Records Creation
**Given** the script has been generated via Groq API
**When** scenes are generated
**Then** each scene should create a `scenes` record with:
- `project_id` referencing the created project
- `scene_number` from the Groq response
- `text` containing the narration script
- `audio_file_path` set after TTS generation
- `duration` set to the actual TTS duration
- `created_at` timestamp

### AC4: Scene Audio File Path Updates
**Given** scene records have been created
**When** Kokoro TTS generates MP3 files for each scene
**Then** the `audio_file_path` field should be updated for each scene with the full path to the MP3 file

### AC5: Project Record Updates During Generation
**Given** a project record exists
**When** the video generation progresses through steps
**Then** the `current_step` field should update to reflect:
- "script_generation" → "voiceover_generation" → "video_sourcing" → "video_assembly" → "complete"

### AC6: Project Completion Update (REVISED)
**Given** the video has been successfully assembled
**When** video generation completes successfully
**Then** the `projects` record should be updated with:
- `video_path` set to the output file path (relative to project root)
- `video_total_duration` set to the actual video duration from ffprobe
- `video_file_size` set to the output file size in bytes (CRITICAL - must be populated)
- `current_step` set to "export"
- `last_active` timestamp updated
**Note:** No separate `rendered_videos` table exists - video metadata is stored in the projects table

### AC7: Database Connection Configuration (CORRECTED)
**Given** the produce_video.py script
**When** it needs to connect to the database
**Then** it should use the SQLite database at project root: `ai-video-generator.db`
**And** the path should be calculated as: `Path(__file__).parent.parent / "ai-video-generator.db"`
**And** the connection should use context managers for proper cleanup

### AC8: UUID Primary Key Generation (NEW)
**Given** the produce_video.py script creates database records
**When** inserting new records into projects or scenes tables
**Then** primary key IDs should be generated using `uuid.uuid4()` as TEXT strings
**And** IDs should be generated before database insertion (no database round-trip needed)

### AC9: Error Handling (RENAMED FROM AC9)

### AC10: Backward Compatibility (RENAMED FROM AC10)
**Given** existing produce_video.py usage
**When** run without command-line arguments
**Then** it should use default values (current hardcoded behavior)
**And** the video generation should work as before, plus database integration

## Tasks / Subtasks

- [ ] Task 1: Implement command-line argument parsing (AC: 1)
  - [ ] Add argparse import and configuration
  - [ ] Add --topic argument with default "Russian invasion of Ukraine"
  - [ ] Add --duration argument with default 300
  - [ ] Update TOPIC and TARGET_DURATION constants from args
  - [ ] Add help text for arguments

- [ ] Task 2: Add SQLite database module import and connection (AC: 7, 8)
  - [ ] Import sqlite3 and uuid modules
  - [ ] Define database path constant: `Path(__file__).parent.parent / "ai-video-generator.db"`
  - [ ] Create get_db_connection() context manager helper function
  - [ ] Add connection error handling with proper logging

- [ ] Task 3: Implement project record creation (AC: 2, 8)
  - [ ] Create create_project_record(topic, duration) function
  - [ ] Generate UUID for project_id using uuid.uuid4()
  - [ ] Generate project name from topic
  - [ ] Insert into projects table with: id (TEXT UUID), name, topic, current_step="script-generation", target_duration
  - [ ] Return project_id (UUID string) for use in subsequent operations
  - [ ] Add logging for project creation with ID

- [ ] Task 4: Implement scene record creation (AC: 3, 8)
  - [ ] Create create_scene_records(project_id, scenes) function
  - [ ] Loop through scenes from Groq API response
  - [ ] Generate UUID for each scene_id using uuid.uuid4()
  - [ ] Insert each scene into scenes table with: id (TEXT UUID), project_id (UUID), scene_number, text
  - [ ] Return list of scene_id UUID strings for later updates
  - [ ] Add logging for scene creation with count

- [ ] Task 5: Update scene audio file paths after TTS (AC: 4, 7)
  - [ ] Modify generate_voiceover() to accept scene_ids (list of UUIDs)
  - [ ] Update each scene's audio_file_path after MP3 generation (normalize to relative path)
  - [ ] Update each scene's duration field with actual TTS duration
  - [ ] Execute UPDATE statements for each scene using scene_id
  - [ ] Add error handling for database updates

- [ ] Task 6: Update project current_step during generation (AC: 5)
  - [ ] Add update_project_step(project_id, step) function
  - [ ] Call after each pipeline step completes
  - [ ] Map steps to valid values: script-generation → voiceover → visual-sourcing → editing → export
  - [ ] Add logging for step transitions

- [ ] Task 7: Update project record on completion (AC: 6) - REVISED
  - [ ] Create update_project_complete(project_id, video_path, duration, file_size) function
  - [ ] Normalize video_path to relative path from project root
  - [ ] Update projects table: video_path, video_total_duration, video_file_size (CRITICAL)
  - [ ] Update current_step to "export"
  - [ ] Update last_active timestamp
  - [ ] Add logging for completion with all metadata

- [ ] Task 8: Add comprehensive error handling (AC: 9)
  - [ ] Wrap all database operations in try-except blocks
  - [ ] Log database errors with context (operation, table, error message, database path)
  - [ ] Use context managers for connection safety (automatic cleanup)
  - [ ] Ensure graceful exit on database failures (exit code 2 for DB errors)
  - [ ] Preserve partial records for debugging (don't rollback on non-critical errors)

- [ ] Task 9: Add transaction safety (NEW)
  - [ ] Use context manager pattern for automatic commit/rollback
  - [ ] Batch scene insertions in single transaction (all or nothing)
  - [ ] Separate transactions for independent operations (project, scenes, updates)
  - [ ] Test transaction rollback on errors

- [ ] Task 10: Test backward compatibility (AC: 10)
  - [ ] Run produce_video.py without arguments (verify defaults work)
  - [ ] Run produce_video.py with custom topic: `--topic "Test Video"`
  - [ ] Run produce_video.py with custom duration: `--duration 180`
  - [ ] Verify database records are created in all cases

- [ ] Task 11: Integration testing (All ACs) - REVISED
  - [ ] Full end-to-end test with database verification
  - [ ] Verify projects table has correct record with video_file_size populated
  - [ ] Verify scenes table has all scenes with audio paths and durations
  - [ ] Verify web application can display the generated video
  - [ ] Test foreign key constraints (delete project cascades to scenes)

- [ ] Task 12: Documentation and cleanup
  - [ ] Update docstring with database integration details
  - [ ] Add comments explaining database operations
  - [ ] Update usage examples in docstring
  - [ ] Clean up any temporary/debug code

## Dev Notes

### Architect Review Summary (2026-01-28)

**Architect:** Winston (AI Architect Agent)
**Status:** ✅ Complete - All critical corrections applied

**Major Corrections Applied:**
1. **Database Path:** Changed from `ai-video-generator/database.db` to `ai-video-generator.db` (project root)
2. **Primary Keys:** Changed from INTEGER AUTOINCREMENT to TEXT UUID (uses `uuid.uuid4()`)
3. **Projects Schema:** Updated from 8 fields to 23 fields (actual verified schema)
4. **Scenes Schema:** Updated from 8 fields to 11 fields with additional fields
5. **Removed:** All references to non-existent `rendered_videos` table
6. **Removed:** AC6 "Rendered Video Record Creation" (table doesn't exist)
7. **Removed:** Task 7 "Create rendered video record" (table doesn't exist)
8. **Added:** AC7 "UUID Primary Key Generation" (new requirement)
9. **Added:** Task 9 "Transaction safety" (new requirement)
10. **Updated:** AC6 to include video_file_size field (critical - must be populated)
11. **Updated:** All example code to use UUIDs and context managers
12. **Updated:** Integration points to use correct current_step values

**Key Architectural Decisions:**
- Video metadata stored in `projects` table, not separate `rendered_videos` table
- UUIDs generated in Python before database insertion (no round-trip needed)
- Context manager pattern for connection safety (automatic cleanup)
- Relative file paths stored in database (portable across machines)
- Batch scene insertions in single transaction (all or nothing)

**Documents Created:**
- `docs/architecture/database-integration-architecture.md` - Complete technical architecture
- `docs/architecture/database-integration-validation.md` - Validation against codebase

### Architecture Context

**Current State:**
- `produce_video.py` runs as standalone Python script
- No database integration
- Videos output to `ai-video-generator/output/`
- Audio files in `ai-video-generator/output/audio/`
- Video clips in `ai-video-generator/output/videos/`

**Target State:**
- Full database integration during video generation
- Records created at appropriate pipeline stages
- Web application can display and manage generated videos
- Consistent data model with rest of system

### Database Schema Reference (CORRECTED - verified via sqlite3)

**⚠️ CRITICAL CORRECTIONS:**
- Primary keys use **TEXT UUID**, not INTEGER AUTOINCREMENT
- Database path is **ai-video-generator.db** at project root, not ai-video-generator/database.db
- **No rendered_videos table exists** - video metadata is in projects table
- Projects table has **23 fields** (not just 8)

**projects table (relevant fields for this story):**
```sql
CREATE TABLE projects (
  -- Primary Key (TEXT UUID, not INTEGER)
  id TEXT PRIMARY KEY,

  -- Core fields
  name TEXT NOT NULL,
  topic TEXT,
  current_step TEXT DEFAULT 'topic' CHECK(current_step IN (
    'topic', 'voice', 'script-generation', 'voiceover',
    'visual-sourcing', 'visual-curation', 'editing', 'export'
  )),

  -- Duration
  target_duration INTEGER DEFAULT 2,  -- EXISTS! No migration needed
  video_total_duration REAL,         -- For actual video duration

  -- Output files (CRITICAL)
  video_path TEXT,                   -- Path to final video
  video_file_size INTEGER,           -- MUST be populated!

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  last_active TEXT DEFAULT (datetime('now')),

  -- ... 13 additional fields omitted for brevity ...
);
```

**scenes table (relevant fields for this story):**
```sql
CREATE TABLE scenes (
  -- Primary Key (TEXT UUID, not INTEGER)
  id TEXT PRIMARY KEY,

  -- Foreign Key (with CASCADE delete)
  project_id TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,

  -- Scene content
  scene_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  audio_file_path TEXT,  -- Path to MP3 file
  duration REAL,         -- Audio duration in seconds

  -- Optional fields
  sanitized_text TEXT,
  selected_clip_id TEXT,
  visual_keywords TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  -- Constraints
  UNIQUE(project_id, scene_number)
);
```

**⚠️ IMPORTANT: No rendered_videos table**
Video output metadata is stored in the projects table fields:
- `video_path` - path to final video file
- `video_total_duration` - actual duration from ffprobe
- `video_file_size` - file size in bytes (MUST be populated)

### Implementation Approach (CORRECTED)

**Database Connection (with context manager):**
```python
import sqlite3
import uuid
import contextlib
from pathlib import Path

# CORRECTED: Database at project root, not in ai-video-generator/ subdirectory
DATABASE_PATH = Path(__file__).parent.parent / "ai-video-generator.db"

@contextlib.contextmanager
def get_db_connection():
    """Get a connection to the SQLite database with automatic cleanup."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise
    finally:
        conn.close()
```

**Project Creation Example (with UUID):**
```python
def create_project_record(topic: str, target_duration: int) -> str:
    """Create a new project record and return its UUID."""
    # Generate UUID before database insertion
    project_id = str(uuid.uuid4())

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO projects (id, name, topic, current_step, target_duration)
            VALUES (?, ?, ?, 'script-generation', ?)
        """, (project_id, topic, topic, target_duration))
        # Connection auto-commits via context manager

    logger.info(f"Created project record: ID={project_id}, topic={topic}")
    return project_id  # Return UUID string, not integer
```

**Scene Creation Example (with UUID):**
```python
def create_scene_records(project_id: str, scenes: list) -> list[str]:
    """Create scene records and return list of scene UUIDs."""
    scene_ids = []

    with get_db_connection() as conn:
        cursor = conn.cursor()
        for scene in scenes:
            scene_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO scenes (id, project_id, scene_number, text)
                VALUES (?, ?, ?, ?)
            """, (scene_id, project_id, scene['sceneNumber'], scene['text']))
            scene_ids.append(scene_id)
        # All scenes commit together or roll back together

    logger.info(f"Created {len(scene_ids)} scene records")
    return scene_ids
```

### Integration Points (CORRECTED)

**Step 1 (Script Generation):**
- Create project record (with UUID) before calling Groq API
- Update current_step to "script-generation"
- Create scene records (with UUIDs) after script is generated

**Step 2 (TTS):**
- Update each scene's audio_file_path and duration after MP3 created
- Update current_step to "voiceover"

**Step 3 (Video Sourcing):**
- Update current_step to "visual-sourcing"

**Step 4 (Assembly):**
- Update current_step to "editing"
- Update project record with: video_path, video_total_duration, video_file_size
- Set current_step to "export" (valid value per CHECK constraint)
- **Note:** No separate rendered_videos table - all metadata in projects table

### Testing Requirements

**Manual Testing:**
1. Run script with: `python produce_video.py --topic "Test Topic" --duration 60`
2. Verify database records created correctly
3. Check web application shows new project

**Database Verification:**
```bash
# CORRECTED: Database at project root, not ai-video-generator/database.db
sqlite3 ai-video-generator.db "SELECT * FROM projects ORDER BY created_at DESC LIMIT 1;"
sqlite3 ai-video-generator.db "SELECT * FROM scenes WHERE project_id = '<uuid>';"
# Note: No rendered_videos table - video data is in projects table
sqlite3 ai-video-generator.db "SELECT id, name, video_path, video_total_duration, video_file_size FROM projects WHERE name = 'Test Topic';"
```

### Error Handling Strategy

**Database Connection Errors:**
- Log error with database path
- Exit with status code 2 (database error)
- User-friendly error message

**Insert/Update Errors:**
- Log context (table, operation, data)
- Preserve partial records for debugging
- Exit with status code 3 (database operation error)

**Constraint Violations:**
- Log violation details
- Check for existing data
- Provide remediation guidance

### References

- [Source: ai-video-generator/produce_video.py](D:\BMAD video generator\ai-video-generator\produce_video.py) - Main script to modify
- [Source: VIDEO_GENERATION_HANDOFF.md](D:\BMAD video generator\VIDEO_GENERATION_HANDOFF.md) - Root cause analysis and context
- [Source: docs/sprint-artifacts/sprint-status.yaml](D:\BMAD video generator\docs\sprint-artifacts\sprint-status.yaml) - Sprint tracking
- **[Architecture: database-integration-architecture.md](D:\BMAD video generator\docs\architecture\database-integration-architecture.md)** - Complete technical architecture (CRITICAL READ)
- **[Validation: database-integration-validation.md](D:\BMAD video generator\docs\architecture\database-integration-validation.md)** - Architecture validation against codebase
- Database schema in `ai-video-generator.db` at project root (verified via sqlite3)

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- Model name/version will be added by dev agent -->

### Debug Log References

<!-- Debug log paths will be added by dev agent -->

### Completion Notes List

<!-- Completion notes will be added by dev agent -->

### File List

<!-- Files modified/created will be listed by dev agent -->
