# Test Design: Epic 5 - Video Assembly & Output

**Epic:** Epic 5 - Video Assembly & Output
**Scope:** Stories 5.1, 5.2, 5.3
**Date:** 2025-11-24
**Author:** TEA (Test Architect)

---

## Executive Summary

This test design covers the Video Assembly infrastructure (Stories 5.1-5.3), which represents the core video processing pipeline. Given the technical complexity of FFmpeg operations, audio/video synchronization requirements, and cross-platform concerns (Windows path handling), this epic has **elevated risk** requiring comprehensive testing at multiple levels.

**Key Risk Areas:**
- Audio/video synchronization drift (BUS/PERF - Critical)
- FFmpeg command failures on different platforms (TECH - High)
- Output file corruption or format incompatibility (DATA - High)
- Windows path handling (TECH - Medium)

---

## Risk Assessment Matrix

### Risk Scores

| Risk ID | Category | Description | Probability | Impact | Score | Priority | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|----------|------------|-------|
| R-5.01 | **BUS** | Audio/video sync drift >0.1s - poor user experience | 2 | 3 | **6** | P0 | Precision timing validation, frame-accurate tests | QA |
| R-5.02 | **TECH** | FFmpeg not installed or version mismatch | 2 | 3 | **6** | P0 | Installation verification, clear error messages | Dev |
| R-5.03 | **DATA** | Output video corruption or unplayable | 2 | 3 | **6** | P0 | Multi-platform playability tests, codec validation | QA |
| R-5.04 | **TECH** | Windows path handling failures (backslashes, spaces) | 2 | 2 | **4** | P1 | Path normalization, special character escaping | Dev |
| R-5.05 | **PERF** | Assembly timeout for large projects (>10 scenes) | 2 | 2 | **4** | P1 | Performance warnings, timeout handling | Dev |
| R-5.06 | **DATA** | Audio volume reduction from amix filter | 2 | 2 | **4** | P1 | normalize=0 implementation, volume tests | Dev |
| R-5.07 | **OPS** | Temporary file cleanup failures | 1 | 2 | **2** | P2 | Cleanup verification, disk space monitoring | Dev |
| R-5.08 | **BUS** | Progress tracking UI not updating | 1 | 1 | **1** | P3 | Visual verification, polling tests | QA |

### Risk Summary
- **Critical (Score 6+):** 3 risks requiring immediate mitigation
- **Medium (Score 4-5):** 3 risks with planned mitigation
- **Low (Score 1-3):** 2 risks monitored

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
| AC7 | Temporary File Management | Unit | P2 | R-5.07 | 2 | Yes | Complete |

**Story 5.1 Coverage:** 86% Automated (6/7 ACs), 14% Manual (1 AC)

---

### Story 5.2: Scene Video Trimming & Preparation

| AC | Description | Test Level | Priority | Risk Link | Test Count | Automated | Status |
|----|-------------|------------|----------|-----------|------------|-----------|--------|
| AC1 | Duration-Based Trimming | Unit | P0 | R-5.01 | 3 | Yes | Complete |
| AC2 | Trimmed Clip Storage | Unit | P1 | - | 2 | Yes | Complete |
| AC3 | Sequential Processing | Unit | P1 | - | 2 | Yes | Complete |
| AC4 | Progress Tracking Display | Manual | P1 | R-5.08 | 1 | No | **MANUAL** |
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

## Test Level Distribution

### Summary by Test Level

| Level | Count | Time Budget | P0 | P1 | P2 | P3 |
|-------|-------|-------------|----|----|----|----|
| **Unit** | 28 | 2 min | 8 | 14 | 6 | 0 |
| **Integration** | 8 | 5 min | 2 | 5 | 1 | 0 |
| **API** | 6 | 3 min | 0 | 4 | 2 | 0 |
| **Manual** | 14 | 165 min | 4 | 6 | 3 | 1 |
| **TOTAL** | 56 | ~175 min | 14 | 29 | 12 | 1 |

### Test Pyramid Analysis

```
          /\
         /  \    E2E/Manual: 14 (25%)
        /----\   - Visual/audio verification
       /      \  - Multi-platform playback
      /--------\
     /          \ Integration: 8 (14%)
    /            \ - Database updates
   /--------------\- Job lifecycle
  /                \
 /                  \ Unit: 34 (61%)
/____________________\ - FFmpeg commands
                       - Trimming logic
                       - Concatenation logic
```

**Analysis:** Given the video/audio nature of this epic, the manual testing percentage (25%) is higher than typical but necessary for:
- Audio/video synchronization that cannot be validated programmatically
- Visual quality assessment
- Cross-platform playability

---

## Existing Automated Test Coverage

### Unit Tests (Complete)

| File | Story | Tests | Priority |
|------|-------|-------|----------|
| `tests/unit/video/ffmpeg.test.ts` | 5.1 | 14 tests | P0-P1 |
| `tests/unit/video/assembler.test.ts` | 5.1 | 12 tests | P1-P2 |
| `tests/unit/video/trimmer.test.ts` | 5.2 | 14 tests | P0-P1 |
| `tests/unit/video/concatenator.test.ts` | 5.3 | 7 tests | P1-P2 |

**Total Unit Tests:** 47 tests
**Coverage:** Estimated >80%

### API Tests (Complete)

| File | Story | Tests | Priority |
|------|-------|-------|----------|
| `tests/api/assemble.test.ts` | 5.1 | 6 tests | P1 |

---

## Manual Test Requirements

### Critical Manual Tests (MUST COMPLETE)

Based on the manual acceptance criteria summary and test execution tracking:

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

### Additional Critical Tests

| Test ID | Description | Time | Priority |
|---------|-------------|------|----------|
| 5.3-CRIT1 | Audio volume normalization (normalize=0) | 15 min | **CRITICAL** |
| 5.3-CRIT2 | Windows path handling | 10 min | P1 |
| 5.3-CRIT3 | Large scene count warning (>10) | 10 min | P2 |
| INT-E2E | Full pipeline integration | 20 min | **CRITICAL** |

**Total Manual Testing Time:** ~165 minutes (2.75 hours)

---

## Test Data Requirements

### Test Data Preparation Script

**File:** `tests/test-data/prepare-test-data.js`

**Test Assets Generated:**

| Asset | Duration | Resolution | Purpose |
|-------|----------|------------|---------|
| scene-1-short-5s.mp4 | 5s | 720p | Basic trim test |
| scene-2-medium-7s.mp4 | 7s | 720p | Medium duration |
| scene-3-long-8s.mp4 | 8s | 720p | Standard scene |
| scene-4-exact-10s.mp4 | 10s | 720p | Exact duration test |
| scene-5-longer-30s.mp4 | 30s | 720p | Long video trim |
| hq-test-video.mp4 | 15s | 1080p/60fps | Quality preservation |
| voiceover-1-5s.mp3 | 5s | 44.1kHz | Scene 1 audio |
| voiceover-2-7s.mp3 | 7s | 44.1kHz | Scene 2 audio |
| voiceover-3-8s.mp3 | 8s | 44.1kHz | Scene 3 audio |
| voiceover-exact-8.5s.mp3 | 8.5s | 44.1kHz | Precision test |

**Usage:**
```bash
node tests/test-data/prepare-test-data.js
```

### Test Scenarios from Manifest

1. **Basic 3-scene assembly:** 5s + 7s + 8s = 20s total
2. **Trimming test:** 30s video trimmed to 5s audio
3. **High quality test:** 1080p 60fps preservation
4. **Exact duration test:** 10.0s video, 8.5s audio

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

### 2. P0 Tests (<10 min)
```bash
# All critical tests
npx vitest run --grep "@p0" --reporter=verbose
npm test -- --grep "P0"
```

**Tests:**
- All unit tests for error handling
- Missing file validation
- Duration accuracy tests

### 3. P1 Tests (<30 min)
```bash
# Core functionality
npm test -- --grep "@p0|@p1"
```

**Tests:**
- Full job lifecycle
- Progress tracking
- Edge cases (short video loop, exact duration)

### 4. Full Regression (<60 min automated + 165 min manual)
```bash
# Complete automated suite
npm test

# Then run manual tests per checklist
```

---

## Quality Gate Criteria

### Automated Tests

| Metric | Threshold | Current |
|--------|-----------|---------|
| P0 Tests Pass Rate | 100% | TBD |
| P1 Tests Pass Rate | ≥95% | TBD |
| Unit Test Coverage | ≥80% | ~80% |
| Build Success | Pass | Pass |

### Manual Tests

| Metric | Threshold |
|--------|-----------|
| Audio Sync Drift | <0.1s |
| Trimming Time | <30s/scene |
| File Size | 5-10 MB/min |
| Platform Compatibility | VLC, Chrome, Firefox, Safari |
| Volume Normalization | ±3dB from original |

### Gate Decision Criteria

**PASS:** All criteria met
- All P0 automated tests pass (100%)
- P1 tests pass rate ≥95%
- All critical manual tests pass
- No high-risk (score ≥6) items unmitigated

**CONCERNS:** Ship with caveats
- P1 pass rate 90-95%
- Non-critical manual test failures with workarounds documented

**FAIL:** Do not release
- Any P0 test failure
- Critical manual test failure (audio sync, playability)
- Unmitigated risk with score ≥6

---

## Gaps and Recommendations

### Coverage Gaps Identified

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
- **Test data** must be generated before manual testing
- **Multiple browsers** (Chrome, Firefox, Safari) for playability tests
- **VLC Media Player** for codec verification

---

## Test Effort Estimates

| Category | Tests | Effort | Timeline |
|----------|-------|--------|----------|
| Unit Tests (existing) | 47 | Maintenance only | - |
| Integration Tests (gaps) | 3 new | 4 hours | Sprint N+1 |
| Manual Tests (initial) | 14 | 3 hours | Before release |
| Manual Tests (regression) | 14 | 2 hours | Each release |

**Total Initial Effort:** ~7 hours
**Regression Effort:** ~2 hours per release

---

## References

- **Stories:** 5.1, 5.2, 5.3 (docs/stories/)
- **Manual Test Checklist:** docs/review/manual-acceptance-testing-stories-5.1-5.2-5.3.md
- **Test Execution Tracking:** docs/review/test-execution-tracking.csv
- **Manual AC Summary:** docs/review/manual-acceptance-criteria-summary.md
- **Test Data Script:** tests/test-data/prepare-test-data.js
- **PRD:** Feature 1.7 (Automated Video Assembly), FR-7.01 through FR-7.06

---

## Appendix: Test ID Reference

### Test ID Format
`{STORY}-{LEVEL}-{SEQ}`

- STORY: 5.1, 5.2, 5.3
- LEVEL: UNIT, INT, API, E2E, MANUAL
- SEQ: 001, 002, etc.

### Example IDs
- `5.1-UNIT-001`: FFmpegClient initialization
- `5.2-UNIT-004`: Short video loop handling
- `5.3-MANUAL-001`: Audio sync listening test

---

*Generated by TEA (Test Architect) - BMAD Method v6*
