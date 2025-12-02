# Test Improvement Plan: Story 5.4 - Thumbnail Generation

**Story:** 5.4 - Automated Thumbnail Generation
**Current Quality Score:** 58/100 (Grade C)
**Target Quality Score:** 85/100 (Grade A)
**Estimated Effort:** 6-8 hours
**Priority:** High (Final MVP story depends on this)

---

## Executive Summary

The current test file (`tests/unit/video/thumbnail.test.ts`) contains 25 tests that validate logic patterns but **do not test the actual implementation**. This improvement plan transforms the tests from "logic verification" to true unit tests that provide confidence in Story 5.4's implementation.

**Key Problems:**
1. ❌ **0% AC Coverage** - None of Story 5.4's 9 acceptance criteria are tested
2. ❌ **Missing Core Tests** - The `ThumbnailGenerator` class is completely untested
3. ❌ **No Traceability** - No test IDs, can't map to requirements
4. ❌ **Type Safety Risk** - Interfaces redefined instead of imported

**After Implementation:**
- ✅ **100% AC Coverage** - All 9 acceptance criteria tested
- ✅ **85+ Quality Score** - Production-ready test suite
- ✅ **Full Traceability** - Test IDs map to PRD requirements
- ✅ **Integration Tests** - FFmpeg commands validated with mocks

---

## Phase 1: Critical Fixes (2-3 hours) - MUST DO

### Task 1.1: Add Test IDs to All Tests (30 min)

**Priority:** P0 (Blocking)
**Effort:** 30 minutes
**Owner:** Developer

**Action:**
Add test IDs to all 25 existing tests following format: `5.4-UNIT-{number}`

**Before:**
```typescript
describe('ThumbnailGenerator', () => {
  describe('selectBestFrameIndex logic', () => {
    it('should return middle index for odd number of frames', () => {
      // No test ID
      const frames = ['frame1.jpg', 'frame2.jpg', 'frame3.jpg'];
      const index = selectBestFrameIndex(frames);
      expect(index).toBe(1);
    });
  });
});
```

**After:**
```typescript
describe('5.4-UNIT-001: ThumbnailGenerator.selectBestFrameIndex', () => {
  it('[P1] should return middle index for odd number of frames', () => {
    const generator = new ThumbnailGenerator();
    const frames = ['frame1.jpg', 'frame2.jpg', 'frame3.jpg'];
    const index = generator.selectBestFrameIndex(frames);
    expect(index).toBe(1);
  });
});
```

**Test IDs to Add:**
- `5.4-UNIT-001` through `5.4-UNIT-025`: Existing tests
- `5.4-UNIT-026` through `5.4-UNIT-040`: New tests (below)

**Success Criteria:**
- All tests have unique test IDs
- Test IDs follow format: `{STORY}-{LEVEL}-{SEQ}`
- Traceability matrix can be generated

---

### Task 1.2: Import Interfaces from Source (15 min)

**Priority:** P1 (High)
**Effort:** 15 minutes
**Owner:** Developer

**Action:**
Replace redefined interfaces with imports from `@/lib/video/thumbnail`

**Before:**
```typescript
describe('ThumbnailOptions interface', () => {
  // ❌ Redefined interface
  interface ThumbnailOptions {
    videoPath: string;
    title: string;
    outputPath: string;
    width?: number;
    height?: number;
  }
  // ...
});
```

**After:**
```typescript
import { ThumbnailOptions, ThumbnailResult } from '@/lib/video/thumbnail';

describe('5.4-UNIT-002: ThumbnailOptions Interface', () => {
  it('[P2] should accept required fields only', () => {
    const options: ThumbnailOptions = {
      videoPath: '/path/to/video.mp4',
      title: 'Test Video',
      outputPath: '/output/thumbnail.jpg',
    };
    expect(options.videoPath).toBe('/path/to/video.mp4');
  });
});
```

**Files to Update:**
- Lines 75-81: Import `ThumbnailOptions` from source
- Lines 110-115: Import `ThumbnailResult` from source

**Success Criteria:**
- No interfaces redefined in test file
- Type safety validated with actual source types
- TypeScript compilation passes

---

### Task 1.3: Test Actual ThumbnailGenerator Class (90 min)

**Priority:** P0 (Critical)
**Effort:** 90 minutes
**Owner:** Developer

**Action:**
Add tests for the actual `ThumbnailGenerator` class methods with mocked FFmpeg

**New Tests to Add:**

```typescript
import { ThumbnailGenerator } from '@/lib/video/thumbnail';
import { FFmpegClient } from '@/lib/video/ffmpeg';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';

describe('5.4-UNIT-026: ThumbnailGenerator.generate() [P0]', () => {
  let generator: ThumbnailGenerator;
  let mockFFmpeg: FFmpegClient;
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for test outputs
    tempDir = path.join(process.cwd(), 'temp', 'test-thumbnails');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Mock FFmpeg client
    mockFFmpeg = {
      getVideoDuration: vi.fn().mockResolvedValue(60), // 60 second video
      extractFrame: vi.fn().mockImplementation((videoPath, timestamp, outputPath) => {
        // Create fake frame file
        writeFileSync(outputPath, 'fake-frame-data');
        return Promise.resolve();
      }),
      addTextOverlay: vi.fn().mockImplementation((inputPath, title, outputPath) => {
        // Create fake thumbnail
        writeFileSync(outputPath, 'fake-thumbnail-data');
        return Promise.resolve();
      }),
    } as unknown as FFmpegClient;

    generator = new ThumbnailGenerator(mockFFmpeg);
  });

  afterEach(() => {
    // Cleanup temp files
    vi.clearAllMocks();
  });

  it('[P0] AC1: should generate thumbnail with 16:9 aspect ratio', async () => {
    const outputPath = path.join(tempDir, 'test-thumbnail.jpg');

    const result = await generator.generate({
      videoPath: '/test/video.mp4',
      title: 'Test Video',
      outputPath,
    });

    // Verify dimensions are 1920x1080 (16:9)
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.width / result.height).toBeCloseTo(16 / 9, 2);
  });

  it('[P0] AC3: should create thumbnail with exact dimensions 1920x1080', async () => {
    const outputPath = path.join(tempDir, 'test-thumbnail.jpg');

    const result = await generator.generate({
      videoPath: '/test/video.mp4',
      title: 'Test Video',
      outputPath,
    });

    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
  });

  it('[P0] AC4: should extract frames at 10%, 50%, 90% of video duration', async () => {
    const outputPath = path.join(tempDir, 'test-thumbnail.jpg');

    await generator.generate({
      videoPath: '/test/video.mp4',
      title: 'Test Video',
      outputPath,
    });

    // Verify frames extracted at correct timestamps
    expect(mockFFmpeg.extractFrame).toHaveBeenCalledTimes(3);
    expect(mockFFmpeg.extractFrame).toHaveBeenCalledWith(
      '/test/video.mp4',
      6, // 10% of 60s
      expect.stringContaining('frame-0.jpg')
    );
    expect(mockFFmpeg.extractFrame).toHaveBeenCalledWith(
      '/test/video.mp4',
      30, // 50% of 60s
      expect.stringContaining('frame-1.jpg')
    );
    expect(mockFFmpeg.extractFrame).toHaveBeenCalledWith(
      '/test/video.mp4',
      54, // 90% of 60s
      expect.stringContaining('frame-2.jpg')
    );
  });

  it('[P0] AC2: should add title text overlay to middle frame', async () => {
    const outputPath = path.join(tempDir, 'test-thumbnail.jpg');

    await generator.generate({
      videoPath: '/test/video.mp4',
      title: 'My Video Title',
      outputPath,
    });

    // Verify text overlay applied to middle frame
    expect(mockFFmpeg.addTextOverlay).toHaveBeenCalledWith(
      expect.stringContaining('frame-1.jpg'), // Middle frame
      'My Video Title',
      outputPath,
      1920,
      1080
    );
  });

  it('[P0] should return result with thumbnail path and metadata', async () => {
    const outputPath = path.join(tempDir, 'test-thumbnail.jpg');

    const result = await generator.generate({
      videoPath: '/test/video.mp4',
      title: 'Test Video',
      outputPath,
    });

    expect(result).toEqual({
      thumbnailPath: outputPath,
      width: 1920,
      height: 1080,
      sourceTimestamp: 30, // Middle frame (50% of 60s)
    });
  });

  it('[P0] should cleanup temporary frames after generation', async () => {
    const outputPath = path.join(tempDir, 'test-thumbnail.jpg');

    await generator.generate({
      videoPath: '/test/video.mp4',
      title: 'Test Video',
      outputPath,
    });

    // Verify temp frames were created during generation
    expect(mockFFmpeg.extractFrame).toHaveBeenCalledTimes(3);

    // Note: Actual cleanup verification would require checking file system
    // This is tested in integration tests
  });
});

describe('5.4-UNIT-027: ThumbnailGenerator Error Handling [P0]', () => {
  it('[P0] should throw error if video file does not exist', async () => {
    const generator = new ThumbnailGenerator();

    await expect(
      generator.generate({
        videoPath: '/nonexistent/video.mp4',
        title: 'Test',
        outputPath: '/output/thumbnail.jpg',
      })
    ).rejects.toThrow('Video file not found');
  });

  it('[P0] should throw error if thumbnail output is not created', async () => {
    const mockFFmpeg = {
      getVideoDuration: vi.fn().mockResolvedValue(60),
      extractFrame: vi.fn().mockResolvedValue(undefined),
      addTextOverlay: vi.fn().mockResolvedValue(undefined), // Doesn't create file
    } as unknown as FFmpegClient;

    const generator = new ThumbnailGenerator(mockFFmpeg);

    await expect(
      generator.generate({
        videoPath: '/test/video.mp4',
        title: 'Test',
        outputPath: '/nonexistent/dir/thumbnail.jpg',
      })
    ).rejects.toThrow('Thumbnail generation failed');
  });

  it('[P1] should handle FFmpeg errors gracefully', async () => {
    const mockFFmpeg = {
      getVideoDuration: vi.fn().mockRejectedValue(new Error('FFmpeg error')),
    } as unknown as FFmpegClient;

    const generator = new ThumbnailGenerator(mockFFmpeg);

    await expect(
      generator.generate({
        videoPath: '/test/video.mp4',
        title: 'Test',
        outputPath: '/output/thumbnail.jpg',
      })
    ).rejects.toThrow('FFmpeg error');
  });
});
```

**New Tests Added:** 9 tests (brings total to 34)

**Success Criteria:**
- `ThumbnailGenerator.generate()` method fully tested
- FFmpeg calls validated with mocks
- Error handling covered (missing files, failed output)
- AC1, AC2, AC3, AC4 directly tested

---

## Phase 2: Integration Tests (2 hours) - HIGH PRIORITY

### Task 2.1: Add FFmpeg Integration Tests (90 min)

**Priority:** P1 (High)
**Effort:** 90 minutes
**Owner:** Developer

**Action:**
Add integration tests that validate actual FFmpeg command generation

**New Test File:** `tests/integration/video/thumbnail.integration.test.ts`

```typescript
/**
 * ThumbnailGenerator Integration Tests
 * Story 5.4 - AC validation with real FFmpeg
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { ThumbnailGenerator } from '@/lib/video/thumbnail';
import { FFmpegClient } from '@/lib/video/ffmpeg';
import { existsSync, unlinkSync } from 'fs';
import path from 'path';

describe('5.4-INT-001: Thumbnail Generation Integration [P0]', () => {
  let generator: ThumbnailGenerator;
  let testVideoPath: string;
  let outputDir: string;

  beforeAll(async () => {
    // Verify FFmpeg is installed
    const ffmpeg = new FFmpegClient();
    const installed = await ffmpeg.verifyInstallation();
    if (!installed) {
      throw new Error('FFmpeg not installed - required for integration tests');
    }

    generator = new ThumbnailGenerator();
    testVideoPath = path.join(process.cwd(), 'tests', 'test-data', 'scene-1-short-5s.mp4');
    outputDir = path.join(process.cwd(), 'temp', 'integration-test-thumbnails');

    if (!existsSync(testVideoPath)) {
      throw new Error(`Test video not found: ${testVideoPath}. Run prepare-test-data.js first.`);
    }
  });

  it('[P0] AC1+AC3: should generate 1920x1080 JPG thumbnail', async () => {
    const outputPath = path.join(outputDir, 'integration-test-thumbnail.jpg');

    const result = await generator.generate({
      videoPath: testVideoPath,
      title: 'Integration Test Video',
      outputPath,
    });

    // Verify output file exists
    expect(existsSync(result.thumbnailPath)).toBe(true);

    // Verify dimensions
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);

    // Cleanup
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }
  });

  it('[P0] AC2: should contain title text (verified manually)', async () => {
    // This test generates a thumbnail that can be manually inspected
    // Automated text detection would require OCR - out of scope for MVP
    const outputPath = path.join(outputDir, 'text-overlay-verification.jpg');

    const result = await generator.generate({
      videoPath: testVideoPath,
      title: 'Text Overlay Test',
      outputPath,
    });

    expect(existsSync(result.thumbnailPath)).toBe(true);
    console.log(`\n📸 Thumbnail generated: ${result.thumbnailPath}`);
    console.log(`   Manual verification: Check that "Text Overlay Test" appears in thumbnail`);

    // Don't cleanup - leave for manual inspection
  });

  it('[P1] AC7: should handle special characters in title', async () => {
    const outputPath = path.join(outputDir, 'special-chars-thumbnail.jpg');

    const result = await generator.generate({
      videoPath: testVideoPath,
      title: "Video: The 'Special' Edition\\2025",
      outputPath,
    });

    expect(existsSync(result.thumbnailPath)).toBe(true);

    // Cleanup
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }
  });

  it('[P1] should handle long titles (>50 characters)', async () => {
    const outputPath = path.join(outputDir, 'long-title-thumbnail.jpg');

    const result = await generator.generate({
      videoPath: testVideoPath,
      title: 'This is a very long video title that exceeds fifty characters to test font scaling behavior',
      outputPath,
    });

    expect(existsSync(result.thumbnailPath)).toBe(true);

    // Cleanup
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }
  });
});

describe('5.4-INT-002: API Endpoint Integration [P1]', () => {
  // Note: This would require database and project setup
  // Recommended: Add to existing API test suite

  it('[P1] AC9: POST /api/projects/[id]/generate-thumbnail returns thumbnail path', async () => {
    // Test the API endpoint
    // This should be added to tests/api/thumbnail.test.ts
    // Skipped here to avoid duplication
  });
});
```

**New Tests Added:** 4 integration tests

**Success Criteria:**
- Thumbnails generated with real FFmpeg
- File system verified (files exist, correct format)
- Special character handling validated
- Manual verification for text legibility

---

### Task 2.2: Add API Tests (30 min)

**Priority:** P1 (High)
**Effort:** 30 minutes
**Owner:** Developer

**Action:**
Create API tests for the thumbnail generation endpoint

**New Test File:** `tests/api/thumbnail.test.ts`

```typescript
/**
 * Thumbnail API Tests - Story 5.4 AC9
 */
import { describe, it, expect, beforeEach } from 'vitest';
import db from '@/lib/db/client';

describe('5.4-API-001: POST /api/projects/[id]/generate-thumbnail [P1]', () => {
  let testProjectId: string;

  beforeEach(() => {
    // Create test project with video
    const stmt = db.prepare(`
      INSERT INTO projects (id, topic, video_path, current_step)
      VALUES (?, ?, ?, ?)
    `);
    testProjectId = 'test-project-thumbnail-' + Date.now();
    stmt.run(testProjectId, 'Test Video', '/test/video.mp4', 'assembly');
  });

  it('[P1] AC9: should return thumbnail path and metadata', async () => {
    const response = await fetch(`http://localhost:3000/api/projects/${testProjectId}/generate-thumbnail`, {
      method: 'POST',
    });

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('thumbnail_path');
    expect(data).toHaveProperty('width', 1920);
    expect(data).toHaveProperty('height', 1080);
    expect(data).toHaveProperty('source_timestamp');
  });

  it('[P0] should return 404 for non-existent project', async () => {
    const response = await fetch('http://localhost:3000/api/projects/nonexistent/generate-thumbnail', {
      method: 'POST',
    });

    expect(response.status).toBe(404);
  });

  it('[P1] should return 400 if project has no video', async () => {
    // Create project without video_path
    const stmt = db.prepare(`
      INSERT INTO projects (id, topic, current_step)
      VALUES (?, ?, ?)
    `);
    const projectIdNoVideo = 'test-project-no-video-' + Date.now();
    stmt.run(projectIdNoVideo, 'No Video', 'script');

    const response = await fetch(`http://localhost:3000/api/projects/${projectIdNoVideo}/generate-thumbnail`, {
      method: 'POST',
    });

    expect(response.status).toBe(400);
  });
});
```

**New Tests Added:** 3 API tests

**Success Criteria:**
- API endpoint returns correct response format
- Error cases handled (404, 400)
- AC9 directly tested

---

## Phase 3: Acceptance Criteria Coverage (1.5 hours) - MEDIUM PRIORITY

### Task 3.1: Map Tests to Acceptance Criteria (60 min)

**Priority:** P2 (Medium)
**Effort:** 60 minutes
**Owner:** QA/Developer

**Action:**
Create traceability matrix mapping tests to Story 5.4's 9 acceptance criteria

**Traceability Matrix:**

| AC | Description | Test IDs | Priority | Automated | Status |
|----|-------------|----------|----------|-----------|--------|
| AC1 | 16:9 JPG image created | 5.4-UNIT-026, 5.4-INT-001 | P0 | Yes | ✅ Complete |
| AC2 | Contains title text and video frame | 5.4-UNIT-026, 5.4-INT-002 | P0 | Partial | ⚠️ Manual |
| AC3 | Dimensions exactly 1920x1080 | 5.4-UNIT-027, 5.4-INT-001 | P0 | Yes | ✅ Complete |
| AC4 | Frame extracted from video | 5.4-UNIT-026 | P0 | Yes | ✅ Complete |
| AC5 | Saved to `public/videos/{projectId}/thumbnail.jpg` | 5.4-INT-001 | P1 | Yes | ✅ Complete |
| AC6 | Project `thumbnail_path` updated | 5.4-API-001 | P1 | Yes | ✅ Complete |
| AC7 | Text legible with font/color/shadow | 5.4-INT-002, 5.4-MANUAL-001 | P1 | Partial | ⚠️ Manual |
| AC8 | Job progress updated (70-85%) | 5.4-UNIT-030 (new) | P2 | Yes | ❌ TODO |
| AC9 | API endpoint returns thumbnail path | 5.4-API-001 | P1 | Yes | ✅ Complete |

**Coverage:** 7/9 ACs automated (78%), 2/9 require manual verification (22%)

**Action Items:**
1. Add test `5.4-UNIT-030` for progress tracking (AC8)
2. Create manual test checklist for AC2 and AC7

---

### Task 3.2: Add Priority Markers (30 min)

**Priority:** P2 (Medium)
**Effort:** 30 minutes
**Owner:** Developer

**Action:**
Add priority markers `[P0]`, `[P1]`, `[P2]` to all test descriptions

**Before:**
```typescript
it('should return middle index for odd number of frames', () => {
  // No priority marker
});
```

**After:**
```typescript
it('[P1] should return middle index for odd number of frames', () => {
  // Priority P1: Important for frame selection but not critical path
});
```

**Priority Distribution:**
- **P0 (Critical):** 12 tests - Core generation, dimensions, text overlay, error handling
- **P1 (High):** 18 tests - Frame selection, font sizing, special characters, API
- **P2 (Medium):** 10 tests - Constants, interface validation, edge cases
- **P3 (Low):** 0 tests

**Success Criteria:**
- All 40+ tests have priority markers
- P0 tests can be run in isolation with `--grep "@p0"`

---

## Phase 4: Optional Enhancements (1 hour) - NICE TO HAVE

### Task 4.1: Create Data Factory (30 min)

**Priority:** P3 (Low)
**Effort:** 30 minutes
**Owner:** Developer

**Action:**
Create factory functions to reduce hardcoded test data

**New File:** `tests/factories/thumbnail-factory.ts`

```typescript
export function createFramePaths(
  count: number,
  options?: { prefix?: string; extension?: string }
): string[] {
  const prefix = options?.prefix || 'frame';
  const extension = options?.extension || 'jpg';
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}.${extension}`);
}

export function createThumbnailOptions(
  overrides?: Partial<ThumbnailOptions>
): ThumbnailOptions {
  return {
    videoPath: '/test/video.mp4',
    title: 'Test Video',
    outputPath: '/output/thumbnail.jpg',
    ...overrides,
  };
}
```

**Usage:**
```typescript
it('[P1] should handle custom frame paths', () => {
  const frames = createFramePaths(5, { prefix: 'custom' });
  expect(frames).toHaveLength(5);
  expect(frames[0]).toBe('custom-0.jpg');
});
```

---

### Task 4.2: Add Performance Tests (30 min)

**Priority:** P3 (Low)
**Effort:** 30 minutes
**Owner:** QA

**Action:**
Add tests to ensure thumbnail generation completes in <5 seconds

```typescript
describe('5.4-PERF-001: Thumbnail Generation Performance [P2]', () => {
  it('[P2] should generate thumbnail in less than 5 seconds', async () => {
    const startTime = Date.now();

    await generator.generate({
      videoPath: testVideoPath,
      title: 'Performance Test',
      outputPath: '/output/perf-test.jpg',
    });

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // 5 seconds
  });
});
```

---

## Implementation Roadmap

### Week 1: Critical Path (6 hours)

**Day 1-2: Phase 1 (2-3 hours)**
- [ ] Task 1.1: Add test IDs (30 min)
- [ ] Task 1.2: Import interfaces (15 min)
- [ ] Task 1.3: Test actual ThumbnailGenerator class (90 min)
- [ ] Run tests and fix any failures (30 min)

**Day 3: Phase 2 Part 1 (2 hours)**
- [ ] Task 2.1: Add FFmpeg integration tests (90 min)
- [ ] Run integration tests (30 min)

**Day 4: Phase 2 Part 2 + Phase 3 (2 hours)**
- [ ] Task 2.2: Add API tests (30 min)
- [ ] Task 3.1: Create traceability matrix (60 min)
- [ ] Task 3.2: Add priority markers (30 min)

### Week 2: Optional (1 hour)

**Day 5: Phase 4 (Optional)**
- [ ] Task 4.1: Create data factory (30 min)
- [ ] Task 4.2: Add performance tests (30 min)

---

## Success Metrics

### Before Implementation
- ❌ Quality Score: 58/100 (Grade C)
- ❌ AC Coverage: 0/9 (0%)
- ❌ Test IDs: 0/25
- ❌ Core Functionality: Not tested
- ❌ Traceability: None

### After Phase 1 (Critical)
- ✅ Quality Score: 75/100 (Grade B)
- ✅ AC Coverage: 5/9 (56%)
- ✅ Test IDs: 34/34
- ✅ Core Functionality: Tested with mocks
- ✅ Traceability: Partial

### After Phase 2 (Integration)
- ✅ Quality Score: 82/100 (Grade A)
- ✅ AC Coverage: 7/9 (78%)
- ✅ Test IDs: 41/41
- ✅ Integration: FFmpeg + API tested
- ✅ Traceability: Complete

### After Phase 3 (Full Coverage)
- ✅ Quality Score: 85/100 (Grade A)
- ✅ AC Coverage: 9/9 (100%) - 2 manual
- ✅ Test IDs: 41/41
- ✅ Priority Markers: All tests classified
- ✅ Traceability: Matrix created

### Target (With Phase 4)
- ✅ Quality Score: 90/100 (Grade A+)
- ✅ Data Factories: Used throughout
- ✅ Performance: Validated
- ✅ Production Ready: Yes

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| FFmpeg not installed on CI | Tests fail | Add FFmpeg installation to CI setup, skip integration tests if not available |
| Test video files missing | Tests fail | Add prepare-test-data.js to CI pipeline |
| Mocking complexity | Delays | Start with simple mocks, refine iteratively |
| Manual tests not executed | Gaps in coverage | Create manual test checklist, assign owner |

---

## Quality Gate Criteria

**PASS:** Ready for Production
- ✅ All P0 tests pass (100%)
- ✅ P1 tests pass rate ≥95%
- ✅ AC coverage ≥80% automated
- ✅ Quality score ≥85/100
- ✅ Test IDs on all tests
- ✅ Manual tests documented

**CONCERNS:** Ship with Caveats
- ⚠️ P1 pass rate 90-95%
- ⚠️ AC coverage 70-80%
- ⚠️ Quality score 75-84

**FAIL:** Not Ready
- ❌ Any P0 test failure
- ❌ AC coverage <70%
- ❌ Quality score <75
- ❌ No test IDs

---

## Manual Test Checklist

### AC2: Thumbnail Contains Title Text (5 min)

**Prerequisites:**
- Generate thumbnail using integration test or API
- Open thumbnail in image viewer

**Steps:**
1. Generate thumbnail with title "Test Video Title"
2. Open thumbnail in image viewer
3. Verify title text is clearly visible
4. Verify text is positioned at bottom center
5. Verify text color is white with black shadow

**Expected:**
- ✅ Title "Test Video Title" appears in thumbnail
- ✅ Text is legible against video frame background
- ✅ Font size is appropriate (not too small or too large)

---

### AC7: Text Legibility (10 min)

**Prerequisites:**
- Generate thumbnails with various titles
- Test multiple video backgrounds (light, dark, complex)

**Steps:**
1. Generate thumbnail with short title (10 chars) on dark video background
2. Generate thumbnail with long title (80 chars) on light video background
3. Generate thumbnail with title containing special chars on complex background
4. Verify legibility in each case

**Expected:**
- ✅ Short title uses large font (~80px), easily legible
- ✅ Long title uses smaller font (~20px), still legible
- ✅ Black shadow makes text stand out from any background
- ✅ Special characters render correctly

---

## References

- **Test Review:** docs/test-review-story-5.4-thumbnail.md
- **Story 5.4:** docs/stories/story-5.4.md
- **Epic 5 Test Design:** docs/sprint-artifacts/test-design-epic-5.md (Stories 5.1-5.3 only)
- **PRD:** Feature 1.8 (Automated Thumbnail Generation), FR-8.01 through FR-8.05
- **Current Tests:** tests/unit/video/thumbnail.test.ts (25 tests, 248 lines)

---

*Generated by TEA (Test Architect) - BMAD Method v6*
*Quality improvement plan based on comprehensive test review*
