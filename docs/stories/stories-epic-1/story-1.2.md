# Story 1.2: Database Schema & Infrastructure

Status: Done

## Story

As a developer,
I want a SQLite database schema and client for conversation persistence,
so that project data and conversation history can be stored and retrieved reliably across sessions.

## Acceptance Criteria

- [x] Projects table created with Epic 1 fields only (id, name, topic, current_step, status, config_json, system_prompt_id, created_at, last_active)
- [x] Messages table created with project_id foreign key and role constraint
- [x] System prompts table created with all fields (id, name, prompt, description, category, is_preset, is_default, timestamps)
- [x] Foreign key constraints properly configured with nullable system_prompt_id and ON DELETE SET NULL behavior
- [x] ON DELETE CASCADE configured for messages when parent project is deleted
- [x] Indexes created on messages(project_id), messages(timestamp), projects(last_active), projects(system_prompt_id), and system_prompts(is_default)
- [x] Database client (lib/db/client.ts) initializes successfully
- [x] Database schema file (lib/db/schema.sql) contains all table definitions with CREATE TABLE IF NOT EXISTS
- [x] Query functions (lib/db/queries.ts) handle CRUD operations for projects, messages, and system prompts
- [x] Query functions include getSystemPrompts() and getDefaultSystemPrompt()
- [x] Foreign keys are enabled via pragma setting
- [x] Database file is created at project root as 'ai-video-generator.db'
- [x] Validation specifications for CHECK constraints are documented
- [x] Error handling for FK violations is implemented

## Tasks / Subtasks

### Task 1: Create Database Schema File
- [x] Create `lib/db/schema.sql` file
- [x] Define `system_prompts` table with id, name, prompt, description, category, is_preset, is_default, timestamps
- [x] Define `projects` table with id, name, topic, current_step, status, config_json, system_prompt_id, timestamps (NO selected_voice, NO script_json)
- [x] Define `messages` table with id, project_id, role, content, timestamp
- [x] Use CREATE TABLE IF NOT EXISTS for all tables for idempotency
- [x] Add CHECK constraint on messages.role for ('user', 'assistant', 'system')
- [x] Add CHECK constraint on projects.status with validation rules
- [x] Add FOREIGN KEY constraint from projects.system_prompt_id to system_prompts.id with ON DELETE SET NULL
- [x] Add FOREIGN KEY constraint from messages.project_id to projects.id with ON DELETE CASCADE
- [x] Create index on messages(project_id)
- [x] Create index on messages(timestamp)
- [x] Create index on projects(last_active)
- [x] Create index on projects(system_prompt_id)
- [x] Create index on system_prompts(is_default)

### Task 2: Implement Database Client
- [x] Create `lib/db/client.ts` file
- [x] Import better-sqlite3 Database type
- [x] Define database path as 'ai-video-generator.db' in project root
- [x] Instantiate Database instance
- [x] Enable foreign keys with `db.pragma('foreign_keys = ON')`
- [x] Export db instance for use in queries

### Task 3: Create Database Initialization Script
- [x] Create `lib/db/init.ts` file
- [x] Import database client and schema file contents
- [x] Implement function to read schema.sql file
- [x] Execute schema SQL statements to create tables
- [x] Handle idempotent initialization using IF NOT EXISTS clauses
- [x] Add error handling for schema creation
- [x] Add specific error handling for FK violations
- [x] Export initialization function

### Task 4: Implement Database Query Functions
- [x] Create `lib/db/queries.ts` file
- [x] Import database client
- [x] Define TypeScript interfaces for Project, Message, and SystemPrompt entities
- [x] Implement `createProject(name: string)` function
- [x] Implement `getProject(id: string)` function
- [x] Implement `updateProject(id: string, updates: Partial<Project>)` function
- [x] Implement `deleteProject(id: string)` function
- [x] Implement `getAllProjects()` function ordered by last_active DESC
- [x] Implement `createMessage(projectId: string, role: string, content: string)` function
- [x] Implement `getMessagesByProject(projectId: string)` function ordered by timestamp ASC
- [x] Implement `deleteMessagesByProject(projectId: string)` function
- [x] Implement `getSystemPrompts()` function to retrieve all system prompts
- [x] Implement `getDefaultSystemPrompt()` function to retrieve default system prompt
- [x] Add proper TypeScript return types for all functions
- [x] Add error handling for database operations with specific FK violation handling
- [x] Add validation for CHECK constraint violations with meaningful error messages

### Task 5: Add Database Directory Structure
- [x] Create `lib/db/` directory if it doesn't exist
- [x] Ensure proper file organization (client.ts, schema.sql, queries.ts, init.ts)
- [x] Verify all imports are correctly referenced

## Change Log

### 2025-11-29 - Database Initialization Singleton Fix
- **Issue:** Database initialization ran on almost every API request in Next.js dev mode
- **Root Cause:** Module-level singleton flags (`isInitialized`, `initializationPromise`) reset on hot reload
- **Solution:** Updated `src/lib/db/init.ts` to use `globalThis` for storing initialization state
- **Changes:**
  - Added TypeScript global declarations for `__dbInitialized` and `__dbInitPromise`
  - Replaced direct variable access with accessor functions using `globalThis`
  - Initialization now persists across Next.js module reloads in the same Node.js process
- **Impact:** Eliminates ~40+ redundant "Database initialization completed" log messages per session
- **Files Modified:** `src/lib/db/init.ts`

### 2025-11-02 - Story Completed
- **Status Change:** Ready → Done
- **Completed By:** Amelia (Developer Agent)
- **Git Commit:** 055d98b
- **Implementation:** All 4 database files created (469 lines total)
- **Build Status:** ✅ PASSED (17.0s TypeScript compilation, no errors)
- **Test Status:** ✅ ALL PASSED (all database operations verified)
- **Files Created:**
  - `src/lib/db/schema.sql` (54 lines) - Complete SQL schema with 3 tables, 5 indexes
  - `src/lib/db/client.ts` (21 lines) - Database client with foreign key enforcement
  - `src/lib/db/init.ts` (32 lines) - Idempotent initialization script
  - `src/lib/db/queries.ts` (362 lines) - Full CRUD operations with TypeScript interfaces
- **Files Modified:** `.gitignore` (added database file exclusions)
- **Definition of Done:** All 14 acceptance criteria met, all 44 subtasks completed

### 2025-11-02 - Status Update: Draft → Ready
- **Status Change:** Draft → Ready for Development
- **Reason:** Architect approval after regeneration
- **Architect Verdict:** APPROVED
- **Iterations Required:** 1
- **Notes:** Story has been reviewed and approved by the architect. All acceptance criteria and technical specifications are complete and ready for implementation.

## Dev Notes

### Technical Summary

This story implements the foundational database layer for the AI Video Generator application using SQLite via the better-sqlite3 library (v12.4.1). The database schema supports three primary tables for Epic 1:

1. **system_prompts**: Stores customizable and preset system prompts for AI interactions with description and category fields
2. **projects**: Stores video project metadata including topic, workflow step, status, and extensible config JSON (Epic 1 scope only)
3. **messages**: Stores conversation history linked to projects via foreign key

The implementation includes:
- Schema definition in SQL format with CREATE TABLE IF NOT EXISTS for idempotency
- Database client with foreign key enforcement enabled
- Initialization script for idempotent schema setup
- Query functions providing a clean TypeScript API for CRUD operations including system prompt queries
- Proper indexing on project_id, timestamp, system_prompt_id, and is_default fields for efficient retrieval
- Cascading deletes to maintain referential integrity (messages deleted when project deleted)
- ON DELETE SET NULL behavior for projects.system_prompt_id to handle prompt deletion gracefully
- Validation specifications for CHECK constraints on role and status fields
- Error handling for FK violations with meaningful error messages

**Important Epic 1 Scope Constraints:**
- Projects table does NOT include `selected_voice` (Epic 2)
- Projects table does NOT include `script_json` (Epic 2/3)
- Projects table DOES include `status TEXT DEFAULT 'draft'` for workflow tracking
- Projects table DOES include `config_json TEXT` for extensibility
- System prompts table includes `description TEXT` and `category TEXT` fields
- projects.system_prompt_id is nullable and uses ON DELETE SET NULL

The database file will be created at the project root as `ai-video-generator.db` and will persist across application restarts.

### Project Structure Notes

- **Files to create:**
  - `lib/db/schema.sql` - SQL schema definition with IF NOT EXISTS clauses
  - `lib/db/client.ts` - Database client initialization
  - `lib/db/init.ts` - Schema initialization logic
  - `lib/db/queries.ts` - CRUD operation functions including system prompt queries

- **Dependencies required:**
  - better-sqlite3 v12.4.1 (should already be in package.json)
  - @types/better-sqlite3 (dev dependency)

- **Database file location:**
  - `ai-video-generator.db` (project root, gitignored)

- **Expected test locations:**
  - `lib/db/__tests__/client.test.ts`
  - `lib/db/__tests__/queries.test.ts`
  - `lib/db/__tests__/init.test.ts`

- **Estimated effort:** 5 story points (4-6 hours)

### References

- **Tech Spec:** See tech-spec-epic-1.md lines 100-125 for database schema details
- **Architecture:** See architecture.md lines 1024-1105 for complete database schema and lines 1107-1119 for database client implementation guidance
- **Dependencies:** better-sqlite3 v12.4.1 as specified in architecture.md lines 162-172

### Implementation Guidelines

1. **Foreign Key Constraints:**
   - Must enable foreign keys via pragma before any operations
   - ON DELETE CASCADE ensures messages are deleted when parent project is deleted
   - system_prompt_id is nullable (optional) in projects table
   - ON DELETE SET NULL behavior: when a system prompt is deleted, projects.system_prompt_id is set to NULL
   - Add error handling for FK violations with specific error messages

2. **Timestamp Handling:**
   - Use SQLite's `datetime('now')` function for default timestamps
   - Store timestamps as TEXT in ISO 8601 format
   - Messages should be retrieved in chronological order (ASC by timestamp)
   - Projects should be listed by most recently active (DESC by last_active)

3. **ID Generation:**
   - Use UUIDs (v4) for all primary keys
   - Generate IDs in the query functions, not in the database
   - Import from 'crypto' module: `crypto.randomUUID()`

4. **Error Handling:**
   - Wrap database operations in try-catch blocks
   - Provide meaningful error messages for constraint violations
   - Handle unique constraint failures gracefully
   - Handle FK violations with specific error messages (e.g., "Cannot delete system prompt: it is referenced by existing projects")
   - Log database errors for debugging

5. **Type Safety:**
   - Define TypeScript interfaces matching the database schema
   - Use proper return types for all query functions
   - Handle null/undefined cases for optional fields (system_prompt_id, topic, config_json)
   - Use strict type checking for role field ('user' | 'assistant' | 'system')
   - Use type checking for status field (e.g., 'draft' | 'active' | 'completed')

6. **Validation Specifications:**
   - messages.role CHECK constraint: Must be 'user', 'assistant', or 'system'
   - projects.status CHECK constraint: Define valid status values (e.g., 'draft', 'active', 'completed')
   - Provide clear validation error messages when constraints are violated

7. **Idempotency:**
   - Use CREATE TABLE IF NOT EXISTS for all table creation
   - Use CREATE INDEX IF NOT EXISTS for all index creation
   - Ensure schema can be safely re-run without errors

### Schema Details

**system_prompts table:**
```sql
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

CREATE INDEX IF NOT EXISTS idx_system_prompts_is_default ON system_prompts(is_default);
```

**projects table (Epic 1 scope only):**
```sql
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

CREATE INDEX IF NOT EXISTS idx_projects_last_active ON projects(last_active);
CREATE INDEX IF NOT EXISTS idx_projects_system_prompt ON projects(system_prompt_id);
```

**messages table:**
```sql
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
```

### Query Functions Specifications

**System Prompts:**
- `getSystemPrompts(): SystemPrompt[]` - Retrieve all system prompts
- `getDefaultSystemPrompt(): SystemPrompt | null` - Retrieve the default system prompt (where is_default = true)

**Projects:**
- `createProject(name: string, systemPromptId?: string): Project` - Create new project with optional system prompt
- `getProject(id: string): Project | null` - Retrieve project by id
- `updateProject(id: string, updates: Partial<Project>): void` - Update project fields
- `deleteProject(id: string): void` - Delete project (cascades to messages)
- `getAllProjects(): Project[]` - Get all projects ordered by last_active DESC

**Messages:**
- `createMessage(projectId: string, role: string, content: string): Message` - Create new message
- `getMessagesByProject(projectId: string): Message[]` - Get messages ordered by timestamp ASC
- `deleteMessagesByProject(projectId: string): void` - Delete all messages for a project

## Dev Agent Record

### Context Reference

- **Story Context XML:** `docs/stories/story-context-1.2.xml`
- **Generated:** 2025-11-02
- **Size:** 902 lines, 46 KB
- **Status:** Complete - All implementation context provided

### Agent Model Used

**claude-sonnet-4-5-20250929** (Claude Sonnet 4.5)

### Debug Log References

- **Complete-Story Workflow Execution:** 2025-11-02
- **Build Verification:** Next.js 16.0.1 build passed in 17.0s
- **Database Testing:** All CRUD operations, constraint validations, and foreign key behaviors tested
- **Git Operations:** Commit 055d98b pushed to origin/main successfully

### Completion Notes List

**Story Completion:**
- **Completed:** 2025-11-02
- **Definition of Done:** ✅ All 14 acceptance criteria met, all 44 subtasks completed
- **Final Status:** Done - Ready for integration with subsequent Epic 1 stories
- **Epic Scope Compliance:** ✅ Verified (excludes Epic 2/3 fields)

**Implementation Summary:**
- Created 4 database files (469 lines total):
  - schema.sql: Complete SQL schema with CREATE TABLE IF NOT EXISTS
  - client.ts: Database client with foreign key pragma enabled
  - init.ts: Idempotent initialization using fs.readFileSync
  - queries.ts: Full CRUD API with TypeScript interfaces
- All 3 tables implemented (system_prompts, projects, messages)
- All 5 indexes created for optimal query performance
- Foreign key constraints properly configured:
  - projects.system_prompt_id → system_prompts.id (ON DELETE SET NULL)
  - messages.project_id → projects.id (ON DELETE CASCADE)
- CHECK constraints enforced on messages.role ('user' | 'assistant' | 'system')

**Testing Results:**
- ✅ Database initialization: Tables and indexes created successfully
- ✅ System prompt operations: Create, retrieve, get default
- ✅ Project operations: Create (with/without system_prompt_id), get, update, delete, list
- ✅ Message operations: Create, retrieve by project, delete by project
- ✅ Constraint validation: Foreign key violations caught with meaningful errors
- ✅ CHECK constraints: Invalid role values rejected
- ✅ CASCADE behavior: Delete project → messages deleted automatically
- ✅ SET NULL behavior: Delete system prompt → project.system_prompt_id set to NULL
- ✅ Build verification: TypeScript compilation passed with no errors

**Epic 1 Scope Verification:**
- ✅ Projects table INCLUDES: status, config_json, system_prompt_id (Epic 1 requirements)
- ✅ Projects table EXCLUDES: selected_voice (Epic 2), script_json (Epic 2/3)
- ✅ System prompts table INCLUDES: description, category (complete implementation)

**Architect Review:**
- Initial review: REQUIRES CHANGES (7 issues)
- Regeneration: 1 iteration with all feedback incorporated
- Final review: APPROVED (all issues resolved)

### File List

**Created Files:**
1. `src/lib/db/schema.sql` (54 lines, 2,006 bytes)
   - Complete SQL schema for 3 tables
   - 5 indexes for performance optimization
   - Foreign key constraints with CASCADE and SET NULL behaviors
   - CHECK constraints for data validation
   - IF NOT EXISTS clauses for idempotency

2. `src/lib/db/client.ts` (21 lines, 574 bytes)
   - Database client initialization
   - Foreign key pragma enabled
   - Database path: ai-video-generator.db (project root)
   - Exports db instance for queries

3. `src/lib/db/init.ts` (32 lines, 975 bytes)
   - Idempotent database initialization
   - Reads and executes schema.sql
   - Error handling for schema creation
   - Exports initializeDatabase() function

4. `src/lib/db/queries.ts` (362 lines, 10,973 bytes)
   - TypeScript interfaces: SystemPrompt, Project, Message
   - System Prompts: getSystemPrompts(), getDefaultSystemPrompt()
   - Projects: createProject(), getProject(), updateProject(), deleteProject(), getAllProjects()
   - Messages: createMessage(), getMessagesByProject(), deleteMessagesByProject()
   - Parameterized queries for SQL injection prevention
   - Comprehensive error handling with specific FK violation messages
   - UUID generation using crypto.randomUUID()

**Modified Files:**
1. `.gitignore`
   - Added database file exclusions: *.db, *.db-journal, *.db-shm, *.db-wal

**Total Changes:**
- 4 files created (469 lines)
- 1 file modified
- Git commit: 055d98b
- Push status: ✅ SUCCESS (pushed to origin/main)
