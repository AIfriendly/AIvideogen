# Implementation Patterns

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

### UI Consistency Patterns

#### Duration Badge Color-Coding (Epic 3 Story 3.6, Epic 4)

**Purpose:** Provide consistent visual feedback on video duration suitability across all UI components

**Color Logic:**
```typescript
// lib/utils/duration-badge.ts
function getBadgeColor(
  videoDuration: number,
  sceneDuration: number
): { background: string; text: string; tooltip: string } {
  const ratio = videoDuration / sceneDuration;

  if (ratio >= 1 && ratio <= 2) {
    return {
      background: '#10b981', // Green (Emerald 500)
      text: '#ffffff',
      tooltip: 'Ideal length for this scene'
    };
  } else if (ratio > 2 && ratio <= 3) {
    return {
      background: '#f59e0b', // Yellow (Amber 500)
      text: '#000000',
      tooltip: 'Acceptable length - some trimming needed'
    };
  } else if (ratio > 3) {
    return {
      background: '#ef4444', // Red (Red 500)
      text: '#ffffff',
      tooltip: 'Long video - consider shorter alternatives'
    };
  } else { // ratio < 1
    return {
      background: '#6b7280', // Gray (Gray 500)
      text: '#ffffff',
      tooltip: 'Video shorter than needed'
    };
  }
}
```

**Usage Examples:**
```typescript
// Example 1: 10s scene, 15s video
const badge1 = getBadgeColor(15, 10);
// → { background: '#10b981', tooltip: 'Ideal length...' } (Green)

// Example 2: 10s scene, 25s video
const badge2 = getBadgeColor(25, 10);
// → { background: '#f59e0b', tooltip: 'Acceptable length...' } (Yellow)

// Example 3: 10s scene, 90s video
const badge3 = getBadgeColor(90, 10);
// → { background: '#ef4444', tooltip: 'Long video...' } (Red)

// Example 4: 10s scene, 8s video
const badge4 = getBadgeColor(8, 10);
// → { background: '#6b7280', tooltip: 'Video shorter...' } (Gray)
```

**Ratio Thresholds:**
- **1x-2x:** Green - Perfect range, minimal trimming needed
- **2x-3x:** Yellow - Acceptable, will need noticeable trimming
- **>3x:** Red - Very long, significant trimming or reconsider choice
- **<1x:** Gray - Video too short, can't fill scene duration

**Component Integration:**
```typescript
// components/features/curation/DurationBadge.tsx
export function DurationBadge({ videoDuration, sceneDuration }: Props) {
  const { background, text, tooltip } = getBadgeColor(videoDuration, sceneDuration);

  return (
    <div
      className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold"
      style={{ backgroundColor: background, color: text }}
      title={tooltip}
      aria-label={`${formatDuration(videoDuration)} - ${tooltip}`}
    >
      {formatDuration(videoDuration)}
    </div>
  );
}
```

**Consistency Requirements:**
- ✅ Use exact hex colors across all components
- ✅ Same ratio thresholds everywhere (1x-2x, 2x-3x, >3x, <1x)
- ✅ Consistent tooltip messages
- ✅ Same formatting for duration display (e.g., "1:23" not "1m 23s")

**Where Applied:**
- Epic 3 Story 3.6: After default segment downloads (preview thumbnails)
- Epic 4: Visual curation UI (all video suggestion thumbnails)
- Visual suggestion database queries (for sorting/filtering by suitability)

---

### Project Switching Workflow (Story 1.6)

**Pattern for switching between projects:**
```typescript
// When user clicks a project in sidebar
async function switchToProject(newProjectId: string) {
  const currentProjectId = useProjectStore.getState().activeProjectId;

  // 1. Cancel any in-flight requests for current project
  if (currentRequestController) {
    currentRequestController.abort();
  }

  // 2. Save current scroll position (optional, for restoring state)
  const scrollPosition = window.scrollY;
  sessionStorage.setItem(`scroll-${currentProjectId}`, String(scrollPosition));

  // 3. Update active project in store (triggers localStorage persistence)
  useProjectStore.getState().setActiveProject(newProjectId);

  // 4. Clear current conversation state
  useConversationStore.getState().clearMessages();

  // 5. Load new project's conversation history
  currentRequestController = new AbortController();
  const response = await fetch(`/api/projects/${newProjectId}/messages`, {
    signal: currentRequestController.signal,
  });

  if (response.ok) {
    const messages = await response.json();
    useConversationStore.getState().setMessages(messages.data);
  }

  // 6. Update URL for deep linking
  window.history.pushState({}, '', `/projects/${newProjectId}`);

  // 7. Restore scroll position (optional)
  const savedScroll = sessionStorage.getItem(`scroll-${newProjectId}`);
  if (savedScroll) {
    window.scrollTo(0, parseInt(savedScroll));
  }

  // 8. last_active timestamp updated automatically in setActiveProject action
}
```

**Auto-Generate Project Name Pattern:**
```typescript
// lib/utils/generate-project-name.ts
export function generateProjectName(firstMessage: string): string {
  const maxLength = 30;
  const trimmed = firstMessage.trim();

  // Too short? Use fallback
  if (trimmed.length < 5) {
    return `New Project ${new Date().toLocaleDateString()}`;
  }

  // Short enough? Use as-is
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  // Truncate to last complete word
  const truncated = trimmed.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  return lastSpaceIndex > 5
    ? truncated.substring(0, lastSpaceIndex) + '...'
    : truncated.substring(0, maxLength - 3) + '...';
}

// Usage: When user sends first message in new project
const projectName = generateProjectName(firstUserMessage);
await fetch(`/api/projects/${projectId}`, {
  method: 'PUT',
  body: JSON.stringify({ name: projectName }),
});
```

### YouTube API Integration Patterns (Epic 3)

**YouTubeAPIClient Initialization:**
```typescript
// lib/youtube/client.ts
export class YouTubeAPIClient {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';
  private quotaUsed = 0;
  private quotaLimit = 10000; // Daily limit
  private requestTimestamps: number[] = [];
  private rateLimitWindow = 100000; // 100 seconds
  private rateLimitMax = 100; // 100 requests per 100 seconds

  constructor(apiKey: string) {
    if (!apiKey || apiKey === 'your_youtube_api_key_here') {
      throw new Error(
        'YouTube API key not configured.\n' +
        'Get a key at: https://console.cloud.google.com\n' +
        'Enable YouTube Data API v3 for your project\n' +
        'Set YOUTUBE_API_KEY in .env.local'
      );
    }
    this.apiKey = apiKey;
  }

  // Rate limiting check before each request
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    // Remove timestamps older than window
    this.requestTimestamps = this.requestTimestamps.filter(
      ts => now - ts < this.rateLimitWindow
    );

    if (this.requestTimestamps.length >= this.rateLimitMax) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitMs = this.rateLimitWindow - (now - oldestTimestamp);
      throw new Error(
        `YouTube API rate limit reached. Wait ${Math.ceil(waitMs / 1000)} seconds.`
      );
    }

    this.requestTimestamps.push(now);
  }

  // Quota tracking
  private trackQuota(units: number): void {
    this.quotaUsed += units;
    if (this.quotaUsed >= this.quotaLimit) {
      throw new Error(
        'YouTube API quota exceeded (10,000 units/day).\n' +
        'Try again tomorrow or request quota increase at:\n' +
        'https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas'
      );
    }
  }

  // Search videos with exponential backoff
  async searchVideos(query: string, maxResults: number = 15): Promise<YouTubeVideo[]> {
    await this.checkRateLimit();

    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      videoEmbeddable: 'true',
      maxResults: maxResults.toString(),
      key: this.apiKey,
    });

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        const response = await fetch(`${this.baseUrl}/search?${params}`);

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('YouTube API quota exceeded or invalid API key');
          }
          throw new Error(`YouTube API error: ${response.status}`);
        }

        const data = await response.json();
        this.trackQuota(100); // search.list costs 100 units

        return data.items.map((item: any) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          thumbnailUrl: item.snippet.thumbnails.medium.url,
          channelTitle: item.snippet.channelTitle,
          embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
        }));
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) throw error;

        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    return [];
  }
}
```

**Scene Analysis for Visual Search:**
```typescript
// lib/youtube/analyze-scene.ts
import { getLLMProvider } from '@/lib/llm/factory';
import type { SearchQueries } from '@/types/youtube';

export async function analyzeSceneForVisuals(sceneText: string): Promise<SearchQueries> {
  const llm = getLLMProvider();

  const prompt = `Analyze this video script scene and generate optimized YouTube search queries to find relevant B-roll footage.

Scene text: "${sceneText}"

Extract:
1. Main subject/topic
2. Setting/location
3. Mood/atmosphere
4. Action/activity
5. Keywords

Generate:
- Primary search query (most relevant, 3-6 keywords)
- 2-3 alternative search queries for diversity
- Content type (nature, gaming, tutorial, documentary, urban, abstract)

Format response as JSON:
{
  "primary": "keyword1 keyword2 keyword3",
  "alternatives": ["query1", "query2", "query3"],
  "contentType": "nature"
}`;

  try {
    const response = await llm.chat([{ role: 'user', content: prompt }]);
    const parsed = JSON.parse(response);

    return {
      primary: parsed.primary,
      alternatives: parsed.alternatives || [],
      contentType: parsed.contentType || 'general',
    };
  } catch (error) {
    // Fallback: simple keyword extraction
    const keywords = sceneText
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 5)
      .join(' ');

    return {
      primary: keywords || 'video footage',
      alternatives: [],
      contentType: 'general',
    };
  }
}

const commonWords = ['the', 'and', 'that', 'this', 'with', 'from', 'have', 'been', 'will'];
```

**Content Filtering & Ranking:**
```typescript
// lib/youtube/filter-results.ts
import type { YouTubeVideo, FilterConfig } from '@/types/youtube';

export function filterAndRankResults(
  results: YouTubeVideo[],
  config: FilterConfig
): YouTubeVideo[] {
  // Step 1: Apply filters
  let filtered = results.filter(video => {
    // Title spam detection
    const emojiCount = (video.title.match(/[\p{Emoji}]/gu) || []).length;
    const capsRatio = (video.title.match(/[A-Z]/g) || []).length / video.title.length;

    if (emojiCount > 5) return false;
    if (capsRatio > 0.5) return false;

    return true;
  });

  // Step 2: Rank results
  filtered = filtered.map((video, index) => ({
    ...video,
    score: calculateRelevanceScore(video, index, config),
  }));

  // Step 3: Sort by score
  filtered.sort((a, b) => b.score - a.score);

  // Step 4: Limit to top N
  return filtered.slice(0, config.maxSuggestions || 8);
}

function calculateRelevanceScore(
  video: YouTubeVideo,
  position: number,
  config: FilterConfig
): number {
  let score = 0;

  // Position score (YouTube's relevance)
  score += (20 - position) * 5;

  // Creative Commons preference
  if (video.license === 'creativeCommon') {
    score += 20;
  }

  // Quality indicators
  if (video.title.length > 20 && video.title.length < 80) {
    score += 10; // Well-formed title
  }

  return score;
}
```

**Error Handling Pattern:**
```typescript
// app/api/projects/[id]/generate-visuals/route.ts
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const youtubeClient = new YouTubeAPIClient(
      process.env.YOUTUBE_API_KEY || ''
    );

    const scenes = await getScenesByProjectId(params.id);
    const results = [];
    const failed = [];

    for (const scene of scenes) {
      try {
        // Analyze scene
        const queries = await analyzeSceneForVisuals(scene.text);

        // Search YouTube
        const videos = await youtubeClient.searchVideos(queries.primary, 15);

        // Filter & rank
        const filtered = filterAndRankResults(videos, { maxSuggestions: 8 });

        // Save to database
        await saveVisualSuggestions(scene.id, filtered);

        results.push({ sceneId: scene.id, count: filtered.length });
      } catch (error) {
        failed.push({
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          error: error.message,
        });
      }
    }

    await updateProject(params.id, { visuals_generated: true });

    return Response.json({
      success: true,
      data: {
        projectId: params.id,
        scenesProcessed: results.length,
        totalSuggestions: results.reduce((sum, r) => sum + r.count, 0),
        status: failed.length === 0 ? 'completed' : 'partial',
        failedScenes: failed.length > 0 ? failed : undefined,
      },
    });
  } catch (error) {
    // Handle YouTube API-specific errors
    if (error.message.includes('quota')) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'YouTube API quota exceeded. Try again tomorrow.',
            code: 'YOUTUBE_QUOTA_EXCEEDED',
          },
        },
        { status: 429 }
      );
    }

    if (error.message.includes('not configured')) {
      return Response.json(
        {
          success: false,
          error: {
            message: error.message,
            code: 'YOUTUBE_API_KEY_MISSING',
          },
        },
        { status: 500 }
      );
    }

    // Generic error
    return Response.json(
      {
        success: false,
        error: {
          message: 'Visual sourcing failed. Please try again.',
          code: 'VISUAL_SOURCING_ERROR',
        },
      },
      { status: 500 }
    );
  }
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
