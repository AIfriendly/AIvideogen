# Test Design: Story 2.6 - Script & Voiceover Preview Integration

**Date:** 2025-11-09
**Author:** lichking
**Status:** Draft
**Epic:** 2 - Content Generation Pipeline
**Story:** 2.6 - Script & Voiceover Preview Integration

---

## Executive Summary

**Scope:** Full test design for Story 2.6 with critical production defect analysis

**Risk Summary:**

- Total risks identified: 9
- **CRITICAL BLOCKER:** 1 risk (Score: 9) - TTS service crash on Windows
- High-priority risks (≥6): 2 risks (Security)
- Medium-priority risks (3-5): 3 risks
- Low-priority risks (1-2): 3 risks
- Critical categories: TECH (4), SEC (2), DATA (1), OPS (1), BUS (1)

**Coverage Summary:**

- P0 scenarios: 4 (8 hours)
- P1 scenarios: 6 (7 hours)
- P2 scenarios: 5 (3 hours)
- P3 scenarios: 1 (0.25 hours)
- **Total effort**: 18.25 hours (~2.3 days)

**Critical Finding:**

🚨 **PRODUCTION DEFECT IDENTIFIED**: TTS service crashes immediately on Windows platform with exit code 1 after receiving synthesis requests. ALL voiceover generation currently fails. Root cause: SIGTERM signal handling incompatibility. **IMMEDIATE FIX REQUIRED.**

---

## Risk Assessment

### 🚨 CRITICAL BLOCKER (Score 9) - IMMEDIATE ACTION REQUIRED

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **TTS Service Crash on Windows Platform** - KokoroTTS service crashes with exit code 1 immediately after receiving synthesis requests, causing 100% failure rate for voiceover generation. Signal handling incompatibility (SIGTERM undefined on Windows). Evidence: Console shows "Service exited: code=1" followed by timeout errors for all 3 scenes. | 3 | 3 | **9** | Implement Windows-compatible signal handling in kokoro-tts-service.py: Use signal.SIGBREAK instead of SIGTERM, or remove signal dependency. Add platform detection (sys.platform == 'win32'). Add comprehensive error logging for service crashes. | DEV | **IMMEDIATE** |

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-002 | SEC | **Audio File Path Traversal Attack** - Malicious actor could request files outside .cache directory using path traversal (../) in API parameters, potentially exposing sensitive system files or application source code. | 2 | 3 | **6** | Implement multi-layer validation: (1) Verify path starts with `.cache/audio/projects/`, (2) Reject paths containing `..`, (3) Use path.resolve() and verify final path within project root, (4) Reject non-.mp3 extensions, (5) Log suspicious requests for security monitoring. | DEV | Before deployment |
| R-003 | SEC | **SQL Injection via Invalid UUID Parameters** - Audio serving API accepts projectId that could contain SQL injection payloads if not validated before database queries, risking data exposure or database compromise. | 2 | 3 | **6** | Validate projectId with UUID regex `/^[0-9a-f-]{36}$/i` BEFORE any database operations. Use parameterized queries for all database operations. Add input validation middleware. Return 400 for invalid UUIDs with sanitized error messages. | DEV | Before deployment |

### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Audio Player Component State Management Flakiness** - Race conditions between loading, error, and success states may cause UI flicker, stuck loading states, or incorrect error displays. React async state updates can conflict. | 2 | 2 | **4** | Implement state machine pattern with single source of truth. Add loading timeout (10s) with fallback to error state. Use React.useRef to track mounted state. Add comprehensive error boundaries. |DEV |
| R-005 | DATA | **Partial Voiceover Completion Data Inconsistency** - Database may have audio_file_path set but file missing on disk, or file exists but path is NULL. File system and database operations are not atomic. | 2 | 2 | **4** | Wrap audio file write + database update in transaction-like pattern. Verify file exists before setting path in database. Add cleanup job to remove orphaned files (cron). Add defensive API check (return 404 if path set but file missing). | DEV |
| R-006 | OPS | **Audio Caching Prevents Updated Audio Playback** - 1-year cache headers (Cache-Control: max-age=31536000) prevent users from hearing regenerated audio. Users see stale cached version even after re-generating voiceovers. | 2 | 2 | **4** | Include audio_file_path hash or timestamp in URL query parameter (e.g., `/audio?v=<timestamp>`) to bust cache when file changes. Alternative: Reduce cache duration to 1 hour for development environments. | DEV |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-007 | BUS | **AudioPlayer Component Not Fully Accessible** - HTML5 audio player may lack proper ARIA attributes, keyboard navigation support, or screen reader announcements, reducing accessibility compliance. | 2 | 1 | **2** | Add ARIA labels (aria-label="Scene {number} audio player"). Verify keyboard focus management. Test with NVDA/JAWS screen readers. Document accessibility features. |
| R-008 | TECH | **"Continue to Visual Sourcing" Button Logic Race Condition** - Button enable logic may not update reactively if scenes data changes while user is viewing page, causing stale UI state (button disabled when should be enabled). | 1 | 2 | **2** | Use React useMemo to recalculate button state when scenes prop changes. Add visual loading indicator during state transitions. Test with React DevTools. |
| R-009 | TECH | **Browser Audio Format Compatibility** - MP3 files may not play in older browsers (Safari <12 had codec issues). Modern browsers widely support MP3 but edge cases exist. | 1 | 2 | **2** | Add browser compatibility detection. Display fallback message for unsupported browsers. Consider AAC format as alternative. Test in BrowserStack for legacy browsers. |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## Test Coverage Plan

### P0 (Critical) - Run on every commit

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| TTS service crash prevention | API | R-001 | 1 | QA | Regression test for production defect. Verify no exit code 1 crashes. |
| Audio API path traversal prevention | API | R-002 | 4 | QA | Multiple attack vectors: `..`, URL-encoded, valid paths. |
| Audio API SQL injection prevention | API | R-003 | 4 | QA | Invalid UUIDs, SQL payloads, valid UUIDs. |
| Complete voiceover generation workflow | E2E | R-001 | 1 | QA | End-to-end happy path from button click to audio playback. |

**Total P0**: 4 scenarios, 8 hours

---

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Audio player loading state | Component | R-004 | 1 | DEV | Verify loading skeleton → audio controls transition. |
| Audio player error state | Component | R-004 | 2 | DEV | Non-existent file, network error scenarios. |
| Partial voiceover completion support | E2E | R-005 | 1 | QA | Conditional audio player rendering (some scenes with audio). |
| Continue button enable logic | E2E | R-008 | 1 | QA | Button disabled → all complete → button enabled. |
| Audio serving API validation | API | R-002, R-006 | 4 | QA | Valid request, invalid sceneNumber, non-existent scene, cache headers. |
| Database consistency for audio file paths | API | R-005 | 3 | QA | Success case (path + file), failure case (no path), orphaned file detection. |

**Total P1**: 6 scenarios, 7 hours

---

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AudioPlayer component reusability | Component | - | 1 | DEV | Verify no dependencies on parent context. |
| Audio player accessibility | Component | R-007 | 3 | QA | Keyboard navigation, screen reader, ARIA attributes. |
| Browser compatibility for audio playback | E2E | R-009 | 4 | QA | Chrome, Firefox, Safari, Edge. |
| Audio cache behavior validation | E2E | R-006 | 1 | QA | Verify cache busting after regeneration. |
| Button state race condition | Integration | R-008 | 1 | DEV | Real-time scene update → button state reactive. |

**Total P2**: 5 scenarios, 3 hours

---

### P3 (Low) - Run on-demand

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Navigation button click animation | E2E | 1 | Manual QA | Visual regression for button hover/active states. |

**Total P3**: 1 scenario, 0.25 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [x] P0-001: TTS service doesn't crash on synthesis request (30s)
- [x] P0-004: Complete voiceover generation workflow happy path (2min)

**Total**: 2 scenarios

---

### P0 Tests (<10 min)

**Purpose**: Critical path validation

- [x] P0-001: TTS service crash prevention (API)
- [x] P0-002: Path traversal prevention - 4 attack vectors (API)
- [x] P0-003: SQL injection prevention - 4 invalid formats (API)
- [x] P0-004: Complete workflow (E2E)

**Total**: 4 scenarios

---

### P1 Tests (<20 min)

**Purpose**: Important feature coverage

- [x] P1-001: Audio player loading state (Component)
- [x] P1-002: Audio player error state - 2 scenarios (Component)
- [x] P1-003: Partial completion support (E2E)
- [x] P1-004: Continue button enable logic (E2E)
- [x] P1-005: Audio serving API validation - 4 scenarios (API)
- [x] P1-006: Database consistency - 3 scenarios (API)

**Total**: 6 scenarios

---

### P2/P3 Tests (<15 min)

**Purpose**: Full regression coverage

- [x] P2-001: AudioPlayer reusability (Component)
- [x] P2-002: Accessibility - 3 scenarios (Component)
- [x] P2-003: Browser compatibility - 4 browsers (E2E)
- [x] P2-004: Audio cache behavior (E2E)
- [x] P2-005: Button state race condition (Integration)
- [x] P3-001: Button click animation (E2E)

**Total**: 6 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 4 | 2.0 | 8 | Complex setup, security testing, TTS service debugging |
| P1 | 6 | 1.17 | 7 | Standard coverage with API and component tests |
| P2 | 5 | 0.6 | 3 | Simple scenarios, cross-browser testing |
| P3 | 1 | 0.25 | 0.25 | Visual regression only |
| **Total** | **16** | **-** | **18.25** | **~2.3 days** |

### Prerequisites

**Test Data:**

- `projectFactory` - Create test projects with voice selection and script generation complete
- `sceneFactory` - Generate scenes with text, scene_number, audio_file_path (nullable)
- `voiceProfileFactory` - Create test voice profiles for TTS testing

**Tooling:**

- Playwright for E2E and API tests
- Vitest / Jest for component tests (React Testing Library)
- Mock TTS service for unit tests (avoid real TTS calls)
- Path traversal attack payloads library
- UUID validation test cases
- Cross-browser testing environment (BrowserStack or local Docker containers)

**Environment:**

- Windows environment for TTS service crash reproduction (R-001)
- Linux environment for signal handling comparison
- Test database with scenes table and audio_file_path field
- .cache/audio/projects/ directory structure for file serving
- Audio file samples (valid MP3s for testing playback)
- Network throttling tool for loading state tests

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions) - GATE FAILS if any P0 test fails
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths**: ≥80% (audio serving API, voiceover generation, security validation)
- **Security scenarios**: 100% (all attack vectors covered)
- **Business logic**: ≥70% (button enable logic, conditional rendering)
- **Edge cases**: ≥50% (browser compatibility, cache busting)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (4/4)
- [ ] **R-001 MITIGATED**: TTS service crash fix deployed and tested on Windows
- [ ] **R-002 MITIGATED**: Path traversal prevention verified with attack payloads
- [ ] **R-003 MITIGATED**: SQL injection prevention verified with malicious UUIDs
- [ ] Security tests (SEC category) pass 100%
- [ ] No production deployment until R-001 resolved

---

## Mitigation Plans

### R-001: TTS Service Crash on Windows Platform (Score: 9) 🚨

**Mitigation Strategy:**

1. **Immediate Fix**:
   - Modify `scripts/kokoro-tts-service.py` to detect Windows platform
   - Replace `signal.SIGTERM` with `signal.SIGBREAK` on Windows
   - Alternative: Remove signal handling dependency entirely if not critical
   - Add try/except around signal registration for graceful degradation

2. **Code Example**:
   ```python
   import sys
   import signal

   def register_signal_handlers():
       if sys.platform == 'win32':
           # Windows doesn't have SIGTERM, use SIGBREAK
           signal.signal(signal.SIGBREAK, graceful_shutdown)
       else:
           # Unix/Linux platforms
           signal.signal(signal.SIGTERM, graceful_shutdown)
   ```

3. **Testing**:
   - Run TTS service on Windows 10/11
   - Send synthesis request via API
   - Verify service stays running (no exit code 1)
   - Verify audio files generated successfully

**Owner:** DEV
**Timeline:** IMMEDIATE (blocking all voiceover generation)
**Status:** Planned → In Progress → **MUST COMPLETE BEFORE DEPLOYMENT**
**Verification:** P0-001 test passes on Windows environment

---

### R-002: Audio File Path Traversal Attack (Score: 6)

**Mitigation Strategy:**

1. Create validation middleware for audio API endpoint
2. Implement multi-layer checks:
   - Path must start with `.cache/audio/projects/`
   - Path must not contain `..` (literal or URL-encoded)
   - Path must end with `.mp3`
   - Use `path.resolve()` to get absolute path
   - Verify resolved path is within project root
3. Return 400 Bad Request for invalid paths with sanitized error message
4. Log suspicious requests for security monitoring

**Owner:** DEV
**Timeline:** Before deployment (part of Story 2.6 implementation)
**Status:** Planned
**Verification:** P0-002 test passes (all attack vectors rejected)

---

### R-003: SQL Injection via Invalid UUID Parameters (Score: 6)

**Mitigation Strategy:**

1. Add UUID validation middleware to audio API route
2. Validate projectId with regex: `/^[0-9a-f-]{36}$/i`
3. Validate sceneNumber is positive integer: `/^\d+$/`
4. Return 400 Bad Request before any database query if validation fails
5. Use parameterized queries for all database operations (already implemented in queries.ts)
6. Add input validation layer for all API routes accepting user input

**Owner:** DEV
**Timeline:** Before deployment
**Status:** Planned
**Verification:** P0-003 test passes (all SQL injection attempts rejected)

---

## Assumptions and Dependencies

### Assumptions

1. TTS service fix (R-001) will be completed before any other Story 2.6 work can proceed
2. Audio files generated by Story 2.5 are valid MP3 format and stored in `.cache/audio/projects/`
3. Database schema from Story 2.2 includes `scenes.audio_file_path` and `scenes.duration` fields
4. React version supports hooks and modern state management patterns
5. Target browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Dependencies

1. **Story 2.5 (Voiceover Generation)** - Required for audio file generation and database population
2. **Story 2.4 (Script Generation)** - Required for script-review page and scenes data
3. **Story 2.2 (Database Schema)** - Required for scenes table and audio_file_path field
4. **Story 2.1 (TTS Engine)** - Required for voiceover generation (currently BROKEN on Windows)

### Risks to Plan

- **Risk**: TTS service crash (R-001) delays all testing by 2-3 days
  - **Impact**: Cannot test audio playback, API serving, or complete workflows
  - **Contingency**: Prioritize R-001 fix immediately, run P0-002 and P0-003 (security tests) in parallel with mock data

- **Risk**: Windows-specific bugs discovered during TTS fix
  - **Impact**: Additional debugging time, potential platform compatibility issues
  - **Contingency**: Add Linux/Docker environment for TTS service as alternative deployment target

- **Risk**: Audio file format compatibility issues across browsers
  - **Impact**: P2-003 may reveal need for additional formats (AAC, OGG)
  - **Contingency**: Document unsupported browsers, consider multi-format encoding in future story

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: ____________ Date: ____________
- [ ] Tech Lead: ____________ Date: ____________
- [ ] QA Lead: ____________ Date: ____________

**Comments:**

_Pending approval. CRITICAL: R-001 (TTS crash) must be addressed before proceeding with any deployment or extensive testing._

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (625 lines)
- `probability-impact.md` - Risk scoring methodology (604 lines)
- `test-levels-framework.md` - Test level selection (467 lines)
- `test-priorities-matrix.md` - P0-P3 prioritization (389 lines)

### Related Documents

- **PRD**: Feature 1.3 (Voice Selection) lines 103-133, Feature 1.4 (Automated Voiceover) lines 134-145
- **Epic**: Epic 2 (Content Generation Pipeline) lines 274-540
- **Story**: Story 2.6 (Script & Voiceover Preview Integration)
- **Story Context**: `docs/stories/story-context-2.6.xml` (1,142 lines)
- **Complete Story Report**: `docs/complete-story-report-2.6.md` (667 lines)

### Test Data Factory Examples

**Project Factory:**
```typescript
export function createTestProject() {
  return {
    id: crypto.randomUUID(),
    name: 'Test Project',
    topic: 'Test Topic',
    voice_id: 'am_michael',
    script_generated: true,
    voice_selected: true,
    current_step: 'voiceover',
  };
}
```

**Scene Factory:**
```typescript
export function createTestScene(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    project_id: '...',
    scene_number: 1,
    text: 'This is a test scene.',
    audio_file_path: '.cache/audio/projects/xxx/scene-1.mp3',
    duration: 5.2,
    ...overrides,
  };
}
```

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad/bmm/testarch/test-design`
**Version**: 4.0 (BMad v6)
**Date**: 2025-11-09
