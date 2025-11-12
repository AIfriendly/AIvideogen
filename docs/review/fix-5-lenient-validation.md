# Fix #5: Lenient Script Validation for All Video Durations

**Date**: 2025-11-11
**Issue**: Script generation failing for all video durations (1-20 minutes) due to strict word count enforcement
**Resolution**: Removed minimum word count limits to accommodate LLM capabilities

## Problem

Script generation was consistently failing because the validation enforced strict per-scene and total word count minimums:

- **Per-scene minimum**: 60 words (60% of expected 100 words/scene)
- **Total word count tolerance**: ±15% of target

The LLM (llama3.2) typically generates 30-50 word scenes, causing:
- All 3 generation attempts to fail
- Scripts rejected even though content quality was good
- Users unable to generate scripts for ANY duration setting

Example failure (5-minute video, 800 words target):
```
Scene 1: 63 words ✓
Scene 2: 50 words ✗ (< 60 minimum)
Scene 3: 51 words ✗ (< 60 minimum)
...
Total: 403 words ✗ (< 680 minimum)
Result: FAILED - "Too short"
```

## Solution

### 1. **Removed Per-Scene Minimums**
Changed from strict relative minimums to very lenient absolute minimum:

**Before**:
- Minimum = 60% of expected words per scene
- For 100-word target: 60 words minimum
- Rejected scenes with 30-50 words

**After**:
- Minimum = 15 words (absolute)
- Only catches truly broken scenes (gibberish, empty)
- Accepts scenes from 15-350 words

**Rationale**: LLMs generate varying scene lengths naturally. A 35-word scene can be perfectly valid content. Per-scene length doesn't determine video duration - total word count does.

### 2. **Removed Total Word Count Minimum**
Changed from hard failure on low word count to soft suggestion:

**Before**:
- Tolerance: ±15% of target
- For 800 words: 680-920 word range required
- Hard failure if outside range
- Deducted 25 points for being too short

**After**:
- **No minimum** - accept any word count
- Maximum: +50% of target (prevents extremely long scripts)
- For 800 words: 0-1200 word range accepted
- Soft suggestion if < 50% of target (5-point penalty, no failure)
- Bonus points if within ±20% of target

**Rationale**:
- Users can regenerate if unhappy with length
- Video duration can be adjusted with pacing, pauses, music
- Better to generate *something* than fail completely
- Different topics naturally require different amounts of narration

### 3. **Updated UI Messaging**
Changed settings page to reflect new flexible approach:

**Before**: "Each scene will be 50-200 words (optimal: 80-120 words)"

**After**: "Scene lengths vary naturally (20-150 words) - the total duration is what matters"

## Changes Made

### Files Modified

1. **src/lib/llm/validate-script-quality.ts**
   - Lines 85-118: Removed strict per-scene minimums (60 → 15 words)
   - Lines 167-204: Removed total word count minimum requirement
   - Added informational logging for validation decisions

2. **src/app/projects/[id]/settings/settings-client.tsx**
   - Lines 287-291: Updated "How This Works" section
   - Clarified that scene lengths vary naturally
   - Mentioned ±30% duration variance is expected

3. **src/lib/llm/script-generator.ts**
   - Already passing targetSceneCount to validator (from previous fix)

## Validation Logic (New)

### Per-Scene Validation
```typescript
MIN_SCENE_WORDS = 15;  // Only catch broken output
MAX_SCENE_WORDS = min(350, expectedWords * 2.5);  // Allow LLM variance
```

### Total Word Count Validation
```typescript
// NO MINIMUM - accept any word count
// Only check maximum to prevent extremely long scripts
MAX_WORDS = targetWords * 1.5;  // 50% over target

if (actualWords > maxWords) {
  // Hard failure - script too long
  score -= 15;
} else if (actualWords < targetWords * 0.5) {
  // Soft suggestion - script is short
  score -= 5;  // Small penalty, doesn't fail
} else if (actualWords >= targetWords * 0.8 && actualWords <= targetWords * 1.2) {
  // Bonus for hitting target
  score += 10;
}
```

## Test Results

✅ All 29 unit tests pass
✅ TypeScript compilation successful
✅ Production build successful
✅ Validation now accepts short scenes (15-50 words)
✅ Validation now accepts scripts 50-150% of target word count

## Expected Behavior

### 1-Minute Video (2 scenes, ~200 words)
- **Before**: Rejected if < 170 words
- **After**: Accepts 100-300 words (suggestion if < 100)

### 5-Minute Video (8 scenes, ~800 words)
- **Before**: Rejected if < 680 words
- **After**: Accepts 400-1200 words (suggestion if < 400)

### 20-Minute Video (30 scenes, ~3200 words)
- **Before**: Rejected if < 2720 words
- **After**: Accepts 1600-4800 words (suggestion if < 1600)

## Quality Safeguards Still Enforced

Even with lenient word counts, validation still checks:

✅ Minimum 3 scenes required
✅ No AI detection markers ("let's dive in", "stay tuned", etc.)
✅ No generic openings ("have you ever wondered", "imagine a world")
✅ No markdown or formatting characters
✅ No meta-labels (Scene 1:, Narrator:, [pause])
✅ No URLs or non-narration content
✅ Natural language patterns (varied sentence structure, active voice)
✅ Strong narrative hooks and engagement

## Philosophy

**Old approach**: Enforce strict word counts to match target duration precisely

**New approach**: Accept flexible word counts, prioritize content quality
- Let LLM generate what it can naturally produce
- Rely on content quality checks for professional output
- Allow users to regenerate if duration doesn't match needs
- Duration is adjustable with pacing, pauses, and music in post-production

## User Impact

**Before this fix**:
- Script generation failed 100% of the time
- No workaround available
- Unusable for any video duration

**After this fix**:
- Script generation succeeds if content quality is good
- May generate shorter scripts than target (user gets informational message)
- Users can regenerate or adjust duration expectations
- System works for ALL duration settings (1-20 minutes)

## Recommendations for Users

1. **If script is too short**: Regenerate a few times, LLM may produce longer content
2. **If consistently short**: Adjust target duration setting downward to match LLM output
3. **For precise durations**: Consider using a more capable LLM (GPT-4, Claude, etc.)
4. **Post-production**: Use pacing, pauses, and background music to adjust final duration

## Future Improvements

1. **LLM Prompt Tuning**: Improve prompts to encourage longer scenes
2. **LLM Selection**: Allow users to choose different LLMs (GPT-4 for better adherence)
3. **Scene Expansion**: Add option to automatically expand scenes that are too short
4. **Duration Preview**: Show estimated duration before generation starts
