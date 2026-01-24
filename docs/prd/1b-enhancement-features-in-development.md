# 1b. Enhancement Features (In Development)

*Features 1.10-1.12 are enhancement features currently in development, building on top of the core product.*

### 1.10. Automated Background Music

*   **Description:** The system automatically selects and applies background music that matches the video's topic and mood. Music is sourced via YouTube (yt-dlp) and mixed at reduced volume beneath the voiceover. For longer videos, multiple tracks are selected and transitioned at scene boundaries to maintain variety and engagement.

*   **User Stories:**
    1.  **As a creator,** I want background music automatically added to my video based on its topic, **so that** my videos feel professional without me manually searching for music.
    2.  **As a creator,** I want the music volume balanced beneath my voiceover, **so that** the narration remains clear and the music enhances rather than distracts.
    3.  **As a creator,** I want longer videos to have multiple music tracks, **so that** the audio doesn't feel repetitive over 10+ minute videos.

*   **Functional Requirements:**
    *   **Music Analysis & Search:**
        *   **FR-10.01:** The system shall analyze the confirmed video topic and scene content to determine appropriate music keywords.
        *   **FR-10.02:** The system shall use the LLM to generate music search queries based on topic, mood, and content type (e.g., "military" → "epic military orchestral no copyright", "Dark Souls" → "dark souls ambient soundtrack royalty free").
        *   **FR-10.03:** The system shall append "no copyright", "royalty free", "background music" to all music search queries.
    *   **Multi-Track Selection:**
        *   **FR-10.04:** The system shall determine the number of music tracks based on video duration:
            *   < 2 minutes: 1 track
            *   2-5 minutes: 2 tracks
            *   5-10 minutes: 3-4 tracks
            *   10+ minutes: 4-5 tracks
        *   **FR-10.05:** The system shall use the LLM to generate per-segment music search queries based on scene content and mood progression.
        *   **FR-10.06:** The system shall assign music tracks to scene groups (e.g., scenes 1-2 use track A, scenes 3-4 use track B).
    *   **Music Download:**
        *   **FR-10.07:** The system shall search YouTube for background music using generated keywords.
        *   **FR-10.08:** The system shall download audio-only from search results using yt-dlp.
        *   **FR-10.09:** The system shall store downloaded music in `.cache/audio/music/{projectId}/`.
    *   **Audio Mixing:**
        *   **FR-10.10:** The system shall mix background music at -15dB to -20dB below voiceover level (configurable).
        *   **FR-10.11:** The system shall apply fade-in (2 seconds) at video start and fade-out (3 seconds) at video end.
        *   **FR-10.12:** The system shall crossfade between tracks (1-2 second overlap) at scene transitions.
        *   **FR-10.13:** The system shall loop individual tracks if scene group duration exceeds track length.
        *   **FR-10.14:** The system shall use FFmpeg audio mixing to combine voiceover and background music tracks.
    *   **Error Handling:**
        *   **FR-10.15:** The system shall handle music download failures gracefully (video assembles without music rather than failing).
        *   **FR-10.16:** The system shall log warnings when music tracks fail to download or mix.

*   **Acceptance Criteria:**
    *   **AC1: Topic-Based Music Selection**
        *   **Given** a video about "Russian military operations".
        *   **When** assembly completes.
        *   **Then** the final video contains background music with military/epic orchestral characteristics.
    *   **AC2: Content-Specific Music**
        *   **Given** a video about "Dark Souls boss strategies".
        *   **When** assembly completes.
        *   **Then** the final video contains dark/atmospheric background music matching the game's tone.
    *   **AC3: Volume Balance**
        *   **Given** voiceover audio at 0dB.
        *   **When** music is mixed.
        *   **Then** music volume is between -15dB and -20dB (voiceover clearly audible over music).
    *   **AC4: Multi-Track for Long Videos**
        *   **Given** a 10-minute video with 8 scenes.
        *   **When** assembly completes.
        *   **Then** at least 3-4 different music tracks are used across the video.
    *   **AC5: Track Transitions**
        *   **Given** track A ends and track B begins at scene 4.
        *   **When** played back.
        *   **Then** there is a smooth 1-2 second crossfade between tracks.
    *   **AC6: Track Looping**
        *   **Given** a 3-minute scene group and 90-second music track.
        *   **When** assembly completes.
        *   **Then** the music loops seamlessly to cover full scene group duration.
    *   **AC7: Graceful Failure**
        *   **Given** 1 of 3 music downloads fails.
        *   **When** assembly runs.
        *   **Then** video completes with 2 working tracks and logs warning.
    *   **AC8: Complete Failure Fallback**
        *   **Given** all music downloads fail.
        *   **When** assembly runs.
        *   **Then** video completes successfully without background music.

### 1.11. AI-Generated Video Metadata & SEO Toolkit

*   **Description:** A comprehensive SEO optimization system that generates metadata and provides VidIQ-style intelligence for video discoverability. The system automatically generates optimized titles, descriptions, and tags, while also providing keyword research, title scoring, best posting times, and pre-upload SEO audits. This transforms the Export page into a full SEO command center, helping creators maximize their video's reach on YouTube and TikTok.

*   **User Stories:**
    1.  **As a creator,** I want AI-generated video titles, descriptions, and tags ready when my video is done, **so that** I can upload to YouTube/TikTok immediately without writing metadata manually.
    2.  **As a creator,** I want platform-specific metadata formats (YouTube vs TikTok), **so that** I can optimize for each platform's requirements.
    3.  **As a creator,** I want keyword suggestions with search volume and competition data, **so that** I can target high-opportunity topics.
    4.  **As a creator,** I want my titles scored and optimized, **so that** I can improve click-through rates.
    5.  **As a creator,** I want to know the best time to post my video, **so that** I can maximize initial engagement.
    6.  **As a creator,** I want an SEO audit before uploading, **so that** I can fix any issues that might hurt discoverability.

*   **Feature Components:**
    *   **1.11.1 - Core Metadata Generation:** Auto-generate title, description, tags after video assembly (baseline functionality)
    *   **1.11.2 - Keyword Research:** Suggest high-volume, low-competition keywords based on RAG data + trend analysis
    *   **1.11.3 - Title Optimizer:** Score titles (0-100), suggest improvements based on keyword placement, length, CTR patterns
    *   **1.11.4 - Smart Tag Generation:** Rank tags by relevance + search volume, competitor tag gap analysis
    *   **1.11.5 - Best Time to Post:** Analyze channel audience patterns or provide niche-based defaults for optimal upload timing
    *   **1.11.6 - Video Score/Audit:** Pre-upload SEO checklist with overall score and actionable improvement suggestions
    *   **1.11.7 - Thumbnail A/B Testing (Future):** Generate multiple thumbnail variants, track performance after upload

*   **Functional Requirements:**
    *   **Core Metadata (1.11.1):**
        *   **FR-11.01:** The system shall generate metadata automatically after video assembly completes.
        *   **FR-11.02:** The system shall use the video topic, script content, and scene themes as inputs for metadata generation.
        *   **FR-11.03:** The system shall generate an optimized video title (max 100 characters, engaging, keyword-rich).
        *   **FR-11.04:** The system shall generate a short description (~150 characters) with relevant hashtags.
        *   **FR-11.05:** The system shall generate 10-15 comma-separated tags optimized for discoverability.
        *   **FR-11.06:** The system shall provide YouTube-optimized and TikTok-optimized variants.
        *   **FR-11.07:** The system shall display metadata on the Export page with copy-to-clipboard functionality.
        *   **FR-11.08:** The system shall store generated metadata in the project record.
    *   **Keyword Research (1.11.2):**
        *   **FR-11.09:** The system shall analyze RAG data (news articles, competitor videos) to identify trending keywords in the user's niche.
        *   **FR-11.10:** The system shall display search volume indicators (High/Medium/Low) for suggested keywords.
        *   **FR-11.11:** The system shall display competition level for each keyword based on competitor content analysis.
        *   **FR-11.12:** The system shall suggest 10-20 keywords ranked by opportunity score (high volume + low competition).
    *   **Title Optimizer (1.11.3):**
        *   **FR-11.13:** The system shall score generated titles from 0-100 based on SEO best practices.
        *   **FR-11.14:** The system shall analyze keyword placement (front-loaded keywords score higher).
        *   **FR-11.15:** The system shall analyze title length (optimal: 50-70 characters for YouTube).
        *   **FR-11.16:** The system shall suggest 2-3 alternative title variants with scores.
        *   **FR-11.17:** The system shall provide specific improvement suggestions (e.g., "Move keyword 'drone warfare' to beginning").
    *   **Smart Tag Generation (1.11.4):**
        *   **FR-11.18:** The system shall generate 15-20 tags ranked by relevance + estimated search volume.
        *   **FR-11.19:** The system shall categorize tags: primary (topic), secondary (niche), trending (current events).
        *   **FR-11.20:** The system shall analyze competitor tags to identify gaps (tags competitors use that you're missing).
        *   **FR-11.21:** The system shall highlight high-opportunity tags (used by successful competitors, moderate competition).
    *   **Best Time to Post (1.11.5):**
        *   **FR-11.22:** For synced channels, the system shall analyze YouTube Analytics data to determine audience activity patterns.
        *   **FR-11.23:** For new channels, the system shall provide niche-based default recommendations (e.g., military content peaks on weekday evenings).
        *   **FR-11.24:** The system shall display recommended day(s) of week and hour range for posting.
        *   **FR-11.25:** The system shall show timezone-aware recommendations based on user's locale.
    *   **Video Score/Audit (1.11.6):**
        *   **FR-11.26:** The system shall provide a pre-upload SEO checklist with pass/fail indicators.
        *   **FR-11.27:** Checklist items shall include: title strength, description completeness, tag count, keyword coverage, thumbnail presence.
        *   **FR-11.28:** The system shall calculate an overall SEO score (0-100) based on weighted checklist items.
        *   **FR-11.29:** The system shall provide actionable suggestions for items scoring below threshold.
        *   **FR-11.30:** The system shall compare video's SEO score to average scores in the user's niche.
    *   **Thumbnail A/B Testing (1.11.7 - Future):**
        *   **FR-11.31:** The system shall generate 2-3 thumbnail variants using different frame selections and text treatments.
        *   **FR-11.32:** The system shall integrate with YouTube Analytics API to track thumbnail CTR after upload.
        *   **FR-11.33:** The system shall recommend the best-performing thumbnail variant after 48 hours of data.

*   **Data Sources:**
    | Feature | Data Source |
    |---------|-------------|
    | Keyword Research | RAG news articles + competitor videos + YouTube Search API trends |
    | Title Optimizer | Competitor title analysis + CTR patterns from successful videos |
    | Tag Suggestions | Competitor tags + RAG context + LLM generation |
    | Best Time to Post | YouTube Analytics API (if authorized) OR niche defaults |
    | Video Score | All above combined into weighted score |
    | Thumbnail A/B | YouTube Analytics API (requires OAuth + delayed metrics) |

*   **Acceptance Criteria:**
    *   **AC1: Metadata Generation**
        *   **Given** a video has been assembled with topic "Russian military operations in Ukraine".
        *   **When** the Export page loads.
        *   **Then** AI-generated title, description (with hashtags), and tags are displayed.
    *   **AC2: Platform Variants**
        *   **Given** generated metadata is displayed.
        *   **When** user switches between YouTube and TikTok tabs.
        *   **Then** description format and hashtag placement adjust for each platform.
    *   **AC3: Copy Functionality**
        *   **Given** metadata is displayed on Export page.
        *   **When** user clicks copy button for title, description, or tags.
        *   **Then** the text is copied to clipboard with success feedback.
    *   **AC4: Keyword Research Display**
        *   **Given** the Export/SEO page is displayed.
        *   **When** user views keyword suggestions.
        *   **Then** keywords are shown with volume indicators (High/Med/Low) and competition levels.
    *   **AC5: Title Scoring**
        *   **Given** a generated title "Why Drone Warfare Changes Everything".
        *   **When** title optimizer analyzes it.
        *   **Then** a score (e.g., 78/100) is displayed with specific improvement suggestions.
    *   **AC6: Tag Gap Analysis**
        *   **Given** competitor videos use tags the user's video doesn't have.
        *   **When** tag suggestions are displayed.
        *   **Then** "competitor gap" tags are highlighted as opportunities.
    *   **AC7: Best Time Recommendation**
        *   **Given** user is in the military niche.
        *   **When** best time to post is displayed.
        *   **Then** recommendation shows optimal days/hours (e.g., "Tuesday-Thursday, 6-8 PM EST").
    *   **AC8: SEO Audit Score**
        *   **Given** a video is ready for export.
        *   **When** user views SEO audit.
        *   **Then** overall score (0-100) is displayed with checklist of pass/fail items and improvement suggestions.

### 1.12. Automate Mode (Full Automation Pipeline)

*   **Description:** A project-level setting that enables fully automated video production from topic confirmation to final export. When enabled, the system automatically generates the script, creates voiceovers, sources and selects the most relevant B-roll footage, applies background music, assembles the video, and navigates directly to the export page. Users select their preferred voice and video source provider before automation begins.

*   **User Stories:**
    1.  **As a creator,** I want to enable "Automate Mode" for a project, **so that** I can generate complete videos with minimal manual intervention.
    2.  **As a creator,** I want to select my preferred voice before automation begins, **so that** the narration matches my content's style.
    3.  **As a creator,** I want to choose my video source provider (YouTube, DVIDS, Pexels/Pixabay) before automation begins, **so that** I get footage from my preferred source.
    4.  **As a creator,** I want the system to automatically select the most relevant B-roll for each scene, **so that** I don't have to manually curate visuals.
    5.  **As a creator,** I want to skip directly to the export page when automation completes, **so that** I can download my video immediately.

*   **Functional Requirements:**
    *   **Project Configuration:**
        *   **FR-12.01:** The system shall provide an "Automate Mode" toggle in project settings (default: OFF).
        *   **FR-12.02:** When Automate Mode is enabled, the system shall display voice selection UI before proceeding.
        *   **FR-12.03:** When Automate Mode is enabled, the system shall display video source selection UI (YouTube, DVIDS, Pexels/Pixabay) before proceeding.
        *   **FR-12.04:** The system shall store automation preferences (`automate_mode`, `video_source`) in project metadata.
        *   **FR-12.05:** Video source options shall include: YouTube (available), DVIDS (when implemented), Pexels/Pixabay (when implemented), with unavailable sources visually disabled.
    *   **Automated Pipeline Execution:**
        *   **FR-12.06:** Upon topic confirmation with Automate Mode enabled, the system shall execute the full pipeline without user intervention.
        *   **FR-12.07:** The pipeline shall execute in sequence: Script Generation → Voiceover Generation → Visual Sourcing → Auto-Selection → Music Selection → Video Assembly → Export.
        *   **FR-12.08:** The system shall display a progress indicator showing current pipeline stage and overall progress.
    *   **Automated Visual Selection:**
        *   **FR-12.09:** The system shall auto-select one video clip per scene based on relevance ranking.
        *   **FR-12.10:** Relevance ranking shall prioritize: (1) keyword match score, (2) cv_score (if available), (3) duration match, (4) B-roll quality indicators.
        *   **FR-12.11:** The system shall skip suggestions with cv_score < 0.5 during auto-selection.
        *   **FR-12.12:** If no suitable clips are found for a scene, the system shall retry with relaxed filters (remove duration cap, reduce keyword strictness).
    *   **Automated Music Selection:**
        *   **FR-12.13:** The system shall auto-select background music based on video topic and scene mood (per Feature 1.10).
    *   **Navigation & Completion:**
        *   **FR-12.14:** Upon successful assembly, the system shall automatically navigate to the Export page.
        *   **FR-12.15:** The Export page shall display the completed video with download options.
    *   **Error Handling:**
        *   **FR-12.16:** If visual sourcing fails after retry, the system shall halt and notify the user with option to: (a) retry, (b) switch to manual curation, (c) skip scene.
        *   **FR-12.17:** The system shall log all automation decisions for user review (which clips were selected, why).

*   **Acceptance Criteria:**
    *   **AC1: Automate Mode Toggle**
        *   **Given** a user creates or edits a project.
        *   **When** they access project settings.
        *   **Then** they must see an "Automate Mode" toggle (default OFF).
    *   **AC2: Pre-Automation Configuration**
        *   **Given** a user enables Automate Mode and confirms their topic.
        *   **When** the automation flow begins.
        *   **Then** the user must first select a voice AND video source before the pipeline executes.
    *   **AC3: Video Source Selection**
        *   **Given** the pre-automation configuration screen.
        *   **When** the user views video source options.
        *   **Then** they must see YouTube (enabled), DVIDS (disabled/coming soon), Pexels/Pixabay (disabled/coming soon).
    *   **AC4: Full Pipeline Execution**
        *   **Given** a project with Automate Mode enabled, voice selected, and video source selected.
        *   **When** the user confirms the topic "Benefits of solar energy".
        *   **Then** the system must automatically: generate script → generate voiceovers → source visuals → auto-select clips → select music → assemble video → navigate to export.
    *   **AC5: Auto-Selection Quality**
        *   **Given** a scene about "solar panels on rooftops".
        *   **When** auto-selection runs with 5 candidate clips.
        *   **Then** the selected clip must have the highest combined relevance score (keyword match + cv_score + duration fit).
    *   **AC6: Progress Indication**
        *   **Given** automation is in progress.
        *   **When** the user views the screen.
        *   **Then** they must see: current stage name, stage progress (e.g., "Scene 3/5"), overall pipeline progress percentage.
    *   **AC7: Retry on Failure**
        *   **Given** visual sourcing returns 0 results for a scene.
        *   **When** the system retries with relaxed filters.
        *   **Then** it must remove duration cap and reduce keyword strictness before failing.
    *   **AC8: Export Navigation**
        *   **Given** video assembly completes successfully.
        *   **When** the automation pipeline finishes.
        *   **Then** the user must be automatically redirected to the Export page with the video ready for download.

### 1.13. ElevenLabs TTS Integration

*   **Description:** The system provides ElevenLabs as an alternative cloud-based TTS provider alongside the local Kokoro TTS engine. Users can select their preferred TTS provider per project, choosing between free local generation (Kokoro) or premium cloud voices (ElevenLabs). The system tracks ElevenLabs API usage and displays remaining quota in the UI.

*   **User Stories:**
    1.  **As a creator,** I want to choose between Kokoro (local/free) and ElevenLabs (cloud/premium) for voiceover generation, **so that** I can balance cost vs. voice quality based on my needs.
    2.  **As a creator,** I want access to ElevenLabs' voice catalog separately from Kokoro voices, **so that** I can explore premium voice options.
    3.  **As a creator,** I want to see my ElevenLabs API usage in the UI, **so that** I can track my quota and avoid unexpected limits.

*   **Functional Requirements:**
    *   **Provider Configuration:**
        *   **FR-13.01:** The system shall support TTS provider selection: Kokoro (local, default) or ElevenLabs (cloud).
        *   **FR-13.02:** The system shall store TTS provider preference per project in project metadata.
        *   **FR-13.03:** The system shall allow global default TTS provider configuration via environment variables.
    *   **ElevenLabs Integration:**
        *   **FR-13.04:** The system shall integrate with ElevenLabs Text-to-Speech API v1.
        *   **FR-13.05:** The system shall retrieve and display available ElevenLabs voices (separate catalog from Kokoro).
        *   **FR-13.06:** The system shall generate voiceover audio using ElevenLabs API when selected as provider.
        *   **FR-13.07:** The system shall store ElevenLabs API key securely via environment variables.
    *   **Voice Selection:**
        *   **FR-13.08:** The Voice Selection UI shall display provider toggle (Kokoro / ElevenLabs).
        *   **FR-13.09:** The system shall show provider-specific voice options based on selection.
        *   **FR-13.10:** The system shall provide voice preview samples for ElevenLabs voices.
    *   **Usage Tracking:**
        *   **FR-13.11:** The system shall track ElevenLabs API character usage per request.
        *   **FR-13.12:** The system shall store cumulative usage in the database (daily/monthly totals).
        *   **FR-13.13:** The system shall display current usage and remaining quota in the UI.
        *   **FR-13.14:** The system shall warn users when approaching quota limits (80%, 95%).
        *   **FR-13.15:** The system shall block generation and notify user when quota is exhausted.
    *   **Error Handling:**
        *   **FR-13.16:** The system shall handle ElevenLabs API errors gracefully with user-friendly messages.
        *   **FR-13.17:** The system shall offer fallback to Kokoro when ElevenLabs fails or quota exceeded.

*   **Acceptance Criteria:**
    *   **AC1: Provider Selection**
        *   **Given** a user creates or edits a project.
        *   **When** they access voice selection.
        *   **Then** they must see a provider toggle (Kokoro / ElevenLabs) before voice options.
    *   **AC2: Separate Voice Catalogs**
        *   **Given** user selects Kokoro provider.
        *   **When** voice options load.
        *   **Then** only Kokoro voices are displayed.
        *   **Given** user selects ElevenLabs provider.
        *   **When** voice options load.
        *   **Then** only ElevenLabs voices are displayed (fetched from API).
    *   **AC3: ElevenLabs Voice Generation**
        *   **Given** a project configured with ElevenLabs provider and a selected ElevenLabs voice.
        *   **When** voiceover generation runs.
        *   **Then** audio files are generated using ElevenLabs API.
    *   **AC4: Usage Tracking Display**
        *   **Given** ElevenLabs is configured.
        *   **When** user views the settings or voice selection screen.
        *   **Then** current character usage and remaining quota are displayed.
    *   **AC5: Quota Warning**
        *   **Given** ElevenLabs usage reaches 80% of monthly quota.
        *   **When** user attempts voiceover generation.
        *   **Then** a warning is displayed before proceeding.
    *   **AC6: Quota Exhausted**
        *   **Given** ElevenLabs quota is exhausted.
        *   **When** user attempts voiceover generation with ElevenLabs.
        *   **Then** generation is blocked with message offering Kokoro fallback.
    *   **AC7: Graceful Fallback**
        *   **Given** ElevenLabs API returns an error.
        *   **When** voiceover generation fails.
        *   **Then** user is offered option to retry or switch to Kokoro.

### 1.14. Unified API Usage Dashboard

*   **Description:** A dedicated dashboard page (`/settings/api-usage`) that provides unified monitoring of all external API usage across the application. The system tracks per-request usage for Gemini API, YouTube Data API, and ElevenLabs API, displaying current usage against free tier limits with warning thresholds. This consolidates API tracking into a single view for cost management and quota monitoring.

*   **User Stories:**
    1.  **As a creator,** I want to see all my API usage in one dashboard, **so that** I can monitor my consumption across all services without checking multiple places.
    2.  **As a creator,** I want to see how close I am to each API's free tier limit, **so that** I can plan my video production to avoid hitting quotas.
    3.  **As a creator,** I want warnings when I'm approaching API limits, **so that** I'm not surprised by service interruptions.
    4.  **As a creator,** I want to see my usage history over the past 7 days, **so that** I can understand my consumption patterns.

*   **Functional Requirements:**
    *   **Dashboard Page:**
        *   **FR-14.01:** The system shall provide a dedicated API usage page at `/settings/api-usage`.
        *   **FR-14.02:** The dashboard shall display usage cards for each tracked API (Gemini, YouTube Data API, ElevenLabs).
        *   **FR-14.03:** Each usage card shall show: current usage, free tier limit, percentage used, and visual progress bar.
    *   **Per-Request Logging:**
        *   **FR-14.04:** The system shall log each API request with: timestamp, API name, endpoint, usage units consumed, project ID (if applicable).
        *   **FR-14.05:** The system shall store API usage logs in a dedicated database table.
        *   **FR-14.06:** The system shall retain usage logs for 7 days, with automatic cleanup of older records.
    *   **API-Specific Tracking:**
        *   **FR-14.07:** Gemini API tracking shall count requests per day against the 1,500 requests/day free tier.
        *   **FR-14.08:** YouTube Data API tracking shall count quota units per day against the 10,000 units/day free tier.
        *   **FR-14.09:** ElevenLabs API tracking shall count characters per month against the monthly character quota.
    *   **Warning System:**
        *   **FR-14.10:** The system shall display a warning indicator when any API reaches 80% of its quota.
        *   **FR-14.11:** The system shall display a critical warning when any API reaches 95% of its quota.
        *   **FR-14.12:** The system shall display a global warning banner in the main UI when any API is at critical level.
    *   **Usage History:**
        *   **FR-14.13:** The dashboard shall display a 7-day usage history chart for each API.
        *   **FR-14.14:** The system shall show daily breakdown of usage for daily-quota APIs (Gemini, YouTube).
        *   **FR-14.15:** The system shall show cumulative monthly usage for monthly-quota APIs (ElevenLabs).
    *   **Quota Reset Information:**
        *   **FR-14.16:** The dashboard shall display when each API's quota resets (daily at midnight UTC, monthly on billing date).
        *   **FR-14.17:** The system shall automatically reset daily counters at midnight UTC.

*   **Acceptance Criteria:**
    *   **AC1: Dashboard Access**
        *   **Given** a user is logged into the application.
        *   **When** they navigate to `/settings/api-usage`.
        *   **Then** they see a dashboard with usage cards for Gemini, YouTube Data API, and ElevenLabs.
    *   **AC2: Usage Display**
        *   **Given** user has made 500 Gemini requests today.
        *   **When** they view the Gemini usage card.
        *   **Then** it shows "500 / 1,500 requests (33%)" with a progress bar at 33%.
    *   **AC3: Per-Request Logging**
        *   **Given** a script generation request uses Gemini API.
        *   **When** the request completes.
        *   **Then** a log entry is created with timestamp, API name, endpoint, and usage units.
    *   **AC4: Warning at 80%**
        *   **Given** YouTube API usage reaches 8,000 units (80%).
        *   **When** user views the dashboard.
        *   **Then** the YouTube card shows a yellow warning indicator.
    *   **AC5: Critical Warning at 95%**
        *   **Given** Gemini API usage reaches 1,425 requests (95%).
        *   **When** user views any page in the application.
        *   **Then** a global warning banner appears indicating Gemini quota is nearly exhausted.
    *   **AC6: 7-Day History**
        *   **Given** user has been using the application for 7+ days.
        *   **When** they view the usage history chart.
        *   **Then** they see daily usage bars for the past 7 days for each API.
    *   **AC7: Quota Reset Display**
        *   **Given** it is 3pm UTC.
        *   **When** user views Gemini usage card.
        *   **Then** it shows "Resets in 9 hours" (midnight UTC).

---
