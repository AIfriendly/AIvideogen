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
  current_step TEXT DEFAULT 'topic',
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
