# Story 6.3: YouTube Channel Sync & Caption Scraping

**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
**Story:** 6.3 - YouTube Channel Sync & Caption Scraping
**Status:** Done
**Created:** 2025-11-30
**Completed:** 2025-11-30

---

## Story Description

Implement channel content ingestion via YouTube API and caption scraping using `youtube-transcript-api`. This story creates the core data ingestion pipeline for the RAG system, enabling the system to fetch video transcripts from YouTube channels and store their embeddings in ChromaDB for semantic search.

**User Value:** Creators can connect their YouTube channel (or competitor channels) and have the system automatically analyze their content. This enables RAG-augmented script generation that understands the creator's style, topics, and successful patterns.

---

## Acceptance Criteria

### AC-6.3.1: Channel Video Fetching
- **Given** a valid YouTube channel ID
- **When** the channel sync job runs
- **Then** the system fetches up to 50 most recent videos via YouTube Data API
- **And** video metadata (title, description, publishedAt, duration) is stored in channel_videos table

### AC-6.3.2: Transcript Scraping via Python
- **Given** a list of video IDs to process
- **When** the transcript scraper runs
- **Then** transcripts are extracted using youtube-transcript-api Python library
- **And** full transcript text is stored in channel_videos.transcript column

### AC-6.3.3: Embedding Storage in ChromaDB
- **Given** a transcript has been scraped for a video
- **When** embedding generation completes
- **Then** the embedding is stored in ChromaDB channel_content collection
- **And** metadata includes channelId, videoId, title, publishedAt

### AC-6.3.4: Rate Limiting
- **Given** the transcript scraper is processing multiple videos
- **When** API calls are made
- **Then** requests are limited to max 2 requests/second (500ms minimum delay)
- **And** rate limit errors trigger automatic retry with backoff

### AC-6.3.5: Incremental Sync
- **Given** a channel has been synced before
- **When** a subsequent sync job runs
- **Then** only videos published after last_sync timestamp are processed
- **And** previously indexed videos are not re-processed

### AC-6.3.6: Graceful Caption Handling
- **Given** some videos in a channel have no auto-captions
- **When** transcript scraping attempts to fetch captions
- **Then** videos without captions are logged and skipped
- **And** the sync job continues processing remaining videos
- **And** embedding_status is set to 'no_captions' for those videos

### AC-6.3.7: Sync Performance
- **Given** a channel with 50 videos that have captions
- **When** a full channel sync runs
- **Then** the sync completes within 5 minutes
- **And** progress updates are emitted at 10%, 30%, 60%, 80%, 100%

---

## Tasks

### Task 1: Create Python Caption Scraper Script
- [x] Create `scripts/youtube-transcript.py` script
- [x] Implement `get_transcript(video_id)` function using youtube-transcript-api
- [x] Implement `get_channel_transcripts(video_ids)` batch function
- [x] Handle various transcript languages (prioritize English)
- [x] Return JSON output for Node.js consumption
- [x] Handle errors: video unavailable, no captions, age-restricted
- [x] Add rate limiting (500ms delay between requests)

### Task 2: Create Node.js Python Bridge
- [x] Create `lib/rag/ingestion/python-bridge.ts`
- [x] Implement `execPython()` helper for subprocess execution
- [x] Implement `scrapeVideoTranscript(videoId)` function
- [x] Implement `scrapeVideoTranscripts(videoIds)` batch function
- [x] Parse Python JSON output
- [x] Handle Python subprocess errors gracefully
- [x] Add timeout handling (30s per video max)

### Task 3: Create YouTube Channel Service
- [x] Create `lib/rag/ingestion/youtube-channel.ts`
- [x] Implement `getChannelById(channelId)` using YouTube Data API
- [x] Implement `getChannelVideos(channelId, maxResults, publishedAfter)`
- [x] Parse video metadata (title, description, publishedAt, duration)
- [x] Handle API errors and quota exceeded
- [x] Extract channel_id from various URL formats (channel, @handle, /c/)

### Task 4: Create Channel Sync Service
- [x] Create `lib/rag/ingestion/channel-sync.ts`
- [x] Implement `syncChannel(channelId, options)` main function
- [x] Implement incremental sync logic (check last_sync)
- [x] Orchestrate: fetch videos → scrape transcripts → generate embeddings → store
- [x] Update channel.last_sync and channel.sync_status
- [x] Update channel_videos records with transcript and embedding_status
- [x] Emit progress events during sync

### Task 5: Create RAG Sync Channel Job Handler
- [x] Update `lib/jobs/handlers/rag-sync.ts` (stub from 6.2)
- [x] Implement `handleRagSyncChannel(job)` function
- [x] Extract channelId from job payload
- [x] Call channelSync.syncChannel()
- [x] Update job progress during execution
- [x] Store sync results in job.result

### Task 6: Create Channel Management API
- [x] Create `app/api/rag/channels/route.ts` for GET (list) and POST (add)
- [x] Create `app/api/rag/channels/[id]/route.ts` for GET, DELETE
- [x] Create `app/api/rag/channels/[id]/sync/route.ts` for POST (trigger sync)
- [x] Validate YouTube channel ID format
- [x] Enqueue rag_sync_channel job on channel add

### Task 7: Database Query Functions
- [x] Add `lib/db/queries-channels.ts`
- [x] Implement `createChannel()`, `getChannel()`, `updateChannel()`
- [x] Implement `getChannelByYouTubeId()`, `getChannelsByNiche()`
- [x] Implement `createChannelVideo()`, `updateChannelVideo()`
- [x] Implement `getChannelVideos()`, `getChannelVideoByYouTubeId()`
- [x] Implement `getUnprocessedVideos()` for incremental sync

### Task 8: Test Automation
- [x] Unit tests for Python bridge (8 tests)
- [x] Unit tests for channel service (7 tests)
- [x] Unit tests for channel sync service (9 tests)
- [x] Unit tests for database queries (18 tests)
- [x] Unit tests from RAG infrastructure (24 tests)
- [x] Total: 66 tests passing

---

## Technical Notes

### Architecture References
- **Architecture:** Section 19 - Feature 2.7 RAG Architecture
- **Tech Spec:** Epic 6 - Story 6.3 Acceptance Criteria
- **Database:** channel_videos table (Migration 013 from Story 6.1)

### Dependencies
- **Python:** youtube-transcript-api>=0.6.0 (already installed in 6.1)
- **Existing:** googleapis (YouTube Data API client)
- **Existing:** ChromaDB client (from Story 6.1)
- **Existing:** Job queue (from Story 6.2)

### Python Script Interface
```bash
# Single video transcript
python scripts/youtube-transcript.py --video-id <id>

# Multiple videos (batch)
python scripts/youtube-transcript.py --video-ids <id1>,<id2>,<id3>

# Output: JSON to stdout
{
  "success": true,
  "transcripts": [
    {
      "videoId": "abc123",
      "text": "Full transcript text...",
      "segments": [{"text": "...", "start": 0.0, "duration": 2.5}],
      "language": "en"
    }
  ],
  "errors": [
    {"videoId": "xyz789", "error": "NO_CAPTIONS"}
  ]
}
```

### Channel Sync Flow
```
1. Receive channel ID (from API or job payload)
2. Validate and fetch channel metadata via YouTube API
3. Fetch video list (up to 50, filtered by publishedAfter if incremental)
4. For each video:
   a. Scrape transcript via Python bridge
   b. Store transcript in channel_videos table
   c. Generate embedding via embeddings service (Story 6.1)
   d. Store embedding in ChromaDB with metadata
   e. Update embedding_status
5. Update channel.last_sync and sync_status
6. Return sync summary
```

### Rate Limiting Strategy
- YouTube Data API: Use existing quota management from Epic 3
- youtube-transcript-api: 500ms delay between requests (2 req/s)
- Exponential backoff on rate limit errors: 2s, 4s, 8s

### Error Categories
| Error | Handling |
|-------|----------|
| Video unavailable | Log and skip, embedding_status = 'unavailable' |
| No auto-captions | Log and skip, embedding_status = 'no_captions' |
| Age-restricted | Log and skip, embedding_status = 'restricted' |
| Rate limited | Retry with exponential backoff |
| Network timeout | Retry up to 3 times |
| Invalid channel ID | Fail job with clear error message |

### Performance Targets
- Transcript scrape: <2s per video (includes rate limit delay)
- Embedding generation: <500ms per transcript
- Full 50-video sync: <5 minutes
- Incremental sync (10 new videos): <1 minute

---

## Definition of Done

- [x] All acceptance criteria pass
- [x] Python transcript scraper script works
- [x] Node.js bridge calls Python correctly
- [x] Channel videos fetched via YouTube API
- [x] Transcripts stored in database
- [x] Embeddings stored in ChromaDB
- [x] Rate limiting prevents API abuse
- [x] Incremental sync works correctly
- [x] Missing captions handled gracefully
- [x] Job handler integrates with queue
- [x] Channel API endpoints work
- [x] Unit tests written and passing (66 tests)
- [x] No TypeScript/ESLint errors
- [x] Build passes successfully
- [x] Code reviewed and approved

---

## Story Points

**Estimate:** 8 points (Large)

**Justification:**
- Python/Node.js interop adds complexity
- Multiple API integrations (YouTube, ChromaDB)
- Rate limiting and error handling
- Integration with job queue from Story 6.2
- Many edge cases (missing captions, unavailable videos)

---

## References

- PRD: Feature 2.7 - Channel Intelligence & Content Research (RAG-Powered)
- Epic File: docs/epics.md - Epic 6 Story 6.3
- Tech Spec: docs/sprint-artifacts/tech-spec-epic-6.md
- Architecture: docs/architecture.md - Section 19 (RAG Architecture)
- ADR-012: youtube-transcript-api for Caption Scraping
