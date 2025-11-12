# Debug Test Suite: 5-Minute Video Generation

**Test ID:** TEST-DEBUG-2025-11-12
**Date:** 2025-11-12
**Primary Objective:** ENSURE 5-MINUTE VIDEOS GENERATE AS 5 MINUTES, NOT 2 MINUTES
**Status:** Ready for execution with enhanced debug logging

---

## 🎯 Problem Statement

**Current Issue:**
- User requests: 5-minute video (800 words)
- System generates: 2m 24s video (347 words = 43% of target)
- **Gap:** 2min 36s short (57% missing)

**Expected After Fix:**
- User requests: 5-minute video (800 words)
- System generates: ≥3-minute video (≥480 words = 60% of target)
- **Success:** ≥60% duration accuracy

---

## 🔧 Debug Instrumentation Added

### Enhanced Logging Points

**Location:** `src/lib/llm/script-generator.ts`

**New debug logs:**
1. **Prompt Configuration** (line 215-217)
   ```
   [DEBUG] Prompt config: Target X words, Y scenes, Z words/scene
   ```

2. **LLM Response** (line 227-228)
   ```
   [DEBUG] LLM response received in Xs, length: Y chars
   ```

3. **Word Count Analysis** (line 242)
   ```
   [DEBUG] LLM generated X words (target: Y, Z% of target)
   ```

4. **Validation Decision** (line 259-266)
   ```
   [DEBUG] Validation issues: [list]
   [DEBUG] ✅ PASSED - Script accepted (X words, Y% of target)
   OR
   [DEBUG] ❌ FAILED - Will retry (X words, Y% of target, score Z/100)
   ```

**These logs will help us:**
- Verify correct word targets are sent to LLM
- See how much LLM actually generates
- Understand validation decisions
- Track improvement across retry attempts

---

## 📋 Comprehensive Debug Test Suite

### **DT-001: Configuration Verification Test** ✅
**Priority:** P0
**Duration:** 2 minutes
**Objective:** Verify 5-minute requests are correctly configured

**Test Steps:**
1. Create new project
2. Set duration: **5 minutes**
3. Check settings page shows:
   - Duration: 5 minutes
   - Scenes: 8 scenes
   - Target words: 800 words
4. **DO NOT generate yet** - just verify configuration

**Expected Console Output:** NONE (no generation started)

**Pass Criteria:**
- ✅ UI shows: 5 minutes
- ✅ UI shows: 8 scenes
- ✅ UI shows: ~800 words target

**Purpose:** Ensure UI correctly calculates targets before sending to backend

---

### **DT-002: Prompt Content Inspection** 🔍
**Priority:** P0
**Duration:** 3 minutes
**Objective:** Verify prompt tells LLM to generate 800 words

**Test Steps:**
1. Use project from DT-001 (5 minutes, 8 scenes, 800 words)
2. Click "Generate Script"
3. **Immediately check terminal** for:
   ```
   [DEBUG] Prompt config: Target 800 words, 8 scenes, 100 words/scene
   ```

**Expected Output:**
```
[Script Generation] Attempt 1/3 for topic: "[your topic]"
[Script Generation] Using requested 8 scenes (100 words/scene target, total 800 words)
[DEBUG] Prompt config: Target 800 words, 8 scenes, 100 words/scene
[Script Generation] Calling LLM provider...
```

**Pass Criteria:**
- ✅ Shows "Target 800 words"
- ✅ Shows "8 scenes"
- ✅ Shows "100 words/scene"

**If shows different numbers:** Configuration bug - targets not passed correctly to prompt

**Purpose:** Verify backend receives correct configuration and builds prompt properly

---

### **DT-003: LLM Output Analysis - Attempt 1** 🔬
**Priority:** P0
**Duration:** Includes LLM generation time (~60-90s)
**Objective:** Measure how much LLM actually generates on first attempt

**Test Steps:**
1. Continue from DT-002 (generation already started)
2. Wait for LLM to respond
3. Look for these critical logs:

**Expected Console Output:**
```
[Script Generation] Calling LLM provider...
[DEBUG] LLM response received in 75.3s, length: 2847 chars
[Script Generation] Parsing LLM response...
[Script Generation] Parsed 8 scenes, validating quality...
[DEBUG] LLM generated XXX words (target: 800, XX% of target) ← KEY LINE
[Validation] Scene 1: X words
[Validation] Scene 2: X words
...
[Validation] Scene 8: X words
[Validation] Total words: XXX (target: 800, XX% of target, minimum: 480)
```

**Data to Record:**
| Metric | Value |
|--------|-------|
| LLM response time | ___ seconds |
| LLM response length | ___ characters |
| **Actual words generated** | ___ words |
| **Target words** | 800 words |
| **% of target** | ___% |
| **Minimum required** | 480 words (60%) |

**Pass/Fail Analysis:**

**✅ IDEAL (Unlikely but good):**
- Generated: 640-960 words (80-120% of target)
- Status: Will pass validation
- Outcome: No retry needed

**⚠️ ACCEPTABLE (Expected):**
- Generated: 480-639 words (60-79% of target)
- Status: Will pass validation
- Outcome: Video shorter than requested but acceptable

**❌ EXPECTED (Current behavior):**
- Generated: 300-479 words (<60% of target)
- Status: Will fail validation
- Outcome: Triggers retry with enhanced prompt

**Purpose:** Establish baseline LLM behavior - how short does llama3.1 generate?

---

### **DT-004: Validation Decision Verification** ⚖️
**Priority:** P0
**Duration:** Immediate (after DT-003)
**Objective:** Verify 60% threshold and penalties work correctly

**Test Steps:**
1. Continue watching console after DT-003
2. Look for validation decision logs

**Expected Console Output - Scenario A (Below 60%):**
```
[Validation] Total words: 350 (target: 800, 44% of target, minimum: 480)
[Validation] Script below minimum threshold - penalty -30 points
[DEBUG] Validation issues: Script too short: 350 words (44% of target 800, minimum 480 required); [other issues]
[Script Generation] Validation score: 25/100, passed: false, issues: 3
[DEBUG] ❌ FAILED - Will retry (350 words, 44% of target, score 25/100)
[Script Generation] ✗ Quality validation failed
[Script Generation] Retrying with enhanced prompt (attempt 2)...
```

**Expected Console Output - Scenario B (Above 60%):**
```
[Validation] Total words: 520 (target: 800, 65% of target, minimum: 480)
[Validation] Script moderately short but acceptable (60-80% of target)
[DEBUG] Validation issues: []
[Script Generation] Validation score: 100/100, passed: true, issues: 0
[DEBUG] ✅ PASSED - Script accepted (520 words, 65% of target)
[Script Generation] ✓ Quality validation passed on attempt 1
```

**Data to Record:**
| Metric | Attempt 1 Value |
|--------|-----------------|
| Below minimum? | YES/NO |
| Penalty applied | -30 or 0 |
| Other penalties | ___ (list) |
| Total score | ___/100 |
| **Decision** | **PASS / FAIL** |

**Critical Checks:**
- ✅ If words <480: MUST show "Script below minimum threshold"
- ✅ If words <480: MUST apply -30 penalty
- ✅ If score <70: MUST fail and trigger retry

**Purpose:** Verify 60% threshold enforcement is active

---

### **DT-005: Enhanced Prompt Effectiveness - Attempt 2** 🚀
**Priority:** P0
**Duration:** ~60-90s (LLM generation time)
**Objective:** Verify enhanced prompt forces LLM to generate MORE words

**Prerequisites:** DT-004 resulted in FAIL (retry triggered)

**Test Steps:**
1. Wait for Attempt 2 to complete
2. Compare word counts: Attempt 1 vs Attempt 2

**Expected Console Output:**
```
[Script Generation] Attempt 2/3 for topic: "[your topic]"
[Script Generation] Using requested 8 scenes (100 words/scene target, total 800 words)
[DEBUG] Prompt config: Target 800 words, 8 scenes, 100 words/scene
[Script Generation] Calling LLM provider...
[DEBUG] LLM response received in 78.2s, length: 3124 chars
[Script Generation] Parsing LLM response...
[DEBUG] LLM generated YYY words (target: 800, YY% of target) ← Compare to Attempt 1
[Validation] Total words: YYY (target: 800, YY% of target, minimum: 480)
```

**Comparison Table:**
| Metric | Attempt 1 | Attempt 2 | Improvement |
|--------|-----------|-----------|-------------|
| Words generated | ___ | ___ | +___ words |
| % of target | ___% | ___% | +___% |
| Status | FAIL | PASS/FAIL | ___ |

**Success Metrics:**

**✅ EXCELLENT (Enhanced prompt working):**
- Improvement: +150 words or more
- Attempt 2: ≥480 words (passes threshold)
- Example: 350 → 520 words (+170, +20%)

**⚠️ MODERATE (Prompt partially effective):**
- Improvement: +50 to +150 words
- Attempt 2: Still <480 words (fails again)
- Example: 350 → 420 words (+70, +8%)
- **Will trigger Attempt 3**

**❌ POOR (Prompt not working):**
- Improvement: <50 words
- Attempt 2: Still <480 words (fails again)
- Example: 350 → 380 words (+30, +4%)
- **Indicates LLM ignoring instructions**

**Purpose:** Measure enhanced prompt effectiveness

---

### **DT-006: Retry Penalty Escalation Verification** 🔴
**Priority:** P0
**Duration:** Immediate (after DT-005)
**Objective:** Verify -50 penalty applied on Attempt 2 if still below minimum

**Prerequisites:**
- DT-005 completed
- Attempt 2 generated <480 words

**Test Steps:**
1. Check validation logs for Attempt 2
2. Look for penalty escalation message

**Expected Console Output (If Attempt 2 <480 words):**
```
[Validation] Total words: 420 (target: 800, 53% of target, minimum: 480)
[Validation] Attempt 2 still below minimum - increased penalty -50 points ← KEY LINE
[DEBUG] Validation issues: Script too short: 420 words (53% of target 800, minimum 480 required); [other issues]
[Script Generation] Validation score: 30/100, passed: false, issues: 2
[DEBUG] ❌ FAILED - Will retry (420 words, 53% of target, score 30/100)
[Script Generation] ✗ Quality validation failed
[Script Generation] Retrying with enhanced prompt (attempt 3)...
```

**Critical Verification:**
```
OLD BUG:
[Validation] Script below minimum threshold - penalty -30 points ← WRONG!

NEW FIX:
[Validation] Attempt 2 still below minimum - increased penalty -50 points ← CORRECT!
```

**Pass Criteria:**
- ✅ If Attempt 2 <480 words: Shows "Attempt 2 still below minimum"
- ✅ If Attempt 2 <480 words: Shows "penalty -50 points" (NOT -30)
- ✅ Score significantly lower than Attempt 1
- ✅ Triggers Attempt 3

**If shows -30 instead of -50:** BUG NOT FIXED - retry penalty escalation not working

**Purpose:** Verify Fix #10.1 (retry penalty escalation) is active

---

### **DT-007: Final Attempt Outcome - Attempt 3** 🎲
**Priority:** P0
**Duration:** ~60-90s (if triggered)
**Objective:** Verify system either succeeds or properly fails

**Prerequisites:** DT-006 triggered Attempt 3

**Test Steps:**
1. Wait for Attempt 3 to complete
2. Observe final outcome

**Scenario A: Success (LLM Improves)** ✅
```
[Script Generation] Attempt 3/3 for topic: "[your topic]"
[DEBUG] LLM generated 550 words (target: 800, 69% of target)
[Validation] Total words: 550 (target: 800, 69% of target, minimum: 480)
[Validation] Script moderately short but acceptable (60-80% of target)
[Script Generation] Validation score: 100/100, passed: true
[DEBUG] ✅ PASSED - Script accepted (550 words, 69% of target)
[Script Generation] ✓ Quality validation passed on attempt 3
```
**Outcome:** Script accepted, proceed to voiceover

**Scenario B: Failure (All Attempts Exhausted)** ❌
```
[Script Generation] Attempt 3/3 for topic: "[your topic]"
[DEBUG] LLM generated 410 words (target: 800, 51% of target)
[Validation] Total words: 410 (target: 800, 51% of target, minimum: 480)
[Validation] Attempt 3 still below minimum - increased penalty -50 points
[Script Generation] Validation score: 30/100, passed: false
[DEBUG] ❌ FAILED - Will retry (410 words, 51% of target, score 30/100)
[Script Generation] ✗ Quality validation failed
[Script Generation] All 3 attempts failed. Final validation: [details]
ScriptGenerationError: Script generation failed after 3 attempts
```
**Outcome:** Error shown to user

**Both outcomes are acceptable!**
- Scenario A: System works, generates adequate content
- Scenario B: System correctly rejects inadequate content (better than accepting 2min video)

**Data to Record:**
| Metric | Final Result |
|--------|--------------|
| Total attempts | 1 / 2 / 3 |
| Final word count | ___ words |
| Final % of target | ___% |
| **Final outcome** | **SUCCESS / ERROR** |

**Purpose:** Document complete generation flow outcome

---

### **DT-008: Duration Accuracy Measurement** 📏
**Priority:** P0
**Duration:** 5 minutes (includes voiceover generation)
**Objective:** Measure actual video duration vs requested

**Prerequisites:** Script generation succeeded (DT-007 Scenario A)

**Test Steps:**
1. Navigate to script review page
2. Note final word count displayed
3. Click "Generate Voiceover"
4. Wait for voiceover completion
5. Check video duration

**Data to Record:**
| Metric | Value |
|--------|-------|
| Final script words | ___ words |
| Requested duration | 5 minutes (300s) |
| Actual duration | ___ minutes (___s) |
| Duration accuracy | ___% |

**Accuracy Calculation:**
```
Accuracy = (Actual Duration / Requested Duration) × 100%

Example:
Requested: 5min (300s)
Actual: 3m 30s (210s)
Accuracy: (210/300) × 100% = 70%
```

**Success Tiers:**

| Accuracy | Status | Notes |
|----------|--------|-------|
| ≥80% | ✅✅ Excellent | 4min+ for 5min request |
| 60-79% | ✅ Acceptable | 3-4min for 5min request |
| 50-59% | ⚠️ Poor | 2.5-3min for 5min request |
| <50% | ❌ Failure | <2.5min for 5min request |

**Before Fix (Reference):**
- Generated: 347 words (43% of target)
- Duration: 2m 24s (144s)
- Accuracy: 48% ❌

**After Fix (Goal):**
- Generated: ≥480 words (≥60% of target)
- Duration: ≥3m 0s (≥180s)
- Accuracy: ≥60% ✅

**Purpose:** Measure real improvement in duration accuracy

---

### **DT-009: Comparison Test - 3min vs 5min** 📊
**Priority:** P1
**Duration:** 10 minutes (2 generations)
**Objective:** Verify threshold scales correctly across different durations

**Test A: 3-Minute Video**
- Duration: 3 minutes
- Target: 480 words
- Minimum (60%): 288 words
- Expected: Should pass easily

**Test B: 5-Minute Video**
- Duration: 5 minutes
- Target: 800 words
- Minimum (60%): 480 words
- Expected: May require retry

**Data to Record:**
| Duration | Target Words | Minimum (60%) | Actual Generated | Status | Attempts |
|----------|--------------|---------------|------------------|--------|----------|
| 3 min | 480 | 288 | ___ | PASS/FAIL | ___ |
| 5 min | 800 | 480 | ___ | PASS/FAIL | ___ |

**Analysis:**
- Does 3-minute pass more easily than 5-minute? (Expected: YES)
- Are both achieving ≥60% accuracy? (Goal: YES)
- Does LLM struggle more with longer requests? (Expected: YES)

**Purpose:** Validate threshold scales appropriately across durations

---

### **DT-010: Edge Case - 10-Minute Video** 🔬
**Priority:** P2 (Optional)
**Duration:** 15 minutes
**Objective:** Stress test with very long video request

**Configuration:**
- Duration: 10 minutes
- Target: 1600 words
- Minimum (60%): 960 words
- Scenes: 16

**Expected Behavior:**
```
Attempt 1: 600-800 words (38-50%) → FAIL
Attempt 2: 700-1000 words (44-63%) → PASS or FAIL
Attempt 3: 800-1200 words (50-75%) → LIKELY PASS
```

**This test will reveal:**
- Can llama3.1 generate 1000+ word scripts?
- Does retry mechanism help with very long requests?
- What's the practical limit for this model?

**Acceptable outcomes:**
- ✅ Succeeds with 960+ words (excellent)
- ✅ Fails after 3 attempts (acceptable - model limitation)
- ❌ Accepts script <960 words (threshold bug)

**Purpose:** Determine model's maximum reliable length

---

### **DT-011: Regression Test - 1-Minute Video** ✅
**Priority:** P1
**Duration:** 3 minutes
**Objective:** Ensure short videos still work

**Configuration:**
- Duration: 1 minute
- Target: 160 words
- Minimum (60%): 96 words
- Scenes: 3

**Expected Behavior:**
```
Attempt 1: 140-180 words (88-113%) → PASS ✅
No retry needed
```

**Pass Criteria:**
- ✅ Passes on attempt 1
- ✅ Word count: 96-240 words
- ✅ No false rejections

**If fails:** 60% threshold TOO STRICT for short videos - needs adjustment

**Purpose:** Ensure no regression for simple requests

---

## 📋 Test Execution Checklist

### **Pre-Execution Setup**
```
[ ] Dev server stopped (Ctrl+C)
[ ] Dev server restarted (npm run dev)
[ ] Wait for "✓ Ready in X.Xs"
[ ] Ollama running (ollama list shows llama3.1:latest)
[ ] Terminal visible for console logs
[ ] Browser at http://localhost:3000
[ ] Notepad ready for recording results
```

### **Required Execution Order**
```
1. [ ] DT-001: Configuration Verification (2 min)
2. [ ] DT-002: Prompt Content Inspection (3 min)
3. [ ] DT-003: LLM Output Analysis - Attempt 1 (90s)
4. [ ] DT-004: Validation Decision (immediate)
5. [ ] DT-005: Enhanced Prompt - Attempt 2 (90s, if triggered)
6. [ ] DT-006: Retry Penalty Verification (immediate, if triggered)
7. [ ] DT-007: Final Outcome - Attempt 3 (90s, if triggered)
8. [ ] DT-008: Duration Measurement (5 min, if succeeded)
```

**Total Critical Path Time:** 15-20 minutes

### **Optional Tests**
```
9. [ ] DT-009: Comparison Test (10 min)
10. [ ] DT-010: Edge Case 10min (15 min)
11. [ ] DT-011: Regression 1min (3 min)
```

---

## 📊 Results Recording Template

### Test Execution Report

**Date:** ___________
**Time:** ___________
**Model:** llama3.1:latest
**Tester:** ___________

---

### DT-003: LLM Output Analysis - Attempt 1

**Configuration:**
- Topic: _______________________
- Target: 800 words, 8 scenes, 5 minutes
- Minimum: 480 words (60%)

**Results:**
- LLM response time: _____ seconds
- Response length: _____ characters
- **Words generated: _____ words**
- **% of target: _____%**
- Below minimum? YES / NO

**Per-scene breakdown:**
```
Scene 1: ___ words
Scene 2: ___ words
Scene 3: ___ words
Scene 4: ___ words
Scene 5: ___ words
Scene 6: ___ words
Scene 7: ___ words
Scene 8: ___ words
Total: ___ words
```

---

### DT-004: Validation Decision - Attempt 1

**Validation Results:**
- Score: ___/100
- Status: PASS / FAIL
- Penalty applied: -___ points
- Reason: _______________________

**Validation issues:**
- [ ] Below minimum threshold (<480 words)
- [ ] Banned phrases detected
- [ ] Generic opening detected
- [ ] Other: _______________________

**Decision:** ACCEPT / RETRY

---

### DT-005: Enhanced Prompt - Attempt 2 (if triggered)

**Results:**
- **Words generated: _____ words**
- **% of target: _____%**
- **Improvement from Attempt 1: +_____ words (+_____%)**

**Comparison:**
| Metric | Attempt 1 | Attempt 2 | Change |
|--------|-----------|-----------|--------|
| Words | ___ | ___ | +___ |
| % of target | ___% | ___% | +___% |

**Enhanced prompt effective?** YES / NO / PARTIAL

---

### DT-006: Retry Penalty - Attempt 2 (if below minimum)

**If Attempt 2 <480 words:**
- Penalty shown: -___ points
- Message: _______________________
- ✅ Shows "-50 points"? YES / NO
- ✅ Shows "Attempt 2 still below minimum"? YES / NO

**CRITICAL:** If shows "-30 points" instead of "-50": **BUG NOT FIXED**

---

### DT-007: Final Outcome

**Final Results:**
- Total attempts: 1 / 2 / 3
- Final word count: _____ words
- Final % of target: _____%
- **Outcome: SUCCESS / ERROR**

---

### DT-008: Duration Accuracy (if succeeded)

**Video Metrics:**
- Script words: _____ words
- Requested duration: 5 minutes (300s)
- **Actual duration: _____ minutes (_____ seconds)**
- **Duration accuracy: _____%**

**Comparison:**
| Metric | Before Fix | After Fix | Improvement |
|--------|------------|-----------|-------------|
| Words | 347 (43%) | ___ (___%) | +___ words |
| Duration | 2m 24s (48%) | ___m ___s (___%) | +___ seconds |
| Accuracy | 48% | ___% | +___% |

**Success?** ✅ ≥60% accuracy / ❌ <60% accuracy

---

## 🎯 Success Criteria Summary

### Critical Success Metrics

**✅ TEST SUITE PASSES if:**
1. **Configuration correct:** DT-001/DT-002 show 800 words, 8 scenes
2. **Threshold enforced:** DT-004 fails scripts <480 words
3. **Retry penalty works:** DT-006 shows -50 penalty on attempt 2
4. **Duration improved:** DT-008 shows ≥60% accuracy (≥3min for 5min request)
5. **No regression:** Short videos (1-3min) still work easily

**❌ TEST SUITE FAILS if:**
1. Configuration shows wrong targets
2. Scripts <480 words accepted (threshold not enforced)
3. Attempt 2 shows -30 instead of -50 (retry penalty broken)
4. Duration accuracy <50% (no improvement)
5. Baseline functionality broken

---

## 🚨 Known Issues & Expected Behaviors

### Expected: llama3.1 Generates Short Content

**Behavior:**
- Attempt 1: 300-400 words (38-50% of 800 target)
- Attempt 2: 350-450 words (44-56% of 800 target)
- Attempt 3: 400-550 words (50-69% of 800 target)

**This is a MODEL LIMITATION, not a bug.**

**Acceptable outcomes:**
- ✅ System rejects all 3 attempts → Shows error to user (validation working)
- ✅ System accepts on attempt 3 with 480-550 words → Video 3-3.5min (improvement)

**What this proves:**
- Validation threshold is working (rejecting <480)
- Retry mechanism is working (improving word count)
- Model has reached its limit for this topic complexity

---

### Expected: Certain Topics More Difficult

**Complex topics generate less:**
- "The rise and fall of the Roman Empire" → ~350 words
- "Incel culture and societal impact" → ~340 words

**Simple topics generate more:**
- "Why octopuses are intelligent" → ~450 words
- "How to make pizza" → ~500 words

**This is normal.** Complex topics require more "thinking" per word, so LLMs generate fewer total words.

---

## 🔧 Troubleshooting Guide

### Issue: No Debug Logs Appearing

**Symptoms:** Console doesn't show `[DEBUG]` messages

**Solutions:**
1. Restart dev server: `npm run dev`
2. Check dev server is running (not build mode)
3. Verify you're watching the correct terminal window
4. Try: `Ctrl+C` → `npm run dev` → retry test

---

### Issue: Configuration Shows Wrong Numbers

**Symptoms:** DT-002 shows different word count than expected

**Check:**
1. UI settings page - what values are displayed?
2. Project config in database - may be cached
3. Try creating fresh project with explicit 5-minute setting

**If numbers still wrong:** Configuration calculation bug in frontend

---

### Issue: Validation Always Passes

**Symptoms:** Scripts <480 words showing PASS

**Check:**
1. Minimum threshold calculation: `800 × 0.60 = 480`
2. Console shows correct minimum: "minimum: 480"?
3. Actual words vs minimum comparison

**If always passes:** Threshold enforcement bug - validation not checking correctly

---

### Issue: Always Shows -30 Penalty, Never -50

**Symptoms:** Attempt 2+ still shows -30 penalty when below minimum

**Check:**
1. Console shows attempt number: "Attempt 2 still below minimum"?
2. Penalty amount in log: "-50 points" or "-30 points"?

**If always -30:** Retry penalty escalation not implemented - attempt number not passed to validation

---

## 📝 Next Steps After Testing

### If Tests Pass (Duration ≥60%)

**Actions:**
1. ✅ Mark Fix #10.1 as verified
2. ✅ Update documentation with test results
3. ✅ Consider this acceptable behavior
4. Optional: Explore better LLM models (llama3.3, mixtral, etc.)

---

### If Tests Partially Pass (Duration 50-59%)

**Actions:**
1. ⚠️ System improved but not enough
2. Consider adjusting threshold: 60% → 55%
3. OR: Improve enhanced prompts further
4. OR: Add attempt 4 with even stronger prompts

---

### If Tests Fail (Duration <50%)

**Actions:**
1. ❌ Threshold not enforced or retry penalties not working
2. Debug validation logic
3. Check attempt number passing correctly
4. Verify penalty calculation

---

## 🎓 Learning Objectives

**This test suite will teach us:**
1. How much llama3.1 can realistically generate
2. Whether enhanced prompts actually help
3. If 60% threshold is appropriate or needs adjustment
4. Model's practical limits for video generation
5. Which topics work well vs poorly

**Use results to:**
- Set realistic user expectations
- Guide UI messaging ("5-minute video may generate 3-4 minutes")
- Decide if model upgrade needed
- Tune validation thresholds per use case

---

**Ready to execute!** 🧪

**Start with:** DT-001 → DT-002 → DT-003 → ... (follow execution order)

**Time estimate:** 15-20 minutes for critical path

---

**Author:** TEA (Master Test Architect)
**Date:** 2025-11-12
**Status:** Ready for execution with enhanced debug logging
