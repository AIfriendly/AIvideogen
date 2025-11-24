 # Manual Acceptance Criteria Summary
## Stories 5.1, 5.2, 5.3 - Quick Reference

**Date:** 2025-11-24

---

## Story 5.1: Video Processing Infrastructure Setup

### Manual Tests Required: 2

| AC | Description | Why Manual? | Time Est. |
|----|-------------|-------------|-----------|
| **AC1** | FFmpeg Installation Verification | Requires checking system PATH and verifying error messages are user-friendly and actionable | 5 min |
| **AC6** | Basic FFmpeg Operations (Metadata Accuracy) | Requires verifying returned metadata matches actual file properties with known test files | 10 min |

**Total Time: ~15 minutes**

---

## Story 5.2: Scene Video Trimming & Preparation

### Manual Tests Required: 3

| AC | Description | Why Manual? | Time Est. |
|----|-------------|-------------|-----------|
| **AC4** | Progress Tracking Display | Requires visual verification of progress indicator in UI showing "Trimming scene X/Y..." | 5 min |
| **AC7** | Performance (Real-World Timing) | Requires measuring actual performance with stopwatch on real hardware with typical video files | 10 min |
| **AC8** | Quality Preservation (Visual Inspection) | Requires side-by-side visual comparison of original vs trimmed video to assess quality loss | 15 min |

**Total Time: ~30 minutes**

---

## Story 5.3: Video Concatenation & Audio Overlay

### Manual Tests Required: 5

| AC | Description | Why Manual? | Time Est. |
|----|-------------|-------------|-----------|
| **AC2** | Scene Order (Visual Verification) | Requires watching final video to verify scenes appear in correct sequential order with no glitches | 10 min |
| **AC3** | Audio Synchronization (Listening Test) | Requires listening to verify voiceover audio plays in sync with corresponding scene visuals | 15 min |
| **AC4** | Audio Sync Accuracy (Precise Timing) | Requires frame-accurate timing measurements to verify no drift > 0.1s between audio and video | 20 min |
| **AC9** | Playability (Multi-Platform Test) | Requires opening and playing video in multiple players (VLC, Chrome, Firefox, Safari) to verify compatibility | 15 min |
| **AC10** | File Size Validation | Requires checking file size is reasonable (5-10 MB/minute at 720p) - partly subjective assessment | 5 min |

**Total Time: ~65 minutes**

---

## Additional Critical Manual Tests

### Audio Volume Normalization (Story 5.3)
- **Purpose:** Verify `amix` filter with `normalize=0` prevents volume reduction
- **Why Manual:** Requires measuring audio levels with audio tools (Audacity, ffprobe) and subjective listening test
- **Time:** 15 minutes

### Windows Path Handling (Story 5.3)
- **Purpose:** Verify backslashes converted to forward slashes and special characters escaped
- **Why Manual:** Requires testing on Windows environment with specific path structures
- **Time:** 10 minutes (Windows only)

### Large Scene Count Warning (Story 5.3)
- **Purpose:** Verify warning displayed for projects with >10 scenes
- **Why Manual:** Requires creating test project with many scenes and checking logs/UI
- **Time:** 10 minutes

### Full Pipeline Integration
- **Purpose:** Verify end-to-end user experience from project creation to final video download
- **Why Manual:** Requires human assessment of user experience, timing, and overall quality
- **Time:** 20 minutes

---

## Total Manual Testing Time

| Story | Manual Tests | Time Required |
|-------|--------------|---------------|
| Story 5.1 | 2 ACs | ~15 minutes |
| Story 5.2 | 3 ACs | ~30 minutes |
| Story 5.3 | 5 ACs | ~65 minutes |
| Additional Critical Tests | 4 tests | ~55 minutes |
| **TOTAL** | **14 manual tests** | **~165 minutes (2.75 hours)** |

---

## Automated vs Manual Breakdown

### Story 5.1 (7 ACs Total)
- ✅ **Automated:** 5 ACs (71%)
- ⚠️ **Manual:** 2 ACs (29%)

### Story 5.2 (8 ACs Total)
- ✅ **Automated:** 5 ACs (63%)
- ⚠️ **Manual:** 3 ACs (37%)

### Story 5.3 (10 ACs Total)
- ✅ **Automated:** 5 ACs (50%)
- ⚠️ **Manual:** 5 ACs (50%)

### Overall (25 ACs Total)
- ✅ **Automated:** 15 ACs (60%)
- ⚠️ **Manual:** 10 ACs (40%)

---

## Automated Acceptance Criteria (Can be verified by tests)

### Story 5.1
- ✅ AC2: Assembly Job Creation (API tests)
- ✅ AC3: Job Status Updates (integration tests)
- ✅ AC4: Scene Validation (API tests)
- ✅ AC5: Duplicate Job Prevention (API tests)
- ✅ AC7: Temporary File Management (file system tests)

### Story 5.2
- ✅ AC1: Duration-Based Trimming (duration verification tests)
- ✅ AC2: Trimmed Clip Storage (file path tests)
- ✅ AC3: Sequential Processing (order verification tests)
- ✅ AC5: Short Video Edge Case (loop/extend tests)
- ✅ AC6: Missing Video Error (error handling tests)

### Story 5.3
- ✅ AC1: Video Concatenation (duration calculation tests)
- ✅ AC5: Output Format (codec detection tests)
- ✅ AC6: Output Location (file path tests)
- ✅ AC7: Project Record Update (database tests)
- ✅ AC8: Job Completion (status tests)

---

## Testing Recommendations

### When to Run Manual Tests

**During Development:**
- Run manual tests for each AC as it's implemented
- Focus on quick smoke tests (visual/audio checks)
- Time: ~30 minutes per story

**Before PR/Merge:**
- Run full manual test suite for the story
- Document any issues found
- Time: Full suite per story (15-65 min)

**Before Release:**
- Run complete manual test suite (all stories)
- Test on multiple platforms/browsers
- Test edge cases and error scenarios
- Time: Full suite (~2.75 hours)

### Tools Recommended

**Video Testing:**
- VLC Media Player (cross-platform)
- Chrome DevTools (network, console)
- Video editor with frame-accurate seeking (DaVinci Resolve, Premiere)

**Audio Testing:**
- Audacity (waveform analysis, volume measurement)
- ffprobe (metadata inspection)

**Performance Testing:**
- Stopwatch (manual timing)
- Browser DevTools Performance tab
- Task Manager / Activity Monitor (resource usage)

---

## Critical Quality Gates

Before marking stories as **Done**, ensure:

1. ✅ All automated tests pass (>80% coverage)
2. ⚠️ All manual acceptance criteria verified and documented
3. ✅ No critical bugs found during manual testing
4. ⚠️ Performance meets targets (measured manually)
5. ⚠️ Audio sync verified (listening test + timing measurements)
6. ⚠️ Video quality acceptable (visual inspection)
7. ⚠️ Multi-platform playability confirmed
8. ✅ Security scan passes (no secrets)

**Manual testing is REQUIRED before release - automated tests alone are insufficient for video/audio quality verification.**

---

## Quick Checklist for Story Completion

### Story 5.1 ✓
- [ ] FFmpeg installed and PATH verified
- [ ] Error messages are user-friendly
- [ ] Metadata accuracy verified with test files

### Story 5.2 ✓
- [ ] Progress indicator displays correctly in UI
- [ ] Performance <30s per scene (measured)
- [ ] Video quality preserved (side-by-side comparison)

### Story 5.3 ✓
- [ ] Scene order correct (watched full video)
- [ ] Audio sync verified (listening test)
- [ ] No drift >0.1s (timing measurements)
- [ ] Plays in VLC, Chrome, Firefox, Safari
- [ ] File size reasonable (5-10 MB/min)
- [ ] Audio volume NOT reduced (normalize=0 works)
- [ ] Windows paths handled correctly (if applicable)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-24
**Owner:** QA Team / Story Implementer
