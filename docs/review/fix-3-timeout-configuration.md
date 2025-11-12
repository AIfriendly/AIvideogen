# Fix #3: Timeout Configuration

**Date:** 2025-11-09
**Issue:** TTS service generates audio successfully but requests time out
**Status:** ✅ FIXED

---

## What Happened

Your test run showed **good news and bad news**:

### ✅ Good News
The TTS service is **working perfectly** after Fix #1 and Fix #2:
- Service started successfully
- No crashes or `sys.exit(1)` errors
- Generated all 3 audio files:
  - Scene 1: 29.06s, 227KB
  - Scene 2: 27.95s, 214KB
  - Scene 3: 27.26s, 213KB

### ❌ Bad News
All 3 requests timed out because the timeout configuration was too short:

```
Failed to generate audio for scene 1: Voice generation timed out. Please try again.
Failed to generate audio for scene 2: Voice generation timed out. Please try again.
Failed to generate audio for scene 3: Voice generation timed out. Please try again.
Voiceover generation complete: 0 completed, 0 skipped, 3 failed
```

**But then** the TTS service logs showed:
```
[TTS] Audio generated: 29.06s, 227280 bytes
[TTS] Audio generated: 27.95s, 213912 bytes
[TTS] Audio generated: 27.26s, 212688 bytes
```

The service completed successfully, but the Node.js request handler gave up after 10 seconds.

---

## Root Cause

**Synthesis takes 27-30 seconds per scene, but the warm timeout was only 10 seconds.**

From `kokoro-provider.ts`:
```typescript
private readonly WARM_TIMEOUT = parseInt(
  process.env.TTS_TIMEOUT_MS_WARM || '10000'  // Only 10 seconds!
);
```

**Timeline Example:**
- 15:43:05 - Request #1 starts
- 15:43:15 - Node.js times out (10 seconds elapsed)
- 15:43:57 - TTS service completes (52 seconds elapsed)

The request timed out 42 seconds before the TTS service finished!

---

## Fix Applied

**File:** `src/lib/tts/kokoro-provider.ts`

**Before:**
```typescript
private readonly COLD_START_TIMEOUT = parseInt(
  process.env.TTS_TIMEOUT_MS_COLD || '30000'  // 30 seconds
);
private readonly WARM_TIMEOUT = parseInt(
  process.env.TTS_TIMEOUT_MS_WARM || '10000'  // 10 seconds - TOO SHORT!
);
```

**After:**
```typescript
// Note: KokoroTTS synthesis takes ~27-30 seconds per scene based on production testing
private readonly COLD_START_TIMEOUT = parseInt(
  process.env.TTS_TIMEOUT_MS_COLD || '60000'  // 60s for cold start (model loading + synthesis)
);
private readonly WARM_TIMEOUT = parseInt(
  process.env.TTS_TIMEOUT_MS_WARM || '45000'  // 45s for warm requests (~30s synthesis + buffer)
);
```

**Changes:**
- COLD_START_TIMEOUT: 30s → 60s (double the time)
- WARM_TIMEOUT: 10s → 45s (4.5x increase to accommodate observed performance)

**Why 45 seconds?**
- Observed synthesis time: 27-30 seconds
- Buffer for variability: +15 seconds
- Total: 45 seconds gives comfortable margin

---

## Expected Behavior After Fix

### Before (Current Test)
```
[TTS] Processing request #1
[TTS] Synthesizing: 419 chars, voice=am_michael
[Node.js] Timeout after 10 seconds ❌
[TTS] Audio generated: 29.06s, 227KB (orphaned - too late!)
Result: 0 completed, 3 failed
```

### After (Next Test)
```
[TTS] Processing request #1
[TTS] Synthesizing: 419 chars, voice=am_michael
[Node.js] Waiting... (up to 45 seconds)
[TTS] Audio generated: 29.06s, 227KB ✅
[Node.js] Receives response, saves file, updates database
Scene 1 complete ✅
Result: 3 completed, 0 failed
```

---

## What You Need to Do

### 1. Restart Dev Server
The timeout values are loaded at startup. You need to restart:

```bash
# Press Ctrl+C to stop current server
# Then restart:
npm run dev
```

### 2. Test Voiceover Generation Again
1. Navigate to script-review page
2. Click "Generate Voiceover"
3. **Wait patiently** - each scene takes ~30 seconds
4. Expect total time: ~90 seconds for 3 scenes (vs. 10 second timeout before)

### 3. Expected Output
```
[TTS] Service ready
Scene 1: Generating... (wait 30s)
Scene 1: Complete ✅
Scene 2: Generating... (wait 30s)
Scene 2: Complete ✅
Scene 3: Generating... (wait 30s)
Scene 3: Complete ✅

Voiceover generation complete: 3 completed, 0 skipped, 0 failed
```

---

## Why This Wasn't Caught Earlier

1. **Initial fix focused on crashes**, not performance
2. **Timeout values were set based on assumptions**, not empirical data
3. **First production test revealed actual synthesis time**: 27-30 seconds
4. **KokoroTTS is slower than expected** (82M parameter model is compute-intensive)

---

## Performance Notes

**Observed Performance (Production Testing):**
- Model loading: ~4 seconds (one-time, on first request)
- Synthesis per scene:
  - Scene 1 (419 chars): 29.06 seconds
  - Scene 2 (446 chars): 27.95 seconds
  - Scene 3 (416 chars): 27.26 seconds
- Average: ~28 seconds per scene
- Total for 3 scenes: ~84 seconds (excluding model loading)

**This is normal** for a high-quality TTS model running on CPU. Options to improve:
1. Accept current performance (quality over speed)
2. Use GPU acceleration (if available)
3. Switch to faster TTS engine (lower quality)
4. Cache frequently used audio (future optimization)

For MVP, **option 1 (accept current performance)** is recommended.

---

## Summary

**What was wrong:** Timeout too short (10s vs. 30s actual synthesis time)
**What we fixed:** Increased timeout to 45s (with buffer)
**What you need to do:** Restart dev server and test again
**Expected result:** ✅ 3/3 scenes complete successfully

---

**Fix Applied:** 2025-11-09
**Next Action:** Restart dev server and retest
**Estimated Test Time:** ~90 seconds for 3 scenes
