# Technical Specification: Epic 1 - Conversational Topic Discovery

Date: 2025-11-02
Author: lichking
Epic ID: 1
Status: Draft

---

## Overview

Epic 1 implements the foundational conversational AI agent that enables users to brainstorm and finalize video topics through natural language dialogue. This epic establishes the core interaction pattern for the AI Video Generator by providing an unrestricted, creative brainstorming assistant powered by local Ollama (Llama 3.2) that guides users from initial ideas to confirmed video topics ready for production.

The implementation includes a chat-based UI, persistent conversation history, topic confirmation workflow, and a configurable system prompt architecture (MVP: hardcoded default persona) that defines the assistant's behavior. **Story 1.6 adds multi-project management capabilities with a sidebar navigation system (280px fixed width), enabling users to create, organize, and switch between multiple video projects while maintaining conversation isolation and context.** This epic serves as the entry point for all subsequent video creation workflows.

## Objectives and Scope

**In Scope:**
- Chat interface with message history display
- Natural language conversation processing via Llama 3.2 (local Ollama)
- Multi-turn conversation with context retention
- Topic confirmation workflow with explicit user approval
- Persistent storage of conversation history in SQLite
- Project creation upon topic confirmation
- Default "Creative Assistant" system prompt (hardcoded in MVP)
- Basic error handling for LLM connection failures
- **Project Management (Story 1.6):**
  - Sidebar with project list (280px fixed width, ordered by last_active)
  - "New Chat" button to create new projects
  - Project switching with conversation history isolation
  - Auto-generated project names from first user message
  - Active project persistence via localStorage
  - Optional: Project deletion with confirmation dialog

**Out of Scope (Post-MVP):**
- UI configuration for system prompts/personas
- Custom persona creation
- Per-project persona overrides
- Message editing or deletion
- Conversation branching or forks
- Export conversation to external formats
- Multi-user conversations or sharing

## System Architecture Alignment

**Components Referenced:**
- Frontend (Conversation): `components/features/conversation/ChatInterface.tsx`, `MessageList.tsx`, `TopicConfirmation.tsx`
- Frontend (Project Management): `components/features/projects/ProjectSidebar.tsx`, `ProjectListItem.tsx`, `NewChatButton.tsx`
- API Layer: `app/api/chat/route.ts`, `app/api/projects/route.ts`, `app/api/projects/[id]/route.ts`
- LLM Abstraction: `lib/llm/provider.ts`, `lib/llm/ollama-provider.ts`, `lib/llm/factory.ts`
- System Prompts: `lib/llm/prompts/default-system-prompt.ts`
- State Management: `stores/conversation-store.ts`, `stores/project-store.ts` (Zustand)
- Database: SQLite `messages` and `projects` tables via better-sqlite3

**Architecture Constraints:**
- Local-first: All data stored locally in SQLite (privacy guarantee)
- LLM Provider: Ollama running on localhost:11434 with llama3.2 model
- FOSS Compliance: All components use open-source technologies (Next.js, Zustand, SQLite, Ollama)
- Single-user deployment: No authentication or multi-tenancy in MVP

**Alignment Notes:**
- Follows Next.js 15.5 App Router pattern with server components and API routes
- Uses TypeScript strict mode for type safety
- Implements Strategy Pattern for LLM provider abstraction (enables future cloud migration)
- Follows hybrid state management approach (Zustand for UI state, SQLite for persistence)

---

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|----------------|---------------|--------|---------|-------|
| **ChatInterface.tsx** | Main conversation UI component | User text input | Rendered chat messages, input field | Frontend |
| **MessageList.tsx** | Display conversation history | Array of message objects | Scrollable message list with role indicators | Frontend |
| **TopicConfirmation.tsx** | Topic approval dialog with Confirm/Edit buttons | Extracted topic string | User confirmation (Confirm → navigate to Epic 2) or Edit (close dialog, continue chat) | Frontend |
| **ProjectSidebar.tsx** | Project list navigation (280px fixed width) | Projects array | Sidebar with project list, New Chat button | Frontend |
| **ProjectListItem.tsx** | Individual project display in sidebar | Project object | Clickable project item with name, timestamp | Frontend |
| **NewChatButton.tsx** | Create new project action button | None (click event) | Creates new project, switches to it | Frontend |
| **app/api/chat/route.ts** | LLM conversation endpoint | `{ projectId, message }` | `{ messageId, response, timestamp }` | Backend API |
| **app/api/projects/route.ts** | Project CRUD operations (list, create) | GET: none, POST: `{ name? }` | Project list or created project | Backend API |
| **app/api/projects/[id]/route.ts** | Single project operations (get, update, delete) | GET/PUT/DELETE with projectId | Project details or success confirmation | Backend API |
| **OllamaProvider** | Ollama LLM integration | Messages array, system prompt | AI response string | Backend Service |
| **getLLMProvider()** | Provider factory function | None (reads env vars) | LLMProvider instance | Backend Service |
| **conversation-store.ts** | Client-side conversation state | User/assistant messages | Messages array, loading state | State Management |
| **project-store.ts** | Active project & project list state | Projects array, active project ID | Active project, project list, localStorage persistence | State Management |
| **db/queries.ts** | Database operations | Project ID, message data, project metadata | Saved records, query results | Database Layer |

### Data Models and Contracts

**Message Interface:**
```typescript
interface Message {
  id: string;           // UUID
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;    // ISO 8601
}
```

**Project Model:**
```typescript
interface Project {
  id: string;           // UUID
  name: string;         // Initially "New Project", updated with topic
  topic: string | null; // Confirmed topic (null until confirmation)
  current_step: string; // Workflow step: 'topic' | 'voice' | 'script' | etc.
  created_at: string;
  last_active: string;
}
```

**Database Schema (Epic 1 Relevant Tables):**
```sql
-- Projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  topic TEXT,
  current_step TEXT DEFAULT 'topic',
  created_at TEXT DEFAULT (datetime('now')),
  last_active TEXT DEFAULT (datetime('now'))
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

-- Indexes for performance
CREATE INDEX idx_messages_project ON messages(project_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
```

### APIs and Interfaces

**LLMProvider Interface:**
```typescript
// lib/llm/provider.ts
export interface LLMProvider {
  chat(messages: Message[], systemPrompt?: string): Promise<string>;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

**API Endpoint: POST /api/chat**

**Request:**
```json
{
  "projectId": "uuid-string",
  "message": "I want to make a video about space exploration"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "messageId": "msg-uuid",
    "response": "Great! Should we focus on the Apollo missions, the future of Mars colonization, or recent discoveries by the James Webb telescope?",
    "timestamp": "2025-11-02T12:00:00.000Z"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "message": "Unable to connect to Ollama. Please ensure it is running.",
    "code": "OLLAMA_CONNECTION_ERROR"
  }
}
```

**Error Codes:**
- `OLLAMA_CONNECTION_ERROR`: Ollama server not reachable
- `INVALID_PROJECT_ID`: Project not found in database
- `EMPTY_MESSAGE`: User message is empty or whitespace-only
- `DATABASE_ERROR`: SQLite operation failed

**API Endpoint: GET /api/projects**

Get all projects ordered by last_active (most recent first).

**Request:** None (GET request)

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "uuid-string",
        "name": "Mars colonization ideas",
        "topic": "Mars colonization" | null,
        "currentStep": "topic",
        "lastActive": "2025-11-04T14:30:00.000Z",
        "createdAt": "2025-11-04T12:00:00.000Z"
      }
    ]
  }
}
```

**API Endpoint: POST /api/projects**

Create a new project.

**Request:**
```json
{
  "name": "New Project"  // Optional, defaults to "New Project"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "uuid-string",
      "name": "New Project",
      "currentStep": "topic",
      "createdAt": "2025-11-04T14:35:00.000Z",
      "lastActive": "2025-11-04T14:35:00.000Z"
    }
  }
}
```

**API Endpoint: GET /api/projects/[id]**

Get a single project by ID.

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "uuid-string",
      "name": "Mars colonization ideas",
      "topic": "Mars colonization",
      "currentStep": "voice",
      "createdAt": "2025-11-04T12:00:00.000Z",
      "lastActive": "2025-11-04T14:30:00.000Z"
    }
  }
}
```

**API Endpoint: PUT /api/projects/[id]**

Update project metadata.

**Request:**
```json
{
  "name": "Mars colonization ideas",  // Optional
  "topic": "Mars colonization",       // Optional
  "currentStep": "voice"               // Optional
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "uuid-string",
      "name": "Mars colonization ideas",
      "topic": "Mars colonization",
      "currentStep": "voice",
      "lastActive": "2025-11-04T14:40:00.000Z"
    }
  }
}
```

### Workflows and Sequencing

**Conversation Flow (Main Path):**

1. **User Opens Chat Interface**
   - Frontend: Load existing project or create new project
   - Database: `INSERT INTO projects (id, name, current_step) VALUES (?, 'New Project', 'topic')`
   - Frontend: Fetch conversation history if existing project
   - Database: `SELECT * FROM messages WHERE project_id = ? ORDER BY timestamp ASC`
   - UI: Display MessageList with history + empty input field

2. **User Sends Message**
   - Frontend: User types message, clicks send
   - Validation: Check message is not empty
   - UI: Disable input, show loading indicator
   - Frontend: POST to `/api/chat` with `{ projectId, message }`

3. **Backend Processes Request**
   - API Route: Validate projectId exists
   - Database: Fetch conversation history (last 20 messages for context)
   - LLM Provider: Prepend DEFAULT_SYSTEM_PROMPT to messages
   - Ollama: Send chat request to llama3.2 model at localhost:11434
   - Ollama: Return assistant response
   - Database: Save user message `INSERT INTO messages ...`
   - Database: Save assistant response `INSERT INTO messages ...`
   - API Route: Return `{ messageId, response, timestamp }`

4. **Frontend Updates UI**
   - Store: Add user message to conversation-store
   - Store: Add assistant response to conversation-store
   - UI: Scroll to latest message
   - UI: Re-enable input field
   - Database: Update `last_active` timestamp for project

5. **Topic Detection & Confirmation**
   - LLM: Detects user intent to create video (e.g., "make a video about X")
   - LLM: Responds with confirmation request
   - Frontend: Detects confirmation pattern in response
   - UI: Display TopicConfirmation dialog with extracted topic
   - User: Clicks "Confirm" or "Edit"

6. **Project Initialization (on confirmation)**
   - Database: `UPDATE projects SET topic = ?, name = ? WHERE id = ?`
   - Database: `UPDATE projects SET current_step = 'voice' WHERE id = ?`
   - Frontend: Navigate to voice selection step (Epic 2)

6a. **Edit Path (if user clicks Edit)**
   - UI: Close TopicConfirmation dialog (no animation/confirmation needed)
   - Database: No changes to project (topic remains null, name unchanged, current_step remains 'topic')
   - UI: Return focus to chat input field
   - User: Can continue conversation to refine or clarify the topic
   - Frontend: New topic confirmation can be triggered by issuing another video creation command
   - Store: conversation-store remains intact with full conversation history

**Error Handling Flow:**
- Ollama Connection Failure → Display user-friendly error + retry button
- Database Error → Log error, display generic error message
- Empty Message → Client-side validation, prevent API call
- Invalid Project → Create new project, start fresh conversation

**Project Management Flow (Story 1.6):**

1. **Creating New Project**
   - User: Clicks "New Chat" button in sidebar
   - Frontend: POST to `/api/projects` with default name "New Project"
   - Database: `INSERT INTO projects (id, name, current_step, created_at, last_active) VALUES (uuid, 'New Project', 'topic', NOW(), NOW())`
   - State: project-store sets new project as active, adds to project list
   - Frontend: Clear conversation-store messages
   - UI: Sidebar shows new project at top, highlighted as active
   - UI: Chat interface clears, ready for first message
   - localStorage: Active project ID persisted

2. **Switching Projects**
   - User: Clicks project in sidebar
   - State: project-store setActiveProject(newProjectId)
   - Frontend: Cancel any in-flight requests (AbortController)
   - Frontend: Save current scroll position to sessionStorage
   - Frontend: GET from `/api/projects/{newProjectId}/messages` to load conversation history
   - State: conversation-store clears old messages, loads new project's messages
   - Database: `UPDATE projects SET last_active = NOW() WHERE id = ?` (via PUT endpoint)
   - UI: Sidebar highlights newly selected project
   - URL: Update to `/projects/{newProjectId}` (pushState for browser back button)
   - UI: Restore scroll position if previously saved

3. **Auto-Generate Project Name (on first message)**
   - User: Sends first message in new project (e.g., "Help me brainstorm fitness content")
   - Frontend: POST to `/api/chat` as usual
   - Backend: After saving message, check if project name is still "New Project"
   - Backend: If yes, generate name from first 30 chars of user message, trim to last complete word
   - Backend: `UPDATE projects SET name = ? WHERE id = ?` (e.g., "Help me brainstorm fitness...")
   - Database: PUT to `/api/projects/{id}` with `{ name: generatedName }`
   - State: project-store updates project name in local list
   - UI: Sidebar updates project name immediately

4. **Loading Projects on App Start**
   - User: Opens application at `/`
   - Frontend: GET from `/api/projects` to fetch all projects
   - Database: `SELECT * FROM projects ORDER BY last_active DESC`
   - State: project-store loads projects array
   - localStorage: Check for saved activeProjectId
   - Frontend: If activeProjectId exists, load that project's conversation
   - Frontend: If no activeProjectId, load most recent project (first in list)
   - URL: Navigate to `/projects/{activeProjectId}`

5. **Project Deletion (Optional MVP)**
   - User: Hovers over project → three-dot menu appears
   - User: Clicks "Delete project"
   - UI: Confirmation dialog appears ("Delete 'Mars colonization ideas'? This cannot be undone.")
   - User: Confirms deletion
   - Frontend: DELETE to `/api/projects/{id}`
   - Database: `DELETE FROM projects WHERE id = ?` (cascades to messages via foreign key)
   - State: project-store removes project from list
   - Frontend: If deleted project was active, switch to most recent remaining project
   - UI: Sidebar updates, deleted project disappears

---

## Non-Functional Requirements

### Performance

**Target Metrics:**
- **LLM Response Time**: < 3 seconds for typical conversational response (local Llama 3.2 3B model)
- **Message Display Latency**: < 100ms to render new message in UI
- **Conversation History Load**: < 500ms to load and display 50 messages
- **Database Query Time**: < 50ms for message insertion/retrieval

**Optimization Strategies:**
- Limit conversation history sent to LLM (last 20 messages for context window management)
- Use prepared statements for database queries
- Implement message virtualization if history exceeds 100 messages
- Stream LLM responses for perceived faster interaction (post-MVP)

**Source References:**
- Architecture: "Database Performance" section (lines 1620-1626)
- Architecture: "LLM Provider" using 128K context window (line 1874)

### Security

**Authentication/Authorization:**
- MVP: None (local single-user deployment)
- Future: NextAuth.js for multi-tenant cloud deployment

**Data Privacy:**
- All conversation data stored locally in SQLite (never sent to cloud)
- No telemetry or analytics tracking
- Ollama runs locally (no data sent to external LLM APIs)
- System prompts stored locally in code/database

**Input Validation:**
- Validate message content is not empty or only whitespace
- Sanitize user input before database insertion (parameterized queries prevent SQL injection)
- Validate projectId is valid UUID format
- Limit message length to 5000 characters

**SQL Injection Prevention:**
```typescript
// Always use parameterized queries
db.prepare('SELECT * FROM messages WHERE project_id = ?').all(projectId);
// Never string concatenation
// BAD: db.exec(`SELECT * FROM messages WHERE project_id = '${projectId}'`);
```

**Source References:**
- Architecture: "Security & Privacy" section (lines 1531-1598)
- Architecture: "SQL Injection Prevention" (lines 1591-1598)

### Reliability/Availability

**Availability Target:**
- Local application: 99.9% uptime (dependent on user's machine)
- Ollama dependency: Must handle graceful degradation if Ollama is not running

**Error Recovery:**
- Ollama connection failure → Display error message + instructions to start Ollama + retry button
- Database corruption → Backup mechanism (future), error logging
- Conversation state loss → Messages persist in SQLite, recoverable on page refresh

**Graceful Degradation:**
- If Ollama is down, display last successful conversation history (read-only mode)
- Provide clear instructions for starting Ollama service

**Data Durability:**
- SQLite database persists across application restarts
- No message loss on browser refresh (stored server-side)
- Conversation history retained indefinitely (no automatic deletion)

### Observability

**Logging Requirements:**
- **Info Level**: Conversation started, message sent, topic confirmed
- **Error Level**: Ollama connection failures, database errors, API errors
- **Debug Level**: LLM request/response payloads, SQL queries (dev only)

**Metrics to Track:**
- Number of messages per conversation
- Average LLM response time
- Ollama connection success/failure rate
- Topic confirmation rate (% of conversations that reach confirmation)

**Tracing:**
- Log request IDs for API calls to correlate frontend actions with backend logs
- Include projectId in all log entries for conversation tracking

**Log Format:**
```
[2025-11-02T12:00:00.000Z] [INFO] [chat-api] Conversation message processed { projectId: "abc-123", messageId: "msg-456", responseTime: 2.3s }
[2025-11-02T12:01:00.000Z] [ERROR] [ollama-provider] Failed to connect to Ollama { error: "ECONNREFUSED", baseUrl: "http://localhost:11434" }
```

---

## Dependencies and Integrations

**Frontend Dependencies (package.json):**
- `next@15.5` - React framework with App Router
- `react@19` - UI library
- `zustand@5.0.8` - Client state management
- `typescript@5.x` - Type safety

**Backend Dependencies (package.json):**
- `ollama@0.6.2` - Official Ollama SDK for Node.js
- `better-sqlite3@12.4.1` - SQLite database driver

**Python Dependencies (requirements.txt):**
- None for Epic 1 (yt-dlp and kokoro-tts required for later epics)

**External Services:**
- **Ollama Server**: http://localhost:11434
  - Model: llama3.2 (3B instruct)
  - Version: Latest compatible with ollama npm 0.6.2
  - Required: Must be installed and running before using application

**System Dependencies:**
- Node.js 18+
- SQLite 3.x (bundled with better-sqlite3)

**Integration Points:**
- LLM Provider abstraction enables future integration with:
  - OpenAI GPT-4 (post-MVP cloud deployment)
  - Anthropic Claude (post-MVP)
  - Hugging Face Inference API (post-MVP)

**Environment Variables (.env.local):**
```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
LLM_PROVIDER=ollama
DATABASE_PATH=./ai-video-generator.db
```

---

## Acceptance Criteria (Authoritative)

**AC1: Successful Brainstorming Interaction**
- **Given** a user initiates a conversation with a new project
- **When** the user sends the message "I want to make a video about space exploration"
- **Then** the agent must respond with clarifying questions or suggestions (e.g., "Great! Should we focus on the Apollo missions, the future of Mars colonization, or recent discoveries by the James Webb telescope?")
- **And** the conversation history must persist in the database

**AC2: Successful Command Trigger**
- **Given** the user has discussed a topic through conversation
- **When** the user issues the command "Okay, make a video about Mars colonization"
- **Then** the agent must provide a confirmation message ("Confirming: I will start creating a video about Mars colonization. Is that correct?")
- **And** a TopicConfirmation dialog must appear in the UI

**AC3: Context-Aware Command**
- **Given** the user has been discussing "the benefits of intermittent fasting" for multiple turns
- **When** the user issues a generic command like "Create the video now"
- **Then** the agent should use conversation context to confirm the topic ("Understood. Shall I proceed with the video on 'the benefits of intermittent fasting'?")

**AC4: Topic Confirmation Workflow**
- **Given** the TopicConfirmation dialog is displayed with topic "Mars colonization"
- **When** the user clicks "Confirm"
- **Then** the project's topic field must be updated in the database
- **And** the project's name must be updated from "New Project" to the topic
- **And** the current_step must advance to 'voice'
- **And** the user must be navigated to the voice selection interface (Epic 2)

**AC5: Conversation Persistence**
- **Given** a user has had a 5-message conversation
- **When** the user closes and reopens the application
- **Then** all 5 messages must be displayed in the MessageList
- **And** the conversation must be resumable from where it left off

**AC6: Ollama Error Handling**
- **Given** Ollama is not running on localhost:11434
- **When** the user attempts to send a message
- **Then** the UI must display an error message "Unable to connect to Ollama. Please ensure it is running at http://localhost:11434"
- **And** a "Retry" button must be provided
- **And** the conversation history must remain intact (read-only mode)

**AC7: Create New Project (Story 1.6)**
- **Given** the user has the application open
- **When** the user clicks the "New Chat" button in the sidebar
- **Then** a new project must be created in the database with name "New Project" and current_step "topic"
- **And** the new project must become the active project (highlighted in sidebar)
- **And** the chat interface must clear, ready for a new conversation
- **And** the new project must appear at the top of the project list

**AC8: Project List Display (Story 1.6)**
- **Given** the user has 3 projects: "Cooking recipes" (last active yesterday), "Gaming tutorials" (last active today at 2pm), and "Travel vlogs" (last active last week)
- **When** the user views the sidebar
- **Then** the project list must display all 3 projects ordered by last_active: "Gaming tutorials" first, then "Cooking recipes", then "Travel vlogs"
- **And** each project must show its name and relative timestamp (e.g., "Today, 2:00 PM", "Yesterday", "Nov 28")
- **And** the currently active project must be visually highlighted with an indigo left border

**AC9: Switch Between Projects (Story 1.6)**
- **Given** the user has 2 projects: "Cooking recipes" (active) and "Gaming tutorials"
- **When** the user clicks on "Gaming tutorials" in the sidebar
- **Then** the chat interface must load the complete conversation history for "Gaming tutorials"
- **And** the "Gaming tutorials" project must become highlighted as active
- **And** the "Cooking recipes" conversation must be cleared from view
- **And** the URL must update to `/projects/{gamingTutorialsId}`
- **And** the "Gaming tutorials" project's last_active timestamp must be updated in the database

**AC10: Auto-Generate Project Name (Story 1.6)**
- **Given** a user has created a new project (name: "New Project")
- **When** the user sends their first message: "Help me brainstorm fitness content for beginners"
- **Then** the project name must be auto-updated to "Help me brainstorm fitness..." (first 30 chars, truncated to last complete word)
- **And** the sidebar must immediately reflect the updated project name
- **And** the project name must persist in the database

**AC11: Project Persistence Across Sessions (Story 1.6)**
- **Given** a user has 3 projects and "Gaming tutorials" is currently active
- **When** the user closes the browser and reopens the application
- **Then** the application must load the "Gaming tutorials" project as active (from localStorage)
- **And** the sidebar must display all 3 projects in last_active order
- **And** the chat interface must show the "Gaming tutorials" conversation history

**AC12: Project Deletion (Optional - Story 1.6)**
- **Given** a user has a project named "Test project" that they want to delete
- **When** the user hovers over "Test project" and clicks the delete option from the three-dot menu
- **Then** a confirmation dialog must appear: "Delete 'Test project'? This cannot be undone."
- **When** the user confirms deletion
- **Then** the project must be deleted from the database (including all associated messages via CASCADE)
- **And** the project must disappear from the sidebar
- **And** if "Test project" was the active project, the application must switch to the most recent remaining project

**AC13: Topic Edit Workflow (Story 1.7)**
- **Given** the TopicConfirmation dialog is displayed with topic "Mars colonization"
- **When** the user clicks "Edit"
- **Then** the dialog must close immediately without any database updates
- **And** the project's topic field must remain null (not updated)
- **And** the project's current_step must remain 'topic' (not advanced)
- **And** the chat input field must receive focus
- **And** the conversation history must remain intact and visible
- **And** the user can continue the conversation to refine the topic
- **And** when the user issues a new video creation command, a new TopicConfirmation dialog appears with the refined topic

---

## Traceability Mapping

| Acceptance Criteria | PRD Reference | Architecture Component(s) | Test Strategy |
|---------------------|---------------|---------------------------|---------------|
| AC1: Brainstorming Interaction | PRD Feature 1.1, AC1 (lines 45-48) | ChatInterface.tsx, OllamaProvider, DEFAULT_SYSTEM_PROMPT | Integration test: Mock Ollama, verify multi-turn context |
| AC2: Command Trigger | PRD Feature 1.1, AC2 (lines 49-52) | TopicConfirmation.tsx, app/api/chat/route.ts | E2E test: Full conversation flow to confirmation |
| AC3: Context-Aware Command | PRD Feature 1.1, AC3 (lines 53-56) | conversation-store.ts, messages table | Integration test: Load history, verify context in LLM request |
| AC4: Topic Confirmation | PRD Feature 1.1 (lines 42-43) | projects table, workflow-store.ts | Unit test: Database update, navigation trigger |
| AC5: Conversation Persistence | PRD Feature 1.1 (line 39) | messages table, MessageList.tsx | Integration test: Save, reload, verify history |
| AC6: Ollama Error Handling | NFR 1 (FOSS), Architecture section | Error boundaries, try/catch in API route | Unit test: Mock connection failure, verify error UI |
| AC7: Create New Project | PRD Feature 1.1, Epics Story 1.6 (lines 229-230) | NewChatButton.tsx, app/api/projects/route.ts, project-store.ts | Integration test: POST /api/projects, verify DB insert, check UI state |
| AC8: Project List Display | PRD Feature 1.1, Epics Story 1.6 (lines 231-232) | ProjectSidebar.tsx, ProjectListItem.tsx, projects table | Unit test: Render with mock data, verify ordering by last_active |
| AC9: Switch Between Projects | PRD Feature 1.1, Epics Story 1.6 (line 232) | project-store.ts, conversation-store.ts, app/api/projects/[id] | Integration test: Click project, verify messages loaded, URL updated |
| AC10: Auto-Generate Project Name | PRD Feature 1.1, Epics Story 1.6 (line 233-234) | app/api/chat/route.ts, db/queries.ts (updateProjectName) | Integration test: Send first message, verify project name updated |
| AC11: Project Persistence | PRD Feature 1.1, Epics Story 1.6 (line 235) | project-store.ts (localStorage), projects table | E2E test: Set active project, reload page, verify active project restored |
| AC12: Project Deletion | PRD Feature 1.1, Epics Story 1.6 (line 236) | ProjectSidebar.tsx, app/api/projects/[id] (DELETE) | Integration test: DELETE request, verify cascade to messages, check UI update |
| AC13: Topic Edit Workflow | PRD Feature 1.1, Epics Story 1.7 (lines 249-271) | TopicConfirmation.tsx (Edit button handler), conversation-store.ts | Integration test: Click Edit, verify dialog closes, no DB updates, chat remains active |

---

## Risks, Assumptions, Open Questions

### Risks

**R1: Ollama Service Availability**
- **Risk**: User forgets to start Ollama or it crashes during use
- **Impact**: Application unusable for new conversations
- **Mitigation**: Clear error messaging, instructions for starting Ollama, graceful degradation (show history read-only)

**R2: LLM Response Quality**
- **Risk**: Llama 3.2 3B may produce inconsistent or irrelevant responses
- **Impact**: Poor user experience, frustration with topic discovery
- **Mitigation**: Carefully crafted system prompt, option to retry/rephrase, future: allow model selection

**R3: Context Window Limitations**
- **Risk**: Very long conversations may exceed context window or slow down responses
- **Impact**: Loss of conversation context, poor assistant performance
- **Mitigation**: Limit history to last 20 messages (within 128K context window), summarize older messages (post-MVP)

**R4: Database Growth**
- **Risk**: SQLite database grows large with extensive conversation history
- **Impact**: Slower queries, larger file size
- **Mitigation**: Indexes on project_id and timestamp, future: conversation archival/export

### Assumptions

**A1**: Ollama is pre-installed and llama3.2 model is downloaded
**A2**: User's machine has sufficient RAM/CPU for local LLM inference
**A3**: Single-user use case (no concurrent conversations from multiple users)
**A4**: Conversation history does not contain sensitive data requiring encryption at rest
**A5**: Users are comfortable with desktop-first web interface (localhost:3000)

### Open Questions

**Q1**: Should we implement conversation branching (save multiple topic variations)?
**Answer**: Post-MVP. MVP focuses on linear conversation to single topic confirmation.

**Q2**: What is the max conversation length before performance degrades?
**Answer**: Test with 50+ message conversations, implement pagination/virtualization if needed.

**Q3**: Should we allow users to delete or edit messages?
**Answer**: Post-MVP. MVP is append-only for simplicity.

**Q4**: How do we handle profanity or inappropriate topics?
**Answer**: No content filtering in MVP (local deployment, unrestricted persona). Future: optional content filters.

---

## Test Strategy Summary

### Test Levels

**Unit Tests:**
- LLMProvider interface implementation (mock Ollama responses)
- Database query functions (insert, retrieve messages, create/update/delete projects)
- Message validation logic (empty check, length limits)
- TopicConfirmation component (user confirmation flow, Edit button handler)
- ProjectListItem component (display, click handling)
- Project name generation utility (truncate to last complete word)
- **Story 1.7 - Topic Edit:**
  - TopicConfirmation Edit button click handler (dialog closes, no state changes)
  - Verify no database calls made when Edit clicked
  - Verify chat input receives focus after Edit

**Integration Tests:**
- Full conversation flow: User message → API → Ollama → Database → UI update
- Conversation history loading from database
- Error handling: Ollama connection failure scenarios
- Topic extraction and confirmation workflow
- **Story 1.6 - Project Management:**
  - Create new project: POST /api/projects → DB insert → UI update
  - Switch projects: Click project → Load messages → Update active state
  - Auto-generate project name: First message → Name updated in DB and UI
  - Project list ordering: Verify projects sorted by last_active DESC
  - Project deletion: DELETE /api/projects/[id] → Cascade to messages → UI update
- **Story 1.7 - Topic Confirmation Edit:**
  - Edit workflow: Display TopicConfirmation → Click Edit → Dialog closes → No DB updates → Continue conversation
  - Re-trigger confirmation: Edit topic → Continue conversation → Issue new command → New TopicConfirmation appears
  - Verify project state unchanged: topic=null, current_step='topic', name unchanged

**End-to-End Tests:**
- Complete user journey: Open app → Brainstorm topic → Confirm → Navigate to voice selection
- Browser refresh persistence (conversation history retained)
- Multi-turn conversation with context retention
- **Story 1.6 - Multi-Project Workflow:**
  - Create 3 projects, switch between them, verify context isolation
  - Close browser, reopen, verify active project restored from localStorage
  - Delete project while active, verify switch to most recent remaining project
- **Story 1.7 - Topic Edit and Refinement:**
  - Full edit flow: Brainstorm → Issue command → TopicConfirmation appears → Click Edit → Continue conversation → Refine topic → Issue new command → Confirm refined topic
  - Verify conversation continuity: Edit doesn't break message history or context
  - Multiple edit cycles: Edit → Refine → Edit again → Refine → Finally confirm

**Manual Testing:**
- LLM response quality evaluation (subjective)
- UI/UX feedback (message display, loading states, sidebar interactions)
- Performance testing with long conversations (20+ messages)
- Performance testing with many projects (10+ projects in sidebar)

### Frameworks

- **Unit/Integration**: Vitest or Jest (TypeScript-friendly)
- **E2E**: Playwright (Next.js compatible)
- **Component**: React Testing Library

### Coverage Targets

- **Code Coverage**: >80% for business logic (API routes, providers, queries)
- **Critical Path Coverage**: 100% for topic confirmation workflow (both Confirm and Edit paths) and project management workflows
- **Edge Cases**: Ollama failures, empty messages, invalid project IDs, project switching edge cases, first message name generation, multiple Edit cycles, Edit with no follow-up conversation

### Test Data

**Fixtures:**
- Sample conversation histories (5, 10, 20 messages)
- Mock Ollama responses for common topics
- Test projects with various states (no topic, confirmed topic)
- **Story 1.6 Fixtures:**
  - Mock project list (3-5 projects with different last_active timestamps)
  - Edge case project names (very short, very long, special characters)
  - First messages for auto-naming (short, long, with punctuation)
- **Story 1.7 Fixtures:**
  - Mock TopicConfirmation dialog states (open, closed)
  - Sample topics for confirmation (clear topics, ambiguous topics, very long topics)
  - Conversation histories leading to topic confirmation triggers
  - Refined topic sequences (initial topic → refined topic after Edit)

**Mocking Strategy:**
- Mock Ollama client for predictable responses
- Mock database with in-memory SQLite for tests
- Mock Zustand stores for component tests (conversation-store, project-store)
- Mock localStorage for project persistence tests
- Mock window.history.pushState for URL navigation tests

---

**Document Status:** Complete and Ready for Implementation (Updated 2025-11-29 to include database singleton fix)
**Next Steps:**
1. Set up Next.js project with TypeScript and Tailwind CSS (Architecture initialization commands)
2. Implement database schema and initialize SQLite (includes projects and messages tables)
3. Create LLM provider abstraction and Ollama integration
4. Build chat UI components (ChatInterface, MessageList)
5. **Build TopicConfirmation dialog with Confirm/Edit buttons - Story 1.7**
6. **Build project management UI components (ProjectSidebar, ProjectListItem, NewChatButton) - Story 1.6**
7. Implement /api/chat endpoint with conversation logic
8. **Implement topic detection and confirmation workflow - Story 1.7**
9. **Implement Edit workflow (close dialog, continue conversation, no DB updates) - Story 1.7**
10. **Implement /api/projects endpoints (GET, POST, PUT, DELETE) - Story 1.6**
11. **Implement project-store.ts with localStorage persistence - Story 1.6**
12. Write tests following test strategy (includes all 13 acceptance criteria)
13. Validate against acceptance criteria (AC1-AC13)

---

## Post-Review Follow-ups

**Added:** 2025-11-29 (Database Initialization Singleton Fix)

### Database Initialization Pattern (Next.js Development Mode)

The database initialization in `lib/db/init.ts` uses `globalThis` to persist initialization state across Next.js hot reloads. This is critical for preventing redundant database initialization on every API request.

**Problem:** Module-level singleton variables (`isInitialized`, `initializationPromise`) reset when Next.js hot-reloads modules in development mode, causing:
- "Database initialization completed successfully" logged on every API request
- Migration checks running repeatedly (40+ times per session)
- Performance degradation from redundant schema.sql execution

**Solution:** Use `globalThis` for initialization state persistence:

```typescript
// lib/db/init.ts
declare global {
  var __dbInitialized: boolean | undefined;
  var __dbInitPromise: Promise<void> | undefined;
}

const isInitialized = (): boolean => globalThis.__dbInitialized === true;
const setInitialized = (value: boolean): void => { globalThis.__dbInitialized = value; };
```

**Key Points:**
- `globalThis` persists across module reloads within the same Node.js process
- First API request initializes database, subsequent requests skip immediately
- On server restart, initialization runs once as expected
- Production builds are unaffected (no hot reloading)

---

**Added:** 2025-11-02 (Story 1.1 Review)

### Story 1.1 Setup Issues

1. **Test Framework Not Configured** - No Vitest or Jest setup despite being mentioned in architecture. Consider adding test framework in Story 1.2 or create dedicated test setup story.

2. **Missing Utility Scaffolding** - Story context references lib/utils.ts (story-context-1.1.xml:128-133) but file not created. Ensure shadcn/ui cn() utility is available for component implementation.

3. **Database Schema Not Initialized** - Architecture specifies schema.sql (architecture.md:1120-1122) but not created in Story 1.1. Prioritize database setup in early Epic 1 implementation stories.

4. **LLM Provider Abstraction Missing** - Core abstraction layer (provider.ts, ollama-provider.ts) not scaffolded. Required before implementing chat functionality in Epic 1 stories.

5. **Version Documentation Gap** - Next.js 16.0.1 installed vs 15.5 specified. Verify compatibility with React 19 patterns and update architecture if 16.x is the target.
