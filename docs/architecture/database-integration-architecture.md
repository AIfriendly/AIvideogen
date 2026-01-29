# Database Integration Architecture for produce_video.py

**Date:** 2026-01-28
**Architect:** Winston (AI Architect Agent)
**Status:** ✅ **APPROVED FOR IMPLEMENTATION**
**Story:** story-db-integration-001

---

## Executive Summary

This document defines the technical architecture for integrating the standalone `produce_video.py` video generation pipeline with the SQLite database used by the web application.

**Critical Finding:** The original story (story-db-integration-001.md) contained THREE major schema errors that have been corrected in this architecture document.

---

## Architecture Overview

### Current State (Disconntected)

```
┌─────────────────────────────────────────────────────────────┐
│  Web Application (TypeScript/Next.js)                       │
│  ├─ Database: ai-video-generator.db (SQLite)               │
│  └─ Expects: projects → scenes → visual_suggestions         │
└─────────────────────────────────────────────────────────────┘
                          ❌ NO CONNECTION
┌─────────────────────────────────────────────────────────────┐
│  Video Generation Pipeline (Python)                         │
│  └─ produce_video.py (standalone, no DB)                   │
└─────────────────────────────────────────────────────────────┘
```

### Target State (Integrated)

```
┌─────────────────────────────────────────────────────────────┐
│  produce_video.py                                           │
│  ├─ Creates project record                                  │
│  ├─ Creates scene records with audio paths                  │
│  └─ Updates project with final video metadata              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  ai-video-generator.db (SQLite)                             │
│  ├─ projects (23 fields)                                    │
│  ├─ scenes (11 fields)                                      │
│  └─ visual_suggestions (for future use)                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Web Application can now display Python-generated videos    │
└─────────────────────────────────────────────────────────────┘
```

---

## ACTUAL Database Schema (Verified via sqlite3)

### 1. Projects Table

**Location:** `ai-video-generator.db` at project root (NOT `ai-video-generator/database.db`)

**Actual Schema:**
```sql
CREATE TABLE projects (
  -- Primary Key
  id TEXT PRIMARY KEY,  -- UUID string, NOT INTEGER AUTOINCREMENT

  -- Core Fields
  name TEXT NOT NULL,
  topic TEXT,
  current_step TEXT DEFAULT 'topic' CHECK(current_step IN (
    'topic', 'voice', 'script-generation', 'voiceover',
    'visual-sourcing', 'visual-curation', 'editing', 'export'
  )),

  -- Status & Configuration
  status TEXT DEFAULT 'draft',
  config_json TEXT,
  system_prompt_id TEXT,
  voice_id TEXT,
  niche TEXT,

  -- Script & Voiceover Progress
  script_generated BOOLEAN DEFAULT 0,
  voice_selected BOOLEAN DEFAULT 0,

  -- Duration Targets
  target_duration INTEGER DEFAULT 2,  -- EXISTS! No migration needed
  total_duration REAL,                -- Actual generated duration

  -- Visual Progress
  visuals_generated BOOLEAN DEFAULT 0,
  visuals_provider TEXT,
  visuals_download_progress INTEGER DEFAULT 0,

  -- Output Files
  video_path TEXT,              -- Path to final video
  video_total_duration REAL,    -- Final video duration
  video_file_size INTEGER,      -- MUST be populated
  thumbnail_path TEXT,          -- Thumbnail path

  -- RAG Features
  rag_enabled INTEGER DEFAULT 0,
  rag_config TEXT,
  rag_last_sync TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  last_active TEXT DEFAULT (datetime('now')),

  -- Foreign Keys
  FOREIGN KEY (system_prompt_id) REFERENCES system_prompts(id) ON DELETE SET NULL
);
```

**Key Fields for produce_video.py:**
- `id`: Generate UUID using Python `uuid.uuid4()`
- `name`: Derive from topic (e.g., "Russian invasion of Ukraine")
- `topic`: User-provided topic
- `target_duration`: User-provided duration in minutes (field exists!)
- `current_step`: Update through pipeline stages
- `video_path`: Output file path (absolute or relative to project root)
- `video_total_duration`: Actual video duration from ffprobe
- `video_file_size`: File size in bytes (CRITICAL - must be populated)

### 2. Scenes Table

**Actual Schema:**
```sql
CREATE TABLE scenes (
  -- Primary Key
  id TEXT PRIMARY KEY,  -- UUID string, NOT INTEGER AUTOINCREMENT

  -- Foreign Key
  project_id TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,

  -- Scene Content
  scene_number INTEGER NOT NULL,
  text TEXT NOT NULL,              -- Original script from LLM
  sanitized_text TEXT,             -- Cleaned text for TTS
  audio_file_path TEXT,            -- Path to generated MP3

  -- Timing
  duration REAL,                   -- Audio duration in seconds

  -- Visual Selection
  selected_clip_id TEXT,           -- Future: ID of selected video clip
  visual_keywords TEXT,            -- Future: Keywords for video search

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  -- Constraints
  UNIQUE(project_id, scene_number)
);
```

**Key Fields for produce_video.py:**
- `id`: Generate UUID for each scene
- `project_id`: Reference parent project
- `scene_number`: From Groq API response (1-indexed)
- `text`: Narration script from Groq
- `audio_file_path`: Path to MP3 file (e.g., `output/audio/scene_1.mp3`)
- `duration`: Actual TTS duration from Kokoro

**Note:** `sanitized_text`, `selected_clip_id`, and `visual_keywords` are optional and can be NULL initially.

### 3. Visual Suggestions Table (For Future Use)

The `visual_suggestions` table exists but is NOT used by `produce_video.py` currently. The script directly downloads videos via DVIDS MCP server without storing suggestions.

**Actual Schema:**
```sql
CREATE TABLE visual_suggestions (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL,
  query TEXT NOT NULL,
  source TEXT NOT NULL,
  suggestions_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);
```

**Integration Note:** Future enhancement could store DVIDS search results here for caching/reuse.

---

## Database Path Resolution

### Critical Correction

**Story Specified:** `ai-video-generator/database.db` ❌ WRONG
**Actual Path:** `ai-video-generator.db` (at project root) ✅ CORRECT

### Path Calculation in produce_video.py

```python
from pathlib import Path
import os

# Method 1: Relative to script location
SCRIPT_DIR = Path(__file__).parent  # ai-video-generator/
PROJECT_ROOT = SCRIPT_DIR.parent    # D:\BMAD video generator\
DATABASE_PATH = PROJECT_ROOT / "ai-video-generator.db"

# Method 2: Relative to current working directory
# Assumes script is run from project root
DATABASE_PATH = Path("ai-video-generator.db")

# Method 3: Same as web app (process.cwd())
# Matches src/lib/db/client.ts behavior
import sys
if sys.platform == "win32":
    DATABASE_PATH = Path.cwd() / "ai-video-generator.db"
else:
    DATABASE_PATH = Path.cwd() / "ai-video-generator.db"

# RECOMMENDED: Use Method 1 for portability
DATABASE_PATH = Path(__file__).parent.parent / "ai-video-generator.db"
```

---

## File Path Strategy

### Absolute vs. Relative Paths

**Web Application Pattern:**
- Stores **relative paths** from project root
- Example: `output/Russian_invasion_of_Ukraine_video.mp4`

**produce_video.py Current Pattern:**
- Outputs to: `output/{TOPIC}_video.mp4` (relative to `ai-video-generator/`)

**Recommended Strategy:**
```python
# Store paths RELATIVE to project root
# Web app will prepend project root when serving files

OUTPUT_DIR = Path("output")  # Relative to ai-video-generator/
AUDIO_DIR = OUTPUT_DIR / "audio"
VIDEO_DIR = OUTPUT_DIR / "videos"

# Example audio path stored in database:
# "ai-video-generator/output/audio/scene_1.mp3"

# Example video path stored in database:
# "ai-video-generator/output/Russian_invasion_of_Ukraine_video.mp4"
```

### Path Normalization

```python
def normalize_path(file_path: Path) -> str:
    """Convert Path object to relative string for database storage."""
    # Get relative path from project root
    project_root = Path(__file__).parent.parent
    try:
        rel_path = file_path.relative_to(project_root)
        return str(rel_path).replace("\\", "/")  # Normalize to forward slashes
    except ValueError:
        # File not under project root, store absolute path
        return str(file_path).replace("\\", "/")
```

---

## Database Connection Architecture

### Connection Lifecycle

```python
import sqlite3
import contextlib
from pathlib import Path
from typing import Generator

DATABASE_PATH = Path(__file__).parent.parent / "ai-video-generator.db"

@contextlib.contextmanager
def get_db_connection() -> Generator[sqlite3.Connection, None, None]:
    """
    Context manager for database connections.

    Yields:
        sqlite3.Connection: Database connection with row factory

    Raises:
        sqlite3.Error: If connection fails
    """
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Enable column name access
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise
    finally:
        conn.close()
```

### Transaction Safety

**Pattern 1: Per-Operation Transactions**
```python
# Safe for independent operations
def create_project(topic: str, target_duration: int) -> str:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        project_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO projects (id, name, topic, current_step, target_duration)
            VALUES (?, ?, ?, 'script-generation', ?)
        """, (project_id, topic, topic, target_duration))
        return project_id
```

**Pattern 2: Multi-Operation Transactions**
```python
# Use for related operations that must succeed together
def create_scene_batch(project_id: str, scenes: list[dict]) -> list[str]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        scene_ids = []
        for scene in scenes:
            scene_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO scenes (id, project_id, scene_number, text)
                VALUES (?, ?, ?, ?)
            """, (scene_id, project_id, scene['sceneNumber'], scene['text']))
            scene_ids.append(scene_id)
        # All inserts commit together or roll back together
        return scene_ids
```

---

## Integration Points by Pipeline Stage

### Stage 1: Script Generation (Before Groq API)

```python
async def generate_script(topic: str, target_duration: int) -> dict:
    # 1. Create project record
    project_id = create_project(topic, target_duration)
    logger.info(f"Created project {project_id} for topic: {topic}")

    # 2. Call Groq API for script
    scenes = await call_groq_api(topic, target_duration)

    # 3. Create scene records (without audio paths yet)
    scene_ids = create_scene_batch(project_id, scenes)

    # 4. Update project step
    update_project_step(project_id, "voiceover")

    return {
        "project_id": project_id,
        "scenes": scenes,
        "scene_ids": scene_ids
    }
```

### Stage 2: Voiceover Generation (After Kokoro TTS)

```python
async def generate_voiceover(project_id: str, scenes: list[dict]) -> None:
    for i, scene in enumerate(scenes):
        # Generate MP3
        audio_path = await generate_kokoro_tts(scene['text'], i + 1)

        # Update scene with audio path and duration
        update_scene_audio(
            scene_id=scene['id'],
            audio_path=audio_path,
            duration=get_mp3_duration(audio_path)
        )
```

### Stage 3: Video Sourcing (DVIDS API)

```python
async def source_videos(project_id: str, scenes: list[dict]) -> dict:
    # Update project step
    update_project_step(project_id, "visual-sourcing")

    # DVIDS API calls (no DB changes needed currently)
    # Future enhancement: Store suggestions in visual_suggestions table
    scene_videos = await call_dvids_mcp(scenes)

    return scene_videos
```

### Stage 4: Video Assembly (After FFmpeg)

```python
async def assemble_video(project_id: str, scenes: list[dict], output_file: Path) -> None:
    # Update project step
    update_project_step(project_id, "editing")

    # Run FFmpeg assembly
    await run_ffmpeg_assembly(scenes, output_file)

    # Get video metadata
    duration = get_video_duration(output_file)
    file_size = output_file.stat().st_size

    # Update project with completion data
    update_project_complete(
        project_id=project_id,
        video_path=output_file,
        duration=duration,
        file_size=file_size
    )
```

---

## Error Handling Strategy

### Database Connection Errors

```python
def handle_database_error(error: Exception, context: str) -> None:
    """Log database errors with context and exit gracefully."""
    logger.error(f"Database error in {context}: {error}")
    logger.error(f"Database path: {DATABASE_PATH}")
    logger.error("Please verify the database exists and is accessible.")
    sys.exit(2)  # Exit code 2 = database error
```

### Error Recovery Strategy

1. **Connection Failure**: Exit immediately (database is required)
2. **Insert Failure**: Log and continue (partial records for debugging)
3. **Update Failure**: Log warning (non-critical, can be fixed manually)
4. **Constraint Violation**: Log with details (indicates data issue)

---

## Command-Line Argument Parsing

### Implementation

```python
import argparse
import sys

def parse_arguments() -> tuple[str, int]:
    """Parse command-line arguments for topic and duration."""
    parser = argparse.ArgumentParser(
        description="Generate video from topic using AI pipeline",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    parser.add_argument(
        "--topic",
        type=str,
        default="Russian invasion of Ukraine",
        help="Video topic/title"
    )

    parser.add_argument(
        "--duration",
        type=int,
        default=300,
        help="Target video duration in seconds"
    )

    args = parser.parse_args()

    logger.info(f"Topic: {args.topic}")
    logger.info(f"Target duration: {args.duration}s ({args.duration // 60}m {args.duration % 60}s)")

    return args.topic, args.duration
```

### Usage Examples

```bash
# Use defaults
python produce_video.py

# Custom topic (default duration)
python produce_video.py --topic "Modern Naval Warfare"

# Custom duration (default topic)
python produce_video.py --duration 180

# Both custom
python produce_video.py --topic "Space Exploration" --duration 600
```

---

## Architecture Decision Records

### ADR-001: No rendered_videos Table

**Decision:** Do NOT create a separate `rendered_videos` table as specified in original story.

**Rationale:**
1. Table does not exist in actual database schema
2. Web application stores video output metadata directly in `projects` table
3. Fields `video_path`, `video_total_duration`, `video_file_size` serve this purpose

**Impact:** Remove AC6 and Task 7 from story. Replace with project update logic.

### ADR-002: UUID Primary Keys

**Decision:** Use TEXT UUIDs for primary keys, not INTEGER AUTOINCREMENT.

**Rationale:**
1. Matches existing database schema
2. Web application expects UUID strings
3. Allows distributed ID generation (no database round-trip needed)

**Implementation:** Use Python `uuid.uuid4()` to generate IDs.

### ADR-003: Relative File Paths

**Decision:** Store file paths relative to project root.

**Rationale:**
1. Matches web application pattern
2. Portable across different machines
3. Works regardless of where script is run from

**Implementation:** Normalize paths using `Path.relative_to(project_root)`.

---

## Testing Strategy

### Unit Testing

```python
import pytest
import sqlite3
from pathlib import Path

@pytest.fixture
def test_database(tmp_path: Path) -> sqlite3.Connection:
    """Create in-memory database for testing."""
    # Load actual schema
    schema_sql = Path("src/lib/db/schema.sql").read_text()
    conn = sqlite3.connect(":memory:")
    conn.executescript(schema_sql)
    return conn

def test_create_project(test_database):
    """Test project creation matches schema."""
    # Test implementation
    pass
```

### Integration Testing

```bash
# Run script and verify database records
python produce_video.py --topic "Test Video" --duration 60

# Verify in database
sqlite3 ai-video-generator.db "SELECT * FROM projects WHERE name = 'Test Video';"
sqlite3 ai-video-generator.db "SELECT * FROM scenes WHERE project_id = '<test-id>';"
```

---

## Implementation Checklist

- [ ] Update story with corrected database schema
- [ ] Remove references to non-existent rendered_videos table
- [ ] Fix database path calculation
- [ ] Implement command-line argument parsing
- [ ] Add get_db_connection() context manager
- [ ] Implement create_project() function
- [ ] Implement create_scene_batch() function
- [ ] Implement update_scene_audio() function
- [ ] Implement update_project_step() function
- [ ] Implement update_project_complete() function
- [ ] Add error handling and logging
- [ ] Test with actual video generation
- [ ] Verify web application can display generated videos

---

## Appendix: Story Corrections Required

### Error 1: Projects Table Schema

**Story Has:**
- INTEGER PRIMARY KEY AUTOINCREMENT
- Only 8 fields
- TIMESTAMP type (doesn't exist in SQLite)

**Actual Schema:**
- TEXT PRIMARY KEY (UUID)
- 23 fields
- TEXT with datetime('now') defaults

### Error 2: Scenes Table Schema

**Story Has:**
- INTEGER PRIMARY KEY AUTOINCREMENT
- 8 fields
- Basic FOREIGN KEY

**Actual Schema:**
- TEXT PRIMARY KEY (UUID)
- 11 fields (including sanitized_text, selected_clip_id, visual_keywords)
- FOREIGN KEY with ON DELETE CASCADE
- UNIQUE constraint on (project_id, scene_number)

### Error 3: Rendered Videos Table

**Story References:** `rendered_videos` table with CREATE and INSERT operations

**Reality:** Table does not exist. Video output data stored in `projects` table fields:
- video_path
- video_total_duration
- video_file_size
- thumbnail_path

---

**Document Status:** ✅ COMPLETE - Ready for story update and implementation
**Next Steps:**
1. Update story-db-integration-001.md with corrections
2. Execute ATDD workflow (TEA agent)
3. Execute development workflow (DEV agent)
