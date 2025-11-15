# Epic Technical Specification: Visual Content Sourcing (YouTube API)

Date: 2025-11-14
Author: master
Epic ID: 3
Status: Draft

---

## Overview

Epic 3 implements the AI-powered visual content sourcing system that automatically analyzes script scenes and sources relevant B-roll video clips from YouTube. This system leverages the YouTube Data API v3 to search YouTube's massive content library, providing creators with intelligently curated visual suggestions for each scene of their video script. The sourcing process includes scene text analysis using LLM, search query generation, YouTube API integration, content filtering and quality ranking, and seamless workflow integration with the content generation pipeline from Epic 2.

This epic transforms the manual process of searching for video clips into an automated, AI-driven workflow that understands scene context and retrieves appropriate visual content from YouTube, supporting diverse content types including educational videos, gaming footage, nature documentaries, tutorials, and general B-roll.

## Objectives and Scope

**In Scope:**
- YouTube Data API v3 client implementation with authentication and quota management
- LLM-based scene text analysis for visual theme extraction
- Intelligent search query generation optimized for YouTube search
- YouTube video search with metadata retrieval
- Content filtering and quality ranking algorithms
- Visual suggestions database storage and retrieval
- Automatic workflow trigger after voiceover generation (Epic 2)
- Progress tracking UI during visual sourcing
- Support for diverse content types (gaming, tutorials, nature, educational)
- Error handling for API failures, quota limits, and edge cases

**Out of Scope:**
- Stock footage API integration (Pexels, Pixabay) - Post-MVP Epic 8
- Manual search functionality within UI - Post-MVP Enhancement 2.3
- Video download or local storage of YouTube clips - Epic 5
- Visual curation UI for selecting clips - Epic 4
- Advanced content filtering with visual analysis - Post-MVP Enhancement 2.2

## System Architecture Alignment

This epic integrates with the existing architecture by extending the API layer with YouTube integration capabilities, leveraging the LLM provider abstraction from Epic 1, and building upon the database schema from Epic 2. Key architectural components:

- **lib/youtube/**: New module for YouTube API integration including client, analysis, and filtering
- **Database Extensions**: visual_suggestions table with foreign keys to scenes
- **API Endpoints**: /api/projects/[id]/generate-visuals and /api/projects/[id]/visual-suggestions
- **LLM Integration**: Reuses provider abstraction for scene analysis prompts
- **Workflow State**: Updates project.current_step progression from 'voiceover' to 'visual-sourcing' to 'visual-curation'
- **Error Handling**: Implements exponential backoff, quota tracking, and graceful degradation

## Detailed Design

### Services and Modules

| Module | Responsibility | Inputs | Outputs | Owner |
|--------|---------------|---------|---------|-------|
| YouTubeAPIClient | YouTube Data API v3 interface with auth and quota management | API key, search queries | Video metadata, error states | lib/youtube/client.ts |
| SceneAnalyzer | Analyze scene text for visual themes using LLM | Scene text, analysis prompt | Search queries, content type hints | lib/youtube/analyze-scene.ts |
| ContentFilter | Filter and rank YouTube search results | Raw video results, filter config | Ranked suggestions (5-8 per scene) | lib/youtube/filter-results.ts |
| Visual Sourcing API | Orchestrate visual generation for all scenes | Project ID | Visual suggestions in DB | /api/projects/[id]/generate-visuals |
| Suggestions API | Retrieve stored visual suggestions | Project/Scene ID | Formatted suggestions array | /api/projects/[id]/visual-suggestions |
| VisualSourcingLoader | Display progress during visual sourcing | Project state | Loading UI with progress | components/features/visual-sourcing/ |

### Data Models and Contracts

```typescript
// Visual Suggestions Table Schema
interface VisualSuggestion {
  id: string;                    // Primary key
  scene_id: string;              // Foreign key to scenes.id
  video_id: string;              // YouTube video ID
  title: string;                 // Video title
  thumbnail_url: string;         // Thumbnail image URL
  channel_title: string;         // YouTube channel name
  embed_url: string;             // Embeddable video URL
  rank: number;                  // Suggestion ranking (1-8)
  created_at: string;            // ISO timestamp
}

// Scene Analysis Result
interface SceneAnalysis {
  primary_query: string;         // Main search query
  alternative_queries: string[]; // 2-3 alternative queries
  content_type: 'gameplay' | 'tutorial' | 'nature' | 'documentary' | 'general';
  keywords: string[];            // Extracted keywords
  mood: string;                  // Scene mood/atmosphere
}

// YouTube Search Parameters
interface YouTubeSearchParams {
  q: string;                     // Search query
  part: 'snippet';               // API response parts
  type: 'video';                 // Content type
  videoEmbeddable: true;         // Only embeddable videos
  maxResults: number;            // 10-15 per query
  relevanceLanguage: string;     // Default 'en'
}

// Filter Configuration
interface FilterConfig {
  minViewCount: number;          // Default 1000
  maxTitleEmojis: number;        // Default 5
  maxTitleCapsPercent: number;   // Default 0.5
  preferCreativeCommons: boolean;// Default true
  contentTypeFilters: Map<ContentType, FilterRules>;
}
```

### APIs and Interfaces

```typescript
// POST /api/projects/[id]/generate-visuals
Request: { projectId: string }
Response: {
  success: boolean;
  scenesProcessed: number;
  suggestionsGenerated: number;
  errors?: string[];
}

// GET /api/projects/[id]/visual-suggestions
Request: { projectId: string, sceneId?: string }
Response: {
  suggestions: VisualSuggestion[];
  totalScenes: number;
  scenesWithSuggestions: number;
}

// YouTubeAPIClient Methods
class YouTubeAPIClient {
  constructor(apiKey: string);
  searchVideos(query: string, options?: SearchOptions): Promise<VideoResult[]>;
  getQuotaUsage(): { used: number; limit: number };
  isQuotaExceeded(): boolean;
}

// Error Codes
enum YouTubeErrorCode {
  MISSING_API_KEY = 'YOUTUBE_API_KEY_NOT_CONFIGURED',
  INVALID_API_KEY = 'YOUTUBE_API_KEY_INVALID',
  QUOTA_EXCEEDED = 'YOUTUBE_QUOTA_EXCEEDED',
  RATE_LIMITED = 'YOUTUBE_RATE_LIMITED',
  NETWORK_ERROR = 'YOUTUBE_NETWORK_ERROR'
}
```

### Workflows and Sequencing

**Visual Sourcing Workflow:**
1. Trigger: Epic 2 voiceover generation completes → project.current_step = 'visual-sourcing'
2. Load all scenes for project from database (ordered by scene_number)
3. For each scene:
   - Call SceneAnalyzer with scene.text
   - Extract visual themes, generate search queries
   - Execute YouTube searches (primary + alternatives)
   - Aggregate and deduplicate results
   - Apply content filtering and quality ranking
   - Store top 5-8 suggestions in visual_suggestions table
4. Update project.visuals_generated = true
5. Update project.current_step = 'visual-curation'
6. Navigate to Epic 4 Visual Curation UI

**Error Recovery Flow:**
1. Track completion per scene in session
2. On failure, display retry button
3. Retry only failed scenes (skip completed)
4. After 3 attempts, allow manual proceed with partial results

## Non-Functional Requirements

### Performance

- Scene analysis completion: < 5 seconds per scene
- YouTube API search: < 3 seconds per query (excluding network latency)
- Total visual sourcing time: < 30 seconds for 5-scene script
- Suggestion retrieval: < 100ms from database
- Maximum concurrent API requests: 10 (respecting rate limits)
- Response caching: 5 minutes for identical queries

### Security

- API key stored in environment variables only (never in code or database)
- API key validation on startup with actionable error messages
- No storage of YouTube video content (only metadata and IDs)
- HTTPS-only communication with YouTube API
- Input sanitization for search queries (prevent injection)
- Rate limiting on visual generation endpoint (max 1 per project per minute)

### Reliability/Availability

- Exponential backoff retry logic (max 3 attempts)
- Graceful degradation when YouTube API unavailable
- Partial completion recovery (resume from failure point)
- Fallback to keyword extraction when LLM unavailable
- Empty state handling when no results found
- Quota exceeded handling with user-friendly messaging

### Observability

- Log all YouTube API requests with quota usage
- Track scene analysis success/failure rates
- Monitor average suggestions per scene
- Log filter effectiveness (videos filtered vs passed)
- Track API error rates by type
- Session-based progress tracking for debugging

## Dependencies and Integrations

**External Services:**
- YouTube Data API v3 (requires API key from Google Cloud Console)
- LLM Provider (Ollama or Gemini from Epic 1)

**NPM Dependencies:**
- @googleapis/youtube (or axios for direct API calls)
- Existing: ollama, @google/generative-ai (from Epic 1)

**Internal Dependencies:**
- Epic 1: LLM provider abstraction for scene analysis
- Epic 2: Scene structure and voiceover completion trigger
- Database: scenes table (Epic 2), new visual_suggestions table

**Configuration Requirements:**
- YOUTUBE_API_KEY environment variable (required)
- LLM_PROVIDER environment variable (from Epic 1)
- Daily quota: 10,000 units (default free tier)
- Rate limit: 100 requests per 100 seconds

## Acceptance Criteria (Authoritative)

1. **YouTube API client successfully authenticates with valid API key from environment variable**
2. **Missing API key displays actionable error: "YouTube API key not configured. Add YOUTUBE_API_KEY to .env.local"**
3. **Scene text analysis generates relevant search queries within 5 seconds per scene**
4. **YouTube search returns 10-15 video results per query with required metadata**
5. **Content filtering removes spam and low-quality videos (view count, title spam checks)**
6. **Quality ranking produces diverse, high-quality suggestions (5-8 per scene)**
7. **Visual suggestions stored in database with scene associations and ranking**
8. **Visual sourcing triggers automatically after Epic 2 voiceover generation**
9. **Progress indicator shows real-time status: "Analyzing scene X of Y..."**
10. **Zero results handling displays helpful empty state message**
11. **API quota exceeded shows user-friendly error with retry guidance**
12. **Partial failure recovery allows retry without regenerating completed scenes**
13. **Project workflow advances from 'visual-sourcing' to 'visual-curation' on completion**
14. **Gaming content filtering successfully identifies "gameplay only" videos**
15. **Creative Commons licensed videos ranked higher when available**

## Traceability Mapping

| Acceptance Criteria | Spec Section | Component/API | Test Idea |
|-------------------|--------------|---------------|-----------|
| AC1: API Authentication | YouTubeAPIClient | lib/youtube/client.ts | Unit test with valid/invalid keys |
| AC2: Missing API Key Error | Error Handling | client.ts constructor | Test empty env variable |
| AC3: Scene Analysis Speed | SceneAnalyzer | analyze-scene.ts | Performance test with timer |
| AC4: Search Results | YouTube Search | searchVideos() | Integration test with API |
| AC5: Content Filtering | ContentFilter | filter-results.ts | Unit test filter rules |
| AC6: Quality Ranking | Ranking Algorithm | filter-results.ts | Test ranking order |
| AC7: Database Storage | Data Models | saveVisualSuggestions() | Database integration test |
| AC8: Auto Trigger | Workflow | Epic 2 integration | E2E test full flow |
| AC9: Progress UI | VisualSourcingLoader | React component | Component test |
| AC10: Empty State | Error Handling | UI component | Test zero results |
| AC11: Quota Error | Error Handling | API client | Mock quota exceeded |
| AC12: Partial Recovery | Workflow | generate-visuals API | Test retry logic |
| AC13: Workflow State | Project State | Database update | State transition test |
| AC14: Gaming Filter | Content Filtering | filter-config.ts | Test gaming keywords |
| AC15: CC Licensing | Ranking | filter-results.ts | Test license priority |

## Risks, Assumptions, Open Questions

**Risks:**
- Risk: YouTube API quota (10,000 units/day) may be insufficient for heavy usage
  - Mitigation: Implement caching, optimize queries, provide quota usage dashboard
- Risk: YouTube search may not return relevant results for abstract concepts
  - Mitigation: Multiple search query variations, fallback keywords, empty state guidance
- Risk: API key exposure if not properly secured
  - Mitigation: Environment variables only, never commit keys, validate on startup

**Assumptions:**
- Assumption: YouTube Data API v3 remains stable and available
- Assumption: Free tier quota (10,000 units) sufficient for MVP testing
- Assumption: Users have access to Google Cloud Console for API key generation
- Assumption: YouTube's embeddable flag accurately identifies playable videos
- Assumption: Scene text provides enough context for meaningful visual search

**Open Questions:**
- Question: Should we implement result caching to reduce API calls for common queries?
  - Next Step: Monitor API usage patterns in testing, implement if needed
- Question: How to handle region-restricted content?
  - Next Step: Test with VPN, may need region parameter in search
- Question: Should we support other video platforms (Vimeo, Dailymotion)?
  - Next Step: Gather user feedback post-MVP about video source preferences

## Test Strategy Summary

**Test Levels:**
- Unit Tests: YouTubeAPIClient methods, filter functions, ranking algorithm
- Integration Tests: Database operations, API endpoint flows, LLM integration
- Component Tests: VisualSourcingLoader UI, progress tracking
- E2E Tests: Complete flow from voiceover completion to visual curation

**Key Test Scenarios:**
1. Happy path: 5-scene script generates 5-8 suggestions per scene
2. Empty results: Scene with no YouTube matches shows appropriate message
3. Quota exceeded: Graceful error handling and user guidance
4. Partial failure: Retry recovers without regenerating completed scenes
5. Gaming content: "Gameplay" scenes filter appropriately
6. API key missing: Clear error message on startup
7. Network failure: Exponential backoff and recovery

**Coverage Focus:**
- Error handling paths (API failures, quota, network)
- Filter edge cases (all filtered, none filtered)
- Ranking algorithm correctness
- Database operations and constraints
- State transitions in workflow