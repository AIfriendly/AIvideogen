# Sprint Change Proposal: NASA API Integration (Epic 9)

**Date:** 2026-01-25
**Project:** AI Video Generator
**Sprint:** Post-Epic 8
**Change Scope:** Moderate (Backlog reorganization + New Epic)
**Workflow:** Correct Course
**Mode:** Incremental

---

## Section 1: Issue Summary

### Problem Statement

After successfully completing Epic 8 (DVIDS API Integration), which migrated the DVIDS video provider from web scraping to the official DVIDS Search API, we identified that Story 6.11 (NASA Web Scraping MCP Server) still uses Playwright web scraping. This creates architectural inconsistency and should be migrated to the official NASA Image and Video Library API.

### Context and Discovery

- **Discovery Date:** 2026-01-25
- **Discovered By:** Development team review during Epic 8 completion
- **Trigger:** Post-implementation review identified architectural inconsistency
- **Pattern Recognition:** Epic 8 established a successful pattern for API-based video providers
- **NASA API Availability:** Official NASA Image and Video Library API available at `https://images-api.nasa.gov/search`

### Evidence Supporting Change

1. **Epic 8 Success:** DVIDS API migration (Epic 8) completed successfully with improved reliability
2. **NASA API Documentation:** Official NASA API documented at https://api.nasa.gov/
3. **Architectural Consistency:** Both DVIDS and NASA should use the same API-based pattern
4. **Infrastructure Reuse:** Epic 8 built reusable infrastructure (connection pooling, diversity tracking, filename handling)
5. **Rate Limiting Alignment:** User requested 30-second rate limiting for NASA (consistent with DVIDS)

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Status | Impact | Changes Required |
|------|--------|--------|------------------|
| **Epic 6** | Done | None affected | Story 6.11 remains "done" (web scraping version) |
| **Epic 8** | Done | Provides infrastructure | Connection pooling, diversity, filename handling reused |
| **Epic 9** | **New** | **Created** | New epic for NASA API migration |

### Story Impact

| Story | Current Status | Impact | Changes Required |
|-------|---------------|--------|------------------|
| **Story 6.11** | Done | Preserved | No changes - web scraping version remains functional |
| **Story 9.1** | New | Created | NASA Search API Integration (5 points) |
| **Story 9.2** | New | Created | Direct MP4 Video Download (3 points) |
| **Story 9.3** | New | Created | Video Selection Diversity (4 points, reuses Epic 8) |
| **Story 9.4** | New | Created | Connection Pooling (2 points, reuses Epic 8) |
| **Story 9.5** | New | Created | Filename Compatibility (2 points, reuses Epic 8) |

**Total New Stories:** 5 stories
**Total New Points:** 16 points (vs Epic 8's 19 points due to simpler video download)

### Artifact Conflicts

| Artifact | Conflict | Resolution |
|----------|----------|------------|
| **PRD** | None | PRD Feature 2.9 already covers domain-specific APIs |
| **Architecture** | Update needed | Add Epic 9 to epic-to-architecture-mapping.md |
| **UX Design** | None | No UI changes required (uses existing provider UI) |
| **Epic Summary** | Update needed | Add Epic 9 with 5 stories (total: 50 stories) |

**Updates Required:**
- ✅ `docs/architecture/epic-to-architecture-mapping.md` - **DONE**
- ✅ `docs/architecture/architecture-decision-records.md` - **DONE (ADR-015)**
- ✅ `docs/epics/epic-summary.md` - **DONE**
- ✅ `docs/sprint-artifacts/sprint-status.yaml` - **DONE**

### Technical Impact

| Component | Impact | Details |
|-----------|--------|---------|
| **Code** | New module | `mcp_servers/nasa_api_server.py` (replaces `nasa_playwright_server.py`) |
| **Database** | None | No schema changes required |
| **Infrastructure** | Reuse | Connection pooling, diversity tracking, filename sanitization from Epic 8 |
| **Dependencies** | Remove | Playwright, playwright-stealth (no longer needed for NASA) |
| **Dependencies** | Add | None (uses existing httpx, mcp SDK) |
| **Performance** | Improvement | No browser overhead (~200MB RAM savings per request) |
| **Reliability** | Improvement | API vs web scraping (more robust) |

### Configuration Changes

**`config/mcp_servers.json` - Update NASA Provider:**

```json
{
  "providers": [
    {
      "id": "nasa",
      "name": "NASA Space Videos (API)",
      "priority": 2,
      "enabled": false,
      "command": "python",
      "args": ["-m", "mcp_servers.nasa_api_server"],
      "env": {
        "PYTHONPATH": "./mcp_servers",
        "NASA_API_KEY": "YOUR_API_KEY_OPTIONAL",
        "NASA_RATE_LIMIT": "30"
      }
    }
  ]
}
```

**Environment Variables:**
- `NASA_API_KEY` - Optional (public content accessible without key)
- `NASA_RATE_LIMIT` - 30 seconds (consistent with DVIDS)

---

## Section 3: Recommended Approach

### Selected Path: Direct Adjustment (New Epic 9)

**Decision:** Create Epic 9 with 5 stories to migrate NASA from web scraping to API integration.

**Rationale:**
1. **Follows Established Pattern:** Epic 8 successfully demonstrated this approach for DVIDS
2. **Preserves Working Code:** Story 6.11 (web scraping) remains "done" and functional
3. **Maximizes Infrastructure Reuse:** 3 of 5 stories reuse Epic 8 infrastructure (9.3, 9.4, 9.5)
4. **Clear Scope Boundaries:** Each story has well-defined acceptance criteria
5. **Efficient Point Estimation:** 16 points vs 19 points for Epic 8 (simpler video download)
6. **Architectural Consistency:** Both DVIDS and NASA use same API-based pattern

**Alternative Considered:**
- **Modify Story 6.11:** Rejected because it breaks the established pattern and would require reopening a "done" story

### Effort Estimate

| Story | Points | Duration (at 5 pts/day) |
|-------|--------|--------------------------|
| 9.1: NASA API Integration | 5 | 1 day |
| 9.2: Direct MP4 Download | 3 | 0.5 day |
| 9.3: Diversity Tracking | 4 | 0.5 day (verification) |
| 9.4: Connection Pooling | 2 | 0.5 day (verification) |
| 9.5: Filename Compatibility | 2 | 0.5 day (verification) |
| **Total** | **16 points** | **~3-4 days** |

**Note:** Stories 9.3, 9.4, 9.5 are verification-only (infrastructure reuse from Epic 8)

### Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| NASA API changes | Low | Medium | API is stable and well-documented |
| Rate limit exceeded | Low | Low | 30-second delay prevents hitting limits |
| NASA ID format issues | Low | Low | Sanitization handles edge cases |
| Infrastructure incompatibility | Very Low | Low | Reuses proven Epic 8 infrastructure |

### Timeline Impact

**No timeline impact:** Epic 9 is planned work, not a blocker for current sprint.

---

## Section 4: Detailed Change Proposals

### Epic 9 Creation

**File:** `docs/epics/epic-9-nasa-api-integration.md`
**Status:** ✅ **COMPLETED**

**Summary:**
- 5 stories, 16 points total
- Migrates NASA from Playwright web scraping to official NASA API
- Maximally reuses Epic 8 infrastructure (3 stories)
- 30-second rate limiting (consistent with DVIDS)
- Direct MP4 downloads (simpler than DVIDS HLS/FFmpeg)

---

### Story 9.1: NASA Search API Integration (5 points)

**OLD (Story 6.11 - Web Scraping):**
```python
# Uses Playwright to scrape images.nasa.gov
browser = await playwright.chromium.launch()
page = await browser.new_page()
await page.goto("https://images.nasa.gov")
# JavaScript rendering, DOM scraping, etc.
```

**NEW (Story 9.1 - API):**
```python
# Uses NASA API directly
import httpx

async def search_nasa_videos(query: str):
    params = {
        "q": query,
        "media_type": "video"
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://images-api.nasa.gov/search",
            params=params
        )
        return response.json()
```

**Rationale:** API is more reliable, faster, and requires fewer dependencies.

---

### Story 9.2: Direct MP4 Video Download (3 points)

**OLD (Story 6.11 - Playwright):**
```python
# Uses Playwright to intercept network requests
# Requires browser lifecycle management
```

**NEW (Story 9.2 - Direct Download):**
```python
# Direct MP4 download via httpx
async with httpx.AsyncClient(timeout=30.0) as client:
    response = await client.get(video_url)
    with open(f"assets/cache/nasa/{video_id}.mp4", 'wb') as f:
        f.write(response.content)
```

**Rationale:** Simpler than DVIDS (no FFmpeg required) - NASA provides direct MP4 URLs.

---

### Story 9.3: Video Selection Diversity (4 points)

**Change:** No code changes - verification only.

**Verification:**
- Confirm NASA video IDs work with existing `selectedVideoIds` tracking
- Test diversity enforcement with NASA provider
- Log diversity metrics: "Scene 5: Selected NEW video nasa_123 (5/8 unique)"

**Rationale:** Epic 8 Story 8.3 already implemented this infrastructure. NASA just needs verification.

---

### Story 9.4: Connection Pooling (2 points)

**Change:** No code changes - verification only.

**Verification:**
- Test `ensureConnection('nasa')` function
- Verify connection pooling works for NASA provider
- Confirm health checks detect stale NASA connections

**Rationale:** Epic 8 Story 8.4 already implemented this infrastructure. NASA just needs verification.

---

### Story 9.5: Cross-Platform Filename Compatibility (2 points)

**Change:** No code changes - verification only.

**Verification:**
- Test NASA `nasa_id` format with sanitization function
- Verify cross-platform compatibility for NASA video IDs
- Confirm edge cases handled (special characters, unicode)

**Rationale:** Epic 8 Story 8.5 already implemented this infrastructure. NASA just needs verification.

---

### Architecture Document Updates

#### 1. `docs/architecture/epic-to-architecture-mapping.md`

**OLD:** Epic 8 section only

**NEW:** Added Epic 9 section
```markdown
### Epic 9: NASA API Integration
- **Points:** 16 points (5 stories)
- **Stories:** 9.1-9.5
- **Backend:** mcp_servers/nasa_api_server.py
- **API:** NASA Image and Video Library API
- **Infrastructure:** Reuses Epic 8 (pooling, diversity, filenames)
```

**Rationale:** Documents Epic 9 in architecture mapping for future reference.

---

#### 2. `docs/architecture/architecture-decision-records.md`

**ADDED:** ADR-015: NASA Image and Video Library API Integration

```markdown
## ADR-015: NASA Image and Video Library API Integration

**Status:** Accepted
**Date:** 2026-01-25
**Context:** Epic 8 established pattern for API-based video providers. NASA still uses web scraping.
**Decision:** Migrate NASA to official API, following Epic 8 pattern.
**Consequences:**
- Positive: Architectural consistency, improved reliability, performance gain
- Positive: Infrastructure reuse reduces effort (16 vs 19 points)
- Negative: New epic required (not a story modification)
```

**Rationale:** Documents architectural decision and reasoning.

---

#### 3. `docs/epics/epic-summary.md`

**OLD:** 45 stories total (Epics 1-8)

**NEW:** 50 stories total (Epics 1-9)

**OLD Epic Table:**
```markdown
| Epic | Name | Stories | Dependencies | Phase |
|------|------|---------|--------------|-------|
| ... | ... | ... | ... | ... |
| 8 | DVIDS Video Provider API Integration | 5 | Epic 6 | Enhancement |
```

**NEW Epic Table:**
```markdown
| Epic | Name | Stories | Dependencies | Phase |
|------|------|---------|--------------|-------|
| ... | ... | ... | ... | ... |
| 8 | DVIDS Video Provider API Integration | 5 | Epic 6 | Enhancement |
| 9 | NASA Video Provider API Integration | 5 | Epic 6, 8 | Enhancement |

**Total Stories:** 50 stories (Epics 1-6: 43 + Epic 7: 3 + Epic 8: 5 + Epic 9: 5)
```

**Rationale:** Reflects accurate project scope with Epic 9 included.

---

#### 4. `docs/sprint-artifacts/sprint-status.yaml`

**ADDED:** Epic 9 section
```yaml
# Epic 9: NASA Video Provider API Integration (Planned)
epic-9: backlog
9-1-nasa-search-api-integration: backlog
9-2-direct-mp4-video-download: backlog
9-3-video-selection-diversity: backlog
9-4-connection-pooling-verification: backlog
9-5-cross-platform-filename-verification: backlog
epic-9-retrospective: pending
```

**Rationale:** Adds Epic 9 to sprint tracking system.

---

### Rate Limiting Configuration (User Request)

**Added:** 30-second rate limiting for NASA API (consistent with DVIDS)

**Implementation:**
```python
# Story 9.1 - NASA API Integration
RATE_LIMIT_SECONDS = 30  # Consistent with DVIDS

def _respect_rate_limit():
    """Enforce 30-second delay between NASA API requests."""
    await asyncio.sleep(RATE_LIMIT_SECONDS)
```

**Exponential Backoff:**
```python
BASE_BACKOFF_SECONDS = 2
MAX_BACKOFF_SECONDS = 60
# Formula: min(BASE_BACKOFF × 2^attempt, MAX_BACKOFF)
```

**Rationale:** User requested consistent rate limiting across all providers (30 seconds).

---

## Section 5: Implementation Handoff

### Change Scope Classification: **Moderate**

**Reasoning:**
- New epic creation required (Epic 9)
- Backlog reorganization needed (add Epic 9 stories)
- PO/SM coordination required for sprint planning
- No fundamental replan needed (follows Epic 8 pattern)

### Handoff Recipients

| Role | Responsibility | Deliverables |
|------|---------------|--------------|
| **Product Owner** | Approve Epic 9, prioritize backlog | Epic 9 approval, sprint priority |
| **Scrum Master** | Add Epic 9 to sprint backlog, break down tasks | Sprint planning, story refinement |
| **Developer** | Implement Epic 9 stories 9.1-9.5 | Code implementation, testing |
| **QA/Tester** | Verify Epic 8 infrastructure works with NASA | Verification testing (stories 9.3-9.5) |

### Handoff Deliverables

1. **Epic 9 Document:** `docs/epics/epic-9-nasa-api-integration.md` ✅
2. **Architecture Summary:** `docs/epics/EPIC-9-ARCHITECTURE-SUMMARY.md` ✅
3. **Sprint Status Update:** `docs/sprint-artifacts/sprint-status.yaml` ✅
4. **Architecture Decision Record:** ADR-015 in `docs/architecture/architecture-decision-records.md` ✅
5. **This Change Proposal:** `docs/sprint-artifacts/sprint-change-proposal-2026-01-25-nasa-api-integration.md` ✅

### Success Criteria

Epic 9 implementation is successful when:
- [ ] All 5 stories completed and marked as "Done"
- [ ] NASA API successfully queried with search filters
- [ ] Direct MP4 videos downloaded via httpx
- [ ] 30-second rate limiting enforced
- [ ] Video selection enforces cross-scene diversity
- [ ] MCP connections pooled and reused
- [ ] Filenames valid and sanitized
- [ ] Unit tests pass (80%+ coverage)
- [ ] Integration tests pass with real NASA API
- [ ] No breaking changes to existing functionality
- [ ] Code reviewed and approved

### Next Steps

1. **Immediate:** Product Owner reviews and approves Epic 9
2. **Sprint Planning:** Scrum Master adds Epic 9 to next sprint backlog
3. **Story Breakdown:** Scrum Master refines Epic 9 stories into sprint tasks
4. **Implementation:** Developer implements stories 9.1-9.5 (~3-4 days)
5. **Verification:** QA verifies Epic 8 infrastructure works with NASA
6. **Completion:** Epic 9 marked "done", retrospective scheduled

---

## Appendix A: Epic 9 vs Epic 8 Comparison

| Aspect | Epic 8 (DVIDS) | Epic 9 (NASA) | Difference |
|--------|---------------|---------------|------------|
| **Video Download** | HLS manifests require FFmpeg | Direct MP4 URLs (simpler) |
| **Story 9.2 Points** | 5 points | 3 points | -2 points |
| **Authentication** | Required API key | Optional API key (public content) |
| **Rate Limiting** | 30 seconds per request | 30 seconds per request (consistent) ✅ |
| **Duration in Results** | Yes (in API response) | No (requires additional fetch) |
| **Connection Pooling** | New implementation (3 points) | Reuse Epic 8 (2 points) | -1 point |
| **Diversity Tracking** | New implementation (4 points) | Reuse Epic 8 (4 points, verification) | Same |
| **Filename Handling** | New implementation (2 points) | Reuse Epic 8 (2 points, verification) | Same |
| **Total Points** | 19 points | 16 points | **-3 points** |

**Key Insight:** Epic 9 is more efficient because it maximally reuses Epic 8 infrastructure and has simpler video download requirements (direct MP4 vs HLS/FFmpeg).

---

## Appendix B: NASA API Quick Reference

**Endpoint:** `GET https://images-api.nasa.gov/search`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query terms |
| `media_type` | string | No | "video" to filter for videos only |
| `center` | string | No | NASA center (GSFC, JSC, KSC, etc.) |
| `year_start` | string | No | Start year filter (YYYY-MM-DD) |
| `year_end` | string | No | End year filter (YYYY-MM-DD) |

**Response Format:**
```json
{
  "collection": {
    "items": [{
      "data": [{
        "nasa_id": "12345-A",
        "title": "Space Shuttle Launch",
        "description": "HD footage...",
        "center": "KSC"
      }],
      "links": [{
        "href": "https://images-assets.nasa.gov/video/xxx/xxx.mp4"
      }]
    }]
  }
}
```

**Rate Limiting:** 30 seconds per request (enforced by client)

---

## Approval

**Product Owner:** _________________  Date: _______

**Scrum Master:** _________________  Date: _______

**Architect:** _________________  Date: _______

---

**Document Status:** ✅ COMPLETE
**Generated:** 2026-01-25
**Workflow:** Correct Course (Step 4: Generate Sprint Change Proposal)
