/**
 * Thumbnail Generator Integration Tests - Story 5.4
 * Test ID Prefix: 5.4-INT-xxx
 * Priority: P2/P3
 *
 * Integration tests for ThumbnailGenerator with real FFmpeg and file system.
 * These tests validate end-to-end thumbnail generation with actual video files.
 *
 * Prerequisites:
 * - FFmpeg installed and available in PATH
 * - Test video fixtures in tests/fixtures/videos/
 *
 * Note: These tests are marked as SKIP by default. To run them:
 * 1. Add test video fixtures (see docs below)
 * 2. Remove .skip from describe blocks
 * 3. Run: npm test -- thumbnail.integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import * as fs from 'fs';
import { ThumbnailGenerator } from '@/lib/video/thumbnail';

// Test configuration
const FIXTURES_DIR = path.join(__dirname, '../../fixtures/videos');
const OUTPUT_DIR = path.join(__dirname, '../../temp/integration-thumbnails');
const TEST_VIDEO = path.join(FIXTURES_DIR, 'test-video.mp4'); // 5-10 second video

/**
 * Setup instructions for integration tests:
 *
 * 1. Create test video fixture:
 *    - Add a small test video (5-10 seconds) to: tests/fixtures/videos/test-video.mp4
 *    - Recommended: 1920x1080, H.264 codec, 5-10 seconds duration
 *    - Can be generated with: ffmpeg -f lavfi -i testsrc=duration=10:size=1920x1080:rate=30 -pix_fmt yuv420p tests/fixtures/videos/test-video.mp4
 *
 * 2. Ensure FFmpeg is installed:
 *    - Run: ffmpeg -version
 *    - If not found, install FFmpeg and add to PATH
 *
 * 3. Enable tests:
 *    - Remove .skip from describe blocks below
 */

describe.skip('5.4-INT: ThumbnailGenerator Integration Tests [P2]', () => {
  let generator: ThumbnailGenerator;

  beforeAll(() => {
    generator = new ThumbnailGenerator();

    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Verify test fixture exists
    if (!fs.existsSync(TEST_VIDEO)) {
      throw new Error(
        `Test video not found: ${TEST_VIDEO}\n` +
        `Please create test fixture. See setup instructions in this file.`
      );
    }
  });

  afterAll(() => {
    // Cleanup generated thumbnails
    if (fs.existsSync(OUTPUT_DIR)) {
      const files = fs.readdirSync(OUTPUT_DIR);
      files.forEach(file => {
        fs.unlinkSync(path.join(OUTPUT_DIR, file));
      });
      fs.rmdirSync(OUTPUT_DIR);
    }
  });

  describe('5.4-INT-001: Real Thumbnail Generation [P2]', () => {
    it('[P2] AC1+AC3: should generate real 1920x1080 thumbnail file', async () => {
      const outputPath = path.join(OUTPUT_DIR, 'test-thumbnail-real.jpg');

      const result = await generator.generate({
        videoPath: TEST_VIDEO,
        title: 'Integration Test Video',
        outputPath,
      });

      // Verify file was created
      expect(fs.existsSync(outputPath)).toBe(true);

      // Verify result metadata
      expect(result.thumbnailPath).toBe(outputPath);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.sourceTimestamp).toBeGreaterThan(0);

      // Verify file size is reasonable (> 10KB, < 5MB)
      const stats = fs.statSync(outputPath);
      expect(stats.size).toBeGreaterThan(10 * 1024); // > 10KB
      expect(stats.size).toBeLessThan(5 * 1024 * 1024); // < 5MB
    }, 30000); // 30 second timeout for real FFmpeg processing

    it('[P2] AC2: should include title text in generated thumbnail', async () => {
      const outputPath = path.join(OUTPUT_DIR, 'test-thumbnail-with-title.jpg');
      const title = 'Test Title for Verification';

      await generator.generate({
        videoPath: TEST_VIDEO,
        title,
        outputPath,
      });

      // Verify file exists
      expect(fs.existsSync(outputPath)).toBe(true);

      // Manual verification required: Open the thumbnail and verify text is visible
      console.log(`Manual check: Verify title "${title}" appears in: ${outputPath}`);
    }, 30000);

    it('[P2] AC4: should extract frames from real video', async () => {
      const outputPath = path.join(OUTPUT_DIR, 'test-thumbnail-frame-extraction.jpg');

      const result = await generator.generate({
        videoPath: TEST_VIDEO,
        title: 'Frame Extraction Test',
        outputPath,
      });

      // Verify thumbnail was created
      expect(fs.existsSync(outputPath)).toBe(true);

      // Verify timestamp is reasonable (should be from middle 50% of video)
      // For a 10 second video, middle frame should be around 5 seconds
      expect(result.sourceTimestamp).toBeGreaterThan(0);
    }, 30000);

    it('[P2] should handle custom dimensions', async () => {
      const outputPath = path.join(OUTPUT_DIR, 'test-thumbnail-custom-dimensions.jpg');

      const result = await generator.generate({
        videoPath: TEST_VIDEO,
        title: 'Custom Dimensions',
        outputPath,
        width: 1280,
        height: 720,
      });

      expect(fs.existsSync(outputPath)).toBe(true);
      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
    }, 30000);
  });

  describe('5.4-INT-002: Real Error Handling [P2]', () => {
    it('[P2] should fail gracefully with missing video file', async () => {
      const outputPath = path.join(OUTPUT_DIR, 'should-not-exist.jpg');

      await expect(
        generator.generate({
          videoPath: '/nonexistent/video.mp4',
          title: 'Test',
          outputPath,
        })
      ).rejects.toThrow('Video file not found');
    });

    it('[P2] should fail gracefully with invalid output path', async () => {
      const invalidPath = '/invalid/path/with/no/permissions/thumbnail.jpg';

      await expect(
        generator.generate({
          videoPath: TEST_VIDEO,
          title: 'Test',
          outputPath: invalidPath,
        })
      ).rejects.toThrow();
    });
  });

  describe('5.4-INT-003: Performance [P3]', () => {
    it('[P3] should generate thumbnail in under 10 seconds', async () => {
      const outputPath = path.join(OUTPUT_DIR, 'test-thumbnail-performance.jpg');
      const startTime = Date.now();

      await generator.generate({
        videoPath: TEST_VIDEO,
        title: 'Performance Test',
        outputPath,
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // < 10 seconds
      console.log(`Thumbnail generation took: ${duration}ms`);
    }, 15000);
  });
});

/**
 * Manual Testing Checklist:
 *
 * After running integration tests, manually verify:
 *
 * [ ] AC2: Open generated thumbnails and verify:
 *     - Title text is clearly visible
 *     - Text is centered at bottom
 *     - Text has white color with black shadow
 *     - Text is legible against video background
 *
 * [ ] AC7: Test with different title lengths:
 *     - Short title (10 chars): Verify font size is appropriate
 *     - Medium title (40 chars): Verify text fits and wraps correctly
 *     - Long title (80 chars): Verify text doesn't overflow
 *
 * [ ] Visual quality:
 *     - Thumbnail is clear and not pixelated
 *     - Colors are accurate
 *     - Frame selection looks representative of video content
 */
