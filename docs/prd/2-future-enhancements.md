# 2. Future Enhancements

*This section lists features and improvements planned for future versions of the product.*

**Note:** Voice Selection (originally 2.1) has been moved to Core Features as Feature 1.3.

### 2.0. Domain-Specific Video Sources (DVIDS Military Footage)
*   **Description:** Add DVIDS (Defense Visual Information Distribution Service) as a domain-specific alternative video source alongside YouTube. When creating military-themed content, users can toggle "Military Mode" to search the official U.S. Department of Defense media repository instead of YouTube. This provides access to 1.8M+ public domain military assets including combat operations, training exercises, equipment demonstrations, and historical footage.
*   **Rationale:** Military content creators need authentic, high-quality B-roll footage that YouTube cannot reliably provide. DVIDS offers curated, public domain content from all U.S. military branches with no copyright concerns or content filtering needed. This establishes the pattern for adding additional domain-specific sources (NASA for space, Europeana for historical European content, etc.).
*   **Technical Components:**
    *   **DVIDS API Integration:**
        *   REST/JSON API at `https://api.dvidshub.net/`
        *   Search endpoint: `GET /search` with parameters for keywords, content type, duration, HD filtering
        *   Asset endpoint: `GET /asset` returns multiple quality MP4 download URLs (300kbps → 9Mbps)
        *   Free API key registration required
        *   Categories: Combat Operations, Training, Equipment, Humanitarian, Ceremonies, Historical
    *   **VideoSourceProvider Abstraction:**
        *   Create unified interface for video sources (`searchVideos`, `getVideoDetails`, `downloadSegment`)
        *   YouTube and DVIDS implement the same interface
        *   Easy to add future sources (NASA, Pexels, Europeana)
    *   **Source Selection UI:**
        *   Project-level setting: "Video Source" dropdown (YouTube, DVIDS Military)
        *   Or per-scene override in Visual Curation UI
        *   Visual indicator showing which source is active
*   **API Comparison:**
    | Feature | YouTube | DVIDS |
    |---------|---------|-------|
    | Content | General, mixed quality | Military-specific, curated |
    | Licensing | Varies, often restricted | **Public Domain** |
    | CV Filtering Needed | Heavy (faces, captions) | Minimal |
    | Quality | Up to 720p | Up to HD (1280x720, 9Mbps) |
    | Cost | Free (quota limited) | **Free** |
*   **Implementation Approach:**
    *   Create `lib/video-sources/dvids-client.ts` implementing `VideoSourceProvider` interface
    *   Add `video_source` column to `projects` table (default: 'youtube')
    *   Update Visual Sourcing service to use selected provider
    *   Reuse existing download, caching, and preview infrastructure
*   **User Value:** Military content creators get direct access to authentic DoD footage without copyright concerns. The abstraction layer enables future domain-specific sources, making the platform more versatile for niche content creation.
*   **FOSS Compliance:** DVIDS API is free to use. All content is U.S. Government public domain.

### 2.1. Stock Footage API Integration
*   **Description:** Add professional stock footage sources (Pexels, Pixabay) as alternatives or supplements to YouTube content. This provides access to high-quality, royalty-free stock video clips for creators who need more polished visuals or want commercial-grade footage.

 
### 2.3. Manual Visual Search
*   **Description:** In the Visual Curation UI, if a user is not satisfied with the AI-suggested clips for a scene, provide an option for them to enter keywords and manually search YouTube or connected stock footage sources for alternative clips.

### 2.4. Text Overlays
*   **Description:** Allow users to add simple text overlays (e.g., for titles, subtitles, or key points) on top of video clips within the Visual Curation UI.

### 2.5. Editable Script & Voiceover Regeneration
*   **Description:** In the Visual Curation UI, allow users to edit the AI-generated script text for any scene and trigger a re-generation of the voiceover for that specific scene. Additionally, allow users to switch voices per scene or for the entire project after initial generation.

### 2.6. Local Computer Vision (MediaPipe + Tesseract.js)
*   **Description:** Implement a fully local, free alternative to Google Cloud Vision API for B-roll content filtering. This enhancement replaces cloud-based CV analysis with on-device processing using MediaPipe for face detection and Tesseract.js for OCR/text detection, enabling unlimited video analysis with zero API costs.
*   **Rationale:** Aligns with the "FOSS-first, cloud-enhanced" philosophy by providing a completely free, offline-capable CV solution. Users with adequate hardware can process unlimited videos without API quotas or costs, while those preferring cloud accuracy can continue using Google Vision API.
*   **Technical Components:**
    *   **MediaPipe Face Detection:**
        *   Google's open-source, production-ready face detection
        *   Runs locally using TensorFlow.js or native bindings
        *   GPU-accelerated (WebGL/CUDA) for fast processing
        *   ~20-50ms per frame on modern hardware
        *   Replaces Google Vision FACE_DETECTION
    *   **Tesseract.js (OCR):**
        *   Open-source OCR engine (JavaScript port of Tesseract)
        *   Detects burned-in captions, watermarks, text overlays
        *   ~100-300ms per frame
        *   Replaces Google Vision TEXT_DETECTION
    *   **Label Detection Alternative:**
        *   Option A: TensorFlow.js with MobileNet/ImageNet models for scene classification
        *   Option B: Skip label verification (rely on keyword matching)
        *   Option C: Use CLIP model for semantic image-text matching
*   **Hardware Requirements:**
    *   Minimum: 8GB RAM, integrated GPU
    *   Recommended: 16GB+ RAM, 4GB+ VRAM (dedicated GPU)
    *   Optimal: 32GB RAM, 8GB+ VRAM (enables batch processing)
*   **Implementation Approach:**
    *   Create `lib/vision/local-cv-client.ts` as drop-in replacement for Vision API client
    *   Configuration option: `CV_PROVIDER=local|google` in environment
    *   Hybrid mode: Use local CV by default, fallback to Google Vision for edge cases
    *   Same interface (`analyzeVideoFrames`, `calculateCVScore`) for seamless switching
*   **Performance Comparison:**
    | Metric | Google Vision | Local (MediaPipe + Tesseract) |
    |--------|---------------|-------------------------------|
    | Cost | ~€0.01-0.02/video | **Free** |
    | Speed | ~500ms/video | ~1-2s/video |
    | Accuracy | 95%+ | 85-90% |
    | Offline | No | **Yes** |
    | Quota | 1,000 units/month free | **Unlimited** |
*   **User Value:** Creators can analyze unlimited B-roll footage with zero cloud costs. The slight accuracy trade-off (85-90% vs 95%+) is acceptable for filtering obvious faces/text overlays, which is the primary use case.
*   **FOSS Compliance:** All components (MediaPipe, Tesseract.js, TensorFlow.js) are open-source and free to use commercially.

### 2.7. Channel Intelligence & Content Research (RAG-Powered)
*   **Description:** A VidIQ-style intelligence system that syncs with your YouTube channel, analyzes competitors, monitors trends, and generates scripts informed by your niche and style. Uses RAG (Retrieval-Augmented Generation) to give the LLM full context of your channel, competitor content, and trending topics when generating scripts.
*   **Operating Modes:**
    *   **Established Channel Mode:** Sync your existing YouTube channel, analyze your content style and what performs well, generate new scripts matching YOUR voice plus current trends
    *   **Cold Start Mode (New Channel):** User declares their niche (e.g., "military videos"), system indexes top channels in that niche, learns successful patterns, generates scripts based on proven formulas + trending topics
*   **Data Sources:**
    | Source | Method | Refresh |
    |--------|--------|---------|
    | Your YouTube Channel | Auto-caption scraping via `youtube-transcript-api` + YouTube Data API (titles, descriptions, tags, metrics) | Daily |
    | Competitor Channels | Same scraping approach, up to 5 channels | Daily |
    | YouTube Trends | YouTube Search API + Google Trends (unofficial) for niche-specific trending videos | Daily |
    | News Discovery | Automated via Google News / news aggregators filtered by niche keywords | Daily |
*   **Technical Architecture:**
    | Component | Technology |
    |-----------|------------|
    | Caption Scraping | `youtube-transcript-api` (Python, FOSS) |
    | Vector Database | ChromaDB or LanceDB (local, FOSS) |
    | Embeddings | `all-MiniLM-L6-v2` (local) or Gemini |
    | YouTube Data | YouTube Data API v3 |
    | Trend Detection | YouTube Search API + Google Trends |
    | News Discovery | Google News API / web scraping |
*   **Military Niche Pre-configured Sources:**
    When user selects military niche, system prioritizes these authoritative sources:
    | Source | Focus | URL |
    |--------|-------|-----|
    | The War Zone | Investigative reports, satellite imagery, advanced systems | https://www.thedrive.com/the-war-zone |
    | Military.com | Daily news, benefits, careers | https://www.military.com/daily-news |
    | Defense News | Policy, contractors, strategic analysis | https://www.defensenews.com/ |
    | Breaking Defense | Industry news, analysis | https://breakingdefense.com/ |
    | Defense One | Future of national security | https://www.defenseone.com/ |
    | Military Times | Independent service member news | https://www.militarytimes.com/ |
    | Janes | Technical data, capability assessments | https://www.janes.com/osint-insights/defence-news |
*   **User Flow Example:**
    ```
    1. User: "I want to start a military channel"

    2. System indexes:
       - Top 5 military YouTube channels (user picks or auto-suggested)
       - Trending military videos on YouTube
       - Military news (The War Zone, Defense News, etc.)

    3. User: "What video should I make?"

    4. LLM (with RAG context):
       - "Based on trending: Navy just unveiled new destroyer class..."
       - "Competitor X got 2M views covering similar topic last week..."
       - "Here's a script matching successful patterns in your niche..."
    ```
*   **Use Cases:**
    *   New creator: "I want to make military videos" → System learns from top military channels, generates scripts based on what works
    *   Established creator: "What's trending in my niche?" → System analyzes competitor uploads, news, YouTube trends
    *   Content planning: "Give me 5 video ideas for this week" → System cross-references your style + gaps in your content + trending topics
    *   Script generation: Full awareness of your channel voice, competitor positioning, and current events
    *   **Quick Production Integration:** RAG-generated topic suggestions integrate with Feature 2.9 (Automated Video Production Pipeline) for one-click video creation.
*   **User Value:** Creators get data-driven content recommendations based on real channel performance, competitor analysis, and trend data—not just generic LLM suggestions. The system learns YOUR niche and style.
*   **Note:** Core features use only LLM's pre-trained knowledge. This RAG-powered intelligence system is planned for future enhancement.
*   **FOSS Compliance:** All core components are open-source: `youtube-transcript-api` (MIT), ChromaDB (Apache 2.0), LanceDB (Apache 2.0), `sentence-transformers` (Apache 2.0).

### 2.8. Pixabay Music Provider

*   **Description:** Replace YouTube/yt-dlp music sourcing with Pixabay Music API for fully legal, royalty-free background music. This provider swap enables commercial distribution of the application without YouTube Terms of Service concerns.
*   **Rationale:** YouTube's Terms of Service prohibit separating audio from video content. While yt-dlp works for personal use, commercial release requires a legally compliant music source. Pixabay offers royalty-free music with a REST API (500 requests/hour free tier).
*   **Technical Approach:**
    *   Create MusicSourceProvider interface (mirrors VideoSourceProvider pattern)
    *   Implement PixabayMusicProvider as drop-in replacement for YouTubeMusicProvider
    *   Configuration option: `MUSIC_PROVIDER=youtube|pixabay` in environment
    *   Same search/download/cache interface for seamless switching
*   **API Details:**
    *   Endpoint: `https://pixabay.com/api/`
    *   Free tier: 500 requests/hour
    *   No attribution required
    *   Categories: ambient, electronic, cinematic, classical, etc.
*   **User Value:** Enables legal commercial distribution of the AI Video Generator application.
*   **FOSS Compliance:** Pixabay API is free to use. All content is royalty-free.

### 2.9. Automated Video Production Pipeline

*   **Description:** A one-click video creation system that transforms RAG-generated topic suggestions into complete, ready-to-export videos through fully automated script generation, TTS, visual sourcing, and assembly. Unlike the manual visual sourcing pipeline (Feature 1.5), this automated pipeline uses domain-specific content APIs accessed via MCP (Model Context Protocol) servers, enabling creators to go from "topic idea" to "finished video" with a single click.
*   **Operating Modes:**
    *   **Quick Production Flow (QPF):** One-click video creation from RAG topic suggestions
    *   **Domain-Specific Automation:** Military content uses DVIDS API, space content uses NASA API, with future extensibility for stock footage, sports, news, and other domains
    *   **No Manual Curation:** System automatically selects best-matching visuals (no user choice in clip selection)
*   **Technical Architecture:**
    | Component | Technology |
    |-----------|------------|
    | Pipeline Orchestration | Automate Mode (Feature 1.12) + QPF extensions |
    | Visual Source APIs | Domain-specific content via Playwright-based MCP servers |
    | Web Scraping | Playwright + playwright-stealth (headless browser automation) |
    | Rate Limiting | MCP server layer (configurable per provider) |
    | Video Selection | Automatic best-match algorithm |
    | Progress Tracking | Real-time pipeline status API |
*   **Quick Production Flow (One-Click Video Creation):**
    *   **Description:** Enable one-click video creation directly from RAG-generated topic suggestions. Users click a topic suggestion and the system automatically creates a project, applies saved defaults (voice + persona), and triggers the full video production pipeline.
    *   **User Value:** Creators who trust the RAG system can go from "interesting topic idea" to "video in production" with a single click, eliminating the conversational brainstorming step entirely.
    *   **Workflow:**
        ```
        1. User views Topic Suggestions (RAG-generated from Feature 2.7)
        2. User clicks "Create Video" on a topic
        3. System automatically:
           - Creates new project with topic pre-filled
           - Sets topic_confirmed = true
           - Applies default voice (from user preferences)
           - Applies default persona (from user preferences)
           - Triggers script generation with RAG context
           - Triggers voiceover generation
           - Triggers visual sourcing from domain-specific API (auto-selection)
           - Assembles video
        4. User redirected to progress page, then export page when complete
        ```
    *   **Functional Requirements:**
        *   **FR-2.9.QPF.01:** The system shall display a "Create Video" button on each topic suggestion card.
        *   **FR-2.9.QPF.02:** The system shall store user default preferences (default_voice_id, default_persona_id) in user settings.
        *   **FR-2.9.QPF.03:** When "Create Video" is clicked, the system shall create a new project with the topic pre-filled and confirmed.
        *   **FR-2.9.QPF.04:** The system shall automatically apply the user's default voice and persona to the new project.
        *   **FR-2.9.QPF.05:** The system shall trigger the full video production pipeline (script → voice → visuals → assembly) without user intervention.
        *   **FR-2.9.QPF.06:** The system shall redirect the user to a progress page showing pipeline status.
        *   **FR-2.9.QPF.07:** Upon completion, the system shall redirect to the export page with the finished video.
        *   **FR-2.9.QPF.08:** If no defaults are configured, the system shall prompt the user to set defaults before proceeding.
    *   **Acceptance Criteria:**
        *   **AC-QPF.1:** Given a user has configured default voice and persona, when they click "Create Video" on a topic suggestion, then a new project is created and the pipeline starts automatically.
        *   **AC-QPF.2:** Given the pipeline is running, when the user views the progress page, then they see real-time status updates for each stage.
        *   **AC-QPF.3:** Given the pipeline completes successfully, when assembly finishes, then the user is automatically redirected to the export page.
        *   **AC-QPF.4:** Given a user has NOT configured defaults, when they click "Create Video", then they are prompted to select voice and persona before proceeding.
    *   **Technical Implementation:**
        *   Add `POST /api/projects/quick-create` endpoint
        *   Add `user_preferences` table or extend settings for default_voice_id, default_persona_id
        *   Add "Create Video" button to TopicSuggestions component
        *   Reuse existing pipeline from Automate Mode (Feature 1.12)
*   **Domain-Specific Content APIs:**
    *   **DVIDS (Defense Visual Information Distribution Service):**
        | Aspect | Details |
        |--------|---------|
        | Content | Official U.S. military footage (tanks, aircraft, ships, operations) |
        | Access | Via MCP server using Playwright headless browser automation |
        | Technology | Playwright + playwright-stealth (JavaScript rendering, network interception) |
        | Rate Limit | 30 seconds per request |
        | Licensing | Public domain (free to use) |
        | Use Case | Military channel automation |
        | Fallback | None (fails gracefully with error) |
    *   **NASA API (Future):**
        | Aspect | Details |
        |--------|---------|
        | Content | Space footage, launches, astronomy imagery |
        | Access | Via MCP server (official API if available, otherwise Playwright-based scraping) |
        | Technology | Official NASA API or Playwright + playwright-stealth (headless browser) |
        | Rate Limit | 30 seconds per request |
        | Licensing | Public domain (free to use) |
        | Use Case | Space/astronomy channel automation |
        | Status | Planned for future release |
    *   **Future Providers:** Stock footage APIs (Pexels, Pixabay, Shutterstock), sports APIs, news APIs - accessed via official APIs where available, or Playwright-based web scraping for sites without APIs
*   **MCP Server Architecture:**
    *   **Purpose:** Act as API gateway between application and content sources
    *   **Responsibilities:**
        - Rate limiting enforcement (30-second default per request)
        - Request queuing and caching
        - API key management (keys stay in MCP server, not app)
        - Error handling and retry logic
        - Usage monitoring and logging
        - Headless browser automation (Playwright) for JavaScript-rendered content
    *   **Protocol:** Model Context Protocol (MCP) standard
    *   **Deployment:** Separate server process, configurable endpoint
    *   **Technology Stack:** Playwright + playwright-stealth for web scraping, enabling JavaScript rendering and network request interception
*   **Automatic Visual Selection:**
    *   **Algorithm:** Rank results by relevance score (keyword match, semantic similarity, duration fit)
    *   **No User Choice:** System auto-selects best match (unlike manual pipeline where user selects from 5-8 options)
    *   **Fallback Behavior:** If domain-specific API fails, pipeline fails gracefully with clear error (NO fallback to YouTube)
*   **Rate Limiting Strategy:**
    *   **Default:** 30 seconds between requests to prevent API abuse
    *   **Implementation:** Enforced at MCP server layer
    *   **Per-Provider:** Configurable per content API (DVIDS: 30s, NASA: 30s, etc.)
    *   **User Experience:** Progress UI shows "Sourcing visuals (scene X of Y)..." during delays
*   **Functional Requirements:**
    *   **FR-2.9.01:** The system shall provide automated video production from RAG topic suggestions.
    *   **FR-2.9.02:** The system shall use domain-specific content APIs for visual sourcing (not YouTube).
    *   **FR-2.9.03:** The system shall access content APIs via MCP server layer.
    *   **FR-2.9.04:** The system shall enforce rate limiting (default: 30 seconds per request).
    *   **FR-2.9.05:** The system shall auto-select best-matching visuals (no user choice).
    *   **FR-2.9.06:** The system shall NOT fallback to YouTube if domain-specific API fails.
    *   **FR-2.9.07:** The system shall display real-time progress during pipeline execution.
    *   **FR-2.9.08:** The system shall support extensible content providers (DVIDS, NASA, future APIs).
*   **Acceptance Criteria:**
    *   **AC-2.9.1:** Given a user clicks "Create Video" on a military topic suggestion, when QPF executes, then visuals are sourced from DVIDS via MCP server only.
    *   **AC-2.9.2:** Given QPF is sourcing visuals for multiple scenes, when rate limit is active, then system waits 30 seconds between requests and shows progress.
    *   **AC-2.9.3:** Given DVIDS API is unavailable, when QPF attempts visual sourcing, then pipeline fails gracefully with error message (no YouTube fallback).
    *   **AC-2.9.4:** Given visual sourcing completes, when results are returned, then system auto-selects best match per scene without user intervention.
*   **User Value:** Creators can automate entire video production for their specific domain (military, space, etc.) with authentic, professional footage from authoritative sources, not random YouTube videos.
*   **Differentiation from Manual Pipeline:**
    | Aspect | Manual Pipeline (Feature 1.5) | Automated Pipeline (Feature 2.9) |
    |--------|------------------------------|-------------------------------|
    | Entry Point | Conversational chat → topic confirmation | RAG topic suggestion → one click |
    | Visual Source | YouTube API (general content) | Domain APIs via MCP (DVIDS, NASA) |
    | Clip Selection | User selects from 5-8 options | System auto-selects best match |
    | Workflow | Manual curation at each step | Fully automated |
    | Use Case | General creators want control | Niche channels want automation |
*   **Note:** Quick Production Flow builds upon RAG infrastructure from Feature 2.7 (Channel Intelligence) to provide topic suggestions with context.
*   **FOSS Compliance:** MCP server protocol is open-source. DVIDS and NASA content is public domain. Playwright is open-source (Apache 2.0 license).

---
