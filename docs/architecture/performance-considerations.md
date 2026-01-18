# Performance Considerations

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
