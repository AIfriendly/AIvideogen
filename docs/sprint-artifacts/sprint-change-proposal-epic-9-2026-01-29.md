# Sprint Change Proposal: NASA Cache Cleanup Integration

**Date:** 2026-01-29
**Status:** Draft
**Change Scope:** Minor
**Proposed By:** User Request
**Epic Affected:** Epic 9 (NASA API Integration)

---

## 1. Issue Summary

### Problem Statement

After final video generation is complete, NASA-cached videos (stored in `assets/cache/nasa/`) remain on disk without automatic cleanup. NASA videos are fetched and cached during the visual sourcing phase, but these cached files are not removed after the final video is produced.

### Discovery Context

- **Source:** User feedback during Epic 8/9 implementation
- **Trigger:** User reported need for cleanup of cached videos from all providers (DVIDS, NASA, YouTube)
- **Related Work:** Epic 5 Story 5.6 implements general cleanup service; Epic 9 needs NASA-specific integration

### Evidence

The NASA video generation process creates cached files:
1. **NASA cache:** `assets/cache/nasa/{nasa_id}.mp4` (downloaded via Story 9.2)
2. **Usage:** Videos are selected from cache during visual curation
3. **Issue:** After final video generation, NASA cached files remain indefinitely

**NASA-Specific Cache Location:**
```
assets/cache/nasa/
├── nasa_12345.mp4
├── nasa_67890.mp4
└── nasa_11111.mp4
```

These files accumulate with each NASA-sourced video generation.

---

## 2. Impact Analysis

### Epic Impact

| Epic | Status | Impact | Notes |
|------|--------|--------|-------|
| **Epic 9** | In-Progress (1/5 stories) | **MODIFY** | Add Story 9.6 for NASA cache cleanup |
| Epic 5 | Not Started (Story 5.6) | Dependency | Story 5.6 must implement cleanup service first |
| Epic 8 | Done (5/5 stories) | None | DVIDS will also benefit from Story 5.6 cleanup |

**Epic 9 Modification Required:**
- Add new story 9.6: "NASA Cache Cleanup Integration" (2 points)
- Update epic story count from 5 → 6 stories
- Update epic point total from 16 → 18 points

### Story Impact

**New Story Required:**
- **Story 9.6:** NASA Cache Cleanup Integration (2 points)

**Existing Stories:** No modifications required to existing stories.

### Artifact Conflicts

| Artifact | Conflict? | Action Required |
|----------|-----------|-----------------|
| **Epic 9 Document** | Gap | Add Story 9.6 to Epic 9 story list |
| **Architecture** | No conflict | Document NASA cache cleanup pattern |
| **Database Schema** | No conflict | Handled by Epic 5 Story 5.6 migration |
| UI/UX | No conflict | None |
| CI/CD | No conflict | None |

### Technical Impact

**Components Affected:**
- `mcp_servers/nasa_api_server.py` - Add cache cleanup method (optional)
- Cleanup service (from Epic 5) will handle NASA files automatically

**No Breaking Changes:** This is additive functionality only.

---

## 3. Recommended Approach

### Selection: **Option 1 - Direct Adjustment**

**Approach:** Add Story 9.6 to Epic 9 for NASA-specific cache cleanup integration.

### Rationale

1. **Reuses Epic 5 Infrastructure:** Story 5.6 implements general cleanup service; Story 9.6 integrates NASA
2. **Minimal Effort:** 2 points (verification + optional NASA MCP cleanup method)
3. **Consistent Pattern:** All providers (YouTube, DVIDS, NASA) use same cleanup approach
4. **Low Risk:** Additive only, builds on Epic 5 Story 5.6 work

### Effort & Risk Assessment

| Metric | Assessment | Details |
|--------|------------|---------|
| **Effort** | Low (2 points) | ~0.5 day verification + optional MCP cleanup |
| **Risk** | Low | Depends on Epic 5 Story 5.6 completion |
| **Timeline Impact** | None | Can be implemented after Story 5.6 |

### Trade-offs Considered

| Option | Effort | Risk | Selected? | Reason |
|--------|--------|------|-----------|--------|
| **Option 1: Direct Adjustment** | Low | Low | ✅ **YES** | Reuses Epic 5 infrastructure |
| Option 2: Separate NASA Cleanup | Medium | Medium | ❌ No | Duplicates effort from Story 5.6 |

---

## 4. Detailed Change Proposals

### 4.1 Add Story 9.6 to Epic 9

**Epic:** 9 - NASA API Integration
**New Story:** 9.6 - NASA Cache Cleanup Integration
**Story Points:** 2

#### User Story

**As a creator,** I want the system to automatically delete NASA-cached videos after my video is generated, **so that** I don't waste disk space on cached NASA footage I no longer need.

#### Tasks

1. Verify Epic 5 Story 5.6 cleanup service handles NASA cache files correctly
2. Test cleanup with NASA videos in `assets/cache/nasa/` directory
3. Verify cleanup logging includes NASA provider name
4. (Optional) Add NASA MCP server cleanup method for manual cleanup triggers
5. Update Epic 9 completion criteria to include Story 9.6

#### Acceptance Criteria

- ✅ NASA cached videos (`assets/cache/nasa/{nasa_id}.mp4`) are deleted after final video generation
- ✅ Cleanup service identifies and removes NASA provider files
- ✅ Cleanup logging includes "Deleted NASA cache: {nasa_id}.mp4"
- ✅ Final output video preserved (same as Epic 5)
- ✅ Cleanup failures don't fail video generation
- ✅ Story 5.6 dependency verified and working

#### Technical Notes

**NASA Cache Location:**
```
assets/cache/nasa/
├── {sanitized_nasa_id}.mp4
└── ...
```

**Cleanup Service (from Epic 5 Story 5.6):**
```typescript
// lib/db/cleanup.ts (from Epic 5 Story 5.6)
export async function cleanupProjectFiles(projectId: string): Promise<CleanupResult> {
  // ... general cleanup logic ...

  // Delete NASA provider cache
  const nasaCacheDir = 'assets/cache/nasa';
  // Cleanup service handles this automatically
}
```

**Optional NASA MCP Cleanup Method:**
```python
# mcp_servers/nasa_api_server.py
@server.tool()
def clear_cache() -> str:
    """Clear all cached NASA videos (optional manual cleanup)."""
    cache_dir = Path("assets/cache/nasa")
    count = 0
    for file in cache_dir.glob("*.mp4"):
        file.unlink()
        count += 1
    return f"Cleared {count} NASA cache files"
```

**Dependency:**
- Epic 5 Story 5.6 must be implemented first (provides cleanup service)

#### Test Cases

1. **NASA Cleanup:** Generate video with NASA sources → Verify NASA cache deleted
2. **Mixed Sources:** Generate video with DVIDS + NASA sources → Verify both providers' caches deleted
3. **Selective Cleanup:** Verify only NASA files used in project are deleted
4. **MCP Cleanup (optional):** Call `clear_cache` tool → Verify all NASA cache deleted

---

### 4.2 Update Epic 9 Document

**Document:** `docs/epics/epic-9-nasa-api-integration.md`

#### ADD Story 9.6:

```markdown
### Story 9.6: NASA Cache Cleanup Integration (2 points)

**Goal:** Integrate NASA cached videos with Epic 5's post-generation cleanup service.

**Tasks:**
- Verify Epic 5 Story 5.6 cleanup service handles NASA cache files
- Test cleanup with NASA videos in `assets/cache/nasa/` directory
- Verify cleanup logging includes NASA provider name
- (Optional) Add NASA MCP server cleanup method for manual triggers
- Update Epic 9 completion criteria

**Acceptance Criteria:**
- ✅ NASA cached videos (`assets/cache/nasa/{nasa_id}.mp4`) deleted after final video generation
- ✅ Cleanup service identifies and removes NASA provider files
- ✅ Cleanup logging includes "Deleted NASA cache: {nasa_id}.mp4"
- ✅ Final output video preserved (same as Epic 5)
- ✅ Cleanup failures don't fail video generation
- ✅ Story 5.6 dependency verified and working

**Prerequisites:** Story 5.6 (Post-Generation Cache Cleanup)

**Technical Notes:**
- NASA cache location: `assets/cache/nasa/{sanitized_nasa_id}.mp4`
- Cleanup service (Epic 5 Story 5.6) handles provider-agnostic cleanup
- Optional NASA MCP `clear_cache` tool for manual cleanup
- Files modified: `mcp_servers/nasa_api_server.py` (optional)
```

#### UPDATE Epic Completion Criteria:

```markdown
## Epic Completion Criteria

- [ ] All 6 stories completed and marked as "Done"  (was 5)
- [ ] All acceptance criteria pass
- [ ] NASA API successfully queried with authentication (optional for public content)
- [ ] Direct MP4 videos downloaded via httpx
- [ ] Video selection enforces cross-scene diversity (reuses Epic 8 infrastructure)
- [ ] MCP connections pooled and reused (reuses Epic 8 infrastructure)
- [ ] Filenames valid and sanitized (reuses Epic 8 infrastructure)
- [ ] **NASA cache cleaned up after video generation (uses Epic 5 Story 5.6 service)**  (NEW)
- [ ] Unit tests pass (80%+ coverage)
- [ ] Integration tests pass with real NASA API
- [ ] No breaking changes to existing functionality
- [ ] Code reviewed and approved
```

#### UPDATE Definition of Done:

```markdown
## Definition of Done for Epic

When Epic 9 is complete:
- Space/tech niche creators can reliably source authentic NASA footage via official API
- Direct MP4 video downloads work correctly (no FFmpeg required)
- Videos are diverse across scenes (no repetitive footage)
- MCP servers are efficient (connection reuse, proper cleanup)
- System works on all platforms without filename errors
- **NASA cache files are automatically cleaned up after video generation**  (NEW)
- All changes are backward compatible (existing functionality preserved)
```

#### UPDATE Epic Summary Table:

```markdown
| Aspect | Epic 8 (DVIDS) | Epic 9 (NASA) |
|--------|---------------|---------------|
| **Video Download** | HLS manifests require FFmpeg | Direct MP4 URLs (simpler) |
| **Story 9.2 Points** | 5 points | 3 points |
| **Authentication** | Required API key | Optional API key (public content) |
| **Rate Limiting** | 30 seconds per request | 30 seconds per request (consistent) |
| **Duration in Results** | Yes (in API response) | No (requires additional fetch) |
| **Connection Pooling** | New implementation (3 points) | Reuse Epic 8 (2 points) |
| **Diversity Tracking** | New implementation (4 points) | Reuse Epic 8 (4 points, verification) |
| **Filename Handling** | New implementation (2 points) | Reuse Epic 8 (2 points, verification) |
| **Cache Cleanup** | N/A (uses Epic 5 Story 5.6) | Story 9.6: Integration (2 points) |
| **Total Points** | 19 points | 18 points (was 16) |
```

---

### 4.3 Update Architecture Documentation

**Document:** `docs/architecture/video-processing-pipeline.md`

#### ADD NASA Cache Section to Post-Generation Cleanup:

```markdown
### Provider-Specific Cache Locations

Each video provider caches downloaded videos in provider-specific directories:

| Provider | Cache Location | ID Format | Cleanup Trigger |
|----------|---------------|-----------|-----------------|
| YouTube | `.cache/videos/{projectId}/scene-{n}-*.mp4` | YouTube video ID | Epic 5 Story 5.6 |
| DVIDS | `assets/cache/dvids/{video_id}.mp4` | DVIDS video ID | Epic 5 Story 5.6 |
| NASA | `assets/cache/nasa/{nasa_id}.mp4` | NASA ID | Epic 5 Story 5.6 + Epic 9 Story 9.6 |

**NASA Cache Cleanup (Epic 9 Story 9.6):**
- Reuses Epic 5 Story 5.6 cleanup service
- No additional implementation required for automatic cleanup
- Optional: NASA MCP server provides `clear_cache` tool for manual cleanup

**Example NASA Cache:**
```
assets/cache/nasa/
├── nasa_12345.mp4           # Cleaned up by Epic 5 Story 5.6
├── nasa_67890.mp4           # Cleaned up by Epic 5 Story 5.6
└── nasa_mars_rover.mp4      # Cleaned up by Epic 5 Story 5.6
```
```

---

## 5. Implementation Handoff

### Change Scope Classification

**Scope: MINOR**

**Definition:** Can be implemented directly by development team after Epic 5 Story 5.6 is complete.

### Handoff Recipients

| Role | Responsibility | Deliverables |
|------|----------------|--------------|
| **Development Team** | Implement Story 9.6 NASA cleanup integration | Story 9.6 specification |
| **QA Team** | Test NASA cleanup behavior | Test cases from Story 9.6 |
| **Documentation** | Update Epic 9 document | Updated Epic 9 with Story 9.6 |

### Implementation Tasks

1. **Dependency Check** (Priority: High)
   - Verify Epic 5 Story 5.6 cleanup service is complete
   - Test cleanup service handles NASA cache directory correctly

2. **Testing** (Priority: High)
   - Generate test video using NASA sources
   - Verify NASA cache files deleted after generation
   - Test mixed-provider videos (DVIDS + NASA)
   - Verify cleanup logging includes NASA provider

3. **Optional MCP Tool** (Priority: Low)
   - Add `clear_cache` tool to NASA MCP server
   - Test manual cleanup invocation

4. **Documentation** (Priority: Medium)
   - Update Epic 9 document with Story 9.6
   - Update completion criteria
   - Update epic summary table

### Success Criteria

- ✅ NASA cache files deleted after successful video generation
- ✅ Final output video preserved
- ✅ Cleanup logging includes NASA provider
- ✅ Epic 9 Story 9.6 marked as "done"
- ✅ All acceptance criteria passing

### Dependencies

**Required:**
- Epic 5 Story 5.6 (Post-Generation Cache Cleanup) - MUST be complete first
- Epic 9 Stories 9.1-9.5 should be complete

### Timeline Estimate

- **Testing/Verification:** 0.5 day
- **Optional MCP Tool:** 0.5 day
- **Documentation:** 0.5 day
- **Total:** 1-1.5 days

---

## 6. Approval Record

| Role | Name | Approval | Date | Notes |
|------|------|----------|------|-------|
| Product Owner | | ⬜ Pending | | |
| Development Lead | | ⬜ Pending | | |
| Architect | | ⬜ Pending | | |

---

## Appendix A: NASA Cache File Inventory

### NASA Cache Structure

```
assets/cache/nasa/
├── {sanitized_nasa_id}.mp4    # Cached video file
├── {sanitized_nasa_id}.mp4
└── ...
```

### NASA ID Examples

| NASA ID Format | Sanitized Filename | Cache Path |
|----------------|-------------------|------------|
| `nasa_12345` | `nasa_12345.mp4` | `assets/cache/nasa/nasa_12345.mp4` |
| `17236:SpaceLaunch` | `17236-SpaceLaunch.mp4` | `assets/cache/nasa/17236-SpaceLaunch.mp4` |
| `Apollo:11:Moon` | `Apollo-11-Moon.mp4` | `assets/cache/nasa/Apollo-11-Moon.mp4` |

### Disk Usage Estimate

For a typical 10-scene NASA-sourced video:
- NASA cache files: ~300 MB (30 MB per video)
- **Total cleanup savings:** ~300 MB per NASA-sourced video

---

## Appendix B: Relationship to Epic 5 Story 5.6

### Epic 5 Story 5.6 (Prerequisite)

Epic 5 Story 5.6 implements the **general cleanup service** that handles all intermediate files:

```typescript
// lib/db/cleanup.ts (from Epic 5 Story 5.6)
export async function cleanupProjectFiles(projectId: string): Promise<CleanupResult> {
  // 1. Delete audio files
  // 2. Delete video segments
  // 3. Delete assembly temp
  // 4. Delete provider cache (DVIDS, NASA, etc.)
  // 5. Log summary
}
```

### Epic 9 Story 9.6 (This Proposal)

Epic 9 Story 9.6 **integrates NASA** with the Epic 5 cleanup service:

**No new cleanup code required** - just verification that:
1. NASA cache directory is included in cleanup service
2. NASA files are correctly identified and deleted
3. Cleanup logging includes NASA provider name

### Sequence

1. **First:** Implement Epic 5 Story 5.6 (general cleanup service)
2. **Then:** Implement Epic 9 Story 9.6 (NASA integration + verification)

---

## Appendix C: Related Documentation

- Epic 5 Stories: `docs/stories/stories-epic-5/`
- Epic 9 Stories: `docs/epics/epic-9-nasa-api-integration.md`
- Epic 5 Sprint Change Proposal: `docs/sprint-artifacts/sprint-change-proposal-2026-01-29.md`
- Video Processing Pipeline: `docs/architecture/video-processing-pipeline.md`
- NASA MCP Server: `mcp_servers/nasa_api_server.py`

---

**Document Version:** 1.0
**Last Updated:** 2026-01-29
**Status:** Awaiting Approval
