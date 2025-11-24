# Manual Test Checklist - Story 3.5
**Test Date**: 2025-11-17
**Tester**: ___________
**Story**: 3.5 - Visual Suggestions Database & Workflow Integration
**Status**: ⏳ IN PROGRESS

---

## Pre-Test Setup ✅

- [ ] Dev server running at http://localhost:3000
- [ ] Database initialized (npm run db:migrate)
- [ ] Epic 2 completed (at least 1 project with voiceovers generated)
- [ ] Browser DevTools open (Network and Console tabs)

**Setup Commands:**
```bash
cd "D:\BMAD video generator\ai-video-generator"
npm run dev
# Open: http://localhost:3000
```

---

## Test 1: AC10 - VisualSourcingLoader Displays ✅

**Acceptance Criteria:**
- VisualSourcing loading screen displays during visual generation process
- UI consistent with existing loading patterns (VoiceoverGeneration)
- Modal or overlay prevents user interaction during processing

**Test Steps:**

1. **Navigate to project with completed voiceovers**
   - [ ] Open http://localhost:3000/projects
   - [ ] Select a project with `current_step = 'voiceover'` and `voiceovers_generated = true`
   - [ ] Note project ID: ___________

2. **Trigger visual sourcing**
   - [ ] Wait for automatic trigger (should happen after voiceover completion)
   - OR manually navigate to trigger point
   - [ ] Observe VisualSourcingLoader component appears

3. **Verify loading screen appearance**
   - [ ] ✅ Loading screen displays immediately
   - [ ] ✅ UI has modal/overlay background (blocks interaction)
   - [ ] ✅ Loading animation visible (spinner or progress bar)
   - [ ] ✅ UI style matches VoiceoverGeneration loader
   - [ ] ✅ Cannot click elements behind modal

**Expected Behavior:**
- Modal appears covering the screen
- Loading indicator animates smoothly
- User cannot interact with UI behind modal

**Evidence:**
- [ ] Screenshot saved: `test-ac10-loading-screen.png`

**Result:** ✅ PASS / ❌ FAIL
**Notes:** _________________________________________________

---

## Test 2: AC11 - Progress Indicator Shows Real-Time Status ✅

**Acceptance Criteria:**
- Progress indicator shows "Analyzing scene X/Y..." dynamically
- Percentage calculation accurate: (currentScene / totalScenes) * 100
- Updates in real-time as scenes are processed

**Test Steps:**

1. **Observe progress text during processing**
   - [ ] VisualSourcingLoader is visible from Test 1
   - [ ] Note total scenes in project: _____
   - [ ] Watch progress text update

2. **Verify progress text format**
   - [ ] ✅ Shows "Analyzing scene 1/[total]..." initially
   - [ ] ✅ Updates to "Analyzing scene 2/[total]..." after first scene
   - [ ] ✅ Continues incrementing through all scenes
   - [ ] ✅ Text is readable and well-positioned

3. **Verify percentage calculation**
   - [ ] ✅ Percentage starts at ~0% or shows first scene progress
   - [ ] ✅ Increases incrementally (e.g., for 5 scenes: 20%, 40%, 60%, 80%, 100%)
   - [ ] ✅ Reaches 100% at completion

4. **Verify real-time updates**
   - [ ] ✅ Progress updates without page refresh
   - [ ] ✅ Updates are smooth (no jarring jumps)
   - [ ] ✅ Timing feels reasonable (not too fast/slow)

**Expected Behavior:**
- Text: "Analyzing scene 1/5..." → "Analyzing scene 2/5..." → ... → "Analyzing scene 5/5..."
- Percentage: 20% → 40% → 60% → 80% → 100% (for 5 scenes)

**Evidence:**
- [ ] Screenshot of progress at 40%: `test-ac11-progress-40.png`
- [ ] Screenshot of progress at 80%: `test-ac11-progress-80.png`

**Result:** ✅ PASS / ❌ FAIL
**Notes:** _________________________________________________

---

## Test 3: AC12 - Automatic Trigger After Epic 2 ✅

**Acceptance Criteria:**
- After Epic 2 voiceover completion, visual sourcing triggers automatically
- No manual navigation required (seamless workflow)
- current_step transitions: 'voiceover' → 'visual-sourcing' → 'visual-curation'
- Idempotency check prevents duplicate visual sourcing on retry

**Test Steps:**

1. **Create fresh project to test trigger**
   - [ ] Create new project or use one at 'voiceover' step
   - [ ] Complete voiceover generation (if needed)
   - [ ] Project ID: ___________

2. **Verify automatic trigger**
   - [ ] ✅ Visual sourcing starts automatically after voiceover completes
   - [ ] ✅ No manual button click or navigation required
   - [ ] ✅ Transition is seamless (no page break)

3. **Verify state transitions in DevTools Network tab**
   - [ ] Open Browser DevTools → Network tab
   - [ ] Filter: XHR/Fetch
   - [ ] After voiceover completes, observe:
     - [ ] ✅ PUT request to update `current_step = 'visual-sourcing'`
     - [ ] ✅ POST request to `/api/projects/[id]/generate-visuals`
     - [ ] ✅ PUT request to update `current_step = 'visual-curation'`

4. **Test idempotency (prevent duplicates)**
   - [ ] Refresh page during visual sourcing
   - [ ] ✅ No duplicate API calls observed (check Network tab)
   - [ ] After completion, refresh page again
   - [ ] ✅ Stays on 'visual-curation' step (doesn't re-trigger)

5. **Verify database state**
   ```bash
   # Check current_step in database
   cd "D:\BMAD video generator\ai-video-generator"
   # Use SQLite browser or query:
   sqlite3 data/video-generator.db "SELECT id, current_step, visuals_generated FROM projects WHERE id = '[PROJECT_ID]';"
   ```
   - [ ] ✅ `current_step = 'visual-curation'`
   - [ ] ✅ `visuals_generated = 1` (true)

**Expected Behavior:**
- Voiceover completes → Loading screen appears → Visual sourcing runs → Navigates to visual-curation
- Refresh during processing → No duplicate API calls
- Refresh after completion → Stays on visual-curation

**Evidence:**
- [ ] Screenshot of Network tab showing API calls: `test-ac12-network-calls.png`
- [ ] Database query result: `current_step = 'visual-curation'`

**Result:** ✅ PASS / ❌ FAIL
**Notes:** _________________________________________________

---

## Test 4: AC13 - Project State Advances to Visual Curation ⚠️

**Acceptance Criteria:**
- projects.current_step advances to 'visual-curation'
- Navigation to /visual-curation works
- State persisted in database (survives page refresh)
- **Note:** Epic 4 UI verification deferred (blocked on Epic 4 implementation)

**Test Steps:**

1. **Verify state advancement**
   - [ ] From Test 3, visual sourcing has completed
   - [ ] ✅ Browser URL shows: `/projects/[id]/visual-curation`
   - [ ] ✅ Page loads (may be placeholder/404 - expected)

2. **Verify state persistence**
   - [ ] Refresh browser (F5)
   - [ ] ✅ Still on `/projects/[id]/visual-curation` (doesn't revert)
   - [ ] ✅ No redirect back to voiceover or visual-sourcing

3. **Verify database persistence**
   ```bash
   sqlite3 data/video-generator.db "SELECT id, current_step, visuals_generated FROM projects WHERE id = '[PROJECT_ID]';"
   ```
   - [ ] ✅ `current_step = 'visual-curation'`
   - [ ] ✅ Value persists after refresh

4. **Epic 4 UI check (expected to fail)**
   - [ ] ⚠️ Epic 4 UI elements NOT visible (expected - Epic 4 not implemented)
   - [ ] ⚠️ May see 404 or placeholder page (acceptable)

**Expected Behavior:**
- State advances to 'visual-curation' ✅
- Navigation works ✅
- State persists ✅
- Epic 4 UI missing ⚠️ (blocked on Epic 4)

**Evidence:**
- [ ] Screenshot of /visual-curation page: `test-ac13-visual-curation.png`
- [ ] Database query result screenshot

**Result:** ✅ PARTIAL PASS (Epic 4 UI pending)
**Notes:** _________________________________________________

---

## Test 5: AC15 - Zero Results Empty State ✅

**Acceptance Criteria:**
- If YouTube returns 0 results for a scene, UI displays empty state
- Message: "No clips found for this scene. Try editing the script or searching manually."
- Empty state does not block workflow progression
- User can proceed to Epic 4 with partial results

**Test Steps:**

1. **Create project with obscure scene text**
   - [ ] Create new project
   - [ ] Add scene with very specific/obscure text unlikely to return YouTube results
   - [ ] Example: "xyzabc123 nonexistent video content unique string"
   - [ ] Complete voiceover generation

2. **Trigger visual sourcing**
   - [ ] Wait for automatic trigger
   - [ ] Visual sourcing processes scenes

3. **Verify empty state handling**
   - [ ] After completion, check result
   - [ ] ✅ Empty state message displayed for scene with 0 results
   - [ ] ✅ Message is helpful: mentions editing script or manual search
   - [ ] ✅ Message is not an error (doesn't look like crash)

4. **Verify partial completion allowed**
   - [ ] ✅ Workflow continues despite 0 results
   - [ ] ✅ Advances to 'visual-curation' step
   - [ ] ✅ UI shows partial success indicator (e.g., "3 of 5 scenes have suggestions")

5. **Verify database**
   ```bash
   sqlite3 data/video-generator.db "SELECT COUNT(*) FROM visual_suggestions WHERE scene_id IN (SELECT id FROM scenes WHERE project_id = '[PROJECT_ID]');"
   ```
   - [ ] ✅ Some suggestions exist (partial results)
   - [ ] ✅ Scene with 0 results has no entries (expected)

**Expected Behavior:**
- Empty state message displays for scene(s) with 0 results
- Message is user-friendly and actionable
- Workflow continues (not blocked)
- Partial results accepted

**Evidence:**
- [ ] Screenshot of empty state message: `test-ac15-empty-state.png`

**Result:** ✅ PASS / ❌ FAIL / ⏭️ SKIP (if no 0-result scenes)
**Notes:** _________________________________________________

---

## Test 6: AC16 - API Failure Retry Button ✅

**Acceptance Criteria:**
- If API fails during visual sourcing, UI provides 'Retry' button
- Retry button triggers POST /generate-visuals with resume logic
- Error message actionable and user-friendly
- Retry only processes failed scenes (doesn't regenerate completed)

**Test Steps:**

1. **Simulate API failure**
   - [ ] Start visual sourcing for project
   - [ ] Quickly disconnect network or kill API endpoint
   - [ ] **Option 1:** Disable Wi-Fi/Ethernet during processing
   - [ ] **Option 2:** Open DevTools → Network → Throttle to Offline
   - [ ] **Option 3:** Pause dev server mid-processing

2. **Verify error state**
   - [ ] ✅ Error message displays
   - [ ] ✅ Message is user-friendly (not technical stack trace)
   - [ ] ✅ 'Retry' button visible
   - [ ] ✅ Error explains what happened

3. **Test retry functionality**
   - [ ] Re-enable network connection
   - [ ] Click 'Retry' button
   - [ ] ✅ POST request sent to `/api/projects/[id]/generate-visuals`

4. **Verify resume logic (skips completed scenes)**
   - [ ] Open DevTools → Console
   - [ ] Check Network tab for API request
   - [ ] ✅ Only failed scenes processed (check response JSON)
   - [ ] ✅ Completed scenes skipped (verify via logs or response)

5. **Verify successful retry**
   - [ ] ✅ Retry completes successfully
   - [ ] ✅ Advances to 'visual-curation'
   - [ ] ✅ Partial success indicator shows correct counts

**Expected Behavior:**
- API failure → Error message + Retry button
- Retry → Only processes incomplete scenes
- Success after retry

**Evidence:**
- [ ] Screenshot of error message: `test-ac16-error-message.png`
- [ ] Screenshot of retry button: `test-ac16-retry-button.png`
- [ ] Network tab showing retry request

**Result:** ✅ PASS / ❌ FAIL / ⏭️ SKIP (if no failures)
**Notes:** _________________________________________________

---

## Test Summary

| Test | AC | Description | Result | Notes |
|------|-----|-------------|--------|-------|
| 1 | AC10 | VisualSourcingLoader displays | ⬜ | |
| 2 | AC11 | Progress indicator updates | ⬜ | |
| 3 | AC12 | Automatic trigger from Epic 2 | ⬜ | |
| 4 | AC13 | State advances (partial) | ⬜ | Epic 4 UI pending |
| 5 | AC15 | Zero results empty state | ⬜ | |
| 6 | AC16 | Retry button on failure | ⬜ | |

**Overall Result:** _____ / 6 tests passed

---

## Additional Checks

### Database Verification
```bash
# Check visual_suggestions table
sqlite3 data/video-generator.db "SELECT COUNT(*) FROM visual_suggestions;"

# Check project state
sqlite3 data/video-generator.db "SELECT id, current_step, visuals_generated FROM projects LIMIT 5;"

# Check suggestions for specific project
sqlite3 data/video-generator.db "SELECT scene_id, video_id, title, rank FROM visual_suggestions WHERE scene_id IN (SELECT id FROM scenes WHERE project_id = '[PROJECT_ID]') ORDER BY rank;"
```

**Results:**
- [ ] visual_suggestions table has data ✅
- [ ] current_step updated correctly ✅
- [ ] visuals_generated flag = 1 ✅

### Automated Test Verification
```bash
# Re-run automated tests to ensure nothing broke
npx vitest run tests/db/visual-suggestions.test.ts tests/api/visual-suggestions.test.ts
```

**Results:**
- [ ] All 15 automated tests still passing ✅

---

## Issues Found

| # | Severity | Description | Steps to Reproduce | Expected | Actual |
|---|----------|-------------|-------------------|----------|--------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

---

## Final Verdict

- [ ] ✅ **APPROVE** - All tests passed, Story 3.5 ready for production
- [ ] ⚠️ **APPROVE WITH NOTES** - Minor issues, but Story 3.5 acceptable (document issues)
- [ ] ❌ **REJECT** - Critical issues found, Story 3.5 needs fixes

**Tester Signature:** ___________
**Date:** ___________

**Notes:**
_________________________________________________________
_________________________________________________________

---

## Next Steps After Testing

### If APPROVED ✅
1. Mark Story 3.5 as DONE in sprint status
2. Update docs with "AC13 Epic 4 UI verification pending Epic 4"
3. Commit test results to repository
4. Begin Story 3.6 development

### If ISSUES FOUND ❌
1. Create GitHub issues for bugs
2. Prioritize fixes (P0 = blocker, P1 = high, P2 = medium)
3. Assign to developer for fixes
4. Retest after fixes applied
