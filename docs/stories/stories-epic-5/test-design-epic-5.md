# Test Design: Epic 5 - Video Assembly & Output

**Epic:** Epic 5 - Video Assembly & Output
**Scope:** Stories 5.1-5.4 (COMPLETE) + Story 5.5 (PLANNED)
**Date:** 2025-11-27 (Updated from 2025-11-24)
**Author:** TEA (Test Architect)
**Version:** 2.0 (Added Story 5.4 coverage + Story 5.5 planning)

---

## Executive Summary

This test design covers the Video Assembly & Output pipeline, which represents the final MVP delivery epic. This epic transforms selected visual clips and voiceovers into a polished, downloadable video package with thumbnail.

**Updated Scope:** This revision adds:
- **Story 5.4:** Automated Thumbnail Generation (COMPLETED 2025-11-27) - Full test coverage analysis
- **Story 5.5:** Export UI & Download Workflow (PLANNED - Story not yet created) - Forward-looking test planning based on Epic 5 description

**Note on Story 5.5:** Acceptance criteria are derived from `epics.md` since the story file doesn't exist yet. Test planning is preliminary and will be refined when the story is created.

**Key Risk Areas:**
- Audio/video synchronization drift (BUS/PERF - Critical)
- FFmpeg command failures on different platforms (TECH - High)
- Output file corruption or format incompatibility (DATA - High)
- **NEW: Thumbnail text legibility across video backgrounds (BUS - Medium)**
- **NEW: Download mechanism cross-browser compatibility (TECH - Medium)**
- Windows path handling (TECH - Medium)

---

## Risk Assessment Matrix

### Risk Scores

| Risk ID | Category | Description | Probability | Impact | Score | Priority | Mitigation | Owner | Story |
|---------|----------|-------------|-------------|--------|-------|----------|------------|-------|-------|
| R-5.01 | **BUS** | Audio/video sync drift >0.1s - poor user experience | 2 | 3 | **6** | P0 | Precision timing validation, frame-accurate tests | QA | 5.3 |
| R-5.02 | **TECH** | FFmpeg not installed or version mismatch | 2 | 3 | **6** | P0 | Installation verification, clear error messages | Dev | 5.1 |
| R-5.03 | **DATA** | Output video corruption or unplayable | 2 | 3 | **6** | P0 | Multi-platform playability tests, codec validation | QA | 5.3 |
| R-5.04 | **TECH** | Windows path handling failures (backslashes, spaces) | 2 | 2 | **4** | P1 | Path normalization, special character escaping | Dev | 5.1-5.4 |
| R-5.05 | **PERF** | Assembly timeout for large projects (>10 scenes) | 2 | 2 | **4** | P1 | Performance warnings, timeout handling | Dev | 5.2, 5.3 |
| R-5.06 | **DATA** | Audio volume reduction from amix filter | 2 | 2 | **4** | P1 | normalize=0 implementation, volume tests | Dev | 5.3 |
| **R-5.07** | **BUS** | **Thumbnail text illegible on complex backgrounds** | 2 | 2 | **4** | **P1** | Shadow/outline validation, manual review | QA | **5.4** |
| **R-5.08** | **TECH** | **Thumbnail generation fails on special characters in title** | 2 | 2 | **4** | **P1** | Character escaping, error handling | Dev | **5.4** |
| **R-5.09** | **TECH** | **Download fails in Safari/Firefox (browser compatibility)** | 2 | 2 | **4** | **P1** | Cross-browser testing, standard download API | QA | **5.5** |
| R-5.10 | **OPS** | Temporary file cleanup failures | 1 | 2 | **2** | P2 | Cleanup verification, disk space monitoring | Dev | 5.1-5.4 |
| R-5.11 | **BUS** | Progress tracking UI not updating | 1 | 1 | **1** | P3 | Visual verification, polling tests | QA | 5.2, 5.3, 5.4 |
| **R-5.12** | **BUS** | **Downloaded filename contains invalid characters** | 1 | 1 | **1** | **P3** | Filename sanitization tests | Dev | **5.5** |

### Risk Summary
- **Critical (Score 6+):** 3 risks requiring immediate mitigation
- **Medium (Score 4-5):** 6 risks with planned mitigation (3 new from Stories 5.4-5.5)
- **Low (Score 1-3):** 3 risks monitored

---

## Acceptance Criteria Coverage Matrix

### Story 5.1: Video Processing Infrastructure Setup

| AC | Description | Test Level | Priority | Risk Link | Test Count | Automated | Status |
|----|-------------|------------|----------|-----------|------------|-----------|--------|
| AC1 | FFmpeg Installation Verification | Manual | P0 | R-5.02 | 2 | No | **MANUAL** |
| AC2 | Assembly Job Creation | Unit/API | P1 | - | 3 | Yes | Complete |
| AC3 | Job Status Updates | Unit/Integration | P1 | - | 4 | Yes | Complete |
| AC4 | Scene Validation | API | P1 | - | 2 | Yes | Complete |
| AC5 | Duplicate Job Prevention | API | P2 | - | 2 | Yes | Complete |
| AC6 | Basic FFmpeg Operations (Metadata) | Unit/Manual | P0 | R-5.03 | 4 | Partial | **MANUAL** |
| AC7 | Temporary File Management | Unit | P2 | R-5.10 | 2 | Yes | Complete |

**Story 5.1 Coverage:** 86% Automated (6/7 ACs), 14% Manual (1 AC)

---

### Story 5.2: Scene Video Trimming & Preparation

| AC | Description | Test Level | Priority | Risk Link | Test Count | Automated | Status |
|----|-------------|------------|----------|-----------|------------|-----------|--------|
| AC1 | Duration-Based Trimming | Unit | P0 | R-5.01 | 3 | Yes | Complete |
| AC2 | Trimmed Clip Storage | Unit | P1 | - | 2 | Yes | Complete |
| AC3 | Sequential Processing | Unit | P1 | - | 2 | Yes | Complete |
| AC4 | Progress Tracking Display | Manual | P1 | R-5.11 | 1 | No | **MANUAL** |
| AC5 | Short Video Edge Case (Loop) | Unit | P1 | - | 3 | Yes | Complete |
| AC6 | Missing Video Error | Unit | P0 | R-5.03 | 3 | Yes | Complete |
| AC7 | Performance (Real-World Timing) | Manual | P1 | R-5.05 | 1 | No | **MANUAL** |
| AC8 | Quality Preservation | Manual | P1 | R-5.03 | 1 | No | **MANUAL** |

**Story 5.2 Coverage:** 63% Automated (5/8 ACs), 37% Manual (3 ACs)

---

### Story 5.3: Video Concatenation & Audio Overlay

| AC | Description | Test Level | Priority | Risk Link | Test Count | Automated | Status |
|----|-------------|------------|----------|-----------|------------|-----------|--------|
| AC1 | Video Concatenation Duration | Unit/Integration | P0 | - | 2 | Yes | Complete |
| AC2 | Scene Order (Visual Verification) | Manual | P0 | R-5.01 | 1 | No | **MANUAL** |
| AC3 | Audio Synchronization (Listening) | Manual | **CRITICAL** | R-5.01 | 1 | No | **MANUAL** |
| AC4 | Audio Sync Accuracy (Timing) | Manual | **CRITICAL** | R-5.01 | 1 | No | **MANUAL** |
| AC5 | Output Format (H.264/AAC/MP4) | Unit | P1 | R-5.03 | 2 | Yes | Complete |
| AC6 | Output Location | Unit | P1 | - | 1 | Yes | Complete |
| AC7 | Project Record Update | Integration | P1 | - | 2 | Yes | Complete |
| AC8 | Job Completion | Integration | P1 | - | 2 | Yes | Complete |
| AC9 | Multi-Platform Playability | Manual | **CRITICAL** | R-5.03 | 1 | No | **MANUAL** |
| AC10 | File Size Validation | Manual | P2 | - | 1 | No | **MANUAL** |

**Story 5.3 Coverage:** 50% Automated (5/10 ACs), 50% Manual (5 ACs)

---

### Story 5.4: Automated Thumbnail Generation (NEW)

| AC | Description | Test Level | Priority | Risk Link | Test Count | Automated | Status |
|----|-------------|------------|----------|-----------|------------|-----------|--------|
| **AC1** | **16:9 JPG image created** | Unit/Integration | **P0** | - | 2 | **Partial** | **NEEDS FIX** |
| **AC2** | **Contains title text and video frame** | Manual | **P0** | R-5.07 | 1 | **No** | **MANUAL** |
| **AC3** | **Dimensions exactly 1920x1080** | Unit/Integration | **P0** | - | 2 | **Partial** | **NEEDS FIX** |
| **AC4** | **Frame extracted from assembled video** | Unit | **P1** | - | 1 | **Yes** | **NEEDS FIX** |
| **AC5** | **Saved to `public/videos/{projectId}/thumbnail.jpg`** | Integration | **P1** | - | 1 | **Yes** | Complete |
| **AC6** | **Project `thumbnail_path` updated** | API | **P1** | - | 1 | **Yes** | Complete |
| **AC7** | **Text legible with font/color/shadow** | Manual | **P1** | R-5.07 | 2 | **No** | **MANUAL** |
| **AC8** | **Job progress updated (70-85%)** | Unit | **P2** | - | 0 | **No** | **TODO** |
| **AC9** | **API endpoint returns thumbnail path** | API | **P1** | - | 1 | **Yes** | Complete |

**Story 5.4 Coverage:** 44% Automated (4/9 ACs), 33% Manual (3 ACs), **22% NEEDS FIX (2 ACs)**

**Critical Gap:** Current unit tests (25 tests) validate logic patterns but DON'T test actual `ThumbnailGenerator` class. See Test Review Report for improvement plan.

**Test Files:**
- `tests/unit/video/thumbnail.test.ts` - 25 tests (logic only, needs refactoring)
- `tests/integration/video/thumbnail.integration.test.ts` - **MISSING** (needs creation)
- `tests/api/thumbnail.test.ts` - **MISSING** (needs creation)

**Quality Score:** 58/100 (Grade C) → Target: 85/100 (Grade A)
**Improvement Effort:** 6-8 hours (see `docs/test-improvement-plan-story-5.4.md`)

---

### Story 5.5: Export UI & Download Workflow (PLANNED - NOT YET CREATED)

> **NOTE:** Story 5.5 story file does not exist yet (status: backlog). Acceptance criteria below are derived from Epic 5 description in `epics.md` lines 1444-1481. This section provides **forward-looking test planning** to support story creation when ready.

| AC (from Epic) | Description | Test Level | Priority | Risk Link | Test Count | Automated | Status |
|----|-------------|------------|----------|-----------|------------|-----------|--------|
| **AC1** | **Export page displays after assembly** | E2E | **P0** | - | 1 | **Planned** | **STORY TODO** |
| **AC2** | **Video player shows final video** | E2E | **P0** | R-5.03 | 1 | **Planned** | **STORY TODO** |
| **AC3** | **Thumbnail preview displays** | E2E | **P1** | - | 1 | **Planned** | **STORY TODO** |
| **AC4** | **Download Video button saves MP4** | E2E/Manual | **P0** | R-5.09 | 2 | **Partial** | **STORY TODO** |
| **AC5** | **Download Thumbnail button works** | E2E | **P1** | R-5.09 | 1 | **Planned** | **STORY TODO** |
| **AC6** | **Video metadata displayed** | E2E | **P2** | - | 1 | **Planned** | **STORY TODO** |
| **AC7** | **Loading state shows assembly progress** | E2E | **P1** | R-5.11 | 1 | **Planned** | **STORY TODO** |
| **AC8** | **Error state with retry option** | E2E | **P1** | - | 1 | **Planned** | **STORY TODO** |
| **AC9** | **Create New Video navigation** | E2E | **P3** | - | 1 | **Planned** | **STORY TODO** |
| **AC10** | **Project marked as complete** | Integration | **P1** | - | 1 | **Planned** | **STORY TODO** |
| **AC11** | **Page shareable (direct URL access)** | E2E | **P2** | - | 1 | **Planned** | **STORY TODO** |

**Story 5.5 Coverage:** Not applicable (story not created yet)

**Source:** Epic 5 description (`docs/epics.md` lines 1444-1481)

**When Story is Created:**
- Review and validate ACs against actual story file
- Update test IDs to match story format (5.5-E2E-001, etc.)
- Refine test scenarios based on final implementation design

**Estimated Test Count:** 12 tests (9 E2E, 2 Integration, 1 Manual)
**Estimated Effort:** 8-10 hours
**Priority:** Medium (MVP completion dependency)

**Test Files (Planned):**
- `tests/e2e/export-page.spec.ts` - E2E tests for export workflow
- `tests/integration/download.test.ts` - Download mechanism tests
- `tests/manual/cross-browser-download.md` - Manual cross-browser checklist

---

## Test Level Distribution

### Summary by Test Level (UPDATED)

| Level | Count | Time Budget | P0 | P1 | P2 | P3 | Stories |
|-------|-------|-------------|----|----|----|----|---------|
| **Unit** | 40 | 3 min | 10 | 18 | 12 | 0 | 5.1-5.4 |
| **Integration** | 12 | 7 min | 3 | 7 | 2 | 0 | 5.1-5.5 |
| **API** | 9 | 4 min | 0 | 6 | 3 | 0 | 5.1, 5.4-5.5 |
| **E2E** | 12 | 12 min | 4 | 6 | 2 | 0 | 5.5 |
| **Manual** | 20 | 195 min | 6 | 10 | 3 | 1 | 5.1-5.5 |
| **TOTAL** | **93** | **~221 min** | **23** | **47** | **22** | **1** | **All** |

### Test Pyramid Analysis

```
          /\
         /  \    E2E/Manual: 32 (34%)
        /----\   - Visual/audio verification
       /      \  - Download testing
      /--------\  - Cross-browser compatibility
     /          \
    /            \ Integration: 12 (13%)
   /--------------\- Database updates
  /                \- API endpoints
 /                  \ - Download mechanism
/____________________\
                       Unit: 49 (53%)
                       - FFmpeg commands
                       - Trimming/concat logic
                       - Thumbnail generation
```

**Analysis:** The manual testing percentage (34%) is higher than ideal but necessary for Epic 5 due to:
- Audio/video synchronization that cannot be validated programmatically
- Visual quality assessment (thumbnail legibility, video quality)
- Cross-platform playability (VLC, browsers)
- **NEW: Download mechanism across browsers (Safari, Firefox, Chrome)**
- **NEW: Thumbnail text legibility across video backgrounds**

**Improvement Opportunity:** Story 5.4 tests need refactoring to increase automation from 44% to 78% (add 6-8 hours, see improvement plan).

---

## Existing Automated Test Coverage

### Unit Tests (Complete for 5.1-5.3, Partial for 5.4)

| File | Story | Tests | Priority | Quality Score |
|------|-------|-------|----------|---------------|
| `tests/unit/video/ffmpeg.test.ts` | 5.1 | 14 tests | P0-P1 | Good |
| `tests/unit/video/assembler.test.ts` | 5.1 | 12 tests | P1-P2 | Good |
| `tests/unit/video/trimmer.test.ts` | 5.2 | 14 tests | P0-P1 | Good |
| `tests/unit/video/concatenator.test.ts` | 5.3 | 7 tests | P1-P2 | Good |
| **`tests/unit/video/thumbnail.test.ts`** | **5.4** | **25 tests** | **P1-P2** | **58/100 (C)** ⚠️ |

**Total Unit Tests:** 72 tests (47 production-ready + 25 needing improvement)
**Coverage:** Estimated 70% (would be >80% after Story 5.4 improvements)

**Story 5.4 Test Quality Issue:**
- ❌ Tests validate logic patterns, NOT actual `ThumbnailGenerator` class
- ❌ Zero AC coverage (0/9 ACs directly tested)
- ❌ No test IDs for traceability
- ✅ All 25 tests pass
- 📋 Improvement plan available: `docs/test-improvement-plan-story-5.4.md`

### API Tests (Complete for 5.1, Partial for 5.4, TODO for 5.5)

| File | Story | Tests | Priority |
|------|-------|-------|----------|
| `tests/api/assemble.test.ts` | 5.1 | 6 tests | P1 |
| **`tests/api/thumbnail.test.ts`** | **5.4** | **0 tests** | **P1** ⚠️ **TODO** |
| **`tests/api/export.test.ts`** | **5.5** | **0 tests** | **P1** ⚠️ **TODO** |

### Integration Tests (TODO for 5.4-5.5)

| File | Story | Tests | Priority | Status |
|------|-------|-------|----------|--------|
| **`tests/integration/video/thumbnail.integration.test.ts`** | **5.4** | **0 tests** | **P0** | **TODO** |
| **`tests/integration/download.test.ts`** | **5.5** | **0 tests** | **P1** | **TODO** |

### E2E Tests (TODO for 5.5)

| File | Story | Tests | Priority | Status |
|------|-------|-------|----------|--------|
| **`tests/e2e/export-page.spec.ts`** | **5.5** | **0 tests** | **P0** | **TODO** |

---

## Manual Test Requirements

### Critical Manual Tests (MUST COMPLETE)

Based on the manual acceptance criteria summary and test execution tracking:

#### Stories 5.1-5.3 (Existing)

| Test ID | Story | AC | Description | Time | Priority |
|---------|-------|----|----|------|----------|
| 5.1-AC1-M1 | 5.1 | AC1 | FFmpeg PATH verification | 5 min | P0 |
| 5.1-AC6-M1 | 5.1 | AC6 | Metadata accuracy (±0.1s) | 10 min | P0 |
| 5.2-AC4-M1 | 5.2 | AC4 | Progress indicator display | 5 min | P1 |
| 5.2-AC7-M1 | 5.2 | AC7 | Performance timing (<30s/scene) | 10 min | P1 |
| 5.2-AC8-M1 | 5.2 | AC8 | Quality preservation (visual) | 15 min | P1 |
| 5.3-AC2-M1 | 5.3 | AC2 | Scene order visual verification | 10 min | P0 |
| 5.3-AC3-M1 | 5.3 | AC3 | Audio sync listening test | 15 min | **CRITICAL** |
| 5.3-AC4-M1 | 5.3 | AC4 | Audio sync timing (drift <0.1s) | 20 min | **CRITICAL** |
| 5.3-AC9-M1 | 5.3 | AC9 | Multi-platform playability | 15 min | **CRITICAL** |
| 5.3-AC10-M1 | 5.3 | AC10 | File size validation (5-10 MB/min) | 5 min | P2 |

**Subtotal Stories 5.1-5.3:** ~110 minutes

#### Story 5.4 (NEW)

| Test ID | Story | AC | Description | Time | Priority |
|---------|-------|----|----|------|----------|
| **5.4-AC2-M1** | **5.4** | **AC2** | **Thumbnail contains title text** | **5 min** | **P0** |
| **5.4-AC7-M1** | **5.4** | **AC7** | **Text legible on dark background** | **5 min** | **P1** |
| **5.4-AC7-M2** | **5.4** | **AC7** | **Text legible on light background** | **5 min** | **P1** |
| **5.4-AC7-M3** | **5.4** | **AC7** | **Text legible on complex background** | **5 min** | **P1** |
| **5.4-AC7-M4** | **5.4** | **AC7** | **Long title (80 chars) font scales correctly** | **5 min** | **P2** |
| **5.4-AC7-M5** | **5.4** | **AC7** | **Special characters render correctly** | **5 min** | **P2** |

**Subtotal Story 5.4:** ~30 minutes

#### Story 5.5 (NEW - PLANNED)

| Test ID | Story | AC | Description | Time | Priority |
|---------|-------|----|----|------|----------|
| **5.5-AC4-M1** | **5.5** | **AC4** | **Download works in Chrome** | **5 min** | **P0** |
| **5.5-AC4-M2** | **5.5** | **AC4** | **Download works in Firefox** | **5 min** | **P0** |
| **5.5-AC4-M3** | **5.5** | **AC4** | **Download works in Safari** | **5 min** | **P0** |
| **5.5-AC4-M4** | **5.5** | **AC4** | **Download filename sanitized correctly** | **5 min** | **P1** |
| **5.5-E2E-M1** | **5.5** | **ALL** | **Full export workflow end-to-end** | **20 min** | **CRITICAL** |

**Subtotal Story 5.5:** ~40 minutes

### Additional Critical Tests

| Test ID | Description | Time | Priority | Story |
|---------|-------------|------|----------|-------|
| 5.3-CRIT1 | Audio volume normalization (normalize=0) | 15 min | **CRITICAL** | 5.3 |
| 5.3-CRIT2 | Windows path handling | 10 min | P1 | 5.3 |
| 5.3-CRIT3 | Large scene count warning (>10) | 10 min | P2 | 5.3 |
| **5.4-CRIT1** | **Thumbnail generation on Windows** | **10 min** | **P1** | **5.4** |
| **INT-E2E** | **Full pipeline integration (all stories)** | **30 min** | **CRITICAL** | **All** |

**Subtotal Additional:** ~75 minutes

**Total Manual Testing Time:** ~255 minutes (4.25 hours)

---

## Test Data Requirements

### Test Data Preparation Script

**File:** `tests/test-data/prepare-test-data.js`

**Test Assets Generated:**

| Asset | Duration | Resolution | Purpose | Stories |
|-------|----------|------------|---------|---------|
| scene-1-short-5s.mp4 | 5s | 720p | Basic trim test | 5.2 |
| scene-2-medium-7s.mp4 | 7s | 720p | Medium duration | 5.2 |
| scene-3-long-8s.mp4 | 8s | 720p | Standard scene | 5.2 |
| scene-4-exact-10s.mp4 | 10s | 720p | Exact duration test | 5.2 |
| scene-5-longer-30s.mp4 | 30s | 720p | Long video trim | 5.2 |
| hq-test-video.mp4 | 15s | 1080p/60fps | Quality preservation | 5.2 |
| voiceover-1-5s.mp3 | 5s | 44.1kHz | Scene 1 audio | 5.3 |
| voiceover-2-7s.mp3 | 7s | 44.1kHz | Scene 2 audio | 5.3 |
| voiceover-3-8s.mp3 | 8s | 44.1kHz | Scene 3 audio | 5.3 |
| voiceover-exact-8.5s.mp3 | 8.5s | 44.1kHz | Precision test | 5.3 |
| **final-test-video.mp4** | **60s** | **720p** | **Thumbnail frame extraction** | **5.4** |
| **dark-background.mp4** | **10s** | **720p** | **Text legibility (dark)** | **5.4** |
| **light-background.mp4** | **10s** | **720p** | **Text legibility (light)** | **5.4** |
| **complex-background.mp4** | **10s** | **720p** | **Text legibility (complex)** | **5.4** |

**Usage:**
```bash
node tests/test-data/prepare-test-data.js
```

### Test Scenarios from Manifest

1. **Basic 3-scene assembly:** 5s + 7s + 8s = 20s total
2. **Trimming test:** 30s video trimmed to 5s audio
3. **High quality test:** 1080p 60fps preservation
4. **Exact duration test:** 10.0s video, 8.5s audio
5. **NEW: Thumbnail generation:** Extract frame at 50% from 60s video
6. **NEW: Text legibility:** Overlay title on dark, light, complex backgrounds
7. **NEW: Full pipeline:** Generate video + thumbnail, download both

---

## Execution Order

### 1. Smoke Tests (<5 min)
```bash
# P0 subset - critical paths only
npx vitest run --grep "@p0" --reporter=verbose
```

**Tests:**
- FFmpegClient.verifyInstallation()
- VideoAssembler.createJob()
- Trimmer.trimScene() basic
- Concatenator.concatenateVideos() basic
- **NEW: ThumbnailGenerator.generate() basic** (after Story 5.4 improvements)

### 2. P0 Tests (<15 min)
```bash
# All critical tests
npx vitest run --grep "@p0" --reporter=verbose
npm test -- --grep "P0"
```

**Tests:**
- All unit tests for error handling
- Missing file validation
- Duration accuracy tests
- **NEW: Thumbnail dimensions validation**
- **NEW: API endpoint tests**

### 3. P1 Tests (<45 min)
```bash
# Core functionality
npm test -- --grep "@p0|@p1"
```

**Tests:**
- Full job lifecycle
- Progress tracking
- Edge cases (short video loop, exact duration)
- **NEW: Thumbnail text overlay**
- **NEW: Special character handling**
- **NEW: Integration tests**

### 4. Full Regression (<90 min automated + 255 min manual)
```bash
# Complete automated suite
npm test

# Then run manual tests per checklist
```

---

## Story 5.4 Test Improvement Roadmap

### Current State (2025-11-27)

**Quality Score:** 58/100 (Grade C)
**Status:** ⚠️ **NEEDS IMPROVEMENT**

**Issues:**
1. ❌ Tests validate logic patterns, not actual implementation
2. ❌ Zero AC coverage (0/9 ACs directly tested)
3. ❌ No test IDs for traceability
4. ❌ Interfaces redefined instead of imported (type safety risk)

### Improvement Plan (6-8 hours)

| Phase | Tasks | Effort | Impact |
|-------|-------|--------|--------|
| **Phase 1: Critical** | Add test IDs, import interfaces, test actual class | 2-3 hours | Score → 75/100 (B) |
| **Phase 2: Integration** | FFmpeg integration tests, API tests | 2 hours | Score → 82/100 (A) |
| **Phase 3: Coverage** | Traceability matrix, priority markers | 1.5 hours | Score → 85/100 (A) |
| **Phase 4: Optional** | Data factories, performance tests | 1 hour | Score → 90/100 (A+) |

**Full Plan:** `docs/test-improvement-plan-story-5.4.md`
**Test Review:** `docs/test-review-story-5.4-thumbnail.md`

### After Improvement

**New Tests:**
- `5.4-UNIT-026` through `5.4-UNIT-040`: Core ThumbnailGenerator tests with mocks (15 tests)
- `5.4-INT-001` through `5.4-INT-004`: Integration tests with real FFmpeg (4 tests)
- `5.4-API-001` through `5.4-API-003`: API endpoint tests (3 tests)

**Quality Score:** 85/100 (Grade A)
**AC Coverage:** 78% automated, 22% manual

---

## Story 5.5 Test Planning

### Test Strategy

**Primary Test Level:** E2E (Playwright)
**Rationale:** Export UI is primarily user-facing, requires browser interaction for download mechanism

### Planned Tests

#### E2E Tests (9 tests, ~12 min)

```typescript
// tests/e2e/export-page.spec.ts

describe('5.5-E2E-001: Export Page Navigation', () => {
  it('[P0] should display export page after assembly completes', async ({ page }) => {
    // Given: Project with completed assembly
    // When: Navigate to /projects/[id]/export
    // Then: Export page displays with video and thumbnail
  });
});

describe('5.5-E2E-002: Video Playback', () => {
  it('[P0] should play final assembled video', async ({ page }) => {
    // Given: Export page loaded
    // When: Click play on video player
    // Then: Video plays with controls
  });
});

describe('5.5-E2E-003: Download Mechanism', () => {
  it('[P0] should download video file', async ({ page }) => {
    // Given: Export page loaded
    // When: Click "Download Video" button
    // Then: MP4 file downloads to user's Downloads folder
  });

  it('[P1] should download thumbnail file', async ({ page }) => {
    // Given: Export page loaded
    // When: Click "Download Thumbnail" button
    // Then: JPG file downloads
  });
});

describe('5.5-E2E-004: Metadata Display', () => {
  it('[P2] should display video metadata', async ({ page }) => {
    // Given: Export page loaded
    // Then: Duration, file size, resolution displayed
  });
});

describe('5.5-E2E-005: Loading State', () => {
  it('[P1] should show assembly progress', async ({ page }) => {
    // Given: Assembly in progress
    // When: Navigate to export page
    // Then: Loading state shows "Assembling video... Trimming scenes (2/5)"
  });
});

describe('5.5-E2E-006: Error Handling', () => {
  it('[P1] should show error with retry option', async ({ page }) => {
    // Given: Assembly failed
    // When: Navigate to export page
    // Then: Error message displays with "Retry Assembly" button
  });
});

describe('5.5-E2E-007: Navigation', () => {
  it('[P3] should navigate to new project', async ({ page }) => {
    // Given: Export page loaded
    // When: Click "Create New Video"
    // Then: Navigate to home/new project page
  });
});

describe('5.5-E2E-008: Direct URL Access', () => {
  it('[P2] should allow direct URL access if complete', async ({ page }) => {
    // Given: Assembly complete
    // When: Access /projects/[id]/export directly
    // Then: Page loads successfully
  });
});
```

#### Integration Tests (2 tests, ~5 min)

```typescript
// tests/integration/download.test.ts

describe('5.5-INT-001: Download Mechanism', () => {
  it('[P1] should serve video file with correct headers', async () => {
    // Given: Completed video
    // When: Request video file
    // Then: Response has Content-Disposition: attachment
  });

  it('[P1] should serve thumbnail with correct headers', async () => {
    // Given: Generated thumbnail
    // When: Request thumbnail file
    // Then: Response has correct MIME type
  });
});

describe('5.5-INT-002: Project Status Update', () => {
  it('[P1] should mark project as complete', async () => {
    // Given: Export page viewed
    // Then: projects.current_step = 'complete'
  });
});
```

#### Manual Tests (5 tests, ~40 min)

See "Manual Test Requirements" section above for detailed checklist.

---

## Quality Gate Criteria

### Automated Tests

| Metric | Threshold | Current (5.1-5.3) | Target (5.1-5.5) |
|--------|-----------|-------------------|------------------|
| P0 Tests Pass Rate | 100% | ✅ 100% | ✅ 100% |
| P1 Tests Pass Rate | ≥95% | ✅ 100% | ✅ ≥95% |
| Unit Test Coverage | ≥80% | ~80% | ≥80% |
| Build Success | Pass | ✅ Pass | ✅ Pass |
| **Story 5.4 Quality Score** | **≥85/100** | **❌ 58/100** | **✅ 85/100** |

### Manual Tests

| Metric | Threshold |
|--------|-----------|
| Audio Sync Drift | <0.1s |
| Trimming Time | <30s/scene |
| File Size | 5-10 MB/min |
| Platform Compatibility | VLC, Chrome, Firefox, Safari |
| Volume Normalization | ±3dB from original |
| **Thumbnail Text Legibility** | **Readable on all backgrounds** |
| **Download Success Rate** | **100% across all browsers** |

### Gate Decision Criteria

**PASS:** All criteria met
- All P0 automated tests pass (100%)
- P1 tests pass rate ≥95%
- All critical manual tests pass
- No high-risk (score ≥6) items unmitigated
- **Story 5.4 quality score ≥85/100 (after improvements)**
- **Cross-browser download testing complete**

**CONCERNS:** Ship with caveats
- P1 pass rate 90-95%
- Non-critical manual test failures with workarounds documented
- **Story 5.4 quality score 75-84 (Phase 1 complete)**

**FAIL:** Do not release
- Any P0 test failure
- Critical manual test failure (audio sync, playability, **download mechanism**)
- Unmitigated risk with score ≥6
- **Story 5.4 quality score <75**

---

## Gaps and Recommendations

### Coverage Gaps Identified

#### Story 5.4 (CRITICAL)

1. **Actual Implementation Not Tested**
   - **Gap:** Tests validate logic patterns, not `ThumbnailGenerator` class
   - **Recommendation:** Implement Phase 1-3 of improvement plan (6-7 hours)
   - **Priority:** P0 (blocks production readiness)

2. **No Integration Tests**
   - **Gap:** FFmpeg commands not validated with real FFmpeg
   - **Recommendation:** Add integration tests with test video files
   - **Priority:** P1

3. **No API Tests**
   - **Gap:** POST /api/projects/[id]/generate-thumbnail not tested
   - **Recommendation:** Add API tests (30 min)
   - **Priority:** P1

#### Story 5.5 (PLANNED)

1. **Download Cross-Browser Testing**
   - **Gap:** Download mechanism may fail in Safari/Firefox
   - **Recommendation:** Add manual cross-browser test checklist
   - **Priority:** P1

2. **File Size Validation**
   - **Gap:** Large video files may cause browser timeouts
   - **Recommendation:** Add file size checks, streaming download if needed
   - **Priority:** P2

#### Stories 5.1-5.3 (EXISTING)

1. **Audio Sync Regression Tests**
   - **Gap:** No automated test validates sync accuracy
   - **Recommendation:** Add integration test that measures adelay timing against expected values
   - **Priority:** P1

2. **Windows Path Integration Test**
   - **Gap:** Unit tests mock fs, no real Windows path test
   - **Recommendation:** Add integration test on Windows CI runner
   - **Priority:** P1

3. **Performance Baseline**
   - **Gap:** No automated performance monitoring
   - **Recommendation:** Add performance test with timing assertions
   - **Priority:** P2

### Manual Test Dependencies

- **FFmpeg 7.x** must be installed on test machine
- **Test data** must be generated before manual testing (`prepare-test-data.js`)
- **Multiple browsers** (Chrome, Firefox, Safari) for playability and download tests
- **VLC Media Player** for codec verification
- **Various video backgrounds** (dark, light, complex) for thumbnail legibility tests

---

## Test Effort Estimates

| Category | Tests | Effort | Timeline | Status |
|----------|-------|--------|----------|--------|
| Unit Tests (5.1-5.3, existing) | 47 | Maintenance only | - | ✅ Complete |
| Unit Tests (5.4, improvements) | +15 | 3 hours | Sprint N+1 | ⚠️ TODO |
| Integration Tests (5.4, new) | 4 | 2 hours | Sprint N+1 | ⚠️ TODO |
| API Tests (5.4, new) | 3 | 30 min | Sprint N+1 | ⚠️ TODO |
| E2E Tests (5.5, new) | 9 | 6 hours | Sprint N+2 | 📋 Planned |
| Integration Tests (5.5, new) | 2 | 1 hour | Sprint N+2 | 📋 Planned |
| Manual Tests (5.4, new) | 6 | 30 min | Before release | 📋 Planned |
| Manual Tests (5.5, new) | 5 | 40 min | Before release | 📋 Planned |
| Manual Tests (5.1-5.3, regression) | 14 | 2 hours | Each release | ✅ Complete |

**Total Initial Effort (5.4-5.5):** ~13 hours
**Regression Effort:** ~3 hours per release

---

## Implementation Priority

### Sprint N+1 (Current - Story 5.4 Improvements)

**Priority: HIGH** - Fix Story 5.4 test quality issues

1. **Week 1:** Story 5.4 test improvements (6-7 hours)
   - Phase 1: Critical fixes (test actual class, add test IDs)
   - Phase 2: Integration tests
   - Phase 3: Coverage and traceability

2. **Validation:** Re-run test review, achieve Grade A (85/100)

### Sprint N+2 (Next - Story 5.5 Development)

**Priority: MEDIUM** - Complete MVP with Story 5.5

1. **Week 1:** Story 5.5 development + test implementation (8-10 hours)
   - E2E tests for export page
   - Integration tests for download mechanism
   - API tests for project completion

2. **Week 2:** Manual testing and cross-browser validation (2 hours)
   - Cross-browser download testing
   - Full pipeline integration test
   - MVP acceptance

---

## References

- **Stories:** 5.1, 5.2, 5.3, 5.4, 5.5 (docs/stories/)
- **Story 5.4 Test Review:** docs/test-review-story-5.4-thumbnail.md
- **Story 5.4 Improvement Plan:** docs/test-improvement-plan-story-5.4.md
- **Story 5.4 Review Summary:** docs/test-review-summary-story-5.4.md
- **Manual Test Checklist:** docs/review/manual-acceptance-testing-stories-5.1-5.2-5.3.md
- **Test Execution Tracking:** docs/review/test-execution-tracking.csv
- **Manual AC Summary:** docs/review/manual-acceptance-criteria-summary.md
- **Test Data Script:** tests/test-data/prepare-test-data.js
- **PRD:** Feature 1.7 (Automated Video Assembly), FR-7.01 through FR-7.06
- **PRD:** Feature 1.8 (Automated Thumbnail Generation), FR-8.01 through FR-8.05
- **Epics:** docs/epics.md lines 1272-1499

---

## Appendix: Test ID Reference

### Test ID Format
`{STORY}-{LEVEL}-{SEQ}`

- STORY: 5.1, 5.2, 5.3, 5.4, 5.5
- LEVEL: UNIT, INT, API, E2E, MANUAL
- SEQ: 001, 002, etc.

### Example IDs

**Story 5.1-5.3 (Existing):**
- `5.1-UNIT-001`: FFmpegClient initialization
- `5.2-UNIT-004`: Short video loop handling
- `5.3-MANUAL-001`: Audio sync listening test

**Story 5.4 (Needs Refactoring):**
- `5.4-UNIT-001` through `5.4-UNIT-025`: Existing logic tests (need refactoring)
- `5.4-UNIT-026` through `5.4-UNIT-040`: New tests for actual class (planned)
- `5.4-INT-001` through `5.4-INT-004`: Integration tests (planned)
- `5.4-API-001` through `5.4-API-003`: API tests (planned)

**Story 5.5 (Planned):**
- `5.5-E2E-001` through `5.5-E2E-009`: Export page E2E tests
- `5.5-INT-001` through `5.5-INT-002`: Download integration tests
- `5.5-MANUAL-001` through `5.5-MANUAL-005`: Cross-browser manual tests

---

## Change Log

### Version 2.0 (2025-11-27)
- Added Story 5.4 (Automated Thumbnail Generation) comprehensive test coverage analysis
- Added Story 5.5 (Export UI & Download Workflow) **forward-looking test planning** (story file not yet created - based on `epics.md`)
- Identified critical test quality issues in Story 5.4 (Quality Score: 58/100)
- Added 3 new risks (R-5.07, R-5.08, R-5.09) for Stories 5.4-5.5
- Updated test level distribution (+44 planned tests total)
- Added Story 5.4 improvement roadmap (6-8 hours)
- Added Story 5.5 preliminary test planning (8-10 hours estimated)
- Updated manual test requirements (+11 new tests, +70 minutes)
- Updated total effort estimates (+13 hours)
- **Clarification:** Story 5.5 coverage is preliminary planning only; will be refined when story is created

### Version 1.0 (2025-11-24)
- Initial test design for Stories 5.1, 5.2, 5.3
- 56 tests planned (34 unit, 8 integration, 6 API, 14 manual)
- 8 risks identified
- 165 minutes manual testing time

---

*Generated by TEA (Test Architect) - BMAD Method v6*
*Epic 5 Complete Test Design - Stories 5.1 through 5.5*
