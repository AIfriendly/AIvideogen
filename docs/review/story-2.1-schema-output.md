# Story 2.1 Schema Output for Story 2.2 Database Integration

**Purpose:** This document specifies the exact database schema requirements for Story 2.2 to implement.
**Story:** 2.1 - TTS Engine Integration & Voice Profile Setup
**Target Story:** 2.2 - Database Schema Updates for Epic 2
**Date:** 2025-11-06

## Overview

Story 2.1 establishes the audio file storage structure and voice profile infrastructure. Story 2.2 will implement the database schema to persist this data.

**Key Requirements:**
1. Add `voice_id` column to `projects` table
2. Create new `scenes` table for script breakdown
3. Use RELATIVE paths for audio files (portability)
4. Use REAL type for duration (floating point seconds)
5. Add proper indexes for query performance

## Projects Table Additions

### SQL Migration Script

```sql
-- Add voice_id column to projects table
-- This stores the user's selected voice for the entire project

ALTER TABLE projects ADD COLUMN voice_id TEXT;

-- Optional: Add constraint to validate voice_id against known voices
-- (Can be enforced in application layer for flexibility)
```

### Column Specifications

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `voice_id` | TEXT | YES | Voice profile ID (e.g., 'sarah', 'james', 'emma') |

**Notes:**
- Nullable because existing projects don't have voice selection yet
- Valid values: Any `id` from `VOICE_PROFILES` constant (48 voices total, 5 MVP)
- Validation: Application layer checks against `getVoiceById(voiceId)`
- Foreign key: Not enforced at database level (voices are code-defined, not in DB)

### Usage Example

```typescript
// Update project with selected voice
db.prepare('UPDATE projects SET voice_id = ? WHERE id = ?')
  .run('sarah', projectId);

// Query project with voice
const project = db.prepare('SELECT * FROM projects WHERE id = ?')
  .get(projectId);
console.log(project.voice_id); // 'sarah'
```

## Scenes Table (NEW)

### SQL Creation Script

```sql
-- Create scenes table for script breakdown
-- Each scene represents one segment of narrated content

CREATE TABLE scenes (
  -- Primary key
  id TEXT PRIMARY KEY,

  -- Foreign key to projects table
  project_id TEXT NOT NULL,

  -- Scene ordering
  scene_number INTEGER NOT NULL,

  -- Script text (original and sanitized)
  text TEXT NOT NULL,
  sanitized_text TEXT,

  -- Audio file reference (RELATIVE path from project root)
  audio_file_path TEXT,

  -- Audio duration in seconds (REAL for floating point)
  duration REAL,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  -- Foreign key constraint with CASCADE delete
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,

  -- Unique constraint: one scene number per project
  UNIQUE(project_id, scene_number)
);

-- Indexes for query performance
CREATE INDEX idx_scenes_project ON scenes(project_id);
CREATE INDEX idx_scenes_number ON scenes(scene_number);
```

### Column Specifications

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | TEXT | NO | PRIMARY KEY | Unique scene identifier (UUID) |
| `project_id` | TEXT | NO | FOREIGN KEY | Reference to projects table |
| `scene_number` | INTEGER | NO | UNIQUE (project_id, scene_number) | 1-indexed scene order (1, 2, 3, ...) |
| `text` | TEXT | NO | | Original script text from LLM |
| `sanitized_text` | TEXT | YES | | Cleaned text for TTS (no markdown, scene labels) |
| `audio_file_path` | TEXT | YES | | **RELATIVE** path to MP3 file |
| `duration` | REAL | YES | | Audio duration in seconds (e.g., 5.23) |
| `created_at` | TEXT | NO | DEFAULT (datetime('now')) | ISO 8601 timestamp |
| `updated_at` | TEXT | NO | DEFAULT (datetime('now')) | ISO 8601 timestamp |

### Critical Specifications

#### Audio File Path Format

**REQUIRED FORMAT: RELATIVE PATHS FROM PROJECT ROOT**

**Correct Examples:**
```
.cache/audio/projects/abc123/scene-1.mp3
.cache/audio/projects/abc123/scene-2.mp3
.cache/audio/previews/sarah.mp3
```

**INCORRECT Examples:**
```
D:\BMAD video generator\.cache\audio\projects\abc123\scene-1.mp3  ❌ Absolute path
/home/user/project/.cache/audio/projects/abc123/scene-1.mp3      ❌ Absolute path
C:\Users\...\scene-1.mp3                                          ❌ Absolute path
```

**Rationale:**
- **Portability:** Works across different development environments
- **Deployment:** Works when deployed to different servers/paths
- **Version Control:** Relative paths don't expose local file structure
- **Collaboration:** Multiple developers can use different root paths

**Path Construction:**
```typescript
// TypeScript path construction
import { join } from 'path';

const relativePath = join('.cache', 'audio', 'projects', projectId, `scene-${sceneNumber}.mp3`);
// Result: ".cache/audio/projects/abc123/scene-1.mp3"

// Store in database (relative)
db.prepare('UPDATE scenes SET audio_file_path = ? WHERE id = ?')
  .run(relativePath, sceneId);

// Runtime resolution (absolute path for file operations)
import { resolve } from 'path';

const absolutePath = resolve(process.cwd(), audio_file_path);
// Result: "D:\BMAD video generator\.cache\audio\projects\abc123\scene-1.mp3"
```

#### Duration Field

**Type:** REAL (SQLite floating point)

**Unit:** Seconds

**Precision:** 2 decimal places recommended (e.g., 5.23 seconds)

**Calculation:** Extracted from audio file metadata by TTS provider

**Example Values:**
```sql
-- Short scene: 3.45 seconds
INSERT INTO scenes (duration) VALUES (3.45);

-- Medium scene: 15.67 seconds
INSERT INTO scenes (duration) VALUES (15.67);

-- Long scene: 45.12 seconds
INSERT INTO scenes (duration) VALUES (45.12);
```

**Usage:**
```typescript
// Calculate total video duration
const totalDuration = db.prepare(`
  SELECT SUM(duration) as total
  FROM scenes
  WHERE project_id = ?
`).get(projectId);

console.log(`Total duration: ${totalDuration.total} seconds`);
```

#### Scene Numbering

**Format:** 1-indexed integers (1, 2, 3, ...)

**NOT 0-indexed:** First scene is scene_number = 1, not 0

**Uniqueness:** UNIQUE constraint on (project_id, scene_number)

**Ordering:** Scenes are ordered by scene_number ASC

**Example:**
```sql
-- Correct
INSERT INTO scenes (project_id, scene_number, text)
VALUES ('proj1', 1, 'Scene one text');
INSERT INTO scenes (project_id, scene_number, text)
VALUES ('proj1', 2, 'Scene two text');

-- Incorrect (0-indexed)
INSERT INTO scenes (project_id, scene_number, text)
VALUES ('proj1', 0, 'Scene one text');  ❌
```

### Foreign Key Behavior

**ON DELETE CASCADE:** When a project is deleted, all its scenes are automatically deleted.

**Rationale:**
- Scene cannot exist without parent project
- Prevents orphaned scene records
- Automatic cleanup of related data

**Example:**
```sql
-- Delete project (cascades to scenes)
DELETE FROM projects WHERE id = 'proj1';
-- All scenes with project_id = 'proj1' are automatically deleted
```

### Indexes

**Purpose:** Optimize query performance for common access patterns

```sql
-- Index on project_id (most common query: get all scenes for a project)
CREATE INDEX idx_scenes_project ON scenes(project_id);

-- Index on scene_number (used for ordering)
CREATE INDEX idx_scenes_number ON scenes(scene_number);
```

**Query Performance:**
```sql
-- Fast query (uses idx_scenes_project)
SELECT * FROM scenes WHERE project_id = 'proj1' ORDER BY scene_number;

-- Fast count (uses idx_scenes_project)
SELECT COUNT(*) FROM scenes WHERE project_id = 'proj1';
```

## Audio File Naming Convention

### Preview Audio

**Location:** `.cache/audio/previews/`

**Format:** `{voiceId}.mp3`

**Examples:**
```
.cache/audio/previews/sarah.mp3
.cache/audio/previews/james.mp3
.cache/audio/previews/emma.mp3
.cache/audio/previews/michael.mp3
.cache/audio/previews/olivia.mp3
```

**Characteristics:**
- Shared across all projects
- Never deleted (permanent cache)
- Generated once per voice
- Size: ~100-300KB each

### Scene Audio

**Location:** `.cache/audio/projects/{projectId}/`

**Format:** `scene-{sceneNumber}.mp3`

**Examples:**
```
.cache/audio/projects/abc123/scene-1.mp3
.cache/audio/projects/abc123/scene-2.mp3
.cache/audio/projects/abc123/scene-3.mp3
.cache/audio/projects/xyz789/scene-1.mp3
.cache/audio/projects/xyz789/scene-2.mp3
```

**Characteristics:**
- Isolated per project
- Deleted after 30 days of project inactivity
- Generated per scene
- Size: ~100KB per scene (varies with text length)

## Audio Format Specifications

**Consistent Across ALL Audio (Preview and Scene):**

| Property | Value | Rationale |
|----------|-------|-----------|
| **Format** | MP3 | Broad compatibility, good compression |
| **Bitrate** | 128kbps | Balance of quality and file size |
| **Sample Rate** | 44.1kHz | Standard audio sample rate |
| **Channels** | Mono (1) | Sufficient for speech, reduces file size |

## Data Flow Examples

### Example 1: Create Project with Voice Selection

```typescript
// 1. Create project
const projectId = 'proj-' + Date.now();
db.prepare(`
  INSERT INTO projects (id, name, topic, voice_id)
  VALUES (?, ?, ?, ?)
`).run(projectId, 'My Video', 'AI Tutorial', 'sarah');

// Project now has voice_id = 'sarah'
```

### Example 2: Generate Script and Create Scenes

```typescript
// 2. LLM generates script (3 scenes)
const script = {
  scenes: [
    { number: 1, text: 'Welcome to this AI tutorial...' },
    { number: 2, text: 'First, let\'s understand the basics...' },
    { number: 3, text: 'In conclusion, AI is transforming...' },
  ]
};

// 3. Insert scenes into database
for (const scene of script.scenes) {
  const sceneId = 'scene-' + Date.now();
  db.prepare(`
    INSERT INTO scenes (id, project_id, scene_number, text)
    VALUES (?, ?, ?, ?)
  `).run(sceneId, projectId, scene.number, scene.text);
}
```

### Example 3: Generate Audio and Update Scene

```typescript
// 4. Generate TTS audio for scene 1
const provider = getTTSProvider();
const sanitizedText = sanitizeForTTS(scene.text);

const audio = await provider.generateAudio(sanitizedText, 'sarah');

// 5. Update scene with audio metadata
db.prepare(`
  UPDATE scenes
  SET
    sanitized_text = ?,
    audio_file_path = ?,
    duration = ?,
    updated_at = datetime('now')
  WHERE id = ?
`).run(
  sanitizedText,
  audio.filePath,  // Relative path: ".cache/audio/projects/proj123/scene-1.mp3"
  audio.duration,   // e.g., 5.23 seconds
  sceneId
);
```

### Example 4: Query Project with All Scenes

```typescript
// 6. Get project with all scenes
const project = db.prepare(`
  SELECT * FROM projects WHERE id = ?
`).get(projectId);

const scenes = db.prepare(`
  SELECT * FROM scenes
  WHERE project_id = ?
  ORDER BY scene_number ASC
`).all(projectId);

console.log({
  project: {
    id: project.id,
    name: project.name,
    topic: project.topic,
    voiceId: project.voice_id,  // 'sarah'
  },
  scenes: scenes.map(s => ({
    number: s.scene_number,
    text: s.text,
    audioPath: s.audio_file_path,
    duration: s.duration,
  })),
  totalDuration: scenes.reduce((sum, s) => sum + (s.duration || 0), 0),
});
```

## Implementation Checklist for Story 2.2

**Database Schema:**
- [ ] Add `voice_id` column to `projects` table
- [ ] Create `scenes` table with all columns
- [ ] Add foreign key constraint (project_id → projects.id, ON DELETE CASCADE)
- [ ] Add unique constraint (project_id, scene_number)
- [ ] Create index on project_id
- [ ] Create index on scene_number

**Query Functions (lib/db/queries.ts):**
- [ ] `updateProjectVoice(projectId, voiceId)` - Set project voice
- [ ] `createScene(projectId, sceneNumber, text)` - Insert scene
- [ ] `getScenesByProject(projectId)` - Get all scenes for project (ordered)
- [ ] `updateSceneAudio(sceneId, audioFilePath, duration, sanitizedText)` - Update after TTS generation
- [ ] `deleteScenesByProject(projectId)` - Delete all scenes (for regeneration)
- [ ] `getSceneById(sceneId)` - Get single scene
- [ ] `getTotalDuration(projectId)` - Sum of all scene durations

**Validation:**
- [ ] Validate `voice_id` against `VOICE_PROFILES` before insert/update
- [ ] Validate `audio_file_path` is relative (starts with `.cache/audio/`)
- [ ] Validate `scene_number` is positive integer
- [ ] Validate `duration` is non-negative REAL

**Migration:**
- [ ] Create migration script for existing projects
- [ ] Test migration on sample database
- [ ] Document rollback procedure

## Testing Requirements

### Unit Tests

```typescript
// Test relative path validation
test('audio_file_path must be relative', () => {
  const relativePath = '.cache/audio/projects/abc/scene-1.mp3';
  const absolutePath = 'D:\\BMAD video generator\\.cache\\audio\\projects\\abc\\scene-1.mp3';

  expect(isRelativePath(relativePath)).toBe(true);
  expect(isRelativePath(absolutePath)).toBe(false);
});

// Test duration precision
test('duration stored as REAL with 2 decimal places', () => {
  db.prepare('INSERT INTO scenes (id, project_id, scene_number, text, duration) VALUES (?, ?, ?, ?, ?)')
    .run('scene1', 'proj1', 1, 'Test', 5.23);

  const scene = db.prepare('SELECT duration FROM scenes WHERE id = ?').get('scene1');
  expect(scene.duration).toBe(5.23);
});
```

### Integration Tests

```typescript
// Test cascade delete
test('deleting project cascades to scenes', () => {
  // Create project and scenes
  db.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run('proj1', 'Test');
  db.prepare('INSERT INTO scenes (id, project_id, scene_number, text) VALUES (?, ?, ?, ?)')
    .run('scene1', 'proj1', 1, 'Test 1');
  db.prepare('INSERT INTO scenes (id, project_id, scene_number, text) VALUES (?, ?, ?, ?)')
    .run('scene2', 'proj1', 2, 'Test 2');

  // Delete project
  db.prepare('DELETE FROM projects WHERE id = ?').run('proj1');

  // Scenes should be deleted
  const scenes = db.prepare('SELECT * FROM scenes WHERE project_id = ?').all('proj1');
  expect(scenes.length).toBe(0);
});
```

## Security Considerations

### Path Validation

**Prevent Directory Traversal Attacks:**

```typescript
function validateAudioPath(filePath: string): boolean {
  const normalized = path.normalize(filePath);

  // Must start with .cache/audio/
  if (!normalized.startsWith('.cache/audio/')) {
    throw new Error('Invalid audio path: outside cache directory');
  }

  // Prevent traversal (../)
  if (normalized.includes('..')) {
    throw new Error('Invalid audio path: directory traversal detected');
  }

  return true;
}
```

**Example Attacks Prevented:**
```typescript
// Attack attempts (all rejected)
validateAudioPath('../../../etc/passwd');  // ❌
validateAudioPath('.cache/audio/../../secrets.txt');  // ❌
validateAudioPath('C:\\Windows\\System32\\config\\sam');  // ❌
```

### SQL Injection Prevention

**Use Parameterized Queries:**

```typescript
// ✅ Correct (parameterized)
db.prepare('SELECT * FROM scenes WHERE project_id = ?').get(projectId);

// ❌ Incorrect (vulnerable to SQL injection)
db.prepare(`SELECT * FROM scenes WHERE project_id = '${projectId}'`).get();
```

## References

- **Story 2.1:** TTS Engine Integration & Voice Profile Setup
- **Story 2.2:** Database Schema Updates for Epic 2 (target story)
- **Architecture:** `docs/architecture.md` (Database design section)
- **Tech Spec:** `docs/tech-spec-epic-2.md` (Scene model definition)
- **Voice Profiles:** `ai-video-generator/src/lib/tts/voice-profiles.ts`
- **Audio Storage:** `ai-video-generator/src/lib/utils/audio-storage.ts` (to be created)

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-06 | DEV Agent | Initial schema documentation for Story 2.2 |

---

**Status:** Ready for Story 2.2 implementation
**Schema Complexity:** Medium (1 column addition, 1 new table)
**Breaking Changes:** None (backward compatible)
