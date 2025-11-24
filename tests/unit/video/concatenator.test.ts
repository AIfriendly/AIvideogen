// Unit tests for Video Concatenator
// Story 5.3: Video Concatenation & Audio Overlay

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted() to ensure mock functions are available during module hoisting
const mocks = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockUnlinkSync: vi.fn(),
  mockConcat: vi.fn(),
  mockGetVideoDuration: vi.fn(),
}));

// Mock fs module - must be before imports
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: mocks.mockExistsSync,
    writeFileSync: mocks.mockWriteFileSync,
    unlinkSync: mocks.mockUnlinkSync,
  };
});

// Mock FFmpegClient
vi.mock('@/lib/video/ffmpeg', () => ({
  FFmpegClient: vi.fn().mockImplementation(() => ({
    concat: mocks.mockConcat,
    getVideoDuration: mocks.mockGetVideoDuration,
  })),
}));

import { Concatenator } from '@/lib/video/concatenator';
import { FFmpegClient } from '@/lib/video/ffmpeg';

describe('Concatenator [5.3-UNIT]', () => {
  let concatenator: Concatenator;
  let mockFfmpeg: FFmpegClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations - all files exist by default
    mocks.mockExistsSync.mockReturnValue(true);
    mocks.mockWriteFileSync.mockReturnValue(undefined);
    mocks.mockUnlinkSync.mockReturnValue(undefined);
    mocks.mockConcat.mockResolvedValue(undefined);
    mocks.mockGetVideoDuration.mockResolvedValue(45.5);

    mockFfmpeg = new FFmpegClient();
    concatenator = new Concatenator(mockFfmpeg);
  });

  afterEach(() => {
    // Note: Don't use vi.restoreAllMocks() as it breaks hoisted mocks
  });

  describe('concatenateVideos', () => {
    it('[5.3-UNIT-001] should concatenate multiple videos successfully', async () => {
      const inputPaths = [
        '/temp/scene-1-trimmed.mp4',
        '/temp/scene-2-trimmed.mp4',
        '/temp/scene-3-trimmed.mp4',
      ];
      const outputPath = '/output/concatenated.mp4';

      const result = await concatenator.concatenateVideos(inputPaths, outputPath);

      expect(mocks.mockWriteFileSync).toHaveBeenCalled();
      expect(mocks.mockConcat).toHaveBeenCalled();
      expect(result).toBe(outputPath);
    });

    it('[5.3-UNIT-002] should throw error for empty input array', async () => {
      await expect(concatenator.concatenateVideos([], '/output.mp4'))
        .rejects.toThrow('No input videos to concatenate');
    });

    it('[5.3-UNIT-003] should throw error for missing input file', async () => {
      mocks.mockExistsSync.mockReturnValueOnce(false);

      await expect(
        concatenator.concatenateVideos(['/missing.mp4'], '/output.mp4')
      ).rejects.toThrow('Input video not found');
    });

    it('[5.3-UNIT-004] should clean up list file after concatenation', async () => {
      const inputPaths = ['/temp/scene-1.mp4'];
      const outputPath = '/output/result.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      expect(mocks.mockUnlinkSync).toHaveBeenCalled();
    });

    it('[5.3-UNIT-005] should handle Windows paths correctly', async () => {
      const inputPaths = ['D:\\temp\\scene-1.mp4'];
      const outputPath = 'D:\\output\\result.mp4';

      await concatenator.concatenateVideos(inputPaths, outputPath);

      const writeCall = mocks.mockWriteFileSync.mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toContain("file 'D:/temp/scene-1.mp4'");
    });

    it('[5.3-UNIT-006] should throw error when output not created', async () => {
      // Input exists, list file cleanup check passes, output doesn't exist
      mocks.mockExistsSync
        .mockReturnValueOnce(true)  // Input check
        .mockReturnValueOnce(false) // Output check after concat
        .mockReturnValueOnce(true); // List file cleanup check

      await expect(
        concatenator.concatenateVideos(['/input.mp4'], '/output.mp4')
      ).rejects.toThrow('output not created');
    });
  });

  describe('getTotalDuration', () => {
    it('[5.3-UNIT-007] should return duration from FFmpeg', async () => {
      mocks.mockGetVideoDuration.mockResolvedValue(45.5);

      const duration = await concatenator.getTotalDuration('/video.mp4');

      expect(duration).toBe(45.5);
      expect(mocks.mockGetVideoDuration).toHaveBeenCalledWith('/video.mp4');
    });
  });
});
