# Technical Specification: Epic 1 - Conversational Topic Discovery

Date: 2025-11-02
Author: lichking
Epic ID: 1
Status: Draft

---

## Overview

Epic 1 implements the foundational conversational AI agent that enables users to brainstorm and finalize video topics through natural language dialogue. This epic establishes the core interaction pattern for the AI Video Generator by providing an unrestricted, creative brainstorming assistant powered by local Ollama (Llama 3.2) that guides users from initial ideas to confirmed video topics ready for production.

The implementation includes a chat-based UI, persistent conversation history, topic confirmation workflow, and a configurable system prompt architecture (MVP: hardcoded default persona) that defines the assistant's behavior. This epic serves as the entry point for all subsequent video creation workflows.

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
- Frontend: `components/features/conversation/ChatInterface.tsx`, `MessageList.tsx`, `TopicConfirmation.tsx`
- API Layer: `app/api/chat/route.ts`
- LLM Abstraction: `lib/llm/provider.ts`, `lib/llm/ollama-provider.ts`, `lib/llm/factory.ts`
- System Prompts: `lib/llm/prompts/default-system-prompt.ts`
- State Management: `stores/conversation-store.ts` (Zustand)
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
| **TopicConfirmation.tsx** | Topic approval dialog | Extracted topic string | User confirmation (yes/no) | Frontend |
| **app/api/chat/route.ts** | LLM conversation endpoint | `{ projectId, message }` | `{ messageId, response, timestamp }` | Backend API |
| **OllamaProvider** | Ollama LLM integration | Messages array, system prompt | AI response string | Backend Service |
| **getLLMProvider()** | Provider factory function | None (reads env vars) | LLMProvider instance | Backend Service |
| **conversation-store.ts** | Client-side conversation state | User/assistant messages | Messages array, loading state | State Management |
| **db/queries.ts** | Database operations | Project ID, message data | Saved records, query results | Database Layer |

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

**Error Handling Flow:**
- Ollama Connection Failure → Display user-friendly error + retry button
- Database Error → Log error, display generic error message
- Empty Message → Client-side validation, prevent API call
- Invalid Project → Create new project, start fresh conversation

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
- Database query functions (insert, retrieve messages)
- Message validation logic (empty check, length limits)
- TopicConfirmation component (user confirmation flow)

**Integration Tests:**
- Full conversation flow: User message → API → Ollama → Database → UI update
- Conversation history loading from database
- Error handling: Ollama connection failure scenarios
- Topic extraction and confirmation workflow

**End-to-End Tests:**
- Complete user journey: Open app → Brainstorm topic → Confirm → Navigate to voice selection
- Browser refresh persistence (conversation history retained)
- Multi-turn conversation with context retention

**Manual Testing:**
- LLM response quality evaluation (subjective)
- UI/UX feedback (message display, loading states)
- Performance testing with long conversations (20+ messages)

### Frameworks

- **Unit/Integration**: Vitest or Jest (TypeScript-friendly)
- **E2E**: Playwright (Next.js compatible)
- **Component**: React Testing Library

### Coverage Targets

- **Code Coverage**: >80% for business logic (API routes, providers, queries)
- **Critical Path Coverage**: 100% for topic confirmation workflow
- **Edge Cases**: Ollama failures, empty messages, invalid project IDs

### Test Data

**Fixtures:**
- Sample conversation histories (5, 10, 20 messages)
- Mock Ollama responses for common topics
- Test projects with various states (no topic, confirmed topic)

**Mocking Strategy:**
- Mock Ollama client for predictable responses
- Mock database with in-memory SQLite for tests
- Mock Zustand stores for component tests

---

**Document Status:** Complete and Ready for Implementation
**Next Steps:**
1. Set up Next.js project with TypeScript and Tailwind CSS (Architecture initialization commands)
2. Implement database schema and initialize SQLite
3. Create LLM provider abstraction and Ollama integration
4. Build chat UI components (ChatInterface, MessageList, TopicConfirmation)
5. Implement /api/chat endpoint with conversation logic
6. Write tests following test strategy
7. Validate against acceptance criteria

---

## Post-Review Follow-ups

**Added:** 2025-11-02 (Story 1.1 Review)

### Story 1.1 Setup Issues

1. **Test Framework Not Configured** - No Vitest or Jest setup despite being mentioned in architecture. Consider adding test framework in Story 1.2 or create dedicated test setup story.

2. **Missing Utility Scaffolding** - Story context references lib/utils.ts (story-context-1.1.xml:128-133) but file not created. Ensure shadcn/ui cn() utility is available for component implementation.

3. **Database Schema Not Initialized** - Architecture specifies schema.sql (architecture.md:1120-1122) but not created in Story 1.1. Prioritize database setup in early Epic 1 implementation stories.

4. **LLM Provider Abstraction Missing** - Core abstraction layer (provider.ts, ollama-provider.ts) not scaffolded. Required before implementing chat functionality in Epic 1 stories.

5. **Version Documentation Gap** - Next.js 16.0.1 installed vs 15.5 specified. Verify compatibility with React 19 patterns and update architecture if 16.x is the target.
