-- AI Video Generator Database Schema
-- Epic 1 Scope: system_prompts, projects (without selected_voice, script_json), messages
-- SQLite database with foreign key constraints

-- System Prompts Table
-- Stores customizable and preset system prompts for AI interactions
CREATE TABLE IF NOT EXISTS system_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_preset BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Index on is_default for quick default prompt lookup
CREATE INDEX IF NOT EXISTS idx_system_prompts_is_default ON system_prompts(is_default);

-- Projects Table (Epic 1 scope only)
-- Core project metadata without Epic 2/3 fields
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  topic TEXT,
  current_step TEXT DEFAULT 'topic' CHECK(current_step IN (
    'topic',
    'voice',
    'script-generation',
    'voiceover',
    'visual-sourcing',
    'visual-curation',
    'editing',
    'export'
  )),
  status TEXT DEFAULT 'draft',
  config_json TEXT,
  system_prompt_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  last_active TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (system_prompt_id) REFERENCES system_prompts(id) ON DELETE SET NULL
);

-- Indexes on projects for performance
CREATE INDEX IF NOT EXISTS idx_projects_last_active ON projects(last_active);
CREATE INDEX IF NOT EXISTS idx_projects_system_prompt ON projects(system_prompt_id);

-- Messages Table
-- Conversation history linked to projects
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes on messages for performance
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- ============================================================================
-- Epic 2: Content Generation Pipeline
-- ============================================================================

-- Scenes Table
-- Stores individual script segments with their associated audio files
CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_number INTEGER NOT NULL,
  text TEXT NOT NULL,              -- Original script text from LLM
  sanitized_text TEXT,             -- Cleaned text for TTS input
  audio_file_path TEXT,            -- Path to generated MP3 file
  duration REAL,                   -- Duration in seconds
  visual_keywords TEXT,            -- JSON array of keywords for CV label matching (Story 3.7b)
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, scene_number)
);

-- Indexes on scenes for performance
CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_number ON scenes(scene_number);

-- ============================================================================
-- Epic 3: Visual Content Sourcing
-- ============================================================================

-- Visual Suggestions Table
-- Stores YouTube video suggestions for each scene with ranking
CREATE TABLE IF NOT EXISTS visual_suggestions (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  channel_title TEXT,
  embed_url TEXT NOT NULL,
  rank INTEGER NOT NULL,
  duration INTEGER,
  default_segment_path TEXT,
  download_status TEXT DEFAULT 'pending' CHECK(download_status IN ('pending', 'queued', 'downloading', 'complete', 'error')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
  UNIQUE(scene_id, video_id)
);

-- Index on scene_id for performance
CREATE INDEX IF NOT EXISTS idx_visual_suggestions_scene ON visual_suggestions(scene_id);
