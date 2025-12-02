# Sprint Change Proposal: Automated Background Music

**Date:** 2025-11-30
**Triggered By:** User feature request
**Change Scope:** Moderate
**Status:** Approved

---

## 1. Issue Summary

### Problem Statement
Generated videos lack background music, making them feel less professional and engaging compared to manually produced content. Users want automated music selection based on video topic/mood without manual intervention.

### Context
- Feature requested during active development phase
- User specified: automated selection based on keywords (e.g., military video → military music)
- User specified: music volume must be lower than voiceover
- User specified: multiple tracks for longer videos (10+ minutes) to avoid repetition

### Evidence
- Direct user request with clear requirements
- Aligns with product goal of end-to-end video automation

---

## 2. Impact Analysis

### Epic Impact

| Epic | Impact Level | Details |
|------|--------------|---------|
| Epic 1 | None | No changes |
| Epic 2 | Minor | LLM generates music keywords alongside script (can be done in assembly phase instead) |
| Epic 3 | None | No changes |
| Epic 4 | None | No changes |
| Epic 5 | **Major** | New stories for music search, download, and audio mixing |
| Epic 6 | None | No changes |

### Artifact Impact

| Artifact | Changes Required |
|----------|------------------|
| PRD | Add Feature 1.10 (MVP), Feature 2.8 (Future) |
| Architecture | Add Music Provider abstraction, audio mixing pipeline (deferred) |
| Epics | Add 2 new stories to Epic 5 |
| Database | Add project_music_tracks table (in architecture update) |
| UX Design | None (fully automated, no UI changes) |

### Technical Impact
- Leverages existing infrastructure: yt-dlp (already used for video), FFmpeg (already used for assembly)
- New FFmpeg audio mixing commands required
- New cache directory: `.cache/audio/music/{projectId}/`

---

## 3. Recommended Approach

### Selected Path: Direct Adjustment ✅

Add new functionality to existing Epic 5 (Video Assembly & Output) via 2 new stories.

### Rationale
1. **Low Technical Risk:** Uses existing infrastructure (yt-dlp, FFmpeg, LLM)
2. **High User Value:** Significantly improves video quality with minimal effort
3. **Natural Fit:** Music mixing is part of video assembly pipeline
4. **No Disruption:** Doesn't affect completed or in-progress stories

### Effort Estimate
- **Development:** 2 new stories (Story 5.6, Story 5.7)
- **Complexity:** Medium
- **Risk:** Low

---

## 4. Detailed Change Proposals

### 4.1 PRD Changes

#### Add Feature 1.10: Automated Background Music (MVP)

**Location:** After Feature 1.9 (LLM Configuration & Script Personas)

**Content:**
- Description of automated music selection based on topic/mood
- 3 user stories covering automation, volume balance, multi-track support
- 16 functional requirements (FR-10.01 to FR-10.16)
- 8 acceptance criteria (AC1 to AC8)

**Key Requirements:**
- LLM-generated music search queries based on topic and scene content
- Multi-track selection: 1 track (<2 min) to 4-5 tracks (10+ min)
- YouTube audio download via yt-dlp
- Volume mixing: -15dB to -20dB below voiceover
- Crossfade transitions between tracks (1-2s)
- Graceful failure: video completes without music if downloads fail

#### Add Feature 2.8: Pixabay Music Provider (Future)

**Location:** After Feature 2.7 (Channel Intelligence)

**Content:**
- Description of legal music provider swap for commercial release
- Technical approach: MusicSourceProvider interface
- API details: Pixabay REST API, 500 req/hour free tier
- Rationale: YouTube TOS compliance for distribution

---

### 4.2 Epic 5 Story Additions

#### Story 5.6: Automated Music Search & Download
**Implements:** FR-10.01, FR-10.02, FR-10.03, FR-10.04, FR-10.05, FR-10.06, FR-10.07, FR-10.08, FR-10.09, FR-10.15, FR-10.16

**Goal:** Automatically search and download background music tracks based on video topic and scene content

**Tasks:**
- Create MusicSearchService class (lib/music/search-service.ts)
- Implement LLM prompt to generate music search keywords from topic and scenes
- Determine track count based on video duration (1-5 tracks)
- Generate per-segment music queries based on scene mood progression
- Search YouTube for "no copyright royalty free background music" + keywords
- Implement YouTubeMusicProvider using yt-dlp for audio-only download
- Store downloaded tracks in `.cache/audio/music/{projectId}/track-{n}.mp3`
- Create music_tracks table: id, project_id, track_number, search_query, youtube_id, file_path, duration, status
- Assign tracks to scene groups (e.g., scenes 1-2 use track 1)
- Handle download failures gracefully (skip failed tracks, log warnings)

**Acceptance Criteria:**
- Given topic "Russian military operations", LLM generates keywords: "epic military orchestral", "war documentary music", etc.
- Given 10-minute video with 8 scenes, system selects 3-4 music tracks
- Music tracks downloaded as MP3 audio-only files via yt-dlp
- Tracks stored in `.cache/audio/music/{projectId}/` with metadata in database
- If download fails, system continues with available tracks (logs warning)
- If all downloads fail, assembly proceeds without music

**References:**
- PRD Feature 1.10 (Automated Background Music)
- FR-10.01 to FR-10.09

---

#### Story 5.7: Audio Mixing & Track Transitions
**Implements:** FR-10.10, FR-10.11, FR-10.12, FR-10.13, FR-10.14

**Goal:** Mix background music beneath voiceover with proper volume, looping, and crossfade transitions

**Tasks:**
- Create AudioMixer class (lib/audio/mixer.ts)
- Implement volume reduction filter: reduce music to -15dB to -20dB (configurable via MUSIC_VOLUME_DB env var)
- Create fade-in effect (2 seconds) at video start
- Create fade-out effect (3 seconds) at video end
- Implement crossfade between tracks (1-2 second overlap) at scene boundaries
- Loop tracks if scene group duration exceeds track length
- Build FFmpeg complex filter for multi-track mixing:
  - `[music1]volume=0.15,afade=in:d=2[m1]; [m1][music2]acrossfade=d=1.5[mix]; ...`
- Integrate with Story 5.3 (Video Concatenation & Audio Overlay)
- Update VideoProcessor to call AudioMixer before final render
- Handle edge cases: single track (no crossfade), missing tracks (mix available only)

**Acceptance Criteria:**
- Given voiceover at 0dB, music plays at -15dB to -20dB (voiceover clearly dominant)
- Video starts with 2-second music fade-in
- Video ends with 3-second music fade-out
- Given track A ends at scene 4, track B begins with 1-2s crossfade (no abrupt cut)
- Given 90-second track for 3-minute segment, track loops seamlessly
- Final video has both voiceover AND background music in single audio stream
- If no music tracks available, video renders with voiceover only (no error)

**References:**
- PRD Feature 1.10 (Automated Background Music)
- FR-10.10 to FR-10.14
- Story 5.3 (Video Concatenation & Audio Overlay)

---

## 5. Implementation Handoff

### Change Scope Classification: Moderate

This change requires:
- PRD updates (PM responsibility) ✅
- Epic story additions (PM/SM responsibility)
- Architecture updates (Architect responsibility - deferred)
- Implementation (Dev team responsibility)

### Handoff Plan

| Role | Responsibility | Deliverables |
|------|----------------|--------------|
| PM | Update PRD with Feature 1.10 and 2.8 | prd.md updated |
| SM | Add Stories 5.6 and 5.7 to epics.md | epics.md updated |
| Architect | Update Architecture (deferred to implementation) | architecture.md |
| Dev | Implement Stories 5.6 and 5.7 | Working code |

### Success Criteria
- [ ] PRD updated with Feature 1.10 and Feature 2.8
- [ ] Epic 5 updated with Stories 5.6 and 5.7
- [ ] Music automatically added to assembled videos
- [ ] Volume balance correct (voiceover > music)
- [ ] Multi-track support working for 10+ minute videos
- [ ] Graceful failure when music unavailable

---

## 6. Approval

**Proposal Status:** ✅ Approved by User

**Next Steps:**
1. Apply PRD changes (Feature 1.10, Feature 2.8)
2. Apply Epic 5 changes (Stories 5.6, 5.7)
3. Update story count in Epic Summary

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
