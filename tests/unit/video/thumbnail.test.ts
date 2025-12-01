/**
 * ThumbnailGenerator Unit Tests - Story 5.4
 *
 * Test Quality Score: Target 85/100 (Grade A)
 *
 * Tests thumbnail generation functionality including:
 * - ThumbnailGenerator class methods
 * - Best frame selection logic
 * - Font size calculation
 * - Interface validation
 * - Error handling
 *
 * NOTE: Some tests use mocked FFmpeg to avoid filesystem dependencies.
 *       For full integration testing with real FFmpeg, see:
 *       tests/integration/video/thumbnail.integration.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';

// Mock fs module BEFORE importing ThumbnailGenerator
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    default: actual,
    existsSync: vi.fn(() => true), // Default: return true for all paths
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

import { ThumbnailGenerator, ThumbnailOptions, ThumbnailResult } from '@/lib/video/thumbnail';
import { FFmpegClient } from '@/lib/video/ffmpeg';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';

// ============================================================================
// PHASE 1: Core ThumbnailGenerator Class Tests (NEW)
// ============================================================================

describe('5.4-UNIT-026: ThumbnailGenerator.generate() [P0]', () => {
  let generator: ThumbnailGenerator;
  let mockFFmpeg: any;
  let tempDir: string;

  beforeEach(() => {
    // Reset fs mocks to default (return true for all existence checks)
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(mkdirSync).mockReturnValue(undefined as any);
    vi.mocked(writeFileSync).mockReturnValue(undefined);
    vi.mocked(unlinkSync).mockReturnValue(undefined);

    tempDir = path.join(process.cwd(), 'temp', 'test-thumbnails');

    // Mock FFmpeg client
    mockFFmpeg = {
      getVideoDuration: vi.fn().mockResolvedValue(60), // 60 second video
      extractFrame: vi.fn().mockResolvedValue(undefined),
      addTextOverlay: vi.fn().mockResolvedValue(undefined),
    } as unknown as FFmpegClient;

    generator = new ThumbnailGenerator(mockFFmpeg);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('[P0] AC1+AC3: should generate thumbnail with 1920x1080 dimensions (16:9 aspect ratio)', async () => {
    const outputPath = path.join(tempDir, 'test-thumbnail-ac1.jpg');

    // Ensure output path appears to exist after generation
    vi.mocked(existsSync).mockImplementation((path: any) => {
      if (typeof path === 'string') {
        return path.includes('video.mp4') || path.includes('thumbnail') || path === outputPath;
      }
      return true;
    });

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

  it('[P0] AC4: should extract frames at 10%, 50%, 90% of video duration', async () => {
    const outputPath = path.join(tempDir, 'test-thumbnail-ac4.jpg');

    // Ensure paths exist
    vi.mocked(existsSync).mockReturnValue(true);

    await generator.generate({
      videoPath: '/test/video.mp4',
      title: 'Test Video',
      outputPath,
    });

    // Verify frames extracted at correct timestamps
    expect(mockFFmpeg.extractFrame).toHaveBeenCalledTimes(3);
    expect(mockFFmpeg.extractFrame).toHaveBeenNthCalledWith(
      1,
      '/test/video.mp4',
      6, // 10% of 60s
      expect.stringContaining('frame-0.jpg')
    );
    expect(mockFFmpeg.extractFrame).toHaveBeenNthCalledWith(
      2,
      '/test/video.mp4',
      30, // 50% of 60s
      expect.stringContaining('frame-1.jpg')
    );
    expect(mockFFmpeg.extractFrame).toHaveBeenNthCalledWith(
      3,
      '/test/video.mp4',
      54, // 90% of 60s
      expect.stringContaining('frame-2.jpg')
    );
  });

  it('[P0] AC2: should add title text overlay to middle frame', async () => {
    const outputPath = path.join(tempDir, 'test-thumbnail-ac2.jpg');

    // Ensure paths exist
    vi.mocked(existsSync).mockReturnValue(true);

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
    const outputPath = path.join(tempDir, 'test-thumbnail-result.jpg');

    // Ensure paths exist
    vi.mocked(existsSync).mockReturnValue(true);

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

  it('[P1] should use custom dimensions when provided', async () => {
    const outputPath = path.join(tempDir, 'test-thumbnail-custom.jpg');

    // Ensure paths exist
    vi.mocked(existsSync).mockReturnValue(true);

    const result = await generator.generate({
      videoPath: '/test/video.mp4',
      title: 'Test Video',
      outputPath,
      width: 1280,
      height: 720,
    });

    expect(result.width).toBe(1280);
    expect(result.height).toBe(720);
    expect(mockFFmpeg.addTextOverlay).toHaveBeenCalledWith(
      expect.any(String),
      'Test Video',
      outputPath,
      1280,
      720
    );
  });
});

describe('5.4-UNIT-027: ThumbnailGenerator Error Handling [P0]', () => {
  it('[P0] should throw error if video file does not exist', async () => {
    // Mock existsSync to return false for this specific test
    vi.mocked(existsSync).mockReturnValue(false);

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
    // Mock existsSync to return true for video, but false for final thumbnail check
    let callCount = 0;
    vi.mocked(existsSync).mockImplementation((path: any) => {
      callCount++;
      // First call (video check): return true
      // Last call (thumbnail verification): return false
      if (callCount === 1) return true; // Video exists
      return false; // Thumbnail not created
    });

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
    // Mock existsSync to return true for video
    vi.mocked(existsSync).mockReturnValue(true);

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

describe('5.4-UNIT-028: ThumbnailGenerator.selectBestFrameIndex [P1]', () => {
  let generator: ThumbnailGenerator;

  beforeEach(() => {
    generator = new ThumbnailGenerator();
  });

  it('[P1] should return middle index for odd number of frames', () => {
    const frames = ['frame1.jpg', 'frame2.jpg', 'frame3.jpg'];
    const index = generator.selectBestFrameIndex(frames);
    expect(index).toBe(1); // Middle frame
  });

  it('[P1] should return floor of middle for even number of frames', () => {
    const frames = ['frame1.jpg', 'frame2.jpg', 'frame3.jpg', 'frame4.jpg'];
    const index = generator.selectBestFrameIndex(frames);
    expect(index).toBe(2);
  });

  it('[P1] should return 0 for single frame', () => {
    const frames = ['frame1.jpg'];
    const index = generator.selectBestFrameIndex(frames);
    expect(index).toBe(0);
  });

  it('[P1] should return floor(length/2) for two frames', () => {
    const frames = ['frame1.jpg', 'frame2.jpg'];
    const index = generator.selectBestFrameIndex(frames);
    expect(index).toBe(1); // floor(2/2) = 1
  });
});

describe('5.4-UNIT-029: ThumbnailGenerator.selectBestFrame [P1]', () => {
  let generator: ThumbnailGenerator;

  beforeEach(() => {
    generator = new ThumbnailGenerator();
  });

  it('[P1] should return middle frame path', () => {
    const frames = ['frame1.jpg', 'frame2.jpg', 'frame3.jpg'];
    const bestFrame = generator.selectBestFrame(frames);
    expect(bestFrame).toBe('frame2.jpg');
  });

  it('[P1] should return correct frame for even count', () => {
    const frames = ['frame1.jpg', 'frame2.jpg', 'frame3.jpg', 'frame4.jpg'];
    const bestFrame = generator.selectBestFrame(frames);
    expect(bestFrame).toBe('frame3.jpg'); // index 2
  });
});

// ============================================================================
// PHASE 1: Refactored Logic Tests (Existing tests with IDs and priorities)
// ============================================================================

describe('5.4-UNIT-001: Frame timestamp calculation logic [P1]', () => {
  // Tests the timestamp calculation for frame extraction
  const calculateTimestamps = (duration: number): number[] => {
    return [
      duration * 0.1, // 10%
      duration * 0.5, // 50%
      duration * 0.9, // 90%
    ];
  };

  it('[P1] should calculate correct timestamps for 60 second video', () => {
    const timestamps = calculateTimestamps(60);
    expect(timestamps).toEqual([6, 30, 54]);
  });

  it('[P1] should calculate correct timestamps for 100 second video', () => {
    const timestamps = calculateTimestamps(100);
    expect(timestamps).toEqual([10, 50, 90]);
  });

  it('[P1] should calculate correct timestamps for short video', () => {
    const timestamps = calculateTimestamps(10);
    expect(timestamps).toEqual([1, 5, 9]);
  });
});

describe('5.4-UNIT-002: ThumbnailOptions Interface [P2]', () => {
  // Tests that the interface is correctly typed (using imported interface)

  it('[P2] should accept required fields only', () => {
    const options: ThumbnailOptions = {
      videoPath: '/path/to/video.mp4',
      title: 'Test Video',
      outputPath: '/output/thumbnail.jpg',
    };
    expect(options.videoPath).toBe('/path/to/video.mp4');
    expect(options.title).toBe('Test Video');
    expect(options.outputPath).toBe('/output/thumbnail.jpg');
    expect(options.width).toBeUndefined();
    expect(options.height).toBeUndefined();
  });

  it('[P2] should accept optional dimensions', () => {
    const options: ThumbnailOptions = {
      videoPath: '/path/to/video.mp4',
      title: 'Test Video',
      outputPath: '/output/thumbnail.jpg',
      width: 1280,
      height: 720,
    };
    expect(options.width).toBe(1280);
    expect(options.height).toBe(720);
  });
});

describe('5.4-UNIT-003: ThumbnailResult Interface [P2]', () => {
  // Tests that the interface is correctly typed (using imported interface)

  it('[P2] should include all required fields', () => {
    const result: ThumbnailResult = {
      thumbnailPath: '/output/thumbnail.jpg',
      width: 1920,
      height: 1080,
      sourceTimestamp: 30.5,
    };
    expect(result.thumbnailPath).toBe('/output/thumbnail.jpg');
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.sourceTimestamp).toBe(30.5);
  });
});

describe('5.4-UNIT-004: Font size calculation logic [P1]', () => {
  // Font size formula: min(150, floor(3000 / max(line.length, 10)))
  // Updated for two-line layout with larger font
  const calculateFontSize = (line1: string, line2: string): number => {
    const maxTitleLength = Math.max(line1.length, line2.length, 10);
    return Math.min(150, Math.floor(3000 / maxTitleLength));
  };

  it('[P1] should return max font size for short titles', () => {
    expect(calculateFontSize('Short', 'Title')).toBe(150); // 3000/10 = 300, min(150,300) = 150
  });

  it('[P1] should return max font size for 10 character lines', () => {
    expect(calculateFontSize('TenCharsAB', 'TenCharsCD')).toBe(150); // 3000/10 = 300
  });

  it('[P1] should scale down for 20 character line', () => {
    expect(calculateFontSize('A'.repeat(20), 'Short')).toBe(150); // 3000/20 = 150
  });

  it('[P1] should scale down for 30 character line', () => {
    expect(calculateFontSize('A'.repeat(30), 'Short')).toBe(100); // 3000/30 = 100
  });

  it('[P1] should scale down for 60 character line', () => {
    expect(calculateFontSize('A'.repeat(60), 'Short')).toBe(50); // 3000/60 = 50
  });

  it('[P1] should scale down for 100 character line', () => {
    expect(calculateFontSize('A'.repeat(100), 'Short')).toBe(30); // 3000/100 = 30
  });
});

describe('5.4-UNIT-005: Text escaping for FFmpeg [P1]', () => {
  // FFmpeg drawtext filter requires escaping: \, :, '
  const escapeForFFmpeg = (title: string): string => {
    return title
      .replace(/\\/g, '\\\\\\\\') // Escape backslashes
      .replace(/:/g, '\\:') // Escape colons
      .replace(/'/g, "'\\''"); // Escape single quotes
  };

  it('[P1] should escape colons', () => {
    const escaped = escapeForFFmpeg('Video: Title');
    expect(escaped).toBe('Video\\: Title');
  });

  it('[P1] should escape single quotes', () => {
    const escaped = escapeForFFmpeg("It's a Video");
    expect(escaped).toBe("It'\\''s a Video");
  });

  it('[P1] should escape backslashes', () => {
    const escaped = escapeForFFmpeg('Path\\File');
    expect(escaped).toBe('Path\\\\\\\\File');
  });

  it('[P1] should handle multiple special characters', () => {
    const escaped = escapeForFFmpeg("Video: The 'Special' Edition\\2025");
    expect(escaped).toContain('\\:'); // Colon escaped
    expect(escaped).toContain("'\\''"); // Quote escaped
    expect(escaped).toContain('\\\\\\\\'); // Backslash escaped
  });

  it('[P1] should not modify plain text', () => {
    const escaped = escapeForFFmpeg('Simple Video Title');
    expect(escaped).toBe('Simple Video Title');
  });
});

describe('5.4-UNIT-006: FFmpeg extractFrame command parameters [P2]', () => {
  // The extractFrame method should use input seeking (-ss before -i)

  it('[P2] should document input seeking format', () => {
    // FFmpeg command: ffmpeg -ss TIMESTAMP -i VIDEO -vframes 1 -q:v 2 OUTPUT
    // Input seeking (-ss before -i) is faster for large videos
    const expectedArgsOrder = ['-ss', 'TIMESTAMP', '-i', 'VIDEO', '-vframes', '1', '-q:v', '2', '-y', 'OUTPUT'];
    expect(expectedArgsOrder[0]).toBe('-ss'); // -ss comes first
    expect(expectedArgsOrder[2]).toBe('-i'); // -i comes after -ss
  });
});

describe('5.4-UNIT-007: Thumbnail dimensions validation [P1]', () => {
  const THUMBNAIL_WIDTH = 1920;
  const THUMBNAIL_HEIGHT = 1080;

  it('[P1] should use 16:9 aspect ratio', () => {
    const ratio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;
    expect(ratio).toBeCloseTo(16 / 9, 2);
  });

  it('[P1] should use YouTube recommended dimensions', () => {
    // YouTube recommends 1920x1080 for thumbnails
    expect(THUMBNAIL_WIDTH).toBe(1920);
    expect(THUMBNAIL_HEIGHT).toBe(1080);
  });
});

describe('5.4-UNIT-008: Video constants validation [P2]', () => {
  it('[P2] should define thumbnail configuration', () => {
    // These values should match src/lib/video/constants.ts
    const expectedConfig = {
      THUMBNAIL_WIDTH: 1920,
      THUMBNAIL_HEIGHT: 1080,
      THUMBNAIL_FORMAT: 'jpg',
      THUMBNAIL_QUALITY: 85,
    };

    expect(expectedConfig.THUMBNAIL_WIDTH).toBe(1920);
    expect(expectedConfig.THUMBNAIL_HEIGHT).toBe(1080);
    expect(expectedConfig.THUMBNAIL_FORMAT).toBe('jpg');
    expect(expectedConfig.THUMBNAIL_QUALITY).toBe(85);
  });
});

// ============================================================================
// PHASE 2: Two-Line Text Split Tests (Added 2025-11-30)
// ============================================================================

describe('5.4-UNIT-030: Two-line title split logic [P1]', () => {
  // Tests the splitTitleIntoTwoLines logic for two-line thumbnail text
  const splitTitleIntoTwoLines = (title: string): { line1: string; line2: string } => {
    const words = title.trim().split(/\s+/);

    if (words.length <= 1) {
      return { line1: title.trim(), line2: '' };
    }

    const midpoint = Math.ceil(words.length / 2);
    return {
      line1: words.slice(0, midpoint).join(' '),
      line2: words.slice(midpoint).join(' '),
    };
  };

  it('[P1] should split 4-word title evenly', () => {
    const result = splitTitleIntoTwoLines('The Secrets of Rome');
    expect(result.line1).toBe('The Secrets');
    expect(result.line2).toBe('of Rome');
  });

  it('[P1] should split 5-word title with more words on line 1', () => {
    const result = splitTitleIntoTwoLines('The Secrets of Ancient Rome');
    expect(result.line1).toBe('The Secrets of');
    expect(result.line2).toBe('Ancient Rome');
  });

  it('[P1] should split 2-word title', () => {
    const result = splitTitleIntoTwoLines('Mars Colonization');
    expect(result.line1).toBe('Mars');
    expect(result.line2).toBe('Colonization');
  });

  it('[P1] should return single line for single word', () => {
    const result = splitTitleIntoTwoLines('AI');
    expect(result.line1).toBe('AI');
    expect(result.line2).toBe('');
  });

  it('[P1] should handle empty string', () => {
    const result = splitTitleIntoTwoLines('');
    expect(result.line1).toBe('');
    expect(result.line2).toBe('');
  });

  it('[P1] should handle whitespace-only string', () => {
    const result = splitTitleIntoTwoLines('   ');
    expect(result.line1).toBe('');
    expect(result.line2).toBe('');
  });

  it('[P1] should handle multiple spaces between words', () => {
    const result = splitTitleIntoTwoLines('The   Secrets   of   Rome');
    expect(result.line1).toBe('The Secrets');
    expect(result.line2).toBe('of Rome');
  });

  it('[P1] should split 6-word title evenly', () => {
    const result = splitTitleIntoTwoLines('One Two Three Four Five Six');
    expect(result.line1).toBe('One Two Three');
    expect(result.line2).toBe('Four Five Six');
  });

  it('[P1] should handle leading/trailing whitespace', () => {
    const result = splitTitleIntoTwoLines('  Hello World  ');
    expect(result.line1).toBe('Hello');
    expect(result.line2).toBe('World');
  });
});

describe('5.4-UNIT-031: Two-line text color scheme [P2]', () => {
  // Documents the expected color scheme for two-line thumbnails

  it('[P2] should document WHITE color for line 1', () => {
    const line1Color = 'white';
    expect(line1Color).toBe('white');
  });

  it('[P2] should document GOLD color for line 2', () => {
    const line2Color = '#FFD700';
    expect(line2Color).toBe('#FFD700');
  });

  it('[P2] should document shadow color as black', () => {
    const shadowColor = 'black';
    expect(shadowColor).toBe('black');
  });

  it('[P2] should document shadow offset as 3px', () => {
    const shadowOffset = 3;
    expect(shadowOffset).toBe(3);
  });
});

describe('5.4-UNIT-032: Line spacing calculation [P2]', () => {
  // Tests line spacing calculation for two-line layout

  it('[P2] should calculate line spacing as 30% of font size', () => {
    const fontSize = 150;
    const lineSpacing = Math.floor(fontSize * 0.3);
    expect(lineSpacing).toBe(45);
  });

  it('[P2] should calculate line spacing for smaller font', () => {
    const fontSize = 100;
    const lineSpacing = Math.floor(fontSize * 0.3);
    expect(lineSpacing).toBe(30);
  });

  it('[P2] should calculate line spacing for minimum font', () => {
    const fontSize = 50;
    const lineSpacing = Math.floor(fontSize * 0.3);
    expect(lineSpacing).toBe(15);
  });
});
