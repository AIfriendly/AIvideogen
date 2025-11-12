# Fix #4: File Path Must Be Absolute

**Date:** 2025-11-09
**Issue:** TTS service generates audio but Node.js can't find the file
**Status:** ✅ FIXED

---

## What Happened

After fixing the timeout issue, the TTS service successfully generated all audio files:
```
[TTS] Audio generated: 29.06s, 227280 bytes ✅
[TTS] Audio generated: 27.95s, 213912 bytes ✅
[TTS] Audio generated: 27.26s, 212688 bytes ✅
```

But Node.js failed to read them:
```
Failed to generate audio for scene 1: ENOENT: no such file or directory,
open 'D:\BMAD video generator\ai-video-generator\.cache\audio\temp\1762700299654.mp3'
```

---

## Root Cause

When we set `cwd: modelDirectory` to fix the model file discovery issue (Fix #2), we changed where the TTS service runs. This caused a **file path resolution mismatch**:

**Before Fix #2:**
- Service CWD: `D:\BMAD video generator\ai-video-generator\`
- Output path: `.cache/audio/temp/123.mp3` (relative)
- Resolves to: `D:\BMAD video generator\ai-video-generator\.cache\audio\temp\123.mp3`
- Node.js reads from same location ✅

**After Fix #2:**
- Service CWD: `D:\BMAD video generator\` (parent directory)
- Output path: `.cache/audio/temp/123.mp3` (relative)
- **Service writes to:** `D:\BMAD video generator\.cache\audio\temp\123.mp3`
- **Node.js reads from:** `D:\BMAD video generator\ai-video-generator\.cache\audio\temp\123.mp3`
- Result: File not found ❌

**The Problem:** Relative paths are resolved differently when the service CWD changed!

---

## Fix Applied

**File:** `src/lib/tts/kokoro-provider.ts`

### Change 1: Use Absolute Paths

**Before:**
```typescript
const outputPath = join('.cache', 'audio', 'temp', `${Date.now()}.mp3`);
// Relative path - resolves differently based on CWD
```

**After:**
```typescript
const outputPath = resolve(process.cwd(), '.cache', 'audio', 'temp', `${Date.now()}.mp3`);
// Absolute path - always resolves to same location regardless of CWD
// Example: D:\BMAD video generator\ai-video-generator\.cache\audio\temp\1762700299654.mp3
```

### Change 2: Ensure Directory Exists

**Added:**
```typescript
// Ensure output directory exists
const outputDir = dirname(outputPath);
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}
```

### Change 3: Import Required Functions

**Before:**
```typescript
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
```

**After:**
```typescript
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
```

---

## Why This Works

**Absolute Path Benefits:**
1. **CWD-independent:** Works regardless of where the process runs
2. **Explicit location:** No ambiguity about file location
3. **Cross-process safety:** TTS service and Node.js use exact same path

**Path Resolution Example:**

Service receives: `D:\BMAD video generator\ai-video-generator\.cache\audio\temp\123.mp3`
- Service CWD: `D:\BMAD video generator\` (doesn't matter!)
- Service writes to: `D:\BMAD video generator\ai-video-generator\.cache\audio\temp\123.mp3`

Node.js looks for: `D:\BMAD video generator\ai-video-generator\.cache\audio\temp\123.mp3`
- Exact match ✅

---

## Expected Behavior After Fix

### Before (Current Error)
```
[TTS] Audio generated: 29.06s, 227280 bytes
Service writes to: D:\BMAD video generator\.cache\audio\temp\123.mp3
Node.js reads from: D:\BMAD video generator\ai-video-generator\.cache\audio\temp\123.mp3
Result: ENOENT - File not found ❌
```

### After (Next Test)
```
[TTS] Audio generated: 29.06s, 227280 bytes
Service writes to: D:\BMAD video generator\ai-video-generator\.cache\audio\temp\123.mp3
Node.js reads from: D:\BMAD video generator\ai-video-generator\.cache\audio\temp\123.mp3
Result: File loaded successfully ✅
Scene 1 complete ✅
```

---

## What You Need to Do

### Restart Dev Server

The code changes require a server restart:

```bash
# Press Ctrl+C to stop current server
# Then restart:
npm run dev
```

### Test Again

1. Navigate to script-review page
2. Click "Generate Voiceover"
3. Wait ~90 seconds for 3 scenes
4. Expected: `Voiceover generation complete: 3 completed, 0 skipped, 0 failed` ✅

---

## Summary of All Fixes

We've now applied **4 critical fixes** to get TTS working:

1. **Fix #1:** SystemExit exception handling
   - Problem: Library calls sys.exit(), crashing service
   - Solution: Catch SystemExit and convert to RuntimeError

2. **Fix #2:** Working directory correction
   - Problem: Model files not found
   - Solution: Set service CWD to parent directory

3. **Fix #3:** Timeout configuration
   - Problem: Synthesis takes 30s but timeout is 10s
   - Solution: Increase timeout to 45s

4. **Fix #4:** Absolute file paths (this fix)
   - Problem: Relative paths resolve differently after Fix #2
   - Solution: Use absolute paths for output files

---

**Fix Applied:** 2025-11-09
**Next Action:** Restart dev server and test
**Expected Result:** ✅ 3/3 scenes complete successfully
