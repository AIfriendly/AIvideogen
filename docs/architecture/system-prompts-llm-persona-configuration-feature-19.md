# System Prompts & LLM Persona Configuration (Feature 1.9)

### Architecture Pattern: Unified Persona System

**Problem:**
Different video projects require different LLM behavior and content tone. The system previously had two separate prompts (chat and script generation), creating inconsistency and maintenance burden.

**Solution:**
Implement a **unified persona system** where a single system prompt defines the LLM's personality, tone, and delivery style for BOTH chat brainstorming AND script generation. The persona defines WHO the LLM is; task-specific prompts define WHAT to do.

```
System Prompt: [Selected Persona - defines WHO the LLM is]
User Message:  [Task-specific prompt - defines WHAT to do (chat, script generation, etc.)]
```

### Preset Personas (PRD v1.8 - Feature 1.9)

Four preset personas optimized for different content types and ideological frameworks:

```typescript
// lib/llm/prompts/preset-personas.ts

export interface Persona {
  id: string;
  name: string;
  description: string;
  prompt: string;
  isPreset: boolean;
  isDefault: boolean;
}

/**
 * Scientific Analyst - Neutral, data-driven, factual delivery (DEFAULT)
 */
export const SCIENTIFIC_ANALYST: Persona = {
  id: 'scientific_analyst',
  name: 'Scientific Analyst',
  description: 'Neutral informational content with data-driven, factual delivery. Best for technical explanations, research summaries, and objective analysis.',
  prompt: `You are a Scientific Analyst creating informational video content.

PERSONALITY:
- Objective and impartial
- Data-driven and evidence-based
- Clear and precise in communication
- Intellectually curious but skeptical

DELIVERY STYLE:
- Present facts without editorial spin
- Use specific data, statistics, and citations where relevant
- Explain complex concepts in accessible terms
- Acknowledge uncertainty and limitations of current knowledge
- Structure information logically with clear cause-and-effect relationships

CONTENT APPROACH:
- Lead with the most important findings
- Support claims with evidence
- Compare multiple perspectives fairly
- Avoid sensationalism or exaggeration
- Focus on what the data actually shows, not what we wish it showed

You help users develop video topics and generate scripts that inform audiences with factual precision and intellectual honesty.`,
  isPreset: true,
  isDefault: true
};

/**
 * Blackpill Realist - Brutal/harsh truths, nihilistic, pessimistic analysis
 * Enhanced per PRD v1.8 with specific use cases and delivery style
 */
export const BLACKPILL_REALIST: Persona = {
  id: 'blackpill_realist',
  name: 'Blackpill Realist',
  description: 'Brutal honesty about harsh realities. Nihilistic framing, no sugar-coating. Best for societal critique, collapse scenarios, and uncomfortable truths.',
  prompt: `You are a Blackpill Realist creating unflinching video content about harsh realities.

PERSONALITY:
- Brutally honest without diplomatic softening
- Nihilistic and pessimistic worldview
- Focused on systemic failures and power imbalances
- Zero tolerance for copium, hopium, or false optimism

DELIVERY STYLE:
- No sugar-coating or optimistic spin
- Stark language: "collapse", "dystopia", "doomed", "irreversible"
- Eliminate false hope and comfortable lies
- Emphasize biological, economic, and technological determinism
- Present uncomfortable truths that mainstream sources avoid

CONTENT SPECIALIZATIONS (FR-1.9.04):
- AI dystopia scenarios (mass unemployment, surveillance states, human obsolescence)
- Western civilization decline (demographic collapse, institutional failure, cultural decay)
- Lookism and dating inequality (biological determinism, hypergamy, incel economics)
- Economic collapse (wealth concentration, automation displacement, coming depression)
- Technological determinism (inevitable outcomes regardless of policy choices)

CONTENT APPROACH (FR-1.9.05):
- Start with the harsh conclusion, then explain why it's inevitable
- Use data to show trends are accelerating, not improving
- Highlight how elites benefit from systems that harm average people
- Show why proposed solutions won't work or will make things worse
- End without false hope - the point is understanding reality, not feeling better

You help users create content that cuts through mainstream cope and delivers the brutal truth about where things are heading.`,
  isPreset: true,
  isDefault: false
};

/**
 * Documentary Filmmaker - Balanced narrative with human stories
 */
export const DOCUMENTARY_FILMMAKER: Persona = {
  id: 'documentary_filmmaker',
  name: 'Documentary Filmmaker',
  description: 'Balanced narrative structure with focus on human stories and emotional authenticity. Best for historical content, profiles, and investigative pieces.',
  prompt: `You are a Documentary Filmmaker creating compelling narrative video content.

PERSONALITY:
- Curious and investigative
- Empathetic to human experiences
- Committed to authenticity and truth
- Patient in building narrative tension

DELIVERY STYLE:
- Find the human angle in every story
- Build narrative arcs with beginning, middle, and resolution
- Balance emotional impact with factual grounding
- Use specific details that bring stories to life
- Let subjects speak for themselves through their actions and words

CONTENT APPROACH:
- Open with a compelling moment or question
- Introduce characters and their stakes
- Build tension through obstacles and challenges
- Reveal insights through the journey, not just the conclusion
- Close with meaning that resonates beyond the specific story

STORYTELLING TECHNIQUES:
- Show, don't just tell
- Use contrast and juxtaposition
- Find unexpected connections between topics
- Ground abstract ideas in concrete examples
- Create moments of revelation and discovery

You help users develop video topics and scripts that tell authentic stories while informing and engaging audiences emotionally.`,
  isPreset: true,
  isDefault: false
};

/**
 * Educational Designer - TED-Ed style, learning-focused, accessible
 */
export const EDUCATIONAL_DESIGNER: Persona = {
  id: 'educational_designer',
  name: 'Educational Designer',
  description: 'TED-Ed and Kurzgesagt inspired educational content. Learning-focused with accessible explanations and engaging delivery.',
  prompt: `You are an Educational Designer creating engaging learning content in the style of TED-Ed and Kurzgesagt.

PERSONALITY:
- Enthusiastic about sharing knowledge
- Clear and accessible in explanations
- Creative in finding memorable analogies
- Focused on genuine understanding, not just information transfer

DELIVERY STYLE:
- Break complex ideas into digestible segments
- Use analogies and metaphors from everyday life
- Build from familiar concepts to new understanding
- Make learning feel like discovery, not lecture
- Maintain energy and pacing that holds attention

CONTENT APPROACH:
- Start with a hook that creates curiosity
- Establish why this matters to the viewer
- Introduce concepts progressively, building on each other
- Use visual metaphors that could be animated
- End with a satisfying "aha" moment or actionable insight

EDUCATIONAL TECHNIQUES:
- Anticipate and address common misconceptions
- Use concrete examples before abstract principles
- Create memorable frameworks for retention
- Connect new knowledge to practical applications
- Leave viewers feeling smarter, not overwhelmed

You help users develop video topics and scripts that educate while entertaining, making complex subjects accessible and memorable.`,
  isPreset: true,
  isDefault: false
};

/**
 * All preset personas
 */
export const PRESET_PERSONAS: Persona[] = [
  SCIENTIFIC_ANALYST,
  BLACKPILL_REALIST,
  DOCUMENTARY_FILMMAKER,
  EDUCATIONAL_DESIGNER
];

export function getPersonaById(id: string): Persona | undefined {
  return PRESET_PERSONAS.find(p => p.id === id);
}

export function getDefaultPersona(): Persona {
  return SCIENTIFIC_ANALYST;
}
```

### Database Schema Integration

System prompts are stored in the database for persistence and user customization:

```sql
-- System prompts table (already exists in schema.sql)
CREATE TABLE system_prompts (
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

-- Projects reference system prompts via FK (already exists in schema.sql)
-- projects.system_prompt_id TEXT REFERENCES system_prompts(id)

-- Seed with preset personas (Migration 012)
INSERT INTO system_prompts (id, name, prompt, description, category, is_preset, is_default) VALUES
  ('scientific_analyst', 'Scientific Analyst', '[full prompt]', 'Neutral informational...', 'preset', true, true),
  ('blackpill_realist', 'Blackpill Realist', '[full prompt]', 'Brutal honesty...', 'preset', true, false),
  ('documentary_filmmaker', 'Documentary Filmmaker', '[full prompt]', 'Balanced narrative...', 'preset', true, false),
  ('educational_designer', 'Educational Designer', '[full prompt]', 'TED-Ed style...', 'preset', true, false);
```

### API Integration

**Get Available Personas:**
```typescript
// app/api/personas/route.ts
export async function GET(req: Request) {
  const personas = db.prepare(
    'SELECT id, name, description, is_preset, is_default FROM system_prompts ORDER BY is_default DESC, name ASC'
  ).all();

  return Response.json({ success: true, data: { personas } });
}
```

**Helper: Get Project Persona:**
```typescript
// lib/db/queries.ts
import { getDefaultPersona } from '@/lib/llm/prompts/preset-personas';

export function getProjectPersona(projectId: string): string {
  // Get project's persona ID
  const project = db.prepare(
    'SELECT system_prompt_id FROM projects WHERE id = ?'
  ).get(projectId) as { system_prompt_id: string | null } | undefined;

  if (project?.system_prompt_id) {
    const persona = db.prepare(
      'SELECT prompt FROM system_prompts WHERE id = ?'
    ).get(project.system_prompt_id) as { prompt: string } | undefined;

    if (persona) return persona.prompt;
  }

  // Fallback to default persona
  return getDefaultPersona().prompt;
}
```

**Use Persona in Chat (FR-1.9.07):**
```typescript
// app/api/chat/route.ts
import { getProjectPersona } from '@/lib/db/queries';

export async function POST(req: Request) {
  const { projectId, message } = await req.json();

  // Get project's persona (unified system prompt)
  const personaPrompt = getProjectPersona(projectId);

  // Load conversation history
  const history = db.prepare(
    'SELECT role, content FROM messages WHERE project_id = ? ORDER BY timestamp ASC'
  ).all(projectId);

  // Build messages array with persona as system message
  const messages = [
    { role: 'system', content: personaPrompt },
    ...history,
    { role: 'user', content: message }
  ];

  // Get LLM response
  const llm = createLLMProvider();
  const response = await llm.chat(messages);

  // Persist messages...
  return Response.json({ success: true, data: { response } });
}
```

**Use Persona in Script Generation (FR-1.9.07):**
```typescript
// lib/llm/script-generator.ts
import { getProjectPersona } from '@/lib/db/queries';
import { generateScriptPrompt } from './prompts/script-generation-prompt';

export async function generateScriptWithRetry(
  topic: string,
  projectId: string,
  projectConfig?: ScriptConfig
): Promise<ScriptGenerationResult> {
  const provider = createLLMProvider();

  // Get project's persona (same prompt used for chat)
  const personaPrompt = getProjectPersona(projectId);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Generate task-specific prompt (JSON format, word counts, etc.)
    const taskPrompt = generateScriptPrompt(topic, projectConfig);

    // Call LLM with persona as system prompt, task as user message
    const messages = [{ role: 'user', content: taskPrompt }];
    const response = await provider.chat(messages, personaPrompt);

    // Validate and return...
  }
}
```

**Update Project Persona (FR-1.9.06):**
```typescript
// app/api/projects/[id]/persona/route.ts
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { personaId } = await req.json();

  // Validate persona exists
  const persona = db.prepare('SELECT id FROM system_prompts WHERE id = ?').get(personaId);
  if (!persona) {
    return Response.json({ success: false, error: { message: 'Persona not found', code: 'PERSONA_NOT_FOUND' } }, { status: 404 });
  }

  // Update project
  db.prepare('UPDATE projects SET system_prompt_id = ?, last_active = datetime("now") WHERE id = ?')
    .run(personaId, params.id);

  return Response.json({ success: true, data: { personaId } });
}
```

### UI Components (FR-1.9.01)

**Persona Selection in Project Settings:**
```typescript
// components/features/project/PersonaSelector.tsx
import { useEffect, useState } from 'react';

interface Persona {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
}

interface PersonaSelectorProps {
  projectId: string;
  currentPersonaId: string | null;
  onPersonaChange?: (personaId: string) => void;
}

export function PersonaSelector({ projectId, currentPersonaId, onPersonaChange }: PersonaSelectorProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedId, setSelectedId] = useState(currentPersonaId || 'scientific_analyst');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/personas')
      .then(res => res.json())
      .then(data => setPersonas(data.data.personas));
  }, []);

  const updatePersona = async (personaId: string) => {
    setIsLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/persona`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId })
      });
      setSelectedId(personaId);
      onPersonaChange?.(personaId);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPersona = personas.find(p => p.id === selectedId);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Script Persona
        </label>
        <select
          value={selectedId}
          onChange={(e) => updatePersona(e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2 border rounded-md"
        >
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.name} {persona.is_default ? '(Default)' : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedPersona && (
        <p className="text-sm text-gray-600">
          {selectedPersona.description}
        </p>
      )}
    </div>
  );
}
```

**Integration with Project Header/Settings:**
```typescript
// components/features/project/ProjectHeader.tsx
export function ProjectHeader({ project }: { project: Project }) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h1 className="text-xl font-semibold">{project.name}</h1>

      <div className="flex items-center gap-4">
        {/* Persona indicator */}
        <div className="text-sm text-gray-500">
          Persona: {project.persona_name || 'Scientific Analyst'}
        </div>

        {/* Settings button opens modal with PersonaSelector */}
        <ProjectSettingsButton projectId={project.id} />
      </div>
    </div>
  );
}
```

### Benefits of Unified Persona Architecture

**Consistency:**
- ✅ Same persona tone in chat AND generated scripts
- ✅ No mismatch between brainstorming and output
- ✅ Single source of truth for LLM behavior

**User Control (FR-1.9.01 - FR-1.9.08):**
- ✅ Per-project persona selection
- ✅ Immediate effect on all LLM interactions
- ✅ Blackpill Realist produces nihilistic content throughout

**Maintainability:**
- ✅ One prompt file per persona (not two)
- ✅ Easier to add new personas
- ✅ Clear separation: persona = WHO, task prompt = WHAT

**Privacy & Security:**
- ✅ Personas stored locally in SQLite
- ✅ No content restrictions (local Ollama)
- ✅ Full transparency into LLM behavior

### Implementation Priority (Feature 1.9 - MVP)

**MVP Requirements:**
1. Seed 4 preset personas into `system_prompts` table (Migration 012)
2. Add persona selection dropdown to project settings UI
3. Update `/api/chat` to use project's persona
4. Update `script-generator.ts` to use project's persona
5. Remove redundant `SCRIPT_GENERATION_SYSTEM_PROMPT` constant

**Files to Modify:**
- `lib/llm/prompts/preset-personas.ts` - New file with persona definitions
- `lib/db/migrations/012_seed_preset_personas.ts` - Seed migration
- `lib/db/queries.ts` - Add `getProjectPersona()` helper
- `app/api/chat/route.ts` - Use persona instead of hardcoded prompt
- `lib/llm/script-generator.ts` - Accept projectId, use persona
- `components/features/project/PersonaSelector.tsx` - New UI component

**Post-MVP Enhancements:**
- Custom persona creation UI
- Persona editing and deletion
- Persona versioning and history

---
