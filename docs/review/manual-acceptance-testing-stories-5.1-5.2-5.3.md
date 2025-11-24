 # Manual Acceptance Testing Checklist
## Stories 5.1, 5.2, 5.3 - Video Assembly Infrastructure

**Date:** 2025-11-24
**Tester:** ___________________
**Environment:** Development / Staging / Production
**Test Data Project ID:** ___________________

---

## Prerequisites

Before starting manual testing:

- [ ] Stories 5.1, 5.2, and 5.3 implementation complete
- [ ] All automated unit tests passing (>80% coverage)
- [ ] Build passes without errors
- [ ] Test project created with:
  - [ ] At least 3 scenes with voiceover audio
  - [ ] Selected video clips for all scenes
  - [ ] Varying scene durations (e.g., 5s, 7s, 8s)
- [ ] Test environment has FFmpeg 7.x installed

---

## Story 5.1: Video Processing Infrastructure Setup

### AC1: FFmpeg Installation Verification ⚠️ MANUAL

**Test Steps:**
1. Open terminal/command prompt
2. Run: `ffmpeg -version`
3. Verify FFmpeg version 7.x is displayed
4. Run: `where ffmpeg` (Windows) or `which ffmpeg` (Mac/Linux)
5. Verify FFmpeg is in system PATH

**Negative Test:**
1. Temporarily rename FFmpeg binary to simulate missing installation
2. Start application
3. Attempt to create assembly job

**Expected Results:**
- [ ] FFmpeg version 7.x accessible via PATH
- [ ] When FFmpeg missing, error message displays: "FFmpeg not found - install FFmpeg and add to PATH" (or similar actionable guidance)
- [ ] Error message is clear and tells user exactly what to do

**Result:** ✅ PASS / ❌ FAIL
**Notes:** ___________________________________

---

### AC6: Basic FFmpeg Operations (Metadata Accuracy) ⚠️ MANUAL

**Test Steps:**
1. Prepare test video file with known duration (e.g., exactly 10.0 seconds)
2. Prepare test audio file with known duration (e.g., exactly 8.5 seconds)
3. Call `FFmpegClient.getVideoDuration(testVideoPath)`
4. Call `FFmpegClient.getAudioDuration(testAudioPath)`
5. Call `FFmpegClient.probe(testVideoPath)`

**Expected Results:**
- [ ] Video duration returned is accurate (±0.1s tolerance): _____ seconds
- [ ] Audio duration returned is accurate (±0.1s tolerance): _____ seconds
- [ ] Probe returns correct format info (codec, resolution, framerate)
- [ ] Probe metadata matches actual file properties

**Result:** ✅ PASS / ❌ FAIL
**Notes:** ___________________________________

---

## Story 5.2: Scene Video Trimming & Preparation

### AC4: Progress Tracking Display ⚠️ MANUAL

**Test Steps:**
1. Navigate to project page
2. Initiate video assembly (triggers trimming)
3. Watch progress indicator in real-time

**Expected Results:**
- [ ] Progress indicator visible during trimming
- [ ] Message displays "Trimming scene X/Y..." format
- [ ] X updates from 1 → 2 → 3 (for 3 scenes)
- [ ] Y shows total scene count (e.g., 3)
- [ ] Progress bar advances from 20% → 30% during trimming phase
- [ ] Progress updates are smooth (no freezing)

**Result:** ✅ PASS / ❌ FAIL
**Screenshot:** (Attach screenshot of progress indicator)
**Notes:** ___________________________________

---

### AC7: Performance (Real-World Timing) ⚠️ MANUAL

**Test Steps:**
1. Prepare 5 test videos with typical lengths (5-60 seconds each)
2. Initiate trimming operation
3. Measure time for each scene to complete using stopwatch

**Expected Results:**
- [ ] Scene 1 (___s clip) trims in < 30 seconds: _____ seconds actual
- [ ] Scene 2 (___s clip) trims in < 30 seconds: _____ seconds actual
- [ ] Scene 3 (___s clip) trims in < 30 seconds: _____ seconds actual
- [ ] Scene 4 (___s clip) trims in < 30 seconds: _____ seconds actual
- [ ] Scene 5 (___s clip) trims in < 30 seconds: _____ seconds actual
- [ ] Total trimming time reasonable: _____ seconds total

**Result:** ✅ PASS / ❌ FAIL
**Notes:** ___________________________________

---

### AC8: Quality Preservation (Visual Inspection) ⚠️ MANUAL

**Test Steps:**
1. Prepare high-quality source video (1080p or 720p)
2. Trim the video using Story 5.2 functionality
3. Open original video in video player
4. Open trimmed video side-by-side
5. Compare visual quality

**Expected Results:**
- [ ] Trimmed video has no visible quality loss
- [ ] No pixelation or compression artifacts introduced
- [ ] Colors appear identical
- [ ] Sharpness preserved
- [ ] No banding or blocking artifacts
- [ ] Copy codec (`-c copy`) was used (check logs)

**Result:** ✅ PASS / ❌ FAIL
**Notes:** ___________________________________

---

## Story 5.3: Video Concatenation & Audio Overlay

### AC2: Scene Order (Visual Verification) ⚠️ MANUAL

**Test Steps:**
1. Complete video assembly with 3+ scenes
2. Open final video in VLC or browser
3. Watch full video and note scene order

**Scene Content to Verify:**
- Scene 1 content: _________________________________
- Scene 2 content: _________________________________
- Scene 3 content: _________________________________

**Expected Results:**
- [ ] Scene 1 appears first (at 0:00)
- [ ] Scene 2 appears second (after Scene 1 ends)
- [ ] Scene 3 appears third (after Scene 2 ends)
- [ ] No scenes are missing
- [ ] No scenes are duplicated
- [ ] No unexpected scenes appear
- [ ] Visual transition between scenes is clean (no glitches)

**Result:** ✅ PASS / ❌ FAIL
**Notes:** ___________________________________

---

### AC3: Audio Synchronization (Listening Test) ⚠️ MANUAL

**Test Steps:**
1. Complete video assembly with voiceover audio
2. Open final video in VLC or browser
3. Play video with audio enabled
4. Listen to each scene's voiceover

**Scene-by-Scene Verification:**

**Scene 1:**
- [ ] Voiceover starts when Scene 1 visuals appear (no delay)
- [ ] Voiceover ends when Scene 1 visuals end
- [ ] Audio is clear and audible
- [ ] No audio glitches or pops

**Scene 2:**
- [ ] Voiceover starts when Scene 2 visuals appear (no delay)
- [ ] Voiceover ends when Scene 2 visuals end
- [ ] Audio is clear and audible
- [ ] No audio glitches or pops

**Scene 3:**
- [ ] Voiceover starts when Scene 3 visuals appear (no delay)
- [ ] Voiceover ends when Scene 3 visuals end
- [ ] Audio is clear and audible
- [ ] No audio glitches or pops

**Overall:**
- [ ] No audio gaps between scenes
- [ ] No audio overlap between scenes
- [ ] Volume is consistent across all scenes
- [ ] Audio quality is clear (no distortion, muffling, or echo)

**Result:** ✅ PASS / ❌ FAIL
**Notes:** ___________________________________

---

### AC4: Audio Sync Accuracy (Precise Timing) ⚠️ MANUAL

**Test Steps:**
1. Use video with known audio cues (e.g., voiceover says "five seconds" at 5.0s mark)
2. Open final video in video editor or player with frame-accurate seeking
3. Measure timing of audio cues against expected times

**Timing Measurements:**

| Audio Cue | Expected Time | Actual Time | Drift |
|-----------|---------------|-------------|-------|
| Scene 1 start | 0.00s | _____s | _____s |
| Scene 1 key word | ___s | _____s | _____s |
| Scene 2 start | ___s | _____s | _____s |
| Scene 2 key word | ___s | _____s | _____s |
| Scene 3 start | ___s | _____s | _____s |
| Scene 3 key word | ___s | _____s | _____s |

**Expected Results:**
- [ ] All drift measurements are < 0.1s (100ms)
- [ ] No cumulative drift (Scene 3 is not more off-sync than Scene 1)
- [ ] Sync accuracy consistent throughout video

**Result:** ✅ PASS / ❌ FAIL
**Notes:** ___________________________________

---

### AC9: Playability (Multi-Platform Test) ⚠️ MANUAL

**Test Steps:**
1. Download/locate final video file (`public/videos/{projectId}/final.mp4`)
2. Test playback on multiple platforms

**Platform Testing:**

**VLC Media Player:**
- [ ] Video opens without errors
- [ ] Video plays smoothly (no stuttering)
- [ ] Audio plays correctly
- [ ] Can seek forward/backward
- [ ] Can pause/resume
- [ ] Duration displays correctly: _____ seconds

**Chrome Browser:**
- [ ] Video opens in HTML5 player
- [ ] Video plays smoothly
- [ ] Audio plays correctly
- [ ] Controls work (play, pause, seek, volume)
- [ ] Duration displays correctly: _____ seconds

**Firefox Browser:**
- [ ] Video opens in HTML5 player
- [ ] Video plays smoothly
- [ ] Audio plays correctly
- [ ] Controls work
- [ ] Duration displays correctly: _____ seconds

**Safari Browser (Mac only):**
- [ ] Video opens in HTML5 player
- [ ] Video plays smoothly
- [ ] Audio plays correctly
- [ ] Controls work
- [ ] Duration displays correctly: _____ seconds

**Windows Media Player (Windows only):**
- [ ] Video opens without errors
- [ ] Video plays smoothly
- [ ] Audio plays correctly

**Expected Results:**
- [ ] Video plays correctly on ALL tested platforms
- [ ] No error messages on any platform
- [ ] No codec warnings or missing codec errors

**Result:** ✅ PASS / ❌ FAIL
**Notes:** ___________________________________

---

### AC10: File Size Validation ⚠️ MANUAL

**Test Steps:**
1. Locate final video file
2. Check file properties to get file size
3. Calculate MB per minute ratio

**Measurements:**
- Video duration: _____ seconds (_____ minutes)
- File size: _____ bytes (_____ MB)
- Ratio: _____ MB/minute

**Expected Results:**
- [ ] File size is approximately 5-10 MB per minute
- [ ] File size is reasonable for 720p quality
- [ ] Not excessively large (>15 MB/min suggests poor compression)
- [ ] Not excessively small (<3 MB/min suggests over-compression)

**Result:** ✅ PASS / ❌ FAIL
**Notes:** ___________________________________

---

## Audio Volume Normalization Test (Story 5.3 Critical) ⚠️ MANUAL

**Background:** Story 5.3 uses `amix` filter with `normalize=0` to prevent volume reduction.

**Test Steps:**
1. Prepare test project with 3 scenes
2. Measure audio volume of individual scene audio files (before assembly)
3. Complete video assembly
4. Measure audio volume of final video

**Volume Measurements:**

| Audio Source | Peak Volume (dB) | Average Volume (dB) |
|--------------|------------------|---------------------|
| Scene 1 audio (original) | _____dB | _____dB |
| Scene 2 audio (original) | _____dB | _____dB |
| Scene 3 audio (original) | _____dB | _____dB |
| Final video (Scene 1 section) | _____dB | _____dB |
| Final video (Scene 2 section) | _____dB | _____dB |
| Final video (Scene 3 section) | _____dB | _____dB |

**Expected Results:**
- [ ] Final video volume is **similar to** original audio volume (±3dB)
- [ ] Volume is **NOT** reduced by 1/3 (which would happen without normalize=0)
- [ ] Audio is clearly audible
- [ ] No distortion or clipping

**Result:** ✅ PASS / ❌ FAIL
**Notes:** ___________________________________

---

## Windows Path Handling Test (Story 5.3) ⚠️ MANUAL (Windows Only)

**Test Steps (Windows Environment):**
1. Create test project with video files in path containing:
   - Backslashes: `D:\Videos\Test\scene.mp4`
   - Spaces: `D:\My Videos\Test Scene.mp4`
   - Special characters: `D:\Test's_Video\scene.mp4`
2. Complete video assembly
3. Check logs for concat file content

**Expected Results:**
- [ ] Assembly completes successfully
- [ ] Concat file uses forward slashes: `D:/Videos/Test/scene.mp4`
- [ ] Special characters escaped correctly
- [ ] No "file not found" errors
- [ ] Final video created successfully

**Result:** ✅ PASS / ❌ FAIL (N/A if not Windows)
**Notes:** ___________________________________

---

## Large Scene Count Warning Test (Story 5.3) ⚠️ MANUAL

**Test Steps:**
1. Create test project with >10 scenes (e.g., 12 scenes)
2. Complete video assembly
3. Check logs and UI for performance warning

**Expected Results:**
- [ ] Warning logged about large scene count
- [ ] Warning message is helpful (not alarming)
- [ ] Assembly still completes successfully
- [ ] Performance is acceptable (may be slower but not hanging)
- [ ] Audio mixing completes correctly

**Result:** ✅ PASS / ❌ FAIL
**Notes:** ___________________________________

---

## Integration Test: Full Pipeline ⚠️ MANUAL

**Test Steps:**
1. Create new project from scratch
2. Generate script with 3 scenes
3. Generate voiceover audio
4. Source and select video clips
5. Trigger video assembly
6. Download final video

**End-to-End Verification:**
- [ ] All steps complete without manual intervention
- [ ] Progress tracking displays throughout (0% → 100%)
- [ ] Final video file created in correct location
- [ ] Video duration matches expected total
- [ ] Video playable in browser
- [ ] Audio synchronized with visuals
- [ ] Quality is acceptable
- [ ] File size is reasonable

**Pipeline Timing:**
- Job creation: _____ seconds
- Trimming (5.2): _____ seconds
- Concatenation (5.3): _____ seconds
- Audio overlay (5.3): _____ seconds
- Total time: _____ seconds

**Expected Results:**
- [ ] Total assembly time < 2 minutes for 3-minute video
- [ ] No errors or warnings (except acceptable warnings)
- [ ] User experience is smooth

**Result:** ✅ PASS / ❌ FAIL
**Notes:** ___________________________________

---

## Error Handling & Edge Cases ⚠️ MANUAL

### Test 1: Missing Input File

**Steps:**
1. Delete a selected clip file before assembly
2. Trigger assembly

**Expected:**
- [ ] Clear error message with file path
- [ ] Job marked as 'error'
- [ ] Error is actionable

**Result:** ✅ PASS / ❌ FAIL

---

### Test 2: Insufficient Disk Space

**Steps:**
1. Fill disk to near capacity (simulate)
2. Trigger assembly

**Expected:**
- [ ] Disk space error detected
- [ ] Clear error message
- [ ] No corrupt partial files left

**Result:** ✅ PASS / ❌ FAIL

---

### Test 3: Corrupt Video File

**Steps:**
1. Replace clip with corrupt/invalid file
2. Trigger assembly

**Expected:**
- [ ] FFmpeg error handled gracefully
- [ ] Clear error message
- [ ] Job marked as 'error'

**Result:** ✅ PASS / ❌ FAIL

---

## Summary

### Test Results

| Story | Total Checks | Passed | Failed | Notes |
|-------|--------------|--------|--------|-------|
| 5.1 | _____ | _____ | _____ | _____________ |
| 5.2 | _____ | _____ | _____ | _____________ |
| 5.3 | _____ | _____ | _____ | _____________ |
| **Total** | _____ | _____ | _____ | |

### Overall Assessment

- [ ] ✅ **ALL TESTS PASSED** - Stories ready for production
- [ ] ⚠️ **MINOR ISSUES** - Issues documented, acceptable for release
- [ ] ❌ **CRITICAL FAILURES** - Stories NOT ready for release

### Critical Issues Found

1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

### Recommendations

_____________________________________________
_____________________________________________
_____________________________________________

---

**Tester Signature:** ___________________
**Date Completed:** ___________________
**Approved By:** ___________________
**Date Approved:** ___________________
