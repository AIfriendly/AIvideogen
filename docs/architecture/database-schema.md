# Database Schema

**SQLite Database:** `ai-video-generator.db`

```sql
-- System prompts table
CREATE TABLE system_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  is_preset BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- User preferences table (Epic 6 Story 6.8a, Feature 1.9 v3.6)
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_voice_id TEXT,
  default_persona_id TEXT,
  default_llm_provider TEXT DEFAULT 'ollama',
  quick_production_enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (default_persona_id) REFERENCES system_prompts(id) ON DELETE SET NULL,
  CHECK(default_llm_provider IN ('ollama', 'gemini', 'groq'))
);

-- Projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  topic TEXT,
  current_step TEXT DEFAULT 'topic',
  selected_voice TEXT,
  script_json TEXT, -- JSON array of scenes
  system_prompt_id TEXT, -- Optional: override default system prompt
  created_at TEXT DEFAULT (datetime('now')),
  last_active TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (system_prompt_id) REFERENCES system_prompts(id)
);

-- Conversation messages
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Scenes (Epic 2 - Script Generation & Voiceover, Epic 4 - Clip Selection)
CREATE TABLE scenes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_number INTEGER NOT NULL,
  text TEXT NOT NULL, -- Narration text for voiceover
  audio_file_path TEXT, -- Generated voiceover MP3 (Epic 2)
  duration INTEGER, -- Audio duration in seconds (Epic 2)
  visual_keywords TEXT, -- JSON array of keywords for CV label matching (Epic 3 Story 3.2, used by 3.7b)
  selected_clip_id TEXT, -- Selected visual suggestion (Epic 4 Story 4.4)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (selected_clip_id) REFERENCES visual_suggestions(id),
  UNIQUE(project_id, scene_number)
);

CREATE INDEX idx_scenes_project ON scenes(project_id);

-- Visual suggestions from AI sourcing (Epic 3)
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
  cv_score REAL, -- Computer vision quality score 0.0-1.0 (Epic 3 Story 3.7/3.7b)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

CREATE INDEX idx_visual_suggestions_scene ON visual_suggestions(scene_id);

-- Clip selections
CREATE TABLE clip_selections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_number INTEGER NOT NULL,
  youtube_video_id TEXT NOT NULL,
  clip_url TEXT NOT NULL,
  downloaded_path TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, scene_number)
);

-- Generated audio files
CREATE TABLE audio_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  duration_seconds REAL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, scene_number)
);

-- Final rendered videos
CREATE TABLE rendered_videos (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration_seconds REAL,
  file_size_bytes INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_messages_project ON messages(project_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_projects_last_active ON projects(last_active);
CREATE INDEX idx_visual_suggestions_scene ON visual_suggestions(scene_id);
```

**Database Client:**
```typescript
// lib/db/client.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'ai-video-generator.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export default db;
```

```typescript
// lib/db/init.ts
// Database initialization with globalThis singleton pattern
// Uses globalThis to persist across Next.js hot reloads in development mode

import { readFileSync } from 'fs';
import path from 'path';
import db from './client';

// Global singleton - survives module reloads in Next.js dev mode
declare global {
  var __dbInitialized: boolean | undefined;
  var __dbInitPromise: Promise<void> | undefined;
}

const isInitialized = (): boolean => globalThis.__dbInitialized === true;
const setInitialized = (value: boolean): void => { globalThis.__dbInitialized = value; };
const getInitPromise = (): Promise<void> | undefined => globalThis.__dbInitPromise;
const setInitPromise = (promise: Promise<void> | undefined): void => { globalThis.__dbInitPromise = promise; };

export async function initializeDatabase(): Promise<void> {
  // Return immediately if already initialized (persists across module reloads)
  if (isInitialized()) {
    return;
  }

  // If initialization is in progress, wait for it to complete
  const existingPromise = getInitPromise();
  if (existingPromise) {
    return existingPromise;
  }

  // Start initialization
  const initPromise = (async () => {
    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    // Run migrations...
    await runMigrations();

    setInitialized(true);
  })();

  setInitPromise(initPromise);
  return initPromise;
}
```

**Why globalThis?** In Next.js development mode, modules are hot-reloaded frequently. Module-level variables like `let isInitialized = false` reset on each reload, causing database initialization to run on every API request. Using `globalThis` ensures the initialization state persists within the same Node.js process, so initialization runs only once per server start.

**Database Query Functions (Story 1.6 - Project Management):**
```typescript
// lib/db/queries.ts
import db from './client';
import { randomUUID } from 'crypto';

interface Project {
  id: string;
  name: string;
  topic: string | null;
  current_step: string;
  created_at: string;
  last_active: string;
}

// Get all projects ordered by last_active (most recent first)
export function getAllProjects(): Project[] {
  return db.prepare(`
    SELECT id, name, topic, current_step, created_at, last_active
    FROM projects
    ORDER BY last_active DESC
  `).all() as Project[];
}

// Get single project by ID
export function getProjectById(id: string): Project | null {
  return db.prepare(`
    SELECT id, name, topic, current_step, created_at, last_active
    FROM projects
    WHERE id = ?
  `).get(id) as Project | null;
}

// Create new project
export function createProject(name: string = 'New Project'): Project {
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO projects (id, name, current_step, created_at, last_active)
    VALUES (?, ?, 'topic', ?, ?)
  `).run(id, name, now, now);

  return getProjectById(id)!;
}

// Update project last_active timestamp
export function updateProjectLastActive(id: string): void {
  db.prepare(`
    UPDATE projects
    SET last_active = datetime('now')
    WHERE id = ?
  `).run(id);
}

// Update project name (auto-generated from first message)
export function updateProjectName(id: string, name: string): void {
  db.prepare(`
    UPDATE projects
    SET name = ?
    WHERE id = ?
  `).run(name, id);
}

// Update project metadata
export function updateProject(id: string, updates: {
  name?: string;
  topic?: string;
  current_step?: string;
}): void {
  const fields = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');

  const values = Object.values(updates);

  db.prepare(`
    UPDATE projects
    SET ${fields}, last_active = datetime('now')
    WHERE id = ?
  `).run(...values, id);
}

// Delete project (optional for MVP, cascades to messages)
export function deleteProject(id: string): void {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}

// Get all messages for a project
export function getProjectMessages(projectId: string): Message[] {
  return db.prepare(`
    SELECT id, role, content, timestamp
    FROM messages
    WHERE project_id = ?
    ORDER BY timestamp ASC
  `).all(projectId) as Message[];
}
```

### Database Migration Strategy

**Purpose:** Manage schema changes across development iterations without data loss

**Migration System:**
```typescript
// lib/db/migrations.ts
import db from './client';

interface Migration {
  version: number;
  name: string;
  up: (db: Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db) => {
      // Create base tables: projects, messages, system_prompts
      db.exec(`
        CREATE TABLE IF NOT EXISTS system_prompts (...);
        CREATE TABLE IF NOT EXISTS projects (...);
        CREATE TABLE IF NOT EXISTS messages (...);
        CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id);
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
        CREATE INDEX IF NOT EXISTS idx_projects_last_active ON projects(last_active);
      `);
    }
  },
  {
    version: 2,
    name: 'add_scenes_table',
    up: (db) => {
      // Epic 2: Scenes for script and voiceover
      db.exec(`
        CREATE TABLE IF NOT EXISTS scenes (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          scene_number INTEGER NOT NULL,
          text TEXT NOT NULL,
          audio_file_path TEXT,
          duration INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          UNIQUE(project_id, scene_number)
        );
        CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id);
      `);
    }
  },
  {
    version: 3,
    name: 'add_visual_suggestions',
    up: (db) => {
      // Epic 3: Visual suggestions from YouTube API
      db.exec(`
        CREATE TABLE IF NOT EXISTS visual_suggestions (
          id TEXT PRIMARY KEY,
          scene_id TEXT NOT NULL,
          video_id TEXT NOT NULL,
          title TEXT NOT NULL,
          thumbnail_url TEXT,
          channel_title TEXT,
          embed_url TEXT NOT NULL,
          rank INTEGER NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_visual_suggestions_scene ON visual_suggestions(scene_id);
      `);
    }
  },
  {
    version: 4,
    name: 'add_segment_downloads',
    up: (db) => {
      // Epic 3 Story 3.4 & 3.6: Duration filtering and default segment downloads
      db.exec(`
        ALTER TABLE visual_suggestions ADD COLUMN duration INTEGER;
        ALTER TABLE visual_suggestions ADD COLUMN default_segment_path TEXT;
        ALTER TABLE visual_suggestions ADD COLUMN download_status TEXT DEFAULT 'pending';
      `);
    }
  },
  {
    version: 5,
    name: 'add_clip_selections',
    up: (db) => {
      // Epic 4: User clip selections
      db.exec(`
        CREATE TABLE IF NOT EXISTS clip_selections (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          scene_number INTEGER NOT NULL,
          youtube_video_id TEXT NOT NULL,
          clip_url TEXT NOT NULL,
          downloaded_path TEXT,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          UNIQUE(project_id, scene_number)
        );
      `);
    }
  },
  {
    version: 6,
    name: 'add_audio_and_rendered_videos',
    up: (db) => {
      // Epic 2 & 5: Audio files and final rendered videos
      db.exec(`
        CREATE TABLE IF NOT EXISTS audio_files (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          scene_number INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          voice_id TEXT NOT NULL,
          duration_seconds REAL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          UNIQUE(project_id, scene_number)
        );

        CREATE TABLE IF NOT EXISTS rendered_videos (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          file_path TEXT NOT NULL,
          thumbnail_path TEXT,
          duration_seconds REAL,
          file_size_bytes INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
      `);
    }
  },
  {
    version: 7,
    name: 'add_selected_clip_to_scenes',
    up: (db) => {
      // Epic 4 Story 4.4: Clip selection persistence
      db.exec(`
        ALTER TABLE scenes ADD COLUMN selected_clip_id TEXT
          REFERENCES visual_suggestions(id);
      `);
    }
  }
];

// Schema version tracking table
function initializeVersionTracking(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// Get current schema version
function getCurrentVersion(db: Database): number {
  const result = db.prepare(
    'SELECT COALESCE(MAX(version), 0) as version FROM schema_version'
  ).get() as { version: number };
  return result.version;
}

// Update schema version
function updateVersion(db: Database, version: number, name: string): void {
  db.prepare(
    'INSERT INTO schema_version (version, name) VALUES (?, ?)'
  ).run(version, name);
}

// Run all pending migrations
export function runMigrations(): void {
  initializeVersionTracking(db);
  const currentVersion = getCurrentVersion(db);

  console.log(`Current database version: ${currentVersion}`);

  const pendingMigrations = migrations.filter(m => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    console.log('Database is up to date');
    return;
  }

  console.log(`Running ${pendingMigrations.length} migration(s)...`);

  // Run migrations in a transaction
  db.transaction(() => {
    for (const migration of pendingMigrations) {
      console.log(`  Applying migration ${migration.version}: ${migration.name}`);
      migration.up(db);
      updateVersion(db, migration.version, migration.name);
    }
  })();

  console.log('All migrations completed successfully');
}
```

**Usage in Application Startup:**
```typescript
// app/layout.tsx or server initialization
import { runMigrations } from '@/lib/db/migrations';

// Run migrations on startup (server-side only)
if (typeof window === 'undefined') {
  runMigrations();
}
```

**Migration Best Practices:**
- ✅ **Never modify existing migrations** - Always create new ones
- ✅ **Use IF NOT EXISTS** for CREATE TABLE statements (idempotent)
- ✅ **Test migrations** with both empty and populated databases
- ✅ **Include rollback plan** for production (manual SQL if needed)
- ✅ **Version migrations sequentially** - No gaps in version numbers

**Adding New Migration:**
```typescript
// When adding Epic 4 custom segment selection:
{
  version: 7,
  name: 'add_custom_segment_tracking',
  up: (db) => {
    db.exec(`
      ALTER TABLE clip_selections ADD COLUMN segment_start_timestamp INTEGER;
      ALTER TABLE clip_selections ADD COLUMN is_custom_segment BOOLEAN DEFAULT false;
    `);
  }
}
```

**Migration Status Check:**
```typescript
// lib/db/queries.ts
export function getDatabaseVersion(): { version: number; name: string } {
  return db.prepare(`
    SELECT version, name FROM schema_version
    ORDER BY version DESC LIMIT 1
  `).get() as { version: number; name: string };
}
```

**Benefits:**
- ✅ Automated schema updates during development
- ✅ No manual SQL execution required
- ✅ Safe for team collaboration (consistent schema state)
- ✅ Version history tracking
- ✅ Idempotent (safe to run multiple times)

---
