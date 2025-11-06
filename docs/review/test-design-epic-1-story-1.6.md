# Test Design: Epic 1 - Story 1.6 Project Management UI

**Date:** 2025-11-04
**Author:** lichking
**Status:** Draft

---

## Executive Summary

**Scope:** Targeted test design for Epic 1, Story 1.6 - Addressing test coverage gaps identified during architecture review

**Risk Summary:**

- Total risks identified: 8 (**+1 CRITICAL production bug**)
- High-priority risks (≥6): 2 (API Security + 404 Routing Bug)
- Critical categories: SEC (score 6), TECH (3 risks, score 4-9), DATA, BUS, PERF

**Coverage Summary:**

- P0 scenarios: 6 (7.0 hours) **[UPDATED: +1 regression test]**
- P1 scenarios: 13 (15.5 hours)
- P2 scenarios: 5 (7.0 hours)
- P3 scenarios: 2 (3.5 hours)
- **Total effort**: 33.0 hours (~4 days)

**Key Findings:**

Story 1.6 has comprehensive functional test coverage (all 125 subtasks complete), but **critical security and edge case testing gaps** were identified. This test design addresses those gaps with 25 additional test scenarios focused on API security, error handling, accessibility, and race condition prevention.

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | SEC | API endpoints lack security tests (SQL injection, XSS, authorization bypass) | 2 | 3 | 6 | Add comprehensive API security test suite (5 tests) | QA Team | 2025-11-06 |
| **R-008** | **TECH** | **Missing /projects/[id] route causes 404 on New Chat (PRODUCTION BUG)** | 3 | 3 | **9** | **Route created, add E2E regression test** | **Dev Team** | **2025-11-04** |

### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-002 | TECH | API error handling untested (404, 500, malformed UUIDs) | 2 | 2 | 4 | Add API error scenario tests (5 tests) | Dev Team |
| R-003 | TECH | Race conditions in rapid project switching despite AbortController | 2 | 2 | 4 | Add E2E rapid-switching tests + integration tests | QA Team |
| R-004 | DATA | Multi-tab conflicts not covered (localStorage sync issues) | 2 | 2 | 4 | Add E2E multi-tab scenario tests (3 tests) | QA Team |
| R-005 | BUS | Accessibility (WCAG 2.1 AA) not validated (keyboard nav, screen readers) | 2 | 2 | 4 | Add accessibility test suite (5 tests) | QA Team |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-006 | BUS | localStorage disabled fallback not tested | 1 | 2 | 2 | Document + add integration test |
| R-007 | PERF | Performance at scale (100+ projects) not benchmarked | 1 | 2 | 2 | Add performance tests (on-demand) |

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

**Criteria**: Security-critical + High risk (≥6) + No workaround

| Test ID | Requirement | Test Level | Risk Link | Description | Owner | Effort |
|---------|-------------|------------|-----------|-------------|-------|--------|
| 1.6-API-SEC-001 | API Security | API | R-001 | SQL injection attempt in project name field | QA | 1.0h |
| 1.6-API-SEC-002 | API Security | API | R-001 | XSS script injection in project name | QA | 1.0h |
| 1.6-API-SEC-003 | API Security | API | R-001 | SQL injection in UUID parameter | QA | 0.5h |
| 1.6-API-SEC-004 | API Security | API | R-001 | CSRF protection validation | QA | 1.5h |
| 1.6-API-SEC-005 | API Security | API | R-001 | Authorization bypass attempt (access other user's projects) | QA | 2.0h |
| **1.6-E2E-404-001** | **New Chat Flow** | **E2E** | **R-008** | **Click "New Chat" → creates project → navigates to /projects/[id] → chat interface loads (no 404)** | **QA** | **1.0h** |

**Total P0**: 6 tests, 7.0 hours

---

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-5) + Common workflows

| Test ID | Requirement | Test Level | Risk Link | Description | Owner | Effort |
|---------|-------------|------------|-----------|-------------|-------|--------|
| 1.6-API-ERR-001 | API Error Handling | API | R-002 | GET /api/projects with invalid UUID format | DEV | 0.5h |
| 1.6-API-ERR-002 | API Error Handling | API | R-002 | GET /api/projects/[id] returns 404 for non-existent project | DEV | 0.5h |
| 1.6-API-ERR-003 | API Error Handling | API | R-002 | PUT /api/projects/[id] with missing required fields | DEV | 0.5h |
| 1.6-API-ERR-004 | API Error Handling | API | R-002 | POST /api/projects with database connection failure | DEV | 1.0h |
| 1.6-API-ERR-005 | API Error Handling | API | R-002 | DELETE /api/projects/[id] cascade validation | DEV | 0.5h |
| 1.6-E2E-RACE-001 | Race Conditions | E2E | R-003 | Rapid project switching (5 switches in 2 seconds) | QA | 2.0h |
| 1.6-E2E-RACE-002 | Race Conditions | E2E | R-003 | Project switch during message send | QA | 2.5h |
| 1.6-INT-RACE-003 | Race Conditions | Integration | R-003 | AbortController cancels in-flight requests | DEV | 1.5h |
| 1.6-E2E-A11Y-001 | Accessibility | E2E | R-005 | Keyboard navigation through project list (Tab, Enter, Escape) | QA | 1.5h |
| 1.6-E2E-A11Y-002 | Accessibility | E2E | R-005 | Screen reader announces project names and timestamps | QA | 2.0h |
| 1.6-E2E-A11Y-003 | Accessibility | E2E | R-005 | Focus visible on all interactive elements | QA | 1.0h |
| 1.6-E2E-A11Y-004 | Accessibility | E2E | R-005 | ARIA labels present and correct | QA | 1.0h |
| 1.6-E2E-A11Y-005 | Accessibility | Visual | R-005 | Color contrast ratios meet WCAG 2.1 AA (4.5:1) | QA | 1.0h |

**Total P1**: 13 tests, 15.5 hours

---

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Test ID | Requirement | Test Level | Risk Link | Description | Owner | Effort |
|---------|-------------|------------|-----------|-------------|-------|--------|
| 1.6-E2E-TAB-001 | Multi-Tab Conflicts | E2E | R-004 | Active project sync across two tabs | QA | 2.0h |
| 1.6-E2E-TAB-002 | Multi-Tab Conflicts | E2E | R-004 | Delete project in Tab A, verify Tab B updates | QA | 2.0h |
| 1.6-E2E-TAB-003 | Multi-Tab Conflicts | E2E | R-004 | localStorage write conflict resolution | QA | 1.5h |
| 1.6-INT-LS-001 | localStorage Fallback | Integration | R-006 | App loads when localStorage disabled | DEV | 1.0h |
| 1.6-INT-LS-002 | localStorage Fallback | Integration | R-006 | Active project defaults to most recent when localStorage unavailable | DEV | 0.5h |

**Total P2**: 5 tests, 7.0 hours

---

### P3 (Low) - Run on-demand

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Test ID | Requirement | Test Level | Risk Link | Description | Owner | Effort |
|---------|-------------|------------|-----------|-------------|-------|--------|
| 1.6-PERF-001 | Performance at Scale | Performance | R-007 | Render 100 projects in sidebar < 500ms | DEV | 2.0h |
| 1.6-PERF-002 | Performance SLA | Performance | R-007 | Project switch completes < 300ms (per DoD) | DEV | 1.5h |

**Total P3**: 2 tests, 3.5 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch security vulnerabilities early

- [ ] 1.6-API-SEC-001: SQL injection in project name (30s)
- [ ] 1.6-API-SEC-002: XSS script injection (30s)
- [ ] 1.6-API-SEC-005: Authorization bypass attempt (45s)

**Total**: 3 scenarios

---

### P0 Tests (<10 min)

**Purpose**: Security-critical path validation

- [ ] 1.6-API-SEC-001: SQL injection in project name (API)
- [ ] 1.6-API-SEC-002: XSS script injection (API)
- [ ] 1.6-API-SEC-003: SQL injection in UUID (API)
- [ ] 1.6-API-SEC-004: CSRF protection (API)
- [ ] 1.6-API-SEC-005: Authorization bypass (API)

**Total**: 5 scenarios

---

### P1 Tests (<30 min)

**Purpose**: Error handling, accessibility, race condition coverage

- [ ] 1.6-API-ERR-001 through 1.6-API-ERR-005: API error handling (5 tests)
- [ ] 1.6-E2E-RACE-001 through 1.6-INT-RACE-003: Race conditions (3 tests)
- [ ] 1.6-E2E-A11Y-001 through 1.6-E2E-A11Y-005: Accessibility (5 tests)

**Total**: 13 scenarios

---

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage (edge cases, performance)

- [ ] 1.6-E2E-TAB-001 through 1.6-E2E-TAB-003: Multi-tab conflicts (3 tests)
- [ ] 1.6-INT-LS-001 through 1.6-INT-LS-002: localStorage fallback (2 tests)
- [ ] 1.6-PERF-001 through 1.6-PERF-002: Performance benchmarks (2 tests)

**Total**: 7 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 6 | 1.17 | 7.0 | Security tests + routing regression |
| P1 | 13 | 1.2 | 15.5 | API + E2E + accessibility tests |
| P2 | 5 | 1.4 | 7.0 | Multi-tab coordination complex |
| P3 | 2 | 1.75 | 3.5 | Performance benchmarking tooling |
| **Total** | **26** | **-** | **33.0** | **~4 days** |

### Prerequisites

**Test Data:**

- Existing factories from Story 1.6 (createProject, createUser)
- Add: maliciousInputFactory (SQL injection, XSS payloads)
- Add: multi-tab test orchestration utilities

**Tooling:**

- Playwright for E2E tests (existing)
- axe-core for accessibility testing (WCAG validation)
- Playwright Performance API for benchmarks
- OWASP ZAP or manual security payload database

**Environment:**

- Test database with isolated project data
- Mock localStorage for fallback testing
- Multi-browser testing (Chrome, Firefox, Safari)
- Screen reader testing environment (NVDA/VoiceOver)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions - security critical + routing regression)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: R-001 (security) and R-008 (404 bug) must be 100% resolved before production

### Coverage Targets

- **API Security**: 100% (all OWASP Top 10 relevant scenarios)
- **API Error Handling**: ≥80%
- **Accessibility (WCAG 2.1 AA)**: 100%
- **Race Conditions**: ≥70%

### Non-Negotiable Requirements

- [x] **R-008 resolved**: /projects/[id] route created (COMPLETED 2025-11-04)
- [ ] All P0 security tests pass (SQL injection, XSS, authz bypass)
- [ ] R-008 regression test passes (New Chat → no 404)
- [ ] No high-risk (≥6) items unmitigated
- [ ] Accessibility tests pass (keyboard nav, screen reader, contrast)
- [ ] API error handling returns correct status codes and messages

---

## Mitigation Plans

### R-001: API Endpoint Security Vulnerabilities (Score: 6)

**Mitigation Strategy:**
1. Implement parameterized queries for all database operations (prevent SQL injection)
2. Add input sanitization middleware for all POST/PUT endpoints
3. Validate UUID format before database queries
4. Add CSRF token validation for state-changing operations
5. Implement authorization checks (users can only access their own projects)

**Owner:** Dev Team (Backend)

**Timeline:** 2025-11-06 (2 days)

**Status:** Planned

**Verification:**
- All 5 security tests pass (1.6-API-SEC-001 through 1.6-API-SEC-005)
- Manual penetration testing with OWASP ZAP
- Code review of API endpoints for security best practices

---

### R-002: API Error Handling Gaps (Score: 4)

**Mitigation Strategy:**
1. Add Zod schema validation for all API request bodies
2. Implement custom error handler middleware with consistent JSON response format
3. Add UUID validation middleware
4. Implement database connection retry logic with exponential backoff
5. Add comprehensive error logging for debugging

**Owner:** Dev Team (Backend)

**Timeline:** 2025-11-07 (1 day)

**Status:** Planned

**Verification:**
- All 5 error handling tests pass (1.6-API-ERR-001 through 1.6-API-ERR-005)
- Error responses follow standard format: `{ success: false, error: { message, code } }`

---

### R-003: Race Conditions in Project Switching (Score: 4)

**Mitigation Strategy:**
1. Strengthen AbortController usage in fetch calls
2. Add request deduplication layer (cancel duplicate in-flight requests)
3. Implement optimistic UI updates with rollback on error
4. Add loading states to prevent rapid clicking
5. Debounce project switching with 100ms delay

**Owner:** Dev Team (Frontend)

**Timeline:** 2025-11-08 (1 day)

**Status:** Planned

**Verification:**
- Race condition tests pass (1.6-E2E-RACE-001, 1.6-E2E-RACE-002, 1.6-INT-RACE-003)
- Manual testing with rapid clicking confirms no UI corruption

---

### R-005: Accessibility WCAG Compliance (Score: 4)

**Mitigation Strategy:**
1. Run axe-core automated accessibility audit
2. Add explicit focus management for project switching
3. Ensure all interactive elements have ARIA labels
4. Test with NVDA (Windows) and VoiceOver (macOS) screen readers
5. Verify color contrast ratios with Chrome DevTools

**Owner:** QA Team + Dev Team (Frontend)

**Timeline:** 2025-11-09 (1 day)

**Status:** Planned

**Verification:**
- All accessibility tests pass (1.6-E2E-A11Y-001 through 1.6-E2E-A11Y-005)
- axe-core reports 0 violations
- Manual screen reader testing confirms usability

---

### R-008: Missing /projects/[id] Route - 404 on New Chat (Score: 9) 🚨

**Mitigation Strategy:**
1. ✅ **COMPLETED**: Created `src/app/projects/[id]/page.tsx` dynamic route
2. Route now handles project loading, 404 states, and sets active project
3. Add E2E regression test to prevent future routing bugs
4. Review Story 1.6 Definition of Done to add explicit routing requirements

**Owner:** Dev Team (Frontend)

**Timeline:** 2025-11-04 (immediate - **COMPLETED**)

**Status:** **RESOLVED** ✅

**Root Cause:**
- Story 1.6 Task 9 ("Integrate Sidebar") did not explicitly require creating the `/projects/[id]` route
- NewChatButton implementation assumed route existed
- No E2E test validated the complete "New Chat" user journey

**Verification:**
- ✅ Route file created at `src/app/projects/[id]/page.tsx`
- [ ] E2E test 1.6-E2E-404-001 passes (regression prevention)
- [ ] Manual test: Click "New Chat" → chat interface loads without 404

**Lessons Learned:**
- **Test the complete user journey E2E**, not just individual components
- **Explicit routing requirements** should be in Definition of Done
- **Navigation targets** should be validated before implementation

---

## Assumptions and Dependencies

### Assumptions

1. **Database supports parameterized queries** - better-sqlite3 supports prepared statements (verified)
2. **Playwright supports multi-tab testing** - BrowserContext API confirmed available
3. **Screen reader testing environment available** - QA team has access to NVDA/VoiceOver
4. **Story 1.6 functional tests are passing** - These tests build on existing coverage

### Dependencies

1. **axe-core library** - Required by 2025-11-08 for accessibility testing
2. **OWASP security payload database** - Required by 2025-11-06 for security tests
3. **Performance testing baseline** - Requires production-like dataset (100 projects)

### Risks to Plan

- **Risk**: Screen reader testing requires manual effort and may delay P1 completion
  - **Impact**: +1 day to timeline
  - **Contingency**: Prioritize automated axe-core tests first, schedule manual screen reader testing separately

- **Risk**: Multi-tab E2E tests are flaky due to race conditions
  - **Impact**: Tests may need retry logic, increasing execution time
  - **Contingency**: Add explicit waits and retry mechanisms, accept 90% pass rate for P2 tests

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: **____________** Date: **________**
- [ ] Tech Lead: **____________** Date: **________**
- [ ] QA Lead: **____________** Date: **________**

**Comments:**

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (TECH, SEC, PERF, DATA, BUS, OPS)
- `probability-impact.md` - Risk scoring methodology (probability × impact = score 1-9)
- `test-levels-framework.md` - Test level selection (E2E vs API vs Component vs Unit)
- `test-priorities-matrix.md` - P0-P3 prioritization (risk-based mapping)

### Related Documents

- **Story**: docs/stories/story-1.6.md (Project Management UI)
- **Story Context**: docs/stories/story-context-1.6.xml (Acceptance criteria, task breakdown)
- **PRD**: docs/prd.md (Feature 1.1 - Project Management requirements)
- **Architecture**: docs/architecture.md (Lines 287-309 - Story 1.6 components)
- **Tech Spec**: docs/tech-spec-epic-1.md (API specifications for /api/projects)

### Test Execution Tags

For selective test execution:

```bash
# P0 security tests only (smoke + critical)
npx playwright test --grep "@p0|@security"

# P0 + P1 tests (pre-deployment validation)
npx playwright test --grep "@p0|@p1"

# Accessibility tests only
npx playwright test --grep "@accessibility"

# Full regression (all tests)
npx playwright test
```

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad/bmm/testarch/test-design`
**Version**: 4.0 (BMad v6)
**Date**: 2025-11-04
