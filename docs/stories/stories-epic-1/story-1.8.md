# Story 1.8: Persona System & Selector UI

**Epic:** 1 - Conversational Topic Discovery
**Story ID:** 1.8
**Status:** done
**Priority:** Medium
**Created:** 2025-11-28
**Implements:** AC6, AC7, AC8 from Epic Tech Spec

---

## User Story

**As a** video creator,
**I want** to select from different AI personas before starting my conversation,
**So that** the AI assistant's tone and delivery style matches my video's intended audience and purpose.

---

## Description

This story implements the unified persona system with 4 preset personas and a selector UI for project-level persona selection. The personas shape the AI's personality and delivery style throughout the entire content creation workflow (chat brainstorming and script generation).

**Available Personas:**
1. **Scientific Analyst** (Default) - Neutral, data-driven, factual delivery
2. **Blackpill Realist** - Brutal honesty about harsh realities, nihilistic framing
3. **Documentary Filmmaker** - Balanced narrative with human stories and emotional authenticity
4. **Educational Designer** - TED-Ed/Kurzgesagt style, learning-focused with accessible explanations

The persona selection happens when creating a new project. If skipped, the default persona (Scientific Analyst) is used.

---

## Acceptance Criteria

### AC1: Persona Selector Display
**Given** a user creates a new project or clicks "New Chat"
**When** the persona selection screen appears
**Then** all 4 preset personas display as selectable cards with name and description

### AC2: Persona Card Selection
**Given** the PersonaSelector is displayed
**When** user clicks on a persona card
**Then** that card shows visual selection indicator (ring/border) and the others are deselected

### AC3: Default Persona Pre-Selection
**Given** the PersonaSelector loads
**When** no persona was previously selected
**Then** Scientific Analyst (is_default = true) is pre-selected

### AC4: Persona Confirmation
**Given** user has selected a persona
**When** they click "Continue" button
**Then** the selected persona is saved to the project and user navigates to chat interface

### AC5: Persona-Based Chat
**Given** a project has a selected persona
**When** chat messages are sent via /api/chat
**Then** the LLM uses the selected persona's system prompt for all responses

### AC6: System Prompts API
**Given** the frontend needs to display personas
**When** GET /api/system-prompts is called
**Then** response returns array of all preset personas with id, name, description, is_default

### AC7: Select Persona API
**Given** user confirms persona selection
**When** POST /api/projects/[id]/select-persona is called with personaId
**Then** project.system_prompt_id is updated and project data is returned

### AC8: Skip Persona Selection
**Given** user wants to skip persona selection
**When** they navigate directly to chat (via URL) without selecting
**Then** Scientific Analyst persona is used as default

### AC9: Chat Header Persona Indicator
**Given** a project has a selected persona
**When** the chat interface loads
**Then** the selected persona name is displayed in the header area

### AC10: Database Migration
**Given** the application starts
**When** database initialization runs
**Then** 4 preset personas are seeded into system_prompts table

---

## Technical Implementation

### Architecture

```
src/app/
├── page.tsx                              # Modified: Add persona selection flow
├── api/
│   ├── system-prompts/
│   │   └── route.ts                      # New: GET all system prompts
│   └── projects/[id]/
│       └── select-persona/
│           └── route.ts                  # New: POST select persona

src/components/features/persona/
├── PersonaSelector.tsx                   # New: Main persona selection component
└── PersonaCard.tsx                       # New: Individual persona card

src/lib/db/
├── migrations/
│   └── 012_seed_preset_personas.ts       # New: Seed 4 preset personas
└── queries.ts                            # Modified: Add persona query functions

src/lib/llm/prompts/
└── preset-personas.ts                    # New: Preset persona definitions
```

### Key Components

#### 1. Preset Persona Definitions

```typescript
// src/lib/llm/prompts/preset-personas.ts
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

#### 2. Database Migration

```typescript
// src/lib/db/migrations/012_seed_preset_personas.ts
import type Database from 'better-sqlite3';
import { PRESET_PERSONAS } from '../../llm/prompts/preset-personas';

export const id = 12;
export const name = 'seed_preset_personas';

export function up(db: Database.Database): void {
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

export function down(db: Database.Database): void {
  db.prepare(`DELETE FROM system_prompts WHERE is_preset = 1`).run();
}
```

#### 3. PersonaSelector Component

```typescript
// src/components/features/persona/PersonaSelector.tsx
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/system-prompts')
      .then(res => res.json())
      .then(data => {
        setPersonas(data.prompts);
        if (!initialPersonaId) {
          const defaultPersona = data.prompts.find((p: SystemPrompt) => p.is_default);
          if (defaultPersona) setSelectedId(defaultPersona.id);
        }
        setLoading(false);
      });
  }, [initialPersonaId]);

  const handleSelect = (personaId: string) => {
    setSelectedId(personaId);
  };

  const handleConfirm = async () => {
    if (!selectedId) return;
    setSubmitting(true);

    await fetch(`/api/projects/${projectId}/select-persona`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId: selectedId }),
    });

    onSelect(selectedId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading personas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose Your AI Persona</h2>
        <p className="text-muted-foreground mt-2">
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
                <span className="text-xs bg-secondary px-2 py-0.5 rounded w-fit">Default</span>
              )}
            </CardHeader>
            <CardContent>
              <CardDescription>{persona.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button onClick={handleConfirm} disabled={!selectedId || submitting}>
          {submitting ? 'Saving...' : `Continue with ${personas.find(p => p.id === selectedId)?.name || 'Selected Persona'}`}
        </Button>
      </div>
    </div>
  );
}
```

#### 4. System Prompts API

```typescript
// src/app/api/system-prompts/route.ts
import { NextResponse } from 'next/server';
import { getPresetSystemPrompts } from '@/lib/db/queries';

export async function GET() {
  try {
    const prompts = getPresetSystemPrompts();
    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('[system-prompts] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system prompts' },
      { status: 500 }
    );
  }
}
```

#### 5. Select Persona API

```typescript
// src/app/api/projects/[id]/select-persona/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateProject, getProject } from '@/lib/db/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { personaId } = await request.json();

    if (!personaId) {
      return NextResponse.json(
        { error: 'personaId is required' },
        { status: 400 }
      );
    }

    updateProject(projectId, { system_prompt_id: personaId });
    const project = getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('[select-persona] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update persona' },
      { status: 500 }
    );
  }
}
```

#### 6. Updated Chat API (to use project persona)

The chat API at `src/app/api/chat/route.ts` needs to be modified to:
1. Look up the project's `system_prompt_id`
2. Fetch the corresponding system prompt from `system_prompts` table
3. Use that prompt instead of the hardcoded `DEFAULT_SYSTEM_PROMPT`

```typescript
// Changes to src/app/api/chat/route.ts

// Add new imports
import { getProject, getSystemPromptById, getDefaultSystemPrompt } from '@/lib/db/queries';

// In the POST handler, after verifying project exists:
// STEP 2.5: Get project's persona system prompt
let systemPrompt = DEFAULT_SYSTEM_PROMPT;
try {
  const projectData = getProject(projectId);
  if (projectData?.system_prompt_id) {
    const persona = getSystemPromptById(projectData.system_prompt_id);
    if (persona) {
      systemPrompt = persona.prompt;
    }
  } else {
    // Fallback to default persona if none selected
    const defaultPersona = getDefaultSystemPrompt();
    if (defaultPersona) {
      systemPrompt = defaultPersona.prompt;
    }
  }
} catch (error) {
  console.warn('Could not load project persona, using default:', error);
}

// Then use systemPrompt in the messages array instead of DEFAULT_SYSTEM_PROMPT
const messages = [
  { role: 'system' as const, content: systemPrompt },
  ...conversationHistory,
  { role: 'user' as const, content: message }
];
```

#### 7. Database Query Functions

```typescript
// Additions to src/lib/db/queries.ts

/**
 * Get all preset system prompts (for PersonaSelector UI)
 */
export function getPresetSystemPrompts(): SystemPrompt[] {
  try {
    const stmt = db.prepare(`
      SELECT id, name, description, is_default
      FROM system_prompts
      WHERE is_preset = 1
      ORDER BY is_default DESC, name ASC
    `);
    return stmt.all() as SystemPrompt[];
  } catch (error) {
    console.error('Error fetching preset system prompts:', error);
    throw new Error(
      `Failed to fetch preset system prompts: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get system prompt by ID
 */
export function getSystemPromptById(id: string): SystemPrompt | null {
  try {
    const stmt = db.prepare('SELECT * FROM system_prompts WHERE id = ?');
    return (stmt.get(id) as SystemPrompt) || null;
  } catch (error) {
    console.error('Error fetching system prompt by ID:', error);
    throw new Error(
      `Failed to fetch system prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
```

---

## Tasks

### Task 1: Create Preset Personas Definition File

**Subtasks:**
1.1. Create `src/lib/llm/prompts/preset-personas.ts`
1.2. Define PRESET_PERSONAS array with 4 personas
1.3. Include id, name, description, prompt, is_preset, is_default for each
1.4. Mark Scientific Analyst as is_default: true

**Acceptance:** File exists with all 4 personas properly defined

---

### Task 2: Create Database Migration for Seeding Personas

**Subtasks:**
2.1. Create `src/lib/db/migrations/012_seed_preset_personas.ts`
2.2. Import PRESET_PERSONAS from preset-personas.ts
2.3. Insert all 4 personas using INSERT OR REPLACE
2.4. Add down() function to remove preset personas
2.5. Verify migration runs on app startup

**Acceptance:** 4 rows exist in system_prompts table after migration

---

### Task 3: Add Query Functions for System Prompts

**Subtasks:**
3.1. Add getPresetSystemPrompts() to queries.ts
3.2. Add getSystemPromptById() to queries.ts
3.3. Ensure existing getDefaultSystemPrompt() works correctly

**Acceptance:** All query functions return expected data

---

### Task 4: Create System Prompts API Endpoint

**Subtasks:**
4.1. Create directory `src/app/api/system-prompts/`
4.2. Create `route.ts` with GET handler
4.3. Return { prompts: SystemPrompt[] }
4.4. Handle errors with 500 response

**Acceptance:** GET /api/system-prompts returns 4 preset personas

---

### Task 5: Create Select Persona API Endpoint

**Subtasks:**
5.1. Create directory `src/app/api/projects/[id]/select-persona/`
5.2. Create `route.ts` with POST handler
5.3. Accept { personaId: string } in request body
5.4. Update project's system_prompt_id
5.5. Return updated project data

**Acceptance:** POST updates project and returns updated data

---

### Task 6: Create PersonaSelector Component

**Subtasks:**
6.1. Create directory `src/components/features/persona/`
6.2. Create `PersonaSelector.tsx` component
6.3. Fetch personas from /api/system-prompts on mount
6.4. Display 4 personas as clickable cards
6.5. Show selection indicator (ring/checkmark)
6.6. Pre-select default persona
6.7. Add "Continue" button that calls select-persona API
6.8. Call onSelect callback after successful save

**Acceptance:** Component renders, allows selection, saves correctly

---

### Task 7: Update Home Page for Persona Selection Flow

**Subtasks:**
7.1. Add state for showPersonaSelector
7.2. Show PersonaSelector when creating new project
7.3. After persona selection, show ChatInterface
7.4. Pass projectId to PersonaSelector
7.5. Handle onSelect to transition to chat

**Acceptance:** New projects go through persona selection

---

### Task 8: Update Chat API to Use Project Persona

**Subtasks:**
8.1. Import getProject, getSystemPromptById from queries
8.2. After project verification, load project's system_prompt_id
8.3. Fetch system prompt from database
8.4. Use persona prompt instead of DEFAULT_SYSTEM_PROMPT
8.5. Fallback to default persona if none selected

**Acceptance:** Chat responses reflect selected persona's style

---

### Task 9: Add Persona Indicator to Chat Header

**Subtasks:**
9.1. Pass selected persona name to ChatInterface
9.2. Display persona name in header area
9.3. Style as subtle indicator (e.g., badge or text)

**Acceptance:** Users can see which persona is active

---

### Task 10: Build Verification and Testing

**Subtasks:**
10.1. Run npm run build - verify no errors
10.2. Test persona selection flow end-to-end
10.3. Verify all 4 personas display correctly
10.4. Verify default persona pre-selection
10.5. Verify chat responses match persona style
10.6. Test skip scenario (direct URL navigation)

**Acceptance:** Build passes, all flows work correctly

---

## Dev Notes

### Existing Infrastructure

The following already exists:
- `system_prompts` table in schema.sql
- `system_prompt_id` column on projects table
- `SystemPrompt` interface in queries.ts
- `getSystemPrompts()` and `getDefaultSystemPrompt()` query functions
- `createSystemPrompt()` function

**What needs to be added:**
- Migration to seed the 4 preset personas
- `getPresetSystemPrompts()` function (filtered for UI display)
- `getSystemPromptById()` function
- API endpoints
- PersonaSelector component
- Home page flow integration
- Chat API persona integration

### Critical Implementation Notes

1. **Migration Order:** The 012_seed_preset_personas migration must run after schema.sql creates the system_prompts table

2. **Persona Prompt Length:** Each persona's prompt is ~500-800 chars. This is well within LLM context limits.

3. **Default Handling:** If a project has no system_prompt_id, fall back to the default persona (is_default = true), not the hardcoded DEFAULT_SYSTEM_PROMPT

4. **UI Flow:** The persona selection should feel like a natural first step, not a blocker. Consider allowing skip via "Continue with default" option.

5. **Persona Persistence:** Once selected, the persona stays with the project. Changing personas mid-conversation could cause tone inconsistency.

---

## Test Scenarios

### Positive Tests

1. **Persona Fetch:** GET /api/system-prompts returns 4 personas
2. **Persona Selection:** Clicking card updates visual state
3. **Default Pre-Selection:** Scientific Analyst is pre-selected
4. **Save Persona:** POST updates project correctly
5. **Chat with Persona:** Responses match selected persona's style

### Edge Cases

1. **No Personas in DB:** Handle empty prompts array gracefully
2. **Invalid Persona ID:** POST with non-existent ID fails gracefully
3. **Missing Project:** POST to non-existent project returns 404
4. **Network Error:** Frontend handles fetch failures

### Integration Tests

1. **Full Flow:** New project → select persona → chat → verify tone
2. **Skip Flow:** Navigate to chat URL → uses default persona
3. **Persona Indicator:** Header shows correct persona name

---

## Definition of Done

- [ ] All acceptance criteria met and tested
- [ ] 4 preset personas defined in preset-personas.ts
- [ ] Migration seeds personas into system_prompts table
- [ ] GET /api/system-prompts returns all preset personas
- [ ] POST /api/projects/[id]/select-persona updates project
- [ ] PersonaSelector component renders and allows selection
- [ ] Default persona pre-selected on load
- [ ] Home page integrates persona selection flow
- [ ] Chat API uses project's selected persona
- [ ] Persona indicator shows in chat header
- [ ] Build passes without errors
- [ ] End-to-end flow tested manually

---

## References

- Epic 1 Tech Spec: Story 1.8 Implementation Details
- Architecture Document: System Prompts & LLM Persona Configuration
- PRD: Persona System requirements
- Existing code: `src/lib/db/queries.ts`, `src/lib/db/schema.sql`
