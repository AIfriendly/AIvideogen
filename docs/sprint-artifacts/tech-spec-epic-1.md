# Epic Technical Specification: Conversational Topic Discovery

Date: 2025-11-28
Author: master
Epic ID: 1
Status: Draft

---

## Overview

Epic 1 establishes the foundational infrastructure for the AI Video Generator, enabling users to brainstorm and finalize video topics through natural conversation with an AI agent. This epic implements the core conversational AI interface with multi-turn dialogue support, project management capabilities for organizing multiple video ideas, and the unified persona system that defines LLM behavior across both chat interactions and script generation.

The implementation follows a FOSS-first approach with Ollama (local Llama 3.2) as the primary LLM provider, with optional Google Gemini cloud support for users preferring cloud-based inference. The persona system provides 4 preset personas (Scientific Analyst, Blackpill Realist, Documentary Filmmaker, Educational Designer) that shape the AI's personality and delivery style throughout the entire content creation workflow.

## Objectives and Scope

**In Scope:**
- Next.js 15.5 project initialization with TypeScript, Tailwind CSS, and App Router
- SQLite database schema for projects, messages, and system_prompts tables
- LLM provider abstraction layer supporting both Ollama (local) and Gemini (cloud)
- Chat API endpoint with conversation history persistence
- Frontend chat components with message display and state management
- Project management UI with sidebar, project switching, and localStorage persistence
- Topic confirmation workflow with project state transitions
- Unified persona system with 4 preset personas and selector UI

**Out of Scope:**
- Voice selection and TTS integration (Epic 2)
- Script generation with persona-driven delivery (Epic 2, uses persona from Epic 1)
- YouTube API integration and visual sourcing (Epic 3)
- Visual curation interface (Epic 4)
- Video assembly and export (Epic 5)
- Custom persona creation UI (Post-MVP)

## System Architecture Alignment

This epic directly implements the foundational architecture defined in the system architecture document:

- **Frontend Framework:** Next.js 15.5 with App Router provides React-based server components
- **State Management:** Zustand 5.0.8 for lightweight TypeScript-friendly state management
- **Database:** SQLite via better-sqlite3 12.4.1 for embedded single-user persistence
- **LLM Integration:** Dual-provider architecture with Ollama (primary, FOSS) and Gemini (optional, cloud)
- **Component Structure:** Feature-based organization under `components/features/conversation/` and `components/features/projects/`

**Architecture References:**
- Project Structure: `ai-video-generator/` directory layout
- API Layer: Next.js API Routes under `app/api/`
- Database Schema: `lib/db/schema.sql` with migrations
- LLM Provider Pattern: `lib/llm/` module structure

## Detailed Design

### Services and Modules

| Module | Responsibility | Inputs | Outputs | Owner |
|--------|---------------|--------|---------|-------|
| `lib/llm/provider.ts` | LLMProvider interface definition | N/A | TypeScript interface | Story 1.3 |
| `lib/llm/ollama-provider.ts` | Ollama LLM integration | System prompt, user message, history | AI response string | Story 1.3 |
| `lib/llm/gemini-provider.ts` | Gemini LLM integration | System prompt, user message, history | AI response string | Story 1.3 |
| `lib/llm/factory.ts` | Provider factory function | LLM_PROVIDER env var | LLMProvider instance | Story 1.3 |
| `lib/db/client.ts` | SQLite connection management | Database path | Database instance | Story 1.2 |
| `lib/db/queries.ts` | Database query functions | Various query parameters | Query results | Story 1.2 |
| `stores/conversation-store.ts` | Conversation state management | Messages, project context | State updates | Story 1.5 |
| `stores/project-store.ts` | Project list state management | Project data | State updates | Story 1.6 |
| `lib/db/migrations/012_system_prompts.ts` | System prompts table migration | N/A | Database schema | Story 1.8 |
| `lib/llm/prompts/preset-personas.ts` | Preset persona definitions | N/A | Persona configs | Story 1.8 |
| `components/features/persona/PersonaSelector.tsx` | Persona selection UI | SystemPrompt[] | Selected persona ID | Story 1.8 |
| `app/api/system-prompts/route.ts` | Get all system prompts | N/A | SystemPrompt[] | Story 1.8 |
| `app/api/projects/[id]/select-persona/route.ts` | Select persona for project | personaId | Updated project | Story 1.8 |

### Data Models and Contracts

**Projects Table:**
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))),
  name TEXT,
  topic TEXT,
  current_step TEXT DEFAULT 'chat' CHECK(current_step IN ('chat', 'voice', 'script', 'voiceover', 'visual-sourcing', 'visual-curation', 'downloading', 'assembly', 'export', 'complete')),
  system_prompt_id TEXT REFERENCES system_prompts(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_active TEXT DEFAULT (datetime('now'))
);
```

**Messages Table:**
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_messages_project_id ON messages(project_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
```

**System Prompts Table:**
```sql
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
```

**TypeScript Types:**
```typescript
interface Project {
  id: string;
  name: string | null;
  topic: string | null;
  current_step: 'chat' | 'voice' | 'script' | 'voiceover' | 'visual-sourcing' | 'visual-curation' | 'downloading' | 'assembly' | 'export' | 'complete';
  system_prompt_id: string | null;
  created_at: string;
  updated_at: string;
  last_active: string;
}

interface Message {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface SystemPrompt {
  id: string;
  name: string;
  prompt: string;
  description: string | null;
  category: string;
  is_preset: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface LLMProvider {
  chat(options: {
    systemPrompt: string;
    messages: { role: string; content: string }[];
  }): Promise<string>;
}
```

### APIs and Interfaces

**POST /api/chat**
- Request: `{ projectId: string, message: string }`
- Response: `{ messageId: string, response: string, timestamp: string }`
- Error: `{ error: string, code: 'OLLAMA_CONNECTION_ERROR' | 'GEMINI_API_ERROR' | 'PROJECT_NOT_FOUND' }`

**GET /api/projects**
- Response: `{ projects: Project[] }`

**POST /api/projects**
- Request: `{ name?: string }`
- Response: `{ project: Project }`

**GET /api/projects/[id]**
- Response: `{ project: Project, messages: Message[] }`

**PUT /api/projects/[id]**
- Request: `{ name?: string, topic?: string, current_step?: string }`
- Response: `{ project: Project }`

**DELETE /api/projects/[id]** (Optional)
- Response: `{ success: boolean }`

**POST /api/projects/[id]/select-persona**
- Request: `{ personaId: string }`
- Response: `{ project: Project }`

**GET /api/system-prompts**
- Response: `{ prompts: SystemPrompt[] }`

### Workflows and Sequencing

**Chat Flow:**
```
User types message
    ↓
POST /api/chat with { projectId, message }
    ↓
Save user message to database
    ↓
Load last 20 messages from database
    ↓
Load project's persona (system_prompt_id → system_prompts.prompt)
    ↓
Call LLM provider with persona + history + user message
    ↓
Save assistant response to database
    ↓
Return response to client
    ↓
Update Zustand store + UI
```

**Project Creation Flow:**
```
User clicks "New Chat"
    ↓
POST /api/projects
    ↓
Create project record (default name: null)
    ↓
Set as active project in Zustand store
    ↓
Save activeProjectId to localStorage
    ↓
Clear chat UI
    ↓
First user message → Auto-generate project name (first 30 chars)
```

**Topic Confirmation Flow:**
```
User issues video creation command (e.g., "make a video about X")
    ↓
AI extracts topic from conversation context
    ↓
Display TopicConfirmation dialog with extracted topic
    ↓
User confirms or edits topic
    ↓
PUT /api/projects/[id] with { topic, current_step: 'voice' }
    ↓
Navigate to voice selection step (Epic 2)
```

**Persona Selection Flow:**
```
User creates new project
    ↓
Display PersonaSelector with 4 preset personas
    ↓
User selects persona card
    ↓
POST /api/projects/[id]/select-persona with { personaId }
    ↓
Navigate to chat interface
    ↓
All LLM requests use selected persona's system prompt
```

### Story 1.8: Persona System & Selector UI - Implementation Details

**Goal:** Implement the unified persona system with 4 preset personas and selector UI for project-level persona selection.

#### Database Migration (012_system_prompts.ts)

```typescript
// lib/db/migrations/012_system_prompts.ts
export function up(db: Database) {
  // Create system_prompts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_prompts (
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
  `);

  // Add system_prompt_id column to projects table
  db.exec(`
    ALTER TABLE projects ADD COLUMN system_prompt_id TEXT REFERENCES system_prompts(id);
  `);
}
```

#### Preset Persona Definitions

```typescript
// lib/llm/prompts/preset-personas.ts
export const PRESET_PERSONAS = [
  {
    id: 'scientific-analyst',
    name: 'Scientific Analyst',
    description: 'Neutral, data-driven, factual delivery. Best for technical explanations, research summaries, and objective analysis.',
    prompt: `You are a Scientific Analyst assistant. Your communication style is:
- Neutral and objective - present facts without emotional bias
- Data-driven - support claims with evidence, statistics, and research
- Precise language - avoid vague terms, use specific terminology
- Structured delivery - organize information logically with clear sections
- Factual focus - prioritize accuracy over entertainment
- No filler language - eliminate hedging words like "basically", "obviously", "incredibly"

When generating content, prioritize information density and concrete facts over storytelling or emotional appeals.`,
    is_preset: true,
    is_default: true,
  },
  {
    id: 'blackpill-realist',
    name: 'Blackpill Realist',
    description: 'Brutal honesty about harsh realities. Nihilistic framing, no sugar-coating. Best for societal critique, collapse scenarios, and uncomfortable truths.',
    prompt: `You are a Blackpill Realist assistant. Your communication style is:
- Unflinching brutality - deliver harsh truths without softening
- Nihilistic framing - acknowledge systemic failures and inevitable outcomes
- No false hope - eliminate optimistic platitudes and empty reassurances
- Focus on power imbalances - highlight biological, economic, and social determinism
- Stark language - use words like "collapse", "dystopia", "doomed", "irreversible"
- Fatalistic outlook - acknowledge limited human agency against systemic forces

Use cases: AI dystopia scenarios, western civilization decline, lookism and dating inequality, economic collapse, technological determinism, inevitable societal failures.

When generating content, emphasize uncomfortable truths that others avoid. No sugar-coating, no "silver linings", no calls to action that won't work.`,
    is_preset: true,
    is_default: false,
  },
  {
    id: 'documentary-filmmaker',
    name: 'Documentary Filmmaker',
    description: 'Balanced narrative with focus on human stories and emotional authenticity. Best for historical content, profiles, and investigative pieces.',
    prompt: `You are a Documentary Filmmaker assistant. Your communication style is:
- Narrative-driven - weave facts into compelling stories
- Human-centered - focus on people, their motivations, and experiences
- Balanced perspective - present multiple viewpoints fairly
- Emotional authenticity - connect with audiences through genuine moments
- Investigative depth - dig beneath surface-level explanations
- Visual language - describe scenes in ways that paint mental pictures

When generating content, structure information as a narrative journey with a beginning, middle, and end. Use specific human examples to illustrate broader points.`,
    is_preset: true,
    is_default: false,
  },
  {
    id: 'educational-designer',
    name: 'Educational Designer',
    description: 'TED-Ed/Kurzgesagt style educational content. Learning-focused with accessible explanations and engaging delivery.',
    prompt: `You are an Educational Designer assistant. Your communication style is:
- Learning-focused - optimize for knowledge retention and understanding
- Accessible explanations - break complex topics into digestible pieces
- Engaging hooks - capture attention with surprising facts or questions
- Analogies and metaphors - connect new concepts to familiar ideas
- Progressive complexity - build from simple to advanced concepts
- Interactive tone - address the viewer directly, ask rhetorical questions

When generating content, follow the TED-Ed/Kurzgesagt formula: hook with a question, explain the fundamentals, explore the implications, and conclude with a memorable takeaway.`,
    is_preset: true,
    is_default: false,
  },
];
```

#### Seed Migration

```typescript
// lib/db/migrations/012_seed_preset_personas.ts
import { PRESET_PERSONAS } from '../../llm/prompts/preset-personas';

export function up(db: Database) {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO system_prompts (id, name, prompt, description, category, is_preset, is_default)
    VALUES (?, ?, ?, ?, 'preset', ?, ?)
  `);

  for (const persona of PRESET_PERSONAS) {
    insert.run(
      persona.id,
      persona.name,
      persona.prompt,
      persona.description,
      persona.is_preset ? 1 : 0,
      persona.is_default ? 1 : 0
    );
  }
}
```

#### PersonaSelector Component

```typescript
// components/features/persona/PersonaSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
}

interface PersonaSelectorProps {
  projectId: string;
  onSelect: (personaId: string) => void;
  initialPersonaId?: string;
}

export function PersonaSelector({ projectId, onSelect, initialPersonaId }: PersonaSelectorProps) {
  const [personas, setPersonas] = useState<SystemPrompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialPersonaId || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/system-prompts')
      .then(res => res.json())
      .then(data => {
        setPersonas(data.prompts);
        // Auto-select default if no initial selection
        if (!initialPersonaId) {
          const defaultPersona = data.prompts.find((p: SystemPrompt) => p.is_default);
          if (defaultPersona) setSelectedId(defaultPersona.id);
        }
        setLoading(false);
      });
  }, [initialPersonaId]);

  const handleSelect = async (personaId: string) => {
    setSelectedId(personaId);
  };

  const handleConfirm = async () => {
    if (!selectedId) return;

    await fetch(`/api/projects/${projectId}/select-persona`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId: selectedId }),
    });

    onSelect(selectedId);
  };

  if (loading) return <div>Loading personas...</div>;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose Your AI Persona</h2>
        <p className="text-muted-foreground">
          Select a persona to shape your AI assistant's personality and delivery style
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {personas.map((persona) => (
          <Card
            key={persona.id}
            className={`cursor-pointer transition-all ${
              selectedId === persona.id
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => handleSelect(persona.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{persona.name}</CardTitle>
                {selectedId === persona.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
              {persona.is_default && (
                <span className="text-xs bg-secondary px-2 py-0.5 rounded">Default</span>
              )}
            </CardHeader>
            <CardContent>
              <CardDescription>{persona.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button onClick={handleConfirm} disabled={!selectedId}>
          Continue with {personas.find(p => p.id === selectedId)?.name || 'Selected Persona'}
        </Button>
      </div>
    </div>
  );
}
```

#### API Endpoints

```typescript
// app/api/system-prompts/route.ts
import { NextResponse } from 'next/server';
import { getAllSystemPrompts } from '@/lib/db/queries';

export async function GET() {
  try {
    const prompts = getAllSystemPrompts();
    return NextResponse.json({ prompts });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch system prompts' }, { status: 500 });
  }
}
```

```typescript
// app/api/projects/[id]/select-persona/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateProjectPersona, getProjectById } from '@/lib/db/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { personaId } = await request.json();

    if (!personaId) {
      return NextResponse.json({ error: 'personaId is required' }, { status: 400 });
    }

    updateProjectPersona(params.id, personaId);
    const project = getProjectById(params.id);

    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update persona' }, { status: 500 });
  }
}
```

#### Database Query Functions

```typescript
// lib/db/queries.ts (additions)

export function getAllSystemPrompts(): SystemPrompt[] {
  return db.prepare(`
    SELECT * FROM system_prompts
    WHERE is_preset = 1
    ORDER BY is_default DESC, name ASC
  `).all() as SystemPrompt[];
}

export function getSystemPromptById(id: string): SystemPrompt | null {
  return db.prepare(`
    SELECT * FROM system_prompts WHERE id = ?
  `).get(id) as SystemPrompt | null;
}

export function getDefaultSystemPrompt(): SystemPrompt | null {
  return db.prepare(`
    SELECT * FROM system_prompts WHERE is_default = 1 LIMIT 1
  `).get() as SystemPrompt | null;
}

export function updateProjectPersona(projectId: string, personaId: string): void {
  db.prepare(`
    UPDATE projects SET system_prompt_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(personaId, projectId);
}

export function getProjectPersona(projectId: string): SystemPrompt | null {
  const project = getProjectById(projectId);
  if (!project?.system_prompt_id) {
    return getDefaultSystemPrompt();
  }
  return getSystemPromptById(project.system_prompt_id);
}
```

#### Chat API Integration

Update the chat API to use the project's selected persona:

```typescript
// app/api/chat/route.ts (modified excerpt)
import { getProjectPersona } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  const { projectId, message } = await request.json();

  // Load project's persona (or default)
  const persona = getProjectPersona(projectId);
  const systemPrompt = persona?.prompt || DEFAULT_SYSTEM_PROMPT;

  // Load conversation history
  const history = getMessagesByProjectId(projectId, 20);

  // Call LLM with persona
  const provider = createLLMProvider();
  const response = await provider.chat({
    systemPrompt,
    messages: [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ]
  });

  // ... save messages and return response
}
```

#### UI Integration Points

1. **After New Chat Creation:** Display PersonaSelector before first message
2. **Project Settings:** Allow changing persona via settings dialog
3. **Chat Header:** Display selected persona name/icon as indicator

## Non-Functional Requirements

### Performance

| Metric | Target | Source |
|--------|--------|--------|
| Chat response latency | < 5s for typical messages | PRD SC-5 (script in 30s implies chat faster) |
| LLM timeout | 10 seconds | Architecture: Scene Analysis timeout |
| Database query time | < 100ms | Local SQLite performance |
| Message history load | Last 20 messages | Architecture: conversation context limit |
| UI responsiveness | < 100ms interaction feedback | UX best practices |

### Security

- **API Keys:** LLM API keys (Gemini) stored in environment variables, never exposed to client
- **No Authentication:** Single-user local application, no auth required for MVP
- **Database:** SQLite file stored locally, no network exposure
- **Input Validation:** Sanitize user messages before storage (prevent SQL injection via parameterized queries)
- **Environment Variables:** `.env.local` git-ignored, validation at startup with clear error messages

### Reliability/Availability

- **LLM Fallback:** If Ollama unavailable, provide actionable error message with troubleshooting steps
- **Database Persistence:** SQLite with WAL mode for durability
- **Session Recovery:** Active project ID in localStorage survives browser refresh
- **Graceful Degradation:** UI remains functional even if LLM connection fails (can browse projects, read history)

### Observability

- **Console Logging:** All API requests and responses logged with timestamps
- **Error Logging:** LLM connection errors logged with context (provider, error type, retry count)
- **Performance Warnings:** Log warnings if LLM response exceeds 5 seconds
- **Debug Mode:** Verbose logging enabled via DEBUG environment variable

## Dependencies and Integrations

| Dependency | Version | Purpose | Install Command |
|------------|---------|---------|-----------------|
| next | 15.5.x | Frontend framework | `npx create-next-app@latest` |
| react | 19.x | UI library | (included with Next.js) |
| typescript | 5.x | Type safety | (included with Next.js) |
| tailwindcss | 4.x | Styling | (included with Next.js) |
| zustand | 5.0.8 | State management | `npm install zustand` |
| better-sqlite3 | 12.4.1 | SQLite database | `npm install better-sqlite3` |
| @types/better-sqlite3 | latest | TypeScript types | `npm install -D @types/better-sqlite3` |
| ollama | 0.6.2 | Ollama JavaScript SDK | `npm install ollama` |
| @google/generative-ai | 0.21.0 | Gemini JavaScript SDK | `npm install @google/generative-ai` |
| shadcn/ui | latest | UI components | `npx shadcn@latest init` |

**External Services:**
- Ollama Server: `http://localhost:11434` (local LLM runtime, primary)
- Google Gemini API: `generativelanguage.googleapis.com` (cloud LLM, optional)

**Environment Variables:**
```
# Required for Ollama (default)
OLLAMA_HOST=http://localhost:11434
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3.2

# Required for Gemini (alternative)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-2.5-flash
```

## Acceptance Criteria (Authoritative)

**AC1: Successful Brainstorming Interaction**
- Given a user initiates a conversation
- When the user proposes a broad topic (e.g., "I want to make a video about space exploration")
- Then the agent responds with clarifying questions or suggestions to narrow the focus

**AC2: Successful Command Trigger**
- Given the user has settled on a topic through conversation
- When the user issues the command "Okay, make a video about Mars colonization"
- Then the agent provides a confirmation message and awaits user approval

**AC3: Context-Aware Command**
- Given the user has been discussing "the benefits of intermittent fasting"
- When the user issues "Create the video now"
- Then the agent uses conversation context to confirm the topic

**AC4: Multiple Project Management**
- Given a user has created 3 projects
- When the user clicks on a project in the sidebar
- Then the chat interface loads only that project's conversation history

**AC5: Project Creation and Persistence**
- Given a user clicks "New Chat" and types their first message
- Then a new project is created, automatically named, appears in sidebar, and persists after refresh

**AC6: Persona Selection**
- Given a user creates or edits a project
- When they navigate to project settings
- Then they see a dropdown/cards with all 4 personas (Scientific Analyst, Blackpill Realist, Documentary Filmmaker, Educational Designer)

**AC7: Persona-Based Chat**
- Given a project has a selected persona
- When chat messages are sent
- Then the LLM uses the selected persona's system prompt for all responses

**AC8: Default Persona**
- Given a project with no persona selected
- Then Scientific Analyst (is_default = true) is used as the default persona

## Traceability Mapping

| Acceptance Criteria | Spec Section | Component(s)/API(s) | Test Idea |
|---------------------|--------------|---------------------|-----------|
| AC1: Brainstorming | Detailed Design - Chat Flow | POST /api/chat, ChatInterface.tsx | Send broad topic, verify clarifying response |
| AC2: Command Trigger | Detailed Design - Topic Confirmation | TopicConfirmation.tsx | Issue "make video about X", verify confirmation dialog |
| AC3: Context-Aware | Detailed Design - Chat Flow | POST /api/chat, LLM provider | Discuss topic, issue generic command, verify topic extraction |
| AC4: Multiple Projects | Detailed Design - Project Creation | ProjectSidebar.tsx, project-store.ts | Create 3 projects, switch between, verify isolation |
| AC5: Project Persistence | Detailed Design - Project Creation | POST /api/projects, localStorage | Create project, refresh, verify persists |
| AC6: Persona Selection | Detailed Design - Persona Selection | PersonaSelector.tsx, GET /api/system-prompts | Load selector, verify 4 preset personas displayed |
| AC7: Persona-Based Chat | Detailed Design - Chat Flow | POST /api/chat, lib/llm/provider.ts | Select Blackpill persona, verify response tone |
| AC8: Default Persona | Data Models - system_prompts | lib/db/queries.ts | No persona selected, verify Scientific Analyst used |

## Risks, Assumptions, Open Questions

**Risks:**
- **Risk:** Ollama not installed or running on user's machine → User cannot use chat
  - Mitigation: Clear error message with installation instructions, support Gemini as fallback
- **Risk:** Gemini API rate limiting (15 req/min) may throttle heavy usage
  - Mitigation: Implement request queuing and user-facing rate limit warnings
- **Risk:** Large conversation histories may slow LLM responses
  - Mitigation: Limit context to last 20 messages, implement conversation summarization (post-MVP)

**Assumptions:**
- User has Node.js 18+ installed
- User has either Ollama running locally OR a valid Gemini API key
- Browser supports localStorage for session persistence
- Single-user local deployment (no concurrent users)

**Open Questions:**
- Q1: Should persona selection be mandatory before first message, or can users skip?
  - Decision: Allow skip, default to Scientific Analyst
- Q2: Maximum project name length for auto-generation?
  - Decision: 30 characters, trimmed to last complete word

## Test Strategy Summary

**Test Levels:**
1. **Unit Tests:** LLM provider factory, database queries, state store actions
2. **Integration Tests:** Chat API endpoint with mocked LLM, project CRUD operations
3. **E2E Tests:** Full conversation flow, project switching, persona selection

**Testing Frameworks:**
- Vitest for unit and integration tests
- React Testing Library for component tests
- Playwright for E2E tests (optional for MVP)

**Coverage Targets:**
- LLM Provider: 90% branch coverage for error handling paths
- Database Queries: 100% function coverage
- API Routes: All success and error paths tested

**Edge Cases:**
- Empty message handling
- LLM connection timeout
- Invalid project ID
- Missing persona (default fallback)
- LocalStorage unavailable
- Concurrent project updates
