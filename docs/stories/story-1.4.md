# Story 1.4: Chat API Endpoint

**Epic:** Epic 1 - Conversational Topic Discovery
**Story ID:** 1.4
**Status:** Ready
**Created:** 2025-11-03
**Assigned To:** TBD
**Sprint:** TBD

---

## Story Overview

**Goal:** Create POST /api/chat endpoint with conversation logic and persistence

**Description:**
Implement the main chat API endpoint that handles user messages, manages conversation context, and integrates with the Ollama LLM provider. This endpoint serves as the backend for the chat interface, orchestrating request validation, conversation history retrieval, LLM interaction, and message persistence.

**Business Value:**
- Enables the core chat functionality for the AI Video Generator
- Provides persistent conversation history for contextual interactions
- Establishes standardized error handling patterns for the API layer
- Creates the foundation for multi-turn conversations with context awareness

---

## Acceptance Criteria

1. **POST /api/chat accepts correct request format and returns structured response**
   - Endpoint accepts `{ projectId, message }` in request body
   - Returns `{ messageId, response, timestamp }` on success
   - Response follows standard format: `{ success: true, data: {...} }`

2. **Conversation history loaded from database before LLM call**
   - Retrieves last 20 messages for the given projectId
   - Messages ordered chronologically (oldest to newest)
   - History includes both user and assistant messages with roles

3. **Both user and assistant messages persisted to database**
   - User message saved with role='user' before LLM call
   - Assistant response saved with role='assistant' after LLM response
   - Both messages include projectId, timestamp, and content
   - Database operations wrapped in transaction for atomicity

4. **Error responses follow standard format with error codes**
   - All errors return `{ success: false, error: { message, code } }`
   - Implements all required error codes: OLLAMA_CONNECTION_ERROR, INVALID_PROJECT_ID, EMPTY_MESSAGE, DATABASE_ERROR
   - HTTP status codes appropriate for error types (400, 404, 500, 503)

5. **Ollama connection failures return OLLAMA_CONNECTION_ERROR code**
   - Network failures to localhost:11434 caught and handled
   - Timeout errors (>30s) treated as connection failures
   - Error message provides actionable guidance for user/developer

---

## Tasks

### Task 1: Create API Route Structure
**File:** `app/api/chat/route.ts`

**Subtasks:**
- [ ] Create route.ts file with POST handler export
- [ ] Set up Next.js 16 App Router API route structure
- [ ] Add TypeScript interfaces for request/response types
- [ ] Import required dependencies:
  - `import { getDatabase } from '@/lib/db';` (Story 1.2)
  - `import { createLLMProvider, DEFAULT_SYSTEM_PROMPT } from '@/lib/llm/provider';` (Story 1.3)
- [ ] Set up basic error boundary with try-catch

**Estimated Effort:** 1 hour

---

### Task 2: Implement Request Validation
**Dependencies:** Task 1

**Subtasks:**
- [ ] Parse and validate JSON request body
- [ ] Check projectId is non-empty UUID format (all versions, not just v4)
- [ ] Check message is non-empty string (trim whitespace)
- [ ] Verify projectId exists in database (JOIN projects table)
- [ ] Return INVALID_PROJECT_ID error if project not found
- [ ] Return EMPTY_MESSAGE error if message is empty/whitespace
- [ ] Return 400 Bad Request for validation failures

**Estimated Effort:** 2 hours

---

### Task 3: Load Conversation History
**Dependencies:** Task 2

**Subtasks:**
- [ ] Query messages table for projectId (last 20 messages)
- [ ] Order by timestamp ASC, id ASC for chronological context
- [ ] Map database rows to LLM message format: `{ role, content }`
- [ ] Handle empty conversation history (new projects)
- [ ] Add error handling for database query failures
- [ ] Return DATABASE_ERROR if SQLite operation fails

**Estimated Effort:** 2 hours

---

### Task 4: Integrate with LLM Provider
**Dependencies:** Task 3

**Subtasks:**
- [ ] Use LLMProvider abstraction from Story 1.3 (NOT direct fetch calls)
- [ ] Create provider instance: `createLLMProvider()`
- [ ] Prepend DEFAULT_SYSTEM_PROMPT to conversation history
- [ ] Call `llmProvider.chat(messages, DEFAULT_SYSTEM_PROMPT)`
- [ ] Parse LLM response and extract assistant message
- [ ] Handle Ollama connection errors (network, timeout)
- [ ] Return OLLAMA_CONNECTION_ERROR with helpful message
- [ ] Log LLM request/response for debugging (without full content)

**Estimated Effort:** 3 hours

---

### Task 5: Persist Messages to Database
**Dependencies:** Task 4

**Subtasks:**
- [ ] Create database transaction for atomic saves (synchronous with better-sqlite3)
- [ ] Use: `db.prepare('BEGIN').run()`, `db.prepare('COMMIT').run()`, `db.prepare('ROLLBACK').run()`
- [ ] Insert user message: `INSERT INTO messages (id, project_id, role, content, timestamp)`
- [ ] Generate UUID for user messageId
- [ ] Insert assistant response with generated messageId
- [ ] Commit transaction on success
- [ ] Rollback transaction on failure
- [ ] Return DATABASE_ERROR if persistence fails
- [ ] Ensure timestamps are ISO 8601 format

**Estimated Effort:** 2.5 hours

---

### Task 6: Format and Return Response
**Dependencies:** Task 5

**Subtasks:**
- [ ] Create success response object: `{ success: true, data: {...} }`
- [ ] Include messageId (assistant message ID)
- [ ] Include response text from LLM
- [ ] Include timestamp of assistant message
- [ ] Set HTTP status 200 for success
- [ ] Return JSON with proper Content-Type header

**Estimated Effort:** 1 hour

---

### Task 7: Implement Comprehensive Error Handling
**Dependencies:** All previous tasks

**Subtasks:**
- [ ] Create standardized error response helper function
- [ ] Map error types to HTTP status codes (400, 404, 500, 503)
- [ ] Implement all error codes: OLLAMA_CONNECTION_ERROR, INVALID_PROJECT_ID, EMPTY_MESSAGE, DATABASE_ERROR
- [ ] Add error logging for server-side errors (500, 503)
- [ ] Test each error scenario with appropriate status codes
- [ ] Ensure no sensitive data leaked in error messages
- [ ] Add error recovery guidance in error messages

**Estimated Effort:** 2.5 hours

---

## Technical Implementation

### API Endpoint Specification

**Endpoint:** `POST /api/chat`

**Request Body:**
```json
{
  "projectId": "uuid-string",
  "message": "I want to make a video about space exploration"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "messageId": "msg-uuid",
    "response": "Great! Should we focus on the Apollo missions...",
    "timestamp": "2025-11-02T12:00:00.000Z"
  }
}
```

**Error Response (4xx/5xx):**
```json
{
  "success": false,
  "error": {
    "message": "Unable to connect to Ollama...",
    "code": "OLLAMA_CONNECTION_ERROR"
  }
}
```

---

### Error Codes and HTTP Status Mapping

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| OLLAMA_CONNECTION_ERROR | Ollama server not reachable at localhost:11434 | 503 Service Unavailable |
| INVALID_PROJECT_ID | Project not found in database | 404 Not Found |
| EMPTY_MESSAGE | User message is empty or whitespace-only | 400 Bad Request |
| DATABASE_ERROR | SQLite operation failed | 500 Internal Server Error |

---

### Conversation Flow (Backend Processing)

1. **API Route:** Validate projectId exists in database
2. **Database:** Fetch conversation history (last 20 messages for context)
3. **LLM Provider:** Prepend DEFAULT_SYSTEM_PROMPT to messages array
4. **Ollama:** Send chat request to llama3.2 model at localhost:11434
5. **Ollama:** Return assistant response
6. **Database:** Save user message `INSERT INTO messages ...`
7. **Database:** Save assistant response `INSERT INTO messages ...`
8. **API Route:** Return `{ messageId, response, timestamp }`

---

## Dev Notes

### Architecture Patterns

**Layered Architecture:**
- API Route Layer (route.ts): Request/response handling, validation
- Service Layer: Business logic, conversation orchestration
- Data Access Layer: Database operations, message persistence
- Integration Layer: External service calls (Ollama)

**Error Handling Strategy:**
- Use custom error classes for different error types
- Centralized error response formatter
- Consistent error code enumeration
- Appropriate HTTP status codes for each error category

**Transaction Management:**
- Wrap message persistence in database transaction
- Ensure atomicity: both user and assistant messages saved together
- Rollback on any failure during save operation

---

### Implementation Guidelines

**Request Validation:**
```typescript
// Validate projectId format (UUID - all versions accepted)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Trim and check message
const trimmedMessage = message.trim();
if (!trimmedMessage) {
  return errorResponse('EMPTY_MESSAGE', 'Message cannot be empty', 400);
}

// Verify project exists (note: database uses snake_case project_id)
const project = await db.query('SELECT id FROM projects WHERE id = ?', [projectId]);
if (!project) {
  return errorResponse('INVALID_PROJECT_ID', 'Project not found', 404);
}
```

**Conversation History Loading:**
```typescript
// Load last 20 messages, ordered chronologically with secondary sort
const messages = await db.query(
  'SELECT role, content FROM messages WHERE project_id = ? ORDER BY timestamp ASC, id ASC LIMIT 20',
  [projectId]
);

// Format for LLM: [{ role: 'user', content: '...' }, { role: 'assistant', content: '...' }]
const conversationHistory = messages.map(msg => ({
  role: msg.role,
  content: msg.content
}));
```

**LLM Integration (Using Story 1.3 Abstraction):**
```typescript
// Use LLMProvider abstraction instead of direct fetch calls
const llmProvider = createLLMProvider();

// Prepend system prompt and add new user message
const fullConversation = [
  ...conversationHistory,
  { role: 'user', content: userMessage }
];

// Call provider with system prompt
try {
  const assistantResponse = await llmProvider.chat(fullConversation, DEFAULT_SYSTEM_PROMPT);
} catch (error) {
  throw new OllamaConnectionError('Unable to connect to Ollama. Ensure Ollama is running.');
}
```

**Database Persistence (Transaction with better-sqlite3 - SYNCHRONOUS):**
```typescript
// better-sqlite3 is SYNCHRONOUS, not async
const db = getDatabase();

try {
  // Begin transaction
  db.prepare('BEGIN').run();

  // Save user message (note: database uses snake_case project_id)
  const userMessageId = crypto.randomUUID();
  db.prepare(
    'INSERT INTO messages (id, project_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)'
  ).run(userMessageId, projectId, 'user', userMessage, new Date().toISOString());

  // Save assistant message
  const assistantMessageId = crypto.randomUUID();
  db.prepare(
    'INSERT INTO messages (id, project_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)'
  ).run(assistantMessageId, projectId, 'assistant', assistantResponse, new Date().toISOString());

  // Commit transaction
  db.prepare('COMMIT').run();

  return { messageId: assistantMessageId, timestamp: new Date().toISOString() };
} catch (error) {
  // Rollback on failure
  db.prepare('ROLLBACK').run();
  throw new DatabaseError('Failed to save messages');
}
```

---

### Testing Standards

**Unit Tests:**
- Request validation logic (valid/invalid projectId, empty messages)
- Error response formatting
- Message formatting for LLM
- UUID generation

**Integration Tests:**
- Database query for conversation history
- Database transaction for message persistence
- Ollama API call with mock server
- End-to-end flow with test database

**Error Scenario Tests:**
- Invalid projectId returns 404 with INVALID_PROJECT_ID
- Empty message returns 400 with EMPTY_MESSAGE
- Ollama connection failure returns 503 with OLLAMA_CONNECTION_ERROR
- Database failure returns 500 with DATABASE_ERROR

**Test Data:**
```typescript
const validRequest = {
  projectId: '550e8400-e29b-41d4-a716-446655440000',
  message: 'Tell me about space exploration'
};

const invalidRequests = [
  { projectId: 'invalid-uuid', message: 'test' }, // INVALID_PROJECT_ID
  { projectId: '550e8400-e29b-41d4-a716-446655440000', message: '   ' }, // EMPTY_MESSAGE
  { projectId: '00000000-0000-0000-0000-000000000000', message: 'test' } // INVALID_PROJECT_ID
];
```

---

## References

- **Tech Spec:** Lines 142-179 (API Endpoint specification)
- **Tech Spec:** Lines 198-206 (Backend Processes Request)
- **Epics:** Epic 1, Story 1.4 (lines 165-187)
- **Related Stories:**
  - Story 1.1 (Project Selection) - provides projectId
  - Story 1.2 (Database) - provides getDatabase() and schema
  - Story 1.3 (LLM Provider Service) - provides createLLMProvider(), DEFAULT_SYSTEM_PROMPT
- **Architecture:** Next.js 16 App Router API routes
- **Database:** SQLite with messages table (see DB schema in tech spec)

---

## Effort Estimation

| Task | Estimated Hours |
|------|-----------------|
| Task 1: Create API Route Structure | 1.0 |
| Task 2: Implement Request Validation | 2.0 |
| Task 3: Load Conversation History | 2.0 |
| Task 4: Integrate with LLM Provider | 3.0 |
| Task 5: Persist Messages to Database | 2.5 |
| Task 6: Format and Return Response | 1.0 |
| Task 7: Implement Comprehensive Error Handling | 2.5 |
| **Total Development Time** | **14.0 hours** |
| Testing & QA | 4.0 hours |
| Code Review & Refinement | 2.0 hours |
| **Total Story Effort** | **20.0 hours** |

**Story Points:** 8 (based on complexity, dependencies, and effort)

---

## Definition of Done

- [ ] All 7 tasks completed and checked off
- [ ] All 5 acceptance criteria validated
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests passing for all error scenarios
- [ ] Code reviewed and approved
- [ ] API endpoint tested with Postman/curl
- [ ] Error handling verified for all error codes
- [ ] Documentation updated (API docs, inline comments)
- [ ] No TypeScript errors or warnings
- [ ] Ollama integration tested with running instance
- [ ] Database transactions tested for rollback scenarios

---

## Notes

**Dependencies:**
- Story 1.3 (LLM Provider Service) must be completed for Ollama integration
- Database schema must include messages table with required columns
- Projects table must exist for projectId validation

**Risks:**
- Ollama connection reliability (localhost:11434 must be available)
- Database transaction performance with high message volume
- LLM response time variability (30s timeout may need tuning)

**Future Enhancements:**
- Streaming responses for real-time chat experience
- Message editing and regeneration
- Conversation branching and forking
- Rate limiting per project
- Message content filtering and moderation
