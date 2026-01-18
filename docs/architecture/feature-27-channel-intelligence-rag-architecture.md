# Feature 2.7: Channel Intelligence & RAG Architecture

**PRD Reference:** Feature 2.7 - Channel Intelligence & Content Research (RAG-Powered)

### Overview

A VidIQ-style intelligence system that syncs with YouTube channels, analyzes competitors, monitors trends, and generates scripts informed by the user's niche and style. Uses RAG (Retrieval-Augmented Generation) to give the LLM full context of channel content, competitor videos, and trending topics.

### Architecture Pattern: Retrieval-Augmented Generation (RAG)

```
┌─────────────────────────────────────────────────────────────────┐
│                     RAG Pipeline Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   YouTube    │    │  News Sites  │    │   YouTube    │       │
│  │   Channels   │    │  (Military)  │    │   Trends     │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Data Ingestion Layer                    │        │
│  │  - youtube-transcript-api (captions)                 │        │
│  │  - YouTube Data API (metadata)                       │        │
│  │  - Web scraping (news headlines)                     │        │
│  └──────────────────────┬──────────────────────────────┘        │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Embedding Generation                    │        │
│  │  - all-MiniLM-L6-v2 (local, FOSS)                   │        │
│  │  - sentence-transformers library                     │        │
│  │  - 384-dimensional vectors                           │        │
│  └──────────────────────┬──────────────────────────────┘        │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Vector Storage (ChromaDB)               │        │
│  │  - Local SQLite + DuckDB backend                    │        │
│  │  - Collections: channels, videos, news              │        │
│  │  - Metadata filtering for retrieval                 │        │
│  └──────────────────────┬──────────────────────────────┘        │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              RAG Retrieval Layer                     │        │
│  │  - Semantic similarity search                        │        │
│  │  - Metadata filtering (date, source, niche)         │        │
│  │  - Top-K retrieval with relevance scoring           │        │
│  └──────────────────────┬──────────────────────────────┘        │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              LLM Context Augmentation                │        │
│  │  - Retrieved docs injected into prompt              │        │
│  │  - Ollama/Gemini generates informed response        │        │
│  │  - Script generation with channel awareness         │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Operating Modes

#### Mode 1: Established Channel
User connects their existing YouTube channel. System syncs content and learns their style.

```typescript
// lib/rag/modes/established-channel.ts
interface EstablishedChannelConfig {
  channelId: string;           // User's YouTube channel ID
  syncFrequency: 'daily';      // Daily sync via cron job
  competitorChannels: string[]; // Up to 5 competitor channel IDs
  trackTrends: boolean;        // Monitor YouTube trends in niche
  newsEnabled: boolean;        // Fetch news from configured sources
}

async function initializeEstablishedChannel(config: EstablishedChannelConfig): Promise<void> {
  // 1. Fetch channel metadata via YouTube Data API
  const channelMeta = await fetchChannelMetadata(config.channelId);

  // 2. Scrape auto-captions for all videos
  const transcripts = await scrapeChannelTranscripts(config.channelId);

  // 3. Generate embeddings and store in ChromaDB
  await embedAndStore(transcripts, { source: 'user_channel', channelId: config.channelId });

  // 4. Index competitors if specified
  for (const competitorId of config.competitorChannels) {
    await indexCompetitorChannel(competitorId);
  }

  // 5. Schedule daily sync job
  scheduleChannelSync(config);
}
```

#### Mode 2: Cold Start (New Channel)
User declares their niche. System indexes top channels in that niche to learn successful patterns.

```typescript
// lib/rag/modes/cold-start.ts
interface ColdStartConfig {
  niche: string;               // e.g., "military", "gaming", "cooking"
  nicheKeywords: string[];     // Additional keywords for YouTube search
  autoSelectTopChannels: boolean; // Auto-select top 5 channels in niche
  manualChannels?: string[];   // Or user specifies channels
}

async function initializeColdStart(config: ColdStartConfig): Promise<void> {
  let channelIds: string[];

  if (config.autoSelectTopChannels) {
    // 1. Search YouTube for top channels in niche
    channelIds = await findTopChannelsInNiche(config.niche, config.nicheKeywords);
  } else {
    channelIds = config.manualChannels || [];
  }

  // 2. Index each channel's content
  for (const channelId of channelIds.slice(0, 5)) {
    await indexCompetitorChannel(channelId);
  }

  // 3. Load niche-specific news sources (e.g., military news for military niche)
  const newsSources = getNicheNewsSources(config.niche);
  await initializeNewsSources(newsSources);

  // 4. Schedule daily sync
  scheduleColdStartSync(config);
}
```

### Data Ingestion Components

#### YouTube Caption Scraping

```typescript
// lib/rag/ingestion/youtube-captions.ts
import { spawn } from 'child_process';

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface VideoTranscript {
  videoId: string;
  title: string;
  description: string;
  transcript: TranscriptSegment[];
  fullText: string;          // Concatenated transcript
  publishedAt: string;
  channelId: string;
}

/**
 * Scrape auto-captions using youtube-transcript-api (Python)
 */
async function scrapeVideoTranscript(videoId: string): Promise<VideoTranscript | null> {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [
      '-c',
      `
from youtube_transcript_api import YouTubeTranscriptApi
import json

try:
    transcript = YouTubeTranscriptApi.get_transcript('${videoId}')
    print(json.dumps(transcript))
except Exception as e:
    print(json.dumps({"error": str(e)}))
      `
    ]);

    let output = '';
    python.stdout.on('data', (data) => { output += data.toString(); });
    python.on('close', (code) => {
      try {
        const result = JSON.parse(output);
        if (result.error) {
          resolve(null); // No transcript available
        } else {
          resolve({
            videoId,
            transcript: result,
            fullText: result.map((s: TranscriptSegment) => s.text).join(' ')
          } as VideoTranscript);
        }
      } catch {
        resolve(null);
      }
    });
  });
}

/**
 * Scrape all videos from a channel
 */
async function scrapeChannelTranscripts(
  channelId: string,
  limit: number = 50
): Promise<VideoTranscript[]> {
  // 1. Get list of video IDs from channel via YouTube Data API
  const videoIds = await getChannelVideoIds(channelId, limit);

  // 2. Scrape each video's transcript (with rate limiting)
  const transcripts: VideoTranscript[] = [];
  for (const videoId of videoIds) {
    const transcript = await scrapeVideoTranscript(videoId);
    if (transcript) {
      transcripts.push(transcript);
    }
    await sleep(500); // Rate limit: 2 requests/second
  }

  return transcripts;
}
```

#### News Source Ingestion

```typescript
// lib/rag/ingestion/news-sources.ts

interface NewsSource {
  id: string;
  name: string;
  url: string;
  niche: string;
  fetchMethod: 'rss' | 'scrape';
  selectors?: {
    headline: string;
    summary: string;
    link: string;
  };
}

// Pre-configured military news sources (PRD Feature 2.7)
export const MILITARY_NEWS_SOURCES: NewsSource[] = [
  {
    id: 'the_war_zone',
    name: 'The War Zone',
    url: 'https://www.thedrive.com/the-war-zone',
    niche: 'military',
    fetchMethod: 'rss'
  },
  {
    id: 'military_com',
    name: 'Military.com',
    url: 'https://www.military.com/daily-news',
    niche: 'military',
    fetchMethod: 'rss'
  },
  {
    id: 'defense_news',
    name: 'Defense News',
    url: 'https://www.defensenews.com/',
    niche: 'military',
    fetchMethod: 'rss'
  },
  {
    id: 'breaking_defense',
    name: 'Breaking Defense',
    url: 'https://breakingdefense.com/',
    niche: 'military',
    fetchMethod: 'rss'
  },
  {
    id: 'defense_one',
    name: 'Defense One',
    url: 'https://www.defenseone.com/',
    niche: 'military',
    fetchMethod: 'rss'
  },
  {
    id: 'military_times',
    name: 'Military Times',
    url: 'https://www.militarytimes.com/',
    niche: 'military',
    fetchMethod: 'rss'
  },
  {
    id: 'janes',
    name: 'Janes',
    url: 'https://www.janes.com/osint-insights/defence-news',
    niche: 'military',
    fetchMethod: 'rss'
  }
];

interface NewsArticle {
  id: string;
  sourceId: string;
  headline: string;
  summary: string;
  url: string;
  publishedAt: string;
  niche: string;
}

async function fetchNewsFromSource(source: NewsSource): Promise<NewsArticle[]> {
  if (source.fetchMethod === 'rss') {
    return await fetchRSSFeed(source);
  } else {
    return await scrapeNewsPage(source);
  }
}

async function fetchAllNicheNews(niche: string): Promise<NewsArticle[]> {
  const sources = getNicheNewsSources(niche);
  const allArticles: NewsArticle[] = [];

  for (const source of sources) {
    try {
      const articles = await fetchNewsFromSource(source);
      allArticles.push(...articles);
    } catch (error) {
      console.warn(`Failed to fetch from ${source.name}:`, error);
    }
  }

  return allArticles;
}
```

### Vector Database Integration

```typescript
// lib/rag/vector-db/chroma-client.ts
import { ChromaClient, Collection } from 'chromadb';

const CHROMA_PATH = '.cache/chroma';

class RAGVectorStore {
  private client: ChromaClient;
  private collections: Map<string, Collection> = new Map();

  async initialize(): Promise<void> {
    this.client = new ChromaClient({ path: CHROMA_PATH });

    // Create collections
    this.collections.set('channels', await this.client.getOrCreateCollection({
      name: 'channel_content',
      metadata: { 'hnsw:space': 'cosine' }
    }));

    this.collections.set('news', await this.client.getOrCreateCollection({
      name: 'news_articles',
      metadata: { 'hnsw:space': 'cosine' }
    }));

    this.collections.set('trends', await this.client.getOrCreateCollection({
      name: 'trending_topics',
      metadata: { 'hnsw:space': 'cosine' }
    }));
  }

  async addVideoContent(video: VideoTranscript, embedding: number[]): Promise<void> {
    const collection = this.collections.get('channels')!;

    await collection.add({
      ids: [video.videoId],
      embeddings: [embedding],
      metadatas: [{
        channelId: video.channelId,
        title: video.title,
        publishedAt: video.publishedAt,
        type: 'video_transcript'
      }],
      documents: [video.fullText]
    });
  }

  async addNewsArticle(article: NewsArticle, embedding: number[]): Promise<void> {
    const collection = this.collections.get('news')!;

    await collection.add({
      ids: [article.id],
      embeddings: [embedding],
      metadatas: [{
        sourceId: article.sourceId,
        niche: article.niche,
        publishedAt: article.publishedAt,
        url: article.url
      }],
      documents: [`${article.headline}\n\n${article.summary}`]
    });
  }

  async queryRelevantContent(
    queryEmbedding: number[],
    options: {
      collection: 'channels' | 'news' | 'trends';
      niche?: string;
      channelId?: string;
      limit?: number;
      minDate?: string;
    }
  ): Promise<QueryResult[]> {
    const collection = this.collections.get(options.collection)!;

    const whereFilter: Record<string, any> = {};
    if (options.niche) whereFilter.niche = options.niche;
    if (options.channelId) whereFilter.channelId = options.channelId;

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: options.limit || 10,
      where: Object.keys(whereFilter).length > 0 ? whereFilter : undefined
    });

    return results.documents[0].map((doc, idx) => ({
      document: doc,
      metadata: results.metadatas[0][idx],
      distance: results.distances?.[0]?.[idx] || 0
    }));
  }
}

export const vectorStore = new RAGVectorStore();
```

### Embedding Generation

```typescript
// lib/rag/embeddings/local-embeddings.ts
import { spawn } from 'child_process';

/**
 * Generate embeddings using sentence-transformers (Python)
 * Model: all-MiniLM-L6-v2 (384 dimensions, ~80MB)
 */
async function generateEmbedding(text: string): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [
      '-c',
      `
from sentence_transformers import SentenceTransformer
import json
import sys

model = SentenceTransformer('all-MiniLM-L6-v2')
text = '''${text.replace(/'/g, "\\'")}'''
embedding = model.encode(text).tolist()
print(json.dumps(embedding))
      `
    ]);

    let output = '';
    python.stdout.on('data', (data) => { output += data.toString(); });
    python.stderr.on('data', (data) => { console.error(data.toString()); });
    python.on('close', (code) => {
      if (code === 0) {
        resolve(JSON.parse(output));
      } else {
        reject(new Error(`Embedding generation failed with code ${code}`));
      }
    });
  });
}

/**
 * Batch embedding for efficiency
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // For large batches, use Python batch processing
  return new Promise((resolve, reject) => {
    const python = spawn('python', [
      '-c',
      `
from sentence_transformers import SentenceTransformer
import json
import sys

model = SentenceTransformer('all-MiniLM-L6-v2')
texts = json.loads('''${JSON.stringify(texts)}''')
embeddings = model.encode(texts).tolist()
print(json.dumps(embeddings))
      `
    ]);

    let output = '';
    python.stdout.on('data', (data) => { output += data.toString(); });
    python.on('close', (code) => {
      if (code === 0) {
        resolve(JSON.parse(output));
      } else {
        reject(new Error('Batch embedding failed'));
      }
    });
  });
}
```

### RAG-Augmented Script Generation

```typescript
// lib/rag/generation/rag-script-generator.ts
import { vectorStore } from '../vector-db/chroma-client';
import { generateEmbedding } from '../embeddings/local-embeddings';
import { getLLMProvider } from '@/lib/llm/factory';
import { getProjectPersona } from '@/lib/db/queries';

interface RAGContext {
  channelContent: string[];    // Relevant videos from user's channel
  competitorContent: string[]; // What competitors are doing
  newsArticles: string[];      // Recent news in niche
  trendingTopics: string[];    // Current YouTube trends
}

async function retrieveRAGContext(
  topic: string,
  projectId: string
): Promise<RAGContext> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(topic);

  // Get project's RAG configuration
  const ragConfig = await getProjectRAGConfig(projectId);

  // Query each collection
  const [channelResults, competitorResults, newsResults, trendResults] = await Promise.all([
    vectorStore.queryRelevantContent(queryEmbedding, {
      collection: 'channels',
      channelId: ragConfig.userChannelId,
      limit: 5
    }),
    vectorStore.queryRelevantContent(queryEmbedding, {
      collection: 'channels',
      // Exclude user's channel, get competitors only
      limit: 5
    }),
    vectorStore.queryRelevantContent(queryEmbedding, {
      collection: 'news',
      niche: ragConfig.niche,
      limit: 5,
      minDate: getDateDaysAgo(7) // Last 7 days
    }),
    vectorStore.queryRelevantContent(queryEmbedding, {
      collection: 'trends',
      limit: 3
    })
  ]);

  return {
    channelContent: channelResults.map(r => r.document),
    competitorContent: competitorResults.map(r => r.document),
    newsArticles: newsResults.map(r => r.document),
    trendingTopics: trendResults.map(r => r.document)
  };
}

async function generateRAGAugmentedScript(
  topic: string,
  projectId: string
): Promise<Script> {
  // 1. Retrieve relevant context
  const context = await retrieveRAGContext(topic, projectId);

  // 2. Build augmented prompt
  const augmentedPrompt = buildRAGPrompt(topic, context);

  // 3. Get project's persona
  const personaPrompt = getProjectPersona(projectId);

  // 4. Generate script with full context
  const llm = getLLMProvider();
  const response = await llm.chat([
    { role: 'user', content: augmentedPrompt }
  ], personaPrompt);

  return parseScriptResponse(response);
}

function buildRAGPrompt(topic: string, context: RAGContext): string {
  return `Generate a video script about: "${topic}"

## Your Channel's Style & Previous Content
${context.channelContent.length > 0
  ? context.channelContent.map((c, i) => `[Video ${i+1}]: ${c.substring(0, 500)}...`).join('\n\n')
  : '(New channel - no previous content)'}

## What Competitors Are Doing
${context.competitorContent.map((c, i) => `[Competitor ${i+1}]: ${c.substring(0, 300)}...`).join('\n\n')}

## Recent News in Your Niche
${context.newsArticles.map((a, i) => `[News ${i+1}]: ${a}`).join('\n\n')}

## Current Trending Topics
${context.trendingTopics.join('\n')}

---

Based on the above context:
1. Match your channel's established tone and style (if available)
2. Differentiate from competitors while learning from their successful patterns
3. Incorporate relevant current events and news angles
4. Leverage trending topics where naturally relevant

Generate a structured video script with numbered scenes.`;
}
```

### API Endpoints

```typescript
// app/api/rag/setup/route.ts
export async function POST(req: Request) {
  const { projectId, mode, config } = await req.json();

  if (mode === 'established') {
    await initializeEstablishedChannel(config);
  } else if (mode === 'cold_start') {
    await initializeColdStart(config);
  }

  // Update project with RAG config
  db.prepare(`
    UPDATE projects
    SET rag_enabled = true, rag_config = ?
    WHERE id = ?
  `).run(JSON.stringify(config), projectId);

  return Response.json({ success: true });
}

// app/api/rag/sync/route.ts
export async function POST(req: Request) {
  const { projectId } = await req.json();

  // Trigger manual sync
  await syncProjectRAGData(projectId);

  return Response.json({ success: true });
}

// app/api/rag/status/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  const status = db.prepare(`
    SELECT
      rag_enabled,
      rag_config,
      rag_last_sync,
      (SELECT COUNT(*) FROM rag_sync_jobs WHERE project_id = ? AND status = 'pending') as pending_jobs
    FROM projects WHERE id = ?
  `).get(projectId, projectId);

  return Response.json({ success: true, data: status });
}
```

### Project Structure Extension

```
lib/
├── rag/                           # RAG system (Feature 2.7)
│   ├── index.ts                   # Main exports
│   ├── modes/
│   │   ├── established-channel.ts # Existing channel sync
│   │   └── cold-start.ts          # New channel niche learning
│   ├── ingestion/
│   │   ├── youtube-captions.ts    # Caption scraping
│   │   ├── youtube-metadata.ts    # Channel/video metadata
│   │   ├── news-sources.ts        # News RSS/scraping
│   │   └── trends.ts              # YouTube trends
│   ├── embeddings/
│   │   ├── local-embeddings.ts    # sentence-transformers
│   │   └── gemini-embeddings.ts   # Optional cloud embeddings
│   ├── vector-db/
│   │   ├── chroma-client.ts       # ChromaDB wrapper
│   │   └── collections.ts         # Collection schemas
│   ├── retrieval/
│   │   ├── semantic-search.ts     # Similarity search
│   │   └── filters.ts             # Metadata filtering
│   └── generation/
│       ├── rag-script-generator.ts # RAG-augmented generation
│       └── topic-suggestions.ts    # AI topic recommendations
```

### Environment Variables

```bash
# .env.local - RAG Configuration (Feature 2.7)

# ============================================
# RAG System Configuration
# ============================================
RAG_ENABLED=true
RAG_SYNC_SCHEDULE="0 6 * * *"  # Daily at 6 AM (cron format)

# Vector Database
CHROMA_PATH=.cache/chroma
CHROMA_COLLECTION_PREFIX=aivideogen

# Embeddings (local by default)
EMBEDDING_PROVIDER=local  # local | gemini
EMBEDDING_MODEL=all-MiniLM-L6-v2

# YouTube API (shared with Epic 3)
# YOUTUBE_API_KEY already configured

# News Scraping
NEWS_FETCH_ENABLED=true
NEWS_MAX_ARTICLES_PER_SOURCE=20
```

### Quick Production Flow Architecture

**PRD Reference:** Feature 2.7 - Quick Production Flow (One-Click Video Creation)

The Quick Production Flow enables one-click video creation directly from RAG-generated topic suggestions. When a user clicks "Create Video" on a topic suggestion, the system automatically creates a project, applies saved defaults (voice + persona), and triggers the full video production pipeline.

#### Architecture Pattern: Pipeline Orchestration

```
┌─────────────────────────────────────────────────────────────────┐
│                Quick Production Flow Pipeline                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. Topic Suggestions UI (Channel Intelligence Page)     │   │
│  │     - Display RAG-generated topics                        │   │
│  │     - "Create Video" button on each topic card           │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │ Click "Create Video"                   │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  2. Defaults Resolution                                   │   │
│  │     - Load user_preferences (default_voice_id,           │   │
│  │       default_persona_id)                                 │   │
│  │     - If no defaults: redirect to settings                │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  3. Project Creation (POST /api/projects/quick-create)   │   │
│  │     - Create project with topic pre-filled               │   │
│  │     - Set topic_confirmed = true                         │   │
│  │     - Apply default voice + persona                      │   │
│  │     - Attach RAG context                                 │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  4. Pipeline Orchestration (Reuses Automate Mode)        │   │
│  │     - Trigger script generation with RAG context         │   │
│  │     - Trigger voiceover generation                       │   │
│  │     - Trigger visual sourcing + auto-selection           │   │
│  │     - Trigger video assembly                             │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  5. Progress Tracking & Navigation                        │   │
│  │     - Redirect to /projects/[id]/progress                │   │
│  │     - Real-time status updates via polling               │   │
│  │     - Auto-redirect to /projects/[id]/export on complete │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Database Schema Extension

```sql
-- Migration 015: Add user_preferences table for Quick Production defaults
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_voice_id TEXT,                    -- No FK: voices defined in TypeScript (voice-profiles.ts)
  default_persona_id TEXT,
  quick_production_enabled INTEGER DEFAULT 1,  -- SQLite uses INTEGER for BOOLEAN
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (default_persona_id) REFERENCES system_prompts(id) ON DELETE SET NULL
);

-- Insert default row (single-user app)
INSERT OR IGNORE INTO user_preferences (id) VALUES ('default');

-- Migration 016: Add default_duration column
-- Stores target video duration in minutes (1-20 range, default 2)
ALTER TABLE user_preferences ADD COLUMN default_duration INTEGER DEFAULT 2;
```

#### API Endpoints

```typescript
// app/api/projects/quick-create/route.ts
export async function POST(req: Request) {
  const { topic, ragContext } = await req.json();

  // 1. Load user preferences
  const prefs = db.prepare(`
    SELECT default_voice_id, default_persona_id, default_duration, quick_production_enabled
    FROM user_preferences WHERE id = 'default'
  `).get();

  // 2. Validate defaults exist
  if (!prefs.default_voice_id || !prefs.default_persona_id) {
    return Response.json({
      success: false,
      error: 'DEFAULTS_NOT_CONFIGURED',
      message: 'Please configure default voice and persona in settings'
    }, { status: 400 });
  }

  // 3. Create project with topic confirmed
  const projectId = generateId();
  db.prepare(`
    INSERT INTO projects (id, topic, topic_confirmed, voice_id, system_prompt_id, current_step, rag_context)
    VALUES (?, ?, true, ?, ?, 'script-generation', ?)
  `).run(projectId, topic, prefs.default_voice_id, prefs.default_persona_id, JSON.stringify(ragContext));

  // 4. Trigger automated pipeline (reuse Automate Mode logic)
  await triggerAutomatedPipeline(projectId, {
    voiceId: prefs.default_voice_id,
    personaId: prefs.default_persona_id,
    ragContext
  });

  return Response.json({
    success: true,
    data: { projectId, redirectUrl: `/projects/${projectId}/progress` }
  });
}

// app/api/user-preferences/route.ts
export async function GET() {
  // Note: voice_name resolved from voice-profiles.ts at API layer
  const prefs = db.prepare(`
    SELECT up.*, sp.name as persona_name
    FROM user_preferences up
    LEFT JOIN system_prompts sp ON up.default_persona_id = sp.id
    WHERE up.id = 'default'
  `).get();

  // Resolve voice_name from TypeScript voice profiles
  const voice = getVoiceById(prefs.default_voice_id);
  prefs.voice_name = voice?.name;

  return Response.json({ success: true, data: prefs });
}

export async function PUT(req: Request) {
  const { default_voice_id, default_persona_id, default_duration, quick_production_enabled } = await req.json();

  // Validate duration (1-20 minutes)
  if (default_duration !== undefined) {
    if (default_duration < 1 || default_duration > 20) {
      return Response.json({ success: false, error: 'Duration must be 1-20 minutes' }, { status: 400 });
    }
  }

  // Build dynamic UPDATE (partial updates supported)
  const updates = [];
  const values = [];
  if (default_voice_id !== undefined) { updates.push('default_voice_id = ?'); values.push(default_voice_id); }
  if (default_persona_id !== undefined) { updates.push('default_persona_id = ?'); values.push(default_persona_id); }
  if (default_duration !== undefined) { updates.push('default_duration = ?'); values.push(default_duration); }
  if (quick_production_enabled !== undefined) { updates.push('quick_production_enabled = ?'); values.push(quick_production_enabled ? 1 : 0); }
  updates.push("updated_at = datetime('now')");

  db.prepare(`UPDATE user_preferences SET ${updates.join(', ')} WHERE id = 'default'`).run(...values);

  return Response.json({ success: true });
}
```

#### UI Components

```typescript
// components/features/rag/TopicSuggestionCard.tsx
interface TopicSuggestionCardProps {
  topic: TopicSuggestion;
  onCreateVideo: (topic: string) => void;
  hasDefaults: boolean;
}

export function TopicSuggestionCard({ topic, onCreateVideo, hasDefaults }: TopicSuggestionCardProps) {
  return (
    <div className="topic-card">
      <div className="topic-content">
        <h3 className="topic-title">{topic.title}</h3>
        <p className="topic-description">{topic.description}</p>
        <div className="topic-meta">
          <span className="topic-source">{topic.source}</span>
          <span className="topic-relevance">{topic.relevanceScore}% match</span>
        </div>
      </div>
      <div className="topic-actions">
        {hasDefaults ? (
          <button
            className="btn-create-video"
            onClick={() => onCreateVideo(topic.title)}
          >
            Create Video
          </button>
        ) : (
          <button
            className="btn-configure"
            onClick={() => router.push('/settings/quick-production')}
          >
            Configure Defaults First
          </button>
        )}
      </div>
    </div>
  );
}

// components/features/rag/QuickProductionProgress.tsx
interface QuickProductionProgressProps {
  projectId: string;
}

export function QuickProductionProgress({ projectId }: QuickProductionProgressProps) {
  const { data: status, isLoading } = usePipelineStatus(projectId);

  const stages = [
    { key: 'script', label: 'Generating Script', icon: '📝' },
    { key: 'voiceover', label: 'Creating Voiceover', icon: '🎙️' },
    { key: 'visuals', label: 'Sourcing Visuals', icon: '🎬' },
    { key: 'assembly', label: 'Assembling Video', icon: '🔧' },
    { key: 'complete', label: 'Complete!', icon: '✅' },
  ];

  return (
    <div className="progress-container">
      <h2>Creating Your Video</h2>
      <p className="topic-display">Topic: {status?.topic}</p>

      <div className="progress-stages">
        {stages.map((stage, idx) => (
          <div
            key={stage.key}
            className={`stage ${status?.currentStage === stage.key ? 'active' : ''} ${status?.completedStages?.includes(stage.key) ? 'complete' : ''}`}
          >
            <span className="stage-icon">{stage.icon}</span>
            <span className="stage-label">{stage.label}</span>
            {status?.currentStage === stage.key && (
              <span className="stage-progress">{status?.stageProgress}%</span>
            )}
          </div>
        ))}
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${status?.overallProgress || 0}%` }} />
      </div>

      <p className="progress-detail">{status?.currentMessage}</p>
    </div>
  );
}
```

#### Settings Page Extension

```typescript
// app/settings/quick-production/page.tsx
export default function QuickProductionSettingsPage() {
  const { data: prefs, mutate } = useUserPreferences();
  const { data: voices } = useVoices();
  const { data: personas } = usePersonas();

  const handleSave = async (values: UserPreferences) => {
    await fetch('/api/user-preferences', {
      method: 'PUT',
      body: JSON.stringify(values),
    });
    mutate();
    toast.success('Quick Production defaults saved');
  };

  return (
    <div className="settings-page">
      <h1>Quick Production Defaults</h1>
      <p className="description">
        Configure default voice and persona for one-click video creation from topic suggestions.
      </p>

      <form onSubmit={handleSubmit(handleSave)}>
        <div className="form-group">
          <label>Default Voice</label>
          <select {...register('default_voice_id')}>
            {voices?.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Default Persona</label>
          <select {...register('default_persona_id')}>
            {personas?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>
            <input type="checkbox" {...register('quick_production_enabled')} />
            Enable Quick Production (one-click video creation)
          </label>
        </div>

        <button type="submit" className="btn-save">Save Defaults</button>
      </form>
    </div>
  );
}
```

#### Integration with Automate Mode (Feature 1.12)

The Quick Production Flow reuses the Automate Mode pipeline from Feature 1.12. The key difference is the entry point:

| Aspect | Automate Mode (1.12) | Quick Production Flow (2.7) |
|--------|---------------------|----------------------------|
| **Entry Point** | Chat → Confirm Topic → Enable Automate | Topic Suggestion → Click "Create Video" |
| **Configuration** | Per-project toggle | Global user preferences |
| **Voice Selection** | Before automation starts | Pre-configured default |
| **Persona Selection** | Project-level setting | Pre-configured default |
| **RAG Context** | Optional | Always included |
| **Pipeline** | Same | Same (reused) |

```typescript
// lib/pipeline/automated-pipeline.ts
// Shared by both Automate Mode and Quick Production Flow

export async function triggerAutomatedPipeline(
  projectId: string,
  options: {
    voiceId: string;
    personaId: string;
    ragContext?: RAGContext;
    videoSource?: 'youtube' | 'dvids';
  }
): Promise<string> {
  // Create pipeline job
  const jobId = generateId();

  db.prepare(`
    INSERT INTO pipeline_jobs (id, project_id, status, current_stage, options)
    VALUES (?, ?, 'pending', 'script', ?)
  `).run(jobId, projectId, JSON.stringify(options));

  // Enqueue in job processor
  await jobQueue.enqueue({
    type: 'automated_pipeline',
    payload: { projectId, jobId, options },
    priority: 'high'
  });

  return jobId;
}
```

#### Project Structure Extension

```
lib/
├── rag/
│   └── generation/
│       ├── topic-suggestions.ts     # Existing
│       └── quick-production.ts      # NEW: One-click video creation
├── pipeline/
│   ├── automated-pipeline.ts        # Shared pipeline orchestration
│   └── progress-tracker.ts          # Real-time progress updates
app/
├── settings/
│   └── quick-production/
│       └── page.tsx                 # NEW: Quick production settings
├── projects/
│   └── [id]/
│       └── progress/
│           └── page.tsx             # NEW: Pipeline progress page
components/
└── features/
    └── rag/
        ├── TopicSuggestions.tsx     # Existing
        ├── TopicSuggestionCard.tsx  # NEW: Individual topic card with "Create Video"
        └── QuickProductionProgress.tsx # NEW: Progress display
```

---
