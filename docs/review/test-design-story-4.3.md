# Test Design Document: Story 4.3 - Video Preview & Playback Functionality

## Document Information
- **Story ID:** 4.3
- **Story Title:** Video Preview & Playback Functionality
- **Epic:** Epic 4 - Visual Curation Interface
- **Created:** 2025-11-20
- **Author:** TEA Agent (Master Test Architect)
- **Version:** 1.0
- **Status:** Ready for Implementation

---

## Executive Summary

This test design document provides comprehensive test coverage for Story 4.3 (Video Preview & Playback Functionality). The story currently has **ZERO test coverage**, representing a critical quality violation. This document defines all required tests to bring the story to production-ready quality standards.

**Total Tests Required:** 45-55 tests across unit, integration, API, and security categories
**Critical Priority (P0):** 28 tests
**High Priority (P1):** 17 tests
**Medium Priority (P2):** 10 tests

---

## Risk Assessment & Priority Matrix

### Critical Risks (P0 - Must Test)

| Risk ID | Risk Description | Impact | Likelihood | Score | Test Coverage |
|---------|-----------------|---------|------------|-------|---------------|
| R-001 | Path traversal vulnerability in video API | 3 | 3 | 9 | Security tests (10 tests) |
| R-002 | Video playback failure | 3 | 2 | 6 | Component tests (8 tests) |
| R-003 | Keyboard shortcut conflicts | 2 | 3 | 6 | Integration tests (5 tests) |
| R-004 | Memory leaks from uncleaned Plyr instances | 3 | 2 | 6 | Cleanup tests (3 tests) |
| R-005 | YouTube fallback failure | 2 | 2 | 4 | Fallback tests (2 tests) |

### Test Priority Classification

- **P0 (Critical):** Security, core functionality, acceptance criteria
- **P1 (High):** User experience, error handling, performance
- **P2 (Medium):** Edge cases, responsive design, accessibility
- **P3 (Low):** Nice-to-have features, visual polish

---

## Test Scenarios by Acceptance Criteria

### AC1: Clicking suggestion card opens video preview player

**Test Scenarios:**
1. **[4.3-E2E-001] [P0]** Click opens preview modal
2. **[4.3-E2E-002] [P0]** Multiple cards clickable
3. **[4.3-UNIT-001] [P1]** onClick handler propagation
4. **[4.3-UNIT-002] [P2]** Disabled state handling

### AC2: Video plays downloaded segment from cache

**Test Scenarios:**
1. **[4.3-API-001] [P0]** Serve video from .cache directory
2. **[4.3-API-002] [P0]** Correct Content-Type headers
3. **[4.3-UNIT-003] [P0]** Local video source rendering
4. **[4.3-E2E-003] [P1]** Cache hit performance

### AC3: Instant playback (<100ms)

**Test Scenarios:**
1. **[4.3-PERF-001] [P0]** Measure time to first frame
2. **[4.3-PERF-002] [P1]** Plyr initialization time
3. **[4.3-PERF-003] [P2]** Preload on hover timing

### AC4: Play/pause, progress bar, volume controls functional

**Test Scenarios:**
1. **[4.3-UNIT-004] [P0]** Play/pause toggle
2. **[4.3-UNIT-005] [P0]** Progress bar seeking
3. **[4.3-UNIT-006] [P1]** Volume control
4. **[4.3-UNIT-007] [P2]** Fullscreen toggle

### AC5: Fallback for failed downloads

**Test Scenarios:**
1. **[4.3-UNIT-008] [P0]** YouTube iframe on error status
2. **[4.3-UNIT-009] [P0]** YouTube iframe on null path
3. **[4.3-E2E-004] [P1]** Seamless fallback transition

### AC6: Keyboard shortcuts work

**Test Scenarios:**
1. **[4.3-UNIT-010] [P0]** Space key play/pause
2. **[4.3-UNIT-011] [P0]** Escape key closes modal
3. **[4.3-UNIT-012] [P1]** Prevent default scroll
4. **[4.3-E2E-005] [P2]** Keyboard navigation flow

### AC7: Multiple previews sequential

**Test Scenarios:**
1. **[4.3-E2E-006] [P0]** Open/close multiple previews
2. **[4.3-UNIT-013] [P1]** State cleanup between previews
3. **[4.3-UNIT-014] [P2]** Memory leak prevention

### AC8: Responsive design

**Test Scenarios:**
1. **[4.3-E2E-007] [P1]** Desktop layout (1920px)
2. **[4.3-E2E-008] [P1]** Tablet layout (768px)
3. **[4.3-UNIT-015] [P2]** Aspect ratio maintenance

---

## Detailed Test Cases

### P0 Security Tests - Video API Route

```typescript
/**
 * Test Suite: Video Serving API Security
 * File: tests/api/video-serving.security.test.ts
 * Priority: P0 (Critical)
 * Risk Mitigation: R-001 (Path Traversal)
 */

describe('[P0] Video Serving API Security', () => {

  describe('[4.3-SEC-001] Path Traversal Prevention', () => {
    test('should reject ../.. traversal attempts', async () => {
      // Given: Malicious path with directory traversal
      const maliciousPath = '../../../etc/passwd';

      // When: Attempting to access file outside .cache
      const response = await fetch(`/api/videos/${maliciousPath}`);

      // Then: Should return 403 Forbidden
      expect(response.status).toBe(403);
    });

    test('should reject URL-encoded traversal (%2E%2E)', async () => {
      // Given: URL-encoded traversal attempt
      const encodedPath = '%2E%2E%2F%2E%2E%2Fetc%2Fpasswd';

      // When: Attempting encoded attack
      const response = await fetch(`/api/videos/${encodedPath}`);

      // Then: Should return 403
      expect(response.status).toBe(403);
    });

    test('should reject double-encoded traversal', async () => {
      // Given: Double-encoded path
      const doubleEncoded = '%252E%252E%252F%252E%252E';

      // When: Attempting double-encoded attack
      const response = await fetch(`/api/videos/${doubleEncoded}`);

      // Then: Should return 403
      expect(response.status).toBe(403);
    });
  });

  describe('[4.3-SEC-002] File Access Restrictions', () => {
    test('should only serve files from .cache/videos directory', async () => {
      // Given: Path outside videos directory
      const invalidPath = '.cache/audio/file.mp3';

      // When: Attempting to access non-video file
      const response = await fetch(`/api/videos/${invalidPath}`);

      // Then: Should return 403
      expect(response.status).toBe(403);
    });

    test('should reject non-video file extensions', async () => {
      // Given: Non-video file
      const nonVideo = 'videos/project1/document.pdf';

      // When: Attempting to access non-video
      const response = await fetch(`/api/videos/${nonVideo}`);

      // Then: Should return 403
      expect(response.status).toBe(403);
    });
  });
});
```

### P0 Component Tests - VideoPreviewPlayer

```typescript
/**
 * Test Suite: VideoPreviewPlayer Component
 * File: tests/components/VideoPreviewPlayer.test.tsx
 * Priority: P0 (Critical)
 * Risk Mitigation: R-002 (Playback Failure)
 */

describe('VideoPreviewPlayer Component', () => {

  describe('[4.3-UNIT-003] Local Video Playback', () => {
    test('should render HTML5 video for complete downloads', () => {
      // Given: Suggestion with complete download
      const props = {
        suggestionId: 'test-1',
        projectId: 'proj-1',
        videoId: 'youtube-123',
        title: 'Test Video',
        channelTitle: 'Test Channel',
        segmentPath: '.cache/videos/proj-1/scene-01-default.mp4',
        downloadStatus: 'complete' as const,
        onClose: vi.fn(),
      };

      // When: Rendering component
      const { container } = render(<VideoPreviewPlayer {...props} />);

      // Then: Should render video element
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video?.src).toContain('/api/videos/videos/proj-1/scene-01-default.mp4');
    });

    test('should strip .cache/ prefix from segment path', () => {
      // Given: Path with .cache/ prefix
      const segmentPath = '.cache/videos/proj-1/scene-01.mp4';

      // When: Constructing video URL
      const url = constructVideoUrl(segmentPath);

      // Then: Should remove .cache/ prefix
      expect(url).toBe('/api/videos/videos/proj-1/scene-01.mp4');
    });
  });

  describe('[4.3-UNIT-008] YouTube Fallback', () => {
    test('should render YouTube iframe on error status', () => {
      // Given: Suggestion with error download
      const props = {
        downloadStatus: 'error' as const,
        segmentPath: null,
        videoId: 'youtube-123',
        // ... other props
      };

      // When: Rendering component
      const { container } = render(<VideoPreviewPlayer {...props} />);

      // Then: Should render iframe
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe?.src).toContain('youtube.com/embed/youtube-123');
    });

    test('should render YouTube iframe when path is null', () => {
      // Given: No segment path
      const props = {
        downloadStatus: 'complete' as const,
        segmentPath: null,
        videoId: 'youtube-123',
        // ... other props
      };

      // When: Rendering component
      const { container } = render(<VideoPreviewPlayer {...props} />);

      // Then: Should fallback to iframe
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });
  });

  describe('[4.3-UNIT-010] Keyboard Shortcuts', () => {
    test('Space key should toggle play/pause', async () => {
      // Given: Video player is open
      const { container } = render(<VideoPreviewPlayer {...defaultProps} />);
      const video = container.querySelector('video') as HTMLVideoElement;

      // When: Pressing space key
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });

      // Then: Should toggle playback
      expect(video.paused).toBe(false);

      // When: Pressing space again
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });

      // Then: Should pause
      expect(video.paused).toBe(true);
    });

    test('Escape key should close preview', () => {
      // Given: Video player is open
      const onClose = vi.fn();
      render(<VideoPreviewPlayer {...defaultProps} onClose={onClose} />);

      // When: Pressing escape key
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      // Then: Should call onClose
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('[4.3-UNIT-014] Cleanup and Memory Management', () => {
    test('should destroy Plyr instance on unmount', () => {
      // Given: Plyr instance created
      const destroySpy = vi.spyOn(Plyr.prototype, 'destroy');
      const { unmount } = render(<VideoPreviewPlayer {...defaultProps} />);

      // When: Unmounting component
      unmount();

      // Then: Should call destroy
      expect(destroySpy).toHaveBeenCalledTimes(1);
    });

    test('should remove keyboard event listeners on unmount', () => {
      // Given: Event listeners attached
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      const { unmount } = render(<VideoPreviewPlayer {...defaultProps} />);

      // When: Unmounting component
      unmount();

      // Then: Should remove listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });
});
```

### P0 Integration Tests - Preview Workflow

```typescript
/**
 * Test Suite: Video Preview Integration
 * File: tests/integration/visual-curation/preview.test.ts
 * Priority: P0 (Critical)
 * Acceptance Criteria: AC1, AC7
 */

describe('[4.3-E2E-001] Video Preview Workflow', () => {

  test('should complete full preview flow from click to close', async ({ page }) => {
    // Given: User on visual curation page with suggestions
    await page.goto(`/projects/${testProjectId}/visual-curation`);
    await page.waitForSelector('[data-testid="suggestion-card"]');

    // When: Clicking suggestion card
    await page.click('[data-testid="suggestion-card"]:first-child');

    // Then: Preview modal should open
    await expect(page.locator('[data-testid="video-preview-modal"]')).toBeVisible();

    // And: Video should start playing
    const video = page.locator('video');
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute('src', /\/api\/videos\//);

    // When: Pressing Escape
    await page.keyboard.press('Escape');

    // Then: Modal should close
    await expect(page.locator('[data-testid="video-preview-modal"]')).not.toBeVisible();
  });

  test('should handle sequential previews without reload', async ({ page }) => {
    // Given: Multiple suggestion cards
    await page.goto(`/projects/${testProjectId}/visual-curation`);
    const cards = page.locator('[data-testid="suggestion-card"]');

    // When: Opening first preview
    await cards.nth(0).click();
    await expect(page.locator('video')).toBeVisible();

    // And: Closing first preview
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="video-preview-modal"]')).not.toBeVisible();

    // When: Opening second preview
    await cards.nth(1).click();

    // Then: Second preview should open without page reload
    await expect(page.locator('video')).toBeVisible();
    expect(page.url()).toContain('/visual-curation');
  });
});
```

### P1 Performance Tests

```typescript
/**
 * Test Suite: Video Preview Performance
 * File: tests/integration/visual-curation/preview-performance.test.ts
 * Priority: P1 (High)
 * Acceptance Criteria: AC3
 */

describe('[4.3-PERF-001] Video Playback Performance', () => {

  test('should achieve <100ms time to first frame for cached videos', async () => {
    // Given: Pre-cached video file
    const startTime = performance.now();

    // When: Loading video
    const video = document.createElement('video');
    video.src = '/api/videos/videos/test/scene-01-default.mp4';
    video.preload = 'auto';

    await new Promise((resolve) => {
      video.addEventListener('loadeddata', resolve);
    });

    // Then: Should load within 100ms
    const loadTime = performance.now() - startTime;
    expect(loadTime).toBeLessThan(100);
  });

  test('should initialize Plyr within 50ms', async () => {
    // Given: Video element ready
    const video = document.createElement('video');
    document.body.appendChild(video);

    // When: Initializing Plyr
    const startTime = performance.now();
    const player = new Plyr(video);
    const initTime = performance.now() - startTime;

    // Then: Should initialize quickly
    expect(initTime).toBeLessThan(50);

    // Cleanup
    player.destroy();
    document.body.removeChild(video);
  });
});
```

---

## Test Data Requirements

### Required Test Fixtures

```typescript
// tests/fixtures/visual-suggestions.fixture.ts
export const testSuggestions = {
  withCompleteDownload: {
    id: 'sug-1',
    sceneId: 'scene-1',
    videoId: 'abc123',
    title: 'Test Video - Complete Download',
    thumbnailUrl: 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
    channelTitle: 'Test Channel',
    embedUrl: 'https://youtube.com/embed/abc123',
    rank: 1,
    duration: 120,
    defaultSegmentPath: '.cache/videos/proj-1/scene-01-default.mp4',
    downloadStatus: 'complete' as const,
    createdAt: '2025-11-20T10:00:00Z'
  },
  withErrorDownload: {
    // ... similar structure with downloadStatus: 'error'
  },
  withNullPath: {
    // ... similar structure with defaultSegmentPath: null
  }
};

// tests/fixtures/video-files.fixture.ts
export const testVideoFiles = {
  validMp4: Buffer.from([/* Valid MP4 header bytes */]),
  corruptedMp4: Buffer.from([/* Corrupted file bytes */]),
  largeMp4: Buffer.alloc(50 * 1024 * 1024) // 50MB file
};
```

### Mock Data Factory

```typescript
// tests/factories/video-preview.factory.ts
export function createMockVideoPreviewProps(overrides?: Partial<VideoPreviewPlayerProps>) {
  return {
    suggestionId: faker.string.uuid(),
    projectId: faker.string.uuid(),
    videoId: faker.string.alphanumeric(11),
    title: faker.lorem.sentence(),
    channelTitle: faker.company.name(),
    segmentPath: `.cache/videos/${faker.string.uuid()}/scene-01-default.mp4`,
    downloadStatus: 'complete' as const,
    onClose: vi.fn(),
    ...overrides
  };
}
```

---

## Test Environment Setup

### Required Dependencies

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@vitest/ui": "^1.0.0",
    "vitest": "^1.0.0",
    "playwright": "^1.40.0",
    "plyr": "^3.7.8",
    "@types/plyr": "^3.5.4"
  }
}
```

### Test Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules', '.next'],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85
      }
    }
  }
});
```

### Performance Testing Setup

```typescript
// tests/setup/performance.ts
export const performanceConfig = {
  videoLoadTimeout: 100, // ms
  plyrInitTimeout: 50, // ms
  firstFrameTimeout: 100, // ms
  measurementRuns: 10 // Average over multiple runs
};
```

---

## Test Execution Strategy

### Test Phases

1. **Phase 1: Security Tests (Day 1)**
   - Implement all P0 security tests
   - Verify path traversal prevention
   - Test file access restrictions

2. **Phase 2: Component Tests (Day 1-2)**
   - Implement VideoPreviewPlayer tests
   - Test Plyr integration
   - Verify keyboard shortcuts

3. **Phase 3: API Tests (Day 2)**
   - Implement video serving route tests
   - Test Range request support
   - Verify Content-Type headers

4. **Phase 4: Integration Tests (Day 2-3)**
   - Full workflow tests
   - Sequential preview tests
   - Responsive design tests

5. **Phase 5: Performance Tests (Day 3)**
   - Measure playback timing
   - Verify <100ms target
   - Test memory cleanup

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Suite - Story 4.3
on: [push, pull_request]

jobs:
  security-tests:
    name: P0 Security Tests
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:security

  unit-tests:
    name: Component Unit Tests
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:unit -- VideoPreviewPlayer

  integration-tests:
    name: E2E Integration Tests
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:e2e -- preview

  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:perf -- video-preview
```

---

## Coverage Requirements

### Minimum Coverage Targets

| Category | Target | Priority |
|----------|--------|----------|
| Component Coverage | 85% | P0 |
| API Route Coverage | 90% | P0 |
| Security Test Coverage | 100% | P0 |
| Acceptance Criteria | 100% | P0 |
| Performance Tests | 100% | P1 |
| Error Scenarios | 80% | P1 |
| Accessibility | 70% | P2 |

### Coverage Measurement

```bash
# Run coverage report
npm run test:coverage -- --reporter=html

# Check coverage thresholds
npm run test:coverage:check

# Generate lcov report for CI
npm run test:coverage:ci
```

---

## Test Maintenance

### Test Review Checklist

- [ ] All P0 tests passing
- [ ] All acceptance criteria covered
- [ ] Security tests comprehensive
- [ ] Performance benchmarks met
- [ ] No flaky tests
- [ ] Proper cleanup in all tests
- [ ] Test documentation complete

### Monthly Review Tasks

1. Review and update test data fixtures
2. Check for new security vulnerabilities
3. Update performance benchmarks
4. Review test execution times
5. Update deprecated dependencies

---

## Appendix

### Test Naming Conventions

```
[StoryID]-[TestType]-[Number]
Examples:
- 4.3-SEC-001 (Security test)
- 4.3-UNIT-001 (Unit test)
- 4.3-E2E-001 (End-to-end test)
- 4.3-PERF-001 (Performance test)
- 4.3-API-001 (API test)
```

### BDD Format Template

```typescript
test('should [expected behavior] when [condition]', () => {
  // Given: [Initial context]

  // When: [Action taken]

  // Then: [Expected outcome]

  // And: [Additional assertions]
});
```

### Error Scenario Matrix

| Scenario | Test Coverage | Priority |
|----------|--------------|----------|
| Network timeout | ✅ 4.3-API-010 | P1 |
| Corrupted video file | ✅ 4.3-UNIT-016 | P1 |
| Missing video file | ✅ 4.3-API-011 | P0 |
| Plyr initialization failure | ✅ 4.3-UNIT-017 | P1 |
| YouTube API error | ✅ 4.3-UNIT-018 | P1 |
| Memory exhaustion | ✅ 4.3-PERF-004 | P2 |

---

## Sign-off

This test design document provides comprehensive coverage for Story 4.3. Implementation of these tests is **CRITICAL** and must be completed before the story can be considered done.

**Prepared by:** TEA Agent (Master Test Architect)
**Date:** 2025-11-20
**Status:** Ready for Implementation

**Next Steps:**
1. Assign QA engineer to implement tests
2. Schedule pair programming session
3. Target completion: 3 days
4. Code review by senior QA
5. Integration into CI/CD pipeline