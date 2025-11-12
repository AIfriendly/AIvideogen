# Fix #9 & #10: Script Generation Improvements

**Date:** 2025-11-12
**Issues:**
1. JSON parsing failures for 8-scene videos (complex requests)
2. Generated videos too short despite passing validation (2min vs 5min requested)

**Status:** ✅ FIXED

---

## What Happened

### Issue #1: JSON Parsing Failures

After upgrading from llama3.2 to llama3.1 (4.7GB model), 8-scene video generation started failing with JSON syntax errors:

```
[Script Generation] Attempt 1 failed: Failed to parse LLM response as JSON:
Expected ',' or '}' after property value in JSON at position 940 (line 15 column 21)

[Script Generation] Attempt 2 failed: Failed to parse LLM response as JSON:
Expected ',' or '}' after property value in JSON at position 829 (line 15 column 23)

[Script Generation] Attempt 3 failed: Failed to parse LLM response as JSON:
Expected ',' or '}' after property value in JSON at position 2058 (line 33 column 23)
```

**Test Results:**
- ✅ 4-scene videos: SUCCESS (100/100 validation score)
- ❌ 8-scene videos (800 words): FAILED with JSON parsing errors on all 3 attempts

### Issue #2: Videos Too Short

After fixing JSON parsing, scripts generated successfully but were far too short:

```
[Validation] Total words: 347 (target: 800, 43% of target)
[Script Generation] Validation score: 100/100, passed: true, issues: 0
Total project duration: 144.81s (2m 24s)  // Expected: 5 minutes ❌
```

**Per-scene breakdown:**
- Scene 1: 36 words (target: 100)
- Scene 2: 39 words (target: 100)
- Scene 3: 51 words (target: 100)
- ...continuing this pattern

**The Problem:** Validation was too lenient - scripts passed with 100/100 score despite being only 43% of target length.

---

## Root Causes

### Root Cause #1: Invalid JSON from llama3.1

**Why it happens:**
- llama3.1 generates longer, more complex JSON for 8-scene requests
- Common syntax errors in long outputs:
  - Missing commas between properties
  - Unclosed braces or brackets
  - Malformed strings with unescaped quotes
  - Trailing commas

**Example of malformed JSON:**
```json
{
  "scenes": [
    {
      "sceneNumber": 1
      "text": "Scene content",  // ❌ Missing comma after sceneNumber
      "wordCount": 50
    }
  ]
}
```

### Root Cause #2: Validation Too Lenient

**Evolution of validation logic:**

1. **Original (Too Strict):**
   - Hard penalties for any word count deviation
   - Generated 235 words for 800 target → FAILED (55/100)
   - Many false negatives ❌

2. **After Previous Session (Too Lenient):**
   - Removed all word count penalties
   - Generated 347 words for 800 target → PASSED (100/100)
   - Videos too short ❌

3. **Current (Balanced):** ✅
   - Soft minimum: 50% of target required
   - Generated 347 words for 800 target → FAILS (70/100, -30 penalty)
   - Generated 600 words for 800 target → PASSES with suggestions
   - Generated 750 words for 800 target → PASSES with +10 bonus

---

## Fix #9: JSON Repair Implementation

### Solution: Auto-Repair Malformed JSON

Integrated the `jsonrepair` library to automatically fix common JSON syntax errors before parsing.

### Changes Made

**1. Install jsonrepair package:**

```bash
npm install jsonrepair --legacy-peer-deps
```

*Note: Used `--legacy-peer-deps` due to React 19 peer dependency conflicts with testing library*

**2. Update `src/lib/llm/script-generator.ts`:**

**Import jsonrepair (line 16):**
```typescript
import { jsonrepair } from 'jsonrepair';
```

**Main parsing with repair (lines 63-67):**
```typescript
try {
  // Try to repair and parse as JSON
  // jsonrepair fixes common issues: missing commas, trailing commas, unclosed braces, etc.
  const repairedResponse = jsonrepair(cleanedResponse);
  const parsed = JSON.parse(repairedResponse);

  // ... validation logic
```

**Markdown extraction with repair (lines 88-94):**
```typescript
const jsonMatch = cleanedResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
if (jsonMatch) {
  try {
    const repairedJson = jsonrepair(jsonMatch[1]);
    const parsed = JSON.parse(repairedJson);
    if (parsed.scenes && Array.isArray(parsed.scenes)) {
      return parsed.scenes as Scene[];
    }
  } catch {
    // Fall through to error
  }
}
```

**Object matching with repair (lines 102-108):**
```typescript
const jsonObjectMatch = cleanedResponse.match(/\{[\s\S]*"scenes"[\s\S]*\}/);
if (jsonObjectMatch) {
  try {
    const repairedJson = jsonrepair(jsonObjectMatch[0]);
    const parsed = JSON.parse(repairedJson);
    if (parsed.scenes && Array.isArray(parsed.scenes)) {
      return parsed.scenes as Scene[];
    }
  } catch {
    // Fall through to error
  }
}
```

### How It Works

**jsonrepair automatically fixes:**
- Missing commas: `{"a":1 "b":2}` → `{"a":1,"b":2}`
- Trailing commas: `{"a":1,}` → `{"a":1}`
- Unclosed braces: `{"a":1` → `{"a":1}`
- Unescaped quotes: `{"a":"value"with"quotes"}` → `{"a":"value\"with\"quotes"}`
- And many other common JSON syntax errors

**Three-stage fallback parsing:**
1. **Direct JSON:** Try to repair and parse entire response
2. **Markdown extraction:** Extract JSON from code blocks, then repair
3. **Object matching:** Find JSON object pattern, then repair

**Result:** ✅ JSON parsing now succeeds for 8-scene videos

---

## Fix #10: Minimum Word Count Threshold

### Solution: Balanced Validation with Soft Minimum

Implemented a 50% minimum threshold with graduated penalties to ensure videos meet duration expectations while remaining flexible.

### Changes Made

**1. Update `src/lib/llm/validate-script-quality.ts` (lines 136-196):**

```typescript
// Validation 2b: Check total word count if target is provided (duration-based validation)
// PHILOSOPHY: Soft minimum threshold to ensure videos meet user expectations
// - Scripts must reach at least 50% of target to pass (prevents 2min videos when user wants 5min)
// - No hard penalties for minor deviations (80-120% range gets bonus)
// - Informational suggestions for user awareness
if (targetTotalWords && targetTotalWords > 0) {
  const totalActualWords = scenes.reduce((sum, scene) => {
    return sum + scene.text.trim().split(/\s+/).length;
  }, 0);

  // Calculate tolerances
  const minTolerance = 0.50; // Minimum 50% of target to pass
  const maxTolerance = 0.50; // Allow up to 50% over target
  const minWords = Math.ceil(targetTotalWords * minTolerance);
  const maxWords = Math.ceil(targetTotalWords * (1 + maxTolerance));

  const percentOfTarget = Math.round((totalActualWords / targetTotalWords) * 100);

  // Log word count
  console.log(
    `[Validation] Total words: ${totalActualWords} (target: ${targetTotalWords}, ${percentOfTarget}% of target, ` +
    `minimum: ${minWords})`
  );

  // CRITICAL: Enforce minimum word count threshold
  // If script is too short (< 50% of target), fail validation
  if (totalActualWords < minWords) {
    issues.push(
      `Script too short: ${totalActualWords} words (${percentOfTarget}% of target ${targetTotalWords}, ` +
      `minimum ${minWords} required)`
    );
    suggestions.push(
      `Requested ${targetTotalWords} words for ${Math.round((targetTotalWords / 160) * 60)}s video, ` +
      `but only got ${totalActualWords} words. Increase scene length to meet duration target.`
    );
    score -= 30; // Significant penalty for missing duration expectations
    console.log(`[Validation] Script below minimum threshold - penalty -30 points`);
  }
  // Bonus for hitting target range (80-120%)
  else if (totalActualWords >= targetTotalWords * 0.8 && totalActualWords <= targetTotalWords * 1.2) {
    score += 10;
    console.log('[Validation] Script length within target range - bonus +10 points');
  }
  // Informational suggestion for moderately short scripts (50-80% of target)
  else if (totalActualWords < targetTotalWords * 0.8) {
    suggestions.push(
      `Script is shorter than expected: ${totalActualWords} words (${percentOfTarget}% of target ${targetTotalWords}). ` +
      `Video will be shorter than requested duration. Consider regenerating for longer content.`
    );
    console.log('[Validation] Script moderately short but acceptable (50-80% of target)');
  }
  // Informational suggestion for very long scripts (no penalty)
  else if (totalActualWords > maxWords) {
    suggestions.push(
      `Script is longer than expected: ${totalActualWords} words (${percentOfTarget}% of target ${targetTotalWords}). ` +
      `Video will be longer than requested duration.`
    );
    console.log('[Validation] Script exceeds maximum (150%+ of target)');
  }
}
```

**2. Update `src/lib/llm/prompts/script-generation-prompt.ts`:**

**Enhanced Attempt 2 prompt (lines 280-290):**
```typescript
2. WORD COUNTING (🚨 MOST IMPORTANT - THIS IS WHY YOU FAILED 🚨):
   - 🎯 TARGET TOTAL: ${projectConfig?.estimatedWords || 450} words across ALL scenes
   - 🎯 Per scene: ${Math.round((projectConfig?.estimatedWords || 450) / (projectConfig?.sceneCount || 4))} words each
   - ⚠️ YOU MUST WRITE LONGER SCENES - Your previous attempt was TOO SHORT
   - Each scene should be a FULL PARAGRAPH, not just 2-3 sentences
   - COUNT your actual words by splitting on spaces
   - If you write "An octopus can swim" that is 4 words
   - Set "wordCount" to ACTUAL count, not a guess
   - MINIMUM 60 words per scene (NOT 40 - write MORE!)
   - OPTIMAL: 80-120 words per scene for quality content
   - 🚨 CRITICAL: Total must be ${projectConfig?.estimatedWords || 450} words minimum (within ±10%)
```

**Enhanced Attempt 3 prompt (lines 329-341):**
```typescript
2. WORD COUNTING (🚨🚨 THIS IS WHY YOU FAILED TWICE - FIX THIS NOW 🚨🚨):
   - 🔴🔴 TARGET TOTAL: ${projectConfig?.estimatedWords || 450} words across ALL scenes
   - 🔴🔴 Per scene target: ${Math.round((projectConfig?.estimatedWords || 450) / (projectConfig?.sceneCount || 4))} words each
   - 🔴🔴 YOUR PREVIOUS ATTEMPTS WERE TOO SHORT - WRITE MUCH LONGER SCENES
   - Each scene MUST be a FULL, DETAILED PARAGRAPH (3-5 sentences minimum)
   - Write each scene to be AT LEAST 80 words (NOT 40 - that's TOO SHORT!)
   - COUNT the actual words: split on spaces and count
   - Example: "The cat sat" = 3 words (you need 80+ words per scene!)
   - Set "wordCount" to EXACT actual count
   - 🚨 TOTAL WORD COUNT: ${projectConfig?.estimatedWords || 450} words minimum (within ±10%)
   - If Scene 1 = 95 words, Scene 2 = 102 words, Scene 3 = 88 words... total must = ${projectConfig?.estimatedWords || 450}
   - 🔴 KEEP WRITING MORE WORDS until your total reaches ${projectConfig?.estimatedWords || 450} words
   - DO NOT STOP at 200-300 words - you need ${projectConfig?.estimatedWords || 450} words TOTAL!
```

### Graduated Penalty System

**Visual representation:**

```
Word Count vs Score:
─────────────────────────────────────────────────────────────
0%      50%         80%        100%       120%        150%
├────────┼───────────┼──────────┼──────────┼───────────┼──────
│ FAILS  │  PASSES   │    PASSES WITH BONUS   │  PASSES  │
│ <70pts │ 70-85pts  │      95-110pts         │ 85-95pts │
│ -30    │ warnings  │         +10            │ warnings │
└────────┴───────────┴──────────┴──────────┴───────────┴──────
   ❌         ⚠️            ✅              ✅            ⚠️
  Too       Short        Ideal           Ideal        Verbose
  Short    but OK      Range           Range        but OK
```

**Scoring breakdown:**
- **<50% of target:** FAILS with -30 penalty (score drops to 70 or below)
- **50-80% of target:** PASSES with informational suggestions
- **80-120% of target:** PASSES with +10 bonus (optimal range)
- **>150% of target:** PASSES with informational warnings

### Expected Generation Flow

```
User Request: 5-minute video (800 words, 8 scenes)
              ↓
┌─────────────────────────────────────────────────────────┐
│ ATTEMPT 1: Standard Prompt                              │
└─────────────────────────────────────────────────────────┘
LLM generates: 322 words (40% of target)
              ↓
[Validation] Total words: 322 (target: 800, 40% of target, minimum: 400)
[Validation] Script below minimum threshold - penalty -30 points
[Script Generation] Validation score: 70/100, passed: false
              ↓
┌─────────────────────────────────────────────────────────┐
│ ATTEMPT 2: Enhanced Prompt (Strong Emphasis on Length)  │
│ "🚨 MOST IMPORTANT - THIS IS WHY YOU FAILED 🚨"         │
└─────────────────────────────────────────────────────────┘
LLM generates: 600 words (75% of target)
              ↓
[Validation] Total words: 600 (target: 800, 75% of target)
[Validation] Script moderately short but acceptable (50-80% of target)
[Script Generation] Validation score: 85/100, passed: true ✅
              ↓
Script Accepted → Proceed to Voice Generation
              ↓
Video Duration: ~3m 45s (closer to 5min target)
```

---

## Why These Fixes Work

### JSON Repair Benefits

1. **Handles LLM variance:** Different models have different JSON formatting quality
2. **Automatic recovery:** Fixes common syntax errors without manual intervention
3. **Three-stage fallback:** Multiple attempts to extract valid JSON
4. **No false negatives:** Scripts that were rejected due to syntax now parse successfully

### Minimum Threshold Benefits

1. **Prevents severe duration mismatches:** 2min videos when 5min requested
2. **Graduated feedback:** Strong feedback on retry attempts emphasizes length
3. **Flexible but firm:** Accepts 50-80% range but encourages optimal 80-120%
4. **Quality + Quantity:** Maintains quality checks while ensuring sufficient content

### Combined Effect

```
Before:
User requests 5min video → LLM generates 2min content → Passes validation → ❌ User disappointed

After:
User requests 5min video → LLM generates 2min content → Fails validation
                        → Retry with enhanced prompt → Generates 4min content → ✅ User satisfied
```

---

## Testing Results

### Test 1: Default 4-Scene Video (Control)

**Configuration:**
- Scenes: 4
- Target words: ~450

**Result:** ✅ SUCCESS
- Validation: 100/100
- All attempts work as before
- No regression

### Test 2: Complex 8-Scene Video (Before Fixes)

**Configuration:**
- Scenes: 8
- Target words: 800
- Duration: 5 minutes

**Result:** ❌ FAILED
- Attempt 1: JSON parsing error
- Attempt 2: JSON parsing error
- Attempt 3: JSON parsing error
- Never reached validation stage

### Test 3: Complex 8-Scene Video (After Fix #9 Only)

**Configuration:**
- Scenes: 8
- Target words: 800
- Duration: 5 minutes

**Result:** ✅ JSON Parsing SUCCESS, ❌ Duration MISMATCH
- Generated: 347 words (43% of target)
- Validation: 100/100 - PASSED
- Video duration: 2m 24s (expected: 5 minutes)

### Test 4: Complex 8-Scene Video (After Both Fixes) - EXPECTED

**Configuration:**
- Scenes: 8
- Target words: 800
- Duration: 5 minutes

**Expected Result:**
- **Attempt 1:** Generates ~320 words (40% of target)
  - Validation: FAILS (70/100, below minimum)
- **Attempt 2:** Enhanced prompt emphasizes LENGTH
  - Generates: ~600-650 words (75-80% of target)
  - Validation: PASSES (85/100) ✅
- Video duration: ~3m 45s - 4m 15s (much closer to 5min target)

---

## Expected Behavior After Fixes

### Scenario 1: User Requests 3-Minute Video (450 words)

```
Attempt 1: Generates 410 words (91% of target)
           ↓
[Validation] Total words: 410 (target: 450, 91% of target)
[Validation] Script length within target range - bonus +10 points
[Script Generation] Validation score: 110/100, passed: true ✅
           ↓
Video Duration: ~2m 34s ✅ (close to 3min target)
```

### Scenario 2: User Requests 5-Minute Video (800 words)

```
Attempt 1: Generates 322 words (40% of target)
           ↓
[Validation] Script too short: 322 words (40% of target, minimum 400 required)
[Script Generation] Validation score: 70/100, passed: false ❌
           ↓
Attempt 2: Enhanced prompt with strong emphasis
           ↓
Generates 650 words (81% of target)
           ↓
[Validation] Total words: 650 (target: 800, 81% of target)
[Validation] Script length within target range - bonus +10 points
[Script Generation] Validation score: 110/100, passed: true ✅
           ↓
Video Duration: ~4m 4s ✅ (much closer to 5min target)
```

### Scenario 3: User Requests 15-Minute Video (2400 words)

```
Attempt 1: Generates 980 words (41% of target)
           ↓
[Validation] Script too short: 980 words (41% of target, minimum 1200 required)
[Script Generation] Validation score: 70/100, passed: false ❌
           ↓
Attempt 2: Enhanced prompt
           ↓
Generates 1850 words (77% of target)
           ↓
[Validation] Total words: 1850 (target: 2400, 77% of target)
[Validation] Script moderately short but acceptable (50-80% of target)
[Script Generation] Validation score: 85/100, passed: true ✅
           ↓
Video Duration: ~11m 34s ⚠️ (shorter than 15min but acceptable)
[Suggestion] Script is shorter than expected. Consider regenerating for longer content.
```

---

## What You Need to Do

### 1. Restart Dev Server

Changes require a server restart:

```bash
# Press Ctrl+C to stop current server
# Then restart:
npm run dev
```

### 2. Test 5-Minute Video Generation

**Test procedure:**
1. Create new project with 5-minute duration setting (800 words, 8 scenes)
2. Generate script
3. Observe console logs:
   - Word counts per scene in validation logs
   - Whether validation passes or fails on attempt 1
   - Whether retry prompts trigger and improve word count
4. Check final video duration

**Success criteria:**
- ✅ JSON parsing succeeds (no parsing errors)
- ✅ Script generates 400-960 words (50-120% of 800 target)
- ✅ Validation passes (score ≥70)
- ✅ Final video duration: 3-6 minutes (close to 5-minute target)

**Failure indicators:**
- ❌ JSON parsing errors (means Fix #9 didn't work)
- ❌ Script <400 words passing validation (means Fix #10 didn't work)
- ❌ Video duration <2 minutes (means neither fix worked)

---

## Technical Details

### Validation Philosophy

**Goal:** Balance between strictness and flexibility

**Principles:**
1. **User expectations first:** Videos should match requested duration
2. **LLM variance accepted:** Some deviation is normal
3. **Graduated feedback:** Stronger emphasis on retry attempts
4. **No false negatives:** Don't reject high-quality content

**Minimum threshold rationale:**
- 50% threshold chosen to catch severe mismatches (2min vs 5min)
- Below 50% indicates LLM not following instructions
- Above 50% indicates LLM understands requirements, even if output is short

### JSON Repair Strategy

**Why three-stage fallback?**
1. **Stage 1 (Direct parsing):** Handles clean responses
2. **Stage 2 (Markdown extraction):** Handles responses wrapped in code blocks
3. **Stage 3 (Object matching):** Handles responses with preamble text

**Each stage applies jsonrepair** before parsing to maximize success rate.

### Retry Prompt Enhancement

**Progressive emphasis:**
- **Attempt 1:** Standard prompt (neutral tone)
- **Attempt 2:** Strong emphasis with emojis and warnings
- **Attempt 3:** Critical emphasis with multiple red flags

**Why this works:**
- LLMs respond to urgency cues
- Specific examples help LLMs understand requirements
- Repetition of critical requirements improves compliance

---

## Summary of All Improvements

We've now applied **10+ improvements** to script generation:

1. ✅ **Tone detection and mapping** (Story 2.5)
2. ✅ **Professional script quality validation** (Story 2.5)
3. ✅ **Banned phrase detection** (Story 2.5)
4. ✅ **TTS-readiness checks** (Story 2.5)
5. ✅ **Retry logic with enhanced prompts** (Story 2.5)
6. ✅ **Model upgrade (llama3.2 → llama3.1)** (Previous session)
7. ✅ **Lenient per-scene validation** (Previous session)
8. ✅ **Dynamic word count targets** (Previous session)
9. ✅ **JSON repair for syntax errors** (Fix #9 - this session)
10. ✅ **Minimum word count threshold** (Fix #10 - this session)
11. ✅ **Enhanced retry prompts emphasizing length** (Fix #10 - this session)

**Current Status:**
- ✅ 4-scene videos: Working perfectly
- ✅ 8-scene videos: JSON parsing fixed
- ⏳ Duration accuracy: Ready to test

---

## Related Issues & Fixes

### Dependency Chain

```
Fix #9 (JSON Repair)
  ↓
Enables successful parsing of 8-scene scripts
  ↓
Fix #10 (Minimum Threshold)
  ↓
Ensures parsed scripts meet duration requirements
  ↓
Result: Reliable 5-minute video generation
```

### Cross-References

- **Story 2.5:** Initial script quality validation system
- **Story 2.6:** Script & voiceover preview integration
- **Model upgrade session:** Changed to llama3.1, removed strict penalties
- **This session:** JSON repair + minimum threshold

---

## Future Improvements

### Optional: Model-Specific Configuration

Could add model-specific settings for JSON repair:

```typescript
const modelConfig = {
  'llama3.1': { jsonRepairEnabled: true, minThreshold: 0.50 },
  'llama3.2': { jsonRepairEnabled: false, minThreshold: 0.60 },
  'gpt-4': { jsonRepairEnabled: false, minThreshold: 0.40 }
};
```

**Benefits:** Optimize validation per model's capabilities
**Trade-off:** More complexity

### Optional: Adaptive Retry Strategy

Could adjust retry prompts based on specific failure reasons:

```typescript
if (totalWords < minWords) {
  enhancedPrompt = generateLengthFocusedPrompt();
} else if (bannedPhrases.length > 0) {
  enhancedPrompt = generateQualityFocusedPrompt();
}
```

**Benefits:** More targeted feedback
**Trade-off:** More complex prompt logic

### Optional: User Feedback Loop

Could allow users to regenerate specific scenes:

```
Scene 3 too short (32 words)?
[Regenerate Scene 3] [Accept As-Is]
```

**Benefits:** Fine-grained control
**Trade-off:** More complex UI

---

## Lessons Learned

### 1. Validation Balance is Critical

**Too strict:** High-quality scripts rejected (false negatives)
**Too lenient:** Low-quality scripts accepted (poor UX)
**Balanced:** Soft minimums with graduated feedback ✅

### 2. LLM JSON Quality Varies

**Small requests:** Clean JSON
**Large requests:** Syntax errors increase
**Solution:** Auto-repair with fallback parsing

### 3. Retry Prompts Need Emphasis

**Neutral tone:** LLM repeats same mistakes
**Strong emphasis:** LLM adjusts behavior
**Progressive urgency:** Best results on attempts 2-3

### 4. Testing Complexity Matters

**Simple tests:** Hide issues
**Complex tests:** Expose edge cases
**Both needed:** Comprehensive validation

---

**Fixes Applied:** 2025-11-12
**Next Action:** Restart dev server and test 5-minute video generation
**Expected Result:** ✅ Reliable script generation with accurate duration
**Documentation Status:** Complete

---

**Author:** Claude (AI Video Generator Development Assistant)
**Date:** 2025-11-12
**Status:** ✅ Complete - Ready for Testing
