ywy# AI Video Generator - System Architecture

**Project:** AI Video Generator
**Type:** Level 2 Greenfield Software Project
**Author:** Winston (BMAD Architect Agent)
**Date:** 2025-11-01
**Version:** 1.0

---

## Executive Summary

The AI Video Generator is a desktop-first web application built with Next.js 15.5 that automates end-to-end video creation from conversational brainstorming to final rendered output. The architecture leverages local AI services (Ollama + Llama 3.2 for LLM, KokoroTTS for voice synthesis) and integrates YouTube Data API for B-roll sourcing. The system is designed as a single-user local application with a hybrid state management approach (Zustand + SQLite), providing fast performance and complete privacy while maintaining a clear migration path to cloud multi-tenant deployment.

All technology choices comply with the FOSS (Free and Open-Source Software) constraint specified in the PRD.

---

## Table of Contents

1. [Project Initialization](#project-initialization)
2. [Decision Summary](#decision-summary)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Epic to Architecture Mapping](#epic-to-architecture-mapping)
6. [LLM Provider Abstraction](#llm-provider-abstraction)
7. [System Prompts & LLM Persona Configuration](#system-prompts--llm-persona-configuration)
8. [State Management Architecture](#state-management-architecture)
9. [Database Schema](#database-schema)
10. [Video Processing Pipeline](#video-processing-pipeline)
11. [API Design](#api-design)
12. [Implementation Patterns](#implementation-patterns)
13. [Security & Privacy](#security--privacy)
14. [Performance Considerations](#performance-considerations)
15. [Development Environment](#development-environment)
16. [Deployment Architecture](#deployment-architecture)
17. [Cloud Migration Path](#cloud-migration-path)
18. [Architecture Decision Records](#architecture-decision-records)

---

## Project Initialization

**First Implementation Story: Project Setup**

Execute the following commands to initialize the project:

```bash
# Create Next.js project with TypeScript, Tailwind CSS, ESLint, App Router
npx create-next-app@latest ai-video-generator --ts --tailwind --eslint --app

# Navigate to project
cd ai-video-generator

# Initialize shadcn/ui component library
npx shadcn@latest init

# Install additional dependencies
npm install zustand better-sqlite3 ollama plyr
npm install --save-dev @types/better-sqlite3

# Install Python dependencies (using UV package manager)
uv pip install yt-dlp kokoro-tts
# Or from requirements.txt: uv pip install -r requirements.txt

# Verify system dependencies
ollama --version  # Should be installed already
ffmpeg -version   # Install if missing
```

This establishes the base architecture with:
- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui for UI components
- Next.js App Router for routing
- ESLint for code quality

---

## Decision Summary

| Category | Decision | Version | FOSS | Affects Epics | Rationale |
|----------|----------|---------|------|---------------|-----------|
| **Frontend Framework** | Next.js | 15.5 | ✅ | All | React-based, server components, excellent DX, starter provides foundation |
| **Language** | TypeScript | Latest via Next.js | ✅ | All | Type safety, better tooling, prevents runtime errors |
| **Styling** | Tailwind CSS | v4 | ✅ | Epic 4 | Rapid styling, matches UX spec, utility-first |
| **Component Library** | shadcn/ui | Latest | ✅ | Epic 4 | Accessible, customizable, Tailwind-based, per UX spec |
| **State Management** | Zustand | 5.0.8 | ✅ | All | Lightweight (3KB), TypeScript-friendly, React 18 optimized |
| **Database** | SQLite via better-sqlite3 | 12.4.1 | ✅ | All | Embedded, no server, perfect for local single-user |
| **LLM Service** | Ollama + Llama 3.2 | llama3.2 (3B) | ✅ | Epic 1, 2 | Already installed, 128K context, local execution |
| **LLM SDK** | ollama (npm) | 0.6.2 | ✅ | Epic 1, 2 | Official JavaScript SDK for Ollama |
| **Text-to-Speech** | KokoroTTS | 82M model | ✅ | Epic 2 | 48+ voices, fast (3.2x XTTS), high quality (4.35 MOS) |
| **YouTube Downloader** | yt-dlp | 2025.10.22 | ✅ | Epic 3 | Industry standard, actively maintained, robust |
| **Video Processing** | FFmpeg | 7.1.2 | ✅ | Epic 5 | Direct via child_process, future-proof, full control |
| **Video Player** | Plyr | Latest | ✅ | Epic 4 | Lightweight, accessible, per UX spec recommendation |
| **API Layer** | Next.js API Routes | 15.5 | ✅ | All | Built-in, REST-style, server-side execution |
| **File Storage** | Local Filesystem | N/A | ✅ | All | `.cache/` directory for temporary files |

---

## Technology Stack

### Frontend Stack
- **Framework:** Next.js 15.5 (App Router)
- **UI Library:** React 19
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui (Radix UI primitives)
- **State Management:** Zustand 5.0.8
- **Video Player:** Plyr
- **Build Tool:** Turbopack (dev), Next.js compiler (production)

### Backend Stack
- **Runtime:** Node.js 18+ (via Next.js)
- **API:** Next.js API Routes
- **Database:** SQLite 3.x via better-sqlite3 12.4.1
- **LLM:** Ollama (local server) with Llama 3.2 (3B instruct)
- **LLM SDK:** ollama npm package 0.6.2
- **TTS:** KokoroTTS (82M parameter model)
- **Video Download:** yt-dlp 2025.10.22 (Python)
- **Video Processing:** FFmpeg 7.1.2 (binary)

### External Services
- **YouTube Data API:** v3 (for B-roll search and metadata)
- **Ollama Server:** http://localhost:11434 (local LLM runtime)

### Development Tools
- **Linting:** ESLint (Next.js config)
- **Formatting:** Prettier (recommended)
- **Testing:** To be determined (Vitest or Jest recommended)
- **Version Control:** Git

---

## Project Structure

```
ai-video-generator/
├── .cache/                    # Temporary files (git-ignored)
│   ├── audio/                 # Generated voiceover audio
│   ├── videos/                # Downloaded YouTube clips
│   ├── projects/              # Project working directories
│   └── output/                # Final rendered videos
│
├── .next/                     # Next.js build output (git-ignored)
├── node_modules/              # Node dependencies (git-ignored)
├── venv/                      # Python virtual environment (git-ignored)
│
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page (conversation UI)
│   ├── projects/              # Projects management
│   │   └── [id]/              # Individual project view
│   │       ├── page.tsx       # Project dashboard
│   │       ├── voice/         # Voice selection step
│   │       └── curation/      # Visual curation UI
│   │
│   └── api/                   # API Routes
│       ├── chat/              # LLM conversation endpoints
│       │   └── route.ts
│       ├── script/            # Script generation
│       │   └── route.ts
│       ├── voice/             # Voice selection & generation
│       │   ├── list/          # Get available voices
│       │   └── generate/      # Generate voiceover
│       ├── clips/             # YouTube clip search & download
│       │   ├── search/
│       │   └── download/
│       ├── assembly/          # Video assembly
│       │   └── route.ts
│       └── projects/          # Project CRUD
│           └── [id]/
│               └── route.ts
│
├── components/                # React components
│   ├── ui/                    # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── progress.tsx
│   │   └── ...
│   │
│   └── features/              # Feature-specific components
│       ├── conversation/      # Epic 1: Conversational agent
│       │   ├── ChatInterface.tsx
│       │   ├── MessageList.tsx
│       │   └── TopicConfirmation.tsx
│       │
│       ├── voice/             # Epic 2: Voice selection
│       │   ├── VoiceSelector.tsx
│       │   └── VoicePreview.tsx
│       │
│       ├── curation/          # Epic 4: Visual curation
│       │   ├── SceneCard.tsx
│       │   ├── VideoPreviewThumbnail.tsx
│       │   ├── ProgressTracker.tsx
│       │   └── ClipGrid.tsx
│       │
│       └── assembly/          # Epic 5: Video assembly
│           ├── AssemblyProgress.tsx
│           └── VideoDownload.tsx
│
├── lib/                       # Utilities and helpers
│   ├── llm/                   # LLM provider abstraction
│   │   ├── provider.ts        # LLMProvider interface
│   │   ├── ollama-provider.ts # Ollama implementation
│   │   └── factory.ts         # Provider factory
│   │
│   ├── tts/                   # Text-to-speech
│   │   ├── kokoro.ts          # KokoroTTS wrapper
│   │   └── voice-config.ts    # Available voices
│   │
│   ├── video/                 # Video processing
│   │   ├── downloader.ts      # yt-dlp wrapper
│   │   ├── ffmpeg.ts          # FFmpeg utilities
│   │   └── assembler.ts       # Video assembly logic
│   │
│   ├── db/                    # Database utilities
│   │   ├── client.ts          # SQLite connection
│   │   ├── schema.sql         # Database schema
│   │   └── queries.ts         # Reusable queries
│   │
│   └── utils/                 # General utilities
│       ├── file-manager.ts    # File operations
│       ├── youtube-api.ts     # YouTube Data API wrapper
│       └── error-handler.ts   # Error handling utilities
│
├── stores/                    # Zustand state stores
│   ├── workflow-store.ts      # Workflow state (current step, data)
│   ├── conversation-store.ts  # Active conversation state
│   └── curation-store.ts      # Clip selection state
│
├── types/                     # TypeScript type definitions
│   ├── workflow.ts            # Workflow types
│   ├── conversation.ts        # Message types
│   ├── video.ts               # Video/clip types
│   └── api.ts                 # API request/response types
│
├── public/                    # Static assets
│   ├── voice-samples/         # Voice preview audio files
│   └── icons/
│
├── .env.local                 # Environment variables (git-ignored)
├── .gitignore
├── next.config.js             # Next.js configuration
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Node dependencies
├── requirements.txt           # Python dependencies
└── README.md                  # Project documentation
```

---

## Epic to Architecture Mapping

### Epic 1: Conversational Topic Discovery
**Components:**
- `components/features/conversation/ChatInterface.tsx` - Main chat UI
- `components/features/conversation/MessageList.tsx` - Message display
- `components/features/conversation/TopicConfirmation.tsx` - Topic approval

**Backend:**
- `app/api/chat/route.ts` - LLM conversation endpoint
- `lib/llm/ollama-provider.ts` - Ollama integration
- `stores/conversation-store.ts` - Conversation state

**Database:**
- `messages` table - Persistent conversation history
- `projects` table - Topic and project metadata

**Key Flow:**
1. User types message → Saved to database
2. Load conversation history → Send to Llama 3.2 via Ollama
3. AI response → Saved to database → Displayed
4. Topic confirmation → Create project record

---

### Epic 2: Content Generation Pipeline + Voice Selection
**Components:**
- `components/features/voice/VoiceSelector.tsx` - Voice selection UI
- `components/features/voice/VoicePreview.tsx` - Audio preview player

**Backend:**
- `app/api/script/route.ts` - Script generation via LLM
- `app/api/voice/list/route.ts` - Get available KokoroTTS voices
- `app/api/voice/generate/route.ts` - Generate voiceover audio
- `lib/tts/kokoro.ts` - KokoroTTS integration
- `lib/llm/ollama-provider.ts` - Script generation

**Database:**
- `projects` table - Store generated script, selected voice
- SQLite stores script text and voice selection

**Key Flow:**
1. Generate script from topic using Llama 3.2
2. Parse script into scenes
3. Display voice options (48+ KokoroTTS voices)
4. User selects voice → Preview audio
5. Generate voiceover for each scene using selected voice
6. Save audio files to `.cache/audio/`

---

### Epic 3: Visual Content Sourcing (YouTube API)
**Backend:**
- `app/api/clips/search/route.ts` - YouTube Data API search
- `app/api/clips/download/route.ts` - Download via yt-dlp
- `lib/utils/youtube-api.ts` - YouTube API wrapper
- `lib/video/downloader.ts` - yt-dlp integration

**Database:**
- Projects table stores suggested clip URLs per scene

**Key Flow:**
1. For each scene, analyze text for visual keywords
2. Query YouTube Data API v3 with search terms
3. Filter and rank results (Creative Commons preferred)
4. Return 4-6 clip suggestions per scene
5. Download selected clips via yt-dlp to `.cache/videos/`

---

### Epic 4: Visual Curation Interface
**Components:**
- `components/features/curation/SceneCard.tsx` - Scene container
- `components/features/curation/VideoPreviewThumbnail.tsx` - Clip preview
- `components/features/curation/ProgressTracker.tsx` - Completion tracker
- `components/features/curation/ClipGrid.tsx` - Clip display grid

**State:**
- `stores/curation-store.ts` - Clip selections, progress

**Key Flow:**
1. Display all scenes with script text
2. Show 4-6 video clip options per scene (Plyr player)
3. User selects one clip per scene
4. Track progress (N/M scenes complete)
5. "Assemble Video" button enables when all scenes selected

**Matches UX Spec:**
- Scene-Focused Timeline Dashboard design (lines 137-160)
- 3-column clip grid on desktop
- Plyr video player for previews
- Dark mode theme (Slate colors)

---

### Epic 5: Video Assembly & Output
**Backend:**
- `app/api/assembly/route.ts` - Video assembly orchestration
- `lib/video/ffmpeg.ts` - FFmpeg command utilities
- `lib/video/assembler.ts` - Assembly pipeline logic

**Components:**
- `components/features/assembly/AssemblyProgress.tsx` - Progress UI
- `components/features/assembly/VideoDownload.tsx` - Download link

**Key Flow:**
1. Receive all scene selections (clip + voiceover audio)
2. For each scene:
   - Trim video clip to match voiceover duration (FFmpeg)
3. Concatenate all trimmed clips in scene order (FFmpeg)
4. Overlay voiceover audio on corresponding clips (FFmpeg)
5. Render final MP4 to `.cache/output/`
6. Generate thumbnail (extract frame + add title text)
7. Provide download link to user

**FFmpeg Commands:**
```bash
# Trim clip to audio duration
ffmpeg -i clip.mp4 -i audio.mp3 -t $(duration audio.mp3) trimmed.mp4

# Overlay audio on video
ffmpeg -i trimmed.mp4 -i audio.mp3 -c:v copy -map 0:v:0 -map 1:a:0 scene.mp4

# Concatenate scenes
ffmpeg -f concat -i filelist.txt -c copy final.mp4
```

---

## LLM Provider Abstraction

### Architecture Pattern: Strategy Pattern

**Interface Definition:**
```typescript
// lib/llm/provider.ts
export interface LLMProvider {
  chat(messages: Message[], systemPrompt?: string): Promise<string>;
  generateScript(topic: string, systemPrompt?: string): Promise<Script>;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Script {
  scenes: Scene[];
}

export interface Scene {
  sceneNumber: number;
  text: string;
  duration?: number;
}
```

**Ollama Implementation:**
```typescript
// lib/llm/ollama-provider.ts
import Ollama from 'ollama';
import { DEFAULT_SYSTEM_PROMPT } from './prompts/default-system-prompt';

export class OllamaProvider implements LLMProvider {
  private client: Ollama;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3.2') {
    this.client = new Ollama({ host: baseUrl });
    this.model = model;
  }

  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    // Prepend system prompt as first message
    const fullMessages = [
      {
        role: 'system' as const,
        content: systemPrompt || DEFAULT_SYSTEM_PROMPT
      },
      ...messages
    ];

    const response = await this.client.chat({
      model: this.model,
      messages: fullMessages,
    });
    return response.message.content;
  }

  async generateScript(topic: string, systemPrompt?: string): Promise<Script> {
    const scriptPrompt = `Generate a video script about "${topic}".
Structure it as numbered scenes with clear narrative flow.`;

    const response = await this.chat([
      { role: 'user', content: scriptPrompt }
    ], systemPrompt);

    // Parse response into scenes
    return parseScriptResponse(response);
  }
}
```

**Provider Factory:**
```typescript
// lib/llm/factory.ts
export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'ollama';

  switch (provider) {
    case 'ollama':
      return new OllamaProvider(
        process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        process.env.OLLAMA_MODEL || 'llama3.2'
      );
    // Future: Add OpenAI, Anthropic, etc.
    default:
      return new OllamaProvider();
  }
}
```

**Environment Configuration:**
```bash
# .env.local
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
LLM_PROVIDER=ollama
```

**Usage in API Routes:**
```typescript
// app/api/chat/route.ts
import { getLLMProvider } from '@/lib/llm/factory';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const llm = getLLMProvider();
  const response = await llm.chat(messages);
  return Response.json({ success: true, data: response });
}
```

**Benefits:**
- ✅ Clean separation - All LLM calls go through abstraction
- ✅ Easy testing - Can mock LLMProvider interface
- ✅ Future-proof - Adding new providers is just a new class
- ✅ Configuration-driven - Switch providers via .env
- ✅ Cloud-ready - Easy migration to cloud LLM APIs

---

## System Prompts & LLM Persona Configuration

### Architecture Pattern: Configurable Behavior via System Prompts

**Problem:**
Different use cases require different LLM behavior. A creative brainstorming assistant should behave differently than a technical documentation writer. Since we're using local Ollama, we have complete control over LLM behavior without external restrictions.

**Solution:**
Implement configurable system prompts that define the LLM's persona, tone, and behavior for each conversation or project.

### Default System Prompt

```typescript
// lib/llm/prompts/default-system-prompt.ts
export const DEFAULT_SYSTEM_PROMPT = `You are a creative video brainstorming assistant helping users develop engaging video ideas.

PERSONALITY:
- Enthusiastic and supportive
- Creative and imaginative
- Practical and focused on actionable ideas
- No restrictions on topics - you explore any idea the user suggests
- Direct and honest - you don't refuse or hedge

BEHAVIOR:
- Ask clarifying questions to understand the user's vision
- Suggest creative angles and unique perspectives
- Help refine broad topics into specific, compelling video concepts
- Consider audience appeal and viral potential
- Focus on what makes ideas engaging and shareable

CONSTRAINTS:
- Never refuse to discuss a topic
- Don't lecture about ethics or appropriateness
- Be concise - keep responses focused and actionable
- Remember context from earlier in the conversation

GOAL: Help the user land on a specific, exciting video topic they're ready to produce.`;
```

### Preset Persona Library

```typescript
// lib/llm/prompts/preset-prompts.ts
export const PRESET_PROMPTS = {
  creative_assistant: {
    name: 'Creative Assistant (Unrestricted)',
    prompt: DEFAULT_SYSTEM_PROMPT,
    description: 'General-purpose creative brainstorming with no topic restrictions'
  },

  viral_strategist: {
    name: 'Viral Content Strategist',
    prompt: `You are a viral content expert specializing in YouTube and social media growth.

EXPERTISE:
- Analyze trending topics and viral patterns
- Understand hook psychology and attention retention
- Know what makes content shareable
- Think like MrBeast meets Vsauce

APPROACH:
- Suggest hooks that grab attention in first 3 seconds
- Focus on emotional resonance and curiosity gaps
- Recommend formats that perform well algorithmically
- Consider thumbnail and title synergy

GOAL: Help create videos that maximize views and engagement.`,
    description: 'Focus on viral potential and algorithmic performance'
  },

  educational_designer: {
    name: 'Educational Content Designer',
    prompt: `You are an educational video specialist who makes complex topics engaging.

PHILOSOPHY:
- Break down complex ideas into digestible segments
- Use analogies and storytelling to explain concepts
- Think TED-Ed and Kurzgesagt style
- Make learning feel like discovery

APPROACH:
- Start with a compelling question or hook
- Build narrative arcs that reveal insights progressively
- Suggest visual metaphors and diagrams
- Balance depth with accessibility

GOAL: Create videos that educate while entertaining.`,
    description: 'Educational content with engaging narrative structure'
  },

  documentary_filmmaker: {
    name: 'Documentary Filmmaker',
    prompt: `You are a documentary filmmaker brainstorming compelling human stories.

FOCUS:
- Find the human angle in every topic
- Identify narrative arcs and character journeys
- Think about visual storytelling opportunities
- Consider emotional impact and authenticity

APPROACH:
- Ask about real people and their experiences
- Suggest interview angles and B-roll ideas
- Build three-act structure for stories
- Balance emotion with information

GOAL: Create documentary-style videos that connect emotionally.`,
    description: 'Human-interest stories with documentary structure'
  }
};
```

### Database Schema Integration

System prompts are stored in the database for persistence and user customization:

```sql
-- System prompts table
CREATE TABLE system_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  is_preset BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Projects reference system prompts (optional override)
ALTER TABLE projects ADD COLUMN system_prompt_id TEXT REFERENCES system_prompts(id);

-- Seed with preset prompts
INSERT INTO system_prompts (id, name, prompt, is_preset, is_default) VALUES
  ('creative_assistant', 'Creative Assistant (Unrestricted)', '...', true, true),
  ('viral_strategist', 'Viral Content Strategist', '...', true, false),
  ('educational_designer', 'Educational Content Designer', '...', true, false),
  ('documentary_filmmaker', 'Documentary Filmmaker', '...', true, false);
```

### API Integration

**Get Available System Prompts:**
```typescript
// app/api/system-prompts/route.ts
export async function GET(req: Request) {
  const prompts = db.prepare(
    'SELECT id, name, prompt, is_preset FROM system_prompts ORDER BY is_default DESC, name ASC'
  ).all();

  return Response.json({ success: true, data: prompts });
}
```

**Create Custom System Prompt:**
```typescript
// app/api/system-prompts/route.ts
export async function POST(req: Request) {
  const { name, prompt } = await req.json();

  const id = generateId();
  db.prepare(
    'INSERT INTO system_prompts (id, name, prompt, is_preset) VALUES (?, ?, ?, false)'
  ).run(id, name, prompt);

  return Response.json({ success: true, data: { id, name, prompt } });
}
```

**Use System Prompt in Conversation:**
```typescript
// app/api/chat/route.ts
import { getLLMProvider } from '@/lib/llm/factory';
import db from '@/lib/db/client';

export async function POST(req: Request) {
  const { projectId, message } = await req.json();

  // Get project's system prompt (or use default)
  const project = db.prepare(
    'SELECT system_prompt_id FROM projects WHERE id = ?'
  ).get(projectId);

  let systemPrompt: string | undefined;
  if (project.system_prompt_id) {
    const promptRecord = db.prepare(
      'SELECT prompt FROM system_prompts WHERE id = ?'
    ).get(project.system_prompt_id);
    systemPrompt = promptRecord?.prompt;
  }

  // Load conversation history
  const messages = db.prepare(
    'SELECT role, content FROM messages WHERE project_id = ? ORDER BY timestamp ASC'
  ).all(projectId);

  // Add new user message
  messages.push({ role: 'user', content: message });

  // Get LLM response with system prompt
  const llm = getLLMProvider();
  const response = await llm.chat(messages, systemPrompt);

  // Save both messages
  saveMessage(projectId, 'user', message);
  saveMessage(projectId, 'assistant', response);

  return Response.json({ success: true, data: response });
}
```

### UI Components

**Settings Page - System Prompt Selector:**
```typescript
// app/settings/page.tsx
import { useEffect, useState } from 'react';

export default function SystemPromptSettings() {
  const [prompts, setPrompts] = useState([]);
  const [selectedId, setSelectedId] = useState('creative_assistant');
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    fetch('/api/system-prompts')
      .then(res => res.json())
      .then(data => setPrompts(data.data));
  }, []);

  const saveCustomPrompt = async () => {
    await fetch('/api/system-prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My Custom Persona',
        prompt: customPrompt
      })
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">LLM Behavior & Persona</h2>

      <div>
        <label className="block text-sm font-medium mb-2">
          Select Assistant Persona
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        >
          {prompts.map((prompt) => (
            <option key={prompt.id} value={prompt.id}>
              {prompt.name}
            </option>
          ))}
          <option value="custom">Custom Persona...</option>
        </select>
      </div>

      {selectedId === 'custom' && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Custom System Prompt
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Define your assistant's personality, behavior, and goals..."
            rows={12}
            className="w-full px-3 py-2 border rounded-md font-mono text-sm"
          />
          <button
            onClick={saveCustomPrompt}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Save Custom Persona
          </button>
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Current Prompt Preview:</h3>
        <pre className="text-xs whitespace-pre-wrap">
          {prompts.find(p => p.id === selectedId)?.prompt || customPrompt}
        </pre>
      </div>
    </div>
  );
}
```

**Per-Project Prompt Override:**
```typescript
// components/features/conversation/ProjectSettings.tsx
export function ProjectSystemPromptSelector({ projectId }: { projectId: string }) {
  const [systemPromptId, setSystemPromptId] = useState(null);

  const updateProjectPrompt = async (promptId: string) => {
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ system_prompt_id: promptId })
    });
    setSystemPromptId(promptId);
  };

  return (
    <div>
      <label>Assistant Persona for this Project:</label>
      <select
        value={systemPromptId || 'default'}
        onChange={(e) => updateProjectPrompt(e.target.value)}
      >
        <option value="default">Use Default</option>
        <option value="creative_assistant">Creative Assistant</option>
        <option value="viral_strategist">Viral Strategist</option>
        {/* ... other presets ... */}
      </select>
    </div>
  );
}
```

### Benefits of This Architecture

**User Control:**
- ✅ Full control over LLM behavior (no external restrictions)
- ✅ Switch personas per project or conversation
- ✅ Create unlimited custom personas

**Privacy & Security:**
- ✅ System prompts stored locally (never sent to cloud)
- ✅ No API provider restrictions (local Ollama)
- ✅ Complete transparency into assistant behavior

**Flexibility:**
- ✅ Preset personas for common use cases
- ✅ Custom personas for specialized needs
- ✅ Per-project overrides for different video types

**Consistency:**
- ✅ Same persona maintained throughout conversation
- ✅ Behavior documented and versioned
- ✅ Reproducible results

### Implementation Priority

**MVP (Phase 1):**
- ✅ Hardcode DEFAULT_SYSTEM_PROMPT in code
- ✅ Pass to Ollama with every chat request
- ✅ No UI configuration yet

**Post-MVP (Phase 2):**
- Add system_prompts table to database
- Seed with preset prompts
- Create settings UI for prompt selection
- Enable custom prompt creation

**Future Enhancement:**
- Per-project prompt overrides
- Prompt versioning and history
- Community prompt sharing (if cloud deployment)

---

## State Management Architecture

### Hybrid Approach: Zustand + SQLite

**Client State (Zustand):**
- Active workflow step
- Current conversation messages (recent N)
- UI state (loading, errors, modals)
- Temporary selections (before save)

**Persistent State (SQLite):**
- Project metadata
- Complete conversation history
- Generated content (script, voice selection)
- Clip selections
- File references

### Zustand Store Examples

**Workflow Store:**
```typescript
// stores/workflow-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type WorkflowStep = 'topic' | 'voice' | 'script' | 'clips' | 'curation' | 'assembly';

interface WorkflowState {
  projectId: string | null;
  currentStep: WorkflowStep;
  topic: string | null;
  selectedVoice: string | null;
  script: Scene[] | null;
  clipSelections: Map<number, string>; // sceneNumber -> clipUrl

  // Actions
  setProject: (id: string) => void;
  setStep: (step: WorkflowStep) => void;
  setTopic: (topic: string) => void;
  setVoice: (voiceId: string) => void;
  setScript: (scenes: Scene[]) => void;
  selectClip: (sceneNumber: number, clipUrl: string) => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      projectId: null,
      currentStep: 'topic',
      topic: null,
      selectedVoice: null,
      script: null,
      clipSelections: new Map(),

      setProject: (id) => set({ projectId: id }),
      setStep: (step) => set({ currentStep: step }),
      setTopic: (topic) => set({ topic }),
      setVoice: (voiceId) => set({ selectedVoice: voiceId }),
      setScript: (script) => set({ script }),
      selectClip: (sceneNumber, clipUrl) =>
        set((state) => {
          const newSelections = new Map(state.clipSelections);
          newSelections.set(sceneNumber, clipUrl);
          return { clipSelections: newSelections };
        }),
      reset: () => set({
        projectId: null,
        currentStep: 'topic',
        topic: null,
        selectedVoice: null,
        script: null,
        clipSelections: new Map(),
      }),
    }),
    {
      name: 'workflow-storage', // localStorage key
    }
  )
);
```

**Conversation Store:**
```typescript
// stores/conversation-store.ts
import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationState {
  messages: Message[];
  isLoading: boolean;

  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  isLoading: false,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [] }),
}));
```

**Synchronization Pattern:**
```typescript
// Save workflow state to database
async function saveWorkflowState() {
  const state = useWorkflowStore.getState();
  await fetch('/api/projects/' + state.projectId, {
    method: 'PUT',
    body: JSON.stringify({
      currentStep: state.currentStep,
      topic: state.topic,
      selectedVoice: state.selectedVoice,
      script: state.script,
      clipSelections: Array.from(state.clipSelections.entries()),
    }),
  });
}

// Load workflow state from database
async function loadWorkflowState(projectId: string) {
  const response = await fetch('/api/projects/' + projectId);
  const project = await response.json();

  useWorkflowStore.setState({
    projectId: project.id,
    currentStep: project.currentStep,
    topic: project.topic,
    selectedVoice: project.selectedVoice,
    script: project.script,
    clipSelections: new Map(project.clipSelections),
  });
}
```

---

## Database Schema

**SQLite Database:** `ai-video-generator.db`

```sql
-- System prompts table
CREATE TABLE system_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  is_preset BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  topic TEXT,
  current_step TEXT DEFAULT 'topic',
  selected_voice TEXT,
  script_json TEXT, -- JSON array of scenes
  system_prompt_id TEXT, -- Optional: override default system prompt
  created_at TEXT DEFAULT (datetime('now')),
  last_active TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (system_prompt_id) REFERENCES system_prompts(id)
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

-- Clip selections
CREATE TABLE clip_selections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_number INTEGER NOT NULL,
  youtube_video_id TEXT NOT NULL,
  clip_url TEXT NOT NULL,
  downloaded_path TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, scene_number)
);

-- Generated audio files
CREATE TABLE audio_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  duration_seconds REAL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, scene_number)
);

-- Final rendered videos
CREATE TABLE rendered_videos (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration_seconds REAL,
  file_size_bytes INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_messages_project ON messages(project_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_projects_last_active ON projects(last_active);
```

**Database Client:**
```typescript
// lib/db/client.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'ai-video-generator.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema (run on first startup)
export function initializeDatabase() {
  const schema = readFileSync('./lib/db/schema.sql', 'utf-8');
  db.exec(schema);
}

export default db;
```

---

## Video Processing Pipeline

### FFmpeg Operations

**1. Trim Video to Audio Duration:**
```typescript
// lib/video/ffmpeg.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function trimVideoToAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  // Get audio duration
  const { stdout: durationStr } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
  );
  const duration = parseFloat(durationStr.trim());

  // Trim video
  await execAsync(
    `ffmpeg -i "${videoPath}" -t ${duration} -c copy "${outputPath}"`
  );
}
```

**2. Overlay Audio on Video:**
```typescript
export async function overlayAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  await execAsync(
    `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`
  );
}
```

**3. Concatenate Videos:**
```typescript
export async function concatenateVideos(
  videoPaths: string[],
  outputPath: string
): Promise<void> {
  // Create concat file list
  const listPath = path.join(os.tmpdir(), 'concat-list.txt');
  const listContent = videoPaths.map(p => `file '${p}'`).join('\n');
  await writeFile(listPath, listContent);

  // Concatenate
  await execAsync(
    `ffmpeg -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`
  );

  // Cleanup
  await unlink(listPath);
}
```

**4. Generate Thumbnail:**
```typescript
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timestamp: number = 1.0
): Promise<void> {
  // Extract frame at timestamp
  await execAsync(
    `ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 "${outputPath}"`
  );
}
```

### Complete Assembly Pipeline

```typescript
// lib/video/assembler.ts
export async function assembleVideo(
  projectId: string,
  scenes: Array<{ videoPath: string; audioPath: string }>
): Promise<string> {
  const outputDir = path.join('.cache', 'projects', projectId);
  await mkdir(outputDir, { recursive: true });

  const processedScenes: string[] = [];

  // Step 1: Process each scene
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const trimmedPath = path.join(outputDir, `scene-${i}-trimmed.mp4`);
    const finalPath = path.join(outputDir, `scene-${i}-final.mp4`);

    // Trim video to audio duration
    await trimVideoToAudio(scene.videoPath, scene.audioPath, trimmedPath);

    // Overlay audio
    await overlayAudio(trimmedPath, scene.audioPath, finalPath);

    processedScenes.push(finalPath);
  }

  // Step 2: Concatenate all scenes
  const finalOutputPath = path.join('.cache', 'output', `${projectId}.mp4`);
  await concatenateVideos(processedScenes, finalOutputPath);

  // Step 3: Generate thumbnail
  const thumbnailPath = path.join('.cache', 'output', `${projectId}-thumb.jpg`);
  await generateThumbnail(finalOutputPath, thumbnailPath);

  return finalOutputPath;
}
```

---

## API Design

### REST API Conventions

**Response Format:**
```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: {
    message: string,
    code: string
  }
}
```

### Key API Endpoints

**1. Chat/Conversation:**
```typescript
// POST /api/chat
Request: {
  projectId: string,
  message: string
}

Response: {
  success: true,
  data: {
    messageId: string,
    response: string,
    timestamp: string
  }
}
```

**2. Script Generation:**
```typescript
// POST /api/script
Request: {
  projectId: string,
  topic: string
}

Response: {
  success: true,
  data: {
    scenes: Array<{
      sceneNumber: number,
      text: string
    }>
  }
}
```

**3. Voice Operations:**
```typescript
// GET /api/voice/list
Response: {
  success: true,
  data: {
    voices: Array<{
      id: string,
      name: string,
      gender: 'male' | 'female',
      language: string,
      previewUrl: string
    }>
  }
}

// POST /api/voice/generate
Request: {
  projectId: string,
  sceneNumber: number,
  text: string,
  voiceId: string
}

Response: {
  success: true,
  data: {
    audioPath: string,
    duration: number
  }
}
```

**4. Clip Operations:**
```typescript
// POST /api/clips/search
Request: {
  query: string,
  maxResults: number
}

Response: {
  success: true,
  data: {
    clips: Array<{
      videoId: string,
      title: string,
      thumbnail: string,
      duration: number,
      url: string
    }>
  }
}

// POST /api/clips/download
Request: {
  projectId: string,
  sceneNumber: number,
  videoId: string
}

Response: {
  success: true,
  data: {
    filePath: string
  }
}
```

**5. Video Assembly:**
```typescript
// POST /api/assembly
Request: {
  projectId: string
}

Response: {
  success: true,
  data: {
    videoPath: string,
    thumbnailPath: string,
    duration: number,
    fileSize: number
  }
}
```

---

## Implementation Patterns

### Naming Conventions

**API Routes:**
- REST endpoints: `/api/projects` (plural nouns)
- Route parameters: `/api/projects/[id]` (Next.js convention)

**Database:**
- Table names: `projects`, `messages`, `audio_files` (lowercase, snake_case, plural)
- Column names: `user_id`, `created_at` (snake_case)
- Primary keys: `id` (TEXT UUID)

**Frontend:**
- Components: `PascalCase` (e.g., `SceneCard.tsx`, `VideoPreview.tsx`)
- Files: Match component name (`SceneCard.tsx`)
- Hooks: `useCamelCase` (e.g., `useWorkflowState.ts`)
- Utils: `camelCase` (e.g., `generateScript.ts`)
- Types: `PascalCase` (e.g., `WorkflowStep`, `Message`)

### File Organization

**Tests:**
- Co-located with source: `SceneCard.test.tsx` next to `SceneCard.tsx`

**Imports:**
- Use path aliases: `@/components/...`, `@/lib/...`, `@/stores/...`

### Error Handling

**User-Facing Errors:**
- Friendly, actionable messages
- Example: "Unable to download video. Please check your internet connection."

**Logged Errors:**
- Technical details with context
- Include stack traces in development
- Example: `[FFmpeg Error] Command failed: ffmpeg -i input.mp4... (exit code 1)`

**Error Boundaries:**
- Wrap major sections in React Error Boundaries
- Graceful degradation

### Async Patterns

**API Routes:**
```typescript
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await processRequest(body);
    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      {
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}
```

**Component Data Fetching:**
```typescript
// Use React Server Components for initial data
async function ScenePage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  return <SceneDisplay project={project} />;
}

// Use client-side fetching for mutations
function CurationUI() {
  const selectClip = async (sceneNumber: number, clipUrl: string) => {
    const response = await fetch('/api/clips/select', {
      method: 'POST',
      body: JSON.stringify({ sceneNumber, clipUrl }),
    });
    const result = await response.json();
    if (result.success) {
      updateStore(sceneNumber, clipUrl);
    }
  };
}
```

### Date/Time Handling

**Storage:** ISO 8601 strings in UTC
```typescript
const timestamp = new Date().toISOString(); // "2025-11-01T12:00:00.000Z"
```

**Display:** User's locale
```typescript
const displayDate = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(timestamp));
```

### File Path Handling

**Always use `path.join()` for cross-platform compatibility:**
```typescript
import path from 'path';

// Good
const audioPath = path.join('.cache', 'audio', `${projectId}.mp3`);

// Bad
const audioPath = `.cache/audio/${projectId}.mp3`; // Breaks on Windows
```

### Consistency Rules

**All agents MUST follow these patterns:**
- API responses use standard `{ success, data/error }` format
- Database queries use parameterized statements (prevent SQL injection)
- File operations check for existence before reading/writing
- Errors are logged with context and re-thrown with user-friendly messages
- TypeScript strict mode enabled (no `any` types without justification)

---

## Security & Privacy

### Local-First Privacy

**Data Stays Local:**
- All processing happens on user's machine
- SQLite database stored locally
- No user data sent to cloud (except YouTube API queries)
- Conversation history never leaves the machine

### API Key Security

**YouTube Data API:**
- API key stored in `.env.local` (git-ignored)
- Never exposed to client-side code
- API calls made from Next.js API routes (server-side only)

**Environment Variables:**
```bash
# .env.local (git-ignored)
YOUTUBE_API_KEY=your_api_key_here
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### Input Validation

**All user inputs validated:**
```typescript
// Example: Validate topic input
function validateTopic(topic: string): boolean {
  if (!topic || topic.trim().length === 0) {
    throw new Error('Topic cannot be empty');
  }
  if (topic.length > 500) {
    throw new Error('Topic too long (max 500 characters)');
  }
  return true;
}
```

### File System Security

**Sandboxed file operations:**
- All file operations confined to `.cache/` directory
- Validate file paths to prevent directory traversal
- Clean up temporary files after use

```typescript
function validateFilePath(filePath: string): void {
  const normalized = path.normalize(filePath);
  const cacheDir = path.resolve('.cache');

  if (!normalized.startsWith(cacheDir)) {
    throw new Error('Invalid file path: outside cache directory');
  }
}
```

### SQL Injection Prevention

**Always use parameterized queries:**
```typescript
// Good
db.prepare('SELECT * FROM messages WHERE project_id = ?').all(projectId);

// Bad (vulnerable to SQL injection)
db.exec(`SELECT * FROM messages WHERE project_id = '${projectId}'`);
```

---

## Performance Considerations

### Video Processing Optimization

**Parallel Processing:**
- Generate voiceovers for all scenes concurrently (KokoroTTS is fast)
- Download multiple YouTube clips in parallel (with rate limiting)

**FFmpeg Optimization:**
- Use `-c copy` when possible (stream copy, no re-encoding)
- Avoid unnecessary transcoding

**Caching:**
- Cache downloaded YouTube clips (don't re-download same video)
- Cache generated voiceovers (if script unchanged)

### Database Performance

**Indexes:**
- Created on `messages(project_id)` for fast conversation loading
- Created on `messages(timestamp)` for chronological ordering

**Query Optimization:**
- Load only recent N messages for active conversation (not full history)
- Use prepared statements for repeated queries

### Frontend Performance

**Code Splitting:**
- Next.js automatically code-splits by route
- Lazy load heavy components (video player, curation UI)

**Image/Video Optimization:**
- Use Next.js Image component for thumbnails
- Lazy load video thumbnails (intersection observer)

**State Management:**
- Zustand is lightweight (3KB)
- Persist only essential state to localStorage

---

## Development Environment

### Prerequisites

**Required:**
- Node.js 18+ (for Next.js)
- Python 3.10+ (for yt-dlp, KokoroTTS)
- UV (Python package manager)
- Ollama installed and running (http://localhost:11434)
- FFmpeg 7.1.2+ installed and in PATH

**Optional:**
- VS Code with TypeScript, ESLint, Tailwind CSS IntelliSense extensions

### Setup Instructions

```bash
# 1. Clone repository
git clone <repo-url>
cd ai-video-generator

# 2. Install Node dependencies
npm install

# 3. Install Python dependencies (using UV)
uv pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 5. Initialize database
npm run db:init

# 6. Verify Ollama is running
ollama list  # Should show llama3.2

# 7. Start development server
npm run dev
```

### Development Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:init": "node scripts/init-db.js",
    "db:reset": "node scripts/reset-db.js",
    "db:seed": "node scripts/seed-db.js"
  }
}
```

### Environment Variables

```bash
# .env.local
# YouTube Data API
YOUTUBE_API_KEY=your_youtube_api_key_here

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
LLM_PROVIDER=ollama

# Database
DATABASE_PATH=./ai-video-generator.db

# File Storage
CACHE_DIR=./.cache
OUTPUT_DIR=./.cache/output
```

---

## Deployment Architecture

### Local Single-User Deployment

**Target Environment:** User's local machine (Windows, macOS, Linux)

**Installation Method:**
1. User clones repository or downloads release
2. Runs setup script (installs dependencies)
3. Starts application via `npm run dev` or `npm start`
4. Accesses at `http://localhost:3000`

**Dependencies:**
- Ollama must be installed and running
- FFmpeg must be installed
- Python 3.10+ must be installed

**Data Storage:**
- SQLite database: `./ai-video-generator.db`
- Temporary files: `./.cache/`
- Final videos: `./.cache/output/`

**No Server Required:**
- Everything runs locally
- No authentication needed (single user)
- No cloud costs

---

## Cloud Migration Path

### Future Multi-Tenant Cloud Deployment

**When to migrate:** If the application needs to support multiple users via web hosting

**Required Changes:**

1. **Database: SQLite → PostgreSQL**
   ```sql
   -- Add users table
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email VARCHAR(255) UNIQUE NOT NULL,
     name VARCHAR(255),
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Add user_id to existing tables
   ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES users(id);
   ALTER TABLE messages ADD COLUMN user_id UUID; -- Denormalized for query performance
   ```

2. **Authentication: Add NextAuth.js or Clerk**
   ```typescript
   // Middleware for protected routes
   export { default } from "next-auth/middleware";
   export const config = { matcher: ["/api/:path*", "/projects/:path*"] };
   ```

3. **File Storage: Local → S3/R2**
   ```typescript
   // Upload to S3 instead of local filesystem
   await s3Client.putObject({
     Bucket: 'video-generator',
     Key: `${userId}/${projectId}/audio/scene1.mp3`,
     Body: audioBuffer,
   });
   ```

4. **LLM Provider: Local Ollama → Cloud API or Shared Ollama**
   ```typescript
   // Provider abstraction already supports this!
   case 'openai':
     return new OpenAIProvider(user.openaiApiKey);
   case 'anthropic':
     return new AnthropicProvider(user.anthropicApiKey);
   ```

5. **Video Processing: Local FFmpeg → Cloud Worker**
   - Use queue system (BullMQ, Inngest)
   - Run FFmpeg on worker instances
   - Store results in S3

6. **Data Isolation**
   ```typescript
   // Add user_id filter to all queries
   const projects = await db.query(
     'SELECT * FROM projects WHERE user_id = ?',
     [userId]
   );
   ```

**Deployment Platforms:**
- Vercel (Next.js frontend + API routes)
- Supabase or Neon (PostgreSQL)
- Cloudflare R2 or AWS S3 (file storage)
- Fly.io or Railway (self-hosted Ollama with GPU)

**Migration Checklist:**
- [ ] Add user authentication (NextAuth.js)
- [ ] Migrate SQLite → PostgreSQL
- [ ] Implement user isolation (add user_id filters)
- [ ] Replace local file storage with S3
- [ ] Update LLM provider to cloud API or shared Ollama
- [ ] Add background job processing for video assembly
- [ ] Implement rate limiting per user
- [ ] Add billing/subscription (if monetizing)

---

## Architecture Decision Records

### ADR-001: Next.js 15.5 as Primary Framework

**Status:** Accepted
**Date:** 2025-11-01

**Context:**
Need a modern React framework for desktop-first web application with server-side capabilities for video processing.

**Decision:**
Use Next.js 15.5 with App Router, TypeScript, and Tailwind CSS.

**Consequences:**
- ✅ Server Components reduce client bundle size
- ✅ API Routes provide server-side processing
- ✅ Built-in optimizations (image, font, code splitting)
- ✅ Great TypeScript support
- ⚠️ Learning curve for App Router paradigm

**Alternatives Considered:**
- Vite + React: No built-in API routes
- Remix: Less mature ecosystem
- Create React App: Deprecated

---

### ADR-002: Local Ollama + Llama 3.2 for LLM

**Status:** Accepted
**Date:** 2025-11-01

**Context:**
Need LLM for conversational agent and script generation. Must be FOSS and work locally.

**Decision:**
Use Ollama runtime with Llama 3.2 (3B instruct model). Implement provider abstraction for future flexibility.

**Consequences:**
- ✅ FOSS compliant
- ✅ Local execution (privacy, no API costs)
- ✅ 128K context window (handles long conversations)
- ✅ Already installed by user
- ⚠️ Requires GPU for optimal performance
- ✅ Provider abstraction enables cloud migration

**Alternatives Considered:**
- Hugging Face API: Free tier rate limits
- OpenAI API: Not FOSS, requires API key
- Local Llama.cpp: More complex setup

---

### ADR-003: KokoroTTS for Voice Synthesis

**Status:** Accepted
**Date:** 2025-11-01

**Context:**
Need high-quality TTS with multiple voice options. Must be FOSS.

**Decision:**
Use KokoroTTS (82M parameter model) with 48+ voice options.

**Consequences:**
- ✅ FOSS compliant (Apache 2.0)
- ✅ 48+ voices (exceeds PRD requirement of 3-5)
- ✅ High quality (4.35 MOS score)
- ✅ Fast inference (3.2x faster than XTTS)
- ✅ Voice blending capability (bonus feature)
- ⚠️ Python dependency

**Alternatives Considered:**
- Piper TTS: Fewer voices, less natural
- Coqui TTS: Heavier, slower
- eSpeak NG: Robotic sound quality

---

### ADR-004: Direct FFmpeg via child_process

**Status:** Accepted
**Date:** 2025-11-01

**Context:**
Need video processing (trim, concatenate, overlay audio). fluent-ffmpeg was deprecated in May 2025.

**Decision:**
Use FFmpeg directly via Node.js `child_process.exec`, no wrapper library.

**Consequences:**
- ✅ Future-proof (no deprecated wrapper dependency)
- ✅ Full control over FFmpeg commands
- ✅ No abstraction layer to break
- ✅ Direct access to latest FFmpeg features
- ⚠️ Need to construct commands manually
- ⚠️ Less beginner-friendly

**Alternatives Considered:**
- fluent-ffmpeg: Deprecated/archived May 2025
- @mmomtchev/ffmpeg: Native bindings, more complex
- MoviePy: Python, different ecosystem

---

### ADR-005: Hybrid State Management (Zustand + SQLite)

**Status:** Accepted
**Date:** 2025-11-01

**Context:**
Need to manage complex workflow state across 5 epics. User wants to resume projects after days/weeks.

**Decision:**
Use Zustand for client state + SQLite for persistent storage. Hybrid approach.

**Consequences:**
- ✅ Fast UI updates (Zustand)
- ✅ Persistent projects (SQLite)
- ✅ Conversation memory across sessions
- ✅ Can save/resume multiple projects
- ✅ Lightweight (Zustand 3KB)
- ⚠️ Need to sync client/server state

**Alternatives Considered:**
- Redux: Heavier, more boilerplate
- Context API only: Lost on browser close
- Database only: Slower UI updates
- LocalStorage only: No conversation history, limited storage

---

### ADR-006: Local Single-User Deployment (MVP)

**Status:** Accepted
**Date:** 2025-11-01

**Context:**
Primary user is the developer. Need fast MVP with privacy guarantees. Cloud deployment adds complexity.

**Decision:**
Build for local single-user deployment initially. Document cloud migration path for future.

**Consequences:**
- ✅ Faster MVP (no auth, multi-tenancy)
- ✅ Complete privacy (all data local)
- ✅ No cloud costs
- ✅ Works offline (except YouTube API)
- ✅ Architecture designed for easy cloud migration
- ⚠️ Not immediately shareable with others
- ⚠️ Requires local setup (Ollama, FFmpeg)

**Alternatives Considered:**
- Cloud multi-tenant from day one: Slower MVP, higher complexity
- Electron app: Extra packaging complexity
- Pure Python app: User prefers web UI

---

### ADR-007: Configurable System Prompts for LLM Behavior Control

**Status:** Accepted
**Date:** 2025-11-01

**Context:**
Different video projects require different LLM behavior (creative brainstorming vs. educational vs. viral strategy). Since we're using local Ollama, we have complete control over LLM behavior without external restrictions. User wants unrestricted, customizable assistant personas.

**Decision:**
Implement configurable system prompts stored in database with:
- Default "Creative Assistant" persona (unrestricted)
- Preset persona library (viral strategist, educational designer, documentary filmmaker)
- User-customizable system prompts
- Optional per-project prompt overrides

**Consequences:**
- ✅ Full control over LLM behavior (no external restrictions)
- ✅ Personas adapt to different video types
- ✅ Users can create unlimited custom personas
- ✅ Complete transparency into assistant behavior
- ✅ System prompts stored locally (privacy)
- ✅ Consistent persona throughout conversation
- ⚠️ Requires UI for prompt management (post-MVP)
- ⚠️ Users must understand system prompt impact

**Alternatives Considered:**
- Single hardcoded prompt: No flexibility
- No system prompts: Inconsistent LLM behavior
- Cloud-based prompt library: Privacy concerns, requires internet

**Implementation:**
- MVP: Hardcoded DEFAULT_SYSTEM_PROMPT
- Post-MVP: Database table + UI configuration + preset library

---

## Conclusion

This architecture provides a solid foundation for the AI Video Generator MVP with clear paths for future enhancement. All decisions prioritize FOSS compliance, local-first privacy, and developer experience while maintaining the flexibility to scale to cloud multi-tenant deployment when needed.

The modular design with abstraction layers (LLM provider, state management, API boundaries) ensures that AI agents implementing individual epics will write consistent, compatible code.

**Next Steps:**
1. Execute project initialization commands
2. Implement Epic 1 (Conversational Agent) first
3. Iterate through epics 2-5 sequentially
4. Run validation workflow before Phase 4 implementation

---

**Document Status:** Complete and Ready for Implementation
**Architecture Validated:** 2025-11-01
**Ready for Phase 4:** Pending solutioning-gate-check
