# Epic 1: Conversational Topic Discovery

**Goal:** Enable users to brainstorm and finalize video topics through natural conversation with an AI agent.

**Features Included:**
- 1.1. Conversational AI Agent
- 1.9. LLM Configuration & Script Personas (Ollama + Gemini providers, 4 preset personas with selector UI)

**User Value:** Creators can explore ideas naturally and receive AI guidance to refine their video topics before production begins. The AI assistant adapts its personality and behavior to match different content creation workflows. Users can choose between local Ollama (FOSS) or cloud-based Gemini (free tier) providers.

**Story Count Estimate:** 8 stories (Stories 1.1-1.8)

**Dependencies:** None (foundational epic)

**Acceptance:**
- Users can have multi-turn conversations about video ideas
- Agent maintains context across conversation
- Agent behavior follows configured system prompt/persona
- Users can select from 4 preset personas (Scientific Analyst, Blackpill Realist, Documentary Filmmaker, Educational Designer)
- Users can trigger video creation with explicit command
- Topic confirmation workflow works correctly

### System Prompt/Persona Configuration (Epic 1)

**Core Implementation (Feature 1.9):**

**Unified Persona System:**
The persona defines the LLM's personality, tone, and delivery style for BOTH chat brainstorming AND script generation. This unified approach ensures consistent behavior throughout the content creation workflow.

- **Persona = WHO:** Defines tone, worldview, delivery style
- **Task Prompts = WHAT:** Defines output format (JSON for scripts, conversational for chat)

**Preset Personas:**
1. **Scientific Analyst (Default)** - Neutral, data-driven, factual delivery. Best for technical explanations, research summaries, and objective analysis.
2. **Blackpill Realist** - Brutal honesty about harsh realities. Nihilistic framing, no sugar-coating. Best for societal critique, collapse scenarios, and uncomfortable truths.
3. **Documentary Filmmaker** - Balanced narrative with focus on human stories and emotional authenticity. Best for historical content, profiles, and investigative pieces.
4. **Educational Designer** - TED-Ed/Kurzgesagt style educational content. Learning-focused with accessible explanations and engaging delivery.

**Technical Implementation:**
- Personas stored in `system_prompts` table with `is_preset = true`
- Project-level persona selection via `projects.system_prompt_id` foreign key
- Persona system prompt prepended to ALL LLM requests (chat AND script generation)
- Task-specific instructions (JSON format, word counts) added as user message context
- Provider selection via .env.local: LLM_PROVIDER=ollama|gemini
- Persona selection UI appears after project creation, before first chat message

**LLM Provider Support:**
- **Ollama (Primary, FOSS):** Local deployment with Llama 3.2 or other open models
  - Fully complies with NFR 1 (FOSS requirement)
  - Complete privacy and control
  - No API costs or rate limits
- **Google Gemini (Optional, Cloud):** Gemini 2.5 Flash/Pro with free tier
  - 1,500 requests/day free tier
  - 15 requests/minute rate limit
  - No local setup required
  - Models: gemini-2.5-flash, gemini-2.5-pro
  - Note: Gemini 1.5 models deprecated (use 2.5 or 2.0 only)

**Database Schema:**
```sql
CREATE TABLE system_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'preset',
  is_preset BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TEXT,
  updated_at TEXT
);

ALTER TABLE projects ADD COLUMN system_prompt_id TEXT REFERENCES system_prompts(id);
```

**UI Components:**
- PersonaSelector.tsx: Card-based selector with persona name, description, and selection state
- Appears after "New Chat" before first message (or optionally in project settings)
- Selected persona shown in chat header

**Future Enhancement:**
- Custom persona creation UI
- Per-project persona switching mid-workflow
- Persona import/export

**Benefits:**
- ✅ Unified behavior across chat AND script generation
- ✅ Clear content differentiation (Scientific vs Documentary vs Blackpill)
- ✅ Full control over AI behavior (local Ollama = no restrictions)
- ✅ Privacy-first (prompts stored locally)

---

### Epic 1 Stories

#### Story 1.1: Project Setup & Dependencies
**Goal:** Initialize Next.js project with required dependencies and project structure

**Tasks:**
- Initialize Next.js 15.5 with TypeScript, Tailwind CSS, ESLint, App Router
- Install core dependencies: zustand@5.0.8, better-sqlite3@12.4.1, ollama@0.6.2, @google/generative-ai
- Set up project structure (app/, components/, lib/, stores/, types/)
- Configure environment variables (.env.local)
- Verify Ollama is running at localhost:11434 (primary) OR configure Gemini API key (optional)

**Acceptance Criteria:**
- Next.js development server runs successfully
- All dependencies installed without errors
- Project structure follows architecture.md patterns
- Either Ollama connection verified OR Gemini API key configured

---

#### Story 1.2: Database Schema & Infrastructure
**Goal:** Create SQLite database schema and client for conversation persistence

**Tasks:**
- Create database schema (projects and messages tables with indexes)
- Implement database client (lib/db/client.ts)
- Create database initialization script
- Write database query functions (lib/db/queries.ts)
- Add foreign key constraints and indexes for performance

**Acceptance Criteria:**
- Projects table created with required fields
- Messages table created with project_id foreign key
- Indexes created on messages(project_id) and messages(timestamp)
- Database client initializes successfully
- Query functions handle CRUD operations for projects and messages

**References:**
- Tech Spec lines 100-125 (Database Schema)
- Architecture lines 1024-1105 (Database Schema)

---

#### Story 1.3: LLM Provider Abstraction
**Goal:** Implement LLM provider abstraction layer with Ollama and Gemini integrations

**Tasks:**
- Create LLMProvider interface (lib/llm/provider.ts)
- Implement OllamaProvider class (lib/llm/ollama-provider.ts)
- Implement GeminiProvider class (lib/llm/gemini-provider.ts)
- Create provider factory function (lib/llm/factory.ts)
- Implement DEFAULT_SYSTEM_PROMPT (lib/llm/prompts/default-system-prompt.ts)
- Add error handling for connection failures (both providers)
- Add Gemini-specific error handling (API key, quota, model not found, safety filters)

**Acceptance Criteria:**
- LLMProvider interface defines chat() method
- OllamaProvider successfully calls Ollama API at localhost:11434
- GeminiProvider successfully calls Gemini API with valid API key and model (gemini-2.5-flash)
- System prompt prepended to all chat requests (both providers)
- Factory returns correct provider based on LLM_PROVIDER environment variable
- Error messages provide actionable guidance for troubleshooting
- Model not found errors display correct available models (Gemini 2.5/2.0)
- Connection errors handled gracefully with user-friendly messages

**References:**
- Tech Spec lines 129-140 (LLMProvider Interface)
- Architecture lines 384-504 (LLM Provider Abstraction)

---

#### Story 1.4: Chat API Endpoint
**Goal:** Create POST /api/chat endpoint with conversation logic and persistence

**Tasks:**
- Create app/api/chat/route.ts API endpoint
- Implement request validation (projectId, message)
- Load conversation history from database (last 20 messages)
- Call LLM provider with system prompt and conversation history
- Save user message and assistant response to database
- Return response with messageId and timestamp
- Implement error handling and standard response format

**Acceptance Criteria:**
- POST /api/chat accepts { projectId, message } and returns { messageId, response, timestamp }
- Conversation history loaded from database before LLM call
- Both user and assistant messages persisted to database
- Error responses follow standard format with error codes
- Ollama connection failures return OLLAMA_CONNECTION_ERROR code

**References:**
- Tech Spec lines 142-179 (API Endpoint specification)
- Tech Spec lines 198-206 (Backend Processes Request)

---

#### Story 1.5: Frontend Chat Components
**Goal:** Build chat UI components with message display and conversation state management

**Tasks:**
- Create ChatInterface.tsx component
- Create MessageList.tsx component for message history display
- Implement conversation-store.ts (Zustand state management)
- Add message input field with validation
- Implement loading states and error display
- Add auto-scroll to latest message
- Integrate with /api/chat endpoint

**Acceptance Criteria:**
- ChatInterface renders with input field and message list
- MessageList displays conversation history with role indicators (user/assistant)
- Messages persist and reload on page refresh
- Loading indicator shows while waiting for LLM response
- Input field disabled during message processing
- Error messages display when API calls fail
- Auto-scroll to bottom when new messages arrive

**References:**
- Tech Spec lines 63-74 (Services and Modules table)
- Architecture lines 258-277 (Epic 1 Components)

---

#### Story 1.6: Project Management UI
**Goal:** Enable users to create, list, and switch between multiple projects/conversations

**Tasks:**
- Create ProjectSidebar.tsx component with project list display
- Add "New Chat" button functionality to create new projects
- Implement project switching (load conversation history for selected projectId)
- Display project metadata (auto-generated name, last_active timestamp)
- Auto-generate project names from first user message in conversation
- Persist selected projectId in localStorage across page reloads
- Add project deletion functionality (optional)

**Acceptance Criteria:**
- Users can click "New Chat" button to start a fresh conversation in a new project
- Sidebar displays list of all projects ordered by last_active (most recent first)
- Clicking a project loads its complete conversation history
- Currently active project is visually highlighted in the sidebar
- Project names are auto-generated from the first message (e.g., "Cooking video ideas", "Gaming tutorial brainstorm")
- Selected project persists on page refresh via localStorage
- (Optional) Users can delete projects with confirmation dialog

**Database Support:**
- Projects table already exists with required fields (id, name, last_active)
- getAllProjects() query already implemented (Story 1.2)
- No schema changes required

**References:**
- Database Schema: epics.md lines 120-139 (Story 1.2)
- Component Architecture: To be updated by architect based on this story

---

#### Story 1.7: Topic Confirmation Workflow
**Goal:** Implement topic detection, confirmation dialog, and project initialization

**Tasks:**
- Create TopicConfirmation.tsx dialog component
- Implement topic extraction from conversation context
- Add confirmation/edit workflow
- Update projects table (topic, name, current_step fields)
- Implement navigation to voice selection step (Epic 2 placeholder)
- Add last_active timestamp updates

**Acceptance Criteria:**
- TopicConfirmation dialog appears when user issues video creation command
- Topic extracted from conversation context and displayed for confirmation
- User can confirm or edit the topic
- On confirmation, project.topic and project.name updated in database
- project.current_step advances to 'voice'
- User navigated to next step (placeholder until Epic 2 implemented)

**References:**
- Tech Spec lines 215-225 (Topic Detection & Confirmation flow)
- Tech Spec AC4 lines 390-396 (Topic Confirmation Workflow)

---

#### Story 1.8: Persona System & Selector UI
**Goal:** Implement the unified persona system with 4 preset personas and selector UI for project-level persona selection

**pdate script generation to use same persona system prompt (unified behavior)
- Show selected persona indicator in chat header
- Add persona selection step after project creation (before first message)

**AcTasks:**
- Create system_prompts table migration with schema from Feature 1.9
- Seed 4 preset personas: Scientific Analyst (default), Blackpill Realist, Documentary Filmmaker, Educational Designer
- Create preset persona definitions in lib/llm/prompts/preset-personas.ts
- Add system_prompt_id column to projects table (nullable, defaults to Scientific Analyst)
- Create PersonaSelector.tsx component with card-based UI
- Display persona cards with name, description, and selection state
- Implement POST /api/projects/[id]/select-persona endpoint
- Update chat API to load persona from project.system_prompt_id
- 
- acceptance Criteria:**
- system_prompts table created with 4 preset personas seeded
- Scientific Analyst marked as is_default = true
- PersonaSelector displays all 4 personas with name and description
- Clicking a persona card selects it (visual highlight)
- "Continue" or "Start Chat" button saves selection to projects.system_prompt_id
- Chat API prepends selected persona's system prompt to all LLM requests
- Script generation uses the SAME persona prompt (not a separate script-specific prompt)
- Chat header shows selected persona name (e.g., "Blackpill Realist")
- Default persona (Scientific Analyst) used if no selection made
- Persona definitions stored as TypeScript constants for easy maintenance

**Database Changes:**
```sql
-- New table
CREATE TABLE system_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'preset',
  is_preset BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Projects table modification
ALTER TABLE projects ADD COLUMN system_prompt_id TEXT REFERENCES system_prompts(id);
```

**References:**
- PRD Feature 1.9 (LLM Configuration & Script Personas)
- Architecture Section: System Prompts & LLM Persona Configuration
- Epic 1 System Prompt/Persona Configuration section

---
